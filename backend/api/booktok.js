/**
 * BookTok API Router
 *
 * REST API endpoints for BookTok trend analysis and content optimization.
 * All endpoints support CORS and proper error handling.
 */

import express from 'express';
import { getLogger } from '../utils/logger.js';

// Import BookTok services (cost-controlled implementation)
import {
  gopherDataService,
  googleBooksService,
  nyTimesBestsellerService,
  engagementVelocityTracker,
  frequencySpikeDetector,
  engagementOutlierDetector,
  hashtagComboAnalyzer,
  hookStructureAnalyzer,
  contentScorerService,
  topicRecommenderService,
  alertSystemService
} from '../services/bookTok/index.js';

// Import models
import MarketingBook from '../models/MarketingBook.js';
import MarketingBookTrendMetrics from '../models/MarketingBookTrendMetrics.js';
import MarketingHookPattern from '../models/MarketingHookPattern.js';
import MarketingHashtagPerformance from '../models/MarketingHashtagPerformance.js';
import MarketingViralPattern from '../models/MarketingViralPattern.js';
import MarketingContentScore from '../models/MarketingContentScore.js';
import MarketingTrendAlert from '../models/MarketingTrendAlert.js';
import MarketingTopicRecommendation from '../models/MarketingTopicRecommendation.js';

const logger = getLogger('api', 'booktok');
const router = express.Router();

/**
 * GET /api/booktok/trends
 * Get current trending books, topics, tropes, hooks, and hashtags
 *
 * Returns trends from MarketingBookTrendMetrics collection if available,
 * otherwise derives trends from MarketingBook collection as fallback.
 */
