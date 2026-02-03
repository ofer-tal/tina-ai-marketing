import mongoose from 'mongoose';
import { generateObservationId } from '../utils/tinaIdGenerator.js';

/**
 * Tina Observation Model
 *
 * Stores Tina's proactive observations and insights.
 * These are messages Tina wants to bring to the user's attention.
 */

const observationDetailSchema = new mongoose.Schema({
  metric: String,
  value: mongoose.Schema.Types.Mixed,
  previousValue: mongoose.Schema.Types.Mixed,
  changePercent: Number,
  changeDirection: {
    type: String,
    enum: ['up', 'down', 'neutral']
  },
  context: String
}, { _id: false });

const actionRequestSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['create_post', 'update_strategy', 'run_experiment', 'adjust_schedule', 'review_content', 'other']
  },
  description: String,
  parameters: mongoose.Schema.Types.Mixed,
  estimatedEffort: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  }
}, { _id: false });

const tinaObservationSchema = new mongoose.Schema({
  // Human-readable ID
  observationId: {
    type: String,
    unique: true,
    index: true
  },

  // Urgency level
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },

  // Category
  category: {
    type: String,
    enum: ['performance', 'opportunity', 'risk', 'pattern', 'milestone', 'system', 'general'],
    default: 'general',
    index: true
  },

  // Title
  title: {
    type: String,
    required: true
  },

  // Summary (short description)
  summary: {
    type: String,
    required: true
  },

  // Detailed information
  details: {
    type: observationDetailSchema,
    default: {}
  },

  // Related goal
  relatedGoalId: {
    type: String,
    ref: 'MarketingGoal'
  },

  // Related strategy
  relatedStrategyId: {
    type: String,
    ref: 'MarketingStrategy'
  },

  // Related experiment
  relatedExperimentId: {
    type: String,
    ref: 'MarketingExperiment'
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'acknowledged', 'dismissed', 'expired', 'actioned'],
    default: 'pending',
    index: true
  },

  // Whether this can be auto-executed
  autoExecutable: {
    type: Boolean,
    default: false
  },

  // Action request details
  actionRequest: {
    type: actionRequestSchema,
    default: null
  },

  // Expiration (for time-sensitive observations)
  expiresAt: {
    type: Date
  },

  // When acknowledged
  acknowledgedAt: Date,

  // When dismissed
  dismissedAt: Date,

  // Dismissal reason
  dismissalReason: String,

  // When actioned
  actionedAt: Date,

  // Action result
  actionResult: String,

  // Tags
  tags: [String],

  // Additional notes
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
  }
}, {
  collection: 'marketing_observations',
  timestamps: true
});

// Indexes for efficient queries
tinaObservationSchema.index({ status: 1, urgency: 1, createdAt: -1 });
tinaObservationSchema.index({ category: 1, status: 1 });
tinaObservationSchema.index({ expiresAt: 1 });
tinaObservationSchema.index({ relatedGoalId: 1 });
tinaObservationSchema.index({ relatedStrategyId: 1 });

/**
 * Generate observation ID before validation
 */
tinaObservationSchema.pre('validate', function(next) {
  if (!this.observationId) {
    this.observationId = generateObservationId();
  }
  next();
});

/**
 * Acknowledge the observation
 */
tinaObservationSchema.methods.acknowledge = function(user = 'founder') {
  this.status = 'acknowledged';
  this.acknowledgedAt = new Date();

  this.notes.push({
    content: `Acknowledged by ${user}`,
    addedAt: new Date(),
    addedBy: user
  });

  return this.save();
};

/**
 * Dismiss the observation
 */
tinaObservationSchema.methods.dismiss = function(reason = '') {
  this.status = 'dismissed';
  this.dismissedAt = new Date();
  this.dismissalReason = reason;

  return this.save();
};

/**
 * Execute the suggested action
 */
tinaObservationSchema.methods.executeAction = function(result = '') {
  this.status = 'actioned';
  this.actionedAt = new Date();
  this.actionResult = result;

  return this.save();
};

/**
 * Mark as expired
 */
