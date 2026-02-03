import mongoose from 'mongoose';
import { generateThoughtLogId } from '../utils/tinaIdGenerator.js';

/**
 * Tina Thought Log Model
 *
 * Stores Tina's persistent thoughts and reasoning.
 * Acts as Tina's scratchpad for tracking thinking patterns.
 */

const dataPointSchema = new mongoose.Schema({
  type: String,
  value: mongoose.Schema.Types.Mixed,
  source: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const tinaThoughtLogSchema = new mongoose.Schema({
  // Human-readable ID
  thoughtId: {
    type: String,
    unique: true,
    index: true
  },

  // Thought type
  thoughtType: {
    type: String,
    enum: ['hypothesis', 'observation', 'analysis', 'question', 'idea', 'conclusion', 'decision', 'general'],
    default: 'general',
    index: true
  },

  // When this thought occurred
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Related conversation
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatConversation',
    index: true
  },

  // Related strategy
  strategyId: {
    type: String,
    ref: 'MarketingStrategy',
    index: true
  },

  // Related goal
  goalId: {
    type: String,
    ref: 'MarketingGoal'
  },

  // Related experiment
  experimentId: {
    type: String,
    ref: 'MarketingExperiment'
  },

  // The thought itself
  thought: {
    type: String,
    required: true
  },

  // Confidence level (0-100)
  confidence: {
    type: Number,
    default: 50,
    min: 0,
    max: 100
  },

  // Data points supporting this thought
  dataPoints: [dataPointSchema],

  // What triggered this thought
  triggers: [{
    type: {
      type: String,
      enum: ['metric_change', 'user_query', 'observation', 'experiment_result', 'pattern_detected', 'system_event']
    },
    description: String,
    sourceId: String
  }],

  // Whether this thought should trigger an action
  triggersAction: {
    type: Boolean,
    default: false
  },

  // The action triggered (if any)
  triggeredAction: {
    type: String,
    enum: ['create_strategy', 'update_strategy', 'create_experiment', 'create_goal', 'create_observation', 'other', null],
    default: null
  },

  // Action details
  actionDetails: mongoose.Schema.Types.Mixed,

  // Whether this thought has been validated
  validated: {
    type: Boolean,
    default: false
  },

  // Validation result
  validationResult: {
    correct: Boolean,
    actualOutcome: String,
    validatedAt: Date
  },

  // Category for grouping
  category: {
    type: String,
    default: 'general'
  },

  // Tags
  tags: [String],

  // Related learning (if this led to a learning)
  relatedLearningId: {
    type: String,
    ref: 'TinaLearning'
  }
}, {
  collection: 'marketing_thoughts',
  timestamps: true
});

// Indexes for efficient queries
tinaThoughtLogSchema.index({ thoughtType: 1, timestamp: -1 });
tinaThoughtLogSchema.index({ strategyId: 1, timestamp: -1 });
tinaThoughtLogSchema.index({ conversationId: 1, timestamp: -1 });
tinaThoughtLogSchema.index({ validated: 1, triggersAction: 1 });
tinaThoughtLogSchema.index({ category: 1, timestamp: -1 });
tinaThoughtLogSchema.index({ createdAt: -1 });

/**
 * Generate thought ID before validation
 */
tinaThoughtLogSchema.pre('validate', function(next) {
  if (!this.thoughtId) {
    this.thoughtId = generateThoughtLogId();
  }
  next();
});

/**
 * Mark thought as validated
 */
tinaThoughtLogSchema.methods.validate = function(correct, actualOutcome = '') {
  this.validated = true;
  this.validationResult = {
    correct,
    actualOutcome,
    validatedAt: new Date()
  };
  return this.save();
};

/**
 * Trigger an action based on this thought
 */
tinaThoughtLogSchema.methods.triggerAction = function(actionType, details = null) {
  this.triggersAction = true;
  this.triggeredAction = actionType;
  this.actionDetails = details;
  return this.save();
};

/**
 * Add a data point
 */
tinaThoughtLogSchema.methods.addDataPoint = function(type, value, source = '') {
  this.dataPoints.push({
    type,
    value,
    source,
    timestamp: new Date()
  });
  this.markModified('dataPoints');
  return this.save();
};

/**
 * Add a trigger
 */
tinaThoughtLogSchema.methods.addTrigger = function(type, description = '', sourceId = '') {
  this.triggers.push({
    type,
    description,
    sourceId
  });
  this.markModified('triggers');
  return this.save();
};

/**
 * Link to a learning
 */
tinaThoughtLogSchema.methods.linkToLearning = function(learningId) {
  this.relatedLearningId = learningId;
  return this.save();
};

/**
 * Check if thought is actionable
 */
tinaThoughtLogSchema.methods.isActionable = function() {
  return this.triggersAction && this.triggeredAction;
};

// Static methods

/**
 * Get thoughts by strategy
 */
tinaThoughtLogSchema.statics.getByStrategy = function(strategyId) {
  return this.find({ strategyId })
    .sort({ timestamp: -1 });
};

/**
 * Get thoughts by type
 */
tinaThoughtLogSchema.statics.getByType = function(thoughtType, limit = 100) {
  return this.find({ thoughtType })
    .sort({ timestamp: -1 })
    .limit(limit);
};

/**
 * Get recent thoughts
 */
tinaThoughtLogSchema.statics.getRecent = function(hours = 24, limit = 100) {
  const threshold = new Date();
  threshold.setHours(threshold.getHours() - hours);

  return this.find({
    timestamp: { $gte: threshold }
  })
    .sort({ timestamp: -1 })
    .limit(limit);
};

/**
 * Get thoughts by conversation
 */
tinaThoughtLogSchema.statics.getByConversation = function(conversationId) {
  return this.find({ conversationId })
    .sort({ timestamp: -1 });
};

/**
 * Get unvalidated thoughts
 */
tinaThoughtLogSchema.statics.getUnvalidated = function() {
  return this.find({ validated: false })
    .sort({ timestamp: -1 });
};

/**
 * Get actionable thoughts
 */
tinaThoughtLogSchema.statics.getActionable = function() {
  return this.find({
    triggersAction: true,
    triggeredAction: { $ne: null }
  })
    .sort({ timestamp: -1 });
};

/**
 * Get thoughts by category
 */
tinaThoughtLogSchema.statics.getByCategory = function(category, days = 30) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - days);

  return this.find({
    category,
    timestamp: { $gte: threshold }
  })
    .sort({ timestamp: -1 });
};

