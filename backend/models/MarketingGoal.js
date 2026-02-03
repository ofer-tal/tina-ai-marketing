import mongoose from 'mongoose';
import { generateGoalId } from '../utils/tinaIdGenerator.js';

/**
 * Marketing Goal Model
 *
 * Stores long-term objectives for Tina's strategic memory system.
 * Tracks progress toward targets with milestones and trajectory analysis.
 */

const milestoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  targetValue: mongoose.Schema.Types.Mixed,
  targetDate: Date,
  achieved: {
    type: Boolean,
    default: false
  },
  achievedAt: Date
}, { _id: false });

const alertSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['at_risk', 'off_track', 'ahead', 'milestone_due', 'deadline_approaching'],
    required: true
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info'
  },
  message: String,
  triggeredAt: {
    type: Date,
    default: Date.now
  },
  acknowledged: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const trajectorySchema = new mongoose.Schema({
  trend: {
    type: String,
    enum: ['on_track', 'ahead', 'behind', 'unknown'],
    default: 'unknown'
  },
  projectedValue: mongoose.Schema.Types.Mixed,
  projectedAchievementDate: Date,
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  lastCalculated: Date
}, { _id: false });

const marketingGoalSchema = new mongoose.Schema({
  // Human-readable ID
  goalId: {
    type: String,
    unique: true,
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

  // Goal type
  type: {
    type: String,
    enum: ['revenue', 'growth', 'engagement', 'brand', 'experiment', 'custom'],
    default: 'custom',
    index: true
  },

  // Target tracking
  targetValue: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  currentValue: {
    type: mongoose.Schema.Types.Mixed,
    default: 0
  },

  startValue: {
    type: mongoose.Schema.Types.Mixed,
    default: 0
  },

  // Date tracking
  startDate: {
    type: Date,
    default: Date.now,
    index: true
  },

  targetDate: {
    type: Date,
    required: true
  },

  // Check-in frequency
  checkInFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly'],
    default: 'weekly'
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'active', 'at_risk', 'achieved', 'missed', 'cancelled'],
    default: 'draft',
    index: true
  },

  // Progress tracking (calculated field)
  progressPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // Trajectory analysis
  trajectory: {
    type: trajectorySchema,
    default: {}
  },

  // Milestones
  milestones: [milestoneSchema],

  // Linked strategies
  linkedStrategyIds: [{
    type: String,
    ref: 'MarketingGoal'
  }],

  // Alerts
  alerts: [alertSchema],

  // Priority
  priority: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },

  // Tags
  tags: [String],

  // Notes
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

  achievedAt: Date,
  missedAt: Date
}, {
  collection: 'marketing_goals',
  timestamps: true
});

// Indexes for efficient queries
marketingGoalSchema.index({ status: 1, targetDate: 1 });
marketingGoalSchema.index({ type: 1, status: 1 });
marketingGoalSchema.index({ linkedStrategyIds: 1 });
marketingGoalSchema.index({ targetDate: 1 });
marketingGoalSchema.index({ 'alerts.acknowledged': 1 });

/**
 * Generate goal ID before validation
 */
marketingGoalSchema.pre('validate', function(next) {
  if (!this.goalId) {
    this.goalId = generateGoalId();
  }
  next();
});

/**
 * Calculate and update progress
 */
marketingGoalSchema.methods.updateProgress = function(newValue) {
  const oldProgress = this.progressPercent;

  this.currentValue = newValue;

  // Calculate progress percentage
  const range = this.targetValue - this.startValue;
  if (range > 0) {
    this.progressPercent = Math.min(100, Math.max(0, ((newValue - this.startValue) / range) * 100));
  }

  // Check if achieved
  if (this.progressPercent >= 100 && this.status === 'active') {
    this.status = 'achieved';
    this.achievedAt = new Date();
  } else if (this.progressPercent < 100 && this.status === 'achieved') {
    // Reset achieved status if value dropped
    this.status = 'active';
    this.achievedAt = undefined;
  }

  this.markModified('progressPercent');

  return this.save();
};

/**
 * Add a milestone
 */
marketingGoalSchema.methods.addMilestone = function(name, targetValue, targetDate) {
  this.milestones.push({
    name,
    targetValue,
    targetDate,
    achieved: false
  });
  return this.save();
};

/**
 * Achieve a milestone
 */
marketingGoalSchema.methods.achieveMilestone = function(milestoneIndex) {
  if (milestoneIndex >= 0 && milestoneIndex < this.milestones.length) {
    this.milestones[milestoneIndex].achieved = true;
    this.milestones[milestoneIndex].achievedAt = new Date();
    this.markModified('milestones');
    return this.save();
  }
  throw new Error('Invalid milestone index');
};

/**
 * Calculate trajectory
 */
