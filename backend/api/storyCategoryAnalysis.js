import express from 'express';
import storyCategoryAnalysisService from '../services/storyCategoryAnalysis.js';
import { getLogger } from '../utils/logger.js';

const router = express.Router();
const logger = getLogger('story-category-analysis-api', 'story-category-analysis-api');

/**
 * Story Category Analysis API Routes
 *
 * Provides endpoints for analyzing story category performance:
 * - Full category analysis and ranking
 * - Category-specific summaries
 * - Insights and recommendations
 * - Platform-specific breakdowns
 */

/**
 * GET /api/story-category-analysis/analyze
 * Perform full story category analysis
 *
 * Query params:
 * - platform: Filter by platform (optional)
 * - startDate: Filter by start date (optional)
 * - endDate: Filter by end date (optional)
 * - minViews: Minimum views threshold (default: 100)
 *
 * Returns: Complete analysis with rankings, insights, and recommendations
 */
router.get('/analyze', async (req, res) => {
  try {
    const { platform, startDate, endDate, minViews } = req.query;

    const filters = {
      platform,
      startDate,
      endDate,
      minViews: minViews ? parseInt(minViews) : 100
    };

    logger.info('Story category analysis requested', { filters });

    const result = await storyCategoryAnalysisService.analyzeCategories(filters);

    if (result.success) {
      res.json({
        success: true,
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || result.message
      });
    }
  } catch (error) {
    logger.error('Error in story category analysis', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/story-category-analysis/summary
 * Get category analysis summary (quick overview)
 *
 * Query params:
 * - platform: Filter by platform (optional)
 * - minViews: Minimum views threshold (default: 100)
 *
 * Returns: Summary of top/bottom performers
 */
router.get('/summary', async (req, res) => {
  try {
    const { platform, minViews } = req.query;

    const filters = {
      platform,
      minViews: minViews ? parseInt(minViews) : 100
    };

    logger.info('Category summary requested', { filters });

    const result = await storyCategoryAnalysisService.analyzeCategories(filters);

    if (result.success) {
      res.json({
        success: true,
        summary: result.summary,
        topPerformer: result.rankedCategories[0],
        bottomPerformer: result.rankedCategories[result.rankedCategories.length - 1]
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || result.message
      });
    }
  } catch (error) {
    logger.error('Error getting category summary', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/story-category-analysis/rankings
 * Get ranked list of all categories
 *
 * Query params:
 * - platform: Filter by platform (optional)
 * - minViews: Minimum views threshold (default: 100)
 *
 * Returns: Array of ranked categories with metrics
 */
router.get('/rankings', async (req, res) => {
  try {
    const { platform, minViews } = req.query;

    const filters = {
      platform,
      minViews: minViews ? parseInt(minViews) : 100
    };

    logger.info('Category rankings requested', { filters });

    const result = await storyCategoryAnalysisService.analyzeCategories(filters);

    if (result.success) {
      res.json({
        success: true,
        categories: result.rankedCategories,
        totalCategories: result.rankedCategories.length
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || result.message
      });
    }
  } catch (error) {
    logger.error('Error getting category rankings', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/story-category-analysis/category/:categoryName
 * Get detailed analysis for a specific category
 *
 * Path params:
 * - categoryName: Name of the category to analyze
 *
 * Query params:
 * - platform: Filter by platform (optional)
 * - minViews: Minimum views threshold (default: 100)
 *
 * Returns: Detailed category performance data
 */
router.get('/category/:categoryName', async (req, res) => {
  try {
    const { categoryName } = req.params;
    const { platform, minViews } = req.query;

    const filters = {
      platform,
      minViews: minViews ? parseInt(minViews) : 100
    };

    logger.info('Category details requested', { category: categoryName, filters });

    const result = await storyCategoryAnalysisService.getCategorySummary(
      decodeURIComponent(categoryName),
      filters
    );

    if (result.success) {
      res.json({
        success: true,
        data: result
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.message
      });
    }
  } catch (error) {
    logger.error('Error getting category details', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/story-category-analysis/insights
 * Get insights and recommendations
 *
 * Query params:
 * - platform: Filter by platform (optional)
 * - minViews: Minimum views threshold (default: 100)
 *
 * Returns: Array of insights and recommendations
 */
router.get('/insights', async (req, res) => {
  try {
    const { platform, minViews } = req.query;

    const filters = {
      platform,
      minViews: minViews ? parseInt(minViews) : 100
    };

    logger.info('Insights requested', { filters });

    const result = await storyCategoryAnalysisService.analyzeCategories(filters);

    if (result.success) {
      res.json({
        success: true,
        insights: result.insights,
        recommendations: result.recommendations
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || result.message
      });
    }
  } catch (error) {
    logger.error('Error getting insights', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/story-category-analysis/platform/:platform
 * Get category breakdown for a specific platform
 *
 * Path params:
 * - platform: Platform to analyze (tiktok, instagram, youtube_shorts)
 *
 * Query params:
 * - minViews: Minimum views threshold (default: 100)
 *
 * Returns: Category performance for specific platform
 */
router.get('/platform/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    const { minViews } = req.query;

    const filters = {
      platform,
      minViews: minViews ? parseInt(minViews) : 100
    };

    logger.info('Platform-specific analysis requested', { platform, filters });

    const result = await storyCategoryAnalysisService.analyzeCategories(filters);

    if (result.success) {
      // Filter to only include categories with data for this platform
      const categoriesWithData = result.rankedCategories.filter(
        cat => cat.platformAverages[platform]
      );

      res.json({
        success: true,
        platform,
        categories: categoriesWithData,
        totalCategories: categoriesWithData.length,
        topCategory: categoriesWithData[0]
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || result.message
      });
    }
  } catch (error) {
    logger.error('Error in platform-specific analysis', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/story-category-analysis/cache/clear
 * Clear the analysis cache
 *
 * Returns: Success message
 */
router.post('/cache/clear', (req, res) => {
  try {
    logger.info('Cache clear requested');
    storyCategoryAnalysisService.clearCache();

    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    logger.error('Error clearing cache', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/story-category-analysis/compare
 * Compare multiple categories
 *
 * Query params:
 * - categories: Comma-separated list of category names to compare
 * - platform: Filter by platform (optional)
 * - minViews: Minimum views threshold (default: 100)
 *
 * Returns: Side-by-side comparison of specified categories
 */
router.get('/compare', async (req, res) => {
  try {
    const { categories, platform, minViews } = req.query;

    if (!categories) {
      return res.status(400).json({
        success: false,
        error: 'Categories parameter is required'
      });
    }

    const categoryList = categories.split(',').map(c => c.trim());
    const filters = {
      platform,
      minViews: minViews ? parseInt(minViews) : 100
    };

    logger.info('Category comparison requested', { categories: categoryList, filters });

    const result = await storyCategoryAnalysisService.analyzeCategories(filters);

    if (result.success) {
      const comparison = result.rankedCategories.filter(cat =>
        categoryList.includes(cat.category)
      );

      res.json({
        success: true,
        categories: comparison,
        totalRequested: categoryList.length,
        totalFound: comparison.length
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || result.message
      });
    }
  } catch (error) {
    logger.error('Error comparing categories', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/story-category-analysis/top/:limit
 * Get top N performing categories
 *
 * Path params:
 * - limit: Number of top categories to return
 *
 * Query params:
 * - platform: Filter by platform (optional)
 * - minViews: Minimum views threshold (default: 100)
 *
 * Returns: Top performing categories
 */
router.get('/top/:limit', async (req, res) => {
  try {
    const { limit } = req.params;
    const { platform, minViews } = req.query;

    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid limit parameter'
      });
    }

    const filters = {
      platform,
      minViews: minViews ? parseInt(minViews) : 100
    };

    logger.info('Top categories requested', { limit: limitNum, filters });

    const result = await storyCategoryAnalysisService.analyzeCategories(filters);

    if (result.success) {
      const topCategories = result.rankedCategories.slice(0, limitNum);

      res.json({
        success: true,
        categories: topCategories,
        limit: limitNum,
        totalReturned: topCategories.length
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || result.message
      });
    }
  } catch (error) {
    logger.error('Error getting top categories', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/story-category-analysis/stats
 * Get overall statistics about category performance
 *
 * Query params:
 * - platform: Filter by platform (optional)
 * - minViews: Minimum views threshold (default: 100)
 *
 * Returns: Statistical summary (averages, medians, etc.)
 */
router.get('/stats', async (req, res) => {
  try {
    const { platform, minViews } = req.query;

    const filters = {
      platform,
      minViews: minViews ? parseInt(minViews) : 100
    };

    logger.info('Category statistics requested', { filters });

    const result = await storyCategoryAnalysisService.analyzeCategories(filters);

    if (result.success) {
      const categories = result.rankedCategories;

      // Calculate statistics
      const avgViews = categories.reduce((sum, cat) => sum + cat.averages.views, 0) / categories.length;
      const avgEngagementRate = categories.reduce((sum, cat) => sum + cat.calculatedEngagementRate, 0) / categories.length;
      const avgViralityScore = categories.reduce((sum, cat) => sum + cat.viralityScore, 0) / categories.length;

      const sortedViews = [...categories].sort((a, b) => a.averages.views - b.averages.views);
      const medianViews = sortedViews[Math.floor(sortedViews.length / 2)]?.averages.views || 0;

      res.json({
        success: true,
        stats: {
          totalCategories: categories.length,
          avgViews: Math.round(avgViews),
          medianViews,
          avgEngagementRate: parseFloat(avgEngagementRate.toFixed(2)),
          avgViralityScore: parseFloat(avgViralityScore.toFixed(2)),
          topCategory: categories[0].category,
          bottomCategory: categories[categories.length - 1].category
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || result.message
      });
    }
  } catch (error) {
    logger.error('Error getting category statistics', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
