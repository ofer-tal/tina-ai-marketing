import express from 'express';
import glmService from '../services/glmService.js';
import winston from 'winston';

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'glm-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/glm-api-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/glm-api.log' }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

const router = express.Router();

/**
 * POST /api/glm/messages
 * Create a chat completion using GLM4.7
 *
 * Request body (Anthropic format):
 * {
 *   "messages": [
 *     { "role": "user", "content": "Hello!" }
 *   ],
 *   "system": "You are a helpful assistant",
 *   "maxTokens": 4096,
 *   "temperature": 0.7,
 *   "topP": 0.9
 * }
 */
router.post('/messages', async (req, res) => {
  const startTime = Date.now();

  logger.info('GLM4.7 message creation requested', {
    messageCount: req.body.messages?.length || 0
  });

  try {
    const { messages, system, maxTokens, temperature, topP } = req.body;

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'messages array is required'
      });
    }

    if (messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'messages array must contain at least one message'
      });
    }

    // Validate message format
    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        return res.status(400).json({
          success: false,
          error: 'Each message must have role and content fields'
        });
      }
    }

    // Create message
    const response = await glmService.createMessage({
      messages,
      system,
      maxTokens,
      temperature,
      topP
    });

    const duration_ms = Date.now() - startTime;

    logger.info('GLM4.7 message created successfully', {
      responseId: response.id,
      duration: `${duration_ms}ms`,
      mock: response.mock || false
    });

    res.json({
      success: true,
      data: response,
      meta: {
        duration_ms,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const duration_ms = Date.now() - startTime;

    logger.error('GLM4.7 message creation failed', {
      error: error.message,
      stack: error.stack,
      duration: `${duration_ms}ms`
    });

    res.status(500).json({
      success: false,
      error: error.message,
      meta: {
        duration_ms,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /api/glm/messages/stream
 * Create a streaming chat completion using GLM4.7
 *
 * Request body:
 * {
 *   "messages": [
 *     { "role": "user", "content": "Hello!" }
 *   ],
 *   "system": "You are a helpful assistant",
 *   "maxTokens": 4096
 * }
 *
 * Response: Server-Sent Events (SSE) stream
 */
router.post('/messages/stream', async (req, res) => {
  const startTime = Date.now();

  logger.info('GLM4.7 streaming requested', {
    messageCount: req.body.messages?.length || 0
  });

  try {
    const { messages, system, maxTokens, temperature, topP } = req.body;

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'messages array is required'
      });
    }

    if (messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'messages array must contain at least one message'
      });
    }

    // Validate message format
    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        return res.status(400).json({
          success: false,
          error: 'Each message must have role and content fields'
        });
      }
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Send chunks via SSE
    await glmService.createMessageStream(
      { messages, system, maxTokens, temperature, topP },
      (chunk) => {
        // Send SSE event
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    );

    // Send final completion event
    const duration_ms = Date.now() - startTime;
    res.write(`data: ${JSON.stringify({ type: 'done', duration_ms })}\n\n`);

    logger.info('GLM4.7 streaming completed', {
      duration: `${duration_ms}ms`
    });

    res.end();

  } catch (error) {
    const duration_ms = Date.now() - startTime;

    logger.error('GLM4.7 streaming failed', {
      error: error.message,
      stack: error.stack,
      duration: `${duration_ms}ms`
    });

    // Send error via SSE
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.end();
  }
});

/**
 * GET /api/glm/status
 * Get GLM4.7 service status
 */
router.get('/status', (req, res) => {
  const status = glmService.getStatus();

  logger.info('Service status requested', status);

  res.json({
    success: true,
    data: status
  });
});

/**
 * GET /api/glm/health
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  const health = await glmService.healthCheck().catch(() => ({
    healthy: false,
    reason: 'error'
  }));

  res.json({
    success: true,
    service: 'glm47',
    status: health.healthy ? 'healthy' : 'unhealthy',
    ...health,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/glm/
 * Root endpoint with API information
 */
router.get('/', (req, res) => {
  res.json({
    service: 'GLM4.7 API',
    version: '1.0.0',
    description: 'GLM4.7 chat completion API with Anthropic-compatible interface',
    endpoints: {
      messages: 'POST /api/glm/messages - Create a chat completion',
      stream: 'POST /api/glm/messages/stream - Create a streaming chat completion',
      status: 'GET /api/glm/status - Get service status',
      health: 'GET /api/glm/health - Health check'
    },
    documentation: 'GLM4.7 API compatible with Anthropic message format',
    configured: glmService.isConfigured()
  });
});

export default router;
