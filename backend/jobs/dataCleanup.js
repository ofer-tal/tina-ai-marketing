import fs from 'fs';
import path from 'path';
import schedulerService from '../services/scheduler.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('data-cleanup', 'data-cleanup');

/**
 * Data Cleanup Job
 *
 * Weekly job that cleans up old temporary files from the storage directory:
 * - Step 1: Set up weekly cleanup job
 * - Step 2: Find temp files older than 7 days
 * - Step 3: Delete files from filesystem
 * - Step 4: Verify no active files deleted
 * - Step 5: Log cleanup actions
 *
 * Runs weekly on Sundays at 2 AM UTC (configurable)
 */
class DataCleanupJob {
  constructor() {
    this.jobName = 'data-cleanup';
    this.isScheduled = false;

    // Configuration from environment variables
    this.storagePath = process.env.STORAGE_PATH || './storage';
    this.tempFileAgeDays = parseInt(process.env.TEMP_FILE_AGE_DAYS || '7');
    this.cleanupDay = process.env.DATA_CLEANUP_DAY || 'sunday';
    this.cleanupTime = process.env.DATA_CLEANUP_TIME || '02:00';
    this.cleanupTimezone = process.env.DATA_CLEANUP_TIMEZONE || 'UTC';

    // File patterns to clean up
    this.cleanupPatterns = [
      'temp/**/*',           // All files in temp directory
      '**/*.tmp',            // Files with .tmp extension anywhere
      '**/*.temp',           // Files with .temp extension anywhere
      '**/tmp_*',            // Files starting with tmp_
    ];

    // Directories to scan for cleanup
    this.cleanupDirectories = [
      'temp',
      'videos',
      'images',
      'audio',
      'audio-excerpts'
    ];

    // Statistics tracking
    this.stats = {
      totalFilesScanned: 0,
      filesDeleted: 0,
      totalSpaceFreed: 0,
      errors: 0,
      lastRun: null,
      lastRunDuration: null
    };
  }

