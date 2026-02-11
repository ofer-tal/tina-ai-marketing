/**
 * Alert System Service
 *
 * Generates real-time alerts for:
 * - Viral content detected
 * - Book mention spikes
 * - Hashtag combination performance
 * - Competition increases
 * - Emerging/declining trends
 *
 * Uses SSE for real-time push notifications.
 */

import { getLogger } from '../../utils/logger.js';
import MarketingTrendAlert from '../../models/MarketingTrendAlert.js';
import MarketingBookTrendMetrics from '../../models/MarketingBookTrendMetrics.js';
import MarketingBook from '../../models/MarketingBook.js';
import sseService from '../sseService.js';
import frequencySpikeDetector from './analysis/frequencySpikeDetector.js';
import engagementVelocityTracker from './analysis/engagementVelocityTracker.js';

const logger = getLogger('services', 'booktok-alert-system');

// Alert configuration
const ALERT_CONFIG = {
  // Minimum values for triggering alerts
  VIRAL_VIEW_THRESHOLD: 100000,
  SPIKE_PERCENTAGE_THRESHOLD: 200,
  ENGAGEMENT_OUTLIER_THRESHOLD: 2.0, // Z-score
  COMPETITION_INCREASE_THRESHOLD: 50, // Percent increase
  SPOILER_THRESHOLD: 80 // Saturation level
};

class AlertSystemService {
  constructor() {
    this.isRunning = false;
    this.alertCooldowns = new Map(); // Prevent duplicate alerts
    this.cooldownPeriod = 60 * 60 * 1000; // 1 hour cooldown
  }

