import express from 'express';
import multer from 'multer';
import storageService from '../services/storage.js';
import logger from '../services/logger.js';

const router = express.Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max
  },
});

/**
 * GET /api/storage/status
 * Get storage service status and statistics
 */
router.get('/status', async (req, res) => {
  try {
    const status = await storageService.getStatus();
    res.json(status);
  } catch (error) {
    logger.error('Failed to get storage status', { error: error.message });
    res.status(500).json({ error: 'Failed to get storage status' });
  }
});

/**
 * GET /api/storage/files/:type
 * List files in a specific directory
 * @param {string} type - File type (image, video, audio, temp)
 */
router.get('/files/:type', async (req, res) => {
  try {
    const { type } = req.params;

    // Validate type
    const validTypes = ['image', 'video', 'audio', 'temp'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid file type' });
    }

    const files = await storageService.listFiles(type);
    res.json({ type, files, count: files.length });
  } catch (error) {
    logger.error('Failed to list files', { error: error.message });
    res.status(500).json({ error: 'Failed to list files' });
  }
});

/**
 * POST /api/storage/upload
 * Upload a file to storage
 * Body: multipart/form-data with 'file' field
 * Query params:
 *   - type: file type (image, video, audio, temp)
 *   - prefix: optional filename prefix
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { type, prefix } = req.query;
    const fileType = type || storageService.getFileType(req.file.originalname);

    // Generate filename
    const filename = storageService.generateFilename(req.file.originalname, prefix);

    // Save file
    const result = await storageService.saveFile(req.file.buffer, filename, fileType);

    res.json({
      success: true,
      file: result,
    });
  } catch (error) {
    logger.error('Failed to upload file', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/storage/save-buffer
 * Save a buffer directly to storage
 * Body: { buffer (base64), extension, type, prefix }
 */
router.post('/save-buffer', async (req, res) => {
  try {
    const { buffer, extension, type, prefix } = req.body;

    if (!buffer || !extension || !type) {
      return res.status(400).json({
        error: 'Missing required fields: buffer, extension, type',
      });
    }

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(buffer, 'base64');

    // Save buffer
    const result = await storageService.saveBuffer(fileBuffer, extension, type, prefix);

    res.json({
      success: true,
      file: result,
    });
  } catch (error) {
    logger.error('Failed to save buffer', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/storage/file/:path
 * Retrieve a file from storage
 * @param {string} path - Relative path from storage base
 */
router.get('/file/*', async (req, res) => {
  try {
    const relativePath = req.params[0]; // Get everything after /file/

    if (!relativePath) {
      return res.status(400).json({ error: 'No file path specified' });
    }

    const content = await storageService.readFile(relativePath);

    // Determine content type
    const ext = relativePath.split('.').pop().toLowerCase();
    const contentTypes = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      webm: 'video/webm',
      mp3: 'audio/mpeg',
      m4a: 'audio/mp4',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';

    res.set('Content-Type', contentType);
    res.send(content);
  } catch (error) {
    logger.error('Failed to retrieve file', { error: error.message });
    res.status(404).json({ error: 'File not found' });
  }
});

/**
 * DELETE /api/storage/file/:path
 * Delete a file from storage
 * @param {string} path - Relative path from storage base
 */
router.delete('/file/*', async (req, res) => {
  try {
    const relativePath = req.params[0]; // Get everything after /file/

    if (!relativePath) {
      return res.status(400).json({ error: 'No file path specified' });
    }

    const result = await storageService.deleteFile(relativePath);

    res.json(result);
  } catch (error) {
    logger.error('Failed to delete file', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/storage/move-from-temp
 * Move a file from temp to permanent storage
 * Body: { tempPath, targetType }
 */
router.post('/move-from-temp', async (req, res) => {
  try {
    const { tempPath, targetType } = req.body;

    if (!tempPath || !targetType) {
      return res.status(400).json({
        error: 'Missing required fields: tempPath, targetType',
      });
    }

    const result = await storageService.moveFromTemp(tempPath, targetType);

    res.json({
      success: true,
      file: result,
    });
  } catch (error) {
    logger.error('Failed to move file from temp', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/storage/cleanup-orphans
 * Clean up orphaned files not in database
 * Body: { validPaths: array of valid file paths }
 */
router.post('/cleanup-orphans', async (req, res) => {
  try {
    const { validPaths } = req.body;

    if (!Array.isArray(validPaths)) {
      return res.status(400).json({ error: 'validPaths must be an array' });
    }

    const result = await storageService.cleanupOrphans(validPaths);

    res.json(result);
  } catch (error) {
    logger.error('Failed to cleanup orphans', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/storage/clear-temp
 * Clear all files from temp directory
 */
router.post('/clear-temp', async (req, res) => {
  try {
    const result = await storageService.clearTemp();

    res.json(result);
  } catch (error) {
    logger.error('Failed to clear temp directory', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/storage/stats
 * Get storage statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await storageService.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get storage stats', { error: error.message });
    res.status(500).json({ error: 'Failed to get storage stats' });
  }
});

export default router;
