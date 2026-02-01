/**
 * Temp File Cleanup Job
 *
 * Cleans up temporary files generated during video processing.
 * - Removes files older than configured age (default: 24 hours)
 * - Only cleans designated temp directories to avoid deleting production files
 * - Runs daily at a configurable time (default: 02:00 UTC)
 *
 * Temp directories cleaned:
 * - storage/temp/ - General temp files (mixed audio, intermediate files)
 * - storage/temp/narration/ - TTS narration outputs
 * - storage/temp/images/ - Temporary image files
 *
 * NOT cleaned (these are "keeper" directories):
 * - storage/videos/tier1/final/ - Final video outputs
 * - storage/images/tier1/ - Generated images for posts
 */

import schedulerService from '../services/scheduler.js';
import fs from 'fs/promises';
import path from 'path';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('jobs', 'temp-file-cleanup');

class TempFileCleanupJob {
  constructor() {
    this.jobName = 'temp-file-cleanup';
    this.isScheduled = false;

    // Base storage directory
    this.storageBase = path.join(process.cwd(), 'storage');

    // Directories to clean (temp only)
    this.tempDirectories = [
      'storage/temp',           // General temp files (mixed audio, etc)
      'storage/temp/narration', // TTS narration outputs
      'storage/temp/images',    // AI-generated images for video processing
    ];

    // Age threshold for cleanup (in hours, default: 24)
    this.ageThresholdHours = parseInt(process.env.TEMP_FILE_AGE_HOURS || '24');
  }

