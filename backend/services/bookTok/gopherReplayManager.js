/**
 * Gopher Replay Manager
 *
 * Records all Gopher API requests/responses to files for replay during troubleshooting.
 * This allows debugging without wasting API credits.
 *
 * Usage:
 * - Normal mode: Logs all API calls to storage/gopher-logs/
 * - Replay mode: Returns logged responses instead of making API calls
 *
 * Enable replay mode with: GOPHER_REPLAY_MODE=true
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLogger } from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = getLogger('services', 'booktok-gopher-replay');

// Log directory
const LOG_DIR = path.resolve(__dirname, '../../../storage/gopher-logs');

// Replay mode flag
const REPLAY_MODE = process.env.GOPHER_REPLAY_MODE === 'true';

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  logger.info(`Created Gopher log directory: ${LOG_DIR}`);
}

/**
 * Generate a unique filename for a log entry
 * @param {string} endpoint - API endpoint
 * @returns {string} Filename
 */
function generateLogFilename(endpoint) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sanitizedEndpoint = endpoint.replace(/[^a-z0-9]/gi, '-').substring(0, 50);
  return `gopher-${sanitizedEndpoint}-${timestamp}.json`;
}

/**
 * Save request/response to a log file
 * @param {string} endpoint - API endpoint
 * @param {Object} requestData - Request data
 * @param {Object} responseData - Response data
 * @returns {string} Path to log file
 */
function saveLogEntry(endpoint, requestData, responseData) {
  try {
    const filename = generateLogFilename(endpoint);
    const filePath = path.join(LOG_DIR, filename);

    const logEntry = {
      timestamp: new Date().toISOString(),
      endpoint,
      request: {
        url: requestData.url,
        method: requestData.method || 'POST',
        headers: sanitizeHeaders(requestData.headers),
        body: requestData.body
      },
      response: {
        status: responseData.status,
        statusText: responseData.statusText,
        headers: sanitizeHeaders(responseData.headers),
        data: responseData.data
      },
      meta: {
        replayFile: filename,
        replayPath: filePath
      }
    };

    fs.writeFileSync(filePath, JSON.stringify(logEntry, null, 2));

    logger.info(`Gopher API call logged to: ${filename}`, {
      endpoint,
      replayFile: filename
    });

    return filePath;

  } catch (error) {
    logger.error('Error saving Gopher log entry', {
      error: error.message,
      endpoint
    });
    return null;
  }
}

/**
 * Sanitize headers (remove sensitive data)
 * @param {Object} headers - Headers object
 * @returns {Object} Sanitized headers
 */
function sanitizeHeaders(headers = {}) {
  const sanitized = { ...headers };

  // Redact authorization header
  if (sanitized.authorization) {
    sanitized.authorization = sanitized.authorization.substring(0, 20) + '...[REDACTED]';
  }

  return sanitized;
}

/**
 * Load a log entry for replay
 * @param {string} filename - Log filename
 * @returns {Object|null} Log entry
 */
