/**
 * Content Scorer Service
 *
 * Scores content drafts before posting to predict performance.
 * Multi-factor scoring algorithm with improvement suggestions.
 *
 * Scoring breakdown:
 * - Hook (15pts): Opening line quality
 * - Book reference (15pts): Book relevance and trendiness
 * - Hashtag combo (10pts): Hashtag selection and synergy
 * - Timing (8pts): Optimal posting time
 * - Topic trend (7pts): Current topic popularity
 * - Caption quality (10pts): Caption effectiveness
 * - Uniqueness (10pts): Content originality
 * - Emotional hook (10pts): Emotional engagement
 * - Platform fit (5pts): Platform appropriateness
 *
 * Total: 100 points
 */

import { getLogger } from '../../utils/logger.js';
import MarketingContentScore from '../../models/MarketingContentScore.js';
import MarketingBook from '../../models/MarketingBook.js';
import MarketingHookPattern from '../../models/MarketingHookPattern.js';
import MarketingHashtagPerformance from '../../models/MarketingHashtagPerformance.js';
import MarketingBookTrendMetrics from '../../models/MarketingBookTrendMetrics.js';

const logger = getLogger('services', 'booktok-content-scorer');

// Scoring weights
const SCORING_WEIGHTS = {
  hook: { max: 15, weight: 0.15 },
  bookReference: { max: 15, weight: 0.15 },
  hashtagCombo: { max: 10, weight: 0.10 },
  timing: { max: 8, weight: 0.08 },
  topicTrend: { max: 7, weight: 0.07 },
  captionQuality: { max: 10, weight: 0.10 },
  uniqueness: { max: 10, weight: 0.10 },
  emotionalHook: { max: 10, weight: 0.10 },
  platformFit: { max: 5, weight: 0.05 }
};

// Score thresholds
const SCORE_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 60,
  AVERAGE: 40,
  POOR: 20
};

class ContentScorerService {
  constructor() {
    this.baselineCache = new Map();
    this.cacheExpiry = 60 * 60 * 1000; // 1 hour
  }

