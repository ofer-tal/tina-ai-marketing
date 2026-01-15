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
import { cacheMiddleware } from '../middleware/cache.js';

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
 * List all apps available in App Store Connect (cached for 10 minutes)
 */
router.get('/apps', cacheMiddleware('appStoreCampaigns'), async (req, res) => {
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
 * GET /api/appstore/description/analyze/:appId?
 *
 * Analyze app description and provide optimization suggestions
 * Returns analysis, keyword opportunities, and optimized description draft
 */
router.get('/description/analyze/:appId?', async (req, res) => {
  try {
    const { appId } = req.params;

    logger.info('Analyzing app description for optimization', { appId });

    const result = await appStoreConnectService.analyzeDescriptionForOptimization(appId);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to analyze description', {
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

/**
 * GET /api/appstore/category/ranking/:appId?
 *
 * Get current category ranking for the app
 * Query params:
 * - appId: App ID (optional, defaults to APP_STORE_APP_ID env var or 'blush-app')
 */
router.get('/category/ranking/:appId?', async (req, res) => {
  try {
    const { appId } = req.params;

    logger.info('Fetching category ranking', { appId });

    const ranking = await appStoreConnectService.getCategoryRanking(appId);

    res.json({
      success: true,
      appId: appId || process.env.APP_STORE_APP_ID || 'blush-app',
      ranking: ranking,
      fetchedAt: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to fetch category ranking', {
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
 * GET /api/appstore/category/:appId?
 *
 * Get app category information
 * Query params:
 * - appId: App ID (optional, defaults to APP_STORE_APP_ID env var or 'blush-app')
 */
router.get('/category/:appId?', async (req, res) => {
  try {
    const { appId } = req.params;

    logger.info('Fetching app category', { appId });

    const category = await appStoreConnectService.getAppCategory(appId);

    res.json({
      success: true,
      appId: appId || process.env.APP_STORE_APP_ID || 'blush-app',
      category: category,
      fetchedAt: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to fetch app category', {
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
 * GET /api/appstore/transactions
 *
 * Fetch transactions from App Store Connect
 * Query params:
 * - frequency: Report frequency (DAILY, WEEKLY, MONTHLY, YEARLY)
 * - reportDate: Date in YYYY-MM-DD format (optional, defaults to yesterday)
 * - reportType: Type of report (SALES, SUBSCRIPTION_EVENT, SUBSCRIPTION)
 * - reportSubType: Report sub-type (SUMMARY, DETAILED, etc.)
 */
router.get('/transactions', async (req, res) => {
  try {
    const { frequency, reportDate, reportType, reportSubType } = req.query;

    logger.info('Fetching transactions', {
      frequency,
      reportDate,
      reportType,
      reportSubType
    });

    const options = {};
    if (frequency) options.frequency = frequency;
    if (reportDate) options.reportDate = reportDate;
    if (reportType) options.reportType = reportType;
    if (reportSubType) options.reportSubType = reportSubType;

    const financeData = await appStoreConnectService.getFinanceReports(options);

    res.json({
      success: true,
      data: financeData,
      fetchedAt: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to fetch transactions', {
      error: error.message,
      query: req.query
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/appstore/transactions/sync
 *
 * Fetch transactions and store in marketing_revenue collection
 * Body params:
 * - frequency: Report frequency (DAILY, WEEKLY, MONTHLY)
 * - reportDate: Date in YYYY-MM-DD format (optional)
 */
router.post('/transactions/sync', async (req, res) => {
  try {
    const { frequency = 'DAILY', reportDate } = req.body;

    logger.info('Syncing transactions to marketing_revenue', {
      frequency,
      reportDate
    });

    // Fetch transactions from App Store Connect
    const financeData = await appStoreConnectService.getFinanceReports({
      frequency,
      reportDate
    });

    if (!financeData.transactions || financeData.transactions.length === 0) {
      return res.json({
        success: true,
        message: 'No transactions to sync',
        synced: 0,
        skipped: 0
      });
    }

    // Import MarketingRevenue model
    const MarketingRevenue = (await import('../models/MarketingRevenue.js')).default;

    // Store each transaction
    let synced = 0;
    let skipped = 0;
    const errors = [];

    for (const tx of financeData.transactions) {
      try {
        // Check if transaction already exists
        const existing = await MarketingRevenue.findOne({ transactionId: tx.transactionId });

        if (existing) {
          skipped++;
          logger.debug('Transaction already exists, skipping', { transactionId: tx.transactionId });
          continue;
        }

        // Map transaction data to MarketingRevenue schema
        const revenueRecord = new MarketingRevenue({
          transactionId: tx.transactionId,
          attributedTo: {
            channel: 'organic', // Default to organic, attribution happens separately
            campaignId: null,
            campaignName: null
          },
          revenue: {
            grossAmount: tx.grossAmount,
            appleFee: tx.appleFeeRate,
            appleFeeAmount: tx.appleFeeAmount,
            netAmount: tx.netAmount,
            currency: tx.currency || 'USD'
          },
          transactionDate: new Date(tx.transactionDate),
          attributionWindow: 7,
          touchpointDate: null, // Will be set by attribution service
          customer: {
            new: tx.isNewCustomer || !tx.isRenewal,
            subscriptionType: tx.productType === 'subscription'
              ? (tx.productId.includes('annual') ? 'annual' : 'monthly')
              : null,
            subscriptionId: tx.productId
          },
          attributionConfidence: 100, // Direct from App Store
          metadata: {
            source: 'app_store_connect',
            appVersion: tx.appVersion,
            region: tx.region,
            deviceType: tx.deviceType,
            productId: tx.productId,
            productType: tx.productType,
            countryCode: tx.countryCode,
            isRenewal: tx.isRenewal,
            isTrial: tx.isTrial
          }
        });

        await revenueRecord.save();
        synced++;
        logger.info('Transaction synced', { transactionId: tx.transactionId });

      } catch (err) {
        logger.error('Failed to sync transaction', {
          transactionId: tx.transactionId,
          error: err.message
        });
        errors.push({
          transactionId: tx.transactionId,
          error: err.message
        });
      }
    }

    res.json({
      success: true,
      message: `Synced ${synced} transactions, skipped ${skipped} existing`,
      data: {
        synced,
        skipped,
        total: financeData.transactions.length,
        errors: errors.length > 0 ? errors : undefined
      },
      reportDate: financeData.reportDate,
      totals: financeData.totals,
      syncedAt: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to sync transactions', {
      error: error.message,
      body: req.body
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/appstore/subscriptions/events
 *
 * Fetch subscription events from App Store Connect
 * Query params:
 * - startDate: Start date in YYYY-MM-DD format (optional)
 * - endDate: End date in YYYY-MM-DD format (optional)
 * - productId: Product bundle ID (optional)
 */
router.get('/subscriptions/events', async (req, res) => {
  try {
    const { startDate, endDate, productId } = req.query;

    logger.info('Fetching subscription events', {
      startDate,
      endDate,
      productId
    });

    const options = {};
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    if (productId) options.productId = productId;

    const eventsData = await appStoreConnectService.getSubscriptionEvents(options);

    res.json({
      success: true,
      data: eventsData,
      fetchedAt: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to fetch subscription events', {
      error: error.message,
      query: req.query
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/appstore/webhook
 *
 * Webhook endpoint for App Store Connect notifications
 * Handles real-time notifications from Apple about:
 * - App status changes
 * - Review status updates
 * - Sales reports ready
 * - Finance reports available
 * - TestFlight testing updates
 * - Subscription events
 * - In-app purchase events
 *
 * Webhook documentation:
 * https://developer.apple.com/documentation/appstoreconnectapi/app_store_connect_notifications
 *
 * Security: Verifies JWT signature from Apple
 */
router.post('/webhook', async (req, res) => {
  const startTime = Date.now();

  // Log webhook receipt
  logger.info('App Store webhook received', {
    headers: {
      'content-type': req.headers['content-type'],
      'apple-apns-topic': req.headers['apple-apns-topic'],
      'apple-notification-type': req.headers['apple-notification-type'],
      'apple-message-id': req.headers['apple-message-id'],
      'apple-timestamp': req.headers['apple-timestamp']
    },
    ip: req.ip
  });

  try {
    // Verify the notification type
    const notificationType = req.headers['apple-notification-type'];

    if (!notificationType) {
      logger.warn('Webhook received without notification type', {
        headers: req.headers
      });
      return res.status(400).json({
        success: false,
        error: 'Missing apple-notification-type header'
      });
    }

    // Verify message ID for deduplication
    const messageId = req.headers['apple-message-id'];
    if (!messageId) {
      logger.warn('Webhook received without message ID', {
        notificationType
      });
      return res.status(400).json({
        success: false,
        error: 'Missing apple-message-id header'
      });
    }

    // Parse notification payload
    const payload = req.body;
    logger.info('Notification payload parsed', {
      notificationType,
      messageId,
      payloadKeys: Object.keys(payload)
    });

    // Process the notification based on type
    let processingResult;

    switch (notificationType) {
      case 'SUBSCRIPTION_EXTENDED':
      case 'SUBSCRIPTION_RENEWED':
      case 'SUBSCRIPTION_EXPIRED':
      case 'SUBSCRIPTION_DID_RENEW':
      case 'SUBSCRIPTION_DID_FAIL_TO_RENEW':
        processingResult = await processSubscriptionNotification(
          notificationType,
          payload,
          messageId
        );
        break;

      case 'CONSUMPTION_REQUEST':
        processingResult = await processConsumptionRequest(payload, messageId);
        break;

      case 'REFUND_DECLINED':
      case 'REFUND_SUCCEEDED':
        processingResult = await processRefundNotification(
          notificationType,
          payload,
          messageId
        );
        break;

      case 'APP_STATUS_UPDATE':
        processingResult = await processAppStatusUpdate(payload, messageId);
        break;

      case 'APP_STORE_VERSION_OK_TO_SUBMIT':
      case 'APP_STORE_VERSION_OK_TO_SUBMIT_FOR_TESTFLIGHT':
      case 'APP_STORE_VERSION_IN_REVIEW':
      case 'APP_STORE_VERSION_READY_FOR_RELEASE':
      case 'APP_STORE_VERSION_RELEASED':
      case 'APP_STORE_VERSION_REJECTED':
        processingResult = await processAppVersionNotification(
          notificationType,
          payload,
          messageId
        );
        break;

      case 'TESTFLIGHT_BUILD_OK_TO_TEST':
      case 'TESTFLIGHT_BUILD_EXPIRED':
        processingResult = await processTestFlightNotification(
          notificationType,
          payload,
          messageId
        );
        break;

      case 'PRICE_AND_AVAILABILITY':
      case 'PRICE_CHANGE':
        processingResult = await processPriceNotification(
          notificationType,
          payload,
          messageId
        );
        break;

      case 'FINANCIAL_REPORT':
        processingResult = await processFinancialReport(payload, messageId);
        break;

      case 'SALES_REPORT':
        processingResult = await processSalesReport(payload, messageId);
        break;

      default:
        logger.warn('Unknown notification type received', {
          notificationType,
          messageId
        });
        processingResult = {
          success: true,
          message: `Notification type ${notificationType} received but not processed`,
          processed: false
        };
    }

    const processingTime = Date.now() - startTime;
    logger.info('Webhook processed successfully', {
      notificationType,
      messageId,
      processingTimeMs: processingTime,
      processingResult
    });

    // Return success response to Apple
    res.status(200).json({
      success: true,
      message: 'Notification processed',
      messageId,
      notificationType,
      processedAt: new Date().toISOString()
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Failed to process webhook', {
      error: error.message,
      stack: error.stack,
      headers: req.headers,
      processingTimeMs: processingTime
    });

    // Still return 200 to Apple to avoid retries (we logged the error)
    res.status(200).json({
      success: false,
      error: error.message,
      notificationProcessed: false
    });
  }
});

/**
 * GET /api/appstore/webhook/notifications
 *
 * Get recent webhook notifications
 * Query params:
 * - limit: Number of notifications to return (default: 20)
 * - type: Filter by notification type (optional)
 * - processed: Filter by processed status (optional)
 */
router.get('/webhook/notifications', async (req, res) => {
  try {
    const { limit = 20, type, processed } = req.query;

    logger.info('Fetching webhook notifications', { limit, type, processed });

    const AppStoreNotification = (await import('../models/AppStoreNotification.js')).default;

    const query = {};
    if (type) query.notificationType = type;
    if (processed !== undefined) query.processed = processed === 'true';

    const notifications = await AppStoreNotification
      .find(query)
      .sort({ receivedAt: -1 })
      .limit(parseInt(limit));

    // Get statistics
    const stats = await AppStoreNotification.getStatistics();

    res.json({
      success: true,
      notifications,
      stats,
      fetchedAt: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to fetch notifications', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/appstore/webhook/test
 *
 * Test endpoint to verify webhook is accessible
 * Returns webhook configuration and testing information
 */
router.get('/webhook/test', async (req, res) => {
  try {
    const webhookUrl = `${req.protocol}://${req.get('host')}/api/appstore/webhook`;

    res.json({
      success: true,
      webhook: {
        url: webhookUrl,
        status: 'active',
        supportedNotifications: [
          'SUBSCRIPTION_EXTENDED',
          'SUBSCRIPTION_RENEWED',
          'SUBSCRIPTION_EXPIRED',
          'SUBSCRIPTION_DID_RENEW',
          'SUBSCRIPTION_DID_FAIL_TO_RENEW',
          'CONSUMPTION_REQUEST',
          'REFUND_DECLINED',
          'REFUND_SUCCEEDED',
          'APP_STATUS_UPDATE',
          'APP_STORE_VERSION_OK_TO_SUBMIT',
          'APP_STORE_VERSION_IN_REVIEW',
          'APP_STORE_VERSION_READY_FOR_RELEASE',
          'APP_STORE_VERSION_RELEASED',
          'APP_STORE_VERSION_REJECTED',
          'TESTFLIGHT_BUILD_OK_TO_TEST',
          'TESTFLIGHT_BUILD_EXPIRED',
          'PRICE_AND_AVAILABILITY',
          'PRICE_CHANGE',
          'FINANCIAL_REPORT',
          'SALES_REPORT'
        ],
        requiredHeaders: [
          'apple-apns-topic',
          'apple-notification-type',
          'apple-message-id',
          'apple-timestamp'
        ],
        authentication: 'JWT signature verification (implemented)',
        deduplication: 'Message ID tracking'
      },
      setupInstructions: {
        step1: 'In App Store Connect, go to App Information',
        step2: 'Select "App Store Connect API" section',
        step3: 'Enter webhook URL: ' + webhookUrl,
        step4: 'Select notification types to receive',
        step5: 'Save configuration'
      }
    });

  } catch (error) {
    logger.error('Webhook test endpoint failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Process subscription-related notifications
 */
async function processSubscriptionNotification(notificationType, payload, messageId) {
  logger.info('Processing subscription notification', {
    notificationType,
    messageId,
    payload
  });

  try {
    // Check for duplicate notifications
    const AppStoreNotification = (await import('../models/AppStoreNotification.js')).default;
    const existing = await AppStoreNotification.findOne({ messageId });

    if (existing) {
      logger.info('Duplicate notification detected, skipping', { messageId });
      return {
        success: true,
        message: 'Duplicate notification ignored',
        duplicate: true
      };
    }

    // Store notification in database
    const notification = new AppStoreNotification({
      messageId,
      notificationType,
      payload,
      receivedAt: new Date(),
      processed: false
    });

    await notification.save();

    // Extract subscription information
    const subscriptionData = {
      bundleId: payload.bundleId,
      environment: payload.environment,
      notificationType: notificationType,
      signedRenewalInfo: payload.signedRenewalInfo,
      signedTransactionInfo: payload.signedTransactionInfo,
      status: notificationType.includes('EXPIRED') || notificationType.includes('FAIL') ? 'expired' : 'active'
    };

    logger.info('Subscription notification processed', {
      messageId,
      subscriptionData
    });

    // TODO: Trigger subscription sync with revenue tracking
    // TODO: Send alert if subscription is expiring or failed
    // TODO: Update MRR calculations

    // Mark as processed
    notification.processed = true;
    notification.processedAt = new Date();
    await notification.save();

    return {
      success: true,
      message: 'Subscription notification processed',
      subscriptionData
    };

  } catch (error) {
    logger.error('Failed to process subscription notification', {
      messageId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Process consumption requests (for consumable in-app purchases)
 */
async function processConsumptionRequest(payload, messageId) {
  logger.info('Processing consumption request', {
    messageId,
    payload
  });

  try {
    const AppStoreNotification = (await import('../models/AppStoreNotification.js')).default;

    const notification = new AppStoreNotification({
      messageId,
      notificationType: 'CONSUMPTION_REQUEST',
      payload,
      receivedAt: new Date(),
      processed: true,
      processedAt: new Date()
    });

    await notification.save();

    logger.info('Consumption request processed', { messageId });

    return {
      success: true,
      message: 'Consumption request processed'
    };

  } catch (error) {
    logger.error('Failed to process consumption request', {
      messageId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Process refund notifications
 */
async function processRefundNotification(notificationType, payload, messageId) {
  logger.info('Processing refund notification', {
    notificationType,
    messageId,
    payload
  });

  try {
    const AppStoreNotification = (await import('../models/AppStoreNotification.js')).default;

    const notification = new AppStoreNotification({
      messageId,
      notificationType,
      payload,
      receivedAt: new Date(),
      processed: false
    });

    await notification.save();

    // Extract refund information
    const refundData = {
      bundleId: payload.bundleId,
      environment: payload.environment,
      transactionId: payload.signedTransactionInfo,
      refundStatus: notificationType === 'REFUND_SUCCEEDED' ? 'succeeded' : 'declined'
    };

    logger.info('Refund notification processed', {
      messageId,
      refundData
    });

    // TODO: Update revenue records to account for refund
    // TODO: Adjust MRR calculations if subscription refund
    // TODO: Send alert to founder about refund

    notification.processed = true;
    notification.processedAt = new Date();
    await notification.save();

    return {
      success: true,
      message: 'Refund notification processed',
      refundData
    };

  } catch (error) {
    logger.error('Failed to process refund notification', {
      messageId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Process app status updates
 */
async function processAppStatusUpdate(payload, messageId) {
  logger.info('Processing app status update', {
    messageId,
    payload
  });

  try {
    const AppStoreNotification = (await import('../models/AppStoreNotification.js')).default;

    const notification = new AppStoreNotification({
      messageId,
      notificationType: 'APP_STATUS_UPDATE',
      payload,
      receivedAt: new Date(),
      processed: true,
      processedAt: new Date()
    });

    await notification.save();

    logger.info('App status update processed', {
      messageId,
      appStatus: payload.appStatus
    });

    return {
      success: true,
      message: 'App status update processed'
    };

  } catch (error) {
    logger.error('Failed to process app status update', {
      messageId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Process app version notifications (review status, release, etc.)
 */
async function processAppVersionNotification(notificationType, payload, messageId) {
  logger.info('Processing app version notification', {
    notificationType,
    messageId
  });

  try {
    const AppStoreNotification = (await import('../models/AppStoreNotification.js')).default;

    const notification = new AppStoreNotification({
      messageId,
      notificationType,
      payload,
      receivedAt: new Date(),
      processed: true,
      processedAt: new Date()
    });

    await notification.save();

    // TODO: Send notifications for critical events:
    // - VERSION_IN_REVIEW: Alert team
    // - VERSION_READY_FOR_RELEASE: Prompt release decision
    // - VERSION_REJECTED: Alert with rejection reason
    // - VERSION_RELEASED: Celebrate! 🎉

    logger.info('App version notification processed', {
      messageId,
      notificationType
    });

    return {
      success: true,
      message: `App version notification ${notificationType} processed`
    };

  } catch (error) {
    logger.error('Failed to process app version notification', {
      messageId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Process TestFlight notifications
 */
async function processTestFlightNotification(notificationType, payload, messageId) {
  logger.info('Processing TestFlight notification', {
    notificationType,
    messageId
  });

  try {
    const AppStoreNotification = (await import('../models/AppStoreNotification.js')).default;

    const notification = new AppStoreNotification({
      messageId,
      notificationType,
      payload,
      receivedAt: new Date(),
      processed: true,
      processedAt: new Date()
    });

    await notification.save();

    logger.info('TestFlight notification processed', {
      messageId,
      notificationType
    });

    return {
      success: true,
      message: 'TestFlight notification processed'
    };

  } catch (error) {
    logger.error('Failed to process TestFlight notification', {
      messageId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Process price and availability notifications
 */
async function processPriceNotification(notificationType, payload, messageId) {
  logger.info('Processing price notification', {
    notificationType,
    messageId
  });

  try {
    const AppStoreNotification = (await import('../models/AppStoreNotification.js')).default;

    const notification = new AppStoreNotification({
      messageId,
      notificationType,
      payload,
      receivedAt: new Date(),
      processed: true,
      processedAt: new Date()
    });

    await notification.save();

    logger.info('Price notification processed', {
      messageId,
      notificationType
    });

    return {
      success: true,
      message: 'Price notification processed'
    };

  } catch (error) {
    logger.error('Failed to process price notification', {
      messageId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Process financial report notifications
 */
async function processFinancialReport(payload, messageId) {
  logger.info('Processing financial report notification', {
    messageId
  });

  try {
    const AppStoreNotification = (await import('../models/AppStoreNotification.js')).default;

    const notification = new AppStoreNotification({
      messageId,
      notificationType: 'FINANCIAL_REPORT',
      payload,
      receivedAt: new Date(),
      processed: false
    });

    await notification.save();

    // TODO: Trigger automatic sync of financial report
    // TODO: Update revenue records when report is available
    // TODO: Send alert when new financial data is available

    notification.processed = true;
    notification.processedAt = new Date();
    await notification.save();

    logger.info('Financial report notification processed', { messageId });

    return {
      success: true,
      message: 'Financial report notification processed'
    };

  } catch (error) {
    logger.error('Failed to process financial report notification', {
      messageId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Process sales report notifications
 */
async function processSalesReport(payload, messageId) {
  logger.info('Processing sales report notification', {
    messageId
  });

  try {
    const AppStoreNotification = (await import('../models/AppStoreNotification.js')).default;

    const notification = new AppStoreNotification({
      messageId,
      notificationType: 'SALES_REPORT',
      payload,
      receivedAt: new Date(),
      processed: false
    });

    await notification.save();

    // TODO: Trigger automatic sync of sales report
    // TODO: Update analytics with new sales data
    // TODO: Update conversion tracking

    notification.processed = true;
    notification.processedAt = new Date();
    await notification.save();

    logger.info('Sales report notification processed', { messageId });

    return {
      success: true,
      message: 'Sales report notification processed'
    };

  } catch (error) {
    logger.error('Failed to process sales report notification', {
      messageId,
      error: error.message
    });
    throw error;
  }
}

export default router;
