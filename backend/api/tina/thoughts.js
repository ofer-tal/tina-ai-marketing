import express from 'express';
import { getLogger } from '../../utils/logger.js';
import TinaThoughtLog from '../../models/TinaThoughtLog.js';

const router = express.Router();
const logger = getLogger('api', 'tina-thoughts');

/**
 * GET /api/tina/thoughts
 * List thoughts with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const {
      thoughtType,
      startDate,
      endDate,
      category,
      validated,
      triggersAction,
      limit = 100,
      skip = 0
    } = req.query;

    const query = {};

    if (thoughtType) {
      const validTypes = ['hypothesis', 'observation', 'analysis', 'question', 'idea', 'conclusion', 'decision', 'general'];
      if (validTypes.includes(thoughtType)) {
        query.thoughtType = thoughtType;
      }
    }

    if (category) {
      query.category = category;
    }

    if (validated !== undefined) {
      query.validated = validated === 'true';
    }

    if (triggersAction !== undefined) {
      query.triggersAction = triggersAction === 'true';
    }

    // Date range filter
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }

    const thoughts = await TinaThoughtLog.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    const count = await TinaThoughtLog.countDocuments(query);

    res.json({
      success: true,
      data: thoughts,
      metadata: {
        count: thoughts.length,
        total: count,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });

  } catch (error) {
    logger.error('Error fetching thoughts', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/thoughts/recent
 * Get recent thoughts
 */
router.get('/recent', async (req, res) => {
  try {
    const { hours = 24, limit = 50 } = req.query;

    const thoughts = await TinaThoughtLog.getRecent(parseInt(hours), parseInt(limit)).lean();

    res.json({
      success: true,
      data: thoughts,
      metadata: { hours: parseInt(hours) }
    });

  } catch (error) {
    logger.error('Error fetching recent thoughts', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/thoughts/by-type/:thoughtType
 * Get thoughts by type
 */
router.get('/by-type/:thoughtType', async (req, res) => {
  try {
    const { thoughtType } = req.params;
    const { limit = 50 } = req.query;

    const validTypes = ['hypothesis', 'observation', 'analysis', 'question', 'idea', 'conclusion', 'decision', 'general'];
    if (!validTypes.includes(thoughtType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid thought type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    const thoughts = await TinaThoughtLog.getByType(thoughtType, parseInt(limit)).lean();

    res.json({
      success: true,
      data: thoughts,
      metadata: { thoughtType }
    });

  } catch (error) {
    logger.error('Error fetching thoughts by type', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/thoughts/strategy/:strategyId
 * Get thoughts related to a strategy
 */
router.get('/strategy/:strategyId', async (req, res) => {
  try {
    const { strategyId } = req.params;

    const thoughts = await TinaThoughtLog.getByStrategy(strategyId).lean();

    res.json({
      success: true,
      data: thoughts,
      metadata: { strategyId }
    });

  } catch (error) {
    logger.error('Error fetching thoughts for strategy', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/thoughts/hypotheses
 * Get all hypothesis thoughts
 */
router.get('/hypotheses', async (req, res) => {
  try {
    const thoughts = await TinaThoughtLog.getHypotheses().lean();

    res.json({
      success: true,
      data: thoughts
    });

  } catch (error) {
    logger.error('Error fetching hypotheses', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/thoughts/ideas
 * Get all idea thoughts
 */
router.get('/ideas', async (req, res) => {
  try {
    const thoughts = await TinaThoughtLog.getIdeas().lean();

    res.json({
      success: true,
      data: thoughts
    });

  } catch (error) {
    logger.error('Error fetching ideas', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/thoughts/actionable
 * Get actionable thoughts (thoughts that triggered actions)
 */
router.get('/actionable', async (req, res) => {
  try {
    const thoughts = await TinaThoughtLog.getActionable().lean();

    res.json({
      success: true,
      data: thoughts
    });

  } catch (error) {
    logger.error('Error fetching actionable thoughts', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/thoughts/stats
 * Get thought statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      byType: {},
      byCategory: {},
      total: 0,
      validated: 0,
      actionable: 0,
      recent: 0
    };

    // Get counts by type
    const typeCounts = await TinaThoughtLog.aggregate([
      { $group: { _id: '$thoughtType', count: { $sum: 1 } } }
    ]);
    typeCounts.forEach(item => {
      stats.byType[item._id] = item.count;
    });

    // Get counts by category
    const categoryCounts = await TinaThoughtLog.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    categoryCounts.forEach(item => {
      stats.byCategory[item._id] = item.count;
    });

    stats.total = await TinaThoughtLog.countDocuments();
    stats.validated = await TinaThoughtLog.countDocuments({ validated: true });
    stats.actionable = await TinaThoughtLog.countDocuments({ triggersAction: true, triggeredAction: { $ne: null } });

    // Get recent thoughts count (last 24 hours)
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);
    stats.recent = await TinaThoughtLog.countDocuments({ timestamp: { $gte: yesterday } });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error fetching thought stats', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/thoughts/:id
 * Get a single thought by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const thought = await TinaThoughtLog.findOne({
      $or: [{ _id: id }, { thoughtId: id }]
    });

    if (!thought) {
      return res.status(404).json({
        success: false,
        error: 'Thought not found'
      });
    }

    res.json({
      success: true,
      data: thought
    });

  } catch (error) {
    logger.error('Error fetching thought', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/thoughts/:id/validate
 * Mark a thought as validated
 */
router.post('/:id/validate', async (req, res) => {
  try {
    const { id } = req.params;
    const { correct, actualOutcome } = req.body;

    const thought = await TinaThoughtLog.findOne({
      $or: [{ _id: id }, { thoughtId: id }]
    });

    if (!thought) {
      return res.status(404).json({
        success: false,
        error: 'Thought not found'
      });
    }

    await thought.validate(correct, actualOutcome || '');

    logger.info('Thought validated', { thoughtId: thought.thoughtId, correct });

    res.json({
      success: true,
      data: thought
    });

  } catch (error) {
    logger.error('Error validating thought', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
