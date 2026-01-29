import express from "express";
import databaseService from "../services/database.js";
import mongoose from "mongoose";
import glmService from "../services/glmService.js";
import conversationManager from "../services/conversationManager.js";
import { getContextualPrompt, detectQueryType } from "../services/tinaPersonality.js";
import { fetchDataContext } from "../services/chatHandlers/analysisHandler.js";
import ChatConversation from "../models/ChatConversation.js";
import ToolProposal from "../models/ToolProposal.js";
import { getAllTools, handleToolCallProposal, executeTool } from "../services/tinaTools/index.js";
import { getLogger } from "../utils/logger.js";

const router = express.Router();
const logger = getLogger('chat-api', 'chat-api');

// In-memory conversation storage for mock/development mode (fallback)
const mockConversations = new Map();
let mockConversationIdCounter = 1;

// Context window management configuration
const MAX_CONTEXT_MESSAGES = 20;
const SUMMARY_TRIGGER_MESSAGES = 30;
const SUMMARY_CUTOFF_MESSAGES = 10;

/**
 * Format tool data for user display
 * Converts tool execution results into readable markdown
 */
function formatToolDataForUser(toolName, data) {
  if (!data) {
    return `I retrieved the data, but it appears to be empty.`;
  }

  switch (toolName) {
    case 'get_revenue_summary':
      const curr = data.current || {};
      const growth = data.growth || {};
      const metrics = data.metrics || {};
      return `**Here's our current revenue data:**

**Current Metrics:**
• MRR: $${curr.mrr?.toLocaleString() || 'N/A'}
• Subscribers: ${curr.subscribers?.toLocaleString() || 'N/A'}
• ARPU: $${curr.arpu?.toFixed(2) || 'N/A'}
• Net Revenue: $${curr.netRevenue?.toLocaleString() || 'N/A'}

**Growth:**
• ${growth.percentage?.toFixed(1) || 0}% (${growth.absolute >= 0 ? '+' : ''}$${growth.absolute?.toLocaleString() || 0})
• New Users: ${metrics.newUsers || 0}
• Churned: ${metrics.churnedSubscribers || 0}
• Net New: ${(metrics.newUsers || 0) - (metrics.churnedSubscribers || 0)}

---

What would you like to know more about?`;

    case 'get_content_analytics':
      return `**Content Analytics:**

${JSON.stringify(data, null, 2)}`;

    case 'get_campaign_performance':
      return `**Campaign Performance:**

${JSON.stringify(data, null, 2)}`;

    case 'get_budget_status':
      return `**Budget Status:**

${JSON.stringify(data, null, 2)}`;

    case 'get_aso_keyword_status':
      return `**ASO Keyword Rankings:**

${JSON.stringify(data, null, 2)}`;

    case 'get_pending_posts':
      return `**Pending Posts:**

${JSON.stringify(data, null, 2)}`;

    default:
      return `Here's the data I retrieved:\n\n${JSON.stringify(data, null, 2)}`;
  }
}

/**
 * Real GLM4.7 API Integration
 * Calls the actual GLM service with Tina's personality and function calling support
 */
