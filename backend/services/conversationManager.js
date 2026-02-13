import glmService from './glmService.js';
import ChatConversation from '../models/ChatConversation.js';
import { getContextualPrompt } from './tinaPersonality.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('conversation-manager', 'conversation-manager');

// Updated model name for marketing collection prefix
const MarketingChatConversation = ChatConversation;

/**
 * Context Window Management Configuration
 */
const CONFIG = {
  MAX_CONTEXT_MESSAGES: 20,      // Maximum messages to include in full context
  SUMMARY_TRIGGER_MESSAGES: 30,  // When to trigger summarization
  SUMMARY_CUTOFF_MESSAGES: 10,   // Keep last 10 messages after summarization
  MAX_SUMMARY_POINTS: 8,         // Maximum summary points to keep
  SUMMARY_TOKEN_LIMIT: 500       // Target token count for summary
};

/**
 * Conversation Manager
 *
 * Handles:
 * - Context window management for long conversations
 * - Intelligent conversation summarization using GLM
 * - Message retrieval and formatting
 * - Conversation state management
 */
class ConversationManager {
  constructor() {
    this.config = CONFIG;
  }

  /**
   * Get conversation by ID
   */
  async getConversation(conversationId) {
    try {
      return await MarketingChatConversation.findById(conversationId);
    } catch (error) {
      logger.error('Error fetching conversation', {
        conversationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(initialData = {}) {
    try {
      const conversation = new MarketingChatConversation({
        title: initialData.title || 'New Conversation',
        isActive: true,
        messages: [],
        metadata: {
          messageCount: 0,
          totalTokens: 0,
          categoryTags: initialData.categoryTags || []
        }
      });

      await conversation.save();
      logger.info('Created new conversation', { conversationId: conversation._id });

      return conversation;
    } catch (error) {
      logger.error('Error creating conversation', { error: error.message });
      throw error;
    }
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(conversationId, role, content, metadata = {}) {
    try {
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        throw new Error(`Conversation not found: ${conversationId}`);
      }

      conversation.addMessage(role, content, metadata);
      await conversation.save();

      logger.debug('Added message to conversation', {
        conversationId,
        role,
        contentLength: content.length
      });

      return conversation;
    } catch (error) {
      logger.error('Error adding message', {
        conversationId,
        role,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get formatted messages for API call
   * Applies context window management and includes system prompt
   */
  async getMessagesForAPI(conversationId, includeSystem = true) {
    try {
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        throw new Error(`Conversation not found: ${conversationId}`);
      }

      // Check if we need to summarize
      const shouldSummarize = this.shouldSummarize(conversation);
      if (shouldSummarize) {
        await this.summarizeConversation(conversationId);
        // Reload conversation after summary
        conversation = await this.getConversation(conversationId);
      }

      // Build messages array
      const messages = [];

      // Add system prompt with context
      if (includeSystem) {
        const systemPrompt = getContextualPrompt(conversation.contextData || {});
        messages.push({
          role: 'system',
          content: systemPrompt
        });
      }

      // Add summary if exists
      if (conversation.summary) {
        messages.push({
          role: 'system',
          content: `**Previous Conversation Summary:**\n\n${conversation.summary}\n\nContinue the conversation with this context in mind.`
        });
      }

      // Add recent messages
      const recentMessages = conversation.getRecentMessages(this.config.MAX_CONTEXT_MESSAGES);
      for (const msg of recentMessages) {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }

      return {
        messages,
        hasSummary: !!conversation.summary,
        messageCount: conversation.messages.length
      };
    } catch (error) {
      logger.error('Error getting messages for API', {
        conversationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Check if a conversation should be summarized
   */
  shouldSummarize(conversation) {
    const messageCount = conversation.messages.length;
    const hasSummary = !!conversation.summary;

    // Summarize if:
    // - We have no summary and hit the trigger point
    // - We have a summary but have added many new messages
    if (!hasSummary) {
      return messageCount >= this.config.SUMMARY_TRIGGER_MESSAGES;
    } else {
      // Count messages since last summary (rough estimate based on summary points)
      return messageCount >= this.config.SUMMARY_TRIGGER_MESSAGES * 1.5;
    }
  }

  /**
   * Summarize a conversation using GLM
   */
  async summarizeConversation(conversationId) {
    try {
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        throw new Error(`Conversation not found: ${conversationId}`);
      }

      logger.info('Summarizing conversation', {
        conversationId,
        messageCount: conversation.messages.length
      });

      // Get messages to summarize (all but the most recent ones)
      const messagesToSummarize = conversation.messages
        .slice(0, -this.config.SUMMARY_CUTOFF_MESSAGES)
        .filter(m => m.role !== 'system');

      // Build summarization prompt
      const summaryPrompt = this._buildSummaryPrompt(messagesToSummarize);

      // Call GLM to generate summary
      const response = await glmService.createMessage({
        messages: [
          {
            role: 'user',
            content: summaryPrompt
          }
        ],
        maxTokens: this.config.SUMMARY_TOKEN_LIMIT,
        temperature: 0.3  // Lower temperature for more focused summaries
      });

      // Parse the summary response
      const summaryContent = response.content[0]?.text || '';
      const { summary, points } = this._parseSummaryResponse(summaryContent);

      // Update conversation with summary
      conversation.updateSummary(summary, points);
      await conversation.save();

      logger.info('Conversation summarized', {
        conversationId,
        summaryPoints: points.length,
        originalMessageCount: messagesToSummarize.length
      });

      return { summary, points };
    } catch (error) {
      logger.error('Error summarizing conversation', {
        conversationId,
        error: error.message
      });
      // Don't throw - summarization failure shouldn't break the conversation
      return null;
    }
  }

  /**
   * Build prompt for conversation summarization
   */
  _buildSummaryPrompt(messages) {
    const conversationText = messages
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    return `Summarize this conversation into key points for context preservation:

${conversationText}

Extract and format as:
1. **Summary**: A 2-3 sentence overview of what was discussed
2. **Topics**: The main topics covered (comma-separated)
3. **Decisions**: Any decisions made (if any)
4. **Action Items**: Any action items discussed (if any)
5. **Key Data**: Important metrics or numbers mentioned (if any)

Keep it concise but preserve essential context for continuing the conversation.`;
  }

  /**
   * Parse summary response from GLM
   */
  _parseSummaryResponse(response) {
    let summary = '';
    const points = [];

    // Extract summary section
    const summaryMatch = response.match(/\*\*Summary\*\*:\s*([\s\S]*?)(?=\n\n|\n\*\*Topics|\n\*\*Decisions|$)/i);
    if (summaryMatch) {
      summary = summaryMatch[1].trim();
    } else {
      // Fallback: use first paragraph
      summary = response.split('\n\n')[0].substring(0, 200);
    }

    // Extract topics
    const topicsMatch = response.match(/\*\*Topics\*\*:\s*([^\n]*)/i);
    if (topicsMatch) {
      points.push(`**Topics:** ${topicsMatch[1].trim()}`);
    }

    // Extract decisions
    const decisionsMatch = response.match(/\*\*Decisions\*\*:\s*([\s\S]*?)(?=\n\n|\n\*\*|$)/i);
    if (decisionsMatch && decisionsMatch[1].trim()) {
      points.push(`**Decisions:** ${decisionsMatch[1].trim()}`);
    }

    // Extract action items
    const actionsMatch = response.match(/\*\*Action Items\*\*:\s*([\s\S]*?)(?=\n\n|\n\*\*|$)/i);
    if (actionsMatch && actionsMatch[1].trim()) {
      points.push(`**Action Items:** ${actionsMatch[1].trim()}`);
    }

    // Extract key data
    const dataMatch = response.match(/\*\*Key Data\*\*:\s*([\s\S]*?)(?=\n\n|\n\*\*|$)/i);
    if (dataMatch && dataMatch[1].trim()) {
      points.push(`**Key Data:** ${dataMatch[1].trim()}`);
    }

    // If no structured points found, extract bullet points from response
    if (points.length === 0) {
      const bulletMatches = response.match(/[-•]\s*(.*?)(?=\n|$)/g);
      if (bulletMatches) {
        points.push(...bulletMatches.slice(0, this.config.MAX_SUMMARY_POINTS).map(b => b.trim()));
      }
    }

    return { summary, points: points.slice(0, this.config.MAX_SUMMARY_POINTS) };
  }

  /**
   * Archive a conversation
   */
  async archiveConversation(conversationId) {
    try {
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        throw new Error(`Conversation not found: ${conversationId}`);
      }

      await conversation.archive();
      logger.info('Archived conversation', { conversationId });

      return conversation;
    } catch (error) {
      logger.error('Error archiving conversation', {
        conversationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Restore an archived conversation
   */
  async restoreConversation(conversationId) {
    try {
      const conversation = await MarketingChatConversation.findOne({ _id: conversationId, isActive: false });
      if (!conversation) {
        throw new Error(`Archived conversation not found: ${conversationId}`);
      }

      await conversation.restore();
      logger.info('Restored conversation', { conversationId });

      return conversation;
    } catch (error) {
      logger.error('Error restoring conversation', {
        conversationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Search conversations
   */
  async searchConversations(query) {
    try {
      return await MarketingChatConversation.searchConversations(query);
    } catch (error) {
      logger.error('Error searching conversations', {
        query,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get active conversations
   */
  async getActiveConversations(limit = 20) {
    try {
      return await MarketingChatConversation.getActiveConversations()
        .limit(limit)
        .lean();
    } catch (error) {
      logger.error('Error getting active conversations', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update context data for a conversation
   */
  async updateContextData(conversationId, contextData) {
    try {
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        throw new Error(`Conversation not found: ${conversationId}`);
      }

      conversation.contextData = {
        ...conversation.contextData,
        ...contextData
      };

      await conversation.save();

      logger.debug('Updated context data', { conversationId });

      return conversation;
    } catch (error) {
      logger.error('Error updating context data', {
        conversationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId) {
    try {
      const result = await MarketingChatConversation.deleteOne({ _id: conversationId });
      logger.info('Deleted conversation', { conversationId });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error('Error deleting conversation', {
        conversationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Clear all active conversations
   */
  async clearAllActive() {
    try {
      const result = await MarketingChatConversation.updateMany(
        { isActive: true },
        { isActive: false, archivedAt: new Date() }
      );

      logger.info('Cleared all active conversations', {
        count: result.modifiedCount
      });

      return result.modifiedCount;
    } catch (error) {
      logger.error('Error clearing active conversations', {
        error: error.message
      });
      throw error;
    }
  }
}

// Export singleton instance
const conversationManager = new ConversationManager();
export default conversationManager;
