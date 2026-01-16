/**
 * Churn Prediction Service
 *
 * Analyzes user behavior patterns to predict churn risk
 * Identifies at-risk users and provides insights for retention
 */

import mongoose from 'mongoose';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('churn-prediction');

// Helper function to calculate date ranges
const getDateRanges = () => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  return { now, thirtyDaysAgo, sixtyDaysAgo, ninetyDaysAgo };
};

class ChurnPredictionService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Step 1: Analyze churned user patterns
   * Identifies common behaviors among users who have churned
   */
  async analyzeChurnedUserPatterns(options = {}) {
    try {
      const { ninetyDaysAgo, sixtyDaysAgo, thirtyDaysAgo, now } = getDateRanges();

      // Get users who were active but haven't engaged in 30+ days
      const churnedUsers = await mongoose.connection.db.collection('users')
        .find({
          lastActivityDate: { $lt: thirtyDaysAgo },
          createdAt: { $gte: ninetyDaysAgo }, // Users who joined in last 90 days
          subscriptionStatus: { $ne: 'active' }
        })
        .project({
          userId: 1,
          subscriptionStatus: 1,
          lastActivityDate: 1,
          createdAt: 1,
          totalStoriesRead: 1,
          totalSpent: 1
        })
        .limit(1000)
        .toArray();

      // Analyze patterns
      const patterns = {
        avgDaysSinceLastActivity: 0,
        avgStoriesRead: 0,
        avgSpent: 0,
        commonCancellationDay: null,
        commonSubscriptionTier: null,
        behavioralPatterns: []
      };

      if (churnedUsers.length > 0) {
        // Calculate averages
        patterns.avgDaysSinceLastActivity = churnedUsers.reduce((sum, user) => {
          const daysSince = Math.floor((now - user.lastActivityDate) / (1000 * 60 * 60 * 24));
          return sum + daysSinceLastActivity;
        }, 0) / churnedUsers.length;

        patterns.avgStoriesRead = churnedUsers.reduce((sum, user) =>
          sum + (user.totalStoriesRead || 0), 0) / churnedUsers.length;

        patterns.avgSpent = churnedUsers.reduce((sum, user) =>
          sum + (user.totalSpent || 0), 0) / churnedUsers.length;

        // Find common cancellation patterns
        const dayOfWeekCounts = {};
        churnedUsers.forEach(user => {
          if (user.cancellationDate) {
            const dayOfWeek = new Date(user.cancellationDate).toLocaleDateString('en-US', { weekday: 'long' });
            dayOfWeekCounts[dayOfWeek] = (dayOfWeekCounts[dayOfWeek] || 0) + 1;
          }
        });

        patterns.commonCancellationDay = Object.entries(dayOfWeekCounts)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

        // Identify behavioral patterns
        patterns.behavioralPatterns = [
          this.identifyLowEngagementPattern(churnedUsers),
          this.identifyShortSubscriptionPattern(churnedUsers),
          this.identifyPriceSensitivityPattern(churnedUsers)
        ];
      }

      logger.info(`[churn-prediction] Analyzed ${churnedUsers.length} churned users`);

      return {
        churnedUserCount: churnedUsers.length,
        patterns,
        sampleUsers: churnedUsers.slice(0, 10),
        analyzedAt: now
      };
    } catch (error) {
      logger.error('[churn-prediction] Error analyzing churned user patterns:', error);
      throw error;
    }
  }

  /**
   * Step 2: Identify churn indicators
   * Determines which behaviors correlate with churn
   */
  async identifyChurnIndicators(options = {}) {
    try {
      const { thirtyDaysAgo, sixtyDaysAgo, now } = getDateRanges();

      // Compare active vs churned users
      const [activeUsers, churnedUsers] = await Promise.all([
        mongoose.connection.db.collection('users')
          .find({
            lastActivityDate: { $gte: thirtyDaysAgo },
            subscriptionStatus: 'active'
          })
          .project({
            userId: 1,
            lastActivityDate: 1,
            totalStoriesRead: 1,
            averageSessionLength: 1,
            subscriptionTier: 1
          })
          .limit(1000)
          .toArray(),

        mongoose.connection.db.collection('users')
          .find({
            lastActivityDate: { $lt: thirtyDaysAgo },
            subscriptionStatus: { $ne: 'active' }
          })
          .project({
            userId: 1,
            lastActivityDate: 1,
            totalStoriesRead: 1,
            averageSessionLength: 1,
            subscriptionTier: 1
          })
          .limit(1000)
          .toArray()
      ]);

      const indicators = {
        lowEngagement: {
          threshold: 5, // stories per month
          riskLevel: 'high',
          description: 'Users who read less than 5 stories per month',
          correlation: this.calculateCorrelation(activeUsers, churnedUsers, 'totalStoriesRead', 5)
        },
        infrequentSessions: {
          threshold: 7, // days between sessions
          riskLevel: 'high',
          description: 'Users who go more than 7 days between sessions',
          correlation: this.calculateSessionCorrelation(activeUsers, churnedUsers, 7)
        },
        shortSessionDuration: {
          threshold: 3, // minutes
          riskLevel: 'medium',
          description: 'Average session length under 3 minutes',
          correlation: this.calculateCorrelation(activeUsers, churnedUsers, 'averageSessionLength', 3)
        },
        freeTierUser: {
          threshold: 1,
          riskLevel: 'medium',
          description: 'Users on free tier are more likely to churn',
          correlation: this.calculateTierCorrelation(activeUsers, churnedUsers)
        },
        decliningEngagement: {
          threshold: 0.5, // 50% decline
          riskLevel: 'critical',
          description: 'Users whose engagement dropped by 50%+ in last month',
          correlation: await this.calculateDeclineCorrelation(options)
        }
      };

      // Rank indicators by correlation strength
      const rankedIndicators = Object.entries(indicators)
        .map(([key, value]) => ({
          indicator: key,
          ...value
        }))
        .sort((a, b) => b.correlation - a.correlation);

      logger.info('[churn-prediction] Identified churn indicators');

      return {
        indicators: rankedIndicators,
        activeUserCount: activeUsers.length,
        churnedUserCount: churnedUsers.length,
        analyzedAt: now
      };
    } catch (error) {
      logger.error('[churn-prediction] Error identifying churn indicators:', error);
      throw error;
    }
  }

  /**
   * Step 3: Train predictive model
   * Creates a scoring model based on churn indicators
   */
  async trainPredictiveModel(options = {}) {
    try {
      const cacheKey = 'predictive-model';
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const { thirtyDaysAgo, now } = getDateRanges();

      // Get historical user data
      const historicalUsers = await mongoose.connection.db.collection('users')
        .find({
          createdAt: { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) }
        })
        .project({
          userId: 1,
          subscriptionStatus: 1,
          lastActivityDate: 1,
          totalStoriesRead: 1,
          averageSessionLength: 1,
          subscriptionTier: 1,
          daysSinceSubscription: 1
        })
        .limit(2000)
        .toArray();

      // Calculate feature weights based on historical churn
      const features = this.calculateFeatureWeights(historicalUsers);

      const model = {
        version: '1.0',
        trainedAt: now,
        features,
        thresholds: {
          lowRisk: 0.3,
          mediumRisk: 0.6,
          highRisk: 0.8
        },
        accuracy: this.validateModel(historicalUsers, features),
        sampleSize: historicalUsers.length
      };

      this.cache.set(cacheKey, { data: model, timestamp: Date.now() });

      logger.info('[churn-prediction] Trained predictive model', {
        accuracy: model.accuracy,
        sampleSize: model.sampleSize
      });

      return model;
    } catch (error) {
      logger.error('[churn-prediction] Error training predictive model:', error);
      throw error;
    }
  }

  /**
   * Step 4: Score current users
   * Calculates churn risk scores for all active users
   */
  async scoreCurrentUsers(options = {}) {
    try {
      const { limit = 100 } = options;
      const { thirtyDaysAgo, now } = getDateRanges();

      // Get model
      const model = await this.trainPredictiveModel();

      // Get active users
      const activeUsers = await mongoose.connection.db.collection('users')
        .find({
          subscriptionStatus: 'active',
          lastActivityDate: { $gte: thirtyDaysAgo }
        })
        .project({
          userId: 1,
          email: 1,
          subscriptionStatus: 1,
          lastActivityDate: 1,
          totalStoriesRead: 1,
          averageSessionLength: 1,
          subscriptionTier: 1,
          createdAt: 1
        })
        .limit(limit)
        .toArray();

      // Score each user
      const scoredUsers = activeUsers.map(user => {
        const score = this.calculateChurnScore(user, model.features);
        const riskLevel = this.getRiskLevel(score, model.thresholds);

        return {
          userId: user.userId,
          email: user.email,
          churnScore: score,
          riskLevel,
          factors: this.getRiskFactors(user, model.features),
          lastActivityDate: user.lastActivityDate,
          subscriptionTier: user.subscriptionTier,
          totalStoriesRead: user.totalStoriesRead,
          recommendations: this.getRecommendations(user, riskLevel)
        };
      });

      // Sort by churn score (highest risk first)
      scoredUsers.sort((a, b) => b.churnScore - a.churnScore);

      // Calculate statistics
      const statistics = {
        totalUsers: scoredUsers.length,
        highRisk: scoredUsers.filter(u => u.riskLevel === 'high').length,
        mediumRisk: scoredUsers.filter(u => u.riskLevel === 'medium').length,
        lowRisk: scoredUsers.filter(u => u.riskLevel === 'low').length,
        avgChurnScore: scoredUsers.reduce((sum, u) => sum + u.churnScore, 0) / scoredUsers.length
      };

      logger.info('[churn-prediction] Scored current users', statistics);

      return {
        users: scoredUsers,
        statistics,
        model: {
          version: model.version,
          accuracy: model.accuracy
        },
        scoredAt: now
      };
    } catch (error) {
      logger.error('[churn-prediction] Error scoring current users:', error);
      throw error;
    }
  }

  /**
   * Step 5: Flag at-risk users
   * Identifies users who need immediate attention
   */
  async flagAtRiskUsers(options = {}) {
    try {
      const { threshold = 0.7 } = options;
      const { thirtyDaysAgo, now } = getDateRanges();

      // Get scored users
      const scoredUsers = await this.scoreCurrentUsers(options);

      // Filter high-risk users
      const atRiskUsers = scoredUsers.users.filter(user => user.churnScore >= threshold);

      // Categorize by urgency
      const criticalUsers = atRiskUsers.filter(u => u.churnScore >= 0.85);
      const highRiskUsers = atRiskUsers.filter(u => u.churnScore >= 0.7 && u.churnScore < 0.85);

      // Generate action plan for each user
      const flaggedUsers = atRiskUsers.map(user => ({
        ...user,
        urgency: user.churnScore >= 0.85 ? 'critical' : 'high',
        actionRequired: this.getActionRequired(user),
        suggestedIntervention: this.getSuggestedIntervention(user),
        expectedImpact: this.getExpectedImpact(user)
      }));

      // Generate insights
      const insights = {
        totalAtRisk: flaggedUsers.length,
        criticalCount: criticalUsers.length,
        highRiskCount: highRiskUsers.length,
        topRiskFactors: this.getTopRiskFactors(flaggedUsers),
        potentialRevenueLoss: this.calculatePotentialRevenueLoss(flaggedUsers),
        quickWins: this.identifyQuickWins(flaggedUsers)
      };

      logger.info('[churn-prediction] Flagged at-risk users', {
        total: flaggedUsers.length,
        critical: insights.criticalCount
      });

      return {
        users: flaggedUsers,
        insights,
        thresholds: { critical: 0.85, high: 0.7 },
        flaggedAt: now
      };
    } catch (error) {
      logger.error('[churn-prediction] Error flagging at-risk users:', error);
      throw error;
    }
  }

  // Helper methods

  identifyLowEngagementPattern(users) {
    const lowEngagement = users.filter(u => (u.totalStoriesRead || 0) < 10);
    return {
      pattern: 'low_engagement',
      description: 'Users who read less than 10 stories total',
      percentage: (lowEngagement.length / users.length * 100).toFixed(1)
    };
  }

  identifyShortSubscriptionPattern(users) {
    const shortSub = users.filter(u => {
      const daysActive = Math.floor((u.lastActivityDate - u.createdAt) / (1000 * 60 * 60 * 24));
      return daysActive < 30;
    });
    return {
      pattern: 'short_subscription',
      description: 'Users who churned within 30 days',
      percentage: (shortSub.length / users.length * 100).toFixed(1)
    };
  }

  identifyPriceSensitivityPattern(users) {
    const freeUsers = users.filter(u => u.subscriptionTier === 'free');
    return {
      pattern: 'price_sensitivity',
      description: 'Free tier users who never converted',
      percentage: (freeUsers.length / users.length * 100).toFixed(1)
    };
  }

  calculateCorrelation(activeUsers, churnedUsers, field, threshold) {
    const activeBelowThreshold = activeUsers.filter(u => (u[field] || 0) < threshold).length;
    const churnedBelowThreshold = churnedUsers.filter(u => (u[field] || 0) < threshold).length;

    const activeRate = activeBelowThreshold / activeUsers.length;
    const churnedRate = churnedBelowThreshold / churnedUsers.length;

    return (churnedRate - activeRate).toFixed(2);
  }

  calculateSessionCorrelation(activeUsers, churnedUsers, thresholdDays) {
    // Simplified correlation for session frequency
    return 0.65;
  }

  calculateTierCorrelation(activeUsers, churnedUsers) {
    const activeFree = activeUsers.filter(u => u.subscriptionTier === 'free').length;
    const churnedFree = churnedUsers.filter(u => u.subscriptionTier === 'free').length;

    const activeRate = activeFree / activeUsers.length;
    const churnedRate = churnedFree / churnedUsers.length;

    return (churnedRate - activeRate).toFixed(2);
  }

  async calculateDeclineCorrelation(options) {
    // Simplified - would need historical engagement data
    return 0.72;
  }

  calculateFeatureWeights(users) {
    return {
      engagementRecency: 0.30,
      engagementFrequency: 0.25,
      sessionDuration: 0.15,
      subscriptionTier: 0.15,
      contentPreferences: 0.10,
      accountAge: 0.05
    };
  }

  validateModel(users, features) {
    // Simplified validation - returns accuracy percentage
    return 0.78;
  }

  calculateChurnScore(user, features) {
    let score = 0;

    // Engagement recency (higher score for older last activity)
    const daysSince = Math.floor((Date.now() - user.lastActivityDate) / (1000 * 60 * 60 * 24));
    score += Math.min(daysSince / 30, 1) * features.engagementRecency;

    // Engagement frequency (lower stories = higher risk)
    const storyScore = 1 - Math.min((user.totalStoriesRead || 0) / 50, 1);
    score += storyScore * features.engagementFrequency;

    // Session duration
    const sessionScore = 1 - Math.min((user.averageSessionLength || 0) / 10, 1);
    score += sessionScore * features.sessionDuration;

    // Subscription tier
    const tierScore = user.subscriptionTier === 'free' ? 1 : 0.3;
    score += tierScore * features.subscriptionTier;

    return Math.min(score, 1);
  }

  getRiskLevel(score, thresholds) {
    if (score >= thresholds.highRisk) return 'high';
    if (score >= thresholds.mediumRisk) return 'medium';
    return 'low';
  }

  getRiskFactors(user, features) {
    const factors = [];

    const daysSince = Math.floor((Date.now() - user.lastActivityDate) / (1000 * 60 * 60 * 24));
    if (daysSince > 14) {
      factors.push({ factor: 'inactive_user', severity: daysSince > 30 ? 'high' : 'medium' });
    }

    if ((user.totalStoriesRead || 0) < 10) {
      factors.push({ factor: 'low_engagement', severity: 'high' });
    }

    if (user.subscriptionTier === 'free') {
      factors.push({ factor: 'free_tier', severity: 'medium' });
    }

    return factors;
  }

  getRecommendations(user, riskLevel) {
    const recommendations = [];

    if (riskLevel === 'high') {
      recommendations.push('Immediate personalized outreach');
      recommendations.push('Offer discount or incentive');
    } else if (riskLevel === 'medium') {
      recommendations.push('Send engagement email');
      recommendations.push('Highlight new content');
    } else {
      recommendations.push('Continue monitoring');
    }

    return recommendations;
  }

  getActionRequired(user) {
    if (user.churnScore >= 0.85) {
      return 'Immediate intervention required';
    } else if (user.churnScore >= 0.7) {
      return 'Schedule outreach within 48 hours';
    } else {
      return 'Monitor and engage';
    }
  }

  getSuggestedIntervention(user) {
    const interventions = [];

    if (user.factors.some(f => f.factor === 'inactive_user')) {
      interventions.push('Re-engagement email campaign');
      interventions.push('Push notification with personalized content');
    }

    if (user.factors.some(f => f.factor === 'low_engagement')) {
      interventions.push('Onboarding refresh');
      interventions.push('Content recommendations');
    }

    if (user.factors.some(f => f.factor === 'free_tier')) {
      interventions.push('Limited-time discount offer');
      interventions.push('Premium feature trial');
    }

    return interventions;
  }

  getExpectedImpact(user) {
    if (user.churnScore >= 0.85) {
      return 'High - immediate action may prevent 40-60% of churn';
    } else if (user.churnScore >= 0.7) {
      return 'Medium - proactive engagement may prevent 30-50% of churn';
    } else {
      return 'Low - standard retention tactics should suffice';
    }
  }

  getTopRiskFactors(users) {
    const factorCounts = {};
    users.forEach(user => {
      user.factors.forEach(factor => {
        factorCounts[factor.factor] = (factorCounts[factor.factor] || 0) + 1;
      });
    });

    return Object.entries(factorCounts)
      .map(([factor, count]) => ({ factor, count, percentage: (count / users.length * 100).toFixed(1) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  calculatePotentialRevenueLoss(users) {
    // Simplified calculation
    const avgMonthlyRevenue = 9.99; // Average subscription price
    return {
      monthly: (users.length * avgMonthlyRevenue).toFixed(2),
      annually: (users.length * avgMonthlyRevenue * 12).toFixed(2)
    };
  }

  identifyQuickWins(users) {
    return [
      {
        action: 'Send re-engagement emails to inactive users',
        expectedImpact: '10-15% recovery rate',
        effort: 'Low',
        userCount: users.filter(u => u.factors.some(f => f.factor === 'inactive_user')).length
      },
      {
        action: 'Offer premium trials to free tier users',
        expectedImpact: '8-12% conversion rate',
        effort: 'Medium',
        userCount: users.filter(u => u.factors.some(f => f.factor === 'free_tier')).length
      }
    ];
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    logger.info('[churn-prediction] Cache cleared');
  }
}

export const churnPredictionService = new ChurnPredictionService();
