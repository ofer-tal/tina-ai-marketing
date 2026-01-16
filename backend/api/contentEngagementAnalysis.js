import express from 'express';
import winston from 'winston';
import contentEngagementAnalysisService from '../services/contentEngagementAnalysis.js';

const router = express.Router();

// Create logger for content engagement analysis API
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'content-engagement-analysis-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/content-engagement-analysis-api-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/content-engagement-analysis-api.log' }),
  ],
});

/**
 * POST /api/content-engagement/analyze
 * Run full engagement correlation analysis
 */
router.post('/analyze', async (req, res) => {
  try {
    logger.info('Engagement analysis requested', { body: req.body });

    const filters = {
      platform: req.body.platform,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      minViews: req.body.minViews
    };

    const result = await contentEngagementAnalysisService.analyzeEngagement(filters);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Engagement analysis API error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/content-engagement/features
 * Extract content features without full analysis
 */
router.get('/features', async (req, res) => {
  try {
    logger.info('Feature extraction requested', { query: req.query });

    const filters = {
      platform: req.query.platform,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      minViews: parseInt(req.query.minViews) || 100
    };

    const result = await contentEngagementAnalysisService.extractContentFeatures(filters);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Feature extraction API error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/content-engagement/correlations
 * Get correlation data only
 */
router.get('/correlations', async (req, res) => {
  try {
    logger.info('Correlation data requested', { query: req.query });

    const filters = {
      platform: req.query.platform,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      minViews: parseInt(req.query.minViews) || 100
    };

    const featuresResult = await contentEngagementAnalysisService.extractContentFeatures(filters);
    if (!featuresResult.success) {
      return res.status(400).json(featuresResult);
    }

    const correlationsResult = await contentEngagementAnalysisService.correlateWithEngagement(featuresResult.features);

    res.json({
      success: true,
      data: correlationsResult
    });

  } catch (error) {
    logger.error('Correlations API error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/content-engagement/patterns
 * Get high-performing patterns
 */
router.get('/patterns', async (req, res) => {
  try {
    logger.info('Pattern identification requested', { query: req.query });

    const filters = {
      platform: req.query.platform,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      minViews: parseInt(req.query.minViews) || 100
    };

    const analysisResult = await contentEngagementAnalysisService.analyzeEngagement(filters);

    if (!analysisResult.success) {
      return res.status(400).json(analysisResult);
    }

    res.json({
      success: true,
      data: analysisResult.patterns
    });

  } catch (error) {
    logger.error('Patterns API error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/content-engagement/insights
 * Get insights only
 */
router.get('/insights', async (req, res) => {
  try {
    logger.info('Insights requested', { query: req.query });

    const filters = {
      platform: req.query.platform,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      minViews: parseInt(req.query.minViews) || 100
    };

    const analysisResult = await contentEngagementAnalysisService.analyzeEngagement(filters);

    if (!analysisResult.success) {
      return res.status(400).json(analysisResult);
    }

    res.json({
      success: true,
      data: analysisResult.insights
    });

  } catch (error) {
    logger.error('Insights API error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/content-engagement/recommendations
 * Get recommendations only
 */
router.get('/recommendations', async (req, res) => {
  try {
    logger.info('Recommendations requested', { query: req.query });

    const filters = {
      platform: req.query.platform,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      minViews: parseInt(req.query.minViews) || 100
    };

    const analysisResult = await contentEngagementAnalysisService.analyzeEngagement(filters);

    if (!analysisResult.success) {
      return res.status(400).json(analysisResult);
    }

    res.json({
      success: true,
      data: analysisResult.recommendations
    });

  } catch (error) {
    logger.error('Recommendations API error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/content-engagement/summary
 * Get summary statistics
 */
router.get('/summary', async (req, res) => {
  try {
    logger.info('Summary requested');

    const result = await contentEngagementAnalysisService.getSummary();

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Summary API error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/content-engagement/cache/clear
 * Clear analysis cache
 */
router.post('/cache/clear', async (req, res) => {
  try {
    logger.info('Cache clear requested');

    contentEngagementAnalysisService.clearCache();

    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });

  } catch (error) {
    logger.error('Cache clear API error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/content-engagement/by-category/:category
 * Get engagement data for specific category
 */
router.get('/by-category/:category', async (req, res) => {
  try {
    logger.info('Category analysis requested', { category: req.params.category });

    const filters = {
      platform: req.query.platform,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      minViews: parseInt(req.query.minViews) || 100
    };

    const analysisResult = await contentEngagementAnalysisService.analyzeEngagement(filters);

    if (!analysisResult.success) {
      return res.status(400).json(analysisResult);
    }

    // Filter for requested category
    const categoryData = analysisResult.correlations?.correlations?.byCategory?.[req.params.category];

    if (!categoryData) {
      return res.status(404).json({
        success: false,
        error: `Category "${req.params.category}" not found in analysis`
      });
    }

    res.json({
      success: true,
      data: {
        category: req.params.category,
        stats: categoryData
      }
    });

  } catch (error) {
    logger.error('Category analysis API error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/content-engagement/by-spiciness/:level
 * Get engagement data for specific spiciness level
 */
router.get('/by-spiciness/:level', async (req, res) => {
  try {
    logger.info('Spiciness analysis requested', { level: req.params.level });

    const filters = {
      platform: req.query.platform,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      minViews: parseInt(req.query.minViews) || 100
    };

    const analysisResult = await contentEngagementAnalysisService.analyzeEngagement(filters);

    if (!analysisResult.success) {
      return res.status(400).json(analysisResult);
    }

    // Filter for requested spiciness level
    const levelData = analysisResult.correlations?.correlations?.bySpiciness?.[req.params.level];

    if (!levelData) {
      return res.status(404).json({
        success: false,
        error: `Spiciness level "${req.params.level}" not found in analysis`
      });
    }

    res.json({
      success: true,
      data: {
        spiciness: parseInt(req.params.level),
        stats: levelData
      }
    });

  } catch (error) {
    logger.error('Spiciness analysis API error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
