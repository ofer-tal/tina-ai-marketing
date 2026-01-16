/**
 * Trending Topics API Routes
 * Feature #272: Topic suggestions based on trends
 */

import express from 'express';
import trendingTopicService from '../services/trendingTopicService.js';

const router = express.Router();

/**
 * GET /api/trending-topics/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    service: 'trending-topics',
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/trending-topics/monitor
 * Step 1: Monitor industry trends
 */
router.post('/monitor', async (req, res) => {
  try {
    const { timeframe, categories, sources } = req.body;

    const result = await trendingTopicService.monitorIndustryTrends({
      timeframe,
      categories,
      sources
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error monitoring trends:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/trending-topics/analyze-competitors
 * Step 2: Analyze competitor content
 */
router.post('/analyze-competitors', async (req, res) => {
  try {
    const { competitors, contentType, limit } = req.body;

    const result = await trendingTopicService.analyzeCompetitorContent({
      competitors,
      contentType,
      limit
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error analyzing competitors:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/trending-topics/identify-gaps
 * Step 3: Identify content gaps
 */
router.post('/identify-gaps', async (req, res) => {
  try {
    const { trendingThemes, competitorAnalysis, currentContent } = req.body;

    const result = await trendingTopicService.identifyContentGaps(
      trendingThemes,
      competitorAnalysis,
      { currentContent }
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error identifying gaps:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/trending-topics/generate-suggestions
 * Step 4: Generate topic suggestions
 */
router.post('/generate-suggestions', async (req, res) => {
  try {
    const { contentGaps, trendingThemes, contentType, count, targetAudience, tone } = req.body;

    const result = await trendingTopicService.generateTopicSuggestions(
      contentGaps,
      trendingThemes,
      { contentType, count, targetAudience, tone }
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error generating suggestions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/trending-topics/prioritize
 * Step 5: Prioritize by opportunity
 */
router.post('/prioritize', async (req, res) => {
  try {
    const { suggestions, priorities } = req.body;

    const result = await trendingTopicService.prioritizeByOpportunity(
      suggestions,
      { priorities }
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error prioritizing:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/trending-topics/comprehensive
 * Full workflow: All 5 steps combined
 */
router.post('/comprehensive', async (req, res) => {
  try {
    const options = req.body;

    console.log('Starting comprehensive trending topic analysis...');
    const result = await trendingTopicService.getComprehensiveTopicSuggestions(options);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in comprehensive workflow:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/trending-topics/dashboard
 * Get summary data for dashboard
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Run comprehensive analysis with default options
    const result = await trendingTopicService.getComprehensiveTopicSuggestions({
      timeframe: '7d',
      contentType: 'blog',
      count: 10
    });

    if (result.success) {
      // Return summary for dashboard
      res.json({
        success: true,
        summary: result.summary,
        suggestions: result.workflow.step5_prioritized.suggestions.slice(0, 5),
        priorityTiers: result.workflow.step5_prioritized.priorityTiers,
        quickWins: result.workflow.step5_prioritized.priorityTiers.quickWins,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/trending-topics/trends
 * Get current trending themes
 */
router.get('/trends', async (req, res) => {
  try {
    const { timeframe = '7d' } = req.query;

    const result = await trendingTopicService.monitorIndustryTrends({
      timeframe
    });

    if (result.success) {
      res.json({
        success: true,
        trendingThemes: result.trendingThemes,
        trendVelocity: result.trendVelocity,
        timeframe: result.timeframe
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error getting trends:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/trending-topics/suggestions
 * Get topic suggestions (shortcut endpoint)
 */
router.get('/suggestions', async (req, res) => {
  try {
    const {
      timeframe = '7d',
      contentType = 'blog',
      count = 10
    } = req.query;

    // Run full workflow and return suggestions
    const result = await trendingTopicService.getComprehensiveTopicSuggestions({
      timeframe,
      contentType: parseInt(count) || 10
    });

    if (result.success) {
      res.json({
        success: true,
        suggestions: result.workflow.step5_prioritized.suggestions,
        count: result.workflow.step5_prioritized.suggestions.length,
        summary: result.summary,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