marketingGoalSchema.methods.calculateTrajectory = function() {
  const now = new Date();
  const totalDuration = this.targetDate - this.startDate;
  const elapsed = now - this.startDate;
  const progressPercent = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;

  const valueProgress = this.progressPercent;

  // Determine trend
  let trend = 'unknown';
  if (progressPercent > 0) {
    if (valueProgress >= progressPercent) {
      trend = valueProgress > progressPercent * 1.1 ? 'ahead' : 'on_track';
    } else {
      trend = valueProgress < progressPercent * 0.8 ? 'behind' : 'on_track';
    }
  }

  // Project completion date
  let projectedDate = null;
  if (progressPercent > 5 && valueProgress > 0) {
    const rate = valueProgress / progressPercent;
    const projectedDays = totalDuration / rate;
    projectedDate = new Date(this.startDate.getTime() + projectedDays);
  }

  this.trajectory = {
    trend,
    projectedValue: null, // Could calculate based on trend
    projectedAchievementDate: projectedDate,
    confidence: progressPercent > 50 ? 75 : 50,
    lastCalculated: now
  };

  // Update status based on trajectory
  if (this.status === 'active' && trend === 'behind' && progressPercent > 50) {
    this.status = 'at_risk';
  } else if (this.status === 'at_risk' && (trend === 'on_track' || trend === 'ahead')) {
    this.status = 'active';
  }

  return this.save();
};

/**
 * Add an alert
 */
marketingGoalSchema.methods.addAlert = function(type, message, severity = 'info') {
  this.alerts.push({
    type,
    severity,
    message,
    triggeredAt: new Date(),
    acknowledged: false
  });
  this.markModified('alerts');
  return this.save();
};

/**
 * Acknowledge alerts
 */
marketingGoalSchema.methods.acknowledgeAlerts = function() {
  this.alerts.forEach(alert => {
    alert.acknowledged = true;
  });
  this.markModified('alerts');
  return this.save();
};

/**
 * Mark goal as achieved
 */
marketingGoalSchema.methods.markAchieved = function(notes = '') {
  this.status = 'achieved';
  this.achievedAt = new Date();
  this.progressPercent = 100;

  if (notes) {
    this.notes.push({
      content: `Goal achieved: ${notes}`,
      addedAt: new Date(),
      addedBy: 'system'
    });
  }

  return this.save();
};

/**
 * Mark goal as missed
 */
marketingGoalSchema.methods.markMissed = function(reason = '') {
  this.status = 'missed';
  this.missedAt = new Date();

  if (reason) {
    this.notes.push({
      content: `Goal missed: ${reason}`,
      addedAt: new Date(),
      addedBy: 'system'
    });
  }

  return this.save();
};

/**
 * Cancel goal
 */
marketingGoalSchema.methods.cancel = function(reason = '') {
  this.status = 'cancelled';

  if (reason) {
    this.notes.push({
      content: `Goal cancelled: ${reason}`,
      addedAt: new Date(),
      addedBy: 'system'
    });
  }

  return this.save();
};

/**
 * Add a note
 */
marketingGoalSchema.methods.addNote = function(content, user = 'tina') {
  this.notes.push({
    content,
    addedAt: new Date(),
    addedBy: user
  });
  return this.save();
};

/**
 * Get unacknowledged alerts
 */
marketingGoalSchema.methods.getUnacknowledgedAlerts = function() {
  return this.alerts.filter(a => !a.acknowledged);
};

// Static methods

/**
 * Get all active goals
 */
marketingGoalSchema.statics.getActive = function() {
  return this.find({ status: 'active' }).sort({ targetDate: 1 });
};

/**
 * Get goals by status
 */
marketingGoalSchema.statics.getByStatus = function(status) {
  return this.find({ status }).sort({ targetDate: 1 });
};

/**
 * Get at-risk goals
 */
marketingGoalSchema.statics.getAtRisk = function() {
  return this.find({ status: 'at_risk' }).sort({ targetDate: 1 });
};

/**
 * Get goals due soon
 */
marketingGoalSchema.statics.getDueSoon = function(days = 7) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + days);

  return this.find({
    status: { $in: ['active', 'at_risk'] },
    targetDate: { $lte: threshold }
  }).sort({ targetDate: 1 });
};

/**
 * Get overdue goals
 */
marketingGoalSchema.statics.getOverdue = function() {
  const now = new Date();

  return this.find({
    status: { $in: ['active', 'at_risk'] },
    targetDate: { $lt: now }
  }).sort({ targetDate: 1 });
};

/**
 * Get goals by type
 */
marketingGoalSchema.statics.getByType = function(type) {
  return this.find({ type }).sort({ targetDate: 1 });
};

/**
 * Get achieved goals
 */
marketingGoalSchema.statics.getAchieved = function(limit = 50) {
  return this.find({ status: 'achieved' })
    .sort({ achievedAt: -1 })
    .limit(limit);
};

/**
 * Get goals with unacknowledged alerts
 */
marketingGoalSchema.staticsWithAlerts = function() {
  return this.find({ 'alerts.acknowledged': false }).sort({ targetDate: 1 });
};

/**
 * Get goals needing check-in
 */
marketingGoalSchema.statics.getNeedingCheckIn = function() {
  const now = new Date();
  const frequencies = {
    daily: 1,
    weekly: 7,
    biweekly: 14,
    monthly: 30,
    quarterly: 90
  };

  const goals = this.find({ status: { $in: ['active', 'at_risk'] } });

  // Filter by last check-in (updated at)
  return goals.then(goals => {
    return goals.filter(goal => {
      const daysSinceUpdate = (now - goal.updatedAt) / (1000 * 60 * 60 * 24);
      const threshold = frequencies[goal.checkInFrequency] || 7;
      return daysSinceUpdate >= threshold;
    });
  });
};

const MarketingGoal = mongoose.model('MarketingGoal', marketingGoalSchema);

export default MarketingGoal;