  /**
   * Score content draft
   * @param {Object} content - Content data
   * @returns {Promise<Object>} Scoring result
   */
  async scoreContent(content) {
    const {
      hook,
      bookReference,
      hashtags = [],
      caption,
      plannedTime,
      platform = 'tiktok',
      topic,
      spiceLevel,
      postId
    } = content;

    try {
      logger.info('Scoring content', { platform, topic, hasHook: !!hook });

      const scores = {};
      const strengths = [];
      const weaknesses = [];
      const suggestions = [];

      // Score hook (15 points)
      const hookScore = await this.scoreHook(hook, platform);
      scores.hook = hookScore;
      if (hookScore.score >= 12) strengths.push({ category: 'hook', score: hookScore.score, description: hookScore.feedback });
      else if (hookScore.score < 8) weaknesses.push({ category: 'hook', score: hookScore.score, description: hookScore.feedback });

      // Score book reference (15 points)
      const bookScore = await this.scoreBookReference(bookReference, platform);
      scores.bookReference = bookScore;
      if (bookScore.score >= 12) strengths.push({ category: 'bookReference', score: bookScore.score, description: bookScore.feedback });
      else if (bookScore.score < 8) weaknesses.push({ category: 'bookReference', score: bookScore.score, description: bookScore.feedback });

      // Score hashtag combination (10 points)
      const hashtagScore = await this.scoreHashtagCombo(hashtags, platform);
      scores.hashtagCombo = hashtagScore;
      if (hashtagScore.score >= 8) strengths.push({ category: 'hashtags', score: hashtagScore.score, description: hashtagScore.feedback });
      else if (hashtagScore.score < 5) weaknesses.push({ category: 'hashtags', score: hashtagScore.score, description: hashtagScore.feedback });

      // Score timing (8 points)
      const timingScore = this.scoreTiming(plannedTime, platform);
      scores.timing = timingScore;
      if (timingScore.score >= 6) strengths.push({ category: 'timing', score: timingScore.score, description: timingScore.feedback });
      else if (timingScore.score < 4) weaknesses.push({ category: 'timing', score: timingScore.score, description: timingScore.feedback });

      // Score topic trend (7 points)
      const topicScore = await this.scoreTopicTrend(topic, platform);
      scores.topicTrend = topicScore;
      if (topicScore.score >= 5) strengths.push({ category: 'topic', score: topicScore.score, description: topicScore.feedback });

      // Score caption quality (10 points)
      const captionScore = this.scoreCaptionQuality(caption);
      scores.captionQuality = captionScore;
      if (captionScore.score >= 8) strengths.push({ category: 'caption', score: captionScore.score, description: captionScore.feedback });
      else if (captionScore.score < 5) weaknesses.push({ category: 'caption', score: captionScore.score, description: captionScore.feedback });

      // Score uniqueness (10 points)
      const uniquenessScore = await this.scoreUniqueness(hook, caption, topic);
      scores.uniqueness = uniquenessScore;
      if (uniquenessScore.score >= 8) strengths.push({ category: 'uniqueness', score: uniquenessScore.score, description: uniquenessScore.feedback });
      else if (uniquenessScore.score < 5) weaknesses.push({ category: 'uniqueness', score: uniquenessScore.score, description: uniquenessScore.feedback });

      // Score emotional hook (10 points)
      const emotionalScore = this.scoreEmotionalHook(hook, caption);
      scores.emotionalHook = emotionalScore;
      if (emotionalScore.score >= 8) strengths.push({ category: 'emotional', score: emotionalScore.score, description: emotionalScore.feedback });
      else if (emotionalScore.score < 5) weaknesses.push({ category: 'emotional', score: emotionalScore.score, description: emotionalScore.feedback });

      // Score platform fit (5 points)
      const platformScore = this.scorePlatformFit(content, platform);
      scores.platformFit = platformScore;

      // Calculate overall score
      let overallScore = 0;
      for (const key in scores) {
        overallScore += scores[key].score * SCORING_WEIGHTS[key].weight;
      }
      overallScore = Math.round(overallScore);

      // Generate suggestions
      if (scores.hook.score < 10) {
        suggestions.push({
          category: 'hook',
          suggestion: 'Make your hook more compelling with a question or strong opinion',
          potentialImpact: 15,
          priority: 'high'
        });
      }
      if (scores.hashtagCombo.score < 7) {
        suggestions.push({
          category: 'hashtags',
          suggestion: 'Review your hashtag mix - consider using trending but low-saturation tags',
          potentialImpact: 10,
          priority: 'medium'
        });
      }
      if (scores.timing.score < 5) {
        suggestions.push({
          category: 'timing',
          suggestion: 'Consider rescheduling to optimal posting hours (9AM-9PM)',
          potentialImpact: 8,
          priority: 'low'
        });
      }

      // Predict performance
      const prediction = await this.predictPerformance(overallScore, platform, topic);

      const result = {
        postId,
        overallScore,
        scoreBreakdown: scores,
        strengths,
        weaknesses,
        suggestions,
        prediction,
        confidenceLevel: this.calculateConfidence(scores),
        inputData: content
      };

      // Save score if postId provided
      if (postId) {
        await this.saveScore(result);
      }

      logger.info('Content scoring completed', {
        overallScore,
        platform,
        prediction: prediction.predictedViews
      });

      return result;

    } catch (error) {
      logger.error('Error scoring content', {
        error: error.message
      });
      return {
        overallScore: 0,
        error: error.message
      };
    }
  }

