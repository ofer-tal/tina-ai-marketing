import fetch from 'node-fetch';
import { getLogger } from '../../utils/logger.js';
import MarketingPost from '../../models/MarketingPost.js';
import MarketingCost from '../../models/MarketingCost.js';
import DailySpend from '../../models/DailySpend.js';
import MarketingRevenue from '../../models/MarketingRevenue.js';
import ASOKeyword from '../../models/ASOKeyword.js';
import ASOScore from '../../models/ASOScore.js';
import Strategy from '../../models/Strategy.js';
import DailyRevenueAggregate from '../../models/DailyRevenueAggregate.js';
import RetentionMetrics from '../../models/RetentionMetrics.js';
import GoogleAnalyticsDaily from '../../models/GoogleAnalyticsDaily.js';
import appleSearchAdsService from '../appleSearchAdsService.js';
import appStoreConnectService from '../appStoreConnectService.js';
import postManagementTools from './postManagementTools.js';

const logger = getLogger('tool-executor', 'tool-executor');

/**
 * Tool Executor
 *
 * Executes approved tool proposals.
 * Each tool implementation performs the actual system action.
 */

/**
 * Execute a tool proposal
 * Routes to the appropriate tool implementation
 *
 * @param {object} proposal - ToolProposal document
 * @returns {Promise<object>} Execution result
 */
