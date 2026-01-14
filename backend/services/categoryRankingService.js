/**
 * Category Ranking Service
 *
 * Manages category ranking tracking and storage
 * - Fetches daily category rankings
 * - Stores ranking history in database
 * - Calculates trends and percentiles
 * - Provides ranking analytics
 */

import winston from 'winston';
import CategoryRanking from '../models/CategoryRanking.js';
import appStoreConnectService from './appStoreConnectService.js';

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'category-ranking' },
  transports: [
    new winston.transports.File({ filename: 'logs/category-ranking-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/category-ranking.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

class CategoryRankingService {
  constructor() {
    this.appId = process.env.APP_STORE_APP_ID || 'blush-app';
  }

  /**
   * Fetch and store current category ranking
   * Called daily by background job
   */
  async fetchAndStoreRanking() {
    logger.info('Fetching and storing category ranking', { appId: this.appId });

    try {
      // Get current ranking from App Store Connect
      const rankingData = await appStoreConnectService.getCategoryRanking(this.appId);

      // Find or create category ranking record
      let categoryRanking = await CategoryRanking.findOne({ appId: this.appId });

      if (!categoryRanking) {
        // Create new record
        categoryRanking = new CategoryRanking({
          appId: this.appId,
          categoryName: rankingData.category,
          subcategoryName: rankingData.subcategory,
          ranking: rankingData.ranking,
          totalAppsInCategory: rankingData.totalAppsInCategory,
          percentile: rankingData.percentile,
          previousRanking: rankingData.previousRanking,
          rankingChange: rankingData.rankingChange
        });

        // Add initial history point
        categoryRanking.rankingHistory.push({
          date: new Date(),
          ranking: rankingData.ranking,
          totalApps: rankingData.totalAppsInCategory
        });

        await categoryRanking.save();

        logger.info('Created new category ranking record', {
          appId: this.appId,
          ranking: rankingData.ranking,
          category: rankingData.category
        });

      } else {
        // Update existing record
        await categoryRanking.addRankingToHistory(
          rankingData.ranking,
          rankingData.totalAppsInCategory
        );

        logger.info('Updated category ranking record', {
          appId: this.appId,
          ranking: rankingData.ranking,
          previousRanking: categoryRanking.previousRanking,
          change: categoryRanking.rankingChange
        });
      }

      return categoryRanking;

    } catch (error) {
      logger.error('Failed to fetch and store category ranking', {
        appId: this.appId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get current category ranking
   */
  async getCurrentRanking() {
    try {
      const ranking = await CategoryRanking.findOne({ appId: this.appId });

      if (!ranking) {
        // Fetch from API if not in database
        logger.info('No ranking in database, fetching from API');
        return await this.fetchAndStoreRanking();
      }

      // Check if data is stale (older than 24 hours)
      const lastChecked = new Date(ranking.checkedAt);
      const hoursSinceCheck = (Date.now() - lastChecked.getTime()) / (1000 * 60 * 60);

      if (hoursSinceCheck > 24) {
        logger.info('Ranking data is stale, refreshing from API');
        return await this.fetchAndStoreRanking();
      }

      return ranking;

    } catch (error) {
      logger.error('Failed to get current ranking', {
        appId: this.appId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get ranking history
   */
  async getRankingHistory(days = 30) {
    try {
      const ranking = await CategoryRanking.findOne({ appId: this.appId });

      if (!ranking) {
        return [];
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const history = ranking.rankingHistory
        .filter(entry => entry.date >= cutoffDate)
        .sort((a, b) => a.date - b.date);

      return history;

    } catch (error) {
      logger.error('Failed to get ranking history', {
        appId: this.appId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get ranking trend
   */
  async getRankingTrend(days = 7) {
    try {
      const ranking = await CategoryRanking.findOne({ appId: this.appId });

      if (!ranking) {
        return { trend: 'unknown', change: 0 };
      }

      return ranking.getRankingTrend(days);

    } catch (error) {
      logger.error('Failed to get ranking trend', {
        appId: this.appId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get ranking statistics
   */
  async getRankingStats() {
    try {
      const ranking = await CategoryRanking.findOne({ appId: this.appId });

      if (!ranking) {
        return {
          currentRanking: null,
          percentile: null,
          totalApps: null,
          trend: 'unknown',
          historyPoints: 0
        };
      }

      const trend = ranking.getRankingTrend(7);

      return {
        currentRanking: ranking.ranking,
        percentile: ranking.percentile,
        totalApps: ranking.totalAppsInCategory,
        category: ranking.categoryName,
        subcategory: ranking.subcategoryName,
        previousRanking: ranking.previousRanking,
        rankingChange: ranking.rankingChange,
        trend: trend.trend,
        changeMagnitude: Math.abs(trend.change),
        historyPoints: ranking.rankingHistory.length,
        lastChecked: ranking.checkedAt
      };

    } catch (error) {
      logger.error('Failed to get ranking stats', {
        appId: this.appId,
        error: error.message
      });
      throw error;
    }
  }
}

// Create singleton instance
const categoryRankingService = new CategoryRankingService();

export default categoryRankingService;