  /**
   * Score hook
   * @param {string} hook - Hook text
   * @param {string} platform - Platform
   * @returns {Promise<Object>} Hook score
   */
  async scoreHook(hook, platform) {
    const maxScore = SCORING_WEIGHTS.hook.max;
    let score = 0;
    let feedback = '';

    if (!hook) {
      return { score: 0, max: maxScore, weight: SCORING_WEIGHTS.hook.weight, feedback: 'No hook provided' };
    }

    // Length check
    if (hook.length < 10) {
      return { score: 2, max: maxScore, weight: SCORING_WEIGHTS.hook.weight, feedback: 'Hook is too short' };
    }
    if (hook.length > 15 && hook.length < 100) score += 3;

    // Question hooks perform well
    if (hook.includes('?')) score += 4;

    // Check against high-performing patterns
    try {
      const similarHook = await MarketingHookPattern
        .findOne({
          active: true,
          hookTemplate: { $regex: hook.substring(0, 30), $options: 'i' }
        })
        .sort({ avgEngagementRate: -1 })
        .lean();

      if (similarHook && similarHook.avgEngagementRate > 8) {
        score += 6;
        feedback = 'Matches proven hook pattern';
      } else if (similarHook) {
        score += 3;
        feedback = 'Hook pattern has average performance';
      }
    } catch (e) {
      // Continue without pattern match
    }

    // Emotional words
    const emotionalWords = ['love', 'hate', 'obsessed', 'can\'t', 'stop', 'wait'];
    if (emotionalWords.some(w => hook.toLowerCase().includes(w))) {
      score += 2;
    }

    // Controversial/opinionated
    if (hook.toLowerCase().includes('opinion') || hook.toLowerCase().includes('controversial')) {
      score += 2;
    }

    feedback = feedback || (score >= 10 ? 'Strong hook' : score >= 6 ? 'Decent hook' : 'Hook could be improved');

    return { score: Math.min(maxScore, score), max: maxScore, weight: SCORING_WEIGHTS.hook.weight, feedback };
  }

  /**
   * Score book reference
   * @param {string} bookReference - Book title
   * @param {string} platform - Platform
   * @returns {Promise<Object>} Book reference score
   */
  async scoreBookReference(bookReference, platform) {
    const maxScore = SCORING_WEIGHTS.bookReference.max;
    let score = 0;
    let feedback = '';

    if (!bookReference) {
      return { score: 5, max: maxScore, weight: SCORING_WEIGHTS.bookReference.weight, feedback: 'No specific book mentioned' };
    }

    try {
      const book = await MarketingBook.findOne({
        $or: [
          { title: { $regex: bookReference, $options: 'i' } },
          { goodreadsId: bookReference }
        ]
      }).lean();

      if (book) {
        // Score based on trend score
        if (book.currentTrendScore > 70) score += 8;
        else if (book.currentTrendScore > 40) score += 5;
        else score += 3;

        // Bonus for recent mentions
        const daysSinceMention = book.lastMentionedAt
          ? (Date.now() - book.lastMentionedAt.getTime()) / (1000 * 60 * 60 * 24)
          : 999;
        if (daysSinceMention < 7) score += 4;
        else if (daysSinceMention < 30) score += 2;

        // Check if book has proven angles
        if (book.provenAngles && book.provenAngles.length > 0) {
          score += 3;
        }

        feedback = `Referencing "${book.title}" - ${book.currentTrendScore > 50 ? 'trending' : 'established'} book`;
      } else {
        // Unknown book - give partial credit for mentioning a book
        score = 5;
        feedback = 'Book mentioned but not in our database';
      }
    } catch (e) {
      score = 5;
      feedback = 'Book reference detected';
    }

    return { score: Math.min(maxScore, score), max: maxScore, weight: SCORING_WEIGHTS.bookReference.weight, feedback };
  }

  /**
   * Score hashtag combination
   * @param {Array} hashtags - Hashtag array
   * @param {string} platform - Platform
   * @returns {Promise<Object>} Hashtag score
   */
  async scoreHashtagCombo(hashtags, platform) {
    const maxScore = SCORING_WEIGHTS.hashtagCombo.max;
    let score = 0;
    let feedback = '';

    if (!hashtags || hashtags.length === 0) {
      return { score: 0, max: maxScore, weight: SCORING_WEIGHTS.hashtagCombo.weight, feedback: 'No hashtags provided' };
    }

    // Count check
    if (hashtags.length >= 3 && hashtags.length <= 6) score += 3;
    else if (hashtags.length > 6) score += 1; // Too many

    try {
      const tagPerf = await MarketingHashtagPerformance
        .find({
          hashtag: { $in: hashtags.map(h => h.replace('#', '')) },
          platform,
          active: true
        })
        .lean();

      if (tagPerf.length > 0) {
        const avgPerf = tagPerf.reduce((sum, t) => sum + t.engagementRate, 0) / tagPerf.length;
        if (avgPerf > 8) score += 5;
        else if (avgPerf > 5) score += 3;
        else score += 1;

        // Check for saturation
        const saturated = tagPerf.filter(t => t.overuseRisk.level === 'saturated').length;
        if (saturated === 0) score += 2;
        else if (saturated < tagPerf.length / 2) score += 1;
      }

      feedback = score >= 7 ? 'Strong hashtag selection' : score >= 4 ? 'Average hashtags' : 'Hashtag selection needs improvement';

    } catch (e) {
      score = 3;
      feedback = 'Could not analyze hashtag performance';
    }

    return { score: Math.min(maxScore, score), max: maxScore, weight: SCORING_WEIGHTS.hashtagCombo.weight, feedback };
  }

