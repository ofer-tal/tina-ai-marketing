import express from 'express';
import { getLogger } from '../../utils/logger.js';
import TinaLearning from '../../models/TinaLearning.js';

const router = express.Router();
const logger = getLogger('api', 'tina-learnings');

/**
 * GET /api/tina/learnings
 * List learnings with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const {
      category,
      minConfidence,
      isValid,
      isActionable,
      patternType,
      limit = 50,
      skip = 0
    } = req.query;

    const query = {};

    if (category) {
      const validCategories = ['content', 'timing', 'hashtags', 'format', 'platform', 'audience', 'creative', 'copy', 'general'];
      if (validCategories.includes(category)) {
        query.category = category;
      }
    }

    if (minConfidence) {
      query.confidence = { $gte: parseInt(minConfidence) };
    }

    if (isValid !== undefined) {
      query.isValid = isValid === 'true';
    }

    if (isActionable !== undefined) {
      query.isActionable = isActionable === 'true';
    }

    if (patternType) {
      const validPatternTypes = ['correlation', 'causation', 'trend', 'preference', 'optimal', 'avoidance'];
      if (validPatternTypes.includes(patternType)) {
        query.patternType = patternType;
      }
    }

    const learnings = await TinaLearning.find(query)
      .sort({ confidence: -1, strength: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    const count = await TinaLearning.countDocuments(query);

    res.json({
      success: true,
      data: learnings,
      metadata: {
        count: learnings.length,
        total: count,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });

  } catch (error) {
    logger.error('Error fetching learnings', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/learnings/stats
 * Get learning statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      byCategory: {},
      byPatternType: {},
      byStrength: {},
      total: 0,
      validated: 0,
      actionable: 0,
      highConfidence: 0,
      avgConfidence: 0
    };

    // Get counts by category
    const categoryCounts = await TinaLearning.aggregate([
      { $match: { isValid: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    categoryCounts.forEach(item => {
      stats.byCategory[item._id] = item.count;
    });

    // Get counts by pattern type
    const patternTypeCounts = await TinaLearning.aggregate([
      { $match: { isValid: true } },
      { $group: { _id: '$patternType', count: { $sum: 1 } } }
    ]);
    patternTypeCounts.forEach(item => {
      stats.byPatternType[item._id] = item.count;
    });

    // Get counts by strength
    const strengthCounts = await TinaLearning.aggregate([
      { $match: { isValid: true } },
      { $group: { _id: '$strength', count: { $sum: 1 } } }
    ]);
    strengthCounts.forEach(item => {
      stats.byStrength[item._id] = item.count;
    });

    // Get total validated count
    stats.validated = await TinaLearning.countDocuments({ isValid: true });

    // Get actionable count
    stats.actionable = await TinaLearning.countDocuments({ isValid: true, isActionable: true });

    // Get high confidence count
    stats.highConfidence = await TinaLearning.countDocuments({ isValid: true, confidence: { $gte: 70 } });

    // Get total
    stats.total = await TinaLearning.countDocuments();

    // Get average confidence
    const avgResult = await TinaLearning.aggregate([
      { $match: { isValid: true } },
      { $group: { _id: null, avgConf: { $avg: '$confidence' } } }
    ]);
    stats.avgConfidence = avgResult[0]?.avgConf || 0;

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error fetching learning stats', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/learnings/high-confidence
 * Get high confidence learnings
 */
