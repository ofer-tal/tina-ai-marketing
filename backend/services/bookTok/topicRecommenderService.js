/**
 * Topic Recommender Service
 *
 * Generates prioritized topic recommendations for content creation.
 *
 * Algorithm:
 * Priority Score = (Trend Score × 0.4) - (Competition × 0.3) + (Engagement Potential × 0.3)
 *
 * Returns prioritized topics with reasoning and suggestions.
 */

import { getLogger } from '../../utils/logger.js';
import MarketingTopicRecommendation from '../../models/MarketingTopicRecommendation.js';
import MarketingBookTrendMetrics from '../../models/MarketingBookTrendMetrics.js';
import MarketingBook from '../../models/MarketingBook.js';
import glmService from '../glmService.js';

const logger = getLogger('services', 'booktok-topic-recommender');

// Topic categories
const TOPIC_CATEGORIES = [
  'contemporary_romance',
  'fantasy_romance',
  'dark_romance',
  'spicy_books',
  'clean_romance',
  'trope_specific',
  'book_format',
  'reading_tropes',
  'author_spotlight',
  'series_focus'
];

// Common romance tropes for topic generation
const COMMON_TROPES = [
  'enemies to lovers',
  'fake dating',
  'friends to lovers',
  'forced proximity',
  'grumpy x sunshine',
  'one bed only',
  'age gap',
  'single dad',
  'arranged marriage',
  'second chance romance',
  'touch her and die',
  'who did this to you',
  'childhood friends',
  'academic rivals',
  'office romance',
  'small town romance'
];

