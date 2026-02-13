import winston from 'winston';
import path from 'path';
import fs from 'fs';

/**
 * Centralized Logging Utility
 *
 * Provides structured logging with:
 * - Multiple log levels (error, warn, info, debug)
 * - Log rotation to prevent oversized files
 * - Context tracking (module, requestId, userId)
 * - JSON format for easy parsing
 * - Separate files for different log levels
 */

const LOG_DIR = process.env.LOG_FILE_PATH || './logs';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'isoDateTime' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, service, module, requestId, ...meta }) => {
    let msg = `${timestamp} [${level}]`;

    if (service) msg += ` [${service}]`;
    if (module) msg += ` [${module}]`;
    if (requestId) msg += ` [req:${requestId.substring(0, 8)}]`;

    msg += ` ${message}`;

    // Add metadata
    const keys = Object.keys(meta);
    if (keys.length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }

    return msg;
  })
);

/**
 * Create a Winston logger instance
 */
const createLogger = (service = 'app') => {
  const transports = [
    // Console transport (for development)
    new winston.transports.Console({
      level: LOG_LEVEL,
      format: consoleFormat,
      handleExceptions: false,
      handleRejections: false
    }),

    // File transport for all logs
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'backend.log'),
      level: 'info',
      format: logFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true,
      handleExceptions: false,
      handleRejections: false
    }),

    // File transport for errors only
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true,
      handleExceptions: false,
      handleRejections: false
    })
  ];

  const logger = winston.createLogger({
    level: LOG_LEVEL,
    format: logFormat,
    defaultMeta: { service },
    transports,
    exitOnError: false
  });

  return logger;
};

/**
 * Logger class with context tracking
 */
class Logger {
  constructor(service = 'app', module = null) {
    this.winston = createLogger(service);
    this.service = service;
    this.module = module;
    this.context = {};
  }

  /**
   * Set context that will be included in all log entries
   */
  setContext(key, value) {
    this.context[key] = value;
    return this;
  }

  /**
   * Set multiple context values
   */
  setContexts(contexts) {
    Object.assign(this.context, contexts);
    return this;
  }

  /**
   * Clear all context
   */
  clearContext() {
    this.context = {};
    return this;
  }

  /**
   * Add metadata to a single log entry
   */
  _formatMessage(message, meta = {}) {
    const logMeta = { ...this.context, ...meta };

    if (this.module) {
      logMeta.module = this.module;
    }

    return { message, ...logMeta };
  }

  /**
   * Log at error level
   */
  error(message, meta = {}) {
    this.winston.error(this._formatMessage(message, meta));
  }

  /**
   * Log at warn level
   */
  warn(message, meta = {}) {
    this.winston.warn(this._formatMessage(message, meta));
  }

  /**
   * Log at info level
   */
  info(message, meta = {}) {
    this.winston.info(this._formatMessage(message, meta));
  }

  /**
   * Log at debug level
   */
  debug(message, meta = {}) {
    this.winston.debug(this._formatMessage(message, meta));
  }

  /**
   * Create a child logger with additional context
   */
  child(childModule) {
    const childLogger = new Logger(this.service, childModule);
    childLogger.setContexts({ ...this.context });
    return childLogger;
  }

  /**
   * Create a logger with request context
   */
  withRequest(requestId) {
    return this.child(this.module).setContext('requestId', requestId);
  }
}

/**
 * Singleton instance map
 */
const loggerInstances = new Map();

/**
 * Get or create a logger instance
 */
export function getLogger(service = 'app', module = null) {
  const key = `${service}:${module || 'root'}`;

  if (!loggerInstances.has(key)) {
    loggerInstances.set(key, new Logger(service, module));
  }

  return loggerInstances.get(key);
}

/**
 * Express middleware to add request logging
 */
export function requestLoggingMiddleware(req, res, next) {
  const requestId = req.id || req.headers['x-request-id'] || Date.now().toString(36);
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  const logger = getLogger('http', 'request');
  const startTime = Date.now();

  logger.info('Incoming request', {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`
    });
  });

  next();
}

/**
 * Error logging middleware for Express
 */
export function errorLoggingMiddleware(err, req, res, next) {
  const logger = getLogger('http', 'error');

  logger.error('Request error', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    error: err.message,
    stack: err.stack,
    status: err.status || 500
  });

  next(err);
}

/**
 * Test the logging system
 */
export async function testLogging() {
  const logger = getLogger('test', 'logging-test');

  logger.info('Testing logging system');

  logger.debug('Debug message', { test: true });
  logger.info('Info message', { test: true });
  logger.warn('Warning message', { test: true });
  logger.error('Error message', { test: true, error: 'Sample error' });

  // Test with context
  logger.setContext('userId', 'test-user-123');
  logger.setContext('sessionId', 'test-session-abc');
  logger.info('Message with context', { action: 'test' });

  // Test child logger
  const childLogger = logger.child('sub-module');
  childLogger.info('Child logger message');

  // Test with request ID
  const requestLogger = logger.withRequest('req-12345678');
  requestLogger.info('Request logger message');

  logger.clearContext();

  return true;
}

export default Logger;