async function callGLM4API(messages, conversationHistory = [], conversationId = null) {
  try {
    const startTime = Date.now();

    // Get data context for the AI
    let dataContext = {};
    try {
      dataContext = await fetchDataContext();
    } catch (error) {
      logger.warn('Failed to fetch data context, proceeding without it', {
        error: error.message
      });
    }

    // Detect query type for appropriate prompt
    const lastUserMessage = messages[messages.length - 1];
    const queryType = detectQueryType(lastUserMessage?.content || '');

    // Build system prompt with Tina's personality
    const systemPrompt = getContextualPrompt(dataContext);

    // Z.AI GLM API accepts 'system' role via system parameter
    // Filter out any system messages from the messages array
    const filteredMessages = messages.filter(m => m.role !== 'system');

    // Get tools for function calling
    const tools = getAllTools();

    logger.info('Calling GLM4.7 API', {
      messageCount: filteredMessages.length,
      conversationId,
      queryType: queryType.type,
      toolsAvailable: tools.length
    });

    // Call the real GLM service with tools
    // Note: GLM automatically determines whether to use tools (no tool_choice parameter)
    const response = await glmService.createMessage({
      system: systemPrompt,
      messages: filteredMessages,
      maxTokens: 4096,
      temperature: 0.8,  // Slightly higher for creativity
      tools: tools
    });

    const thinkingTime = Date.now() - startTime;

    // Check if response contains tool calls (single or parallel)
    if (response.toolCalls && response.toolCalls.length > 0) {
      logger.info('GLM4.7 returned tool calls', {
        count: response.toolCalls.length,
        toolNames: response.toolCalls.map(tc => tc.name)
      });

      // Execute ALL tool calls in parallel
      const toolProposals = await Promise.all(
        response.toolCalls.map(toolCall =>
          handleToolCallProposal(toolCall, messages, conversationId, dataContext)
        )
      );

      // Separate into read-only tools (executed) and tools requiring approval
      const executedTools = toolProposals.filter(p => p.type === 'read_only_tool_result' && p.executed);
      const approvalRequiredTools = toolProposals.filter(p => p.requiresApproval);
      const erroredTools = toolProposals.filter(p => p.error);

      logger.info('Tool execution results', {
        total: toolProposals.length,
        executed: executedTools.length,
        approvalRequired: approvalRequiredTools.length,
        errored: erroredTools.length
      });

      // If any tools require approval, return them without making follow-up call
      if (approvalRequiredTools.length > 0) {
        logger.info('Some tools require approval, returning proposals');
        const firstProposal = approvalRequiredTools[0];
        return {
          role: "assistant",
          content: `I need approval to execute ${approvalRequiredTools.length} tool(s). ${firstProposal.message}`,
          timestamp: new Date().toISOString(),
          toolProposal: {
            id: firstProposal.proposalId,
            toolName: firstProposal.toolName,
            parameters: firstProposal.parameters,
            requiresApproval: firstProposal.requiresApproval,
            reasoning: firstProposal.reasoning,
            actionDisplay: firstProposal.actionDisplay,
            executed: firstProposal.executed,
            data: firstProposal.data,
            error: firstProposal.error,
            pendingCount: approvalRequiredTools.length - 1  // Additional tools pending
          },
          metadata: {
            tokensUsed: response.usage?.totalTokens || 0,
            thinkingTime,
            model: response.model,
            queryType: queryType.type,
            hasDataContext: Object.keys(dataContext).length > 0,
            hasToolCall: true
          }
        };
      }

      // If all read-only tools were executed, prepare follow-up with all results
      if (executedTools.length > 0 && executedTools.length === toolProposals.length) {
        logger.info('All read-only tools executed, preparing follow-up with all results', {
          toolCount: executedTools.length,
          toolNames: executedTools.map(t => t.toolName)
        });

        // The assistant's message with tool_calls
        const assistantToolMessage = {
          role: 'assistant',
          content: '',
          tool_calls: response.rawToolCalls
        };

        // Build tool result messages - one for each tool call
        const toolResultMessages = executedTools.map((toolProposal, index) => ({
          role: 'tool',
          tool_call_id: response.rawToolCalls?.[index]?.id || response.toolCalls[index]?.id || `tool_${Date.now()}_${index}`,
          content: JSON.stringify(toolProposal.data)
        }));

        // Build the message array for follow-up call
        const followUpMessages = [
          ...messages.filter(m => m.role !== 'system'),
          assistantToolMessage,
          ...toolResultMessages
        ];

        logger.info('Making follow-up call with all tool results', {
          messageCount: followUpMessages.length,
          toolResultCount: toolResultMessages.length
        });

        // Call GLM again with all tool results
        // Handle recursive tool calls - loop until GLM returns text content
        let currentMessages = followUpMessages;
        let currentResponse = await glmService.createMessage({
          system: systemPrompt,
          messages: currentMessages,
          maxTokens: 4096,
          temperature: 0.8,
          tools: tools
        });

        let allExecutedTools = [...executedTools];
        let recursionCount = 0;
        const MAX_RECURSION = 5;  // Prevent infinite loops

        // Loop while GLM keeps requesting more tools
        while (currentResponse.toolCalls && currentResponse.toolCalls.length > 0 && recursionCount < MAX_RECURSION) {
          recursionCount++;
          logger.info(`GLM requested additional tools (recursion ${recursionCount})`, {
            toolCount: currentResponse.toolCalls.length,
            toolNames: currentResponse.toolCalls.map(tc => tc.name)
          });

          // Execute the new batch of tools in parallel
          const newToolProposals = await Promise.all(
            currentResponse.toolCalls.map(toolCall =>
              handleToolCallProposal(toolCall, currentMessages, conversationId, dataContext)
            )
          );

          const newExecutedTools = newToolProposals.filter(p => p.type === 'read_only_tool_result' && p.executed);
          const approvalRequired = newToolProposals.filter(p => p.requiresApproval);
          const errored = newToolProposals.filter(p => p.error);

          // If any tools require approval, break and return partial results
          if (approvalRequired.length > 0) {
            logger.info('Additional tools require approval, returning partial results');
            return {
              role: "assistant",
              content: `I gathered some data, but need approval for ${approvalRequired.length} additional action(s). Please check the proposals.`,
              timestamp: new Date().toISOString(),
              metadata: {
                tokensUsed: allExecutedTools.length * 100,  // Approximate
                thinkingTime: Date.now() - startTime,
                model: response.model,
                queryType: queryType.type,
                partialResults: true,
                toolsExecuted: allExecutedTools.map(t => t.toolName)
              }
            };
          }

          // Add newly executed tools to our collection
          allExecutedTools.push(...newExecutedTools);

          // Build the next batch of messages
          const newAssistantMessage = {
            role: 'assistant',
            content: '',
            tool_calls: currentResponse.rawToolCalls
          };

          const newToolResultMessages = newExecutedTools.map((toolProposal, index) => ({
            role: 'tool',
            tool_call_id: currentResponse.rawToolCalls?.[index]?.id || currentResponse.toolCalls[index]?.id || `tool_${Date.now()}_${index}`,
            content: JSON.stringify(toolProposal.data)
          }));

          // Update current messages for next iteration
          currentMessages = [
            ...currentMessages,
            newAssistantMessage,
            ...newToolResultMessages
          ];

          // Call GLM again
          currentResponse = await glmService.createMessage({
            system: systemPrompt,
            messages: currentMessages,
            maxTokens: 4096,
            temperature: 0.8,
            tools: tools
          });
        }

        if (recursionCount >= MAX_RECURSION) {
          logger.warn('Max tool recursion depth reached, returning partial results');
        }

        const totalTime = Date.now() - startTime;
        const followUpContent = currentResponse.content?.[0]?.text || currentResponse.text || '';

        return {
          role: "assistant",
          content: followUpContent || 'I processed your request but encountered an issue generating a response.',
          timestamp: new Date().toISOString(),
          metadata: {
            tokensUsed: (response.usage?.totalTokens || 0) + (currentResponse.usage?.totalTokens || 0),
            thinkingTime: totalTime,
            model: response.model,
            queryType: queryType.type,
            hasDataContext: Object.keys(dataContext).length > 0,
            toolsUsed: allExecutedTools.map(t => t.toolName),
            toolsData: allExecutedTools.map(t => ({ name: t.toolName, data: t.data })),
            recursionCount: recursionCount
          }
        };
      }

      // Handle mixed results (some executed, some errors)
      if (executedTools.length > 0) {
        const errorMessage = erroredTools.map(t => t.error).join('; ');
        return {
          role: "assistant",
          content: `I executed ${executedTools.length} tool(s), but encountered some errors: ${errorMessage}`,
          timestamp: new Date().toISOString(),
          metadata: {
            tokensUsed: response.usage?.totalTokens || 0,
            thinkingTime,
            model: response.model,
            queryType: queryType.type,
            hasDataContext: Object.keys(dataContext).length > 0,
            partialSuccess: true,
            executedCount: executedTools.length,
            errorCount: erroredTools.length
          }
        };
      }

      // All tools errored - return error message
      const firstError = erroredTools[0];
      return {
        role: "assistant",
        content: `I encountered an error executing the tools: ${firstError.error}`,
        timestamp: new Date().toISOString(),
        error: true,
        metadata: {
          tokensUsed: response.usage?.totalTokens || 0,
          thinkingTime,
          model: response.model,
          queryType: queryType.type,
          hasDataContext: Object.keys(dataContext).length > 0
        }
      };
    }

    // Extract content from response (normal text response)
    const content = response.content?.[0]?.text || response.text || '';

    logger.info('GLM4.7 API response received', {
      contentLength: content.length,
      thinkingTime,
      tokensUsed: response.usage?.totalTokens || 0
    });

    return {
      role: "assistant",
      content: content,
      timestamp: new Date().toISOString(),
      metadata: {
        tokensUsed: response.usage?.totalTokens || 0,
        thinkingTime,
        model: response.model,
        queryType: queryType.type,
        hasDataContext: Object.keys(dataContext).length > 0
      }
    };

  } catch (error) {
    logger.error('Error calling GLM4.7 API', {
      error: error.message,
      stack: error.stack
    });

    // Return error message as fallback
    return {
      role: "assistant",
      content: `I apologize, but I'm having trouble connecting right now. The error was: "${error.message}"

Please check that:
1. The GLM47_API_KEY is configured in your .env file
2. The API endpoint is accessible
3. You have a stable internet connection

In the meantime, I can still help with basic questions using local data.`,
      timestamp: new Date().toISOString(),
      error: true
    };
  }
}

