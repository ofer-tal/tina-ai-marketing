import schedulerService from '../services/scheduler.js';
import glmService from '../services/glmService.js';
import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';
import AnalyticsMetric from '../models/AnalyticsMetric.js';
import MarketingPost from '../models/MarketingPost.js';
import MarketingRevenue from '../models/MarketingRevenue.js';
import DailySpend from '../models/DailySpend.js';
import ASOKeyword from '../models/ASOKeyword.js';
import { getLogger } from '../utils/logger.js';
import { getBriefingPrompt } from '../services/tinaPersonality.js';

const logger = getLogger('daily-briefing', 'daily-briefing');

/**
 * Daily Briefing Generation Job
 *
 * Generates a comprehensive daily briefing summary each morning:
 * - Yesterday's key metrics (revenue, spend, engagement)
 * - Action items from pending todos
 * - Alerts and notifications
 * - ASO keyword ranking changes
 * - Content performance highlights
 * - AI-powered insights and recommendations
 *
 * Runs daily at a configurable time (default: 08:00 UTC)
 */
class DailyBriefingJob {
  constructor() {
    this.jobName = 'daily-briefing-generation';
    this.isScheduled = false;
  }

  /**
   * Start the scheduled daily briefing job
   * Uses SchedulerService for centralized job management
   *
   * @param {object} options - Scheduling options
   * @param {string} options.scheduleTime - Time in HH:MM format (default: "08:00")
   * @param {string} options.timezone - Timezone for scheduling (default: "UTC")
   */
  start(options = {}) {
    if (this.isScheduled) {
      logger.warn('Daily briefing job already started');
      return;
    }

    try {
      // Get schedule time from environment or options
      const scheduleTime = options.scheduleTime || process.env.DAILY_BRIEFING_TIME || '08:00';
      const timezone = options.timezone || process.env.DAILY_BRIEFING_TIMEZONE || 'UTC';

      // Parse HH:MM format to create cron expression
      const [hour, minute] = scheduleTime.split(':').map(Number);

      if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        throw new Error(`Invalid schedule time format: ${scheduleTime}. Expected HH:MM format (00:00-23:59)`);
      }

      // Create cron expression: "minute hour * * *"
      const cronExpression = `${minute} ${hour} * * *`;

      logger.info('Starting daily briefing scheduler', {
        jobName: this.jobName,
        scheduleTime,
        timezone,
        cronExpression
      });

      // Start the scheduler service if not already running
      if (schedulerService.getStatus().status !== 'running') {
        schedulerService.start();
        logger.info('Scheduler service started');
      }

      // Schedule the job using SchedulerService
      schedulerService.schedule(
        this.jobName,
        cronExpression,
        async () => await this.execute(),
        {
          timezone,
          immediate: options.runImmediately || false
        }
      );

      this.isScheduled = true;
      logger.info('Daily briefing scheduler started successfully', {
        jobName: this.jobName,
        scheduleTime,
        timezone
      });

    } catch (error) {
      logger.error('Failed to start daily briefing scheduler', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Stop the scheduled daily briefing job
   */
  stop() {
    if (!this.isScheduled) {
      logger.warn('Daily briefing job not running');
      return;
    }

    try {
      schedulerService.unschedule(this.jobName);
      this.isScheduled = false;
      logger.info('Daily briefing scheduler stopped', { jobName: this.jobName });
    } catch (error) {
      logger.error('Failed to stop daily briefing scheduler', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Execute the daily briefing generation
   * This is the main job execution method
   */
  async execute() {
    const startTime = Date.now();
    logger.info('Daily briefing generation started', { jobName: this.jobName });

    try {
      // Step 1: Fetch yesterday's metrics
      logger.info('Step 1: Fetching yesterday\'s metrics');
      const metrics = await this.fetchYesterdayMetrics();

      // Step 2: Identify action items
      logger.info('Step 2: Identifying action items');
      const actionItems = await this.identifyActionItems();

      // Step 3: Generate briefing via AI
      logger.info('Step 3: Generating briefing via AI');
      const briefing = await this.generateBriefing(metrics, actionItems);

      // Step 4: Store and notify user
      logger.info('Step 4: Storing briefing and notifying user');
      await this.storeBriefing(briefing);

      const duration = Date.now() - startTime;
      logger.info('Daily briefing generation completed successfully', {
        jobName: this.jobName,
        duration: `${duration}ms`,
        briefingId: briefing._id
      });

      return {
        success: true,
        briefingId: briefing._id,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Daily briefing generation failed', {
        jobName: this.jobName,
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Manually trigger the daily briefing generation
   * Useful for testing or on-demand briefing generation
   */
  async trigger() {
    logger.info('Manual trigger: Daily briefing generation', { jobName: this.jobName });
    return await this.execute();
  }

  /**
   * Fetch yesterday's key metrics
   * @returns {object} Yesterday's metrics
   */
  async fetchYesterdayMetrics() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      logger.info('Fetching metrics for date range', {
        yesterday: yesterday.toISOString(),
        today: today.toISOString()
      });

      // Fetch revenue metrics
      const revenueData = await MarketingRevenue.findOne({
        date: {
          $gte: yesterday,
          $lt: today
        }
      });

      // Fetch content metrics
      const postsData = await MarketingPost.aggregate([
        {
          $match: {
            postedAt: {
              $gte: yesterday,
              $lt: today
            }
          }
        },
        {
          $group: {
            _id: '$platform',
            count: { $sum: 1 },
            totalViews: { $sum: '$performanceMetrics.views' },
            totalLikes: { $sum: '$performanceMetrics.likes' },
            totalComments: { $sum: '$performanceMetrics.comments' },
            totalShares: { $sum: '$performanceMetrics.shares' }
          }
        }
      ]);

      // Fetch ad spend metrics
      const spendData = await DailySpend.findOne({
        date: yesterday
      });

      // Fetch ASO keyword ranking changes
      const keywordData = await ASOKeyword.find({
        lastCheckedAt: {
          $gte: yesterday,
          $lt: today
        }
      }).sort({ opportunityScore: -1 }).limit(10);

      // Fetch analytics metrics for engagement rates
      const engagementMetrics = await AnalyticsMetric.find({
        timestamp: {
          $gte: yesterday,
          $lt: today
        },
        metric: { $in: ['engagement_rate', 'views', 'likes'] }
      });

      // Aggregate metrics
      const metrics = {
        date: yesterday.toISOString().split('T')[0],
        revenue: {
          mrr: revenueData?.mrr || 0,
          netRevenue: revenueData?.netRevenue || 0,
          newSubscribers: revenueData?.newUsers || 0,
          churnedSubscribers: revenueData?.churnedSubscribers || 0
        },
        content: {
          postsPosted: postsData.reduce((sum, p) => sum + p.count, 0),
          totalViews: postsData.reduce((sum, p) => sum + (p.totalViews || 0), 0),
          totalLikes: postsData.reduce((sum, p) => sum + (p.totalLikes || 0), 0),
          totalComments: postsData.reduce((sum, p) => sum + (p.totalComments || 0), 0),
          totalShares: postsData.reduce((sum, p) => sum + (p.totalShares || 0), 0),
          byPlatform: postsData.reduce((acc, p) => {
            acc[p._id] = {
              count: p.count,
              views: p.totalViews,
              likes: p.totalLikes,
              comments: p.totalComments,
              shares: p.totalShares
            };
            return acc;
          }, {})
        },
        ads: {
          totalSpend: spendData?.adSpend || 0,
          platforms: spendData?.byPlatform || {}
        },
        aso: {
          keywordsTracked: keywordData.length,
          topKeywords: keywordData.slice(0, 5).map(k => ({
            keyword: k.keyword,
            ranking: k.ranking,
            change: k.rankingHistory?.length > 1
              ? k.rankingHistory[k.rankingHistory.length - 1].ranking - k.rankingHistory[k.rankingHistory.length - 2].ranking
              : 0
          }))
        },
        engagement: {
          avgRate: engagementMetrics
            .filter(m => m.metric === 'engagement_rate')
            .reduce((sum, m) => sum + m.value, 0) / (engagementMetrics.filter(m => m.metric === 'engagement_rate').length || 1)
        }
      };

      logger.info('Yesterday\'s metrics fetched successfully', {
        revenue: metrics.revenue.netRevenue,
        postsPosted: metrics.content.postsPosted,
        adSpend: metrics.ads.totalSpend
      });

      return metrics;

    } catch (error) {
      logger.error('Failed to fetch yesterday\'s metrics', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Identify action items from todos and alerts
   * @returns {object} Action items
   */
  async identifyActionItems() {
    try {
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      // Fetch pending todos
      const pendingTodos = await mongoose.connection.collection("marketing_tasks")
        .find({
          status: { $in: ['pending', 'in_progress'] },
          dueAt: { $lte: today }
        })
        .sort({ dueAt: 1, priority: -1 })
        .limit(10)
        .toArray();

      // Fetch overdue todos
      const overdueTodos = await mongoose.connection.collection("marketing_tasks")
        .find({
          status: { $in: ['pending', 'in_progress'] },
          dueAt: { $lt: new Date().setHours(0, 0, 0, 0) }
        })
        .sort({ dueAt: 1, priority: -1 })
        .limit(5)
        .toArray();

      // Fetch high priority todos
      const highPriorityTodos = await mongoose.connection.collection("marketing_tasks")
        .find({
          status: { $in: ['pending', 'in_progress'] },
          priority: { $in: ['high', 'urgent'] }
        })
        .sort({ priority: -1, dueAt: 1 })
        .limit(5)
        .toArray();

      // Fetch pending posts for approval
      const pendingPosts = await MarketingPost.countDocuments({
        status: 'ready'
      });

      // Calculate budget utilization
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const monthlySpend = await DailySpend.aggregate([
        {
          $match: {
            date: { $gte: currentMonth }
          }
        },
        {
          $group: {
            _id: null,
            totalSpend: { $sum: '$adSpend' }
          }
        }
      ]);

      const totalSpend = monthlySpend[0]?.totalSpend || 0;
      const monthlyBudget = parseFloat(process.env.MONTHLY_BUDGET_LIMIT || '3000');
      const budgetUtilization = (totalSpend / monthlyBudget) * 100;

      const actionItems = {
        todos: {
          pending: pendingTodos.length,
          overdue: overdueTodos.length,
          highPriority: highPriorityTodos.length,
          items: [
            ...overdueTodos.map(t => ({ ...t, category: 'overdue' })),
            ...highPriorityTodos.slice(0, 3).map(t => ({ ...t, category: 'high_priority' }))
          ]
        },
        content: {
          pendingApproval: pendingPosts
        },
        budget: {
          spent: totalSpend,
          budget: monthlyBudget,
          utilization: budgetUtilization,
          remaining: monthlyBudget - totalSpend,
          needsAttention: budgetUtilization >= 70
        }
      };

      logger.info('Action items identified successfully', {
        pendingTodos: actionItems.todos.pending,
        overdueTodos: actionItems.todos.overdue,
        pendingPosts: actionItems.content.pendingApproval,
        budgetUtilization: `${actionItems.budget.utilization.toFixed(1)}%`
      });

      return actionItems;

    } catch (error) {
      logger.error('Failed to identify action items', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Generate briefing via AI
   * @param {object} metrics - Yesterday's metrics
   * @param {object} actionItems - Action items
   * @returns {object} Generated briefing
   */
  async generateBriefing(metrics, actionItems) {
    try {
      // Prepare briefing data for AI
      const briefingData = {
        date: metrics.date,
        metrics: {
          revenue: metrics.revenue,
          content: metrics.content,
          ads: metrics.ads,
          aso: metrics.aso,
          engagement: metrics.engagement
        },
        actionItems: actionItems
      };

      // Create AI prompt for briefing generation
      const prompt = this.createBriefingPrompt(briefingData);

      // Call GLM service to generate briefing using Tina's personality
      const aiResponse = await glmService.createMessage({
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        system: getBriefingPrompt(),
        maxTokens: 2048
      });

      // Parse AI response
      const briefingContent = aiResponse.content?.[0]?.text || aiResponse.text || 'Unable to generate briefing content.';

      const briefing = {
        date: metrics.date,
        generatedAt: new Date(),
        metrics: metrics,
        actionItems: actionItems,
        summary: briefingContent,
        sections: this.parseBriefingSections(briefingContent),
        status: 'generated'
      };

      logger.info('Briefing generated successfully via AI', {
        date: briefing.date,
        contentLength: briefingContent.length
      });

      return briefing;

    } catch (error) {
      logger.error('Failed to generate briefing via AI', {
        error: error.message,
        stack: error.stack
      });

      // Fallback: Generate basic briefing without AI
      return this.generateFallbackBriefing(metrics, actionItems);
    }
  }

  /**
   * Create briefing prompt for AI
   * @param {object} data - Briefing data
   * @returns {string} AI prompt
   */
  createBriefingPrompt(data) {
    const { metrics, actionItems } = data;

    return `Generate a daily marketing briefing for ${data.date}.

## Yesterday's Performance

**Revenue:**
- MRR: $${metrics.revenue.mrr}
- Net Revenue: $${metrics.revenue.netRevenue}
- New Subscribers: ${metrics.revenue.newSubscribers}
- Churned: ${metrics.revenue.churnedSubscribers}

**Content:**
- Posts Published: ${metrics.content.postsPosted}
- Total Views: ${metrics.content.totalViews.toLocaleString()}
- Total Likes: ${metrics.content.totalLikes.toLocaleString()}
- Avg Engagement Rate: ${(metrics.engagement.avgRate * 100).toFixed(2)}%

**Ad Spend:**
- Total Spent: $${metrics.ads.totalSpend.toFixed(2)}

**ASO:**
- Keywords Tracked: ${metrics.aso.keywordsTracked}
- Top Keywords: ${metrics.aso.topKeywords.map(k => `${k.keyword} (#${k.ranking})`).join(', ')}

## Action Items

**Todos:**
- Pending: ${actionItems.todos.pending}
- Overdue: ${actionItems.todos.overdue}
- High Priority: ${actionItems.todos.highPriority}

**Content:**
- Posts Awaiting Approval: ${actionItems.content.pendingApproval}

**Budget:**
- Utilization: ${actionItems.budget.utilization.toFixed(1)}% ($${actionItems.budget.spent.toFixed(2)} of $${actionItems.budget.budget})
- Remaining: $${actionItems.budget.remaining.toFixed(2)}
${actionItems.budget.needsAttention ? '⚠️ Budget needs attention - over 70% utilized' : ''}

Please provide a concise, actionable briefing that highlights what's working, what needs attention, and the top 3 priorities for today.`;
  }

  /**
   * Parse AI briefing into sections
   * @param {string} content - AI-generated content
   * @returns {object} Parsed sections
   */
  parseBriefingSections(content) {
    const sections = {
      executiveSummary: '',
      keyHighlights: '',
      areasOfAttention: '',
      topPriorities: '',
      quickWins: ''
    };

    // Simple parsing based on markdown headers
    const lines = content.split('\n');
    let currentSection = '';

    lines.forEach(line => {
      if (line.toLowerCase().includes('executive summary')) {
        currentSection = 'executiveSummary';
      } else if (line.toLowerCase().includes('key performance') || line.toLowerCase().includes('highlights')) {
        currentSection = 'keyHighlights';
      } else if (line.toLowerCase().includes('areas need') || line.toLowerCase().includes('attention')) {
        currentSection = 'areasOfAttention';
      } else if (line.toLowerCase().includes('priority') || line.toLowerCase().includes('action items')) {
        currentSection = 'topPriorities';
      } else if (line.toLowerCase().includes('quick win')) {
        currentSection = 'quickWins';
      } else if (line.trim() !== '' && !line.startsWith('#')) {
        sections[currentSection] += line + '\n';
      }
    });

    return sections;
  }

  /**
   * Generate fallback briefing without AI
   * @param {object} metrics - Yesterday's metrics
   * @param {object} actionItems - Action items
   * @returns {object} Fallback briefing
   */
  generateFallbackBriefing(metrics, actionItems) {
    logger.warn('Generating fallback briefing without AI');

    const date = metrics.date;
    const content = `# Daily Briefing - ${date}

## Executive Summary
- MRR: $${metrics.revenue.mrr} (${metrics.revenue.newSubscribers > 0 ? '+' : ''}${metrics.revenue.newSubscribers} new subscribers)
- Content Performance: ${metrics.content.postsPosted} posts, ${metrics.content.totalViews.toLocaleString()} views
- Budget Utilization: ${actionItems.budget.utilization.toFixed(1)}% ($${actionItems.budget.spent.toFixed(2)} of $${actionItems.budget.budget})
- ${actionItems.todos.overdue > 0 ? '⚠️ ' + actionItems.todos.overdue + ' overdue todos need attention' : '✅ All todos up to date'}

## Key Performance Highlights
- Net Revenue: $${metrics.revenue.netRevenue}
- Total Engagement: ${(metrics.engagement.avgRate * 100).toFixed(2)}% avg rate
- ASO Keywords: ${metrics.aso.topKeywords.map(k => `${k.keyword} (#${k.ranking})`).join(', ')}

## Areas Needing Attention
${actionItems.todos.overdue > 0 ? `- ${actionItems.todos.overdue} overdue tasks\n` : ''}${actionItems.budget.needsAttention ? `- Budget at ${actionItems.budget.utilization.toFixed(1)}% - monitor spend\n` : ''}${actionItems.content.pendingApproval > 0 ? `- ${actionItems.content.pendingApproval} posts awaiting approval\n` : ''}

## Top 3 Priority Action Items
1. ${actionItems.todos.items[0]?.title || 'Review dashboard metrics'}
2. ${actionItems.todos.items[1]?.title || 'Approve pending content'}
3. ${actionItems.todos.items[2]?.title || 'Check budget utilization'}

## Quick Wins
- Review top performing content from yesterday
- Approve pending posts for scheduling
- Check ASO keyword ranking changes`;

    return {
      date,
      generatedAt: new Date(),
      metrics,
      actionItems,
      summary: content,
      sections: this.parseBriefingSections(content),
      status: 'fallback',
      fallbackReason: 'AI service unavailable'
    };
  }

  /**
   * Store briefing in database
   * @param {object} briefing - Briefing to store
   * @returns {object} Stored briefing
   */
  async storeBriefing(briefing) {
    try {
      // Note: In a full implementation, we'd have a MarketingBriefing model
      // For now, we'll store it as a strategy document in marketing_strategy collection
      const strategySchema = new mongoose.Schema({
        type: String,
        title: String,
        content: String,
        reasoning: String,
        dataReferences: [Object],
        status: String,
        createdAt: Date,
        updatedAt: Date
      }, { collection: 'marketing_strategy' });
      const Strategy = mongoose.models.Strategy || mongoose.model('Strategy', strategySchema);

      const strategyDoc = await Strategy.create({
        type: 'daily_briefing',
        title: `Daily Briefing - ${briefing.date}`,
        content: briefing.summary,
        reasoning: `AI-generated daily briefing based on metrics from ${briefing.date}`,
        dataReferences: [
          {
            type: 'metrics',
            source: 'daily_briefing_job',
            date: briefing.date,
            summary: JSON.stringify(briefing.metrics)
          },
          {
            type: 'action_items',
            source: 'daily_briefing_job',
            date: briefing.date,
            summary: JSON.stringify(briefing.actionItems)
          }
        ],
        status: 'generated',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      logger.info('Briefing stored successfully', {
        briefingId: strategyDoc._id,
        date: briefing.date
      });

      return {
        _id: strategyDoc._id,
        ...briefing
      };

    } catch (error) {
      logger.error('Failed to store briefing', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get job status
   * @returns {object} Job status
   */
  getStatus() {
    const schedulerStatus = schedulerService.getJobStatus(this.jobName);

    return {
      jobName: this.jobName,
      isScheduled: this.isScheduled,
      schedulerStatus: schedulerStatus
    };
  }
}

// Export singleton instance
const dailyBriefingJob = new DailyBriefingJob();
export default dailyBriefingJob;
