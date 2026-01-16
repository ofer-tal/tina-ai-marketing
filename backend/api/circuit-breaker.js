/**
 * Circuit Breaker API Routes
 *
 * Provides endpoints for monitoring and managing circuit breakers
 */

import express from 'express';
import { registry } from '../services/circuitBreakerService.js';

const router = express.Router();

/**
 * GET /api/circuit-breaker/status
 * Get status of all circuit breakers
 */
router.get('/status', (req, res) => {
  try {
    const statuses = registry.getAllStatuses();
    res.json({
      success: true,
      count: statuses.length,
      breakers: statuses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/circuit-breaker/status/:service
 * Get status of a specific circuit breaker
 */
router.get('/status/:service', (req, res) => {
  try {
    const { service } = req.params;
    const breaker = registry.get(service);

    const status = breaker.getStatus();
    res.json({
      success: true,
      breaker: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/circuit-breaker/statistics
 * Get statistics for all circuit breakers
 */
router.get('/statistics', (req, res) => {
  try {
    const statistics = registry.getAllStatistics();
    res.json({
      success: true,
      count: statistics.length,
      breakers: statistics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/circuit-breaker/statistics/:service
 * Get statistics for a specific circuit breaker
 */
router.get('/statistics/:service', (req, res) => {
  try {
    const { service } = req.params;
    const breaker = registry.get(service);

    const stats = breaker.getStatistics();
    res.json({
      success: true,
      breaker: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/circuit-breaker/history/:service
 * Get request history for a specific circuit breaker
 */
router.get('/history/:service', (req, res) => {
  try {
    const { service } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const breaker = registry.get(service);

    const history = breaker.getHistory(limit);
    res.json({
      success: true,
      service,
      count: history.length,
      history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/circuit-breaker/reset/:service
 * Reset a specific circuit breaker to CLOSED state
 */
router.post('/reset/:service', (req, res) => {
  try {
    const { service } = req.params;
    registry.reset(service);

    res.json({
      success: true,
      message: `Circuit breaker for '${service}' has been reset`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/circuit-breaker/reset-all
 * Reset all circuit breakers to CLOSED state
 */
router.post('/reset-all', (req, res) => {
  try {
    registry.resetAll();

    res.json({
      success: true,
      message: 'All circuit breakers have been reset'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/circuit-breaker/force-state/:service
 * Force a circuit breaker into a specific state (for testing)
 * Body: { state: 'OPEN' | 'CLOSED' | 'HALF_OPEN' }
 */
router.post('/force-state/:service', (req, res) => {
  try {
    const { service } = req.params;
    const { state } = req.body;

    if (!state) {
      return res.status(400).json({
        success: false,
        error: 'State is required in request body'
      });
    }

    const breaker = registry.get(service);
    breaker.forceState(state);

    res.json({
      success: true,
      message: `Circuit breaker for '${service}' forced to ${state} state`,
      currentState: breaker.getStatus().state
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/circuit-breaker/test/:service
 * Test circuit breaker by simulating requests
 * Body: { shouldFail: boolean, count: number }
 */
router.post('/test/:service', async (req, res) => {
  try {
    const { service } = req.params;
    const { shouldFail = false, count = 10 } = req.body;

    const breaker = registry.get(service, {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 10000 // 10 seconds for testing
    });

    const results = [];

    for (let i = 0; i < count; i++) {
      try {
        await breaker.execute(async () => {
          if (shouldFail) {
            throw new Error('Simulated failure');
          }
          return { success: true, iteration: i };
        });

        results.push({ iteration: i, result: 'success' });
      } catch (error) {
        results.push({
          iteration: i,
          result: 'failure',
          error: error.message,
          circuitState: breaker.getStatus().state
        });
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    res.json({
      success: true,
      service,
      testConfig: { shouldFail, count },
      finalState: breaker.getStatus(),
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
