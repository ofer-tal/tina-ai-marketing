import schedulerService from '../services/scheduler.js';
import asoRankingService from '../services/asoRankingService.js';
import ASOKeyword from '../models/ASOKeyword.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('keyword-ranking-check', 'scheduler');

/**
 * Keyword Ranking Check Job
 *
 * Runs daily to check keyword rankings from App Store
 * - Fetches current rankings for all tracked keywords
 * - Stores rankings in marketing_aso_keywords collection
 * - Updates ranking history for trend analysis
 * - Checks for significant ranking changes
 * - Alerts on major ranking drops
 */
class KeywordRankingCheckJob {
  constructor() {
    this.jobName = 'keyword-ranking-check-daily';
    this.isRunning = false;
    this.lastCheckStats = null;

    // Configuration from environment
    this.checkSchedule = process.env.KEYWORD_RANKING_CHECK_SCHEDULE || '0 3 * * *'; // Default: 3 AM daily
    this.timezone = process.env.KEYWORD_RANKING_CHECK_TIMEZONE || 'UTC';
    this.significantChangeThreshold = parseInt(process.env.KEYWORD_RANKING_SIGNIFICANT_CHANGE) || 10; // 10 positions
  }

  /**
   * Execute the keyword ranking check job
   * Fetches rankings for all tracked keywords and updates database
   */
  async execute() {
    if (this.isRunning) {
      logger.warn('Keyword ranking check job already running, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting keyword ranking check');

      // Step 1: Fetch current rankings for all tracked keywords
      logger.info('Step 1: Fetching current rankings');
      const rankings = await this.fetchCurrentRankings();
      logger.info(`Fetched ${rankings.length} keyword rankings`);

      if (rankings.length === 0) {
        logger.info('No keywords to check, exiting');
        return {
          success: true,
          keywordCount: 0,
          updatedCount: 0,
          significantChanges: []
        };
      }

      // Step 2: Store rankings in database
      logger.info('Step 2: Storing rankings in database');
      const updatedCount = await this.storeRankings(rankings);
      logger.info(`Stored ${updatedCount} keyword rankings`);

      // Step 3: Update ranking history
      logger.info('Step 3: Updating ranking history');
      await this.updateRankingHistory(rankings);
      logger.info('Ranking history updated');

      // Step 4: Check for significant changes
      logger.info('Step 4: Checking for significant ranking changes');
      const significantChanges = await this.checkSignificantChanges(rankings);
      logger.info(`Found ${significantChanges.length} significant changes`);

      // Log significant changes
      if (significantChanges.length > 0) {
        for (const change of significantChanges) {
          logger.info(`Significant ranking change: "${change.keyword}" ${change.oldRanking} → ${change.newRanking} (${change.change > 0 ? '+' : ''}${change.change})`);
        }
      }

      // Step 5: Log check results
      const stats = {
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        keywordCount: rankings.length,
        updatedCount: updatedCount,
        significantChanges: significantChanges
      };

      this.lastCheckStats = stats;

      logger.info('Keyword ranking check completed successfully', {
        duration: `${stats.duration}ms`,
        keywordCount: stats.keywordCount,
        updatedCount: stats.updatedCount,
        significantChanges: stats.significantChanges.length
      });

      return stats;

    } catch (error) {
      logger.error('Error in keyword ranking check job', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Fetch current rankings for all tracked keywords
   * Returns array of {keyword, ranking, volume, competition, difficulty}
   */
  async fetchCurrentRankings() {
    try {
      // Get all tracked keywords
      const keywords = await ASOKeyword.find({ target: true });

      if (keywords.length === 0) {
        logger.warn('No target keywords found in database');
        return [];
      }

      const rankings = [];

      for (const keywordDoc of keywords) {
        try {
          // Fetch ranking from App Store (or simulated)
          const ranking = await asoRankingService.fetchKeywordRanking(keywordDoc);

          if (ranking !== null) {
            rankings.push({
              keyword: keywordDoc.keyword,
              ranking: ranking,
              volume: keywordDoc.volume,
              competition: keywordDoc.competition,
              difficulty: keywordDoc.difficulty,
              previousRanking: keywordDoc.ranking
            });
          }
        } catch (error) {
          logger.error(`Failed to fetch ranking for "${keywordDoc.keyword}"`, {
            error: error.message
          });
          // Continue with next keyword
        }
      }

      logger.info(`Fetched rankings for ${rankings.length} keywords`);
      return rankings;

    } catch (error) {
      logger.error('Error fetching current rankings', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Store rankings in database
   * Updates the ranking field for each keyword
   */
  async storeRankings(rankings) {
    try {
      if (rankings.length === 0) {
        return 0;
      }

      let updatedCount = 0;

      for (const ranking of rankings) {
        try {
          await ASOKeyword.findOneAndUpdate(
            { keyword: ranking.keyword },
            { $set: { ranking: ranking.ranking, lastCheckedAt: new Date() } },
            { upsert: false }
          );
          updatedCount++;
        } catch (error) {
          logger.error(`Failed to store ranking for "${ranking.keyword}"`, {
            error: error.message
          });
        }
      }

      logger.info(`Stored ${updatedCount} keyword rankings in database`);
      return updatedCount;

    } catch (error) {
      logger.error('Error storing rankings in database', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Update ranking history for all keywords
   * Adds current ranking to history array
   */
  async updateRankingHistory(rankings) {
    try {
      if (rankings.length === 0) {
        return 0;
      }

      let updatedCount = 0;

      for (const ranking of rankings) {
        try {
          const keywordDoc = await ASOKeyword.findOne({ keyword: ranking.keyword });
          if (keywordDoc) {
            await keywordDoc.addRankingToHistory(ranking.ranking);
            updatedCount++;
          }
        } catch (error) {
          logger.error(`Failed to update history for "${ranking.keyword}"`, {
            error: error.message
          });
        }
      }

      logger.info(`Updated ranking history for ${updatedCount} keywords`);
      return updatedCount;

    } catch (error) {
      logger.error('Error updating ranking history', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Check for significant ranking changes
   * Returns array of keywords with significant changes
   */
  async checkSignificantChanges(rankings) {
    try {
      const significantChanges = [];

      for (const ranking of rankings) {
        // Skip if no previous ranking
        if (ranking.previousRanking === null || ranking.previousRanking === undefined) {
          continue;
        }

        const change = ranking.previousRanking - ranking.ranking;

        // Check if change exceeds threshold (absolute value)
        if (Math.abs(change) >= this.significantChangeThreshold) {
          significantChanges.push({
            keyword: ranking.keyword,
            oldRanking: ranking.previousRanking,
            newRanking: ranking.ranking,
            change: change,
            changeType: change > 0 ? 'improvement' : 'decline',
            significant: true
          });
        }
      }

      logger.info(`Found ${significantChanges.length} significant ranking changes`);

      // Create alerts for significant declines
      for (const change of significantChanges) {
        if (change.changeType === 'decline') {
          await this.createRankingAlert(change);
        }
      }

      return significantChanges;

    } catch (error) {
      logger.error('Error checking significant changes', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Create alert for significant ranking decline
   * Stores alert in database for review
   */
  async createRankingAlert(change) {
    try {
      const Strategy = (await import('../models/Strategy.js')).default;

      const alertMessage = `⚠️ Significant ranking decline detected for keyword "${change.keyword}": ${change.oldRanking} → ${change.newRanking} (${change.change} positions). Consider investigating ASO strategy.`;

      const alert = new Strategy({
        title: `Ranking Decline: ${change.keyword}`,
        category: 'ASO',
        priority: change.change > 20 ? 'high' : 'medium',
        status: 'pending',
        description: alertMessage,
        actionItems: [
          `Review keyword "${change.keyword}" ranking trend`,
          'Check competitor keyword strategies',
          'Consider updating app metadata',
          'Evaluate keyword difficulty vs opportunity'
        ],
        source: 'keyword-ranking-check-job',
        metadata: {
          keyword: change.keyword,
          oldRanking: change.oldRanking,
          newRanking: change.newRanking,
          change: change.change,
          detectedAt: new Date().toISOString()
        }
      });

      await alert.save();
      logger.info(`Created ranking alert for "${change.keyword}"`);

    } catch (error) {
      logger.error('Error creating ranking alert', {
        error: error.message,
        stack: error.stack
      });
      // Don't throw - alert creation failure shouldn't fail the job
    }
  }

  /**
   * Get ranking statistics
   * Returns summary of keyword rankings
   */
  async getRankingStats() {
    try {
      const keywords = await ASOKeyword.find({ target: true });

      const stats = {
        total: keywords.length,
        ranked: keywords.filter(k => k.ranking !== null && k.ranking !== undefined).length,
        top10: 0,
        top25: 0,
        top50: 0,
        averageRanking: 0,
        improvements: 0,
        declines: 0
      };

      let totalRanking = 0;

      for (const keyword of keywords) {
        if (keyword.ranking !== null && keyword.ranking !== undefined) {
          totalRanking += keyword.ranking;

          if (keyword.ranking <= 10) stats.top10++;
          if (keyword.ranking <= 25) stats.top25++;
          if (keyword.ranking <= 50) stats.top50++;

          // Check recent trend (last 2 history entries)
          if (keyword.rankingHistory && keyword.rankingHistory.length >= 2) {
            const recent = keyword.rankingHistory[keyword.rankingHistory.length - 1];
            const previous = keyword.rankingHistory[keyword.rankingHistory.length - 2];
            if (recent.ranking < previous.ranking) stats.improvements++;
            if (recent.ranking > previous.ranking) stats.declines++;
          }
        }
      }

      stats.averageRanking = stats.ranked > 0 ? Math.round(totalRanking / stats.ranked) : 0;

      return stats;

    } catch (error) {
      logger.error('Error getting ranking stats', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Start the keyword ranking check scheduler
   */
  start() {
    const cronSchedule = this.checkSchedule || '0 3 * * *';
    schedulerService.scheduleJob(
      this.jobName,
      cronSchedule,
      () => this.execute()
    );
    logger.info('Keyword ranking check job started', {
      schedule: cronSchedule,
      timezone: this.timezone
    });
  }

  /**
   * Stop the keyword ranking check scheduler
   */
  stop() {
    schedulerService.unscheduleJob(this.jobName);
    logger.info('Keyword ranking check job stopped');
  }

  /**
   * Get check statistics
   */
  getStats() {
    return {
      jobName: this.jobName,
      isRunning: this.isRunning,
      lastCheckStats: this.lastCheckStats,
      schedule: this.checkSchedule,
      timezone: this.timezone,
      significantChangeThreshold: this.significantChangeThreshold
    };
  }
}

// Create and export singleton instance
const keywordRankingCheckJob = new KeywordRankingCheckJob();

export default keywordRankingCheckJob;
