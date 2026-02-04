import glmService from '../glmService.js';
import MarketingRevenue from '../../models/MarketingRevenue.js';
import MarketingPost from '../../models/MarketingPost.js';
import DailySpend from '../../models/DailySpend.js';
import ASOKeyword from '../../models/ASOKeyword.js';
import MarketingGoal from '../../models/MarketingGoal.js';
import { getSystemPrompt } from '../tinaPersonality.js';
import { getLogger } from '../../utils/logger.js';

const logger = getLogger('analysis-handler', 'analysis-handler');

/**
 * Data Analysis Handler
 *
 * Performs deep data analysis and generates insights
 * Fetches real-time data from database for accurate analysis
 */

/**
 * Handle general data analysis requests
 *
 * @param {string} analysisType - Type of analysis (revenue, content, aso, etc.)
 * @param {object} options - Additional options
 * @returns {Promise<object>} Analysis response
 */
export async function handleAnalysisRequest(analysisType = 'general', options = {}) {
  try {
    logger.info('Handling analysis request', { type: analysisType });

    const dataContext = await fetchDataContext();
    const prompt = buildAnalysisPrompt(analysisType, dataContext, options);

    const response = await glmService.createMessage({
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      system: getSystemPrompt(),
      maxTokens: 3072,
      temperature: 0.7
    });

    const content = response.content[0]?.text || '';

    logger.info('Analysis completed', {
      type: analysisType,
      contentLength: content.length
    });

    return {
      type: 'analysis',
      analysisType,
      content,
      dataContext,
      metadata: {
        tokensUsed: response.usage?.totalTokens || 0,
        generatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    logger.error('Error handling analysis request', {
      type: analysisType,
      error: error.message
    });
    throw error;
  }
}

/**
 * Handle deep-dive analysis with specific data queries
 */
export async function handleDeepDiveRequest(query, options = {}) {
  try {
    logger.info('Handling deep dive analysis', { query });

    const dataContext = await fetchDetailedContext(options);
    const prompt = buildDeepDivePrompt(query, dataContext);

    const response = await glmService.createMessage({
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      system: getSystemPrompt(),
      maxTokens: 4096,
      temperature: 0.7
    });

    const content = response.content[0]?.text || '';

    return {
      type: 'deep_dive',
      content,
      query,
      dataContext,
      recommendations: extractRecommendations(content)
    };
  } catch (error) {
    logger.error('Error handling deep dive', {
      query,
      error: error.message
    });
    throw error;
  }
}

/**
 * Fetch comprehensive data context from database
 */
export async function fetchDataContext() {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch revenue metrics
    const revenueData = await MarketingRevenue.find({
      date: { $gte: thirtyDaysAgo }
    }).sort({ date: -1 }).limit(30);

    const latestRevenue = revenueData[0];
    const revenue = {
      mrr: latestRevenue?.mrr || 0,
      subscribers: latestRevenue?.activeSubscribers || 0,
      arpu: latestRevenue?.arpu || 0,
      trend: calculateTrend(revenueData),
      netRevenue: latestRevenue?.netRevenue || 0,
      newUsers: latestRevenue?.newUsers || 0,
      churnedSubscribers: latestRevenue?.churnedSubscribers || 0
    };

    // Fetch content performance
    const contentData = await MarketingPost.find({
      postedAt: { $gte: thirtyDaysAgo }
    }).sort({ postedAt: -1 }).limit(50);

    const content = {
      totalPosts: contentData.length,
      avgEngagement: calculateAvgEngagement(contentData),
      topCategories: analyzeTopCategories(contentData),
      recentPosts: contentData.slice(0, 10).map(p => ({
        id: p._id,
        title: p.title || p.category,
        platform: p.platform,
        views: p.performanceMetrics?.views || 0,
        likes: p.performanceMetrics?.likes || 0,
        engagementRate: p.performanceMetrics?.engagementRate || 0,
        category: p.category,
        spiciness: p.spicinessLevel
      })),
      byPlatform: analyzeByPlatform(contentData)
    };

    // Fetch spend data
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const spendData = await DailySpend.findOne({
      date: yesterday.toISOString().split('T')[0]
    });

    // Fetch ASO keywords
    const keywordData = await ASOKeyword.find({})
      .sort({ ranking: 1 })
      .limit(20);

    const keywords = keywordData.slice(0, 10).map(k => ({
      keyword: k.keyword,
      ranking: k.ranking,
      change: calculateRankingChange(k),
      opportunityScore: k.opportunityScore
    }));

    // Calculate budget utilization
    const currentMonth = new Date();
    currentMonth.setDate(1);
    const monthlySpend = await DailySpend.aggregate([
      { $match: { date: { $gte: currentMonth } } },
      { $group: { _id: null, totalSpend: { $sum: '$adSpend' } } }
    ]);
    const totalSpend = monthlySpend[0]?.totalSpend || 0;
    const monthlyBudget = parseFloat(process.env.MONTHLY_BUDGET_LIMIT || '3000');
    const budgetUtilization = (totalSpend / monthlyBudget) * 100;

    // Fetch active goals for Tina's context
    const goalsData = await MarketingGoal.find({
      status: { $in: ['active', 'at_risk', 'behind', 'ahead'] }
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const goals = goalsData.map(g => ({
      goalId: g.goalId,
      name: g.name,
      type: g.type,
      status: g.status,
      progressPercent: g.progressPercent || 0,
      currentValue: g.currentValue,
      targetValue: g.targetValue,
      startValue: g.startValue,
      trajectory: {
        trend: g.trajectory?.trend || 'unknown',
        lastCalculated: g.trajectory?.lastCalculated
      },
      targetDate: g.targetDate,
      linkedStrategies: g.linkedStrategies?.length || 0
    }));

    return {
      revenue,
      content,
      spend: totalSpend,
      budgetUtilization,
      keywords,
      goals,
      lastFetched: now.toISOString()
    };
  } catch (error) {
    logger.error('Error fetching data context', {
      error: error.message
    });
    // Return empty context on error
    return {
      revenue: { mrr: 0, subscribers: 0 },
      content: { avgEngagement: 0, topCategories: [] },
      spend: 0,
      keywords: [],
      goals: [],
      error: error.message
    };
  }
}

/**
 * Fetch detailed context for deep-dive analysis
 */
async function fetchDetailedContext(options = {}) {
  const context = await fetchDataContext();

  // Add additional detail based on options
  if (options.includeRawPosts) {
    const rawPosts = await MarketingPost.find({})
      .sort({ postedAt: -1 })
      .limit(options.postLimit || 100);

    context.rawPosts = rawPosts.map(p => ({
      id: p._id,
      title: p.title,
      category: p.category,
      platform: p.platform,
      postedAt: p.postedAt,
      performance: p.performanceMetrics,
      spicinessLevel: p.spicinessLevel,
      hashtags: p.hashtags
    }));
  }

  if (options.includeRevenueHistory) {
    const revenueHistory = await MarketingRevenue.find({})
      .sort({ date: -1 })
      .limit(options.revenueLimit || 90);

    context.revenueHistory = revenueHistory.map(r => ({
      date: r.date,
      mrr: r.mrr,
      subscribers: r.activeSubscribers,
      netRevenue: r.netRevenue
    }));
  }

  return context;
}

/**
 * Build analysis prompt
 */
function buildAnalysisPrompt(analysisType, dataContext, options) {
  const baseContext = formatDataContext(dataContext);

  const typePrompts = {
    revenue: `${baseContext}

**Analyze:**
1. Revenue trajectory and growth rate
2. Subscriber trends (growth vs churn)
3. ARPU changes and implications
4. Revenue quality and sustainability
5. What's driving growth/decline?

Be specific with numbers. Identify the GOOD and the BAD clearly.`,

    content: `${baseContext}

**Analyze:**
1. Which content categories are OVERPERFORMING?
2. Which are UNDERPERFORMING?
3. Optimal spiciness level for engagement
4. Platform performance comparison
5. Content series opportunities
6. What should we make MORE of? What should we STOP?

Use actual data. Be ruthless about cutting what doesn't work.`,

    aso: `${baseContext}

**Analyze:**
1. Keyword ranking trends (improving vs declining)
2. High-opportunity keywords we're not targeting
3. Keyword gaps vs competitors
4. What ASO improvements would move the needle most?
5. Estimated impact of ranking improvements

Focus on keywords that actually drive installs, not just vanity metrics.`,

    general: `${baseContext}

**Provide a comprehensive analysis covering:**
1. Revenue health and trajectory
2. Content performance insights
3. Budget/ROI efficiency
4. ASO/Keyword status
5. Top 3 opportunities for growth
6. What needs attention RIGHT NOW

Be honest. Use data. Prioritize impact.`
  };

  return typePrompts[analysisType] || typePrompts.general;
}

/**
 * Build deep-dive prompt
 */
function buildDeepDivePrompt(query, dataContext) {
  return `As Tina, perform a deep-dive analysis on this question:

**QUESTION:**
${query}

**AVAILABLE DATA:**
${formatDataContext(dataContext)}

**Your task:**
1. Answer the question directly and honestly
2. Use the data to back up your analysis
3. Identify patterns and insights others might miss
4. Provide specific, actionable recommendations
5. If something is missing from the data that we need, insist on building it

Remember: Be thorough. Don't just summarize - SYNTHESIZE and provide INSIGHT.`;
}

/**
 * Format data context for prompts
 */
function formatDataContext(dataContext) {
  const sections = ['**CURRENT DATA CONTEXT:**'];

  // Goals first - highest priority for context
  if (dataContext.goals && dataContext.goals.length > 0) {
    sections.push(`
**ACTIVE GOALS:**
${dataContext.goals.map(g =>
  `- ${g.name}: ${g.progressPercent?.toFixed(0) || 0}% complete (${g.status}, ${g.trajectory?.trend || 'unknown'} trajectory)`
).join('\n')}
**Current Focus:** ${dataContext.goals.find(g => g.status === 'at_risk')?.name || dataContext.goals[0]?.name || 'No active goals'}`);
  }

  if (dataContext.revenue) {
    const { mrr, subscribers, arpu, trend, netRevenue, newUsers, churnedSubscribers } = dataContext.revenue;
    sections.push(`
**REVENUE:**
- MRR: $${mrr}
- Subscribers: ${subscribers}
- ARPU: $${arpu?.toFixed(2) || '0.00'}
- Net Revenue (month): $${netRevenue?.toFixed(2) || '0.00'}
- New Users: ${newUsers}
- Churned: ${churnedSubscribers}
- Trend: ${trend || 'stable'}`);
  }

  if (dataContext.content) {
    const { totalPosts, avgEngagement, topCategories, byPlatform } = dataContext.content;
    sections.push(`
**CONTENT:**
- Total Posts (30d): ${totalPosts}
- Avg Engagement: ${(avgEngagement * 100).toFixed(1)}%
- Top Categories: ${topCategories?.slice(0, 3).map(c => `${c.category} (${(c.avgEngagement * 100).toFixed(1)}%)`).join(', ') || 'N/A'}
- By Platform: ${Object.entries(byPlatform || {}).map(([p, d]) => `${p}: ${d.count} posts`).join(', ') || 'N/A'}`);
  }

  if (dataContext.spend !== undefined || dataContext.budgetUtilization !== undefined) {
    sections.push(`
**BUDGET:**
- Monthly Spend: $${dataContext.spend || 0}
- Budget Utilization: ${(dataContext.budgetUtilization || 0).toFixed(1)}%`);
  }

  if (dataContext.keywords && dataContext.keywords.length > 0) {
    sections.push(`
**ASO KEYWORDS:**
${dataContext.keywords.slice(0, 5).map(k => `- ${k.keyword}: #${k.ranking} (${k.change >= 0 ? '+' : ''}${k.change})`).join('\n')}`);
  }

  return sections.join('\n');
}

/**
 * Calculate revenue trend
 */
function calculateTrend(revenueData) {
  if (!revenueData || revenueData.length < 2) return 'unknown';

  const recent = revenueData.slice(0, 7).reduce((sum, r) => sum + (r.mrr || 0), 0) / Math.min(7, revenueData.length);
  const older = revenueData.slice(7, 14).reduce((sum, r) => sum + (r.mrr || 0), 0) / Math.min(7, revenueData.length - 7);

  if (recent > older * 1.05) return 'growing';
  if (recent < older * 0.95) return 'declining';
  return 'stable';
}

/**
 * Calculate average engagement
 */
function calculateAvgEngagement(posts) {
  if (!posts || posts.length === 0) return 0;

  const totalEngagement = posts.reduce((sum, p) => {
    const views = p.performanceMetrics?.views || 0;
    const likes = p.performanceMetrics?.likes || 0;
    const comments = p.performanceMetrics?.comments || 0;
    const shares = p.performanceMetrics?.shares || 0;

    return sum + (views > 0 ? (likes + comments + shares) / views : 0);
  }, 0);

  return totalEngagement / posts.length;
}

/**
 * Analyze top performing categories
 */
function analyzeTopCategories(posts) {
  const categoryStats = {};

  posts.forEach(post => {
    const cat = post.category || 'Uncategorized';
    if (!categoryStats[cat]) {
      categoryStats[cat] = { count: 0, totalEngagement: 0, totalViews: 0 };
    }
    categoryStats[cat].count++;
    categoryStats[cat].totalEngagement += post.performanceMetrics?.engagementRate || 0;
    categoryStats[cat].totalViews += post.performanceMetrics?.views || 0;
  });

  return Object.entries(categoryStats)
    .map(([category, stats]) => ({
      category,
      count: stats.count,
      avgEngagement: stats.totalEngagement / stats.count,
      totalViews: stats.totalViews
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);
}

/**
 * Analyze performance by platform
 */
function analyzeByPlatform(posts) {
  const platformStats = {};

  posts.forEach(post => {
    const platform = post.platform || 'unknown';
    if (!platformStats[platform]) {
      platformStats[platform] = { count: 0, totalViews: 0, totalEngagement: 0 };
    }
    platformStats[platform].count++;
    platformStats[platform].totalViews += post.performanceMetrics?.views || 0;
    platformStats[platform].totalEngagement += post.performanceMetrics?.engagementRate || 0;
  });

  const result = {};
  Object.entries(platformStats).forEach(([platform, stats]) => {
    result[platform] = {
      count: stats.count,
      avgViews: stats.totalViews / stats.count,
      avgEngagement: stats.totalEngagement / stats.count
    };
  });

  return result;
}

/**
 * Calculate keyword ranking change
 */
function calculateRankingChange(keyword) {
  if (!keyword.rankingHistory || keyword.rankingHistory.length < 2) {
    return 0;
  }
  const current = keyword.ranking;
  const previous = keyword.rankingHistory[keyword.rankingHistory.length - 2].ranking;
  return previous - current; // Positive means improvement (ranking went down)
}

/**
 * Extract recommendations from AI response
 */
function extractRecommendations(content) {
  const recommendations = [];
  const lines = content.split('\n');
  let inRecSection = false;

  for (const line of lines) {
    if (line.toLowerCase().includes('recommend') || line.toLowerCase().includes('next step')) {
      inRecSection = true;
    }
    if (inRecSection && (line.match(/^\d+\./) || line.match(/^[-•*]/))) {
      recommendations.push(line.replace(/^\d+\.[-\s]*|[-•*]\s*/, '').trim());
    }
  }

  return recommendations.slice(0, 5);
}

export default {
  handleAnalysisRequest,
  handleDeepDiveRequest,
  fetchDataContext,
  fetchDetailedContext
};
