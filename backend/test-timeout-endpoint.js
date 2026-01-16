/**
 * Test endpoint for timeout handling
 * This file can be loaded into backend/routes to test timeout functionality
 */

import express from 'express';
import { getLogger } from '../utils/logger.js';

const router = express.Router();
const logger = getLogger('api', 'test-timeout');

/**
 * GET /api/test/timeout
 * Simulates a slow response that will timeout
 */
router.get('/timeout', async (req, res) => {
  const delay = parseInt(req.query.delay || '10000'); // Default 10 second delay

  logger.info(`Timeout test endpoint called with delay: ${delay}ms`);

  // Simulate slow operation
  setTimeout(() => {
    res.json({
      message: 'This response should have timed out',
      delay: delay,
    });
  }, delay);
});

/**
 * GET /api/test/timeout-configured
 * Tests timeout with actual external API call
 */
router.get('/timeout-configured', async (req, res) => {
  try {
    const BaseApiClient = (await import('../services/baseApiClient.js')).default;

    // Create client with very short timeout
    const client = new BaseApiClient({
      name: 'TimeoutTest',
      baseURL: 'https://httpbin.org',
      timeout: 100, // 100ms timeout
      retryConfig: {
        maxRetries: 0,
      },
    });

    logger.info('Making request that will timeout...');

    const result = await client.get('/delay/5');

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error('Timeout test error', {
      code: error.code,
      message: error.message,
      userMessage: error.userMessage,
    });

    res.status(500).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        userMessage: error.userMessage,
      },
    });
  }
});

/**
 * GET /api/test/timeout-retry
 * Tests timeout with retry mechanism
 */
router.get('/timeout-retry', async (req, res) => {
  try {
    const BaseApiClient = (await import('../services/baseApiClient.js')).default;

    // Create client with timeout and retries
    const client = new BaseApiClient({
      name: 'TimeoutRetryTest',
      baseURL: 'https://httpbin.org',
      timeout: 100,
      retryConfig: {
        maxRetries: 2,
        initialDelay: 50,
      },
    });

    logger.info('Making request that will timeout and retry...');

    const result = await client.get('/delay/5');

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error('Timeout retry test error', {
      code: error.code,
      message: error.message,
      userMessage: error.userMessage,
    });

    res.status(500).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        userMessage: error.userMessage,
      },
    });
  }
});

export default router;