  /**
   * Generate real-time alerts from current data
   * @returns {Promise<Array>} Generated alerts
   */
  async generateRealTimeAlerts() {
    if (this.isRunning) {
      logger.warn('Alert generation already in progress');
      return [];
    }

    this.isRunning = true;
    const startTime = Date.now();
    const alerts = [];

    try {
      logger.info('Starting real-time alert generation');

      // Check for viral content
      const viralAlerts = await this.checkViralContent();
      alerts.push(...viralAlerts);

      // Check for book spikes
      const spikeAlerts = await this.checkBookSpikes();
      alerts.push(...spikeAlerts);

      // Check for hashtag combo opportunities
      const hashtagAlerts = await this.checkHashtagOpportunities();
      alerts.push(...hashtagAlerts);

      // Check for competition increases
      const competitionAlerts = await this.checkCompetitionIncreases();
      alerts.push(...competitionAlerts);

      // Check for emerging trends
      const emergingAlerts = await this.checkEmergingTrends();
      alerts.push(...emergingAlerts);

      // Check for declining trends
      const decliningAlerts = await this.checkDecliningTrends();
      alerts.push(...decliningAlerts);

      const duration = Date.now() - startTime;
      logger.info('Real-time alert generation completed', {
        totalAlerts: alerts.length,
        duration: `${duration}ms`
      });

      return alerts;

    } catch (error) {
      logger.error('Error generating real-time alerts', {
        error: error.message
      });
      return [];
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Check for viral content
   * @returns {Promise<Array>} Viral content alerts
   */
  async checkViralContent() {
    try {
      // Use velocity tracker to find outliers
      // This would need access to recent posts
      // For now, return empty array
      return [];

    } catch (error) {
      logger.error('Error checking viral content', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Check for book mention spikes
   * @returns {Promise<Array>} Book spike alerts
   */
  async checkBookSpikes() {
    try {
      const spikes = await frequencySpikeDetector.detectSpikes('book', {
        minSpikePercentage: ALERT_CONFIG.SPIKE_PERCENTAGE_THRESHOLD
      });

      const alerts = [];

      for (const spike of spikes) {
        const alert = await this.createAlertIfNotCooldown(
          'book_spike',
          spike.entityName,
          spike.severity
        );

        if (alert) {
          await MarketingTrendAlert.create({
            alertType: 'book_spike',
            title: `"${spike.entityName}" is spiking!`,
            description: `Mentions up ${spike.percentageIncrease}% in the last ${spike.timeWindow}. Current velocity: ${spike.currentMentions} mentions/hour.`,
            severity: spike.severity,
            entityType: 'book',
            entityId: spike.entityId,
            entityName: spike.entityName,
            data: {
              bookSpike: {
                bookTitle: spike.entityName,
                mentionIncrease: spike.percentageIncrease,
                platform: spike.platform
              }
            }
          });

          alerts.push(alert);
        }
      }

      return alerts;

    } catch (error) {
      logger.error('Error checking book spikes', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Check for hashtag combination opportunities
   * @returns {Promise<Array>} Hashtag opportunity alerts
   */
  async checkHashtagOpportunities() {
    try {
      // Check for new winning hashtag combinations
      // This would use the hashtagComboAnalyzer
      return [];

    } catch (error) {
      logger.error('Error checking hashtag opportunities', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Check for competition increases
   * @returns {Promise<Array>} Competition alert
   */
  async checkCompetitionIncreases() {
    try {
      // Check if competition for topics is increasing
      const topics = await MarketingBookTrendMetrics.aggregate([
        {
          $match: {
            entityType: 'topic',
            timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: '$entityId',
            entityName: { $first: '$entityName' },
            latestMentions: { $last: '$mentionCount' },
            avgMentions: { $avg: '$mentionCount' }
          }
        },
        {
          $project: {
            entityName: 1,
            latestMentions: 1,
            avgMentions: 1,
            increasePercent: {
              $multiply: [
                { $divide: [
                  { $subtract: ['$latestMentions', '$avgMentions'] },
                  '$avgMentions'
                ]},
                100
              ]
            }
          }
        },
        {
          $match: {
            increasePercent: { $gte: ALERT_CONFIG.COMPETITION_INCREASE_THRESHOLD }
          }
        }
      ]);

      const alerts = [];

      for (const topic of topics) {
        const alert = await this.createAlertIfNotCooldown(
          'competition_increase',
          topic.entityName,
          'medium'
        );

        if (alert) {
          await MarketingTrendAlert.create({
            alertType: 'competition_increase',
            title: `Competition increasing for "${topic.entityName}"`,
            description: `Topic mentions up ${Math.round(topic.increasePercent)}% in 24h. Consider creating content now or pivoting to less competitive topics.`,
            severity: 'medium',
            entityType: 'topic',
            entityId: topic._id,
            entityName: topic.entityName,
            data: {
              competition: {
                topic: topic.entityName,
                competitorCount: topic.latestMentions,
                avgCompetitorEngagement: 0,
                ourStanding: 'needs analysis'
              }
            }
          });

          alerts.push(alert);
        }
      }

      return alerts;

    } catch (error) {
      logger.error('Error checking competition increases', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Check for emerging trends
   * @returns {Promise<Array>} Emerging trend alerts
   */
  async checkEmergingTrends() {
    try {
      const risingTrends = await MarketingBookTrendMetrics.getRisingTrends({
        minVelocity: 100,
        limit: 5
      });

      const alerts = [];

      for (const trend of risingTrends) {
        const alert = await this.createAlertIfNotCooldown(
          'emerging',
          trend.entityName,
          'medium'
        );

        if (alert) {
          await MarketingTrendAlert.create({
            alertType: 'emerging',
            title: `Emerging trend: "${trend.entityName}"`,
            description: `${trend.entityType} is rising ${trend.trendVelocity > 0 ? '+' : ''}${trend.trendVelocity.toFixed(1)}% with ${trend.mentionCount} recent mentions.`,
            severity: 'medium',
            entityType: trend.entityType,
            entityId: trend.entityId,
            entityName: trend.entityName,
            data: {
              emerging: {
                trendName: trend.entityName,
                velocity: trend.trendVelocity,
                platform: trend.platform,
                description: `${trend.entityType} showing strong upward momentum`,
                suggestedActions: ['Create content soon', 'Monitor for continued growth', 'Consider related hooks']
              }
            }
          });

          alerts.push(alert);
        }
      }

      return alerts;

    } catch (error) {
      logger.error('Error checking emerging trends', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Check for declining trends
   * @returns {Promise<Array>} Declining trend alerts
   */
  async checkDecliningTrends() {
    try {
      const decliningTrends = await MarketingBookTrendMetrics.getDecliningTrends({
        limit: 5
      });

      const alerts = [];

      for (const trend of decliningTrends) {
        const alert = await this.createAlertIfNotCooldown(
          'declining',
          trend.entityName,
          'low'
        );

        if (alert) {
          await MarketingTrendAlert.create({
            alertType: 'declining',
            title: `"${trend.entityName}" is declining`,
            description: `${trend.entityType} interest down ${Math.abs(trend.trendVelocity).toFixed(1)}%. Consider pivoting content strategy.`,
            severity: 'low',
            entityType: trend.entityType,
            entityId: trend.entityId,
            entityName: trend.entityName,
            data: {
              declining: {
                trendName: trend.entityName,
                velocity: trend.trendVelocity,
                platform: trend.platform,
                reason: 'Engagement and mentions decreasing',
                alternatives: await this.getAlternatives(trend.entityName)
              }
            }
          });

          alerts.push(alert);
        }
      }

      return alerts;

    } catch (error) {
      logger.error('Error checking declining trends', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Create alert if not in cooldown period
   * @param {string} alertType - Alert type
   * @param {string} entityName - Entity name
   * @param {string} severity - Alert severity
   * @returns {Promise<string|null>} Alert key if created, null if in cooldown
   */
  async createAlertIfNotCooldown(alertType, entityName, severity) {
    const alertKey = `${alertType}:${entityName}`;
    const now = Date.now();
    const lastAlert = this.alertCooldowns.get(alertKey);

    if (lastAlert && now - lastAlert < this.cooldownPeriod) {
      return null;
    }

    this.alertCooldowns.set(alertKey, now);
    return alertKey;
  }

  /**
   * Get alternatives for a declining topic
   * @param {string} topicName - Topic name
   * @returns {Promise<Array>} Alternative topics
   */
  async getAlternatives(topicName) {
    try {
      const risingTrends = await MarketingBookTrendMetrics.getRisingTrends({
        limit: 3
      });

      return risingTrends
        .filter(t => t.entityName !== topicName)
        .map(t => t.entityName);

    } catch (error) {
      logger.error('Error getting alternatives', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Generate weekly summary alert
   * @returns {Promise<Object>} Weekly summary
   */
  async generateWeeklySummary() {
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Get top trends
      const topBooks = await MarketingBook.find({ active: true })
        .sort({ currentTrendScore: -1 })
        .limit(5)
        .select('title author currentTrendScore')
        .lean();

      const risingTrends = await MarketingBookTrendMetrics.getRisingTrends({
        limit: 5
      });

      const decliningTrends = await MarketingBookTrendMetrics.getDecliningTrends({
        limit: 3
      });

      const summary = {
        period: 'week',
        startDate: weekAgo,
        endDate: new Date(),
        topBooks: topBooks.map(b => ({
          title: b.title,
          author: b.author,
          trendScore: b.currentTrendScore
        })),
        risingTrends: risingTrends.map(t => ({
          name: t.entityName,
          velocity: t.trendVelocity,
          type: t.entityType
        })),
        decliningTrends: decliningTrends.map(t => ({
          name: t.entityName,
          velocity: t.trendVelocity,
          type: t.entityType
        })),
        generatedAt: new Date()
      };

      // Create alert for weekly summary
      await MarketingTrendAlert.create({
        alertType: 'opportunity',
        title: 'Weekly BookTok Trend Summary',
        description: `Summary of top trends for the week. Top book: "${topBooks[0]?.title || 'N/A'}". Rising trends: ${risingTrends.length} topics gaining momentum.`,
        severity: 'low',
        entityType: 'general',
        data: {
          summary
        }
      });

      return summary;

    } catch (error) {
      logger.error('Error generating weekly summary', {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Get active alerts
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Active alerts
   */
  async getActiveAlerts(options = {}) {
    const {
      alertType,
      severity,
      limit = 50
    } = options;

    try {
      const query = {
        acknowledged: false,
        $or: [
          { validUntil: { $exists: false } },
          { validUntil: { $gte: new Date() } }
        ]
      };

      if (alertType) query.alertType = alertType;
      if (severity) query.severity = severity;

      return await MarketingTrendAlert
        .find(query)
        .sort({ createdAt: -1, priority: -1 })
        .limit(limit)
        .lean();

    } catch (error) {
      logger.error('Error getting active alerts', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Acknowledge an alert
   * @param {string} alertId - Alert ID
   * @param {string} userId - User acknowledging
   * @returns {Promise<Object>} Acknowledged alert
   */
  async acknowledgeAlert(alertId, userId = 'system') {
    try {
      return await MarketingTrendAlert.findByIdAndUpdate(
        alertId,
        {
          acknowledged: true,
          acknowledgedBy: userId,
          acknowledgedAt: new Date()
        },
        { new: true }
      ).lean();

    } catch (error) {
      logger.error('Error acknowledging alert', {
        error: error.message,
        alertId
      });
      return null;
    }
  }

  /**
   * Send SSE notification for an alert
   * @param {Object} alert - Alert data
   */
  async sendSSENotification(alert) {
    try {
      if (sseService && typeof sseService.broadcast === 'function') {
        sseService.broadcast('trend_alert', {
          id: alert._id,
          type: alert.alertType,
          title: alert.title,
          severity: alert.severity,
          description: alert.description,
          createdAt: alert.createdAt
        });

        logger.debug('SSE notification sent for alert', {
          alertId: alert._id,
          type: alert.alertType
        });
      }
    } catch (error) {
      logger.error('Error sending SSE notification', {
        error: error.message
      });
    }
  }

  /**
   * Clean up old alerts
   * @returns {Promise<number>} Number of alerts cleaned
   */
  async cleanupOldAlerts() {
    try {
      const count = await MarketingTrendAlert.cleanOldAlerts(30);
      logger.info('Old alerts cleaned', { count });
      return count;
    } catch (error) {
      logger.error('Error cleaning old alerts', {
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Get alert summary statistics
   * @returns {Promise<Object>} Alert summary
   */
  async getAlertSummary() {
    try {
      return await MarketingTrendAlert.getSummary({
        excludeAcknowledged: true
      });
    } catch (error) {
      logger.error('Error getting alert summary', {
        error: error.message
      });
      return {};
    }
  }

  /**
   * Clear alert cooldowns
   */
  clearCooldowns() {
    this.alertCooldowns.clear();
    logger.info('Alert cooldowns cleared');
  }

  /**
   * Get service status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      cooldownsActive: this.alertCooldowns.size,
      cooldownPeriod: this.cooldownPeriod
    };
  }
}

// Export singleton instance
const alertSystemService = new AlertSystemService();
export default alertSystemService;
