import mongoose from 'mongoose';

/**
 * ASO Analysis Report Model
 * Stores weekly ASO performance analysis reports
 */
const asoAnalysisReportSchema = new mongoose.Schema({
  // Report metadata
  reportDate: {
    type: Date,
    required: true,
    index: true
  },
  weekStart: {
    type: Date,
    required: true
  },
  weekEnd: {
    type: Date,
    required: true
  },
  reportType: {
    type: String,
    enum: ['weekly', 'biweekly', 'monthly'],
    default: 'weekly'
  },

  // Executive summary
  summary: {
    overallHealth: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor', 'critical'],
      default: 'fair'
    },
    keyHighlights: [String],
    keyConcerns: [String],
    overallScore: Number,
    scoreChange: Number, // Positive = improvement, negative = decline
    trendDirection: {
      type: String,
      enum: ['improving', 'stable', 'declining'],
      default: 'stable'
    }
  },

  // Keyword analysis
  keywordAnalysis: {
    totalTracked: Number,
    withRankings: Number,
    avgRanking: Number,
    inTop10: Number,
    inTop50: Number,

    // Ranking changes
    improvedKeywords: Number, // Count of keywords with improved ranking
    declinedKeywords: Number, // Count of keywords with declined ranking
    stableKeywords: Number, // Count of keywords with stable ranking

    // Top performers
    topImprovements: [{
      keyword: String,
      previousRanking: Number,
      currentRanking: Number,
      change: Number
    }],
    topDeclines: [{
      keyword: String,
      previousRanking: Number,
      currentRanking: Number,
      change: Number
    }],

    // New opportunities
    newOpportunities: [{
      keyword: String,
      opportunityScore: Number,
      volume: Number,
      competition: String,
      reason: String
    }]
  },

  // Category ranking analysis
  categoryAnalysis: {
    primaryCategory: String,
    currentRanking: Number,
    previousRanking: Number,
    rankingChange: Number,
    bestRanking: Number,
    worstRanking: Number,
    avgRanking: Number,
    rankingHistory: [{
      date: Date,
      ranking: Number
    }]
  },

  // Competitor analysis
  competitorAnalysis: {
    competitorsTracked: Number,
    outperformingCount: Number, // Count of competitors we outrank
    underperformingCount: Number, // Count of competitors outranking us
    topCompetitors: [{
      appName: String,
      appId: String,
      theirRanking: Number,
      ourRanking: Number,
      gap: Number, // Positive = they rank higher, negative = we rank higher
      keywordsTheyWin: [String], // Keywords where they outrank us
      keywordsWeWin: [String] // Keywords where we outrank them
    }],
    keywordGaps: [{
      keyword: String,
      ourRanking: Number,
      competitorRanking: Number,
      gap: Number,
      priority: {
        type: String,
        enum: ['high', 'medium', 'low']
      }
    }]
  },

  // ASO score analysis
  scoreAnalysis: {
    overallScore: Number,
    previousScore: Number,
    scoreChange: Number,

    componentScores: {
      keyword: {
        current: Number,
        previous: Number,
        change: Number
      },
      metadata: {
        current: Number,
        previous: Number,
        change: Number
      },
      visual: {
        current: Number,
        previous: Number,
        change: Number
      },
      ratings: {
        current: Number,
        previous: Number,
        change: Number
      },
      conversion: {
        current: Number,
        previous: Number,
        change: Number
      }
    },

    scoreHistory: [{
      date: Date,
      overallScore: Number
    }]
  },

  // Recommendations
  recommendations: [{
    category: {
      type: String,
      enum: ['keyword', 'metadata', 'visual', 'ratings', 'conversion', 'competitive']
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low']
    },
    title: String,
    description: String,
    expectedImpact: Number, // 1-100
    effort: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'deferred'],
      default: 'pending'
    }
  }],

  // Performance metrics
  metrics: {
    // App Store metrics
    impressions: Number,
    productPageViews: Number,
    downloads: Number,
    conversionRate: Number,

    // Previous period for comparison
    previousPeriod: {
      impressions: Number,
      productPageViews: Number,
      downloads: Number,
      conversionRate: Number
    },

    // Changes
    changes: {
      impressions: Number, // Percentage change
      productPageViews: Number,
      downloads: Number,
      conversionRate: Number
    }
  },

  // Report status
  status: {
    type: String,
    enum: ['draft', 'final', 'archived'],
    default: 'draft'
  },

  // Notification sent
  notificationSent: {
    type: Boolean,
    default: false
  },

  // Notification sent at
  notificationSentAt: Date,

  // Metadata
  generatedAt: {
    type: Date,
    default: Date.now
  },
  generatedBy: {
    type: String,
    default: 'system' // 'system' or user ID
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
asoAnalysisReportSchema.index({ reportDate: -1 });
asoAnalysisReportSchema.index({ weekStart: -1, weekEnd: -1 });
asoAnalysisReportSchema.index({ reportType: 1, reportDate: -1 });
asoAnalysisReportSchema.index({ status: 1 });
asoAnalysisReportSchema.index({ 'summary.trendDirection': 1 });

// Static method to get the latest report
asoAnalysisReportSchema.statics.getLatestReport = async function(reportType = 'weekly') {
  return await this.findOne({ reportType, status: 'final' })
    .sort({ reportDate: -1 })
    .exec();
};

// Static method to get reports in date range
asoAnalysisReportSchema.statics.getReportsInRange = async function(startDate, endDate, reportType = 'weekly') {
  return await this.find({
    reportType,
    reportDate: { $gte: startDate, $lte: endDate }
  })
    .sort({ reportDate: -1 })
    .exec();
};

// Method to mark as sent
asoAnalysisReportSchema.methods.markAsSent = async function() {
  this.notificationSent = true;
  this.notificationSentAt = new Date();
  return await this.save();
};

// Method to finalize report
asoAnalysisReportSchema.methods.finalize = async function() {
  this.status = 'final';
  return await this.save();
};

export default mongoose.model('ASOAnalysisReport', asoAnalysisReportSchema);
