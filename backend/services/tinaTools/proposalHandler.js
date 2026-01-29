import ToolProposal from '../../models/ToolProposal.js';
import { getToolDefinition, isApprovalRequired, formatToolCallForDisplay } from './definitions.js';
import { executeTool } from './executor.js';
import { getLogger } from '../../utils/logger.js';

const logger = getLogger('proposal-handler', 'proposal-handler');

/**
 * Tool Proposal Handler
 *
 * Intercepts tool calls from Tina and creates approval proposals
 * instead of executing actions directly.
 */

/**
 * Handle a tool call from Tina
 * Creates a proposal for user approval before execution
 *
 * @param {object} toolCall - Tool call data from AI
 * @param {Array} messages - Conversation messages for context
 * @param {string} conversationId - Current conversation ID
 * @param {object} dataContext - Current data context
 * @returns {Promise<object>} Response with proposal data
 */
export async function handleToolCallProposal(toolCall, messages = [], conversationId = null, dataContext = {}) {
  const { id: toolCallId, name: toolName, parameters } = toolCall;

  logger.info('Handling tool call proposal', {
    toolName,
    toolCallId,
    conversationId,
    parameters: JSON.stringify(parameters)
  });

  // Get tool definition
  const toolDef = getToolDefinition(toolName);
  if (!toolDef) {
    logger.warn('Unknown tool requested', { toolName });
    return {
      type: 'error',
      content: `I tried to use a tool called "${toolName}" but it doesn't exist. Let me continue without that action.`
    };
  }

  // Check if tool requires approval
  const requiresApproval = isApprovalRequired(toolName);

  // Extract reasoning from conversation context
  const reasoning = await extractReasoningFromContext(messages, toolName, parameters);

  // Generate human-readable action description
  const actionDisplay = formatToolCallForDisplay(toolName, parameters);

  // Create proposal record
  const proposal = await ToolProposal.create({
    toolName,
    toolParameters: parameters,
    reasoning: reasoning,
    proposedBy: 'tina',
    status: requiresApproval ? 'pending_approval' : 'approved',
    requiresApproval: requiresApproval,
    conversationId: conversationId,
    messageId: `${conversationId}_${toolCallId}`,
    userId: 'founder',
    expectedImpact: actionDisplay.exampleImpact || toolDef.expectedImpact || ''
  });

  logger.info('Tool proposal created', {
    proposalId: proposal._id,
    toolName,
    requiresApproval,
    status: proposal.status
  });

  // For read-only tools, execute immediately and return results
  if (!requiresApproval) {
    logger.info('Executing read-only tool immediately', { toolName, parameters });

    try {
      // Create a mock proposal object for the executor
      const mockProposal = {
        _id: proposal._id,
        toolName,
        toolParameters: parameters
      };

      // Execute the tool
      const result = await executeTool(mockProposal);

      logger.info('Read-only tool executed successfully', {
        toolName,
        success: result.success,
        hasData: !!result.data
      });

      // Update proposal with execution result
      proposal.executionResult = result.data;
      proposal.executedAt = new Date();
      proposal.status = 'executed';
      await proposal.save();

      // Return result with tool data for the AI to use in its response
      return {
        type: 'read_only_tool_result',
        toolName,
        parameters,
        reasoning,
        actionDisplay,
        proposalId: proposal._id,
        requiresApproval: false,
        executed: true,
        success: result.success,
        data: result.data,
        error: result.error,
        // Generate a message that includes the tool result for the AI to incorporate
        message: generateToolResultMessage(toolName, result.data, result.error)
      };
    } catch (error) {
      logger.error('Error executing read-only tool', {
        toolName,
        error: error.message,
        stack: error.stack
      });

      proposal.executionError = error.message;
      proposal.status = 'failed';
      await proposal.save();

      return {
        type: 'tool_error',
        toolName,
        parameters,
        error: error.message,
        message: `I tried to fetch that data but encountered an error: ${error.message}`
      };
    }
  }

  // Return approval request response
  return {
    type: 'tool_proposal',
    toolName,
    parameters,
    reasoning,
    actionDisplay,
    proposalId: proposal._id,
    requiresApproval: true,
    // Generate user-friendly message
    message: generateProposalMessage(toolName, parameters, reasoning, actionDisplay)
  };
}

/**
 * Extract Tina's reasoning from conversation context
 * Analyzes the conversation to understand WHY Tina wants to do this
 */
