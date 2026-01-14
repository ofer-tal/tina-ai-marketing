import ASOScore from '../models/ASOScore.js';
import ASOKeyword from '../models/ASOKeyword.js';
import CompetitorKeyword from '../models/CompetitorKeyword.js';
import ConversionMetrics from '../models/ConversionMetrics.js';

/**
 * ASO Score Service
 * Calculates and manages App Store Optimization scores
 */
class ASOScoreService {
  /**
   * Calculate keyword ranking score
   * Based on average ranking of target keywords
   */
  async calculateKeywordRankingScore() {
    try {
      const targetKeywords = await ASOKeyword.find({ target: true });

      if (targetKeywords.length === 0) {
        return 0;
      }

      // Calculate average ranking
      const validRankings = targetKeywords
        .filter(kw => kw.ranking !== null && kw.ranking > 0)
        .map(kw => kw.ranking);

      if (validRankings.length === 0) {
        return 0;
      }

      const avgRanking = validRankings.reduce((sum, r) => sum + r, 0) / validRankings.length;

      // Score: 100 for ranking #1, decreasing as ranking gets worse
      // Ranking 1-10: 90-100 points
      // Ranking 11-25: 70-89 points
      // Ranking 26-50: 50-69 points
      // Ranking 51+: 0-49 points
      if (avgRanking <= 10) return 90 + (10 - avgRanking);
      if (avgRanking <= 25) return 70 + (25 - avgRanking) * 0.8;
      if (avgRanking <= 50) return 50 + (50 - avgRanking) * 0.6;
      return Math.max(0, 50 - (avgRanking - 50) * 0.5);
    } catch (error) {
      console.error('Error calculating keyword ranking score:', error.message);
      return 0;
    }
  }

  /**
   * Calculate keyword coverage score
   * Based on percentage of tracked keywords ranking in top 50
   */
  async calculateKeywordCoverageScore() {
    try {
      const targetKeywords = await ASOKeyword.find({ target: true });

      if (targetKeywords.length === 0) {
        return 0;
      }

      const top50Count = targetKeywords.filter(kw =>
        kw.ranking !== null && kw.ranking > 0 && kw.ranking <= 50
      ).length;

      const coverage = (top50Count / targetKeywords.length) * 100;

      // Score directly maps to coverage percentage
      return Math.round(coverage);
    } catch (error) {
      console.error('Error calculating keyword coverage score:', error.message);
      return 0;
    }
  }

  /**
   * Calculate keyword relevance score
   * Based on keyword difficulty and search volume balance
   */
  async calculateKeywordRelevanceScore() {
    try {
      const targetKeywords = await ASOKeyword.find({ target: true });

      if (targetKeywords.length === 0) {
        return 0;
      }

      // Score based on average difficulty (lower is better) and volume (higher is better)
      const avgDifficulty = targetKeywords.reduce((sum, kw) => sum + (kw.difficulty || 50), 0) / targetKeywords.length;
      const avgVolume = targetKeywords.reduce((sum, kw) => sum + (kw.volume || 0), 0) / targetKeywords.length;

      // Lower difficulty = higher score
      const difficultyScore = Math.max(0, 100 - avgDifficulty);

      // Higher volume = higher score (normalized to 0-100)
      const volumeScore = Math.min(100, avgVolume / 100);

      // Combined score (70% difficulty, 30% volume)
      return Math.round(difficultyScore * 0.7 + volumeScore * 0.3);
    } catch (error) {
      console.error('Error calculating keyword relevance score:', error.message);
      return 0;
    }
  }

  /**
   * Calculate keyword density score
   * Based on keyword usage in title, subtitle, description
   */
  async calculateKeywordDensityScore() {
    try {
      // For now, use simulated data
      // In production, this would analyze actual metadata
      const targetKeywords = await ASOKeyword.find({ target: true }).limit(10);

      if (targetKeywords.length === 0) {
        return 50; // Default medium score
      }

      // Simulate keyword density analysis
      // Check if top keywords are in title, subtitle, description
      let densityScore = 0;
      const topKeywords = targetKeywords.slice(0, 5);

      // Simulated: Assume 80% of top keywords are in metadata
      const inTitle = topKeywords.length * 0.6; // 60% in title
      const inSubtitle = topKeywords.length * 0.4; // 40% in subtitle
      const inDescription = topKeywords.length * 0.8; // 80% in description

      densityScore = ((inTitle + inSubtitle + inDescription) / (topKeywords.length * 3)) * 100;

      return Math.min(100, Math.round(densityScore));
    } catch (error) {
      console.error('Error calculating keyword density score:', error.message);
      return 50;
    }
  }