router.get('/high-confidence', async (req, res) => {
  try {
    const { threshold = 70, limit = 20 } = req.query;

    const learnings = await TinaLearning.getHighConfidence(parseInt(threshold))
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: learnings,
      metadata: { threshold: parseInt(threshold) }
    });

  } catch (error) {
    logger.error('Error fetching high confidence learnings', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/learnings/actionable
 * Get actionable learnings
 */
router.get('/actionable', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const learnings = await TinaLearning.getActionable()
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: learnings
    });

  } catch (error) {
    logger.error('Error fetching actionable learnings', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/learnings/review-needed
 * Get learnings that need review
 */
router.get('/review-needed', async (req, res) => {
  try {
    const learnings = await TinaLearning.getNeedingReview().lean();

    res.json({
      success: true,
      data: learnings
    });

  } catch (error) {
    logger.error('Error fetching learnings needing review', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/learnings/by-category/:category
 * Get learnings by category
 */
router.get('/by-category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 20 } = req.query;

    const learnings = await TinaLearning.getByCategory(category)
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: learnings,
      metadata: { category }
    });

  } catch (error) {
    logger.error('Error fetching learnings by category', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/learnings
 * Create a new learning
 */
router.post('/', async (req, res) => {
  try {
    const {
      pattern,
      category,
      confidence,
      strength,
      patternType,
      relatedExperimentIds,
      relatedStrategyIds,
      tags
    } = req.body;

    if (!pattern || !category) {
      return res.status(400).json({
        success: false,
        error: 'pattern and category are required'
      });
    }

    const learning = new TinaLearning({
      pattern,
      category: category || 'general',
      confidence: confidence || 50,
      strength: strength || 5,
      patternType: patternType || 'correlation',
      relatedExperimentIds: relatedExperimentIds || [],
      relatedStrategyIds: relatedStrategyIds || [],
      tags: tags || []
    });

    await learning.save();

    logger.info('Learning created', { learningId: learning.learningId, category });

    res.status(201).json({
      success: true,
      data: learning
    });

  } catch (error) {
    logger.error('Error creating learning', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/learnings/detect
 * Trigger pattern detection and return discovered patterns
 */
router.post('/detect', async (req, res) => {
  try {
    const { days = 30 } = req.body;

    // Use pattern detection service
    const patternDetection = (await import('../../services/tinaPatternDetection.js')).default;

    const [contentPatterns, experimentPatterns] = await Promise.all([
      patternDetection.detectContentPatterns(days),
      patternDetection.detectExperimentPatterns()
    ]);

    const allPatterns = [...contentPatterns, ...experimentPatterns];

    // Filter out duplicates and create learnings for high-confidence patterns
    const created = [];
    for (const pattern of allPatterns) {
      if (pattern.confidence >= 60) {
        // Check for similar existing learnings
        const existing = await TinaLearning.findOne({
          category: pattern.category,
          pattern: { $regex: pattern.pattern.split(' ').slice(0, 3).join('|'), $options: 'i' },
          isValid: true
        });

        if (!existing) {
          const learning = new TinaLearning({
            pattern: pattern.pattern,
            category: pattern.category,
            confidence: pattern.confidence,
            strength: pattern.strength,
            evidence: pattern.evidence || [],
            supportingExperimentIds: pattern.supportingExperimentIds || []
          });

          await learning.save();
          created.push(learning);
        }
      }
    }

    logger.info('Pattern detection complete', {
      patternsFound: allPatterns.length,
      learningsCreated: created.length
    });

    res.json({
      success: true,
      data: {
        patterns: allPatterns,
        created: created
      }
    });

  } catch (error) {
    logger.error('Error detecting patterns', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/learnings/:id
 * Get a single learning by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const learning = await TinaLearning.findOne({
      $or: [{ _id: id }, { learningId: id }]
    });

    if (!learning) {
      return res.status(404).json({
        success: false,
        error: 'Learning not found'
      });
    }

    res.json({
      success: true,
      data: learning
    });

  } catch (error) {
    logger.error('Error fetching learning', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/learnings/:id/validate
 * Mark a learning as validated
 */
router.post('/:id/validate', async (req, res) => {
  try {
    const { id } = req.params;
    const { evidence } = req.body;

    const learning = await TinaLearning.findOne({
      $or: [{ _id: id }, { learningId: id }]
    });

    if (!learning) {
      return res.status(404).json({
        success: false,
        error: 'Learning not found'
      });
    }

    await learning.markValidated(evidence);

    logger.info('Learning validated', { learningId: learning.learningId });

    res.json({
      success: true,
      data: learning
    });

  } catch (error) {
    logger.error('Error validating learning', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/learnings/:id/invalidate
 * Mark a learning as invalid
 */
router.post('/:id/invalidate', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const learning = await TinaLearning.findOne({
      $or: [{ _id: id }, { learningId: id }]
    });

    if (!learning) {
      return res.status(404).json({
        success: false,
        error: 'Learning not found'
      });
    }

    await learning.invalidate(reason || '');

    logger.info('Learning invalidated', { learningId: learning.learningId, reason });

    res.json({
      success: true,
      data: learning
    });

  } catch (error) {
    logger.error('Error invalidating learning', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/learnings/:id/add-evidence
 * Add evidence to a learning
 */
router.post('/:id/add-evidence', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, sourceId, description, supporting, strength } = req.body;

    if (!type || !description) {
      return res.status(400).json({
        success: false,
        error: 'type and description are required'
      });
    }

    const learning = await TinaLearning.findOne({
      $or: [{ _id: id }, { learningId: id }]
    });

    if (!learning) {
      return res.status(404).json({
        success: false,
        error: 'Learning not found'
      });
    }

    await learning.addEvidence(
      type,
      sourceId || '',
      description,
      supporting !== undefined ? supporting : true,
      strength || 5
    );

    logger.info('Evidence added to learning', { learningId: learning.learningId });

    res.json({
      success: true,
      data: learning
    });

  } catch (error) {
    logger.error('Error adding evidence to learning', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/learnings/:id/record-action
 * Record action taken based on learning
 */
router.post('/:id/record-action', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, result } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'action is required'
      });
    }

    const learning = await TinaLearning.findOne({
      $or: [{ _id: id }, { learningId: id }]
    });

    if (!learning) {
      return res.status(404).json({
        success: false,
        error: 'Learning not found'
      });
    }

    await learning.recordAction(action, result || '');

    logger.info('Action recorded for learning', { learningId: learning.learningId, action });

    res.json({
      success: true,
      data: learning
    });

  } catch (error) {
    logger.error('Error recording action for learning', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/learnings/:id/mark-not-actionable
 * Mark learning as not actionable
 */
router.post('/:id/mark-not-actionable', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const learning = await TinaLearning.findOne({
      $or: [{ _id: id }, { learningId: id }]
    });

    if (!learning) {
      return res.status(404).json({
        success: false,
        error: 'Learning not found'
      });
    }

    await learning.markNotActionable(reason || '');

    logger.info('Learning marked as not actionable', { learningId: learning.learningId });

    res.json({
      success: true,
      data: learning
    });

  } catch (error) {
    logger.error('Error marking learning not actionable', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/learnings/:id/notes
 * Add a note to a learning
 */
router.post('/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, user = 'admin' } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Note content is required'
      });
    }

    const learning = await TinaLearning.findOne({
      $or: [{ _id: id }, { learningId: id }]
    });

    if (!learning) {
      return res.status(404).json({
        success: false,
        error: 'Learning not found'
      });
    }

    await learning.addNote(content, user);

    logger.info('Note added to learning', { learningId: learning.learningId, user });

    res.json({
      success: true,
      data: learning
    });

  } catch (error) {
    logger.error('Error adding note to learning', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
