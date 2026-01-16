import express from 'express';
import abTestStatisticsService from '../services/abTestStatisticsService.js';

const router = express.Router();

/**
 * GET /api/ab-test-statistics/results/:experimentId
 * Fetch A/B test results for statistical analysis
 */
router.get('/results/:experimentId', async (req, res) => {
  try {
    const results = await abTestStatisticsService.getABTestResults(req.params.experimentId);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error fetching A/B test results:', error);

    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/ab-test-statistics/test
 * Apply statistical test to A/B test results
 * Body:
 * - experimentId: Experiment ID
 * - testType: Type of test (ztest, ttest, chisquare, fisher)
 */
router.post('/test', async (req, res) => {
  try {
    const { experimentId, testType = 'ztest' } = req.body;

    if (!experimentId) {
      return res.status(400).json({
        success: false,
        error: 'experimentId is required'
      });
    }

    const results = await abTestStatisticsService.applyStatisticalTest(experimentId, testType);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error applying statistical test:', error);

    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ab-test-statistics/p-value/:experimentId
 * Calculate p-value for A/B test
 * Query params:
 * - testType: Type of test (default: ztest)
 */
router.get('/p-value/:experimentId', async (req, res) => {
  try {
    const testType = req.query.testType || 'ztest';
    const pValue = await abTestStatisticsService.calculatePValue(req.params.experimentId, testType);

    res.json({
      success: true,
      data: {
        experimentId: req.params.experimentId,
        testType,
        pValue,
        interpretation: pValue < 0.05 ? 'Significant' : 'Not significant'
      }
    });
  } catch (error) {
    console.error('Error calculating p-value:', error);

    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/ab-test-statistics/significance
 * Determine if test result is statistically significant
 * Body:
 * - experimentId: Experiment ID
 * - testType: Type of test (default: ztest)
 * - alpha: Significance level (default: 0.05)
 */
router.post('/significance', async (req, res) => {
  try {
    const { experimentId, testType = 'ztest', alpha = 0.05 } = req.body;

    if (!experimentId) {
      return res.status(400).json({
        success: false,
        error: 'experimentId is required'
      });
    }

    const significance = await abTestStatisticsService.determineSignificance(
      experimentId,
      testType,
      alpha
    );

    res.json({
      success: true,
      data: significance
    });
  } catch (error) {
    console.error('Error determining significance:', error);

    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ab-test-statistics/summary/:experimentId
 * Get comprehensive statistical analysis summary
 */
router.get('/summary/:experimentId', async (req, res) => {
  try {
    const summary = await abTestStatisticsService.getStatisticalSummary(req.params.experimentId);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error generating statistical summary:', error);

    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ab-test-statistics/tests
 * Get available statistical tests
 */
router.get('/tests', (req, res) => {
  const tests = abTestStatisticsService.getAvailableTests();

  res.json({
    success: true,
    data: tests
  });
});

/**
 * POST /api/ab-test-statistics/cache/clear
 * Clear statistics cache
 */
router.post('/cache/clear', (req, res) => {
  abTestStatisticsService.clearCache();

  res.json({
    success: true,
    message: 'Statistics cache cleared'
  });
});

/**
 * GET /api/ab-test-statistics/compare/:experimentId
 * Compare all statistical tests for an experiment
 */
router.get('/compare/:experimentId', async (req, res) => {
  try {
    const summary = await abTestStatisticsService.getStatisticalSummary(req.params.experimentId);

    const comparison = {
      experimentId: req.params.experimentId,
      tests: [
        {
          type: 'ztest',
          pValue: summary.testResults.zTest.pValue,
          isSignificant: summary.testResults.zTest.isSignificant,
          confidence: summary.testResults.zTest.confidence
        },
        {
          type: 'ttest',
          pValue: summary.testResults.tTest.pValue,
          isSignificant: summary.testResults.tTest.isSignificant,
          confidence: summary.testResults.tTest.confidence
        },
        {
          type: 'chisquare',
          pValue: summary.testResults.chiSquare.pValue,
          isSignificant: summary.testResults.chiSquare.isSignificant,
          confidence: summary.testResults.chiSquare.confidence
        },
        {
          type: 'fisher',
          pValue: summary.testResults.fisher.pValue,
          isSignificant: summary.testResults.fisher.isSignificant,
          confidence: summary.testResults.fisher.confidence
        }
      ],
      consensus: summary.overallConclusion.consensus,
      overallSignificant: summary.overallConclusion.isSignificant
    };

    res.json({
      success: true,
      data: comparison
    });
  } catch (error) {
    console.error('Error comparing statistical tests:', error);

    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ab-test-statistics/recommend/:experimentId
 * Get recommended statistical test based on sample size
 */
router.get('/recommend/:experimentId', async (req, res) => {
  try {
    const results = await abTestStatisticsService.getABTestResults(req.params.experimentId);
    const totalSampleSize = results.variantA.views + results.variantB.views;

    let recommendedTest;
    let reason;

    if (totalSampleSize < 60) {
      recommendedTest = 'fisher';
      reason = 'Sample size is very small (< 60). Fisher\'s Exact Test is most appropriate.';
    } else if (totalSampleSize < 200) {
      recommendedTest = 'ttest';
      reason = 'Sample size is moderate (< 200). T-Test provides good balance of accuracy and power.';
    } else {
      recommendedTest = 'ztest';
      reason = 'Sample size is sufficient (>= 200). Z-Test provides highest power for conversion rate testing.';
    }

    res.json({
      success: true,
      data: {
        experimentId: req.params.experimentId,
        sampleSize: totalSampleSize,
        recommendedTest,
        reason,
        alternativeTests: ['ztest', 'ttest', 'chisquare', 'fisher'].filter(t => t !== recommendedTest)
      }
    });
  } catch (error) {
    console.error('Error recommending test:', error);

    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
