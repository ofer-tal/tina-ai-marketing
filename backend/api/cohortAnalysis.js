import express from 'express';
const router = express.Router();
import CohortAnalysisService from '../services/cohortAnalysis.js';

const service = new CohortAnalysisService();

/**
 * GET /api/cohort-analysis/analyze
 * Get comprehensive cohort analysis
 */
router.get('/analyze', async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      channel: req.query.channel,
      subscriptionType: req.query.subscriptionType
    };

    const result = await service.analyze(filters);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error in cohort analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/cohort-analysis/summary
 * Get quick summary for dashboard
 */
router.get('/summary', async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      channel: req.query.channel,
      subscriptionType: req.query.subscriptionType
    };

    const result = await service.getSummary(filters);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error getting cohort summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/cohort-analysis/cohorts
 * Get cohorts grouped by acquisition month
 */
router.get('/cohorts', async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      channel: req.query.channel,
      subscriptionType: req.query.subscriptionType
    };

    const result = await service.groupUsersByAcquisitionMonth(filters);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error getting cohorts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/cohort-analysis/retention
 * Get retention metrics
 */
router.get('/retention', async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      channel: req.query.channel,
      subscriptionType: req.query.subscriptionType
    };

    const cohortData = await service.groupUsersByAcquisitionMonth(filters);
    const cohortsWithRetention = await service.trackRetentionOverTime(cohortData, filters);
    const retentionMetrics = await service.calculateRetentionRates(cohortsWithRetention);

    if (retentionMetrics.success) {
      res.json(retentionMetrics);
    } else {
      res.status(500).json(retentionMetrics);
    }
  } catch (error) {
    console.error('Error getting retention metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/cohort-analysis/heatmap
 * Get cohort heatmap data
 */
router.get('/heatmap', async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      channel: req.query.channel,
      subscriptionType: req.query.subscriptionType
    };

    const cohortData = await service.groupUsersByAcquisitionMonth(filters);
    const cohortsWithRetention = await service.trackRetentionOverTime(cohortData, filters);
    const heatmapData = await service.generateCohortHeatmap(cohortsWithRetention);

    if (heatmapData.success) {
      res.json(heatmapData);
    } else {
      res.status(500).json(heatmapData);
    }
  } catch (error) {
    console.error('Error getting heatmap data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/cohort-analysis/trends
 * Get retention trends and insights
 */
router.get('/trends', async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      channel: req.query.channel,
      subscriptionType: req.query.subscriptionType
    };

    const cohortData = await service.groupUsersByAcquisitionMonth(filters);
    const cohortsWithRetention = await service.trackRetentionOverTime(cohortData, filters);
    const retentionMetrics = await service.calculateRetentionRates(cohortsWithRetention);
    const trendsData = await service.identifyTrends(cohortsWithRetention, retentionMetrics);

    if (trendsData.success) {
      res.json(trendsData);
    } else {
      res.status(500).json(trendsData);
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
 * GET /api/cohort-analysis/cohort/:cohortId
 * Get details for a specific cohort
 */
router.get('/cohort/:cohortId', async (req, res) => {
  try {
    const { cohortId } = req.params;

    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      channel: req.query.channel,
      subscriptionType: req.query.subscriptionType
    };

    const cohortData = await service.groupUsersByAcquisitionMonth(filters);
    const cohort = cohortData.cohorts.find(c => c._id === cohortId);

    if (!cohort) {
      return res.status(404).json({
        success: false,
        error: 'Cohort not found'
      });
    }

    const cohortsWithRetention = await service.trackRetentionOverTime(
      { cohorts: [cohort] },
      filters
    );

    if (cohortsWithRetention.success) {
      res.json({
        success: true,
        cohort: cohortsWithRetention.cohorts[0]
      });
    } else {
      res.status(500).json(cohortsWithRetention);
    }
  } catch (error) {
    console.error('Error getting cohort details:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/cohort-analysis/cache/clear
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
 * GET /api/cohort-analysis/stats
 * Get overall statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const result = await service.getSummary();

    if (result.success) {
      res.json({
        success: true,
        stats: {
          totalCohorts: result.summary.totalCohorts,
          totalUsers: result.summary.totalUsers,
          overallRetention: result.summary.overallRetention
        }
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
