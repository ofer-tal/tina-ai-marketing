/**
 * Server Wrapper Script
 *
 * Wraps the server startup to provide file logging on Windows.
 * This script tee's output to both console and log file.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logDir = path.join(process.cwd(), 'logs');
const logFilePath = process.env.LOG_FILE_PATH || path.join(logDir, 'backend.log');

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

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