  /**
   * Calculate title optimization score
   * Based on title length, keyword inclusion, clarity
   */
  async calculateTitleOptimizationScore() {
    try {
      // Simulated title analysis
      const title = 'Blush - Romantic Stories'; // Example title
      const titleLength = title.length;

      // Optimal length: 20-30 characters
      const lengthScore = titleLength >= 20 && titleLength <= 30 ? 100 :
                         titleLength < 20 ? 70 :
                         Math.max(0, 100 - (titleLength - 30) * 3);

      // Check for primary keywords
      const targetKeywords = await ASOKeyword.find({ target: true }).limit(5);
      const keywordInclusion = targetKeywords.some(kw =>
        title.toLowerCase().includes(kw.keyword.toLowerCase())
      ) ? 100 : 50;

      // Combined score (60% length, 40% keyword inclusion)
      return Math.round(lengthScore * 0.6 + keywordInclusion * 0.4);
    } catch (error) {
      console.error('Error calculating title optimization score:', error.message);
      return 50;
    }
  }

  /**
   * Calculate subtitle optimization score
   */
  async calculateSubtitleOptimizationScore() {
    try {
      // Simulated subtitle analysis
      const subtitle = 'Spicy AI Romance & Love Stories'; // Example subtitle
      const subtitleLength = subtitle.length;

      // Optimal length: 25-35 characters
      const lengthScore = subtitleLength >= 25 && subtitleLength <= 35 ? 100 :
                         subtitleLength < 25 ? 70 :
                         Math.max(0, 100 - (subtitleLength - 35) * 3);

      // Check for keywords
      const targetKeywords = await ASOKeyword.find({ target: true }).limit(5);
      const keywordCount = targetKeywords.filter(kw =>
        subtitle.toLowerCase().includes(kw.keyword.toLowerCase())
      ).length;

      const keywordScore = Math.min(100, (keywordCount / 3) * 100);

      // Combined score (60% length, 40% keywords)
      return Math.round(lengthScore * 0.6 + keywordScore * 0.4);
    } catch (error) {
      console.error('Error calculating subtitle optimization score:', error.message);
      return 50;
    }
  }

  /**
   * Calculate description quality score
   */
  async calculateDescriptionQualityScore() {
    try {
      // Simulated description analysis
      const description = 'Dive into a world of romantic fiction with Blush!'; // Example
      const descriptionLength = description.length;

      // Optimal length: 500-1000 characters
      const lengthScore = descriptionLength >= 500 && descriptionLength <= 1000 ? 100 :
                         descriptionLength < 500 ? 60 :
                         Math.max(0, 100 - (descriptionLength - 1000) * 0.1);

      // Check for keyword inclusion
      const targetKeywords = await ASOKeyword.find({ target: true }).limit(10);
      const keywordCount = targetKeywords.filter(kw =>
        description.toLowerCase().includes(kw.keyword.toLowerCase())
      ).length;

      const keywordScore = Math.min(100, (keywordCount / 5) * 100);

      // Combined score (50% length, 50% keywords)
      return Math.round(lengthScore * 0.5 + keywordScore * 0.5);
    } catch (error) {
      console.error('Error calculating description quality score:', error.message);
      return 50;
    }
  }

  /**
   * Calculate icon quality score
   */
  async calculateIconQualityScore() {
    try {
      // Simulated icon analysis (would use image analysis in production)
      // Based on: clarity, branding, emotional appeal, uniqueness
      const clarity = 75; // From Icon A/B Testing feature
      const brandRecognition = 70;
      const emotionalAppeal = 80;
      const uniqueness = 65;

      return Math.round((clarity + brandRecognition + emotionalAppeal + uniqueness) / 4);
    } catch (error) {
      console.error('Error calculating icon quality score:', error.message);
      return 70;
    }
  }

