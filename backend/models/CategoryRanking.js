import mongoose from 'mongoose';

/**
 * Category Ranking Model
 * Tracks app rankings within its App Store category over time
 */
const categoryRankingSchema = new mongoose.Schema({
  appId: {
    type: String,
    required: true,
    default: 'blush-app'
  },
  categoryName: {
    type: String,
    required: true,
    default: 'Books'
  },
  subcategoryName: {
    type: String,
    default: 'Romance'
  },
  ranking: {
    type: Number,
    required: true,
    min: 1
  },
  totalAppsInCategory: {
    type: Number,
    default: null
  },
  percentile: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  previousRanking: {
    type: Number,
    default: null
  },
  rankingChange: {
    type: Number,
    default: null
  },
  rankingHistory: [{
    date: {
      type: Date,
      required: true
    },
    ranking: {
      type: Number,
      required: true
    },
    totalApps: {
      type: Number,
      default: null
    }
  }],
  checkedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
categoryRankingSchema.index({ appId: 1 });
categoryRankingSchema.index({ categoryName: 1 });
categoryRankingSchema.index({ checkedAt: -1 });
categoryRankingSchema.index({ 'rankingHistory.date': -1 });

// Calculate percentile based on ranking and total apps
categoryRankingSchema.methods.calculatePercentile = function() {
  if (this.totalAppsInCategory && this.ranking) {
    // Percentile = (1 - ranking/total) * 100
    // Higher percentile = better ranking (closer to #1)
    this.percentile = Math.round((1 - this.ranking / this.totalAppsInCategory) * 100);
  }
  return this.percentile;
};

// Update ranking history
categoryRankingSchema.methods.addRankingToHistory = function(ranking, totalApps = null) {
  // Store previous ranking
  this.previousRanking = this.ranking;
  this.ranking = ranking;
  this.totalAppsInCategory = totalApps || this.totalAppsInCategory;

  // Calculate change
  if (this.previousRanking) {
    this.rankingChange = this.previousRanking - this.ranking;
    // Positive change = improved ranking (lower number)
    // Negative change = declined ranking (higher number)
  }

  // Calculate percentile
  this.calculatePercentile();

  // Add to history
  this.rankingHistory.push({
    date: new Date(),
    ranking: ranking,
    totalApps: totalApps || this.totalAppsInCategory
  });
  this.checkedAt = new Date();

  // Keep only last 90 days of history to prevent unlimited growth
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  this.rankingHistory = this.rankingHistory.filter(
    entry => entry.date >= ninetyDaysAgo
  );

  return this.save();
};

// Get ranking trend
categoryRankingSchema.methods.getRankingTrend = function(days = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const recentHistory = this.rankingHistory
    .filter(entry => entry.date >= cutoffDate)
    .sort((a, b) => a.date - b.date);

  if (recentHistory.length < 2) {
    return { trend: 'stable', change: 0 };
  }

  const oldest = recentHistory[0].ranking;
  const newest = recentHistory[recentHistory.length - 1].ranking;
  const change = oldest - newest;

  if (change > 5) {
    return { trend: 'up', change }; // Improved (lower ranking number)
  } else if (change < -5) {
    return { trend: 'down', change }; // Declined (higher ranking number)
  } else {
    return { trend: 'stable', change };
  }
};

export default mongoose.model('CategoryRanking', categoryRankingSchema);
