/**
 * Churn Prediction API Routes
 *
 * Endpoints for predicting user churn and identifying at-risk users
 */

import express from 'express';
import mongoose from 'mongoose';
import { churnPredictionService } from '../services/churnPrediction.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('churn-prediction-api');

const router = express.Router();

/**
 * GET /api/churn-prediction/analyze-patterns
 * Analyze churned user patterns (Step 1)
 */
router.get('/analyze-patterns', async (req, res) => {
  try {
    logger.info('[churn-prediction-api] Analyzing churned user patterns');

    const analysis = await churnPredictionService.analyzeChurnedUserPatterns(req.query);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    logger.error('[churn-prediction-api] Error analyzing patterns:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/churn-prediction/indicators
 * Identify churn indicators (Step 2)
 */
router.get('/indicators', async (req, res) => {
  try {
    logger.info('[churn-prediction-api] Identifying churn indicators');

    const indicators = await churnPredictionService.identifyChurnIndicators(req.query);

    res.json({
      success: true,
      data: indicators
    });
  } catch (error) {
    logger.error('[churn-prediction-api] Error identifying indicators:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/churn-prediction/model
 * Get or train predictive model (Step 3)
 */
router.get('/model', async (req, res) => {
  try {
    logger.info('[churn-prediction-api] Training predictive model');

    const model = await churnPredictionService.trainPredictiveModel(req.query);

    res.json({
      success: true,
      data: model
    });
  } catch (error) {
    logger.error('[churn-prediction-api] Error training model:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/churn-prediction/score-users
 * Score current users by churn risk (Step 4)
 */
router.get('/score-users', async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    logger.info('[churn-prediction-api] Scoring current users', { limit });

    const scores = await churnPredictionService.scoreCurrentUsers({ limit: parseInt(limit) });

    res.json({
      success: true,
      data: scores
    });
  } catch (error) {
    logger.error('[churn-prediction-api] Error scoring users:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/churn-prediction/at-risk
 * Flag at-risk users (Step 5)
 */
router.get('/at-risk', async (req, res) => {
  try {
    const { threshold = 0.7 } = req.query;

    logger.info('[churn-prediction-api] Flagging at-risk users', { threshold });

    const atRisk = await churnPredictionService.flagAtRiskUsers({ threshold: parseFloat(threshold) });

    res.json({
      success: true,
      data: atRisk
    });
  } catch (error) {
    logger.error('[churn-prediction-api] Error flagging at-risk users:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/churn-prediction/dashboard
 * Get dashboard summary with all key metrics
 */
router.get('/dashboard', async (req, res) => {
  try {
    logger.info('[churn-prediction-api] Getting dashboard summary');

    const [patterns, indicators, model, scores, atRisk] = await Promise.all([
      churnPredictionService.analyzeChurnedUserPatterns(),
      churnPredictionService.identifyChurnIndicators(),
      churnPredictionService.trainPredictiveModel(),
      churnPredictionService.scoreCurrentUsers({ limit: 50 }),
      churnPredictionService.flagAtRiskUsers({ threshold: 0.7 })
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalUsersScored: scores.statistics.totalUsers,
          highRiskUsers: scores.statistics.highRisk,
          mediumRiskUsers: scores.statistics.mediumRisk,
          lowRiskUsers: scores.statistics.lowRisk,
          avgChurnScore: scores.statistics.avgChurnScore.toFixed(2),
          atRiskUsersRequiringAttention: atRisk.users.length,
          criticalUsers: atRisk.insights.criticalCount,
          modelAccuracy: (model.accuracy * 100).toFixed(1) + '%',
          potentialRevenueLoss: atRisk.insights.potentialRevenueLoss
        },
        patterns,
        indicators,
        model,
        scores,
        atRisk
      }
    });
  } catch (error) {
    logger.error('[churn-prediction-api] Error getting dashboard:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/churn-prediction/user/:userId
 * Get churn prediction for a specific user
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    logger.info('[churn-prediction-api] Getting user churn prediction', { userId });

    const model = await churnPredictionService.trainPredictiveModel();
    const user = await mongoose.connection.db.collection('users')
      .findOne({ userId: userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const score = churnPredictionService.calculateChurnScore(user, model.features);
    const riskLevel = churnPredictionService.getRiskLevel(score, model.thresholds);
    const factors = churnPredictionService.getRiskFactors(user, model.features);
    const recommendations = churnPredictionService.getRecommendations(user, riskLevel);

    res.json({
      success: true,
      data: {
        userId: user.userId,
        churnScore: score,
        riskLevel,
        factors,
        recommendations,
        lastActivityDate: user.lastActivityDate,
        subscriptionTier: user.subscriptionTier
      }
    });
  } catch (error) {
    logger.error('[churn-prediction-api] Error getting user prediction:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/churn-prediction/cache/clear
 * Clear the prediction cache
 */
router.post('/cache/clear', async (req, res) => {
  try {
    logger.info('[churn-prediction-api] Clearing cache');

    churnPredictionService.clearCache();

    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    logger.error('[churn-prediction-api] Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/churn-prediction/export
 * Export churn predictions as CSV
 */
router.get('/export', async (req, res) => {
  try {
    logger.info('[churn-prediction-api] Exporting churn predictions');

    const scores = await churnPredictionService.scoreCurrentUsers({ limit: 1000 });

    // Convert to CSV
    const headers = ['User ID', 'Email', 'Churn Score', 'Risk Level', 'Last Activity', 'Subscription Tier', 'Stories Read'];
    const rows = scores.users.map(user => [
      user.userId,
      user.email || 'N/A',
      user.churnScore.toFixed(2),
      user.riskLevel,
      user.lastActivityDate,
      user.subscriptionTier,
      user.totalStoriesRead
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="churn-predictions-${Date.now()}.csv"`);

    res.send(csv);
  } catch (error) {
    logger.error('[churn-prediction-api] Error exporting predictions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/churn-prediction/insights
 * Get churn insights and recommendations
 */
router.get('/insights', async (req, res) => {
  try {
    logger.info('[churn-prediction-api] Getting churn insights');

    const [patterns, indicators, atRisk] = await Promise.all([
      churnPredictionService.analyzeChurnedUserPatterns(),
      churnPredictionService.identifyChurnIndicators(),
      churnPredictionService.flagAtRiskUsers({ threshold: 0.7 })
    ]);

    const insights = {
      topChurnIndicators: indicators.indicators.slice(0, 3),
      commonChurnPatterns: patterns.patterns.behavioralPatterns,
      atRiskUserStats: atRisk.insights,
      quickWins: atRisk.insights.quickWins,
      recommendations: [
        {
          priority: 'high',
          action: 'Implement re-engagement campaign for inactive users',
          expectedImpact: '10-15% recovery rate'
        },
        {
          priority: 'high',
          action: 'Offer premium trials to high-risk free tier users',
          expectedImpact: '8-12% conversion rate'
        },
        {
          priority: 'medium',
          action: 'Improve onboarding for new users',
          expectedImpact: '5-10% reduction in 30-day churn'
        }
      ]
    };

    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    logger.error('[churn-prediction-api] Error getting insights:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
