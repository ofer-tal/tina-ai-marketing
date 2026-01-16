import express from 'express';
import fileSystemErrorHandler from '../services/fileSystemErrorHandler.js';
import storageService from '../services/storage.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('api', 'filesystem-errors');

const router = express.Router();

/**
 * POST /api/filesystem-errors/test
 * Test file system error handling by simulating various error scenarios
 */
router.post('/test', async (req, res) => {
  try {
    const { scenario = 'file-not-found' } = req.body;

    let result;

    switch (scenario) {
      case 'file-not-found':
        // Try to read a non-existent file
        result = await fileSystemErrorHandler.wrapOperation(
          async () => storageService.readFile('non-existent-file.png'),
          'read',
          'non-existent-file.png',
          {
            test: true,
            scenario: 'file-not-found',
          }
        );
        return res.json({
          scenario,
          success: false,
          result: 'File not found error handled successfully',
        });

      case 'directory-not-found':
        // Try to save to a directory that doesn't exist
        result = await fileSystemErrorHandler.handleError(
          new Error('ENOENT: no such file or directory'),
          'write',
          'invalid-dir/test-file.png',
          {
            test: true,
            scenario: 'directory-not-found',
            retryFn: async (path) => storageService.saveFile(Buffer.from('test'), 'test-file.png', 'image'),
            retryArgs: [],
          }
        );
        return res.json({
          scenario,
          result,
        });

      case 'permission-denied':
        // Simulate permission error
        result = await fileSystemErrorHandler.handleError(
          Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' }),
          'write',
          '/root/protected-file.png',
          {
            test: true,
            scenario: 'permission-denied',
          }
        );
        return res.json({
          scenario,
          result,
        });

      case 'disk-full':
        // Simulate disk full error
        result = await fileSystemErrorHandler.handleError(
          Object.assign(new Error('ENOSPC: no space left on device'), { code: 'ENOSPC' }),
          'write',
          'storage/images/large-file.png',
          {
            test: true,
            scenario: 'disk-full',
          }
        );
        return res.json({
          scenario,
          result,
        });

      case 'file-locked':
        // Simulate file locked error
        result = await fileSystemErrorHandler.handleError(
          Object.assign(new Error('EBUSY: file busy'), { code: 'EBUSY' }),
          'write',
          'storage/images/locked-file.png',
          {
            test: true,
            scenario: 'file-locked',
            retryFn: async () => ({ success: true }),
            retryArgs: [],
          }
        );
        return res.json({
          scenario,
          result,
        });

      case 'invalid-path':
        // Simulate invalid path error
        result = await fileSystemErrorHandler.handleError(
          Object.assign(new Error('EINVAL: invalid argument'), { code: 'EINVAL' }),
          'write',
            'invalid<>path|file?.png',
          {
            test: true,
            scenario: 'invalid-path',
          }
        );
        return res.json({
          scenario,
          result,
        });

      case 'io-error':
        // Simulate I/O error
        result = await fileSystemErrorHandler.handleError(
          Object.assign(new Error('EIO: I/O error'), { code: 'EIO' }),
          'read',
          'storage/images/corrupt-file.png',
          {
            test: true,
            scenario: 'io-error',
            retryFn: async () => ({ success: true }),
            retryArgs: [],
          }
        );
        return res.json({
          scenario,
          result,
        });

      default:
        return res.status(400).json({
          error: 'Unknown test scenario',
          validScenarios: [
            'file-not-found',
            'directory-not-found',
            'permission-denied',
            'disk-full',
            'file-locked',
            'invalid-path',
            'io-error',
          ],
        });
    }
  } catch (error) {
    logger.error('File system error test failed', { error: error.message });
    res.status(500).json({
      error: 'Test failed',
      message: error.message,
      userMessage: error.userMessage,
    });
  }
});

/**
 * GET /api/filesystem-errors/history
 * Get file system error history
 */
router.get('/history', (req, res) => {
  try {
    const { errorType, operation, since } = req.query;

    const history = fileSystemErrorHandler.getErrorHistory({
      errorType,
      operation,
      since,
    });

    res.json({
      count: history.length,
      errors: history,
    });
  } catch (error) {
    logger.error('Failed to get error history', { error: error.message });
    res.status(500).json({ error: 'Failed to get error history' });
  }
});

/**
 * DELETE /api/filesystem-errors/history
 * Clear error history
 */
router.delete('/history', (req, res) => {
  try {
    fileSystemErrorHandler.clearErrorHistory();

    res.json({
      success: true,
      message: 'Error history cleared',
    });
  } catch (error) {
    logger.error('Failed to clear error history', { error: error.message });
    res.status(500).json({ error: 'Failed to clear error history' });
  }
});

/**
 * GET /api/filesystem-errors/status
 * Get error handler status and statistics
 */
router.get('/status', (req, res) => {
  try {
    const status = fileSystemErrorHandler.getStatus();

    res.json(status);
  } catch (error) {
    logger.error('Failed to get error handler status', { error: error.message });
    res.status(500).json({ error: 'Failed to get error handler status' });
  }
});

/**
 * POST /api/filesystem-errors/check-disk-space
 * Check disk space for a directory
 */
router.post('/check-disk-space', async (req, res) => {
  try {
    const { path = './storage' } = req.body;

    const diskSpace = await fileSystemErrorHandler.checkDiskSpace(path);

    res.json(diskSpace);
  } catch (error) {
    logger.error('Failed to check disk space', { error: error.message });
    res.status(500).json({ error: 'Failed to check disk space' });
  }
});

/**
 * POST /api/filesystem-errors/simulate-operation
 * Simulate a file operation with error handling
 */
router.post('/simulate-operation', async (req, res) => {
  try {
    const { operation, filePath, simulateError = null } = req.body;

    if (!operation || !filePath) {
      return res.status(400).json({
        error: 'Missing required fields: operation, filePath',
      });
    }

    // Simulate operation with optional error
    let result;
    if (simulateError) {
      const error = Object.assign(new Error(simulateError.message), {
        code: simulateError.code,
      });

      result = await fileSystemErrorHandler.handleError(
        error,
        operation,
        filePath,
        {
          simulated: true,
          ...simulateError.context,
        }
      );
    } else {
      // Actually perform the operation
      result = await fileSystemErrorHandler.wrapOperation(
        async () => {
          switch (operation) {
            case 'read':
              return await storageService.readFile(filePath);
            case 'write':
              return await storageService.saveFile(
                Buffer.from('test content'),
                'test-file.png',
                'temp'
              );
            case 'delete':
              return await storageService.deleteFile(filePath);
            default:
              throw new Error(`Unknown operation: ${operation}`);
          }
        },
        operation,
        filePath,
        {
          test: true,
        }
      );
    }

    res.json({
      operation,
      filePath,
      result,
    });
  } catch (error) {
    logger.error('Failed to simulate operation', { error: error.message });
    res.status(500).json({
      error: 'Operation failed',
      message: error.message,
      userMessage: error.userMessage,
      errorType: error.errorType,
    });
  }
});

export default router;
