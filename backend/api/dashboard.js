import express from 'express';
import { cacheMiddleware } from '../middleware/cache.js';
import MarketingRevenue from '../models/MarketingRevenue.js';
import MarketingPost from '../models/MarketingPost.js';
import DailyRevenueAggregate from '../models/DailyRevenueAggregate.js';
import DailySpend from '../models/DailySpend.js';

const router = express.Router();

/**
 * GET /api/dashboard/metrics
 * Get dashboard metrics for a specified time period (cached for 1 minute)
 * Query params:
 *   - period: '24h', '7d', '30d' (default: '24h')
 */
router.get('/metrics', cacheMiddleware('dashboardMetrics'), async (req, res) => {
  try {
    const { period = '24h' } = req.query;

    // Validate period parameter
    const validPeriods = ['24h', '7d', '30d'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        error: 'Invalid period. Must be one of: ' + validPeriods.join(', ')
      });
    }

    console.log(`Fetching dashboard metrics for period: ${period} [CHURN_FEATURE_ENABLED_v2]`);

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

    // Fetch real data from MongoDB
    console.log(`Fetching dashboard metrics for period: ${period} from database`);

    // Calculate previous period for comparison
    let previousStartTime;
    if (period === '24h') {
      previousStartTime = new Date(startTime.getTime() - 24 * 60 * 60 * 1000);
    } else if (period === '7d') {
      previousStartTime = new Date(startTime.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === '30d') {
      previousStartTime = new Date(startTime.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Fetch MRR from DailyRevenueAggregate (uses proper MRR calculation from subscriptions)
    // Get the latest daily aggregate for current MRR
    const latestAggregate = await DailyRevenueAggregate.findOne()
      .sort({ date: -1 })
      .limit(1);

    const currentMRR = latestAggregate?.mrr || 0;

    // Get active subscribers from DailyRevenueAggregate
    const currentActiveSubscribers = latestAggregate?.subscribers?.totalCount || 0;

    // Get ARPU from DailyRevenueAggregate
    const currentARPU = latestAggregate?.arpu?.value || 0;

    // Get previous MRR from a week ago for comparison
    const previousDate = new Date(now);
    previousDate.setDate(previousDate.getDate() - 7);

    const previousAggregate = await DailyRevenueAggregate.findOne({
      dateObj: { $lt: previousDate }
    })
      .sort({ date: -1 })
      .limit(1);

    const previousMRR = previousAggregate?.mrr || 0;
    const mrrChange = previousMRR > 0 ? ((currentMRR - previousMRR) / previousMRR * 100) : 0;

    const previousActiveSubscribers = previousAggregate?.subscribers?.totalCount || 0;
    const subscribersChange = previousActiveSubscribers > 0 ? ((currentActiveSubscribers - previousActiveSubscribers) / previousActiveSubscribers * 100) : 0;

    const previousARPU = previousAggregate?.arpu?.value || 0;
    const arpuChange = previousARPU > 0 ? ((currentARPU - previousARPU) / previousARPU * 100) : 0;

    // Get churn rate from aggregates
    // Use monthly aggregate if available, otherwise use weekly, otherwise use latest daily
    let currentChurnRate = 0;
    let previousChurnRate = 0;

    // Try monthly first for the current month
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const MonthlyRevenueAggregate = (await import('../models/MonthlyRevenueAggregate.js')).default;

    const currentMonthAggregate = await MonthlyRevenueAggregate.findOne({
      year: currentYear,
      month: currentMonth
    });

    if (currentMonthAggregate) {
      currentChurnRate = currentMonthAggregate.churn?.rate || 0;
    } else {
      // Fall back to latest daily
      currentChurnRate = latestAggregate?.churn?.rate || 0;
    }

    // Get previous month's churn rate for comparison
    const prevMonth = currentMonth - 1;
    let previousMonthAggregate = null;

    if (prevMonth > 0) {
      previousMonthAggregate = await MonthlyRevenueAggregate.findOne({
        year: currentYear,
        month: prevMonth
      });
    } else if (prevMonth === 0) {
      // Check December of previous year
      previousMonthAggregate = await MonthlyRevenueAggregate.findOne({
        year: currentYear - 1,
        month: 12
      });
    }

    if (previousMonthAggregate) {
      previousChurnRate = previousMonthAggregate.churn?.rate || 0;
    } else {
      // Fall back to previous aggregate
      previousChurnRate = previousAggregate?.churn?.rate || 0;
    }

    const churnChange = previousChurnRate > 0 ? ((currentChurnRate - previousChurnRate) / previousChurnRate * 100) : 0;

    // Get LTV from aggregates
    // Use monthly aggregate if available, otherwise use weekly, otherwise use latest daily
    let currentLTV = 0;
    let previousLTV = 0;

    if (currentMonthAggregate) {
      currentLTV = currentMonthAggregate.ltv?.value || 0;
    } else {
      currentLTV = latestAggregate?.ltv?.value || 0;
    }

    if (previousMonthAggregate) {
      previousLTV = previousMonthAggregate.ltv?.value || 0;
    } else {
      previousLTV = previousAggregate?.ltv?.value || 0;
    }

    const ltvChange = previousLTV > 0 ? ((currentLTV - previousLTV) / previousLTV * 100) : 0;

    // Get marketing costs from aggregates
    // Use monthly aggregate if available, otherwise use latest daily
    let currentCosts = {
      totalCost: 0,
      cloudServices: 0,
      apiServices: 0,
      adSpend: 0,
      other: 0,
      percentageOfRevenue: 0
    };
    let previousCosts = {
      totalCost: 0,
      cloudServices: 0,
      apiServices: 0,
      adSpend: 0,
      other: 0,
      percentageOfRevenue: 0
    };

    if (currentMonthAggregate) {
      currentCosts = currentMonthAggregate.costs || currentCosts;
    } else {
      currentCosts = latestAggregate?.costs || currentCosts;
    }

    if (previousMonthAggregate) {
      previousCosts = previousMonthAggregate.costs || previousCosts;
    } else {
      previousCosts = previousAggregate?.costs || previousCosts;
    }

    const costsChange = previousCosts.totalCost > 0 ? ((currentCosts.totalCost - previousCosts.totalCost) / previousCosts.totalCost * 100) : 0;

    // Get profit margin from aggregates
    // Use monthly aggregate if available, otherwise use latest daily
    let currentProfitMargin = {
      value: 0,
      percentage: 0,
      netRevenue: 0,
      totalCosts: 0
    };
    let previousProfitMargin = {
      value: 0,
      percentage: 0,
      netRevenue: 0,
      totalCosts: 0
    };

    if (currentMonthAggregate) {
      currentProfitMargin = currentMonthAggregate.profitMargin || currentProfitMargin;
    } else {
      currentProfitMargin = latestAggregate?.profitMargin || currentProfitMargin;
    }

    if (previousMonthAggregate) {
      previousProfitMargin = previousMonthAggregate.profitMargin || previousProfitMargin;
    } else {
      previousProfitMargin = previousAggregate?.profitMargin || previousProfitMargin;
    }

    const profitMarginChange = previousProfitMargin.value > 0 ? ((currentProfitMargin.value - previousProfitMargin.value) / previousProfitMargin.value * 100) : 0;

    // Fetch posted posts count (current period)
    const currentPosts = await MarketingPost.countDocuments({
      status: 'posted',
      postedAt: { $gte: startTime, $lte: now }
    });

    // Fetch posted posts count (previous period)
    const previousPosts = await MarketingPost.countDocuments({
      status: 'posted',
      postedAt: { $gte: previousStartTime, $lt: startTime }
    });

    const postsChange = previousPosts > 0 ? ((currentPosts - previousPosts) / previousPosts * 100) : 0;

    // Fetch total unique customers (subscribers + returning)
    const currentUsersResult = await MarketingRevenue.aggregate([
      {
        $match: {
          transactionDate: { $gte: startTime, $lte: now }
        }
      },
      {
        $group: {
          _id: '$subscriptionId',
          count: { $sum: 1 }
        }
      },
      {
        $count: 'totalUsers'
      }
    ]);

    const previousUsersResult = await MarketingRevenue.aggregate([
      {
        $match: {
          transactionDate: { $gte: previousStartTime, $lt: startTime }
        }
      },
      {
        $group: {
          _id: '$subscriptionId',
          count: { $sum: 1 }
        }
      },
      {
        $count: 'totalUsers'
      }
    ]);

    const currentUsers = currentUsersResult[0]?.totalUsers || 0;
    const previousUsers = previousUsersResult[0]?.totalUsers || 0;
    const usersChange = previousUsers > 0 ? ((currentUsers - previousUsers) / previousUsers * 100) : 0;

    // For spend, we'll use the same data as posts for now (this would come from campaign spend data)
    // TODO: Implement real campaign spend tracking
    const currentSpend = currentPosts * 3.5; // Mock: $3.50 per post average
    const previousSpend = previousPosts * 3.5;
    const spendChange = previousSpend > 0 ? ((currentSpend - previousSpend) / previousSpend * 100) : 0;

    // Build metrics object
    const metrics = {
      period: period,
      startTime: startTime.toISOString(),
      endTime: now.toISOString(),
      mrr: {
        current: Math.round(currentMRR),
        previous: Math.round(previousMRR),
        change: parseFloat(mrrChange.toFixed(1)),
        trend: currentMRR >= previousMRR ? 'up' : 'down'
      },
      subscribers: {
        current: currentActiveSubscribers,
        previous: previousActiveSubscribers,
        change: parseFloat(subscribersChange.toFixed(1)),
        trend: currentActiveSubscribers >= previousActiveSubscribers ? 'up' : 'down'
      },
      arpu: {
        current: parseFloat(currentARPU.toFixed(2)),
        previous: parseFloat(previousARPU.toFixed(2)),
        change: parseFloat(arpuChange.toFixed(1)),
        trend: currentARPU >= previousARPU ? 'up' : 'down'
      },
      ltv: {
        current: parseFloat(currentLTV.toFixed(2)),
        previous: parseFloat(previousLTV.toFixed(2)),
        change: parseFloat(ltvChange.toFixed(1)),
        trend: currentLTV >= previousLTV ? 'up' : 'down'
      },
      churn: {
        current: parseFloat(currentChurnRate.toFixed(2)),
        previous: parseFloat(previousChurnRate.toFixed(2)),
        change: parseFloat(churnChange.toFixed(1)),
        trend: currentChurnRate <= previousChurnRate ? 'down' : 'up' // Lower churn is better
      },
      costs: {
        current: parseFloat(currentCosts.totalCost.toFixed(2)),
        previous: parseFloat(previousCosts.totalCost.toFixed(2)),
        change: parseFloat(costsChange.toFixed(1)),
        trend: currentCosts.totalCost <= previousCosts.totalCost ? 'down' : 'up', // Lower costs are better
        breakdown: {
          cloudServices: parseFloat(currentCosts.cloudServices.toFixed(2)),
          apiServices: parseFloat(currentCosts.apiServices.toFixed(2)),
          adSpend: parseFloat(currentCosts.adSpend.toFixed(2)),
          other: parseFloat(currentCosts.other.toFixed(2)),
          percentageOfRevenue: parseFloat(currentCosts.percentageOfRevenue.toFixed(1))
        }
      },
      profitMargin: {
        current: parseFloat(currentProfitMargin.value.toFixed(2)),
        previous: parseFloat(previousProfitMargin.value.toFixed(2)),
        change: parseFloat(profitMarginChange.toFixed(1)),
        trend: currentProfitMargin.value >= previousProfitMargin.value ? 'up' : 'down',
        percentage: parseFloat(currentProfitMargin.percentage.toFixed(1))
      },
      users: {
        current: currentUsers,
        previous: previousUsers,
        change: parseFloat(usersChange.toFixed(1)),
        trend: currentUsers >= previousUsers ? 'up' : 'down'
      },
      spend: {
        current: parseFloat(currentSpend.toFixed(2)),
        previous: parseFloat(previousSpend.toFixed(2)),
        change: parseFloat(spendChange.toFixed(1)),
        trend: currentSpend >= previousSpend ? 'up' : 'down'
      },
      posts: {
        current: currentPosts,
        previous: previousPosts,
        change: parseFloat(postsChange.toFixed(1)),
        trend: currentPosts >= previousPosts ? 'up' : 'down'
      }
    };

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

    // Fetch real data from DailyRevenueAggregate
    const aggregates = await DailyRevenueAggregate.find({
      dateObj: { $gte: startDate }
    }).sort({ dateObj: 1 });

    // Build data array from aggregates
    const data = aggregates.map(agg => ({
      date: agg.date,
      mrr: agg.mrr || 0,
      target: 0 // TODO: Add target calculation
    }));

    // Fill in missing dates with zeros
    const resultMap = new Map(data.map(d => [d.date, d]));
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      if (!resultMap.has(dateStr)) {
        resultMap.set(dateStr, { date: dateStr, mrr: 0, target: 0 });
      }
    }

    const sortedData = Array.from(resultMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Calculate summary
    const currentMRR = sortedData.length > 0 ? sortedData[sortedData.length - 1].mrr : 0;
    const previousMRR = sortedData.length > 7 ? sortedData[sortedData.length - 8].mrr : 0;
    const change = previousMRR > 0 ? ((currentMRR - previousMRR) / previousMRR) * 100 : 0;
    const trend = currentMRR >= previousMRR ? 'up' : 'down';

    const trendData = {
      range: range,
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
      data: sortedData,
      summary: {
        current: currentMRR,
        previous: previousMRR,
        change: change,
        trend: trend
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
 * GET /api/dashboard/user-growth
 * Get user growth trend data over time for strategic dashboard
 * Query params:
 *   - range: '30d', '90d', '180d' (default: '30d')
 */
router.get('/user-growth', async (req, res) => {
  try {
    const { range = '30d' } = req.query;

    // Validate range parameter
    const validRanges = ['30d', '90d', '180d'];
    if (!validRanges.includes(range)) {
      return res.status(400).json({
        error: 'Invalid range. Must be one of: ' + validRanges.join(', ')
      });
    }

    console.log(`Fetching user growth trend data for range: ${range}`);

    // Calculate number of days
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 180;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch real data from DailyRevenueAggregate
    const aggregates = await DailyRevenueAggregate.find({
      dateObj: { $gte: startDate }
    }).sort({ dateObj: 1 });

    // Build data array from aggregates - use cumulative subscriber count
    const cumulativeSubscribers = [];
    let runningTotal = 0;

    for (const agg of aggregates) {
      runningTotal += agg.transactions?.newCustomers || 0;
      cumulativeSubscribers.push({
        date: agg.date,
        users: agg.subscriptions?.totalCount || 0,
        newUsers: agg.transactions?.newCustomers || 0
      });
    }

    // Fill in missing dates
    const resultMap = new Map(cumulativeSubscribers.map(d => [d.date, d]));
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      if (!resultMap.has(dateStr)) {
        resultMap.set(dateStr, { date: dateStr, users: 0, newUsers: 0 });
      }
    }

    const sortedData = Array.from(resultMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Calculate summary
    const currentUsers = sortedData.length > 0 ? sortedData[sortedData.length - 1].users : 0;
    const previousUsers = sortedData.length > 7 ? sortedData[sortedData.length - 8].users : 0;
    const change = previousUsers > 0 ? ((currentUsers - previousUsers) / previousUsers) * 100 : 0;
    const avgDailyNewUsers = sortedData.reduce((sum, d) => sum + d.newUsers, 0) / sortedData.length;
    const trend = currentUsers >= previousUsers ? 'up' : 'down';

    const trendData = {
      range: range,
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
      data: sortedData,
      summary: {
        current: currentUsers,
        previous: previousUsers,
        change: change,
        changePercent: change,
        avgDailyNewUsers: avgDailyNewUsers,
        trend: trend
      }
    };

    console.log(`User growth trend data fetched successfully for range: ${range}`);
    res.json(trendData);

  } catch (error) {
    console.error('Error fetching user growth trend data:', error);
    res.status(500).json({
      error: 'Failed to fetch user growth trend data',
      message: error.message
    });
  }
});

/**
 * GET /api/dashboard/cac-trend
 * Get Customer Acquisition Cost (CAC) trend data over time for strategic dashboard
 * Query params:
 *   - range: '30d', '90d', '180d' (default: '30d')
 */
router.get('/cac-trend', async (req, res) => {
  try {
    const { range = '30d' } = req.query;

    // Validate range parameter
    const validRanges = ['30d', '90d', '180d'];
    if (!validRanges.includes(range)) {
      return res.status(400).json({
        error: 'Invalid range. Must be one of: ' + validRanges.join(', ')
      });
    }

    console.log(`Fetching CAC trend data for range: ${range}`);

    // Calculate number of days
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 180;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // NO REAL DATA YET - Return empty structure
    // TODO: Connect to real analytics source when available
    const data = [];
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      data.push({
        date: date.toISOString().split('T')[0],
        cac: 0,
        marketingSpend: 0,
        newUsers: 0
      });
    }

    const trendData = {
      range: range,
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
      data: data,
      summary: {
        current: 0,
        previous: 0,
        change: 0,
        changePercent: 0,
        average: 0,
        totalSpend: 0,
        totalNewUsers: 0,
        trend: 'neutral'
      }
    };

    console.log(`CAC trend data fetched successfully for range: ${range}`);
    res.json(trendData);

  } catch (error) {
    console.error('Error fetching CAC trend data:', error);
    res.status(500).json({
      error: 'Failed to fetch CAC trend data',
      message: error.message
    });
  }
});

/**
 * GET /api/dashboard/acquisition-split
 * Get organic vs paid user acquisition split for strategic dashboard
 * Query params:
 *   - range: '30d', '90d', '180d' (default: '30d')
 */
router.get('/acquisition-split', async (req, res) => {
  try {
    const { range = '30d' } = req.query;

    // Validate range parameter
    const validRanges = ['30d', '90d', '180d'];
    if (!validRanges.includes(range)) {
      return res.status(400).json({
        error: 'Invalid range. Must be one of: ' + validRanges.join(', ')
      });
    }

    console.log(`Fetching acquisition split data for range: ${range}`);

    // Calculate number of days
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 180;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // NO REAL DATA YET - Return empty structure
    // TODO: Connect to real analytics source when available
    const data = [];
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      data.push({
        date: date.toISOString().split('T')[0],
        totalUsers: 0,
        organicUsers: 0,
        paidUsers: 0,
        organicPercent: 0,
        paidPercent: 0
      });
    }

    const splitData = {
      range: range,
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
      data: data,
      summary: {
        totalUsers: 0,
        organicUsers: 0,
        paidUsers: 0,
        organicPercent: 0,
        paidPercent: 0,
        previous: {
          organicPercent: 0,
          paidPercent: 0
        },
        trend: 'neutral'
      }
    };

    console.log(`Acquisition split data fetched successfully for range: ${range}`);
    res.json(splitData);

  } catch (error) {
    console.error('Error fetching acquisition split data:', error);
    res.status(500).json({
      error: 'Failed to fetch acquisition split data',
      message: error.message
    });
  }
});

/**
 * GET /api/dashboard/posts/performance
 * Get real-time performance metrics for recent social media posts
 * Query params:
 *   - limit: number of posts to return (default: 10)
 */
router.get('/posts/performance', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    console.log(`Fetching post performance metrics for ${limit} recent posts`);

    // Fetch REAL data from MongoDB marketing_posts collection
    const MarketingPost = (await import('../models/MarketingPost.js')).default;

    const posts = await MarketingPost.find({ status: 'posted' })
      .sort({ postedAt: -1 })
      .limit(parseInt(limit));

    console.log(`Found ${posts.length} posted posts`);

    // Format posts for response
    const formattedPosts = posts.map(post => ({
      id: post._id.toString(),
      title: post.title || 'Untitled Post',
      platform: post.platform,
      status: post.status,
      postedAt: post.postedAt,
      tiktokVideoId: post.tiktokVideoId,
      performanceMetrics: post.performanceMetrics || {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        engagementRate: 0
      }
    }));

    // Calculate aggregate stats
    const totalViews = formattedPosts.reduce((sum, post) => sum + (post.performanceMetrics.views || 0), 0);
    const totalLikes = formattedPosts.reduce((sum, post) => sum + (post.performanceMetrics.likes || 0), 0);
    const totalComments = formattedPosts.reduce((sum, post) => sum + (post.performanceMetrics.comments || 0), 0);
    const totalShares = formattedPosts.reduce((sum, post) => sum + (post.performanceMetrics.shares || 0), 0);
    const totalEngagementRate = formattedPosts.reduce((sum, post) => sum + (post.performanceMetrics.engagementRate || 0), 0);
    const avgEngagementRate = formattedPosts.length > 0 ? totalEngagementRate / formattedPosts.length : 0;

    const performanceData = {
      posts: formattedPosts,
      summary: {
        totalPosts: formattedPosts.length,
        totalViews: totalViews,
        totalLikes: totalLikes,
        totalComments: totalComments,
        totalShares: totalShares,
        avgEngagementRate: parseFloat(avgEngagementRate.toFixed(2)),
        topPerformingPost: formattedPosts.length > 0
          ? formattedPosts.reduce((best, post) =>
              (post.performanceMetrics.engagementRate || 0) > (best.performanceMetrics.engagementRate || 0) ? post : best
            )
          : null
      },
      lastUpdated: new Date().toISOString()
    };

    console.log(`Post performance data fetched successfully for ${limit} posts`);
    res.json(performanceData);

  } catch (error) {
    console.error('Error fetching post performance data:', error);
    res.status(500).json({
      error: 'Failed to fetch post performance data',
      message: error.message
    });
  }
});

/**
 * GET /api/dashboard/revenue-spend-trend
 * Get revenue vs marketing spend trend over time
 * Query params:
 *   - range: '30d', '90d', '180d' (default: '30d')
 */
router.get('/revenue-spend-trend', async (req, res) => {
  try {
    const { range = '30d' } = req.query;

    // Validate range parameter
    const validRanges = ['30d', '90d', '180d'];
    if (!validRanges.includes(range)) {
      return res.status(400).json({
        error: 'Invalid range. Must be one of: ' + validRanges.join(', ')
      });
    }

    console.log(`Fetching revenue vs spend trend for range: ${range}`);

    // Calculate date range
    const days = parseInt(range.replace('d', ''));
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    // Fetch real data from DailyRevenueAggregate and DailySpend
    const [revenueAggregates, spendAggregates] = await Promise.all([
      DailyRevenueAggregate.find({
        dateObj: { $gte: startDate }
      }).sort({ dateObj: 1 }),
      DailySpend.find({
        date: { $gte: startDate.toISOString().split('T')[0] },
        platform: 'all'
      }).sort({ date: 1 })
    ]);

    // Create maps for quick lookup
    const revenueMap = new Map(revenueAggregates.map(r => [r.date, r.revenue?.net || 0]));
    const spendMap = new Map(spendAggregates.map(s => [s.date, s.actualSpend || 0]));

    // Build data array
    let cumulativeRevenue = 0;
    let cumulativeSpend = 0;
    const data = [];

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];

      const revenue = revenueMap.get(dateStr) || 0;
      const spend = spendMap.get(dateStr) || 0;
      const profit = revenue - spend;

      cumulativeRevenue += revenue;
      cumulativeSpend += spend;

      data.push({
        date: dateStr,
        revenue: revenue,
        spend: spend,
        profit: profit,
        cumulativeRevenue: cumulativeRevenue,
        cumulativeSpend: cumulativeSpend
      });
    }

    // Calculate summary
    const current = data[data.length - 1];
    const previous = data[Math.max(0, data.length - 8)]; // Compare to a week ago

    const summary = {
      current: {
        revenue: current.revenue,
        spend: current.spend,
        profit: current.profit,
        profitMargin: current.revenue > 0 ? (current.profit / current.revenue) * 100 : 0
      },
      previous: {
        revenue: previous.revenue,
        spend: previous.spend,
        profit: previous.profit
      },
      change: {
        revenue: previous.revenue > 0 ? ((current.revenue - previous.revenue) / previous.revenue) * 100 : 0,
        spend: previous.spend > 0 ? ((current.spend - previous.spend) / previous.spend) * 100 : 0
      },
      averages: {
        revenue: data.reduce((sum, d) => sum + d.revenue, 0) / data.length,
        spend: data.reduce((sum, d) => sum + d.spend, 0) / data.length,
        profitMargin: cumulativeRevenue > 0 ? ((cumulativeRevenue - cumulativeSpend) / cumulativeRevenue) * 100 : 0
      },
      totalProfit: cumulativeRevenue - cumulativeSpend
    };

    res.json({
      range: range,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      data: data,
      summary: summary
    });

  } catch (error) {
    console.error('Error fetching revenue vs spend trend:', error);
    res.status(500).json({
      error: 'Failed to fetch revenue vs spend trend',
      message: error.message
    });
  }
});