/**
 * Manage conversation context window for long conversations
 * Preserves recent messages and creates summaries when needed
 */
function manageConversationContext(messages, conversationId) {
  const messageCount = messages.filter(m => m.role !== 'system').length;

  if (messageCount <= MAX_CONTEXT_MESSAGES) {
    return messages;
  }

  // For conversations exceeding limit, keep only recent messages
  // In production, this would trigger conversationManager.summarizeConversation()
  const systemMessage = messages.find(m => m.role === 'system');
  const recentMessages = messages
    .filter(m => m.role !== 'system')
    .slice(-SUMMARY_CUTOFF_MESSAGES);

  const summaryMessage = {
    role: 'system',
    content: `**Note:** This is a long conversation. Only the most recent ${SUMMARY_CUTOFF_MESSAGES} messages are shown for context. Previous context has been summarized.`
  };

  return systemMessage ? [systemMessage, summaryMessage, ...recentMessages] : [summaryMessage, ...recentMessages];
}

/**
 * Extract summary points from conversation messages
 */
function extractSummaryPoints(messages) {
  const points = [];
  const userMessages = messages.filter(m => m.role === 'user');

  // Extract topics discussed
  const topics = new Set();
  userMessages.forEach(msg => {
    const content = msg.content.toLowerCase();
    if (content.includes('revenue') || content.includes('mrr')) topics.add('Revenue/MRR discussion');
    if (content.includes('content') || content.includes('post')) topics.add('Content strategy discussion');
    if (content.includes('budget') || content.includes('ad') || content.includes('campaign')) topics.add('Budget/Ads discussion');
    if (content.includes('keyword') || content.includes('aso') || content.includes('ranking')) topics.add('ASO/Keywords discussion');
    if (content.includes('pivot') || content.includes('strategy')) topics.add('Strategic planning discussion');
  });

  if (topics.size > 0) {
    points.push(`**Topics Discussed:** ${Array.from(topics).join(', ')}`);
  }

  points.push(`**Conversation History:** ${userMessages.length} user messages exchanged`);

  return points;
}

// Store conversation summaries in memory
const conversationSummaries = new Map();

// ============================================================================
// API Routes
// ============================================================================

