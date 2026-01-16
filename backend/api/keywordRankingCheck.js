import express from 'express';
import keywordRankingCheckJob from '../jobs/keywordRankingCheckJob.js';
import ASOKeyword from '../models/ASOKeyword.js';

const router = express.Router();

/**
 * POST /api/keyword-ranking-check/start
 * Start the keyword ranking check scheduler
 */
router.post('/start', async (req, res) => {
  try {
    console.log('Starting keyword ranking check scheduler...');

    // Schedule the job to run daily at configured time
    const cronSchedule = keywordRankingCheckJob.checkSchedule || '0 3 * * *';

    // Register job with scheduler service
    const { default: schedulerService } = await import('../services/scheduler.js');
    schedulerService.scheduleJob(
      keywordRankingCheckJob.jobName,
      cronSchedule,
      () => keywordRankingCheckJob.execute()
    );

    res.json({
      success: true,
      message: 'Keyword ranking check scheduler started',
      schedule: cronSchedule,
      timezone: keywordRankingCheckJob.timezone
    });
  } catch (error) {
    console.error('Error starting keyword ranking check scheduler:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/keyword-ranking-check/stop
 * Stop the keyword ranking check scheduler
 */
router.post('/stop', async (req, res) => {
  try {
    console.log('Stopping keyword ranking check scheduler...');

    // Unregister job from scheduler service
    const { default: schedulerService } = await import('../services/scheduler.js');
    schedulerService.unscheduleJob(keywordRankingCheckJob.jobName);

    res.json({
      success: true,
      message: 'Keyword ranking check scheduler stopped'
    });
  } catch (error) {
    console.error('Error stopping keyword ranking check scheduler:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/keyword-ranking-check/trigger
 * Manually trigger keyword ranking check
 */
router.post('/trigger', async (req, res) => {
  try {
    console.log('Manually triggering keyword ranking check...');

    // Execute the job
    const stats = await keywordRankingCheckJob.execute();

    res.json({
      success: true,
      message: 'Keyword ranking check completed',
      data: stats
    });
  } catch (error) {
    console.error('Error triggering keyword ranking check:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/keyword-ranking-check/status
 * Get keyword ranking check status
 */
router.get('/status', async (req, res) => {
  try {
    const stats = keywordRankingCheckJob.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting keyword ranking check status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/keyword-ranking-check/stats
 * Get keyword ranking statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const rankingStats = await keywordRankingCheckJob.getRankingStats();

    res.json({
      success: true,
      data: rankingStats
    });
  } catch (error) {
    console.error('Error getting keyword ranking stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/keyword-ranking-check/config
 * Get keyword ranking check configuration
 */
router.get('/config', async (req, res) => {
  try {
    const config = {
      schedule: keywordRankingCheckJob.checkSchedule,
      timezone: keywordRankingCheckJob.timezone,
      significantChangeThreshold: keywordRankingCheckJob.significantChangeThreshold,
      environment: {
        KEYWORD_RANKING_CHECK_SCHEDULE: process.env.KEYWORD_RANKING_CHECK_SCHEDULE || '0 3 * * *',
        KEYWORD_RANKING_CHECK_TIMEZONE: process.env.KEYWORD_RANKING_CHECK_TIMEZONE || 'UTC',
        KEYWORD_RANKING_SIGNIFICANT_CHANGE: process.env.KEYWORD_RANKING_SIGNIFICANT_CHANGE || '10'
      }
    };

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error getting keyword ranking check config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/keyword-ranking-check/config
 * Update keyword ranking check configuration (requires restart)
 */
router.put('/config', async (req, res) => {
  try {
    const { schedule, timezone, significantChangeThreshold } = req.body;

    // Validate inputs
    if (schedule && !validateCronExpression(schedule)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid cron schedule format'
      });
    }

    if (timezone && !isValidTimezone(timezone)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid timezone'
      });
    }

    if (significantChangeThreshold && (isNaN(significantChangeThreshold) || significantChangeThreshold < 1 || significantChangeThreshold > 100)) {
      return res.status(400).json({
        success: false,
        error: 'significantChangeThreshold must be between 1 and 100'
      });
    }

    const updated = {
      schedule: schedule || keywordRankingCheckJob.checkSchedule,
      timezone: timezone || keywordRankingCheckJob.timezone,
      significantChangeThreshold: significantChangeThreshold || keywordRankingCheckJob.significantChangeThreshold
    };

    res.json({
      success: true,
      message: 'Configuration updated. Restart scheduler to apply changes.',
      data: updated
    });
  } catch (error) {
    console.error('Error updating keyword ranking check config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/keyword-ranking-check/keywords
 * Get all tracked keywords with rankings
 */
router.get('/keywords', async (req, res) => {
  try {
    const { target, limit } = req.query;

    const query = {};
    if (target !== undefined) {
      query.target = target === 'true';
    }

    let keywordsQuery = ASOKeyword.find(query).sort({ ranking: 1 });

    if (limit) {
      keywordsQuery = keywordsQuery.limit(parseInt(limit));
    }

    const keywords = await keywordsQuery;

    res.json({
      success: true,
      data: {
        count: keywords.length,
        keywords: keywords
      }
    });
  } catch (error) {
    console.error('Error getting keywords:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/keyword-ranking-check/keywords/:keyword/history
 * Get ranking history for a specific keyword
 */
router.get('/keywords/:keyword/history', async (req, res) => {
  try {
    const { keyword } = req.params;
    const { days } = req.query;

    const keywordDoc = await ASOKeyword.findOne({ keyword: decodeURIComponent(keyword) });

    if (!keywordDoc) {
      return res.status(404).json({
        success: false,
        error: 'Keyword not found'
      });
    }

    let history = keywordDoc.rankingHistory || [];

    // Filter by days if specified
    if (days) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
      history = history.filter(entry => entry.date >= cutoffDate);
    }

    res.json({
      success: true,
      data: {
        keyword: keywordDoc.keyword,
        currentRanking: keywordDoc.ranking,
        history: history
      }
    });
  } catch (error) {
    console.error('Error getting keyword history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Helper function to validate cron expression
 */
function validateCronExpression(expression) {
  // Basic validation: 5 parts separated by spaces
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return false;
  }

  // More sophisticated validation could be added here
  return true;
}

/**
 * Helper function to validate timezone
 */
function isValidTimezone(timezone) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export default router;
