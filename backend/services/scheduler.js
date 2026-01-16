import cron from 'node-cron';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('scheduler', 'scheduler-service');

/**
 * Background Job Scheduler Service
 *
 * Manages scheduled tasks using node-cron
 * - Jobs can be scheduled with cron expressions
 * - Jobs can be started, stopped, and monitored
 * - Multiple jobs can run concurrently
 * - All job executions are logged
 */
class SchedulerService {
  constructor() {
    this.jobs = new Map(); // Store jobs by name
    this.status = 'stopped';
  }

  /**
   * Start the scheduler service
   */
  start() {
    if (this.status === 'running') {
      logger.warn('Scheduler is already running');
      return;
    }

    this.status = 'running';
    logger.info('Scheduler service started');
  }

  /**
   * Stop the scheduler service
   * Stops all scheduled jobs
   */
  stop() {
    if (this.status === 'stopped') {
      logger.warn('Scheduler is already stopped');
      return;
    }

    // Stop all jobs
    for (const [name, job] of this.jobs.entries()) {
      if (job.task) {
        job.task.stop();
        logger.info(`Stopped job: ${name}`);
      }
    }

    this.jobs.clear();
    this.status = 'stopped';
    logger.info('Scheduler service stopped');
  }

  /**
   * Schedule a new job
   *
   * @param {string} name - Unique name for the job
   * @param {string} cronExpression - Cron expression (e.g., '0 * * * *')
   * @param {Function} task - Function to execute
   * @param {Object} options - Job options
   * @param {boolean} options.immediate - Run immediately on scheduling
   * @param {string} options.timezone - Timezone for the job
   */
  schedule(name, cronExpression, task, options = {}) {
    if (this.jobs.has(name)) {
      throw new Error(`Job with name "${name}" already exists`);
    }

    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    // Wrap task with logging
    const wrappedTask = async () => {
      const startTime = Date.now();
      logger.info(`Executing job: ${name}`);

      try {
        await task();
        const duration = Date.now() - startTime;
        logger.info(`Job completed: ${name} (${duration}ms)`);

        // Update job stats
        const job = this.jobs.get(name);
        if (job) {
          job.stats.lastRun = new Date();
          job.stats.runCount++;
          job.stats.lastDuration = duration;
          job.stats.successCount++;
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`Job failed: ${name} (${duration}ms)`, { error: error.message });

        // Update job stats
        const job = this.jobs.get(name);
        if (job) {
          job.stats.lastRun = new Date();
          job.stats.runCount++;
          job.stats.lastDuration = duration;
          job.stats.errorCount++;
          job.stats.lastError = error.message;
        }
      }
    };

    // Create the cron job
    const cronTask = cron.schedule(cronExpression, wrappedTask, {
      scheduled: false, // Don't start until we call start()
      timezone: options.timezone || 'UTC'
    });

    // Store job info
    this.jobs.set(name, {
      name,
      cronExpression,
      task: cronTask,
      taskFn: wrappedTask,
      scheduled: false,
      stats: {
        runCount: 0,
        successCount: 0,
        errorCount: 0,
        lastRun: null,
        lastDuration: null,
        lastError: null
      },
      createdAt: new Date()
    });

    logger.info(`Job scheduled: ${name} (${cronExpression})`);

    // Start the job if scheduler is running
    if (this.status === 'running') {
      this.startJob(name);
    }

    // Run immediately if requested
    if (options.immediate) {
      wrappedTask();
    }

    return this;
  }

  /**
   * Start a specific job
   *
   * @param {string} name - Job name
   */
  startJob(name) {
    const job = this.jobs.get(name);
    if (!job) {
      throw new Error(`Job not found: ${name}`);
    }

    if (job.scheduled) {
      logger.warn(`Job is already running: ${name}`);
      return;
    }

    job.task.start();
    job.scheduled = true;
    logger.info(`Job started: ${name}`);
  }

  /**
   * Stop a specific job
   *
   * @param {string} name - Job name
   */
  stopJob(name) {
    const job = this.jobs.get(name);
    if (!job) {
      throw new Error(`Job not found: ${name}`);
    }

    if (!job.scheduled) {
      logger.warn(`Job is already stopped: ${name}`);
      return;
    }

    job.task.stop();
    job.scheduled = false;
    logger.info(`Job stopped: ${name}`);
  }

  /**
   * Unschedule and remove a job
   *
   * @param {string} name - Job name
   */
  unschedule(name) {
    const job = this.jobs.get(name);
    if (!job) {
      logger.warn(`Job not found for unscheduling: ${name}`);
      return;
    }

    if (job.task) {
      job.task.stop();
    }

    this.jobs.delete(name);
    logger.info(`Job unscheduled: ${name}`);
  }

  /**
   * Get job information
   *
   * @param {string} name - Job name
   * @returns {Object} Job information
   */
  getJob(name) {
    const job = this.jobs.get(name);
    if (!job) {
      return null;
    }

    return {
      name: job.name,
      cronExpression: job.cronExpression,
      scheduled: job.scheduled,
      stats: { ...job.stats },
      createdAt: job.createdAt
    };
  }

  /**
   * Get all jobs
   *
   * @returns {Array} Array of job information
   */
  getAllJobs() {
    return Array.from(this.jobs.values()).map(job => ({
      name: job.name,
      cronExpression: job.cronExpression,
      scheduled: job.scheduled,
      stats: { ...job.stats },
      createdAt: job.createdAt
    }));
  }

  /**
   * Manually trigger a job execution
   *
   * @param {string} name - Job name
   */
  async triggerJob(name) {
    const job = this.jobs.get(name);
    if (!job) {
      throw new Error(`Job not found: ${name}`);
    }

    logger.info(`Manually triggering job: ${name}`);
    await job.taskFn();
  }

  /**
   * Get scheduler status
   *
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      status: this.status,
      jobCount: this.jobs.size,
      activeJobs: Array.from(this.jobs.values()).filter(j => j.scheduled).length
    };
  }

  /**
   * Alias for schedule() - backward compatibility
   */
  scheduleJob(name, cronExpression, task, options = {}) {
    return this.schedule(name, cronExpression, task, options);
  }

  /**
   * Alias for schedule() - backward compatibility
   */
  registerJob(name, cronExpression, task, options = {}) {
    return this.schedule(name, cronExpression, task, options);
  }

  /**
   * Alias for unschedule() - backward compatibility
   */
  unscheduleJob(name) {
    return this.unschedule(name);
  }

  /**
   * Alias for unschedule() - backward compatibility
   */
  unregisterJob(name) {
    return this.unschedule(name);
  }
}

// Create singleton instance
const schedulerService = new SchedulerService();

export default schedulerService;
