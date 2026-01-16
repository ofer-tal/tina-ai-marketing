import express from 'express';
import abTestDurationMonitor from '../jobs/abTestDurationMonitor.js';
import { getLogger } from '../utils/logger.js';

const router = express.Router();
const logger = getLogger('ab-test-duration-monitor-api', 'api');

/**
 * POST /api/ab-test-monitor/start
 * Start the A/B test duration monitor scheduler
 */
router.post('/start', async (req, res) => {
  try {
    logger.info('Starting A/B test duration monitor scheduler');

    abTestDurationMonitor.start();

    res.json({
      success: true,
      message: 'A/B test duration monitor scheduler started',
      schedule: abTestDurationMonitor.checkSchedule,
      timezone: abTestDurationMonitor.timezone
    });

  } catch (error) {
    logger.error('Error starting A/B test duration monitor scheduler', {
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
 * POST /api/ab-test-monitor/stop
 * Stop the A/B test duration monitor scheduler
 */
router.post('/stop', async (req, res) => {
  try {
    logger.info('Stopping A/B test duration monitor scheduler');

    abTestDurationMonitor.stop();

    res.json({
      success: true,
      message: 'A/B test duration monitor scheduler stopped'
    });

  } catch (error) {
    logger.error('Error stopping A/B test duration monitor scheduler', {
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
 * POST /api/ab-test-monitor/trigger
 * Manually trigger the A/B test duration monitor job
 */
router.post('/trigger', async (req, res) => {
  try {
    logger.info('Manually triggering A/B test duration monitor job');

    const result = await abTestDurationMonitor.execute();

    res.json({
      success: true,
      message: 'A/B test duration monitor job executed',
      result: result
    });

  } catch (error) {
    logger.error('Error triggering A/B test duration monitor job', {
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
 * GET /api/ab-test-monitor/status
 * Get the current status of the A/B test duration monitor
 */
router.get('/status', async (req, res) => {
  try {
    const stats = await abTestDurationMonitor.getMonitoringStats();

    res.json({
      success: true,
      status: stats
    });

  } catch (error) {
    logger.error('Error getting A/B test duration monitor status', {
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
 * GET /api/ab-test-monitor/config
 * Get the current configuration
 */
router.get('/config', async (req, res) => {
  try {
    const config = {
      schedule: abTestDurationMonitor.checkSchedule,
      timezone: abTestDurationMonitor.timezone,
      minSampleSize: abTestDurationMonitor.minSampleSize,
      significanceThreshold: abTestDurationMonitor.significanceThreshold
    };

    res.json({
      success: true,
      config: config
    });

  } catch (error) {
    logger.error('Error getting A/B test duration monitor config', {
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
 * PUT /api/ab-test-monitor/config
 * Update the configuration (requires restart to take effect)
 */
router.put('/config', async (req, res) => {
  try {
    const { schedule, timezone, minSampleSize, significanceThreshold } = req.body;

    if (schedule) {
      abTestDurationMonitor.checkSchedule = schedule;
    }
    if (timezone) {
      abTestDurationMonitor.timezone = timezone;
    }
    if (minSampleSize !== undefined) {
      abTestDurationMonitor.minSampleSize = parseInt(minSampleSize);
    }
    if (significanceThreshold !== undefined) {
      abTestDurationMonitor.significanceThreshold = parseFloat(significanceThreshold);
    }

    // Restart scheduler to apply new schedule
    abTestDurationMonitor.stop();
    abTestDurationMonitor.start();

    const config = {
      schedule: abTestDurationMonitor.checkSchedule,
      timezone: abTestDurationMonitor.timezone,
      minSampleSize: abTestDurationMonitor.minSampleSize,
      significanceThreshold: abTestDurationMonitor.significanceThreshold
    };

    logger.info('A/B test duration monitor configuration updated', config);

    res.json({
      success: true,
      message: 'Configuration updated and scheduler restarted',
      config: config
    });

  } catch (error) {
    logger.error('Error updating A/B test duration monitor config', {
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
 * GET /api/ab-test-monitor/tests
 * Get all A/B tests with their monitoring status
 */
router.get('/tests', async (req, res) => {
  try {
    const ASOExperiment = (await import('../models/ASOExperiment.js')).default;

    const tests = await ASOExperiment.find()
      .sort({ startDate: -1 })
      .lean();

    // Add monitoring status to each test
    const testsWithStatus = tests.map(test => ({
      ...test,
      monitoring: {
        hasDurationElapsed: abTestDurationMonitor.hasTestDurationElapsed(test),
        completionPercentage: abTestDurationMonitor.calculateCompletionPercentage(test),
        hasSufficientData: abTestDurationMonitor.hasSufficientData(test)
      }
    }));

    res.json({
      success: true,
      tests: testsWithStatus,
      count: testsWithStatus.length
    });

  } catch (error) {
    logger.error('Error getting A/B tests', {
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
 * GET /api/ab-test-monitor/tests/:testId
 * Get a specific A/B test with detailed monitoring status
 */
router.get('/tests/:testId', async (req, res) => {
  try {
    const { testId } = req.params;

    const ASOExperiment = (await import('../models/ASOExperiment.js')).default;

    const test = await ASOExperiment.findById(testId).lean();

    if (!test) {
      return res.status(404).json({
        success: false,
        error: 'Test not found'
      });
    }

    // Add detailed monitoring status
    const testWithStatus = {
      ...test,
      monitoring: {
        hasDurationElapsed: abTestDurationMonitor.hasTestDurationElapsed(test),
        completionPercentage: abTestDurationMonitor.calculateCompletionPercentage(test),
        hasSufficientData: abTestDurationMonitor.hasSufficientData(test),
        endDate: abTestDurationMonitor.calculateEndDate(test),
        isComplete: abTestDurationMonitor.hasTestDurationElapsed(test) && abTestDurationMonitor.hasSufficientData(test)
      }
    };

    res.json({
      success: true,
      test: testWithStatus
    });

  } catch (error) {
    logger.error('Error getting A/B test details', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