/**
 * GET /api/dashboard/roi-by-channel
 * Get ROI breakdown by marketing channel for strategic dashboard
 * Query params:
 *   - range: '30d', '90d', '180d' (default: '30d')
 */
router.get('/roi-by-channel', async (req, res) => {
  try {
    const { range = '30d' } = req.query;

    // Validate range parameter
    const validRanges = ['30d', '90d', '180d'];
    if (!validRanges.includes(range)) {
      return res.status(400).json({
        error: 'Invalid range. Must be one of: ' + validRanges.join(', ')
      });
    }

    console.log(`Fetching ROI by channel data for range: ${range}`);

    // Calculate number of days
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 180;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // NO REAL DATA YET - Return empty structure
    // TODO: Connect to real analytics source when available
    const channels = [
      { id: 'apple_search_ads', name: 'Apple Search Ads', category: 'paid', icon: '🍎', color: '#00d26a' },
      { id: 'tiktok_ads', name: 'TikTok Ads', category: 'paid', icon: '🎵', color: '#e94560' },
      { id: 'instagram_ads', name: 'Instagram Ads', category: 'paid', icon: '📸', color: '#7b2cbf' },
      { id: 'organic_app_store', name: 'Organic (App Store)', category: 'organic', icon: '🔍', color: '#00d4ff' },
      { id: 'social_organic', name: 'Social Organic', category: 'organic', icon: '💬', color: '#ffb020' }
    ];

    const channelData = channels.map(channel => ({
      id: channel.id,
      name: channel.name,
      category: channel.category,
      icon: channel.icon,
      color: channel.color,
      metrics: { spend: 0, revenue: 0, profit: 0, users: 0, roi: 0, roas: 0, cac: 0, ltv: 0 }
    }));

    const roiData = {
      range: range,
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
      channels: channelData,
      summary: {
        totalSpend: 0,
        totalRevenue: 0,
        totalProfit: 0,
        totalUsers: 0,
        overallROI: null,
        overallROAS: null,
        avgCAC: null,
        bestChannel: null,
        worstChannel: null
      }
    };
    res.json(roiData);

  } catch (error) {
    console.error('Error fetching ROI by channel data:', error);
    res.status(500).json({
      error: 'Failed to fetch ROI by channel data',
      message: error.message
    });
  }
});