export async function executeTool(proposal) {
  const { toolName, toolParameters } = proposal;

  logger.info('Executing tool', {
    proposalId: proposal._id,
    toolName,
    parameters: JSON.stringify(toolParameters)
  });

  try {
    let result;

    switch (toolName) {
      // Approval-required tools
      case 'update_posting_schedule':
        result = await updatePostingSchedule(toolParameters);
        break;

      case 'update_content_generation_prompt':
        result = await updateContentPrompt(toolParameters);
        break;

      case 'update_campaign_budget':
        result = await updateCampaignBudget(toolParameters);
        break;

      case 'pause_campaign':
        result = await pauseCampaign(toolParameters);
        break;

      case 'approve_pending_posts':
        result = await approvePendingPosts(toolParameters);
        break;

      case 'update_hashtag_strategy':
        result = await updateHashtagStrategy(toolParameters);
        break;

      case 'create_content_experiment':
        result = await createContentExperiment(toolParameters);
        break;

      // Post management tools (read-only, no approval)
      case 'get_music':
        result = await postManagementTools.getMusic(toolParameters);
        break;

      case 'get_stories':
        result = await postManagementTools.getStories(toolParameters);
        break;

      case 'create_post':
        result = await postManagementTools.createPost(toolParameters);
        break;

      case 'edit_post':
        result = await postManagementTools.editPost(toolParameters);
        break;

      case 'generate_post_video':
        result = await postManagementTools.generatePostVideo(toolParameters);
        break;

      case 'regenerate_post_video':
        result = await postManagementTools.regeneratePostVideo(toolParameters);
        break;

      case 'schedule_post':
        result = await postManagementTools.schedulePosts(toolParameters);
        break;

      // Read-only tools
      case 'get_campaign_performance':
        result = await getCampaignPerformance(toolParameters);
        break;

      case 'get_content_analytics':
        result = await getContentAnalytics(toolParameters);
        break;

      case 'get_budget_status':
        result = await getBudgetStatus(toolParameters);
        break;

      case 'get_aso_keyword_status':
        result = await getASOKeywordStatus(toolParameters);
        break;

      case 'get_revenue_summary':
        result = await getRevenueSummary(toolParameters);
        break;

      case 'get_pending_posts':
        result = await getPendingPosts(toolParameters);
        break;

      case 'get_posting_schedule':
        result = await getPostingSchedule();
        break;

      // New Phase 1: High-Value Tools
      case 'get_conversion_metrics':
        result = await getConversionMetrics(toolParameters);
        break;

      case 'get_acquisition_metrics':
        result = await getAcquisitionMetrics(toolParameters);
        break;

      case 'get_ltv_by_channel':
        result = await getLTVByChannel(toolParameters);
        break;

      case 'get_campaign_roi':
        result = await getCampaignROI(toolParameters);
        break;

      case 'get_spend_by_channel':
        result = await getSpendByChannel(toolParameters);
        break;

      case 'get_roi_by_channel':
        result = await getROIByChannel(toolParameters);
        break;

      // Phase 2: User Behavior & Retention
      case 'get_retention_metrics':
        result = await getRetentionMetrics(toolParameters);
        break;

      case 'get_user_activity_metrics':
        result = await getUserActivityMetrics(toolParameters);
        break;

      case 'get_subscription_tier_performance':
        result = await getSubscriptionTierPerformance(toolParameters);
        break;

      // Phase 3: Content & ASO Enhancements
      case 'get_keyword_performance':
        result = await getKeywordPerformance(toolParameters);
        break;

      case 'get_app_store_performance':
        result = await getAppStorePerformance(toolParameters);
        break;

      case 'get_optimal_posting_times':
        result = await getOptimalPostingTimes(toolParameters);
        break;

      case 'get_traffic_sources':
        result = await getTrafficSources(toolParameters);
        break;

      case 'get_recent_activity':
        result = await postManagementTools.getRecentActivity(toolParameters);
        break;

      // Strategy memory tools - read only
      case 'get_strategies':
        result = await getStrategies(toolParameters);
        break;

      case 'get_strategy_details':
        result = await getStrategyDetails(toolParameters);
        break;

      case 'get_strategy_history':
        result = await getStrategyHistory(toolParameters);
        break;

      // Strategy tools - approval required
      case 'create_strategy':
        result = await createStrategy(toolParameters);
        break;

      case 'update_strategy':
        result = await updateStrategy(toolParameters);
        break;

      case 'complete_strategy':
        result = await completeStrategy(toolParameters);
        break;

      case 'pause_strategy':
        result = await pauseStrategy(toolParameters);
        break;

      case 'resume_strategy':
        result = await resumeStrategy(toolParameters);
        break;

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }

    logger.info('Tool executed successfully', {
      proposalId: proposal._id,
      toolName,
      result: JSON.stringify(result).substring(0, 200)
    });

    return {
      success: true,
      data: result
    };

  } catch (error) {
    logger.error('Tool execution failed', {
      proposalId: proposal._id,
      toolName,
      error: error.message,
      stack: error.stack
    });

    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================================================
// APPROVAL-REQUIRED TOOL IMPLEMENTATIONS
// ============================================================================

/**
 * Update posting schedule
 * Changes the content posting frequency
 */
async function updatePostingSchedule({ frequency, platforms = ['tiktok', 'instagram'] }) {
  // In a real implementation, this would update a settings table
  // For now, we'll create a strategy entry to track the change

  const entry = await Strategy.create({
    title: `Update Posting Schedule to ${frequency}x/day`,
    type: 'recommendation',
    priority: 'high',
    status: 'completed',
    content: `Posting frequency updated to ${frequency} times per day for platforms: ${platforms.join(', ')}`,
    metadata: {
      source: 'tina_tool',
      toolName: 'update_posting_schedule',
      previousFrequency: process.env.POSTING_FREQUENCY || '2',
      newFrequency: frequency.toString(),
      platforms: platforms
    },
    completedAt: new Date()
  });

  // Update process.env for current session
  process.env.POSTING_FREQUENCY = frequency.toString();

  return {
    message: `Posting schedule updated to ${frequency}x/day`,
    platforms: platforms,
    newFrequency: frequency,
    strategyId: entry._id
  };
}

/**
 * Update content generation prompt
 * Modifies AI prompts for content generation
 */
async function updateContentPrompt({ category, promptAddition }) {
  const entry = await Strategy.create({
    title: `Update Content Prompt for ${category}`,
    type: 'recommendation',
    priority: 'medium',
    status: 'completed',
    content: `Content prompt updated for ${category} category. Addition: "${promptAddition}"`,
    metadata: {
      source: 'tina_tool',
      toolName: 'update_content_generation_prompt',
      category: category,
      promptAddition: promptAddition
    },
    completedAt: new Date()
  });

  // Store in environment for current session
  const envKey = `CONTENT_PROMPT_${category.toUpperCase()}_ADDITION`;
  process.env[envKey] = promptAddition;

  return {
    message: `Content generation prompt updated for ${category}`,
    category: category,
    promptAddition: promptAddition,
    strategyId: entry._id
  };
}

/**
 * Update campaign budget
 * Changes Apple Search Ads campaign budget
 */
async function updateCampaignBudget({ campaignId, dailyBudget, reasoning }) {
  // Try to call Apple Search Ads API if configured
  let apiResult = null;
  let previousBudget = null;

  try {
    if (appleSearchAdsService && typeof appleSearchAdsService.updateCampaignBudget === 'function') {
      apiResult = await appleSearchAdsService.updateCampaignBudget(campaignId, dailyBudget);
      previousBudget = apiResult.previousBudget;
    }
  } catch (apiError) {
    logger.warn('Apple Search Ads API call failed, recording change locally', {
      error: apiError.message
    });
  }

  // Record the budget change in MarketingCost
  const costEntry = await MarketingCost.create({
    date: new Date(),
    category: 'paid_ads',
    amount: dailyBudget,
    subcategory: 'apple_search_ads',
    metadata: {
      source: 'tina_tool',
      toolName: 'update_campaign_budget',
      campaignId: campaignId,
      previousBudget: previousBudget,
      newBudget: dailyBudget,
      reasoning: reasoning
    }
  });

  return {
    message: `Campaign budget updated to $${dailyBudget}/day`,
    campaignId: campaignId,
    previousBudget: previousBudget,
    newBudget: dailyBudget,
    reasoning: reasoning,
    costEntryId: costEntry._id
  };
}

/**
 * Pause campaign
 * Pauses an active advertising campaign
 */
async function pauseCampaign({ campaignId, reason }) {
  // Try to call Apple Search Ads API if configured
  let apiResult = null;

  try {
    if (appleSearchAdsService && typeof appleSearchAdsService.pauseCampaign === 'function') {
      apiResult = await appleSearchAdsService.pauseCampaign(campaignId);
    }
  } catch (apiError) {
    logger.warn('Apple Search Ads API call failed, recording pause locally', {
      error: apiError.message
    });
  }

  // Record the campaign pause
  const entry = await Strategy.create({
    title: `Pause Campaign ${campaignId}`,
    type: 'alert',
    priority: 'high',
    status: 'completed',
    content: `Campaign ${campaignId} paused. Reason: ${reason}`,
    metadata: {
      source: 'tina_tool',
      toolName: 'pause_campaign',
      campaignId: campaignId,
      reason: reason
    },
    completedAt: new Date()
  });

  return {
    message: `Campaign ${campaignId} paused`,
    campaignId: campaignId,
    reason: reason,
    strategyId: entry._id
  };
}

/**
 * Approve pending posts
 * Bulk approves posts for automatic posting
 */
async function approvePendingPosts({ count, criteria = 'newest', platforms }) {
  const now = new Date();

  // Build query for pending posts
  const query = { status: 'pending' };
  if (platforms && platforms.length > 0) {
    query.platform = { $in: platforms };
  }

  // Determine sort order based on criteria
  let sort = { createdAt: -1 }; // default: newest first
  if (criteria === 'highest_engagement_predicted') {
    sort = { 'metadata.predictedEngagement': -1 };
  }

  // Find and update pending posts
  const posts = await MarketingPost.find(query)
    .sort(sort)
    .limit(parseInt(count));

  if (posts.length === 0) {
    return {
      message: 'No pending posts found to approve',
      approvedCount: 0
    };
  }

  // Update posts to approved status
  const postIds = posts.map(p => p._id);
  await MarketingPost.updateMany(
    { _id: { $in: postIds } },
    {
      status: 'approved',
      approvedAt: now,
      'metadata.approvedBy': 'tina_tool',
      'metadata.approvalCriteria': criteria
    }
  );

  return {
    message: `Approved ${posts.length} posts for posting`,
    approvedCount: posts.length,
    criteria: criteria,
    platforms: platforms,
    postIds: postIds
  };
}

/**
 * Update hashtag strategy
 * Changes hashtag approach for content
 */
async function updateHashtagStrategy({ strategy, category, customHashtags = [] }) {
  const entry = await Strategy.create({
    title: `Update Hashtag Strategy to ${strategy}`,
    type: 'recommendation',
    priority: 'medium',
    status: 'completed',
    content: `Hashtag strategy updated to "${strategy}"${category ? ` for ${category} content` : ''}`,
    metadata: {
      source: 'tina_tool',
      toolName: 'update_hashtag_strategy',
      strategy: strategy,
      category: category,
      customHashtags: customHashtags
    },
    completedAt: new Date()
  });

  // Update environment for current session
  if (category) {
    process.env[`HASHTAG_STRATEGY_${category.toUpperCase()}`] = strategy;
  } else {
    process.env.HASHTAG_STRATEGY = strategy;
  }

  return {
    message: `Hashtag strategy updated to ${strategy}`,
    strategy: strategy,
    category: category,
    customHashtags: customHashtags,
    strategyId: entry._id
  };
}

/**
 * Create content experiment
 * Sets up an A/B test for content
 */
async function createContentExperiment({ experimentName, hypothesis, variants, successMetric, duration }) {
  const entry = await Strategy.create({
    title: `Experiment: ${experimentName}`,
    type: 'experiment',
    priority: 'high',
    status: 'in_progress',
    content: `Testing: ${hypothesis}`,
    metadata: {
      source: 'tina_tool',
      toolName: 'create_content_experiment',
      experimentName: experimentName,
      hypothesis: hypothesis,
      variants: variants,
      successMetric: successMetric,
      duration: duration,
      experimentStartedAt: new Date().toISOString(),
      experimentEndDate: new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString()
    }
  });

  return {
    message: `Content experiment "${experimentName}" created`,
    experimentName: experimentName,
    hypothesis: hypothesis,
    variants: variants,
    successMetric: successMetric,
    duration: duration,
    estimatedEndDate: new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString(),
    strategyId: entry._id
  };
}

// ============================================================================
// READ-ONLY TOOL IMPLEMENTATIONS
// ============================================================================

/**
 * Get campaign performance
 * Fetches metrics for advertising campaigns
 */
async function getCampaignPerformance({ timeframe = '7d', campaignId }) {
  // Calculate date range
  const now = new Date();
  let startDate = new Date();

  switch (timeframe) {
    case '7d':
      startDate.setDate(now.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(now.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(now.getDate() - 90);
      break;
    case 'today':
      startDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case 'yesterday':
      startDate = new Date(now.setDate(now.getDate() - 1));
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'this_week':
      startDate = new Date(now.setDate(now.getDate() - now.getDay()));
      break;
    case 'this_month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }

  // Fetch spend data
  const spendData = await DailySpend.find({
    date: { $gte: startDate.toISOString().split('T')[0] }
  }).sort({ date: 1 });

  const totalSpend = spendData.reduce((sum, d) => sum + (d.adSpend || 0), 0);

  // Fetch revenue data for ROI calculation
  const revenueData = await MarketingRevenue.find({
    date: { $gte: startDate }
  }).sort({ date: -1 }).limit(1);

  const latestRevenue = revenueData[0];
  const mrr = latestRevenue?.mrr || 0;

  // Calculate ROAS (Return on Ad Spend)
  // Assuming monthly revenue is primarily driven by ad spend over the period
  const roas = totalSpend > 0 ? (mrr / 3) / totalSpend : 0; // Rough estimate: MRR/3 as monthly ad-driven revenue

  return {
    timeframe: timeframe,
    period: {
      start: startDate.toISOString(),
      end: now.toISOString()
    },
    metrics: {
      totalSpend: Math.round(totalSpend * 100) / 100,
      estimatedInstalls: Math.round(totalSpend * 2.5), // Rough estimate
      roas: Math.round(roas * 100) / 100,
      cpa: totalSpend > 0 ? Math.round((totalSpend / (totalSpend * 2.5)) * 100) / 100 : 0
    },
    dailyBreakdown: spendData.slice(-7).map(d => ({
      date: d.date,
      spend: Math.round(d.adSpend * 100) / 100
    }))
  };
}

/**
 * Get content analytics
 * Fetches detailed content performance data
 */
async function getContentAnalytics({ days = 7, platform = 'all', category }) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const query = {
    postedAt: { $gte: startDate }
  };

  if (platform !== 'all') {
    query.platform = platform;
  }

  if (category) {
    query.category = category;
  }

  const posts = await MarketingPost.find(query).sort({ postedAt: -1 });

  // Calculate analytics
  const totalPosts = posts.length;
  const totalViews = posts.reduce((sum, p) => sum + (p.performanceMetrics?.views || 0), 0);
  const totalLikes = posts.reduce((sum, p) => sum + (p.performanceMetrics?.likes || 0), 0);
  const totalShares = posts.reduce((sum, p) => sum + (p.performanceMetrics?.shares || 0), 0);
  const avgEngagement = totalViews > 0 ? (totalLikes + totalShares) / totalViews / totalPosts : 0;

  // Top performing posts
  const topPosts = posts
    .sort((a, b) => (b.performanceMetrics?.engagementRate || 0) - (a.performanceMetrics?.engagementRate || 0))
    .slice(0, 5);

  // Category breakdown
  const categoryStats = {};
  posts.forEach(p => {
    const cat = p.category || 'uncategorized';
    if (!categoryStats[cat]) {
      categoryStats[cat] = { count: 0, totalViews: 0, totalEngagement: 0 };
    }
    categoryStats[cat].count++;
    categoryStats[cat].totalViews += p.performanceMetrics?.views || 0;
    categoryStats[cat].totalEngagement += p.performanceMetrics?.engagementRate || 0;
  });

  return {
    period: {
      days: days,
      start: startDate.toISOString(),
      end: new Date().toISOString()
    },
    summary: {
      totalPosts: totalPosts,
      totalViews: totalViews,
      totalLikes: totalLikes,
      totalShares: totalShares,
      avgEngagementRate: Math.round(avgEngagement * 10000) / 100 // percentage
    },
    topPosts: topPosts.map(p => ({
      id: p._id,
      title: p.title,
      platform: p.platform,
      category: p.category,
      views: p.performanceMetrics?.views || 0,
      likes: p.performanceMetrics?.likes || 0,
      engagementRate: Math.round((p.performanceMetrics?.engagementRate || 0) * 10000) / 100
    })),
    categoryBreakdown: Object.entries(categoryStats).map(([cat, stats]) => ({
      category: cat,
      count: stats.count,
      totalViews: stats.totalViews,
      avgEngagement: Math.round((stats.totalEngagement / stats.count) * 10000) / 100
    }))
  };
}

/**
 * Get budget status
 * Fetches current budget utilization
 */
async function getBudgetStatus() {
  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);

  const monthlySpend = await DailySpend.aggregate([
    { $match: { date: { $gte: currentMonth.toISOString().split('T')[0] } } },
    { $group: { _id: null, totalSpend: { $sum: '$adSpend' } } }
  ]);

  const totalSpend = monthlySpend[0]?.totalSpend || 0;
  const monthlyBudget = parseFloat(process.env.MONTHLY_BUDGET_LIMIT || '3000');
  const remaining = monthlyBudget - totalSpend;
  const utilization = (totalSpend / monthlyBudget) * 100;

  return {
    monthlyBudget: monthlyBudget,
    totalSpent: Math.round(totalSpend * 100) / 100,
    remaining: Math.round(remaining * 100) / 100,
    utilization: Math.round(utilization * 10) / 10,
    daysRemaining: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate() - new Date().getDate(),
    alerts: utilization > 90 ? ['Budget utilization above 90%'] :
             utilization > 70 ? ['Budget utilization above 70%'] : []
  };
}

/**
 * Get ASO keyword status
 * Fetches current keyword rankings
 */
async function getASOKeywordStatus({ topN = 20 }) {
  const keywords = await ASOKeyword.find({})
    .sort({ ranking: 1 })
    .limit(parseInt(topN));

  if (keywords.length === 0) {
    return {
      topN: topN,
      keywords: [],
      summary: {
        top10Count: 0,
        top50Count: 0,
        avgRanking: null
      },
      dataAvailable: false,
      message: 'No ASO keyword data available. Keywords need to be added to the ASOKeyword collection for tracking.'
    };
  }

  return {
    topN: topN,
    keywords: keywords.map(k => ({
      keyword: k.keyword,
      ranking: k.ranking,
      opportunityScore: k.opportunityScore,
      change: k.rankingHistory && k.rankingHistory.length > 1
        ? k.rankingHistory[k.rankingHistory.length - 2].ranking - k.ranking
        : 0
    })),
    summary: {
      top10Count: keywords.filter(k => k.ranking <= 10).length,
      top50Count: keywords.filter(k => k.ranking <= 50).length,
      avgRanking: keywords.reduce((sum, k) => sum + k.ranking, 0) / keywords.length
    },
    dataAvailable: true
  };
}

/**
 * Get revenue summary
 * Fetches current revenue metrics from DailyRevenueAggregate
 */
async function getRevenueSummary({ days = 30 }) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Use DailyRevenueAggregate which contains the actual revenue data
  const revenueData = await DailyRevenueAggregate.find({
    dateObj: { $gte: startDate }
  }).sort({ dateObj: -1 });

  if (revenueData.length === 0) {
    return {
      period: {
        days: days,
        start: startDate.toISOString(),
        end: new Date().toISOString()
      },
      current: {
        mrr: 0,
        subscribers: 0,
        arpu: 0,
        netRevenue: 0
      },
      growth: {
        percentage: 0,
        absolute: 0
      },
      metrics: {
        newUsers: 0,
        churnedSubscribers: 0,
        netNewUsers: 0
      },
      dataAvailable: false,
      message: 'No revenue data available in DailyRevenueAggregate collection'
    };
  }

  const latest = revenueData[0];
  const oldest = revenueData[revenueData.length - 1];

  // Calculate growth
  const growth = oldest && oldest.mrr > 0
    ? ((latest.mrr - oldest.mrr) / oldest.mrr) * 100
    : 0;

  return {
    period: {
      days: days,
      start: startDate.toISOString(),
      end: new Date().toISOString()
    },
    current: {
      mrr: latest.mrr || 0,
      subscribers: latest.totalSubscribers || 0,
      arpu: latest.arpu || 0,
      netRevenue: latest.netRevenue || 0
    },
    growth: {
      percentage: Math.round(growth * 10) / 10,
      absolute: (latest.mrr || 0) - (oldest.mrr || 0)
    },
    metrics: {
      newUsers: latest.newSubscribers || 0,
      churnedSubscribers: latest.churnedSubscribers || 0,
      netNewUsers: (latest.newSubscribers || 0) - (latest.churnedSubscribers || 0)
    },
    dataAvailable: true
  };
}

/**
 * Get pending posts
 * Lists posts awaiting approval
 */
async function getPendingPosts({ platform = 'all', limit = 20 }) {
  const query = { status: 'pending' };

  if (platform !== 'all') {
    query.platform = platform;
  }

  const posts = await MarketingPost.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

  return {
    count: posts.length,
    posts: posts.map(p => ({
      id: p._id,
      title: p.title,
      category: p.category,
      platform: p.platform,
      spicinessLevel: p.spicinessLevel,
      createdAt: p.createdAt,
      hasVideo: !!p.videoUrl,
      hasImage: !!p.imageUrl,
      predictedEngagement: p.metadata?.predictedEngagement || 'medium'
    }))
  };
}

/**
 * Get posting schedule
 * Returns current posting schedule configuration
 */
async function getPostingSchedule() {
  // Get current posting frequency from environment
  const frequency = parseInt(process.env.POSTING_FREQUENCY || '2', 10);

  // Get enabled platforms from environment
  const enabledPlatforms = process.env.ENABLED_PLATFORMS?.split(',') || ['tiktok', 'instagram'];

  // Get optimal posting times from environment if available
  const optimalTimes = process.env.OPTIMAL_POSTING_HOURS?.split(',').map(h => parseInt(h.trim(), 10)) || [10, 14, 18];

  // Get posting schedule info from Strategy collection (recent schedule changes)
  const recentChanges = await Strategy.find({
    type: 'recommendation',
    'metadata.toolName': 'update_posting_schedule'
  })
    .sort({ createdAt: -1 })
    .limit(1)
    .lean();

  const lastUpdated = recentChanges.length > 0 ? recentChanges[0].createdAt : null;

  return {
    currentFrequency: frequency,
    postsPerDay: frequency,
    enabledPlatforms,
    optimalPostingHours: optimalTimes,
    scheduleDescription: `${frequency}x per day posting on ${enabledPlatforms.join(', ')}`,
    bestTimes: optimalTimes.map(h => {
      if (h === 0) return '12:00 AM';
      if (h === 12) return '12:00 PM';
      return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`;
    }),
    lastUpdated,
    configuration: {
      // Configuration details for Tina to understand current setup
      autoPosting: process.env.AUTO_POSTING === 'true',
      batchGeneration: process.env.BATCH_GENERATION === 'true',
      hashtagStrategy: process.env.HASHTAG_STRATEGY || 'moderate',
      captionStyle: process.env.CAPTION_STYLE || 'engaging'
    }
  };
}

// ============================================================================
// NEW TOOL IMPLEMENTATIONS - PHASE 1: HIGH-VALUE TOOLS
// ============================================================================

/**
 * Parse timeframe to date range
 * Helper function for converting timeframe strings to start/end dates
 */
function parseTimeframe(timeframe) {
  const now = new Date();
  const startDate = new Date();

  switch (timeframe) {
    case '7d':
      startDate.setDate(now.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(now.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(now.getDate() - 90);
      break;
    case 'this_month':
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'last_month':
      startDate.setMonth(now.getMonth() - 1);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      break;
    default:
      startDate.setDate(now.getDate() - 30);
  }

  return { startDate, endDate: now };
}

/**
 * Get conversion metrics
 * Fetches free-to-paid and trial-to-paid conversion rates
 */
async function getConversionMetrics({ timeframe = '30d' }) {
  const { startDate, endDate } = parseTimeframe(timeframe);

  // Get retention metrics which contain conversion data
  const retentionData = await RetentionMetrics.find({
    cohortDateObj: { $gte: startDate, $lte: endDate }
  }).sort({ cohortDateObj: -1 });

  // Get daily revenue aggregates for additional conversion context
  const revenueData = await DailyRevenueAggregate.find({
    dateObj: { $gte: startDate, $lte: endDate }
  }).sort({ dateObj: -1 });

  // Calculate conversion metrics from retention data
  let freeToPaidRate = 0;
  let trialToPaidRate = 0;
  let totalFreeUsers = 0;
  let totalTrialUsers = 0;
  let totalConvertedUsers = 0;

  if (retentionData.length > 0) {
    const avgFreeToPaid = retentionData.reduce((sum, r) => sum + (r.lifecycle?.freeToPaidConversionRate || 0), 0) / retentionData.length;
    const avgTrialToPaid = retentionData.reduce((sum, r) => sum + (r.lifecycle?.trialToPaidConversionRate || 0), 0) / retentionData.length;
    freeToPaidRate = parseFloat(avgFreeToPaid.toFixed(2));
    trialToPaidRate = parseFloat(avgTrialToPaid.toFixed(2));
  }

  // Get subscriber tier breakdown from revenue data
  let tierBreakdown = { trial: 0, monthly: 0, annual: 0, lifetime: 0 };
  if (revenueData.length > 0) {
    const latest = revenueData[0];
    if (latest.bySubscriptionType && latest.bySubscriptionType.length > 0) {
      latest.bySubscriptionType.forEach(tier => {
        tierBreakdown[tier.type] = tier.count || 0;
      });
    }

    // Calculate total users
    totalFreeUsers = latest.subscribers?.totalCount || 0;
    totalTrialUsers = latest.subscribers?.trialCount || 0;
    totalConvertedUsers = (latest.subscribers?.monthlyCount || 0) +
                         (latest.subscribers?.annualCount || 0) +
                         (latest.subscribers?.lifetimeCount || 0);
  }

  return {
    timeframe: timeframe,
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    },
    conversionRates: {
      freeToPaid: freeToPaidRate,
      trialToPaid: trialToPaidRate
    },
    userCounts: {
      totalFreeUsers: totalFreeUsers,
      totalTrialUsers: totalTrialUsers,
      totalPaidUsers: totalConvertedUsers
    },
    tierBreakdown: tierBreakdown,
    insights: generateConversionInsights(freeToPaidRate, trialToPaidRate, tierBreakdown)
  };
}

/**
 * Generate conversion insights
 */
function generateConversionInsights(freeToPaid, trialToPaid, tierBreakdown) {
  const insights = [];

  if (freeToPaid > 15) {
    insights.push('Strong free-to-paid conversion rate above 15%');
  } else if (freeToPaid > 0 && freeToPaid < 5) {
    insights.push('Low free-to-paid conversion - consider improving onboarding or trial experience');
  }

  if (trialToPaid > 50) {
    insights.push('Excellent trial-to-paid conversion rate above 50%');
  } else if (trialToPaid > 0 && trialToPaid < 30) {
    insights.push('Trial-to-paid conversion below 30% - trial may need more value demonstration');
  }

  const annualRatio = tierBreakdown.annual / (tierBreakdown.monthly + tierBreakdown.annual || 1);
  if (annualRatio > 0.5) {
    insights.push('Users prefer annual subscriptions - good for cash flow and retention');
  } else if (annualRatio < 0.2 && tierBreakdown.annual > 0) {
    insights.push('Low annual adoption - consider highlighting annual savings in-app');
  }

  return insights;
}

/**
 * Get acquisition metrics
 * Fetches CPI, CAC, and organic vs paid breakdown
 */
async function getAcquisitionMetrics({ timeframe = '30d', channel = 'all' }) {
  const { startDate, endDate } = parseTimeframe(timeframe);

  // Get revenue aggregates with channel breakdown
  const revenueData = await DailyRevenueAggregate.find({
    dateObj: { $gte: startDate, $lte: endDate }
  }).sort({ dateObj: -1 });

  // Get spend data
  const spendData = await DailySpend.find({
    date: { $gte: startDate.toISOString().split('T')[0] }
  });

  // Calculate total metrics
  let totalNewUsers = 0;
  let totalSpend = 0;
  const channelBreakdown = {};

  // Aggregate by channel
  revenueData.forEach(day => {
    if (day.byChannel) {
      day.byChannel.forEach(ch => {
        if (!channelBreakdown[ch.channel]) {
          channelBreakdown[ch.channel] = {
            newCustomerCount: 0,
            netRevenue: 0,
            transactionCount: 0
          };
        }
        channelBreakdown[ch.channel].newCustomerCount += ch.newCustomerCount || 0;
        channelBreakdown[ch.channel].netRevenue += ch.netRevenue || 0;
        channelBreakdown[ch.channel].transactionCount += ch.transactionCount || 0;
        totalNewUsers += ch.newCustomerCount || 0;
      });
    }
  });

  // Calculate total spend
  spendData.forEach(day => {
    totalSpend += day.adSpend || 0;
  });

  // Calculate CAC (Cost Per Acquisition)
  // CAC = Total Spend / Total New Customers
  const cac = totalNewUsers > 0 ? totalSpend / totalNewUsers : 0;

  // Build channel metrics
  const channels = Object.entries(channelBreakdown).map(([ch, data]) => {
    // Estimate channel-specific spend (proportional to customers)
    const channelSpend = totalNewUsers > 0
      ? (data.newCustomerCount / totalNewUsers) * totalSpend
      : 0;

    return {
      channel: ch,
      newUsers: data.newCustomerCount,
      revenue: data.netRevenue,
      estimatedSpend: Math.round(channelSpend * 100) / 100,
      cac: data.newCustomerCount > 0 ? Math.round((channelSpend / data.newCustomerCount) * 100) / 100 : 0
    };
  }).sort((a, b) => b.newUsers - a.newUsers);

  // Calculate organic vs paid split
  const organicUsers = channels.find(c => c.channel === 'organic')?.newUsers || 0;
  const paidUsers = channels.reduce((sum, c) =>
    c.channel !== 'organic' && c.channel !== 'referral' && c.channel !== 'direct'
      ? sum + c.newUsers
      : sum, 0);

  return {
    timeframe: timeframe,
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    },
    summary: {
      totalNewUsers: totalNewUsers,
      totalSpend: Math.round(totalSpend * 100) / 100,
      averageCAC: Math.round(cac * 100) / 100,
      organicPercentage: totalNewUsers > 0 ? Math.round((organicUsers / totalNewUsers) * 100) : 0,
      paidPercentage: totalNewUsers > 0 ? Math.round((paidUsers / totalNewUsers) * 100) : 0
    },
    channelBreakdown: channels
  };
}

/**
 * Get LTV by channel
 * Calculates lifetime value by acquisition channel
 */
async function getLTVByChannel({ timeframe = '90d' }) {
  const { startDate, endDate } = parseTimeframe(timeframe);

  // Get revenue aggregates with channel breakdown
  const revenueData = await DailyRevenueAggregate.find({
    dateObj: { $gte: startDate, $lte: endDate }
  }).sort({ dateObj: -1 });

  // Get retention metrics by channel
  const retentionByChannel = await RetentionMetrics.getRetentionByChannel(startDate, endDate);

  // Aggregate revenue by channel
  const channelMap = new Map();

  revenueData.forEach(day => {
    if (day.byChannel) {
      day.byChannel.forEach(ch => {
        if (!channelMap.has(ch.channel)) {
          channelMap.set(ch.channel, {
            channel: ch.channel,
            totalRevenue: 0,
            newCustomers: 0,
            transactions: 0
          });
        }
        const data = channelMap.get(ch.channel);
        data.totalRevenue += ch.netRevenue || 0;
        data.newCustomers += ch.newCustomerCount || 0;
        data.transactions += ch.transactionCount || 0;
      });
    }
  });

  // Calculate LTV per channel
  const channelLTV = Array.from(channelMap.values()).map(ch => {
    const ltv = ch.newCustomers > 0 ? ch.totalRevenue / ch.newCustomers : 0;

    // Find retention data for this channel
    const retentionData = retentionByChannel.find(r => r.channel === ch.channel);

    return {
      channel: ch.channel,
      ltv: Math.round(ltv * 100) / 100,
      totalRevenue: Math.round(ch.totalRevenue * 100) / 100,
      newCustomers: ch.newCustomers,
      avgTransactionValue: ch.transactions > 0 ? Math.round((ch.totalRevenue / ch.transactions) * 100) / 100 : 0,
      avgRetentionDay7: retentionData?.avgRetentionDay7 || 0,
      avgRetentionDay30: retentionData?.avgRetentionDay30 || 0
    };
  }).sort((a, b) => b.ltv - a.ltv);

  return {
    timeframe: timeframe,
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    },
    channelLTV: channelLTV,
    insights: generateLTVInsights(channelLTV)
  };
}

/**
 * Generate LTV insights
 */
function generateLTVInsights(channelLTV) {
  const insights = [];

  if (channelLTV.length === 0) {
    return ['No channel LTV data available'];
  }

  const topChannel = channelLTV[0];
  insights.push(`Highest LTV channel: ${topChannel.channel} at $${topChannel.ltv}`);

  const lowLTVChannels = channelLTV.filter(ch => ch.ltv < 10);
  if (lowLTVChannels.length > 0) {
    insights.push(`Low LTV channels (${lowLTVChannels.map(ch => ch.channel).join(', ')}) - consider optimizing targeting`);
  }

  const organicChannel = channelLTV.find(ch => ch.channel === 'organic');
  if (organicChannel && organicChannel.ltv > 20) {
    insights.push('Organic users show strong LTV - invest in organic growth strategies');
  }

  return insights;
}

/**
 * Get campaign ROI
 * Detailed ROAS and profitability by campaign
 */
async function getCampaignROI({ timeframe = '30d', campaignId }) {
  const { startDate, endDate } = parseTimeframe(timeframe);

  // Get revenue aggregates with campaign breakdown
  const revenueData = await DailyRevenueAggregate.find({
    dateObj: { $gte: startDate, $lte: endDate }
  }).sort({ dateObj: -1 });

  // Get spend data
  const spendData = await DailySpend.find({
    date: { $gte: startDate.toISOString().split('T')[0] }
  });

  // Aggregate by campaign
  const campaignMap = new Map();

  revenueData.forEach(day => {
    if (day.byCampaign) {
      day.byCampaign.forEach(camp => {
        // Filter by campaignId if specified
        if (campaignId && camp.campaignId !== campaignId) return;

        if (!campaignMap.has(camp.campaignId)) {
          campaignMap.set(camp.campaignId, {
            campaignId: camp.campaignId,
            campaignName: camp.campaignName || `Campaign ${camp.campaignId}`,
            totalRevenue: 0,
            newCustomers: 0,
            transactions: 0
          });
        }
        const data = campaignMap.get(camp.campaignId);
        data.totalRevenue += camp.netRevenue || 0;
        data.newCustomers += camp.newCustomerCount || 0;
        data.transactions += camp.transactionCount || 0;
      });
    }
  });

  // Calculate total spend and estimate per-campaign spend
  const totalSpend = spendData.reduce((sum, d) => sum + (d.adSpend || 0), 0);
  const totalNewCustomers = Array.from(campaignMap.values())
    .reduce((sum, c) => sum + c.newCustomers, 0);

  // Calculate ROI per campaign
  const campaignROI = Array.from(campaignMap.values()).map(camp => {
    const estimatedSpend = totalNewCustomers > 0
      ? (camp.newCustomers / totalNewCustomers) * totalSpend
      : 0;

    const roas = estimatedSpend > 0 ? camp.totalRevenue / estimatedSpend : 0;
    const roi = estimatedSpend > 0
      ? ((camp.totalRevenue - estimatedSpend) / estimatedSpend) * 100
      : 0;

    return {
      campaignId: camp.campaignId,
      campaignName: camp.campaignName,
      revenue: Math.round(camp.totalRevenue * 100) / 100,
      estimatedSpend: Math.round(estimatedSpend * 100) / 100,
      newCustomers: camp.newCustomers,
      roas: Math.round(roas * 100) / 100,
      roi: Math.round(roi),
      cac: camp.newCustomers > 0 ? Math.round((estimatedSpend / camp.newCustomers) * 100) / 100 : 0
    };
  }).sort((a, b) => b.roas - a.roas);

  return {
    timeframe: timeframe,
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    },
    totalSpend: Math.round(totalSpend * 100) / 100,
    campaigns: campaignROI,
    insights: generateROIInsights(campaignROI)
  };
}

/**
 * Generate ROI insights
 */
function generateROIInsights(campaigns) {
  const insights = [];

  if (campaigns.length === 0) {
    return ['No campaign ROI data available'];
  }

  const topCampaign = campaigns[0];
  if (topCampaign.roas > 3) {
    insights.push(`Excellent ROAS from ${topCampaign.campaignName}: ${topCampaign.roas}x - consider scaling budget`);
  } else if (topCampaign.roas > 0 && topCampaign.roas < 1) {
    insights.push(`Campaign ${topCampaign.campaignName} is not profitable (ROAS < 1.0) - consider pausing or optimizing`);
  }

  const negativeROI = campaigns.filter(c => c.roi < 0);
  if (negativeROI.length > 0) {
    insights.push(`${negativeROI.length} campaign(s) with negative ROI - review targeting and keywords`);
  }

  return insights;
}

/**
 * Get spend by channel
 * Detailed spending breakdown with efficiency metrics
 */
async function getSpendByChannel({ timeframe = '30d' }) {
  const { startDate, endDate } = parseTimeframe(timeframe);

  // Get revenue aggregates with channel breakdown
  const revenueData = await DailyRevenueAggregate.find({
    dateObj: { $gte: startDate, $lte: endDate }
  }).sort({ dateObj: -1 });

  // Get spend data
  const spendData = await DailySpend.find({
    date: { $gte: startDate.toISOString().split('T')[0] }
  });

  // Calculate totals
  const totalSpend = spendData.reduce((sum, d) => sum + (d.adSpend || 0), 0);
  const totalDays = spendData.length;
  const avgDailySpend = totalDays > 0 ? totalSpend / totalDays : 0;

  // Aggregate by channel
  const channelMap = new Map();

  revenueData.forEach(day => {
    if (day.byChannel) {
      day.byChannel.forEach(ch => {
        if (!channelMap.has(ch.channel)) {
          channelMap.set(ch.channel, {
            channel: ch.channel,
            revenue: 0,
            newCustomers: 0
          });
        }
        const data = channelMap.get(ch.channel);
        data.revenue += ch.netRevenue || 0;
        data.newCustomers += ch.newCustomerCount || 0;
      });
    }
  });

  const totalRevenue = Array.from(channelMap.values()).reduce((sum, ch) => sum + ch.revenue, 0);
  const totalCustomers = Array.from(channelMap.values()).reduce((sum, ch) => sum + ch.newCustomers, 0);

  // Calculate channel spend (proportional to customers)
  const channelSpend = Array.from(channelMap.values()).map(ch => {
    const estimatedSpend = totalCustomers > 0
      ? (ch.newCustomers / totalCustomers) * totalSpend
      : 0;

    const roas = estimatedSpend > 0 ? ch.revenue / estimatedSpend : 0;
    const efficiency = estimatedSpend > 0 && ch.newCustomers > 0
      ? estimatedSpend / ch.newCustomers
      : 0;

    return {
      channel: ch.channel,
      estimatedSpend: Math.round(estimatedSpend * 100) / 100,
      revenue: Math.round(ch.revenue * 100) / 100,
      roas: Math.round(roas * 100) / 100,
      newCustomers: ch.newCustomers,
      cac: Math.round(efficiency * 100) / 100,
      spendPercentage: totalSpend > 0 ? Math.round((estimatedSpend / totalSpend) * 100) : 0
    };
  }).sort((a, b) => b.estimatedSpend - a.estimatedSpend);

  return {
    timeframe: timeframe,
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    },
    summary: {
      totalSpend: Math.round(totalSpend * 100) / 100,
      avgDailySpend: Math.round(avgDailySpend * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      overallROAS: totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 100) / 100 : 0
    },
    channelBreakdown: channelSpend
  };
}

/**
 * Get ROI by channel
 * ROI analysis comparing marketing channel performance
 */
async function getROIByChannel({ timeframe = '30d' }) {
  const { startDate, endDate } = parseTimeframe(timeframe);

  // Get revenue aggregates with channel breakdown
  const revenueData = await DailyRevenueAggregate.find({
    dateObj: { $gte: startDate, $lte: endDate }
  }).sort({ dateObj: -1 });

  // Get spend data
  const spendData = await DailySpend.find({
    date: { $gte: startDate.toISOString().split('T')[0] }
  });

  const totalSpend = spendData.reduce((sum, d) => sum + (d.adSpend || 0), 0);

  // Aggregate by channel
  const channelMap = new Map();

  revenueData.forEach(day => {
    if (day.byChannel) {
      day.byChannel.forEach(ch => {
        if (!channelMap.has(ch.channel)) {
          channelMap.set(ch.channel, {
            channel: ch.channel,
            revenue: 0,
            newCustomers: 0
          });
        }
        const data = channelMap.get(ch.channel);
        data.revenue += ch.netRevenue || 0;
        data.newCustomers += ch.newCustomerCount || 0;
      });
    }
  });

  const totalCustomers = Array.from(channelMap.values()).reduce((sum, ch) => sum + ch.newCustomers, 0);

  // Calculate ROI per channel
  const channelROI = Array.from(channelMap.values()).map(ch => {
    const estimatedSpend = totalCustomers > 0
      ? (ch.newCustomers / totalCustomers) * totalSpend
      : 0;

    const roas = estimatedSpend > 0 ? ch.revenue / estimatedSpend : 0;
    const roi = estimatedSpend > 0
      ? ((ch.revenue - estimatedSpend) / estimatedSpend) * 100
      : 0;

    return {
      channel: ch.channel,
      revenue: Math.round(ch.revenue * 100) / 100,
      estimatedSpend: Math.round(estimatedSpend * 100) / 100,
      profit: Math.round((ch.revenue - estimatedSpend) * 100) / 100,
      roas: Math.round(roas * 100) / 100,
      roi: Math.round(roi),
      newCustomers: ch.newCustomers
    };
  }).sort((a, b) => b.roi - a.roi);

  return {
    timeframe: timeframe,
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    },
    channelROI: channelROI,
    bestChannel: channelROI.length > 0 ? channelROI[0] : null,
    insights: generateChannelROIInsights(channelROI)
  };
}

/**
 * Generate channel ROI insights
 */
function generateChannelROIInsights(channelROI) {
  const insights = [];

  if (channelROI.length === 0) {
    return ['No channel ROI data available'];
  }

  const profitableChannels = channelROI.filter(ch => ch.roi > 0);
  const unprofitableChannels = channelROI.filter(ch => ch.roi < 0);

  insights.push(`${profitableChannels.length} of ${channelROI.length} channels are profitable`);

  if (channelROI[0].roi > 100) {
    insights.push(`${channelROI[0].channel} has excellent ROI (${channelROI[0].roi}%) - prioritize this channel`);
  }

  if (unprofitableChannels.length > 0) {
    insights.push(`Unprofitable channels: ${unprofitableChannels.map(ch => ch.channel).join(', ')} - consider reducing spend`);
  }

  const organicROI = channelROI.find(ch => ch.channel === 'organic');
  if (organicROI && organicROI.roi > 200) {
    insights.push('Organic channel shows exceptional ROI - invest in SEO and content marketing');
  }

  return insights;
}

// ============================================================================
// PHASE 2: USER BEHAVIOR & RETENTION
// ============================================================================

/**
 * Get retention metrics
 * Detailed retention cohort analysis
 */
async function getRetentionMetrics({ timeframe = '30d' }) {
  const { startDate, endDate } = parseTimeframe(timeframe);

  // Get retention metrics for the period
  const retentionData = await RetentionMetrics.find({
    cohortDateObj: { $gte: startDate, $lte: endDate }
  }).sort({ cohortDateObj: -1 });

  if (retentionData.length === 0) {
    return {
      timeframe: timeframe,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      dataAvailable: false,
      message: 'No retention data available for this period'
    };
  }

  // Calculate average retention rates
  const avgDay1 = retentionData.reduce((sum, r) => sum + (r.retention?.day1 || 0), 0) / retentionData.length;
  const avgDay7 = retentionData.reduce((sum, r) => sum + (r.retention?.day7 || 0), 0) / retentionData.length;
  const avgDay30 = retentionData.reduce((sum, r) => sum + (r.retention?.day30 || 0), 0) / retentionData.length;
  const avgRollingDay7 = retentionData.reduce((sum, r) => sum + (r.retention?.rollingDay7 || 0), 0) / retentionData.length;
  const avgRollingDay30 = retentionData.reduce((sum, r) => sum + (r.retention?.rollingDay30 || 0), 0) / retentionData.length;

  // Get recent cohorts for trend analysis
  const recentCohorts = retentionData.slice(0, 7).map(r => ({
    cohortDate: r.cohortDate,
    cohortSize: r.cohortSize,
    day1: r.retention?.day1 || 0,
    day7: r.retention?.day7 || 0,
    day30: r.retention?.day30 || 0
  }));

  // Get retention by channel if available
  const retentionByChannel = await RetentionMetrics.getRetentionByChannel(startDate, endDate);

  return {
    timeframe: timeframe,
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    },
    averageRetention: {
      day1: parseFloat(avgDay1.toFixed(2)),
      day7: parseFloat(avgDay7.toFixed(2)),
      day30: parseFloat(avgDay30.toFixed(2)),
      rollingDay7: parseFloat(avgRollingDay7.toFixed(2)),
      rollingDay30: parseFloat(avgRollingDay30.toFixed(2))
    },
    recentCohorts: recentCohorts,
    retentionByChannel: retentionByChannel,
    insights: generateRetentionInsights(avgDay1, avgDay7, avgDay30)
  };
}

/**
 * Generate retention insights
 */
function generateRetentionInsights(day1, day7, day30) {
  const insights = [];

  if (day1 > 40) {
    insights.push('Good Day 1 retention (>40%) - users find immediate value');
  } else if (day1 > 0 && day1 < 25) {
    insights.push('Low Day 1 retention - improve onboarding experience');
  }

  if (day7 > 20) {
    insights.push('Strong Day 7 retention (>20%) - good engagement in first week');
  } else if (day7 > 0 && day7 < 10) {
    insights.push('Day 7 retention declining - consider push notifications or content updates');
  }

  if (day30 > 10) {
    insights.push('Excellent Day 30 retention (>10%) - users sticking around long-term');
  } else if (day30 > 0 && day30 < 5) {
    insights.push('Low Day 30 retention - work on long-term engagement features');
  }

  return insights;
}

/**
 * Get user activity metrics
 * DAU, WAU, MAU and session analytics
 */
async function getUserActivityMetrics({ days = 30 }) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get retention metrics for activity data
  const activityData = await RetentionMetrics.getRecentActiveUsers(days);

  if (!activityData) {
    return {
      period: {
        days: days,
        start: startDate.toISOString(),
        end: new Date().toISOString()
      },
      dataAvailable: false,
      message: 'No user activity data available'
    };
  }

  // Get Google Analytics data for web traffic
  const webData = await GoogleAnalyticsDaily.getForDateRange(startDate, new Date());
  let webSessions = 0;
  let webUsers = 0;
  if (webData.length > 0) {
    webSessions = webData.reduce((sum, d) => sum + (d.sessions?.totalSessions || 0), 0);
    webUsers = webData.reduce((sum, d) => sum + (d.sessions?.totalUsers || 0), 0);
  }

  // Calculate stickiness (DAU/MAU ratio)
  const stickiness = activityData.avgMAU > 0
    ? (activityData.avgDAU / activityData.avgMAU) * 100
    : 0;

  return {
    period: {
      days: days,
      start: startDate.toISOString(),
      end: new Date().toISOString()
    },
    appMetrics: {
      avgDAU: activityData.avgDAU,
      avgWAU: activityData.avgWAU,
      avgMAU: activityData.avgMAU,
      stickinessRatio: parseFloat(stickiness.toFixed(2)),
      maxDAU: activityData.maxDAU,
      minDAU: activityData.minDAU
    },
    webMetrics: {
      totalSessions: webSessions,
      totalUsers: webUsers,
      avgDailySessions: webData.length > 0 ? Math.round(webSessions / webData.length) : 0
    },
    insights: generateActivityInsights(activityData, stickiness, webUsers)
  };
}

/**
 * Generate activity insights
 */
function generateActivityInsights(activityData, stickiness, webUsers) {
  const insights = [];

  if (stickiness > 50) {
    insights.push('Excellent stickiness (>50%) - highly engaged user base');
  } else if (stickiness > 30) {
    insights.push('Good stickiness - users engage regularly');
  } else if (stickiness > 0) {
    insights.push('Low stickiness - consider daily engagement features like streaks or rewards');
  }

  if (activityData.avgDAU > 0 && webUsers > 0) {
    const appToWebRatio = (activityData.avgDAU / webUsers) * 100;
    if (appToWebRatio > 200) {
      insights.push('App usage significantly higher than web - focus mobile efforts');
    }
  }

  return insights;
}

/**
 * Get subscription tier performance
 * Monthly vs annual vs lifetime breakdown
 */
async function getSubscriptionTierPerformance({ days = 30 }) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get daily revenue aggregates
  const revenueData = await DailyRevenueAggregate.find({
    dateObj: { $gte: startDate }
  }).sort({ dateObj: -1 });

  if (revenueData.length === 0) {
    return {
      period: {
        days: days,
        start: startDate.toISOString(),
        end: new Date().toISOString()
      },
      dataAvailable: false,
      message: 'No subscription tier data available'
    };
  }

  const latest = revenueData[0];
  const oldest = revenueData[revenueData.length - 1];

  // Aggregate tier breakdown over period
  const tierAggregates = {
    trial: { count: 0, revenue: 0 },
    monthly: { count: 0, revenue: 0 },
    annual: { count: 0, revenue: 0 },
    lifetime: { count: 0, revenue: 0 }
  };

  revenueData.forEach(day => {
    if (day.bySubscriptionType) {
      day.bySubscriptionType.forEach(tier => {
        if (tierAggregates[tier.type]) {
          tierAggregates[tier.type].count += tier.count || 0;
          tierAggregates[tier.type].revenue += tier.revenue || 0;
        }
      });
    }
  });

  // Calculate totals
  const totalSubscribers = latest.subscribers?.totalCount || 0;
  const totalRevenue = latest.revenue?.netRevenue || 0;

  // Current tier counts from latest data
  const currentTiers = {
    trial: latest.subscribers?.trialCount || 0,
    monthly: latest.subscribers?.monthlyCount || 0,
    annual: latest.subscribers?.annualCount || 0,
    lifetime: latest.subscribers?.lifetimeCount || 0
  };

  // Calculate MRR contribution by tier
  const mrrByTier = {
    trial: 0, // Trials don't contribute to MRR
    monthly: currentTiers.monthly * 4.99, // Assuming monthly price
    annual: (currentTiers.annual * 39.99) / 12, // Annual price / 12
    lifetime: 0 // One-time purchase
  };

  const totalMRR = Object.values(mrrByTier).reduce((sum, val) => sum + val, 0);

  return {
    period: {
      days: days,
      start: startDate.toISOString(),
      end: new Date().toISOString()
    },
    currentSubscribers: {
      total: totalSubscribers,
      byTier: currentTiers,
      tierPercentages: {
        trial: totalSubscribers > 0 ? Math.round((currentTiers.trial / totalSubscribers) * 100) : 0,
        monthly: totalSubscribers > 0 ? Math.round((currentTiers.monthly / totalSubscribers) * 100) : 0,
        annual: totalSubscribers > 0 ? Math.round((currentTiers.annual / totalSubscribers) * 100) : 0,
        lifetime: totalSubscribers > 0 ? Math.round((currentTiers.lifetime / totalSubscribers) * 100) : 0
      }
    },
    periodRevenue: {
      total: Math.round(tierAggregates.monthly.revenue + tierAggregates.annual.revenue + tierAggregates.lifetime.revenue),
      byTier: {
        trial: Math.round(tierAggregates.trial.revenue),
        monthly: Math.round(tierAggregates.monthly.revenue),
        annual: Math.round(tierAggregates.annual.revenue),
        lifetime: Math.round(tierAggregates.lifetime.revenue)
      }
    },
    mrrContribution: {
      total: Math.round(totalMRR),
      byTier: {
        trial: 0,
        monthly: Math.round(mrrByTier.monthly),
        annual: Math.round(mrrByTier.annual),
        lifetime: 0
      }
    },
    insights: generateTierInsights(currentTiers, totalSubscribers)
  };
}

/**
 * Generate tier insights
 */
function generateTierInsights(currentTiers, totalSubscribers) {
  const insights = [];

  const annualRatio = currentTiers.annual / totalSubscribers;
  if (annualRatio > 0.3) {
    insights.push('Strong annual subscription adoption (>30%) - good for revenue stability');
  } else if (annualRatio < 0.1) {
    insights.push('Low annual adoption - consider promoting annual plan with savings highlight');
  }

  const monthlyRatio = currentTiers.monthly / totalSubscribers;
  if (monthlyRatio > 0.7) {
    insights.push('Most users choose monthly - consider annual upgrade incentives');
  }

  const trialRatio = currentTiers.trial / totalSubscribers;
  if (trialRatio > 0.2) {
    insights.push('High trial percentage - monitor trial-to-paid conversion');
  }

  return insights;
}

// ============================================================================
// PHASE 3: CONTENT & ASO ENHANCEMENTS
// ============================================================================

/**
 * Get keyword performance
 * Apple Search Ads keyword-level performance
 */
async function getKeywordPerformance({ timeframe = '30d', topN = 20 }) {
  const { startDate, endDate } = parseTimeframe(timeframe);

  // Get ASO keywords with ranking history
  const keywords = await ASOKeyword.find({})
    .sort({ opportunityScore: -1 })
    .limit(parseInt(topN));

  if (keywords.length === 0) {
    return {
      timeframe: timeframe,
      topN: topN,
      dataAvailable: false,
      message: 'No keyword performance data available. This requires either: 1) ASO keywords in the ASOKeyword collection, or 2) Apple Search Ads campaigns with keyword data.'
    };
  }

  // Try to get actual spend/performance data from Apple Search Ads service
  let keywordMetrics = [];

  try {
    // This would call the Apple Search Ads API for actual keyword performance
    // For now, we'll use the ASO keyword data
    keywordMetrics = await Promise.all(keywords.map(async (kw) => {
      // Get recent ranking history
      const recentRankings = kw.rankingHistory
        ?.slice(-7)
        .map(h => ({ date: h.date, ranking: h.ranking })) || [];

      const avgRanking = recentRankings.length > 0
        ? recentRankings.reduce((sum, h) => sum + h.ranking, 0) / recentRankings.length
        : kw.ranking;

      return {
        keyword: kw.keyword,
        currentRanking: kw.ranking,
        avgRanking: Math.round(avgRanking),
        searchVolume: kw.volume || 0,
        opportunityScore: kw.opportunityScore || 0,
        rankingTrend: recentRankings.length > 1
          ? (recentRankings[recentRankings.length - 1].ranking - recentRankings[0].ranking) > 0
            ? 'down'
            : 'up'
          : 'stable',
        competitionLevel: kw.competitionLevel || 'unknown'
      };
    }));
  } catch (error) {
    logger.warn('Error fetching keyword performance from ASA API', { error: error.message });
  }

  // Categorize by performance
  const topPerforming = keywordMetrics.filter(k => k.currentRanking <= 10);
  const improving = keywordMetrics.filter(k => k.rankingTrend === 'up');
  const declining = keywordMetrics.filter(k => k.rankingTrend === 'down');

  return {
    timeframe: timeframe,
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    },
    summary: {
      totalKeywords: keywordMetrics.length,
      top10Count: topPerforming.length,
      improvingCount: improving.length,
      decliningCount: declining.length
    },
    keywordMetrics: keywordMetrics.slice(0, parseInt(topN)),
    insights: generateKeywordInsights(keywordMetrics)
  };
}

/**
 * Generate keyword insights
 */
function generateKeywordInsights(keywordMetrics) {
  const insights = [];

  if (keywordMetrics.length === 0) {
    return ['No keyword insights available'];
  }

  const topKeywords = keywordMetrics.filter(k => k.currentRanking <= 10);
  if (topKeywords.length > 0) {
    insights.push(`${topKeywords.length} keywords in top 10: ${topKeywords.map(k => k.keyword).slice(0, 3).join(', ')}`);
  }

  const improving = keywordMetrics.filter(k => k.rankingTrend === 'up');
  if (improving.length > 3) {
    insights.push(`${improving.length} keywords are improving in ranking`);
  }

  const declining = keywordMetrics.filter(k => k.rankingTrend === 'down');
  if (declining.length > 3) {
    insights.push(`${declining.length} keywords are declining - consider optimizing app metadata`);
  }

  const highOpportunity = keywordMetrics.filter(k => k.opportunityScore > 70);
  if (highOpportunity.length > 0) {
    insights.push(`${highOpportunity.length} high-opportunity keywords to target: ${highOpportunity.map(k => k.keyword).slice(0, 3).join(', ')}`);
  }

  return insights;
}

/**
 * Get App Store performance
 * Impressions and conversion rate from App Store Connect
 */
async function getAppStorePerformance({ timeframe = '30d' }) {
  const { startDate, endDate } = parseTimeframe(timeframe);

  // Default metrics
  let appStoreMetrics = {
    impressions: 0,
    productPageViews: 0,
    downloads: 0,
    installs: 0,
    crashes: 0
  };

  // Try to get data from App Store Connect API using the correct method
  try {
    if (appStoreConnectService && appStoreConnectService.isConfigured()) {
      const analyticsData = await appStoreConnectService.fetchAppAnalyticsMetrics(
        process.env.APP_STORE_APP_ID || '6478778123',
        startDate,
        endDate
      );

      if (analyticsData && analyticsData.dailyMetrics) {
        // Aggregate metrics across all days
        const totals = analyticsData.dailyMetrics.reduce((acc, day) => ({
          impressions: acc.impressions + (day.impressions || 0),
          productPageViews: acc.productPageViews + (day.productPageViews || 0),
          installs: acc.installs + (day.installs || 0),
          crashes: acc.crashes + (day.crashes || 0)
        }), { impressions: 0, productPageViews: 0, installs: 0, crashes: 0 });

        appStoreMetrics = {
          ...totals,
          downloads: totals.installs // Use installs as downloads
        };
      }
    }
  } catch (error) {
    logger.warn('Error fetching App Store metrics', { error: error.message });
  }

  // Get ASO scores as fallback/backup
  const asoScores = await ASOScore.find({
    date: { $gte: startDate.toISOString().split('T')[0] }
  }).sort({ date: -1 }).limit(30);

  // Calculate average metrics from ASO scores if available
  let avgASOScore = 0;
  if (asoScores.length > 0) {
    avgASOScore = asoScores.reduce((sum, s) => sum + (s.overallScore || 0), 0) / asoScores.length;
  }

  // Calculate conversion rate
  const conversionRate = appStoreMetrics.productPageViews > 0
    ? (appStoreMetrics.downloads / appStoreMetrics.productPageViews) * 100
    : 0;

  // Check if we have any real data
  const hasData = appStoreMetrics.downloads > 0 || appStoreMetrics.impressions > 0;

  return {
    timeframe: timeframe,
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    },
    metrics: {
      impressions: appStoreMetrics.impressions,
      productPageViews: appStoreMetrics.productPageViews,
      downloads: appStoreMetrics.downloads,
      installs: appStoreMetrics.installs,
      conversionRate: parseFloat(conversionRate.toFixed(2))
    },
    asoMetrics: {
      avgOverallScore: parseFloat(avgASOScore.toFixed(2)),
      dataPoints: asoScores.length
    },
    dataAvailable: hasData,
    message: hasData
      ? null
      : 'No App Store Connect data available. Check APP_STORE_CONNECT_* environment variables.',
    insights: generateAppStoreInsights(conversionRate, appStoreMetrics, avgASOScore)
  };
}

/**
 * Generate App Store insights
 */
function generateAppStoreInsights(conversionRate, metrics, asoScore) {
  const insights = [];

  if (conversionRate > 30) {
    insights.push('Excellent App Store conversion rate (>30%) - product page is optimized');
  } else if (conversionRate > 0 && conversionRate < 15) {
    insights.push('Low conversion rate - consider improving app screenshots, description, or reviews');
  }

  if (metrics.impressions > 0) {
    const viewRate = (metrics.productPageViews / metrics.impressions) * 100;
    if (viewRate < 10) {
      insights.push('Low impression-to-view rate - improve app icon and name in search results');
    }
  }

  if (asoScore < 50) {
    insights.push('ASO score below 50 - improve keyword optimization and app metadata');
  } else if (asoScore > 70) {
    insights.push('Good ASO score - App Store optimization is working well');
  }

  return insights;
}

/**
 * Get optimal posting times
 * Best times by platform and category based on engagement
 */
async function getOptimalPostingTimes({ platform = 'all', category }) {
  // Get all posts with engagement metrics
  const query = {
    status: 'posted',
    'performanceMetrics.views': { $exists: true, $gt: 0 }
  };

  if (platform !== 'all') {
    query.platform = platform;
  }

  if (category) {
    query.category = category;
  }

  const posts = await MarketingPost.find(query)
    .sort({ postedAt: -1 })
    .limit(500);

  if (posts.length === 0) {
    return {
      platform: platform,
      category: category || 'all',
      dataAvailable: false,
      message: 'No posted content with engagement data available'
    };
  }

  // Analyze by hour of day
  const hourStats = {};
  const dayStats = {};

  posts.forEach(post => {
    if (!post.postedAt) return;

    const date = new Date(post.postedAt);
    const hour = date.getHours();
    const day = date.toLocaleDateString('en-US', { weekday: 'long' });

    const engagement = (post.performanceMetrics?.likes || 0) +
                      (post.performanceMetrics?.shares || 0) +
                      (post.performanceMetrics?.comments || 0);
    const views = post.performanceMetrics?.views || 0;
    const engagementRate = views > 0 ? (engagement / views) * 100 : 0;

    // Hour stats
    if (!hourStats[hour]) {
      hourStats[hour] = { totalEngagement: 0, totalViews: 0, count: 0, totalRate: 0 };
    }
    hourStats[hour].totalEngagement += engagement;
    hourStats[hour].totalViews += views;
    hourStats[hour].totalRate += engagementRate;
    hourStats[hour].count++;

    // Day stats
    if (!dayStats[day]) {
      dayStats[day] = { totalEngagement: 0, totalViews: 0, count: 0, totalRate: 0 };
    }
    dayStats[day].totalEngagement += engagement;
    dayStats[day].totalViews += views;
    dayStats[day].totalRate += engagementRate;
    dayStats[day].count++;
  });

  // Calculate averages and sort
  const bestHours = Object.entries(hourStats)
    .map(([hour, stats]) => ({
      hour: parseInt(hour),
      avgEngagementRate: stats.count > 0 ? stats.totalRate / stats.count : 0,
      totalViews: stats.totalViews,
      postCount: stats.count
    }))
    .filter(h => h.postCount >= 3) // Only include hours with at least 3 posts
    .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate)
    .slice(0, 5);

  const bestDays = Object.entries(dayStats)
    .map(([day, stats]) => ({
      day,
      avgEngagementRate: stats.count > 0 ? stats.totalRate / stats.count : 0,
      totalViews: stats.totalViews,
      postCount: stats.count
    }))
    .filter(d => d.postCount >= 3)
    .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate);

  return {
    platform: platform,
    category: category || 'all',
    analyzedPosts: posts.length,
    bestHours: bestHours.map(h => ({
      hour: h.hour,
      timeRange: `${h.hour}:00 - ${h.hour + 1}:00`,
      avgEngagementRate: parseFloat(h.avgEngagementRate.toFixed(2)),
      totalViews: h.totalViews
    })),
    bestDays: bestDays.map(d => ({
      day: d.day,
      avgEngagementRate: parseFloat(d.avgEngagementRate.toFixed(2)),
      totalViews: d.totalViews
    })),
    insights: generatePostingTimeInsights(bestHours, bestDays)
  };
}

/**
 * Generate posting time insights
 */
function generatePostingTimeInsights(bestHours, bestDays) {
  const insights = [];

  if (bestHours.length > 0) {
    const peakHour = bestHours[0];
    insights.push(`Best posting hour: ${peakHour.hour}:00 with ${peakHour.avgEngagementRate}% avg engagement`);
  }

  if (bestDays.length > 0) {
    insights.push(`Best day: ${bestDays[0].day} with ${bestDays[0].avgEngagementRate}% avg engagement`);
  }

  // Check for patterns
  const morningHours = bestHours.filter(h => h.hour >= 6 && h.hour < 12);
  const eveningHours = bestHours.filter(h => h.hour >= 18 && h.hour < 23);

  if (morningHours.length >= 2) {
    insights.push('Morning posts (6am-12pm) perform well - consider scheduling content then');
  } else if (eveningHours.length >= 2) {
    insights.push('Evening posts (6pm-11pm) perform well - target evening engagement');
  }

  return insights;
}

/**
 * Get traffic sources
 * Web and app traffic breakdown
 */
async function getTrafficSources({ days = 30 }) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get Google Analytics traffic sources
  const trafficSources = await GoogleAnalyticsDaily.getTrafficSourcesAggregate(startDate, new Date());

  // Get daily totals for context
  const dailyTotals = await GoogleAnalyticsDaily.getDailyTotals(startDate, new Date());

  const totalSessions = dailyTotals.reduce((sum, d) => sum + (d.sessions || 0), 0);
  const totalUsers = dailyTotals.reduce((sum, d) => sum + (d.users || 0), 0);
  const totalPageViews = dailyTotals.reduce((sum, d) => sum + (d.pageViews || 0), 0);

  // Get app acquisition data from revenue aggregates
  const revenueData = await DailyRevenueAggregate.find({
    dateObj: { $gte: startDate }
  }).sort({ dateObj: -1 });

  let appAcquisition = [];
  if (revenueData.length > 0 && revenueData[0].byChannel) {
    const totalAppCustomers = revenueData[0].byChannel.reduce((sum, ch) => sum + (ch.newCustomerCount || 0), 0);

    appAcquisition = revenueData[0].byChannel.map(ch => ({
      channel: ch.channel,
      newCustomers: ch.newCustomerCount || 0,
      percentage: totalAppCustomers > 0 ? Math.round((ch.newCustomerCount / totalAppCustomers) * 100) : 0
    })).sort((a, b) => b.newCustomers - a.newCustomers);
  }

  return {
    period: {
      days: days,
      start: startDate.toISOString(),
      end: new Date().toISOString()
    },
    webTraffic: {
      totalSessions: totalSessions,
      totalUsers: totalUsers,
      totalPageViews: totalPageViews,
      sources: trafficSources
    },
    appAcquisition: {
      channels: appAcquisition
    },
    insights: generateTrafficInsights(trafficSources, appAcquisition)
  };
}

/**
 * Generate traffic insights
 */
function generateTrafficInsights(webSources, appAcquisition) {
  const insights = [];

  if (webSources.length > 0) {
    const topSource = webSources[0];
    insights.push(`Top web traffic source: ${topSource.source} (${topSource.percentage}%)`);

    const organicSource = webSources.find(s => s.source === 'organic');
    if (organicSource && organicSource.percentage > 40) {
      insights.push('Strong organic search traffic - SEO is working well');
    }

    const socialSource = webSources.find(s => s.source === 'social');
    if (socialSource && socialSource.percentage > 20) {
      insights.push('Significant social media traffic - content marketing is effective');
    }
  }

  if (appAcquisition.length > 0) {
    const organicApp = appAcquisition.find(ch => ch.channel === 'organic');
    const paidApp = appAcquisition.find(ch => ch.channel === 'apple_search_ads');

    if (organicApp && organicApp.percentage > 60) {
      insights.push('Strong organic app acquisition - good ASO and word-of-mouth');
    }

    if (paidApp && paidApp.percentage > 30) {
      insights.push('Significant paid acquisition - Apple Search Ads is driving installs');
    }
  }

  return insights;
}

// ============================================================================
// STRATEGY MEMORY TOOLS - READ ONLY
// ============================================================================

/**
 * Import MarketingStrategy model dynamically to avoid issues
 */
async function getMarketingStrategyModel() {
  const { default: MarketingStrategy } = await import('../../models/MarketingStrategy.js');
  return MarketingStrategy;
}

/**
 * Get strategies with optional filters
 */
async function getStrategies({ status = 'all', level = 'all', category, limit = 50 }) {
  const MarketingStrategy = await getMarketingStrategyModel();

  const query = {};
  if (status !== 'all') {
    query.status = status;
  }
  if (level !== 'all') {
    query.level = level;
  }
  if (category) {
    query.category = category;
  }

  const strategies = await MarketingStrategy.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .lean();

  return {
    count: strategies.length,
    strategies: strategies.map(s => ({
      id: s._id,
      strategyId: s.strategyId,
      name: s.name,
      description: s.description,
      hypothesis: s.hypothesis,
      status: s.status,
      level: s.level,
      category: s.category,
      priority: s.priority,
      successMetric: s.successMetric,
      targetValue: s.targetValue,
      currentBaseline: s.currentBaseline,
      currentValue: s.currentValue,
      progressPercent: s.targetValue > 0 && s.currentBaseline !== undefined
        ? Math.round(((s.currentValue - s.currentBaseline) / (s.targetValue - s.currentBaseline)) * 100)
        : 0,
      createdAt: s.createdAt,
      timeframe: s.timeframe
    }))
  };
}

/**
 * Get strategy details
 */
async function getStrategyDetails({ strategyId }) {
  const MarketingStrategy = await getMarketingStrategyModel();

  const strategy = await MarketingStrategy.findOne({
    $or: [{ _id: strategyId }, { strategyId: strategyId }]
  });

  if (!strategy) {
    return {
      error: 'Strategy not found',
      strategyId
    };
  }

  // Get related data
  const children = await MarketingStrategy.getByParent(strategy.strategyId);
  const progress = {
    baseline: strategy.currentBaseline || 0,
    current: strategy.currentValue || 0,
    target: strategy.targetValue,
    progressPercent: strategy.targetValue > 0 && strategy.currentBaseline !== undefined
      ? Math.round(((strategy.currentValue - strategy.currentBaseline) / (strategy.targetValue - strategy.currentBaseline)) * 100)
      : 0
  };

  return {
    id: strategy._id,
    strategyId: strategy.strategyId,
    name: strategy.name,
    description: strategy.description,
    hypothesis: strategy.hypothesis,
    status: strategy.status,
    level: strategy.level,
    parentStrategyId: strategy.parentStrategyId,
    category: strategy.category,
    priority: strategy.priority,
    successMetric: strategy.successMetric,
    targetValue: strategy.targetValue,
    currentBaseline: strategy.currentBaseline,
    currentValue: strategy.currentValue,
    progress,
    timeframe: strategy.timeframe,
    statusHistory: strategy.statusHistory,
    outcomes: strategy.outcomes,
    relatedGoalIds: strategy.relatedGoalIds,
    tags: strategy.tags,
    notes: strategy.notes,
    createdAt: strategy.createdAt,
    updatedAt: strategy.updatedAt,
    childrenCount: children.length,
    children: children.map(c => ({
      id: c._id,
      strategyId: c.strategyId,
      name: c.name,
      status: c.status,
      progressPercent: c.targetValue > 0 && c.currentBaseline !== undefined
        ? Math.round(((c.currentValue - c.currentBaseline) / (c.targetValue - c.currentBaseline)) * 100)
        : 0
    }))
  };
}

/**
 * Get strategy history (past strategies)
 */
async function getStrategyHistory({ status = 'completed', days = 90, category, limit = 50 }) {
  const MarketingStrategy = await getMarketingStrategyModel();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const query = {
    createdAt: { $gte: startDate }
  };

  if (status !== 'all') {
    query.status = status;
  }

  if (category) {
    query.category = category;
  }

  const strategies = await MarketingStrategy.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .lean();

  return {
    period: {
      days: days,
      start: startDate.toISOString(),
      end: new Date().toISOString()
    },
    count: strategies.length,
    strategies: strategies.map(s => ({
      id: s._id,
      strategyId: s.strategyId,
      name: s.name,
      status: s.status,
      category: s.category,
      successMetric: s.successMetric,
      targetValue: s.targetValue,
      currentValue: s.currentValue,
      outcomes: s.outcomes,
      completedAt: s.statusHistory.find(h => h.status === 'completed')?.changedAt
    }))
  };
}

// ============================================================================
// STRATEGY TOOLS - APPROVAL REQUIRED
// ============================================================================

/**
 * Create a new strategy
 */
async function createStrategy({ name, description, hypothesis, successMetric, targetValue, currentBaseline = 0, level = 'broad', parentStrategyId, timeframe, category = 'general', priority = 5, relatedGoalIds = [] }) {
  const MarketingStrategy = await getMarketingStrategyModel();

  const strategy = new MarketingStrategy({
    name,
    description: description || '',
    hypothesis,
    successMetric,
    targetValue,
    currentBaseline,
    currentValue: currentBaseline,
    level,
    parentStrategyId,
    timeframe: timeframe || {},
    category,
    priority,
    relatedGoalIds,
    status: 'draft',
    createdBy: 'tina',
    autoCreated: true
  });

  await strategy.save();

  return {
    message: 'Strategy created',
    strategy: {
      id: strategy._id,
      strategyId: strategy.strategyId,
      name: strategy.name,
      status: strategy.status,
      level: strategy.level,
      category: strategy.category
    }
  };
}

/**
 * Update a strategy
 */
async function updateStrategy({ strategyId, currentValue, status, notes }) {
  const MarketingStrategy = await getMarketingStrategyModel();

  const strategy = await MarketingStrategy.findOne({
    $or: [{ _id: strategyId }, { strategyId: strategyId }]
  });

  if (!strategy) {
    return {
      error: 'Strategy not found',
      strategyId
    };
  }

  if (currentValue !== undefined) {
    await strategy.updateValue(currentValue);
  }

  if (status && strategy.status !== status) {
    strategy.status = status;
    strategy.addStatusHistory(status, notes || 'Status updated via tool');
    await strategy.save();
  }

  if (notes && !status) {
    await strategy.addNote(notes, 'tina');
  }

  return {
    message: 'Strategy updated',
    strategy: {
      id: strategy._id,
      strategyId: strategy.strategyId,
      name: strategy.name,
      status: strategy.status,
      currentValue: strategy.currentValue
    }
  };
}

/**
 * Complete a strategy with outcomes
 */
async function completeStrategy({ strategyId, outcomes = [], notes = '' }) {
  const MarketingStrategy = await getMarketingStrategyModel();

  const strategy = await MarketingStrategy.findOne({
    $or: [{ _id: strategyId }, { strategyId: strategyId }]
  });

  if (!strategy) {
    return {
      error: 'Strategy not found',
      strategyId
    };
  }

  await strategy.complete(outcomes);

  if (notes) {
    await strategy.addNote(`Completion: ${notes}`, 'tina');
  }

  return {
    message: 'Strategy completed',
    strategy: {
      id: strategy._id,
      strategyId: strategy.strategyId,
      name: strategy.name,
      status: strategy.status,
      outcomes: strategy.outcomes
    }
  };
}

/**
 * Pause a strategy
 */
async function pauseStrategy({ strategyId, reason = '' }) {
  const MarketingStrategy = await getMarketingStrategyModel();

  const strategy = await MarketingStrategy.findOne({
    $or: [{ _id: strategyId }, { strategyId: strategyId }]
  });

  if (!strategy) {
    return {
      error: 'Strategy not found',
      strategyId
    };
  }

  await strategy.pause(reason);

  return {
    message: 'Strategy paused',
    strategy: {
      id: strategy._id,
      strategyId: strategy.strategyId,
      name: strategy.name,
      status: strategy.status
    }
  };
}

/**
 * Resume a paused strategy
 */
async function resumeStrategy({ strategyId }) {
  const MarketingStrategy = await getMarketingStrategyModel();

  const strategy = await MarketingStrategy.findOne({
    $or: [{ _id: strategyId }, { strategyId: strategyId }]
  });

  if (!strategy) {
    return {
      error: 'Strategy not found',
      strategyId
    };
  }

  await strategy.resume();

  return {
    message: 'Strategy resumed',
    strategy: {
      id: strategy._id,
      strategyId: strategy.strategyId,
      name: strategy.name,
      status: strategy.status
    }
  };
}

export default {
  executeTool,
  // Approval-required tools
  updatePostingSchedule,
  updateContentPrompt,
  updateCampaignBudget,
  pauseCampaign,
  approvePendingPosts,
  updateHashtagStrategy,
  createContentExperiment,
  // Strategy tools - approval required
  createStrategy,
  updateStrategy,
  completeStrategy,
  pauseStrategy,
  resumeStrategy,
  // Read-only tools - existing
  getCampaignPerformance,
  getContentAnalytics,
  getBudgetStatus,
  getASOKeywordStatus,
  getRevenueSummary,
  getPendingPosts,
  // Read-only tools - Phase 1: High-Value Tools
  getConversionMetrics,
  getAcquisitionMetrics,
  getLTVByChannel,
  getCampaignROI,
  getSpendByChannel,
  getROIByChannel,
  // Phase 2: User Behavior & Retention
  getRetentionMetrics,
  getUserActivityMetrics,
  getSubscriptionTierPerformance,
  // Phase 3: Content & ASO Enhancements
  getKeywordPerformance,
  getAppStorePerformance,
  getOptimalPostingTimes,
  getTrafficSources,
  // Strategy memory tools - read only
  getStrategies,
  getStrategyDetails,
  getStrategyHistory
};
