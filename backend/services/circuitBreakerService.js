/**
 * Circuit Breaker Service
 *
 * Implements the circuit breaker pattern for failing APIs.
 * Prevents cascading failures by failing fast when an external service
 * is experiencing issues, and allowing it to recover after a timeout.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit is tripped, requests fail immediately
 * - HALF_OPEN: Testing if service has recovered
 */

class CircuitBreaker {
  constructor(serviceName, options = {}) {
    this.serviceName = serviceName;

    // Configuration
    this.failureThreshold = options.failureThreshold || 5; // Open after N failures
    this.successThreshold = options.successThreshold || 2; // Need N successes to close
    this.timeout = options.timeout || 60000; // Wait 60s before attempting recovery
    this.monitoringPeriod = options.monitoringPeriod || 10000; // Calculate failure rate every 10s

    // State
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.nextAttemptTime = null;
    this.requestCount = 0;
    this.totalFailures = 0;
    this.totalSuccesses = 0;

    // History for monitoring (last 100 requests)
    this.requestHistory = [];

    // Event callbacks
    this.onStateChange = options.onStateChange || (() => {});
    this.onOpen = options.onOpen || (() => {});
    this.onHalfOpen = options.onHalfOpen || (() => {});
    this.onClose = options.onClose || (() => {});

    // Logging
    this.logger = options.logger || console;
  }

  /**
   * Execute a request through the circuit breaker
   * @param {Function} requestFn - Function that returns a Promise
   * @param {Object} options - Options for this request
   * @returns {Promise} - Resolves with request result or rejects with CircuitBreakerError
   */
  async execute(requestFn, options = {}) {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    // Check if circuit is open and we should fail fast
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttemptTime) {
        const error = new CircuitBreakerOpenError(
          `Circuit breaker for ${this.serviceName} is OPEN. Rejecting request.`
        );
        error.serviceName = this.serviceName;
        error.state = this.state;
        error.nextAttemptTime = this.nextAttemptTime;

        this._logRequest(requestId, 'rejected', 0, error);
        throw error;
      } else {
        // Timeout has elapsed, transition to HALF_OPEN
        this._transitionToHalfOpen();
      }
    }

    // Execute the request
    this.requestCount++;
    try {
      const result = await requestFn();

      // Request succeeded
      this._onSuccess();
      const duration = Date.now() - startTime;
      this._logRequest(requestId, 'success', duration);

      return result;
    } catch (error) {
      // Request failed
      this._onFailure(error);
      const duration = Date.now() - startTime;
      this._logRequest(requestId, 'failure', duration, error);

      throw error;
    }
  }

  /**
   * Handle successful request
   * @private
   */
  _onSuccess() {
    this.successCount++;
    this.totalSuccesses++;
    this.lastSuccessTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      // In HALF_OPEN state, successful requests count toward closing the circuit
      if (this.successCount >= this.successThreshold) {
        this._transitionToClosed();
      }
    } else if (this.state === 'CLOSED') {
      // In CLOSED state, reset failure count on success
      this.failureCount = 0;
    }
  }

  /**
   * Handle failed request
   * @private
   */
  _onFailure(error) {
    this.failureCount++;
    this.totalFailures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      // In HALF_OPEN state, any failure trips the circuit back to OPEN
      this._transitionToOpen();
    } else if (this.state === 'CLOSED') {
      // In CLOSED state, check if we've exceeded the failure threshold
      if (this.failureCount >= this.failureThreshold) {
        this._transitionToOpen();
      }
    }
  }

  /**
   * Transition to OPEN state
   * @private
   */
  _transitionToOpen() {
    const previousState = this.state;
    this.state = 'OPEN';
    this.nextAttemptTime = Date.now() + this.timeout;

    this.logger.warn(`[CircuitBreaker:${this.serviceName}] Circuit OPENED after ${this.failureCount} failures`);

    this.onStateChange(this.state, previousState);
    this.onOpen();
  }

  /**
   * Transition to HALF_OPEN state
   * @private
   */
  _transitionToHalfOpen() {
    const previousState = this.state;
    this.state = 'HALF_OPEN';
    this.successCount = 0; // Reset success count for testing

    this.logger.info(`[CircuitBreaker:${this.serviceName}] Circuit HALF_OPEN, attempting recovery...`);

    this.onStateChange(this.state, previousState);
    this.onHalfOpen();
  }

  /**
   * Transition to CLOSED state
   * @private
   */
  _transitionToClosed() {
    const previousState = this.state;
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptTime = null;

    this.logger.info(`[CircuitBreaker:${this.serviceName}] Circuit CLOSED - service recovered`);

    this.onStateChange(this.state, previousState);
    this.onClose();
  }

  /**
   * Log request for monitoring
   * @private
   */
  _logRequest(requestId, result, duration, error = null) {
    const logEntry = {
      requestId,
      timestamp: new Date().toISOString(),
      result,
      duration,
      state: this.state,
      error: error ? error.message : null
    };

    this.requestHistory.push(logEntry);

    // Keep only last 100 entries
    if (this.requestHistory.length > 100) {
      this.requestHistory.shift();
    }
  }

  /**
   * Get current circuit breaker status
   * @returns {Object} Current status
   */
  getStatus() {
    return {
      serviceName: this.serviceName,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      failureThreshold: this.failureThreshold,
      successThreshold: this.successThreshold,
      nextAttemptTime: this.nextAttemptTime ? new Date(this.nextAttemptTime).toISOString() : null,
      requestCount: this.requestCount,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      failureRate: this.requestCount > 0 ? (this.totalFailures / this.requestCount * 100).toFixed(2) + '%' : '0%',
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
      lastSuccessTime: this.lastSuccessTime ? new Date(this.lastSuccessTime).toISOString() : null
    };
  }

  /**
   * Get request history
   * @param {number} limit - Maximum number of entries to return
   * @returns {Array} Request history
   */
  getHistory(limit = 50) {
    return this.requestHistory.slice(-limit);
  }

  /**
   * Get statistics for the monitoring period
   * @returns {Object} Statistics
   */
  getStatistics() {
    const recentHistory = this.requestHistory.slice(-100);
    const recentFailures = recentHistory.filter(r => r.result === 'failure').length;
    const recentSuccesses = recentHistory.filter(r => r.result === 'success').length;
    const totalRecent = recentHistory.length;

    return {
      serviceName: this.serviceName,
      state: this.state,
      recentRequests: totalRecent,
      recentFailures,
      recentSuccesses,
      recentFailureRate: totalRecent > 0 ? (recentFailures / totalRecent * 100).toFixed(2) + '%' : '0%',
      totalRequests: this.requestCount,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      totalFailureRate: this.requestCount > 0 ? (this.totalFailures / this.requestCount * 100).toFixed(2) + '%' : '0%',
      averageRequestDuration: totalRecent > 0
        ? Math.round(recentHistory.reduce((sum, r) => sum + r.duration, 0) / totalRecent) + 'ms'
        : 'N/A'
    };
  }

  /**
   * Reset the circuit breaker to CLOSED state
   */
  reset() {
    const previousState = this.state;
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptTime = null;
    this.requestHistory = [];

    this.logger.info(`[CircuitBreaker:${this.serviceName}] Circuit reset from ${previousState} to CLOSED`);
  }

  /**
   * Force the circuit into a specific state (for testing)
   * @param {string} newState - OPEN, CLOSED, or HALF_OPEN
   */
  forceState(newState) {
    const validStates = ['OPEN', 'CLOSED', 'HALF_OPEN'];
    if (!validStates.includes(newState)) {
      throw new Error(`Invalid state: ${newState}. Must be one of: ${validStates.join(', ')}`);
    }

    const previousState = this.state;
    this.state = newState;
    this.failureCount = 0;
    this.successCount = 0;

    if (newState === 'OPEN') {
      this.nextAttemptTime = Date.now() + this.timeout;
    } else {
      this.nextAttemptTime = null;
    }

    this.logger.info(`[CircuitBreaker:${this.serviceName}] Circuit forced from ${previousState} to ${newState}`);
    this.onStateChange(this.state, previousState);
  }
}

