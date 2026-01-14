import mongoose from 'mongoose';

/**
 * ASO Score Model
 * Tracks App Store Optimization scores and component metrics
 */
const asoScoreSchema = new mongoose.Schema({
  // Overall composite score
  overallScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },

  // Component scores
  keywordScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  metadataScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  visualScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  ratingsScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  conversionScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },

  // Individual factor scores
  factors: {
    // Keyword factors (30% weight)
    keywordRanking: {
      score: { type: Number, default: 0 },
      weight: 0.10,
      description: 'Average ranking of target keywords'
    },
    keywordCoverage: {
      score: { type: Number, default: 0 },
      weight: 0.08,
      description: 'Percentage of tracked keywords ranking in top 50'
    },
    keywordRelevance: {
      score: { type: Number, default: 0 },
      weight: 0.07,
      description: 'Relevance of keywords to app category'
    },
    keywordDensity: {
      score: { type: Number, default: 0 },
      weight: 0.05,
      description: 'Keyword usage in title, subtitle, description'
    },

    // Metadata factors (25% weight)
    titleOptimization: {
      score: { type: Number, default: 0 },
      weight: 0.10,
      description: 'Title length, keyword inclusion, clarity'
    },
    subtitleOptimization: {
      score: { type: Number, default: 0 },
      weight: 0.08,
      description: 'Subtitle length, keyword inclusion'
    },
    descriptionQuality: {
      score: { type: Number, default: 0 },
      weight: 0.07,
      description: 'Description length, readability, keyword usage'
    },

    // Visual factors (20% weight)
    iconQuality: {
      score: { type: Number, default: 0 },
      weight: 0.10,
      description: 'Icon clarity, branding, emotional appeal'
    },
    screenshotQuality: {
      score: { type: Number, default: 0 },
      weight: 0.06,
      description: 'Screenshot quality, captions, appeal'
    },
    visualConsistency: {
      score: { type: Number, default: 0 },
      weight: 0.04,
      description: 'Consistent branding across visuals'
    },

    // Ratings factors (15% weight)
    averageRating: {
      score: { type: Number, default: 0 },
      weight: 0.08,
      description: 'App store average rating'
    },
    ratingCount: {
      score: { type: Number, default: 0 },
      weight: 0.04,
      description: 'Number of ratings'
    },
    reviewSentiment: {
      score: { type: Number, default: 0 },
      weight: 0.03,
      description: 'Positive review sentiment'
    },

    // Conversion factors (10% weight)
    conversionRate: {
      score: { type: Number, default: 0 },
      weight: 0.06,
      description: 'Product page to download conversion rate'
    },
    categoryRanking: {
      score: { type: Number, default: 0 },
      weight: 0.04,
      description: 'Ranking in primary category'
    }
  },

  // Historical tracking
  scoreHistory: [{
    date: {
      type: Date,
      required: true
    },
    overallScore: {
      type: Number,
      required: true
    },
    keywordScore: {
      type: Number,
      required: true
    },
    metadataScore: {
      type: Number,
      required: true
    },
    visualScore: {
      type: Number,
      required: true
    },
    ratingsScore: {
      type: Number,
      required: true
    },
    conversionScore: {
      type: Number,
      required: true
    }
  }],

  // Recommendations
  recommendations: [{
    category: {
      type: String,
      enum: ['keyword', 'metadata', 'visual', 'ratings', 'conversion']
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low']
    },
    title: String,
    description: String,
    expectedImpact: Number,
    implemented: {
      type: Boolean,
      default: false
    }
  }],

  // Comparison with competitors
  competitorComparison: [{
    competitorAppName: String,
    competitorScore: Number,
    scoreDifference: Number
  }],

  // Metadata
  calculatedAt: {
    type: Date,
    default: Date.now
  },
  lastRefreshedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
asoScoreSchema.index({ calculatedAt: -1 });
asoScoreSchema.index({ overallScore: -1 });
asoScoreSchema.index({ 'recommendations.implemented': 1 });

// Calculate overall score from component scores
asoScoreSchema.methods.calculateOverallScore = function() {
  const weights = {
    keyword: 0.30,
    metadata: 0.25,
    visual: 0.20,
    ratings: 0.15,
    conversion: 0.10
  };

  this.overallScore =
    (this.keywordScore * weights.keyword) +
    (this.metadataScore * weights.metadata) +
    (this.visualScore * weights.visual) +
    (this.ratingsScore * weights.ratings) +
    (this.conversionScore * weights.conversion);

  this.overallScore = Math.round(this.overallScore);

  return this.overallScore;
};

