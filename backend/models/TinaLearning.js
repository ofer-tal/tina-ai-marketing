import mongoose from 'mongoose';
import { generateLearningId } from '../utils/tinaIdGenerator.js';

/**
 * Tina Learning Model
 *
 * Stores patterns and insights discovered by Tina.
 * Tracks validated learnings with confidence scores and evidence.
 */

const evidenceSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['experiment', 'observation', 'metric_change', 'user_feedback', 'analysis'],
    required: true
  },
  sourceId: String, // ID of the source (experiment ID, etc.)
  description: String,
  timestamp: {
    type: Date,
    default: Date.now
  },
  supporting: {
    type: Boolean,
    default: true
  },
  strength: {
    type: Number,
    min: 0,
    max: 10,
    default: 5
  }
}, { _id: false });

const tinaLearningSchema = new mongoose.Schema({
  // Human-readable ID
  learningId: {
    type: String,
    unique: true,
    index: true
  },

  // Learning category
  category: {
    type: String,
    enum: ['content', 'timing', 'hashtags', 'format', 'platform', 'audience', 'creative', 'copy', 'general'],
    default: 'general',
    index: true
  },

  // The pattern learned
  pattern: {
    type: String,
    required: true
  },

  // Pattern type
  patternType: {
    type: String,
    enum: ['correlation', 'causation', 'trend', 'preference', 'optimal', 'avoidance'],
    default: 'correlation'
  },

  // Confidence in the learning (0-100)
  confidence: {
    type: Number,
    default: 50,
    min: 0,
    max: 100,
    index: true
  },

  // Strength of the pattern (0-10)
  strength: {
    type: Number,
    default: 5,
    min: 0,
    max: 10,
    index: true
  },

  // How many times this has been validated
  validationCount: {
    type: Number,
    default: 0
  },

  // Evidence supporting this learning
  evidence: [evidenceSchema],

  // Related experiments
  supportingExperimentIds: [{
    type: String,
    ref: 'MarketingExperiment'
  }],

  // Related strategies
  relatedStrategyIds: [{
    type: String,
    ref: 'MarketingStrategy'
  }],

  // Validation status
  isValid: {
    type: Boolean,
    default: true,
    index: true
  },

  // Whether this learning can be acted upon
  isActionable: {
    type: Boolean,
    default: true
  },

  // When to review this learning again
  nextReviewAt: {
    type: Date
  },

  // Last reviewed
  lastReviewedAt: Date,

  // Action taken based on this learning
  actionTaken: String,

  // Result of action taken
  actionResult: String,

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

  // invalidatedAt
  invalidatedAt: Date,

  // invalidationReason
  invalidationReason: String
}, {
  collection: 'marketing_learnings',
  timestamps: true
});

// Indexes for efficient queries
tinaLearningSchema.index({ category: 1, confidence: -1 });
tinaLearningSchema.index({ isValid: 1, strength: -1 });
tinaLearningSchema.index({ nextReviewAt: 1 });
tinaLearningSchema.index({ supportingExperimentIds: 1 });
tinaLearningSchema.index({ relatedStrategyIds: 1 });
tinaLearningSchema.index({ isActionable: 1, isValid: 1 });

/**
 * Generate learning ID before validation
 */
tinaLearningSchema.pre('validate', function(next) {
  if (!this.learningId) {
    this.learningId = generateLearningId();
  }
  next();
});

/**
 * Validate the learning (increase confidence)
 */
tinaLearningSchema.methods.markValidated = function(evidence = null) {
  this.validationCount += 1;
  this.lastReviewedAt = new Date();

  // Increase confidence based on validation
  if (this.confidence < 100) {
    this.confidence = Math.min(100, this.confidence + 10);
  }

  // Add evidence if provided
  if (evidence) {
    this.evidence.push(evidence);
    this.markModified('evidence');
  }

  // Set next review date (further out as confidence grows)
  const daysUntilReview = Math.max(7, Math.min(90, this.confidence));
  this.nextReviewAt = new Date();
  this.nextReviewAt.setDate(this.nextReviewAt.getDate() + daysUntilReview);

  return this.save();
};

/**
 * Invalidate the learning
 */
tinaLearningSchema.methods.invalidate = function(reason = '') {
  this.isValid = false;
  this.invalidatedAt = new Date();
  this.invalidationReason = reason;
  this.isActionable = false;

  return this.save();
};

/**
 * Add evidence to the learning
 */
