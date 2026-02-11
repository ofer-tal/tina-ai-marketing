import mongoose from 'mongoose';

/**
 * Marketing Content Score Schema
 * Stores content scoring data for performance prediction and analysis
 */

const marketingContentScoreSchema = new mongoose.Schema({
  // Reference to the post
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarketingPost',
    required: true,
    index: true,
    unique: true
  },

  // Overall score (0-100)
  overallScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    index: true
  },

  // Score breakdown - stored as mixed type to allow nested objects
  scoreBreakdown: {
    hook: {
      score: { type: Number },
      max: { type: Number },
      weight: { type: Number },
      feedback: { type: String }
    },
    bookReference: {
      score: { type: Number },
      max: { type: Number },
      weight: { type: Number },
      feedback: { type: String }
    },
    hashtagCombo: {
      score: { type: Number },
      max: { type: Number },
      weight: { type: Number },
      feedback: { type: String }
    },
    timing: {
      score: { type: Number },
      max: { type: Number },
      weight: { type: Number },
      feedback: { type: String }
    },
    topicTrend: {
      score: { type: Number },
      max: { type: Number },
      weight: { type: Number },
      feedback: { type: String }
    },
    captionQuality: {
      score: { type: Number },
      max: { type: Number },
      weight: { type: Number },
      feedback: { type: String }
    },
    uniqueness: {
      score: { type: Number },
      max: { type: Number },
      weight: { type: Number },
      feedback: { type: String }
    },
    emotionalHook: {
      score: { type: Number },
      max: { type: Number },
      weight: { type: Number },
      feedback: { type: String }
    },
    platformFit: {
      score: { type: Number },
      max: { type: Number },
      weight: { type: Number },
      feedback: { type: String }
    }
  },

  // Risk factors (negative scores)
  riskFactors: [{
    type: {
      type: String,
      enum: [
        'high_competition',
        'saturated_hashtags',
        'declining_topic',
        'poor_timing',
        'generic_content',
        'oversaturated_hook',
        'brand_mismatch',
        'platform_algorithm_risk',
        'other'
      ]
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    impact: Number,
    description: String
  }],

  // Strengths
  strengthScores: [{
    category: String,
    score: Number,
    description: String
  }],

  // Weaknesses
  weaknessScores: [{
    category: String,
    score: Number,
    description: String
  }],

  // Predictions
  predictedViews: {
    type: Number,
    min: 0
  },
  predictedEngagement: {
    type: Number,
    min: 0
  },
  predictedEngagementRate: {
    type: Number,
    min: 0,
    max: 100
  },
  predictedShares: {
    type: Number,
    min: 0
  },

  // Prediction ranges (confidence intervals)
  predictionRanges: {
    views: {
      min: Number,
      max: Number,
      p50: Number,
      p75: Number,
      p90: Number
    },
    engagementRate: {
      min: Number,
      max: Number,
      p50: Number,
      p75: Number,
      p90: Number
    }
  },

  // Confidence level
  confidenceLevel: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.5
    // 0 = not confident, 1 = very confident
  },

  // Scoring metadata
  scoringDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  scoringVersion: {
    type: String,
    default: '1.0'
  },

  // Input data snapshot (for reproducibility)
  inputData: {
    hook: String,
    bookReference: String,
    hashtags: [String],
    caption: String,
    plannedTime: Date,
    platform: String,
    topic: String,
    spiceLevel: Number
  },

  // Actual results (for tracking accuracy)
  actualResults: {
    views: {
      type: Number,
      default: null
    },
    engagement: {
      type: Number,
      default: null
    },
    engagementRate: {
      type: Number,
      default: null
    },
    shares: {
      type: Number,
      default: null
    },
    recordedAt: {
      type: Date
    },
    // Accuracy metrics
    viewAccuracy: {
      type: Number
      // Percentage error: |predicted - actual| / actual * 100
    },
    engagementAccuracy: {
      type: Number
    },
    overallAccuracy: {
      type: Number
    }
  },

  // Improvement suggestions
  suggestions: [{
    category: String,
    suggestion: String,
    potentialImpact: Number,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high']
    }
  }],

  // Comparison to similar posts
  comparisons: {
    avgScoreForSimilar: Number,
    percentile: Number,
    // What percentile this post is in compared to similar posts
    topPerformers: [{
      postId: String,
      score: Number,
      actualViews: Number
    }]
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
marketingContentScoreSchema.index({ overallScore: -1 });
marketingContentScoreSchema.index({ scoringDate: -1 });
marketingContentScoreSchema.index({ confidenceLevel: -1 });
marketingContentScoreSchema.index({ 'actualResults.views': -1 });

// Update the updatedAt timestamp before saving
marketingContentScoreSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to create a content score
marketingContentScoreSchema.statics.scoreContent = function(contentData) {
  // This is a simplified scoring algorithm
  // In production, this would use more sophisticated ML models

  const {
    hook,
    bookReference,
    hashtags,
    caption,
    plannedTime,
    platform,
    topic,
    spiceLevel
  } = contentData;

  const breakdown = {
    hook: { score: 0, max: 15, weight: 0.15, feedback: '' },
    bookReference: { score: 0, max: 15, weight: 0.15, feedback: '' },
    hashtagCombo: { score: 0, max: 10, weight: 0.10, feedback: '' },
    timing: { score: 0, max: 8, weight: 0.08, feedback: '' },
    topicTrend: { score: 0, max: 7, weight: 0.07, feedback: '' },
    captionQuality: { score: 0, max: 10, weight: 0.10, feedback: '' },
    uniqueness: { score: 0, max: 10, weight: 0.10, feedback: '' },
    emotionalHook: { score: 0, max: 10, weight: 0.10, feedback: '' },
    platformFit: { score: 0, max: 5, weight: 0.05, feedback: '' }
  };

  const risks = [];
  const strengths = [];
  const weaknesses = [];
  const suggestions = [];

  // Hook scoring (0-15)
  if (hook) {
    if (hook.length < 20) {
      breakdown.hook.score = 5;
      breakdown.hook.feedback = 'Hook is too short';
      weaknesses.push({ category: 'hook', score: 5, description: 'Hook is too short' });
    } else if (hook.includes('?')) {
      breakdown.hook.score = 12;
      breakdown.hook.feedback = 'Question hooks perform well';
      strengths.push({ category: 'hook', score: 12, description: 'Question hook format' });
    } else {
      breakdown.hook.score = 8;
      breakdown.hook.feedback = 'Hook could be more engaging';
    }
  }

  // Book reference scoring (0-15)
  if (bookReference) {
    breakdown.bookReference.score = 10;
    breakdown.bookReference.feedback = 'Book reference included';
    strengths.push({ category: 'bookReference', score: 10, description: 'Specific book reference' });
  }

  // Hashtag scoring (0-10)
  if (hashtags && hashtags.length > 0) {
    if (hashtags.length >= 3 && hashtags.length <= 8) {
      breakdown.hashtagCombo.score = 8;
      breakdown.hashtagFeedback = 'Good hashtag count';
    } else if (hashtags.length > 8) {
      breakdown.hashtagCombo.score = 5;
      breakdown.hashtagFeedback = 'Too many hashtags';
      risks.push({
        type: 'saturated_hashtags',
        severity: 'medium',
        impact: -2,
        description: 'Too many hashtags may look spammy'
      });
    }
  }

  // Timing scoring (0-8)
  if (plannedTime) {
    const hour = plannedTime.getHours();
    if (hour >= 9 && hour <= 21) {
      breakdown.timing.score = 6;
      breakdown.timing.feedback = 'Posting during active hours';
    } else {
      breakdown.timing.score = 3;
      breakdown.timing.feedback = 'Consider posting during peak hours';
    }
  }

  // Topic trend scoring (0-7)
  if (topic) {
    breakdown.topicTrend.score = 5;
    breakdown.topicTrend.feedback = 'Topic selected';
  }

  // Caption quality (0-10)
  if (caption) {
    if (caption.length > 50 && caption.length < 500) {
      breakdown.captionQuality.score = 8;
      breakdown.captionQuality.feedback = 'Good caption length';
    } else {
      breakdown.captionQuality.score = 5;
      breakdown.captionQuality.feedback = 'Adjust caption length';
    }
  }

  // Uniqueness (0-10)
  breakdown.uniqueness.score = 7;
  breakdown.uniqueness.feedback = 'Content appears unique';

  // Emotional hook (0-10)
  breakdown.emotionalHook.score = 6;
  breakdown.emotionalHook.feedback = 'Emotional hook detected';

  // Platform fit (0-5)
  breakdown.platformFit.score = 4;
  breakdown.platformFit.feedback = 'Content fits platform';

  // Calculate overall score
  let overallScore = 0;
  for (const key in breakdown) {
    overallScore += breakdown[key].score * breakdown[key].weight;
  }
  overallScore = Math.round(overallScore * 100);

  // Subtract risk factors
  for (const risk of risks) {
    overallScore += risk.impact;
  }
  overallScore = Math.max(0, Math.min(100, overallScore));

  // Generate predictions
  const baseViews = 5000;
  const multiplier = overallScore / 50; // 1.0 at score 50
  const predictedViews = Math.round(baseViews * multiplier);
  const predictedEngagementRate = 5 + (overallScore / 20); // 5-10%

  // Generate suggestions
  if (breakdown.hook.score < 10) {
    suggestions.push({
      category: 'hook',
      suggestion: 'Make your hook more compelling with a question or strong opinion',
      potentialImpact: 15,
      priority: 'high'
    });
  }

  return {
    postId: contentData.postId,
    overallScore,
    scoreBreakdown: breakdown,
    riskFactors: risks,
    strengthScores: strengths,
    weaknessScores: weaknesses,
    predictedViews,
    predictedEngagement: Math.round(predictedViews * (predictedEngagementRate / 100)),
    predictedEngagementRate,
    predictedShares: Math.round(predictedViews * 0.02),
    confidenceLevel: 0.6,
    suggestions,
    inputData: contentData
  };
};

// Static method to record actual results
marketingContentScoreSchema.statics.recordActualResults = function(postId, actualData) {
  return this.findOne({ postId }).then(score => {
    if (!score) return null;

    score.actualResults = {
      views: actualData.views,
      engagement: actualData.engagement,
      engagementRate: actualData.engagementRate,
      shares: actualData.shares,
      recordedAt: new Date()
    };

    // Calculate accuracy
    if (score.predictedViews && actualData.views) {
      score.actualResults.viewAccuracy = Math.abs(score.predictedViews - actualData.views) / actualData.views;
    }
    if (score.predictedEngagementRate && actualData.engagementRate) {
      score.actualResults.engagementAccuracy = Math.abs(score.predictedEngagementRate - actualData.engagementRate) / actualData.engagementRate;
    }
    score.actualResults.overallAccuracy = (score.actualResults.viewAccuracy + score.actualResults.engagementAccuracy) / 2;

    return score.save();
  });
};

// Static method to get scoring accuracy stats
marketingContentScoreSchema.statics.getAccuracyStats = function(options = {}) {
  const {
    startDate,
    endDate
  } = options;

  const query = {
    'actualResults.views': { $exists: true, $ne: null }
  };

  if (startDate || endDate) {
    query.scoringDate = {};
    if (startDate) query.scoringDate.$gte = startDate;
    if (endDate) query.scoringDate.$lte = endDate;
  }

  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        avgViewAccuracy: { $avg: '$actualResults.viewAccuracy' },
        avgEngagementAccuracy: { $avg: '$actualResults.engagementAccuracy' },
        avgOverallAccuracy: { $avg: '$actualResults.overallAccuracy' },
        count: { $sum: 1 }
      }
    }
  ]).then(results => results[0] || {
    avgViewAccuracy: 0,
    avgEngagementAccuracy: 0,
    avgOverallAccuracy: 0,
    count: 0
  });
};

const MarketingContentScore = mongoose.model(
  'MarketingContentScore',
  marketingContentScoreSchema,
  'marketing_content_scores'
);

export default MarketingContentScore;
