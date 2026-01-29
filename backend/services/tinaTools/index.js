/**
 * Tina Tools Module
 *
 * Exports all tool-related functionality for Tina's function calling system.
 */

// Tool definitions
export {
  APPROVAL_REQUIRED_TOOLS,
  READ_ONLY_TOOLS,
  getAllToolsForAPI,
  getToolDefinition,
  isApprovalRequired,
  getApprovalRequiredTools,
  getReadOnlyTools,
  TOOL_NAMES,
  validateToolParameters,
  formatToolCallForDisplay
} from './definitions.js';

// Proposal handler
export {
  handleToolCallProposal,
  getProposalStatus,
  getPendingProposals,
  getRecentExecuted
} from './proposalHandler.js';

// Tool executor - import default and re-export as named exports
import executor from './executor.js';
export const {
  executeTool,
  // Approval-required tools
  updatePostingSchedule,
  updateContentPrompt,
  updateCampaignBudget,
  pauseCampaign,
  approvePendingPosts,
  updateHashtagStrategy,
  createContentExperiment,
  // Read-only tools - existing
  getCampaignPerformance,
  getContentAnalytics,
  getBudgetStatus,
  getASOKeywordStatus,
  getRevenueSummary,
  getPendingPosts,
  // Read-only tools - Phase 1: High-Value Tools
  getConversionMetrics,
  getAcquisitionMetrics,
  getLTVByChannel,
  getCampaignROI,
  getSpendByChannel,
  getROIByChannel,
  // Phase 2: User Behavior & Retention
  getRetentionMetrics,
  getUserActivityMetrics,
  getSubscriptionTierPerformance,
  // Phase 3: Content & ASO Enhancements
  getKeywordPerformance,
  getAppStorePerformance,
  getOptimalPostingTimes,
  getTrafficSources
} = executor;

// Convenience exports
import { getAllToolsForAPI, getToolDefinition, isApprovalRequired } from './definitions.js';
import { handleToolCallProposal } from './proposalHandler.js';

/**
 * Get all tools formatted for API
 */
export function getAllTools() {
  return getAllToolsForAPI();
}

/**
 * Get combined tool metadata
 */
export function getToolMetadata(toolName) {
  const definition = getToolDefinition(toolName);
  if (!definition) {
    return null;
  }

  return {
    name: toolName,
    description: definition.description,
    requiresApproval: isApprovalRequired(toolName),
    parameters: definition.parameters,
    expectedImpact: definition.expectedImpact,
    exampleUsage: definition.exampleUsage
  };
}

export default {
  getAllTools,
  getToolDefinition,
  getToolMetadata,
  isApprovalRequired,
  handleToolCallProposal,
  executeTool
};