async function extractReasoningFromContext(messages, toolName, parameters) {
  // Get recent assistant messages that might contain reasoning
  const recentAssistantMessages = messages
    .filter(m => m.role === 'assistant')
    .slice(-3);

  // Get the most recent user message to understand context
  const lastUserMessage = messages
    .filter(m => m.role === 'user')
    .slice(-1)[0];

  let reasoning = '';

  // Build reasoning from context
  if (lastUserMessage) {
    reasoning += `Responding to: "${lastUserMessage.content.substring(0, 100)}${lastUserMessage.content.length > 100 ? '...' : ''}"\n`;
  }

  // Add tool-specific reasoning based on parameters
  switch (toolName) {
    case 'update_posting_schedule':
      reasoning += `Proposing to increase posting frequency to ${parameters.frequency}x/day`;
      if (parameters.platforms) {
        reasoning += ` on ${parameters.platforms.join(', ')}`;
      }
      reasoning += `. Based on current engagement trends, this should increase content output and reach.`;
      break;

    case 'update_content_generation_prompt':
      reasoning += `Updating ${parameters.category} content prompt to: "${parameters.promptAddition}"`;
      reasoning += `. This should improve content quality based on performance analysis.`;
      break;

    case 'update_campaign_budget':
      reasoning += `Adjusting campaign ${parameters.campaignId} budget to $${parameters.dailyBudget}/day.`;
      reasoning += ` ${parameters.reasoning}`;
      break;

    case 'pause_campaign':
      reasoning += `Pausing campaign ${parameters.campaignId}.`;
      reasoning += ` ${parameters.reasoning}`;
      break;

    case 'approve_pending_posts':
      reasoning += `Approving ${parameters.count} pending posts`;
      if (parameters.criteria) {
        reasoning += ` using criteria: ${parameters.criteria}`;
      }
      reasoning += `. This will ensure consistent content flow.`;
      break;

    default:
      reasoning += `Executing ${toolName} with parameters: ${JSON.stringify(parameters)}`;
  }

  return reasoning;
}

/**
 * Generate a user-friendly proposal message
 */
function generateProposalMessage(toolName, parameters, reasoning, actionDisplay) {
  const toolFriendlyName = formatToolName(toolName);

  return `I recommend we **${actionDisplay.description}**.

**Why:**
${reasoning}

**What this does:**
${getToolDescription(toolName)}

**Impact:**
${actionDisplay.exampleImpact || 'This change should help improve our marketing performance.'}

Do you approve this action?`;
}

/**
 * Format tool name for display
 */
