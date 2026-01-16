import { getLogger } from '../utils/logger.js';

const logger = getLogger('error-monitoring', 'service');

/**
 * Error Monitoring Service
 *
 * Aggregates errors for monitoring purposes:
 * - Tracks error frequency by type
 * - Tracks errors by service/module
 * - Maintains recent error history
 * - Provides error statistics
 */

// In-memory error storage (in production, this would be in MongoDB/Redis)
const errorStats = {
  totalErrors: 0,
  byType: {},      // { "ValidationError": 5, "NetworkError": 3 }
  byModule: {},    // { "api/dashboard": 2, "services/tiktok": 1 }
  byLevel: {},     // { "error": 10, "warn": 5 }
  lastHour: 0,
  last24Hours: 0,
  recentErrors: [] // Array of last 100 errors
};

// Time window for error tracking
const ERROR_HISTORY_LIMIT = 100;
const TIME_WINDOWS = {
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000
};

/**
 * Record an error for monitoring
 */
export function recordError(error, context = {}) {
  const timestamp = new Date();
  const errorType = error.name || error.code || 'UnknownError';
  const module = context.module || 'unknown';
  const level = context.level || 'error';

  // Update total count
  errorStats.totalErrors++;

  // Update by type
  if (!errorStats.byType[errorType]) {
    errorStats.byType[errorType] = 0;
  }
  errorStats.byType[errorType]++;

  // Update by module
  if (!errorStats.byModule[module]) {
    errorStats.byModule[module] = 0;
  }
  errorStats.byModule[module]++;

  // Update by level
  if (!errorStats.byLevel[level]) {
    errorStats.byLevel[level] = 0;
  }
  errorStats.byLevel[level]++;

  // Add to recent errors
  const errorRecord = {
    timestamp: timestamp.toISOString(),
    type: errorType,
    message: error.message || 'No message',
    stack: error.stack || '',
    module,
    level,
    context: {
      requestId: context.requestId,
      userId: context.userId,
      ...context.meta
    }
  };

  errorStats.recentErrors.unshift(errorRecord);

  // Trim recent errors to limit
  if (errorStats.recentErrors.length > ERROR_HISTORY_LIMIT) {
    errorStats.recentErrors = errorStats.recentErrors.slice(0, ERROR_HISTORY_LIMIT);
  }

  // Update time-based counts
  updateTimeBasedCounts(timestamp);

  // Log to winston logger
  logger.error(error.message, {
    errorType,
    module,
    stack: error.stack,
    ...context
  });

  return errorRecord;
}

/**
 * Update time-based error counts
 */
function updateTimeBasedCounts(timestamp) {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - TIME_WINDOWS.HOUR);
  const dayAgo = new Date(now.getTime() - TIME_WINDOWS.DAY);

  errorStats.lastHour = errorStats.recentErrors.filter(e =>
    new Date(e.timestamp) >= hourAgo
  ).length;

  errorStats.last24Hours = errorStats.recentErrors.filter(e =>
    new Date(e.timestamp) >= dayAgo
  ).length;
}

/**
 * Get error statistics
 */
export function getErrorStats() {
  // Recalculate time-based counts to ensure accuracy
  const now = new Date();
  const hourAgo = new Date(now.getTime() - TIME_WINDOWS.HOUR);
  const dayAgo = new Date(now.getTime() - TIME_WINDOWS.DAY);

  return {
    totalErrors: errorStats.totalErrors,
    byType: errorStats.byType,
    byModule: errorStats.byModule,
    byLevel: errorStats.byLevel,
    lastHour: errorStats.recentErrors.filter(e =>
      new Date(e.timestamp) >= hourAgo
    ).length,
    last24Hours: errorStats.recentErrors.filter(e =>
      new Date(e.timestamp) >= dayAgo
    ).length,
    recentErrors: errorStats.recentErrors.slice(0, 50) // Return last 50
  };
}

/**
 * Get errors by type
 */
export function getErrorsByType(errorType, limit = 20) {
  return errorStats.recentErrors
    .filter(e => e.type === errorType)
    .slice(0, limit);
}

/**
 * Get errors by module
 */
export function getErrorsByModule(module, limit = 20) {
  return errorStats.recentErrors
    .filter(e => e.module === module)
    .slice(0, limit);
}

/**
 * Get recent errors
 */
export function getRecentErrors(limit = 20, offset = 0) {
  return {
    errors: errorStats.recentErrors.slice(offset, offset + limit),
    total: errorStats.recentErrors.length,
    offset,
    limit
  };
}

/**
 * Get error summary for dashboard
 */
export function getErrorSummary() {
  const stats = getErrorStats();

  // Calculate most frequent error types
  const topErrorTypes = Object.entries(stats.byType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));

  // Calculate most affected modules
  const topModules = Object.entries(stats.byModule)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([module, count]) => ({ module, count }));

  return {
    overview: {
      total: stats.totalErrors,
      lastHour: stats.lastHour,
      last24Hours: stats.last24Hours
    },
    topErrorTypes,
    topModules,
    recentErrors: stats.recentErrors.slice(0, 10)
  };
}

/**
 * Clear error history (useful for testing)
 */
export function clearErrorHistory() {
  errorStats.totalErrors = 0;
  errorStats.byType = {};
  errorStats.byModule = {};
  errorStats.byLevel = {};
  errorStats.lastHour = 0;
  errorStats.last24Hours = 0;
  errorStats.recentErrors = [];

  logger.info('Error history cleared');
}

/**
 * Get health status based on error rate
 */
export function getErrorHealthStatus() {
  const stats = getErrorStats();
  const errorsPerMinute = stats.lastHour / 60;

  // Health thresholds
  if (errorsPerMinute > 10) {
    return {
      status: 'critical',
      message: `High error rate: ${errorsPerMinute.toFixed(1)} errors/min`,
      errorsPerMinute
    };
  } else if (errorsPerMinute > 5) {
    return {
      status: 'warning',
      message: `Elevated error rate: ${errorsPerMinute.toFixed(1)} errors/min`,
      errorsPerMinute
    };
  } else {
    return {
      status: 'healthy',
      message: `Normal error rate: ${errorsPerMinute.toFixed(1)} errors/min`,
      errorsPerMinute
    };
  }
}

export default {
  recordError,
  getErrorStats,
  getErrorsByType,
  getErrorsByModule,
  getRecentErrors,
  getErrorSummary,
  clearErrorHistory,
  getErrorHealthStatus
};
