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

    // TODO: In production, fetch from MongoDB marketing_metrics collection
    // For now, generate mock trend data simulating cumulative user growth
    const data = [];
    let cumulativeUsers = 850; // Starting user count

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      // Simulate user growth with increasing acquisition over time
      // Base growth + acceleration factor + randomness
      const baseGrowth = 15; // Average daily new users
      const acceleration = (i / days) * 20; // Growth accelerates over time
      const randomFactor = (Math.random() - 0.5) * 10; // Random variation
      const newUsers = Math.max(0, Math.round(baseGrowth + acceleration + randomFactor));

      cumulativeUsers += newUsers;

      data.push({
        date: date.toISOString().split('T')[0],
        users: cumulativeUsers,
        newUsers: newUsers
      });
    }

    // Calculate summary metrics
    const current = data[data.length - 1].users;
    const previousIndex = Math.max(0, data.length - 8); // 7 days ago
    const previous = data[previousIndex].users;
    const change = current - previous;
    const changePercent = ((change / previous) * 100).toFixed(1);

    // Calculate average daily new users
    const totalNewUsers = data.reduce((sum, day) => sum + day.newUsers, 0);
    const avgDailyNewUsers = Math.round(totalNewUsers / days);

    const trendData = {
      range: range,
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
      data: data,
      summary: {
        current: current,
        previous: previous,
        change: change,
        changePercent: parseFloat(changePercent),
        avgDailyNewUsers: avgDailyNewUsers,
        trend: change >= 0 ? 'up' : 'down'
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

    // TODO: In production, fetch from MongoDB marketing_metrics collection
    // For now, generate mock trend data simulating CAC optimization over time
    const data = [];
    let cac = 45.00; // Starting CAC in dollars (high initial acquisition cost)
    const targetCac = 15.00; // Target CAC as we optimize

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      // Simulate CAC decreasing over time as marketing improves
      // Early days: higher CAC (poor targeting)
      // Later days: lower CAC (better optimization, word-of-mouth)
      const progress = i / days;
      const optimization = (cac - targetCac) * (1 - Math.pow(progress, 0.5)); // Slower improvement at first
      const randomFactor = (Math.random() - 0.5) * 3; // Random variation
      cac = Math.max(targetCac, cac - optimization * 0.1 + randomFactor);

      // Calculate marketing spend and new users for this day
      const dailySpend = 25 + Math.random() * 50; // $25-75 per day
      const dailyNewUsers = Math.round(dailySpend / cac);

      data.push({
        date: date.toISOString().split('T')[0],
        cac: parseFloat(cac.toFixed(2)),
        marketingSpend: parseFloat(dailySpend.toFixed(2)),
        newUsers: dailyNewUsers
      });
    }

    // Calculate summary metrics
    const current = data[data.length - 1].cac;
    const previousIndex = Math.max(0, data.length - 8); // 7 days ago
    const previous = data[previousIndex].cac;
    const change = current - previous;
    const changePercent = ((change / previous) * 100).toFixed(1);

    // Calculate average CAC over the period
    const avgCac = data.reduce((sum, day) => sum + day.cac, 0) / data.length;

    // Calculate total spend and total users for the period
    const totalSpend = data.reduce((sum, day) => sum + day.marketingSpend, 0);
    const totalNewUsers = data.reduce((sum, day) => sum + day.newUsers, 0);

    const trendData = {
      range: range,
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
      data: data,
      summary: {
        current: parseFloat(current.toFixed(2)),
        previous: parseFloat(previous.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent),
        average: parseFloat(avgCac.toFixed(2)),
        totalSpend: parseFloat(totalSpend.toFixed(2)),
        totalNewUsers: totalNewUsers,
        trend: change <= 0 ? 'down' : 'up' // Down is good for CAC
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

    // TODO: In production, fetch from MongoDB marketing_metrics collection
    // For now, generate mock data showing organic vs paid split
    // Organic: App Store searches, word-of-mouth, social media organic
    // Paid: Apple Search Ads, TikTok ads, Instagram ads

    // Simulate improving organic ratio over time (as brand awareness grows)
    const data = [];
    let organicRatio = 0.35; // Starting with 35% organic, 65% paid

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      // Organic ratio improves over time (from 35% to 55%)
      const progress = i / days;
      organicRatio = 0.35 + (0.20 * progress); // 35% -> 55%

      // Add some random variation
      organicRatio += (Math.random() - 0.5) * 0.05;
      organicRatio = Math.min(0.80, Math.max(0.20, organicRatio)); // Keep between 20-80%

      // Daily new users (growing over time)
      const baseUsers = 20 + (progress * 30); // 20 -> 50 users/day
      const dailyNewUsers = Math.round(baseUsers + (Math.random() - 0.5) * 10);

      const organicUsers = Math.round(dailyNewUsers * organicRatio);
      const paidUsers = dailyNewUsers - organicUsers;

      data.push({
        date: date.toISOString().split('T')[0],
        totalUsers: dailyNewUsers,
        organicUsers: organicUsers,
        paidUsers: paidUsers,
        organicPercent: parseFloat((organicRatio * 100).toFixed(1)),
        paidPercent: parseFloat(((1 - organicRatio) * 100).toFixed(1))
      });
    }

    // Calculate summary metrics
    const totalUsers = data.reduce((sum, day) => sum + day.totalUsers, 0);
    const totalOrganic = data.reduce((sum, day) => sum + day.organicUsers, 0);
    const totalPaid = data.reduce((sum, day) => sum + day.paidUsers, 0);
    const avgOrganicPercent = parseFloat(((totalOrganic / totalUsers) * 100).toFixed(1));
    const avgPaidPercent = parseFloat(((totalPaid / totalUsers) * 100).toFixed(1));

    // Calculate previous period (same range, ending days ago)
    const previousTotalUsers = totalUsers * 0.75; // Previous period had 25% fewer users
    const previousOrganic = avgOrganicPercent - 5; // Previous period had 5% less organic
    const previousPaid = 100 - previousOrganic;

    const splitData = {
      range: range,
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
      data: data,
      summary: {
        totalUsers: totalUsers,
        organicUsers: totalOrganic,
        paidUsers: totalPaid,
        organicPercent: avgOrganicPercent,
        paidPercent: avgPaidPercent,
        previous: {
          organicPercent: parseFloat(previousOrganic.toFixed(1)),
          paidPercent: parseFloat(previousPaid.toFixed(1))
        },
        trend: avgOrganicPercent > previousOrganic ? 'up' : 'down' // Up is good for organic
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

    // TODO: In production, fetch from MongoDB marketing_posts collection
    // For now, generate mock data for recent posts with real-time metrics
    const posts = [];
    const platforms = ['tiktok', 'instagram', 'youtube_shorts'];
    const statuses = ['posted', 'posted', 'posted', 'posted', 'posted']; // All posted for performance

    for (let i = 0; i < limit; i++) {
      const platform = platforms[Math.floor(Math.random() * platforms.length)];
      const hoursAgo = i * 2 + Math.floor(Math.random() * 3); // 0-20 hours ago

      // Simulate engagement metrics
      const views = Math.floor(Math.random() * 50000) + 1000; // 1K - 50K views
      const likes = Math.floor(views * (0.05 + Math.random() * 0.1)); // 5-15% like rate
      const comments = Math.floor(likes * (0.01 + Math.random() * 0.03)); // 1-4% comment rate
      const shares = Math.floor(likes * (0.02 + Math.random() * 0.05)); // 2-7% share rate

      // Calculate engagement rate
      const engagementRate = ((likes + comments + shares) / views * 100).toFixed(2);

      posts.push({
        id: `post_${Date.now()}_${i}`,
        title: `Spicy Romance Story Excerpt #${1000 + i}`,
        platform: platform,
        status: statuses[i % statuses.length],
        thumbnail: `/thumbnails/post_${i}.jpg`,
        postedAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
        performanceMetrics: {
          views: views,
          likes: likes,
          comments: comments,
          shares: shares,
          engagementRate: parseFloat(engagementRate)
        }
      });
    }

    // Calculate aggregate stats
    const totalViews = posts.reduce((sum, post) => sum + post.performanceMetrics.views, 0);
    const totalLikes = posts.reduce((sum, post) => sum + post.performanceMetrics.likes, 0);
    const totalComments = posts.reduce((sum, post) => sum + post.performanceMetrics.comments, 0);
    const totalShares = posts.reduce((sum, post) => sum + post.performanceMetrics.shares, 0);
    const avgEngagementRate = (posts.reduce((sum, post) => sum + post.performanceMetrics.engagementRate, 0) / posts.length).toFixed(2);

    const performanceData = {
      posts: posts,
      summary: {
        totalPosts: posts.length,
        totalViews: totalViews,
        totalLikes: totalLikes,
        totalComments: totalComments,
        totalShares: totalShares,
        avgEngagementRate: parseFloat(avgEngagementRate),
        topPerformingPost: posts.reduce((best, post) =>
          post.performanceMetrics.engagementRate > best.performanceMetrics.engagementRate ? post : best
        )
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

    // Generate mock data - revenue and spend over time
    const data = [];
    const totalRevenue = 0;
    const totalSpend = 0;

    // Starting values
    let dailyRevenue = 15; // ~$450/month initially
    let dailySpend = 45; // High initial spend
    let cumulativeRevenue = 4000; // Starting MRR base
    let cumulativeSpend = 0;

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);

      // Simulate revenue growth with momentum
      const revenueGrowth = 0.5 + (Math.random() * 1.5); // $0.50-$2.00 growth per day
      dailyRevenue += revenueGrowth;

      // Simulate spend optimization (decreasing then stabilizing)
      if (i < days * 0.3) {
        // Initial optimization phase
        dailySpend -= 0.3 + (Math.random() * 0.5);
      } else {
        // Stabilization with slight variations
        dailySpend += (Math.random() - 0.5) * 2;
      }

      // Ensure minimum spend
      dailySpend = Math.max(dailySpend, 15);

      // Add daily variation
      const revenueVariation = (Math.random() - 0.5) * 3;
      const spendVariation = (Math.random() - 0.5) * 5;

      dailyRevenue = Math.max(dailyRevenue + revenueVariation, 10);
      dailySpend = Math.max(dailySpend + spendVariation, 10);

      // Calculate monthly values (multiply by ~30)
      const monthlyRevenue = Math.round(dailyRevenue * 30);
      const monthlySpend = Math.round(dailySpend * 30);

      cumulativeSpend += dailySpend;

      data.push({
        date: date.toISOString().split('T')[0], // YYYY-MM-DD
        revenue: Math.round(monthlyRevenue),
        spend: Math.round(monthlySpend),
        profit: Math.round(monthlyRevenue - monthlySpend),
        cumulativeRevenue: Math.round(cumulativeRevenue + (dailyRevenue * 30 * i / days)),
        cumulativeSpend: Math.round(cumulativeSpend)
      });
    }

    // Calculate summary
    const latest = data[data.length - 1];
    const previous = data[Math.floor(data.length / 2)];
    const revenueChange = ((latest.revenue - previous.revenue) / previous.revenue * 100).toFixed(1);
    const spendChange = ((latest.spend - previous.spend) / previous.spend * 100).toFixed(1);
    const profitMargin = ((latest.profit / latest.revenue) * 100).toFixed(1);

    const totalRevenueSum = data.reduce((sum, d) => sum + d.revenue, 0);
    const totalSpendSum = data.reduce((sum, d) => sum + d.spend, 0);
    const avgProfitMargin = ((totalRevenueSum - totalSpendSum) / totalRevenueSum * 100).toFixed(1);

    res.json({
      range: range,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      data: data,
      summary: {
        current: {
          revenue: latest.revenue,
          spend: latest.spend,
          profit: latest.profit,
          profitMargin: parseFloat(profitMargin)
        },
        previous: {
          revenue: previous.revenue,
          spend: previous.spend,
          profit: previous.profit
        },
        change: {
          revenue: parseFloat(revenueChange),
          spend: parseFloat(spendChange)
        },
        averages: {
          revenue: Math.round(totalRevenueSum / data.length),
          spend: Math.round(totalSpendSum / data.length),
          profitMargin: parseFloat(avgProfitMargin)
        },
        totalProfit: totalRevenueSum - totalSpendSum
      }
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

    // TODO: In production, fetch from MongoDB marketing_metrics collection
    // For now, generate mock ROI data by channel
    // Channels: Apple Search Ads, TikTok Ads, Instagram Ads, Organic (App Store), Social (Organic)

    const channels = [
      {
        id: 'apple_search_ads',
        name: 'Apple Search Ads',
        category: 'paid',
        icon: '🍎',
        color: '#00d26a'
      },
      {
        id: 'tiktok_ads',
        name: 'TikTok Ads',
        category: 'paid',
        icon: '🎵',
        color: '#e94560'
      },
      {
        id: 'instagram_ads',
        name: 'Instagram Ads',
        category: 'paid',
        icon: '📸',
        color: '#7b2cbf'
      },
      {
        id: 'organic_app_store',
        name: 'Organic (App Store)',
        category: 'organic',
        icon: '🔍',
        color: '#00d4ff'
      },
      {
        id: 'social_organic',
        name: 'Social Organic',
        category: 'organic',
        icon: '💬',
        color: '#ffb020'
      }
    ];

    const channelData = channels.map(channel => {
      // Generate realistic ROI data based on channel type
      let revenue, spend, users, avgCAC;

      if (channel.category === 'paid') {
        // Paid channels: higher spend, variable ROI
        if (channel.id === 'apple_search_ads') {
          // Apple Search Ads: Best ROI (high intent)
          spend = 800 + Math.random() * 200;
          users = Math.round(spend / 25); // CAC ~$25
          revenue = users * 15; // $15/user/month
        } else if (channel.id === 'tiktok_ads') {
          // TikTok Ads: Good ROI but improving
          spend = 500 + Math.random() * 300;
          users = Math.round(spend / 35); // CAC ~$35
          revenue = users * 12; // $12/user/month (lower retention)
        } else {
          // Instagram Ads: Moderate ROI
          spend = 400 + Math.random() * 200;
          users = Math.round(spend / 40); // CAC ~$40
          revenue = users * 11; // $11/user/month
        }
      } else {
        // Organic channels: zero spend, infinite ROI
        spend = 0;
        users = Math.round(50 + Math.random() * 150); // Organic users
        revenue = users * 14; // $14/user/month
      }

      const profit = revenue - spend;
      const roi = spend > 0 ? ((profit / spend) * 100) : 'Infinity';
      const roas = spend > 0 ? (revenue / spend) : 'Infinity'; // Return on Ad Spend

      return {
        id: channel.id,
        name: channel.name,
        category: channel.category,
        icon: channel.icon,
        color: channel.color,
        metrics: {
          spend: parseFloat(spend.toFixed(2)),
          revenue: parseFloat(revenue.toFixed(2)),
          profit: parseFloat(profit.toFixed(2)),
          users: users,
          roi: roi === 'Infinity' ? 'Infinity' : parseFloat(roi.toFixed(1)),
          roas: roas === 'Infinity' ? 'Infinity' : parseFloat(roas.toFixed(2)),
          cac: parseFloat((spend / users).toFixed(2)) || 0,
          ltv: parseFloat((revenue / users).toFixed(2)) || 0 // Lifetime Value (monthly)
        }
      };
    });

    // Calculate summary stats
    const totalSpend = channelData.reduce((sum, ch) => sum + ch.metrics.spend, 0);
    const totalRevenue = channelData.reduce((sum, ch) => sum + ch.metrics.revenue, 0);
    const totalProfit = channelData.reduce((sum, ch) => sum + ch.metrics.profit, 0);
    const totalUsers = channelData.reduce((sum, ch) => sum + ch.metrics.users, 0);
    const overallROI = totalSpend > 0 ? ((totalProfit / totalSpend) * 100).toFixed(1) : 'N/A';
    const overallROAS = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : 'N/A';
    const avgCAC = totalUsers > 0 ? (totalSpend / totalUsers).toFixed(2) : 'N/A';

    // Sort by ROI (descending) - 'Infinity' should come first
    channelData.sort((a, b) => {
      const aRoi = a.metrics.roi === 'Infinity' ? Number.MAX_VALUE : a.metrics.roi;
      const bRoi = b.metrics.roi === 'Infinity' ? Number.MAX_VALUE : b.metrics.roi;
      return bRoi - aRoi;
    });

    const roiData = {
      range: range,
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
      channels: channelData,
      summary: {
        totalSpend: parseFloat(totalSpend.toFixed(2)),
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalProfit: parseFloat(totalProfit.toFixed(2)),
        totalUsers: totalUsers,
        overallROI: overallROI === 'N/A' ? null : parseFloat(overallROI),
        overallROAS: overallROAS === 'N/A' ? null : parseFloat(overallROAS),
        avgCAC: avgCAC === 'N/A' ? null : parseFloat(avgCAC),
        bestChannel: channelData[0].name,
        worstChannel: channelData[channelData.length - 1].name
      }
    };

    console.log(`ROI by channel data fetched successfully for range: ${range}`);
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
