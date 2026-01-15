import express from 'express';
import asoRankingService from '../services/asoRankingService.js';
import cacheService from '../services/cacheService.js';
import { cacheMiddleware, invalidateCache } from '../middleware/cache.js';

const router = express.Router();

/**
 * GET /api/aso/keywords
 * Get all tracked keywords (cached for 30 minutes)
 */
router.get('/keywords', cacheMiddleware('asoRankings'), async (req, res) => {
  try {
    const keywords = await asoRankingService.getCurrentRankings();
    res.json({
      success: true,
      data: keywords
    });
  } catch (error) {
    console.error('Error fetching keywords:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/aso/keywords/:id
 * Get specific keyword details (cached for 30 minutes)
 */
router.get('/keywords/:id', cacheMiddleware('asoRankings'), async (req, res) => {
  try {
    const trends = await asoRankingService.getKeywordTrends(req.params.id);
    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('Error fetching keyword trends:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/aso/keywords
 * Add a new keyword to track (invalidates cache)
 */
router.post('/keywords', invalidateCache('/api/aso/keywords'), async (req, res) => {
  try {
    const keyword = await asoRankingService.addKeyword(req.body);
    res.status(201).json({
      success: true,
      data: keyword
    });
  } catch (error) {
    console.error('Error adding keyword:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/aso/keywords/:id
 * Update keyword details (invalidates cache)
 */
router.put('/keywords/:id', invalidateCache('/api/aso/keywords'), async (req, res) => {
  try {
    const keyword = await asoRankingService.updateKeyword(req.params.id, req.body);
    res.json({
      success: true,
      data: keyword
    });
  } catch (error) {
    console.error('Error updating keyword:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/aso/keywords/:id
 * Remove keyword from tracking
 */
router.delete('/keywords/:id', async (req, res) => {
  try {
    const result = await asoRankingService.removeKeyword(req.params.id);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error deleting keyword:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/aso/keywords/initialize
 * Initialize with default target keywords
 */
router.post('/keywords/initialize', async (req, res) => {
  try {
    const result = await asoRankingService.initializeTargetKeywords();
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error initializing keywords:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/aso/rankings/update
 * Manually trigger ranking update for all keywords
 */
router.post('/rankings/update', async (req, res) => {
  try {
    const result = await asoRankingService.updateAllRankings();
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error updating rankings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/aso/opportunities
 * Get keyword opportunities
 */
router.get('/opportunities', async (req, res) => {
  try {
    const opportunities = await asoRankingService.getKeywordOpportunities();
    res.json({
      success: true,
      data: opportunities
    });
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/aso/performance
 * Get ASO performance summary
 */
router.get('/performance', async (req, res) => {
  try {
    const summary = await asoRankingService.getPerformanceSummary();
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching performance summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/aso/competitiveness
 * Get keyword competitiveness analysis
 * Returns keywords grouped by competition level with metrics
 */
router.get('/competitiveness', async (req, res) => {
  try {
    const ASOKeyword = (await import('../models/ASOKeyword.js')).default;

    // Fetch all keywords with competition and difficulty data
    const keywords = await ASOKeyword.find({}).sort({ difficulty: 1 });

    // Group by competition level
    const competitiveness = {
      low: {
        label: 'Low Competition',
        keywords: [],
        avgDifficulty: 0,
        totalVolume: 0,
        count: 0,
        color: '#00d26a' // Green
      },
      medium: {
        label: 'Medium Competition',
        keywords: [],
        avgDifficulty: 0,
        totalVolume: 0,
        count: 0,
        color: '#ffc107' // Yellow/Orange
      },
      high: {
        label: 'High Competition',
        keywords: [],
        avgDifficulty: 0,
        totalVolume: 0,
        count: 0,
        color: '#f94144' // Red
      }
    };

    // Categorize keywords
    keywords.forEach(kw => {
      const category = competitiveness[kw.competition];
      if (category) {
        category.keywords.push({
          keyword: kw.keyword,
          difficulty: kw.difficulty,
          volume: kw.volume,
          ranking: kw.ranking,
          opportunityScore: kw.opportunityScore,
          target: kw.target
        });
        category.totalVolume += kw.volume || 0;
        category.count++;
      }
    });

    // Calculate averages
    Object.keys(competitiveness).forEach(level => {
      const category = competitiveness[level];
      if (category.count > 0) {
        category.avgDifficulty = Math.round(
          category.keywords.reduce((sum, kw) => sum + kw.difficulty, 0) / category.count
        );
      }
    });

    // Find low-competition opportunities (high opportunity score, low competition)
    const lowCompetitionOpportunities = keywords
      .filter(kw => kw.competition === 'low' && kw.opportunityScore >= 60)
      .map(kw => ({
        keyword: kw.keyword,
        opportunityScore: kw.opportunityScore,
        volume: kw.volume,
        difficulty: kw.difficulty,
        ranking: kw.ranking
      }))
      .sort((a, b) => b.opportunityScore - a.opportunityScore)
      .slice(0, 10);

    // Calculate overall statistics
    const totalKeywords = keywords.length;
    const avgDifficulty = totalKeywords > 0
      ? Math.round(keywords.reduce((sum, kw) => sum + kw.difficulty, 0) / totalKeywords)
      : 0;

    res.json({
      success: true,
      data: {
        byLevel: competitiveness,
        lowCompetitionOpportunities,
        summary: {
          totalKeywords,
          avgDifficulty,
          lowCompetitionCount: competitiveness.low.count,
          highCompetitionCount: competitiveness.high.count
        }
      }
    });
  } catch (error) {
    console.error('Error fetching competitiveness analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/aso/keywords/history/:keyword
 * Get ranking history for a specific keyword
 */
router.get('/keywords/history/:keyword', async (req, res) => {
  try {
    const ASOKeyword = (await import('../models/ASOKeyword.js')).default;
    const keyword = req.params.keyword;

    const keywordData = await ASOKeyword.findOne({ keyword });

    if (!keywordData) {
      return res.status(404).json({
        success: false,
        error: 'Keyword not found'
      });
    }

    res.json({
      success: true,
      data: {
        keyword: keywordData.keyword,
        currentRanking: keywordData.ranking,
        history: keywordData.rankingHistory || []
      }
    });
  } catch (error) {
    console.error('Error fetching keyword history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/aso/suggestions
 * Get new keyword opportunity suggestions
 * Returns keywords not currently tracked that have high potential
 */
router.get('/suggestions', async (req, res) => {
  try {
    const suggestions = await asoRankingService.getKeywordSuggestions();
    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('Error fetching keyword suggestions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/aso/category/ranking
 * Get current category ranking for the app
 */
router.get('/category/ranking', async (req, res) => {
  try {
    const categoryRankingService = (await import('../services/categoryRankingService.js')).default;
    const ranking = await categoryRankingService.getCurrentRanking();

    res.json({
      success: true,
      data: ranking
    });
  } catch (error) {
    console.error('Error fetching category ranking:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/aso/category/history
 * Get category ranking history
 * Query params:
 * - days: Number of days to look back (default: 30)
 */
router.get('/category/history', async (req, res) => {
  try {
    const categoryRankingService = (await import('../services/categoryRankingService.js')).default;
    const days = parseInt(req.query.days) || 30;
    const history = await categoryRankingService.getRankingHistory(days);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching category ranking history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/aso/category/stats
 * Get category ranking statistics and trends
 */
router.get('/category/stats', async (req, res) => {
  try {
    const categoryRankingService = (await import('../services/categoryRankingService.js')).default;
    const stats = await categoryRankingService.getRankingStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching category ranking stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/aso/category/sync
 * Manually trigger category ranking sync
 * Fetches current ranking from App Store Connect and stores it
 */
router.post('/category/sync', async (req, res) => {
  try {
    const categoryRankingService = (await import('../services/categoryRankingService.js')).default;
    const ranking = await categoryRankingService.fetchAndStoreRanking();

    res.json({
      success: true,
      message: 'Category ranking synced successfully',
      data: ranking
    });
  } catch (error) {
    console.error('Error syncing category ranking:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/aso/competitors
 * Get list of identified competitor apps
 */
router.get('/competitors', async (req, res) => {
  try {
    const competitorKeywordService = (await import('../services/competitorKeywordService.js')).default;
    const competitors = await competitorKeywordService.identifyCompetitors();

    res.json({
      success: true,
      data: competitors
    });
  } catch (error) {
    console.error('Error fetching competitors:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/aso/competitors/data
 * Get competitor keyword tracking data
 */
router.get('/competitors/data', async (req, res) => {
  try {
    const competitorKeywordService = (await import('../services/competitorKeywordService.js')).default;
    const data = await competitorKeywordService.getCompetitorKeywordData();

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error fetching competitor data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/aso/competitors/strategy/:appId
 * Analyze competitor keyword strategy
 */
router.get('/competitors/strategy/:appId', async (req, res) => {
  try {
    const competitorKeywordService = (await import('../services/competitorKeywordService.js')).default;
    const strategy = await competitorKeywordService.analyzeCompetitorStrategy(req.params.appId);

    res.json({
      success: true,
      data: strategy
    });
  } catch (error) {
    console.error('Error analyzing competitor strategy:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/aso/competitors/track/:appId
 * Track keyword rankings for a specific competitor
 */
router.post('/competitors/track/:appId', async (req, res) => {
  try {
    const competitorKeywordService = (await import('../services/competitorKeywordService.js')).default;
    const result = await competitorKeywordService.trackCompetitorKeywords(req.params.appId);

    res.json({
      success: true,
      message: `Tracking ${result.keywordsTracked} keywords for competitor`,
      data: result
    });
  } catch (error) {
    console.error('Error tracking competitor keywords:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/aso/competitors/gaps
 * Identify keyword gaps where competitors outrank us
 */
router.get('/competitors/gaps', async (req, res) => {
  try {
    const competitorKeywordService = (await import('../services/competitorKeywordService.js')).default;
    const gaps = await competitorKeywordService.identifyKeywordGaps();

    res.json({
      success: true,
      data: gaps
    });
  } catch (error) {
    console.error('Error identifying keyword gaps:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/aso/competitors/insights
 * Generate competitive insights and recommendations
 */
router.get('/competitors/insights', async (req, res) => {
  try {
    const competitorKeywordService = (await import('../services/competitorKeywordService.js')).default;
    const insights = await competitorKeywordService.generateCompetitiveInsights();

    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('Error generating competitive insights:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/aso/competitors/history/:appId/:keyword
 * Get keyword ranking history for a competitor
 */
router.get('/competitors/history/:appId/:keyword', async (req, res) => {
  try {
    const competitorKeywordService = (await import('../services/competitorKeywordService.js')).default;
    const days = parseInt(req.query.days) || 30;
    const history = await competitorKeywordService.getCompetitorKeywordHistory(
      req.params.appId,
      decodeURIComponent(req.params.keyword),
      days
    );

    if (!history) {
      return res.status(404).json({
        success: false,
        error: 'Keyword history not found'
      });
    }

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching competitor keyword history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/aso/score
 * Get current ASO score
 */
router.get('/score', async (req, res) => {
  try {
    const asoScoreService = (await import('../services/asoScoreService.js')).default;
    const score = await asoScoreService.getASOScore();

    res.json({
      success: true,
      data: score
    });
  } catch (error) {
    console.error('Error fetching ASO score:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/aso/score/calculate
 * Recalculate ASO score
 */
router.post('/score/calculate', async (req, res) => {
  try {
    const asoScoreService = (await import('../services/asoScoreService.js')).default;
    const score = await asoScoreService.calculateASOScore();

    res.json({
      success: true,
      data: score,
      message: 'ASO score calculated successfully'
    });
  } catch (error) {
    console.error('Error calculating ASO score:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/aso/score/history
 * Get ASO score history
 */
router.get('/score/history', async (req, res) => {
  try {
    const asoScoreService = (await import('../services/asoScoreService.js')).default;
    const days = parseInt(req.query.days) || 30;
    const history = await asoScoreService.getASOScoreHistory(days);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching ASO score history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