  /**
   * Calculate screenshot quality score
   */
  async calculateScreenshotQualityScore() {
    try {
      // Simulated screenshot analysis
      // Based on: quality, captions, appeal, variety
      const quality = 75;
      const captions = 80;
      const appeal = 70;
      const variety = 85;

      return Math.round((quality + captions + appeal + variety) / 4);
    } catch (error) {
      console.error('Error calculating screenshot quality score:', error.message);
      return 70;
    }
  }

  /**
   * Calculate visual consistency score
   */
  async calculateVisualConsistencyScore() {
    try {
      // Simulated consistency analysis
      // Check if icon, screenshots, and other visuals match in style
      return 75; // Default: good consistency
    } catch (error) {
      console.error('Error calculating visual consistency score:', error.message);
      return 70;
    }
  }

  /**
   * Calculate average rating score
   */
  async calculateAverageRatingScore() {
    try {
      // Simulated rating data (would fetch from App Store Connect in production)
      const averageRating = 4.2; // Example rating out of 5

      // Score maps to rating (5 stars = 100 points)
      return Math.round((averageRating / 5) * 100);
    } catch (error) {
      console.error('Error calculating average rating score:', error.message);
      return 80;
    }
  }

  /**
   * Calculate rating count score
   */
  async calculateRatingCountScore() {
    try {
      // Simulated rating count
      const ratingCount = 1250; // Example

      // More ratings = higher social proof
      // 1000+ ratings = 100 points
      // 500-999 = 80 points
      // 100-499 = 60 points
      // < 100 = 40 points
      if (ratingCount >= 1000) return 100;
      if (ratingCount >= 500) return 80;
      if (ratingCount >= 100) return 60;
      return 40;
    } catch (error) {
      console.error('Error calculating rating count score:', error.message);
      return 60;
    }
  }

  /**
   * Calculate review sentiment score
   */
  async calculateReviewSentimentScore() {
    try {
      // Simulated sentiment analysis
      // Percentage of positive reviews
      const positiveSentiment = 0.78; // 78% positive

      return Math.round(positiveSentiment * 100);
    } catch (error) {
      console.error('Error calculating review sentiment score:', error.message);
      return 75;
    }
  }

  /**
   * Calculate conversion rate score
   */
  async calculateConversionRateScore() {
    try {
      // Fetch from conversion metrics
      const metrics = await ConversionMetrics.findOne().sort({ date: -1 });

      if (!metrics || !metrics.funnelStages) {
        return 70; // Default
      }

      // Get product page to downloads conversion rate
      const productPageViews = metrics.funnelStages.find(s => s.stage === 'Product Page Views');
      const downloads = metrics.funnelStages.find(s => s.stage === 'App Downloads');

      if (!productPageViews || !downloads) {
        return 70;
      }

      const conversionRate = (downloads.users / productPageViews.users) * 100;

      // Industry average for apps: ~15-20%
      // 20%+ = 100 points
      // 15-19% = 80 points
      // 10-14% = 60 points
      // < 10% = 40 points
      if (conversionRate >= 20) return 100;
      if (conversionRate >= 15) return 80;
      if (conversionRate >= 10) return 60;
      return 40;
    } catch (error) {
      console.error('Error calculating conversion rate score:', error.message);
      return 70;
    }
  }

  /**
   * Calculate category ranking score
   */
  async calculateCategoryRankingScore() {
    try {
      // Simulated category ranking
      const ranking = 42; // Example ranking in Books > Romance
      const totalApps = 2450;

      // Calculate percentile (top 1% = 100 points)
      const percentile = ((totalApps - ranking) / totalApps) * 100;

      return Math.round(percentile);
    } catch (error) {
      console.error('Error calculating category ranking score:', error.message);
      return 80;
    }
  }

