import express from 'express';
import { getLogger } from '../../utils/logger.js';
import MarketingStrategy from '../../models/MarketingStrategy.js';
import MarketingGoal from '../../models/MarketingGoal.js';

const router = express.Router();
const logger = getLogger('api', 'tina-strategies');

/**
 * POST /api/tina/strategies
 * Create a new strategy
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      hypothesis,
      timeframe,
      successMetric,
      targetValue,
      currentBaseline = 0,
      level = 'broad',
      parentStrategyId = null,
      relatedGoalIds = [],
      category = 'general',
      priority = 5,
      tags = []
    } = req.body;

    // Validate required fields
    if (!name || !hypothesis || !successMetric || targetValue === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, hypothesis, successMetric, targetValue'
      });
    }

    // Validate level
    if (!['broad', 'specific'].includes(level)) {
      return res.status(400).json({
        success: false,
        error: 'level must be "broad" or "specific"'
      });
    }

    // Validate timeframe if provided
    if (timeframe) {
      if (timeframe.start && timeframe.end) {
        const startDate = new Date(timeframe.start);
        const endDate = new Date(timeframe.end);
        if (startDate >= endDate) {
          return res.status(400).json({
            success: false,
            error: 'timeframe.start must be before timeframe.end'
          });
        }
      }
    }

    const strategy = new MarketingStrategy({
      name,
      description: description || '',
      hypothesis,
      timeframe: timeframe || {},
      successMetric,
      targetValue,
      currentBaseline,
      currentValue: currentBaseline,
      level,
      parentStrategyId,
      relatedGoalIds,
      category,
      priority,
      tags,
      status: 'draft'
    });

    await strategy.save();

    logger.info('Strategy created', { strategyId: strategy.strategyId, name });

    res.status(201).json({
      success: true,
      data: strategy
    });

  } catch (error) {
    logger.error('Error creating strategy', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/strategies
 * List all strategies with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const {
      status,
      level,
      category,
      parentStrategyId,
      relatedGoalId,
      limit = 50,
      skip = 0
    } = req.query;

    const query = {};

    if (status) {
      const validStatuses = ['draft', 'active', 'paused', 'completed', 'cancelled', 'failed'];
      if (validStatuses.includes(status)) {
        query.status = status;
      }
    }

    if (level) {
      if (['broad', 'specific'].includes(level)) {
        query.level = level;
      }
    }

    if (category) {
      query.category = category;
    }

    if (parentStrategyId) {
      query.parentStrategyId = parentStrategyId;
    }

    if (relatedGoalId) {
      query.relatedGoalIds = relatedGoalId;
    }

    const strategies = await MarketingStrategy.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    const count = await MarketingStrategy.countDocuments(query);

    res.json({
      success: true,
      data: strategies,
      metadata: {
        count: strategies.length,
        total: count,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });

  } catch (error) {
    logger.error('Error fetching strategies', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/strategies/tree
 * Get strategy tree (hierarchical view)
 */