// GET /api/chat/history - Get conversation history
router.get("/history", async (req, res) => {
  try {
    const status = databaseService.getStatus();

    if (!status.isConnected || status.readyState !== 1) {
      // Mock mode: return in-memory conversations
      const mockHistory = Array.from(mockConversations.values()).map(conv => ({
        id: conv._id,
        title: conv.title,
        content: conv.content,
        messages: conv.messages,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt
      }));

      return res.json({
        success: true,
        conversations: mockHistory,
        mode: 'mock'
      });
    }

    // Database mode: try to use ChatConversation model first
    try {
      const conversations = await ChatConversation.getActiveConversations(50);

      return res.json({
        success: true,
        conversations: conversations.map(conv => ({
          id: conv._id,
          title: conv.title,
          content: conv.summary || conv.messages[conv.messages.length - 1]?.content || '',
          messages: conv.messages,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt
        })),
        mode: 'database'
      });
    } catch (modelError) {
      // Fallback to legacy marketing_strategy collection
      const conversations = await mongoose.connection
        .collection("marketing_strategy")
        .find({ type: "chat" })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();

      return res.json({
        success: true,
        conversations: conversations.map(conv => ({
          id: conv._id,
          title: conv.title,
          content: conv.content,
          messages: conv.messages || [],
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt
        })),
        mode: 'legacy'
      });
    }
  } catch (error) {
    logger.error("Error fetching chat history", { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/chat/search - Search conversation history
router.get("/search", async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) {
      return res.status(400).json({
        success: false,
        error: "Search query is required"
      });
    }

    const status = databaseService.getStatus();

    if (!status.isConnected || status.readyState !== 1) {
      return res.json({
        success: true,
        query: q,
        results: [],
        message: "Search not available in mock mode"
      });
    }

    // Try ChatConversation model first
    try {
      const results = await ChatConversation.searchConversations(q);

      return res.json({
        success: true,
        query: q,
        results: results.map(conv => {
          // Find matching message for highlight
          const matchingMessage = conv.messages.find(m =>
            m.content.toLowerCase().includes(q.toLowerCase())
          );

          let title = conv.title;
          let highlight = '';

          if (matchingMessage) {
            const content = matchingMessage.content;
            const index = content.toLowerCase().indexOf(q.toLowerCase());
            if (index >= 0) {
              const start = Math.max(0, index - 50);
              const end = Math.min(content.length, index + q.length + 50);
              highlight = (start > 0 ? '...' : '') + content.substring(start, end) + (end < content.length ? '...' : '');
            }
          }

          return {
            id: conv._id,
            title: title,
            highlight: highlight || conv.summary?.substring(0, 150) || '',
            createdAt: conv.createdAt,
            messages: conv.messages
          };
        }),
        count: results.length
      });
    } catch (modelError) {
      // Fallback to text search in legacy collection
      const conversations = await mongoose.connection
        .collection("marketing_strategy")
        .find({
          type: "chat",
          $or: [
            { title: { $regex: q, $options: 'i' } },
            { content: { $regex: q, $options: 'i' } },
            { 'messages.content': { $regex: q, $options: 'i' } }
          ]
        })
        .sort({ updatedAt: -1 })
        .limit(20)
        .toArray();

      const results = conversations.map(conv => {
        const messages = conv.messages || [];
        const matchingMessage = messages.find(m =>
          m.content && m.content.toLowerCase && m.content.toLowerCase().includes(q.toLowerCase())
        );

        let title = conv.title;
        let highlight = '';
        let content = conv.content || '';

        if (matchingMessage && matchingMessage.content) {
          const msgContent = matchingMessage.content;
          const index = msgContent.toLowerCase().indexOf(q.toLowerCase());
          if (index >= 0) {
            const start = Math.max(0, index - 50);
            const end = Math.min(msgContent.length, index + q.length + 50);
            highlight = msgContent.substring(start, end) + (end < msgContent.length ? '...' : '');
            title = `Message: ${msgContent.substring(0, 50)}...`;
          }
        } else if (content) {
          const index = content.toLowerCase().indexOf(q.toLowerCase());
          if (index >= 0) {
            const start = Math.max(0, index - 50);
            const end = Math.min(content.length, index + q.length + 50);
            highlight = content.substring(start, end) + (end < content.length ? '...' : '');
          }
        }

        return {
          id: conv._id,
          title: title,
          highlight: highlight || content.substring(0, 150) + (content.length > 150 ? '...' : ''),
          createdAt: conv.createdAt,
          messages: messages
        };
      });

      return res.json({
        success: true,
        query: q,
        results: results,
        count: results.length
      });
    }
  } catch (error) {
    logger.error("Error searching chat history", { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/chat/message - Send a message and get AI response
router.post("/message", async (req, res) => {
  try {
    const { message, conversationId } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        error: "Message is required and must be a string"
      });
    }

    // Build messages array for AI
    let messages = [
      {
        role: "system",
        content: "You are Tina, a veteran AI marketing executive.", // Will be replaced by Tina's full prompt
      }
    ];

    // Load conversation history if conversationId is provided
    let existingConversation = null;
    const status = databaseService.getStatus();

    if (conversationId) {
      if (status.isConnected && status.readyState === 1) {
        // Try ChatConversation model first
        try {
          existingConversation = await ChatConversation.findById(conversationId);
          if (existingConversation && existingConversation.messages) {
            messages = messages.concat(existingConversation.messages);
          }
        } catch (modelError) {
          // Fallback to legacy collection
          try {
            const collection = mongoose.connection.db.collection("marketing_strategy");
            existingConversation = await collection.findOne({ _id: new mongoose.Types.ObjectId(conversationId) });
            if (existingConversation && existingConversation.messages) {
              messages = messages.concat(existingConversation.messages);
            }
          } catch (fallbackError) {
            logger.error('Error loading conversation from legacy collection', {
              error: fallbackError.message
            });
          }
        }
      } else {
        // Mock mode: load from in-memory storage
        existingConversation = mockConversations.get(conversationId);
        if (existingConversation && existingConversation.messages) {
          messages = messages.concat(existingConversation.messages);
        }
      }
    }

    // Add current user message
    messages.push({
      role: "user",
      content: message
    });

    // Get AI response with full conversation context
    const aiResponse = await callGLM4API(messages, existingConversation?.messages || [], conversationId || null);

    // Save conversation to database if available
    let savedConversation = null;
    let savedConversationId = conversationId;

    if (status.isConnected && status.readyState === 1) {
      try {
        if (existingConversation) {
          // Update existing conversation
          // Simplified: Save only user message and final assistant response
          // Intermediate tool messages are not persisted to avoid complex serialization issues
          const newMessages = [
            {
              role: "user",
              content: message,
              timestamp: new Date(),
              metadata: {}
            }
          ];

          // Add final assistant message with tool data in metadata
          const assistantMessage = {
            role: "assistant",
            content: aiResponse.content || "",
            timestamp: new Date(),
            metadata: {
              tokens: aiResponse.metadata?.tokensUsed,
              model: aiResponse.metadata?.model,
              thinkingTime: aiResponse.metadata?.thinkingTime
            }
          };

          // Include tool usage info in metadata (not as separate messages)
          if (aiResponse.metadata?.toolUsed) {
            assistantMessage.metadata.toolUsed = aiResponse.metadata.toolUsed;
            assistantMessage.metadata.toolData = aiResponse.metadata.toolData;
          }
          // Handle new multi-tool format
          if (aiResponse.metadata?.toolsUsed) {
            assistantMessage.metadata.toolsUsed = aiResponse.metadata.toolsUsed;
            assistantMessage.metadata.toolsData = aiResponse.metadata.toolsData;
          }

          newMessages.push(assistantMessage);
          existingConversation.messages.push(...newMessages);
          existingConversation.metadata.messageCount = existingConversation.messages.length;
          if (aiResponse.metadata?.tokensUsed) {
            existingConversation.metadata.totalTokens = (existingConversation.metadata.totalTokens || 0) + aiResponse.metadata.tokensUsed;
          }
          await existingConversation.save();

          savedConversation = existingConversation;
        } else {
          // Create new conversation using ChatConversation model
          // Simplified: Save only user message and final assistant response
          // Intermediate tool messages are not persisted to avoid complex serialization issues
          const messages = [
            {
              role: "user",
              content: message,
              timestamp: new Date(),
              metadata: {}
            }
          ];

          // Add final assistant message with tool data in metadata
          const assistantMessage = {
            role: "assistant",
            content: aiResponse.content || "",
            timestamp: new Date(),
            metadata: {
              tokens: aiResponse.metadata?.tokensUsed,
              model: aiResponse.metadata?.model,
              thinkingTime: aiResponse.metadata?.thinkingTime
            }
          };

          // Include tool usage info in metadata (not as separate messages)
          if (aiResponse.metadata?.toolUsed) {
            assistantMessage.metadata.toolUsed = aiResponse.metadata.toolUsed;
            assistantMessage.metadata.toolData = aiResponse.metadata.toolData;
          }
          // Handle new multi-tool format
          if (aiResponse.metadata?.toolsUsed) {
            assistantMessage.metadata.toolsUsed = aiResponse.metadata.toolsUsed;
            assistantMessage.metadata.toolsData = aiResponse.metadata.toolsData;
          }

          messages.push(assistantMessage);

          const newConversation = new ChatConversation({
            title: message.substring(0, 60) + (message.length > 60 ? "..." : ""),
            isActive: true,
            messages: messages,
            metadata: {
              messageCount: messages.length,
              totalTokens: aiResponse.metadata?.tokensUsed || 0,
              lastTopic: aiResponse.metadata?.queryType
            }
          });

          await newConversation.save();
          savedConversation = newConversation;
          savedConversationId = newConversation._id;
        }
      } catch (dbError) {
        logger.error("Error saving conversation to database", {
          error: dbError.message
        });

        // Fallback: try legacy collection
        try {
          const collection = mongoose.connection.db.collection("marketing_strategy");

          if (existingConversation) {
            const newMessages = [
              { role: "user", content: message, timestamp: new Date() },
              { role: "assistant", content: aiResponse.content, timestamp: aiResponse.timestamp || new Date() }
            ];

            await collection.updateOne(
              { _id: new mongoose.Types.ObjectId(conversationId) },
              {
                $push: { messages: { $each: newMessages } },
                $set: {
                  content: aiResponse.content,
                  updatedAt: new Date()
                }
              }
            );

            savedConversation = {
              id: conversationId,
              ...existingConversation,
              messages: [...(existingConversation.messages || []), ...newMessages]
            };
          } else {
            const conversation = {
              type: "chat",
              title: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
              content: aiResponse.content,
              reasoning: `Responding to: ${message}`,
              status: "completed",
              messages: [
                { role: "user", content: message, timestamp: new Date() },
                { role: "assistant", content: aiResponse.content, timestamp: new Date() }
              ],
              createdAt: new Date(),
              updatedAt: new Date()
            };

            const result = await collection.insertOne(conversation);
            savedConversation = {
              id: result.insertedId,
              ...conversation
            };
            savedConversationId = result.insertedId;
          }
        } catch (fallbackError) {
          logger.error("Error saving to legacy collection", {
            error: fallbackError.message
          });
        }
      }
    } else {
      // Mock mode: Use in-memory storage
      const newMessages = [
        { role: "user", content: message, timestamp: new Date() },
        { role: "assistant", content: aiResponse.content, timestamp: new Date() }
      ];

      if (existingConversation) {
        existingConversation.messages.push(...newMessages);
        existingConversation.content = aiResponse.content;
        existingConversation.updatedAt = new Date();
        savedConversation = {
          id: conversationId,
          ...existingConversation
        };
      } else {
        const newConversationId = `mock_conv_${mockConversationIdCounter++}`;
        const newConversation = {
          _id: newConversationId,
          type: "chat",
          title: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
          content: aiResponse.content,
          messages: newMessages,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        mockConversations.set(newConversationId, newConversation);
        savedConversation = {
          id: newConversationId,
          ...newConversation
        };
        savedConversationId = newConversationId;
      }
    }

    // Check if summary was created
    const summary = conversationId ? conversationSummaries.get(conversationId) : null;

    res.json({
      success: true,
      response: {
        role: aiResponse.role,
        content: aiResponse.content,
        timestamp: aiResponse.timestamp,
        proposal: aiResponse.proposal || null,
        metadata: aiResponse.metadata
      },
      conversationId: savedConversationId,
      contextInfo: summary ? {
        summaryCreated: true,
        summarizedMessages: summary.originalMessageCount,
        remainingMessages: SUMMARY_CUTOFF_MESSAGES,
        summaryPoints: summary.points.length
      } : {
        summaryCreated: false,
        messageCount: messages.filter(m => m.role !== 'system').length
      },
      message: "Response generated successfully"
    });
  } catch (error) {
    logger.error("Error processing chat message", {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/chat/feedback - Provide feedback on AI response
router.post("/feedback", async (req, res) => {
  try {
    const { conversationId, feedback, type } = req.body;

    if (!conversationId || !feedback) {
      return res.status(400).json({
        success: false,
        error: "Conversation ID and feedback are required"
      });
    }

    const status = databaseService.getStatus();

    if (!status.isConnected || status.readyState !== 1) {
      return res.json({
        success: true,
        message: "Feedback received (not persisted - no database connection)"
      });
    }

    // Try ChatConversation model first
    try {
      const conversation = await ChatConversation.findById(conversationId);
      if (conversation) {
        // Store feedback in metadata
        if (!conversation.metadata.feedback) {
          conversation.metadata.feedback = [];
        }
        conversation.metadata.feedback.push({
          content: feedback,
          type: type,
          timestamp: new Date()
        });
        await conversation.save();

        return res.json({
          success: true,
          message: "Feedback recorded successfully"
        });
      }
    } catch (modelError) {
      // Fall through to legacy collection
    }

    // Legacy collection fallback
    await mongoose.connection.db.collection("marketing_strategy").updateOne(
      { _id: conversationId },
      {
        $set: {
          feedback: feedback,
          feedbackType: type,
          feedbackGivenAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: "Feedback recorded successfully"
    });
  } catch (error) {
    logger.error("Error recording feedback", { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/chat/history - Clear conversation history
router.delete("/history", async (req, res) => {
  try {
    const status = databaseService.getStatus();

    if (!status.isConnected || status.readyState !== 1) {
      mockConversations.clear();
      return res.json({
        success: true,
        message: "History cleared (no database connection)"
      });
    }

    // Try ChatConversation model first
    try {
      await ChatConversation.updateMany(
        { isActive: true },
        { isActive: false, archivedAt: new Date() }
      );
    } catch (modelError) {
      // Fallback to legacy collection
      await mongoose.connection.db.collection("marketing_strategy").deleteMany({ type: "chat" });
    }

    // Clear in-memory storage
    mockConversations.clear();
    conversationSummaries.clear();

    res.json({
      success: true,
      message: "Conversation history cleared successfully"
    });
  } catch (error) {
    logger.error("Error clearing chat history", { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/chat/create-todo - Create todo from chat suggestion
router.post("/create-todo", async (req, res) => {
  try {
    const { title, description, category, priority, scheduledAt, dueAt, estimatedTime, relatedStrategyId } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: "Title is required"
      });
    }

    const status = databaseService.getStatus();
    let createdTodo = null;

    if (status.isConnected && status.readyState === 1) {
      try {
        const todo = {
          title,
          description: description || "",
          category: category || "review",
          priority: priority || "medium",
          status: "pending",
          scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
          dueAt: dueAt ? new Date(dueAt) : null,
          completedAt: null,
          resources: [],
          estimatedTime: estimatedTime || null,
          actualTime: null,
          createdBy: "ai",
          relatedStrategyId: relatedStrategyId || null,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await mongoose.connection.db.collection("marketing_tasks").insertOne(todo);
        createdTodo = {
          id: result.insertedId,
          ...todo
        };
      } catch (dbError) {
        logger.error("Error saving todo to database", { error: dbError.message });
      }
    }

    // If no database save, return mock success
    if (!createdTodo) {
      createdTodo = {
        id: `mock_${Date.now()}`,
        title,
        description: description || "",
        category: category || "review",
        priority: priority || "medium",
        status: "pending",
        scheduledAt: scheduledAt || new Date().toISOString(),
        dueAt: dueAt || null,
        completedAt: null,
        resources: [],
        estimatedTime: estimatedTime || null,
        actualTime: null,
        createdBy: "ai",
        relatedStrategyId: relatedStrategyId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    res.json({
      success: true,
      todo: createdTodo,
      message: "Todo created successfully from chat"
    });
  } catch (error) {
    logger.error("Error creating todo from chat", { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/chat/approve - Approve a proposal
router.post("/approve", async (req, res) => {
  try {
    const { proposalId, conversationId, proposal } = req.body;

    if (!proposal) {
      return res.status(400).json({
        success: false,
        error: "Proposal is required"
      });
    }

    const status = databaseService.getStatus();

    if (status.isConnected && status.readyState === 1) {
      try {
        const approvedProposal = {
          type: "decision",
          title: `Budget Change: ${proposal.current?.total || proposal.current?.budget} → ${proposal.proposed?.total || proposal.proposed?.budget}`,
          content: `Approved budget reallocation from paid ads to content production`,
          reasoning: proposal.reasoning,
          dataReferences: [{
            type: "budget_change",
            current: proposal.current,
            proposed: proposal.proposed,
            expectedImpact: proposal.expectedImpact
          }],
          status: "approved",
          expectedOutcome: proposal.expectedImpact,
          actualOutcome: null,
          reviewDate: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await mongoose.connection.db.collection("marketing_strategy").insertOne(approvedProposal);
      } catch (dbError) {
        logger.error("Error saving approved proposal", { error: dbError.message });
      }
    }

    res.json({
      success: true,
      message: "Proposal approved successfully",
      proposal: {
        ...proposal,
        status: "approved",
        approvedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error("Error approving proposal", { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/chat/reject - Reject a proposal
router.post("/reject", async (req, res) => {
  try {
    const { proposalId, conversationId, proposal, reason } = req.body;

    if (!proposal) {
      return res.status(400).json({
        success: false,
        error: "Proposal is required"
      });
    }

    const status = databaseService.getStatus();

    if (status.isConnected && status.readyState === 1) {
      try {
        const rejectedProposal = {
          type: "decision",
          title: `Budget Change Rejected`,
          content: `Rejected budget reallocation. Reason: ${reason || "No reason provided"}`,
          reasoning: proposal.reasoning,
          dataReferences: [{
            type: "budget_change",
            current: proposal.current,
            proposed: proposal.proposed,
            expectedImpact: proposal.expectedImpact,
            rejectionReason: reason
          }],
          status: "rejected",
          expectedOutcome: proposal.expectedImpact,
          actualOutcome: "Proposal rejected by user",
          reviewDate: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await mongoose.connection.db.collection("marketing_strategy").insertOne(rejectedProposal);
      } catch (dbError) {
        logger.error("Error saving rejected proposal", { error: dbError.message });
      }
    }

    res.json({
      success: true,
      message: "Proposal rejected successfully",
      proposal: {
        ...proposal,
        status: "rejected",
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason
      }
    });
  } catch (error) {
    logger.error("Error rejecting proposal", { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// TOOL APPROVAL ENDPOINTS
// ============================================================================

// POST /api/chat/tools/approve - Approve and execute a tool proposal
router.post("/tools/approve", async (req, res) => {
  try {
    const { proposalId } = req.body;

    if (!proposalId) {
      return res.status(400).json({
        success: false,
        error: "Proposal ID is required"
      });
    }

    logger.info('Tool approval requested', { proposalId });

    // Find the proposal
    const proposal = await ToolProposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({
        success: false,
        error: 'Proposal not found'
      });
    }

    if (proposal.status !== 'pending_approval') {
      return res.status(400).json({
        success: false,
        error: `Proposal is not pending approval (current status: ${proposal.status})`
      });
    }

    // Mark as approved
    await proposal.approve('founder');

    logger.info('Tool proposal approved, executing', {
      proposalId,
      toolName: proposal.toolName
    });

    // Execute the tool
    const result = await executeTool(proposal);

    // Update proposal with execution result
    if (result.success) {
      await proposal.markExecuted(result.data);
    } else {
      await proposal.markFailed(result.error);
    }

    res.json({
      success: result.success,
      proposalId: proposal._id,
      toolName: proposal.toolName,
      result: result.data,
      error: result.error,
      executedAt: proposal.executedAt,
      message: result.success
        ? `Tool "${proposal.toolName}" executed successfully`
        : `Tool "${proposal.toolName}" execution failed`
    });
  } catch (error) {
    logger.error('Error approving tool proposal', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/chat/tools/reject - Reject a tool proposal
router.post("/tools/reject", async (req, res) => {
  try {
    const { proposalId, reason } = req.body;

    if (!proposalId) {
      return res.status(400).json({
        success: false,
        error: "Proposal ID is required"
      });
    }

    logger.info('Tool rejection requested', { proposalId, reason });

    const proposal = await ToolProposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({
        success: false,
        error: 'Proposal not found'
      });
    }

    if (proposal.status !== 'pending_approval') {
      return res.status(400).json({
        success: false,
        error: `Proposal is not pending approval (current status: ${proposal.status})`
      });
    }

    await proposal.reject(reason || 'User rejected the proposal', 'founder');

    logger.info('Tool proposal rejected', {
      proposalId,
      toolName: proposal.toolName,
      reason
    });

    res.json({
      success: true,
      message: 'Tool proposal rejected',
      proposalId: proposal._id,
      toolName: proposal.toolName,
      rejectionReason: reason
    });
  } catch (error) {
    logger.error('Error rejecting tool proposal', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/chat/tools/pending - Get pending tool proposals
router.get("/tools/pending", async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const proposals = await ToolProposal.getPending();

    res.json({
      success: true,
      proposals: proposals.slice(0, parseInt(limit)).map(p => ({
        id: p._id,
        toolName: p.toolName,
        parameters: p.toolParameters,
        reasoning: p.reasoning,
        requiresApproval: p.requiresApproval,
        createdAt: p.createdAt
      }))
    });
  } catch (error) {
    logger.error('Error getting pending proposals', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/chat/tools/history - Get executed tool history
router.get("/tools/history", async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const proposals = await ToolProposal.getRecentExecuted(parseInt(limit));

    res.json({
      success: true,
      proposals: proposals.map(p => ({
        id: p._id,
        toolName: p.toolName,
        parameters: p.toolParameters,
        reasoning: p.reasoning,
        status: p.status,
        executedAt: p.executedAt,
        executionDuration: p.executionDuration,
        executionError: p.executionError
      }))
    });
  } catch (error) {
    logger.error('Error getting tool history', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/chat/tools/list - Get list of available tools
router.get("/tools/list", async (req, res) => {
  try {
    const { getToolMetadata, getApprovalRequiredTools, getReadOnlyTools } = await import('../services/tinaTools/index.js');

    const approvalRequired = getApprovalRequiredTools();
    const readOnly = getReadOnlyTools();

    res.json({
      success: true,
      tools: {
        approvalRequired: approvalRequired.map(t => ({
          name: t.name,
          description: t.description,
          exampleUsage: t.exampleUsage,
          expectedImpact: t.expectedImpact
        })),
        readOnly: readOnly.map(t => ({
          name: t.name,
          description: t.description,
          exampleUsage: t.exampleUsage
        }))
      }
    });
  } catch (error) {
    logger.error('Error getting tools list', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/chat/daily-briefing - Generate daily briefing (now handled by dailyBriefing job)
router.get("/daily-briefing", async (req, res) => {
  try {
    // This endpoint now delegates to the dailyBriefing job
    // Return a simple status for now
    res.json({
      success: true,
      message: "Daily briefing is generated by the scheduled job. Check the /api/briefing endpoint for the latest briefing."
    });
  } catch (error) {
    logger.error("Error in daily briefing endpoint", { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/chat/decision/implement - Mark a decision as implemented
router.post("/decision/implement", async (req, res) => {
  try {
    const { decisionId, actualOutcome, notes } = req.body;

    if (!decisionId) {
      return res.status(400).json({
        success: false,
        error: "Decision ID is required"
      });
    }

    const status = databaseService.getStatus();

    if (!status.isConnected || status.readyState !== 1) {
      return res.json({
        success: true,
        message: "Decision marked as implemented (not persisted - no database connection)",
        decision: {
          id: decisionId,
          status: "implemented",
          actualOutcome: actualOutcome || null,
          implementationNotes: notes || null,
          implementedAt: new Date().toISOString()
        }
      });
    }

    const result = await mongoose.connection.db.collection("marketing_strategy").updateOne(
      { _id: decisionId },
      {
        $set: {
          status: "implemented",
          actualOutcome: actualOutcome || null,
          implementationNotes: notes || null,
          implementedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Decision not found"
      });
    }

    res.json({
      success: true,
      message: "Decision marked as implemented successfully",
      decision: {
        id: decisionId,
        status: "implemented",
        actualOutcome: actualOutcome || null,
        implementationNotes: notes || null,
        implementedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error("Error implementing decision", { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/chat/decisions - Get all strategic decisions with filtering
router.get("/decisions", async (req, res) => {
  try {
    const { status, type, limit = 50 } = req.query;

    const statusFilter = status ? { status: status } : {};
    const typeFilter = type ? { type: type } : {};

    const filter = {
      $or: [
        { type: "decision" },
        { type: "review" },
        { type: { $in: ["pivot", "recommendation", "analysis"] } }
      ],
      ...statusFilter,
      ...typeFilter
    };

    const statusDb = databaseService.getStatus();

    if (!statusDb.isConnected || statusDb.readyState !== 1) {
      return res.json({
        success: true,
        decisions: [],
        message: "Mock data - no database connection"
      });
    }

    const decisions = await mongoose.connection
      .collection("marketing_strategy")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .toArray();

    res.json({
      success: true,
      decisions: decisions.map(dec => ({
        id: dec._id,
        type: dec.type,
        title: dec.title,
        content: dec.content,
        reasoning: dec.reasoning,
        status: dec.status,
        expectedOutcome: dec.expectedOutcome,
        actualOutcome: dec.actualOutcome,
        implementationNotes: dec.implementationNotes,
        dataReferences: dec.dataReferences,
        reviewDate: dec.reviewDate,
        implementedAt: dec.implementedAt,
        createdAt: dec.createdAt,
        updatedAt: dec.updatedAt
      }))
    });
  } catch (error) {
    logger.error("Error fetching decisions", { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
