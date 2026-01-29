/**
 * Background Job Scheduler Service
 *
 * Manages scheduled tasks using node-cron
 * - Jobs can be scheduled with cron expressions
 * - Jobs can be started, stopped, and monitored
 * - Multiple jobs can run concurrently
 * - All job executions are logged and persisted
 * - Missed jobs are detected and recovered on startup
 */

import cron from 'node-cron';
import { getLogger } from '../utils/logger.js';
import ScheduledJobExecution from '../models/ScheduledJobExecution.js';

const logger = getLogger('scheduler', 'scheduler-service');

/**
 * Calculate next run time from cron expression
 */
function calculateNextRun(cronExpression, timezone = 'UTC') {
  try {
    // node-cron provides a way to get the scheduled tasks
    // We'll use the task's next invocation time
    const task = cron.schedule(cronExpression, () => {}, { scheduled: false, timezone });

    // Get the next invocation time
    // node-cron stores this internally but doesn't expose it directly
    // We'll calculate it based on the current time and cron pattern

    // For simplicity, use a basic calculation
    // In production, you might want to use a library like 'cron-parser'
    const now = new Date();

    // Parse the cron expression to estimate next run
    const [minute, hour, day, month, dayOfWeek] = cronExpression.split(' ');

    let next = new Date(now);

    // Simple implementation - advance to next matching time
    // This is a simplified version; for production use cron-parser library
    const setNextTime = (date) => {
      // Start with next minute
      date.setSeconds(0, 0);
      date.setMinutes(date.getMinutes() + 1);

      // Match minute
      while (!matchesField(date.getMinutes(), minute, 0, 59)) {
        date.setMinutes(date.getMinutes() + 1);
        if (date.getMinutes() === 0) {
          // We wrapped to the next hour
          break;
        }
      }

      // Match hour
      let iterations = 0;
      while (!matchesField(date.getHours(), hour, 0, 23) && iterations < 24) {
        date.setHours(date.getHours() + 1);
        date.setMinutes(0);
        iterations++;
      }

      // Match day of month
      if (day !== '*' && !matchesField(date.getDate(), day, 1, 31)) {
        date.setDate(date.getDate() + 1);
        date.setHours(0, 0, 0, 0);
        return setNextTime(date);
      }

      // Match month
      if (month !== '*' && !matchesField(date.getMonth() + 1, month, 1, 12)) {
        date.setMonth(date.getMonth() + 1);
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        return setNextTime(date);
      }

      // Match day of week
      if (dayOfWeek !== '*' && !matchesField(date.getDay(), dayOfWeek, 0, 6)) {
        date.setDate(date.getDate() + 1);
        date.setHours(0, 0, 0, 0);
        return setNextTime(date);
      }

      return date;
    };

    const matchesField = (value, field, min, max) => {
      if (field === '*') return true;

      // Handle ranges (e.g., 1-5)
      if (field.includes('-')) {
        const [start, end] = field.split('-').map(Number);
        return value >= start && value <= end;
      }

      // Handle lists (e.g., 1,3,5)
      if (field.includes(',')) {
        const values = field.split(',').map(Number);
        return values.includes(value);
      }

      // Handle step (e.g., */5 or 1-10/2)
      if (field.includes('/')) {
        const [base, step] = field.split('/');
        const stepNum = parseInt(step);
        if (base === '*') {
          return value % stepNum === 0;
        }
        const [start, end] = base.split('-').map(Number);
        return value >= start && value <= end && (value - start) % stepNum === 0;
      }

      return value === parseInt(field);
    };

    // Clean up the task
    task.stop();

    return setNextTime(next);
  } catch (error) {
    logger.warn('Failed to calculate next run time, using 1 hour default', {
      cronExpression,
      error: error.message
    });
    const next = new Date();
    next.setHours(next.getHours() + 1);
    return next;
  }
}

class SchedulerService {
  constructor() {
    this.jobs = new Map(); // Store jobs by name
    this.status = 'stopped';
    this.dbModel = ScheduledJobExecution;
  }

  /**
   * Start the scheduler service
   * Checks for missed jobs and schedules them immediately
   */
  async start() {
    if (this.status === 'running') {
      logger.warn('Scheduler is already running');
      return;
    }

    this.status = 'running';
    logger.info('Scheduler service starting...');

    // Check for missed jobs on startup
    await this.recoverMissedJobs();

    logger.info('Scheduler service started');
  }