/**
 * GET /api/dashboard/engagement
 * Get aggregate engagement metrics with breakdown by platform
 * Query params:
 *   - period: '24h', '7d', '30d' (default: '24h')
 */
router.get('/engagement', async (req, res) => {
  try {
    const { period = '24h' } = req.query;

    // Validate period parameter
    const validPeriods = ['24h', '7d', '30d'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        error: 'Invalid period. Must be one of: ' + validPeriods.join(', ')
      });
    }

    console.log(`Fetching engagement metrics for period: ${period}`);

    // Calculate time range based on period
    const days = period === '24h' ? 1 : period === '7d' ? 7 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Platform metadata
    const platforms = [
      { id: 'tiktok', name: 'TikTok', icon: '🎵', color: '#000000' },
      { id: 'instagram', name: 'Instagram', icon: '📸', color: '#E4405F' },
      { id: 'youtube_shorts', name: 'YouTube Shorts', icon: '📺', color: '#FF0000' }
    ];

    // Fetch real data from MongoDB marketing_posts collection
    const MarketingPost = (await import('../models/MarketingPost.js')).default;

    // Fetch posted posts within the time period
    const posts = await MarketingPost.find({
      status: 'posted',
      postedAt: { $gte: startDate }
    });

    console.log(`Found ${posts.length} posted posts in period: ${period}`);

    // Debug: Log sample of posts with/without metrics
    const postsWithMetrics = posts.filter(p => p.performanceMetrics && p.performanceMetrics.views > 0);
    const postsWithoutMetrics = posts.length - postsWithMetrics.length;
    console.log(`  Posts with metrics: ${postsWithMetrics.length}, without metrics: ${postsWithoutMetrics}`);

    if (postsWithMetrics.length > 0) {
      console.log(`  Sample metrics:`, JSON.stringify(postsWithMetrics[0].performanceMetrics));
    }

    // Debug: Log post IDs and platforms
    if (posts.length > 0) {
      console.log(`  Sample posts (first 3):`);
      posts.slice(0, 3).forEach(p => {
        console.log(`    - ${p._id} | ${p.platform} | postedAt: ${p.postedAt} | metrics: ${p.performanceMetrics?.views || 0} views`);
      });
    }

    // Aggregate metrics by platform
    const platformData = platforms.map(platform => {
      const platformPosts = posts.filter(p => p.platform === platform.id);

      // Sum up metrics from all posts
      const totals = platformPosts.reduce((acc, post) => {
        const metrics = post.performanceMetrics || { views: 0, likes: 0, comments: 0, shares: 0, engagementRate: 0 };
        return {
          views: acc.views + (metrics.views || 0),
          likes: acc.likes + (metrics.likes || 0),
          comments: acc.comments + (metrics.comments || 0),
          shares: acc.shares + (metrics.shares || 0),
          posts: acc.posts + 1
        };
      }, { views: 0, likes: 0, comments: 0, shares: 0, posts: 0 });

      // Calculate engagement rate
      const engagementRate = totals.views > 0
        ? ((totals.likes + totals.comments + totals.shares) / totals.views) * 100
        : 0;

      return {
        id: platform.id,
        name: platform.name,
        icon: platform.icon,
        color: platform.color,
        metrics: {
          posts: totals.posts,
          views: totals.views,
          likes: totals.likes,
          comments: totals.comments,
          shares: totals.shares,
          engagementRate: parseFloat(engagementRate.toFixed(2)),
          avgViewsPerPost: totals.posts > 0 ? Math.round(totals.views / totals.posts) : 0,
          avgEngagementPerPost: totals.posts > 0 ? parseFloat((engagementRate / totals.posts).toFixed(2)) : 0
        }
      };
    });

    // Calculate aggregate totals
    const totalPosts = platformData.reduce((sum, p) => sum + p.metrics.posts, 0);
    const totalViews = platformData.reduce((sum, p) => sum + p.metrics.views, 0);
    const totalLikes = platformData.reduce((sum, p) => sum + p.metrics.likes, 0);
    const totalComments = platformData.reduce((sum, p) => sum + p.metrics.comments, 0);
    const totalShares = platformData.reduce((sum, p) => sum + p.metrics.shares, 0);
    const avgEngagementRate = platformData.reduce((sum, p) => sum + p.metrics.engagementRate, 0) / platformData.length;

    // Calculate previous period for comparison (fetch real data)
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - days);

    const previousEndDate = new Date(startDate);

    const previousPosts = await MarketingPost.find({
      status: 'posted',
      postedAt: { $gte: previousStartDate, $lt: previousEndDate }
    });

    console.log(`Found ${previousPosts.length} posted posts in previous period`);

    // Aggregate previous period metrics by platform
    const previousPlatformData = platforms.map(platform => {
      const platformPosts = previousPosts.filter(p => p.platform === platform.id);

      return platformPosts.reduce((acc, post) => {
        const metrics = post.performanceMetrics || { views: 0, likes: 0, comments: 0, shares: 0 };
        return {
          views: acc.views + (metrics.views || 0),
          likes: acc.likes + (metrics.likes || 0),
          comments: acc.comments + (metrics.comments || 0),
          shares: acc.shares + (metrics.shares || 0)
        };
      }, { views: 0, likes: 0, comments: 0, shares: 0 });
    });

    const previousViews = previousPlatformData.reduce((sum, p) => sum + p.views, 0);
    const previousLikes = previousPlatformData.reduce((sum, p) => sum + p.likes, 0);
    const previousComments = previousPlatformData.reduce((sum, p) => sum + p.comments, 0);
    const previousShares = previousPlatformData.reduce((sum, p) => sum + p.shares, 0);
    const previousEngagementRate = previousViews > 0
      ? ((previousLikes + previousComments + previousShares) / previousViews) * 100
      : 0;

    const engagementData = {
      period: period,
      platforms: platformData,
      aggregate: {
        totalPosts: totalPosts,
        totalViews: totalViews,
        totalLikes: totalLikes,
        totalComments: totalComments,
        totalShares: totalShares,
        avgEngagementRate: parseFloat(avgEngagementRate.toFixed(2)),
        avgViewsPerPost: totalPosts > 0 ? Math.round(totalViews / totalPosts) : 0,
        previous: {
          views: previousViews,
          likes: previousLikes,
          comments: previousComments,
          shares: previousShares,
          engagementRate: parseFloat(previousEngagementRate.toFixed(2))
        },
        changes: {
          views: previousViews > 0 ? parseFloat(((totalViews - previousViews) / previousViews * 100).toFixed(1)) : 0,
          likes: previousLikes > 0 ? parseFloat(((totalLikes - previousLikes) / previousLikes * 100).toFixed(1)) : 0,
          comments: previousComments > 0 ? parseFloat(((totalComments - previousComments) / previousComments * 100).toFixed(1)) : 0,
          shares: previousShares > 0 ? parseFloat(((totalShares - previousShares) / previousShares * 100).toFixed(1)) : 0,
          engagementRate: parseFloat((avgEngagementRate - previousEngagementRate).toFixed(2))
        }
      }
    };

    console.log(`Engagement metrics fetched successfully for period: ${period}`);
    res.json(engagementData);

  } catch (error) {
    console.error('Error fetching engagement metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch engagement metrics',
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

    // Fetch real data from aggregates
    const [latestAggregate, monthlyAggregate, weeklySpend, postsCount] = await Promise.all([
      DailyRevenueAggregate.findOne().sort({ dateObj: -1 }).limit(1),
      MonthlyRevenueAggregate.findOne().sort({ updatedAt: -1 }).limit(1),
      DailySpend.aggregate([
        {
          $match: {
            date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }
          }
        },
        {
          $group: {
            _id: null,
            totalSpend: { $sum: '$actualSpend' }
          }
        }
      ]),
      MarketingPost.countDocuments({
        status: 'posted',
        postedAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
      })
    ]);

    const monthlySpend = weeklySpend[0]?.totalSpend || 0;
    const mrr = monthlyAggregate?.netRevenue || latestAggregate?.mrr || 0;
    const activeSubscribers = monthlyAggregate?.activeSubscribers || latestAggregate?.subscriptions?.totalCount || 0;

    const summary = {
      totalMRR: Math.round(mrr),
      totalUsers: activeSubscribers,
      monthlySpend: parseFloat(monthlySpend.toFixed(2)),
      postsThisMonth: postsCount,
      activeCampaigns: 0, // TODO: Fetch from campaign data
      upcomingTasks: 0 // TODO: Fetch from tasks
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

/**
 * GET /api/dashboard/conversion-funnel
 * Get conversion funnel data from impression to subscription
 * Query params:
 *   - period: '30d', '90d', '180d' (default: '30d')
 */
router.get('/conversion-funnel', async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    // Validate period parameter
    const validPeriods = ['30d', '90d', '180d'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        error: 'Invalid period. Must be one of: ' + validPeriods.join(', ')
      });
    }

    console.log(`Fetching conversion funnel for period: ${period}`);

    // Calculate time range based on period
    const now = new Date();
    let startTime;
    let days;

    switch (period) {
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        days = 30;
        break;
      case '90d':
        startTime = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        days = 90;
        break;
      case '180d':
        startTime = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        days = 180;
        break;
    }

    // NO REAL DATA YET - Return empty structure
    // TODO: Connect to real analytics source when available
    const funnelData = {
      period: period,
      startTime: startTime.toISOString(),
      endTime: now.toISOString(),
      days: days,
      stages: [
        { id: 'impressions', name: 'App Store Impressions', description: 'Times app appeared in search or browse', count: 0, conversionRate: null, dropoffCount: null, dropoffRate: null },
        { id: 'product_page_views', name: 'Product Page Views', description: 'Users who viewed the app product page', count: 0, conversionRate: 0, dropoffCount: 0, dropoffRate: 0 },
        { id: 'downloads', name: 'App Downloads', description: 'Users who downloaded the app', count: 0, conversionRate: 0, dropoffCount: 0, dropoffRate: 0 },
        { id: 'installs', name: 'App Installs', description: 'Users who completed installation', count: 0, conversionRate: 0, dropoffCount: 0, dropoffRate: 0 },
        { id: 'signups', name: 'Account Signups', description: 'Users who created an account', count: 0, conversionRate: 0, dropoffCount: 0, dropoffRate: 0 },
        { id: 'trial_starts', name: 'Trial Activations', description: 'Users who started free trial', count: 0, conversionRate: 0, dropoffCount: 0, dropoffRate: 0 },
        { id: 'subscriptions', name: 'Paid Subscriptions', description: 'Users who converted to paid subscription', count: 0, conversionRate: 0, dropoffCount: 0, dropoffRate: 0 }
      ],
      summary: {
        totalImpressions: 0,
        totalConversions: 0,
        overallConversionRate: 0,
        avgConversionRatePerStage: 0,
        biggestDropoffStage: null,
        biggestDropoffRate: 0
      },
      stageDetails: {
        impressions: { breakdown: { search: 0, browse: 0, referrals: 0 }, topSources: [] },
        product_page_views: { avgTimeOnPage: 0, bounceRate: 0, returnVisitors: 0 },
        downloads: { abortedDownloads: 0, retryRate: 0 },
        subscriptions: { byPlan: { monthly: 0, annual: 0 }, avgTimeToSubscribe: 0, churnRate: 0 }
      }
    };
    res.json(funnelData);

  } catch (error) {
    console.error('Error fetching conversion funnel:', error);
    res.status(500).json({
      error: 'Failed to fetch conversion funnel data',
      message: error.message
    });
  }
});

