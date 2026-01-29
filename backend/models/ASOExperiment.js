import mongoose from 'mongoose';

/**
 * ASO Experiment Model
 * Stores A/B test configurations and results for App Store optimization
 */
const asoExperimentSchema = new mongoose.Schema({
  // Test identification
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['icon', 'screenshots', 'subtitle', 'description', 'keywords'],
    required: true
  },

  // Test variants
  variantA: {
    name: {
      type: String,
      required: true,
      default: 'Control'
    },
    description: String,
    // Type-specific variant data
    iconUrl: String,              // For icon tests
    screenshotUrls: [String],     // For screenshot tests
    subtitle: String,             // For subtitle tests
    description: String,          // For description tests
    keywords: [String],           // For keyword tests
    metadata: mongoose.Schema.Types.Mixed
  },

  variantB: {
    name: {
      type: String,
      required: true,
      default: 'Treatment'
    },
    description: String,
    // Type-specific variant data
    iconUrl: String,              // For icon tests
    screenshotUrls: [String],     // For screenshot tests
    subtitle: String,             // For subtitle tests
    description: String,          // For description tests
    keywords: [String],           // For keyword tests
    metadata: mongoose.Schema.Types.Mixed
  },

  // Test timing
  status: {
    type: String,
    enum: ['draft', 'running', 'completed', 'cancelled'],
    default: 'draft'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null
  },
  duration: {
    type: Number,  // in days
    required: true,
    min: 1,
    max: 90
  },

  // Success metrics
  metric: {
    type: String,
    enum: ['downloads', 'conversions', 'conversionRate'],
    required: true,
    default: 'conversionRate'
  },
  targetSampleSize: {
    type: Number,
    default: 1000  // Minimum conversions to detect significance
  },

  // Results
  variantAConversions: {
    type: Number,
    default: 0
  },
  variantBConversions: {
    type: Number,
    default: 0
  },
  variantAViews: {
    type: Number,
    default: 0
  },
  variantBViews: {
    type: Number,
    default: 0
  },
  variantAConversionRate: {
    type: Number,
    default: 0
  },
  variantBConversionRate: {
    type: Number,
    default: 0
  },

  // Statistical analysis
  winner: {
    type: String,
    enum: ['variantA', 'variantB', 'inconclusive', 'pending'],
    default: 'pending'
  },
  significance: {
    type: Number,  // Statistical significance (0-1)
    default: 0
  },
  confidence: {
    type: Number,  // Confidence level (0-100)
    default: 0
  },
  lift: {
    type: Number,  // Percentage lift of winning variant
    default: 0
  },

  // Conclusion and insights
  conclusion: {
    type: String,
    default: null
  },
  recommendations: [{
    type: String,
    description: String
  }],
  learned: String,  // What was learned from this test

  // App Store Connect integration
  appStoreTreatmentId: String,  // Treatment ID from App Store Connect
  appStoreCampaignId: String,   // Campaign ID from App Store Connect
  automaticallyStarted: {
    type: Boolean,
    default: false
  },
  automaticallyStopped: {
    type: Boolean,
    default: false
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  },
  createdBy: {
    type: String,
    enum: ['user', 'ai'],
    default: 'user'
  },
  notes: String
});

// Indexes for efficient queries
asoExperimentSchema.index({ status: 1, createdAt: -1 });
asoExperimentSchema.index({ type: 1, status: 1 });
asoExperimentSchema.index({ startDate: -1 });

/**
 * Calculate conversion rates for both variants
 */
asoExperimentSchema.methods.calculateConversionRates = function() {
  this.variantAConversionRate = this.variantAViews > 0
    ? (this.variantAConversions / this.variantAViews) * 100
    : 0;

  this.variantBConversionRate = this.variantBViews > 0
    ? (this.variantBConversions / this.variantBViews) * 100
    : 0;

  return this;
};

/**
 * Calculate statistical significance using z-test
 * Returns p-value (lower = more significant)
 */