  /**
   * Calculate complete ASO score
   */
  async calculateASOScore() {
    try {
      // Calculate all factor scores
      const factors = {
        // Keyword factors
        keywordRanking: {
          score: await this.calculateKeywordRankingScore(),
          weight: 0.10,
          description: 'Average ranking of target keywords'
        },
        keywordCoverage: {
          score: await this.calculateKeywordCoverageScore(),
          weight: 0.08,
          description: 'Percentage of tracked keywords ranking in top 50'
        },
        keywordRelevance: {
          score: await this.calculateKeywordRelevanceScore(),
          weight: 0.07,
          description: 'Relevance of keywords to app category'
        },
        keywordDensity: {
          score: await this.calculateKeywordDensityScore(),
          weight: 0.05,
          description: 'Keyword usage in title, subtitle, description'
        },

        // Metadata factors
        titleOptimization: {
          score: await this.calculateTitleOptimizationScore(),
          weight: 0.10,
          description: 'Title length, keyword inclusion, clarity'
        },
        subtitleOptimization: {
          score: await this.calculateSubtitleOptimizationScore(),
          weight: 0.08,
          description: 'Subtitle length, keyword inclusion'
        },
        descriptionQuality: {
          score: await this.calculateDescriptionQualityScore(),
          weight: 0.07,
          description: 'Description length, readability, keyword usage'
        },

        // Visual factors
        iconQuality: {
          score: await this.calculateIconQualityScore(),
          weight: 0.10,
          description: 'Icon clarity, branding, emotional appeal'
        },
        screenshotQuality: {
          score: await this.calculateScreenshotQualityScore(),
          weight: 0.06,
          description: 'Screenshot quality, captions, appeal'
        },
        visualConsistency: {
          score: await this.calculateVisualConsistencyScore(),
          weight: 0.04,
          description: 'Consistent branding across visuals'
        },

        // Ratings factors
        averageRating: {
          score: await this.calculateAverageRatingScore(),
          weight: 0.08,
          description: 'App store average rating'
        },
        ratingCount: {
          score: await this.calculateRatingCountScore(),
          weight: 0.04,
          description: 'Number of ratings'
        },
        reviewSentiment: {
          score: await this.calculateReviewSentimentScore(),
          weight: 0.03,
          description: 'Positive review sentiment'
        },

        // Conversion factors
        conversionRate: {
          score: await this.calculateConversionRateScore(),
          weight: 0.06,
          description: 'Product page to download conversion rate'
        },
        categoryRanking: {
          score: await this.calculateCategoryRankingScore(),
          weight: 0.04,
          description: 'Ranking in primary category'
        }
      };

      // Create or update ASOScore document
      let asoScore = await ASOScore.findOne();

      if (!asoScore) {
        asoScore = new ASOScore({ factors });
      } else {
        asoScore.factors = factors;
      }

      // Calculate all component scores
      asoScore.calculateAllScores();

      // Generate recommendations
      asoScore.recommendations = this.generateRecommendations(asoScore);

      // Compare with competitors
      asoScore.competitorComparison = await this.getCompetitorComparison(asoScore);

      asoScore.calculatedAt = new Date();
      await asoScore.save();

      return asoScore;
    } catch (error) {
      console.error('Error calculating ASO score:', error.message);
      throw error;
    }
  }

