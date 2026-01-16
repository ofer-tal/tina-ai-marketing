import express from 'express';
import * as errorMonitoring from '../services/errorMonitoringService.js';

const router = express.Router();

/**
 * GET /api/error-monitoring/stats
 * Get overall error statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = errorMonitoring.getErrorStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get error stats',
      message: error.message
    });
  }
});

/**
 * GET /api/error-monitoring/summary
 * Get error summary for dashboard
 */
router.get('/summary', (req, res) => {
  try {
    const summary = errorMonitoring.getErrorSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get error summary',
      message: error.message
    });
  }
});

/**
 * GET /api/error-monitoring/recent
 * Get recent errors with pagination
 * Query params:
 *   - limit: number of errors to return (default: 20)
 *   - offset: number of errors to skip (default: 0)
 */
router.get('/recent', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const result = errorMonitoring.getRecentErrors(limit, offset);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get recent errors',
      message: error.message
    });
  }
});

/**
 * GET /api/error-monitoring/by-type/:type
 * Get errors by type
 */
router.get('/by-type/:type', (req, res) => {
  try {
    const { type } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const errors = errorMonitoring.getErrorsByType(type, limit);
    res.json({ type, errors, count: errors.length });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get errors by type',
      message: error.message
    });
  }
});

/**
 * GET /api/error-monitoring/by-module/:module
 * Get errors by module
 */
router.get('/by-module/:module', (req, res) => {
  try {
    const { module } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const errors = errorMonitoring.getErrorsByModule(module, limit);
    res.json({ module, errors, count: errors.length });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get errors by module',
      message: error.message
    });
  }
});

/**
 * GET /api/error-monitoring/health
 * Get error health status
 */
router.get('/health', (req, res) => {
  try {
    const health = errorMonitoring.getErrorHealthStatus();
    res.json(health);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get error health status',
      message: error.message
    });
  }
});

/**
 * POST /api/error-monitoring/test-error
 * Test endpoint to generate a sample error
 */
router.post('/test-error', (req, res) => {
  try {
    const { type = 'TestError', message = 'This is a test error' } = req.body;

    const testError = new Error(message);
    testError.name = type;

    errorMonitoring.recordError(testError, {
      module: 'test',
      requestId: 'test-' + Date.now(),
      level: 'error'
    });

    res.json({
      success: true,
      message: 'Test error recorded',
      errorType: type
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to record test error',
      message: error.message
    });
  }
});

/**
 * DELETE /api/error-monitoring/clear
 * Clear error history (for testing only)
 */
router.delete('/clear', (req, res) => {
  try {
    errorMonitoring.clearErrorHistory();
    res.json({
      success: true,
      message: 'Error history cleared'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to clear error history',
      message: error.message
    });
  }
});

export default router;
