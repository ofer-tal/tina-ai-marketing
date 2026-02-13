import mongoose from 'mongoose';
import { generatePlanId } from '../utils/tinaIdGenerator.js';

/**
 * Marketing Plan Model
 *
 * Stores rolling multi-horizon plans for Tina's strategic memory.
 * Tracks scheduled actions and dependencies across time horizons.
 */

const periodSchema = new mongoose.Schema({
  start: {
    type: Date,
    required: true
  },
  end: {
    type: Date,
    required: true
  },
  name: String // e.g., "February 2026"
}, { _id: false });

const focusAreaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  priority: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  relatedGoalIds: [String],
  relatedStrategyIds: [String],
  allocatedPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  }
}, { _id: false });

const scheduledActionSchema = new mongoose.Schema({
  actionId: {
    type: String,
    unique: true,
    sparse: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  type: {
    type: String,
    enum: ['content', 'experiment', 'analysis', 'optimization', 'review', 'other'],
    default: 'other'
  },
  scheduledFor: Date,
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'skipped', 'cancelled'],
    default: 'pending'
  },
  completedAt: Date,
  completedBy: String,
  result: String,
  estimatedEffort: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  relatedGoalId: String,
  relatedStrategyId: String
}, { _id: true });

const dependencySchema = new mongoose.Schema({
  dependsOn: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  type: {
    type: String,
    enum: ['blocks', 'informs', 'enhances'],
    default: 'informs'
  },
  description: String
}, { _id: false });

const progressSchema = new mongoose.Schema({
  percentComplete: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  actionsCompleted: {
    type: Number,
    default: 0
  },
  actionsTotal: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  notes: String
}, { _id: false });

const marketingPlanSchema = new mongoose.Schema({
  // Human-readable ID
  planId: {
    type: String,
    unique: true,
    index: true
  },

  // Planning horizon
  horizon: {
    type: String,
    enum: ['weekly', 'monthly', 'quarterly', 'annual'],
    required: true,
    index: true
  },

  // Time period this plan covers
  period: {
    type: periodSchema,
    required: true
  },

  // Main focus areas for this period
  focusAreas: [focusAreaSchema],

  // Scheduled actions
  scheduledActions: [scheduledActionSchema],

  // Dependencies
  dependencies: [dependencySchema],

  // Status
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'archived'],
    default: 'draft',
    index: true
  },

  // Progress tracking
  progress: {
    type: progressSchema,
    default: {}
  },

  // Related goals
  relatedGoalIds: [{
    type: String,
    ref: 'MarketingGoal'
  }],

  // Related strategies
  relatedStrategyIds: [{
    type: String,
    ref: 'MarketingStrategy'
  }],

  // Budget allocation
  budgetAllocation: {
    total: Number,
    spent: Number,
    remaining: Number,
    currency: {
      type: String,
      default: 'USD'
    }
  },

  // Key performance indicators for this plan
  kpis: [{
    metric: String,
    target: mongoose.Schema.Types.Mixed,
    current: mongoose.Schema.Types.Mixed,
    status: {
      type: String,
      enum: ['on_track', 'ahead', 'behind', 'unknown'],
      default: 'unknown'
    }
  }],

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

  // Tags
  tags: [String],

  // Metadata
  createdBy: {
    type: String,
    default: 'tina'
  },

  // Approved by
  approvedBy: String,
  approvedAt: Date
}, {
  collection: 'marketing_plans',
  timestamps: true
});

// Indexes for efficient queries
marketingPlanSchema.index({ horizon: 1, status: 1, 'period.start': 1 });
marketingPlanSchema.index({ relatedGoalIds: 1 });
marketingPlanSchema.index({ relatedStrategyIds: 1 });
marketingPlanSchema.index({ status: 1, 'period.end': 1 });
marketingPlanSchema.index({ 'period.start': 1, 'period.end': 1 });

/**
 * Generate plan ID before validation
 */
marketingPlanSchema.pre('beforeValidation', function(next) {
  if (!this.planId) {
    this.planId = generatePlanId();
  }
  next();
});

/**
 * Add an action to the plan
 */
