import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getLogger } from '../utils/logger.js';

const execAsync = promisify(exec);

/**
 * Log Rotation and Cleanup Job
 *
 * Provides comprehensive log management:
 * - Weekly log rotation
 * - Compression of old logs
 * - Deletion of logs older than 30 days
 * - Active log preservation
 * - Disk usage monitoring
 */
class LogRotationJob {
  constructor() {
    this.logger = getLogger('log-rotation', 'job');
    this.isRunning = false;
    this.jobName = 'log-rotation';

    // Configuration from environment variables
    this.config = {
      logDirectory: process.env.LOG_FILE_PATH || './logs',
      rotationSchedule: process.env.LOG_ROTATION_SCHEDULE || '0 3 * * 0', // Weekly: Sunday 3 AM
      retentionDays: parseInt(process.env.LOG_RETENTION_DAYS || '30', 10),
      compressionEnabled: process.env.LOG_COMPRESSION_ENABLED !== 'false',
      maxDiskUsagePercent: parseInt(process.env.LOG_MAX_DISK_USAGE_PERCENT || '10', 10),
      maxDiskUsageBytes: parseInt(process.env.LOG_MAX_DISK_USAGE_BYTES || '1073741824', 10), // 1GB default
    };

    this.stats = {
      lastRun: null,
      lastRunDuration: null,
      lastRotationCount: 0,
      lastCompressionCount: 0,
      lastDeletionCount: 0,
      lastDiskUsageBytes: 0,
      lastDiskUsagePercent: 0,
      totalRuns: 0,
      totalRotated: 0,
      totalCompressed: 0,
      totalDeleted: 0,
      errors: []
    };
  }

  /**
   * Start the log rotation job
   */
  start() {
    if (this.isRunning) {
      this.logger.warn('Log rotation job already running');
      return;
    }

    this.isRunning = true;
    this.logger.info('Starting log rotation job', {
      schedule: this.config.rotationSchedule,
      logDirectory: this.config.logDirectory,
      retentionDays: this.config.retentionDays,
      compressionEnabled: this.config.compressionEnabled
    });
  }

  /**
   * Stop the log rotation job
   */
  stop() {
    if (!this.isRunning) {
      this.logger.warn('Log rotation job not running');
      return;
    }

    this.isRunning = false;
    this.logger.info('Stopping log rotation job');
  }

  /**
   * Main execution method
   */
  async execute() {
    if (!this.isRunning) {
      this.logger.warn('Log rotation job not started, skipping execution');
      return;
    }

    const startTime = Date.now();
    this.logger.info('Starting log rotation execution');

    try {
      // Step 1: Rotate logs
      const rotationResults = await this.rotateLogs();

      // Step 2: Compress old logs
      const compressionResults = await this.compressOldLogs();

      // Step 3: Delete expired logs
      const deletionResults = await this.deleteExpiredLogs();

      // Step 4: Verify active logs preserved
      const verificationResults = await this.verifyActiveLogs();

      // Step 5: Monitor disk usage
      const diskUsageResults = await this.monitorDiskUsage();

      // Update stats
      const duration = Date.now() - startTime;
      this.updateStats({
        lastRun: new Date().toISOString(),
        lastRunDuration: duration,
        lastRotationCount: rotationResults.count,
        lastCompressionCount: compressionResults.count,
        lastDeletionCount: deletionResults.count,
        lastDiskUsageBytes: diskUsageResults.bytes,
        lastDiskUsagePercent: diskUsageResults.percent,
        totalRuns: this.stats.totalRuns + 1,
        totalRotated: this.stats.totalRotated + rotationResults.count,
        totalCompressed: this.stats.totalCompressed + compressionResults.count,
        totalDeleted: this.stats.totalDeleted + deletionResults.count
      });

      this.logger.info('Log rotation completed successfully', {
        duration: `${duration}ms`,
        rotated: rotationResults.count,
        compressed: compressionResults.count,
        deleted: deletionResults.count,
        verified: verificationResults.preserved,
        diskUsage: diskUsageResults
      });

      return {
        success: true,
        rotation: rotationResults,
        compression: compressionResults,
        deletion: deletionResults,
        verification: verificationResults,
        diskUsage: diskUsageResults,
        duration
      };

    } catch (error) {
      this.logger.error('Log rotation execution failed', {
        error: error.message,
        stack: error.stack
      });

      this.stats.errors.push({
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack
      });

      // Keep only last 10 errors
      if (this.stats.errors.length > 10) {
        this.stats.errors.shift();
      }

      throw error;
    }
  }

