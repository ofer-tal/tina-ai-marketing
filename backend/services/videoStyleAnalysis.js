/**
 * Video Style Performance Analysis Service
 *
 * Analyzes which video styles perform best across different platforms
 *
 * Video Styles (based on content type and characteristics):
 * - talking_head: Videos with a person speaking directly to camera
 * - text_overlay: Videos dominated by text on screen
 * - story_reenactment: Videos that act out story scenes
 * - pov_scene: POV-style narrative videos
 * - quote_style: Videos featuring quotes or dialogue
 * - trend_based: Videos leveraging current trends
 * - transition_heavy: Videos with rapid transitions/effects
 * - minimal_clean: Simple, clean aesthetic videos
 */

class VideoStyleAnalysisService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Detect video style based on content characteristics
   */
  detectVideoStyle(post) {
    // If style is already set, use it
    if (post.videoStyle) {
      return post.videoStyle;
    }

    // Detect style based on title, caption, and hashtags
    const title = (post.title || '').toLowerCase();
    const caption = (post.caption || '').toLowerCase();
    const hashtags = (post.hashtags || []).join(' ').toLowerCase();
    const combinedText = `${title} ${caption} ${hashtags}`;

    // Detection rules (ordered by priority)
    const styleRules = [
      {
        style: 'talking_head',
        keywords: ['talking', 'speaking', 'face reveal', 'face to face', 'lets talk', 'chatting']
      },
      {
        style: 'text_overlay',
        keywords: ['text on screen', 'read this', 'word', 'subtitle', 'caption']
      },
      {
        style: 'story_reenactment',
        keywords: ['reenactment', 'scene from', 'acting', 'roleplay', 'performance']
      },
      {
        style: 'pov_scene',
        keywords: ['pov', 'point of view', 'imagine', 'you are', 'through your eyes']
      },
      {
        style: 'quote_style',
        keywords: ['quote', 'dialogue', 'said', 'whispers', 'telling you']
      },
      {
        style: 'trend_based',
        keywords: ['trend', 'viral', 'challenge', 'tiktok made me buy', 'duet']
      },
      {
        style: 'transition_heavy',
        keywords: ['transition', 'transform', 'morph', 'glitch', 'effect']
      },
      {
        style: 'minimal_clean',
        keywords: ['aesthetic', 'clean', 'minimal', 'simple', 'calm', 'peaceful']
      }
    ];

    // Check each rule
    for (const rule of styleRules) {
      const hasKeyword = rule.keywords.some(keyword => combinedText.includes(keyword));
      if (hasKeyword) {
        return rule.style;
      }
    }

    // Default style based on content type
    return post.contentType === 'video' ? 'story_reenactment' : 'text_overlay';
  }

  /**
   * Group posts by video style
   */
  groupByStyle(filters = {}) {
    const cacheKey = `groupByStyle_${JSON.stringify(filters)}`;

    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    // This would normally fetch from database
    // For now, we'll return a structure that matches the expected format
    const result = {
      styles: [
        {
          style: 'talking_head',
          displayName: 'Talking Head',
          description: 'Videos with someone speaking directly to camera',
          postCount: 0,
          posts: []
        },
        {
          style: 'text_overlay',
          displayName: 'Text Overlay',
          description: 'Videos dominated by text on screen',
          postCount: 0,
          posts: []
        },
        {
          style: 'story_reenactment',
          displayName: 'Story Reenactment',
          description: 'Videos that act out story scenes',
          postCount: 0,
          posts: []
        },
        {
          style: 'pov_scene',
          displayName: 'POV Scene',
          description: 'POV-style narrative videos',
          postCount: 0,
          posts: []
        },
        {
          style: 'quote_style',
          displayName: 'Quote Style',
          description: 'Videos featuring quotes or dialogue',
          postCount: 0,
          posts: []
        },
        {
          style: 'trend_based',
          displayName: 'Trend Based',
          description: 'Videos leveraging current trends',
          postCount: 0,
          posts: []
        },
        {
          style: 'transition_heavy',
          displayName: 'Transition Heavy',
          description: 'Videos with rapid transitions/effects',
          postCount: 0,
          posts: []
        },
        {
          style: 'minimal_clean',
          displayName: 'Minimal Clean',
          description: 'Simple, clean aesthetic videos',
          postCount: 0,
          posts: []
        }
      ],
      totalPosts: 0,
      filters: filters
    };

    // Cache the result
    this.cache.set(cacheKey, {
      timestamp: Date.now(),
      data: result
    });

    return result;
  }

  /**
   * Aggregate performance metrics by video style
   */
  aggregatePerformanceByStyle(filters = {}) {
    const cacheKey = `aggregatePerformance_${JSON.stringify(filters)}`;

    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    // Get style groups
    const styleGroups = this.groupByStyle(filters);

    // Calculate performance for each style
    const performanceByStyle = styleGroups.styles.map(styleGroup => {
      const posts = styleGroup.posts || [];

      // Aggregate metrics
      const totals = posts.reduce((acc, post) => {
        const metrics = post.performanceMetrics || {};
        return {
          views: acc.views + (metrics.views || 0),
          likes: acc.likes + (metrics.likes || 0),
          comments: acc.comments + (metrics.comments || 0),
          shares: acc.shares + (metrics.shares || 0)
        };
      }, { views: 0, likes: 0, comments: 0, shares: 0 });

      // Calculate averages
      const postCount = posts.length || 1; // Avoid division by zero
      const averages = {
        avgViews: totals.views / postCount,
        avgLikes: totals.likes / postCount,
        avgComments: totals.comments / postCount,
        avgShares: totals.shares / postCount,
        avgEngagementRate: postCount > 0 ? (totals.likes + totals.comments + totals.shares) / (totals.views || 1) * 100 : 0
      };

      return {
        style: styleGroup.style,
        displayName: styleGroup.displayName,
        description: styleGroup.description,
        postCount: posts.length,
        totals,
        averages
      };
    });

    const result = {
      styles: performanceByStyle,
      totalStyles: performanceByStyle.length,
      filters
    };

    // Cache the result
    this.cache.set(cacheKey, {
      timestamp: Date.now(),
      data: result
    });

    return result;
  }

  /**
   * Calculate style averages
   */
  calculateStyleAverages(filters = {}) {
    const performance = this.aggregatePerformanceByStyle(filters);

    return performance.styles.map(style => ({
      ...style,
      viralityScore: this.calculateViralityScore(style.averages)
    }));
  }

  /**
   * Calculate virality score for a style
   * Weighted formula considering views, engagement rate, and share rate
   */
  calculateViralityScore(averages) {
    const { avgViews, avgLikes, avgComments, avgShares, avgEngagementRate } = averages;

    // Normalize views (logarithmic scale)
    const normalizedViews = avgViews > 0 ? Math.log10(avgViews + 1) * 10 : 0;

    // Engagement rate weight (40%)
    const engagementWeight = Math.min(avgEngagementRate / 20, 1) * 40;

    // Share rate weight (30%) - shares are high value
    const shareRate = avgViews > 0 ? (avgShares / avgViews) * 100 : 0;
    const shareWeight = Math.min(shareRate / 10, 1) * 30;

    // View count weight (30%)
    const viewWeight = Math.min(normalizedViews / 50, 1) * 30;

    return engagementWeight + shareWeight + viewWeight;
  }

  /**
   * Rank video styles by performance
   */
  rankStyles(filters = {}) {
    const stylesWithAverages = this.calculateStyleAverages(filters);

    // Sort by virality score
    const sorted = stylesWithAverages.sort((a, b) => b.viralityScore - a.viralityScore);

    // Add rank and percentile
    const total = sorted.length;
    const ranked = sorted.map((style, index) => ({
      ...style,
      rank: index + 1,
      percentile: total > 0 ? ((total - index) / total) * 100 : 0
    }));

    // Calculate performance gaps
    const top = ranked[0];
    const bottom = ranked[ranked.length - 1];
    const gap = top && bottom ? {
      views: top.averages.avgViews - bottom.averages.avgViews,
      engagementRate: top.averages.avgEngagementRate - bottom.averages.avgEngagementRate,
      viralityScore: top.viralityScore - (bottom.viralityScore || 0)
    } : null;

    return {
      ranked,
      top: top ? { style: top.style, displayName: top.displayName, viralityScore: top.viralityScore } : null,
      bottom: bottom ? { style: bottom.style, displayName: bottom.displayName, viralityScore: bottom.viralityScore || 0 } : null,
      gap,
      totalStyles: total
    };
  }

  /**
   * Analyze style characteristics
   */
  analyzeStyleCharacteristics(filters = {}) {
    const ranked = this.rankStyles(filters);

    return ranked.ranked.map(style => {
      // Determine performance tier
      let tier = 'Low';
      if (style.viralityScore >= 70) tier = 'Excellent';
      else if (style.viralityScore >= 50) tier = 'Good';
      else if (style.viralityScore >= 30) tier = 'Average';

      // Calculate strength
      const strengths = [];
      const weaknesses = [];

      if (style.averages.avgViews > 10000) strengths.push('High view count');
      if (style.averages.avgEngagementRate > 10) strengths.push('Strong engagement');
      if (style.averages.avgShares > 500) strengths.push('High shareability');
      if (style.viralityScore >= 50) strengths.push('Overall strong performer');

      if (style.averages.avgViews < 5000) weaknesses.push('Lower views');
      if (style.averages.avgEngagementRate < 5) weaknesses.push('Weak engagement');
      if (style.averages.avgShares < 100) weaknesses.push('Low shareability');
      if (style.viralityScore < 30) weaknesses.push('Underperforming');

      return {
        ...style,
        tier,
        strengths,
        weaknesses
      };
    });
  }

  /**
   * Generate insights and recommendations
   */
  generateInsights(filters = {}) {
    const ranked = this.rankStyles(filters);
    const characteristics = this.analyzeStyleCharacteristics(filters);

    const insights = [];
    const recommendations = [];

    // Top performer insight
    if (ranked.top) {
      insights.push({
        type: 'success',
        priority: 'high',
        title: 'Top Performing Style',
        message: `${ranked.top.displayName} videos are your best performers with a virality score of ${ranked.top.viralityScore.toFixed(1)}.`
      });
    }

    // Bottom performer insight
    if (ranked.bottom) {
      insights.push({
        type: 'warning',
        priority: 'medium',
        title: 'Lowest Performing Style',
        message: `${ranked.bottom.displayName} videos are underperforming. Consider testing different approaches or reducing frequency.`
      });
    }

    // Performance gap insight
    if (ranked.gap && ranked.gap.viralityScore > 20) {
      insights.push({
        type: 'info',
        priority: 'low',
        title: 'Significant Performance Gap',
        message: `There's a ${(ranked.gap.viralityScore).toFixed(1)} point gap between top and bottom performers. Focus on top styles.`
      });
    }

    // Style-specific insights
    characteristics.forEach(style => {
      if (style.tier === 'Excellent' && style.postCount >= 5) {
        insights.push({
          type: 'success',
          priority: 'high',
          title: `Strong ${style.displayName} Performance`,
          message: `${style.displayName} consistently performs well with ${style.postCount} posts. Consider increasing production.`
        });
      }

      if (style.weaknesses.includes('Low shareability') && style.postCount >= 3) {
        insights.push({
          type: 'warning',
          priority: 'medium',
          title: `${style.displayName} Shareability Issue`,
          message: `${style.displayName} videos get views but few shares. Add call-to-actions or controversial hooks.`
        });
      }
    });

    // Generate recommendations
    const topStyles = characteristics.filter(s => s.tier === 'Excellent' || s.tier === 'Good');
    const bottomStyles = characteristics.filter(s => s.tier === 'Low' || s.tier === 'Average');

    if (topStyles.length > 0) {
      recommendations.push({
        action: 'Increase Production',
        priority: 'high',
        impact: 'High',
        effort: 'Medium',
        description: `Focus 60-70% of content production on top performers: ${topStyles.map(s => s.displayName).join(', ')}.`,
        styles: topStyles.map(s => s.style)
      });
    }

    if (bottomStyles.length > 0) {
      recommendations.push({
        action: 'Optimize or Reduce',
        priority: 'medium',
        impact: 'Medium',
        effort: 'Low',
        description: `Test variations of ${bottomStyles.map(s => s.displayName).join(', ')} or reduce their frequency.`,
        styles: bottomStyles.map(s => s.style)
      });
    }

    if (ranked.gap && ranked.gap.engagementRate > 5) {
      recommendations.push({
        action: 'Analyze Engagement Drivers',
        priority: 'low',
        impact: 'Medium',
        effort: 'High',
        description: 'Deep dive into why top styles perform better. Look at hooks, pacing, and CTAs.',
        styles: []
      });
    }

    return {
      insights: insights.slice(0, 10), // Limit to top 10 insights
      recommendations: recommendations.slice(0, 5), // Limit to top 5 recommendations
      summary: {
        topStyles: topStyles.length,
        bottomStyles: bottomStyles.length,
        hasSignificantGap: ranked.gap && ranked.gap.viralityScore > 20
      }
    };
  }

  /**
   * Get comprehensive analysis
   */
  async analyze(filters = {}) {
    try {
      const [
        styleGroups,
        performance,
        ranked,
        characteristics,
        insightsAndRecommendations
      ] = await Promise.all([
        Promise.resolve(this.groupByStyle(filters)),
        Promise.resolve(this.aggregatePerformanceByStyle(filters)),
        Promise.resolve(this.rankStyles(filters)),
        Promise.resolve(this.analyzeStyleCharacteristics(filters)),
        Promise.resolve(this.generateInsights(filters))
      ]);

      return {
        success: true,
        data: {
          styleGroups,
          performance,
          ranked,
          characteristics,
          insights: insightsAndRecommendations.insights,
          recommendations: insightsAndRecommendations.recommendations,
          summary: insightsAndRecommendations.summary,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error in video style analysis:', error);
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
    return { success: true, message: 'Cache cleared' };
  }

  /**
   * Get style statistics
   */
  getStatistics(filters = {}) {
    const performance = this.aggregatePerformanceByStyle(filters);

    const totalPosts = performance.styles.reduce((sum, style) => sum + style.postCount, 0);
    const totalViews = performance.styles.reduce((sum, style) => sum + style.totals.views, 0);
    const totalEngagement = performance.styles.reduce((sum, style) =>
      sum + style.totals.likes + style.totals.comments + style.totals.shares, 0
    );

    const activeStyles = performance.styles.filter(s => s.postCount > 0).length;

    return {
      totalStyles: performance.styles.length,
      activeStyles,
      totalPosts,
      totalViews,
      totalEngagement,
      overallEngagementRate: totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0,
      averagePostsPerStyle: activeStyles > 0 ? totalPosts / activeStyles : 0
    };
  }
}

export default VideoStyleAnalysisService;