/**
 * Get thoughts that led to learnings
 */
tinaThoughtLogSchema.statics.getWithLearnings = function() {
  return this.find({
    relatedLearningId: { $ne: null }
  })
    .sort({ timestamp: -1 })
    .populate('relatedLearningId');
};

/**
 * Get hypotheses
 */
tinaThoughtLogSchema.statics.getHypotheses = function() {
  return this.find({ thoughtType: 'hypothesis' })
    .sort({ timestamp: -1 });
};

/**
 * Get ideas
 */
tinaThoughtLogSchema.statics.getIdeas = function() {
  return this.find({ thoughtType: 'idea' })
    .sort({ timestamp: -1 });
};

/**
 * Get high confidence thoughts
 */
tinaThoughtLogSchema.statics.getHighConfidence = function(minConfidence = 75) {
  return this.find({
    confidence: { $gte: minConfidence }
  })
    .sort({ confidence: -1, timestamp: -1 });
};

/**
 * Get thoughts by tag
 */
tinaThoughtLogSchema.statics.getByTag = function(tag) {
  return this.find({ tags: tag })
    .sort({ timestamp: -1 });
};

/**
 * Search thoughts by content
 */
tinaThoughtLogSchema.statics.searchThoughts = function(query, limit = 50) {
  return this.find({
    thought: { $regex: query, $options: 'i' }
  })
    .sort({ timestamp: -1 })
    .limit(limit);
};

/**
 * Clean up old thoughts
 */
tinaThoughtLogSchema.statics.cleanupOld = function(days = 90) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - days);

  return this.deleteMany({
    timestamp: { $lt: threshold },
    validated: true,
    relatedLearningId: { $eq: null } // Only delete if not linked to learning
  });
};

const TinaThoughtLog = mongoose.model('TinaThoughtLog', tinaThoughtLogSchema);

export default TinaThoughtLog;
