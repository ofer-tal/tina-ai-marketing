import mongoose from 'mongoose';
import { generateReflectionId } from '../utils/tinaIdGenerator.js';

/**
 * Tina Reflection Model
 *
 * Stores Tina's weekly self-reflections and reviews.
 * Tracks what worked, what didn't, and areas for improvement.
 */

const reflectionSectionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['wins', 'losses', 'learnings', 'observations', 'next_steps', 'metrics', 'general'],
    default: 'general'
  },
  relatedIds: [{
    type: String, // Can reference strategies, experiments, goals, etc.
    description: String
  }]
}, { _id: true });

const metricEntrySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  value: mongoose.Schema.Types.Mixed,
  target: mongoose.Schema.Types.Mixed,
  status: {
    type: String,
    enum: ['exceeded', 'met', 'below', 'unknown'],
    default: 'unknown'
  },
  notes: String
}, { _id: false });

const weekRangeSchema = new mongoose.Schema({
  start: {
    type: Date,
    required: true
  },
  end: {
    type: Date,
    required: true
  }
}, { _id: false });

const tinaReflectionSchema = new mongoose.Schema({
  // Human-readable ID
  reflectionId: {
    type: String,
    unique: true,
    index: true
  },

  // Week identifier
  weekOf: {
    type: Date,
    required: true,
    index: true
  },

  // Week number (1-52)
  weekNumber: {
    type: Number,
    min: 1,
    max: 53,
    required: true,
    index: true
  },

  // Year
  year: {
    type: Number,
    required: true,
    index: true
  },

  // Week date range
  weekRange: {
    type: weekRangeSchema,
    required: true
  },

  // Reflection sections (wins, losses, learnings, etc.)
  sections: [reflectionSectionSchema],

  // Key metrics for the week
  metrics: [metricEntrySchema],

  // Related strategies
  relatedStrategyIds: [{
    type: String,
    ref: 'MarketingStrategy'
  }],

  // Related experiments
  relatedExperimentIds: [{
    type: String,
    ref: 'MarketingExperiment'
  }],

  // Related goals
  relatedGoalIds: [{
    type: String,
    ref: 'MarketingGoal'
  }],

  // Overall sentiment
  sentiment: {
    type: String,
    enum: ['very_positive', 'positive', 'neutral', 'negative', 'very_negative'],
    default: 'neutral'
  },

  // Key wins count
  winsCount: {
    type: Number,
    default: 0
  },

  // Key losses count
  lossesCount: {
    type: Number,
    default: 0
  },

  // New learnings count
  learningsCount: {
    type: Number,
    default: 0
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'completed', 'archived'],
    default: 'draft',
    index: true
  },

  // Overall score (0-100)
  overallScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },

  // Areas for improvement
  improvementAreas: [String],

  // Things to continue doing
  continueDoing: [String],

  // Things to stop doing
  stopDoing: [String],

  // Things to start doing
  startDoing: [String],

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

  // AI-generated summary
  summary: String,

  // Next week's priorities
  nextWeekPriorities: [String],

  // Questions for the founder
  questionsForFounder: [{
    question: {
      type: String,
      required: true
    },
    context: String,
    relatedTo: {
      type: String,
      enum: ['goal', 'strategy', 'experiment', 'general', 'learning'],
      default: 'general'
    },
      id: String
  }]
}, {
  collection: 'marketing_reflections',
  timestamps: true
});

// Indexes for efficient queries
tinaReflectionSchema.index({ weekOf: -1 });
tinaReflectionSchema.index({ year: 1, weekNumber: 1 });
tinaReflectionSchema.index({ status: 1, weekOf: -1 });
tinaReflectionSchema.index({ relatedStrategyIds: 1 });
tinaReflectionSchema.index({ relatedExperimentIds: 1 });
tinaReflectionSchema.index({ relatedGoalIds: 1 });

/**
 * Generate reflection ID before validation
 */
tinaReflectionSchema.pre('validate', function(next) {
  if (!this.reflectionId) {
    this.reflectionId = generateReflectionId();
  }
  next();
});

/**
 * Calculate week from weekOf date
 */
tinaReflectionSchema.pre('save', function(next) {
  if (this.isModified('weekOf') && this.weekOf) {
    const date = new Date(this.weekOf);
    this.year = date.getFullYear();

    // Get ISO week number
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    this.weekNumber = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);

    // Calculate week range (Monday to Sunday)
    const monday = new Date(this.weekOf);
    const day = monday.getDay();
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    this.weekRange = {
      start: monday,
      end: sunday
    };
  }
  next();
});

/**
 * Add a section to the reflection
 */
tinaReflectionSchema.methods.addSection = function(title, content, category = 'general', relatedIds = []) {
  this.sections.push({
    title,
    content,
    category,
    relatedIds
  });
  this.markModified('sections');
  return this.save();
};

/**
 * Add a metric entry
 */
tinaReflectionSchema.methods.addMetric = function(name, value, target = null, notes = '') {
  // Determine status
  let status = 'unknown';
  if (target !== null && value !== null && typeof target === 'number' && typeof value === 'number') {
    if (value >= target * 1.1) {
      status = 'exceeded';
    } else if (value >= target) {
      status = 'met';
    } else {
      status = 'below';
    }
  }

  this.metrics.push({
    name,
    value,
    target,
    status,
    notes
  });

  this.markModified('metrics');
  return this.save();
};

