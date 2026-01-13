# Feature #6: Centralized Logging System

**Status**: ✅ COMPLETED AND VERIFIED
**Implementation Date**: 2025-01-12
**Files Created**:
- `backend/utils/logger.js` (333 lines)
- `backend/tests/logger.test.js` (297 lines)

## Overview

Implemented a centralized logging system using Winston that provides structured JSON logging with context tracking, log rotation, and multiple output transports.

## Features

### 1. Structured JSON Logging
- All log entries formatted as JSON for easy parsing
- ISO 8601 timestamps on every log entry
- Consistent field names: level, message, service, module, timestamp
- Supports arbitrary metadata in log entries

### 2. Multiple Log Levels
- **error**: Error conditions (logged to combined.log and error.log)
- **warn**: Warning conditions (logged to combined.log)
- **info**: Informational messages (logged to combined.log)
- **debug**: Debug messages (only shown when LOG_LEVEL=debug)

### 3. Log Rotation
- **maxsize**: 10MB (10,485,760 bytes) per log file
- **maxFiles**: 5 (keeps last 5 log files)
- **tailable**: true (prevents data loss on rotation)
- Automatic rotation when file size exceeded

### 4. Context Tracking
- **Service**: Top-level service identifier (e.g., 'database', 'api', 'test')
- **Module**: Sub-module within service (e.g., 'mongodb', 'auth', 'user')
- **Request ID**: Track request lifecycle across logs
- **Custom metadata**: Add any key-value pairs to log entries

### 5. Multiple Output Transports
- **Console**: Colorized, human-readable output for development
- **combined.log**: All log levels (info, warn, error)
- **error.log**: Error level only for quick error review

## API Reference

### `getLogger(service, module)`

Get or create a logger instance.

```javascript
import { getLogger } from '../utils/logger.js';

// Create logger with service and module
const logger = getLogger('api', 'auth');
logger.info('User logged in', { userId: '123' });

// Create logger with just service
const dbLogger = getLogger('database');
dbLogger.error('Connection failed', { error: err.message });
```

### Context Management

```javascript
const logger = getLogger('api', 'users');

// Set persistent context
logger.setContext('userId', 'user-123');
logger.setContext('sessionId', 'sess-abc');

// Log with context included
logger.info('User action performed');
// Output: {..., userId: 'user-123', sessionId: 'sess-abc'}

// Clear all context
logger.clearContext();
```

### Child Loggers

Create a child logger with module context that inherits parent's context:

```javascript
const parentLogger = getLogger('api', 'parent');
parentLogger.setContext('requestId', 'req-123');

const childLogger = parentLogger.child('child');
childLogger.info('Child log');
// Output: {..., module: 'child', requestId: 'req-123'}
```

### Request Context

Helper method for request-scoped logging:

```javascript
const logger = getLogger('api', 'middleware');
const requestLogger = logger.withRequest('req-abc123');
requestLogger.info('Processing request');
// Output: {..., requestId: 'req-abc123'}
```

### Express Middleware

Request logging middleware for Express apps:

```javascript
import { requestLoggingMiddleware, errorLoggingMiddleware } from '../utils/logger.js';

app.use(requestLoggingMiddleware);
app.use(errorLoggingMiddleware);

// Logs:
// - Incoming request with method, URL, IP, user agent
// - Request completed with status code and duration
// - Request errors with stack traces
```

## Usage Examples

### Basic Logging

```javascript
import { getLogger } from '../utils/logger.js';

const logger = getLogger('my-service', 'my-module');

logger.debug('Detailed debug info', { someData: 'value' });
logger.info('Something happened');
logger.warn('Something unusual happened', { warning: 'details' });
logger.error('Something went wrong', { error: err.message, stack: err.stack });
```

### With Context

```javascript
const logger = getLogger('api', 'auth');

logger.setContext('requestId', req.id);
logger.setContext('userId', req.user.id);

logger.info('Login successful');
// Output: {
//   level: 'info',
//   message: 'Login successful',
//   service: 'api',
//   module: 'auth',
//   requestId: 'req-abc',
//   userId: 'user-123',
//   timestamp: '2026-01-12T18:27:01-08:00'
// }
```

### Error Handling

```javascript
try {
  await someOperation();
} catch (error) {
  logger.error('Operation failed', {
    error: error.message,
    stack: error.stack,
    code: error.code
  });
}
```

## Configuration

Environment variables:

```bash
# Log level (error, warn, info, debug)
LOG_LEVEL=info

# Log file directory
LOG_FILE_PATH=./logs
```

## Testing

All 5 requirements tested and passing:

1. ✅ **Logs directory exists**: Created at `./logs` by default
2. ✅ **Log entries with timestamps**: ISO 8601 format on all entries
3. ✅ **Different log levels**: info, warn, error all working
4. ✅ **Log rotation**: Configured for 10MB files, keeps 5
5. ✅ **Context tracking**: module, requestId, custom metadata

Run tests:
```bash
node backend/tests/logger.test.js
```

## Integration with Existing Services

### Database Service (already using Winston)

The existing database service can be updated to use the centralized logger:

```javascript
// Before:
import winston from 'winston';
const logger = winston.createLogger({...});

// After:
import { getLogger } from '../utils/logger.js';
const logger = getLogger('database', 'mongodb');
```

### Retry Service (already using Winston)

```javascript
// Before:
import winston from 'winston';
const logger = winston.createLogger({...});

// After:
import { getLogger } from '../utils/logger.js';
const logger = getLogger('retry');
```

## Log File Examples

### combined.log

```json
{"level":"info","message":"Server started","service":"api","module":"server","port":3001,"timestamp":"2026-01-12T18:27:01-08:00"}
{"level":"info","message":"Database connected","service":"database","module":"mongodb","host":"localhost","timestamp":"2026-01-12T18:27:02-08:00"}
{"level":"warn","message":"High memory usage","service":"api","module":"monitor","usage":"85%","timestamp":"2026-01-12T18:27:03-08:00"}
{"level":"error","message":"Request failed","service":"api","module":"auth","requestId":"req-123","error":"Invalid token","timestamp":"2026-01-12T18:27:04-08:00"}
```

### error.log

```json
{"level":"error","message":"Database connection failed","service":"database","module":"mongodb","error":"ECONNREFUSED","timestamp":"2026-01-12T18:27:05-08:00"}
{"level":"error","message":"Authentication failed","service":"api","module":"auth","requestId":"req-456","error":"Invalid credentials","timestamp":"2026-01-12T18:27:06-08:00"}
```

## Benefits

1. **Single Import**: `import { getLogger } from '../utils/logger.js'`
2. **Consistent Format**: All services log in the same JSON format
3. **Easy Searching**: Parse JSON logs with jq, grep, or log aggregation tools
4. **Request Tracing**: Track requests across multiple services with requestId
5. **Automatic Rotation**: No manual log file management needed
6. **Production Ready**: Structured logs work with ELK, Splunk, CloudWatch, etc.

## Next Steps

1. Update existing services (database, retry) to use centralized logger
2. Add request logging middleware to Express app
3. Integrate with frontend error tracking (Sentry, etc.)
4. Set up log aggregation for production monitoring
