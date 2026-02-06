/**
 * Token Cleanup Job
 *
 * Periodically cleans up old/inactive/expired OAuth tokens from the database.
 * - Deletes inactive tokens older than 90 days
 * - Deletes expired tokens older than 30 days
 *
 * Runs daily at 3 AM UTC
 */

import AuthToken from '../models/AuthToken.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('jobs', 'token-cleanup');

class TokenCleanupJob {
  constructor() {
    this.jobName = 'token-cleanup';
    this.isRunning = false;
  }

  /**
   * Execute the cleanup job
   */
  async execute() {
    if (this.isRunning) {
      logger.warn('Token cleanup job already running, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Token cleanup job started');

      // 1. Delete inactive tokens older than 90 days
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const inactiveDeleted = await AuthToken.deleteMany({
        isActive: false,
        createdAt: { $lt: ninetyDaysAgo }
      });

      if (inactiveDeleted.deletedCount > 0) {
        logger.info(`Deleted ${inactiveDeleted.deletedCount} inactive tokens (older than 90 days)`);
      }

      // 2. Delete expired tokens older than 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const expiredDeleted = await AuthToken.deleteMany({
        expiresAt: { $lt: thirtyDaysAgo }
      });

      if (expiredDeleted.deletedCount > 0) {
        logger.info(`Deleted ${expiredDeleted.deletedCount} expired tokens (expired more than 30 days ago)`);
      }

      // 3. Log summary
      const totalDeleted = (inactiveDeleted.deletedCount || 0) + (expiredDeleted.deletedCount || 0);
      const duration = Date.now() - startTime;

      logger.info(`Token cleanup job completed`, {
        totalDeleted,
        inactiveDeleted: inactiveDeleted.deletedCount || 0,
        expiredDeleted: expiredDeleted.deletedCount || 0,
        duration: `${duration}ms`
      });

      return {
        success: true,
        totalDeleted,
        inactiveDeleted: inactiveDeleted.deletedCount || 0,
        expiredDeleted: expiredDeleted.deletedCount || 0,
      };

    } catch (error) {
      logger.error('Token cleanup job failed', {
        error: error.message,
        stack: error.stack
      });
      return { success: false, error: error.message };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Start the scheduled job
   * Runs daily at 3 AM UTC
   */
  async start() {
    const schedulerService = (await import('../services/scheduler.js')).default;
    await schedulerService.schedule(
      this.jobName,
      '0 3 * * *', // Daily at 3 AM UTC
      () => this.execute(),
      {
        timezone: 'UTC',
        persist: true,
        metadata: { description: 'Daily cleanup of old/expired OAuth tokens' }
      }
    );

    logger.info('Token cleanup job scheduled: daily at 3 AM UTC');
  }

  /**
   * Stop the job
   */
  stop() {
    const schedulerService = require('../services/scheduler.js').default;
    schedulerService.unschedule(this.jobName);
    logger.info('Token cleanup job stopped');
  }
}

export default new TokenCleanupJob();