/**
 * GET /api/dashboard/budget-utilization
 * Get budget utilization data with alerts
 * Shows current spend vs budget with threshold alerts (70%, 90%)
 */
router.get('/budget-utilization', async (req, res) => {
  try {
    // NO REAL DATA YET - Return empty structure
    // TODO: Connect to real budget/campaign data when available
    const budgetData = {
      period: {
        start: startOfMonth.toISOString(),
        end: now.toISOString(),
        currentDay: now.getDate(),
        daysInMonth: daysInMonth,
        remainingDays: daysInMonth - now.getDate()
      },
      budget: {
        monthly: 0,
        spent: 0,
        remaining: 0,
        projected: 0
      },
      variance: {
        amount: 0,
        percent: 0,
        status: 'none',
        description: 'No budget configured'
      },
      utilization: {
        percent: 0,
        amount: 0,
        ofTotal: 0
      },
      thresholds: {
        warning: 70,
        critical: 90,
        current: 'normal'
      },
      alert: {
        level: 'normal',
        message: null,
        action: null
      },
      pacing: {
        currentDailySpend: 0,
        requiredDailySpend: 0,
        budgetHealth: 'unknown'
      },
      breakdown: {
        apple_search_ads: { spent: 0, budget: 0, percent: 0, variance: { amount: 0, percent: 0 } },
        tiktok_ads: { spent: 0, budget: 0, percent: 0, variance: { amount: 0, percent: 0 } },
        instagram_ads: { spent: 0, budget: 0, percent: 0, variance: { amount: 0, percent: 0 } }
      }
    };
    res.json(budgetData);

  } catch (error) {
    console.error('Error fetching budget utilization:', error);
    res.status(500).json({
      error: 'Failed to fetch budget utilization data',
      message: error.message
    });
  }
});

