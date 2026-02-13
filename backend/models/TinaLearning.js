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
tinaLearningSchema.pre('beforeValidation', function(next) {
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
tinaLearningSchema.statics.getRecount = function(days = 30, isValid = true) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - days);

  return this.find({
    isValid,
    createdAt: { $gte: threshold }
  }).sort({ createdAt: -1 });
};

/**
 * Find similar learnings based on pattern text similarity
 * Uses keyword extraction and matching to find potential duplicates
 *
 * @param {string} pattern - The pattern text to search for similar learnings
 * @param {string} [category] - Optional category to restrict search
 * @param {number} [minSimilarity=0.3] - Minimum similarity threshold (0-1)
 * @returns {Array} Similar learnings with similarity scores
 */
tinaLearningSchema.statics.findSimilar = async function(pattern, category = null, minSimilarity = 0.3) {
  // Extract keywords from the input pattern
  const keywords = extractKeywords(pattern);
  if (keywords.length === 0) return [];

  // Build query - search within the same category if specified
  const query = { isValid: true };
  if (category) {
    query.category = category;
  }

  // Get all valid learnings (in the same category if specified)
  const learnings = await this.find(query).lean();

  // Calculate similarity scores
  const similar = learnings
    .map(learning => {
      const similarity = calculateSimilarity(pattern, learning.pattern, keywords);
      return {
        ...learning,
        similarity
      };
    })
    .filter(l => l.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity);

  return similar;
};

/**
 * Check if a learning should be suggested as new
 * Returns existing similar learnings and whether this is truly novel
 *
 * @param {string} pattern - The pattern to check
 * @param {string} category - The category
 * @returns {Object} { isNovel: boolean, similarLearnings: Array, suggestedAction: string }
 */
tinaLearningSchema.statics.shouldSuggestLearning = async function(pattern, category) {
  // Find similar learnings with a lower threshold for checking
  const similar = await this.findSimilar(pattern, category, 0.25);

  if (similar.length === 0) {
    return {
      isNovel: true,
      similarLearnings: [],
      suggestedAction: 'suggest_create'
    };
  }

  // Check if any are very similar (high confidence match)
  const verySimilar = similar.filter(l => l.similarity >= 0.6);

  if (verySimilar.length > 0) {
    return {
      isNovel: false,
      similarLearnings: verySimilar,
      suggestedAction: 'reference_existing',
      message: `This learning is very similar to existing learning(s): ${verySimilar.map(l => l.learningId).join(', ')}`
    };
  }

  // Moderately similar - might be worth adding as a refinement
  const moderatelySimilar = similar.filter(l => l.similarity >= 0.4);

  return {
    isNovel: true,
    similarLearnings: moderatelySimilar,
    suggestedAction: 'suggest_with_context',
    message: `This learning is novel but related to: ${moderatelySimilar.map(l => l.learningId).join(', ')}`
  };
};

/**
 * Extract meaningful keywords from text
 */
function extractKeywords(text) {
  if (!text) return [];

  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
    'could', 'might', 'may', 'must', 'can', 'to', 'of', 'in', 'on', 'at',
    'by', 'for', 'with', 'from', 'as', 'or', 'and', 'but', 'not', 'this',
    'that', 'these', 'those', 'it', 'its', 'get', 'gets', 'got', 'more',
    'less', 'most', 'least', 'than', 'when', 'where', 'what', 'which', 'who',
    'how', 'why', 'if', 'then', 'so', 'such', 'up', 'down', 'out', 'over'
  ]);

  // Convert to lowercase and split into words
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));

  // Return unique words
  return [...new Set(words)];
}

/**
 * Calculate similarity between two text strings
 * Uses Jaccard-like similarity on keyword intersection
 */
function calculateSimilarity(text1, text2, keywords1) {
  const keywords2 = extractKeywords(text2);

  if (keywords1.length === 0 || keywords2.length === 0) return 0;

  // Find intersection
  const intersection = keywords1.filter(k => keywords2.includes(k));
  const union = [...new Set([...keywords1, ...keywords2])];

  // Jaccard similarity
  const jaccard = union.length > 0 ? intersection.length / union.length : 0;

  // Boost for exact phrase matches (consecutive words)
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  let phraseMatch = 0;

  for (let i = 0; i < words1.length - 2; i++) {
    const phrase = words1.slice(i, i + 3).join(' ');
    if (text2.toLowerCase().includes(phrase)) {
      phraseMatch += 0.2;
    }
  }

  for (let i = 0; i < words2.length - 2; i++) {
    const phrase = words2.slice(i, i + 3).join(' ');
    if (text1.toLowerCase().includes(phrase)) {
      phraseMatch += 0.2;
    }
  }

  return Math.min(1, jaccard + phraseMatch);
}

/**
 * ROADMAP: Semantic Search for Learnings
 * -------------------------------------
 * When the learnings database grows larger (1000+ entries), we should implement
 * RAG-like semantic search using embeddings:
 *
 * 1. Generate embeddings for each learning using OpenAI/text-embedding-3-small
 *    or a lightweight local model (e.g., sentence-transformers)
 *
 * 2. Store embeddings in a vector database (MongoDB Atlas Vector Search, Pinecone, etc.)
 *
 * 3. At query time, embed the user's question/instruction and retrieve
 *    semantically similar learnings using cosine similarity
 *
 * 4. This will allow Tina to find relevant learnings even when the wording
 *    is different but the meaning is related (e.g., "posts do better in evening"
 *    would match "content scheduled after 6pm gets higher engagement")
 *
 * Implementation timeline:
 * - Phase 1 (Current): Keyword-based similarity matching
 * - Phase 2 (1000+ learnings): Implement embeddings and vector search
 * - Phase 3 (Advanced): Hierarchical embeddings + temporal weighting
 */

const TinaLearning = mongoose.model('TinaLearning', tinaLearningSchema);

export default TinaLearning;