// Calculate keyword score from factors
asoScoreSchema.methods.calculateKeywordScore = function() {
  let score = 0;
  const keywordFactors = [
    this.factors.keywordRanking,
    this.factors.keywordCoverage,
    this.factors.keywordRelevance,
    this.factors.keywordDensity
  ];

  keywordFactors.forEach(factor => {
    score += factor.score * factor.weight;
  });

  this.keywordScore = Math.round(score);
  return this.keywordScore;
};

// Calculate metadata score from factors
asoScoreSchema.methods.calculateMetadataScore = function() {
  let score = 0;
  const metadataFactors = [
    this.factors.titleOptimization,
    this.factors.subtitleOptimization,
    this.factors.descriptionQuality
  ];

  metadataFactors.forEach(factor => {
    score += factor.score * factor.weight;
  });

  this.metadataScore = Math.round(score);
  return this.metadataScore;
};

// Calculate visual score from factors
asoScoreSchema.methods.calculateVisualScore = function() {
  let score = 0;
  const visualFactors = [
    this.factors.iconQuality,
    this.factors.screenshotQuality,
    this.factors.visualConsistency
  ];

  visualFactors.forEach(factor => {
    score += factor.score * factor.weight;
  });

  this.visualScore = Math.round(score);
  return this.visualScore;
};

// Calculate ratings score from factors
asoScoreSchema.methods.calculateRatingsScore = function() {
  let score = 0;
  const ratingsFactors = [
    this.factors.averageRating,
    this.factors.ratingCount,
    this.factors.reviewSentiment
  ];

  ratingsFactors.forEach(factor => {
    score += factor.score * factor.weight;
  });

  this.ratingsScore = Math.round(score);
  return this.ratingsScore;
};

// Calculate conversion score from factors
asoScoreSchema.methods.calculateConversionScore = function() {
  let score = 0;
  const conversionFactors = [
    this.factors.conversionRate,
    this.factors.categoryRanking
  ];

  conversionFactors.forEach(factor => {
    score += factor.score * factor.weight;
  });

  this.conversionScore = Math.round(score);
  return this.conversionScore;
};

// Calculate all component scores
asoScoreSchema.methods.calculateAllScores = function() {
  this.calculateKeywordScore();
  this.calculateMetadataScore();
  this.calculateVisualScore();
  this.calculateRatingsScore();
  this.calculateConversionScore();
  this.calculateOverallScore();

  return this;
};

// Add score snapshot to history
asoScoreSchema.methods.addScoreSnapshot = function() {
  this.scoreHistory.push({
    date: new Date(),
    overallScore: this.overallScore,
    keywordScore: this.keywordScore,
    metadataScore: this.metadataScore,
    visualScore: this.visualScore,
    ratingsScore: this.ratingsScore,
    conversionScore: this.conversionScore
  });

  this.lastRefreshedAt = new Date();

  // Keep only last 90 days of history
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  this.scoreHistory = this.scoreHistory.filter(
    entry => entry.date >= ninetyDaysAgo
  );

  return this.save();
};

// Get score trend
asoScoreSchema.methods.getScoreTrend = function(days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const recentHistory = this.scoreHistory
    .filter(entry => entry.date >= cutoffDate)
    .sort((a, b) => a.date - b.date);

  if (recentHistory.length < 2) {
    return 'stable';
  }

  const oldest = recentHistory[0];
  const newest = recentHistory[recentHistory.length - 1];
  const change = newest.overallScore - oldest.overallScore;

  if (change > 5) return 'improving';
  if (change < -5) return 'declining';
  return 'stable';
};

// Get score grade (A, B, C, D, F)
asoScoreSchema.methods.getScoreGrade = function() {
  if (this.overallScore >= 90) return { grade: 'A', label: 'Excellent', color: '#00d26a' };
  if (this.overallScore >= 80) return { grade: 'B', label: 'Good', color: '#00b4d8' };
  if (this.overallScore >= 70) return { grade: 'C', label: 'Fair', color: '#ffc107' };
  if (this.overallScore >= 60) return { grade: 'D', label: 'Poor', color: '#ff6b6b' };
  return { grade: 'F', label: 'Critical', color: '#f8312f' };
};

export default mongoose.model('ASOScore', asoScoreSchema);