asoExperimentSchema.methods.calculateSignificance = function() {
  const p1 = this.variantAConversionRate / 100;
  const p2 = this.variantBConversionRate / 100;
  const n1 = this.variantAViews;
  const n2 = this.variantBViews;

  if (n1 === 0 || n2 === 0) {
    this.significance = 0;
    this.confidence = 0;
    return 0;
  }

  // Pooled proportion
  const pPooled = (this.variantAConversions + this.variantBConversions) / (n1 + n2);

  // Standard error
  const se = Math.sqrt(pPooled * (1 - pPooled) * (1/n1 + 1/n2));

  if (se === 0) {
    this.significance = 0;
    this.confidence = 0;
    return 0;
  }

  // Z-score
  const z = Math.abs((p2 - p1) / se);

  // P-value (two-tailed) using approximation
  const pValue = 2 * (1 - normalCDF(z));

  this.significance = pValue;
  this.confidence = (1 - pValue) * 100;

  return pValue;
};

/**
 * Normal cumulative distribution function approximation
 */
function normalCDF(z) {
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * z);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Determine winner based on conversion rates and significance
 */
asoExperimentSchema.methods.determineWinner = function() {
  this.calculateConversionRates();
  this.calculateSignificance();

  const conversionDiff = Math.abs(this.variantBConversionRate - this.variantAConversionRate);
  const minDetectableEffect = 0.05; // 5% minimum detectable effect

  // Need at least 100 views per variant and minimum effect size
  if (this.variantAViews < 100 || this.variantBViews < 100 || conversionDiff < minDetectableEffect) {
    this.winner = 'inconclusive';
    this.lift = 0;
    return this;
  }

  // Check if significant (p < 0.05, 95% confidence)
  if (this.significance > 0.05) {
    this.winner = 'inconclusive';
    this.lift = 0;
    return this;
  }

  // Determine winner based on conversion rates
  if (this.variantBConversionRate > this.variantAConversionRate) {
    this.winner = 'variantB';
    this.lift = ((this.variantBConversionRate - this.variantAConversionRate) / this.variantAConversionRate) * 100;
  } else if (this.variantAConversionRate > this.variantBConversionRate) {
    this.winner = 'variantA';
    this.lift = ((this.variantAConversionRate - this.variantBConversionRate) / this.variantBConversionRate) * 100;
  } else {
    this.winner = 'inconclusive';
    this.lift = 0;
  }

  return this;
};

/**
 * Check if test has sufficient sample size
 */
asoExperimentSchema.methods.hasSufficientSampleSize = function() {
  const totalConversions = this.variantAConversions + this.variantBConversions;
  return totalConversions >= this.targetSampleSize;
};

/**
 * Check if test duration has elapsed
 */
asoExperimentSchema.methods.hasTestDurationElapsed = function() {
  if (!this.endDate) {
    const elapsed = Date.now() - this.startDate.getTime();
    const durationMs = this.duration * 24 * 60 * 60 * 1000;
    return elapsed >= durationMs;
  }
  return true;
};

/**
 * Get test completion percentage
 */
asoExperimentSchema.methods.getCompletionPercentage = function() {
  const elapsed = Date.now() - this.startDate.getTime();
  const durationMs = this.duration * 24 * 60 * 60 * 1000;
  const percentage = Math.min((elapsed / durationMs) * 100, 100);
  return Math.round(percentage);
};

/**
 * Generate summary of test results
 */
asoExperimentSchema.methods.generateSummary = function() {
  this.calculateConversionRates();
  this.determineWinner();

  return {
    name: this.name,
    type: this.type,
    status: this.status,
    duration: this.duration,
    variantA: {
      name: this.variantA.name,
      conversionRate: this.variantAConversionRate.toFixed(2) + '%',
      conversions: this.variantAConversions,
      views: this.variantAViews
    },
    variantB: {
      name: this.variantB.name,
      conversionRate: this.variantBConversionRate.toFixed(2) + '%',
      conversions: this.variantBConversions,
      views: this.variantBViews
    },
    winner: this.winner,
    significance: this.significance,
    confidence: this.confidence.toFixed(1) + '%',
    lift: this.lift.toFixed(1) + '%',
    completionPercentage: this.getCompletionPercentage()
  };
};

// Update the updatedAt timestamp before saving
asoExperimentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (this.status === 'completed' && !this.completedAt) {
    this.completedAt = Date.now();
  }
  next();
});

export default mongoose.model('ASOExperiment', asoExperimentSchema, 'marketing_aso_experiments');
