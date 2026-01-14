import express from 'express';
import asoRankingService from '../services/asoRankingService.js';

const router = express.Router();

/**
 * GET /api/aso/keywords
 * Get all tracked keywords
 */
router.get('/keywords', async (req, res) => {
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
 * Get specific keyword details
 */
router.get('/keywords/:id', async (req, res) => {
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
 * Add a new keyword to track
 */
router.post('/keywords', async (req, res) => {
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
 * Update keyword details
 */
router.put('/keywords/:id', async (req, res) => {
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
export default router;
