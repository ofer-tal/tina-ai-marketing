/**
 * SEO Keyword Recommendations API Routes
 * Feature #273: SEO keyword recommendations
 */

import express from 'express';
const router = express.Router();
import keywordRecommendationsService from '../services/keywordRecommendationsService.js';

/**
 * POST /api/keyword-recommendations/analyze-audience
 * Step 1: Analyze target audience search terms
 */
router.post('/analyze-audience', async (req, res) => {
  try {
    const { audience, topic, options } = req.body;

    if (!audience) {
      return res.status(400).json({
        success: false,
        error: 'Audience parameter is required'
      });
    }

    if (!topic) {
      return res.status(400).json({
        success: false,
        error: 'Topic parameter is required'
      });
    }

    const result = await keywordRecommendationsService.analyzeAudienceSearchTerms(
      audience,
      topic,
      options || {}
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in analyze-audience endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/keyword-recommendations/high-value
 * Step 2: Identify high-value keywords
 */
router.post('/high-value', async (req, res) => {
  try {
    const { topic, audienceAnalysis, options } = req.body;

    if (!topic) {
      return res.status(400).json({
        success: false,
        error: 'Topic parameter is required'
      });
    }

    const result = await keywordRecommendationsService.identifyHighValueKeywords(
      topic,
      audienceAnalysis || {},
      options || {}
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in high-value endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/keyword-recommendations/assess-difficulty
 * Step 3: Assess keyword difficulty
 */
router.post('/assess-difficulty', async (req, res) => {
  try {
    const { keywords, options } = req.body;

    if (!keywords) {
      return res.status(400).json({
        success: false,
        error: 'Keywords parameter is required'
      });
    }

    const keywordList = Array.isArray(keywords) ? keywords : [keywords];

    if (keywordList.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one keyword is required'
      });
    }

    const result = await keywordRecommendationsService.assessKeywordDifficulty(
      keywordList,
      options || {}
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in assess-difficulty endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/keyword-recommendations/generate-list
 * Step 4: Generate comprehensive keyword list
 */
router.post('/generate-list', async (req, res) => {
  try {
    const { topic, audienceAnalysis, options } = req.body;

    if (!topic) {
      return res.status(400).json({
        success: false,
        error: 'Topic parameter is required'
      });
    }

    const result = await keywordRecommendationsService.generateKeywordList(
      topic,
      audienceAnalysis || {},
      options || {}
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in generate-list endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/keyword-recommendations/usage-guidance
 * Step 5: Provide usage guidance
 */
router.post('/usage-guidance', async (req, res) => {
  try {
    const { keywords, contentType, options } = req.body;

    if (!keywords) {
      return res.status(400).json({
        success: false,
        error: 'Keywords parameter is required'
      });
    }

    const keywordList = Array.isArray(keywords) ? keywords : [keywords];

    if (keywordList.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one keyword is required'
      });
    }

    const result = await keywordRecommendationsService.provideUsageGuidance(
      keywordList,
      contentType || 'blog',
      options || {}
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in usage-guidance endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/keyword-recommendations/complete
 * Complete workflow: Get all recommendations in one call
 */
router.post('/complete', async (req, res) => {
  try {
    const { topic, options } = req.body;

    if (!topic) {
      return res.status(400).json({
        success: false,
        error: 'Topic parameter is required'
      });
    }

    const result = await keywordRecommendationsService.getCompleteRecommendations(
      topic,
      options || {}
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in complete endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/keyword-recommendations/health
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  res.json({
    success: true,
    service: 'keyword-recommendations',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/keyword-recommendations/dashboard
 * Get dashboard data for a topic
 */
router.get('/dashboard', async (req, res) => {
  try {
    const { topic, audience = 'general', contentType = 'blog' } = req.query;

    if (!topic) {
      return res.status(400).json({
        success: false,
        error: 'Topic parameter is required'
      });
    }

    // Get complete recommendations
    const result = await keywordRecommendationsService.getCompleteRecommendations(
      topic,
      { audience, contentType }
    );

    if (result.success) {
      // Transform for dashboard display
      const dashboard = {
        success: true,
        topic,
        summary: {
          totalKeywords: result.keywordList?.totalKeywords || 0,
          quickWins: result.keywordList?.summary?.totalQuickWins || 0,
          highValue: result.keywordList?.summary?.totalHighValue || 0,
          avgDifficulty: result.keywordList?.summary?.avgDifficulty || 0
        },
        topQuickWins: result.keywordList?.quickWins?.slice(0, 10) || [],
        topOpportunities: result.keywordList?.topOpportunities?.slice(0, 10) || [],
        usageGuidance: result.usageGuidance?.guidance || null,
        audienceInsights: result.audienceAnalysis || null,
        generatedAt: result.generatedAt
      };

      res.json(dashboard);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in dashboard endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