  /**
   * Score timing
   * @param {Date} plannedTime - Planned posting time
   * @param {string} platform - Platform
   * @returns {Object} Timing score
   */
  scoreTiming(plannedTime, platform) {
    const maxScore = SCORING_WEIGHTS.timing.max;
    let score = 0;

    if (!plannedTime) {
      return { score: 2, max: maxScore, weight: SCORING_WEIGHTS.timing.weight, feedback: 'No specific time set' };
    }

    const hour = plannedTime.getHours();

    // Optimal hours (9AM - 9PM)
    if (hour >= 9 && hour <= 21) {
      score = 6;
      // Prime time (12PM-3PM, 6PM-9PM)
      if ((hour >= 12 && hour <= 15) || (hour >= 18 && hour <= 21)) {
        score = 8;
      }
    } else {
      score = 3;
    }

    const feedback = score >= 6 ? 'Good posting time' : 'Consider posting during peak hours (9AM-9PM)';

    return { score, max: maxScore, weight: SCORING_WEIGHTS.timing.weight, feedback };
  }

  /**
   * Score topic trend
   * @param {string} topic - Topic name
   * @param {string} platform - Platform
   * @returns {Promise<Object>} Topic score
   */
  async scoreTopicTrend(topic, platform) {
    const maxScore = SCORING_WEIGHTS.topicTrend.max;
    let score = 3; // Base score for having a topic
    let feedback = '';

    if (!topic) {
      return { score: 2, max: maxScore, weight: SCORING_WEIGHTS.topicTrend.weight, feedback: 'No specific topic' };
    }

    try {
      const metric = await MarketingBookTrendMetrics
        .findOne({
          entityType: 'topic',
          entityName: topic,
          platform
        })
        .sort({ timestamp: -1 })
        .lean();

      if (metric) {
        if (metric.trendDirection === 'rising') {
          score = 7;
          feedback = `"${topic}" is trending up`;
        } else if (metric.trendDirection === 'stable') {
          score = 5;
          feedback = `"${topic}" has stable interest`;
        } else {
          score = 2;
          feedback = `"${topic}" is declining`;
        }
      } else {
        score = 4;
        feedback = `Topic "${topic}" selected (no trend data)`;
      }
    } catch (e) {
      score = 4;
      feedback = 'Topic selected';
    }

    return { score: Math.min(maxScore, score), max: maxScore, weight: SCORING_WEIGHTS.topicTrend.weight, feedback };
  }

  /**
   * Score caption quality
   * @param {string} caption - Caption text
   * @returns {Object} Caption score
   */
  scoreCaptionQuality(caption) {
    const maxScore = SCORING_WEIGHTS.captionQuality.max;
    let score = 0;

    if (!caption) {
      return { score: 0, max: maxScore, weight: SCORING_WEIGHTS.captionQuality.weight, feedback: 'No caption' };
    }

    // Length check
    if (caption.length > 50 && caption.length < 500) score += 4;
    else if (caption.length >= 20) score += 2;

    // Has line breaks
    if (caption.includes('\n')) score += 2;

    // Has CTA
    const ctaWords = ['link in bio', 'read more', 'check it out', 'download now'];
    if (ctaWords.some(w => caption.toLowerCase().includes(w))) score += 2;

    // Has emojis
    if (/[\u{1F600}-\u{1F64F}]/u.test(caption)) score += 2;

    const feedback = score >= 8 ? 'Well-structured caption' : score >= 5 ? 'Caption could be more engaging' : 'Caption needs improvement';

    return { score: Math.min(maxScore, score), max: maxScore, weight: SCORING_WEIGHTS.captionQuality.weight, feedback };
  }