/**
 * Complete the reflection
 */
tinaReflectionSchema.methods.complete = function() {
  this.status = 'completed';

  // Update counts based on sections
  this.winsCount = this.sections.filter(s => s.category === 'wins').length;
  this.lossesCount = this.sections.filter(s => s.category === 'losses').length;
  this.learningsCount = this.sections.filter(s => s.category === 'learnings').length;

  return this.save();
};

/**
 * Archive the reflection
 */
tinaReflectionSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

/**
 * Set sentiment
 */
tinaReflectionSchema.methods.setSentiment = function(sentiment) {
  this.sentiment = sentiment;
  return this.save();
};

/**
 * Set overall score
 */
tinaReflectionSchema.methods.setOverallScore = function(score) {
  this.overallScore = Math.max(0, Math.min(100, score));

  // Update sentiment based on score
  if (this.overallScore >= 80) {
    this.sentiment = 'very_positive';
  } else if (this.overallScore >= 65) {
    this.sentiment = 'positive';
  } else if (this.overallScore >= 35) {
    this.sentiment = 'neutral';
  } else if (this.overallScore >= 20) {
    this.sentiment = 'negative';
  } else {
    this.sentiment = 'very_negative';
  }

  return this.save();
};

/**
 * Add improvement area
 */
tinaReflectionSchema.methods.addImprovementArea = function(area) {
  if (!this.improvementAreas.includes(area)) {
    this.improvementAreas.push(area);
    this.markModified('improvementAreas');
  }
  return this.save();
};

/**
 * Add to continue doing list
 */
tinaReflectionSchema.methods.addContinueDoing = function(item) {
  if (!this.continueDoing.includes(item)) {
    this.continueDoing.push(item);
    this.markModified('continueDoing');
  }
  return this.save();
};

/**
 * Add to stop doing list
 */
tinaReflectionSchema.methods.addStopDoing = function(item) {
  if (!this.stopDoing.includes(item)) {
    this.stopDoing.push(item);
    this.markModified('stopDoing');
  }
  return this.save();
};

/**
 * Add to start doing list
 */
tinaReflectionSchema.methods.addStartDoing = function(item) {
  if (!this.startDoing.includes(item)) {
    this.startDoing.push(item);
    this.markModified('startDoing');
  }
  return this.save();
};

/**
 * Set next week priorities
 */
tinaReflectionSchema.methods.setNextWeekPriorities = function(priorities) {
  this.nextWeekPriorities = priorities;
  return this.save();
};

/**
 * Add a note
 */
tinaReflectionSchema.methods.addNote = function(content, user = 'tina') {
  this.notes.push({
    content,
    addedAt: new Date(),
    addedBy: user
  });
  return this.save();
};

/**
 * Generate summary
 */
tinaReflectionSchema.methods.generateSummary = function() {
  const summaries = this.sections.map(s => `${s.title}: ${s.content.substring(0, 100)}...`);
  this.summary = summaries.join(' | ');
  return this.save();
};

// Static methods

/**
 * Get reflection by week
 */
tinaReflectionSchema.statics.getByWeek = function(year, weekNumber) {
  return this.findOne({ year, weekNumber });
};

/**
 * Get current week's reflection
 */
tinaReflectionSchema.statics.getCurrentWeek = function() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);

  return this.findOne({ year: d.getUTCFullYear(), weekNumber });
};

/**
 * Get reflections by year
 */
tinaReflectionSchema.statics.getByYear = function(year) {
  return this.find({ year })
    .sort({ weekNumber: 1 });
};

/**
 * Get recent reflections
 */
tinaReflectionSchema.statics.getRecent = function(limit = 12) {
  return this.find({ status: 'completed' })
    .sort({ weekOf: -1 })
    .limit(limit);
};

/**
 * Get reflections by status
 */
tinaReflectionSchema.statics.getByStatus = function(status) {
  return this.find({ status })
    .sort({ weekOf: -1 });
};

/**
 * Get reflections by strategy
 */
tinaReflectionSchema.statics.getByStrategy = function(strategyId) {
  return this.find({ relatedStrategyIds: strategyId })
    .sort({ weekOf: -1 });
};

/**
 * Get reflections by experiment
 */
tinaReflectionSchema.statics.getByExperiment = function(experimentId) {
  return this.find({ relatedExperimentIds: experimentId })
    .sort({ weekOf: -1 });
};

/**
 * Get reflections by goal
 */
tinaReflectionSchema.statics.getByGoal = function(goalId) {
  return this.find({ relatedGoalIds: goalId })
    .sort({ weekOf: -1 });
};

/**
 * Get draft reflections
 */
tinaReflectionSchema.statics.getDrafts = function() {
  return this.find({ status: 'draft' })
    .sort({ weekOf: -1 });
};

/**
 * Get reflections in a date range
 */
tinaReflectionSchema.statics.getInDateRange = function(startDate, endDate) {
  return this.find({
    weekOf: { $gte: startDate, $lte: endDate }
  }).sort({ weekOf: 1 });
};

/**
 * Get sentiment trends
 */
tinaReflectionSchema.statics.getSentimentTrends = function(year, limit = 12) {
  return this.find({
    year,
    status: 'completed'
  })
    .sort({ weekNumber: -1 })
    .limit(limit);
};

const TinaReflection = mongoose.model('TinaReflection', tinaReflectionSchema);

export default TinaReflection;
