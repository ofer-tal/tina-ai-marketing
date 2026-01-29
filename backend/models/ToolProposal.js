import mongoose from 'mongoose';

/**
 * Tool Proposal Model
 *
 * Stores tool execution proposals from Tina (AI Marketing Executive)
 * Tracks the approval workflow and execution results for audit trail
 */

const toolProposalSchema = new mongoose.Schema({
  // Tool identification
  toolName: {
    type: String,
    required: true,
    index: true
  },

  // Tool parameters (what the AI wants to do)
  toolParameters: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  // Tina's reasoning for wanting to execute this tool
  reasoning: {
    type: String,
    required: true
  },

  // Who proposed this action
  proposedBy: {
    type: String,
    default: 'tina'
  },

  // Approval workflow status
  status: {
    type: String,
    enum: ['pending_approval', 'approved', 'rejected', 'executed', 'failed'],
    default: 'pending_approval',
    index: true
  },

  // Whether this action requires user approval
  requiresApproval: {
    type: Boolean,
    default: true
  },

  // Conversation context
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatConversation'
  },

  // Message ID in the conversation that triggered this proposal
  messageId: {
    type: String
  },

  // User who will approve/reject (for single-user system, this is 'founder')
  userId: {
    type: String,
    default: 'founder'
  },

  // Approval tracking
  approvedAt: {
    type: Date
  },

  approvedBy: {
    type: String,
    default: null
  },

  // Rejection tracking
  rejectedAt: {
    type: Date
  },

  rejectionReason: {
    type: String
  },

  // Execution tracking
  executedAt: {
    type: Date
  },

  executionResult: {
    type: mongoose.Schema.Types.Mixed
  },

  executionError: {
    type: String
  },

  // Duration of execution in milliseconds
  executionDuration: {
    type: Number
  },

  // Audit metadata
  ipAddress: String,
  userAgent: String,

  // Previous state (for rollback capability)
  previousState: {
    type: mongoose.Schema.Types.Mixed
  },

  // Expected impact (from Tina's reasoning)
  expectedImpact: {
    type: String
  },

  // Actual impact (filled in after execution if measurable)
  actualImpact: {
    type: String
  }
}, {
  collection: 'tool_proposals',
  timestamps: true
});

// Indexes for efficient queries
toolProposalSchema.index({ status: 1, createdAt: -1 });
toolProposalSchema.index({ conversationId: 1, createdAt: -1 });
toolProposalSchema.index({ toolName: 1, status: 1 });
toolProposalSchema.index({ userId: 1, status: 1 });

/**
 * Mark proposal as approved
 */
toolProposalSchema.methods.approve = function(user = 'founder') {
  this.status = 'approved';
  this.approvedAt = new Date();
  this.approvedBy = user;
  return this.save();
};

/**
 * Mark proposal as rejected
 */
toolProposalSchema.methods.reject = function(reason = '', user = 'founder') {
  this.status = 'rejected';
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  this.approvedBy = user; // Track who rejected
  return this.save();
};

/**
 * Mark proposal as executed with result
 */
toolProposalSchema.methods.markExecuted = function(result = null) {
  this.status = 'executed';
  this.executedAt = new Date();
  this.executionResult = result;
  this.executionDuration = this.executedAt - this.createdAt;
  return this.save();
};

/**
 * Mark proposal as failed with error
 */
toolProposalSchema.methods.markFailed = function(error = '') {
  this.status = 'failed';
  this.executedAt = new Date();
  this.executionError = error;
  this.executionDuration = this.executedAt - this.createdAt;
  return this.save();
};

/**
 * Static method to get pending proposals
 */
toolProposalSchema.statics.getPending = function() {
  return this.find({ status: 'pending_approval' })
    .sort({ createdAt: -1 });
};

/**
 * Static method to get proposals by conversation
 */
toolProposalSchema.statics.getByConversation = function(conversationId) {
  return this.find({ conversationId })
    .sort({ createdAt: -1 });
};

/**
 * Static method to get recent executed proposals for audit
 */
toolProposalSchema.statics.getRecentExecuted = function(limit = 50) {
  return this.find({ status: { $in: ['executed', 'failed'] } })
    .sort({ executedAt: -1 })
    .limit(limit);
};

const ToolProposal = mongoose.model('ToolProposal', toolProposalSchema);

export default ToolProposal;
