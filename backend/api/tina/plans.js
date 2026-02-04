import express from 'express';
import { getLogger } from '../../utils/logger.js';
import MarketingPlan from '../../models/MarketingPlan.js';
import MarketingGoal from '../../models/MarketingGoal.js';
import MarketingStrategy from '../../models/MarketingStrategy.js';

const router = express.Router();
const logger = getLogger('api', 'tina-plans');

/**
 * GET /api/tina/plans
 * List plans with filters
 */
router.get('/', async (req, res) => {
  try {
    const { horizon, status, limit = 50 } = req.query;

    const query = {};
    if (horizon) query.horizon = horizon;
    if (status) query.status = status;

    const plans = await MarketingPlan.find(query)
      .sort({ 'period.start': -1 })
      .limit(parseInt(limit))
      .lean();

    const count = await MarketingPlan.countDocuments(query);

    res.json({
      success: true,
      data: plans,
      metadata: {
        count: plans.length,
        total: count
      }
    });

  } catch (error) {
    logger.error('Error fetching plans', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/tina/plans/current
 * Get current active plan by horizon
 */
router.get('/current', async (req, res) => {
  try {
    const { horizon } = req.query;

    if (!horizon) {
      return res.status(400).json({
        success: false,
        error: 'horizon parameter required (weekly, monthly, quarterly)'
      });
    }

    const plan = await MarketingPlan.getCurrent(horizon);

    if (!plan) {
      return res.json({
        success: true,
        data: null,
        message: `No active ${horizon} plan found`
      });
    }

    res.json({
      success: true,
      data: plan
    });

  } catch (error) {
    logger.error('Error fetching current plan', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/tina/plans/all-current
 * Get all current plans across horizons
 */
router.get('/all-current', async (req, res) => {
  try {
    const plans = await MarketingPlan.getAllCurrent();

    res.json({
      success: true,
      data: plans
    });

  } catch (error) {
    logger.error('Error fetching all current plans', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/tina/plans/stats
 * Plan statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      byHorizon: {},
      byStatus: {},
      total: 0,
      active: 0
    };

    const byHorizon = await MarketingPlan.aggregate([
      { $group: { _id: '$horizon', count: { $sum: 1 } } }
    ]);
    byHorizon.forEach(item => {
      stats.byHorizon[item._id] = item.count;
    });

    const byStatus = await MarketingPlan.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    byStatus.forEach(item => {
      stats.byStatus[item._id] = item.count;
    });

    stats.total = await MarketingPlan.countDocuments();
    stats.active = await MarketingPlan.countDocuments({ status: 'active' });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error fetching plan stats', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/tina/plans/:id
 * Get single plan
 */
router.get('/:id', async (req, res) => {
  try {
    const plan = await MarketingPlan.findOne({
      $or: [{ _id: req.params.id }, { planId: req.params.id }]
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    res.json({
      success: true,
      data: plan
    });

  } catch (error) {
    logger.error('Error fetching plan', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/tina/plans
 * Create a new plan
 */
router.post('/', async (req, res) => {
  try {
    const {
      horizon,
      period,
      focusAreas,
      scheduledActions,
      relatedGoalIds,
      relatedStrategyIds,
      kpis
    } = req.body;

    if (!horizon || !period || !period.start || !period.end) {
      return res.status(400).json({
        success: false,
        error: 'horizon and period (with start/end) are required'
      });
    }

    const plan = new MarketingPlan({
      horizon,
      period: {
        start: new Date(period.start),
        end: new Date(period.end),
        name: period.name
      },
      focusAreas: focusAreas || [],
      scheduledActions: scheduledActions || [],
      relatedGoalIds: relatedGoalIds || [],
      relatedStrategyIds: relatedStrategyIds || [],
      kpis: kpis || [],
      status: 'draft'
    });

    await plan.save();

    logger.info('Plan created', { planId: plan.planId, horizon });

    res.status(201).json({
      success: true,
      data: plan
    });

  } catch (error) {
    logger.error('Error creating plan', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/tina/plans/:id
 * Update a plan
 */
router.put('/:id', async (req, res) => {
  try {
    const plan = await MarketingPlan.findOne({
      $or: [{ _id: req.params.id }, { planId: req.params.id }]
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    const {
      focusAreas,
      scheduledActions,
      relatedGoalIds,
      relatedStrategyIds,
      kpis,
      budgetAllocation,
      period
    } = req.body;

    if (focusAreas) plan.focusAreas = focusAreas;
    if (scheduledActions) plan.scheduledActions = scheduledActions;
    if (relatedGoalIds) plan.relatedGoalIds = relatedGoalIds;
    if (relatedStrategyIds) plan.relatedStrategyIds = relatedStrategyIds;
    if (kpis) plan.kpis = kpis;
    if (budgetAllocation) plan.budgetAllocation = budgetAllocation;
    if (period) {
      if (period.start) plan.period.start = new Date(period.start);
      if (period.end) plan.period.end = new Date(period.end);
      if (period.name) plan.period.name = period.name;
    }

    // Recalculate progress
    plan.calculateProgress();

    await plan.save();

    logger.info('Plan updated', { planId: plan.planId });

    res.json({
      success: true,
      data: plan
    });

  } catch (error) {
    logger.error('Error updating plan', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/tina/plans/:id/activate
 * Activate a draft plan
 */
router.post('/:id/activate', async (req, res) => {
  try {
    const { approvedBy = 'founder' } = req.body;

    const plan = await MarketingPlan.findOne({
      $or: [{ _id: req.params.id }, { planId: req.params.id }]
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    await plan.activate(approvedBy);

    logger.info('Plan activated', { planId: plan.planId });

    res.json({
      success: true,
      data: plan
    });

  } catch (error) {
    logger.error('Error activating plan', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/tina/plans/:id/action
 * Add an action to the plan
 */
router.post('/:id/action', async (req, res) => {
  try {
    const { name, description, scheduledFor, type, estimatedEffort, relatedGoalId, relatedStrategyId } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'name is required'
      });
    }

    const plan = await MarketingPlan.findOne({
      $or: [{ _id: req.params.id }, { planId: req.params.id }]
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    await plan.addAction(
      name,
      description,
      scheduledFor ? new Date(scheduledFor) : undefined,
      {
        type,
        estimatedEffort,
        relatedGoalId,
        relatedStrategyId
      }
    );

    logger.info('Action added to plan', { planId: plan.planId, actionName: name });

    res.json({
      success: true,
      data: plan
    });

  } catch (error) {
    logger.error('Error adding action to plan', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/tina/plans/:id/action/:actionId/complete
 * Complete an action
 */
router.post('/:id/action/:actionId/complete', async (req, res) => {
  try {
    const { result, completedBy = 'user' } = req.body;

    const plan = await MarketingPlan.findOne({
      $or: [{ _id: req.params.id }, { planId: req.params.id }]
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    await plan.completeAction(req.params.actionId, result, completedBy);

    logger.info('Action completed', { planId: plan.planId, actionId: req.params.actionId });

    res.json({
      success: true,
      data: plan
    });

  } catch (error) {
    logger.error('Error completing action', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/tina/plans/:id/archive
 * Archive a completed plan
 */
router.post('/:id/archive', async (req, res) => {
  try {
    const plan = await MarketingPlan.findOne({
      $or: [{ _id: req.params.id }, { planId: req.params.id }]
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    await plan.archive();

    logger.info('Plan archived', { planId: plan.planId });

    res.json({
      success: true,
      data: plan
    });

  } catch (error) {
    logger.error('Error archiving plan', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/tina/plans/:id
 * Delete a draft plan
 */
router.delete('/:id', async (req, res) => {
  try {
    const plan = await MarketingPlan.findOne({
      $or: [{ _id: req.params.id }, { planId: req.params.id }]
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    if (plan.status === 'active') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete active plan. Archive it first.'
      });
    }

    await MarketingPlan.deleteOne({ _id: plan._id });

    logger.info('Plan deleted', { planId: plan.planId });

    res.json({
      success: true,
      message: 'Plan deleted'
    });

  } catch (error) {
    logger.error('Error deleting plan', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
