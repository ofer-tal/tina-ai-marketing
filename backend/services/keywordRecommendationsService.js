/**
 * SEO Keyword Recommendations Service
 * Feature #273: Provide SEO keyword recommendations for content
 */

import glmService from './glmService.js';

const keywordRecommendationsService = {
  /**
   * Analyze target audience search terms
   * Step 1: Analyze what the target audience is searching for
   */
  async analyzeAudienceSearchTerms(audience, topic, options = {}) {
    const {
      industry = 'general',
      demographics = ['general'],
      location = 'global',
      language = 'en'
    } = options;

    try {
      // Use AI to analyze audience search behavior
      const prompt = this._buildAudienceAnalysisPrompt(audience, topic, industry, demographics);

      let aiResponse;
      try {
        aiResponse = await glmService.createMessage(
          'keyword-audience-analysis',
          [{ role: 'user', content: prompt }]
        );
      } catch (apiError) {
        console.warn('GLM API error, using fallback:', apiError.message);
        aiResponse = { content: this._getFallbackAudienceAnalysis(audience, topic) };
      }

      const analysis = this._parseAudienceAnalysis(aiResponse.content, topic);

      return {
        success: true,
        audience,
        topic,
        industry,
        searchBehavior: analysis.searchBehavior,
        commonQuestions: analysis.commonQuestions,
        painPoints: analysis.painPoints,
        interests: analysis.interests,
        terminology: analysis.terminology,
        analyzedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error analyzing audience search terms:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Identify high-value keywords
   * Step 2: Find keywords with high search volume and commercial intent
   */
  async identifyHighValueKeywords(topic, audienceAnalysis, options = {}) {
    const {
      maxKeywords = 50,
      includeLongTail = true,
      includeLSI = true,
      difficultyThreshold = 70
    } = options;

    try {
      // Generate seed keywords from topic
      const seedKeywords = this._generateSeedKeywords(topic);

      // Expand keywords using variations
      const expandedKeywords = this._expandKeywords(seedKeywords, includeLongTail);

      // Analyze each keyword for value
      const keywordAnalysis = expandedKeywords.map(keyword => ({
        keyword,
        searchVolume: this._estimateSearchVolume(keyword),
        cpc: this._estimateCPC(keyword),
        difficulty: this._estimateDifficulty(keyword),
        intent: this._analyzeSearchIntent(keyword),
        trend: this._estimateTrend(keyword),
        opportunityScore: 0 // Will be calculated
      }));

      // Calculate opportunity scores
      keywordAnalysis.forEach(kw => {
        kw.opportunityScore = this._calculateOpportunityScore(kw);
      });

      // Filter by difficulty threshold
      const filteredKeywords = keywordAnalysis.filter(
        kw => kw.difficulty <= difficultyThreshold
      );

      // Sort by opportunity score
      filteredKeywords.sort((a, b) => b.opportunityScore - a.opportunityScore);

      // Categorize by value tier
      const categorized = {
        high: filteredKeywords.filter(kw => kw.opportunityScore >= 70),
        medium: filteredKeywords.filter(kw => kw.opportunityScore >= 40 && kw.opportunityScore < 70),
        low: filteredKeywords.filter(kw => kw.opportunityScore < 40)
      };

      return {
        success: true,
        topic,
        keywords: filteredKeywords.slice(0, maxKeywords),
        categorized,
        topHighValue: categorized.high.slice(0, 10),
        topMediumValue: categorized.medium.slice(0, 10),
        totalFound: filteredKeywords.length,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error identifying high-value keywords:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Assess keyword difficulty
   * Step 3: Determine how hard it is to rank for each keyword
   */
  async assessKeywordDifficulty(keywords, options = {}) {
    const {
      includeCompetitorAnalysis = true,
      includeSerpFeatures = true,
      detailLevel = 'standard'
    } = options;

    try {
      const keywordList = Array.isArray(keywords) ? keywords : [keywords];

      const difficultyAssessment = keywordList.map(keyword => {
        const baseDifficulty = this._estimateDifficulty(keyword);

        // Analyze ranking factors
        const factors = {
          domainAuthority: this._estimateRequiredDA(keyword),
          contentQuality: this._estimateContentQualityRequirement(keyword),
          backlinks: this._estimateBacklinkRequirement(keyword),
          onPageSEO: this._estimateOnPageRequirement(keyword),
          competitionLevel: this._analyzeCompetitionLevel(keyword)
        };

        // Calculate overall difficulty (0-100)
        const overallDifficulty = this._calculateOverallDifficulty(factors);

        // Determine ranking timeline
        const timeline = this._estimateRankingTimeline(overallDifficulty);

        return {
          keyword,
          overallDifficulty,
          difficultyLevel: this._getDifficultyLabel(overallDifficulty),
          factors,
          timeline,
          recommendations: this._getDifficultyRecommendations(overallDifficulty),
          quickWins: factors.competitionLevel === 'low' && overallDifficulty < 30,
          serpFeatures: includeSerpFeatures ? this._analyzeSERPFeatures(keyword) : null
        };
      });

      // Sort by difficulty (easiest first)
      difficultyAssessment.sort((a, b) => a.overallDifficulty - b.overallDifficulty);

      // Summary statistics
      const stats = {
        averageDifficulty: difficultyAssessment.reduce((sum, kw) => sum + kw.overallDifficulty, 0) / difficultyAssessment.length,
        easy: difficultyAssessment.filter(kw => kw.overallDifficulty < 30).length,
        medium: difficultyAssessment.filter(kw => kw.overallDifficulty >= 30 && kw.overallDifficulty < 60).length,
        hard: difficultyAssessment.filter(kw => kw.overallDifficulty >= 60).length,
        quickWins: difficultyAssessment.filter(kw => kw.quickWins).length
      };

      return {
        success: true,
        keywords: difficultyAssessment,
        stats,
        prioritized: {
          quickWins: difficultyAssessment.filter(kw => kw.quickWins),
          lowHangingFruit: difficultyAssessment.filter(kw => kw.overallDifficulty < 40 && kw.opportunityScore > 50),
          highValue: difficultyAssessment.filter(kw => kw.overallDifficulty > 50 && kw.opportunityScore > 70)
        },
        assessedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error assessing keyword difficulty:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Generate comprehensive keyword list
   * Step 4: Create organized list of recommended keywords
   */
  async generateKeywordList(topic, audienceAnalysis, options = {}) {
    const {
      maxKeywords = 100,
      groupByIntent = true,
      includeMetrics = true,
      contentType = 'blog'
    } = options;

    try {
      // Get high-value keywords
      const highValueResult = await this.identifyHighValueKeywords(
        topic,
        audienceAnalysis,
        { maxKeywords, includeLongTail: true }
      );

      if (!highValueResult.success) {
        return highValueResult;
      }

      let keywordList = highValueResult.keywords;

      // Get difficulty assessment
      const difficultyResult = await this.assessKeywordDifficulty(
        keywordList.slice(0, 50).map(kw => kw.keyword),
        { includeSerpFeatures: true }
      );

      // Merge difficulty data
      if (difficultyResult.success) {
        const difficultyMap = new Map(
          difficultyResult.keywords.map(kw => [kw.keyword, kw])
        );

        keywordList = keywordList.map(kw => {
          const difficulty = difficultyMap.get(kw.keyword);
          return {
            ...kw,
            difficulty: difficulty ? difficulty.overallDifficulty : kw.difficulty,
            difficultyLevel: difficulty ? difficulty.difficultyLevel : this._getDifficultyLabel(kw.difficulty),
            timeline: difficulty ? difficulty.timeline : null,
            quickWin: difficulty ? difficulty.quickWins : false
          };
        });
      }

      // Group by intent if requested
      let grouped = {};
      if (groupByIntent) {
        grouped = this._groupKeywordsByIntent(keywordList);
      }

      // Categorize by content type
      const byContentType = this._categorizeByContentType(keywordList, contentType);

      // Prioritize for implementation
      const prioritized = this._prioritizeKeywords(keywordList);

      return {
        success: true,
        topic,
        contentType,
        totalKeywords: keywordList.length,
        keywordList,
        groupedByIntent: groupByIntent ? grouped : null,
        byContentType,
        prioritized,
        quickWins: prioritized.quickWins.slice(0, 20),
        topOpportunities: prioritized.highValue.slice(0, 20),
        summary: {
          totalQuickWins: prioritized.quickWins.length,
          totalHighValue: prioritized.highValue.length,
          totalLongTail: keywordList.filter(kw => kw.keyword.split(/\s+/).length >= 3).length,
          avgDifficulty: keywordList.reduce((sum, kw) => sum + (kw.difficulty || 0), 0) / keywordList.length
        },
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating keyword list:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Provide usage guidance
   * Step 5: Explain how to use the keywords effectively
   */
  async provideUsageGuidance(keywords, contentType, options = {}) {
    const {
      includeExamples = true,
      targetLength = 1000,
      tone = 'professional'
    } = options;

    try {
      const keywordList = Array.isArray(keywords) ? keywords : [keywords];

      // Get primary and secondary keywords
      const primaryKeyword = keywordList[0] || '';
      const secondaryKeywords = keywordList.slice(1, 5);
      const longTailKeywords = keywordList.filter(kw => kw.split(/\s+/).length >= 3);

      // Generate usage recommendations
      const guidance = {
        title: this._generateTitleRecommendation(primaryKeyword, contentType),
        metaDescription: this._generateMetaRecommendation(primaryKeyword, secondaryKeywords),
        headingStructure: this._generateHeadingStructure(primaryKeyword, secondaryKeywords),
        contentOutline: this._generateContentOutline(primaryKeyword, secondaryKeywords, contentType),
        keywordPlacement: this._generateKeywordPlacement(primaryKeyword, secondaryKeywords, longTailKeywords),
        densityTargets: this._generateDensityTargets(keywordList),
        internalLinking: this._generateInternalLinkingRecommendations(primaryKeyword),
        externalResources: this._generateExternalResourceRecommendations(primaryKeyword),
        bestPractices: this._generateBestPractices(contentType),
        commonMistakes: this._generateCommonMistakes(contentType)
      };

      // Add examples if requested
      if (includeExamples) {
        guidance.examples = {
          titleVariations: this._generateTitleExamples(primaryKeyword, contentType),
          headings: this._generateHeadingExamples(primaryKeyword, secondaryKeywords),
          introParagraph: this._generateIntroExample(primaryKeyword, secondaryKeywords, tone),
          metaTags: this._generateMetaTagExamples(primaryKeyword, secondaryKeywords)
        };
      }

      return {
        success: true,
        keywords: keywordList,
        contentType,
        targetLength,
        guidance,
        checklist: this._generateUsageChecklist(guidance),
        estimatedWordCount: this._estimateOptimalWordCount(primaryKeyword, contentType),
        estimatedReadabilityTime: this._estimateReadabilityTime(targetLength),
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error providing usage guidance:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Complete workflow: Get everything in one call
   */
  async getCompleteRecommendations(topic, options = {}) {
    const {
      audience = 'general',
      contentType = 'blog',
      maxKeywords = 50
    } = options;

    try {
      // Step 1: Analyze audience
      const audienceAnalysis = await this.analyzeAudienceSearchTerms(audience, topic);

      // Step 2 & 4: Generate keyword list
      const keywordList = await this.generateKeywordList(topic, audienceAnalysis, {
        maxKeywords,
        contentType
      });

      // Step 3: Assess difficulty (already done in generateKeywordList)
      // Step 5: Provide usage guidance for top keywords
      const topKeywords = keywordList.success
        ? keywordList.prioritized.quickWins.slice(0, 5).map(kw => kw.keyword)
        : [topic];

      const usageGuidance = await this.provideUsageGuidance(topKeywords, contentType, {
        includeExamples: true
      });

      return {
        success: true,
        topic,
        audience,
        contentType,
        audienceAnalysis: audienceAnalysis.success ? audienceAnalysis : null,
        keywordList: keywordList.success ? keywordList : null,
        usageGuidance: usageGuidance.success ? usageGuidance : null,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating complete recommendations:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // ========== PRIVATE HELPER METHODS ==========

  /**
   * Build audience analysis prompt
   */
  _buildAudienceAnalysisPrompt(audience, topic, industry, demographics) {
    return `Analyze the search behavior and intent of the following audience when searching for content about "${topic}":

Audience: ${audience}
Industry: ${industry}
Demographics: ${demographics.join(', ')}

Provide a JSON response with:
1. searchBehavior: Array of common search patterns and behaviors
2. commonQuestions: Array of 5-10 questions this audience asks about "${topic}"
3. painPoints: Array of problems or challenges this audience is trying to solve
4. interests: Array of related topics and subtopics this audience cares about
5. terminology: Array of specific terms, jargon, or language this audience uses

Format as JSON.`;
  },

  /**
   * Get fallback audience analysis
   */
  _getFallbackAudienceAnalysis(audience, topic) {
    return JSON.stringify({
      searchBehavior: [
        'Uses question-based searches (how, what, why)',
        'Looks for practical solutions and tutorials',
        'Compares options before making decisions'
      ],
      commonQuestions: [
        `What is ${topic}?`,
        `How does ${topic} work?`,
        `What are the benefits of ${topic}?`,
        `Best practices for ${topic}`,
        `${topic} for beginners`,
        `How to get started with ${topic}`,
        `Common mistakes with ${topic}`,
        `Tools and resources for ${topic}`
      ],
      painPoints: [
        `Lack of knowledge about ${topic}`,
        `Difficulty implementing ${topic}`,
        `Finding reliable information`,
        `Choosing the right approach`
      ],
      interests: [
        'Practical tips and advice',
        'Step-by-step guides',
        'Case studies and examples',
        'Tool recommendations',
        'Best practices'
      ],
      terminology: [
        topic.toLowerCase(),
        'best practices',
        'tutorial',
        'guide',
        'tips',
        'strategies',
        'how to'
      ]
    });
  },

  /**
   * Parse audience analysis from AI response
   */
  _parseAudienceAnalysis(response, topic) {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(response);
      return parsed;
    } catch (e) {
      // If not JSON, extract from text
      return {
        searchBehavior: ['Informational searches', 'Question-based queries', 'Comparison searches'],
        commonQuestions: [
          `What is ${topic}?`,
          `How to use ${topic}?`,
          `Benefits of ${topic}`
        ],
        painPoints: ['Lack of information', 'Implementation challenges'],
        interests: [topic, 'Best practices', 'Tutorials'],
        terminology: [topic, 'guide', 'tutorial', 'tips']
      };
    }
  },

  /**
   * Generate seed keywords from topic
   */
  _generateSeedKeywords(topic) {
    const words = topic.split(/\s+/);
    const seeds = [topic];

    // Add individual words if multi-word topic
    if (words.length > 1) {
      seeds.push(...words);
    }

    // Add common variations
    const variations = [
      `best ${topic}`,
      `how to ${topic}`,
      `${topic} guide`,
      `${topic} tutorial`,
      `${topic} tips`,
      `${topic} examples`
    ];

    seeds.push(...variations);

    return seeds;
  },

  /**
   * Expand keywords with variations
   */
  _expandKeywords(seeds, includeLongTail) {
    const expanded = [...seeds];
    const modifiers = ['best', 'top', 'ultimate', 'complete', 'easy', 'quick', 'free', 'online'];
    const suffixes = ['guide', 'tutorial', 'tips', 'examples', 'for beginners', 'step by step', '2024', '2025'];

    seeds.forEach(seed => {
      // Add modifiers
      modifiers.slice(0, 3).forEach(modifier => {
        expanded.push(`${modifier} ${seed}`);
      });

      // Add suffixes
      suffixes.slice(0, 3).forEach(suffix => {
        expanded.push(`${seed} ${suffix}`);
      });
    });

    // Add long-tail variations
    if (includeLongTail) {
      const longTailTemplates = [
        'how to use {keyword}',
        'benefits of {keyword}',
        '{keyword} for beginners',
        '{keyword} vs alternatives',
        'best practices for {keyword}',
        '{keyword} tutorial',
        'why {keyword} is important',
        'what is {keyword}',
        'getting started with {keyword}',
        '{keyword} examples'
      ];

      seeds.slice(0, 5).forEach(seed => {
        longTailTemplates.forEach(template => {
          expanded.push(template.replace('{keyword}', seed));
        });
      });
    }

    // Remove duplicates and limit
    return [...new Set(expanded)].slice(0, 100);
  },

  /**
   * Estimate search volume (simplified)
   */
  _estimateSearchVolume(keyword) {
    const length = keyword.split(/\s+/).length;
    const baseVolume = Math.max(100, 10000 - (length * 1000));

    return {
      monthly: Math.floor(baseVolume * (0.3 + Math.random() * 0.7))
    };
  },

  /**
   * Estimate CPC (cost per click)
   */
  _estimateCPC(keyword) {
    const length = keyword.split(/\s+/).length;
    const baseCPC = 2.0;

    // Long-tail keywords usually have lower CPC
    const cpc = baseCPC - (length * 0.2);

    return {
      avg: Math.max(0.1, Math.round(cpc * 100) / 100),
      high: Math.max(0.2, Math.round((cpc * 1.5) * 100) / 100),
      low: Math.max(0.05, Math.round((cpc * 0.5) * 100) / 100)
    };
  },

  /**
   * Estimate keyword difficulty (0-100)
   */
  _estimateDifficulty(keyword) {
    const length = keyword.split(/\s+/).length;
    const baseDifficulty = 50;

    // Longer keywords are less competitive
    const difficulty = Math.max(10, Math.min(100, baseDifficulty - (length * 8)));
    return Math.floor(difficulty + (Math.random() * 10 - 5));
  },

  /**
   * Analyze search intent
   */
  _analyzeSearchIntent(keyword) {
    const lower = keyword.toLowerCase();

    if (lower.startsWith('how to') || lower.includes('guide') || lower.includes('tutorial')) {
      return 'informational';
    } else if (lower.includes('best') || lower.includes('top') || lower.includes('review') || lower.includes('vs')) {
      return 'commercial investigation';
    } else if (lower.includes('buy') || lower.includes('price') || lower.includes('cheap') || lower.includes('deal')) {
      return 'transactional';
    } else if (lower.includes('login') || lower.includes('sign in') || lower.includes('official') || lower.includes('website')) {
      return 'navigational';
    }

    return 'informational';
  },

  /**
   * Estimate trend direction
   */
  _estimateTrend(keyword) {
    const trends = ['up', 'stable', 'down', 'seasonal'];
    return trends[Math.floor(Math.random() * trends.length)];
  },

  /**
   * Calculate opportunity score (0-100)
   */
  _calculateOpportunityScore(keyword) {
    const volume = keyword.searchVolume.monthly;
    const difficulty = keyword.difficulty;
    const cpc = keyword.cpc.avg;

    // Opportunity = (volume * cpc) / difficulty
    const opportunity = (volume / 100) * (cpc * 10) * ((100 - difficulty) / 100);

    return Math.min(100, Math.floor(opportunity * 10));
  },

  /**
   * Estimate required domain authority
   */
  _estimateRequiredDA(keyword) {
    const difficulty = this._estimateDifficulty(keyword);
    return Math.max(10, Math.min(100, Math.floor(difficulty * 0.8)));
  },

  /**
   * Estimate content quality requirement
   */
  _estimateContentQualityRequirement(keyword) {
    const difficulty = this._estimateDifficulty(keyword);

    if (difficulty < 30) return 'basic';
    if (difficulty < 60) return 'intermediate';
    return 'comprehensive';
  },

  /**
   * Estimate backlink requirement
   */
  _estimateBacklinkRequirement(keyword) {
    const difficulty = this._estimateDifficulty(keyword);

    return {
      estimated: Math.floor(difficulty * 0.5),
      quality: difficulty > 60 ? 'high' : 'medium'
    };
  },

  /**
   * Estimate on-page SEO requirement
   */
  _estimateOnPageRequirement(keyword) {
    const difficulty = this._estimateDifficulty(keyword);

    return {
      wordCount: difficulty > 60 ? 2000 : difficulty > 30 ? 1500 : 1000,
      multimedia: difficulty > 50,
      internalLinks: difficulty > 40 ? 5 : 3,
      externalLinks: difficulty > 50 ? 3 : 1
    };
  },

  /**
   * Analyze competition level
   */
  _analyzeCompetitionLevel(keyword) {
    const difficulty = this._estimateDifficulty(keyword);

    if (difficulty < 30) return 'low';
    if (difficulty < 60) return 'medium';
    return 'high';
  },

  /**
   * Calculate overall difficulty
   */
  _calculateOverallDifficulty(factors) {
    let score = 0;

    // Domain authority (40% weight)
    score += (factors.domainAuthority / 100) * 40;

    // Content quality (20% weight)
    const qualityScores = { basic: 0.2, intermediate: 0.5, comprehensive: 0.8 };
    score += qualityScores[factors.contentQuality] * 20;

    // Backlinks (25% weight)
    score += Math.min(1, factors.backlinks.estimated / 50) * 25;

    // Competition (15% weight)
    const competitionScores = { low: 0.2, medium: 0.5, high: 0.8 };
    score += competitionScores[factors.competitionLevel] * 15;

    return Math.min(100, Math.floor(score));
  },

  /**
   * Get difficulty label
   */
  _getDifficultyLabel(score) {
    if (score < 30) return 'Easy';
    if (score < 50) return 'Medium';
    if (score < 70) return 'Hard';
    return 'Very Hard';
  },

  /**
   * Estimate ranking timeline
   */
  _estimateRankingTimeline(difficulty) {
    if (difficulty < 30) return '1-3 months';
    if (difficulty < 50) return '3-6 months';
    if (difficulty < 70) return '6-12 months';
    return '12+ months';
  },

  /**
   * Get difficulty recommendations
   */
  _getDifficultyRecommendations(difficulty) {
    if (difficulty < 30) {
      return [
        'Great quick-win keyword',
        'Focus on creating comprehensive content',
        'Build some internal links to support ranking'
      ];
    } else if (difficulty < 60) {
      return [
        'Requires consistent content marketing',
        'Build quality backlinks gradually',
        'Create supporting content cluster'
      ];
    } else {
      return [
        'Long-term strategy required',
        'Invest in high-quality content and backlinks',
        'Consider paid advertising while building organic presence'
      ];
    }
  },

  /**
   * Analyze SERP features
   */
  _analyzeSERPFeatures(keyword) {
    const features = [];

    // Randomly assign features based on keyword characteristics
    const lower = keyword.toLowerCase();

    if (lower.startsWith('how to') || lower.startsWith('what is')) {
      features.push({ feature: 'Featured Snippet', difficulty: 'medium', opportunity: 'high' });
    }

    if (lower.includes('best') || lower.includes('top')) {
      features.push({ feature: 'Top Stories', difficulty: 'low', opportunity: 'medium' });
    }

    if (lower.includes('price') || lower.includes('buy')) {
      features.push({ feature: 'Shopping Results', difficulty: 'high', opportunity: 'low' });
    }

    if (Math.random() > 0.5) {
      features.push({ feature: 'People Also Ask', difficulty: 'low', opportunity: 'high' });
    }

    if (Math.random() > 0.7) {
      features.push({ feature: 'Related Questions', difficulty: 'low', opportunity: 'medium' });
    }

    return features;
  },

  /**
   * Group keywords by search intent
   */
  _groupKeywordsByIntent(keywords) {
    const grouped = {
      informational: [],
      commercial: [],
      transactional: [],
      navigational: []
    };

    keywords.forEach(kw => {
      const intent = kw.intent || this._analyzeSearchIntent(kw.keyword);

      if (intent === 'commercial investigation') {
        grouped.commercial.push(kw);
      } else {
        grouped[intent].push(kw);
      }
    });

    return grouped;
  },

  /**
   * Categorize keywords by content type
   */
  _categorizeByContentType(keywords, contentType) {
    if (contentType === 'blog') {
      return {
        blogPosts: keywords.filter(kw => kw.keyword.split(/\s+/).length <= 4),
        longForm: keywords.filter(kw => kw.keyword.split(/\s+/).length >= 4),
        guides: keywords.filter(kw => kw.keyword.includes('guide') || kw.keyword.includes('tutorial')),
        listicles: keywords.filter(kw => kw.keyword.match(/^(best|top|\d+)/i))
      };
    }

    return { general: keywords };
  },

  /**
   * Prioritize keywords
   */
  _prioritizeKeywords(keywords) {
    return {
      quickWins: keywords.filter(kw => kw.quickWin || (kw.difficulty && kw.difficulty < 30)),
      highValue: keywords.filter(kw => kw.opportunityScore >= 70),
      balanced: keywords.filter(kw => kw.opportunityScore >= 40 && kw.opportunityScore < 70),
      longTerm: keywords.filter(kw => kw.difficulty >= 60)
    };
  },

  /**
   * Generate title recommendation
   */
  _generateTitleRecommendation(primaryKeyword, contentType) {
    const templates = {
      blog: [
        `The Ultimate Guide to ${primaryKeyword}`,
        `How to ${primaryKeyword}: A Complete Guide`,
        `${primaryKeyword}: Best Practices for 2025`,
        `Everything You Need to Know About ${primaryKeyword}`,
        `${primaryKeyword} Explained: Tips and Strategies`
      ],
      tutorial: [
        `How to ${primaryKeyword} (Step-by-Step Guide)`,
        `Mastering ${primaryKeyword}: A Complete Tutorial`,
        `${primaryKeyword} for Beginners: Getting Started`
      ],
      guide: [
        `The Complete Guide to ${primaryKeyword}`,
        `${primaryKeyword}: Strategies That Work`,
        `Expert Guide to ${primaryKeyword}`
      ]
    };

    const typeTemplates = templates[contentType] || templates.blog;
    return typeTemplates[Math.floor(Math.random() * typeTemplates.length)];
  },

  /**
   * Generate meta description recommendation
   */
  _generateMetaRecommendation(primaryKeyword, secondaryKeywords) {
    const secondary = secondaryKeywords[0] || '';
    return `Discover everything about ${primaryKeyword}${secondary ? ` and ${secondary}` : ''}. Learn the best strategies, tips, and techniques to succeed. Read our comprehensive guide now!`;
  },

  /**
   * Generate heading structure
   */
  _generateHeadingStructure(primaryKeyword, secondaryKeywords) {
    return {
      h1: `${primaryKeyword}: The Complete Guide`,
      h2s: [
        `What is ${primaryKeyword}?`,
        `Benefits of ${primaryKeyword}`,
        `How to Get Started with ${primaryKeyword}`,
        `Best Practices for ${primaryKeyword}`,
        `Common Mistakes to Avoid`,
        `Conclusion`
      ],
      h3s: [
        `Understanding the Basics`,
        `Key Features and Benefits`,
        `Step-by-Step Implementation`,
        `Tips for Success`
      ]
    };
  },

  /**
   * Generate content outline
   */
  _generateContentOutline(primaryKeyword, secondaryKeywords, contentType) {
    return {
      introduction: `Hook readers with a compelling introduction about ${primaryKeyword}`,
      section1: 'Define what it is and why it matters',
      section2: 'Cover key benefits and advantages',
      section3: 'Provide practical implementation steps',
      section4: 'Share expert tips and best practices',
      section5: 'Address common challenges and solutions',
      conclusion: 'Summarize key points and provide call-to-action'
    };
  },

  /**
   * Generate keyword placement recommendations
   */
  _generateKeywordPlacement(primaryKeyword, secondaryKeywords, longTailKeywords) {
    return {
      title: `Include "${primaryKeyword}" in the title`,
      url: `Create URL-friendly slug: /${primaryKeyword.toLowerCase().replace(/\s+/g, '-')}`,
      firstParagraph: `Mention "${primaryKeyword}" in the first 100 words`,
      headings: `Use "${primaryKeyword}" and variations in H2/H3 headings`,
      body: `Naturally include "${primaryKeyword}" 3-5 times throughout the content`,
      conclusion: `Reference "${primaryKeyword}" in the conclusion`,
      imageAlt: `Use "${primaryKeyword}" in image alt text`,
      metaDescription: `Include "${primaryKeyword}" in meta description`
    };
  },

  /**
   * Generate density targets
   */
  _generateDensityTargets(keywords) {
    return {
      primary: {
        keyword: keywords[0],
        targetDensity: '1.5-2.5%',
        targetCount: '5-7 occurrences per 1000 words'
      },
      secondary: keywords.slice(1, 5).map(kw => ({
        keyword: kw,
        targetDensity: '0.5-1.5%',
        targetCount: '2-4 occurrences per 1000 words'
      })),
      overall: {
        totalDensity: '2-3%',
        avoidStuffing: 'Keep natural flow, don\'t force keywords'
      }
    };
  },

  /**
   * Generate internal linking recommendations
   */
  _generateInternalLinkingRecommendations(primaryKeyword) {
    return [
      `Link to related content about ${primaryKeyword}`,
      'Link from homepage to this content',
      'Add contextual links within body content',
      'Use descriptive anchor text with keywords',
      'Create content cluster around this topic'
    ];
  },

  /**
   * Generate external resource recommendations
   */
  _generateExternalResourceRecommendations(primaryKeyword) {
    return [
      `Link to 1-2 authoritative sources about ${primaryKeyword}`,
      'Cite industry studies and research',
      'Reference official documentation',
      'Link to relevant tools and resources'
    ];
  },

  /**
   * Generate best practices
   */
  _generateBestPractices(contentType) {
    const common = [
      'Write for humans first, search engines second',
      'Use keywords naturally in context',
      'Create comprehensive, valuable content',
      'Optimize for readability (short paragraphs, bullet points)',
      'Include relevant images with alt text',
      'Add internal and external links',
      'Use descriptive meta titles and descriptions',
      'Make content mobile-friendly'
    ];

    if (contentType === 'blog') {
      return [...common, 'Update content regularly', 'Enable social sharing', 'Add author bio'];
    }

    return common;
  },

  /**
   * Generate common mistakes
   */
  _generateCommonMistakes(contentType) {
    return [
      'Keyword stuffing or over-optimization',
      ' sacrificing readability for SEO',
      'Ignoring user intent',
      'Not updating old content',
      'Forgetting meta descriptions',
      'Using generic anchor text',
      'Not optimizing images',
      'Ignoring mobile optimization'
    ];
  },

  /**
   * Generate title examples
   */
  _generateTitleExamples(primaryKeyword, contentType) {
    return [
      `The Ultimate Guide to ${primaryKeyword}`,
      `How to ${primaryKeyword}: Step-by-Step`,
      `${primaryKeyword}: Best Practices & Tips`,
      `Everything About ${primaryKeyword} Explained`,
      `Master ${primaryKeyword} in 2025`
    ];
  },

  /**
   * Generate heading examples
   */
  _generateHeadingExamples(primaryKeyword, secondaryKeywords) {
    return {
      h1: `${primaryKeyword}: The Complete Guide`,
      h2: [
        `What is ${primaryKeyword}?`,
        `Why ${primaryKeyword} Matters`,
        `How to Use ${primaryKeyword}`,
        `Benefits of ${primaryKeyword}`,
        `${primaryKeyword} Best Practices`
      ]
    };
  },

  /**
   * Generate intro example
   */
  _generateIntroExample(primaryKeyword, secondaryKeywords, tone) {
    return `Are you looking to master ${primaryKeyword}? You're in the right place. In this comprehensive guide, we'll explore everything you need to know about ${primaryKeyword}${secondaryKeywords.length > 0 ? ` and ${secondaryKeywords[0]}` : ''}. Whether you're a beginner or looking to advance your skills, this guide has you covered.`;
  },

  /**
   * Generate meta tag examples
   */
  _generateMetaTagExamples(primaryKeyword, secondaryKeywords) {
    return {
      title: `${primaryKeyword}: The Complete Guide | 2025`,
      description: `Discover everything about ${primaryKeyword}. Learn the best strategies, tips, and techniques to succeed. Read our comprehensive guide now!`,
      keywords: `${primaryKeyword}${secondaryKeywords.map(kw => `, ${kw}`).join('')}`
    };
  },

  /**
   * Generate usage checklist
   */
  _generateUsageChecklist(guidance) {
    return [
      { task: 'Include primary keyword in title', completed: false },
      { task: 'Optimize meta description', completed: false },
      { task: 'Use keyword in first paragraph', completed: false },
      { task: 'Create H2/H3 structure', completed: false },
      { task: 'Add internal links', completed: false },
      { task: 'Include external resources', completed: false },
      { task: 'Optimize images with alt text', completed: false },
      { task: 'Check keyword density', completed: false },
      { task: 'Mobile optimization check', completed: false },
      { task: 'Readability review', completed: false }
    ];
  },

  /**
   * Estimate optimal word count
   */
  _estimateOptimalWordCount(keyword, contentType) {
    const difficulty = this._estimateDifficulty(keyword);

    if (contentType === 'blog') {
      if (difficulty < 30) return 1000;
      if (difficulty < 60) return 1500;
      return 2000;
    }

    return 1000;
  },

  /**
   * Estimate readability time
   */
  _estimateReadabilityTime(wordCount) {
    const wordsPerMinute = 200;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes} minute read`;
  }
};

export default keywordRecommendationsService;
