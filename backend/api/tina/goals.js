import express from 'express';
import { getLogger } from '../../utils/logger.js';
import MarketingGoal from '../../models/MarketingGoal.js';
import MarketingStrategy from '../../models/MarketingStrategy.js';

const router = express.Router();
const logger = getLogger('api', 'tina-goals');

/**
 * POST /api/tina/goals
 * Create a new goal
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      targetValue,
      targetDate,
      startValue,
      checkInFrequency,
      priority,
      tags
    } = req.body;

    // Validate required fields
    if (!name || !type || targetValue === undefined || !targetDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, type, targetValue, targetDate'
      });
    }

    // Validate type
    const validTypes = ['revenue', 'growth', 'engagement', 'brand', 'experiment', 'custom'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `type must be one of: ${validTypes.join(', ')}`
      });
    }

    // Validate targetDate
    const targetDateObj = new Date(targetDate);
    if (isNaN(targetDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'targetDate must be a valid date'
      });
    }

    // Validate checkInFrequency if provided
    if (checkInFrequency) {
      const validFrequencies = ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly'];
      if (!validFrequencies.includes(checkInFrequency)) {
        return res.status(400).json({
          success: false,
          error: `checkInFrequency must be one of: ${validFrequencies.join(', ')}`
        });
      }
    }

    const goal = new MarketingGoal({
      name,
      description: description || '',
      type,
      targetValue,
      currentValue: startValue || 0,
      startValue: startValue || 0,
      targetDate: targetDateObj,
      startDate: new Date(),
      checkInFrequency: checkInFrequency || 'weekly',
      priority: priority || 5,
      tags: tags || [],
      status: 'draft'
    });

    await goal.save();

    logger.info('Goal created', { goalId: goal.goalId, name, type });

    res.status(201).json({
      success: true,
      data: goal
    });

  } catch (error) {
    logger.error('Error creating goal', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/goals
 * List all goals with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const {
      status,
      type,
      priority,
      limit = 50,
      skip = 0
    } = req.query;

    const query = {};

    if (status) {
      const validStatuses = ['draft', 'active', 'at_risk', 'achieved', 'missed', 'cancelled'];
      if (validStatuses.includes(status)) {
        query.status = status;
      }
    }

    if (type) {
      const validTypes = ['revenue', 'growth', 'engagement', 'brand', 'experiment', 'custom'];
      if (validTypes.includes(type)) {
        query.type = type;
      }
    }

    if (priority) {
      const priorityNum = parseInt(priority, 10);
      if (!isNaN(priorityNum) && priorityNum >= 1 && priorityNum <= 10) {
        query.priority = priorityNum;
      }
    }

    const goals = await MarketingGoal.find(query)
      .sort({ targetDate: 1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    const count = await MarketingGoal.countDocuments(query);

    res.json({
      success: true,
      data: goals,
      metadata: {
        count: goals.length,
        total: count,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });

  } catch (error) {
    logger.error('Error fetching goals', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/goals/stats
 * Get goal statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      byStatus: {},
      byType: {},
      byPriority: {},
      total: 0,
      active: 0,
      atRisk: 0,
      achieved: 0,
      missed: 0
    };

    // Get counts by status
    const statusCounts = await MarketingGoal.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    statusCounts.forEach(item => {
      stats.byStatus[item._id] = item.count;
      if (item._id === 'active') stats.active = item.count;
      if (item._id === 'at_risk') stats.atRisk = item.count;
      if (item._id === 'achieved') stats.achieved = item.count;
      if (item._id === 'missed') stats.missed = item.count;
    });

    // Get counts by type
    const typeCounts = await MarketingGoal.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    typeCounts.forEach(item => {
      stats.byType[item._id] = item.count;
    });

    // Get counts by priority
    const priorityCounts = await MarketingGoal.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);
    priorityCounts.forEach(item => {
      stats.byPriority[item._id] = item.count;
    });

    stats.total = await MarketingGoal.countDocuments();

    // Calculate average progress
    const progressResult = await MarketingGoal.aggregate([
      { $match: { status: { $in: ['active', 'at_risk'] } } },
      { $group: { _id: null, avgProgress: { $avg: '$progressPercent' } } }
    ]);
    stats.averageProgress = progressResult[0]?.avgProgress || 0;

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error fetching goal stats', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/goals/active
 * Get all active goals for display
 */
