/**
 * Website Traffic Fetch Job
 *
 * Automatically fetches website traffic data from Google Analytics and stores it in the database.
 * Runs on a configurable schedule (default: every 6 hours).
 *
 * Feature #269: Website traffic tracking from GA
 */

import schedulerService from '../services/scheduler.js';
import websiteTrafficService from '../services/websiteTrafficService.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('website-traffic-fetch', 'website-traffic-fetch');

/**
 * Website Traffic Fetch Job Class
 */
class WebsiteTrafficFetchJob {
  constructor() {
    this.jobName = 'website-traffic-fetch';
    this.isScheduled = false;
  }

  /**
   * Start the scheduled traffic fetch job
   *
   * @param {object} options - Scheduling options
   * @param {string} options.cronExpression - Custom cron expression (optional)
   * @param {number} options.intervalHours - Interval in hours (default: 6)
   * @param {boolean} options.runImmediately - Run immediately on start (default: false)
   */
  start(options = {}) {
    if (this.isScheduled) {
      logger.warn('Website traffic fetch job already started');
      return;
    }

    try {
      // Use custom cron expression or default to every 6 hours
      const cronExpression = options.cronExpression || process.env.WEBSITE_TRAFFIC_FETCH_CRON || '0 */6 * * *';
      const timezone = options.timezone || process.env.WEBSITE_TRAFFIC_FETCH_TIMEZONE || 'UTC';

      logger.info('Starting website traffic fetch scheduler', {
        jobName: this.jobName,
        cronExpression,
        timezone
      });

      // Start the scheduler service if not already running
      if (schedulerService.getStatus().status !== 'running') {
        schedulerService.start();
        logger.info('Scheduler service started');
      }

      // Schedule the job using SchedulerService
      schedulerService.schedule(
        this.jobName,
        cronExpression,
        async () => await this.execute(),
        {
          timezone,
          immediate: options.runImmediately || false
        }
      );

      this.isScheduled = true;
      logger.info('Website traffic fetch scheduler started successfully', {
        jobName: this.jobName,
        cronExpression,
        timezone
      });

    } catch (error) {
      logger.error('Failed to start website traffic fetch scheduler', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Stop the scheduled traffic fetch job
   */
  stop() {
    if (!this.isScheduled) {
      logger.warn('Website traffic fetch job not running');
      return;
    }

    try {
      schedulerService.unschedule(this.jobName);
      this.isScheduled = false;
      logger.info('Website traffic fetch scheduler stopped');
    } catch (error) {
      logger.error('Failed to stop website traffic fetch scheduler', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Execute the traffic fetch job
   * Fetches data for the last 7 days and stores in database
   */
  async execute() {
    const startTime = Date.now();

    try {
      logger.info('Starting website traffic fetch job execution');

      // Check if service is enabled
      const health = await websiteTrafficService.healthCheck();
      if (!health.enabled) {
        logger.warn('Website traffic service is not enabled, skipping fetch');
        return {
          success: false,
          skipped: true,
          reason: 'Google Analytics not configured'
        };
      }

      // Fetch traffic data for the last 7 days
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const result = await websiteTrafficService.fetchAndStoreTrafficData(sevenDaysAgo, today);

      const duration = Date.now() - startTime;
      logger.info('Website traffic fetch job completed successfully', {
        duration: `${duration}ms`,
        metricsStored: result.storedMetrics,
        dateRange: result.dateRange,
        summary: result.summary
      });

      return {
        success: true,
        duration: `${duration}ms`,
        metricsStored: result.storedMetrics,
        dateRange: result.dateRange,
        summary: result.summary
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Website traffic fetch job failed', {
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`
      });

      return {
        success: false,
        error: error.message,
        duration: `${duration}ms`
      };
    }
  }

  /**
   * Get job status
   */
  getStatus() {
    return {
      jobName: this.jobName,
      isScheduled: this.isScheduled,
      schedulerStatus: schedulerService.getStatus()
    };
  }

  /**
   * Manually trigger the job (for testing or on-demand fetch)
   */
  async trigger() {
    logger.info('Manually triggering website traffic fetch job');
    return await this.execute();
  }
}

// Create singleton instance
const websiteTrafficFetchJob = new WebsiteTrafficFetchJob();

export default websiteTrafficFetchJob;