  /**
   * Step 1: Set up weekly log rotation
   */
  async rotateLogs() {
    this.logger.info('Starting log rotation', { logDirectory: this.config.logDirectory });

    const rotationCount = { count: 0, rotated: [] };

    try {
      // Ensure log directory exists
      if (!fs.existsSync(this.config.logDirectory)) {
        this.logger.info('Log directory does not exist, creating it');
        fs.mkdirSync(this.config.logDirectory, { recursive: true });
        return rotationCount;
      }

      // Get all log files
      const files = fs.readdirSync(this.config.logDirectory);
      const logFiles = files.filter(file =>
        file.endsWith('.log') &&
        !file.includes('.gz') &&
        !file.match(/\d{4}-\d{2}-\d{2}/)
      );

      this.logger.info('Found log files for rotation', { count: logFiles.length });

      // Rotate each log file
      for (const file of logFiles) {
        try {
          const filePath = path.join(this.config.logDirectory, file);
          const stats = fs.statSync(filePath);

          // Rotate if file exists and is not empty
          if (stats.size > 0) {
            const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const rotatedName = `${file}.${timestamp}`;

            const rotatedPath = path.join(this.config.logDirectory, rotatedName);

            // Check if rotated file already exists
            if (fs.existsSync(rotatedPath)) {
              this.logger.debug('Rotated file already exists, skipping', { file: rotatedName });
              continue;
            }

            // Rename to add date suffix
            fs.renameSync(filePath, rotatedPath);

            // Create new empty log file
            fs.writeFileSync(filePath, '');

            rotationCount.rotated.push({
              original: file,
              rotated: rotatedName,
              size: stats.size
            });
            rotationCount.count++;

            this.logger.debug('Log file rotated', {
              file,
              rotated: rotatedName,
              size: stats.size
            });
          }
        } catch (error) {
          this.logger.error('Failed to rotate log file', {
            file,
            error: error.message
          });
        }
      }

      this.logger.info('Log rotation completed', {
        count: rotationCount.count,
        files: rotationCount.rotated
      });

    } catch (error) {
      this.logger.error('Log rotation failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }

    return rotationCount;
  }

  /**
   * Step 2: Compress old logs
   */
  async compressOldLogs() {
    this.logger.info('Starting log compression');

    const compressionCount = { count: 0, compressed: [] };

    if (!this.config.compressionEnabled) {
      this.logger.info('Compression is disabled in configuration');
      return compressionCount;
    }

    try {
      const files = fs.readdirSync(this.config.logDirectory);

      // Find rotated logs (have date suffix) but not already compressed
      const rotatedLogs = files.filter(file =>
        file.match(/\.log\.\d{4}-\d{2}-\d{2}$/) &&
        !file.endsWith('.gz')
      );

      this.logger.info('Found rotated logs for compression', { count: rotatedLogs.length });

      // Compress each rotated log
      for (const file of rotatedLogs) {
        try {
          const filePath = path.join(this.config.logDirectory, file);
          const compressedPath = `${filePath}.gz`;

          // Skip if already compressed
          if (fs.existsSync(compressedPath)) {
            this.logger.debug('Compressed file already exists', { file: compressedPath });
            continue;
          }

          // Compress using gzip
          await this.compressFile(filePath, compressedPath);

          // Get file sizes
          const originalSize = fs.statSync(filePath).size;
          const compressedSize = fs.statSync(compressedPath).size;
          const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(2);

          // Delete original after successful compression
          fs.unlinkSync(filePath);

          compressionCount.compressed.push({
            file,
            compressed: `${file}.gz`,
            originalSize,
            compressedSize,
            compressionRatio: `${compressionRatio}%`
          });
          compressionCount.count++;

          this.logger.debug('Log file compressed', {
            file,
            originalSize,
            compressedSize,
            compressionRatio
          });

        } catch (error) {
          this.logger.error('Failed to compress log file', {
            file,
            error: error.message
          });
        }
      }

      this.logger.info('Log compression completed', {
        count: compressionCount.count,
        files: compressionCount.compressed
      });

    } catch (error) {
      this.logger.error('Log compression failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }

    return compressionCount;
  }

  /**
   * Compress a single file using gzip
   */
  async compressFile(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      const gzip = exec(`gzip -c "${inputPath}" > "${outputPath}"`, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Step 3: Delete logs older than retention period
   */
  async deleteExpiredLogs() {
    this.logger.info('Starting expired log deletion', {
      retentionDays: this.config.retentionDays
    });

    const deletionCount = { count: 0, deleted: [] };

    try {
      const files = fs.readdirSync(this.config.logDirectory);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      // Find all log files (including compressed)
      const allLogs = files.filter(file =>
        file.endsWith('.log') || file.endsWith('.log.gz')
      );

      this.logger.info('Found log files for deletion check', { count: allLogs.length });

      for (const file of allLogs) {
        try {
          const filePath = path.join(this.config.logDirectory, file);
          const stats = fs.statSync(filePath);
          const fileDate = stats.mtime;

          // Skip active log files (no date suffix)
          if (!file.match(/\d{4}-\d{2}-\d{2}/)) {
            continue;
          }

          // Delete if older than retention period
          if (fileDate < cutoffDate) {
            const size = stats.size;
            fs.unlinkSync(filePath);

            deletionCount.deleted.push({
              file,
              size,
              age: Math.floor((cutoffDate - fileDate) / (1000 * 60 * 60 * 24))
            });
            deletionCount.count++;

            this.logger.debug('Expired log file deleted', {
              file,
              ageDays: Math.floor((cutoffDate - fileDate) / (1000 * 60 * 60 * 24))
            });
          }

        } catch (error) {
          this.logger.error('Failed to delete log file', {
            file,
            error: error.message
          });
        }
      }

      this.logger.info('Expired log deletion completed', {
        count: deletionCount.count,
        files: deletionCount.deleted
      });

    } catch (error) {
      this.logger.error('Expired log deletion failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }

    return deletionCount;
  }

  /**
   * Step 4: Verify active logs are preserved
   */
  async verifyActiveLogs() {
    this.logger.info('Starting active log verification');

    const verificationResults = { preserved: 0, missing: [], verified: [] };

    try {
      const expectedActiveLogs = ['combined.log', 'error.log'];

      for (const logName of expectedActiveLogs) {
        const logPath = path.join(this.config.logDirectory, logName);

        if (fs.existsSync(logPath)) {
          const stats = fs.statSync(logPath);
          verificationResults.verified.push({
            file: logName,
            size: stats.size,
            modified: stats.mtime
          });
          verificationResults.preserved++;

          this.logger.debug('Active log verified', { file: logName });
        } else {
          verificationResults.missing.push(logName);
          this.logger.warn('Active log file missing', { file: logName });

          // Recreate missing active log
          fs.writeFileSync(logPath, '');
          this.logger.info('Recreated missing active log', { file: logName });
        }
      }

      this.logger.info('Active log verification completed', {
        preserved: verificationResults.preserved,
        missing: verificationResults.missing.length
      });

    } catch (error) {
      this.logger.error('Active log verification failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }

    return verificationResults;
  }

  /**
   * Step 5: Monitor log disk usage
   */
  async monitorDiskUsage() {
    this.logger.info('Starting disk usage monitoring');

    try {
      // Ensure log directory exists
      if (!fs.existsSync(this.config.logDirectory)) {
        return {
          bytes: 0,
          percent: 0,
          files: 0,
          maxBytes: this.config.maxDiskUsageBytes,
          maxPercent: this.config.maxDiskUsagePercent,
          status: 'no-logs'
        };
      }

      const files = fs.readdirSync(this.config.logDirectory);
      let totalBytes = 0;
      const fileDetails = [];

      for (const file of files) {
        const filePath = path.join(this.config.logDirectory, file);
        try {
          const stats = fs.statSync(filePath);
          totalBytes += stats.size;
          fileDetails.push({
            file,
            size: stats.size,
            modified: stats.mtime
          });
        } catch (error) {
          // Skip files that can't be read
        }
      }

      const usagePercent = this.config.maxDiskUsageBytes > 0
        ? (totalBytes / this.config.maxDiskUsageBytes * 100).toFixed(2)
        : 0;

      const status = totalBytes > this.config.maxDiskUsageBytes
        ? 'exceeds-max-bytes'
        : parseFloat(usagePercent) > this.config.maxDiskUsagePercent
        ? 'exceeds-max-percent'
        : 'normal';

      const diskUsageResults = {
        bytes: totalBytes,
        percent: parseFloat(usagePercent),
        files: files.length,
        maxBytes: this.config.maxDiskUsageBytes,
        maxPercent: this.config.maxDiskUsagePercent,
        status,
        fileDetails
      };

      this.logger.info('Disk usage monitoring completed', diskUsageResults);

      // Alert if exceeding thresholds
      if (status !== 'normal') {
        this.logger.warn('Log disk usage exceeds threshold', {
          status,
          bytes: totalBytes,
          percent: usagePercent,
          maxBytes: this.config.maxDiskUsageBytes,
          maxPercent: this.config.maxDiskUsagePercent
        });
      }

      return diskUsageResults;

    } catch (error) {
      this.logger.error('Disk usage monitoring failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get job statistics
   */
  getStats() {
    return {
      ...this.stats,
      config: this.config,
      isRunning: this.isRunning
    };
  }

  /**
   * Get configuration
   */
  getConfig() {
    return this.config;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };

    this.logger.info('Configuration updated', { config: this.config });
  }

  /**
   * Update statistics
   */
  updateStats(updates) {
    this.stats = {
      ...this.stats,
      ...updates
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      lastRun: null,
      lastRunDuration: null,
      lastRotationCount: 0,
      lastCompressionCount: 0,
      lastDeletionCount: 0,
      lastDiskUsageBytes: 0,
      lastDiskUsagePercent: 0,
      totalRuns: 0,
      totalRotated: 0,
      totalCompressed: 0,
      totalDeleted: 0,
      errors: []
    };

    this.logger.info('Statistics reset');
  }

  /**
   * Get log files list
   */
  async listLogFiles() {
    try {
      if (!fs.existsSync(this.config.logDirectory)) {
        return [];
      }

      const files = fs.readdirSync(this.config.logDirectory);
      const logFiles = files.map(file => {
        const filePath = path.join(this.config.logDirectory, file);
        try {
          const stats = fs.statSync(filePath);
          return {
            name: file,
            size: stats.size,
            modified: stats.mtime,
            created: stats.birthtime
          };
        } catch (error) {
          return {
            name: file,
            size: 0,
            modified: null,
            created: null,
            error: error.message
          };
        }
      });

      // Sort by modification time (newest first)
      logFiles.sort((a, b) => b.modified - a.modified);

      return logFiles;

    } catch (error) {
      this.logger.error('Failed to list log files', {
        error: error.message
      });
      throw error;
    }
  }
}

export default new LogRotationJob();