/**
 * Custom error for when circuit breaker is open
 */
class CircuitBreakerOpenError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
    this.statusCode = 503; // Service Unavailable
  }
}

/**
 * Circuit Breaker Registry
 * Manages multiple circuit breakers for different services
 */
class CircuitBreakerRegistry {
  constructor() {
    this.breakers = new Map();
  }

  /**
   * Get or create a circuit breaker for a service
   * @param {string} serviceName - Name of the service
   * @param {Object} options - Circuit breaker options
   * @returns {CircuitBreaker}
   */
  get(serviceName, options = {}) {
    if (!this.breakers.has(serviceName)) {
      this.breakers.set(serviceName, new CircuitBreaker(serviceName, options));
    }
    return this.breakers.get(serviceName);
  }

  /**
   * Get status of all circuit breakers
   * @returns {Array} Array of status objects
   */
  getAllStatuses() {
    return Array.from(this.breakers.values()).map(b => b.getStatus());
  }

  /**
   * Get statistics for all circuit breakers
   * @returns {Array} Array of statistics objects
   */
  getAllStatistics() {
    return Array.from(this.breakers.values()).map(b => b.getStatistics());
  }

  /**
   * Reset a specific circuit breaker
   * @param {string} serviceName - Name of the service
   */
  reset(serviceName) {
    if (this.breakers.has(serviceName)) {
      this.breakers.get(serviceName).reset();
    }
  }

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    this.breakers.forEach(breaker => breaker.reset());
  }

  /**
   * Remove a circuit breaker from the registry
   * @param {string} serviceName - Name of the service
   */
  remove(serviceName) {
    this.breakers.delete(serviceName);
  }
}

// Create global registry instance
const registry = new CircuitBreakerRegistry();

export {
  CircuitBreaker,
  CircuitBreakerOpenError,
  CircuitBreakerRegistry,
  registry
};