marketingPlanSchema.methods.addAction = function(name, description, scheduledFor, options = {}) {
  const actionId = `action_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  this.scheduledActions.push({
    actionId,
    name,
    description,
    scheduledFor,
    type: options.type || 'other',
    estimatedEffort: options.estimatedEffort || 'medium',
    relatedGoalId: options.relatedGoalId,
    relatedStrategyId: options.relatedStrategyId,
    status: 'pending'
  });

  this.markModified('scheduledActions');
  this.calculateProgress();

  return this.save();
};

/**
 * Complete an action
 */
marketingPlanSchema.methods.completeAction = function(actionId, result = '', completedBy = 'system') {
  const action = this.scheduledActions.find(a => a.actionId === actionId || a._id.toString() === actionId);

  if (!action) {
    throw new Error(`Action ${actionId} not found`);
  }

  action.status = 'completed';
  action.completedAt = new Date();
  action.completedBy = completedBy;
  action.result = result;

  this.markModified('scheduledActions');
  this.calculateProgress();

  return this.save();
};

/**
 * Calculate progress
 */
marketingPlanSchema.methods.calculateProgress = function() {
  const total = this.scheduledActions.length;
  const completed = this.scheduledActions.filter(a => a.status === 'completed').length;

  this.progress = {
    percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0,
    actionsCompleted: completed,
    actionsTotal: total,
    lastUpdated: new Date(),
    notes: this.progress.notes || ''
  };

  this.markModified('progress');

  // Auto-complete plan if all actions done
  if (total > 0 && completed === total && this.status === 'active') {
    this.status = 'completed';
  }

  return this;
};

/**
 * Activate the plan
 */
marketingPlanSchema.methods.activate = function(approvedBy = 'founder') {
  if (this.status !== 'draft') {
    throw new Error('Can only activate draft plans');
  }

  this.status = 'active';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();

  return this.save();
};

/**
 * Archive the plan
 */
marketingPlanSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

/**
 * Add a focus area
 */
marketingPlanSchema.methods.addFocusArea = function(name, description, priority = 5) {
  this.focusAreas.push({
    name,
    description,
    priority,
    allocatedPercentage: 0
  });

  this.markModified('focusAreas');
  return this.save();
};

/**
 * Add a dependency
 */
marketingPlanSchema.methods.addDependency = function(dependsOn, type = 'informs', description = '') {
  this.dependencies.push({
    dependsOn,
    type,
    description
  });

  this.markModified('dependencies');
  return this.save();
};

/**
 * Update KPI status
 */
marketingPlanSchema.methods.updateKpi = function(metricName, currentValue) {
  const kpi = this.kpis.find(k => k.metric === metricName);

  if (kpi) {
    kpi.current = currentValue;

    // Simple status calculation
    const target = kpi.target;
    if (typeof target === 'number' && typeof currentValue === 'number') {
      const ratio = currentValue / target;
      if (ratio >= 1) {
        kpi.status = 'ahead';
      } else if (ratio >= 0.8) {
        kpi.status = 'on_track';
      } else {
        kpi.status = 'behind';
      }
    }

    this.markModified('kpis');
  }

  return this.save();
};

/**
 * Update budget spent
 */
marketingPlanSchema.methods.updateSpent = function(amount) {
  this.budgetAllocation.spent = amount;
  if (this.budgetAllocation.total) {
    this.budgetAllocation.remaining = this.budgetAllocation.total - amount;
  }
  this.markModified('budgetAllocation');
  return this.save();
};

/**
 * Add a note
 */
marketingPlanSchema.methods.addNote = function(content, user = 'tina') {
  this.notes.push({
    content,
    addedAt: new Date(),
    addedBy: user
  });
  return this.save();
};

/**
 * Get pending actions
 */
marketingPlanSchema.methods.getPendingActions = function() {
  return this.scheduledActions.filter(a => a.status === 'pending');
};

/**
 * Get overdue actions
 */
marketingPlanSchema.methods.getOverdueActions = function() {
  const now = new Date();
  return this.scheduledActions.filter(a => a.status === 'pending' && a.scheduledFor && a.scheduledFor < now);
};

// Static methods

/**
 * Get active plans by horizon
 */
marketingPlanSchema.statics.getActiveByHorizon = function(horizon) {
  return this.find({
    horizon,
    status: 'active'
  }).sort({ 'period.start': -1 });
};

/**
 * Get current plan for a horizon
 */
marketingPlanSchema.statics.getCurrent = function(horizon) {
  const now = new Date();

  return this.findOne({
    horizon,
    status: { $in: ['draft', 'active'] },
    'period.start': { $lte: now },
    'period.end': { $gte: now }
  });
};

/**
 * Get all current plans (all horizons)
 */
marketingPlanSchema.statics.getAllCurrent = function() {
  const now = new Date();

  return this.find({
    status: { $in: ['draft', 'active'] },
    'period.start': { $lte: now },
    'period.end': { $gte: now }
  }).sort({ horizon: 1 });
};

/**
 * Get plans by status
 */
marketingPlanSchema.statics.getByStatus = function(status) {
  return this.find({ status })
    .sort({ 'period.start': -1 });
};

/**
 * Get completed plans
 */
marketingPlanSchema.statics.getCompleted = function(limit = 20) {
  return this.find({ status: 'completed' })
    .sort({ 'period.end': -1 })
    .limit(limit);
};

/**
 * Get plans by goal
 */
marketingPlanSchema.statics.getByGoal = function(goalId) {
  return this.find({ relatedGoalIds: goalId })
    .sort({ 'period.start': -1 });
};

/**
 * Get plans by strategy
 */
marketingPlanSchema.statics.getByStrategy = function(strategyId) {
  return this.find({ relatedStrategyIds: strategyId })
    .sort({ 'period.start': -1 });
};

/**
 * Get upcoming plans
 */
marketingPlanSchema.statics.getUpcoming = function(days = 30) {
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);

  return this.find({
    status: 'draft',
    'period.start': { $gte: now, $lte: future }
  }).sort({ 'period.start': 1 });
};

/**
 * Get plans ending soon
 */
marketingPlanSchema.statics.getEndingSoon = function(days = 7) {
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);

  return this.find({
    status: 'active',
    'period.end': { $gte: now, $lte: future }
  }).sort({ 'period.end': 1 });
};

/**
 * Get overdue plans
 */
marketingPlanSchema.statics.getOverdue = function() {
  const now = new Date();

  return this.find({
    status: 'active',
    'period.end': { $lt: now }
  }).sort({ 'period.end': 1 });
};

const MarketingPlan = mongoose.model('MarketingPlan', marketingPlanSchema);

export default MarketingPlan;