router.get('/active', async (req, res) => {
  try {
    const activeGoals = await MarketingGoal.getActive();

    res.json({
      success: true,
      data: activeGoals
    });

  } catch (error) {
    logger.error('Error fetching active goals', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/goals/at-risk
 * Get all at-risk goals
 */
router.get('/at-risk', async (req, res) => {
  try {
    const atRiskGoals = await MarketingGoal.getAtRisk();

    res.json({
      success: true,
      data: atRiskGoals
    });

  } catch (error) {
    logger.error('Error fetching at-risk goals', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/goals/due-soon
 * Get goals due soon (within specified days)
 */
router.get('/due-soon', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const goals = await MarketingGoal.getDueSoon(days);

    res.json({
      success: true,
      data: goals,
      metadata: { days }
    });

  } catch (error) {
    logger.error('Error fetching due-soon goals', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/goals/:id
 * Get a single goal by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const goal = await MarketingGoal.findOne({
      $or: [{ _id: id }, { goalId: id }]
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found'
      });
    }

    // Fetch linked strategies if any
    let linkedStrategies = [];
    if (goal.linkedStrategyIds && goal.linkedStrategyIds.length > 0) {
      linkedStrategies = await MarketingStrategy.find({
        strategyId: { $in: goal.linkedStrategyIds }
      }).select('strategyId name status currentValue targetValue successMetric');
    }

    res.json({
      success: true,
      data: {
        ...goal.toObject(),
        linkedStrategies
      }
    });

  } catch (error) {
    logger.error('Error fetching goal', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/tina/goals/:id
 * Update a goal
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const goal = await MarketingGoal.findOne({
      $or: [{ _id: id }, { goalId: id }]
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found'
      });
    }

    const {
      name,
      description,
      targetValue,
      targetDate,
      startValue,
      checkInFrequency,
      priority,
      tags,
      status
    } = req.body;

    // Update fields
    if (name !== undefined) goal.name = name;
    if (description !== undefined) goal.description = description;
    if (targetValue !== undefined) goal.targetValue = targetValue;
    if (targetDate !== undefined) {
      const newDate = new Date(targetDate);
      if (!isNaN(newDate.getTime())) {
        goal.targetDate = newDate;
      }
    }
    if (startValue !== undefined) goal.startValue = startValue;
    if (checkInFrequency !== undefined) {
      const validFrequencies = ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly'];
      if (validFrequencies.includes(checkInFrequency)) {
        goal.checkInFrequency = checkInFrequency;
      }
    }
    if (priority !== undefined) goal.priority = priority;
    if (tags !== undefined) goal.tags = tags;
    if (status !== undefined) {
      const validStatuses = ['draft', 'active', 'at_risk', 'achieved', 'missed', 'cancelled'];
      if (validStatuses.includes(status)) {
        goal.status = status;
      }
    }

    await goal.save();

    logger.info('Goal updated', { goalId: goal.goalId });

    res.json({
      success: true,
      data: goal
    });

  } catch (error) {
    logger.error('Error updating goal', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/tina/goals/:id
 * Delete a goal
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const goal = await MarketingGoal.findOne({
      $or: [{ _id: id }, { goalId: id }]
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found'
      });
    }

    // Unlink from strategies
    if (goal.linkedStrategyIds && goal.linkedStrategyIds.length > 0) {
      await MarketingStrategy.updateMany(
        { relatedGoalIds: goal.goalId },
        { $pull: { relatedGoalIds: goal.goalId } }
      );
    }

    await MarketingGoal.deleteOne({ _id: goal._id });

    logger.info('Goal deleted', { goalId: goal.goalId });

    res.json({
      success: true,
      message: 'Goal deleted',
      data: {
        goalId: goal.goalId
      }
    });

  } catch (error) {
    logger.error('Error deleting goal', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/goals/:id/update-progress
 * Manual progress update
 */
router.post('/:id/update-progress', async (req, res) => {
  try {
    const { id } = req.params;
    const { currentValue, notes } = req.body;

    if (currentValue === undefined) {
      return res.status(400).json({
        success: false,
        error: 'currentValue is required'
      });
    }

    const goal = await MarketingGoal.findOne({
      $or: [{ _id: id }, { goalId: id }]
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found'
      });
    }

    await goal.updateProgress(currentValue);

    if (notes) {
      await goal.addNote(`Progress update: ${notes}`);
    }

    // Recalculate trajectory
    await goal.calculateTrajectory();

    logger.info('Goal progress updated', {
      goalId: goal.goalId,
      currentValue,
      progressPercent: goal.progressPercent
    });

    res.json({
      success: true,
      data: goal
    });

  } catch (error) {
    logger.error('Error updating goal progress', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/goals/:id/acknowledge-alert
 * Acknowledge all alerts for a goal
 */
router.post('/:id/acknowledge-alert', async (req, res) => {
  try {
    const { id } = req.params;

    const goal = await MarketingGoal.findOne({
      $or: [{ _id: id }, { goalId: id }]
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found'
      });
    }

    await goal.acknowledgeAlerts();

    logger.info('Goal alerts acknowledged', { goalId: goal.goalId });

    res.json({
      success: true,
      data: goal
    });

  } catch (error) {
    logger.error('Error acknowledging alerts', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/goals/:id/link-strategy
 * Link a strategy to a goal
 */
router.post('/:id/link-strategy', async (req, res) => {
  try {
    const { id } = req.params;
    const { strategyId } = req.body;

    if (!strategyId) {
      return res.status(400).json({
        success: false,
        error: 'strategyId is required'
      });
    }

    const goal = await MarketingGoal.findOne({
      $or: [{ _id: id }, { goalId: id }]
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found'
      });
    }

    const strategy = await MarketingStrategy.findOne({
      $or: [{ _id: strategyId }, { strategyId }]
    });

    if (!strategy) {
      return res.status(404).json({
        success: false,
        error: 'Strategy not found'
      });
    }

    // Add to goal's linked strategies
    if (!goal.linkedStrategyIds.includes(strategy.strategyId)) {
      goal.linkedStrategyIds.push(strategy.strategyId);
      await goal.save();
    }

    // Add to strategy's related goals
    if (!strategy.relatedGoalIds) {
      strategy.relatedGoalIds = [];
    }
    if (!strategy.relatedGoalIds.includes(goal.goalId)) {
      strategy.relatedGoalIds.push(goal.goalId);
      await strategy.save();
    }

    logger.info('Strategy linked to goal', { goalId: goal.goalId, strategyId: strategy.strategyId });

    res.json({
      success: true,
      data: { goal, strategy }
    });

  } catch (error) {
    logger.error('Error linking strategy to goal', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/goals/:id/unlink-strategy
 * Unlink a strategy from a goal
 */
router.post('/:id/unlink-strategy', async (req, res) => {
  try {
    const { id } = req.params;
    const { strategyId } = req.body;

    if (!strategyId) {
      return res.status(400).json({
        success: false,
        error: 'strategyId is required'
      });
    }

    const goal = await MarketingGoal.findOne({
      $or: [{ _id: id }, { goalId: id }]
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found'
      });
    }

    // Remove from goal's linked strategies
    goal.linkedStrategyIds = goal.linkedStrategyIds.filter(id => id !== strategyId);
    await goal.save();

    // Remove from strategy's related goals
    const strategy = await MarketingStrategy.findOne({
      $or: [{ _id: strategyId }, { strategyId }]
    });

    if (strategy && strategy.relatedGoalIds) {
      strategy.relatedGoalIds = strategy.relatedGoalIds.filter(id => id !== goal.goalId);
      await strategy.save();
    }

    logger.info('Strategy unlinked from goal', { goalId: goal.goalId, strategyId });

    res.json({
      success: true,
      data: goal
    });

  } catch (error) {
    logger.error('Error unlinking strategy from goal', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/goals/:id/add-milestone
 * Add a milestone to a goal
 */
router.post('/:id/add-milestone', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, targetValue, targetDate } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'name is required'
      });
    }

    const goal = await MarketingGoal.findOne({
      $or: [{ _id: id }, { goalId: id }]
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found'
      });
    }

    await goal.addMilestone(name, targetValue, targetDate ? new Date(targetDate) : null);

    logger.info('Milestone added to goal', { goalId: goal.goalId, milestoneName: name });

    res.json({
      success: true,
      data: goal
    });

  } catch (error) {
    logger.error('Error adding milestone', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/goals/:id/achieve-milestone
 * Mark a milestone as achieved
 */
router.post('/:id/achieve-milestone/:milestoneIndex', async (req, res) => {
  try {
    const { id, milestoneIndex } = req.params;

    const goal = await MarketingGoal.findOne({
      $or: [{ _id: id }, { goalId: id }]
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found'
      });
    }

    const index = parseInt(milestoneIndex, 10);
    if (isNaN(index) || index < 0 || index >= goal.milestones.length) {
      return res.status(400).json({
        success: false,
        error: 'Invalid milestone index'
      });
    }

    await goal.achieveMilestone(index);

    logger.info('Milestone achieved', { goalId: goal.goalId, milestoneIndex: index });

    res.json({
      success: true,
      data: goal
    });

  } catch (error) {
    logger.error('Error achieving milestone', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/goals/:id/activate
 * Activate a draft goal
 */
router.post('/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;

    const goal = await MarketingGoal.findOne({
      $or: [{ _id: id }, { goalId: id }]
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found'
      });
    }

    if (goal.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Only draft goals can be activated'
      });
    }

    goal.status = 'active';
    await goal.save();

    logger.info('Goal activated', { goalId: goal.goalId });

    res.json({
      success: true,
      data: goal
    });

  } catch (error) {
    logger.error('Error activating goal', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/goals/:id/cancel
 * Cancel a goal
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const goal = await MarketingGoal.findOne({
      $or: [{ _id: id }, { goalId: id }]
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found'
      });
    }

    await goal.cancel(reason || '');

    logger.info('Goal cancelled', { goalId: goal.goalId, reason });

    res.json({
      success: true,
      data: goal
    });

  } catch (error) {
    logger.error('Error cancelling goal', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/goals/:id/mark-achieved
 * Mark a goal as achieved
 */
router.post('/:id/mark-achieved', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const goal = await MarketingGoal.findOne({
      $or: [{ _id: id }, { goalId: id }]
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found'
      });
    }

    await goal.markAchieved(notes || '');

    logger.info('Goal marked as achieved', { goalId: goal.goalId });

    res.json({
      success: true,
      data: goal
    });

  } catch (error) {
    logger.error('Error marking goal achieved', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
