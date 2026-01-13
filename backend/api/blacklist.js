import express from 'express';
import winston from 'winston';
import StoryBlacklist from '../models/StoryBlacklist.js';
import Story from '../models/Story.js';

const router = express.Router();

// Create logger for blacklist API
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'blacklist-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/blacklist-api-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/blacklist-api.log' }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

/**
 * GET /api/blacklist
 * Get all blacklisted stories
 *
 * Query params:
 * - active: boolean (optional) - Filter by active status
 * - category: string (optional) - Filter by category
 * - limit: number (optional) - Limit results
 * - skip: number (optional) - Skip results for pagination
 */
router.get('/', async (req, res) => {
  try {
    const { active, category, limit = 50, skip = 0 } = req.query;

    logger.info('Fetching blacklisted stories', { active, category, limit, skip });

    // Build query
    const query = {};

    if (active !== undefined) {
      query.isActive = active === 'true';
    }

    if (category) {
      query.category = category;
    }

    // Fetch blacklist entries
    const blacklistedStories = await StoryBlacklist.find(query)
      .sort({ blacklistedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    // Get total count
    const total = await StoryBlacklist.countDocuments(query);

    logger.info('Blacklisted stories fetched', {
      count: blacklistedStories.length,
      total
    });

    res.json({
      success: true,
      data: blacklistedStories,
      meta: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: (parseInt(skip) + blacklistedStories.length) < total
      }
    });
  } catch (error) {
    logger.error('Error fetching blacklisted stories', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch blacklisted stories',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/blacklist/:storyId
 * Check if a story is blacklisted
 *
 * Path params:
 * - storyId: string - Story ID to check
 */
router.get('/:storyId', async (req, res) => {
  try {
    const { storyId } = req.params;

    logger.info('Checking if story is blacklisted', { storyId });

    const blacklistEntry = await StoryBlacklist.findOne({
      storyId,
      isActive: true
    }).lean();

    if (!blacklistEntry) {
      return res.json({
        success: true,
        data: {
          isBlacklisted: false,
          storyId
        }
      });
    }

    logger.info('Story is blacklisted', {
      storyId,
      storyName: blacklistEntry.storyName,
      reason: blacklistEntry.reason
    });

    res.json({
      success: true,
      data: {
        isBlacklisted: true,
        ...blacklistEntry
      }
    });
  } catch (error) {
    logger.error('Error checking blacklist status', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to check blacklist status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/blacklist
 * Add a story to the blacklist
 *
 * Request body:
 * - storyId: string (required) - Story ID to blacklist
 * - reason: string (required) - Reason for blacklisting
 * - blacklistedBy: string (optional, default: 'user') - Who blacklisted it ('user' or 'ai')
 */
router.post('/', async (req, res) => {
  try {
    const { storyId, reason, blacklistedBy = 'user' } = req.body;

    // Validate required fields
    if (!storyId) {
      logger.warn('Blacklist request missing storyId');
      return res.status(400).json({
        success: false,
        error: 'storyId is required'
      });
    }

    if (!reason) {
      logger.warn('Blacklist request missing reason', { storyId });
      return res.status(400).json({
        success: false,
        error: 'reason is required'
      });
    }

    // Validate blacklistedBy
    if (!['user', 'ai'].includes(blacklistedBy)) {
      logger.warn('Invalid blacklistedBy value', { blacklistedBy });
      return res.status(400).json({
        success: false,
        error: 'blacklistedBy must be either "user" or "ai"'
      });
    }

    logger.info('Adding story to blacklist', { storyId, reason, blacklistedBy });

    // Fetch story details
    const story = await Story.findById(storyId).lean();

    if (!story) {
      logger.warn('Story not found', { storyId });
      return res.status(404).json({
        success: false,
        error: 'Story not found'
      });
    }

    // Prepare blacklist data
    const blacklistData = {
      storyId,
      storyName: story.title || story.name || 'Unknown Story',
      reason,
      blacklistedBy,
      category: story.category || 'Uncategorized',
      spiciness: story.spiciness || 0,
      isActive: true
    };

    // Add to blacklist (upsert to handle re-blacklisting)
    const blacklistEntry = await StoryBlacklist.addToBlacklist(blacklistData);

    logger.info('Story added to blacklist successfully', {
      storyId,
      storyName: blacklistEntry.storyName,
      reason
    });

    res.status(201).json({
      success: true,
      data: blacklistEntry,
      message: 'Story added to blacklist'
    });
  } catch (error) {
    logger.error('Error adding story to blacklist', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to add story to blacklist',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/blacklist/:storyId
 * Remove a story from the blacklist (set isActive to false)
 *
 * Path params:
 * - storyId: string - Story ID to remove from blacklist
 */
router.delete('/:storyId', async (req, res) => {
  try {
    const { storyId } = req.params;

    logger.info('Removing story from blacklist', { storyId });

    const blacklistEntry = await StoryBlacklist.removeFromBlacklist(storyId);

    if (!blacklistEntry) {
      logger.warn('Blacklist entry not found', { storyId });
      return res.status(404).json({
        success: false,
        error: 'Blacklist entry not found'
      });
    }

    logger.info('Story removed from blacklist successfully', {
      storyId,
      storyName: blacklistEntry.storyName
    });

    res.json({
      success: true,
      data: blacklistEntry,
      message: 'Story removed from blacklist'
    });
  } catch (error) {
    logger.error('Error removing story from blacklist', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to remove story from blacklist',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/blacklist/:storyId
 * Update blacklist entry (e.g., change reason)
 *
 * Path params:
 * - storyId: string - Story ID to update
 *
 * Request body:
 * - reason: string (optional) - New reason
 */
router.put('/:storyId', async (req, res) => {
  try {
    const { storyId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      logger.warn('Update request missing reason', { storyId });
      return res.status(400).json({
        success: false,
        error: 'reason is required for update'
      });
    }

    logger.info('Updating blacklist entry', { storyId, reason });

    const blacklistEntry = await StoryBlacklist.findOneAndUpdate(
      { storyId, isActive: true },
      { reason },
      { new: true }
    );

    if (!blacklistEntry) {
      logger.warn('Blacklist entry not found', { storyId });
      return res.status(404).json({
        success: false,
        error: 'Blacklist entry not found'
      });
    }

    logger.info('Blacklist entry updated successfully', {
      storyId,
      storyName: blacklistEntry.storyName,
      newReason: reason
    });

    res.json({
      success: true,
      data: blacklistEntry,
      message: 'Blacklist entry updated'
    });
  } catch (error) {
    logger.error('Error updating blacklist entry', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to update blacklist entry',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/blacklist/stats/summary
 * Get blacklist statistics
 */
router.get('/stats/summary', async (req, res) => {
  try {
    logger.info('Fetching blacklist statistics');

    const totalBlacklisted = await StoryBlacklist.countDocuments({ isActive: true });
    const inactiveCount = await StoryBlacklist.countDocuments({ isActive: false });

    // Count by category
    const byCategory = await StoryBlacklist.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Count by who blacklisted
    const byBlacklister = await StoryBlacklist.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$blacklistedBy', count: { $sum: 1 } } }
    ]);

    // Count by spiciness level
    const bySpiciness = await StoryBlacklist.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$spiciness', count: { $sum: 1 } } },
      { $sort: { '_id': 1 } }
    ]);

    const stats = {
      activeBlacklisted: totalBlacklisted,
      inactiveBlacklisted: inactiveCount,
      total: totalBlacklisted + inactiveCount,
      byCategory: byCategory.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byBlacklister: byBlacklister.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      bySpiciness: bySpiciness.reduce((acc, item) => {
        acc[`level_${item._id}`] = item.count;
        return acc;
      }, {})
    };

    logger.info('Blacklist statistics fetched', stats);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching blacklist statistics', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch blacklist statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/blacklist/batch/remove
 * Batch remove stories from blacklist
 *
 * Request body:
 * - storyIds: array of strings - Story IDs to remove
 */
router.delete('/batch/remove', async (req, res) => {
  try {
    const { storyIds } = req.body;

    if (!Array.isArray(storyIds) || storyIds.length === 0) {
      logger.warn('Batch remove request missing or invalid storyIds');
      return res.status(400).json({
        success: false,
        error: 'storyIds must be a non-empty array'
      });
    }

    logger.info('Batch removing stories from blacklist', { count: storyIds.length });

    const result = await StoryBlacklist.updateMany(
      { storyId: { $in: storyIds } },
      { isActive: false }
    );

    logger.info('Batch remove completed', {
      requested: storyIds.length,
      modified: result.modifiedCount
    });

    res.json({
      success: true,
      data: {
        requested: storyIds.length,
        modified: result.modifiedCount
      },
      message: `${result.modifiedCount} stories removed from blacklist`
    });
  } catch (error) {
    logger.error('Error batch removing from blacklist', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to batch remove stories from blacklist',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