  /**
   * Score uniqueness
   * @param {string} hook - Hook text
   * @param {string} caption - Caption text
   * @param {string} topic - Topic
   * @returns {Promise<Object>} Uniqueness score
   */
  async scoreUniqueness(hook, caption, topic) {
    const maxScore = SCORING_WEIGHTS.uniqueness.max;
    let score = 5; // Base score

    // Check for common phrases
    const commonPhrases = ['must read', 'you won\'t believe', 'mind blowing', 'game changer'];
    const content = `${hook || ''} ${caption || ''}`.toLowerCase();

    const commonCount = commonPhrases.filter(p => content.includes(p)).length;
    score -= commonCount * 2;

    // Check topic frequency
    if (topic) {
      try {
        const metric = await MarketingBookTrendMetrics
          .findOne({
            entityType: 'topic',
            entityName: topic
          })
          .sort({ timestamp: -1 })
          .lean();

        if (metric && metric.mentionCount > 100) {
          score -= 1; // Slight penalty for very common topics
        }
      } catch (e) {
        // Continue
      }
    }

    // Reward for specific details (names, numbers)
    if (/\d+/.test(content)) score += 2;
    if (/[A-Z][a-z]+ [A-Z][a-z]+/.test(content)) score += 1; // Two proper names

    const feedback = score >= 8 ? 'Unique content angle' : score >= 5 ? 'Moderately unique' : 'Consider a more unique angle';

    return { score: Math.max(0, Math.min(maxScore, score)), max: maxScore, weight: SCORING_WEIGHTS.uniqueness.weight, feedback };
  }

  /**
   * Score emotional hook
   * @param {string} hook - Hook text
   * @param {string} caption - Caption text
   * @returns {Object} Emotional score
   */
  scoreEmotionalHook(hook, caption) {
    const maxScore = SCORING_WEIGHTS.emotionalHook.max;
    let score = 0;

    const content = `${hook || ''} ${caption || ''}`.toLowerCase();

    // Emotional words
    const emotionalWords = {
      excited: ['excited', 'can\'t wait', 'obsessed', 'love', 'amazing'],
      curious: ['what', 'how', 'why', 'wonder', 'anyone else'],
      shocked: ['shocked', 'stunned', 'jaw dropped', 'believe'],
      urgent: ['now', 'today', 'don\'t wait', 'hurry', 'last chance'],
      nostalgic: ['remember', 'childhood', 'growing up', 'used to']
    };

    let foundEmotion = false;
    for (const words of Object.values(emotionalWords)) {
      if (words.some(w => content.includes(w))) {
        score += 3;
        foundEmotion = true;
        break;
      }
    }

    // Questions create curiosity
    if (content.includes('?')) score += 2;

    // Exclamation marks show excitement
    if ((hook || '').includes('!')) score += 1;

    const feedback = score >= 8 ? 'Strong emotional hook' : score >= 5 ? 'Some emotional engagement' : 'Add more emotional elements';

    return { score: Math.min(maxScore, score), max: maxScore, weight: SCORING_WEIGHTS.emotionalHook.weight, feedback };
  }

  /**
   * Score platform fit
   * @param {Object} content - Content data
   * @param {string} platform - Platform
   * @returns {Object} Platform fit score
   */
  scorePlatformFit(content, platform) {
    const maxScore = SCORING_WEIGHTS.platformFit.max;
    let score = 3; // Base score

    // Check caption length by platform
    const captionLength = (content.caption || '').length;

    if (platform === 'tiktok') {
      if (captionLength < 150) score += 2;
    } else if (platform === 'instagram') {
      if (captionLength > 50 && captionLength < 500) score += 2;
    }

    return { score: Math.min(maxScore, score), max: maxScore, weight: SCORING_WEIGHTS.platformFit.weight, feedback: 'Content fits platform' };
  }

