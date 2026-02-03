import mongoose from 'mongoose';
import { generateStrategyId } from '../utils/tinaIdGenerator.js';

/**
 * Marketing Strategy Model
 *
 * Stores strategic initiatives for Tina's strategic memory system.
 * Supports both broad strategies and specific tactics with parent/child relationships.
 */

const statusHistoryEntrySchema = new mongoose.Schema({
  status: {
    type: String,
    required: true
  },
  changedAt: {
    type: Date,
    default: Date.now
  },
  changedBy: {
    type: String,
    default: 'tina'
  },
  reason: String
}, { _id: false });

const timeframeSchema = new mongoose.Schema({
  start: Date,
  end: Date
}, { _id: false });

const outcomeSchema = new mongoose.Schema({
  metric: String,
  expectedValue: mongoose.Schema.Types.Mixed,
  actualValue: mongoose.Schema.Types.Mixed,
  percentAchieved: Number,
  notes: String
}, { _id: false });

const marketingStrategySchema = new mongoose.Schema({
  // Human-readable ID
  strategyId: {
    type: String,
    unique: true,
    index: true
  },

  // Parent strategy for hierarchical relationships
  parentStrategyId: {
    type: String,
    default: null,
    index: true
  },

  // Strategy level: broad (parent) or specific (child/tactic)
  level: {
    type: String,
    enum: ['broad', 'specific'],
    default: 'broad',
    index: true
  },

  // Basic info
  name: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    default: ''
  },

  // The hypothesis being tested
  hypothesis: {
    type: String,
    required: true
  },

  // When this strategy runs
  timeframe: {
    type: timeframeSchema,
    default: {}
  },

  // Success measurement
  successMetric: {
    type: String,
    required: true
  },

  targetValue: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  currentBaseline: {
    type: mongoose.Schema.Types.Mixed,
    default: 0
  },

  currentValue: {
    type: mongoose.Schema.Types.Mixed,
    default: 0
  },

  // Status tracking
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed', 'cancelled', 'failed'],
    default: 'draft',
    index: true
  },

  statusHistory: [statusHistoryEntrySchema],

  // Outcomes when completed
  outcomes: [outcomeSchema],

  // Related goals
  relatedGoalIds: [{
    type: String,
    ref: 'MarketingGoal'
  }],

  // Category for grouping/filtering
  category: {
    type: String,
    default: 'general'
  },

  // Priority weighting
  priority: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },

  // Tags for filtering
  tags: [String],

  // Notes and updates
  notes: [{
    content: String,
    addedAt: {
      type: Date,
      default: Date.now
    },
    addedBy: {
      type: String,
      default: 'tina'
    }
  }],

  // Metadata
  createdBy: {
    type: String,
    default: 'tina'
  },

  autoCreated: {
    type: Boolean,
    default: false
  }
}, {
  collection: 'marketing_strategies',
  timestamps: true
});

// Indexes for efficient queries
marketingStrategySchema.index({ status: 1, createdAt: -1 });
marketingStrategySchema.index({ parentStrategyId: 1, status: 1 });
marketingStrategySchema.index({ relatedGoalIds: 1 });
marketingStrategySchema.index({ level: 1, status: 1 });
marketingStrategySchema.index({ category: 1, status: 1 });
marketingStrategySchema.index({ 'timeframe.start': 1, 'timeframe.end': 1 });

/**
 * Generate strategy ID before validation
 */
marketingStrategySchema.pre('validate', function(next) {
  if (!this.strategyId) {
    this.strategyId = generateStrategyId();
  }
  next();
});

/**
 * Virtual for progress percentage
 */
marketingStrategySchema.virtual('progressPercent').get(function() {
  if (this.targetValue === 0) return 0;
  const baseline = this.currentBaseline || 0;
  const current = this.currentValue || 0;
  const target = this.targetValue;
  const range = target - baseline;
  if (range <= 0) return 0;
  return Math.min(100, Math.max(0, ((current - baseline) / range) * 100));
});

/**
 * Mark strategy as approved and active
 */
marketingStrategySchema.methods.approve = function(user = 'founder') {
  this.status = 'active';
  this.addStatusHistory('active', `Approved by ${user}`);
  return this.save();
};

/**
 * Mark strategy as completed with outcomes
 */
