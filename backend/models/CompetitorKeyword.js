import mongoose from 'mongoose';

/**
 * Competitor Keyword Model
 * Tracks competitor app keyword rankings and strategies for competitive intelligence
 */
const competitorKeywordSchema = new mongoose.Schema({
  competitorAppId: {
    type: String,
    required: true,
    index: true
  },
  competitorAppName: {
    type: String,
    required: true
  },
  keyword: {
    type: String,
    required: true,
    trim: true
  },
  ranking: {
    type: Number,
    min: 1,
    default: null
  },
  competitorRanking: {
    type: Number,
    min: 1,
    default: null
  },
  rankingDifference: {
    type: Number,
    default: null
  },
  ourAppId: {
    type: String,
    default: 'com.blush.app'
  },
  lastCheckedAt: {
    type: Date,
    default: Date.now
  },
  trackedSince: {
    type: Date,
    default: Date.now
  },
  rankingHistory: [{
    date: {
      type: Date,
      required: true
    },
    ourRanking: {
      type: Number,
      required: true
    },
    competitorRanking: {
      type: Number,
      required: true
    },
    difference: {
      type: Number,
      required: true
    }
  }],
  keywordStrategy: {
    isTargeted: {
      type: Boolean,
      default: false
    },
    inMetadata: {
      type: Boolean,
      default: false
    },
    prominence: {
      type: String,
      enum: ['title', 'subtitle', 'description', 'keywords', 'none'],
      default: 'none'
    }
  },
  opportunityLevel: {
    type: String,
    enum: ['high', 'medium', 'low', 'none'],
    default: 'none'
  }
}, {
  timestamps: true
});

// Compound index for efficient competitor queries
competitorKeywordSchema.index({ competitorAppId: 1, keyword: 1 });
competitorKeywordSchema.index({ keyword: 1 });
competitorKeywordSchema.index({ lastCheckedAt: -1 });
competitorKeywordSchema.index({ opportunityLevel: 1 });

// Calculate ranking difference
competitorKeywordSchema.methods.calculateRankingDifference = function() {
  if (this.ranking !== null && this.competitorRanking !== null) {
    // Positive difference means we rank higher (better)
    // Negative difference means competitor ranks higher
    this.rankingDifference = this.competitorRanking - this.ranking;
  } else {
    this.rankingDifference = null;
  }
  return this.rankingDifference;
};

// Determine opportunity level
competitorKeywordSchema.methods.determineOpportunityLevel = function() {
  if (this.ranking === null || this.competitorRanking === null) {
    this.opportunityLevel = 'none';
    return this.opportunityLevel;
  }

  // If we rank significantly worse (competitor is 10+ positions ahead)
  if (this.rankingDifference < -10) {
    this.opportunityLevel = 'high';
  }
  // If we rank somewhat worse (competitor is 5-10 positions ahead)
  else if (this.rankingDifference < -5) {
    this.opportunityLevel = 'medium';
  }
  // If we rank slightly worse (competitor is 1-5 positions ahead)
  else if (this.rankingDifference < 0) {
    this.opportunityLevel = 'low';
  }
  // We rank equal or better
  else {
    this.opportunityLevel = 'none';
  }

  return this.opportunityLevel;
};

// Add ranking snapshot to history
competitorKeywordSchema.methods.addRankingSnapshot = function(ourRanking, competitorRanking) {
  this.ranking = ourRanking;
  this.competitorRanking = competitorRanking;
  this.calculateRankingDifference();
  this.determineOpportunityLevel();

  const difference = this.rankingDifference;

  this.rankingHistory.push({
    date: new Date(),
    ourRanking: ourRanking,
    competitorRanking: competitorRanking,
    difference: difference
  });
  this.lastCheckedAt = new Date();

  // Keep only last 90 days of history
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  this.rankingHistory = this.rankingHistory.filter(
    entry => entry.date >= ninetyDaysAgo
  );

  return this.save();
};

// Get ranking trend
competitorKeywordSchema.methods.getRankingTrend = function(days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const recentHistory = this.rankingHistory.filter(
    entry => entry.date >= cutoffDate
  ).sort((a, b) => a.date - b.date);

  if (recentHistory.length < 2) {
    return 'stable';
  }

  const oldest = recentHistory[0];
  const newest = recentHistory[recentHistory.length - 1];

  // Positive trend means we're improving (difference increasing)
  const trendChange = newest.difference - oldest.difference;

  if (trendChange > 5) return 'improving';
  if (trendChange < -5) return 'declining';
  return 'stable';
};

export default mongoose.model('CompetitorKeyword', competitorKeywordSchema);
