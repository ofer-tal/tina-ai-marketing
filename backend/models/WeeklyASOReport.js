import mongoose from 'mongoose';

/**
 * Weekly ASO Report Model
 * Stores weekly App Store Optimization performance summary reports
 */
const weeklyASOReportSchema = new mongoose.Schema({
  // Report period
  weekStart: {
    type: Date,
    required: true,
    index: true
  },
  weekEnd: {
    type: Date,
    required: true,
    index: true
  },
  year: {
    type: Number,
    required: true
  },
  weekNumber: {
    type: Number, // ISO week number (1-53)
    required: true
  },

  // Overall ASO score summary
  overallScore: {
    current: {
      type: Number,
      min: 0,
      max: 100
    },
    previous: {
      type: Number,
      min: 0,
      max: 100
    },
    change: {
      type: Number
    },
    trend: {
      type: String,
      enum: ['up', 'down', 'stable'],
      default: 'stable'
    }
  },

  // Component scores
  componentScores: {
    keywordScore: {
      current: Number,
      previous: Number,
      change: Number,
      trend: String
    },
    metadataScore: {
      current: Number,
      previous: Number,
      change: Number,
      trend: String
    },
    visualScore: {
      current: Number,
      previous: Number,
      change: Number,
      trend: String
    },
    ratingsScore: {
      current: Number,
      previous: Number,
      change: Number,
      trend: String
    },
    conversionScore: {
      current: Number,
      previous: Number,
      change: Number,
      trend: String
    }
  },

  // Keyword ranking summary
  keywordRankings: {
    totalTracked: {
      type: Number,
      default: 0
    },
    inTop10: {
      type: Number,
      default: 0
    },
    inTop25: {
      type: Number,
      default: 0
    },
    inTop50: {
      type: Number,
      default: 0
    },
    notRanked: {
      type: Number,
      default: 0
    },
    averageRanking: {
      type: Number,
      default: null
    },
    medianRanking: {
      type: Number,
      default: null
    }
  },

  // Keyword ranking changes
  rankingChanges: {
    improved: {
      type: Number,
      default: 0
    },
    declined: {
      type: Number,
      default: 0
    },
    stable: {
      type: Number,
      default: 0
    },
    new: {
      type: Number,
      default: 0
    },
    topMovers: [{
      keyword: String,
      previousRanking: Number,
      currentRanking: Number,
      change: Number,
      volume: Number
    }]
  },

  // Category ranking
  categoryRanking: {
    current: {
      ranking: Number,
      percentile: Number
    },
    previous: {
      ranking: Number,
      percentile: Number
    },
    change: {
      type: Number
    },
    trend: {
      type: String,
      enum: ['up', 'down', 'stable'],
      default: 'stable'
    }
  },

  // Conversion metrics
  conversionMetrics: {
    overallRate: {
      current: Number,
      previous: Number,
      change: Number,
      trend: String
    },
    impressions: {
      type: Number,
      default: 0
    },
    downloads: {
      type: Number,
      default: 0
    },
    conversions: {
      type: Number,
      default: 0
    }
  },

  // Competitor comparison
  competitorComparison: [{
    competitorName: String,
    competitorAppId: String,
    theirAverageRanking: Number,
    ourAverageRanking: Number,
    gap: Number, // positive = we're behind, negative = we're ahead
    keywordsWon: Number, // keywords where we outrank them
    keywordsLost: Number // keywords where they outrank us
  }],

  // Actionable recommendations
  recommendations: [{
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    },
    category: {
      type: String,
      enum: ['keyword', 'metadata', 'visual', 'technical', 'competitive'],
      default: 'keyword'
    },
    title: String,
    description: String,
    actionItem: String,
    expectedImpact: String,
    estimatedEffort: {
      type: String,
      enum: ['quick', 'moderate', 'significant'],
      default: 'moderate'
    }
  }],

  // Key highlights
  highlights: [{
    type: {
      type: String,
      enum: ['improvement', 'decline', 'milestone', 'alert'],
      default: 'improvement'
    },
    title: String,
    description: String,
    metric: String,
    value: String
  }],

  // Report metadata
  generatedAt: {
    type: Date,
    default: Date.now
  },
  sentViaChat: {
    type: Boolean,
    default: false
  },
  sentAt: {
    type: Date
  },

  // Data quality
  dataCompleteness: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
weeklyASOReportSchema.index({ weekStart: -1, weekEnd: -1 });
weeklyASOReportSchema.index({ year: -1, weekNumber: -1 });
weeklyASOReportSchema.index({ generatedAt: -1 });

/**
 * Helper method to determine trend based on change
 */
weeklyASOReportSchema.methods.determineTrend = function(change, threshold = 0.01) {
  if (Math.abs(change) < threshold) return 'stable';
  return change > 0 ? 'up' : 'down';
};

/**
 * Helper method to get report period as string
 */
weeklyASOReportSchema.methods.getPeriodString = function() {
  const start = new Date(this.weekStart);
  const end = new Date(this.weekEnd);

  const options = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}, ${this.year}`;
};

/**
 * Static method to get ISO week number
 */
weeklyASOReportSchema.statics.getISOWeek = function(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return {
    year: d.getFullYear(),
    week: weekNo
  };
};

/**
 * Static method to get week start and end dates
 */
weeklyASOReportSchema.statics.getWeekDates = function(year, weekNumber) {
  const firstDayOfYear = new Date(year, 0, 1);
  const daysOffset = (weekNumber - 1) * 7 - firstDayOfYear.getDay() + 1;
  const weekStart = new Date(firstDayOfYear);
  weekStart.setDate(firstDayOfYear.getDate() + daysOffset);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
};

const WeeklyASOReport = mongoose.model('WeeklyASOReport', weeklyASOReportSchema);

export default WeeklyASOReport;
