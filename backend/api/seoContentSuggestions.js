/**
 * SEO Content Suggestions API Routes
 * Feature #267: SEO optimized content suggestions
 */

import express from 'express';
const router = express.Router();
import seoContentSuggestions from '../services/seoContentSuggestions.js';

/**
 * POST /api/seo-suggestions/analyze-keywords
 * Step 1: Analyze target keywords
 */
router.post('/analyze-keywords', async (req, res) => {
  try {
    const { keywords, contentType = 'blog' } = req.body;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Keywords array is required'
      });
    }

    const result = await seoContentSuggestions.analyzeKeywords(keywords, contentType);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in analyze-keywords endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/seo-suggestions/generate
 * Step 2: Generate content suggestions
 */
router.post('/generate', async (req, res) => {
  try {
    const { topic, keywords, contentType, targetAudience, tone, count } = req.body;

    if (!topic) {
      return res.status(400).json({
        success: false,
        error: 'Topic is required'
      });
    }

    if (!keywords || !Array.isArray(keywords)) {
      return res.status(400).json({
        success: false,
        error: 'Keywords array is required'
      });
    }

    const result = await seoContentSuggestions.generateContentSuggestions(
      topic,
      keywords,
      { contentType, targetAudience, tone, count }
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in generate endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/seo-suggestions/optimize
 * Step 3: Optimize content for SEO
 */
router.post('/optimize', async (req, res) => {
  try {
    const { content, keywords, targetDensity, includeLSI, optimizeStructure } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Keywords array is required'
      });
    }

    const result = await seoContentSuggestions.optimizeForSEO(
      content,
      keywords,
      { targetDensity, includeLSI, optimizeStructure }
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in optimize endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/seo-suggestions/meta-descriptions
 * Step 4: Generate meta descriptions
 */
router.post('/meta-descriptions', async (req, res) => {
  try {
    const { content, keywords, count, includeCallToAction, maxLength } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Keywords array is required'
      });
    }

    const result = await seoContentSuggestions.generateMetaDescriptions(
      content,
      keywords,
      { count, includeCallToAction, maxLength }
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in meta-descriptions endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/seo-suggestions/keyword-density
 * Step 5: Analyze keyword density
 */
router.post('/keyword-density', async (req, res) => {
  try {
    const { content, keywords } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Keywords array is required'
      });
    }

    const result = await seoContentSuggestions.analyzeKeywordDensity(content, keywords);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in keyword-density endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/seo-suggestions/dashboard
 * Get comprehensive SEO dashboard data
 */
router.get('/dashboard', async (req, res) => {
  try {
    const { topic, keywords } = req.query;

    if (!topic) {
      return res.status(400).json({
        success: false,
        error: 'Topic parameter is required'
      });
    }

    const keywordArray = keywords ? keywords.split(',') : [topic];

    // Get all data in parallel
    const [analysis, suggestions, density] = await Promise.all([
      seoContentSuggestions.analyzeKeywords(keywordArray),
      seoContentSuggestions.generateContentSuggestions(topic, keywordArray, { count: 5 }),
      seoContentSuggestions.analyzeKeywordDensity(`Sample content about ${topic}`, keywordArray)
    ]);

    res.json({
      success: true,
      topic,
      keywords: keywordArray,
      keywordAnalysis: analysis.success ? analysis : null,
      contentSuggestions: suggestions.success ? suggestions.suggestions : [],
      sampleDensity: density.success ? density : null,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in dashboard endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/seo-suggestions/complete
 * Generate complete SEO content package
 */
router.post('/complete', async (req, res) => {
  try {
    const { topic, keywords, contentType, targetAudience, tone } = req.body;

    if (!topic) {
      return res.status(400).json({
        success: false,
        error: 'Topic is required'
      });
    }

    const keywordArray = keywords || [topic];

    // Get complete package
    const [analysis, suggestions, metaDescriptions] = await Promise.all([
      seoContentSuggestions.analyzeKeywords(keywordArray, contentType),
      seoContentSuggestions.generateContentSuggestions(topic, keywordArray, {
        contentType,
        targetAudience,
        tone,
        count: 5
      }),
      seoContentSuggestions.generateMetaDescriptions(
        `Comprehensive guide about ${topic}`,
        keywordArray,
        { count: 5, includeCallToAction: true }
      )
    ]);

    res.json({
      success: true,
      topic,
      keywords: keywordArray,
      contentType,
      keywordAnalysis: analysis.success ? analysis : null,
      contentSuggestions: suggestions.success ? suggestions.suggestions : [],
      metaDescriptions: metaDescriptions.success ? metaDescriptions.descriptions : [],
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in complete endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
