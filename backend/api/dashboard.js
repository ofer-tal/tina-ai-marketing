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
 * GET /api/dashboard/mrr-trend
 * Get MRR trend data over time for strategic dashboard
 * Query params:
 *   - range: '30d', '90d', '180d' (default: '30d')
 */
router.get('/mrr-trend', async (req, res) => {
  try {
    const { range = '30d' } = req.query;

    // Validate range parameter
    const validRanges = ['30d', '90d', '180d'];
    if (!validRanges.includes(range)) {
      return res.status(400).json({
        error: 'Invalid range. Must be one of: ' + validRanges.join(', ')
      });
    }

    console.log(`Fetching MRR trend data for range: ${range}`);

    // Calculate number of days
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 180;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // TODO: In production, fetch from MongoDB marketing_metrics collection
    // For now, generate mock trend data
    const data = [];
    let currentMrr = 300;
    const targetMrr = 10000;

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      // Simulate growth with some randomness
      const progress = i / days;
      const growth = (targetMrr - currentMrr) / (days - i + 1);
      const randomFactor = (Math.random() - 0.4) * 50;
      currentMrr = Math.max(300, currentMrr + growth + randomFactor);

      data.push({
        date: date.toISOString().split('T')[0],
        mrr: Math.round(currentMrr),
        target: Math.round(targetMrr * progress)
      });
    }

    // Calculate summary metrics
    const current = data[data.length - 1].mrr;
    const previousIndex = Math.max(0, data.length - 8); // 7 days ago
    const previous = data[previousIndex].mrr;
    const change = ((current - previous) / previous * 100);

    const trendData = {
      range: range,
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
      data: data,
      summary: {
        current: Math.round(current),
        previous: Math.round(previous),
        change: parseFloat(change.toFixed(1)),
        trend: current >= previous ? 'up' : 'down'
      }
    };

    console.log(`MRR trend data fetched successfully for range: ${range}`);
    res.json(trendData);

  } catch (error) {
    console.error('Error fetching MRR trend data:', error);
    res.status(500).json({
      error: 'Failed to fetch MRR trend data',
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
