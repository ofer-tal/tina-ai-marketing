/**
 * Manual Posting Fallback API Routes
 *
 * Provides endpoints to:
 * - Manually trigger manual posting fallback
 * - View export history
 * - Get export details
 * - Download export packages
 */

import express from 'express';
import manualPostingFallbackService from '../services/manualPostingFallbackService.js';
import MarketingPost from '../models/MarketingPost.js';
import { getLogger } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();
const logger = getLogger('api', 'manual-posting-fallback');

/**
 * POST /api/manual-posting-fallback/:postId
 * Manually trigger manual posting fallback for a failed post
 */
router.post('/:postId', async (req, res) => {
  try {
    const { postId } = req.params;

    logger.info('Manual fallback requested', { postId });

    // Find the post
    const post = await MarketingPost.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    // Check if post has failed
    if (post.status !== 'failed') {
      return res.status(400).json({
        success: false,
        error: 'Post has not failed. Manual posting fallback is only available for failed posts.',
      });
    }

    // Check if fallback already exists
    if (post.manualPostingTodoId) {
      return res.status(400).json({
        success: false,
        error: 'Manual posting fallback already exists for this post',
        existingTodoId: post.manualPostingTodoId,
      });
    }

    // Trigger manual posting fallback
    const result = await manualPostingFallbackService.handlePermanentFailure(post);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create manual posting fallback',
        details: result.error,
      });
    }

    // Update post with fallback reference
    post.manualPostingTodoId = result.todoId;
    post.manualPostingExportPath = result.exportPath;
    await post.save();

    logger.info('Manual fallback created successfully', {
      postId,
      todoId: result.todoId,
      exportPath: result.exportPath,
    });

    res.json({
      success: true,
      message: 'Manual posting fallback created successfully',
      data: {
        postId,
        todoId: result.todoId,
        exportPath: result.exportPath,
        instructions: result.instructions,
      },
    });

  } catch (error) {
    logger.error('Error creating manual posting fallback', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * GET /api/manual-posting-fallback/exports
 * Get list of all exported packages
 */
router.get('/exports', async (req, res) => {
  try {
    logger.info('Fetching export list');

    const exports = await manualPostingFallbackService.listExports();

    res.json({
      success: true,
      data: {
        exports,
        count: exports.length,
      },
    });

  } catch (error) {
    logger.error('Error fetching export list', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch export list',
      message: error.message,
    });
  }
});

/**
 * GET /api/manual-posting-fallback/export/:filename
 * Get details of a specific export package
 */
router.get('/export/:filename', async (req, res) => {
  try {
    const { filename } = req.params;

    logger.info('Fetching export details', { filename });

    const exportDir = manualPostingFallbackService.getExportDirectory();
    const filePath = path.join(exportDir, filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Export file not found',
      });
    }

    // Read and parse the export file
    const content = JSON.parse(await fs.readFile(filePath, 'utf-8'));

    res.json({
      success: true,
      data: content,
    });

  } catch (error) {
    logger.error('Error fetching export details', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch export details',
      message: error.message,
    });
  }
});

/**
 * GET /api/manual-posting-fallback/export/:filename/download
 * Download an export package
 */
router.get('/export/:filename/download', async (req, res) => {
  try {
    const { filename } = req.params;

    logger.info('Downloading export package', { filename });

    const exportDir = manualPostingFallbackService.getExportDirectory();
    const filePath = path.join(exportDir, filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Export file not found',
      });
    }

    // Stream the file to the client
    res.download(filePath, filename);

  } catch (error) {
    logger.error('Error downloading export package', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to download export package',
      message: error.message,
    });
  }
});

/**
 * GET /api/manual-posting-fallback/post/:postId
 * Get fallback details for a specific post
 */
router.get('/post/:postId', async (req, res) => {
  try {
    const { postId } = req.params;

    logger.info('Fetching fallback details for post', { postId });

    // Find the post
    const post = await MarketingPost.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    // Check if fallback exists
    if (!post.manualPostingTodoId) {
      return res.status(404).json({
        success: false,
        error: 'No manual posting fallback found for this post',
      });
    }

    // Get fallback details
    const fallbackInfo = {
      postId: post._id,
      todoId: post.manualPostingTodoId,
      exportPath: post.manualPostingExportPath,
      platform: post.platform,
      title: post.title,
      failedAt: post.failedAt || post.updatedAt,
      error: post.error,
      retryCount: post.retryCount || 0,
    };

    // Try to read the export file if it exists
    if (post.manualPostingExportPath) {
      try {
        const exportContent = JSON.parse(
          await fs.readFile(post.manualPostingExportPath, 'utf-8')
        );
        fallbackInfo.exportData = exportContent;
      } catch (err) {
        logger.warn('Could not read export file', {
          exportPath: post.manualPostingExportPath,
          error: err.message,
        });
      }
    }

    res.json({
      success: true,
      data: fallbackInfo,
    });

  } catch (error) {
    logger.error('Error fetching fallback details', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch fallback details',
      message: error.message,
    });
  }
});

/**
 * GET /api/manual-posting-fallback/stats
 * Get statistics about manual posting fallbacks
 */
router.get('/stats', async (req, res) => {
  try {
    logger.info('Fetching manual posting fallback stats');

    // Count posts with manual fallback
    const totalFallbacks = await MarketingPost.countDocuments({
      manualPostingTodoId: { $exists: true },
    });

    // Count by platform
    const fallbacksByPlatform = await MarketingPost.aggregate([
      { $match: { manualPostingTodoId: { $exists: true } } },
      {
        $group: {
          _id: '$platform',
          count: { $sum: 1 },
        },
      },
    ]);

    // Get recent fallbacks
    const recentFallbacks = await MarketingPost.find({
      manualPostingTodoId: { $exists: true },
    })
      .sort({ permanentlyFailedAt: -1 })
      .limit(10)
      .select('title platform permanentlyFailedAt error manualPostingTodoId');

    res.json({
      success: true,
      data: {
        totalFallbacks,
        byPlatform: fallbacksByPlatform.map(f => ({
          platform: f._id,
          count: f.count,
        })),
        recentFallbacks,
      },
    });

  } catch (error) {
    logger.error('Error fetching fallback stats', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch fallback stats',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/manual-posting-fallback/export/:filename
 * Delete an export package (cleanup)
 */
router.delete('/export/:filename', async (req, res) => {
  try {
    const { filename } = req.params;

    logger.info('Deleting export package', { filename });

    const exportDir = manualPostingFallbackService.getExportDirectory();
    const filePath = path.join(exportDir, filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Export file not found',
      });
    }

    // Delete the file
    await fs.unlink(filePath);

    logger.info('Export package deleted', { filename });

    res.json({
      success: true,
      message: 'Export package deleted successfully',
    });

  } catch (error) {
    logger.error('Error deleting export package', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to delete export package',
      message: error.message,
    });
  }
});

export default router;
