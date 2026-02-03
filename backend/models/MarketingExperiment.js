import mongoose from 'mongoose';
import { generateExperimentId } from '../utils/tinaIdGenerator.js';

/**
 * Marketing Experiment Model
 *
 * Stores A/B tests and experiments for Tina's strategic memory system.
 * Tracks variants, sample sizes, results, and statistical significance.
 */

const variantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  allocation: {
    type: Number,
    default: 50, // Percentage of traffic
    min: 0,
    max: 100
  },
  metrics: {
    // Metric name -> value map
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map()
  },
  sampleSize: {
    type: Number,
    default: 0
  },
  isControl: {
    type: Boolean,
    default: false
  }
}, { _id: true });

const resultSchema = new mongoose.Schema({
  variantName: {
    type: String,
    required: true
  },
  metric: {
    type: String,
    required: true
  },
  value: mongoose.Schema.Types.Mixed,
  changePercent: Number,
  isSignificant: {
    type: Boolean,
    default: false
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100
  },
  pValue: Number
}, { _id: false });

const marketingExperimentSchema = new mongoose.Schema({
  // Human-readable ID
  experimentId: {
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

  // Hypothesis being tested
  hypothesis: {
    type: String,
    required: true
  },

  // Success metric
  successMetric: {
    type: String,
    required: true
  },

  // Test variants
  variants: [variantSchema],

  // Duration
  duration: {
    type: Number, // in days
    default: 14
  },

  // Dates
  startDate: {
    type: Date,
    index: true
  },

  endDate: {
    type: Date,
    index: true
  },

  actualEndDate: {
    type: Date
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'running', 'paused', 'completed', 'cancelled', 'inconclusive'],
    default: 'draft',
    index: true
  },

  // Sample size requirements
  minSampleSize: {
    type: Number,
    default: 1000
  },

  currentSampleSize: {
    type: Number,
    default: 0
  },

  // Results
  results: [resultSchema],

  // Winning variant
  winningVariant: String,

  // Statistical significance threshold
  significanceThreshold: {
    type: Number,
    default: 0.05, // p-value threshold
    min: 0,
    max: 1
  },

  // Related strategies
  relatedStrategyIds: [{
    type: String,
    ref: 'MarketingStrategy'
  }],

  // Related goals
  relatedGoalIds: [{
    type: String,
    ref: 'MarketingGoal'
  }],

  // Category
  category: {
    type: String,
    default: 'general'
  },

  // Platform (if applicable)
  platform: {
    type: String,
    enum: ['instagram', 'tiktok', 'youtube', 'general', 'other'],
    default: 'general'
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

  // Learning/outcomes
  learnings: String,

  // Action taken based on results
  actionTaken: String
}, {
  collection: 'marketing_experiments',
  timestamps: true
});

// Indexes for efficient queries
marketingExperimentSchema.index({ status: 1, endDate: 1 });
marketingExperimentSchema.index({ relatedStrategyIds: 1 });
marketingExperimentSchema.index({ relatedGoalIds: 1 });
marketingExperimentSchema.index({ category: 1, status: 1 });
marketingExperimentSchema.index({ platform: 1, status: 1 });

/**
 * Generate experiment ID before validation
 */
marketingExperimentSchema.pre('validate', function(next) {
  if (!this.experimentId) {
    this.experimentId = generateExperimentId();
  }
  next();
});

/**
 * Start the experiment
 */
marketingExperimentSchema.methods.start = function() {
  if (this.status !== 'draft') {
    throw new Error('Can only start draft experiments');
  }

  if (!this.startDate) {
    this.startDate = new Date();
  }

  if (!this.endDate) {
    this.endDate = new Date(this.startDate);
    this.endDate.setDate(this.endDate.getDate() + this.duration);
  }

  if (this.variants.length < 2) {
    throw new Error('Experiment must have at least 2 variants');
  }

  this.status = 'running';
  return this.save();
};

/**
 * Complete the experiment
 */
marketingExperimentSchema.methods.complete = function() {
  if (this.status !== 'running') {
    throw new Error('Can only complete running experiments');
  }

  this.status = 'completed';
  this.actualEndDate = new Date();
  return this.save();
};

/**
 * Pause the experiment
 */
marketingExperimentSchema.methods.pause = function(reason = '') {
  if (this.status !== 'running') {
    throw new Error('Can only pause running experiments');
  }

  this.status = 'paused';

  if (reason) {
    this.notes.push({
      content: `Paused: ${reason}`,
      addedAt: new Date(),
      addedBy: 'system'
    });
  }

  return this.save();
};

/**
 * Resume a paused experiment
 */
marketingExperimentSchema.methods.resume = function() {
  if (this.status !== 'paused') {
    throw new Error('Can only resume paused experiments');
  }

  this.status = 'running';
  return this.save();
};

/**
 * Cancel the experiment
 */
marketingExperimentSchema.methods.cancel = function(reason = '') {
  this.status = 'cancelled';

  if (reason) {
    this.notes.push({
      content: `Cancelled: ${reason}`,
      addedAt: new Date(),
      addedBy: 'system'
    });
  }

  return this.save();
};

/**
 * Add a variant
 */
marketingExperimentSchema.methods.addVariant = function(name, description = '', allocation = 50, isControl = false) {
  if (this.status !== 'draft') {
    throw new Error('Can only add variants to draft experiments');
  }

  this.variants.push({
    name,
    description,
    allocation,
    sampleSize: 0,
    metrics: new Map(),
    isControl
  });

  return this.save();
};

/**
 * Add metrics to a variant
 */
marketingExperimentSchema.methods.addVariantMetrics = function(variantName, metrics) {
  const variant = this.variants.find(v => v.name === variantName);
  if (!variant) {
    throw new Error(`Variant ${variantName} not found`);
  }

  // Update metrics
  Object.entries(metrics).forEach(([key, value]) => {
    variant.metrics.set(key, value);
  });

  this.markModified('variants');
  return this.save();
};

/**
 * Update sample size for a variant
 */
marketingExperimentSchema.methods.updateVariantSampleSize = function(variantName, sampleSize) {
  const variant = this.variants.find(v => v.name === variantName);
  if (!variant) {
    throw new Error(`Variant ${variantName} not found`);
  }

  variant.sampleSize = sampleSize;

  // Update total sample size
  this.currentSampleSize = this.variants.reduce((sum, v) => sum + v.sampleSize, 0);

  this.markModified('variants');
  return this.save();
};

/**
 * Analyze results and determine winner
 */
marketingExperimentSchema.methods.analyze = function() {
  if (this.variants.length < 2) {
    throw new Error('Need at least 2 variants to analyze');
  }

  const results = [];
  const controlVariant = this.variants.find(v => v.isControl) || this.variants[0];
  let winner = null;
  let bestValue = null;

  // Compare each variant to control
  this.variants.forEach(variant => {
    const value = variant.metrics.get(this.successMetric);

    if (value !== undefined && controlVariant.metrics.get(this.successMetric) !== undefined) {
      const controlValue = controlVariant.metrics.get(this.successMetric);
      const change = controlValue > 0 ? ((value - controlValue) / controlValue) * 100 : 0;

      // Simple significance check (would need proper statistical test in production)
      const isSignificant = Math.abs(change) > 5 && variant.sampleSize >= this.minSampleSize;

      results.push({
        variantName: variant.name,
        metric: this.successMetric,
        value,
        changePercent: change,
        isSignificant,
        confidence: isSignificant ? 95 : 50,
        pValue: isSignificant ? 0.03 : 0.2
      });

      // Track winner
      if (bestValue === null || value > bestValue) {
        bestValue = value;
        winner = variant.name;
      }
    }
  });

  this.results = results;
  this.winningVariant = winner;

  // Check if we reached sample size
  if (this.currentSampleSize >= this.minSampleSize && this.status === 'running') {
    // Auto-complete if we have clear winner
    if (winner && results.some(r => r.isSignificant)) {
      this.status = 'completed';
      this.actualEndDate = new Date();
    }
  }

  return this.save();
};

/**
 * Record learning from the experiment
 */
marketingExperimentSchema.methods.recordLearning = function(learning, actionTaken = '') {
  this.learnings = learning;
  this.actionTaken = actionTaken;
  return this.save();
};

/**
 * Add a note
 */
marketingExperimentSchema.methods.addNote = function(content, user = 'tina') {
  this.notes.push({
    content,
    addedAt: new Date(),
    addedBy: user
  });
  return this.save();
};

/**
 * Get control variant
 */
marketingExperimentSchema.methods.getControlVariant = function() {
  return this.variants.find(v => v.isControl) || this.variants[0];
};

/**
 * Check if experiment has sufficient sample size
 */
marketingExperimentSchema.methods.hasSufficientSample = function() {
  return this.currentSampleSize >= this.minSampleSize;
};

// Static methods

/**
 * Get running experiments
 */
marketingExperimentSchema.statics.getRunning = function() {
  return this.find({ status: 'running' }).sort({ startDate: -1 });
};

/**
 * Get completed experiments
 */
marketingExperimentSchema.statics.getCompleted = function(limit = 50) {
  return this.find({ status: 'completed' })
    .sort({ actualEndDate: -1 })
    .limit(limit);
};

/**
 * Get experiments by status
 */
marketingExperimentSchema.statics.getByStatus = function(status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

/**
 * Get experiments by category
 */
marketingExperimentSchema.statics.getByCategory = function(category) {
  return this.find({ category }).sort({ createdAt: -1 });
};

/**
 * Get experiments by platform
 */
marketingExperimentSchema.statics.getByPlatform = function(platform) {
  return this.find({ platform }).sort({ createdAt: -1 });
};

/**
 * Get experiments that need more samples
 */
marketingExperimentSchema.statics.getNeedingSamples = function() {
  return this.find({
    status: 'running',
    $expr: { $lt: ['$currentSampleSize', '$minSampleSize'] }
  }).sort({ endDate: 1 });
};

/**
 * Get experiments that should be analyzed
 */
marketingExperimentSchema.statics.getReadyToAnalyze = function() {
  return this.find({
    status: 'running',
    $expr: { $gte: ['$currentSampleSize', '$minSampleSize'] }
  }).sort({ endDate: 1 });
};

/**
 * Get experiments by strategy
 */
marketingExperimentSchema.statics.getByStrategy = function(strategyId) {
  return this.find({ relatedStrategyIds: strategyId }).sort({ createdAt: -1 });
};

/**
 * Get experiments by goal
 */
marketingExperimentSchema.statics.getByGoal = function(goalId) {
  return this.find({ relatedGoalIds: goalId }).sort({ createdAt: -1 });
};

const MarketingExperiment = mongoose.model('MarketingExperiment', marketingExperimentSchema);

export default MarketingExperiment;
