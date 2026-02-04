import express from 'express';
import { getLogger } from '../../utils/logger.js';
import MarketingExperiment from '../../models/MarketingExperiment.js';
import MarketingStrategy from '../../models/MarketingStrategy.js';
import MarketingGoal from '../../models/MarketingGoal.js';

const router = express.Router();
const logger = getLogger('api', 'tina-experiments');

/**
 * POST /api/tina/experiments
 * Create a new experiment
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      hypothesis,
      successMetric,
      variants,
      duration,
      category,
      platform,
      relatedStrategyIds,
      relatedGoalIds,
      tags
    } = req.body;

    // Validate required fields
    if (!name || !hypothesis || !successMetric) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, hypothesis, successMetric'
      });
    }

    // Validate variants if provided
    if (variants && variants.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Experiment must have at least 2 variants'
      });
    }

    const experiment = new MarketingExperiment({
      name,
      description: description || '',
      hypothesis,
      successMetric,
      variants: variants || [
        { name: 'Control', isControl: true, allocation: 50 },
        { name: 'Variant A', allocation: 50 }
      ],
      duration: duration || 14,
      category,
      platform,
      relatedStrategyIds,
      relatedGoalIds,
      tags,
      status: 'draft'
    });

    await experiment.save();

    logger.info('Experiment created', { experimentId: experiment.experimentId, name });

    res.status(201).json({
      success: true,
      data: experiment
    });

  } catch (error) {
    logger.error('Error creating experiment', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/experiments
 * List experiments with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const {
      status,
      category,
      platform,
      limit = 50,
      skip = 0
    } = req.query;

    const query = {};

    if (status) {
      const validStatuses = ['draft', 'running', 'paused', 'completed', 'cancelled', 'inconclusive'];
      if (validStatuses.includes(status)) {
        query.status = status;
      }
    }

    if (category) {
      query.category = category;
    }

    if (platform) {
      const validPlatforms = ['instagram', 'tiktok', 'youtube', 'general', 'other'];
      if (validPlatforms.includes(platform)) {
        query.platform = platform;
      }
    }

    const experiments = await MarketingExperiment.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    const count = await MarketingExperiment.countDocuments(query);

    res.json({
      success: true,
      data: experiments,
      metadata: {
        count: experiments.length,
        total: count,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });

  } catch (error) {
    logger.error('Error fetching experiments', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/experiments/stats
 * Get experiment statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      byStatus: {},
      byCategory: {},
      byPlatform: {},
      total: 0,
      running: 0,
      completed: 0,
      draft: 0,
      inconclusive: 0
    };

    // Get counts by status
    const statusCounts = await MarketingExperiment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    statusCounts.forEach(item => {
      stats.byStatus[item._id] = item.count;
      if (item._id === 'running') stats.running = item.count;
      if (item._id === 'completed') stats.completed = item.count;
      if (item._id === 'draft') stats.draft = item.count;
      if (item._id === 'inconclusive') stats.inconclusive = item.count;
    });

    // Get counts by category
    const categoryCounts = await MarketingExperiment.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    categoryCounts.forEach(item => {
      stats.byCategory[item._id] = item.count;
    });

    // Get counts by platform
    const platformCounts = await MarketingExperiment.aggregate([
      { $group: { _id: '$platform', count: { $sum: 1 } } }
    ]);
    platformCounts.forEach(item => {
      stats.byPlatform[item._id] = item.count;
    });

    stats.total = await MarketingExperiment.countDocuments();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error fetching experiment stats', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/experiments/running
 * Get running experiments
 */