  /**
   * Generate recommendations based on low-scoring factors
   */
  generateRecommendations(asoScore) {
    const recommendations = [];

    // Check keyword factors
    if (asoScore.factors.keywordRanking.score < 70) {
      recommendations.push({
        category: 'keyword',
        priority: 'high',
        title: 'Improve keyword rankings',
        description: `Current average ranking is low. Focus on optimizing app metadata and building organic installs for better rankings.`,
        expectedImpact: Math.round(100 - asoScore.factors.keywordRanking.score),
        implemented: false
      });
    }

    if (asoScore.factors.keywordCoverage.score < 60) {
      recommendations.push({
        category: 'keyword',
        priority: 'high',
        title: 'Increase keyword coverage',
        description: `Only ${asoScore.factors.keywordCoverage.score}% of keywords rank in top 50. Add more relevant keywords to your metadata.`,
        expectedImpact: Math.round(100 - asoScore.factors.keywordCoverage.score),
        implemented: false
      });
    }

    // Check metadata factors
    if (asoScore.factors.titleOptimization.score < 80) {
      recommendations.push({
        category: 'metadata',
        priority: 'high',
        title: 'Optimize app title',
        description: 'Title length or keyword inclusion is suboptimal. Ensure title is 20-30 characters with primary keywords.',
        expectedImpact: Math.round(100 - asoScore.factors.titleOptimization.score),
        implemented: false
      });
    }

    if (asoScore.factors.descriptionQuality.score < 70) {
      recommendations.push({
        category: 'metadata',
        priority: 'medium',
        title: 'Improve description quality',
        description: 'Description needs more keywords or better length. Aim for 500-1000 characters with 5+ tracked keywords.',
        expectedImpact: Math.round(100 - asoScore.factors.descriptionQuality.score),
        implemented: false
      });
    }

    // Check visual factors
    if (asoScore.factors.iconQuality.score < 75) {
      recommendations.push({
        category: 'visual',
        priority: 'high',
        title: 'Improve app icon',
        description: 'Icon clarity or branding needs improvement. Consider running A/B tests to find better-performing variants.',
        expectedImpact: Math.round(100 - asoScore.factors.iconQuality.score),
        implemented: false
      });
    }

    if (asoScore.factors.screenshotQuality.score < 70) {
      recommendations.push({
        category: 'visual',
        priority: 'medium',
        title: 'Enhance screenshots',
        description: 'Add captions, improve variety, or highlight key features more effectively in screenshots.',
        expectedImpact: Math.round(100 - asoScore.factors.screenshotQuality.score),
        implemented: false
      });
    }

    // Check ratings factors
    if (asoScore.factors.averageRating.score < 80) {
      recommendations.push({
        category: 'ratings',
        priority: 'high',
        title: 'Improve app ratings',
        description: 'Average rating is below 4.0 stars. Address user feedback, fix bugs, and encourage positive reviews.',
        expectedImpact: Math.round(100 - asoScore.factors.averageRating.score),
        implemented: false
      });
    }

    if (asoScore.factors.ratingCount.score < 60) {
      recommendations.push({
        category: 'ratings',
        priority: 'medium',
        title: 'Increase review count',
        description: 'Low number of ratings. Implement review prompts and improve user engagement to get more ratings.',
        expectedImpact: Math.round(100 - asoScore.factors.ratingCount.score),
        implemented: false
      });
    }

    // Check conversion factors
    if (asoScore.factors.conversionRate.score < 70) {
      recommendations.push({
        category: 'conversion',
        priority: 'high',
        title: 'Improve conversion rate',
        description: `Current conversion rate is low. Optimize product page visuals, description, and screenshots to improve conversions.`,
        expectedImpact: Math.round(100 - asoScore.factors.conversionRate.score),
        implemented: false
      });
    }

    return recommendations.slice(0, 10); // Return top 10 recommendations
  }

  /**
   * Compare ASO score with competitors (simulated)
   */
  async getCompetitorComparison(asoScore) {
    // Simulated competitor scores
    return [
      {
        competitorAppName: 'Episode',
        competitorScore: 78,
        scoreDifference: asoScore.overallScore - 78
      },
      {
        competitorAppName: 'Chapters',
        competitorScore: 75,
        scoreDifference: asoScore.overallScore - 75
      },
      {
        competitorAppName: 'Choices',
        competitorScore: 72,
        scoreDifference: asoScore.overallScore - 72
      }
    ];
  }

  /**
   * Get current ASO score
   */
  async getASOScore() {
    try {
      let asoScore = await ASOScore.findOne().sort({ calculatedAt: -1 });

      if (!asoScore) {
        asoScore = await this.calculateASOScore();
      }

      return asoScore;
    } catch (error) {
      console.error('Error getting ASO score:', error.message);
      throw error;
    }
  }

  /**
   * Get ASO score history
   */
  async getASOScoreHistory(days = 30) {
    try {
      const asoScore = await ASOScore.findOne().sort({ calculatedAt: -1 });

      if (!asoScore) {
        return null;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const history = asoScore.scoreHistory
        .filter(entry => entry.date >= cutoffDate)
        .sort((a, b) => a.date - b.date);

      return {
        currentScore: asoScore.overallScore,
        trend: asoScore.getScoreTrend(days),
        history: history
      };
    } catch (error) {
      console.error('Error getting ASO score history:', error.message);
      throw error;
    }
  }
}

export default new ASOScoreService();
