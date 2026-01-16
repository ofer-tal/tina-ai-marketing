import express from 'express';

const router = express.Router();

/**
 * Channel definitions with metadata
 */
const CHANNELS = [
  {
    id: 'organic',
    name: 'Organic (App Store)',
    category: 'organic',
    icon: '🔍',
    color: '#00d4ff',
    description: 'Organic App Store searches and browsing'
  },
  {
    id: 'apple_search_ads',
    name: 'Apple Search Ads',
    category: 'paid',
    icon: '🍎',
    color: '#00d26a',
    description: 'Paid search advertising on App Store'
  },
  {
    id: 'tiktok_ads',
    name: 'TikTok Ads',
    category: 'paid',
    icon: '🎵',
    color: '#e94560',
    description: 'Paid advertising on TikTok platform'
  },
  {
    id: 'instagram_ads',
    name: 'Instagram Ads',
    category: 'paid',
    icon: '📸',
    color: '#7b2cbf',
    description: 'Paid advertising on Instagram platform'
  },
  {
    id: 'social_organic',
    name: 'Social Organic',
    category: 'organic',
    icon: '💬',
    color: '#ffb020',
    description: 'Organic social media traffic (TikTok, Instagram, etc.)'
  },
  {
    id: 'referral',
    name: 'Referral',
    category: 'organic',
    icon: '🔗',
    color: '#6366f1',
    description: 'Referral traffic from websites and partners'
  },
  {
    id: 'direct',
    name: 'Direct',
    category: 'organic',
    icon: '🎯',
    color: '#10b981',
    description: 'Direct traffic (users typing URL or bookmarks)'
  }
];

/**
 * GET /api/channel-performance/compare
 * Compare performance across all marketing channels
 * Query params:
 *   - range: '30d', '90d', '180d' (default: '30d')
 *   - metrics: 'all', 'roi', 'cac', 'revenue', 'users' (default: 'all')
 */
