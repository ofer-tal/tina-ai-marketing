/**
 * Platform Optimization API Routes
 *
 * Endpoints for optimizing content for different social media platforms
 */

import express from 'express';
import platformOptimizationService from '../services/platformOptimizationService.js';
import { getLogger } from '../utils/logger.js';

const router = express.Router();
const logger = getLogger('api', 'platform-optimization');

/**
 * POST /api/platform-optimization/base
 * Generate base content from original story content
 * Step 1: Generate base content
 */
router.post('/base', async (req, res) => {
  try {
    const { videoPath, caption, hashtags, storyId, title, category, spiciness } = req.body;

    if (!videoPath || !storyId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: videoPath, storyId',
      });
    }

    logger.info('Base content generation requested', { storyId, title });

    const baseContent = await platformOptimizationService.generateBaseContent({
      videoPath,
      caption: caption || '',
      hashtags: hashtags || [],
      storyId,
      title,
      category,
      spiciness,
      videoDuration: req.body.videoDuration,
      videoResolution: req.body.videoResolution,
    });

    res.json({
      success: true,
      data: baseContent,
    });
  } catch (error) {
    logger.error('Error generating base content', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/platform-optimization/tiktok
 * Create TikTok-optimized version
 * Step 2: Create TikTok-optimized version
 */
router.post('/tiktok', async (req, res) => {
  try {
    const baseContent = req.body;

    if (!baseContent.videoPath || !baseContent.storyId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields in base content',
      });
    }

    logger.info('TikTok optimization requested', { storyId: baseContent.storyId });

    const optimized = await platformOptimizationService.createTikTokOptimized(baseContent);

    res.json({
      success: true,
      data: optimized,
    });
  } catch (error) {
    logger.error('Error creating TikTok-optimized version', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/platform-optimization/instagram
 * Create Instagram-optimized version
 * Step 3: Create Instagram-optimized version
 */
router.post('/instagram', async (req, res) => {
  try {
    const baseContent = req.body;

    if (!baseContent.videoPath || !baseContent.storyId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields in base content',
      });
    }

    logger.info('Instagram optimization requested', { storyId: baseContent.storyId });

    const optimized = await platformOptimizationService.createInstagramOptimized(baseContent);

    res.json({
      success: true,
      data: optimized,
    });
  } catch (error) {
    logger.error('Error creating Instagram-optimized version', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/platform-optimization/youtube
 * Create YouTube Shorts-optimized version
 * Step 4: Create YouTube-optimized version
 */
router.post('/youtube', async (req, res) => {
  try {
    const baseContent = req.body;

    if (!baseContent.videoPath || !baseContent.storyId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields in base content',
      });
    }

    logger.info('YouTube Shorts optimization requested', { storyId: baseContent.storyId });

    const optimized = await platformOptimizationService.createYouTubeOptimized(baseContent);

    res.json({
      success: true,
      data: optimized,
    });
  } catch (error) {
    logger.error('Error creating YouTube Shorts-optimized version', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/platform-optimization/verify-all
 * Verify all platforms meet specifications
 * Step 5: Verify each meets platform specs
 */
router.post('/verify-all', async (req, res) => {
  try {
    const baseContent = req.body;

    if (!baseContent.videoPath || !baseContent.storyId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields in base content',
      });
    }

    logger.info('Full platform verification requested', { storyId: baseContent.storyId });

    const verification = await platformOptimizationService.verifyAllPlatforms(baseContent);

    res.json({
      success: true,
      data: verification,
    });
  } catch (error) {
    logger.error('Error verifying platforms', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/platform-optimization/specs/:platform
 * Get platform specifications
 */
router.get('/specs/:platform', (req, res) => {
  try {
    const { platform } = req.params;
    const validPlatforms = ['tiktok', 'instagram', 'youtube'];

    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({
        success: false,
        error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}`,
      });
    }

    const specs = platformOptimizationService.platformSpecs[platform];

    res.json({
      success: true,
      data: {
        platform,
        specs,
      },
    });
  } catch (error) {
    logger.error('Error getting platform specs', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/platform-optimization/specs
 * Get all platform specifications
 */
router.get('/specs', (req, res) => {
  try {
    res.json({
      success: true,
      data: platformOptimizationService.platformSpecs,
    });
  } catch (error) {
    logger.error('Error getting all platform specs', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
