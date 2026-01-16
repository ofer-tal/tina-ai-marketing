import express from 'express';
import hashtagEffectivenessService from '../services/hashtagEffectivenessAnalysis.js';
import { getLogger } from '../utils/logger.js';

const router = express.Router();
const logger = getLogger('hashtag-effectiveness-analysis-api', 'hashtag-effectiveness-analysis-api');

/**
 * Hashtag Effectiveness Analysis API Routes
 *
 * Provides endpoints for tracking and analyzing hashtag performance:
 * - Extract and analyze hashtags from posts
 * - Calculate effectiveness scores
 * - Track trending hashtags
 * - Generate hashtag strategy recommendations
 */

/**
 * GET /api/hashtag-effectiveness/analyze
 * Perform complete hashtag effectiveness analysis
 *
 * Query params:
 * - platform: Filter by platform (optional)
 * - startDate: Filter by start date (optional)
 * - endDate: Filter by end date (optional)
 * - minViews: Minimum views threshold (default: 100)
 * - daysBack: Number of days for trending analysis (default: 7)
 *
 * Returns: Complete analysis with effectiveness scores, trending data, and recommendations
 */
router.get('/analyze', async (req, res) => {
  try {
    const { platform, startDate, endDate, minViews, daysBack } = req.query;

    const filters = {
      platform,
      startDate,
      endDate,
      minViews: minViews ? parseInt(minViews) : 100
    };

    logger.info('Hashtag effectiveness analysis requested', { filters, daysBack });

    const result = await hashtagEffectivenessService.analyze(filters);

    if (result.success) {
      res.json({
        success: true,
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Analysis failed'
      });
    }
  } catch (error) {
    logger.error('Error in hashtag effectiveness analysis', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * GET /api/hashtag-effectiveness/extract
 * Extract hashtags from posts
 *
 * Query params:
 * - platform: Filter by platform (optional)
 * - startDate: Filter by start date (optional)
 * - endDate: Filter by end date (optional)
 * - minViews: Minimum views threshold (default: 100)
 *
 * Returns: List of all hashtags with basic metrics
 */
router.get('/extract', async (req, res) => {
  try {
    const { platform, startDate, endDate, minViews } = req.query;

    const filters = {
      platform,
      startDate,
      endDate,
      minViews: minViews ? parseInt(minViews) : 100
    };

    logger.info('Hashtag extraction requested', { filters });

    const result = await hashtagEffectivenessService.extractHashtags(filters);

    if (result.success) {
      res.json({
        success: true,
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Extraction failed'
      });
    }
  } catch (error) {
    logger.error('Error extracting hashtags', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * GET /api/hashtag-effectiveness/correlate
 * Correlate hashtags with engagement metrics
 *
 * Query params:
 * - platform: Filter by platform (optional)
 * - startDate: Filter by start date (optional)
 * - endDate: Filter by end date (optional)
 * - minViews: Minimum views threshold (default: 100)
 *
 * Returns: Hashtags with engagement correlation data
 */
router.get('/correlate', async (req, res) => {
  try {
    const { platform, startDate, endDate, minViews } = req.query;

    const filters = {
      platform,
      startDate,
      endDate,
      minViews: minViews ? parseInt(minViews) : 100
    };

    logger.info('Hashtag engagement correlation requested', { filters });

    // Extract hashtags first
    const extraction = await hashtagEffectivenessService.extractHashtags(filters);
    if (!extraction.success) {
      return res.status(400).json({
        success: false,
        message: extraction.message || 'Extraction failed'
      });
    }

    // Correlate with engagement
    const correlation = await hashtagEffectivenessService.correlateWithEngagement(extraction.hashtags);

    if (correlation.success) {
      res.json({
        success: true,
        data: {
          totalHashtags: extraction.totalUniqueHashtags,
          hashtags: correlation.hashtags
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: correlation.message || 'Correlation failed'
      });
    }
  } catch (error) {
    logger.error('Error correlating hashtags with engagement', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * GET /api/hashtag-effectiveness/scores
 * Calculate effectiveness scores for hashtags
 *
 * Query params:
 * - platform: Filter by platform (optional)
 * - startDate: Filter by start date (optional)
 * - endDate: Filter by end date (optional)
 * - minViews: Minimum views threshold (default: 100)
 *
 * Returns: Hashtags with effectiveness scores and tiers
 */
router.get('/scores', async (req, res) => {
  try {
    const { platform, startDate, endDate, minViews } = req.query;

    const filters = {
      platform,
      startDate,
      endDate,
      minViews: minViews ? parseInt(minViews) : 100
    };

    logger.info('Hashtag effectiveness scoring requested', { filters });

    // Extract hashtags first
    const extraction = await hashtagEffectivenessService.extractHashtags(filters);
    if (!extraction.success) {
      return res.status(400).json({
        success: false,
        message: extraction.message || 'Extraction failed'
      });
    }

    // Correlate with engagement
    const correlation = await hashtagEffectivenessService.correlateWithEngagement(extraction.hashtags);
    if (!correlation.success) {
      return res.status(400).json({
        success: false,
        message: correlation.message || 'Correlation failed'
      });
    }

    // Calculate effectiveness scores
    const scoring = await hashtagEffectivenessService.calculateEffectivenessScore(correlation.hashtags);

    if (scoring.success) {
      res.json({
        success: true,
        data: {
          totalHashtags: extraction.totalUniqueHashtags,
          hashtags: scoring.hashtags
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: scoring.message || 'Scoring failed'
      });
    }
  } catch (error) {
    logger.error('Error calculating effectiveness scores', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * GET /api/hashtag-effectiveness/trending
 * Track trending hashtags
 *
 * Query params:
 * - platform: Filter by platform (optional)
 * - startDate: Filter by start date (optional)
 * - endDate: Filter by end date (optional)
 * - minViews: Minimum views threshold (default: 100)
 * - daysBack: Number of days for trending analysis (default: 7)
 *
 * Returns: Trending hashtags with direction and strength
 */
router.get('/trending', async (req, res) => {
  try {
    const { platform, startDate, endDate, minViews, daysBack } = req.query;

    const filters = {
      platform,
      startDate,
      endDate,
      minViews: minViews ? parseInt(minViews) : 100
    };

    const trendingDays = daysBack ? parseInt(daysBack) : 7;

    logger.info('Hashtag trending analysis requested', { filters, trendingDays });

    // Extract hashtags first
    const extraction = await hashtagEffectivenessService.extractHashtags(filters);
    if (!extraction.success) {
      return res.status(400).json({
        success: false,
        message: extraction.message || 'Extraction failed'
      });
    }

    // Correlate with engagement
    const correlation = await hashtagEffectivenessService.correlateWithEngagement(extraction.hashtags);
    if (!correlation.success) {
      return res.status(400).json({
        success: false,
        message: correlation.message || 'Correlation failed'
      });
    }

    // Calculate effectiveness scores
    const scoring = await hashtagEffectivenessService.calculateEffectivenessScore(correlation.hashtags);
    if (!scoring.success) {
      return res.status(400).json({
        success: false,
        message: scoring.message || 'Scoring failed'
      });
    }

    // Track trending
    const trending = await hashtagEffectivenessService.trackTrendingHashtags(scoring.hashtags, trendingDays);

    if (trending.success) {
      res.json({
        success: true,
        data: {
          totalHashtags: extraction.totalUniqueHashtags,
          analysisPeriod: trending.analysisPeriod,
          trending: trending.trending,
          falling: trending.falling,
          hashtags: trending.hashtags
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: trending.message || 'Trending analysis failed'
      });
    }
  } catch (error) {
    logger.error('Error tracking trending hashtags', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * GET /api/hashtag-effectiveness/recommendations
 * Generate hashtag strategy recommendations
 *
 * Query params:
 * - platform: Filter by platform (optional)
 * - startDate: Filter by start date (optional)
 * - endDate: Filter by end date (optional)
 * - minViews: Minimum views threshold (default: 100)
 * - daysBack: Number of days for trending analysis (default: 7)
 *
 * Returns: Hashtag strategy recommendations
 */
router.get('/recommendations', async (req, res) => {
  try {
    const { platform, startDate, endDate, minViews, daysBack } = req.query;

    const filters = {
      platform,
      startDate,
      endDate,
      minViews: minViews ? parseInt(minViews) : 100
    };

    const trendingDays = daysBack ? parseInt(daysBack) : 7;

    logger.info('Hashtag strategy recommendations requested', { filters, trendingDays });

    // Run full analysis
    const result = await hashtagEffectivenessService.analyze(filters);

    if (result.success) {
      res.json({
        success: true,
        data: {
          summary: result.summary,
          recommendations: result.hashtags,
          trending: result.trending
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Recommendation generation failed'
      });
    }
  } catch (error) {
    logger.error('Error generating hashtag recommendations', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * GET /api/hashtag-effectiveness/hashtag/:tag
 * Get details for a specific hashtag
 *
 * Path params:
 * - tag: Hashtag to analyze (without #)
 *
 * Query params:
 * - platform: Filter by platform (optional)
 * - startDate: Filter by start date (optional)
 * - endDate: Filter by end date (optional)
 * - minViews: Minimum views threshold (default: 100)
 *
 * Returns: Detailed metrics for the specified hashtag
 */
router.get('/hashtag/:tag', async (req, res) => {
  try {
    const { tag } = req.params;
    const { platform, startDate, endDate, minViews } = req.query;

    const filters = {
      platform,
      startDate,
      endDate,
      minViews: minViews ? parseInt(minViews) : 100
    };

    logger.info('Hashtag details requested', { tag, filters });

    // Extract hashtags
    const extraction = await hashtagEffectivenessService.extractHashtags(filters);
    if (!extraction.success) {
      return res.status(400).json({
        success: false,
        message: extraction.message || 'Extraction failed'
      });
    }

    // Find the requested hashtag
    const normalizedTag = tag.toLowerCase().replace(/^#+/, '');
    const hashtag = extraction.hashtags.find(h => h.hashtag === normalizedTag);

    if (!hashtag) {
      return res.status(404).json({
        success: false,
        message: `Hashtag "${tag}" not found`
      });
    }

    // Get full analysis for this hashtag
    const correlation = await hashtagEffectivenessService.correlateWithEngagement([hashtag]);
    const scoring = await hashtagEffectivenessService.calculateEffectivenessScore(correlation.hashtags);

    res.json({
      success: true,
      data: scoring.hashtags[0]
    });

  } catch (error) {
    logger.error('Error getting hashtag details', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * POST /api/hashtag-effectiveness/cache/clear
 * Clear the analysis cache
 *
 * Returns: Success message
 */
router.post('/cache/clear', async (req, res) => {
  try {
    logger.info('Cache clear requested');

    hashtagEffectivenessService.clearCache();

    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    logger.error('Error clearing cache', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * GET /api/hashtag-effectiveness/top/:limit
 * Get top performing hashtags
 *
 * Path params:
 * - limit: Number of hashtags to return
 *
 * Query params:
 * - platform: Filter by platform (optional)
 * - startDate: Filter by start date (optional)
 * - endDate: Filter by end date (optional)
 * - minViews: Minimum views threshold (default: 100)
 *
 * Returns: Top N hashtags by effectiveness score
 */
router.get('/top/:limit', async (req, res) => {
  try {
    const { limit } = req.params;
    const { platform, startDate, endDate, minViews } = req.query;

    const filters = {
      platform,
      startDate,
      endDate,
      minViews: minViews ? parseInt(minViews) : 100
    };

    const limitNum = parseInt(limit) || 10;

    logger.info('Top hashtags requested', { limit: limitNum, filters });

    // Run full analysis
    const result = await hashtagEffectivenessService.analyze(filters);

    if (result.success) {
      // Get all hashtags from recommendations
      const coreHashtags = result.hashtags
        .find(r => r.type === 'core')?.hashtags || [];
      const growthHashtags = result.hashtags
        .find(r => r.type === 'growth')?.hashtags || [];
      const varietyHashtags = result.hashtags
        .find(r => r.type === 'variety')?.hashtags || [];

      const allHashtags = [...coreHashtags, ...growthHashtags, ...varietyHashtags];

      res.json({
        success: true,
        data: {
          hashtags: allHashtags.slice(0, limitNum),
          total: allHashtags.length
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Analysis failed'
      });
    }
  } catch (error) {
    logger.error('Error getting top hashtags', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

export default router;
