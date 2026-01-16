import express from 'express';
const router = express.Router();
import VideoStyleAnalysisService from '../services/videoStyleAnalysis.js';

const service = new VideoStyleAnalysisService();

/**
 * GET /api/video-style-analysis/analyze
 * Get comprehensive video style analysis
 */
router.get('/analyze', async (req, res) => {
  try {
    const filters = {
      platform: req.query.platform,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      minViews: req.query.minViews ? parseInt(req.query.minViews) : undefined
    };

    const result = await service.analyze(filters);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in video style analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/video-style-analysis/summary
 * Get quick overview of style performance
 */
router.get('/summary', async (req, res) => {
  try {
    const filters = {
      platform: req.query.platform
    };

    const stats = service.getStatistics(filters);
    const ranked = service.rankStyles(filters);

    res.json({
      success: true,
      data: {
        statistics: stats,
        topStyle: ranked.top,
        bottomStyle: ranked.bottom,
        performanceGap: ranked.gap
      }
    });
  } catch (error) {
    console.error('Error getting summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/video-style-analysis/rankings
 * Get ranked video styles by performance
 */
router.get('/rankings', async (req, res) => {
  try {
    const filters = {
      platform: req.query.platform
    };

    const ranked = service.rankStyles(filters);

    res.json({
      success: true,
      data: ranked
    });
  } catch (error) {
    console.error('Error getting rankings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/video-style-analysis/style/:styleName
 * Get details for a specific video style
 */
router.get('/style/:styleName', async (req, res) => {
  try {
    const { styleName } = req.params;
    const filters = {
      platform: req.query.platform
    };

    const characteristics = service.analyzeStyleCharacteristics(filters);
    const styleDetails = characteristics.find(s => s.style === styleName);

    if (!styleDetails) {
      return res.status(404).json({
        success: false,
        error: `Style '${styleName}' not found`
      });
    }

    res.json({
      success: true,
      data: styleDetails
    });
  } catch (error) {
    console.error('Error getting style details:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/video-style-analysis/insights
 * Get insights only
 */
router.get('/insights', async (req, res) => {
  try {
    const filters = {
      platform: req.query.platform
    };

    const { insights, summary } = service.generateInsights(filters);

    res.json({
      success: true,
      data: {
        insights,
        summary
      }
    });
  } catch (error) {
    console.error('Error getting insights:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/video-style-analysis/recommendations
 * Get recommendations only
 */
router.get('/recommendations', async (req, res) => {
  try {
    const filters = {
      platform: req.query.platform
    };

    const { recommendations } = service.generateInsights(filters);

    res.json({
      success: true,
      data: {
        recommendations
      }
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/video-style-analysis/platform/:platform
 * Get analysis for specific platform
 */
router.get('/platform/:platform', async (req, res) => {
  try {
    const { platform } = req.params;

    const result = await service.analyze({ platform });

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error getting platform analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/video-style-analysis/cache/clear
 * Clear analysis cache
 */
router.post('/cache/clear', (req, res) => {
  try {
    const result = service.clearCache();
    res.json(result);
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/video-style-analysis/compare
 * Compare multiple styles
 */
router.get('/compare', async (req, res) => {
  try {
    const styles = req.query.styles ? req.query.styles.split(',') : [];
    const filters = {
      platform: req.query.platform
    };

    if (styles.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Please provide at least 2 styles to compare'
      });
    }

    const characteristics = service.analyzeStyleCharacteristics(filters);
    const stylesToCompare = characteristics.filter(s => styles.includes(s.style));

    if (stylesToCompare.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'None of the specified styles were found'
      });
    }

    res.json({
      success: true,
      data: {
        styles: stylesToCompare,
        comparison: {
          topPerformer: stylesToCompare.reduce((max, s) =>
            s.viralityScore > max.viralityScore ? s : max, stylesToCompare[0]
          ),
          average: {
            avgViews: stylesToCompare.reduce((sum, s) => sum + s.averages.avgViews, 0) / stylesToCompare.length,
            avgEngagementRate: stylesToCompare.reduce((sum, s) => sum + s.averages.avgEngagementRate, 0) / stylesToCompare.length,
            avgViralityScore: stylesToCompare.reduce((sum, s) => sum + s.viralityScore, 0) / stylesToCompare.length
          }
        }
      }
    });
  } catch (error) {
    console.error('Error comparing styles:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/video-style-analysis/top/:limit
 * Get top N performing styles
 */
router.get('/top/:limit', async (req, res) => {
  try {
    const limit = parseInt(req.params.limit) || 3;
    const filters = {
      platform: req.query.platform
    };

    const ranked = service.rankStyles(filters);
    const topStyles = ranked.ranked.slice(0, limit);

    res.json({
      success: true,
      data: {
        styles: topStyles,
        limit,
        total: ranked.ranked.length
      }
    });
  } catch (error) {
    console.error('Error getting top styles:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/video-style-analysis/stats
 * Get overall statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const filters = {
      platform: req.query.platform
    };

    const stats = service.getStatistics(filters);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