tinaLearningSchema.methods.addEvidence = function(type, sourceId, description, supporting = true, strength = 5) {
  this.evidence.push({
    type,
    sourceId,
    description,
    timestamp: new Date(),
    supporting,
    strength
  });

  this.markModified('evidence');

  // Recalculate confidence based on evidence
  const supportingEvidence = this.evidence.filter(e => e.supporting);
  const totalEvidence = this.evidence.length;

  if (totalEvidence > 0) {
    const supportRatio = supportingEvidence.length / totalEvidence;
    const avgStrength = supportingEvidence.reduce((sum, e) => sum + e.strength, 0) / Math.max(1, supportingEvidence.length);

    this.confidence = Math.round(supportRatio * avgStrength * 10);
    this.strength = Math.round(avgStrength);
  }

  return this.save();
};

/**
 * Record action taken
 */
tinaLearningSchema.methods.recordAction = function(action, result = '') {
  this.actionTaken = action;
  this.actionResult = result;
  return this.save();
};

/**
 * Mark as not actionable
 */
tinaLearningSchema.methods.markNotActionable = function(reason = '') {
  this.isActionable = false;

  if (reason) {
    this.notes.push({
      content: `Marked not actionable: ${reason}`,
      addedAt: new Date(),
      addedBy: 'system'
    });
  }

  return this.save();
};

/**
 * Add a note
 */
tinaLearningSchema.methods.addNote = function(content, user = 'tina') {
  this.notes.push({
    content,
    addedAt: new Date(),
    addedBy: user
  });
  return this.save();
};

/**
 * Check if learning needs review
 */
tinaLearningSchema.methods.needsReview = function() {
  if (!this.nextReviewAt) return false;
  return new Date() >= this.nextReviewAt;
};

// Static methods

/**
 * Get validated learnings
 */
tinaLearningSchema.statics.getValidated = function(minConfidence = 70) {
  return this.find({
    isValid: true,
    confidence: { $gte: minConfidence }
  }).sort({ confidence: -1, createdAt: -1 });
};

/**
 * Get learnings by category
 */
tinaLearningSchema.statics.getByCategory = function(category) {
  return this.find({ category, isValid: true })
    .sort({ confidence: -1, createdAt: -1 });
};

/**
 * Get high confidence learnings
 */
tinaLearningSchema.statics.getHighConfidence = function(threshold = 80) {
  return this.find({
    isValid: true,
    confidence: { $gte: threshold }
  }).sort({ confidence: -1 });
};

/**
 * Get actionable learnings
 */
tinaLearningSchema.statics.getActionable = function() {
  return this.find({
    isValid: true,
    isActionable: true
  }).sort({ confidence: -1, strength: -1 });
};

/**
 * Get learnings needing review
 */
tinaLearningSchema.statics.getNeedingReview = function() {
  return this.find({
    isValid: true,
    nextReviewAt: { $lte: new Date() }
  }).sort({ nextReviewAt: 1 });
};

/**
 * Get learnings by pattern type
 */
tinaLearningSchema.statics.getByPatternType = function(patternType) {
  return this.find({
    patternType,
    isValid: true
  }).sort({ confidence: -1 });
};

/**
 * Get learnings from experiments
 */
tinaLearningSchema.statics.getByExperiment = function(experimentId) {
  return this.find({
    supportingExperimentIds: experimentId
  }).sort({ confidence: -1 });
};

/**
 * Get learnings by tag
 */
tinaLearningSchema.statics.getByTag = function(tag) {
  return this.find({
    tags: tag,
    isValid: true
  }).sort({ confidence: -1 });
};

/**
 * Get invalidated learnings
 */
tinaLearningSchema.statics.getInvalidated = function() {
  return this.find({ isValid: false })
    .sort({ invalidatedAt: -1 });
};

/**
 * Get strong patterns
 */
tinaLearningSchema.statics.getStrongPatterns = function(minStrength = 7) {
  return this.find({
    isValid: true,
    strength: { $gte: minStrength }
  }).sort({ strength: -1, confidence: -1 });
};

/**
 * Get recent learnings
 */
tinaLearningSchema.statics.getRecent = function(days = 30, isValid = true) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - days);

  return this.find({
    isValid,
    createdAt: { $gte: threshold }
  }).sort({ createdAt: -1 });
};

const TinaLearning = mongoose.model('TinaLearning', tinaLearningSchema);

export default TinaLearning;