  /**
   * Recover jobs that missed their scheduled run time
   */
  async recoverMissedJobs() {
    try {
      logger.info('Checking for missed jobs...');

      const missedJobs = await this.dbModel.findMissedJobs();

      if (missedJobs.length === 0) {
        logger.info('No missed jobs found');
        return;
      }

      logger.info(`Found ${missedJobs.length} missed job(s), scheduling immediate execution`);

      for (const missedJob of missedJobs) {
        const job = this.jobs.get(missedJob.jobName);

        if (!job) {
          logger.warn(`Missed job "${missedJob.jobName}" is not registered, skipping`);
          await missedJob.recordMissedRun();
          continue;
        }

        // Update next run time first
        const nextRun = calculateNextRun(job.cronExpression, job.timezone);
        await missedJob.updateNextRun(nextRun);

        // Schedule immediate execution
        logger.info(`Scheduling missed job "${missedJob.jobName}" to run immediately`);

        // Run immediately but don't block other jobs
        setImmediate(async () => {
          try {
            await job.taskFn();
            logger.info(`Recovered job "${missedJob.jobName}" completed successfully`);
          } catch (error) {
            logger.error(`Recovered job "${missedJob.jobName}" failed`, {
              error: error.message
            });
          }
        });
      }

    } catch (error) {
      logger.error('Error recovering missed jobs', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Stop the scheduler service
   * Stops all scheduled jobs
   */
  async stop() {
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

    // Update database records
    for (const [name, job] of this.jobs.entries()) {
      try {
        const record = await this.dbModel.findOne({ jobName: name });
        if (record) {
          record.isActive = false;
          record.nextRunAt = null;
          await record.save();
        }
      } catch (error) {
        logger.warn(`Failed to update job record for ${name}`, {
          error: error.message
        });
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
   * @param {boolean} options.persist - Whether to persist execution data (default: true)
   */
  async schedule(name, cronExpression, task, options = {}) {
    if (this.jobs.has(name)) {
      throw new Error(`Job with name "${name}" already exists`);
    }

    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    const timezone = options.timezone || 'UTC';
    const persist = options.persist !== false;

    // Get or create database record
    let dbRecord;
    if (persist) {
      try {
        dbRecord = await this.dbModel.getOrCreate(name, cronExpression, {
          timezone,
          metadata: options.metadata || {}
        });
        dbRecord.isActive = true;
        await dbRecord.save();
      } catch (error) {
        logger.warn(`Failed to create DB record for job ${name}, continuing without persistence`, {
          error: error.message
        });
      }
    }

    // Calculate next run time
    const nextRunAt = calculateNextRun(cronExpression, timezone);

    // Wrap task with logging and persistence
    const wrappedTask = async () => {
      const startTime = Date.now();
      logger.info(`Executing job: ${name}`);

      // Record start in database
      if (persist) {
        try {
          const record = await this.dbModel.findOne({ jobName: name });
          if (record) {
            await record.recordStart();
          }
        } catch (error) {
          logger.warn(`Failed to record job start for ${name}`, {
            error: error.message
          });
        }
      }

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

          // Calculate and store next run time
          job.stats.nextRun = calculateNextRun(job.cronExpression, job.timezone);
        }

        // Record success in database
        if (persist) {
          try {
            const record = await this.dbModel.findOne({ jobName: name });
            if (record) {
              await record.recordSuccess(duration);
              await record.updateNextRun(job.stats.nextRun);
            }
          } catch (error) {
            logger.warn(`Failed to record job success for ${name}`, {
              error: error.message
            });
          }
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

          // Still calculate next run time even after failure
          job.stats.nextRun = calculateNextRun(job.cronExpression, job.timezone);
        }

        // Record failure in database
        if (persist) {
          try {
            const record = await this.dbModel.findOne({ jobName: name });
            if (record) {
              await record.recordFailure(error);
              await record.updateNextRun(job.stats.nextRun);
            }
          } catch (dbError) {
            logger.warn(`Failed to record job failure for ${name}`, {
              error: dbError.message
            });
          }
        }

        // Re-throw to allow error handling higher up
        throw error;
      }
    };

    // Create the cron job
    const cronTask = cron.schedule(cronExpression, wrappedTask, {
      scheduled: false, // Don't start until we call start()
      timezone: timezone
    });

    // Store job info
    this.jobs.set(name, {
      name,
      cronExpression,
      task: cronTask,
      taskFn: wrappedTask,
      scheduled: false,
      timezone,
      persist,
      stats: {
        runCount: 0,
        successCount: 0,
        errorCount: 0,
        lastRun: null,
        lastDuration: null,
        lastError: null,
        nextRun: nextRunAt
      },
      createdAt: new Date()
    });

    logger.info(`Job scheduled: ${name} (${cronExpression}), next run: ${nextRunAt.toISOString()}`);

    // Update database with next run time
    if (persist && dbRecord) {
      try {
        await dbRecord.updateNextRun(nextRunAt);
      } catch (error) {
        logger.warn(`Failed to update next run time for ${name}`, {
          error: error.message
        });
      }
    }

    // Start the job if scheduler is running
    if (this.status === 'running') {
      this.startJob(name);
    }

    // Run immediately if requested
    if (options.immediate) {
      setImmediate(() => wrappedTask().catch(error => {
        logger.error(`Immediate execution of ${name} failed`, { error: error.message });
      }));
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
  async stopJob(name) {
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

    // Update database
    if (job.persist) {
      try {
        const record = await this.dbModel.findOne({ jobName: name });
        if (record) {
          record.isActive = false;
          record.nextRunAt = null;
          await record.save();
        }
      } catch (error) {
        logger.warn(`Failed to update job record for ${name}`, {
          error: error.message
        });
      }
    }

    logger.info(`Job stopped: ${name}`);
  }

  /**
   * Unschedule and remove a job
   *
   * @param {string} name - Job name
   */
  async unschedule(name) {
    const job = this.jobs.get(name);
    if (!job) {
      logger.warn(`Job not found for unscheduling: ${name}`);
      return;
    }

    if (job.task) {
      job.task.stop();
    }

    // Deactivate in database
    if (job.persist) {
      try {
        const record = await this.dbModel.findOne({ jobName: name });
        if (record) {
          record.isActive = false;
          record.nextRunAt = null;
          await record.save();
        }
      } catch (error) {
        logger.warn(`Failed to update job record for ${name}`, {
          error: error.message
        });
      }
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
  async getJob(name) {
    const job = this.jobs.get(name);
    if (!job) {
      return null;
    }

    const info = {
      name: job.name,
      cronExpression: job.cronExpression,
      scheduled: job.scheduled,
      timezone: job.timezone,
      persist: job.persist,
      stats: { ...job.stats },
      createdAt: job.createdAt
    };

    // Add database record if available
    if (job.persist) {
      try {
        const record = await this.dbModel.findOne({ jobName: name });
        if (record) {
          info.dbRecord = {
            lastRunAt: record.lastRunAt,
            lastRunStatus: record.lastRunStatus,
            lastRunError: record.lastRunError,
            consecutiveFailures: record.consecutiveFailures,
            totalRuns: record.totalRuns,
            missedRuns: record.missedRuns
          };
        }
      } catch (error) {
        // Ignore database errors
      }
    }

    return info;
  }

  /**
   * Get all jobs
   *
   * @returns {Array} Array of job information
   */
  async getAllJobs() {
    const jobs = [];

    for (const job of this.jobs.values()) {
      const info = {
        name: job.name,
        cronExpression: job.cronExpression,
        scheduled: job.scheduled,
        timezone: job.timezone,
        persist: job.persist,
        stats: { ...job.stats },
        createdAt: job.createdAt
      };

      // Add database record if available
      if (job.persist) {
        try {
          const record = await this.dbModel.findOne({ jobName: job.name });
          if (record) {
            info.dbRecord = {
              lastRunAt: record.lastRunAt,
              lastRunStatus: record.lastRunStatus,
              lastRunError: record.lastRunError,
              consecutiveFailures: record.consecutiveFailures,
              totalRuns: record.totalRuns,
              missedRuns: record.missedRuns
            };
          }
        } catch (error) {
          // Ignore database errors
        }
      }

      jobs.push(info);
    }

    return jobs;
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
   * Get health summary of all jobs
   *
   * @returns {Array} Health summary for each job
   */
  async getHealthSummary() {
    try {
      return await this.dbModel.getHealthSummary();
    } catch (error) {
      logger.error('Failed to get health summary', {
        error: error.message
      });
      return [];
    }
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
