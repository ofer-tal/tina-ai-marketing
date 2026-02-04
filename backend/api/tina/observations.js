import express from 'express';
import { getLogger } from '../../utils/logger.js';
import TinaObservation from '../../models/TinaObservation.js';

const router = express.Router();
const logger = getLogger('api', 'tina-observations');

/**
 * GET /api/tina/observations
 * List observations with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const {
      status,
      urgency,
      category,
      limit = 50,
      skip = 0
    } = req.query;

    const query = {};

    if (status) {
      const validStatuses = ['pending', 'acknowledged', 'dismissed', 'expired', 'actioned'];
      if (validStatuses.includes(status)) {
        query.status = status;
      }
    }

    if (urgency) {
      const validUrgencies = ['low', 'medium', 'high', 'critical'];
      if (validUrgencies.includes(urgency)) {
        query.urgency = urgency;
      }
    }

    if (category) {
      const validCategories = ['performance', 'opportunity', 'risk', 'pattern', 'milestone', 'system', 'general'];
      if (validCategories.includes(category)) {
        query.category = category;
      }
    }

    // Exclude expired by default unless specifically requested
    if (status !== 'expired') {
      query.$or = [
        { expiresAt: null },
        { expiresAt: { $gte: new Date() } }
      ];
    }

    const observations = await TinaObservation.find(query)
      .sort([['urgency', -1], ['createdAt', -1]])
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    const count = await TinaObservation.countDocuments(query);

    res.json({
      success: true,
      data: observations,
      metadata: {
        count: observations.length,
        total: count,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });

  } catch (error) {
    logger.error('Error fetching observations', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/observations/pending
 * Get pending observations (inbox)
 */