router.get('/running', async (req, res) => {
  try {
    const running = await MarketingExperiment.getRunning();

    res.json({
      success: true,
      data: running
    });

  } catch (error) {
    logger.error('Error fetching running experiments', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/experiments/:id
 * Get a single experiment by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const experiment = await MarketingExperiment.findOne({
      $or: [{ _id: id }, { experimentId: id }]
    });

    if (!experiment) {
      return res.status(404).json({
        success: false,
        error: 'Experiment not found'
      });
    }

    // Fetch related strategies if any
    let relatedStrategies = [];
    if (experiment.relatedStrategyIds && experiment.relatedStrategyIds.length > 0) {
      relatedStrategies = await MarketingStrategy.find({
        strategyId: { $in: experiment.relatedStrategyIds }
      }).select('strategyId name status');
    }

    // Fetch related goals if any
    let relatedGoals = [];
    if (experiment.relatedGoalIds && experiment.relatedGoalIds.length > 0) {
      relatedGoals = await MarketingGoal.find({
        goalId: { $in: experiment.relatedGoalIds }
      }).select('goalId name status progressPercent');
    }

    res.json({
      success: true,
      data: {
        ...experiment.toObject(),
        relatedStrategies,
        relatedGoals
      }
    });

  } catch (error) {
    logger.error('Error fetching experiment', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/experiments/:id/results
 * Get detailed results for a completed experiment
 */
router.get('/:id/results', async (req, res) => {
  try {
    const { id } = req.params;

    const experiment = await MarketingExperiment.findOne({
      $or: [{ _id: id }, { experimentId: id }]
    });

    if (!experiment) {
      return res.status(404).json({
        success: false,
        error: 'Experiment not found'
      });
    }

    // Build detailed results
    const results = {
      experiment: {
        id: experiment._id,
        experimentId: experiment.experimentId,
        name: experiment.name,
        hypothesis: experiment.hypothesis,
        successMetric: experiment.successMetric,
        status: experiment.status
      },
      winner: experiment.winningVariant,
      variants: experiment.variants.map(v => ({
        name: v.name,
        isControl: v.isControl,
        allocation: v.allocation,
        sampleSize: v.sampleSize,
        metrics: Object.fromEntries(v.metrics)
      })),
      analysis: experiment.results,
      significance: {
        threshold: experiment.significanceThreshold,
        hasSufficientSample: experiment.hasSufficientSample()
      },
      learnings: experiment.learnings,
      actionTaken: experiment.actionTaken
    };

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    logger.error('Error fetching experiment results', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/tina/experiments/:id
 * Update an experiment
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const experiment = await MarketingExperiment.findOne({
      $or: [{ _id: id }, { experimentId: id }]
    });

    if (!experiment) {
      return res.status(404).json({
        success: false,
        error: 'Experiment not found'
      });
    }

    // Can only edit draft experiments
    if (experiment.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Can only edit draft experiments'
      });
    }

    const {
      name,
      description,
      hypothesis,
      successMetric,
      duration,
      category,
      platform,
      relatedStrategyIds,
      relatedGoalIds,
      tags
    } = req.body;

    // Update fields
    if (name !== undefined) experiment.name = name;
    if (description !== undefined) experiment.description = description;
    if (hypothesis !== undefined) experiment.hypothesis = hypothesis;
    if (successMetric !== undefined) experiment.successMetric = successMetric;
    if (duration !== undefined) experiment.duration = duration;
    if (category !== undefined) experiment.category = category;
    if (platform !== undefined) experiment.platform = platform;
    if (relatedStrategyIds !== undefined) experiment.relatedStrategyIds = relatedStrategyIds;
    if (relatedGoalIds !== undefined) experiment.relatedGoalIds = relatedGoalIds;
    if (tags !== undefined) experiment.tags = tags;

    await experiment.save();

    logger.info('Experiment updated', { experimentId: experiment.experimentId });

    res.json({
      success: true,
      data: experiment
    });

  } catch (error) {
    logger.error('Error updating experiment', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/tina/experiments/:id
 * Delete an experiment
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const experiment = await MarketingExperiment.findOne({
      $or: [{ _id: id }, { experimentId: id }]
    });

    if (!experiment) {
      return res.status(404).json({
        success: false,
        error: 'Experiment not found'
      });
    }

    // Can only delete draft experiments
    if (experiment.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Can only delete draft experiments'
      });
    }

    await MarketingExperiment.deleteOne({ _id: experiment._id });

    logger.info('Experiment deleted', { experimentId: experiment.experimentId });

    res.json({
      success: true,
      message: 'Experiment deleted',
      data: {
        experimentId: experiment.experimentId
      }
    });

  } catch (error) {
    logger.error('Error deleting experiment', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/experiments/:id/start
 * Start an experiment
 */
router.post('/:id/start', async (req, res) => {
  try {
    const { id } = req.params;

    const experiment = await MarketingExperiment.findOne({
      $or: [{ _id: id }, { experimentId: id }]
    });

    if (!experiment) {
      return res.status(404).json({
        success: false,
        error: 'Experiment not found'
      });
    }

    await experiment.start();

    logger.info('Experiment started', { experimentId: experiment.experimentId });

    res.json({
      success: true,
      data: experiment
    });

  } catch (error) {
    logger.error('Error starting experiment', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/experiments/:id/complete
 * Complete a running experiment
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;

    const experiment = await MarketingExperiment.findOne({
      $or: [{ _id: id }, { experimentId: id }]
    });

    if (!experiment) {
      return res.status(404).json({
        success: false,
        error: 'Experiment not found'
      });
    }

    await experiment.complete();

    logger.info('Experiment completed', { experimentId: experiment.experimentId });

    res.json({
      success: true,
      data: experiment
    });

  } catch (error) {
    logger.error('Error completing experiment', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/experiments/:id/pause
 * Pause a running experiment
 */
router.post('/:id/pause', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const experiment = await MarketingExperiment.findOne({
      $or: [{ _id: id }, { experimentId: id }]
    });

    if (!experiment) {
      return res.status(404).json({
        success: false,
        error: 'Experiment not found'
      });
    }

    await experiment.pause(reason || '');

    logger.info('Experiment paused', { experimentId: experiment.experimentId });

    res.json({
      success: true,
      data: experiment
    });

  } catch (error) {
    logger.error('Error pausing experiment', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/experiments/:id/resume
 * Resume a paused experiment
 */
router.post('/:id/resume', async (req, res) => {
  try {
    const { id } = req.params;

    const experiment = await MarketingExperiment.findOne({
      $or: [{ _id: id }, { experimentId: id }]
    });

    if (!experiment) {
      return res.status(404).json({
        success: false,
        error: 'Experiment not found'
      });
    }

    await experiment.resume();

    logger.info('Experiment resumed', { experimentId: experiment.experimentId });

    res.json({
      success: true,
      data: experiment
    });

  } catch (error) {
    logger.error('Error resuming experiment', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/experiments/:id/cancel
 * Cancel an experiment
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const experiment = await MarketingExperiment.findOne({
      $or: [{ _id: id }, { experimentId: id }]
    });

    if (!experiment) {
      return res.status(404).json({
        success: false,
        error: 'Experiment not found'
      });
    }

    await experiment.cancel(reason || '');

    logger.info('Experiment cancelled', { experimentId: experiment.experimentId });

    res.json({
      success: true,
      data: experiment
    });

  } catch (error) {
    logger.error('Error cancelling experiment', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/experiments/:id/analyze
 * Analyze experiment results
 */
router.post('/:id/analyze', async (req, res) => {
  try {
    const { id } = req.params;

    const experiment = await MarketingExperiment.findOne({
      $or: [{ _id: id }, { experimentId: id }]
    });

    if (!experiment) {
      return res.status(404).json({
        success: false,
        error: 'Experiment not found'
      });
    }

    await experiment.analyze();

    logger.info('Experiment analyzed', { experimentId: experiment.experimentId, winner: experiment.winningVariant });

    res.json({
      success: true,
      data: experiment
    });

  } catch (error) {
    logger.error('Error analyzing experiment', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/experiments/:id/record-learning
 * Record learning from experiment
 */
router.post('/:id/record-learning', async (req, res) => {
  try {
    const { id } = req.params;
    const { learning, actionTaken } = req.body;

    const experiment = await MarketingExperiment.findOne({
      $or: [{ _id: id }, { experimentId: id }]
    });

    if (!experiment) {
      return res.status(404).json({
        success: false,
        error: 'Experiment not found'
      });
    }

    await experiment.recordLearning(learning, actionTaken || '');

    logger.info('Learning recorded for experiment', { experimentId: experiment.experimentId });

    res.json({
      success: true,
      data: experiment
    });

  } catch (error) {
    logger.error('Error recording learning', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/experiments/:id/add-variant
 * Add a variant to a draft experiment
 */
router.post('/:id/add-variant', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, allocation, isControl } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Variant name is required'
      });
    }

    const experiment = await MarketingExperiment.findOne({
      $or: [{ _id: id }, { experimentId: id }]
    });

    if (!experiment) {
      return res.status(404).json({
        success: false,
        error: 'Experiment not found'
      });
    }

    await experiment.addVariant(name, description || '', allocation || 50, isControl || false);

    logger.info('Variant added to experiment', { experimentId: experiment.experimentId, variantName: name });

    res.json({
      success: true,
      data: experiment
    });

  } catch (error) {
    logger.error('Error adding variant', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/tina/experiments/:id/variant/:variantName/metrics
 * Update variant metrics
 */
router.put('/:id/variant/:variantName/metrics', async (req, res) => {
  try {
    const { id, variantName } = req.params;
    const { metrics, sampleSize } = req.body;

    const experiment = await MarketingExperiment.findOne({
      $or: [{ _id: id }, { experimentId: id }]
    });

    if (!experiment) {
      return res.status(404).json({
        success: false,
        error: 'Experiment not found'
      });
    }

    // Update metrics
    if (metrics) {
      await experiment.addVariantMetrics(variantName, metrics);
    }

    // Update sample size
    if (sampleSize !== undefined) {
      await experiment.updateVariantSampleSize(variantName, sampleSize);
    }

    logger.info('Variant metrics updated', { experimentId: experiment.experimentId, variantName });

    res.json({
      success: true,
      data: experiment
    });

  } catch (error) {
    logger.error('Error updating variant metrics', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/experiments/:id/notes
 * Add a note to an experiment
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

    const experiment = await MarketingExperiment.findOne({
      $or: [{ _id: id }, { experimentId: id }]
    });

    if (!experiment) {
      return res.status(404).json({
        success: false,
        error: 'Experiment not found'
      });
    }

    await experiment.addNote(content, user);

    logger.info('Note added to experiment', { experimentId: experiment.experimentId, user });

    res.json({
      success: true,
      data: experiment
    });

  } catch (error) {
    logger.error('Error adding note to experiment', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