function formatToolName(toolName) {
  return toolName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get human-readable tool description
 */
function getToolDescription(toolName) {
  try {
    const definition = getToolDefinition(toolName);
    return definition?.description || `Executes ${toolName}`;
  } catch {
    return `Executes ${toolName}`;
  }
}

/**
 * Generate message with tool result data for AI to incorporate
 */
function generateToolResultMessage(toolName, data, error) {
  if (error) {
    return `I encountered an error fetching that data: ${error}`;
  }

  if (!data) {
    return `I tried to fetch that data, but no results were returned.`;
  }

  // Format data based on tool type
  switch (toolName) {
    case 'get_revenue_summary':
      return `**Revenue Data Retrieved:**

Current MRR: $${data.current?.mrr || 'N/A'}
Subscribers: ${data.current?.subscribers || 'N/A'}
ARPU: $${data.current?.arpu || 'N/A'}
Net Revenue: $${data.current?.netRevenue || 'N/A'}
Growth: ${data.growth?.percentage || 0}% (${data.growth?.absolute >= 0 ? '+' : ''}$${data.growth?.absolute || 0})
New Users: ${data.metrics?.newUsers || 0}
Churned: ${data.metrics?.churnedSubscribers || 0}

Use this data in your response.`;

    case 'get_content_analytics':
      return `**Content Analytics Retrieved:**

Total Posts: ${data.totalPosts || 'N/A'}
Avg Engagement: ${data.avgEngagement !== undefined ? (data.avgEngagement * 100).toFixed(1) + '%' : 'N/A'}
Top Performing Category: ${data.topCategory || 'N/A'}
${data.byPlatform ? `By Platform: ${Object.entries(data.byPlatform).map(([p, v]) => `${p}: ${v}`).join(', ')}` : ''}

Use this data in your response.`;

    case 'get_campaign_performance':
      return `**Campaign Performance Retrieved:**

Total Spend: $${data.totalSpend?.toFixed(2) || 'N/A'}
Total Impressions: ${data.totalImpressions?.toLocaleString() || 'N/A'}
Total Conversions: ${data.totalConversions || 'N/A'}
ROAS: ${data.roas?.toFixed(2) || 'N/A'}
CPA: $${data.cpa?.toFixed(2) || 'N/A'}

Use this data in your response.`;

    case 'get_budget_status':
      return `**Budget Status Retrieved:**

Daily Budget: $${data.dailyBudget || 'N/A'}
Spent Today: $${data.spentToday?.toFixed(2) || 'N/A'}
Remaining: $${data.remaining?.toFixed(2) || 'N/A'}
Utilization: ${data.utilization !== undefined ? (data.utilization * 100).toFixed(1) + '%' : 'N/A'}

Use this data in your response.`;

    case 'get_aso_keyword_status':
      return `**ASO Keyword Status Retrieved:**

${data.keywords ? data.keywords.slice(0, 10).map(k => `- ${k.keyword}: #${k.ranking}`).join('\n') : ''}

Use this data in your response.`;

    case 'get_pending_posts':
      return `**Pending Posts Retrieved:**

${data.posts ? `${data.posts.length} posts pending approval` : 'No pending posts'}

Use this data in your response.`;

    default:
      return `Data retrieved successfully. ${JSON.stringify(data).substring(0, 200)}`;
  }
}

/**
function getToolDescription(toolName) {
  const descriptions = {
    update_posting_schedule: 'Changes how many times we post content per day across social platforms.',
    update_content_generation_prompt: 'Updates the AI prompts used to generate content, affecting the style and focus of future posts.',
    update_campaign_budget: 'Adjusts the daily spend limit for an Apple Search Ads campaign.',
    pause_campaign: 'Stops all spending on a campaign immediately while keeping it active for later resuming.',
    approve_pending_posts: 'Bulk-approves generated posts so they can be automatically scheduled and published.',
    update_hashtag_strategy: 'Changes the hashtag approach for content to improve discoverability.',
    create_content_experiment: 'Sets up an A/B test to validate a hypothesis about what content performs best.',
    get_campaign_performance: 'Retrieves metrics and performance data for advertising campaigns.',
    get_content_analytics: 'Fetches detailed statistics about how content is performing.',
    get_budget_status: 'Gets current budget utilization and remaining spend.',
    get_aso_keyword_status: 'Retrieves current App Store keyword rankings.',
    get_revenue_summary: 'Fetches current revenue metrics and trends.',
    get_pending_posts: 'Lists all posts waiting for approval.'
  };

  return descriptions[toolName] || 'Executes a system action.';
}

/**
 * Get proposal status for frontend display
 */
export async function getProposalStatus(proposalId) {
  try {
    const proposal = await ToolProposal.findById(proposalId);
    if (!proposal) {
      return { found: false, status: 'not_found' };
    }

    return {
      found: true,
      status: proposal.status,
      toolName: proposal.toolName,
      requiresApproval: proposal.requiresApproval,
      executedAt: proposal.executedAt,
      executionResult: proposal.executionResult,
      executionError: proposal.executionError
    };
  } catch (error) {
    logger.error('Error getting proposal status', { error: error.message, proposalId });
    return { found: false, error: error.message };
  }
}

/**
 * List pending proposals for a user
 */
export async function getPendingProposals(userId = 'founder', limit = 20) {
  try {
    const proposals = await ToolProposal.find({
      userId,
      status: 'pending_approval'
    })
      .sort({ createdAt: -1 })
      .limit(limit);

    return {
      success: true,
      proposals: proposals.map(p => ({
        id: p._id,
        toolName: p.toolName,
        parameters: p.toolParameters,
        reasoning: p.reasoning,
        createdAt: p.createdAt
      }))
    };
  } catch (error) {
    logger.error('Error getting pending proposals', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get recent executed proposals for audit trail
 */
export async function getRecentExecuted(limit = 50) {
  try {
    const proposals = await ToolProposal.getRecentExecuted(limit);

    return {
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
    };
  } catch (error) {
    logger.error('Error getting executed proposals', { error: error.message });
    return { success: false, error: error.message };
  }
}

export default {
  handleToolCallProposal,
  getProposalStatus,
  getPendingProposals,
  getRecentExecuted
};
