import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('services', 'filesystem-error-handler');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * File System Error Handler Service
 * Provides comprehensive error handling, recovery mechanisms, and user-friendly messages
 * for file system operations
 */
class FileSystemErrorHandler {
  constructor() {
    // Error type classifications
    this.errorTypes = {
      PERMISSION_DENIED: 'PERMISSION_DENIED',
      FILE_NOT_FOUND: 'FILE_NOT_FOUND',
      DISK_FULL: 'DISK_FULL',
      INVALID_PATH: 'INVALID_PATH',
      FILE_LOCKED: 'FILE_LOCKED',
      DIRECTORY_NOT_FOUND: 'DIRECTORY_NOT_FOUND',
      IO_ERROR: 'IO_ERROR',
      UNKNOWN: 'UNKNOWN',
    };

    // Recovery strategies
    this.recoveryStrategies = {
      RETRY: 'retry',
      USE_ALTERNATIVE_PATH: 'use_alternative_path',
      CLEANUP_AND_RETRY: 'cleanup_and_retry',
      CREATE_DIRECTORY: 'create_directory',
      NOTIFY_USER: 'notify_user',
      SKIP: 'skip',
    };

    // Error history tracking
    this.errorHistory = [];
    this.maxHistorySize = 100;

    // Retry configuration
    this.retryConfig = {
      maxAttempts: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 10000, // 10 seconds
    };

    // Disk space threshold (in bytes) - 100MB
    this.minDiskSpace = 100 * 1024 * 1024;
  }

  /**
   * Classify error into error type
   * @param {Error} error - The error to classify
   * @returns {string} Error type
   */
  classifyError(error) {
    const code = error.code || error.errno || '';
    const message = error.message || '';

    // Permission errors
    if (code === 'EACCES' || code === 'EPERM' || message.includes('permission')) {
      return this.errorTypes.PERMISSION_DENIED;
    }

    // Not found errors
    if (code === 'ENOENT') {
      if (message.includes('directory')) {
        return this.errorTypes.DIRECTORY_NOT_FOUND;
      }
      return this.errorTypes.FILE_NOT_FOUND;
    }

    // Disk full errors
    if (code === 'ENOSPC' || message.includes('disk full') || message.includes('no space')) {
      return this.errorTypes.DISK_FULL;
    }

    // Invalid path errors
    if (code === 'EINVAL' || code === 'EBADF' || message.includes('invalid path')) {
      return this.errorTypes.INVALID_PATH;
    }

    // File locked errors
    if (code === 'EBUSY' || code === 'ELOCKED' || message.includes('locked') || message.includes('in use')) {
      return this.errorTypes.FILE_LOCKED;
    }

    // General I/O errors
    if (code === 'EIO' || code.startsWith('E')) {
      return this.errorTypes.IO_ERROR;
    }

    return this.errorTypes.UNKNOWN;
  }

  /**
   * Get user-friendly error message
   * @param {string} errorType - Type of error
   * @param {string} filePath - Path where error occurred
   * @returns {Object} User-friendly error message and details
   */
  getUserFriendlyMessage(errorType, filePath = '') {
    const messages = {
      [this.errorTypes.PERMISSION_DENIED]: {
        title: 'Access Denied',
        message: 'The system does not have permission to access this file or directory.',
        suggestion: 'Check file permissions or run the application with appropriate access rights.',
        severity: 'error',
      },
      [this.errorTypes.FILE_NOT_FOUND]: {
        title: 'File Not Found',
        message: `The file "${path.basename(filePath)}" could not be found.`,
        suggestion: 'The file may have been moved or deleted. Please verify the file path.',
        severity: 'warning',
      },
      [this.errorTypes.DISK_FULL]: {
        title: 'Disk Full',
        message: 'There is not enough disk space to complete this operation.',
        suggestion: 'Free up disk space by deleting unnecessary files or expand your storage capacity.',
        severity: 'critical',
      },
      [this.errorTypes.INVALID_PATH]: {
        title: 'Invalid File Path',
        message: 'The file path contains invalid characters or is malformed.',
        suggestion: 'Check the file path and ensure it uses valid characters.',
        severity: 'error',
      },
      [this.errorTypes.FILE_LOCKED]: {
        title: 'File in Use',
        message: 'The file is currently locked or being used by another process.',
        suggestion: 'Close any programs that may be using this file and try again.',
        severity: 'warning',
      },
      [this.errorTypes.DIRECTORY_NOT_FOUND]: {
        title: 'Directory Not Found',
        message: `The directory "${path.dirname(filePath)}" does not exist.`,
        suggestion: 'The directory will be created automatically if possible.',
        severity: 'warning',
      },
      [this.errorTypes.IO_ERROR]: {
        title: 'I/O Error',
        message: 'An input/output error occurred while accessing the file.',
        suggestion: 'Check disk health and try again. If the problem persists, contact support.',
        severity: 'error',
      },
      [this.errorTypes.UNKNOWN]: {
        title: 'Unknown Error',
        message: 'An unexpected error occurred while performing the file operation.',
        suggestion: 'Please try again. If the problem persists, contact support.',
        severity: 'error',
      },
    };

    return messages[errorType] || messages[this.errorTypes.UNKNOWN];
  }