function loadLogEntry(filename) {
  try {
    const filePath = path.join(LOG_DIR, filename);

    if (!fs.existsSync(filePath)) {
      logger.error(`Log file not found: ${filename}`);
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const logEntry = JSON.parse(content);

    logger.info(`Loaded log entry for replay: ${filename}`);

    return logEntry;

  } catch (error) {
    logger.error('Error loading Gopher log entry', {
      error: error.message,
      filename
    });
    return null;
  }
}

/**
 * List all available log files
 * @param {Object} options - Filter options
 * @returns {Array} List of log entries
 */
function listLogEntries(options = {}) {
  const {
    endpoint,
    limit = 50,
    sortBy = 'timestamp',
    sortOrder = 'desc'
  } = options;

  try {
    const files = fs.readdirSync(LOG_DIR)
      .filter(f => f.endsWith('.json'))
      .map(filename => {
        const filePath = path.join(LOG_DIR, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          path: filePath,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      });

    // Filter by endpoint if specified
    let filtered = files;
    if (endpoint) {
      const sanitizedEndpoint = endpoint.replace(/[^a-z0-9]/gi, '-');
      filtered = files.filter(f => f.filename.includes(sanitizedEndpoint));
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = sortBy === 'timestamp' ? a.created : a.size;
      const bVal = sortBy === 'timestamp' ? b.created : b.size;
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    // Load preview data for each file
    const entries = filtered.slice(0, limit).map(file => {
      try {
        const content = fs.readFileSync(file.path, 'utf8');
        const logEntry = JSON.parse(content);
        return {
          filename: file.filename,
          timestamp: logEntry.timestamp,
          endpoint: logEntry.endpoint,
          request: {
            url: logEntry.request?.url,
            method: logEntry.request?.method
          },
          response: {
            status: logEntry.response?.status,
            hasData: !!logEntry.response?.data
          }
        };
      } catch {
        return {
          filename: file.filename,
          timestamp: file.created,
          endpoint: 'unknown',
          error: 'Could not parse log file'
        };
      }
    });

    return entries;

  } catch (error) {
    logger.error('Error listing Gopher log entries', {
      error: error.message
    });
    return [];
  }
}

/**
 * Get a specific log entry with full data
 * @param {string} filename - Log filename
 * @returns {Object|null} Log entry with full data
 */
function getLogEntry(filename) {
  try {
    const filePath = path.join(LOG_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);

  } catch (error) {
    logger.error('Error getting Gopher log entry', {
      error: error.message,
      filename
    });
    return null;
  }
}

/**
 * Delete old log files
 * @param {number} daysToKeep - Days to keep (default: 30)
 * @returns {number} Number of files deleted
 */
function cleanupOldLogs(daysToKeep = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const files = fs.readdirSync(LOG_DIR)
      .filter(f => f.endsWith('.json'));

    let deletedCount = 0;

    for (const filename of files) {
      const filePath = path.join(LOG_DIR, filename);
      const stats = fs.statSync(filePath);

      if (stats.birthtime < cutoffDate) {
        fs.unlinkSync(filePath);
        deletedCount++;
        logger.info(`Deleted old Gopher log: ${filename}`);
      }
    }

    logger.info(`Gopher log cleanup complete: ${deletedCount} files deleted`);
    return deletedCount;

  } catch (error) {
    logger.error('Error cleaning up Gopher logs', {
      error: error.message
    });
    return 0;
  }
}

/**
 * Simulate an API response from a log entry
 * @param {string} filename - Log filename
 * @returns {Object|null} Simulated axios response
 */
function simulateResponseFromLog(filename) {
  const logEntry = loadLogEntry(filename);

  if (!logEntry || !logEntry.response) {
    return null;
  }

  // Return an object that mimics axios response structure
  return {
    data: logEntry.response.data,
    status: logEntry.response.status,
    statusText: logEntry.response.statusText || 'OK',
    headers: logEntry.response.headers || {},
    config: {
      url: logEntry.request?.url || ''
    },
    // Add flag to identify this as a replay
    _isReplay: true,
    _replayFile: filename
  };
}

/**
 * Wrapper for API calls that handles logging and replay
 * @param {Function} apiCallFunction - Function that makes the actual API call
 * @param {Object} options - Options
 * @returns {Promise} API response (real or replayed)
 */
async function withLogging(apiCallFunction, options = {}) {
  const {
    endpoint = 'unknown',
    replayFile = null
  } = options;

  // If in replay mode and a specific file is provided, use it
  if (REPLAY_MODE && replayFile) {
    logger.warn(`🔄 REPLAY MODE: Using logged response from ${replayFile}`);
    const simulatedResponse = simulateResponseFromLog(replayFile);

    if (simulatedResponse) {
      return simulatedResponse;
    }

    logger.warn(`Failed to load replay file: ${replayFile}, falling back to API call`);
  }

  // If in replay mode but no file specified, look for most recent log
  if (REPLAY_MODE && !replayFile) {
    const entries = listLogEntries({ endpoint, limit: 1 });

    if (entries.length > 0) {
      logger.warn(`🔄 REPLAY MODE: Auto-using most recent log: ${entries[0].filename}`);
      const simulatedResponse = simulateResponseFromLog(entries[0].filename);

      if (simulatedResponse) {
        return simulatedResponse;
      }
    }

    logger.warn(`No replay log found for ${endpoint}, making actual API call`);
  }

  // Make the actual API call
  let requestData = { endpoint };
  let response;

  try {
    // Capture the request data
    const originalCall = apiCallFunction.toString();
    requestData = {
      endpoint,
      url: options.url || 'gopher-api',
      method: 'POST',
      headers: options.headers || {},
      body: options.body || null
    };

    // Execute the API call
    response = await apiCallFunction();

    // Log the successful request/response
    const logPath = saveLogEntry(endpoint, requestData, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data
    });

    // Add log path info to response
    if (logPath) {
      response._logFile = path.basename(logPath);
      response._logPath = logPath;
    }

    return response;

  } catch (error) {
    // Log failed request too
    saveLogEntry(endpoint, requestData, {
      status: error.response?.status || 0,
      statusText: error.message,
      headers: error.response?.headers || {},
      data: error.response?.data || null,
      error: true
    });

    throw error;
  }
}

/**
 * Get replay mode status
 * @returns {Object} Status info
 */
function getStatus() {
  const files = fs.readdirSync(LOG_DIR).filter(f => f.endsWith('.json'));

  return {
    replayMode: REPLAY_MODE,
    logDirectory: LOG_DIR,
    totalLogFiles: files.length,
    oldestLog: files.length > 0 ? null : 'N/A',
    newestLog: files.length > 0 ? null : 'N/A'
  };
}

export default {
  withLogging,
  saveLogEntry,
  loadLogEntry,
  listLogEntries,
  getLogEntry,
  simulateResponseFromLog,
  cleanupOldLogs,
  getStatus,
  REPLAY_MODE,
  LOG_DIR
};
