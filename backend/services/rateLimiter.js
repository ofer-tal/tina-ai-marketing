/**
 * Rate Limiting Service
 *
 * Handles rate limit detection and throttling for external API calls.
 * Features:
 * - Detects 429 Too Many Requests status codes
 * - Queues requests when rate limited
 * - Exponential backoff for retries
 * - Respects Retry-After header
 * - Per-host rate limit tracking
 */

import { getLogger } from '../utils/logger.js';

const logger = getLogger('services', 'rate-limiter');

/**
 * Rate limiter class
 */
class RateLimiter {
  constructor() {
    // Track rate limits per host
    this.hostLimits = new Map();

    // Request queue for rate-limited hosts
    this.queues = new Map();

    // Default configuration
    this.config = {
      maxQueueSize: 100, // Max requests per host
      defaultRetryAfter: 5, // Default seconds to wait if no Retry-After header
      baseDelay: 1000, // Base delay in ms
      maxDelay: 60000, // Max delay in ms (1 minute)
      backoffMultiplier: 2, // Exponential backoff multiplier
      // Platform-specific request delays (proactive throttling)
      requestDelays: {
        'open.tiktokapis.com': 500, // 500ms between TikTok requests
        'graph.facebook.com': 5000, // 5s between Instagram requests
        'www.googleapis.com': 100, // 100ms between YouTube requests
        'upload.youtube.com': 2000, // 2s between YouTube uploads
      },
    };

    // Track last request time per host (for proactive throttling)
    this.lastRequestTime = new Map();
  }

