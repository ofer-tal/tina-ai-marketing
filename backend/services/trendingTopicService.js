/**
 * Trending Topic Suggestions Service
 * Monitors industry trends, analyzes competitor content, identifies gaps,
 * and generates topic suggestions based on trending themes
 * Feature #272: Topic suggestions based on trends
 */

import glmService from './glmService.js';
import AnalyticsMetric from '../models/AnalyticsMetric.js';

const trendingTopicService = {
  /**
   * Monitor industry trends
   * Step 1 of Feature #272
   */
  async monitorIndustryTrends(options = {}) {
    const {
      timeframe = '7d', // 7d, 30d, 90d
      categories = ['romance', 'fiction', 'storytelling', 'AI-content'],
      sources = ['social', 'search', 'competitors', 'industry-news']
    } = options;

    try {
      // Gather trend data from multiple sources
      const trendData = await this._gatherTrendData(timeframe, categories, sources);

      // Analyze trending themes and patterns
      const trendingThemes = await this._analyzeTrendingThemes(trendData);

      // Identify rising vs falling trends
      const trendVelocity = await this._calculateTrendVelocity(trendData);

      return {
        success: true,
        timeframe,
        categories,
        trendingThemes,
        trendVelocity,
        sources: sources.length,
        analyzedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error monitoring industry trends:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Analyze competitor content
   * Step 2 of Feature #272
   */
  async analyzeCompetitorContent(options = {}) {
    const {
      competitors = ['medium-competitors', 'industry-leaders', 'emerging-creators'],
      contentType = 'blog',
      limit = 50
    } = options;

    try {
      // Fetch competitor content data
      const competitorContent = await this._fetchCompetitorContent(competitors, contentType, limit);

      // Analyze content themes
      const contentThemes = await this._analyzeContentThemes(competitorContent);

      // Identify top performing topics
      const topTopics = await this._identifyTopPerformingTopics(competitorContent);

      // Analyze content formats and structures
      const formatAnalysis = await this._analyzeContentFormats(competitorContent);

      // Calculate content gaps (what competitors are NOT covering)
      const contentGaps = await this._identifyContentGaps(contentThemes, topTopics);

      return {
        success: true,
        competitors: competitors.length,
        contentAnalyzed: competitorContent.length,
        contentThemes,
        topTopics,
        formatAnalysis,
        contentGaps,
        analyzedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error analyzing competitor content:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Identify content gaps
   * Step 3 of Feature #272
   */
  async identifyContentGaps(trendingThemes, competitorAnalysis, options = {}) {
    const {
      currentContent = [],
      targetAudience = 'women-18-45-interested-in-romance'
    } = options;

    try {
      // Get our existing content themes
      const ourContentThemes = await this._extractOurContentThemes(currentContent);

      // Find gaps between trending topics and our content
      const trendGaps = this._findTrendGaps(trendingThemes, ourContentThemes);

      // Find gaps between competitor success and our content
      const competitorGaps = this._findCompetitorGaps(competitorAnalysis, ourContentThemes);

      // Find underserved niches
      const nicheGaps = await this._findNicheGaps(trendingThemes, competitorAnalysis);

      // Identify seasonal opportunities
      const seasonalOpportunities = await this._identifySeasonalOpportunities();

      // Prioritize gaps by opportunity score
      const prioritizedGaps = this._prioritizeContentGaps(
        trendGaps,
        competitorGaps,
        nicheGaps,
        seasonalOpportunities
      );

      return {
        success: true,
        trendGaps,
        competitorGaps,
        nicheGaps,
        seasonalOpportunities,
        prioritizedGaps,
        totalGaps: prioritizedGaps.length,
        analyzedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error identifying content gaps:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Generate topic suggestions
   * Step 4 of Feature #272
   */
  async generateTopicSuggestions(contentGaps, trendingThemes, options = {}) {
    const {
      contentType = 'blog',
      count = 10,
      targetAudience = 'women-18-45-interested-in-romance',
      tone = 'engaging'
    } = options;

    try {
      // Use AI to generate topic suggestions based on gaps and trends
      const prompt = this._buildTopicSuggestionPrompt(
        contentGaps,
        trendingThemes,
        contentType,
        count,
        targetAudience,
        tone
      );

      let aiResponse;
      try {
        aiResponse = await glmService.createMessage(
          'trending-topic-suggestions',
          [{ role: 'user', content: prompt }]
        );
      } catch (apiError) {
        console.warn('GLM API error, using fallback suggestions:', apiError.message);
        aiResponse = {
          content: this._getFallbackTopicSuggestions(
            contentGaps,
            trendingThemes,
            count
          )
        };
      }

      // Parse AI response into structured suggestions
      const suggestions = this._parseTopicSuggestions(
        aiResponse.content,
        contentType
      );

      // Enhance suggestions with metadata
      const enhancedSuggestions = suggestions
        .filter(s => s && s.title)
        .map(suggestion => ({
          ...suggestion,
          contentType,
          targetAudience,
          trendAlignment: this._calculateTrendAlignment(suggestion, trendingThemes),
          gapScore: this._calculateGapScore(suggestion, contentGaps),
          suggestedFormats: this._suggestContentFormats(suggestion, contentType),
          relatedKeywords: this._extractRelatedKeywords(suggestion),
          estimatedDifficulty: this._estimateDifficulty(suggestion),
          seoPotential: this._estimateSEOPotential(suggestion)
        }))
        .sort((a, b) => b.opportunityScore - a.opportunityScore)
        .slice(0, count);

      return {
        success: true,
        suggestions: enhancedSuggestions,
        count: enhancedSuggestions.length,
        contentType,
        basedOnGaps: contentGaps.length || 0,
        basedOnTrends: trendingThemes.length || 0,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating topic suggestions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Prioritize topics by opportunity
   * Step 5 of Feature #272
   */
  async prioritizeByOpportunity(suggestions, options = {}) {
    const {
      priorities = {
        trendAlignment: 0.3,
        gapScore: 0.25,
        seoPotential: 0.2,
        difficulty: 0.15,
        audienceMatch: 0.1
      }
    } = options;

    try {
      // Calculate overall opportunity score for each suggestion
      const prioritizedSuggestions = suggestions.map(suggestion => {
        const opportunityScore =
          (suggestion.trendAlignment * priorities.trendAlignment) +
          (suggestion.gapScore * priorities.gapScore) +
          (suggestion.seoPotential * priorities.seoPotential) +
          ((1 - suggestion.estimatedDifficulty) * priorities.difficulty) +
          (suggestion.audienceMatch || 0.8 * priorities.audienceMatch);

        return {
          ...suggestion,
          opportunityScore: Math.round(opportunityScore * 100) / 100,
          priority: this._assignPriority(opportunityScore),
          estimatedImpact: this._estimateImpact(suggestion, opportunityScore),
          quickWin: opportunityScore > 0.7 && suggestion.estimatedDifficulty < 0.4
        };
      });

      // Sort by opportunity score
      prioritizedSuggestions.sort((a, b) => b.opportunityScore - a.opportunityScore);

      // Group by priority tier
      const priorityTiers = {
        high: prioritizedSuggestions.filter(s => s.priority === 'high'),
        medium: prioritizedSuggestions.filter(s => s.priority === 'medium'),
        low: prioritizedSuggestions.filter(s => s.priority === 'low'),
        quickWins: prioritizedSuggestions.filter(s => s.quickWin)
      };

      return {
        success: true,
        suggestions: prioritizedSuggestions,
        priorityTiers,
        totalSuggestions: prioritizedSuggestions.length,
        quickWinsCount: priorityTiers.quickWins.length,
        prioritizedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error prioritizing by opportunity:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Get comprehensive topic suggestions workflow
   * Combines all 5 steps
   */
  async getComprehensiveTopicSuggestions(options = {}) {
    try {
      console.log('Starting comprehensive topic suggestion workflow...');

      // Step 1: Monitor industry trends
      const trendsResult = await this.monitorIndustryTrends(options);
      if (!trendsResult.success) {
        throw new Error('Failed to monitor trends: ' + trendsResult.error);
      }

      // Step 2: Analyze competitor content
      const competitorResult = await this.analyzeCompetitorContent(options);
      if (!competitorResult.success) {
        throw new Error('Failed to analyze competitors: ' + competitorResult.error);
      }

      // Step 3: Identify content gaps
      const gapsResult = await this.identifyContentGaps(
        trendsResult.trendingThemes,
        competitorResult,
        options
      );
      if (!gapsResult.success) {
        throw new Error('Failed to identify gaps: ' + gapsResult.error);
      }

      // Step 4: Generate topic suggestions
      const suggestionsResult = await this.generateTopicSuggestions(
        gapsResult.prioritizedGaps,
        trendsResult.trendingThemes,
        options
      );
      if (!suggestionsResult.success) {
        throw new Error('Failed to generate suggestions: ' + suggestionsResult.error);
      }

      // Step 5: Prioritize by opportunity
      const prioritizedResult = await this.prioritizeByOpportunity(
        suggestionsResult.suggestions,
        options
      );
      if (!prioritizedResult.success) {
        throw new Error('Failed to prioritize: ' + prioritizedResult.error);
      }

      return {
        success: true,
        workflow: {
          step1_trends: trendsResult,
          step2_competitors: competitorResult,
          step3_gaps: gapsResult,
          step4_suggestions: suggestionsResult,
          step5_prioritized: prioritizedResult
        },
        summary: {
          trendingThemes: trendsResult.trendingThemes?.length || 0,
          competitorContentAnalyzed: competitorResult.contentAnalyzed || 0,
          contentGaps: gapsResult.totalGaps || 0,
          topicSuggestions: prioritizedResult.totalSuggestions || 0,
          quickWins: prioritizedResult.quickWinsCount || 0
        },
        completedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in comprehensive workflow:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Gather trend data from multiple sources
   */
  async _gatherTrendData(timeframe, categories, sources) {
    const trendData = {
      social: [],
      search: [],
      competitors: [],
      news: []
    };

    // Try to fetch from stored metrics
    try {
      const days = parseInt(timeframe) || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get search traffic trends (if available)
      const searchMetrics = await AnalyticsMetric.find({
        name: { $in: ['ga_sessions_by_source', 'ga_pageviews_by_page'] },
        timestamp: { $gte: startDate }
      }).sort({ timestamp: -1 });

      if (searchMetrics.length > 0) {
        trendData.search = searchMetrics.map(m => ({
          source: m.metadata?.source || 'unknown',
          value: m.value,
          timestamp: m.timestamp
        }));
      }
    } catch (error) {
      console.warn('Could not fetch search metrics:', error.message);
    }

    // Add mock trend data for development
    trendData.social = this._getMockSocialTrends(categories);
    trendData.competitors = this._getMockCompetitorTrends(categories);
    trendData.news = this._getMockIndustryNews(categories);

    return trendData;
  },

  /**
   * Analyze trending themes from gathered data
   */
  async _analyzeTrendingThemes(trendData) {
    const themes = [];

    // Extract themes from social data
    const socialKeywords = this._extractKeywords(trendData.social);
    const searchKeywords = this._extractKeywords(trendData.search);
    const competitorKeywords = this._extractKeywords(trendData.competitors);

    // Combine and rank keywords
    const allKeywords = [
      ...socialKeywords.map(k => ({ ...k, source: 'social' })),
      ...searchKeywords.map(k => ({ ...k, source: 'search' })),
      ...competitorKeywords.map(k => ({ ...k, source: 'competitor' }))
    ];

    // Group by keyword and sum frequencies
    const keywordGroups = new Map();
    allKeywords.forEach(kw => {
      const existing = keywordGroups.get(kw.keyword) || { keyword: kw.keyword, frequency: 0, sources: [] };
      existing.frequency += kw.frequency;
      if (!existing.sources.includes(kw.source)) {
        existing.sources.push(kw.source);
      }
      keywordGroups.set(kw.keyword, existing);
    });

    // Convert to array and sort by frequency
    const sortedKeywords = Array.from(keywordGroups.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20);

    // Create themes from top keywords
    sortedKeywords.forEach(kw => {
      themes.push({
        theme: kw.keyword,
        frequency: kw.frequency,
        sources: kw.sources,
        trendDirection: Math.random() > 0.3 ? 'rising' : 'stable', // Simulated trend direction
        category: this._categorizeTheme(kw.keyword)
      });
    });

    return themes;
  },

  /**
   * Calculate trend velocity (rising vs falling)
   */
  async _calculateTrendVelocity(trendData) {
    const velocity = {
      rising: [],
      falling: [],
      stable: []
    };

    // Simulate velocity calculation based on trend data
    const allThemes = [
      ...trendData.social.map(s => ({ theme: s.keyword, velocity: (Math.random() - 0.3) })),
      ...trendData.search.map(s => ({ theme: s.keyword, velocity: (Math.random() - 0.3) }))
    ];

    allThemes.forEach(t => {
      if (t.velocity > 0.2) {
        velocity.rising.push({ theme: t.theme, velocity: t.velocity });
      } else if (t.velocity < -0.2) {
        velocity.falling.push({ theme: t.theme, velocity: t.velocity });
      } else {
        velocity.stable.push({ theme: t.theme, velocity: t.velocity });
      }
    });

    return velocity;
  },

  /**
   * Fetch competitor content
   */
  async _fetchCompetitorContent(competitors, contentType, limit) {
    // In production, this would scrape competitor websites or use APIs
    // For now, return mock data
    const mockContent = [];

    const topics = [
      'AI romance writing',
      'interactive storytelling',
      'character development tips',
      'plot structure techniques',
      'dialogue writing exercises',
      'self-publishing strategies',
      'romance tropes explained',
      'genre fiction trends',
      'creative writing tools',
      'story pacing methods'
    ];

    for (let i = 0; i < limit; i++) {
      const topic = topics[i % topics.length];
      mockContent.push({
        title: `${topic}: A Comprehensive Guide`,
        topic,
        contentType,
        views: Math.floor(Math.random() * 10000) + 1000,
        shares: Math.floor(Math.random() * 500) + 50,
        engagementRate: Math.random() * 0.1 + 0.02,
        publishedAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000)
      });
    }

    return mockContent;
  },

  /**
   * Analyze content themes from competitor data
   */
  async _analyzeContentThemes(competitorContent) {
    const themes = new Map();

    competitorContent.forEach(content => {
      const words = content.topic.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 3) {
          const existing = themes.get(word) || { theme: word, count: 0, totalViews: 0 };
          existing.count++;
          existing.totalViews += content.views;
          themes.set(word, existing);
        }
      });
    });

    return Array.from(themes.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  },

  /**
   * Identify top performing topics
   */
  async _identifyTopPerformingTopics(competitorContent) {
    return competitorContent
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, 10)
      .map(content => ({
        topic: content.topic,
        title: content.title,
        views: content.views,
        shares: content.shares,
        engagementRate: content.engagementRate,
        performanceScore: (content.views * 0.01) + (content.shares * 2) + (content.engagementRate * 1000)
      }));
  },

  /**
   * Analyze content formats
   */
  async _analyzeContentFormats(competitorContent) {
    const formats = {
      'how-to-guides': 0,
      'listicles': 0,
      'case-studies': 0,
      'tutorials': 0,
      'opinion-pieces': 0
    };

    // Simulate format detection
    competitorContent.forEach(content => {
      if (content.title.includes('Guide') || content.title.includes('How')) {
        formats['how-to-guides']++;
      } else if (content.title.includes('Tips') || content.title.includes('Ways')) {
        formats['listicles']++;
      } else if (content.title.includes('Story') || content.title.includes('Case')) {
        formats['case-studies']++;
      } else if (content.title.includes('Tutorial') || content.title.includes('Learn')) {
        formats['tutorials']++;
      } else {
        formats['opinion-pieces']++;
      }
    });

    return Object.entries(formats)
      .map(([format, count]) => ({ format, count, percentage: (count / competitorContent.length) * 100 }))
      .sort((a, b) => b.count - a.count);
  },

  /**
   * Identify content gaps
   */
  async _identifyContentGaps(contentThemes, topTopics) {
    const gaps = [];

    // Find themes that competitors aren't covering much
    const lowCompetitionThemes = contentThemes
      .filter(theme => theme.count < 3)
      .map(theme => ({
        theme: theme.theme,
        gapType: 'low-competition',
        opportunity: 'medium'
      }));

    gaps.push(...lowCompetitionThemes);

    // Find high-engagement but low-volume topics
    topTopics.forEach(topic => {
      if (topic.engagementRate > 0.05 && topic.views < 3000) {
        gaps.push({
          theme: topic.topic,
          gapType: 'underserved',
          opportunity: 'high',
          reason: 'High engagement but low competition'
        });
      }
    });

    return gaps;
  },

  /**
   * Extract our content themes
   */
  async _extractOurContentThemes(currentContent) {
    if (!currentContent || currentContent.length === 0) {
      return [];
    }

    const themes = new Map();
    currentContent.forEach(content => {
      const words = (content.topic || content.title || '').toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 3) {
          const existing = themes.get(word) || { theme: word, count: 0 };
          existing.count++;
          themes.set(word, existing);
        }
      });
    });

    return Array.from(themes.values()).map(t => t.theme);
  },

  /**
   * Find trend gaps
   */
  _findTrendGaps(trendingThemes, ourContentThemes) {
    return trendingThemes
      .filter(theme => !ourContentThemes.includes(theme.theme.toLowerCase()))
      .map(theme => ({
        theme: theme.theme,
        gapType: 'trend-opportunity',
        trendDirection: theme.trendDirection,
        frequency: theme.frequency,
        sources: theme.sources
      }));
  },

  /**
   * Find competitor gaps
   */
  _findCompetitorGaps(competitorAnalysis, ourContentThemes) {
    const gaps = [];

    competitorAnalysis.topTopics.forEach(topic => {
      const topicWords = topic.topic.toLowerCase().split(/\s+/);
      const hasOverlap = topicWords.some(word => ourContentThemes.includes(word));

      if (!hasOverlap) {
        gaps.push({
          theme: topic.topic,
          gapType: 'competitor-success',
          performanceScore: topic.performanceScore,
          engagementRate: topic.engagementRate
        });
      }
    });

    return gaps;
  },

  /**
   * Find niche gaps
   */
  async _findNicheGaps(trendingThemes, competitorAnalysis) {
    // Find specific angles not covered by competitors
    const nicheAngles = [
      'AI-powered character development',
      'Spicy romance writing techniques',
      'Interactive fiction monetization',
      'Short-form storytelling strategies',
      'Serial fiction audience building',
      'Cross-platform story promotion',
      'Romance genre market analysis',
      'Indie author success stories'
    ];

    return nicheAngles.map(angle => ({
      theme: angle,
      gapType: 'niche-opportunity',
      specificity: 'high'
    }));
  },

  /**
   * Identify seasonal opportunities
   */
  async _identifySeasonalOpportunities() {
    const month = new Date().getMonth();
    const seasonalTopics = {
      0: [{ theme: 'New Year writing resolutions', season: 'winter', urgency: 'high' }],
      1: [{ theme: 'Valentine\'s Day romance content', season: 'winter', urgency: 'high' }],
      5: [{ theme: 'Summer reading recommendations', season: 'summer', urgency: 'medium' }],
      9: [{ theme: 'NaNoWriMo preparation', season: 'fall', urgency: 'high' }],
      11: [{ theme: 'Holiday romance stories', season: 'winter', urgency: 'high' }]
    };

    return seasonalTopics[month] || [{ theme: 'Evergreen romance topics', season: 'all', urgency: 'low' }];
  },

  /**
   * Prioritize content gaps
   */
  _prioritizeContentGaps(trendGaps, competitorGaps, nicheGaps, seasonalOpportunities) {
    const allGaps = [
      ...trendGaps.map(g => ({ ...g, priorityScore: 8 })),
      ...competitorGaps.map(g => ({ ...g, priorityScore: 7 })),
      ...nicheGaps.map(g => ({ ...g, priorityScore: 6 })),
      ...seasonalOpportunities.map(g => ({ ...g, priorityScore: g.urgency === 'high' ? 9 : 5 }))
    ];

    return allGaps
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 15);
  },

  /**
   * Build topic suggestion prompt for AI
   */
  _buildTopicSuggestionPrompt(contentGaps, trendingThemes, contentType, count, targetAudience, tone) {
    return `You are a content marketing expert specializing in the romance fiction and AI storytelling space.

Generate ${count} unique, engaging ${contentType} topic suggestions based on the following:

TARGET AUDIENCE: ${targetAudience}
TONE: ${tone}

TRENDING THEMES:
${trendingThemes.slice(0, 5).map(t => `- ${t.theme} (${t.trendDirection || 'stable'})`).join('\n')}

CONTENT GAPS (opportunities):
${contentGaps.slice(0, 5).map(g => `- ${g.theme} (${g.gapType})`).join('\n')}

REQUIREMENTS:
1. Each topic should be specific and actionable
2. Topics should align with current trends
3. Topics should fill identified content gaps
4. Focus on: AI storytelling, romance fiction writing, character development, plot structure, and audience engagement
5. Avoid overly generic topics
6. Make topics intriguing and click-worthy but still professional

For each topic, provide:
- title: A catchy, SEO-friendly title
- description: 2-3 sentences explaining what the content will cover
- keyPoints: 3-5 bullet points of main content
- targetKeywords: 3-5 relevant keywords
- suggestedFormat: e.g., "how-to guide", "listicle", "case study"

Return as a JSON array of objects.`;
  },

  /**
   * Parse AI response into suggestions
   */
  _parseTopicSuggestions(aiResponse, contentType) {
    try {
      // Try to parse as JSON
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.warn('Could not parse AI response as JSON, using fallback');
    }

    // Fallback: extract suggestions from text
    return this._extractSuggestionsFromText(aiResponse, contentType);
  },

  /**
   * Extract suggestions from text format
   */
  _extractSuggestionsFromText(text, contentType) {
    const suggestions = [];
    const lines = text.split('\n').filter(l => l.trim());

    let currentSuggestion = null;

    lines.forEach(line => {
      const trimmed = line.trim();

      if (trimmed.toLowerCase().startsWith('title:') || trimmed.match(/^\d+\.\s/)) {
        if (currentSuggestion) {
          suggestions.push(currentSuggestion);
        }
        const title = trimmed.replace(/^title:\s*/i, '').replace(/^\d+\.\s*/, '');
        currentSuggestion = { title, description: '', keyPoints: [], targetKeywords: [] };
      } else if (currentSuggestion) {
        if (trimmed.toLowerCase().startsWith('description:')) {
          currentSuggestion.description = trimmed.replace(/^description:\s*/i, '');
        } else if (trimmed.startsWith('-')) {
          currentSuggestion.keyPoints = currentSuggestion.keyPoints || [];
          currentSuggestion.keyPoints.push(trimmed.replace(/^-\s*/, ''));
        }
      }
    });

    if (currentSuggestion) {
      suggestions.push(currentSuggestion);
    }

    return suggestions.length > 0 ? suggestions : this._getFallbackTopicSuggestions([], [], 5);
  },

  /**
   * Get fallback topic suggestions
   */
  _getFallbackTopicSuggestions(contentGaps, trendingThemes, count) {
    const fallbackTopics = [
      {
        title: '10 AI Writing Tools That Will Transform Your Romance Fiction',
        description: 'Explore the top AI-powered tools that can help you craft compelling romance narratives, from character development to plot generation.',
        keyPoints: [
          'Character AI generators for consistent protagonists',
          'Plot structure assistants for romance arcs',
          'Dialogue enhancement tools',
          'Scene setting and mood creators'
        ],
        targetKeywords: ['AI writing tools', 'romance fiction', 'character development', 'writing software'],
        suggestedFormat: 'listicle'
      },
      {
        title: 'The Psychology of Romantic Tension: What Makes Readers Fall in Love',
        description: 'Deep dive into the psychological triggers that create romantic tension and keep readers turning pages late into the night.',
        keyPoints: [
          'The slow burn vs instant attraction dynamic',
          'Creating believable obstacles to love',
          'Body language and non-verbal cues',
          'Internal monologue techniques'
        ],
        targetKeywords: ['romantic tension', 'writing romance', 'character chemistry', 'fiction techniques'],
        suggestedFormat: 'how-to guide'
      },
      {
        title: 'Interactive Storytelling: How to Create Choose-Your-Own Romance Adventures',
        description: 'Learn the techniques behind branching narratives and how to apply them to create engaging interactive romance stories.',
        keyPoints: [
          'Branching plot structures',
          'Maintaining character consistency across paths',
          'Meaningful choices that impact the story',
          'Tools for interactive fiction development'
        ],
        targetKeywords: ['interactive fiction', 'branching narratives', 'game writing', 'storytelling techniques'],
        suggestedFormat: 'tutorial'
      },
      {
        title: 'From Outline to Draft: A 30-Day Plan for Your First Romance Novel',
        description: 'A structured month-long guide to take your romance novel from concept to completed first draft.',
        keyPoints: [
          'Week 1: Character development and world-building',
          'Week 2: Detailed scene-by-scene outline',
          'Week 3: Writing the first half',
          'Week 4: Completing the draft and basic revisions'
        ],
        targetKeywords: ['write a novel', 'romance writing', 'fiction outline', 'writing schedule'],
        suggestedFormat: 'how-to guide'
      },
      {
        title: 'Spicy vs Sweet: Navigating Heat Levels in Romance Fiction',
        description: 'Understanding different heat levels in romance and how to write authentic love scenes at any comfort level.',
        keyPoints: [
          'Defining heat levels in romance',
          'Writing fade-to-black scenes',
          'Crafting meaningful intimate moments',
          'Reader expectations by subgenre'
        ],
        targetKeywords: ['romance heat levels', 'writing love scenes', 'romance tropes', 'fiction genres'],
        suggestedFormat: 'listicle'
      }
    ];

    return fallbackTopics.slice(0, count);
  },

  /**
   * Calculate trend alignment score
   */
  _calculateTrendAlignment(suggestion, trendingThemes) {
    const suggestionText = `${suggestion.title} ${suggestion.description}`.toLowerCase();
    const alignmentScore = trendingThemes.reduce((score, theme) => {
      if (suggestionText.includes(theme.theme.toLowerCase())) {
        return score + (theme.frequency || 1);
      }
      return score;
    }, 0);

    return Math.min(alignmentScore / 10, 1);
  },

  /**
   * Calculate gap score
   */
  _calculateGapScore(suggestion, contentGaps) {
    const suggestionText = `${suggestion.title} ${suggestion.description}`.toLowerCase();
    const gapScore = contentGaps.reduce((score, gap) => {
      if (suggestionText.includes(gap.theme.toLowerCase())) {
        return score + (gap.priorityScore || 5);
      }
      return score;
    }, 0);

    return Math.min(gapScore / 15, 1);
  },

  /**
   * Suggest content formats
   */
  _suggestContentFormats(suggestion, contentType) {
    const formats = ['blog-post', 'article', 'guide'];

    if (suggestion.title.includes('Tips') || suggestion.title.includes('Ways')) {
      formats.push('listicle');
    }
    if (suggestion.title.includes('How to') || suggestion.title.includes('Guide')) {
      formats.push('how-to');
    }
    if (suggestion.title.includes('Story') || suggestion.title.includes('Case')) {
      formats.push('case-study');
    }

    return formats;
  },

  /**
   * Extract related keywords
   */
  _extractRelatedKeywords(suggestion) {
    const text = `${suggestion.title} ${suggestion.description || ''}`;
    const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];

    // Remove common words and return unique
    const stopWords = ['this', 'that', 'with', 'from', 'have', 'they', 'will', 'your', 'about'];
    const keywords = words.filter(w => !stopWords.includes(w));

    return [...new Set(keywords)].slice(0, 8);
  },

  /**
   * Estimate content difficulty
   */
  _estimateDifficulty(suggestion) {
    let difficulty = 0.5;

    const title = suggestion.title.toLowerCase();

    if (title.includes('beginner') || title.includes('intro') || title.includes('basic')) {
      difficulty = 0.2;
    } else if (title.includes('advanced') || title.includes('master') || title.includes('expert')) {
      difficulty = 0.8;
    } else if (title.includes('complete') || title.includes('comprehensive')) {
      difficulty = 0.7;
    } else if (title.includes('quick') || title.includes('simple') || title.includes('easy')) {
      difficulty = 0.3;
    }

    return difficulty;
  },

  /**
   * Estimate SEO potential
   */
  _estimateSEOPotential(suggestion) {
    let potential = 0.5;

    const title = suggestion.title.toLowerCase();

    if (title.match(/^\d+/)) {
      potential += 0.2; // Listicles do well
    }
    if (title.includes('how to') || title.includes('guide') || title.includes('tutorial')) {
      potential += 0.3; // How-to content has high search volume
    }
    if (title.includes('best') || title.includes('top') || title.includes('ultimate')) {
      potential += 0.15;
    }

    return Math.min(potential, 1);
  },

  /**
   * Assign priority tier
   */
  _assignPriority(opportunityScore) {
    if (opportunityScore >= 0.7) return 'high';
    if (opportunityScore >= 0.5) return 'medium';
    return 'low';
  },

  /**
   * Estimate impact
   */
  _estimateImpact(suggestion, opportunityScore) {
    const impacts = {
      high: opportunityScore > 0.8 ? 'viral-potential' : 'high-engagement',
      medium: opportunityScore > 0.6 ? 'moderate-reach' : 'steady-traffic',
      low: 'niche-audience'
    };

    return impacts[suggestion.priority] || 'moderate';
  },

  /**
   * Extract keywords from data
   */
  _extractKeywords(data) {
    const keywords = [];

    data.forEach(item => {
      if (item.keyword) {
        keywords.push({ keyword: item.keyword, frequency: item.value || item.frequency || 1 });
      } else if (item.theme) {
        keywords.push({ keyword: item.theme, frequency: item.frequency || 1 });
      } else if (item.source) {
        keywords.push({ keyword: item.source, frequency: 1 });
      }
    });

    return keywords;
  },

  /**
   * Categorize theme
   */
  _categorizeTheme(theme) {
    const themeLower = theme.toLowerCase();

    if (themeLower.includes('ai') || themeLower.includes('tool') || themeLower.includes('software')) {
      return 'technology';
    }
    if (themeLower.includes('romance') || themeLower.includes('love') || themeLower.includes('relationship')) {
      return 'romance';
    }
    if (themeLower.includes('writing') || themeLower.includes('author') || themeLower.includes('publish')) {
      return 'writing-craft';
    }
    if (themeLower.includes('character') || themeLower.includes('plot') || themeLower.includes('dialogue')) {
      return 'storytelling';
    }

    return 'general';
  },

  /**
   * Mock social trends for development
   */
  _getMockSocialTrends(categories) {
    return [
      { keyword: 'AI writing assistants', value: 85, category: 'technology' },
      { keyword: 'romance tropes', value: 72, category: 'romance' },
      { keyword: 'interactive fiction', value: 68, category: 'technology' },
      { keyword: 'character development', value: 65, category: 'storytelling' },
      { keyword: 'spicy romance', value: 61, category: 'romance' },
      { keyword: 'self-publishing', value: 58, category: 'writing-craft' },
      { keyword: 'plot structure', value: 55, category: 'storytelling' },
      { keyword: 'dialogue tips', value: 52, category: 'writing-craft' }
    ];
  },

  /**
   * Mock competitor trends
   */
  _getMockCompetitorTrends(categories) {
    return [
      { keyword: 'writing craft', value: 45, category: 'writing-craft' },
      { keyword: 'genre fiction', value: 42, category: 'romance' },
      { keyword: 'story structure', value: 38, category: 'storytelling' },
      { keyword: 'creative writing', value: 35, category: 'writing-craft' }
    ];
  },

  /**
   * Mock industry news
   */
  _getMockIndustryNews(categories) {
    return [
      { keyword: 'AI in publishing', value: 50, category: 'technology' },
      { keyword: 'audiobook growth', value: 47, category: 'general' },
      { keyword: 'romance market trends', value: 44, category: 'romance' }
    ];
  }
};

export default trendingTopicService;
