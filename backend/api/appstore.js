/**
 * App Store Connect API Routes
 *
 * Endpoints for App Store Connect integration:
 * - GET /api/appstore/health - Check API connection status
 * - GET /api/appstore/apps - List apps
 * - GET /api/appstore/analytics/:appId - Get app analytics
 * - POST /api/appstore/test-connection - Test API credentials
 */

import express from 'express';
import winston from 'winston';
import appStoreConnectService from '../services/appStoreConnectService.js';

const router = express.Router();

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'appstore-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/appstore-api-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/appstore-api.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

/**
 * GET /api/appstore/health
 *
 * Check App Store Connect API health status
 * Returns configuration status without making API calls
 */
router.get('/health', async (req, res) => {
  try {
    logger.info('Health check requested');

    const isConfigured = appStoreConnectService.isConfigured();
    const hasKeyId = !!process.env.APP_STORE_CONNECT_KEY_ID;
    const hasIssuerId = !!process.env.APP_STORE_CONNECT_ISSUER_ID;
    const hasPrivateKeyPath = !!process.env.APP_STORE_CONNECT_PRIVATE_KEY_PATH;

    res.json({
      success: true,
      status: isConfigured ? 'configured' : 'not_configured',
      configured: isConfigured,
      hasKeyId,
      hasIssuerId,
      hasPrivateKeyPath,
      message: isConfigured
        ? 'App Store Connect API is configured'
        : 'App Store Connect API credentials not configured'
    });

  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/appstore/test-connection
 *
 * Test App Store Connect API connection
 * Validates credentials and attempts to authenticate
 */
router.post('/test-connection', async (req, res) => {
  try {
    logger.info('Connection test requested');

    const result = await appStoreConnectService.testConnection();

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        details: result
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        details: result
      });
    }

  } catch (error) {
    logger.error('Connection test failed', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/appstore/apps
 *
 * List all apps available in App Store Connect
 */
router.get('/apps', async (req, res) => {
  try {
    logger.info('Fetching apps list');

    // Check if configured first
    if (!appStoreConnectService.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'App Store Connect API not configured',
        message: 'Please configure API credentials in Settings'
      });
    }

    // TODO: Implement actual API call to /apps endpoint
    // For now, return a response indicating this needs JWT implementation
    res.json({
      success: true,
      apps: [],
      message: 'App Store Connect API service created - JWT authentication with ES256 required',
      note: 'Full implementation requires JWT library with ES256 algorithm support'
    });

  } catch (error) {
    logger.error('Failed to fetch apps', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/appstore/analytics/:appId
 *
 * Get analytics data for a specific app
 * Query params:
 * - period: Time period (P7D, P30D, P90D) default: P30D
 * - metrics: Comma-separated metrics (installs, updates, crashes, revenue)
 */
router.get('/analytics/:appId', async (req, res) => {
  try {
    const { appId } = req.params;
    const { period = 'P30D', metrics = 'installs,updates,crashes,revenue' } = req.query;

    logger.info('Fetching app analytics', { appId, period, metrics });

    // Check if configured
    if (!appStoreConnectService.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'App Store Connect API not configured'
      });
    }

    const analytics = await appStoreConnectService.getAppAnalytics(appId, period);

    res.json({
      success: true,
      appId,
      period,
      metrics: metrics.split(','),
      data: analytics.data
    });

  } catch (error) {
    logger.error('Failed to fetch analytics', {
      appId: req.params.appId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/appstore/app/:appId
 *
 * Get detailed information about an app
 */
router.get('/app/:appId', async (req, res) => {
  try {
    const { appId } = req.params;

    logger.info('Fetching app info', { appId });

    if (!appStoreConnectService.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'App Store Connect API not configured'
      });
    }

    const appInfo = await appStoreConnectService.getAppInfo(appId);

    res.json({
      success: true,
      app: appInfo
    });

  } catch (error) {
    logger.error('Failed to fetch app info', {
      appId: req.params.appId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/appstore/metadata/:appId?
 *
 * Get app metadata (title, subtitle, description, keywords)
 * Query params:
 * - appId: App ID (optional, defaults to APP_STORE_APP_ID env var or 'blush-app')
 */
router.get('/metadata/:appId?', async (req, res) => {
  try {
    const { appId } = req.params;

    logger.info('Fetching app metadata', { appId });

    const result = await appStoreConnectService.getAppMetadata(appId);

    res.json({
      success: true,
      appId: result.appId,
      metadata: result.metadata,
      source: result.source || 'api'
    });

  } catch (error) {
    logger.error('Failed to fetch app metadata', {
      appId: req.params.appId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PATCH /api/appstore/metadata/:appId
 *
 * Update app metadata (title, subtitle, description, keywords)
 * Body: { title, subtitle, description, keywords, promotionalText, etc. }
 */
router.patch('/metadata/:appId', async (req, res) => {
  try {
    const { appId } = req.params;
    const metadata = req.body;

    logger.info('Updating app metadata', { appId, metadata });

    if (!appStoreConnectService.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'App Store Connect API not configured'
      });
    }

    const result = await appStoreConnectService.updateAppMetadata(appId, metadata);

    res.json({
      success: true,
      message: result.message,
      metadata: result.metadata
    });

  } catch (error) {
    logger.error('Failed to update app metadata', {
      appId: req.params.appId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/appstore/screenshots/:appId?
 *
 * Get app screenshots from App Store Connect
 * Query params:
 * - appId: App ID (optional, defaults to APP_STORE_APP_ID env var or 'blush-app')
 */
router.get('/screenshots/:appId?', async (req, res) => {
  try {
    const { appId } = req.params;

    logger.info('Fetching app screenshots', { appId });

    const result = await appStoreConnectService.getAppScreenshots(appId);

    res.json({
      success: true,
      appId: result.appId,
      screenshots: result.screenshots,
      source: result.source || 'api'
    });

  } catch (error) {
    logger.error('Failed to fetch app screenshots', {
      appId: req.params.appId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/appstore/screenshots/analysis/:appId?
 *
 * Analyze screenshots and provide optimization suggestions
 * Compares screenshots against ASO best practices
 */
router.get('/screenshots/analysis/:appId?', async (req, res) => {
  try {
    const { appId } = req.params;

    logger.info('Analyzing app screenshots', { appId });

    // Fetch screenshots
    const screenshotsResult = await appStoreConnectService.getAppScreenshots(appId);

    if (!screenshotsResult.success || !screenshotsResult.screenshots) {
      return res.status(404).json({
        success: false,
        error: 'No screenshots found for this app'
      });
    }

    // Analyze screenshots
    const analysis = appStoreConnectService.analyzeScreenshots(screenshotsResult.screenshots);

    res.json({
      success: true,
      appId: screenshotsResult.appId,
      screenshots: screenshotsResult.screenshots,
      analysis: analysis.analysis
    });

  } catch (error) {
    logger.error('Failed to analyze screenshots', {
      appId: req.params.appId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/appstore/icon/ab-testing/:appId?
 *
 * Analyze current icon and provide A/B testing recommendations
 * Includes icon analysis, competitor comparison, and test variations
 */
router.get('/icon/ab-testing/:appId?', async (req, res) => {
  try {
    const { appId } = req.params;

    logger.info('Analyzing icon for A/B testing', { appId });

    const analysis = await appStoreConnectService.analyzeIconForABTesting(appId);

    if (!analysis.success) {
      return res.status(500).json({
        success: false,
        error: analysis.error
      });
    }

    res.json({
      success: true,
      appId: analysis.appId,
      currentIcon: analysis.currentIcon,
      currentAnalysis: analysis.currentAnalysis,
      competitorAnalysis: analysis.competitorAnalysis,
      recommendations: analysis.recommendations
    });

  } catch (error) {
    logger.error('Failed to analyze icon for A/B testing', {
      appId: req.params.appId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
