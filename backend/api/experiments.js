import express from 'express';
import asoExperimentService from '../services/asoExperimentService.js';

const router = express.Router();

/**
 * GET /api/experiments
 * Get all experiments with optional filtering
 * Query params:
 * - status: Filter by status (draft, running, completed, cancelled)
 * - type: Filter by type (icon, screenshots, subtitle, description, keywords)
 * - limit: Maximum number of results (default: 50)
 */
router.get('/', async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      type: req.query.type,
      limit: parseInt(req.query.limit) || 50
    };

    const experiments = await asoExperimentService.getExperiments(filters);

    res.json({
      success: true,
      data: experiments,
      count: experiments.length
    });
  } catch (error) {
    console.error('Error fetching experiments:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/experiments/stats
 * Get experiment statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await asoExperimentService.getExperimentStatistics();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching experiment statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/experiments/attention
 * Get experiments that need attention
 * (duration elapsed, sample size reached, or significant result detected)
 */
router.get('/attention', async (req, res) => {
  try {
    const needingAttention = await asoExperimentService.getExperimentsNeedingAttention();

    res.json({
      success: true,
      data: needingAttention,
      count: needingAttention.length
    });
  } catch (error) {
    console.error('Error fetching experiments needing attention:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/experiments/mock
 * Get mock experiment data for testing
 */
router.get('/mock', async (req, res) => {
  try {
    const experiments = await asoExperimentService.getMockExperiments();

    res.json({
      success: true,
      data: experiments,
      count: experiments.length,
      source: 'mock'
    });
  } catch (error) {
    console.error('Error fetching mock experiments:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/experiments/:id
 * Get a specific experiment by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const experiment = await asoExperimentService.getExperiment(req.params.id);

    res.json({
      success: true,
      data: experiment
    });
  } catch (error) {
    console.error('Error fetching experiment:', error);

    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/experiments
 * Create a new A/B test experiment
 * Body:
 * - name: Test name
 * - type: Test type (icon, screenshots, subtitle, description, keywords)
 * - variantA: Control variant data
 * - variantB: Treatment variant data
 * - duration: Test duration in days
 * - metric: Success metric (downloads, conversions, conversionRate)
 * - targetSampleSize: Target conversions for significance (default: 1000)
 */
router.post('/', async (req, res) => {
  try {
    const experiment = await asoExperimentService.createExperiment(req.body);

    res.status(201).json({
      success: true,
      data: experiment,
      message: 'Experiment created successfully'
    });
  } catch (error) {
    console.error('Error creating experiment:', error);

    const statusCode = error.message.includes('Invalid') || error.message.includes('required') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/experiments/:id
 * Update experiment data
 * Note: Cannot update type, variants, duration, or metric while test is running
 */
router.put('/:id', async (req, res) => {
  try {
    const experiment = await asoExperimentService.updateExperiment(req.params.id, req.body);

    res.json({
      success: true,
      data: experiment,
      message: 'Experiment updated successfully'
    });
  } catch (error) {
    console.error('Error updating experiment:', error);

    const statusCode = error.message.includes('not found') ? 404 :
                       error.message.includes('Cannot update') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/experiments/:id/start
 * Start an A/B test via App Store Connect API
 */
router.post('/:id/start', async (req, res) => {
  try {
    const experiment = await asoExperimentService.startExperiment(req.params.id);

    res.json({
      success: true,
      data: experiment,
      message: experiment.automaticallyStarted
        ? 'Experiment started via App Store Connect API'
        : 'Experiment started in manual mode (API unavailable)'
    });
  } catch (error) {
    console.error('Error starting experiment:', error);

    const statusCode = error.message.includes('not found') ? 404 :
                       error.message.includes('Cannot start') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/experiments/:id/stop
 * Stop an A/B test
 * Body:
 * - conclusion: Optional conclusion text
 */
router.post('/:id/stop', async (req, res) => {
  try {
    const conclusion = req.body.conclusion;
    const experiment = await asoExperimentService.stopExperiment(req.params.id, conclusion);

    res.json({
      success: true,
      data: experiment,
      message: 'Experiment stopped successfully'
    });
  } catch (error) {
    console.error('Error stopping experiment:', error);

    const statusCode = error.message.includes('not found') ? 404 :
                       error.message.includes('Cannot stop') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/experiments/:id/complete
 * Complete experiment and declare winner
 * Body:
 * - winner: 'variantA', 'variantB', or 'inconclusive'
 * - conclusion: Conclusion text
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const { winner, conclusion } = req.body;

    if (!['variantA', 'variantB', 'inconclusive'].includes(winner)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid winner. Must be variantA, variantB, or inconclusive'
      });
    }

    const experiment = await asoExperimentService.completeExperiment(req.params.id, winner, conclusion);

    res.json({
      success: true,
      data: experiment,
      message: `Experiment completed. Winner: ${winner}`
    });
  } catch (error) {
    console.error('Error completing experiment:', error);

    const statusCode = error.message.includes('not found') ? 404 :
                       error.message.includes('Cannot complete') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/experiments/:id/metrics
 * Update experiment metrics with latest data from App Store Connect
 */
router.post('/:id/metrics', async (req, res) => {
  try {
    const experiment = await asoExperimentService.updateExperimentMetrics(req.params.id);

    res.json({
      success: true,
      data: experiment,
      message: 'Metrics updated successfully'
    });
  } catch (error) {
    console.error('Error updating metrics:', error);

    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/experiments/:id/cancel
 * Cancel an experiment (draft or running only)
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const experiment = await asoExperimentService.cancelExperiment(req.params.id);

    res.json({
      success: true,
      data: experiment,
      message: 'Experiment cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling experiment:', error);

    const statusCode = error.message.includes('not found') ? 404 :
                       error.message.includes('Cannot cancel') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/experiments/:id
 * Delete an experiment (draft or completed only, not running)
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await asoExperimentService.deleteExperiment(req.params.id);

    res.json({
      success: true,
      data: result,
      message: 'Experiment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting experiment:', error);

    const statusCode = error.message.includes('not found') ? 404 :
                       error.message.includes('Cannot delete') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/experiments/:id/summary
 * Get experiment summary with key metrics
 */
router.get('/:id/summary', async (req, res) => {
  try {
    const experiment = await asoExperimentService.getExperiment(req.params.id);
    const summary = experiment.generateSummary();

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error generating experiment summary:', error);

    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/experiments/:id/analyze
 * Analyze A/B test results and generate comprehensive conclusion report
 */
router.get('/:id/analyze', async (req, res) => {
  try {
    const analysis = await asoExperimentService.analyzeResults(req.params.id);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Error analyzing experiment results:', error);

    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/experiments/:id/save-conclusion
 * Save conclusion and recommendations to experiment
 */
router.post('/:id/save-conclusion', async (req, res) => {
  try {
    const { conclusion, recommendations, learned } = req.body;

    const experiment = await asoExperimentService.getExperiment(req.params.id);

    if (conclusion) {
      experiment.conclusion = conclusion;
    }

    if (recommendations) {
      experiment.recommendations = recommendations;
    }

    if (learned) {
      experiment.learned = learned;
    }

    await experiment.save();

    res.json({
      success: true,
      data: experiment,
      message: 'Conclusion saved successfully'
    });
  } catch (error) {
    console.error('Error saving conclusion:', error);

    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