marketingStrategySchema.methods.complete = function(outcomes = [], user = 'founder') {
  this.status = 'completed';
  this.outcomes = outcomes;
  this.addStatusHistory('completed', `Completed by ${user}`, outcomes);
  return this.save();
};

/**
 * Pause the strategy
 */
marketingStrategySchema.methods.pause = function(reason = '') {
  this.status = 'paused';
  this.addStatusHistory('paused', reason);
  return this.save();
};

/**
 * Resume a paused strategy
 */
marketingStrategySchema.methods.resume = function(user = 'founder') {
  if (this.status !== 'paused') {
    throw new Error('Can only resume paused strategies');
  }
  this.status = 'active';
  this.addStatusHistory('active', `Resumed by ${user}`);
  return this.save();
};

/**
 * Cancel the strategy
 */
marketingStrategySchema.methods.cancel = function(reason = '') {
  this.status = 'cancelled';
  this.addStatusHistory('cancelled', reason);
  return this.save();
};

/**
 * Add a child strategy
 */
marketingStrategySchema.methods.addChild = function(childStrategyId) {
  // This is a logical helper - actual linking done via parentStrategyId on child
  return this;
};

/**
 * Update current value
 */
marketingStrategySchema.methods.updateValue = function(newValue) {
  this.currentValue = newValue;
  return this.save();
};

/**
 * Add a note
 */
marketingStrategySchema.methods.addNote = function(content, user = 'tina') {
  this.notes.push({
    content,
    addedAt: new Date(),
    addedBy: user
  });
  return this.save();
};

/**
 * Add status history entry
 */
marketingStrategySchema.methods.addStatusHistory = function(status, reason = '', extraData = {}) {
  this.statusHistory.push({
    status,
    changedAt: new Date(),
    changedBy: 'system',
    reason,
    ...extraData
  });
  this.markModified('statusHistory');
  return this;
};

/**
 * Check if strategy is active
 */
marketingStrategySchema.methods.isActive = function() {
  return this.status === 'active';
};

/**
 * Check if strategy is editable
 */
marketingStrategySchema.methods.isEditable = function() {
  return ['draft', 'active', 'paused'].includes(this.status);
};

// Static methods

/**
 * Get all active strategies
 */
marketingStrategySchema.statics.getActive = function() {
  return this.find({ status: 'active' }).sort({ createdAt: -1 });
};

/**
 * Get strategies by parent
 */
marketingStrategySchema.statics.getByParent = function(parentStrategyId) {
  return this.find({ parentStrategyId }).sort({ createdAt: -1 });
};

/**
 * Get strategies by status
 */
marketingStrategySchema.statics.getByStatus = function(status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

/**
 * Get broad strategies (top-level)
 */
marketingStrategySchema.statics.getBroad = function() {
  return this.find({
    level: 'broad',
    parentStrategyId: { $eq: null }
  }).sort({ createdAt: -1 });
};

/**
 * Get specific strategies (tactics)
 */
marketingStrategySchema.statics.getSpecific = function() {
  return this.find({ level: 'specific' }).sort({ createdAt: -1 });
};

/**
 * Get strategies by category
 */
marketingStrategySchema.statics.getByCategory = function(category) {
  return this.find({ category }).sort({ createdAt: -1 });
};

/**
 * Get strategies related to a goal
 */
marketingStrategySchema.statics.getByGoal = function(goalId) {
  return this.find({ relatedGoalIds: goalId }).sort({ createdAt: -1 });
};

/**
 * Get draft strategies
 */
marketingStrategySchema.statics.getDrafts = function() {
  return this.find({ status: 'draft' }).sort({ createdAt: -1 });
};

/**
 * Get completed strategies with outcomes
 */
marketingStrategySchema.statics.getCompletedWithOutcomes = function(limit = 50) {
  return this.find({ status: 'completed' })
    .sort({ updatedAt: -1 })
    .limit(limit);
};

/**
 * Get strategies that should be reviewed (active for > 30 days without updates)
 */
marketingStrategySchema.statics.getStale = function(daysThreshold = 30) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - daysThreshold);

  return this.find({
    status: 'active',
    updatedAt: { $lt: threshold }
  }).sort({ updatedAt: 1 });
};

/**
 * Get strategy tree (hierarchical view)
 */
marketingStrategySchema.statics.getTree = function() {
  return this.getByParent(null).populate('getChildren');
};

const MarketingStrategy = mongoose.model('MarketingStrategy', marketingStrategySchema);

export default MarketingStrategy;
