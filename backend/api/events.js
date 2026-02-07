/**
 * SSE (Server-Sent Events) API Endpoint
 *
 * Provides real-time event streaming to connected clients.
 * Replaces polling-based updates with push-based notifications.
 *
 * Endpoint: GET /api/events
 *
 * Query Parameters:
 * - userId: Optional user ID for user-specific events
 *
 * Event Types Streamed:
 * - connected: Initial connection confirmation
 * - post.created: New post created
 * - post.updated: Post data changed
 * - post.deleted: Post removed
 * - post.status_changed: Post status transitioned
 * - post.progress: Video generation/upload progress
 * - post.metrics_updated: Performance metrics updated
 * - keepalive: Keepalive comment (every 30s)
 */

import express from 'express';
import sseService from '../services/sseService.js';
import { getLogger } from '../utils/logger.js';

const router = express.Router();
const logger = getLogger('sse-api', 'events');

/**
 * GET /api/events
 *
 * Establishes SSE connection and streams events to client
 */
router.get('/events', (req, res) => {
  const userId = req.query.userId || null;

  logger.info('SSE connection requested', {
    ip: req.ip,
    userId,
    userAgent: req.get('user-agent')
  });

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering
  res.setHeader('Connection', 'keep-alive');

  // Flush headers immediately
  res.flushHeaders();

  // Add client to SSE service
  const clientId = sseService.addClient(res, userId);

  // Remove client on connection close
  req.on('close', () => {
    logger.debug('SSE connection closed by client', { clientId });
    sseService.removeClient(clientId);
  });

  // Handle client errors
  res.on('error', (error) => {
    logger.debug('SSE response error', {
      clientId,
      error: error.message
    });
    sseService.removeClient(clientId);
  });

  // Send initial connection event is handled by sseService.addClient()
});

/**
 * GET /api/events/stats
 *
 * Returns SSE service statistics (for debugging/monitoring)
 */
router.get('/events/stats', (req, res) => {
  const stats = sseService.getStats();

  res.json({
    success: true,
    ...stats
  });
});

export default router;