router.get('/trends', async (req, res) => {
  try {
    const {
      platform = 'all',
      timeWindow = '24h',
      category = 'all',
      limit = 20
    } = req.query;

    const cutoffDate = getDateFromWindow(timeWindow);

    let matchQuery = { timestamp: { $gte: cutoffDate } };
    if (platform !== 'all') {
      matchQuery.platform = platform;
    }

    let entityTypeFilter = [];
    if (category === 'books') entityTypeFilter = ['book'];
    else if (category === 'topics') entityTypeFilter = ['topic'];
    else if (category === 'tropes') entityTypeFilter = ['trope'];
    else if (category === 'hooks') entityTypeFilter = ['hook'];
    else if (category === 'hashtags') entityTypeFilter = ['hashtag'];

    if (entityTypeFilter.length > 0) {
      matchQuery.entityType = { $in: entityTypeFilter };
    }

    // Try to get trends from the metrics collection
    let trends = await MarketingBookTrendMetrics
      .find(matchQuery)
      .sort({ trendVelocity: -1, mentionCount: -1 })
      .limit(parseInt(limit))
      .lean();

    // Fallback: Derive trends from MarketingBook collection if metrics are empty
    if (trends.length === 0) {
      logger.info('No trend metrics found, deriving trends from MarketingBook collection');

      const books = await MarketingBook
        .find({ active: true })
        .sort({ currentTrendScore: -1 })
        .limit(parseInt(limit))
        .lean();

      // Convert books to trend format
      trends = books.map(book => ({
        entityType: 'book',
        name: book.title,
        mentionCount: Math.floor(book.currentTrendScore || 0),
        trendVelocity: book.currentTrendScore > 75 ? 15 : book.currentTrendScore > 50 ? 5 : -5,
        trendDirection: book.currentTrendScore > 75 ? 'rising' : book.currentTrendScore > 50 ? 'stable' : 'falling',
        avgEngagementRate: book.popularityScore || 50,
        bookAuthor: book.author,
        bookGenre: book.genre,
        bookSpiceLevel: book.spiceLevel
      }));

      // Add trope trends from the books
      const tropeCounts = {};
      for (const book of books) {
        for (const trope of (book.tropes || [])) {
          tropeCounts[trope] = (tropeCounts[trope] || 0) + 1;
        }
      }

      const tropeLimit = Math.min(10, parseInt(limit));
      for (const [trope, count] of Object.entries(tropeCounts).slice(0, tropeLimit)) {
        trends.push({
          entityType: 'trope',
          name: trope.replace(/_/g, ' '),
          mentionCount: count * 10,
          trendVelocity: count > 2 ? 20 : 5,
          trendDirection: count > 2 ? 'rising' : 'stable',
          avgEngagementRate: 60
        });
      }

      // Add some hashtag trends
      trends.push(
        {
          entityType: 'hashtag',
          name: 'booktok',
          mentionCount: 1000,
          trendVelocity: 25,
          trendDirection: 'rising',
          avgEngagementRate: 75
        },
        {
          entityType: 'hashtag',
          name: 'romancebooks',
          mentionCount: 850,
          trendVelocity: 20,
          trendDirection: 'rising',
          avgEngagementRate: 70
        },
        {
          entityType: 'hashtag',
          name: 'spicybooks',
          mentionCount: 650,
          trendVelocity: 15,
          trendDirection: 'rising',
          avgEngagementRate: 68
        }
      );
    }

    res.json({
      success: true,
      data: {
        platform,
        timeWindow,
        category,
        trends: trends.map(t => ({
          entityType: t.entityType,
          name: t.name,
          mentionCount: t.mentionCount,
          trendVelocity: t.trendVelocity,
          trendDirection: t.trendDirection,
          avgEngagementRate: t.avgEngagementRate
        }))
      }
    });

  } catch (error) {
    logger.error('Error in GET /api/booktok/trends', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/booktok/trends/rising
 * Get rising trends
 */
router.get('/trends/rising', async (req, res) => {
  try {
    const {
      platform = 'all',
      entityType,
      limit = 20
    } = req.query;

    const rising = await MarketingBookTrendMetrics.getRisingTrends({
      platform,
      entityType,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: rising
    });

  } catch (error) {
    logger.error('Error in GET /api/booktok/trends/rising', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/booktok/trends/declining
 * Get declining trends
 */
router.get('/trends/declining', async (req, res) => {
  try {
    const {
      platform = 'all',
      entityType,
      limit = 20
    } = req.query;

    const declining = await MarketingBookTrendMetrics.getDecliningTrends({
      platform,
      entityType,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: declining
    });

  } catch (error) {
    logger.error('Error in GET /api/booktok/trends/declining', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/booktok/books
 * Get books with optional filters
 */
router.get('/books', async (req, res) => {
  try {
    const {
      search,
      trope,
      spiceLevel,
      genre,
      minTrendScore,
      limit = 20
    } = req.query;

    const query = { active: true };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } }
      ];
    }

    if (trope) {
      query.tropes = trope;
    }

    if (spiceLevel !== undefined) {
      query.spiceLevel = parseInt(spiceLevel);
    }

    if (genre) {
      query.genre = { $regex: genre, $options: 'i' };
    }

    if (minTrendScore) {
      query.currentTrendScore = { $gte: parseInt(minTrendScore) };
    }

    const books = await MarketingBook
      .find(query)
      .sort({ currentTrendScore: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: books
    });

  } catch (error) {
    logger.error('Error in GET /api/booktok/books', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/booktok/books/:id
 * Get specific book details
 */
router.get('/books/:id', async (req, res) => {
  try {
    const book = await MarketingBook.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        error: 'Book not found'
      });
    }

    res.json({
      success: true,
      data: book
    });

  } catch (error) {
    logger.error('Error in GET /api/booktok/books/:id', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/booktok/hooks
 * Get hook patterns
 */
router.get('/hooks', async (req, res) => {
  try {
    const {
      category,
      platform,
      minEngagementRate,
      limit = 20
    } = req.query;

    const query = { active: true };

    if (category) {
      query.category = category;
    }

    if (platform) {
      query['worksBestFor.platforms'] = platform;
    }

    if (minEngagementRate) {
      query.avgEngagementRate = { $gte: parseFloat(minEngagementRate) };
    }

    const hooks = await MarketingHookPattern
      .find(query)
      .sort({ avgEngagementRate: -1, sampleSize: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: hooks
    });

  } catch (error) {
    logger.error('Error in GET /api/booktok/hooks', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/booktok/hashtags
 * Get hashtag performance data
 */
router.get('/hashtags', async (req, res) => {
  try {
    const {
      platform,
      category,
      trending,
      limit = 20
    } = req.query;

    const query = { active: true };

    if (platform) {
      query.platform = platform;
    }

    if (category) {
      query.category = category;
    }

    if (trending === 'true') {
      query.trendDirection = 'rising';
    }

    const hashtags = await MarketingHashtagPerformance
      .find(query)
      .sort({ engagementRate: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: hashtags
    });

  } catch (error) {
    logger.error('Error in GET /api/booktok/hashtags', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/booktok/content/score
 * Score content draft
 */
router.post('/content/score', async (req, res) => {
  try {
    const result = await contentScorerService.scoreContent(req.body);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error in POST /api/booktok/content/score', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/booktok/content/score/:id
 * Get saved content score
 */
router.get('/content/score/:id', async (req, res) => {
  try {
    const score = await MarketingContentScore
      .findById(req.params.id)
      .populate('postId')
      .lean();

    if (!score) {
      return res.status(404).json({
        success: false,
        error: 'Score not found'
      });
    }

    res.json({
      success: true,
      data: score
    });

  } catch (error) {
    logger.error('Error in GET /api/booktok/content/score/:id', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/booktok/content/score/:id/actual
 * Record actual results for a score
 */
router.post('/content/score/:id/actual', async (req, res) => {
  try {
    const result = await contentScorerService.recordContentAccuracy(
      req.params.id,
      req.body
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Score not found'
      });
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error in POST /api/booktok/content/score/:id/actual', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/booktok/recommendations/topics
 * Get topic recommendations
 */
router.get('/recommendations/topics', async (req, res) => {
  try {
    const {
      date,
      limit = 15,
      minPriorityScore = 40
    } = req.query;

    const recommendations = await topicRecommenderService.getTopicRecommendations({
      date: date ? new Date(date) : new Date(),
      limit: parseInt(limit),
      minPriorityScore: parseInt(minPriorityScore)
    });

    res.json({
      success: true,
      data: recommendations
    });

  } catch (error) {
    logger.error('Error in GET /api/booktok/recommendations/topics', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/booktok/recommendations/:id/accept
 * Accept a topic recommendation
 */
router.post('/recommendations/:id/accept', async (req, res) => {
  try {
    const result = await topicRecommenderService.acceptRecommendation(
      req.params.id,
      req.body.userId || 'system'
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Recommendation not found'
      });
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error in POST /api/booktok/recommendations/:id/accept', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/booktok/alerts
 * Get trend alerts
 */
router.get('/alerts', async (req, res) => {
  try {
    const {
      alertType,
      acknowledged,
      severity,
      limit = 20
    } = req.query;

    const alerts = await alertSystemService.getActiveAlerts({
      alertType,
      acknowledged: acknowledged === 'true',
      severity,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: alerts
    });

  } catch (error) {
    logger.error('Error in GET /api/booktok/alerts', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/booktok/alerts/:id/acknowledge
 * Acknowledge an alert
 */
router.post('/alerts/:id/acknowledge', async (req, res) => {
  try {
    const result = await alertSystemService.acknowledgeAlert(
      req.params.id,
      req.body.userId || 'system'
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error in POST /api/booktok/alerts/:id/acknowledge', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/booktok/alerts/summary
 * Get alert summary
 */
router.get('/alerts/summary', async (req, res) => {
  try {
    const summary = await alertSystemService.getAlertSummary();

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    logger.error('Error in GET /api/booktok/alerts/summary', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/booktok/stats/overview
 * Get overview statistics
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const { timeWindow = '7d' } = req.query;

    // Get various stats
    const [bookCount, hookCount, hashtagCount, alertCount] = await Promise.all([
      MarketingBook.countDocuments({ active: true }),
      MarketingHookPattern.countDocuments({ active: true }),
      MarketingHashtagPerformance.countDocuments({ active: true }),
      MarketingTrendAlert.countDocuments({ acknowledged: false })
    ]);

    // Get recent trend summary
    const trendSummary = await MarketingBookTrendMetrics.getSummary({
      excludeAcknowledged: true,
      hours: timeWindow === '24h' ? 24 : timeWindow === '7d' ? 168 : 24
    });

    res.json({
      success: true,
      data: {
        booksTracked: bookCount,
        hooksAvailable: hookCount,
        hashtagsTracked: hashtagCount,
        activeAlerts: alertCount,
        trendSummary
      }
    });

  } catch (error) {
    logger.error('Error in GET /api/booktok/stats/overview', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Helper function to convert time window string to Date
 */
function getDateFromWindow(timeWindow) {
  const now = new Date();
  const value = parseInt(timeWindow);
  const unit = timeWindow.replace(/[0-9]/g, '');

  switch (unit) {
    case 'h':
      now.setHours(now.getHours() - value);
      break;
    case 'd':
      now.setDate(now.getDate() - value);
      break;
    default:
      now.setHours(now.getHours() - 24);
  }

  return now;
}

/**
 * GET /api/booktok/usage
 * Get API usage statistics (cost monitoring)
 */
router.get('/usage', async (req, res) => {
  try {
    // Dynamic import to avoid circular dependencies
    const bookTokDataCollectionJob = (await import('../jobs/bookTokDataCollectionJob.js')).default;

    const usage = bookTokDataCollectionJob.getApiUsageSummary();

    res.json({
      success: true,
      data: usage
    });

  } catch (error) {
    logger.error('Error in GET /api/booktok/usage', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/booktok/status
 * Get BookTok data collection job status
 */
router.get('/status', async (req, res) => {
  try {
    // Dynamic import to avoid circular dependencies
    const bookTokDataCollectionJob = (await import('../jobs/bookTokDataCollectionJob.js')).default;

    const status = bookTokDataCollectionJob.getStatus();

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Error in GET /api/booktok/status', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/booktok/replay/logs
 * Get list of available Gopher API replay logs
 * Query params: endpoint, limit, sortBy, sortOrder
 */
router.get('/replay/logs', async (req, res) => {
  try {
    const {
      endpoint,
      limit = 50,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = req.query;

    // Dynamic import to avoid circular dependencies
    const gopherDataService = (await import('../services/bookTok/gopherDataService.js')).default;

    const logs = gopherDataService.getAvailableReplays({
      endpoint,
      limit: parseInt(limit),
      sortBy,
      sortOrder
    });

    res.json({
      success: true,
      data: logs
    });

  } catch (error) {
    logger.error('Error in GET /api/booktok/replay/logs', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/booktok/replay/logs/:filename
 * Get a specific replay log entry
 */
router.get('/replay/logs/:filename', async (req, res) => {
  try {
    const { filename } = req.params;

    // Dynamic import to avoid circular dependencies
    const gopherDataService = (await import('../services/bookTok/gopherDataService.js')).default;

    const logEntry = gopherDataService.getReplayLog(filename);

    if (!logEntry) {
      return res.status(404).json({
        success: false,
        error: 'Log file not found'
      });
    }

    res.json({
      success: true,
      data: logEntry
    });

  } catch (error) {
    logger.error('Error in GET /api/booktok/replay/logs/:filename', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/booktok/replay/run/:filename
 * Run data collection using a replay log (no API call)
 */
router.post('/replay/run/:filename', async (req, res) => {
  try {
    const { filename } = req.params;

    // Dynamic import to avoid circular dependencies
    const gopherDataService = (await import('../services/bookTok/gopherDataService.js')).default;

    const result = await gopherDataService.replayFromLog(filename);

    res.json({
      success: result.success,
      data: result
    });

  } catch (error) {
    logger.error('Error in POST /api/booktok/replay/run/:filename', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/booktok/replay/status
 * Get replay manager status
 */
router.get('/replay/status', async (req, res) => {
  try {
    // Dynamic import to avoid circular dependencies
    const gopherDataService = (await import('../services/bookTok/gopherDataService.js')).default;

    const status = gopherDataService.getReplayStatus();

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Error in GET /api/booktok/replay/status', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/booktok/replay/logs/:filename
 * Delete a specific replay log file
 */
router.delete('/replay/logs/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const fs = await import('fs');
    const path = await import('path');

    const logDir = path.resolve(process.cwd(), '../storage/gopher-logs');
    const filePath = path.join(logDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Log file not found'
      });
    }

    fs.unlinkSync(filePath);

    logger.info(`Deleted replay log: ${filename}`);

    res.json({
      success: true,
      message: 'Log file deleted'
    });

  } catch (error) {
    logger.error('Error deleting replay log', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/booktok/replay/cleanup
 * Clean up old replay logs
 * Body: { daysToKeep: number }
 */
router.post('/replay/cleanup', async (req, res) => {
  try {
    const { daysToKeep = 30 } = req.body;

    // Dynamic import to avoid circular dependencies
    const gopherReplayManager = (await import('../services/bookTok/gopherReplayManager.js')).default;

    const deletedCount = gopherReplayManager.cleanupOldLogs(parseInt(daysToKeep));

    res.json({
      success: true,
      data: {
        deletedCount,
        daysToKeep
      }
    });

  } catch (error) {
    logger.error('Error in POST /api/booktok/replay/cleanup', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/booktok/test/trigger
 * Manually trigger a data collection job for testing
 * ⚠️ WARNING: This uses real API quota!
 * Body: { job: 'gopher' | 'googleBooks' | 'nytimes' | 'all', reason: string }
 */
router.post('/test/trigger', async (req, res) => {
  try {
    const { job = 'gopher', reason = 'testing' } = req.body;

    // Dynamic import to avoid circular dependencies
    const bookTokDataCollectionJob = (await import('../jobs/bookTokDataCollectionJob.js')).default;

    logger.warn(`🧪 MANUAL TEST TRIGGER - Job: ${job}, Reason: ${reason}`);

    // Run in background
    bookTokDataCollectionJob.triggerJob(job, reason).catch(error => {
      logger.error('Test trigger failed', { error: error.message });
    });

    res.json({
      success: true,
      message: `Job '${job}' triggered in background`,
      job,
      reason,
      note: 'Check /api/booktok/status for results'
    });

  } catch (error) {
    logger.error('Error in POST /api/booktok/test/trigger', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/booktok/test/trigger-with-wait
 * Manually trigger a job and wait for results
 * ⚠️ WARNING: This uses real API quota!
 * Body: { job: 'gopher' | 'googleBooks' | 'nytimes' | 'all', reason: string }
 */
router.post('/test/trigger-with-wait', async (req, res) => {
  try {
    const { job = 'gopher', reason = 'testing' } = req.body;

    // Dynamic import to avoid circular dependencies
    const bookTokDataCollectionJob = (await import('../jobs/bookTokDataCollectionJob.js')).default;

    logger.warn(`🧪 MANUAL TEST TRIGGER (SYNC) - Job: ${job}, Reason: ${reason}`);

    // Run synchronously and return results
    const statusBefore = bookTokDataCollectionJob.getStatus();

    await bookTokDataCollectionJob.triggerJob(job, reason);

    // Wait a bit for results to process
    await new Promise(resolve => setTimeout(resolve, 3000));

    const statusAfter = bookTokDataCollectionJob.getStatus();

    res.json({
      success: true,
      message: `Job '${job}' completed`,
      job,
      reason,
      statusBefore,
      statusAfter
    });

  } catch (error) {
    logger.error('Error in POST /api/booktok/test/trigger-with-wait', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/booktok/test/gopher/sync
 * Test Gopher API connection directly
 * ⚠️ WARNING: This uses real API quota!
 * Body: { hashtag: string, maxItems: number }
 */
router.post('/test/gopher/sync', async (req, res) => {
  try {
    const { hashtag = '#booktok', maxItems = 5 } = req.body;

    // Dynamic import to avoid circular dependencies
    const gopherDataService = (await import('../services/bookTok/gopherDataService.js')).default;

    logger.warn(`🧪 DIRECT GOPHER API TEST - Hashtag: ${hashtag}, MaxItems: ${maxItems}`);

    // Make a direct API call
    const posts = await gopherDataService.fetchTikTokByHashtag(hashtag, parseInt(maxItems), '7');

    res.json({
      success: true,
      message: `Fetched ${posts.length} posts from Gopher API`,
      data: {
        hashtag,
        maxItems,
        postsCollected: posts.length,
        samplePosts: posts.slice(0, 2) // Return first 2 posts as sample
      }
    });

  } catch (error) {
    logger.error('Error in POST /api/booktok/test/gopher/sync', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack
    });
  }
});

/**
 * POST /api/booktok/test/gopher/trending
 * Test Gopher trending API (faster than hashtag search)
 * ⚠️ WARNING: This uses real API quota!
 * Body: { maxItems: number }
 */
router.post('/test/gopher/trending', async (req, res) => {
  try {
    const { maxItems = 5 } = req.body;

    // Dynamic import to avoid circular dependencies
    const gopherDataService = (await import('../services/bookTok/gopherDataService.js')).default;

    logger.warn(`🧪 DIRECT GOPHER TRENDING TEST - MaxItems: ${maxItems}`);

    // Fetch trending posts
    const posts = await gopherDataService.fetchTikTokTrending(parseInt(maxItems));

    res.json({
      success: true,
      message: `Fetched ${posts.length} trending posts from Gopher API`,
      data: {
        maxItems,
        postsCollected: posts.length,
        posts // Return all posts as sample
      }
    });

  } catch (error) {
    logger.error('Error in POST /api/booktok/test/gopher/trending', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack
    });
  }
});

/**
 * POST /api/booktok/test/google-books/sync
 * Test Google Books API connection directly
 * Body: { query: string, maxResults: number }
 */
router.post('/test/google-books/sync', async (req, res) => {
  try {
    const { query = 'romance books', maxResults = 5 } = req.body;

    // Dynamic import to avoid circular dependencies
    const googleBooksService = (await import('../services/bookTok/googleBooksService.js')).default;

    logger.info(`🧪 GOOGLE BOOKS API TEST - Query: ${query}, MaxResults: ${maxResults}`);

    // Make a direct API call
    const books = await googleBooksService.searchBooks(query, {
      maxResults: parseInt(maxResults)
    });

    res.json({
      success: true,
      message: `Fetched ${books.length} books from Google Books API`,
      data: {
        query,
        maxResults,
        booksCollected: books.length,
        sampleBooks: books.slice(0, 2).map(b => ({
          title: b.title,
          author: b.author,
          averageRating: b.averageRating
        }))
      }
    });

  } catch (error) {
    logger.error('Error in POST /api/booktok/test/google-books/sync', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack
    });
  }
});

/**
 * POST /api/booktok/test/nytimes/sync
 * Test NYTimes + Google Books romance bestseller fetch
 * This tests the full flow: fetch from NYTimes, lookup on Google Books, filter for romance
 * Body: { list?: string, date?: string, storeResults?: boolean }
 */
router.post('/test/nytimes/sync', async (req, res) => {
  try {
    const { list, date = 'current', storeResults = false } = req.body;

    // Dynamic import to avoid circular dependencies
    const nyTimesBestsellerService = (await import('../services/bookTok/bestsellerApiService.js')).default;

    logger.info(`🧪 NYTIMES + GOOGLE BOOKS TEST - Fetching romance bestsellers`);

    // Test the new romance bestseller fetch
    const result = await nyTimesBestsellerService.fetchRomanceBestsellers({
      date,
      storeResults
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.reason || result.error,
        message: 'Failed to fetch romance bestsellers'
      });
    }

    // Build subgenre summary
    const subgenreSummary = {};
    for (const [subgenre, books] of Object.entries(result.subgenreBreakdown || {})) {
      subgenreSummary[subgenre] = books.length;
    }

    res.json({
      success: true,
      message: `Found ${result.totalRomanceBooks} romance bestsellers across ${Object.keys(result.listResults || {}).length} NYTimes lists`,
      data: {
        totalRomanceBooks: result.totalRomanceBooks,
        listResults: result.listResults,
        subgenreSummary,
        subgenres: result.subgenres,
        duration: result.duration,
        sampleBooks: (result.romanceBooks || []).slice(0, 5).map(b => ({
          title: b.title,
          author: b.author,
          rank: b.rank,
          sourceList: b.sourceList,
          subgenre: b.subgenre
        }))
      }
    });

  } catch (error) {
    logger.error('Error in POST /api/booktok/test/nytimes/sync', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack
    });
  }
});

export default router;
