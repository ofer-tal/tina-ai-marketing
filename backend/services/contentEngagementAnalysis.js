import MarketingPost from '../models/MarketingPost.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('content-engagement-analysis', 'content-engagement-analysis');

/**
 * Content Engagement Correlation Analysis Service
 *
 * Analyzes correlations between content features and engagement metrics:
 * - Step 1: Extract content features (spiciness, category, etc)
 * - Step 2: Correlate with engagement metrics
 * - Step 3: Identify high-performing patterns
 * - Step 4: Generate insights
 * - Step 5: Display recommendations
 */
class ContentEngagementAnalysisService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Step 1: Extract content features from posts
   */
  async extractContentFeatures(filters = {}) {
    try {
      logger.info('Extracting content features', { filters });

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
        .select('storyCategory storySpiciness platform contentType caption hashtags hook performanceMetrics postedAt')
        .lean();

      logger.info('Fetched posts for feature extraction', { count: posts.length });

      // Extract features for each post
      const features = posts.map(post => ({
        postId: post._id,
        category: post.storyCategory,
        spiciness: post.storySpiciness,
        platform: post.platform,
        contentType: post.contentType,
        captionLength: post.caption?.length || 0,
        hashtagCount: post.hashtags?.length || 0,
        hookLength: post.hook?.length || 0,
        hasHook: !!post.hook,
        views: post.performanceMetrics?.views || 0,
        likes: post.performanceMetrics?.likes || 0,
        comments: post.performanceMetrics?.comments || 0,
        shares: post.performanceMetrics?.shares || 0,
        engagementRate: post.performanceMetrics?.engagementRate || 0,
        postedAt: post.postedAt
      }));

      return {
        success: true,
        totalPosts: features.length,
        features
      };

    } catch (error) {
      logger.error('Error extracting content features', { error: error.message });
      throw error;
    }
  }

  /**
   * Step 2: Correlate features with engagement metrics
   */
  async correlateWithEngagement(features) {
    try {
      logger.info('Correlating features with engagement metrics', { featureCount: features.length });

      if (!features || features.length === 0) {
        return {
          success: false,
          message: 'No features to analyze'
        };
      }

      // Group by different dimensions
      const correlations = {
        byCategory: this.groupByAndAverage(features, 'category'),
        bySpiciness: this.groupByAndAverage(features, 'spiciness'),
        byPlatform: this.groupByAndAverage(features, 'platform'),
        byContentType: this.groupByAndAverage(features, 'contentType'),
        captionLength: this.analyzeNumericCorrelation(features, 'captionLength'),
        hashtagCount: this.analyzeNumericCorrelation(features, 'hashtagCount'),
        hookPresence: this.analyzeBooleanCorrelation(features, 'hasHook'),
        hookLength: this.analyzeNumericCorrelation(features, 'hookLength')
      };

      return {
        success: true,
        correlations
      };

    } catch (error) {
      logger.error('Error correlating with engagement', { error: error.message });
      throw error;
    }
  }

  /**
   * Helper: Group by field and calculate average engagement
   */
  groupByAndAverage(features, field) {
    const groups = {};

    features.forEach(feature => {
      const key = feature[field];
      if (!groups[key]) {
        groups[key] = {
          count: 0,
          totalViews: 0,
          totalLikes: 0,
          totalComments: 0,
          totalShares: 0,
          totalEngagementRate: 0
        };
      }

      groups[key].count++;
      groups[key].totalViews += feature.views;
      groups[key].totalLikes += feature.likes;
      groups[key].totalComments += feature.comments;
      groups[key].totalShares += feature.shares;
      groups[key].totalEngagementRate += feature.engagementRate;
    });

    // Calculate averages
    const result = {};
    Object.keys(groups).forEach(key => {
      const group = groups[key];
      result[key] = {
        count: group.count,
        avgViews: Math.round(group.totalViews / group.count),
        avgLikes: Math.round(group.totalLikes / group.count),
        avgComments: Math.round(group.totalComments / group.count),
        avgShares: Math.round(group.totalShares / group.count),
        avgEngagementRate: parseFloat((group.totalEngagementRate / group.count).toFixed(2))
      };
    });

    // Sort by avgEngagementRate
    return Object.entries(result)
      .sort((a, b) => b[1].avgEngagementRate - a[1].avgEngagementRate)
      .reduce((sorted, [key, value]) => {
        sorted[key] = value;
        return sorted;
      }, {});
  }

  /**
   * Helper: Analyze correlation between numeric feature and engagement
   */
  analyzeNumericCorrelation(features, field) {
    // Create buckets
    const values = features.map(f => f[field]).filter(v => v != null);
    if (values.length === 0) return null;

    const min = Math.min(...values);
    const max = Math.max(...values);

    // Create 5 buckets
    const bucketCount = 5;
    const bucketSize = Math.max(1, Math.floor((max - min) / bucketCount));
    const buckets = {};

    features.forEach(feature => {
      const value = feature[field];
      if (value == null) return;

      const bucketKey = Math.floor(value / bucketSize) * bucketSize;
      if (!buckets[bucketKey]) {
        buckets[bucketKey] = {
          count: 0,
          totalEngagementRate: 0,
          samples: []
        };
      }

      buckets[bucketKey].count++;
      buckets[bucketKey].totalEngagementRate += feature.engagementRate;
      buckets[bucketKey].samples.push(feature.engagementRate);
    });

    // Calculate averages and find best bucket
    let bestBucket = null;
    let bestRate = 0;

    const result = {};
    Object.keys(buckets).sort((a, b) => parseInt(a) - parseInt(b)).forEach(key => {
      const bucket = buckets[key];
      const avgRate = parseFloat((bucket.totalEngagementRate / bucket.count).toFixed(2));
      result[key] = {
        range: `${parseInt(key)}-${parseInt(key) + bucketSize}`,
        count: bucket.count,
        avgEngagementRate: avgRate
      };

      if (avgRate > bestRate && bucket.count >= 3) {
        bestRate = avgRate;
        bestBucket = key;
      }
    });

    return {
      buckets: result,
      bestRange: bestBucket ? `${parseInt(bestBucket)}-${parseInt(bestBucket) + bucketSize}` : null
    };
  }

  /**
   * Helper: Analyze correlation between boolean feature and engagement
   */
  analyzeBooleanCorrelation(features, field) {
    const trueGroup = features.filter(f => f[field] === true);
    const falseGroup = features.filter(f => f[field] === false);

    const calculateAvg = (group) => {
      if (group.length === 0) return 0;
      const total = group.reduce((sum, f) => sum + f.engagementRate, 0);
      return parseFloat((total / group.length).toFixed(2));
    };

    const trueAvg = calculateAvg(trueGroup);
    const falseAvg = calculateAvg(falseGroup);

    return {
      withFeature: {
        count: trueGroup.length,
        avgEngagementRate: trueAvg
      },
      withoutFeature: {
        count: falseGroup.length,
        avgEngagementRate: falseAvg
      },
      lift: falseAvg > 0 ? parseFloat(((trueAvg - falseAvg) / falseAvg * 100).toFixed(2)) : 0,
      recommendation: trueAvg > falseAvg ? 'include' : 'exclude'
    };
  }

  /**
   * Step 3: Identify high-performing patterns
   */
  identifyHighPerformingPatterns(correlations) {
    try {
      logger.info('Identifying high-performing patterns');

      if (!correlations || !correlations.success) {
        return {
          success: false,
          message: 'No correlation data available'
        };
      }

      const { correlations: data } = correlations;
      const patterns = [];

      // Best performing categories
      const topCategories = Object.entries(data.byCategory)
        .slice(0, 3)
        .map(([category, stats]) => ({
          type: 'category',
          value: category,
          avgEngagementRate: stats.avgEngagementRate,
          avgViews: stats.avgViews,
          sampleSize: stats.count
        }));
      patterns.push(...topCategories);

      // Best performing spiciness levels
      const topSpiciness = Object.entries(data.bySpiciness)
        .slice(0, 3)
        .map(([level, stats]) => ({
          type: 'spiciness',
          value: parseInt(level),
          avgEngagementRate: stats.avgEngagementRate,
          avgViews: stats.avgViews,
          sampleSize: stats.count
        }));
      patterns.push(...topSpiciness);

      // Best performing platforms
      const topPlatforms = Object.entries(data.byPlatform)
        .slice(0, 3)
        .map(([platform, stats]) => ({
          type: 'platform',
          value: platform,
          avgEngagementRate: stats.avgEngagementRate,
          avgViews: stats.avgViews,
          sampleSize: stats.count
        }));
      patterns.push(...topPlatforms);

      // Best caption length
      if (data.captionLength && data.captionLength.bestRange) {
        patterns.push({
          type: 'captionLength',
          value: data.captionLength.bestRange,
          description: `Caption length ${data.captionLength.bestRange} characters performs best`
        });
      }

      // Best hashtag count
      if (data.hashtagCount && data.hashtagCount.bestRange) {
        patterns.push({
          type: 'hashtagCount',
          value: data.hashtagCount.bestRange,
          description: `Hashtag count ${data.hashtagCount.bestRange} performs best`
        });
      }

      // Hook presence impact
      if (data.hookPresence) {
        patterns.push({
          type: 'hookPresence',
          value: data.hookPresence.recommendation,
          lift: data.hookPresence.lift,
          description: `Posts with hooks show ${data.hookPresence.lift > 0 ? '+' : ''}${data.hookPresence.lift}% lift`
        });
      }

      // Sort by engagement rate
      patterns.sort((a, b) => (b.avgEngagementRate || 0) - (a.avgEngagementRate || 0));

      return {
        success: true,
        patterns: patterns.slice(0, 10) // Top 10 patterns
      };

    } catch (error) {
      logger.error('Error identifying patterns', { error: error.message });
      throw error;
    }
  }

  /**
   * Step 4: Generate insights
   */
  generateInsights(correlations, patterns) {
    try {
      logger.info('Generating insights');

      if (!correlations || !patterns) {
        return {
          success: false,
          message: 'Missing data for insights'
        };
      }

      const insights = [];
      const { correlations: data } = correlations;

      // Category insights
      const categories = Object.entries(data.byCategory);
      if (categories.length > 0) {
        const top = categories[0];
        const bottom = categories[categories.length - 1];
        const lift = ((top[1].avgEngagementRate - bottom[1].avgEngagementRate) / bottom[1].avgEngagementRate * 100).toFixed(1);

        insights.push({
          type: 'category',
          title: 'Top Category Performance',
          insight: `"${top[0]}" category outperforms "${bottom[0]}" by ${lift}%`,
          recommendation: `Focus content creation on "${top[0]}" category for higher engagement`,
          priority: 'high',
          data: {
            topCategory: top[0],
            topEngagementRate: top[1].avgEngagementRate,
            bottomCategory: bottom[0],
            bottomEngagementRate: bottom[1].avgEngagementRate,
            lift: parseFloat(lift)
          }
        });
      }

      // Spiciness insights
      const spicinessLevels = Object.entries(data.bySpiciness);
      if (spicinessLevels.length > 0) {
        const best = spicinessLevels[0];
        insights.push({
          type: 'spiciness',
          title: 'Optimal Spiciness Level',
          insight: `Spiciness level ${best[0]} achieves highest engagement`,
          recommendation: `Target spiciness level ${best[0]} for new content`,
          priority: 'medium',
          data: {
            bestLevel: parseInt(best[0]),
            avgEngagementRate: best[1].avgEngagementRate,
            sampleSize: best[1].count
          }
        });
      }

      // Platform insights
      const platforms = Object.entries(data.byPlatform);
      if (platforms.length > 0) {
        const best = platforms[0];
        insights.push({
          type: 'platform',
          title: 'Best Performing Platform',
          insight: `${best[0].charAt(0).toUpperCase() + best[0].slice(1)} drives highest engagement`,
          recommendation: `Prioritize posting on ${best[0]} for maximum reach`,
          priority: 'medium',
          data: {
            platform: best[0],
            avgEngagementRate: best[1].avgEngagementRate,
            avgViews: best[1].avgViews
          }
        });
      }

      // Caption length insights
      if (data.captionLength && data.captionLength.bestRange) {
        insights.push({
          type: 'caption',
          title: 'Optimal Caption Length',
          insight: `Captions with ${data.captionLength.bestRange} characters perform best`,
          recommendation: `Aim for ${data.captionLength.bestRange} characters in captions`,
          priority: 'low',
          data: {
            bestRange: data.captionLength.bestRange
          }
        });
      }

      // Hook presence insights
      if (data.hookPresence && data.hookPresence.lift > 10) {
        insights.push({
          type: 'hook',
          title: 'Hook Impact',
          insight: `Posts with hooks show ${data.hookPresence.lift}% higher engagement`,
          recommendation: 'Always include a compelling hook in posts',
          priority: 'high',
          data: {
            lift: data.hookPresence.lift,
            withHook: data.hookPresence.withFeature.avgEngagementRate,
            withoutHook: data.hookPresence.withoutFeature.avgEngagementRate
          }
        });
      }

      // Hashtag insights
      if (data.hashtagCount && data.hashtagCount.bestRange) {
        insights.push({
          type: 'hashtags',
          title: 'Optimal Hashtag Count',
          insight: `Posts with ${data.hashtagCount.bestRange} hashtags perform best`,
          recommendation: `Use ${data.hashtagCount.bestRange} hashtags per post`,
          priority: 'low',
          data: {
            bestRange: data.hashtagCount.bestRange
          }
        });
      }

      // Sort by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      return {
        success: true,
        insights
      };

    } catch (error) {
      logger.error('Error generating insights', { error: error.message });
      throw error;
    }
  }

  /**
   * Step 5: Generate recommendations
   */
  generateRecommendations(insights, patterns) {
    try {
      logger.info('Generating recommendations');

      if (!insights || !patterns) {
        return {
          success: false,
          message: 'Missing data for recommendations'
        };
      }

      const recommendations = [];

      // Generate recommendations from insights
      insights.insights?.forEach(insight => {
        recommendations.push({
          category: insight.type,
          title: insight.title,
          recommendation: insight.recommendation,
          priority: insight.priority,
          expectedImpact: insight.data?.lift ? `+${insight.data.lift}%` : 'moderate',
          actionItems: this.getActionItems(insight)
        });
      });

      // Add pattern-based recommendations
      patterns.patterns?.forEach(pattern => {
        if (pattern.type === 'category' && pattern.sampleSize >= 5) {
          recommendations.push({
            category: 'content_strategy',
            title: `Focus on ${pattern.value} Category`,
            recommendation: `Create more content in the ${pattern.value} category`,
            priority: 'high',
            expectedImpact: `+${pattern.avgEngagementRate}% engagement`,
            actionItems: [
              `Select 3-5 top stories from ${pattern.value} category`,
              `Generate content variations for ${pattern.value}`,
              `A/B test different approaches within ${pattern.value}`
            ]
          });
        }

        if (pattern.type === 'spiciness' && pattern.sampleSize >= 5) {
          recommendations.push({
            category: 'content_style',
            title: `Target Spiciness Level ${pattern.value}`,
            recommendation: `Prioritize stories with spiciness level ${pattern.value}`,
            priority: 'medium',
            expectedImpact: `+${pattern.avgEngagementRate}% engagement`,
            actionItems: [
              `Filter content generation for spiciness ${pattern.value}`,
              `Review blacklist to ensure ${pattern.value} stories available`,
              `Monitor if ${pattern.value} continues to perform well`
            ]
          });
        }

        if (pattern.type === 'platform' && pattern.sampleSize >= 10) {
          recommendations.push({
            category: 'platform_strategy',
            title: `Double Down on ${pattern.value}`,
            recommendation: `Increase posting frequency on ${pattern.value}`,
            priority: 'medium',
            expectedImpact: `+${pattern.avgViews} avg views per post`,
            actionItems: [
              `Increase ${pattern.value} posting schedule`,
              `Test optimal posting times for ${pattern.value}`,
              `Allocate more budget to ${pattern.value} promotion`
            ]
          });
        }
      });

      // Remove duplicates and sort by priority
      const unique = recommendations.filter((rec, index, self) =>
        index === self.findIndex(r => r.title === rec.title)
      );

      const priorityOrder = { high: 0, medium: 1, low: 2 };
      unique.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      return {
        success: true,
        recommendations: unique.slice(0, 15) // Top 15 recommendations
      };

    } catch (error) {
      logger.error('Error generating recommendations', { error: error.message });
      throw error;
    }
  }

  /**
   * Helper: Get action items for an insight
   */
  getActionItems(insight) {
    const items = [];

    switch (insight.type) {
      case 'category':
        items.push('Review top-performing stories in this category');
        items.push('Generate variations of successful content');
        items.push('Test different hooks within this category');
        break;

      case 'spiciness':
        items.push('Adjust content generation filters');
        items.push('Review story selection criteria');
        items.push('A/B test adjacent spiciness levels');
        break;

      case 'platform':
        items.push('Increase posting frequency');
        items.push('Optimize posting times');
        items.push('Test platform-specific content formats');
        break;

      case 'caption':
        items.push('Update caption generation templates');
        items.push('Test caption variations');
        items.push('Monitor character count in generated content');
        break;

      case 'hook':
        items.push('Ensure all content includes hooks');
        items.push('A/B test different hook styles');
        items.push('Analyze top-performing hooks');
        break;

      case 'hashtags':
        items.push('Adjust hashtag generation strategy');
        items.push('Test hashtag mix (popular vs niche)');
        items.push('Monitor hashtag performance');
        break;

      default:
        items.push('Implement recommendation');
        items.push('Monitor performance impact');
        items.push('Iterate based on results');
    }

    return items;
  }

  /**
   * Main analysis method - runs full pipeline
   */
  async analyzeEngagement(filters = {}) {
    try {
      logger.info('Starting engagement correlation analysis', { filters });

      // Check cache
      const cacheKey = JSON.stringify(filters);
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        logger.info('Returning cached analysis');
        return cached.data;
      }

      // Step 1: Extract features
      const featuresResult = await this.extractContentFeatures(filters);
      if (!featuresResult.success) {
        return featuresResult;
      }

      // Step 2: Correlate with engagement
      const correlationsResult = await this.correlateWithEngagement(featuresResult.features);

      // Step 3: Identify patterns
      const patternsResult = this.identifyHighPerformingPatterns(correlationsResult);

      // Step 4: Generate insights
      const insightsResult = this.generateInsights(correlationsResult, patternsResult);

      // Step 5: Generate recommendations
      const recommendationsResult = this.generateRecommendations(insightsResult, patternsResult);

      const result = {
        success: true,
        filters,
        summary: {
          totalPostsAnalyzed: featuresResult.totalPosts,
          analysisDate: new Date().toISOString()
        },
        correlations: correlationsResult,
        patterns: patternsResult,
        insights: insightsResult,
        recommendations: recommendationsResult
      };

      // Cache result
      this.cache.set(cacheKey, {
        timestamp: Date.now(),
        data: result
      });

      logger.info('Analysis complete', {
        postsAnalyzed: featuresResult.totalPosts,
        insightsCount: insightsResult.insights?.length || 0,
        recommendationsCount: recommendationsResult.recommendations?.length || 0
      });

      return result;

    } catch (error) {
      logger.error('Error in engagement analysis', { error: error.message, stack: error.stack });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get summary statistics
   */
  async getSummary() {
    try {
      const totalPosts = await MarketingPost.countDocuments({ status: 'posted' });
      const analyzablePosts = await MarketingPost.countDocuments({
        status: 'posted',
        'performanceMetrics.views': { $gte: 100 }
      });

      return {
        success: true,
        summary: {
          totalPostedPosts: totalPosts,
          analyzablePosts: analyzablePosts,
          hasData: analyzablePosts > 10
        }
      };
    } catch (error) {
      logger.error('Error getting summary', { error: error.message });
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
const contentEngagementAnalysisService = new ContentEngagementAnalysisService();
export default contentEngagementAnalysisService;
