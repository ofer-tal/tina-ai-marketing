/**
 * Base API Client
 *
 * Common functionality for all external API integrations.
 * Features:
 * - Authentication handling
 * - Error handling with retry logic
 * - Rate limiting integration
 * - Request/response logging
 */

import { getLogger } from '../utils/logger.js';
import retryService from './retry.js';
import rateLimiterService from './rateLimiter.js';

class BaseApiClient {
  constructor(config = {}) {
    this.name = config.name || 'BaseApiClient';
    this.baseURL = config.baseURL;
    this.timeout = config.timeout || 30000;
    this.retryConfig = config.retryConfig || {
      maxRetries: 3,
      initialDelay: 1000,
    };
    this.logger = getLogger('api', this.name.toLowerCase());
    this.rateLimiter = config.rateLimiter || rateLimiterService;
  }

  /**
   * Make authenticated API request
   */
  async request(endpoint, options = {}) {
    const url = this.baseURL + endpoint;

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal, // Add abort signal for timeout
      ...options,
    };

    // Add authentication headers
    if (this.getAuthHeaders) {
      const authHeaders = await this.getAuthHeaders();
      Object.assign(requestOptions.headers, authHeaders);
    }

    this.logger.debug('API Request', {
      method: requestOptions.method,
      url,
      headers: this._sanitizeHeaders(requestOptions.headers),
      timeout: this.timeout,
    });

    try {
      // Use rate limiter with timeout
      const response = await this.rateLimiter.fetch(url, requestOptions, this.timeout);

      // Clear timeout on success
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw await this._handleError(response);
      }

      const data = await response.json();

      this.logger.debug('API Response', {
        url,
        status: response.status,
      });

      return data;
    } catch (error) {
      // Clear timeout on error
      clearTimeout(timeoutId);

      return this._handleRequestError(error, url, requestOptions);
    }
  }

  /**
   * Handle HTTP error responses
   */
  async _handleError(response) {
    const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
    error.status = response.status;
    error.response = response;

    try {
      const data = await response.json();
      error.data = data;
    } catch (e) {
      // Not JSON, use text
      error.data = await response.text();
    }

    return error;
  }

  /**
   * Handle request errors with retry
   */
  async _handleRequestError(error, url, options) {
    // Log error
    this.logger.error('API request failed', {
      url,
      error: error.message,
      status: error.status,
      code: error.code,
    });

    // Check if retryable
    const isRetryable = this._isRetryableError(error);

    if (isRetryable && this.retryConfig.maxRetries > 0) {
      this.logger.info('Retrying request', { url, attempt: 1 });

      try {
        return await retryService.retry(
          async () => {
            // Create new AbortController for retry
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const retryOptions = {
              ...options,
              signal: controller.signal,
            };

            try {
              // Use rate limiter for retries too
              const response = await this.rateLimiter.fetch(url, retryOptions, this.timeout);
              clearTimeout(timeoutId);

              if (!response.ok) {
                throw await this._handleError(response);
              }
              return response.json();
            } catch (retryError) {
              clearTimeout(timeoutId);
              throw retryError;
            }
          },
          { maxRetries: this.retryConfig.maxRetries }
        );
      } catch (retryError) {
        // If all retries failed, throw user-friendly error
        if (retryError.code === 'ETIMEDOUT' || retryError.name === 'AbortError') {
          const timeoutError = new Error(
            `Request timed out after ${this.timeout}ms. Please check your connection and try again.`
          );
          timeoutError.code = 'ETIMEDOUT';
          timeoutError.userMessage = true;
          timeoutError.originalError = retryError;
          throw timeoutError;
        }
        throw retryError;
      }
    }

    // Create user-friendly error message for timeouts
    if (error.code === 'ETIMEDOUT' || error.name === 'AbortError') {
      const timeoutError = new Error(
        `Request timed out after ${this.timeout}ms. Please check your connection and try again.`
      );
      timeoutError.code = 'ETIMEDOUT';
      timeoutError.userMessage = true;
      timeoutError.originalError = error;
      throw timeoutError;
    }

    throw error;
  }

  /**
   * Check if error is retryable
   */
  _isRetryableError(error) {
    if (error.status === 429) return true; // Rate limit
    if (error.status >= 500) return true; // Server errors
    if (error.code === 'ECONNRESET') return true;
    if (error.code === 'ETIMEDOUT') return true;
    return false;
  }

  /**
   * Sanitize headers for logging (hide sensitive data)
   */
  _sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    const sensitiveKeys = ['authorization', 'x-api-key', 'cookie', 'set-cookie'];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '****';
      }
    }

    return sanitized;
  }

  /**
   * GET request
   */
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * DELETE request
   */
  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export default BaseApiClient;
