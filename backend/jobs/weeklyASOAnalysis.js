import schedulerService from '../services/scheduler.js';
import ASOAnalysisReport from '../models/ASOAnalysisReport.js';
import ASOKeyword from '../models/ASOKeyword.js';
import ASOScore from '../models/ASOScore.js';
import asoRankingService from '../services/asoRankingService.js';
import asoScoreService from '../services/asoScoreService.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('weekly-aso-analysis', 'weekly-aso-analysis');

/**
 * Weekly ASO Analysis Job
 *
 * Generates comprehensive ASO performance analysis reports:
 * - Keyword ranking trends and changes
 * - Category ranking analysis
 * - Competitor comparison
 * - ASO score tracking
 * - Performance recommendations
 *
 * Runs weekly (default: every Monday at 09:00 UTC)
 */
class WeeklyASOAnalysisJob {
  constructor() {
    this.jobName = 'weekly-aso-analysis';
    this.isScheduled = false;
  }

  /**
   * Start the scheduled weekly ASO analysis job
   * Uses SchedulerService for centralized job management
   *
   * @param {object} options - Scheduling options
   * @param {string} options.dayOfWeek - Day of week (default: "monday")
   * @param {string} options.scheduleTime - Time in HH:MM format (default: "09:00")
   * @param {string} options.timezone - Timezone for scheduling (default: "UTC")
   */
  start(options = {}) {
    if (this.isScheduled) {
      logger.warn('Weekly ASO analysis already started');
      return;
    }

    try {
      // Get schedule configuration from environment or options
      const dayOfWeek = options.dayOfWeek || process.env.ASO_ANALYSIS_DAY || 'monday';
      const scheduleTime = options.scheduleTime || process.env.ASO_ANALYSIS_TIME || '09:00';
      const timezone = options.timezone || process.env.ASO_ANALYSIS_TIMEZONE || 'UTC';

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

      logger.info('Starting weekly ASO analysis scheduler', {
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
      logger.info('Weekly ASO analysis scheduler started successfully', {
        jobName: this.jobName,
        dayOfWeek,
        scheduleTime,
        timezone
      });

    } catch (error) {
      logger.error('Failed to start weekly ASO analysis scheduler', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Stop the scheduled weekly ASO analysis job
   */
  stop() {
    if (!this.isScheduled) {
      logger.warn('Weekly ASO analysis not running');
      return;
    }

    try {
      schedulerService.unschedule(this.jobName);
      this.isScheduled = false;
      logger.info('Weekly ASO analysis scheduler stopped');
    } catch (error) {
      logger.error('Failed to stop weekly ASO analysis scheduler', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get current status of the weekly ASO analysis job
   */
  getStatus() {
    const jobStatus = schedulerService.getJobStatus(this.jobName);

    return {
      jobName: this.jobName,
      isRunning: this.isScheduled,
      scheduled: this.isScheduled,
      status: this.isScheduled ? 'running' : 'stopped',
      schedule: {
        dayOfWeek: process.env.ASO_ANALYSIS_DAY || 'monday',
        time: process.env.ASO_ANALYSIS_TIME || '09:00',
        timezone: process.env.ASO_ANALYSIS_TIMEZONE || 'UTC'
      },
      stats: jobStatus ? jobStatus.stats : null
    };
  }

  /**
   * Execute the weekly ASO analysis
   * This is called automatically by the scheduler
   */
  async execute() {
    const startTime = Date.now();
    logger.info('Starting weekly ASO analysis');

    try {
      // Determine the week to analyze (previous week)
      const now = new Date();
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - 1); // Yesterday
      weekEnd.setHours(23, 59, 59, 999);

      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6); // 7 days ago
      weekStart.setHours(0, 0, 0, 0);

      logger.info('Analyzing week', {
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString()
      });

      // Check if report already exists for this week
      const existingReport = await ASOAnalysisReport.findOne({
        weekStart,
        weekEnd
      });

      if (existingReport) {
        logger.info('Report already exists for this week, skipping', {
          reportId: existingReport._id
        });
        return {
          success: true,
          message: 'Report already exists for this week',
          reportId: existingReport._id
        };
      }

      // Generate the report
      const report = await this.generateReport(weekStart, weekEnd);

      logger.info('Weekly ASO analysis completed', {
        reportId: report._id,
        duration: `${Date.now() - startTime}ms`
      });

      return {
        success: true,
        message: 'Weekly ASO analysis completed successfully',
        reportId: report._id
      };

    } catch (error) {
      logger.error('Failed to execute weekly ASO analysis', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Trigger a manual analysis run
   */
  async trigger(weekStart, weekEnd) {
    logger.info('Manual trigger of weekly ASO analysis');

    try {
      const startDate = weekStart ? new Date(weekStart) : this.getDefaultWeekStart();
      const endDate = weekEnd ? new Date(weekEnd) : this.getDefaultWeekEnd();

      const report = await this.generateReport(startDate, endDate);

      return {
        success: true,
        message: 'Manual ASO analysis completed successfully',
        reportId: report._id
      };

    } catch (error) {
      logger.error('Failed to trigger manual ASO analysis', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Generate a comprehensive ASO analysis report
   */
  async generateReport(weekStart, weekEnd) {
    logger.info('Generating ASO analysis report', {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString()
    });

    // Step 1: Analyze keyword ranking changes
    const keywordAnalysis = await this.analyzeKeywords(weekStart, weekEnd);

    // Step 2: Analyze category ranking
    const categoryAnalysis = await this.analyzeCategoryRanking(weekStart, weekEnd);

    // Step 3: Analyze competitors (if service exists)
    const competitorAnalysis = await this.analyzeCompetitors(weekStart, weekEnd);

    // Step 4: Analyze ASO score
    const scoreAnalysis = await this.analyzeScore(weekStart, weekEnd);

    // Step 5: Generate recommendations
    const recommendations = await this.generateRecommendations(
      keywordAnalysis,
      categoryAnalysis,
      competitorAnalysis,
      scoreAnalysis
    );

    // Step 6: Calculate executive summary
    const summary = this.calculateSummary(
      keywordAnalysis,
      categoryAnalysis,
      scoreAnalysis
    );

    // Create the report
    const report = new ASOAnalysisReport({
      reportDate: new Date(),
      weekStart,
      weekEnd,
      reportType: 'weekly',
      summary,
      keywordAnalysis,
      categoryAnalysis,
      competitorAnalysis,
      scoreAnalysis,
      recommendations,
      status: 'draft',
      generatedBy: 'system'
    });

    await report.save();
    logger.info('ASO analysis report saved', { reportId: report._id });

    // Auto-finalize the report
    await report.finalize();

    return report;
  }

  /**
   * Step 2: Fetch keyword ranking changes
   */
  async analyzeKeywords(weekStart, weekEnd) {
    logger.info('Analyzing keyword rankings');

    const keywords = await ASOKeyword.find({ target: true });

    let improvedCount = 0;
    let declinedCount = 0;
    let stableCount = 0;
    const topImprovements = [];
    const topDeclines = [];

    const withRankings = keywords.filter(kw => kw.ranking !== null).length;
    const avgRanking = withRankings > 0
      ? Math.round(keywords.reduce((sum, kw) => sum + (kw.ranking || 0), 0) / withRankings)
      : 0;

    const inTop10 = keywords.filter(kw => kw.ranking && kw.ranking <= 10).length;
    const inTop50 = keywords.filter(kw => kw.ranking && kw.ranking <= 50).length;

    // Analyze ranking history for changes
    for (const keyword of keywords) {
      if (keyword.rankingHistory.length < 2) continue;

      const current = keyword.rankingHistory[keyword.rankingHistory.length - 1];
      const previous = keyword.rankingHistory[keyword.rankingHistory.length - 2];

      if (previous.ranking && current.ranking) {
        const change = previous.ranking - current.ranking; // Positive = improved (lower rank number is better)

        if (change > 2) {
          improvedCount++;
          if (topImprovements.length < 5) {
            topImprovements.push({
              keyword: keyword.keyword,
              previousRanking: previous.ranking,
              currentRanking: current.ranking,
              change
            });
          }
        } else if (change < -2) {
          declinedCount++;
          if (topDeclines.length < 5) {
            topDeclines.push({
              keyword: keyword.keyword,
              previousRanking: previous.ranking,
              currentRanking: current.ranking,
              change
            });
          }
        } else {
          stableCount++;
        }
      }
    }

    // Sort improvements and declines by magnitude of change
    topImprovements.sort((a, b) => b.change - a.change);
    topDeclines.sort((a, b) => a.change - b.change);

    // Get keyword suggestions for new opportunities
    let newOpportunities = [];
    try {
      const suggestions = await asoRankingService.getKeywordSuggestions();
      newOpportunities = suggestions.suggestions.slice(0, 5).map(s => ({
        keyword: s.keyword,
        opportunityScore: s.opportunityScore,
        volume: s.volume,
        competition: s.competition,
        reason: s.reason
      }));
    } catch (error) {
      logger.warn('Failed to fetch keyword suggestions', { error: error.message });
    }

    return {
      totalTracked: keywords.length,
      withRankings,
      avgRanking,
      inTop10,
      inTop50,
      improvedKeywords: improvedCount,
      declinedKeywords: declinedCount,
      stableKeywords: stableCount,
      topImprovements,
      topDeclines,
      newOpportunities
    };
  }

  /**
   * Step 3: Analyze performance trends
   */
  async analyzeCategoryRanking(weekStart, weekEnd) {
    logger.info('Analyzing category ranking');

    try {
      const categoryRankingService = (await import('../services/categoryRankingService.js')).default;

      // Get current ranking
      const currentRanking = await categoryRankingService.getCurrentRanking();

      // Get ranking history for the week
      const days = Math.ceil((weekEnd - weekStart) / (1000 * 60 * 60 * 24));
      const history = await categoryRankingService.getRankingHistory(Math.max(days, 7));

      // Calculate statistics
      const rankings = history.rankings || [];
      const current = currentRanking.ranking;
      const previous = rankings.length > 1 ? rankings[rankings.length - 2].ranking : current;
      const change = previous - current; // Positive = improved

      const bestRanking = rankings.length > 0
        ? Math.min(...rankings.map(r => r.ranking))
        : current;
      const worstRanking = rankings.length > 0
        ? Math.max(...rankings.map(r => r.ranking))
        : current;
      const avgRanking = rankings.length > 0
        ? Math.round(rankings.reduce((sum, r) => sum + r.ranking, 0) / rankings.length)
        : current;

      return {
        primaryCategory: currentRanking.category,
        currentRanking: current,
        previousRanking: previous,
        rankingChange: change,
        bestRanking,
        worstRanking,
        avgRanking,
        rankingHistory: rankings.slice(-7).map(r => ({
          date: r.date,
          ranking: r.ranking
        }))
      };
    } catch (error) {
      logger.warn('Failed to analyze category ranking', { error: error.message });
      return {
        primaryCategory: 'Books',
        currentRanking: null,
        previousRanking: null,
        rankingChange: 0,
        bestRanking: null,
        worstRanking: null,
        avgRanking: null,
        rankingHistory: []
      };
    }
  }

  /**
   * Analyze competitor performance
   */
  async analyzeCompetitors(weekStart, weekEnd) {
    logger.info('Analyzing competitors');

    try {
      const competitorKeywordService = (await import('../services/competitorKeywordService.js')).default;

      // Identify competitors
      const competitors = await competitorKeywordService.identifyCompetitors();
      const competitorsTracked = competitors.length;

      // Identify keyword gaps
      const gaps = await competitorKeywordService.identifyKeywordGaps();

      // Calculate performance
      let outperformingCount = 0;
      let underperformingCount = 0;
      const topCompetitors = [];

      for (const competitor of competitors.slice(0, 5)) {
        try {
          // Compare keyword rankings
          const theirRanking = competitor.avgRanking || 50;
          const ourRanking = 50; // Would need to calculate from actual data
          const gap = theirRanking - ourRanking;

          if (gap > 0) {
            underperformingCount++;
          } else {
            outperformingCount++;
          }

          topCompetitors.push({
            appName: competitor.appName,
            appId: competitor.appId,
            theirRanking,
            ourRanking,
            gap,
            keywordsTheyWin: [],
            keywordsWeWin: []
          });
        } catch (error) {
          logger.warn(`Failed to analyze competitor ${competitor.appName}`, { error: error.message });
        }
      }

      // Format keyword gaps
      const keywordGaps = gaps.gaps?.slice(0, 10).map(gap => ({
        keyword: gap.keyword,
        ourRanking: gap.ourRanking,
        competitorRanking: gap.competitorRanking,
        gap: gap.gap,
        priority: gap.priority || 'medium'
      })) || [];

      return {
        competitorsTracked,
        outperformingCount,
        underperformingCount,
        topCompetitors,
        keywordGaps
      };
    } catch (error) {
      logger.warn('Failed to analyze competitors', { error: error.message });
      return {
        competitorsTracked: 0,
        outperformingCount: 0,
        underperformingCount: 0,
        topCompetitors: [],
        keywordGaps: []
      };
    }
  }

  /**
   * Analyze ASO score
   */
  async analyzeScore(weekStart, weekEnd) {
    logger.info('Analyzing ASO score');

    try {
      // Get current score
      const currentScore = await asoScoreService.getASOScore();

      // Get score history
      const days = Math.ceil((weekEnd - weekStart) / (1000 * 60 * 60 * 24));
      const history = await asoScoreService.getASOScoreHistory(Math.max(days, 30));

      const previousScore = history.scores?.length > 1
        ? history.scores[history.scores.length - 2]
        : currentScore;

      const scoreChange = currentScore.overallScore - previousScore.overallScore;

      return {
        overallScore: currentScore.overallScore,
        previousScore: previousScore.overallScore,
        scoreChange,
        componentScores: {
          keyword: {
            current: currentScore.keywordScore,
            previous: previousScore.keywordScore,
            change: currentScore.keywordScore - previousScore.keywordScore
          },
          metadata: {
            current: currentScore.metadataScore,
            previous: previousScore.metadataScore,
            change: currentScore.metadataScore - previousScore.metadataScore
          },
          visual: {
            current: currentScore.visualScore,
            previous: previousScore.visualScore,
            change: currentScore.visualScore - previousScore.visualScore
          },
          ratings: {
            current: currentScore.ratingsScore,
            previous: previousScore.ratingsScore,
            change: currentScore.ratingsScore - previousScore.ratingsScore
          },
          conversion: {
            current: currentScore.conversionScore,
            previous: previousScore.conversionScore,
            change: currentScore.conversionScore - previousScore.conversionScore
          }
        },
        scoreHistory: (history.scores || []).slice(-30).map(s => ({
          date: s.calculatedAt,
          overallScore: s.overallScore
        }))
      };
    } catch (error) {
      logger.warn('Failed to analyze ASO score', { error: error.message });
      return {
        overallScore: 0,
        previousScore: 0,
        scoreChange: 0,
        componentScores: {
          keyword: { current: 0, previous: 0, change: 0 },
          metadata: { current: 0, previous: 0, change: 0 },
          visual: { current: 0, previous: 0, change: 0 },
          ratings: { current: 0, previous: 0, change: 0 },
          conversion: { current: 0, previous: 0, change: 0 }
        },
        scoreHistory: []
      };
    }
  }

  /**
   * Generate recommendations based on analysis
   */
  async generateRecommendations(keywordAnalysis, categoryAnalysis, competitorAnalysis, scoreAnalysis) {
    logger.info('Generating recommendations');

    const recommendations = [];

    // Keyword recommendations
    if (keywordAnalysis.declinedKeywords > 5) {
      recommendations.push({
        category: 'keyword',
        priority: 'high',
        title: 'Address declining keyword rankings',
        description: `${keywordAnalysis.declinedKeywords} keywords have declined in ranking. Review keyword optimization strategies.`,
        expectedImpact: 75,
        effort: 'medium',
        status: 'pending'
      });
    }

    if (keywordAnalysis.newOpportunities.length > 0) {
      recommendations.push({
        category: 'keyword',
        priority: 'medium',
        title: `Add ${keywordAnalysis.newOpportunities.length} new high-opportunity keywords`,
        description: `Consider targeting: ${keywordAnalysis.newOpportunities.slice(0, 3).map(k => k.keyword).join(', ')}`,
        expectedImpact: 60,
        effort: 'low',
        status: 'pending'
      });
    }

    // Category ranking recommendations
    if (categoryAnalysis.rankingChange < -5) {
      recommendations.push({
        category: 'metadata',
        priority: 'high',
        title: 'Improve category ranking',
        description: `Category ranking has declined by ${Math.abs(categoryAnalysis.rankingChange)} positions. Review app metadata.`,
        expectedImpact: 80,
        effort: 'high',
        status: 'pending'
      });
    }

    // Competitor recommendations
    if (competitorAnalysis.keywordGaps.length > 0) {
      const highPriorityGaps = competitorAnalysis.keywordGaps.filter(g => g.priority === 'high');
      if (highPriorityGaps.length > 0) {
        recommendations.push({
          category: 'competitive',
          priority: 'high',
          title: `Close ${highPriorityGaps.length} high-priority keyword gaps`,
          description: `Competitors are outranking us on: ${highPriorityGaps.slice(0, 3).map(g => g.keyword).join(', ')}`,
          expectedImpact: 70,
          effort: 'medium',
          status: 'pending'
        });
      }
    }

    // Score recommendations
    if (scoreAnalysis.componentScores.keyword.change < -5) {
      recommendations.push({
        category: 'keyword',
        priority: 'high',
        title: 'Improve keyword optimization',
        description: 'Keyword score has declined. Review title, subtitle, and keyword usage.',
        expectedImpact: 65,
        effort: 'medium',
        status: 'pending'
      });
    }

    if (scoreAnalysis.componentScores.visual.change < -5) {
      recommendations.push({
        category: 'visual',
        priority: 'medium',
        title: 'Refresh app store visuals',
        description: 'Visual score has declined. Consider updating screenshots or icon.',
        expectedImpact: 55,
        effort: 'high',
        status: 'pending'
      });
    }

    // Sort by priority and expected impact
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.expectedImpact - a.expectedImpact;
    });

    // Return top 10 recommendations
    return recommendations.slice(0, 10);
  }

  /**
   * Calculate executive summary
   */
  calculateSummary(keywordAnalysis, categoryAnalysis, scoreAnalysis) {
    logger.info('Calculating executive summary');

    const keyHighlights = [];
    const keyConcerns = [];

    // Highlights
    if (keywordAnalysis.improvedKeywords > 0) {
      keyHighlights.push(`${keywordAnalysis.improvedKeywords} keywords improved in ranking`);
    }

    if (keywordAnalysis.inTop10 > 0) {
      keyHighlights.push(`${keywordAnalysis.inTop10} keywords in top 10`);
    }

    if (categoryAnalysis.rankingChange > 0) {
      keyHighlights.push(`Category ranking improved by ${categoryAnalysis.rankingChange} positions`);
    }

    if (scoreAnalysis.scoreChange > 0) {
      keyHighlights.push(`ASO score increased by ${scoreAnalysis.scoreChange} points`);
    }

    // Concerns
    if (keywordAnalysis.declinedKeywords > 3) {
      keyConcerns.push(`${keywordAnalysis.declinedKeywords} keywords declined in ranking`);
    }

    if (categoryAnalysis.rankingChange < -5) {
      keyConcerns.push(`Category ranking declined by ${Math.abs(categoryAnalysis.rankingChange)} positions`);
    }

    if (scoreAnalysis.scoreChange < -5) {
      keyConcerns.push(`ASO score decreased by ${Math.abs(scoreAnalysis.scoreChange)} points`);
    }

    // Determine overall health
    let overallHealth = 'fair';
    if (scoreAnalysis.overallScore >= 80) overallHealth = 'excellent';
    else if (scoreAnalysis.overallScore >= 70) overallHealth = 'good';
    else if (scoreAnalysis.overallScore >= 60) overallHealth = 'fair';
    else if (scoreAnalysis.overallScore >= 50) overallHealth = 'poor';
    else overallHealth = 'critical';

    // Determine trend direction
    let trendDirection = 'stable';
    if (scoreAnalysis.scoreChange > 5) trendDirection = 'improving';
    else if (scoreAnalysis.scoreChange < -5) trendDirection = 'declining';

    return {
      overallHealth,
      keyHighlights,
      keyConcerns,
      overallScore: scoreAnalysis.overallScore,
      scoreChange: scoreAnalysis.scoreChange,
      trendDirection
    };
  }

  /**
   * Get default week start (7 days ago)
   */
  getDefaultWeekStart() {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  /**
   * Get default week end (yesterday)
   */
  getDefaultWeekEnd() {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    date.setHours(23, 59, 59, 999);
    return date;
  }
}

export default new WeeklyASOAnalysisJob();
