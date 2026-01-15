/**
 * Dashboard Test Helper Endpoints
 * Provides endpoints for creating test data for E2E dashboard tests
 */

import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';

const router = express.Router();

let db;

// Initialize database connection
async function initDatabase() {
  if (db) return db;

  const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/blush-app';
  const client = new MongoClient(mongoUrl);

  try {
    await client.connect();
    db = client.db();
    console.log('Dashboard test helpers connected to MongoDB');
    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

// POST /api/dashboard/test/metrics - Create test dashboard metrics
router.post('/metrics', async (req, res) => {
  try {
    const { overwriteExisting = false } = req.body;

    const database = await initDatabase();
    const metricsCollection = database.collection('marketing_daily_metrics');

    // Create test metrics for the last 30 days
    const metrics = [];
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const mrr = 300 + Math.floor(Math.random() * 500);
      const newUsers = Math.floor(Math.random() * 50) + 10;
      const cac = (Math.random() * 10 + 5).toFixed(2);
      const totalSpend = (Math.random() * 100 + 20).toFixed(2);
      const totalRevenue = (mrr * 0.8).toFixed(2);

      const metric = {
        date: date,
        period: 'day',
        metrics: {
          mrr: mrr,
          newUsers: newUsers,
          cac: parseFloat(cac),
          totalSpend: parseFloat(totalSpend),
          totalRevenue: parseFloat(totalRevenue),
          activeSubscribers: Math.floor(mrr / 5),
          organicUsers: Math.floor(newUsers * 0.7),
          paidUsers: Math.floor(newUsers * 0.3),
          avgOrderValue: (mrr / newUsers).toFixed(2),
          churnRate: (Math.random() * 0.1).toFixed(3)
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      metrics.push(metric);
    }

    // Check if metrics already exist for today
    const existingMetric = await metricsCollection.findOne({
      date: metrics[0].date
    });

    if (existingMetric && !overwriteExisting) {
      return res.json({
        success: true,
        message: 'Test metrics already exist',
        metrics: await metricsCollection.find({}).sort({ date: -1 }).limit(30).toArray()
      });
    }

    // Delete existing test metrics if overwrite is enabled
    if (overwriteExisting) {
      await metricsCollection.deleteMany({
        date: { $gte: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000) }
      });
    }

    // Insert test metrics
    await metricsCollection.insertMany(metrics);

    res.json({
      success: true,
      message: `Created ${metrics.length} test metrics`,
      metrics: await metricsCollection.find({}).sort({ date: -1 }).limit(30).toArray()
    });
  } catch (error) {
    console.error('Failed to create test metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/dashboard/test/cleanup - Clean up test data
router.post('/cleanup', async (req, res) => {
  try {
    const database = await initDatabase();
    const postsCollection = database.collection('marketing_posts');
    const metricsCollection = database.collection('marketing_daily_metrics');

    // Delete test posts created by E2E tests
    const deletePostsResult = await postsCollection.deleteMany({
      title: { $regex: /^E2E Test Post /i }
    });

    // Don't delete all metrics - just test posts
    const deleteMetricsResult = { deletedCount: 0 };

    res.json({
      success: true,
      message: 'Test data cleaned up',
      deletedPosts: deletePostsResult.deletedCount,
      deletedMetrics: deleteMetricsResult.deletedCount
    });
  } catch (error) {
    console.error('Failed to cleanup test data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/dashboard/test/status - Check test data status
router.get('/status', async (req, res) => {
  try {
    const database = await initDatabase();
    const postsCollection = database.collection('marketing_posts');
    const metricsCollection = database.collection('marketing_daily_metrics');

    const testPostCount = await postsCollection.countDocuments({
      title: { $regex: /^E2E Test Post /i }
    });

    const metricsCount = await metricsCollection.countDocuments({
      date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    const latestMetric = await metricsCollection.findOne({}, { sort: { date: -1 } });

    res.json({
      success: true,
      status: {
        testPosts: testPostCount,
        metricsCount: metricsCount,
        latestMetricDate: latestMetric?.date || null
      }
    });
  } catch (error) {
    console.error('Failed to get test status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