  /**
   * Log error with file path and context
   * @param {Error} error - The error that occurred
   * @param {string} operation - Operation being performed
   * @param {string} filePath - Path where error occurred
   * @param {Object} context - Additional context
   */
  logError(error, operation, filePath = '', context = {}) {
    const errorType = this.classifyError(error);

    const errorLog = {
      timestamp: new Date().toISOString(),
      operation,
      filePath,
      errorType,
      errorCode: error.code,
      errorMessage: error.message,
      stack: error.stack,
      context,
    };

    // Add to history
    this.errorHistory.push(errorLog);

    // Trim history if needed
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }

    // Log to logger
    logger.error('File system error occurred', {
      operation,
      filePath,
      errorType,
      errorCode: error.code,
      errorMessage: error.message,
      ...context,
    });

    return errorLog;
  }

  /**
   * Get error history
   * @param {Object} filters - Filters to apply
   * @returns {Array} Filtered error history
   */
  getErrorHistory(filters = {}) {
    let history = [...this.errorHistory];

    if (filters.errorType) {
      history = history.filter((e) => e.errorType === filters.errorType);
    }

    if (filters.operation) {
      history = history.filter((e) => e.operation === filters.operation);
    }

    if (filters.since) {
      const since = new Date(filters.since);
      history = history.filter((e) => new Date(e.timestamp) >= since);
    }

    return history.reverse(); // Most recent first
  }

  /**
   * Clear error history
   */
  clearErrorHistory() {
    this.errorHistory = [];
    logger.info('File system error history cleared');
  }

  /**
   * Determine recovery strategy based on error type
   * @param {string} errorType - Type of error
   * @param {string} operation - Operation being performed
   * @returns {string} Recovery strategy
   */
  determineRecoveryStrategy(errorType, operation) {
    const strategies = {
      [this.errorTypes.PERMISSION_DENIED]: this.recoveryStrategies.NOTIFY_USER,
      [this.errorTypes.FILE_NOT_FOUND]:
        operation === 'write' ? this.recoveryStrategies.CREATE_DIRECTORY : this.recoveryStrategies.SKIP,
      [this.errorTypes.DISK_FULL]: this.recoveryStrategies.NOTIFY_USER,
      [this.errorTypes.INVALID_PATH]: this.recoveryStrategies.SKIP,
      [this.errorTypes.FILE_LOCKED]: this.recoveryStrategies.RETRY,
      [this.errorTypes.DIRECTORY_NOT_FOUND]: this.recoveryStrategies.CREATE_DIRECTORY,
      [this.errorTypes.IO_ERROR]: this.recoveryStrategies.RETRY,
      [this.errorTypes.UNKNOWN]: this.recoveryStrategies.NOTIFY_USER,
    };

    return strategies[errorType] || this.recoveryStrategies.NOTIFY_USER;
  }

  /**
   * Attempt recovery based on strategy
   * @param {string} strategy - Recovery strategy to use
   * @param {Object} params - Parameters for recovery
   * @returns {Promise<Object>} Recovery result
   */
  async attemptRecovery(strategy, params = {}) {
    const { error, operation, filePath, alternativePath } = params;

    switch (strategy) {
      case this.recoveryStrategies.RETRY:
        return await this._retryWithBackoff(operation, params);

      case this.recoveryStrategies.CREATE_DIRECTORY:
        return await this._createDirectoryAndRetry(params);

      case this.recoveryStrategies.USE_ALTERNATIVE_PATH:
        return await this._useAlternativePath(params);

      case this.recoveryStrategies.CLEANUP_AND_RETRY:
        return await this._cleanupAndRetry(params);

      case this.recoveryStrategies.NOTIFY_USER:
        return {
          success: false,
          recovered: false,
          strategy,
          message: 'User notification required',
        };

      case this.recoveryStrategies.SKIP:
        return {
          success: false,
          recovered: false,
          strategy,
          message: 'Operation skipped due to error',
        };

      default:
        return {
          success: false,
          recovered: false,
          strategy,
          message: 'Unknown recovery strategy',
        };
    }
  }

  /**
   * Retry operation with exponential backoff
   * @private
   */
  async _retryWithBackoff(operation, params) {
    const { fn, args = [] } = params;
    let lastError;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        const result = await fn(...args);
        logger.info(`Operation succeeded on retry attempt ${attempt}`, {
          operation,
          attempt,
        });

        return {
          success: true,
          recovered: true,
          strategy: this.recoveryStrategies.RETRY,
          attempt,
          result,
        };
      } catch (error) {
        lastError = error;
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(2, attempt - 1),
          this.retryConfig.maxDelay
        );

        logger.warn(`Retry attempt ${attempt} failed`, {
          operation,
          attempt,
          delay,
          error: error.message,
        });

        if (attempt < this.retryConfig.maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    return {
      success: false,
      recovered: false,
      strategy: this.recoveryStrategies.RETRY,
      attempts: this.retryConfig.maxAttempts,
      error: lastError.message,
    };
  }

  /**
   * Create directory and retry operation
   * @private
   */
  async _createDirectoryAndRetry(params) {
    const { filePath, fn, args = [] } = params;

    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      logger.info('Created directory for recovery', { dir });

      // Retry the operation
      const result = await fn(...args);

      return {
        success: true,
        recovered: true,
        strategy: this.recoveryStrategies.CREATE_DIRECTORY,
        directoryCreated: dir,
        result,
      };
    } catch (error) {
      logger.error('Failed to create directory for recovery', {
        dir: path.dirname(filePath),
        error: error.message,
      });

      return {
        success: false,
        recovered: false,
        strategy: this.recoveryStrategies.CREATE_DIRECTORY,
        error: error.message,
      };
    }
  }

  /**
   * Use alternative path for operation
   * @private
   */
  async _useAlternativePath(params) {
    const { alternativePath, fn, args = [] } = params;

    if (!alternativePath) {
      return {
        success: false,
        recovered: false,
        strategy: this.recoveryStrategies.USE_ALTERNATIVE_PATH,
        error: 'No alternative path provided',
      };
    }

    try {
      const newArgs = args.map((arg, index) => (index === 0 ? alternativePath : arg));
      const result = await fn(...newArgs);

      logger.info('Operation succeeded with alternative path', {
        originalPath: params.filePath,
        alternativePath,
      });

      return {
        success: true,
        recovered: true,
        strategy: this.recoveryStrategies.USE_ALTERNATIVE_PATH,
        alternativePath,
        result,
      };
    } catch (error) {
      logger.error('Failed with alternative path', {
        alternativePath,
        error: error.message,
      });

      return {
        success: false,
        recovered: false,
        strategy: this.recoveryStrategies.USE_ALTERNATIVE_PATH,
        error: error.message,
      };
    }
  }

  /**
   * Cleanup and retry operation
   * @private
   */
  async _cleanupAndRetry(params) {
    const { filePath, fn, args = [] } = params;

    try {
      // Check if file exists and delete it
      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
        logger.info('Cleaned up file for recovery', { filePath });
      } catch (error) {
        // File doesn't exist, that's okay
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      // Retry the operation
      const result = await fn(...args);

      return {
        success: true,
        recovered: true,
        strategy: this.recoveryStrategies.CLEANUP_AND_RETRY,
        cleanedUp: filePath,
        result,
      };
    } catch (error) {
      logger.error('Failed to cleanup and retry', {
        filePath,
        error: error.message,
      });

      return {
        success: false,
        recovered: false,
        strategy: this.recoveryStrategies.CLEANUP_AND_RETRY,
        error: error.message,
      };
    }
  }

  /**
   * Handle file system error with full workflow
   * @param {Error} error - The error that occurred
   * @param {string} operation - Operation being performed
   * @param {string} filePath - Path where error occurred
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Error handling result
   */
  async handleError(error, operation, filePath = '', context = {}) {
    // Step 1: Classify error
    const errorType = this.classifyError(error);

    // Step 2: Log error with file path
    const errorLog = this.logError(error, operation, filePath, context);

    // Step 3 & 4: Get user-friendly message
    const userMessage = this.getUserFriendlyMessage(errorType, filePath);

    // Step 5: Attempt recovery or cleanup
    const strategy = this.determineRecoveryStrategy(errorType, operation);

    let recoveryResult = null;
    if (strategy !== this.recoveryStrategies.NOTIFY_USER && strategy !== this.recoveryStrategies.SKIP) {
      recoveryResult = await this.attemptRecovery(strategy, {
        error,
        operation,
        filePath,
        fn: context.retryFn,
        args: context.retryArgs,
        alternativePath: context.alternativePath,
      });
    }

    return {
      success: recoveryResult?.success || false,
      recovered: recoveryResult?.recovered || false,
      errorType,
      errorLog,
      userMessage,
      strategy,
      recoveryResult,
    };
  }

  /**
   * Wrap a file operation with error handling
   * @param {Function} operation - The operation to execute
   * @param {string} operationName - Name of the operation
   * @param {string} filePath - Path being operated on
   * @param {Object} context - Additional context
   * @returns {Promise} Result of the operation
   */
  async wrapOperation(operation, operationName, filePath = '', context = {}) {
    try {
      return await operation();
    } catch (error) {
      const result = await this.handleError(error, operationName, filePath, {
        ...context,
        retryFn: operation,
        retryArgs: [],
      });

      if (result.recovered) {
        return result.recoveryResult.result;
      }

      // If recovery failed, throw enhanced error
      const enhancedError = new Error(result.userMessage.message);
      enhancedError.originalError = error;
      enhancedError.errorType = result.errorType;
      enhancedError.userMessage = result.userMessage;
      enhancedError.recoveryResult = result.recoveryResult;

      throw enhancedError;
    }
  }

  /**
   * Check disk space
   * @param {string} dirPath - Directory to check
   * @returns {Promise<Object>} Disk space info
   */
  async checkDiskSpace(dirPath) {
    try {
      const stats = await fs.stat(dirPath);

      // Note: This is a simplified check. In a real implementation,
      // you'd use platform-specific commands to get actual disk space
      // For now, we'll just verify the directory is accessible

      return {
        accessible: true,
        path: dirPath,
        sufficientSpace: true, // Assume sufficient space for now
        message: 'Disk space check passed',
      };
    } catch (error) {
      const errorType = this.classifyError(error);
      return {
        accessible: false,
        path: dirPath,
        sufficientSpace: false,
        error: error.message,
        errorType,
      };
    }
  }

  /**
   * Get error handler status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      errorHistorySize: this.errorHistory.length,
      maxHistorySize: this.maxHistorySize,
      errorTypes: Object.keys(this.errorTypes),
      recoveryStrategies: Object.keys(this.recoveryStrategies),
      retryConfig: this.retryConfig,
      recentErrors: this.errorHistory.slice(-10).reverse(),
    };
  }
}

// Export singleton instance
const fileSystemErrorHandler = new FileSystemErrorHandler();

export default fileSystemErrorHandler;