class TopicRecommenderService {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Get topic recommendations
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Recommended topics
   */
  async getTopicRecommendations(options = {}) {
    const {
      date = new Date(),
      limit = 20,
      platform = 'all',
      minPriorityScore = 40
    } = options;

    try {
      logger.info('Getting topic recommendations', {
        date,
        limit,
        platform
      });

      // First, get or generate recommendations for the date
      let recommendations = await MarketingTopicRecommendation.find({
        validFrom: { $lte: date },
        validUntil: { $gte: date },
        status: 'pending'
      })
        .sort({ priorityScore: -1 })
        .limit(limit)
        .lean();

      // If no recommendations exist, generate them
      if (recommendations.length === 0) {
        recommendations = await this.generateRecommendations(date, limit, platform);
      }

      // Filter by minimum priority score
      recommendations = recommendations.filter(r => r.priorityScore >= minPriorityScore);

      logger.info('Topic recommendations retrieved', {
        count: recommendations.length
      });

      return recommendations;

    } catch (error) {
      logger.error('Error getting topic recommendations', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Generate new recommendations
   * @param {Date} date - Date for recommendations
   * @param {number} limit - Number of recommendations
   * @param {string} platform - Platform filter
   * @returns {Promise<Array>} Generated recommendations
   */
  async generateRecommendations(date, limit, platform) {
    logger.info('Generating new topic recommendations', { date, limit });

    // Get trending topics
    const trendingTopics = await this.getTrendingTopics(platform);

    // Generate recommendations for each trending topic
    const recommendations = [];

    for (const topic of trendingTopics.slice(0, limit * 2)) {
      try {
        const priorityScore = await this.calculatePriorityScore(topic.entityName, platform);
        const competitionLevel = await this.getTopicCompetitionLevel(topic.entityName);
        const engagementPotential = await this.getTopicEngagementPotential(topic.entityName);

        // Create recommendation
        const recommendation = await MarketingTopicRecommendation.create({
          topic: topic.entityName,
          priorityScore,
          trendScore: topic.avgTrendVelocity || 0,
          competitionLevel,
          engagementPotential,
          suggestedBooks: await this.getSuggestedBooks(topic.entityName),
          suggestedHooks: await this.getSuggestedHooks(topic.entityName),
          suggestedHashtags: await this.getSuggestedHashtags(topic.entityName, platform),
          reasoning: await this.generateReasoning(topic, competitionLevel, engagementPotential),
          validFrom: date,
          validUntil: new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000), // Valid for 7 days
          status: 'pending'
        });

        recommendations.push(recommendation);

      } catch (error) {
        logger.error('Error creating recommendation for topic', {
          error: error.message,
          topic: topic.entityName
        });
      }
    }

    // Sort by priority score
    recommendations.sort((a, b) => b.priorityScore - a.priorityScore);

    logger.info('Generated topic recommendations', {
      count: recommendations.length
    });

    return recommendations.slice(0, limit);
  }

  /**
   * Get trending topics
   * @param {string} platform - Platform filter
   * @returns {Promise<Array>} Trending topics
   */
  async getTrendingTopics(platform) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7); // Last 7 days

      const topics = await MarketingBookTrendMetrics.aggregate([
        {
          $match: {
            entityType: 'topic',
            platform,
            timestamp: { $gte: cutoffDate }
          }
        },
        {
          $group: {
            _id: '$entityId',
            entityName: { $first: '$entityName' },
            avgMentionCount: { $avg: '$mentionCount' },
            avgEngagementRate: { $avg: '$avgEngagementRate' },
            avgTrendVelocity: { $avg: '$trendVelocity' },
            trendDirection: { $last: '$trendDirection' },
            dataPoints: { $sum: 1 }
          }
        },
        {
          $sort: { avgTrendVelocity: -1 }
        },
        {
          $limit: 50
        }
      ]);

      return topics.map(t => ({
        entityId: t._id,
        entityName: t.entityName,
        avgMentionCount: t.avgMentionCount,
        avgEngagementRate: t.avgEngagementRate,
        avgTrendVelocity: t.avgTrendVelocity,
        trendDirection: t.trendDirection
      }));

    } catch (error) {
      logger.error('Error getting trending topics', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Calculate priority score for a topic
   * @param {string} topic - Topic name
   * @param {string} platform - Platform
   * @returns {Promise<number>} Priority score (0-100)
   */
  async calculatePriorityScore(topic, platform) {
    const trendScore = await this.getTrendScore(topic, platform);
    const competitionLevel = await this.getTopicCompetitionLevel(topic);
    const engagementPotential = await this.getTopicEngagementPotential(topic);

    // Formula: (trend × 0.4) + ((100 - competition) × 0.3) + (engagement × 0.3)
    const trendComponent = trendScore * 0.4;
    const competitionComponent = ((100 - competitionLevel) / 100) * 40 * 0.3;
    const engagementComponent = engagementPotential * 0.3;

    const score = trendComponent + competitionComponent + engagementComponent;

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * Get trend score for a topic
   * @param {string} topic - Topic name
   * @param {string} platform - Platform
   * @returns {Promise<number>} Trend score (0-100)
   */
  async getTrendScore(topic, platform) {
    try {
      const metric = await MarketingBookTrendMetrics
        .findOne({
          entityType: 'topic',
          entityName: topic,
          platform
        })
        .sort({ timestamp: -1 })
        .lean();

      if (!metric) {
        return 30; // Default score for unknown topics
      }

      let score = 50; // Base score

      // Adjust based on trend direction
      if (metric.trendDirection === 'rising') {
        score += 30;
      } else if (metric.trendDirection === 'stable') {
        score += 10;
      } else if (metric.trendDirection === 'falling') {
        score -= 20;
      }

      // Adjust based on velocity
      score += Math.min(20, Math.max(-20, metric.trendVelocity / 10));

      return Math.round(Math.max(0, Math.min(100, score)));

    } catch (error) {
      logger.error('Error getting trend score', {
        error: error.message,
        topic
      });
      return 30;
    }
  }

  /**
   * Get topic competition level
   * @param {string} topic - Topic name
   * @returns {Promise<number>} Competition level (0-100, higher = more competition)
   */
  async getTopicCompetitionLevel(topic) {
    try {
      // Check recent metrics for mention frequency
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);

      const metrics = await MarketingBookTrendMetrics.find({
        entityType: 'topic',
        entityName: topic,
        timestamp: { $gte: cutoffDate }
      }).lean();

      if (!metrics || metrics.length === 0) {
        return 30; // Low competition for unknown topics
      }

      const totalMentions = metrics.reduce((sum, m) => sum + m.mentionCount, 0);
      const avgMentions = totalMentions / metrics.length;

      // Convert mentions to competition score
      // More mentions = higher competition
      let competition = Math.min(100, avgMentions * 2);

      // Adjust for trend direction (rising topics have more competition)
      const latestDirection = metrics[metrics.length - 1]?.trendDirection;
      if (latestDirection === 'rising') {
        competition += 20;
      }

      return Math.round(Math.max(0, Math.min(100, competition)));

    } catch (error) {
      logger.error('Error getting competition level', {
        error: error.message,
        topic
      });
      return 50;
    }
  }

  /**
   * Get topic engagement potential
   * @param {string} topic - Topic name
   * @returns {Promise<number>} Engagement potential (0-100)
   */
  async getTopicEngagementPotential(topic) {
    try {
      const metric = await MarketingBookTrendMetrics
        .findOne({
          entityType: 'topic',
          entityName: topic
        })
        .sort({ timestamp: -1 })
        .lean();

      if (!metric) {
        return 50; // Default potential
      }

      // Base on average engagement rate
      let potential = metric.avgEngagementRate * 5; // Scale up

      // Boost for rising trends
      if (metric.trendDirection === 'rising') {
        potential += 20;
      }

      return Math.round(Math.max(0, Math.min(100, potential)));

    } catch (error) {
      logger.error('Error getting engagement potential', {
        error: error.message,
        topic
      });
      return 50;
    }
  }

  /**
   * Get suggested books for a topic
   * @param {string} topic - Topic name
   * @returns {Promise<Array>} Suggested books
   */
  async getSuggestedBooks(topic) {
    try {
      // Find books related to topic
      const topicLower = topic.toLowerCase();

      let books = await MarketingBook.find({
        active: true,
        $or: [
          { tropes: { $regex: topicLower, $options: 'i' } },
          { themes: { $regex: topicLower, $options: 'i' } },
          { genre: { $regex: topicLower, $options: 'i' } }
        ]
      })
        .sort({ currentTrendScore: -1 })
        .limit(3)
        .select('title author currentTrendScore')
        .lean();

      // If no books found, suggest popular books
      if (books.length === 0) {
        books = await MarketingBook.find({ active: true })
          .sort({ currentTrendScore: -1 })
          .limit(3)
          .select('title author currentTrendScore')
          .lean();
      }

      return books.map(b => ({
        title: b.title,
        author: b.author,
        angle: `Connect "${b.title}" to ${topic}`,
        reason: `Trending score: ${b.currentTrendScore}`
      }));

    } catch (error) {
      logger.error('Error getting suggested books', {
        error: error.message,
        topic
      });
      return [];
    }
  }

  /**
   * Get suggested hooks for a topic
   * @param {string} topic - Topic name
   * @returns {Promise<Array>} Suggested hooks
   */
  async getSuggestedHooks(topic) {
    try {
      const hooks = await MarketingHookPattern.find({
        active: true,
        'worksBestFor.topics': topic
      })
        .sort({ avgEngagementRate: -1 })
        .limit(3)
        .select('hookTemplate avgEngagementRate category')
        .lean();

      if (hooks.length === 0) {
        // Generate generic hooks for topic
        return [
          {
            template: `What's the last ${topic} book you couldn't put down?`,
            category: 'question',
            expectedEngagementRate: 7
          },
          {
            template: `I have a confession about ${topic}...`,
            category: 'confession',
            expectedEngagementRate: 6
          }
        ];
      }

      return hooks.map(h => ({
        template: h.hookTemplate,
        category: h.category,
        expectedEngagementRate: h.avgEngagementRate
      }));

    } catch (error) {
      logger.error('Error getting suggested hooks', {
        error: error.message,
        topic
      });
      return [];
    }
  }

  /**
   * Get suggested hashtags for a topic
   * @param {string} topic - Topic name
   * @param {string} platform - Platform
   * @returns {Promise<Array>} Suggested hashtags
   */
  async getSuggestedHashtags(topic, platform) {
    try {
      const topicLower = topic.toLowerCase().replace(/\s+/g, '');

      const hashtags = await MarketingHashtagPerformance.find({
        platform,
        active: true,
        'overuseRisk.level': { $in: ['low', 'medium'] },
        $or: [
          { hashtag: { $regex: topicLower, $options: 'i' } },
          { category: { $regex: topicLower, $options: 'i' } }
        ]
      })
        .sort({ engagementRate: -1 })
        .limit(5)
        .select('hashtag engagementRate')
        .lean();

      return hashtags.map(h => ({
        hashtag: h.hashtag,
        reason: `Avg engagement: ${h.engagementRate.toFixed(1)}%`,
        engagementRate: h.engagementRate
      }));

    } catch (error) {
      logger.error('Error getting suggested hashtags', {
        error: error.message,
        topic
      });
      return [];
    }
  }

  /**
   * Generate reasoning for recommendation
   * @param {Object} topic - Topic data
   * @param {number} competitionLevel - Competition score
   * @param {number} engagementPotential - Engagement potential
   * @returns {Promise<string>} Reasoning text
   */
  async generateReasoning(topic, competitionLevel, engagementPotential) {
    try {
      const prompt = `Explain in 1-2 sentences why "${topic.entityName}" is a good topic for a romance book community social media post. Consider it's trending with ${topic.avgTrendVelocity?.toFixed(1) || 0}% velocity, has ${competitionLevel}/100 competition, and ${engagementPotential}/100 engagement potential.`;

      const response = await glmService.generate([
        { role: 'system', content: 'You are a social media content strategist. Keep responses concise and actionable.' },
        { role: 'user', content: prompt }
      ], { temperature: 0.7 });

      return response.content || `Topic "${topic.entityName}" shows strong potential with ${topic.trendDirection} trend direction.`;

    } catch (error) {
      logger.error('Error generating reasoning', {
        error: error.message
      });
      return `Topic "${topic.entityName}" shows strong trend momentum (${topic.trendDirection}) with good engagement potential.`;
    }
  }

  /**
   * Accept a recommendation
   * @param {string} recommendationId - Recommendation ID
   * @param {string} userId - User accepting
   * @returns {Promise<Object>} Updated recommendation
   */
  async acceptRecommendation(recommendationId, userId = 'system') {
    try {
      return await MarketingTopicRecommendation.findByIdAndUpdate(
        recommendationId,
        {
          status: 'accepted',
          acceptedBy: userId,
          acceptedAt: new Date()
        },
        { new: true }
      ).lean();

    } catch (error) {
      logger.error('Error accepting recommendation', {
        error: error.message,
        recommendationId
      });
      return null;
    }
  }

  /**
   * Reject a recommendation
   * @param {string} recommendationId - Recommendation ID
   * @param {string} userId - User rejecting
   * @param {string} reason - Rejection reason
   * @returns {Promise<Object>} Updated recommendation
   */
  async rejectRecommendation(recommendationId, userId = 'system', reason = '') {
    try {
      return await MarketingTopicRecommendation.findByIdAndUpdate(
        recommendationId,
        {
          status: 'rejected',
          rejectedBy: userId,
          rejectedAt: new Date(),
          rejectionReason: reason
        },
        { new: true }
      ).lean();

    } catch (error) {
      logger.error('Error rejecting recommendation', {
        error: error.message,
        recommendationId
      });
      return null;
    }
  }

  /**
   * Mark recommendation as completed
   * @param {string} recommendationId - Recommendation ID
   * @param {Object} outcome - Outcome data
   * @returns {Promise<Object>} Updated recommendation
   */
  async markCompleted(recommendationId, outcome) {
    try {
      return await MarketingTopicRecommendation.findByIdAndUpdate(
        recommendationId,
        {
          status: 'completed',
          outcome
        },
        { new: true }
      ).lean();

    } catch (error) {
      logger.error('Error marking recommendation completed', {
        error: error.message,
        recommendationId
      });
      return null;
    }
  }

  /**
   * Get recommendation statistics
   * @returns {Promise<Object>} Statistics
   */
  async getRecommendationStats() {
    try {
      const stats = await MarketingTopicRecommendation.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgPriorityScore: { $avg: '$priorityScore' }
          }
        }
      ]);

      return stats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          avgPriorityScore: stat.avgPriorityScore
        };
        return acc;
      }, {});

    } catch (error) {
      logger.error('Error getting recommendation stats', {
        error: error.message
      });
      return {};
    }
  }

  /**
   * Clean expired recommendations
   * @returns {Promise<number>} Number of recommendations expired
   */
  async cleanExpiredRecommendations() {
    try {
      const result = await MarketingTopicRecommendation.updateMany(
        {
          status: 'pending',
          validUntil: { $lt: new Date() }
        },
        {
          status: 'expired'
        }
      );

      logger.info('Expired recommendations cleaned', {
        count: result.modifiedCount
      });

      return result.modifiedCount;

    } catch (error) {
      logger.error('Error cleaning expired recommendations', {
        error: error.message
      });
      return 0;
    }
  }
}

// Export singleton instance
const topicRecommenderService = new TopicRecommenderService();
export default topicRecommenderService;