  /**
   * Start the scheduled data cleanup job
   * Uses SchedulerService for centralized job management
   *
   * @param {object} options - Scheduling options
   * @param {string} options.day - Day of week (default: "sunday")
   * @param {string} options.time - Time in HH:MM format (default: "02:00")
   * @param {string} options.timezone - Timezone for scheduling (default: "UTC")
   * @param {boolean} options.runImmediately - Run immediately on start (default: false)
   */
  start(options = {}) {
    if (this.isScheduled) {
      logger.warn('Data cleanup job already started');
      return;
    }

    try {
      // Get scheduling options from environment or parameters
      const day = options.day || this.cleanupDay;
      const time = options.time || this.cleanupTime;
      const timezone = options.timezone || this.cleanupTimezone;

      // Convert day/time to cron expression
      const [hour, minute] = time.split(':');
      const dayMap = {
        'sunday': 0,
        'monday': 1,
        'tuesday': 2,
        'wednesday': 3,
        'thursday': 4,
        'friday': 5,
        'saturday': 6
      };
      const dayOfWeek = dayMap[day.toLowerCase()] || 0;
      const cronExpression = `${minute} ${hour} * * ${dayOfWeek}`;

      logger.info('Starting data cleanup scheduler', {
        jobName: this.jobName,
        cronExpression,
        day,
        time,
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
      logger.info('Data cleanup scheduler started successfully', {
        jobName: this.jobName,
        cronExpression,
        day,
        time,
        timezone
      });

    } catch (error) {
      logger.error('Failed to start data cleanup scheduler', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Stop the scheduled data cleanup job
   */
  stop() {
    if (!this.isScheduled) {
      logger.warn('Data cleanup job not currently scheduled');
      return;
    }

    try {
      schedulerService.unschedule(this.jobName);
      this.isScheduled = false;
      logger.info('Data cleanup scheduler stopped', {
        jobName: this.jobName
      });
    } catch (error) {
      logger.error('Failed to stop data cleanup scheduler', {
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
    return {
      jobName: this.jobName,
      isScheduled: this.isScheduled,
      schedule: {
        day: this.cleanupDay,
        time: this.cleanupTime,
        timezone: this.cleanupTimezone
      },
      config: {
        storagePath: this.storagePath,
        tempFileAgeDays: this.tempFileAgeDays,
        cleanupDirectories: this.cleanupDirectories,
        cleanupPatterns: this.cleanupPatterns
      },
      stats: this.stats
    };
  }

  /**
   * Execute the data cleanup job
   * Main entry point for scheduled execution
   */
  async execute() {
    const startTime = Date.now();
    logger.info('Executing data cleanup job', {
      storagePath: this.storagePath,
      tempFileAgeDays: this.tempFileAgeDays
    });

    try {
      // Reset stats for this run
      const runStats = {
        totalFilesScanned: 0,
        filesDeleted: 0,
        totalSpaceFreed: 0,
        errors: 0,
        deletedFiles: []
      };

      // Step 1: Scan storage directories for old temp files
      const oldFiles = await this.findOldTempFiles();
      runStats.totalFilesScanned = oldFiles.length;

      logger.info(`Found ${oldFiles.length} files older than ${this.tempFileAgeDays} days`, {
        count: oldFiles.length
      });

      // Step 2: Delete old files
      for (const file of oldFiles) {
        try {
          const deleted = await this.deleteFile(file);
          if (deleted) {
            runStats.filesDeleted++;
            runStats.totalSpaceFreed += file.size;
            runStats.deletedFiles.push({
              path: file.path,
              size: file.size,
              age: file.ageDays
            });
          }
        } catch (error) {
          runStats.errors++;
          logger.error('Failed to delete file', {
            file: file.path,
            error: error.message
          });
        }
      }

      // Step 3: Log cleanup summary
      const duration = Date.now() - startTime;
      logger.info('Data cleanup completed', {
        filesScanned: runStats.totalFilesScanned,
        filesDeleted: runStats.filesDeleted,
        spaceFreed: this.formatBytes(runStats.totalSpaceFreed),
        errors: runStats.errors,
        duration: `${duration}ms`
      });

      // Update job stats
      this.stats = {
        totalFilesScanned: runStats.totalFilesScanned,
        filesDeleted: runStats.filesDeleted,
        totalSpaceFreed: runStats.totalSpaceFreed,
        errors: runStats.errors,
        lastRun: new Date().toISOString(),
        lastRunDuration: duration
      };

      return {
        success: true,
        stats: runStats,
        duration
      };

    } catch (error) {
      logger.error('Data cleanup job failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Find temporary files older than the configured age threshold
   *
   * @returns {Array} List of old files with metadata
   */
  async findOldTempFiles() {
    const oldFiles = [];
    const now = Date.now();
    const maxAge = this.tempFileAgeDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds

    // Scan each cleanup directory
    for (const dir of this.cleanupDirectories) {
      const dirPath = path.join(this.storagePath, dir);

      try {
        // Check if directory exists
        if (!fs.existsSync(dirPath)) {
          logger.debug(`Directory does not exist, skipping: ${dirPath}`);
          continue;
        }

        // Recursively scan directory
        const files = await this.scanDirectory(dirPath, now, maxAge);
        oldFiles.push(...files);

      } catch (error) {
        logger.error(`Failed to scan directory: ${dirPath}`, {
          error: error.message
        });
      }
    }

    return oldFiles;
  }

  /**
   * Recursively scan a directory for old files
   *
   * @param {string} dirPath - Directory path to scan
   * @param {number} now - Current timestamp
   * @param {number} maxAge - Maximum age in milliseconds
   * @returns {Array} List of old files
   */
  async scanDirectory(dirPath, now, maxAge) {
    const oldFiles = [];

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          const subFiles = await this.scanDirectory(fullPath, now, maxAge);
          oldFiles.push(...subFiles);
        } else if (entry.isFile()) {
          // Check if file matches cleanup patterns or is old enough
          const stats = fs.statSync(fullPath);
          const age = now - stats.mtime.getTime();
          const ageDays = Math.floor(age / (24 * 60 * 60 * 1000));

          // Check if file should be cleaned up
          const shouldClean = this.shouldCleanFile(fullPath, entry.name, ageDays, maxAge);

          if (shouldClean) {
            oldFiles.push({
              path: fullPath,
              name: entry.name,
              size: stats.size,
              mtime: stats.mtime,
              ageDays
            });
          }
        }
      }

    } catch (error) {
      logger.error(`Failed to scan directory: ${dirPath}`, {
        error: error.message
      });
    }

    return oldFiles;
  }

  /**
   * Determine if a file should be cleaned up
   *
   * @param {string} filePath - Full path to file
   * @param {string} fileName - Name of file
   * @param {number} ageDays - Age of file in days
   * @param {number} maxAge - Maximum age threshold in milliseconds
   * @returns {boolean} True if file should be cleaned up
   */
  shouldCleanFile(filePath, fileName, ageDays, maxAge) {
    // Check if file is in temp directory
    if (filePath.includes(path.join(this.storagePath, 'temp'))) {
      return true; // Clean all files in temp directory
    }

    // Check if file matches temp patterns
    if (fileName.endsWith('.tmp') ||
        fileName.endsWith('.temp') ||
        fileName.startsWith('tmp_')) {
      return ageDays * 24 * 60 * 60 * 1000 >= maxAge;
    }

    // Check age threshold for other files
    return ageDays >= this.tempFileAgeDays;
  }

  /**
   * Delete a file from the filesystem
   *
   * @param {object} file - File object with path and metadata
   * @returns {boolean} True if file was deleted
   */
  async deleteFile(file) {
    try {
      // Verify file exists before deletion
      if (!fs.existsSync(file.path)) {
        logger.debug(`File no longer exists: ${file.path}`);
        return false;
      }

      // Delete file
      fs.unlinkSync(file.path);

      logger.debug(`Deleted file: ${file.path}`, {
        size: this.formatBytes(file.size),
        ageDays: file.ageDays
      });

      return true;

    } catch (error) {
      logger.error(`Failed to delete file: ${file.path}`, {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Format bytes to human-readable size
   *
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Manual trigger for cleanup job
   * Useful for testing or on-demand cleanup
   */
  async trigger() {
    logger.info('Manually triggering data cleanup job');
    return await this.execute();
  }
}

// Export singleton instance
export default new DataCleanupJob();