router.get('/tree', async (req, res) => {
  try {
    const broadStrategies = await MarketingStrategy.getBroad();

    // Fetch children for each broad strategy
    const tree = await Promise.all(
      broadStrategies.map(async (strategy) => {
        const children = await MarketingStrategy.getByParent(strategy.strategyId);
        return {
          ...strategy.toObject(),
          children
        };
      })
    );

    res.json({
      success: true,
      data: tree
    });

  } catch (error) {
    logger.error('Error fetching strategy tree', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/strategies/stats
 * Get strategy statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      byStatus: {},
      byLevel: {},
      byCategory: {},
      total: 0,
      active: 0,
      completed: 0
    };

    // Get counts by status
    const statusCounts = await MarketingStrategy.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    statusCounts.forEach(item => {
      stats.byStatus[item._id] = item.count;
      if (item._id === 'active') stats.active = item.count;
      if (item._id === 'completed') stats.completed = item.count;
    });

    // Get counts by level
    const levelCounts = await MarketingStrategy.aggregate([
      { $group: { _id: '$level', count: { $sum: 1 } } }
    ]);
    levelCounts.forEach(item => {
      stats.byLevel[item._id] = item.count;
    });

    // Get counts by category
    const categoryCounts = await MarketingStrategy.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    categoryCounts.forEach(item => {
      stats.byCategory[item._id] = item.count;
    });

    stats.total = await MarketingStrategy.countDocuments();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error fetching strategy stats', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/strategies/:id
 * Get a single strategy by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const strategy = await MarketingStrategy.findOne({
      $or: [{ _id: id }, { strategyId: id }]
    });

    if (!strategy) {
      return res.status(404).json({
        success: false,
        error: 'Strategy not found'
      });
    }

    // Fetch related goals if any
    let relatedGoals = [];
    if (strategy.relatedGoalIds && strategy.relatedGoalIds.length > 0) {
      relatedGoals = await MarketingGoal.find({
        goalId: { $in: strategy.relatedGoalIds }
      });
    }

    // Fetch children if any
    const children = await MarketingStrategy.getByParent(strategy.strategyId);

    res.json({
      success: true,
      data: {
        ...strategy.toObject(),
        relatedGoals,
        children
      }
    });

  } catch (error) {
    logger.error('Error fetching strategy', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/tina/strategies/:id
 * Update a strategy
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const strategy = await MarketingStrategy.findOne({
      $or: [{ _id: id }, { strategyId: id }]
    });

    if (!strategy) {
      return res.status(404).json({
        success: false,
        error: 'Strategy not found'
      });
    }

    // Check if strategy is editable
    if (!strategy.isEditable()) {
      return res.status(400).json({
        success: false,
        error: `Cannot edit strategy with status "${strategy.status}"`
      });
    }

    const {
      name,
      description,
      hypothesis,
      timeframe,
      successMetric,
      targetValue,
      currentBaseline,
      currentValue,
      relatedGoalIds,
      category,
      priority,
      tags
    } = req.body;

    // Update fields
    if (name !== undefined) strategy.name = name;
    if (description !== undefined) strategy.description = description;
    if (hypothesis !== undefined) strategy.hypothesis = hypothesis;
    if (timeframe !== undefined) strategy.timeframe = timeframe;
    if (successMetric !== undefined) strategy.successMetric = successMetric;
    if (targetValue !== undefined) strategy.targetValue = targetValue;
    if (currentBaseline !== undefined) strategy.currentBaseline = currentBaseline;
    if (currentValue !== undefined) strategy.currentValue = currentValue;
    if (relatedGoalIds !== undefined) strategy.relatedGoalIds = relatedGoalIds;
    if (category !== undefined) strategy.category = category;
    if (priority !== undefined) strategy.priority = priority;
    if (tags !== undefined) strategy.tags = tags;

    await strategy.save();

    logger.info('Strategy updated', { strategyId: strategy.strategyId });

    res.json({
      success: true,
      data: strategy
    });

  } catch (error) {
    logger.error('Error updating strategy', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/tina/strategies/:id
 * Delete a strategy
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const strategy = await MarketingStrategy.findOne({
      $or: [{ _id: id }, { strategyId: id }]
    });

    if (!strategy) {
      return res.status(404).json({
        success: false,
        error: 'Strategy not found'
      });
    }

    // Check for child strategies
    const children = await MarketingStrategy.getByParent(strategy.strategyId);
    if (children.length > 0) {
      // Unlink children from parent
      await MarketingStrategy.updateMany(
        { parentStrategyId: strategy.strategyId },
        { parentStrategyId: null }
      );
    }

    await MarketingStrategy.deleteOne({ _id: strategy._id });

    logger.info('Strategy deleted', { strategyId: strategy.strategyId });

    res.json({
      success: true,
      message: 'Strategy deleted',
      data: {
        strategyId: strategy.strategyId,
        childrenUnlinked: children.length
      }
    });

  } catch (error) {
    logger.error('Error deleting strategy', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/strategies/:id/complete
 * Mark strategy as complete with outcomes
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { outcomes = [], notes = '' } = req.body;

    const strategy = await MarketingStrategy.findOne({
      $or: [{ _id: id }, { strategyId: id }]
    });

    if (!strategy) {
      return res.status(404).json({
        success: false,
        error: 'Strategy not found'
      });
    }

    if (strategy.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Strategy is already completed'
      });
    }

    await strategy.complete(outcomes);

    if (notes) {
      await strategy.addNote(`Completion notes: ${notes}`);
    }

    logger.info('Strategy completed', { strategyId: strategy.strategyId });

    res.json({
      success: true,
      data: strategy
    });

  } catch (error) {
    logger.error('Error completing strategy', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/strategies/:id/pause
 * Pause an active strategy
 */
router.post('/:id/pause', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = '' } = req.body;

    const strategy = await MarketingStrategy.findOne({
      $or: [{ _id: id }, { strategyId: id }]
    });

    if (!strategy) {
      return res.status(404).json({
        success: false,
        error: 'Strategy not found'
      });
    }

    if (strategy.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Can only pause active strategies'
      });
    }

    await strategy.pause(reason);

    logger.info('Strategy paused', { strategyId: strategy.strategyId, reason });

    res.json({
      success: true,
      data: strategy
    });

  } catch (error) {
    logger.error('Error pausing strategy', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/strategies/:id/resume
 * Resume a paused strategy
 */
router.post('/:id/resume', async (req, res) => {
  try {
    const { id } = req.params;

    const strategy = await MarketingStrategy.findOne({
      $or: [{ _id: id }, { strategyId: id }]
    });

    if (!strategy) {
      return res.status(404).json({
        success: false,
        error: 'Strategy not found'
      });
    }

    await strategy.resume();

    logger.info('Strategy resumed', { strategyId: strategy.strategyId });

    res.json({
      success: true,
      data: strategy
    });

  } catch (error) {
    logger.error('Error resuming strategy', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/strategies/:id/approve
 * Approve a draft strategy
 */
router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { user = 'founder' } = req.body;

    const strategy = await MarketingStrategy.findOne({
      $or: [{ _id: id }, { strategyId: id }]
    });

    if (!strategy) {
      return res.status(404).json({
        success: false,
        error: 'Strategy not found'
      });
    }

    if (strategy.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Can only approve draft strategies'
      });
    }

    await strategy.approve(user);

    logger.info('Strategy approved', { strategyId: strategy.strategyId, user });

    res.json({
      success: true,
      data: strategy
    });

  } catch (error) {
    logger.error('Error approving strategy', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/strategies/:id/cancel
 * Cancel a strategy
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = '' } = req.body;

    const strategy = await MarketingStrategy.findOne({
      $or: [{ _id: id }, { strategyId: id }]
    });

    if (!strategy) {
      return res.status(404).json({
        success: false,
        error: 'Strategy not found'
      });
    }

    await strategy.cancel(reason);

    logger.info('Strategy cancelled', { strategyId: strategy.strategyId, reason });

    res.json({
      success: true,
      data: strategy
    });

  } catch (error) {
    logger.error('Error cancelling strategy', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/strategies/:id/children
 * Get child strategies
 */
router.get('/:id/children', async (req, res) => {
  try {
    const { id } = req.params;

    const strategy = await MarketingStrategy.findOne({
      $or: [{ _id: id }, { strategyId: id }]
    });

    if (!strategy) {
      return res.status(404).json({
        success: false,
        error: 'Strategy not found'
      });
    }

    const children = await MarketingStrategy.getByParent(strategy.strategyId);

    res.json({
      success: true,
      data: children
    });

  } catch (error) {
    logger.error('Error fetching child strategies', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/strategies/:id/performance
 * Get strategy performance data
 */
router.get('/:id/performance', async (req, res) => {
  try {
    const { id } = req.params;

    const strategy = await MarketingStrategy.findOne({
      $or: [{ _id: id }, { strategyId: id }]
    });

    if (!strategy) {
      return res.status(404).json({
        success: false,
        error: 'Strategy not found'
      });
    }

    const baseline = strategy.currentBaseline || 0;
    const current = strategy.currentValue || 0;
    const target = strategy.targetValue;

    const progress = {
      baseline,
      current,
      target,
      progressPercent: 0,
      remaining: 0,
      achieved: false
    };

    if (target > 0) {
      progress.remaining = Math.max(0, target - current);
      progress.progressPercent = Math.min(100, Math.max(0, ((current - baseline) / (target - baseline)) * 100));
      progress.achieved = current >= target;
    }

    res.json({
      success: true,
      data: {
        strategy: {
          id: strategy._id,
          strategyId: strategy.strategyId,
          name: strategy.name,
          successMetric: strategy.successMetric
        },
        progress,
        status: strategy.status,
        timeframe: strategy.timeframe,
        statusHistory: strategy.statusHistory,
        outcomes: strategy.outcomes
      }
    });

  } catch (error) {
    logger.error('Error fetching strategy performance', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/strategies/:id/notes
 * Add a note to a strategy
 */
router.post('/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, user = 'tina' } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Note content is required'
      });
    }

    const strategy = await MarketingStrategy.findOne({
      $or: [{ _id: id }, { strategyId: id }]
    });

    if (!strategy) {
      return res.status(404).json({
        success: false,
        error: 'Strategy not found'
      });
    }

    await strategy.addNote(content, user);

    logger.info('Note added to strategy', { strategyId: strategy.strategyId, user });

    res.json({
      success: true,
      data: strategy
    });

  } catch (error) {
    logger.error('Error adding note to strategy', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/tina/strategies/:id/value
 * Update strategy current value
 */
router.put('/:id/value', async (req, res) => {
  try {
    const { id } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Value is required'
      });
    }

    const strategy = await MarketingStrategy.findOne({
      $or: [{ _id: id }, { strategyId: id }]
    });

    if (!strategy) {
      return res.status(404).json({
        success: false,
        error: 'Strategy not found'
      });
    }

    await strategy.updateValue(value);

    logger.info('Strategy value updated', { strategyId: strategy.strategyId, value });

    res.json({
      success: true,
      data: strategy
    });

  } catch (error) {
    logger.error('Error updating strategy value', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