/**
 * GET /api/dashboard/alerts
 * Get alert notifications for important events
 */
router.get('/alerts', async (req, res) => {
  try {
    console.log('Fetching dashboard alerts');

    const now = new Date();
    const alerts = [];

    // NO REAL DATA YET - Return empty alerts array
    // TODO: Implement real alert system when connected to data sources
    // Real alerts would be generated from:
    // - Budget utilization thresholds
    // - Failed post publishing attempts
    // - Keyword ranking changes (from ASO tracking)
    // - Campaign performance issues
    // - Pending content approvals
    // - Revenue milestones

    res.json({
      alerts: alerts,
      summary: {
        total: 0,
        critical: 0,
        warning: 0,
        info: 0
      },
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      error: 'Failed to fetch alerts',
      message: error.message
    });
  }
});

/**
 * GET /api/dashboard/projections
 * Get financial projections based on historical trends
 * Query params:
 *   - period: Historical period (default: 90d)
 *   - horizon: Forecast horizon in months (default: 6)
 */
router.get('/projections', async (req, res) => {
  try {
    const { period = '90d', horizon = 6 } = req.query;

    console.log(`Fetching financial projections with period: ${period}, horizon: ${horizon} months`);

    const PredictiveAnalyticsService = (await import('../services/predictiveAnalyticsService.js')).default;
    const service = new PredictiveAnalyticsService();

    // Step 1: Analyze revenue growth trend
    const historicalTrend = await service.analyzeHistoricalTrends(period, 'revenue');

    // Step 2: Apply forecasting model to extrapolate future months
    // Use ensemble model for balanced predictions
    const forecastDays = parseInt(horizon) * 30; // Convert months to days
    const forecast = await service.generateForecast(period, forecastDays, 'revenue', 'ensemble');

    // Step 3: Generate projections with scenarios
    const projections = {
      horizon: parseInt(horizon),
      period: period,
      model: 'ensemble',
      calculatedAt: new Date().toISOString(),

      // Monthly projections (aggregate daily forecasts to monthly)
      monthlyProjections: aggregateDailyToMonthly(
        forecast.projections.projections.map((p, i) => ({
          date: p.date,
          value: p.value
        })),
        parseInt(horizon)
      ),

      // Summary statistics
      summary: {
        totalProjected: forecast.projections.summary.totalProjected,
        averageMonthly: forecast.projections.summary.totalProjected / parseInt(horizon),
        finalMonthRevenue: forecast.projections.summary.finalValue,
        growthRate: historicalTrend.statistics.avgDailyGrowthRate * 30, // Monthly growth rate
        trendDirection: historicalTrend.statistics.trendDirection,
        confidence: forecast.confidenceIntervals.confidenceLevel
      },

      // Scenario analysis (optimistic, base, pessimistic)
      scenarios: {
        optimistic: {
          description: 'Best-case scenario (95th percentile)',
          total: forecast.confidenceIntervals.summary.totalUpper,
          monthly: forecast.confidenceIntervals.intervals
            .slice(0, parseInt(horizon) * 30)
            .reduce((acc, val) => acc + val.upperBound, 0) / parseInt(horizon),
          finalMonth: forecast.confidenceIntervals.intervals[
            Math.min(forecast.confidenceIntervals.intervals.length - 1, parseInt(horizon) * 30 - 1)
          ]?.upperBound || 0
        },
        base: {
          description: 'Base case forecast',
          total: forecast.projections.summary.totalProjected,
          monthly: forecast.projections.summary.totalProjected / parseInt(horizon),
          finalMonth: forecast.projections.summary.finalValue
        },
        pessimistic: {
          description: 'Worst-case scenario (5th percentile)',
          total: forecast.confidenceIntervals.summary.totalLower,
          monthly: forecast.confidenceIntervals.intervals
            .slice(0, parseInt(horizon) * 30)
            .reduce((acc, val) => acc + val.lowerBound, 0) / parseInt(horizon),
          finalMonth: forecast.confidenceIntervals.intervals[
            Math.min(forecast.confidenceIntervals.intervals.length - 1, parseInt(horizon) * 30 - 1)
          ]?.lowerBound || 0
        }
      },

      // Confidence intervals
      confidenceIntervals: {
        level: forecast.confidenceIntervals.confidenceLevel,
        margin: forecast.confidenceIntervals.summary.avgMargin,
        marginPercent: forecast.confidenceIntervals.summary.marginPercentage
      },

      // Model performance metrics
      modelMetrics: {
        type: forecast.forecast.modelMetrics.type,
        components: forecast.forecast.modelMetrics.components || [],
        accuracy: forecast.forecast.modelMetrics.r_squared || forecast.forecast.modelMetrics.mse || null
      }
    };

    // Build response
    const responseData = {
      success: true,
      analysis: {
        historical: {
          period: historicalTrend.period,
          dataPoints: historicalTrend.dataPoints,
          timeSeries: historicalTrend.timeSeries,
          statistics: historicalTrend.statistics,
          seasonality: historicalTrend.seasonality
        },
        projections: projections,
        metadata: {
          dataFreshness: 'real-time',
          lastDataUpdate: new Date().toISOString(),
          calculationTime: '< 1s',
          dataSource: 'marketing_revenue aggregates'
        }
      },
      timestamp: new Date().toISOString()
    };

    console.log(`Financial projections calculated successfully`);
    res.json(responseData);

  } catch (error) {
    console.error('Error generating financial projections:', error);
    res.status(500).json({
      error: 'Failed to generate financial projections',
      message: error.message
    });
  }
});

