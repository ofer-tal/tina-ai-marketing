/**
 * TikTok Trending Audio API Routes
 *
 * Endpoints for querying and selecting trending audio for TikTok content.
 */

import express from 'express';
import tiktokTrendingAudioService from '../services/tiktokTrendingAudioService.js';
import { getLogger } from '../utils/logger.js';

const router = express.Router();
const logger = getLogger('api', 'tiktok-audio');

/**
 * GET /api/tiktok-audio/trending
 * Query trending audio tracks
 *
 * Query params:
 * - category: Filter by category (trending, viral, royalty-free)
 * - mood: Filter by mood (energetic, romantic, emotional, etc.)
 * - niche: Filter by content niche (romantic, spicy, drama, fantasy, etc.)
 * - genre: Filter by genre (pop, hip-hop, electronic, etc.)
 * - minPopularity: Minimum popularity score (0-100, default: 70)
 * - copyrightSafe: Only show copyright-safe tracks (true/false)
 * - limit: Max results (default: 20, max: 100)
 * - offset: Pagination offset (default: 0)
 */
router.get('/trending', async (req, res) => {
  try {
    const {
      category,
      mood,
      niche,
      genre,
      minPopularity,
      copyrightSafe,
      limit,
      offset
    } = req.query;

    const options = {
      category,
      mood,
      niche,
      genre,
      minPopularity: minPopularity ? parseInt(minPopularity) : 70,
      copyrightSafe: copyrightSafe === 'true',
      limit: limit ? Math.min(parseInt(limit), 100) : 20,
      offset: offset ? parseInt(offset) : 0
    };

    logger.info('Trending audio query requested', { options });

    const result = await tiktokTrendingAudioService.getTrendingAudio(options);

    res.json(result);
  } catch (error) {
    logger.error('Failed to query trending audio', {
      error: error.message,
      query: req.query
    });

    res.status(500).json({
      success: false,
      error: 'Failed to query trending audio',
      message: error.message
    });
  }
});

/**
 * POST /api/tiktok-audio/select
 * Select best audio track for content based on metadata
 *
 * Request body:
 * - niche: Content niche (romantic, spicy, drama, fantasy, etc.)
 * - mood: Desired mood (energetic, romantic, emotional, etc.)
 * - targetDuration: Target video duration in seconds (optional)
 * - excludeIds: Array of audio IDs to exclude (optional)
 * - preferCopyrightSafe: Prefer copyright-safe tracks (default: true)
 */
router.post('/select', async (req, res) => {
  try {
    const {
      niche,
      mood,
      targetDuration,
      excludeIds = [],
      preferCopyrightSafe = true
    } = req.body;

    if (!niche) {
      return res.status(400).json({
        success: false,
        error: 'niche is required'
      });
    }

    logger.info('Audio selection requested', {
      niche,
      mood,
      targetDuration,
      preferCopyrightSafe
    });

    const result = await tiktokTrendingAudioService.selectAudioForContent({
      niche,
      mood,
      targetDuration,
      excludeIds,
      preferCopyrightSafe
    });

    res.json(result);
  } catch (error) {
    logger.error('Failed to select audio', {
      error: error.message,
      body: req.body
    });

    res.status(500).json({
      success: false,
      error: 'Failed to select audio',
      message: error.message
    });
  }
});

/**
 * GET /api/tiktok-audio/track/:audioId
 * Get details of a specific audio track
 */
router.get('/track/:audioId', async (req, res) => {
  try {
    const { audioId } = req.params;

    logger.info('Audio track details requested', { audioId });

    const result = tiktokTrendingAudioService.getAudioById(audioId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Failed to get audio track', {
      error: error.message,
      audioId: req.params.audioId
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get audio track',
      message: error.message
    });
  }
});

/**
 * POST /api/tiktok-audio/verify
 * Verify that an audio track matches TikTok trends
 *
 * Request body:
 * - audioId: Audio track ID to verify
 */
router.post('/verify', async (req, res) => {
  try {
    const { audioId } = req.body;

    if (!audioId) {
      return res.status(400).json({
        success: false,
        error: 'audioId is required'
      });
    }

    logger.info('Audio track verification requested', { audioId });

    const result = await tiktokTrendingAudioService.verifyAudioTrack(audioId);

    res.json(result);
  } catch (error) {
    logger.error('Failed to verify audio track', {
      error: error.message,
      audioId: req.body.audioId
    });

    res.status(500).json({
      success: false,
      error: 'Failed to verify audio track',
      message: error.message
    });
  }
});

/**
 * POST /api/tiktok-audio/test-quality
 * Test audio file quality using FFprobe
 *
 * Request body:
 * - audioPath: Path to audio file to test
 */
router.post('/test-quality', async (req, res) => {
  try {
    const { audioPath } = req.body;

    if (!audioPath) {
      return res.status(400).json({
        success: false,
        error: 'audioPath is required'
      });
    }

    logger.info('Audio quality test requested', { audioPath });

    const result = await tiktokTrendingAudioService.testAudioQuality(audioPath);

    res.json(result);
  } catch (error) {
    logger.error('Failed to test audio quality', {
      error: error.message,
      audioPath: req.body.audioPath
    });

    res.status(500).json({
      success: false,
      error: 'Failed to test audio quality',
      message: error.message
    });
  }
});

/**
 * GET /api/tiktok-audio/stats
 * Get audio usage statistics
 */
router.get('/stats', async (req, res) => {
  try {
    logger.info('Audio stats requested');

    const stats = tiktokTrendingAudioService.getUsageStats();

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Failed to get audio stats', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get audio stats',
      message: error.message
    });
  }
});

/**
 * GET /api/tiktok-audio/health
 * Check service health and FFprobe availability
 */
router.get('/health', async (req, res) => {
  try {
    const health = await tiktokTrendingAudioService.healthCheck();

    res.json(health);
  } catch (error) {
    res.status(500).json({
      healthy: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tiktok-audio/categories
 * Get available audio categories and moods
 */
router.get('/categories', async (req, res) => {
  try {
    const stats = tiktokTrendingAudioService.getUsageStats();

    res.json({
      success: true,
      categories: Object.keys(stats.categories),
      moods: Object.keys(stats.moods),
      niches: ['romantic', 'spicy', 'drama', 'fantasy', 'contemporary', 'mystery'],
      genres: ['pop', 'hip-hop', 'electronic', 'dance', 'orchestral', 'r&b', 'soul', 'country', 'cinematic', 'ambient', 'soundtrack']
    });
  } catch (error) {
    logger.error('Failed to get categories', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get categories',
      message: error.message
    });
  }
});

export default router;
