/**
 * Server Wrapper Script
 *
 * Wraps the server startup to provide file logging with rotation.
 * This script tee's output to both console and log file.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logDir = path.join(process.cwd(), 'logs');
const logFileName = 'backend.log';
const logFilePath = path.join(logDir, logFileName);

// Log rotation configuration
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_LOG_FILES = 5;

/**
 * Rotate log files if the current log is too large
 * Keeps the 5 most recent log files
 */
function rotateLogsIfNeeded() {
  // Ensure log directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Check if current log file exists and needs rotation
  if (fs.existsSync(logFilePath)) {
    const stats = fs.statSync(logFilePath);

    if (stats.size >= MAX_LOG_SIZE) {
      console.log(`Log file size (${(stats.size / 1024 / 1024).toFixed(2)}MB) exceeds limit, rotating...`);

      // Generate timestamp for rotated log
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedFileName = `backend-${timestamp}.log`;
      const rotatedFilePath = path.join(logDir, rotatedFileName);

      // Rename current log to timestamped file
      fs.renameSync(logFilePath, rotatedFilePath);
      console.log(`Rotated log to: ${rotatedFileName}`);

      // Clean up old log files, keeping only MAX_LOG_FILES
      const files = fs.readdirSync(logDir)
        .filter(f => f.startsWith('backend-') && f.endsWith('.log'))
        .map(f => ({
          name: f,
          path: path.join(logDir, f),
          time: fs.statSync(path.join(logDir, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time); // Sort by time descending (newest first)

      // Delete files beyond MAX_LOG_FILES
      if (files.length >= MAX_LOG_FILES) {
        const filesToDelete = files.slice(MAX_LOG_FILES);
        for (const file of filesToDelete) {
          fs.unlinkSync(file.path);
          console.log(`Deleted old log file: ${file.name}`);
        }
      }
    }
  }
}

// Perform rotation before creating new log stream
rotateLogsIfNeeded();

// Create write stream for log file
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

// Override console.log, console.error, console.warn to also write to file
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
const originalInfo = console.info;

function formatLogEntry(args) {
  const timestamp = new Date().toISOString();
  const message = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  return `[${timestamp}] ${message}`;
}

console.log = function(...args) {
  originalLog.apply(console, args);
  logStream.write(formatLogEntry(args) + '\n');
};

console.error = function(...args) {
  originalError.apply(console, args);
  logStream.write('[ERROR]' + formatLogEntry(args) + '\n');
};

console.warn = function(...args) {
  originalWarn.apply(console, args);
  logStream.write('[WARN]' + formatLogEntry(args) + '\n');
};

console.info = function(...args) {
  originalInfo.apply(console, args);
  logStream.write('[INFO]' + formatLogEntry(args) + '\n');
};

// Log startup
console.log('='.repeat(60));
console.log('Backend server starting...');
console.log(`Log file: ${logFilePath}`);
console.log(`Log rotation: ${MAX_LOG_SIZE / 1024 / 1024}MB max, ${MAX_LOG_FILES} files retained`);
console.log('='.repeat(60));

// Handle cleanup on exit
function cleanup() {
  logStream.end();
  console.log('Log stream closed');
}

// Only register listeners if not already registered (avoid duplicates in development)
if (process.listenerCount('exit') === 0) {
  process.on('exit', cleanup);
}
if (process.listenerCount('SIGINT') === 0) {
  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down...');
    cleanup();
    process.exit(0);
  });
}
if (process.listenerCount('SIGTERM') === 0) {
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down...');
    cleanup();
    process.exit(0);
  });
}

// Import and start the actual server
import('../server.js').catch(error => {
  console.error('Failed to start server:', error);
  cleanup();
  process.exit(1);
});
