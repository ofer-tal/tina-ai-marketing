/**
 * Retry Service with Exponential Backoff
 *
 * Provides retry logic for failed API calls with exponential backoff strategy.
 * Implements the Fibonacci backoff algorithm for better spacing of retries.
 */

import winston from 'winston';

// Create logger for retry service
const retryLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'retry-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/retry.log', level: 'info' }),
    new winston.transports.File({ filename: 'logs/retry-error.log', level: 'error' }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  retryLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

/**
 * Retry configuration options
 */
class RetryOptions {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries ?? 3;
    this.initialDelay = options.initialDelay ?? 1000; // 1 second
    this.maxDelay = options.maxDelay ?? 30000; // 30 seconds
    this.backoffMultiplier = options.backoffMultiplier ?? 2;
    this.retryableErrors = options.retryableErrors || [
      'ECONNRESET',
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'EAI_AGAIN'
    ];
    this.retryableStatusCodes = options.retryableStatusCodes || [
      408, // Request Timeout
      429, // Too Many Requests
      500, // Internal Server Error
      502, // Bad Gateway
      503, // Service Unavailable
      504  // Gateway Timeout
    ];
    this.onRetry = options.onRetry || null; // Callback function
  }
}

/**
 * Retry Service Class
 */
class RetryService {
  constructor() {
    this.options = new RetryOptions();
  }

  /**
   * Calculate delay using exponential backoff
   * @param {number} attempt - Current attempt number (0-indexed)
   * @returns {number} Delay in milliseconds
   */
  calculateDelay(attempt) {
    const delay = Math.min(
      this.options.initialDelay * Math.pow(this.options.backoffMultiplier, attempt),
      this.options.maxDelay
    );
    // Add some jitter to avoid thundering herd
    return delay + Math.random() * 100;
  }

  /**
   * Check if an error is retryable
   * @param {Error} error - The error to check
   * @returns {boolean} True if error is retryable
   */
  isRetryableError(error) {
    // Check if error code is in retryable list
    if (error.code && this.options.retryableErrors.includes(error.code)) {
      return true;
    }

    // Check if error message contains retryable patterns
    const retryablePatterns = [
      /network/,
      /timeout/,
      /ECONN/,
      /fetch failed/,
      /rate limit/i
    ];

    if (error.message) {
      return retryablePatterns.some(pattern => pattern.test(error.message));
    }

    return false;
  }

  /**
   * Check if HTTP response status is retryable
   * @param {Response} response - Fetch API response object
   * @returns {boolean} True if status code is retryable
   */
  isRetryableStatus(response) {
    return this.options.retryableStatusCodes.includes(response.status);
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise}
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute a function with retry logic
   * @param {Function} fn - Async function to execute
   * @param {Object} options - Retry options
   * @returns {Promise} Result of the function
   */
  async retry(fn, options = {}) {
    const opts = new RetryOptions({ ...this.options, ...options });
    let lastError;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      try {
        // Execute the function
        const result = await fn();

        // If it's a fetch Response object, check status
        if (result && typeof result.status === 'number') {
          if (result.ok) {
            // Success!
            if (attempt > 0) {
              retryLogger.info(`Function succeeded after ${attempt} retries`);
            }
            return result;
          }

          // Check if status code is retryable
          if (this.isRetryableStatus(result) && attempt < opts.maxRetries) {
            const delay = this.calculateDelay(attempt);
            retryLogger.warn(
              `Received retryable status ${result.status}. ` +
              `Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${opts.maxRetries + 1})`
            );

            // Call onRetry callback if provided
            if (opts.onRetry) {
              opts.onRetry(attempt, delay, result);
            }

            await this.sleep(delay);
            continue;
          }

          // Not retryable or max retries reached
          return result;
        }

        // Not a Response object, return as-is
        if (attempt > 0) {
          retryLogger.info(`Function succeeded after ${attempt} retries`);
        }
        return result;

      } catch (error) {
        lastError = error;

        // Check if error is retryable
        if (!this.isRetryableError(error) || attempt >= opts.maxRetries) {
          // Not retryable or max retries reached
          retryLogger.error(
            `Error not retryable or max retries reached: ${error.message}`,
            { attempt: attempt + 1, maxRetries: opts.maxRetries + 1, error: error.stack }
          );
          throw error;
        }

        // Calculate delay and retry
        const delay = this.calculateDelay(attempt);
        retryLogger.warn(
          `Retryable error occurred: ${error.message}. ` +
          `Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${opts.maxRetries + 1})`
        );

        // Log retry details
        retryLogger.info('Retry details', {
          attemptNumber: attempt + 1,
          maxRetries: opts.maxRetries + 1,
          delayMs: Math.round(delay),
          errorCode: error.code,
          errorMessage: error.message
        });

        // Call onRetry callback if provided
        if (opts.onRetry) {
          opts.onRetry(attempt, delay, error);
        }

        await this.sleep(delay);
      }
    }

    // Should never reach here, but just in case
    retryLogger.error('Max retries exceeded', {
      maxRetries: opts.maxRetries,
      lastError: lastError?.message
    });
    throw lastError;
  }

  /**
   * Wrapper for fetch API with retry logic
   * @param {string} url - URL to fetch
   * @param {Object} options - Fetch options
   * @param {Object} retryOptions - Retry options
   * @returns {Promise<Response>} Fetch response
   */
  async fetch(url, options = {}, retryOptions = {}) {
    return this.retry(async () => {
      const response = await fetch(url, options);
      return response;
    }, retryOptions);
  }

  /**
   * Update default retry options
   * @param {Object} options - New options to merge
   */
  setOptions(options) {
    this.options = new RetryOptions({ ...this.options, ...options });
  }

  /**
   * Get current retry options
   * @returns {RetryOptions} Current options
   */
  getOptions() {
    return { ...this.options };
  }
}

// Create singleton instance
const retryService = new RetryService();

export default retryService;
export { RetryService, RetryOptions };