tinaObservationSchema.methods.expire = function() {
  if (this.status === 'pending') {
    this.status = 'expired';
  }
  return this.save();
};

/**
 * Add a note
 */
tinaObservationSchema.methods.addNote = function(content, user = 'tina') {
  this.notes.push({
    content,
    addedAt: new Date(),
    addedBy: user
  });
  return this.save();
};

/**
 * Check if observation is expired
 */
tinaObservationSchema.methods.isExpired = function() {
  if (!this.expiresAt) return false;
  return new Date() >= this.expiresAt;
};

/**
 * Check if observation can be acted upon
 */
tinaObservationSchema.methods.isActionable = function() {
  return this.autoExecutable && this.actionRequest && this.status === 'pending';
};

/**
 * Get urgency score for sorting
 */
tinaObservationSchema.methods.getUrgencyScore = function() {
  const scores = { critical: 4, high: 3, medium: 2, low: 1 };
  return scores[this.urgency] || 0;
};

// Static methods

/**
 * Get pending observations
 */
tinaObservationSchema.statics.getPending = function() {
  return this.find({ status: 'pending' })
    .sort([['urgency', -1], ['createdAt', -1]]);
};

/**
 * Get observations by urgency
 */
tinaObservationSchema.statics.getByUrgency = function(urgency) {
  return this.find({ urgency, status: 'pending' })
    .sort({ createdAt: -1 });
};

/**
 * Get observations by category
 */
tinaObservationSchema.statics.getByCategory = function(category) {
  return this.find({ category })
    .sort({ createdAt: -1 });
};

/**
 * Get critical observations
 */
tinaObservationSchema.statics.getCritical = function() {
  return this.find({
    urgency: 'critical',
    status: 'pending'
  }).sort({ createdAt: -1 });
};

/**
 * Get high urgency observations
 */
tinaObservationSchema.statics.getHighUrgency = function() {
  return this.find({
    urgency: { $in: ['high', 'critical'] },
    status: 'pending'
  }).sort([['urgency', -1], ['createdAt', -1]]);
};

/**
 * Get observations by goal
 */
tinaObservationSchema.statics.getByGoal = function(goalId) {
  return this.find({ relatedGoalId: goalId })
    .sort({ createdAt: -1 });
};

/**
 * Get observations by strategy
 */
tinaObservationSchema.statics.getByStrategy = function(strategyId) {
  return this.find({ relatedStrategyId: strategyId })
    .sort({ createdAt: -1 });
};

/**
 * Get expired observations
 */
tinaObservationSchema.statics.getExpired = function() {
  return this.find({
    status: 'pending',
    expiresAt: { $lt: new Date() }
  });
};

/**
 * Get actionable observations
 */
tinaObservationSchema.statics.getActionable = function() {
  return this.find({
    status: 'pending',
    autoExecutable: true
  }).sort([['urgency', -1], ['createdAt', -1]]);
};

/**
 * Get recent observations
 */
tinaObservationSchema.statics.getRecent = function(days = 7, status = null) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - days);

  const query = { createdAt: { $gte: threshold } };
  if (status) {
    query.status = status;
  }

  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Get observations by tag
 */
tinaObservationSchema.statics.getByTag = function(tag) {
  return this.find({ tags: tag })
    .sort({ createdAt: -1 });
};

/**
 * Archive old observations
 */
tinaObservationSchema.statics.archiveOld = function(days = 90) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - days);

  return this.updateMany(
    {
      status: { $in: ['acknowledged', 'dismissed', 'expired', 'actioned'] },
      updatedAt: { $lt: threshold }
    },
    { $set: { archived: true } }
  );
};

/**
 * Get observations needing attention (sorted by urgency)
 */
tinaObservationSchema.statics.getNeedingAttention = function() {
  return this.find({
    status: 'pending',
    $or: [
      { expiresAt: null },
      { expiresAt: { $gte: new Date() } }
    ]
  }).sort([['urgency', -1], ['createdAt', -1]]);
};

const TinaObservation = mongoose.model('TinaObservation', tinaObservationSchema);

export default TinaObservation;