  /**
   * Start the scheduled temp file cleanup job
   * Uses SchedulerService for centralized job management
   *
   * @param {object} options - Scheduling options
   * @param {string} options.scheduleTime - Time in HH:MM format (default: "02:00")
   * @param {string} options.timezone - Timezone for scheduling (default: "UTC")
   */
  start(options = {}) {
    if (this.isScheduled) {
      logger.warn('Temp file cleanup job already started');
      return;
    }

    try {
      const scheduleTime = options.scheduleTime || process.env.TEMP_CLEANUP_TIME || '02:00';
      const timezone = options.timezone || process.env.TEMP_CLEANUP_TIMEZONE || 'UTC';

      const [hour, minute] = scheduleTime.split(':').map(Number);

      if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        throw new Error(`Invalid schedule time format: ${scheduleTime}. Expected HH:MM format (00:00-23:59)`);
      }

      const cronExpression = `${minute} ${hour} * * *`;

      logger.info('Starting temp file cleanup scheduler', {
        jobName: this.jobName,
        scheduleTime,
        timezone,
        cronExpression,
        ageThresholdHours: this.ageThresholdHours
      });

      if (schedulerService.getStatus().status !== 'running') {
        schedulerService.start();
        logger.info('Scheduler service started');
      }

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
      logger.info('Temp file cleanup scheduler started successfully', {
        jobName: this.jobName,
        scheduleTime,
        timezone
      });

    } catch (error) {
      logger.error('Failed to start temp file cleanup scheduler', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Stop the scheduled temp file cleanup job
   */
  stop() {
    if (!this.isScheduled) {
      logger.warn('Temp file cleanup job not running');
      return;
    }

    try {
      schedulerService.unschedule(this.jobName);
      this.isScheduled = false;
      logger.info('Temp file cleanup scheduler stopped', { jobName: this.jobName });
    } catch (error) {
      logger.error('Failed to stop temp file cleanup scheduler', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Execute the temp file cleanup
   * This is the main job execution method
   */
  async execute() {
    const startTime = Date.now();
    logger.info('Temp file cleanup started', {
      jobName: this.jobName,
      ageThresholdHours: this.ageThresholdHours
    });

    const results = {
      directories: [],
      totalFilesDeleted: 0,
      totalBytesFreed: 0,
      errors: []
    };

    try {
      for (const dir of this.tempDirectories) {
        const result = await this.cleanupDirectory(dir);
        results.directories.push(result);
        results.totalFilesDeleted += result.filesDeleted;
        results.totalBytesFreed += result.bytesFreed;
        if (result.error) results.errors.push(result.error);
      }

      const duration = Date.now() - startTime;
      logger.info('Temp file cleanup completed successfully', {
        jobName: this.jobName,
        duration: `${duration}ms`,
        totalFilesDeleted: results.totalFilesDeleted,
        totalBytesFreed: `${(results.totalBytesFreed / 1024 / 1024).toFixed(2)} MB`,
        directoriesProcessed: results.directories.length,
        errors: results.errors.length
      });

      return {
        success: true,
        results,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Temp file cleanup failed', {
        jobName: this.jobName,
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Manually trigger the temp file cleanup
   * Useful for testing or on-demand cleanup
   */
  async trigger() {
    logger.info('Manual trigger: Temp file cleanup', { jobName: this.jobName });
    return await this.execute();
  }

  /**
   * Clean up a single directory
   * @param {string} dirPath - Relative path from storage base
   * @returns {object} Cleanup results for this directory
   */
  async cleanupDirectory(dirPath) {
    const fullPath = path.join(this.storageBase, '..', dirPath);

    const result = {
      directory: dirPath,
      exists: false,
      filesDeleted: 0,
      bytesFreed: 0,
      files: [],
      error: null
    };

    try {
      // Check if directory exists
      const stats = await fs.stat(fullPath).catch(() => null);
      if (!stats || !stats.isDirectory()) {
        result.exists = false;
        logger.debug('Directory does not exist or is not a directory', { dirPath: fullPath });
        return result;
      }
      result.exists = true;

      const now = Date.now();
      const maxAge = this.ageThresholdHours * 60 * 60 * 1000;

      // Recursively walk the directory
      const entries = await this.getEntriesRecursively(fullPath);

      for (const entry of entries) {
        try {
          const entryStats = await fs.stat(entry.fullPath);

          // Skip directories (we'll delete them when empty after files are gone)
          if (entryStats.isDirectory()) {
            continue;
          }

          // Check if file is older than threshold
          if (entryStats.mtimeMs < now - maxAge) {
            const fileSize = entryStats.size;
            await fs.unlink(entry.fullPath);

            result.filesDeleted++;
            result.bytesFreed += fileSize;
            result.files.push({
              path: entry.relativePath,
              size: fileSize,
              age: `${((now - entryStats.mtimeMs) / (60 * 60 * 1000)).toFixed(1)} hours`
            });

            logger.debug('Deleted temp file', {
              file: entry.relativePath,
              size: fileSize,
              ageHours: ((now - entryStats.mtimeMs) / (60 * 60 * 1000)).toFixed(1)
            });
          }
        } catch (fileError) {
          logger.warn('Failed to process file during cleanup', {
            file: entry.relativePath,
            error: fileError.message
          });
        }
      }

      // Try to remove empty subdirectories
      await this.removeEmptyDirectories(fullPath);

      logger.info('Directory cleanup completed', {
        directory: dirPath,
        filesDeleted: result.filesDeleted,
        bytesFreed: `${(result.bytesFreed / 1024 / 1024).toFixed(2)} MB`
      });

    } catch (error) {
      result.error = error.message;
      logger.error('Failed to cleanup directory', {
        directory: dirPath,
        error: error.message
      });
    }

    return result;
  }

  /**
   * Get all entries in a directory recursively
   * @param {string} dirPath - Directory path
   * @returns {Array} Array of entry objects with fullPath and relativePath
   */
  async getEntriesRecursively(dirPath) {
    const entries = [];

    async function walk(currentPath, relativePath = '') {
      try {
        const items = await fs.readdir(currentPath, { withFileTypes: true });

        for (const item of items) {
          const itemPath = path.join(currentPath, item.name);
          const itemRelativePath = path.join(relativePath, item.name);

          entries.push({
            fullPath: itemPath,
            relativePath: itemRelativePath,
            isDirectory: item.isDirectory()
          });

          if (item.isDirectory()) {
            await walk(itemPath, itemRelativePath);
          }
        }
      } catch (error) {
        // Directory might not exist or be accessible
        logger.debug('Could not read directory during walk', {
          path: currentPath,
          error: error.message
        });
      }
    }

    await walk(dirPath);
    return entries;
  }

  /**
   * Remove empty directories recursively
   * @param {string} dirPath - Directory path to clean
   */
  async removeEmptyDirectories(dirPath) {
    try {
      const entries = await fs.readdir(dirPath);

      if (entries.length === 0) {
        await fs.rmdir(dirPath);
        logger.debug('Removed empty directory', { dirPath });
        return;
      }

      // Recursively check subdirectories
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);
        const stats = await fs.stat(fullPath);

        if (stats.isDirectory()) {
          await this.removeEmptyDirectories(fullPath);
        }
      }

      // Check again after subdirectories might have been removed
      const newEntries = await fs.readdir(dirPath);
      if (newEntries.length === 0) {
        await fs.rmdir(dirPath);
        logger.debug('Removed empty directory (after cleanup)', { dirPath });
      }
    } catch (error) {
      logger.debug('Could not remove empty directory', {
        path: dirPath,
        error: error.message
      });
    }
  }

  /**
   * Get job status
   * @returns {object} Job status
   */
  getStatus() {
    const schedulerStatus = schedulerService.getJobStatus(this.jobName);

    return {
      jobName: this.jobName,
      isScheduled: this.isScheduled,
      schedulerStatus: schedulerStatus,
      config: {
        ageThresholdHours: this.ageThresholdHours,
        tempDirectories: this.tempDirectories
      }
    };
  }

  /**
   * Get current temp files status (without cleaning)
   * @returns {object} Temp files statistics
   */
  async getTempFilesStatus() {
    const stats = {
      directories: [],
      totalFiles: 0,
      totalSize: 0,
      oldFiles: 0
    };

    const now = Date.now();
    const maxAge = this.ageThresholdHours * 60 * 60 * 1000;

    for (const dir of this.tempDirectories) {
      const fullPath = path.join(this.storageBase, '..', dir);

      try {
        const dirStats = await fs.stat(fullPath);
        if (!dirStats.isDirectory()) {
          continue;
        }

        const entries = await this.getEntriesRecursively(fullPath);
        let fileCount = 0;
        let dirSize = 0;
        let oldFileCount = 0;

        for (const entry of entries) {
          if (entry.isDirectory) continue;

          try {
            const fileStats = await fs.stat(entry.fullPath);
            fileCount++;
            dirSize += fileStats.size;

            if (fileStats.mtimeMs < now - maxAge) {
              oldFileCount++;
            }
          } catch {}
        }

        stats.directories.push({
          directory: dir,
          fileCount,
          sizeBytes: dirSize,
          sizeFormatted: `${(dirSize / 1024 / 1024).toFixed(2)} MB`,
          oldFiles: oldFileCount
        });

        stats.totalFiles += fileCount;
        stats.totalSize += dirSize;
        stats.oldFiles += oldFileCount;

      } catch (error) {
        logger.debug('Could not get stats for directory', {
          directory: dir,
          error: error.message
        });
      }
    }

    return stats;
  }
}

// Export singleton instance
const tempFileCleanupJob = new TempFileCleanupJob();
export default tempFileCleanupJob;
