/**
 * Test Error Messages API
 * Endpoint to test user-friendly error messages
 */

import express from 'express';
import errorMessageService from '../services/errorMessageService.js';

const router = express.Router();

/**
 * GET /api/test-errors
 * Returns list of available error types for testing
 */
router.get('/', (req, res) => {
  const mappings = errorMessageService.getAllErrorMappings();

  res.json({
    success: true,
    data: {
      errorTypes: Object.keys(mappings.errorMappings),
      statusCodes: Object.keys(mappings.statusMessages)
    }
  });
});

/**
 * POST /api/test-errors/throw
 * Throws a specific error type to test error handling
 * Body: { type: 'ErrorType', statusCode: 500 }
 */
router.post('/throw', (req, res) => {
  const { type = 'Error', statusCode = 500, message } = req.body;

  const error = errorMessageService.createError(
    message || `Test ${type} error`,
    statusCode,
    type
  );

  throw error;
});

/**
 * GET /api/test-errors/network
 * Simulates a network error
 */
router.get('/network', (req, res) => {
  const error = new Error('ENOTFOUND');
  error.code = 'ENOTFOUND';
  throw error;
});

/**
 * GET /api/test-errors/timeout
 * Simulates a timeout error
 */
router.get('/timeout', (req, res) => {
  const error = new Error('Request timed out');
  error.code = 'ETIMEDOUT';
  throw error;
});

/**
 * GET /api/test-errors/auth
 * Simulates an authentication error
 */
router.get('/auth', (req, res) => {
  const error = new Error('Invalid API credentials');
  error.type = 'AuthenticationError';
  throw error;
});

/**
 * GET /api/test-errors/rate-limit
 * Simulates a rate limit error
 */
router.get('/rate-limit', (req, res) => {
  const error = new Error('Too many requests');
  error.code = '429';
  error.statusCode = 429;
  throw error;
});

/**
 * GET /api/test-errors/database
 * Simulates a database error
 */
router.get('/database', async (req, res) => {
  // This will simulate a database connection error
  const error = new Error('Failed to connect to database');
  error.name = 'MongoNetworkError';
  throw error;
});

/**
 * GET /api/test-errors/validation
 * Simulates a validation error
 */
router.get('/validation', (req, res) => {
  const error = new Error('Validation failed');
  error.name = 'ValidationError';
  throw error;
});

/**
 * GET /api/test-errors/not-found
 * Simulates a not found error
 */
router.get('/not-found', (req, res) => {
  const error = new Error('Resource not found');
  error.statusCode = 404;
  throw error;
});

/**
 * GET /api/test-errors/content-generation
 * Simulates a content generation error
 */
router.get('/content-generation', (req, res) => {
  const error = new Error('Failed to generate content');
  error.type = 'ContentGenerationError';
  throw error;
});

/**
 * GET /api/test-errors/tiktok-post
 * Simulates a TikTok posting error
 */
router.get('/tiktok-post', (req, res) => {
  const error = new Error('Failed to post to TikTok');
  error.type = 'TikTokPostError';
  throw error;
});

/**
 * GET /api/test-errors/budget
 * Simulates a budget error
 */
router.get('/budget', (req, res) => {
  const error = new Error('Budget limit exceeded');
  error.type = 'BudgetExceededError';
  throw error;
});

/**
 * GET /api/test-errors/unknown
 * Simulates an unknown error
 */
router.get('/unknown', (req, res) => {
  throw new Error('Something completely unexpected happened');
});

/**
 * GET /api/test-errors/async
 * Simulates an async error
 */
router.get('/async', async (req, res) => {
  // Simulate async operation that fails
  await new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('Async operation failed'));
    }, 100);
  });
});

export default router;
