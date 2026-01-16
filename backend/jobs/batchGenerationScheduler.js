import contentBatchingService from '../services/contentBatchingService.js';
import schedulerService from '../services/scheduler.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('batch-scheduler', 'batch-generation-scheduler');

/**
 * Batch Generation Scheduler Job
 *
 * Schedules daily content batch generation using the SchedulerService
 * - Generates 1-2 days of content in advance
 * - Creates MarketingPost drafts for review
 * - Configurable schedule time via environment variable
 */
class BatchGenerationScheduler {
  constructor() {
    this.jobName = 'daily-content-batch-generation';
    this.isScheduled = false;
  }

  /**
   * Start the scheduled batch generation job
   * Uses SchedulerService for centralized job management
   *
   * @param {object} options - Scheduling options
   * @param {string} options.scheduleTime - Time in HH:MM format (default: "06:00")
   * @param {string} options.timezone - Timezone for scheduling (default: "America/Los_Angeles")
   */
  start(options = {}) {
    if (this.isScheduled) {
      logger.warn('Batch generation scheduler already started');
      return;
    }

    try {
      // Get schedule time from environment or options
      const scheduleTime = options.scheduleTime || process.env.BATCH_GENERATION_TIME || '06:00';
      const timezone = options.timezone || process.env.BATCH_GENERATION_TIMEZONE || 'America/Los_Angeles';

      // Parse HH:MM format to create cron expression
      const [hour, minute] = scheduleTime.split(':').map(Number);

      if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        throw new Error(`Invalid schedule time format: ${scheduleTime}. Expected HH:MM format (00:00-23:59)`);
      }

      // Create cron expression: "minute hour * * *"
      const cronExpression = `${minute} ${hour} * * *`;

      logger.info('Starting batch generation scheduler', {
        jobName: this.jobName,
        scheduleTime,
        timezone,
        cronExpression
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
      logger.info('Batch generation scheduler started successfully', {
        jobName: this.jobName,
        scheduleTime,
        timezone
      });

    } catch (error) {
      logger.error('Failed to start batch generation scheduler', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Stop the scheduled batch generation job
   */
  stop() {
    if (!this.isScheduled) {
      logger.warn('Batch generation scheduler not running');
      return;
    }

    try {
      schedulerService.unschedule(this.jobName);
      this.isScheduled = false;
      logger.info('Batch generation scheduler stopped', { jobName: this.jobName });
    } catch (error) {
      logger.error('Failed to stop batch generation scheduler', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Execute the batch generation job
   * This is called by the scheduler at the scheduled time
   */
  async execute() {
    const startTime = Date.now();
    logger.info('Executing batch generation job');

    try {
      // Generate content batch
      const results = await contentBatchingService.generateBatch({
        batchSize: process.env.BATCH_SIZE || 5,
        daysAhead: process.env.DAYS_AHEAD || 2,
        platforms: ['tiktok', 'instagram', 'youtube_shorts']
      });

      const duration = Date.now() - startTime;

      if (results.success) {
        logger.info('Batch generation job completed successfully', {
          duration: `${duration}ms`,
          postsCreated: results.data?.postsCreated || 0,
          message: results.data?.message
        });

        // Return results for logging/monitoring
        return {
          success: true,
          duration,
          ...results.data
        };
      } else {
        logger.error('Batch generation job failed', {
          duration: `${duration}ms`,
          error: results.error
        });

        return {
          success: false,
          duration,
          error: results.error
        };
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Batch generation job threw error', {
        duration: `${duration}ms`,
        error: error.message,
        stack: error.stack
      });

      throw error;
    }
  }

  /**
   * Manually trigger batch generation (for testing or on-demand generation)
   *
   * @param {object} options - Batch generation options
   * @returns {object} Batch generation results
   */
  async trigger(options = {}) {
    logger.info('Manually triggering batch generation', { options });

    try {
      const results = await contentBatchingService.generateBatch({
        batchSize: options.batchSize || process.env.BATCH_SIZE || 5,
        daysAhead: options.daysAhead || process.env.DAYS_AHEAD || 2,
        platforms: options.platforms || ['tiktok', 'instagram', 'youtube_shorts']
      });

      return results;
    } catch (error) {
      logger.error('Manual batch generation failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get job status
   *
   * @returns {object} Job status information
   */
  getStatus() {
    const jobInfo = schedulerService.getJob(this.jobName);

    return {
      jobName: this.jobName,
      isScheduled: this.isScheduled,
      scheduler: schedulerService.getStatus(),
      job: jobInfo,
      scheduleTime: process.env.BATCH_GENERATION_TIME || '06:00',
      timezone: process.env.BATCH_GENERATION_TIMEZONE || 'America/Los_Angeles'
    };
  }
}

// Create singleton instance
const batchGenerationScheduler = new BatchGenerationScheduler();

export default batchGenerationScheduler;