router.get('/compare', async (req, res) => {
  try {
    const { range = '30d', metrics = 'all' } = req.query;

    // Validate range parameter
    const validRanges = ['30d', '90d', '180d'];
    if (!validRanges.includes(range)) {
      return res.status(400).json({
        error: 'Invalid range. Must be one of: ' + validRanges.join(', ')
      });
    }

    console.log(`Fetching channel performance comparison for range: ${range}, metrics: ${metrics}`);

    // Calculate date range
    const days = parseInt(range.replace('d', ''));
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    // Import models
    const MarketingRevenue = (await import('../models/MarketingRevenue.js')).default;
    const DailyRevenueAggregate = (await import('../models/DailyRevenueAggregate.js')).default;
    const AdGroup = (await import('../models/AdGroup.js')).default;
    const DailySpend = (await import('../models/DailySpend.js')).default;

    // Fetch revenue data by channel
    const revenueData = await MarketingRevenue.aggregate([
      {
        $match: {
          transactionDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$attributedTo.channel',
          totalRevenue: { $sum: '$revenue.netAmount' },
          totalGrossRevenue: { $sum: '$revenue.grossAmount' },
          transactionCount: { $sum: 1 },
          newCustomers: {
            $sum: { $cond: ['$customer.new', 1, 0] }
          }
        }
      }
    ]);

    // Fetch spend data by channel (from AdGroups for paid channels)
    const spendData = await AdGroup.aggregate([
      {
        $match: {
          updatedAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$campaignId', // Group by campaign (channel implied)
          totalSpend: { $sum: '$spend' },
          impressions: { $sum: '$impressions' },
          clicks: { $sum: '$clicks' },
          conversions: { $sum: '$conversions' },
          installs: { $sum: '$installs' }
        }
      }
    ]);

    // Also fetch from DailySpend if available
    const dailySpendData = await DailySpend.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$channel',
          totalSpend: { $sum: '$spend' },
          impressions: { $sum: '$impressions' },
          clicks: { $sum: '$clicks' }
        }
      }
    ]);

    // Combine spend data
    const spendByChannel = {};
    spendData.forEach(item => {
      spendByChannel[item._id] = item;
    });
    dailySpendData.forEach(item => {
      if (!spendByChannel[item._id]) {
        spendByChannel[item._id] = item;
      } else {
        spendByChannel[item._id].totalSpend += item.totalSpend;
        spendByChannel[item._id].impressions += item.impressions;
        spendByChannel[item._id].clicks += item.clicks;
      }
    });

    // Build channel performance data
    const channelPerformance = CHANNELS.map(channel => {
      const revenue = revenueData.find(r => r._id === channel.id) || {
        totalRevenue: 0,
        totalGrossRevenue: 0,
        transactionCount: 0,
        newCustomers: 0
      };

      const spend = spendByChannel[channel.id] || {
        totalSpend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        installs: 0
      };

      // Calculate metrics
      const revenueValue = revenue.totalRevenue || 0;
      const spendValue = spend.totalSpend || 0;
      const profit = revenueValue - spendValue;
      const users = revenue.newCustomers || 0;

      // ROI (Return on Investment)
      const roi = spendValue > 0 ? (profit / spendValue) * 100 : (revenueValue > 0 ? Infinity : 0);

      // ROAS (Return on Ad Spend)
      const roas = spendValue > 0 ? revenueValue / spendValue : (revenueValue > 0 ? Infinity : 0);

      // CAC (Customer Acquisition Cost)
      const cac = users > 0 ? spendValue / users : 0;

      // LTV (Lifetime Value) - using monthly revenue per user
      const ltv = users > 0 ? revenueValue / users : 0;

      // Conversion rate (conversions/impressions)
      const conversionRate = spend.impressions > 0 ? (spend.conversions / spend.impressions) * 100 : 0;

      // Click-through rate
      const ctr = spend.impressions > 0 ? (spend.clicks / spend.impressions) * 100 : 0;

      // Cost per click
      const cpc = spend.clicks > 0 ? spendValue / spend.clicks : 0;

      // Cost per impression (CPM)
      const cpm = spend.impressions > 0 ? (spendValue / spend.impressions) * 1000 : 0;

      return {
        ...channel,
        metrics: {
          revenue: parseFloat(revenueValue.toFixed(2)),
          grossRevenue: parseFloat(revenue.totalGrossRevenue.toFixed(2)),
          spend: parseFloat(spendValue.toFixed(2)),
          profit: parseFloat(profit.toFixed(2)),
          users: users,
          transactions: revenue.transactionCount || 0,

          // Performance metrics
          roi: roi === Infinity ? 'Infinity' : parseFloat(roi.toFixed(1)),
          roas: roas === Infinity ? 'Infinity' : parseFloat(roas.toFixed(2)),
          cac: parseFloat(cac.toFixed(2)),
          ltv: parseFloat(ltv.toFixed(2)),
          ltv_cac_ratio: cac > 0 ? parseFloat((ltv / cac).toFixed(2)) : 0,

          // Advertising metrics
          impressions: spend.impressions || 0,
          clicks: spend.clicks || 0,
          conversions: spend.conversions || 0,
          installs: spend.installs || 0,
          conversionRate: parseFloat(conversionRate.toFixed(2)),
          ctr: parseFloat(ctr.toFixed(2)),
          cpc: parseFloat(cpc.toFixed(2)),
          cpm: parseFloat(cpm.toFixed(2)),

          // Efficiency scores (0-100)
          efficiencyScore: calculateEfficiencyScore(roi, cac, conversionRate, channel.category)
        }
      };
    });

    // Sort by efficiency score (descending)
    channelPerformance.sort((a, b) => b.metrics.efficiencyScore - a.metrics.efficiencyScore);

    // Calculate summary statistics
    const totalRevenue = channelPerformance.reduce((sum, ch) => sum + ch.metrics.revenue, 0);
    const totalSpend = channelPerformance.reduce((sum, ch) => sum + ch.metrics.spend, 0);
    const totalUsers = channelPerformance.reduce((sum, ch) => sum + ch.metrics.users, 0);
    const totalProfit = channelPerformance.reduce((sum, ch) => sum + ch.metrics.profit, 0);

    const overallROI = totalSpend > 0 ? (totalProfit / totalSpend) * 100 : 0;
    const avgCAC = totalUsers > 0 ? totalSpend / totalUsers : 0;

    // Identify best and worst performers
    const bestROI = [...channelPerformance].sort((a, b) => {
      const aRoi = a.metrics.roi === 'Infinity' ? Number.MAX_VALUE : a.metrics.roi;
      const bRoi = b.metrics.roi === 'Infinity' ? Number.MAX_VALUE : b.metrics.roi;
      return bRoi - aRoi;
    })[0];

    const worstROI = [...channelPerformance].sort((a, b) => {
      const aRoi = a.metrics.roi === 'Infinity' ? Number.MAX_VALUE : a.metrics.roi;
      const bRoi = b.metrics.roi === 'Infinity' ? Number.MAX_VALUE : b.metrics.roi;
      return aRoi - bRoi;
    })[0];

    const bestCAC = [...channelPerformance].filter(ch => ch.metrics.users > 0).sort((a, b) => a.metrics.cac - b.metrics.cac)[0];

    const bestRevenue = [...channelPerformance].sort((a, b) => b.metrics.revenue - a.metrics.revenue)[0];

    const mostEfficient = channelPerformance[0]; // Already sorted by efficiency
    const leastEfficient = channelPerformance[channelPerformance.length - 1];

    // Generate comparison report
    const report = generateComparisonReport(channelPerformance, range);

    // Calculate trends (compare with previous period)
    const previousStartDate = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000);
    const previousEndDate = new Date(startDate);

    const previousRevenueData = await MarketingRevenue.aggregate([
      {
        $match: {
          transactionDate: { $gte: previousStartDate, $lt: previousEndDate }
        }
      },
      {
        $group: {
          _id: '$attributedTo.channel',
          totalRevenue: { $sum: '$revenue.netAmount' },
          newCustomers: { $sum: { $cond: ['$customer.new', 1, 0] } }
        }
      }
    ]);

    // Add trends to channel data
    channelPerformance.forEach(channel => {
      const previous = previousRevenueData.find(r => r._id === channel.id);
      if (previous && previous.totalRevenue > 0) {
        const revenueChange = ((channel.metrics.revenue - previous.totalRevenue) / previous.totalRevenue) * 100;
        channel.metrics.revenueTrend = parseFloat(revenueChange.toFixed(1));
        channel.metrics.revenueTrendDirection = revenueChange >= 0 ? 'up' : 'down';
      } else {
        channel.metrics.revenueTrend = null;
        channel.metrics.revenueTrendDirection = 'neutral';
      }
    });

    const response = {
      range: range,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      days: days,
      channels: channelPerformance,

      // Summary statistics
      summary: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalSpend: parseFloat(totalSpend.toFixed(2)),
        totalProfit: parseFloat(totalProfit.toFixed(2)),
        totalUsers: totalUsers,
        overallROI: parseFloat(overallROI.toFixed(1)),
        avgCAC: parseFloat(avgCAC.toFixed(2)),
        totalChannels: channelPerformance.length,
        activeChannels: channelPerformance.filter(ch => ch.metrics.revenue > 0 || ch.metrics.spend > 0).length
      },

      // Best and worst performers
      rankings: {
        bestROI: {
          channel: bestROI.name,
          value: bestROI.metrics.roi,
          icon: bestROI.icon
        },
        worstROI: {
          channel: worstROI.name,
          value: worstROI.metrics.roi,
          icon: worstROI.icon
        },
        bestCAC: bestCAC ? {
          channel: bestCAC.name,
          value: bestCAC.metrics.cac,
          icon: bestCAC.icon
        } : null,
        bestRevenue: {
          channel: bestRevenue.name,
          value: bestRevenue.metrics.revenue,
          icon: bestRevenue.icon
        },
        mostEfficient: {
          channel: mostEfficient.name,
          score: mostEfficient.metrics.efficiencyScore,
          icon: mostEfficient.icon
        },
        leastEfficient: {
          channel: leastEfficient.name,
          score: leastEfficient.metrics.efficiencyScore,
          icon: leastEfficient.icon
        }
      },

      // Detailed comparison report
      report: report,

      // Recommendations
      recommendations: generateRecommendations(channelPerformance),

      lastUpdated: new Date().toISOString()
    };

    console.log(`Channel performance comparison fetched successfully for ${channelPerformance.length} channels`);
    res.json(response);

  } catch (error) {
    console.error('Error fetching channel performance comparison:', error);
    res.status(500).json({
      error: 'Failed to fetch channel performance comparison',
      message: error.message
    });
  }
});

