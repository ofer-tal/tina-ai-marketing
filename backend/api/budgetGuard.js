/**
 * Budget Guard API Routes
 *
 * Feature #296: Budget overspend prevention
 * Provides endpoints for budget validation and monitoring
 */

import express from 'express';
import budgetGuardService from '../services/budgetGuardService.js';

const router = express.Router();

/**
 * GET /api/budget-guard/config
 * Get budget guard configuration
 */
router.get('/config', async (req, res) => {
  try {
    const config = budgetGuardService.getConfig();

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Error fetching budget guard config:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PUT /api/budget-guard/config
 * Update budget guard configuration
 */
router.put('/config', async (req, res) => {
  try {
    const config = req.body;

    budgetGuardService.updateConfig(config);

    res.json({
      success: true,
      message: 'Budget guard configuration updated',
      data: budgetGuardService.getConfig()
    });
  } catch (error) {
    console.error('Error updating budget guard config:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/budget-guard/validate
 * Validate a proposed spend operation
 *
 * Body:
 * - proposedSpend: number - Amount being spent
 * - operation: string - Operation type
 * - platform: string - Platform name
 * - campaignId: string (optional)
 * - campaignName: string (optional)
 * - metadata: object (optional)
 */
router.post('/validate', async (req, res) => {
  try {
    const validation = await budgetGuardService.validateSpend(req.body);

    res.json({
      success: true,
      data: validation,
    });
  } catch (error) {
    console.error('Error validating spend:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/budget-guard/validate-campaign-budget
 * Validate campaign budget update
 *
 * Body:
 * - campaignId: string
 * - currentBudget: number
 * - newBudget: number
 * - platform: string (optional, default: 'apple_search_ads')
 */
router.post('/validate-campaign-budget', async (req, res) => {
  try {
    const { campaignId, currentBudget, newBudget, platform } = req.body;

    const validation = await budgetGuardService.validateCampaignBudgetUpdate(
      campaignId,
      currentBudget,
      newBudget,
      platform || 'apple_search_ads'
    );

    res.json({
      success: true,
      data: validation,
    });
  } catch (error) {
    console.error('Error validating campaign budget:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/budget-guard/validate-campaign-enable
 * Validate campaign enable
 *
 * Body:
 * - campaignId: string
 * - campaignName: string
 * - dailyBudget: number
 * - platform: string (optional, default: 'apple_search_ads')
 */
router.post('/validate-campaign-enable', async (req, res) => {
  try {
    const { campaignId, campaignName, dailyBudget, platform } = req.body;

    const validation = await budgetGuardService.validateCampaignEnable(
      campaignId,
      campaignName,
      dailyBudget,
      platform || 'apple_search_ads'
    );

    res.json({
      success: true,
      data: validation,
    });
  } catch (error) {
    console.error('Error validating campaign enable:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/budget-guard/status
 * Get current budget status
 */
router.get('/status', async (req, res) => {
  try {
    const status = await budgetGuardService.getCurrentBudgetStatus();

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Error fetching budget status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/budget-guard/calculate-projected
 * Calculate projected spend with proposed amount
 *
 * Body:
 * - proposedSpend: number
 */
router.post('/calculate-projected', async (req, res) => {
  try {
    const { proposedSpend } = req.body;

    const currentBudget = await budgetGuardService.getCurrentBudgetStatus();
    const projected = await budgetGuardService.calculateProjectedSpend(currentBudget, proposedSpend);

    res.json({
      success: true,
      data: {
        currentBudget,
        projected
      },
    });
  } catch (error) {
    console.error('Error calculating projected spend:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
