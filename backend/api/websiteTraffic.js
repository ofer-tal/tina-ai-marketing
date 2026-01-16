/**
 * Website Traffic API Routes
 *
 * Provides REST API endpoints for website traffic tracking:
 * - Fetch and store traffic data from Google Analytics
 * - Get traffic trends over time
 * - Get traffic sources breakdown
 * - Get top pages
 * - Get user acquisition data
 * - Get comprehensive dashboard data
 * - Refresh traffic data
 *
 * Feature #269: Website traffic tracking from GA
 */

import express from 'express';
import websiteTrafficService from '../services/websiteTrafficService.js';
import { cacheMiddleware } from '../middleware/cache.js';

const router = express.Router();

/**
 * GET /api/website-traffic/health
 * Check website traffic service health
 */
router.get('/health', async (req, res) => {
  try {
    const health = await websiteTrafficService.healthCheck();
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
 * POST /api/website-traffic/fetch
 * Fetch and store traffic data from Google Analytics
 *
 * Query params:
 * - startDate: YYYY-MM-DD format (default: 7 days ago)
 * - endDate: YYYY-MM-DD format (default: today)
 */
router.post('/fetch', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Default to last 7 days if not specified
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const result = await websiteTrafficService.fetchAndStoreTrafficData(start, end);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'FETCH_TRAFFIC_ERROR'
    });
  }
});

/**
 * GET /api/website-traffic/trends
 * Get traffic trends over time
 *
 * Query params:
 * - startDate: YYYY-MM-DD format (default: 30 days ago)
 * - endDate: YYYY-MM-DD format (default: today)
 */
router.get('/trends', cacheMiddleware('trafficTrends'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Default to last 30 days for trend analysis
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const trends = await websiteTrafficService.getTrafficTrends(start, end);

    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'FETCH_TRENDS_ERROR'
    });
  }
});

/**
 * GET /api/website-traffic/sources
 * Get traffic sources breakdown
 *
 * Query params:
 * - startDate: YYYY-MM-DD format (default: 7 days ago)
 * - endDate: YYYY-MM-DD format (default: today)
 */
router.get('/sources', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const sources = await websiteTrafficService.getTrafficSources(start, end);

    res.json({
      success: true,
      data: sources
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'FETCH_SOURCES_ERROR'
    });
  }
});

/**
 * GET /api/website-traffic/top-pages
 * Get top pages by page views
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

    const topPages = await websiteTrafficService.getTopPages(start, end, pageLimit);

    res.json({
      success: true,
      data: topPages
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
 * GET /api/website-traffic/acquisition
 * Get user acquisition data
 *
 * Query params:
 * - startDate: YYYY-MM-DD format (default: 7 days ago)
 * - endDate: YYYY-MM-DD format (default: today)
 */
router.get('/acquisition', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const acquisition = await websiteTrafficService.getUserAcquisition(start, end);

    res.json({
      success: true,
      data: acquisition
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'FETCH_ACQUISITION_ERROR'
    });
  }
});

/**
 * GET /api/website-traffic/dashboard
 * Get comprehensive dashboard data
 *
 * Query params:
 * - startDate: YYYY-MM-DD format (default: 7 days ago)
 * - endDate: YYYY-MM-DD format (default: today)
 */
router.get('/dashboard', cacheMiddleware('trafficDashboard'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const dashboardData = await websiteTrafficService.getDashboardData(start, end);

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'FETCH_DASHBOARD_ERROR'
    });
  }
});

/**
 * POST /api/website-traffic/refresh
 * Refresh traffic data (fetch latest from GA)
 */
router.post('/refresh', async (req, res) => {
  try {
    const result = await websiteTrafficService.refreshTrafficData();

    res.json({
      success: true,
      data: result,
      message: 'Traffic data refreshed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'REFRESH_ERROR'
    });
  }
});

/**
 * GET /api/website-traffic/
 * Root endpoint - returns service information
 */
router.get('/', (req, res) => {
  res.json({
    service: 'Website Traffic Tracking API',
    version: '1.0.0',
    feature: '#269: Website traffic tracking from GA',
    endpoints: {
      health: 'GET /api/website-traffic/health',
      fetch: 'POST /api/website-traffic/fetch',
      trends: 'GET /api/website-traffic/trends',
      sources: 'GET /api/website-traffic/sources',
      topPages: 'GET /api/website-traffic/top-pages',
      acquisition: 'GET /api/website-traffic/acquisition',
      dashboard: 'GET /api/website-traffic/dashboard',
      refresh: 'POST /api/website-traffic/refresh'
    },
    description: 'Tracks website traffic from Google Analytics and stores metrics for trend analysis'
  });
});

export default router;
