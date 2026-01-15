/**
 * Google Analytics API Routes
 *
 * Provides REST API endpoints for Google Analytics data:
 * - Health check and connection testing
 * - Page views and sessions
 * - Traffic sources
 * - Top pages
 * - User acquisition
 * - Real-time users
 */

import express from 'express';
import googleAnalyticsService from '../services/googleAnalyticsService.js';
import { cacheMiddleware } from '../middleware/cache.js';

const router = express.Router();

/**
 * GET /api/googleAnalytics/health
 * Check Google Analytics service health
 */
router.get('/health', async (req, res) => {
  try {
    const health = await googleAnalyticsService.healthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'HEALTH_CHECK_ERROR'
    });
  }
});

/**
 * GET /api/googleAnalytics/config
 * Get Google Analytics configuration status
 */
router.get('/config', (req, res) => {
  try {
    const config = googleAnalyticsService.getAuthStatus();
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/googleAnalytics/test-connection
 * Test connection to Google Analytics API
 */
router.post('/test-connection', async (req, res) => {
  try {
    const result = await googleAnalyticsService.testConnection();

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'CONNECTION_TEST_ERROR'
    });
  }
});

/**
 * GET /api/googleAnalytics/pageviews
 * Fetch page views and sessions for a date range
 *
 * Query params:
 * - startDate: YYYY-MM-DD format (default: 7 days ago)
 * - endDate: YYYY-MM-DD format (default: today)
 */
router.get('/pageviews', cacheMiddleware('analyticsPageViews'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Default to last 7 days if not specified
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const data = await googleAnalyticsService.fetchPageViewsAndSessions(start, end);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'FETCH_PAGEVIEWS_ERROR'
    });
  }
});

/**
 * GET /api/googleAnalytics/traffic-sources
 * Fetch traffic sources breakdown
 *
 * Query params:
 * - startDate: YYYY-MM-DD format (default: 7 days ago)
 * - endDate: YYYY-MM-DD format (default: today)
 */
router.get('/traffic-sources', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const data = await googleAnalyticsService.fetchTrafficSources(start, end);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'FETCH_TRAFFIC_SOURCES_ERROR'
    });
  }
});

/**
 * GET /api/googleAnalytics/top-pages
 * Fetch top pages by page views
 *
 * Query params:
 * - startDate: YYYY-MM-DD format (default: 7 days ago)
 * - endDate: YYYY-MM-DD format (default: today)
 * - limit: Maximum number of pages (default: 10)
 */
router.get('/top-pages', async (req, res) => {
  try {
    const { startDate, endDate, limit } = req.query;

    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const pageLimit = parseInt(limit) || 10;

    const data = await googleAnalyticsService.fetchTopPages(start, end, pageLimit);

    res.json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'FETCH_TOP_PAGES_ERROR'
    });
  }
});

/**
 * GET /api/googleAnalytics/user-acquisition
 * Fetch user acquisition data
 *
 * Query params:
 * - startDate: YYYY-MM-DD format (default: 7 days ago)
 * - endDate: YYYY-MM-DD format (default: today)
 */
router.get('/user-acquisition', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const data = await googleAnalyticsService.fetchUserAcquisition(start, end);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'FETCH_USER_ACQUISITION_ERROR'
    });
  }
});

/**
 * GET /api/googleAnalytics/realtime
 * Fetch real-time active users
 */
router.get('/realtime', async (req, res) => {
  try {
    const data = await googleAnalyticsService.fetchRealtimeUsers();

    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'FETCH_REALTIME_ERROR'
    });
  }
});

/**
 * GET /api/googleAnalytics/summary
 * Fetch summary metrics for dashboard
 * Combines multiple metrics in a single call
 */
router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch all metrics in parallel
    const [pageViews, trafficSources, realtime] = await Promise.all([
      googleAnalyticsService.fetchPageViewsAndSessions(start, end),
      googleAnalyticsService.fetchTrafficSources(start, end),
      googleAnalyticsService.fetchRealtimeUsers()
    ]);

    res.json({
      success: true,
      data: {
        dateRange: { startDate: start, endDate: end },
        pageViews: pageViews.metrics,
        trafficSources: trafficSources.sources,
        realtime: realtime,
        dailyData: pageViews.dailyData
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'FETCH_SUMMARY_ERROR'
    });
  }
});

/**
 * GET /api/googleAnalytics/
 * Root endpoint - returns service information
 */
router.get('/', (req, res) => {
  res.json({
    service: 'Google Analytics API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/googleAnalytics/health',
      config: 'GET /api/googleAnalytics/config',
      testConnection: 'POST /api/googleAnalytics/test-connection',
      pageViews: 'GET /api/googleAnalytics/pageviews',
      trafficSources: 'GET /api/googleAnalytics/traffic-sources',
      topPages: 'GET /api/googleAnalytics/top-pages',
      userAcquisition: 'GET /api/googleAnalytics/user-acquisition',
      realtime: 'GET /api/googleAnalytics/realtime',
      summary: 'GET /api/googleAnalytics/summary'
    },
    documentation: 'Google Analytics 4 Reporting API'
  });
});

export default router;
