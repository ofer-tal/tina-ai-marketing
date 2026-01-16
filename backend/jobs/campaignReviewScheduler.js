import schedulerService from '../services/scheduler.js';
import appleSearchAdsService from '../services/appleSearchAdsService.js';
import glmService from '../services/glmService.js';
import mongoose from 'mongoose';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('campaign-review-scheduler', 'campaign-review-scheduler');

/**
 * Campaign Review Scheduler Job
 *
 * Performs weekly campaign reviews and analysis:
 * - Fetches campaign performance data from Apple Search Ads
 * - Analyzes spend, impressions, conversions, and ROI
 * - Generates AI-powered insights and recommendations
 * - Creates review todo for founder approval
 * - Sends notification with review summary
 *
 * Runs weekly (default: every Friday at 15:00 UTC)
 */
class CampaignReviewSchedulerJob {
  constructor() {
    this.jobName = 'campaign-review-scheduler';
    this.isScheduled = false;
  }

  /**
   * Start the scheduled campaign review job
   * Uses SchedulerService for centralized job management
   *
   * @param {object} options - Scheduling options
   * @param {string} options.dayOfWeek - Day of week (default: "friday")
   * @param {string} options.scheduleTime - Time in HH:MM format (default: "15:00")
   * @param {string} options.timezone - Timezone for scheduling (default: "UTC")
   */
  start(options = {}) {
    if (this.isScheduled) {
      logger.warn('Campaign review scheduler already started');
      return;
    }

    try {
      // Get schedule configuration from environment or options
      const dayOfWeek = options.dayOfWeek || process.env.CAMPAIGN_REVIEW_DAY || 'friday';
      const scheduleTime = options.scheduleTime || process.env.CAMPAIGN_REVIEW_TIME || '15:00';
      const timezone = options.timezone || process.env.CAMPAIGN_REVIEW_TIMEZONE || 'UTC';

      // Parse HH:MM format
      const [hour, minute] = scheduleTime.split(':').map(Number);

      if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        throw new Error(`Invalid schedule time format: ${scheduleTime}. Expected HH:MM format (00:00-23:59)`);
      }

      // Map day of week to cron day number (0=Sunday, 1=Monday, etc.)
      const dayMap = {
        'sunday': 0,
        'monday': 1,
        'tuesday': 2,
        'wednesday': 3,
        'thursday': 4,
        'friday': 5,
        'saturday': 6
      };

      const dayNumber = dayMap[dayOfWeek.toLowerCase()];
      if (dayNumber === undefined) {
        throw new Error(`Invalid day of week: ${dayOfWeek}. Expected: sunday, monday, tuesday, wednesday, thursday, friday, saturday`);
      }

      // Create cron expression: "minute hour dayOfMonth month dayOfWeek"
      const cronExpression = `${minute} ${hour} * * ${dayNumber}`;

      logger.info('Starting campaign review scheduler', {
        jobName: this.jobName,
        dayOfWeek,
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
      logger.info('Campaign review scheduler started successfully', {
        jobName: this.jobName,
        dayOfWeek,
        scheduleTime,
        timezone
      });

    } catch (error) {
      logger.error('Failed to start campaign review scheduler', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Stop the scheduled campaign review job
   */
  stop() {
    if (!this.isScheduled) {
      logger.warn('Campaign review scheduler not running');
      return;
    }

    try {
      schedulerService.unschedule(this.jobName);
      this.isScheduled = false;
      logger.info('Campaign review scheduler stopped', { jobName: this.jobName });
    } catch (error) {
      logger.error('Failed to stop campaign review scheduler', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Execute the campaign review
   * This is the main job execution method
   */
  async execute() {
    const startTime = Date.now();
    logger.info('Campaign review started', { jobName: this.jobName });

    try {
      // Step 1: Fetch campaign performance
      logger.info('Step 1: Fetching campaign performance data');
      const campaignData = await this.fetchCampaignPerformance();

      // Step 2: Generate analysis
      logger.info('Step 2: Generating campaign analysis');
      const analysis = await this.generateAnalysis(campaignData);

      // Step 3: Create review todo
      logger.info('Step 3: Creating review todo');
      await this.createReviewTodo(analysis);

      // Step 4: Notify user
      logger.info('Step 4: Sending notification to user');
      await this.notifyUser(analysis);

      const duration = Date.now() - startTime;
      logger.info('Campaign review completed successfully', {
        jobName: this.jobName,
        durationMs: duration,
        campaignsAnalyzed: campaignData.campaigns?.length || 0
      });

      return {
        success: true,
        campaignsAnalyzed: campaignData.campaigns?.length || 0,
        analysis,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Campaign review failed', {
        jobName: this.jobName,
        error: error.message,
        stack: error.stack,
        duration
      });
      throw error;
    }
  }

  /**
   * Step 1: Fetch campaign performance data
   * Retrieves campaign metrics from Apple Search Ads
   */
  async fetchCampaignPerformance() {
    try {
      // Check if Apple Search Ads service is configured
      if (!appleSearchAdsService.isConfigured()) {
        logger.warn('Apple Search Ads not configured, using mock data');
        return this.getMockCampaignData();
      }

      // Fetch campaigns from Apple Search Ads
      logger.info('Fetching campaigns from Apple Search Ads API');
      const campaignsResult = await appleSearchAdsService.getCampaigns(100, 0);

      if (!campaignsResult.success || !campaignsResult.data) {
        logger.warn('Failed to fetch campaigns, using mock data');
        return this.getMockCampaignData();
      }

      const campaigns = campaignsResult.data;

      // Calculate performance metrics
      const totalSpend = campaigns.reduce((sum, campaign) => {
        return sum + (campaign.budget?.amount || 0);
      }, 0);

      const totalImpressions = campaigns.reduce((sum, campaign) => {
        return sum + (campaign.impressions || 0);
      }, 0);

      const totalConversions = campaigns.reduce((sum, campaign) => {
        return sum + (campaign.conversions || campaign.installs || 0);
      }, 0);

      // Calculate average metrics
      const avgSpend = campaigns.length > 0 ? totalSpend / campaigns.length : 0;
      const avgImpressions = campaigns.length > 0 ? totalImpressions / campaigns.length : 0;

      // Identify top performing campaigns
      const topCampaigns = campaigns
        .filter(c => c.conversions || c.installs)
        .sort((a, b) => (b.conversions || b.installs || 0) - (a.conversions || a.installs || 0))
        .slice(0, 5);

      // Identify underperforming campaigns
      const underperformingCampaigns = campaigns
        .filter(c => (c.impressions || 0) > 100 && (c.conversions || c.installs || 0) < 5)
        .sort((a, b) => (a.conversions || a.installs || 0) - (b.conversions || b.installs || 0))
        .slice(0, 5);

      logger.info('Campaign performance data fetched', {
        totalCampaigns: campaigns.length,
        totalSpend,
        totalImpressions,
        totalConversions,
        topCampaigns: topCampaigns.length,
        underperforming: underperformingCampaigns.length
      });

      return {
        success: true,
        campaigns,
        summary: {
          totalCampaigns: campaigns.length,
          totalSpend,
          totalImpressions,
          totalConversions,
          avgSpend,
          avgImpressions,
          topCampaigns,
          underperformingCampaigns,
          fetchDate: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('Error fetching campaign performance', {
        error: error.message,
        stack: error.stack
      });
      // Return mock data on error
      return this.getMockCampaignData();
    }
  }

  /**
   * Generate mock campaign data for testing/fallback
   */
  getMockCampaignData() {
    const mockCampaigns = [
      {
        id: 'mock-1',
        name: 'Blush - Romantic Stories',
        budget: { amount: 500, currency: 'USD' },
        impressions: 45230,
        taps: 1234,
        conversions: 89,
        installs: 85,
        spend: 234.56,
        status: 'ACTIVE'
      },
      {
        id: 'mock-2',
        name: 'Blush - Spicy Content',
        budget: { amount: 300, currency: 'USD' },
        impressions: 28450,
        taps: 789,
        conversions: 56,
        installs: 54,
        spend: 145.23,
        status: 'ACTIVE'
      },
      {
        id: 'mock-3',
        name: 'Blush - Generic Keywords',
        budget: { amount: 200, currency: 'USD' },
        impressions: 15670,
        taps: 234,
        conversions: 12,
        installs: 11,
        spend: 89.45,
        status: 'ACTIVE'
      }
    ];

    const totalSpend = mockCampaigns.reduce((sum, c) => sum + c.spend, 0);
    const totalImpressions = mockCampaigns.reduce((sum, c) => sum + c.impressions, 0);
    const totalConversions = mockCampaigns.reduce((sum, c) => sum + c.conversions, 0);

    return {
      success: true,
      campaigns: mockCampaigns,
      summary: {
        totalCampaigns: mockCampaigns.length,
        totalSpend,
        totalImpressions,
        totalConversions,
        avgSpend: totalSpend / mockCampaigns.length,
        avgImpressions: totalImpressions / mockCampaigns.length,
        topCampaigns: [mockCampaigns[0], mockCampaigns[1]],
        underperformingCampaigns: [mockCampaigns[2]],
        fetchDate: new Date().toISOString(),
        mock: true
      }
    };
  }

  /**
   * Step 2: Generate campaign analysis
   * Uses AI to analyze performance and provide recommendations
   */
  async generateAnalysis(campaignData) {
    try {
      const { campaigns, summary } = campaignData;

      // Calculate performance metrics
      const avgCPA = summary.totalConversions > 0
        ? summary.totalSpend / summary.totalConversions
        : 0;

      const avgCPI = summary.totalConversions > 0
        ? summary.totalSpend / summary.totalConversions
        : 0;

      const conversionRate = summary.totalImpressions > 0
        ? (summary.totalConversions / summary.totalImpressions) * 100
        : 0;

      const tapThroughRate = summary.totalImpressions > 0
        ? (campaigns.reduce((sum, c) => sum + (c.taps || 0), 0) / summary.totalImpressions) * 100
        : 0;

      // Identify insights
      const insights = [];
      insights.push(`Total spend of $${summary.totalSpend.toFixed(2)} across ${summary.totalCampaigns} campaigns`);
      insights.push(`Generated ${summary.totalConversions} conversions at $${avgCPA.toFixed(2)} per acquisition`);
      insights.push(`Average conversion rate: ${conversionRate.toFixed(2)}%`);

      if (summary.underperformingCampaigns.length > 0) {
        insights.push(`${summary.underperformingCampaigns.length} campaign(s) underperforming with low conversions`);
      }

      if (summary.topCampaigns.length > 0) {
        insights.push(`Top campaign: ${summary.topCampaigns[0].name} with ${summary.topCampaigns[0].conversions} conversions`);
      }

      // Generate AI-powered recommendations
      let aiRecommendations = [];
      try {
        const prompt = `As an AI Marketing Executive, analyze this Apple Search Ads campaign performance and provide 3-5 actionable recommendations:

Campaign Summary:
- Total Campaigns: ${summary.totalCampaigns}
- Total Spend: $${summary.totalSpend.toFixed(2)}
- Total Conversions: ${summary.totalConversions}
- Cost Per Acquisition (CPA): $${avgCPA.toFixed(2)}
- Conversion Rate: ${conversionRate.toFixed(2)}%
- Tap Through Rate: ${tapThroughRate.toFixed(2)}%

Top Performing Campaigns:
${summary.topCampaigns.map(c => `- ${c.name}: ${c.conversions} conversions, $${c.spend.toFixed(2)} spend`).join('\n')}

Underperforming Campaigns:
${summary.underperformingCampaigns.map(c => `- ${c.name}: ${c.conversions} conversions, ${c.impressions} impressions`).join('\n')}

Provide specific, actionable recommendations to improve campaign performance. Format as a numbered list.`;

        const aiResponse = await glmService.generateResponse(prompt, 'campaign-review-analysis');

        if (aiResponse && aiResponse.content) {
          // Parse recommendations from AI response
          aiRecommendations = aiResponse.content
            .split('\n')
            .filter(line => line.trim().length > 0)
            .map(line => line.replace(/^\d+\.\s*/, '').trim())
            .filter(line => line.length > 10)
            .slice(0, 5);
        }
      } catch (error) {
        logger.warn('Failed to generate AI recommendations', {
          error: error.message
        });
        // Fallback to default recommendations
        aiRecommendations = [
          'Review underperforming campaigns and consider pausing or adjusting bids',
          'Increase budget on top-performing campaigns to maximize ROI',
          'Test new keyword themes to expand reach',
          'Optimize ad creative for higher conversion rates'
        ];
      }

      logger.info('Campaign analysis generated', {
        insightsCount: insights.length,
        recommendationsCount: aiRecommendations.length
      });

      return {
        success: true,
        summary,
        metrics: {
          avgCPA,
          avgCPI,
          conversionRate,
          tapThroughRate
        },
        insights,
        recommendations: aiRecommendations,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error generating campaign analysis', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Step 3: Create review todo
   * Stores the campaign review as a todo item
   */
  async createReviewTodo(analysis) {
    try {
      const { summary, recommendations } = analysis;

      // Create todo title
      const todoTitle = `📊 Weekly Campaign Review - ${new Date().toLocaleDateString()}`;

      // Create todo description
      const todoDescription = `
# Campaign Performance Summary

- **Total Spend:** $${summary.totalSpend.toFixed(2)}
- **Campaigns:** ${summary.totalCampaigns}
- **Conversions:** ${summary.totalConversions}
- **Avg CPA:** $${analysis.metrics.avgCPA.toFixed(2)}
- **Conversion Rate:** ${analysis.metrics.conversionRate.toFixed(2)}%

## Top Performing Campaigns

${summary.topCampaigns.map(c => `
- **${c.name}**
  - Conversions: ${c.conversions}
  - Spend: $${c.spend.toFixed(2)}
  - CPA: $${(c.spend / c.conversions).toFixed(2)}
`).join('\n')}

${summary.underperformingCampaigns.length > 0 ? `
## Underperforming Campaigns

${summary.underperformingCampaigns.map(c => `
- **${c.name}**
  - Conversions: ${c.conversions}
  - Impressions: ${c.impressions}
  - Spend: $${c.spend.toFixed(2)}
`).join('\n')}
` : ''}

## Recommendations

${recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

---

**Review Date:** ${new Date().toISOString()}
**Action Required:** Review and approve optimization actions
`;

      // Create todo object
      const todo = {
        type: 'campaign_review',
        status: 'pending',
        priority: 'medium',
        title: todoTitle,
        description: todoDescription,
        actionItems: recommendations.map(rec => ({
          task: rec,
          status: 'pending',
          createdAt: new Date().toISOString()
        })),
        campaignData: {
          summary,
          metrics: analysis.metrics,
          insights: analysis.insights
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Due in 7 days
        notificationSent: false
      };

      // Insert into marketing_strategy collection
      const collection = mongoose.connection.collection('marketing_strategy');
      const result = await collection.insertOne(todo);

      logger.info('Campaign review todo created', {
        todoId: result.insertedId.toString(),
        title: todoTitle,
        priority: todo.priority,
        actionItems: todo.actionItems.length
      });

      return {
        success: true,
        todoId: result.insertedId.toString(),
        todo
      };

    } catch (error) {
      logger.error('Error creating campaign review todo', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Step 4: Notify user
   * Sends notification about the campaign review
   */
  async notifyUser(analysis) {
    try {
      const { summary, recommendations } = analysis;

      // Create notification message
      const notification = {
        type: 'campaign_review',
        title: '📊 Weekly Campaign Review Ready',
        message: `Your weekly campaign review is ready. You spent $${summary.totalSpend.toFixed(2)} across ${summary.totalCampaigns} campaigns with ${summary.totalConversions} conversions. ${recommendations.length} recommendations are ready for your review.`,
        priority: 'normal',
        actionUrl: '/todos',
        actionLabel: 'View Campaign Review',
        data: {
          totalSpend: summary.totalSpend,
          totalCampaigns: summary.totalCampaigns,
          totalConversions: summary.totalConversions,
          recommendationsCount: recommendations.length,
          reviewDate: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        read: false
      };

      // Store notification in marketing_strategy collection
      const collection = mongoose.connection.collection('marketing_strategy');
      await collection.insertOne({
        ...notification,
        notificationType: 'campaign_review',
        status: 'unread'
      });

      logger.info('Campaign review notification sent', {
        title: notification.title,
        priority: notification.priority
      });

      // Log notification to console for development mode
      console.log('\n' + '='.repeat(60));
      console.log('📊 CAMPAIGN REVIEW NOTIFICATION');
      console.log('='.repeat(60));
      console.log(notification.message);
      console.log(`\nView your review: ${notification.actionUrl}`);
      console.log('='.repeat(60) + '\n');

      return {
        success: true,
        notification
      };

    } catch (error) {
      logger.error('Error sending campaign review notification', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get job status
   */
  getStatus() {
    return {
      jobName: this.jobName,
      isScheduled: this.isScheduled,
      status: this.isScheduled ? 'running' : 'stopped'
    };
  }
}

// Create and export singleton instance
const campaignReviewScheduler = new CampaignReviewSchedulerJob();

export default campaignReviewScheduler;
