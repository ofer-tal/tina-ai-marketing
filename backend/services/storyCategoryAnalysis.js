import MarketingPost from '../models/MarketingPost.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('story-category-analysis', 'story-category-analysis');

/**
 * High-Performing Story Category Identification Service
 *
 * Identifies which story categories perform best:
 * - Step 1: Group content by story category
 * - Step 2: Aggregate engagement by category
 * - Step 3: Calculate category averages
 * - Step 4: Rank categories
 * - Step 5: Display insights
 */
class StoryCategoryAnalysisService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Step 1: Group content by story category
   */
  async groupByCategory(filters = {}) {
    try {
      logger.info('Grouping content by story category', { filters });

      const {
        platform,
        startDate,
        endDate,
        minViews = 100
      } = filters;

      // Build query
      const query = {
        status: 'posted',
        'performanceMetrics.views': { $gte: minViews }
      };

      if (platform) {
        query.platform = platform;
      }

      if (startDate || endDate) {
        query.postedAt = {};
        if (startDate) query.postedAt.$gte = new Date(startDate);
        if (endDate) query.postedAt.$lte = new Date(endDate);
      }

      // Fetch posts with performance data
      const posts = await MarketingPost.find(query)
        .select('storyCategory storyName storySpiciness platform performanceMetrics postedAt')
        .lean();

      logger.info('Fetched posts for category grouping', { count: posts.length });

      // Group by category
      const categoryGroups = new Map();

      posts.forEach(post => {
        const category = post.storyCategory || 'Unknown';

        if (!categoryGroups.has(category)) {
          categoryGroups.set(category, []);
        }

        categoryGroups.get(category).push({
          postId: post._id,
          storyName: post.storyName,
          spiciness: post.storySpiciness,
          platform: post.platform,
          views: post.performanceMetrics?.views || 0,
          likes: post.performanceMetrics?.likes || 0,
          comments: post.performanceMetrics?.comments || 0,
          shares: post.performanceMetrics?.shares || 0,
          engagementRate: post.performanceMetrics?.engagementRate || 0,
          postedAt: post.postedAt
        });
      });

      // Convert to array
      const groups = Array.from(categoryGroups.entries()).map(([category, posts]) => ({
        category,
        postCount: posts.length,
        posts
      }));

      return {
        success: true,
        totalPosts: posts.length,
        totalCategories: groups.length,
        groups
      };

    } catch (error) {
      logger.error('Error grouping content by category', { error: error.message });
      throw error;
    }
  }

  /**
   * Step 2: Aggregate engagement by category
   */
  async aggregateEngagementByCategory(groups) {
    try {
      logger.info('Aggregating engagement by category', { groupCount: groups.length });

      if (!groups || groups.length === 0) {
        return {
          success: false,
          message: 'No groups to analyze'
        };
      }

      const aggregations = groups.map(group => {
        const posts = group.posts || [];

        // Sum all metrics
        const totals = posts.reduce((acc, post) => ({
          views: acc.views + post.views,
          likes: acc.likes + post.likes,
          comments: acc.comments + post.comments,
          shares: acc.shares + post.shares,
          engagementRate: acc.engagementRate + post.engagementRate
        }), {
          views: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          engagementRate: 0
        });

        // Calculate totals for each platform
        const platformBreakdown = {};
        posts.forEach(post => {
          if (!platformBreakdown[post.platform]) {
            platformBreakdown[post.platform] = {
              count: 0,
              views: 0,
              likes: 0,
              comments: 0,
              shares: 0
            };
          }

          platformBreakdown[post.platform].count++;
          platformBreakdown[post.platform].views += post.views;
          platformBreakdown[post.platform].likes += post.likes;
          platformBreakdown[post.platform].comments += post.comments;
          platformBreakdown[post.platform].shares += post.shares;
        });

        return {
          category: group.category,
          postCount: posts.length,
          totals,
          platformBreakdown
        };
      });

      return {
        success: true,
        aggregations
      };

    } catch (error) {
      logger.error('Error aggregating engagement by category', { error: error.message });
      throw error;
    }
  }

  /**
   * Step 3: Calculate category averages
   */
  async calculateCategoryAverages(aggregations) {
    try {
      logger.info('Calculating category averages', { aggregationCount: aggregations.length });

      if (!aggregations || aggregations.length === 0) {
        return {
          success: false,
          message: 'No aggregations to analyze'
        };
      }

      const averages = aggregations.map(agg => {
        const postCount = agg.postCount || 1;

        // Calculate averages
        const avgMetrics = {
          views: Math.round(agg.totals.views / postCount),
          likes: Math.round(agg.totals.likes / postCount),
          comments: Math.round(agg.totals.comments / postCount),
          shares: Math.round(agg.totals.shares / postCount),
          engagementRate: parseFloat((agg.totals.engagementRate / postCount).toFixed(2))
        };

        // Calculate engagement rate (likes + comments + shares) / views * 100
        const calculatedEngagementRate = agg.totals.views > 0
          ? parseFloat(((agg.totals.likes + agg.totals.comments + agg.totals.shares) / agg.totals.views * 100).toFixed(2))
          : 0;

        // Calculate platform averages
        const platformAverages = {};
        Object.entries(agg.platformBreakdown).forEach(([platform, data]) => {
          platformAverages[platform] = {
            count: data.count,
            avgViews: Math.round(data.views / data.count),
            avgLikes: Math.round(data.likes / data.count),
            avgComments: Math.round(data.comments / data.count),
            avgShares: Math.round(data.shares / data.count),
            avgEngagementRate: data.views > 0
              ? parseFloat(((data.likes + data.comments + data.shares) / data.views * 100).toFixed(2))
              : 0
          };
        });

        // Calculate virality score (weighted combination of metrics)
        const viralityScore = parseFloat((
          (avgMetrics.views * 0.3) +
          (avgMetrics.engagementRate * 0.4) +
          (avgMetrics.shares * 0.2) +
          (avgMetrics.comments * 0.1)
        ).toFixed(2));

        return {
          category: agg.category,
          postCount,
          totals: agg.totals,
          averages: avgMetrics,
          calculatedEngagementRate,
          platformAverages,
          viralityScore
        };
      });

      return {
        success: true,
        averages
      };

    } catch (error) {
      logger.error('Error calculating category averages', { error: error.message });
      throw error;
    }
  }

  /**
   * Step 4: Rank categories
   */
  async rankCategories(averages) {
    try {
      logger.info('Ranking categories', { averageCount: averages.length });

      if (!averages || averages.length === 0) {
        return {
          success: false,
          message: 'No averages to rank'
        };
      }

      // Sort by virality score (descending)
      const ranked = [...averages].sort((a, b) => b.viralityScore - a.viralityScore);

      // Add rank
      ranked.forEach((cat, index) => {
        cat.rank = index + 1;
        cat.percentile = parseFloat((100 - (index / ranked.length * 100)).toFixed(1));
      });

      // Identify top and bottom performers
      const topPerformer = ranked[0];
      const bottomPerformer = ranked[ranked.length - 1];

      // Calculate performance gap
      const performanceGap = {
        viewsDifference: topPerformer.averages.views - bottomPerformer.averages.views,
        viewsPercentage: bottomPerformer.averages.views > 0
          ? parseFloat(((topPerformer.averages.views - bottomPerformer.averages.views) / bottomPerformer.averages.views * 100).toFixed(1))
          : 0,
        engagementDifference: topPerformer.calculatedEngagementRate - bottomPerformer.calculatedEngagementRate
      };

      return {
        success: true,
        ranked,
        topPerformer: {
          category: topPerformer.category,
          viralityScore: topPerformer.viralityScore,
          avgViews: topPerformer.averages.views,
          avgEngagementRate: topPerformer.calculatedEngagementRate
        },
        bottomPerformer: {
          category: bottomPerformer.category,
          viralityScore: bottomPerformer.viralityScore,
          avgViews: bottomPerformer.averages.views,
          avgEngagementRate: bottomPerformer.calculatedEngagementRate
        },
        performanceGap
      };

    } catch (error) {
      logger.error('Error ranking categories', { error: error.message });
      throw error;
    }
  }

  /**
   * Step 5: Generate insights
   */
  async generateInsights(rankedData) {
    try {
      logger.info('Generating insights', { rankedCount: rankedData.ranked.length });

      if (!rankedData || !rankedData.ranked || rankedData.ranked.length === 0) {
        return {
          success: false,
          message: 'No ranked data to generate insights'
        };
      }

      const insights = [];
      const recommendations = [];

      const { ranked, topPerformer, bottomPerformer, performanceGap } = rankedData;

      // Insight 1: Top category overview
      insights.push({
        type: 'top_performer',
        priority: 'high',
        title: `Top Category: ${topPerformer.category}`,
        description: `${topPerformer.category} stories are your best performing content with an average of ${topPerformer.avgViews.toLocaleString()} views per post and ${topPerformer.avgEngagementRate}% engagement rate.`,
        metrics: {
          category: topPerformer.category,
          avgViews: topPerformer.avgViews,
          avgEngagementRate: topPerformer.avgEngagementRate,
          viralityScore: topPerformer.viralityScore
        }
      });

      // Insight 2: Performance gap
      if (performanceGap.viewsPercentage > 50) {
        insights.push({
          type: 'performance_gap',
          priority: 'high',
          title: 'Significant Performance Gap',
          description: `There's a ${performanceGap.viewsPercentage}% difference in views between your top (${topPerformer.category}) and bottom (${bottomPerformer.category}) categories. Focus on producing more content in your top-performing categories.`,
          metrics: {
            topCategory: topPerformer.category,
            bottomCategory: bottomPerformer.category,
            viewsDifference: performanceGap.viewsDifference,
            viewsPercentage: performanceGap.viewsPercentage
          }
        });
      }

      // Insight 3: Top tier categories (top 3)
      const topTier = ranked.slice(0, 3);
      if (topTier.length > 1) {
        insights.push({
          type: 'top_tier',
          priority: 'medium',
          title: 'Top Tier Categories',
          description: `Your top 3 categories (${topTier.map(c => c.category).join(', ')}) significantly outperform others. Consider increasing content production in these categories.`,
          metrics: {
            categories: topTier.map(c => ({
              category: c.category,
              viralityScore: c.viralityScore,
              avgViews: c.averages.views
            }))
          }
        });
      }

      // Insight 4: Platform-specific insights
      const platformInsights = this.generatePlatformInsights(ranked);
      insights.push(...platformInsights);

      // Recommendation 1: Focus on top categories
      recommendations.push({
        type: 'content_strategy',
        priority: 'high',
        action: 'Increase content production in top categories',
        rationale: `Your top 3 categories drive significantly more engagement. Allocate 60-70% of content production to ${topTier.slice(0, 3).map(c => c.category).join(', ')}.`,
        expectedImpact: '20-30% increase in overall engagement',
        effort: 'medium'
      });

      // Recommendation 2: Optimize low performers
      if (ranked.length > 3) {
        const lowPerformers = ranked.slice(-3);
        recommendations.push({
          type: 'content_optimization',
          priority: 'medium',
          action: 'Optimize or pause low-performing categories',
          rationale: `Categories like ${lowPerformers.map(c => c.category).join(' and ')} are underperforming. Consider refreshing content approach or reducing frequency.`,
          expectedImpact: '10-15% improvement in efficiency',
          effort: 'low'
        });
      }

      // Recommendation 3: Cross-platform strategy
      recommendations.push({
        type: 'platform_strategy',
        priority: 'medium',
        action: 'Leverage top categories across all platforms',
        rationale: `Your best-performing category (${topPerformer.category}) should be prioritized on all platforms (TikTok, Instagram, YouTube Shorts).`,
        expectedImpact: '15-20% increase in cross-platform reach',
        effort: 'low'
      });

      return {
        success: true,
        insights,
        recommendations
      };

    } catch (error) {
      logger.error('Error generating insights', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate platform-specific insights
   */
  generatePlatformInsights(ranked) {
    const insights = [];

    // Analyze which categories perform best on each platform
    const platforms = ['tiktok', 'instagram', 'youtube_shorts'];

    platforms.forEach(platform => {
      const platformData = ranked
        .filter(cat => cat.platformAverages[platform])
        .map(cat => ({
          category: cat.category,
          avgViews: cat.platformAverages[platform].avgViews,
          avgEngagementRate: cat.platformAverages[platform].avgEngagementRate
        }))
        .sort((a, b) => b.avgViews - a.avgViews);

      if (platformData.length > 0) {
        const topPlatformCategory = platformData[0];
        insights.push({
          type: 'platform_specific',
          priority: 'low',
          title: `${platform} Top Category`,
          description: `On ${platform}, ${topPlatformCategory.category} performs best with ${topPlatformCategory.avgViews.toLocaleString()} average views.`,
          metrics: {
            platform,
            category: topPlatformCategory.category,
            avgViews: topPlatformCategory.avgViews,
            avgEngagementRate: topPlatformCategory.avgEngagementRate
          }
        });
      }
    });

    return insights;
  }

  /**
   * Main analysis method - runs all steps
   */
  async analyzeCategories(filters = {}) {
    try {
      logger.info('Starting story category analysis', { filters });

      // Check cache
      const cacheKey = JSON.stringify(filters);
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          logger.info('Returning cached results');
          return cached.data;
        }
      }

      // Step 1: Group by category
      const groupsResult = await this.groupByCategory(filters);
      if (!groupsResult.success) {
        return groupsResult;
      }

      // Step 2: Aggregate engagement
      const aggResult = await this.aggregateEngagementByCategory(groupsResult.groups);
      if (!aggResult.success) {
        return aggResult;
      }

      // Step 3: Calculate averages
      const avgResult = await this.calculateCategoryAverages(aggResult.aggregations);
      if (!avgResult.success) {
        return avgResult;
      }

      // Step 4: Rank categories
      const rankedResult = await this.rankCategories(avgResult.averages);
      if (!rankedResult.success) {
        return rankedResult;
      }

      // Step 5: Generate insights
      const insightsResult = await this.generateInsights(rankedResult);
      if (!insightsResult.success) {
        return insightsResult;
      }

      // Compile final report
      const report = {
        success: true,
        timestamp: new Date().toISOString(),
        filters,
        summary: {
          totalCategories: rankedResult.ranked.length,
          topCategory: rankedResult.topPerformer.category,
          bottomCategory: rankedResult.bottomPerformer.category,
          performanceGap: rankedResult.performanceGap
        },
        rankedCategories: rankedResult.ranked,
        insights: insightsResult.insights,
        recommendations: insightsResult.recommendations
      };

      // Cache results
      this.cache.set(cacheKey, {
        timestamp: Date.now(),
        data: report
      });

      logger.info('Story category analysis complete', {
        totalCategories: report.summary.totalCategories,
        topCategory: report.summary.topCategory
      });

      return report;

    } catch (error) {
      logger.error('Error in story category analysis', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get category performance summary
   */
  async getCategorySummary(category, filters = {}) {
    try {
      logger.info('Getting category summary', { category, filters });

      const analysis = await this.analyzeCategories(filters);

      if (!analysis.success) {
        return analysis;
      }

      const categoryData = analysis.rankedCategories.find(c => c.category === category);

      if (!categoryData) {
        return {
          success: false,
          message: `Category ${category} not found`
        };
      }

      return {
        success: true,
        category: categoryData.category,
        rank: categoryData.rank,
        percentile: categoryData.percentile,
        postCount: categoryData.postCount,
        averages: categoryData.averages,
        calculatedEngagementRate: categoryData.calculatedEngagementRate,
        viralityScore: categoryData.viralityScore,
        platformAverages: categoryData.platformAverages
      };

    } catch (error) {
      logger.error('Error getting category summary', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    logger.info('Cache cleared');
  }
}

// Export singleton instance
const storyCategoryAnalysisService = new StoryCategoryAnalysisService();
export default storyCategoryAnalysisService;