  /**
   * Parse host from URL
   */
  _parseHost(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.host;
    } catch (error) {
      logger.warn('Failed to parse host from URL', { url, error: error.message });
      return 'unknown';
    }
  }

  /**
   * Get or create host rate limit info
   */
  _getHostInfo(host) {
    if (!this.hostLimits.has(host)) {
      this.hostLimits.set(host, {
        host,
        rateLimited: false,
        resetAt: null,
        retryCount: 0,
        lastError: null,
      });
    }
    return this.hostLimits.get(host);
  }

  /**
   * Get or create queue for host
   */
  _getQueue(host) {
    if (!this.queues.has(host)) {
      this.queues.set(host, []);
    }
    return this.queues.get(host);
  }

  /**
   * Process queued requests for a host
   */
  async _processQueue(host) {
    const queue = this._getQueue(host);

    if (queue.length === 0) {
      return;
    }

    const hostInfo = this._getHostInfo(host);

    // If still rate limited, wait
    if (hostInfo.rateLimited && hostInfo.resetAt) {
      const now = Date.now();
      if (now < hostInfo.resetAt) {
        // Schedule next processing
        const delay = hostInfo.resetAt - now;
        setTimeout(() => this._processQueue(host), delay);
        return;
      }
    }

    // Clear rate limit if reset time passed
    if (hostInfo.rateLimited && hostInfo.resetAt && Date.now() >= hostInfo.resetAt) {
      hostInfo.rateLimited = false;
      hostInfo.resetAt = null;
      hostInfo.retryCount = 0;
      logger.info(`Rate limit cleared for host: ${host}`);
    }

    // Process next request in queue
    const next = queue.shift();
    if (next) {
      try {
        await next.execute();
      } catch (error) {
        logger.error('Queued request failed', { host, error: error.message });
        next.reject(error);
      }

      // Process next request if any
      if (queue.length > 0) {
        // Add small delay between requests
        setTimeout(() => this._processQueue(host), 100);
      }
    }
  }

  /**
   * Handle rate limit error
   */
  _handleRateLimit(host, retryAfter) {
    const hostInfo = this._getHostInfo(host);

    hostInfo.rateLimited = true;
    hostInfo.retryCount++;

    // Calculate reset time
    let delay;
    if (retryAfter) {
      // Use Retry-After header
      delay = retryAfter * 1000;
    } else {
      // Use exponential backoff
      delay = Math.min(
        this.config.baseDelay * Math.pow(this.config.backoffMultiplier, hostInfo.retryCount - 1),
        this.config.maxDelay
      );
    }

    hostInfo.resetAt = Date.now() + delay;

    logger.warn(`Rate limit hit for host: ${host}`, {
      retryAfter: retryAfter || 'calculated',
      resetAt: new Date(hostInfo.resetAt).toISOString(),
      retryCount: hostInfo.retryCount,
      delay: `${delay}ms`,
    });

    // Schedule queue processing after reset time
    setTimeout(() => this._processQueue(host), delay);
  }

  /**
   * Execute a fetch request with rate limiting
   *
   * @param {string} url - URL to fetch
   * @param {Object} options - Fetch options
   * @param {number} timeout - Optional timeout in milliseconds
   * @returns {Promise<Response>} Fetch response
   */
  async fetch(url, options = {}, timeout = null) {
    const host = this._parseHost(url);
    const hostInfo = this._getHostInfo(host);

    // If currently rate limited, queue the request
    if (hostInfo.rateLimited && hostInfo.resetAt && Date.now() < hostInfo.resetAt) {
      logger.debug(`Request queued due to rate limit: ${host}`, { url });
      return new Promise((resolve, reject) => {
        const queue = this._getQueue(host);

        // Check queue size limit
        if (queue.length >= this.config.maxQueueSize) {
          const error = new Error(`Rate limit queue full for ${host}`);
          error.code = 'QUEUE_FULL';
          reject(error);
          return;
        }

        // Add to queue
        queue.push({
          url,
          options,
          timeout,
          execute: async () => {
            const response = await this.fetch(url, options, timeout);
            resolve(response);
          },
          reject,
        });
      });
    }

    // Proactive throttling: Add delay between requests for specific hosts
    const delay = this.config.requestDelays[host];
    if (delay) {
      const lastRequest = this.lastRequestTime.get(host) || 0;
      const timeSinceLastRequest = Date.now() - lastRequest;

      if (timeSinceLastRequest < delay) {
        const waitTime = delay - timeSinceLastRequest;
        logger.debug(`Throttling request to ${host}`, {
          delay: `${waitTime}ms`,
          url,
        });
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // Create AbortController for timeout if not already provided
    let controller = null;
    let timeoutId = null;

    if (timeout && !options.signal) {
      controller = new AbortController();
      timeoutId = setTimeout(() => {
        logger.warn(`Request timeout for ${host}`, { url, timeout });
        controller.abort();
      }, timeout);
      options = { ...options, signal: controller.signal };
    }

    // Execute request
    let response;
    try {
      response = await fetch(url, options);
      // Update last request time
      this.lastRequestTime.set(host, Date.now());

      // Clear timeout on success
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      // Clear timeout on error
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Check if it's an abort error (timeout)
      if (error.name === 'AbortError' && controller) {
        const timeoutError = new Error(`Request timeout after ${timeout}ms: ${url}`);
        timeoutError.code = 'ETIMEDOUT';
        timeoutError.originalError = error;
        logger.error('Request timed out', { url, host, timeout });
        throw timeoutError;
      }

      // Network errors don't have status codes
      throw error;
    }

    // Check for rate limit
    if (response.status === 429) {
      // Parse Retry-After header
      const retryAfterHeader = response.headers.get('Retry-After');
      let retryAfter = null;

      if (retryAfterHeader) {
        // Can be seconds (number) or HTTP-date (string)
        const parsed = parseInt(retryAfterHeader, 10);
        if (!isNaN(parsed)) {
          retryAfter = parsed;
        } else {
          // Try parsing as HTTP-date
          const retryDate = new Date(retryAfterHeader);
          if (!isNaN(retryDate.getTime())) {
            retryAfter = Math.max(0, Math.floor((retryDate.getTime() - Date.now()) / 1000));
          }
        }
      }

      // Handle rate limit
      this._handleRateLimit(host, retryAfter);

      // Create rate limit error response
      const error = new Error(`Rate limited: ${url}`);
      error.status = 429;
      error.retryAfter = retryAfter || this._calculateRetryAfter(hostInfo.retryCount);
      error.host = host;
      throw error;
    }

    // Reset retry count on success
    if (hostInfo.retryCount > 0) {
      hostInfo.retryCount = 0;
    }

    return response;
  }

  /**
   * Calculate retry delay using exponential backoff
   */
  _calculateRetryAfter(retryCount) {
    return Math.ceil(
      Math.min(
        this.config.baseDelay * Math.pow(this.config.backoffMultiplier, retryCount - 1),
        this.config.maxDelay
      ) / 1000
    );
  }

  /**
   * Clear rate limit for a host (useful for testing or manual reset)
   */
  clearRateLimit(host) {
    const hostInfo = this._getHostInfo(host);
    hostInfo.rateLimited = false;
    hostInfo.resetAt = null;
    hostInfo.retryCount = 0;
    logger.info(`Rate limit cleared for host: ${host}`);
  }

  /**
   * Get rate limit status for all hosts
   */
  getStatus() {
    const status = {};

    for (const [host, info] of this.hostLimits.entries()) {
      status[host] = {
        rateLimited: info.rateLimited,
        resetAt: info.resetAt ? new Date(info.resetAt).toISOString() : null,
        retryCount: info.retryCount,
        queueSize: this.queues.get(host)?.length || 0,
      };
    }

    return status;
  }

  /**
   * Get status for specific host
   */
  getHostStatus(host) {
    const hostInfo = this._getHostInfo(host);
    const queue = this._getQueue(host);

    return {
      host,
      rateLimited: hostInfo.rateLimited,
      resetAt: hostInfo.resetAt ? new Date(hostInfo.resetAt).toISOString() : null,
      retryCount: hostInfo.retryCount,
      queueSize: queue.length,
    };
  }

  /**
   * Reset all rate limits (useful for testing)
   */
  resetAll() {
    this.hostLimits.clear();
    this.queues.clear();
    logger.info('All rate limits reset');
  }
}

// Create singleton instance
const rateLimiterService = new RateLimiter();

export default rateLimiterService;