/**
 * GET /api/channel-performance/:channelId
 * Get detailed performance for a specific channel
 * Query params:
 *   - range: '30d', '90d', '180d' (default: '30d')
 */
router.get('/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { range = '30d' } = req.query;

    // Validate channel
    const channel = CHANNELS.find(ch => ch.id === channelId);
    if (!channel) {
      return res.status(404).json({
        error: 'Channel not found',
        message: `Channel "${channelId}" does not exist`
      });
    }

    // Validate range
    const validRanges = ['30d', '90d', '180d'];
    if (!validRanges.includes(range)) {
      return res.status(400).json({
        error: 'Invalid range. Must be one of: ' + validRanges.join(', ')
      });
    }

    console.log(`Fetching detailed performance for channel: ${channelId}, range: ${range}`);

    // Calculate date range
    const days = parseInt(range.replace('d', ''));
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    // Import models
    const MarketingRevenue = (await import('../models/MarketingRevenue.js')).default;
    const AdGroup = (await import('../models/AdGroup.js')).default;

    // Fetch daily revenue data for trend
    const dailyRevenue = await MarketingRevenue.aggregate([
      {
        $match: {
          'attributedTo.channel': channelId,
          transactionDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$transactionDate' }
          },
          revenue: { $sum: '$revenue.netAmount' },
          transactions: { $sum: 1 },
          newCustomers: { $sum: { $cond: ['$customer.new', 1, 0] } }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Fetch top campaigns/keywords for this channel
    const topCampaigns = await MarketingRevenue.aggregate([
      {
        $match: {
          'attributedTo.channel': channelId,
          transactionDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            campaignId: '$attributedTo.campaignId',
            campaignName: '$attributedTo.campaignName'
          },
          revenue: { $sum: '$revenue.netAmount' },
          transactions: { $sum: 1 },
          users: { $sum: { $cond: ['$customer.new', 1, 0] } }
        }
      },
      {
        $sort: { revenue: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json({
      channel: channel,
      range: range,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      dailyData: dailyRevenue.map(d => ({
        date: d._id,
        revenue: d.revenue,
        transactions: d.transactions,
        newCustomers: d.newCustomers
      })),
      topCampaigns: topCampaigns.map(c => ({
        campaignId: c._id.campaignId,
        campaignName: c._id.campaignName || 'Unknown',
        revenue: c.revenue,
        transactions: c.transactions,
        users: c.users
      }))
    });

  } catch (error) {
    console.error('Error fetching channel details:', error);
    res.status(500).json({
      error: 'Failed to fetch channel details',
      message: error.message
    });
  }
});

/**
 * Calculate efficiency score (0-100)
 * Based on ROI, CAC, and conversion rate
 */
function calculateEfficiencyScore(roi, cac, conversionRate, category) {
  let score = 0;

  // ROI score (40 points max)
  if (roi === 'Infinity') {
    score += 40; // Organic channels get max ROI score
  } else if (roi >= 100) {
    score += 40;
  } else if (roi >= 50) {
    score += 30;
  } else if (roi >= 20) {
    score += 20;
  } else if (roi >= 0) {
    score += 10;
  }

  // CAC score (30 points max) - lower is better
  if (category === 'organic') {
    score += 30; // Organic channels get max CAC score
  } else if (cac <= 10) {
    score += 30;
  } else if (cac <= 20) {
    score += 25;
  } else if (cac <= 30) {
    score += 20;
  } else if (cac <= 50) {
    score += 15;
  } else if (cac <= 75) {
    score += 10;
  } else {
    score += 5;
  }

  // Conversion rate score (30 points max)
  if (conversionRate >= 5) {
    score += 30;
  } else if (conversionRate >= 3) {
    score += 25;
  } else if (conversionRate >= 2) {
    score += 20;
  } else if (conversionRate >= 1) {
    score += 15;
  } else if (conversionRate >= 0.5) {
    score += 10;
  } else if (conversionRate > 0) {
    score += 5;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Generate comparison report
 */
function generateComparisonReport(channels, range) {
  const paidChannels = channels.filter(ch => ch.category === 'paid' && ch.metrics.spend > 0);
  const organicChannels = channels.filter(ch => ch.category === 'organic');

  const paidSpend = paidChannels.reduce((sum, ch) => sum + ch.metrics.spend, 0);
  const paidRevenue = paidChannels.reduce((sum, ch) => sum + ch.metrics.revenue, 0);
  const organicRevenue = organicChannels.reduce((sum, ch) => sum + ch.metrics.revenue, 0);

  const totalRevenue = paidRevenue + organicRevenue;
  const organicPercentage = totalRevenue > 0 ? (organicRevenue / totalRevenue) * 100 : 0;

  return {
    overview: {
      totalChannels: channels.length,
      paidChannels: paidChannels.length,
      organicChannels: organicChannels.length,
      activeChannels: channels.filter(ch => ch.metrics.revenue > 0 || ch.metrics.spend > 0).length
    },
    paidPerformance: {
      totalSpend: parseFloat(paidSpend.toFixed(2)),
      totalRevenue: parseFloat(paidRevenue.toFixed(2)),
      roi: paidSpend > 0 ? parseFloat(((paidRevenue - paidSpend) / paidSpend * 100).toFixed(1)) : 0,
      topPaidChannel: paidChannels.sort((a, b) => b.metrics.roi - a.metrics.roi)[0]?.name || 'N/A'
    },
    organicPerformance: {
      totalRevenue: parseFloat(organicRevenue.toFixed(2)),
      percentageOfTotal: parseFloat(organicPercentage.toFixed(1)),
      topOrganicChannel: organicChannels.sort((a, b) => b.metrics.revenue - a.metrics.revenue)[0]?.name || 'N/A'
    },
    insights: generateInsights(channels, range)
  };
}

/**
 * Generate insights from channel data
 */
function generateInsights(channels, range) {
  const insights = [];

  // Find highest ROI channel
  const sortedByROI = [...channels].sort((a, b) => {
    const aRoi = a.metrics.roi === 'Infinity' ? Number.MAX_VALUE : a.metrics.roi;
    const bRoi = b.metrics.roi === 'Infinity' ? Number.MAX_VALUE : b.metrics.roi;
    return bRoi - aRoi;
  });
  const bestROI = sortedByROI[0];

  if (bestROI && bestROI.metrics.roi !== 'Infinity' && bestROI.metrics.roi > 50) {
    insights.push({
      type: 'positive',
      title: `${bestROI.name} Leading Performance`,
      message: `${bestROI.name} is generating ${bestROI.metrics.roi}% ROI, significantly outperforming other channels.`,
      recommendation: `Consider increasing budget allocation to ${bestROI.name} to maximize returns.`
    });
  }

  // Find lowest ROI paid channel
  const paidChannels = channels.filter(ch => ch.category === 'paid' && ch.metrics.spend > 0);
  if (paidChannels.length > 0) {
    const worstPaid = paidChannels.sort((a, b) => a.metrics.roi - b.metrics.roi)[0];
    if (worstPaid.metrics.roi < 20) {
      insights.push({
        type: 'warning',
        title: `${worstPaid.name} Underperforming`,
        message: `${worstPaid.name} has low ROI (${worstPaid.metrics.roi}%) compared to other paid channels.`,
        recommendation: `Review targeting, creatives, and bidding strategy for ${worstPaid.name}. Consider pausing if performance doesn't improve.`
      });
    }
  }

  // Check organic vs paid split
  const organicRevenue = channels.filter(ch => ch.category === 'organic').reduce((sum, ch) => sum + ch.metrics.revenue, 0);
  const paidRevenue = channels.filter(ch => ch.category === 'paid').reduce((sum, ch) => sum + ch.metrics.revenue, 0);
  const totalRevenue = organicRevenue + paidRevenue;
  const organicPercent = totalRevenue > 0 ? (organicRevenue / totalRevenue) * 100 : 0;

  if (organicPercent < 30) {
    insights.push({
      type: 'info',
      title: 'Low Organic Contribution',
      message: `Organic channels account for only ${organicPercent.toFixed(1)}% of revenue.`,
      recommendation: 'Focus on ASO optimization and organic social media to reduce reliance on paid acquisition.'
    });
  } else if (organicPercent > 70) {
    insights.push({
      type: 'positive',
      title: 'Strong Organic Presence',
      message: `Organic channels account for ${organicPercent.toFixed(1)}% of revenue.`,
      recommendation: 'Strong brand awareness! Consider moderate paid spend to accelerate growth while maintaining healthy margins.'
    });
  }

  return insights;
}

/**
 * Generate actionable recommendations
 */
function generateRecommendations(channels) {
  const recommendations = [];

  // Budget allocation recommendations
  const paidChannels = channels.filter(ch => ch.category === 'paid' && ch.metrics.spend > 0);
  if (paidChannels.length > 0) {
    const avgROI = paidChannels.reduce((sum, ch) => sum + (ch.metrics.roi === 'Infinity' ? 0 : ch.metrics.roi), 0) / paidChannels.length;

    const aboveAvg = paidChannels.filter(ch => ch.metrics.roi !== 'Infinity' && ch.metrics.roi > avgROI);
    const belowAvg = paidChannels.filter(ch => ch.metrics.roi !== 'Infinity' && ch.metrics.roi < avgROI);

    if (aboveAvg.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'budget_allocation',
        title: 'Shift Budget to High-ROI Channels',
        description: `Consider reallocating budget from underperforming channels to ${aboveAvg.map(ch => ch.name).join(', ')}.`,
        channels: aboveAvg.map(ch => ({ id: ch.id, name: ch.name, roi: ch.metrics.roi })),
        potentialImpact: `+${Math.round((aboveAvg[0].metrics.roi - avgROI) * 10)}% improvement in overall ROI`
      });
    }
  }

  // CAC optimization recommendations
  const highCACChannels = channels.filter(ch => ch.category === 'paid' && ch.metrics.cac > 50);
  if (highCACChannels.length > 0) {
    recommendations.push({
      priority: 'medium',
      category: 'cac_optimization',
      title: 'Optimize Customer Acquisition Cost',
      description: `${highCACChannels.map(ch => ch.name).join(', ')} have high CAC (> $50). Review targeting and ad creatives.`,
      channels: highCACChannels.map(ch => ({ id: ch.id, name: ch.name, cac: ch.metrics.cac })),
      actions: [
        'Refine audience targeting',
        'A/B test ad creatives',
        'Optimize landing pages',
        'Adjust bidding strategy'
      ]
    });
  }

  return recommendations;
}

export default router;
