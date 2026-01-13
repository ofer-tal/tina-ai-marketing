import express from 'express';

const router = express.Router();

/**
 * GET /api/dashboard/metrics
 * Get dashboard metrics for a specified time period
 * Query params:
 *   - period: '24h', '7d', '30d' (default: '24h')
 */
router.get('/metrics', async (req, res) => {
  try {
    const { period = '24h' } = req.query;

    // Validate period parameter
    const validPeriods = ['24h', '7d', '30d'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        error: 'Invalid period. Must be one of: ' + validPeriods.join(', ')
      });
    }

    console.log(`Fetching dashboard metrics for period: ${period}`);

    // Calculate time range based on period
    const now = new Date();
    let startTime;

    switch (period) {
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    // TODO: In production, these would be fetched from MongoDB
    // For now, returning period-specific mock data that represents the current period vs previous period
    let metrics;

    if (period === '24h') {
      // Last 24 hours metrics
      metrics = {
        period: period,
        startTime: startTime.toISOString(),
        endTime: now.toISOString(),
        mrr: {
          current: 425,
          previous: 380,
          change: 11.8,
          trend: 'up'
        },
        users: {
          current: 1247,
          previous: 1102,
          change: 13.2,
          trend: 'up'
        },
        spend: {
          current: 87,
          previous: 92,
          change: -5.4,
          trend: 'down'
        },
        posts: {
          current: 23,
          previous: 18,
          change: 27.8,
          trend: 'up'
        }
      };
    } else if (period === '7d') {
      // Last 7 days metrics (weekly totals/averages)
      metrics = {
        period: period,
        startTime: startTime.toISOString(),
        endTime: now.toISOString(),
        mrr: {
          current: 2890,
          previous: 2540,
          change: 13.8,
          trend: 'up'
        },
        users: {
          current: 8542,
          previous: 7234,
          change: 18.1,
          trend: 'up'
        },
        spend: {
          current: 612,
          previous: 645,
          change: -5.1,
          trend: 'down'
        },
        posts: {
          current: 156,
          previous: 128,
          change: 21.9,
          trend: 'up'
        }
      };
    } else if (period === '30d') {
      // Last 30 days metrics (monthly totals/averages)
      metrics = {
        period: period,
        startTime: startTime.toISOString(),
        endTime: now.toISOString(),
        mrr: {
          current: 12350,
          previous: 10890,
          change: 13.4,
          trend: 'up'
        },
        users: {
          current: 36847,
          previous: 31256,
          change: 17.9,
          trend: 'up'
        },
        spend: {
          current: 2450,
          previous: 2680,
          change: -8.6,
          trend: 'down'
        },
        posts: {
          current: 642,
          previous: 545,
          change: 17.8,
          trend: 'up'
        }
      };
    }

    console.log(`Dashboard metrics fetched successfully for period: ${period}`);
    res.json(metrics);

  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard metrics',
      message: error.message
    });
  }
});

/**
 * GET /api/dashboard/summary
 * Get overall summary metrics
 */
router.get('/summary', async (req, res) => {
  try {
    console.log('Fetching dashboard summary');

    // TODO: In production, fetch from MongoDB
    const summary = {
      totalMRR: 425,
      totalUsers: 1247,
      monthlySpend: 2450,
      postsThisMonth: 89,
      activeCampaigns: 3,
      upcomingTasks: 5
    };

    res.json(summary);

  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard summary',
      message: error.message
    });
  }
});

export default router;