/**
 * GET /api/dashboard/strategic/financial-projections
 * Get financial projections formatted for strategic dashboard
 * This is a simplified version optimized for dashboard display
 */
router.get('/strategic/financial-projections', async (req, res) => {
  try {
    const { horizon = 6 } = req.query;

    console.log(`Fetching strategic dashboard projections for ${horizon} months`);

    // Fetch projections from the main projections endpoint
    const projections = await generateFinancialProjections('90d', parseInt(horizon));

    // Format for strategic dashboard display
    const chartData = projections.monthlyProjections.map((p, index) => {
      const monthNum = index + 1;
      const projectedDate = new Date();
      projectedDate.setMonth(projectedDate.getMonth() + monthNum);

      return {
        month: projectedDate.toLocaleString('default', { month: 'short', year: '2-digit' }),
        date: projectedDate.toISOString(),
        projected: Math.round(p.projectedRevenue),
        optimistic: Math.round(p.optimisticRevenue),
        pessimistic: Math.round(p.pessimisticRevenue),
        lowerBound: Math.round(p.lowerBound),
        upperBound: Math.round(p.upperBound)
      };
    });

    const summaryCards = [
      {
        title: 'Projected MRR',
        value: `$${Math.round(projections.summary.finalMonthRevenue)}`,
        change: `+${projections.summary.growthRate.toFixed(1)}%/mo`,
        trend: projections.summary.trendDirection,
        icon: '📈',
        color: 'success'
      },
      {
        title: '6-Month Forecast',
        value: `$${Math.round(projections.summary.totalProjected / 1000)}k`,
        subtitle: `Total revenue`,
        icon: '💰',
        color: 'primary'
      },
      {
        title: 'Confidence',
        value: `${Math.round(projections.confidenceIntervals.level * 100)}%`,
        subtitle: `±${Math.round(projections.confidenceIntervals.marginPercent)}% margin`,
        icon: '🎯',
        color: 'info'
      },
      {
        title: 'Best Case',
        value: `$${Math.round(projections.scenarios.optimistic.total / 1000)}k`,
        subtitle: '6-month total',
        icon: '🚀',
        color: 'success'
      }
    ];

    res.json({
      success: true,
      projections: {
        chartData: chartData,
        summaryCards: summaryCards,
        scenarios: projections.scenarios,
        summary: projections.summary,
        horizon: projections.horizon,
        model: projections.model,
        calculatedAt: projections.calculatedAt
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching strategic dashboard projections:', error);
    res.status(500).json({
      error: 'Failed to fetch strategic dashboard projections',
      message: error.message
    });
  }
});

/**
 * Feature #167: Revenue by acquisition channel
 * GET /api/dashboard/revenue-by-channel
 * Get revenue breakdown by acquisition channel with attribution data
 * Query params:
 *   - period: '30d', '90d', '180d' (default: '90d')
 */
router.get('/revenue-by-channel', async (req, res) => {
  try {
    const { period = '90d' } = req.query;

    console.log(`Fetching revenue by acquisition channel for period: ${period}`);

    // Calculate date range
    const days = parseInt(period) || 90;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Import MarketingRevenue model
    const MarketingRevenue = (await import('../models/MarketingRevenue.js')).default;

    // Step 1: Attribute users to channels (already done in MarketingRevenue collection via attributionService)
    // Step 2: Fetch revenue by attributed users
    const revenueByChannel = await MarketingRevenue.getRevenueByChannel(startDate, endDate);

    // Step 3: Aggregate by channel with additional metrics
    const totalRevenue = revenueByChannel.reduce((sum, ch) => sum + (ch.totalRevenue || 0), 0);
    const totalTransactions = revenueByChannel.reduce((sum, ch) => sum + (ch.transactionCount || 0), 0);

    // Format channel data for display
    const channelBreakdown = revenueByChannel.map(channel => {
      const revenue = channel.totalRevenue || 0;
      const percentage = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;

      // Calculate ROI (if spend data is available)
      const spend = channel.spend || 0;
      const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : null;
      const roas = spend > 0 ? revenue / spend : null;

      return {
        channel: channel._id || 'unknown',
        channelName: formatChannelName(channel._id),
        totalRevenue: parseFloat(revenue.toFixed(2)),
        revenuePercentage: parseFloat(percentage.toFixed(2)),
        transactionCount: channel.transactionCount || 0,
        newCustomerRevenue: parseFloat((channel.newCustomerRevenue || 0).toFixed(2)),
        newCustomerCount: channel.newCustomerCount || 0,
        avgTransactionValue: channel.transactionCount > 0
          ? parseFloat((revenue / channel.transactionCount).toFixed(2))
          : 0,
        spend: parseFloat(spend.toFixed(2)),
        roi: roi !== null ? parseFloat(roi.toFixed(2)) : null,
        roas: roas !== null ? parseFloat(roas.toFixed(2)) : null
      };
    });

    // Sort by revenue (descending)
    channelBreakdown.sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Step 4: Display in breakdown chart format
    const chartData = channelBreakdown.map(ch => ({
      label: ch.channelName,
      value: ch.totalRevenue,
      percentage: ch.revenuePercentage,
      color: getChannelColor(ch.channel)
    }));

    // Step 5: Show channel ROI
    const roiSummary = {
      bestChannel: channelBreakdown.length > 0 ? {
        channel: channelBreakdown[0].channelName,
        roi: channelBreakdown[0].roi,
        revenue: channelBreakdown[0].totalRevenue
      } : null,
      worstChannel: channelBreakdown.length > 1 ? {
        channel: channelBreakdown[channelBreakdown.length - 1].channelName,
        roi: channelBreakdown[channelBreakdown.length - 1].roi,
        revenue: channelBreakdown[channelBreakdown.length - 1].totalRevenue
      } : null,
      overallROI: calculateOverallROI(channelBreakdown)
    };

    res.json({
      success: true,
      period: period,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        days: days
      },
      summary: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalTransactions: totalTransactions,
        channelCount: channelBreakdown.length
      },
      breakdown: channelBreakdown,
      chartData: chartData,
      roiSummary: roiSummary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching revenue by channel:', error);
    res.status(500).json({
      error: 'Failed to fetch revenue by channel',
      message: error.message
    });
  }
});

/**
 * Feature #168: Break-even analysis
 * GET /api/dashboard/breakeven-analysis
 * Calculate break-even point and payback period for marketing spend
 * Query params:
 *   - period: '30d', '90d', '180d' (default: '90d')
 */
router.get('/breakeven-analysis', async (req, res) => {
  try {
    const { period = '90d' } = req.query;

    console.log(`Fetching break-even analysis for period: ${period}`);

    // Calculate date range
    const days = parseInt(period) || 90;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Import models
    const DailyRevenueAggregate = (await import('../models/DailyRevenueAggregate.js')).default;
    const MarketingRevenue = (await import('../models/MarketingRevenue.js')).default;

    // Step 1: Calculate CAC (Customer Acquisition Cost)
    // CAC = Total Marketing Spend / Number of New Customers
    const totalSpend = await DailyRevenueAggregate.getTotalSpend(startDate, endDate);
    const newCustomers = await MarketingRevenue.getNewCustomerCount(startDate, endDate);
    const cac = newCustomers > 0 ? totalSpend / newCustomers : 0;

    // Step 2: Calculate LTV (Lifetime Value)
    // LTV = (Average Revenue Per User * Gross Margin) / Churn Rate
    // For monthly subscriptions: LTV = ARPU * (1 / churn_rate)
    const ltvData = await DailyRevenueAggregate.getLTV(startDate, endDate);
    const ltv = ltvData.value || 0;

    // Get ARPU (Average Revenue Per User)
    const arpu = await DailyRevenueAggregate.getARPU(startDate, endDate);

    // Get churn rate
    const churnRate = await DailyRevenueAggregate.getChurnRate(startDate, endDate);

    // Step 3: Determine break-even period
    // Break-even period = CAC / (ARPU * Gross Margin)
    // Assuming gross margin of 80% (industry standard for subscription apps)
    const grossMargin = 0.8;
    const monthlyRevenuePerUser = arpu * grossMargin;
    const breakEvenMonths = monthlyRevenuePerUser > 0 ? cac / monthlyRevenuePerUser : 0;

    // Step 5: Show payback period
    // Payback period is the same as break-even period (time to recover CAC)
    const paybackPeriodMonths = breakEvenMonths;
    const paybackPeriodDays = breakEvenMonths * 30;

    // Calculate ROI at different time horizons
    const roi1Month = monthlyRevenuePerUser > 0 ? ((monthlyRevenuePerUser - cac) / cac * 100) : -100;
    const roi3Months = monthlyRevenuePerUser > 0 ? ((monthlyRevenuePerUser * 3 - cac) / cac * 100) : -100;
    const roi6Months = monthlyRevenuePerUser > 0 ? ((monthlyRevenuePerUser * 6 - cac) / cac * 100) : -100;
    const roi12Months = monthlyRevenuePerUser > 0 ? ((monthlyRevenuePerUser * 12 - cac) / cac * 100) : -100;

    // Calculate LTV:CAC ratio (industry standard is 3:1 or better)
    const ltvCacRatio = cac > 0 ? ltv / cac : 0;

    res.json({
      success: true,
      period: period,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        days: days
      },
      cac: {
        value: parseFloat(cac.toFixed(2)),
        currency: 'USD',
        components: {
          totalSpend: parseFloat(totalSpend.toFixed(2)),
          newCustomers: newCustomers
        }
      },
      ltv: {
        value: parseFloat(ltv.toFixed(2)),
        currency: 'USD',
        arpu: parseFloat(arpu.toFixed(2)),
        churnRate: parseFloat((churnRate * 100).toFixed(2)) // as percentage
      },
      breakEven: {
        periodMonths: parseFloat(breakEvenMonths.toFixed(1)),
        periodDays: Math.round(paybackPeriodDays),
        monthlyRevenuePerUser: parseFloat(monthlyRevenuePerUser.toFixed(2)),
        grossMargin: grossMargin * 100 // as percentage
      },
      payback: {
        periodMonths: parseFloat(paybackPeriodMonths.toFixed(1)),
        periodDays: Math.round(paybackPeriodDays),
        description: paybackPeriodMonths <= 6 ? 'Healthy' : paybackPeriodMonths <= 12 ? 'Acceptable' : 'Needs Improvement'
      },
      ltvCacRatio: {
        value: parseFloat(ltvCacRatio.toFixed(2)),
        target: 3.0,
        status: ltvCacRatio >= 3 ? 'Excellent' : ltvCacRatio >= 2 ? 'Good' : ltvCacRatio >= 1 ? 'Fair' : 'Poor'
      },
      roiProjections: {
        '1month': parseFloat(roi1Month.toFixed(2)),
        '3months': parseFloat(roi3Months.toFixed(2)),
        '6months': parseFloat(roi6Months.toFixed(2)),
        '12months': parseFloat(roi12Months.toFixed(2))
      },
      summary: {
        cac: parseFloat(cac.toFixed(2)),
        ltv: parseFloat(ltv.toFixed(2)),
        ltvCacRatio: parseFloat(ltvCacRatio.toFixed(2)),
        paybackPeriod: parseFloat(paybackPeriodMonths.toFixed(1)),
        status: ltvCacRatio >= 3 && paybackPeriodMonths <= 6 ? 'Excellent' : ltvCacRatio >= 2 && paybackPeriodMonths <= 12 ? 'Good' : 'Needs Improvement'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error calculating break-even analysis:', error);
    res.status(500).json({
      error: 'Failed to calculate break-even analysis',
      message: error.message
    });
  }
});

/**
 * Helper function to format channel names
 */
function formatChannelName(channelId) {
  const names = {
    'organic': 'Organic Traffic',
    'apple_search_ads': 'Apple Search Ads',
    'tiktok_ads': 'TikTok Ads',
    'instagram_ads': 'Instagram Ads',
    'google_ads': 'Google Ads',
    'facebook_ads': 'Facebook Ads',
    'referral': 'Referral',
    'social_organic': 'Social Organic'
  };
  return names[channelId] || channelId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Helper function to get channel colors
 */
function getChannelColor(channelId) {
  const colors = {
    'organic': '#00d4ff',
    'apple_search_ads': '#0066cc',
    'tiktok_ads': '#ff0050',
    'instagram_ads': '#7b2cbf',
    'google_ads': '#4285f4',
    'facebook_ads': '#1877f2',
    'referral': '#ffb020',
    'social_organic': '#ff6b6b'
  };
  return colors[channelId] || '#999999';
}

/**
 * Helper function to calculate overall ROI
 */
function calculateOverallROI(channels) {
  const totalRevenue = channels.reduce((sum, ch) => sum + ch.totalRevenue, 0);
  const totalSpend = channels.reduce((sum, ch) => sum + ch.spend, 0);

  if (totalSpend === 0) return null;
  return parseFloat(((totalRevenue - totalSpend) / totalSpend * 100).toFixed(2));
}

/**
 * Helper function to aggregate daily projections to monthly
 */
function aggregateDailyToMonthly(dailyData, numMonths) {
  const monthly = [];
  const daysPerMonth = 30;

  for (let month = 0; month < numMonths; month++) {
    const startIndex = month * daysPerMonth;
    const endIndex = Math.min(startIndex + daysPerMonth, dailyData.length);

    if (startIndex >= dailyData.length) break;

    const monthDays = dailyData.slice(startIndex, endIndex);
    const totalRevenue = monthDays.reduce((sum, d) => sum + d.value, 0);
    const avgRevenue = totalRevenue / monthDays.length;

    // Calculate optimistic and pessimistic bounds
    const optimisticTotal = totalRevenue * 1.15; // +15% for optimistic
    const pessimisticTotal = totalRevenue * 0.85; // -15% for pessimistic

    // Get projected month name
    const projectedDate = new Date();
    projectedDate.setMonth(projectedDate.getMonth() + month + 1);

    monthly.push({
      month: projectedDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
      monthNumber: projectedDate.getMonth() + 1,
      year: projectedDate.getFullYear(),
      projectedRevenue: avgRevenue * daysPerMonth, // Monthly revenue
      optimisticRevenue: optimisticTotal,
      pessimisticRevenue: pessimisticTotal,
      lowerBound: pessimisticTotal,
      upperBound: optimisticTotal,
      dailyAverage: avgRevenue
    });
  }

  return monthly;
}

/**
 * Helper function to generate financial projections
 * Used by both endpoints
 */
async function generateFinancialProjections(period, horizon) {
  const PredictiveAnalyticsService = (await import('../services/predictiveAnalyticsService.js')).default;
  const service = new PredictiveAnalyticsService();

  // Analyze historical trends
  const historicalTrend = await service.analyzeHistoricalTrends(period, 'revenue');

  // Generate forecast
  const forecastDays = horizon * 30;
  const forecast = await service.generateForecast(period, forecastDays, 'revenue', 'ensemble');

  // Build projections object
  return {
    horizon: horizon,
    period: period,
    model: 'ensemble',
    calculatedAt: new Date().toISOString(),
    monthlyProjections: aggregateDailyToMonthly(
      forecast.projections.projections.map((p, i) => ({
        date: p.date,
        value: p.value
      })),
      horizon
    ),
    summary: {
      totalProjected: forecast.projections.summary.totalProjected,
      averageMonthly: forecast.projections.summary.totalProjected / horizon,
      finalMonthRevenue: forecast.projections.summary.finalValue,
      growthRate: historicalTrend.statistics.avgDailyGrowthRate * 30,
      trendDirection: historicalTrend.statistics.trendDirection,
      confidence: forecast.confidenceIntervals.confidenceLevel
    },
    scenarios: {
      optimistic: {
        description: 'Best-case scenario (95th percentile)',
        total: forecast.confidenceIntervals.summary.totalUpper,
        monthly: forecast.confidenceIntervals.intervals
          .slice(0, horizon * 30)
          .reduce((acc, val) => acc + val.upperBound, 0) / horizon,
        finalMonth: forecast.confidenceIntervals.intervals[
          Math.min(forecast.confidenceIntervals.intervals.length - 1, horizon * 30 - 1)
        ]?.upperBound || 0
      },
      base: {
        description: 'Base case forecast',
        total: forecast.projections.summary.totalProjected,
        monthly: forecast.projections.summary.totalProjected / horizon,
        finalMonth: forecast.projections.summary.finalValue
      },
      pessimistic: {
        description: 'Worst-case scenario (5th percentile)',
        total: forecast.confidenceIntervals.summary.totalLower,
        monthly: forecast.confidenceIntervals.intervals
          .slice(0, horizon * 30)
          .reduce((acc, val) => acc + val.lowerBound, 0) / horizon,
        finalMonth: forecast.confidenceIntervals.intervals[
          Math.min(forecast.confidenceIntervals.intervals.length - 1, horizon * 30 - 1)
        ]?.lowerBound || 0
      }
    },
    confidenceIntervals: {
      level: forecast.confidenceIntervals.confidenceLevel,
      margin: forecast.confidenceIntervals.summary.avgMargin,
      marginPercent: forecast.confidenceIntervals.summary.marginPercentage
    },
    modelMetrics: {
      type: forecast.forecast.modelMetrics.type,
      components: forecast.forecast.modelMetrics.components || [],
      accuracy: forecast.forecast.modelMetrics.r_squared || forecast.forecast.modelMetrics.mse || null
    }
  };
}

/**
 * GET /api/dashboard/temp-files/status
 * Get temp files status (count, size, old files)
 */
router.get('/temp-files/status', async (req, res) => {
  try {
    const tempFileCleanupJob = await import('../jobs/tempFileCleanup.js');
    const status = await tempFileCleanupJob.default.getTempFilesStatus();

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error fetching temp files status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch temp files status',
      message: error.message
    });
  }
});

/**
 * POST /api/dashboard/temp-files/cleanup
 * Manually trigger temp file cleanup
 */
router.post('/temp-files/cleanup', async (req, res) => {
  try {
    const tempFileCleanupJob = await import('../jobs/tempFileCleanup.js');
    const result = await tempFileCleanupJob.default.trigger();

    res.json({
      success: true,
      message: 'Temp file cleanup completed',
      data: result
    });
  } catch (error) {
    console.error('Error running temp file cleanup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run temp file cleanup',
      message: error.message
    });
  }
});

export default router;
