import mongoose from 'mongoose';

/**
 * ASO Keyword Model
 * Tracks App Store keyword rankings for ASO optimization
 */
const asoKeywordSchema = new mongoose.Schema({
  keyword: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  ranking: {
    type: Number,
    min: 1,
    default: null
  },
  volume: {
    type: Number,
    min: 0,
    default: 0
  },
  competition: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  difficulty: {
    type: Number,
    min: 1,
    max: 100,
    default: 50
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
    ranking: {
      type: Number,
      required: true
    }
  }],
  opportunityScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  target: {
    type: Boolean,
    default: false
  },
  lastCheckedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
asoKeywordSchema.index({ keyword: 1 });
asoKeywordSchema.index({ target: 1 });
asoKeywordSchema.index({ lastCheckedAt: -1 });
asoKeywordSchema.index({ 'rankingHistory.date': -1 });

// Calculate opportunity score based on volume, competition, and difficulty
asoKeywordSchema.methods.calculateOpportunityScore = function() {
  const volumeWeight = 0.4;
  const competitionWeight = 0.3;
  const difficultyWeight = 0.3;

  // Normalize competition to score (low=100, medium=50, high=0)
  const competitionScore = this.competition === 'low' ? 100 :
                          this.competition === 'medium' ? 50 : 0;

  // Normalize difficulty (inverse - lower difficulty = higher score)
  const difficultyScore = 100 - this.difficulty;

  // Calculate volume score (normalize to 0-100, assuming max volume of 10000)
  const volumeScore = Math.min((this.volume / 10000) * 100, 100);

  this.opportunityScore = Math.round(
    (volumeScore * volumeWeight) +
    (competitionScore * competitionWeight) +
    (difficultyScore * difficultyWeight)
  );

  return this.opportunityScore;
};

// Update ranking history
asoKeywordSchema.methods.addRankingToHistory = function(ranking) {
  this.ranking = ranking;
  this.rankingHistory.push({
    date: new Date(),
    ranking: ranking
  });
  this.lastCheckedAt = new Date();

  // Keep only last 90 days of history to prevent unlimited growth
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  this.rankingHistory = this.rankingHistory.filter(
    entry => entry.date >= ninetyDaysAgo
  );

  return this.save();
};

export default mongoose.model('ASOKeyword', asoKeywordSchema, 'marketing_aso_keywords');