router.get('/pending', async (req, res) => {
  try {
    const {
      urgency,
      limit = 20
    } = req.query;

    const query = { status: 'pending' };

    if (urgency) {
      const validUrgencies = ['low', 'medium', 'high', 'critical'];
      if (validUrgencies.includes(urgency)) {
        query.urgency = urgency;
      }
    }

    // Exclude expired
    query.$or = [
      { expiresAt: null },
      { expiresAt: { $gte: new Date() } }
    ];

    const observations = await TinaObservation.find(query)
      .sort([['urgency', -1], ['createdAt', -1]])
      .limit(parseInt(limit))
      .lean();

    // Get count by urgency
    const pendingCounts = await TinaObservation.aggregate([
      { $match: query },
      { $group: { _id: '$urgency', count: { $sum: 1 } } }
    ]);

    const countByUrgency = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    pendingCounts.forEach(item => {
      countByUrgency[item._id] = item.count;
    });

    res.json({
      success: true,
      data: observations,
      metadata: {
        count: observations.length,
        countByUrgency
      }
    });

  } catch (error) {
    logger.error('Error fetching pending observations', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/observations/stats
 * Get observation statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      byStatus: {},
      byUrgency: {},
      byCategory: {},
      totalPending: 0,
      highPriorityPending: 0
    };

    // Get counts by status
    const statusCounts = await TinaObservation.aggregate([
      {
        $match: {
          $or: [
            { expiresAt: null },
            { expiresAt: { $gte: new Date() } }
          ]
        }
      },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    statusCounts.forEach(item => {
      stats.byStatus[item._id] = item.count;
      if (item._id === 'pending') stats.totalPending = item.count;
    });

    // Get counts by urgency (pending only)
    const urgencyCounts = await TinaObservation.aggregate([
      {
        $match: {
          status: 'pending',
          $or: [
            { expiresAt: null },
            { expiresAt: { $gte: new Date() } }
          ]
        }
      },
      { $group: { _id: '$urgency', count: { $sum: 1 } } }
    ]);
    urgencyCounts.forEach(item => {
      stats.byUrgency[item._id] = item.count;
      if (item._id === 'high' || item._id === 'critical') {
        stats.highPriorityPending += item.count;
      }
    });

    // Get counts by category (pending only)
    const categoryCounts = await TinaObservation.aggregate([
      {
        $match: {
          status: 'pending',
          $or: [
            { expiresAt: null },
            { expiresAt: { $gte: new Date() } }
          ]
        }
      },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    categoryCounts.forEach(item => {
      stats.byCategory[item._id] = item.count;
    });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error fetching observation stats', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tina/observations/:id
 * Get a single observation by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const observation = await TinaObservation.findOne({
      $or: [{ _id: id }, { observationId: id }]
    });

    if (!observation) {
      return res.status(404).json({
        success: false,
        error: 'Observation not found'
      });
    }

    res.json({
      success: true,
      data: observation
    });

  } catch (error) {
    logger.error('Error fetching observation', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/observations/:id/acknowledge
 * Acknowledge an observation
 */
router.post('/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const { user = 'founder' } = req.body;

    const observation = await TinaObservation.findOne({
      $or: [{ _id: id }, { observationId: id }]
    });

    if (!observation) {
      return res.status(404).json({
        success: false,
        error: 'Observation not found'
      });
    }

    await observation.acknowledge(user);

    logger.info('Observation acknowledged', {
      observationId: observation.observationId,
      user
    });

    res.json({
      success: true,
      data: observation
    });

  } catch (error) {
    logger.error('Error acknowledging observation', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/observations/:id/dismiss
 * Dismiss an observation
 */
router.post('/:id/dismiss', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const observation = await TinaObservation.findOne({
      $or: [{ _id: id }, { observationId: id }]
    });

    if (!observation) {
      return res.status(404).json({
        success: false,
        error: 'Observation not found'
      });
    }

    await observation.dismiss(reason || '');

    logger.info('Observation dismissed', {
      observationId: observation.observationId,
      reason
    });

    res.json({
      success: true,
      data: observation
    });

  } catch (error) {
    logger.error('Error dismissing observation', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/observations/:id/execute-action
 * Execute the suggested action from an observation
 */
router.post('/:id/execute-action', async (req, res) => {
  try {
    const { id } = req.params;

    const observation = await TinaObservation.findOne({
      $or: [{ _id: id }, { observationId: id }]
    });

    if (!observation) {
      return res.status(404).json({
        success: false,
        error: 'Observation not found'
      });
    }

    if (!observation.isActionable()) {
      return res.status(400).json({
        success: false,
        error: 'Observation is not actionable'
      });
    }

    // In a full implementation, this would execute the actual action
    // For now, we'll just mark it as actioned with a note
    const result = `Action "${observation.actionRequest.type}" would be executed here`;

    await observation.executeAction(result);

    logger.info('Observation action executed', {
      observationId: observation.observationId,
      actionType: observation.actionRequest.type
    });

    res.json({
      success: true,
      data: observation,
      message: result
    });

  } catch (error) {
    logger.error('Error executing observation action', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/observations/bulk-ack
 * Bulk acknowledge observations
 */
router.post('/bulk-ack', async (req, res) => {
  try {
    const { ids, user = 'founder' } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ids must be a non-empty array'
      });
    }

    const result = await TinaObservation.updateMany(
      {
        _id: { $in: ids },
        status: 'pending'
      },
      {
        status: 'acknowledged',
        acknowledgedAt: new Date(),
        $push: {
          notes: {
            content: `Bulk acknowledged by ${user}`,
            addedAt: new Date(),
            addedBy: user
          }
        }
      }
    );

    logger.info('Bulk acknowledge observations', {
      count: result.modifiedCount,
      user
    });

    res.json({
      success: true,
      data: {
        acknowledged: result.modifiedCount
      }
    });

  } catch (error) {
    logger.error('Error in bulk acknowledge', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/observations/bulk-dismiss
 * Bulk dismiss observations
 */
router.post('/bulk-dismiss', async (req, res) => {
  try {
    const { ids, reason } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ids must be a non-empty array'
      });
    }

    const result = await TinaObservation.updateMany(
      {
        _id: { $in: ids },
        status: 'pending'
      },
      {
        status: 'dismissed',
        dismissedAt: new Date(),
        dismissalReason: reason || 'Bulk dismissed'
      }
    );

    logger.info('Bulk dismiss observations', {
      count: result.modifiedCount,
      reason
    });

    res.json({
      success: true,
      data: {
        dismissed: result.modifiedCount
      }
    });

  } catch (error) {
    logger.error('Error in bulk dismiss', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tina/observations/cleanup
 * Clean up old/expired observations
 */
router.post('/cleanup', async (req, res) => {
  try {
    const { days = 90 } = req.body;

    const threshold = new Date();
    threshold.setDate(threshold.getDate() - days);

    // Mark old observations as expired
    const result = await TinaObservation.updateMany(
      {
        status: { $in: ['acknowledged', 'dismissed'] },
        updatedAt: { $lt: threshold }
      },
      { status: 'expired' }
    );

    // Delete very old observations
    const deleteThreshold = new Date();
    deleteThreshold.setDate(deleteThreshold.getDate() - days * 2);

    const deleteResult = await TinaObservation.deleteMany({
      status: 'expired',
      updatedAt: { $lt: deleteThreshold }
    });

    logger.info('Observation cleanup completed', {
      markedExpired: result.modifiedCount,
      deleted: deleteResult.deletedCount,
      days
    });

    res.json({
      success: true,
      data: {
        markedExpired: result.modifiedCount,
        deleted: deleteResult.deletedCount
      }
    });

  } catch (error) {
    logger.error('Error in observation cleanup', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