  /**
   * Predict performance based on score
   * @param {number} overallScore - Overall content score
   * @param {string} platform - Platform
   * @param {string} topic - Topic
   * @returns {Promise<Object>} Performance prediction
   */
  async predictPerformance(overallScore, platform, topic) {
    // Base predictions by score tier
    let baseViews = 1000;
    let baseEngagementRate = 3;

    if (overallScore >= SCORE_THRESHOLDS.EXCELLENT) {
      baseViews = 5000;
      baseEngagementRate = 8;
    } else if (overallScore >= SCORE_THRESHOLDS.GOOD) {
      baseViews = 3000;
      baseEngagementRate = 6;
    } else if (overallScore >= SCORE_THRESHOLDS.AVERAGE) {
      baseViews = 1500;
      baseEngagementRate = 4;
    }

    // Apply score multiplier
    const multiplier = overallScore / 50;
    const predictedViews = Math.round(baseViews * multiplier);
    const predictedEngagementRate = Math.min(15, baseEngagementRate * (multiplier * 0.8));
    const predictedEngagement = Math.round(predictedViews * (predictedEngagementRate / 100));
    const predictedShares = Math.round(predictedEngagement * 0.3);

    // Calculate prediction ranges (confidence intervals)
    const variance = overallScore >= 70 ? 0.2 : overallScore >= 50 ? 0.4 : 0.6;

    return {
      predictedViews,
      predictedEngagement,
      predictedEngagementRate: Math.round(predictedEngagementRate * 10) / 10,
      predictedShares,
      predictionRanges: {
        views: {
          min: Math.round(predictedViews * (1 - variance)),
          max: Math.round(predictedViews * (1 + variance)),
          p50: predictedViews,
          p75: Math.round(predictedViews * (1 + variance * 0.5)),
          p90: Math.round(predictedViews * (1 + variance * 0.8))
        },
        engagementRate: {
          min: Math.max(0, predictedEngagementRate * (1 - variance)),
          max: Math.min(20, predictedEngagementRate * (1 + variance)),
          p50: predictedEngagementRate,
          p75: predictedEngagementRate * (1 + variance * 0.5),
          p90: predictedEngagementRate * (1 + variance * 0.8)
        }
      }
    };
  }

  /**
   * Calculate confidence level
   * @param {Object} scores - Score breakdown
   * @returns {number} Confidence (0-1)
   */
  calculateConfidence(scores) {
    let confidence = 0.5;

    // Higher confidence when we have good data
    if (scores.bookReference.score >= 10) confidence += 0.1;
    if (scores.hook.score >= 10) confidence += 0.1;
    if (scores.hashtagCombo.score >= 7) confidence += 0.1;
    if (scores.topicTrend.score >= 5) confidence += 0.1;

    return Math.min(0.95, confidence);
  }

  /**
   * Save score to database
   * @param {Object} scoreData - Score data
   * @returns {Promise<Object>} Saved score
   */
  async saveScore(scoreData) {
    try {
      return await MarketingContentScore.create(scoreData);
    } catch (error) {
      logger.error('Error saving score', {
        error: error.message,
        postId: scoreData.postId
      });
      return null;
    }
  }

  /**
   * Get improvement suggestions
   * @param {Object} scoreData - Score data
   * @returns {Array} Improvement suggestions
   */
  getImprovementSuggestions(scoreData) {
    return scoreData.suggestions || [];
  }

  /**
   * Record actual results for accuracy tracking
   * @param {string} scoreId - Score ID
   * @param {Object} actualResults - Actual performance data
   * @returns {Promise<Object>} Updated score
   */
  async recordContentAccuracy(scoreId, actualResults) {
    try {
      return await MarketingContentScore.recordActualResults(scoreId, actualResults);
    } catch (error) {
      logger.error('Error recording accuracy', {
        error: error.message,
        scoreId
      });
      return null;
    }
  }

  /**
   * Clear the scorer cache
   */
  clearCache() {
    this.baselineCache.clear();
    logger.info('Content scorer cache cleared');
  }
}

// Export singleton instance
const contentScorerService = new ContentScorerService();
export default contentScorerService;
