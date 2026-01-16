/**
 * SEO Content Suggestions Service
 * Generates SEO-optimized content suggestions with detailed analysis
 */

import glmService from './glmService.js';

const seoContentSuggestions = {
  /**
   * Analyze target keywords and provide insights
   * Step 1 of Feature #267
   */
  async analyzeKeywords(keywords, contentType = 'blog') {
    try {
      if (!keywords || keywords.length === 0) {
        return {
          success: false,
          error: 'At least one keyword is required'
        };
      }

      // Analyze each keyword for SEO potential
      const keywordAnalysis = keywords.map(keyword => ({
        keyword,
        searchVolume: this._estimateSearchVolume(keyword),
        difficulty: this._estimateDifficulty(keyword),
        opportunityScore: this._calculateOpportunityScore(keyword),
        suggestedVariations: this._generateKeywordVariations(keyword),
        longTailSuggestions: this._generateLongTailKeywords(keyword)
      }));

      // Find keyword gaps and opportunities
      const contentGapAnalysis = this._analyzeContentGaps(keywordAnalysis);

      return {
        success: true,
        keywords: keywordAnalysis,
        contentGaps: contentGapAnalysis,
        primaryKeyword: keywordAnalysis[0].keyword,
        secondaryKeywords: keywordAnalysis.slice(1).map(k => k.keyword),
        analyzedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error analyzing keywords:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Generate SEO-optimized content suggestions
   * Step 2 of Feature #267
   */
  async generateContentSuggestions(topic, keywords, options = {}) {
    const {
      contentType = 'blog',
      targetAudience = 'general',
      tone = 'professional',
      count = 5
    } = options;

    try {
      // Use AI to generate content suggestions
      const prompt = this._buildContentSuggestionsPrompt(
        topic,
        keywords,
        contentType,
        targetAudience,
        tone,
        count
      );

      let aiResponse;
      try {
        aiResponse = await glmService.createMessage(
          'seo-content-suggestions',
          [{ role: 'user', content: prompt }]
        );
      } catch (apiError) {
        console.warn('GLM API error, using fallback:', apiError.message);
        aiResponse = { content: this._getFallbackContentSuggestions(topic, keywords, count) };
      }

      // Parse AI response into structured suggestions
      const suggestions = this._parseContentSuggestions(
        aiResponse.content,
        topic,
        keywords,
        contentType
      );

      // Enhance each suggestion with SEO data
      const enhancedSuggestions = suggestions
        .filter(suggestion => suggestion && suggestion.title) // Filter out invalid suggestions
        .map(suggestion => ({
          ...suggestion,
          seoScore: this._calculateSEOScore(suggestion, keywords),
          keywordDensity: this._calculateKeywordDensity(suggestion.description || '', keywords),
          readabilityScore: this._calculateReadability(suggestion.description || ''),
          estimatedWordCount: suggestion.estimatedWords || this._estimateWordCount(suggestion.topics),
          searchIntent: suggestion.searchIntent || this._analyzeSearchIntent(suggestion.title),
          targetKeyword: keywords[0] || topic
        }));

      // Sort by SEO score
      enhancedSuggestions.sort((a, b) => b.seoScore - a.seoScore);

      return {
        success: true,
        suggestions: enhancedSuggestions,
        topic,
        contentType,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating content suggestions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Optimize content for SEO
   * Step 3 of Feature #267
   */
  async optimizeForSEO(content, keywords, options = {}) {
    const {
      targetDensity = 2.5, // Target keyword density percentage
      includeLSI = true,
      optimizeStructure = true
    } = options;

    try {
      const analysis = {
        current: {
          keywordDensity: this._calculateKeywordDensity(content, keywords),
          readabilityScore: this._calculateReadability(content),
          wordCount: content.split(/\s+/).length,
          headingCount: (content.match(/^#+\s/gm) || []).length,
          linkCount: (content.match(/\[.*?\]\(.*?\)/g) || []).length,
          imageCount: (content.match(/!\[.*?\]\(.*?\)/g) || []).length
        },
        recommendations: []
      };

      // Keyword density recommendations
      if (analysis.current.keywordDensity < targetDensity * 0.5) {
        analysis.recommendations.push({
          type: 'keyword_density',
          priority: 'high',
          message: `Keyword density is too low (${analysis.current.keywordDensity.toFixed(2)}%). Aim for ${targetDensity}%.`,
          suggestions: keywords.map(k => `Include "${k}" 3-5 more times naturally in the content`)
        });
      } else if (analysis.current.keywordDensity > targetDensity * 1.5) {
        analysis.recommendations.push({
          type: 'keyword_density',
          priority: 'medium',
          message: `Keyword density is too high (${analysis.current.keywordDensity.toFixed(2)}%). This may appear as keyword stuffing.`,
          suggestions: ['Reduce keyword usage to appear more natural']
        });
      }

      // Structure recommendations
      if (optimizeStructure) {
        if (analysis.current.headingCount < 3) {
          analysis.recommendations.push({
            type: 'structure',
            priority: 'high',
            message: 'Content needs more headings for better SEO and readability.',
            suggestions: [
              'Add H2 headings for main sections',
              'Include H3 headings for subsections',
              'Use keywords in some headings'
            ]
          });
        }

        if (analysis.current.linkCount === 0) {
          analysis.recommendations.push({
            type: 'structure',
            priority: 'medium',
            message: 'Content has no internal or external links.',
            suggestions: [
              'Add 2-3 internal links to related content',
              'Include 1-2 external links to authoritative sources'
            ]
          });
        }

        if (analysis.current.imageCount === 0 && contentType !== 'social') {
          analysis.recommendations.push({
            type: 'structure',
            priority: 'low',
            message: 'Content has no images.',
            suggestions: [
              'Add relevant images with alt text',
              'Include charts or infographics if applicable',
              'Use images to break up text'
            ]
          });
        }
      }

      // Readability recommendations
      if (analysis.current.readabilityScore < 30) {
        analysis.recommendations.push({
          type: 'readability',
          priority: 'medium',
          message: `Content is difficult to read (score: ${analysis.current.readabilityScore}/100).`,
          suggestions: [
            'Shorten sentences (aim for 15-20 words)',
            'Use simpler words where possible',
            'Break up long paragraphs',
            'Use bullet points and lists'
          ]
        });
      }

      // Generate LSI keyword suggestions
      let lsiKeywords = [];
      if (includeLSI) {
        lsiKeywords = this._generateLSIKeywords(content, keywords[0]);
      }

      // Generate optimized version
      const optimizedContent = this._applyOptimizations(
        content,
        keywords,
        analysis.recommendations
      );

      return {
        success: true,
        analysis,
        lsiKeywords,
        optimizedContent,
        overallScore: this._calculateOverallSEOScore(analysis, keywords),
        optimizedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error optimizing content:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Generate meta descriptions
   * Step 4 of Feature #267
   */
  async generateMetaDescriptions(content, keywords, options = {}) {
    const {
      count = 5,
      includeCallToAction = true,
      maxLength = 160
    } = options;

    try {
      const primaryKeyword = keywords[0] || '';
      const contentPreview = content.substring(0, 500);

      // Generate meta descriptions using AI
      const prompt = this._buildMetaDescriptionPrompt(
        contentPreview,
        keywords,
        count,
        includeCallToAction,
        maxLength
      );

      let aiResponse;
      try {
        aiResponse = await glmService.createMessage(
          'seo-meta-descriptions',
          [{ role: 'user', content: prompt }]
        );
      } catch (apiError) {
        console.warn('GLM API error, using fallback:', apiError.message);
        aiResponse = { content: this._getFallbackMetaDescriptions(contentPreview, keywords, count) };
      }

      // Parse and validate meta descriptions
      const descriptions = this._parseMetaDescriptions(
        aiResponse.content,
        maxLength
      ).map(desc => ({
        text: desc,
        length: desc.length,
        includesKeyword: keywords.some(kw =>
          desc.toLowerCase().includes(kw.toLowerCase())
        ),
        hasCallToAction: this._hasCallToAction(desc),
        characterCount: desc.length
      }));

      // Rank descriptions by SEO effectiveness
      const rankedDescriptions = descriptions.map(desc => ({
        ...desc,
        score: this._scoreMetaDescription(desc, keywords, includeCallToAction)
      })).sort((a, b) => b.score - a.score);

      return {
        success: true,
        descriptions: rankedDescriptions,
        bestMatch: rankedDescriptions[0],
        primaryKeyword,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating meta descriptions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Provide keyword density analysis
   * Step 5 of Feature #267
   */
  async analyzeKeywordDensity(content, keywords) {
    try {
      const words = content.toLowerCase().match(/\b[a-z]{2,}\b/g) || [];
      const totalWords = words.length;
      const keywordCounts = {};
      const keywordPositions = {};

      // Count each keyword
      keywords.forEach(keyword => {
        const keywordLower = keyword.toLowerCase();
        const regex = new RegExp(`\\b${keywordLower}\\b`, 'gi');
        const matches = content.match(regex) || [];
        keywordCounts[keyword] = matches.length;

        // Find positions of each keyword occurrence
        keywordPositions[keyword] = [];
        let match;
        const contentLower = content.toLowerCase();
        let pos = 0;
        while ((match = regex.exec(contentLower)) !== null) {
          // Calculate word position
          const beforeText = contentLower.substring(0, match.index);
          const wordPosition = beforeText.split(/\s+/).length;
          keywordPositions[keyword].push({
            position: wordPosition,
            context: this._getContext(content, match.index, 30)
          });
        }
      });

      // Calculate density percentages
      const densityAnalysis = keywords.map(keyword => ({
        keyword,
        count: keywordCounts[keyword] || 0,
        density: totalWords > 0 ? ((keywordCounts[keyword] || 0) / totalWords * 100) : 0,
        targetDensity: 2.5,
        status: this._getDensityStatus(
          totalWords > 0 ? ((keywordCounts[keyword] || 0) / totalWords * 100) : 0,
          2.5
        ),
        positions: keywordPositions[keyword]
      }));

      // Overall analysis
      const totalKeywordCount = Object.values(keywordCounts).reduce((sum, count) => sum + count, 0);
      const overallDensity = totalWords > 0 ? (totalKeywordCount / totalWords * 100) : 0;

      // Find top phrases (2-3 word combinations)
      const topPhrases = this._extractTopPhrases(content, 10);

      // Find keyword stuffing issues
      const stuffingAlerts = this._detectKeywordStuffing(keywordPositions, totalWords);

      return {
        success: true,
        densityAnalysis,
        overallDensity,
        totalWordCount: totalWords,
        topPhrases,
        stuffingAlerts,
        recommendations: this._generateDensityRecommendations(densityAnalysis),
        analyzedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error analyzing keyword density:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // ========== PRIVATE HELPER METHODS ==========

  /**
   * Estimate search volume for a keyword (simplified)
   */
  _estimateSearchVolume(keyword) {
    // This would typically call an SEO API
    // For now, use a heuristic based on keyword characteristics
    const length = keyword.split(/\s+/).length;
    const baseScore = Math.max(100, 10000 - (length * 1000));

    return {
      monthly: Math.floor(baseScore * (0.5 + Math.random())),
      trend: Math.random() > 0.5 ? 'up' : 'stable'
    };
  },

  /**
   * Estimate keyword difficulty (0-100)
   */
  _estimateDifficulty(keyword) {
    const length = keyword.split(/\s+/).length;
    const baseDifficulty = 50;

    // Longer keywords (long-tail) are usually less competitive
    const difficulty = Math.max(10, Math.min(100, baseDifficulty - (length * 10)));
    return Math.floor(difficulty);
  },

  /**
   * Calculate opportunity score (0-100)
   */
  _calculateOpportunityScore(keyword) {
    const volume = this._estimateSearchVolume(keyword);
    const difficulty = this._estimateDifficulty(keyword);

    // High volume + low difficulty = high opportunity
    const opportunity = (volume.monthly / 200) * ((100 - difficulty) / 100);
    return Math.min(100, Math.floor(opportunity));
  },

  /**
   * Generate keyword variations
   */
  _generateKeywordVariations(keyword) {
    const variations = [];
    const words = keyword.split(/\s+/);

    // Add modifiers
    const modifiers = ['best', 'top', 'how to', 'guide', 'tips', 'ultimate'];
    modifiers.forEach(modifier => {
      variations.push(`${modifier} ${keyword}`);
      variations.push(`${keyword} ${modifier}`);
    });

    // Rearrange words for multi-word keywords
    if (words.length > 1) {
      variations.push(words.reverse().join(' '));
    }

    return variations.slice(0, 5);
  },

  /**
   * Generate long-tail keyword suggestions
   */
  _generateLongTailKeywords(keyword) {
    const longTailSuggestions = [
      `how to use ${keyword}`,
      `benefits of ${keyword}`,
      `${keyword} for beginners`,
      `${keyword} vs alternatives`,
      `best practices for ${keyword}`,
      `${keyword} tutorial`,
      `why ${keyword} is important`,
      `${keyword} examples`
    ];

    return longTailSuggestions.slice(0, 5);
  },

  /**
   * Analyze content gaps
   */
  _analyzeContentGaps(keywordAnalysis) {
    // Find gaps where competition is low but opportunity is high
    return keywordAnalysis
      .filter(k => k.opportunityScore > 50)
      .map(k => ({
        keyword: k.keyword,
        opportunityScore: k.opportunityScore,
        reason: `High opportunity score (${k.opportunityScore}) with moderate difficulty`,
        suggestedContentTypes: ['blog', 'tutorial', 'guide']
      }));
  },

  /**
   * Build prompt for content suggestions
   */
  _buildContentSuggestionsPrompt(topic, keywords, contentType, targetAudience, tone, count) {
    return `Generate ${count} unique, SEO-optimized content suggestions for a ${contentType} about "${topic}".

Target keywords: ${keywords.join(', ')}
Target audience: ${targetAudience}
Tone: ${tone}

For each suggestion, provide:
1. A compelling, SEO-friendly title (60 characters max, includes primary keyword)
2. A brief description of the content angle
3. Key topics to cover (3-5 points)
4. Target search intent (informational, commercial, navigational)
5. Estimated word count

Format as JSON array with objects containing: title, description, topics (array), searchIntent, estimatedWords.

Make each suggestion unique and target different aspects of the topic.`;
  },

  /**
   * Get fallback content suggestions when API fails
   */
  _getFallbackContentSuggestions(topic, keywords, count) {
    const suggestions = [];
    const primaryKeyword = keywords[0] || topic;

    for (let i = 0; i < count; i++) {
      suggestions.push({
        title: `${topic}: ${['Complete Guide', 'Tips & Tricks', 'Best Practices', 'Ultimate Tutorial', 'Deep Dive'][i]}`,
        description: `Comprehensive content about ${topic} focusing on ${primaryKeyword}`,
        topics: [
          `Introduction to ${primaryKeyword}`,
          `Key benefits and features`,
          `Step-by-step implementation`,
          `Common mistakes to avoid`,
          `Expert tips and recommendations`
        ],
        searchIntent: 'informational',
        estimatedWords: 1500
      });
    }

    return suggestions; // Return array directly, not JSON.stringified
  },

  /**
   * Parse content suggestions from AI response
   */
  _parseContentSuggestions(response, topic, keywords, contentType) {
    // If response is already an array (from fallback), return it
    if (Array.isArray(response)) {
      return response;
    }

    try {
      // Try to parse as JSON
      const parsed = JSON.parse(response);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      // If not JSON, extract from text
      return this._extractSuggestionsFromText(response, topic);
    }
  },

  /**
   * Extract suggestions from unstructured text
   */
  _extractSuggestionsFromText(text, topic) {
    const lines = text.split('\n').filter(l => l.trim());
    const suggestions = [];

    lines.forEach(line => {
      if (line.includes(':') || line.includes('-')) {
        const parts = line.split(/:|-/);
        if (parts.length >= 2) {
          suggestions.push({
            title: parts[0].trim(),
            description: parts.slice(1).join(' ').trim(),
            topics: [topic],
            searchIntent: 'informational',
            estimatedWords: 1000
          });
        }
      }
    });

    return suggestions.slice(0, 5);
  },

  /**
   * Calculate SEO score for a suggestion
   */
  _calculateSEOScore(suggestion, keywords) {
    let score = 50; // Base score

    const titleLower = suggestion.title.toLowerCase();

    // Bonus for keyword in title
    if (keywords.some(kw => titleLower.includes(kw.toLowerCase()))) {
      score += 20;
    }

    // Bonus for appropriate title length (50-60 chars is ideal)
    const titleLength = suggestion.title.length;
    if (titleLength >= 50 && titleLength <= 60) {
      score += 15;
    } else if (titleLength >= 40 && titleLength <= 70) {
      score += 10;
    }

    // Bonus for topic count
    if (suggestion.topics && suggestion.topics.length >= 3) {
      score += 10;
    }

    // Bonus for search intent specification
    if (suggestion.searchIntent) {
      score += 5;
    }

    return Math.min(100, score);
  },

  /**
   * Calculate keyword density
   */
  _calculateKeywordDensity(content, keywords) {
    const words = content.toLowerCase().match(/\b[a-z]{2,}\b/g) || [];
    const totalWords = words.length;

    if (totalWords === 0) return 0;

    let keywordCount = 0;
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'g');
      const matches = content.toLowerCase().match(regex) || [];
      keywordCount += matches.length;
    });

    return (keywordCount / totalWords) * 100;
  },

  /**
   * Calculate readability score (Flesch Reading Ease)
   */
  _calculateReadability(content) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/).filter(w => w.trim().length > 0);
    const syllables = words.reduce((count, word) => {
      return count + this._countSyllables(word);
    }, 0);

    if (sentences.length === 0 || words.length === 0) return 50;

    const avgSentenceLength = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    // Flesch Reading Ease formula
    const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);

    return Math.max(0, Math.min(100, Math.round(score)));
  },

  /**
   * Count syllables in a word
   */
  _countSyllables(word) {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  },

  /**
   * Estimate word count from outline
   */
  _estimateWordCount(outline) {
    if (!outline) return 1000;
    const topicCount = Array.isArray(outline) ? outline.length : 5;
    return topicCount * 200; // Rough estimate
  },

  /**
   * Analyze search intent
   */
  _analyzeSearchIntent(title) {
    const lower = title.toLowerCase();

    if (lower.includes('how to') || lower.includes('guide') || lower.includes('tutorial')) {
      return 'informational';
    } else if (lower.includes('best') || lower.includes('top') || lower.includes('review')) {
      return 'commercial investigation';
    } else if (lower.includes('buy') || lower.includes('price') || lower.includes('cheap')) {
      return 'transactional';
    } else if (lower.includes('login') || lower.includes('sign in') || lower.includes('official')) {
      return 'navigational';
    }

    return 'informational';
  },

  /**
   * Generate LSI keywords
   */
  _generateLSIKeywords(content, primaryKeyword) {
    // Extract related terms using simple frequency analysis
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 4 && w !== primaryKeyword.toLowerCase());

    const freq = {};
    words.forEach(w => {
      freq[w] = (freq[w] || 0) + 1;
    });

    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ keyword: word, relevance: count }));
  },

  /**
   * Apply SEO optimizations to content
   */
  _applyOptimizations(content, keywords, recommendations) {
    // This would apply the recommendations to create an optimized version
    // For now, return original content with a note
    return {
      original: content,
      note: 'Optimizations should be applied manually based on recommendations',
      automatedOptimizations: []
    };
  },

  /**
   * Calculate overall SEO score
   */
  _calculateOverallSEOScore(analysis, keywords) {
    let score = 50;

    // Keyword density check
    const density = analysis.current.keywordDensity;
    if (density >= 1.5 && density <= 3.5) {
      score += 20;
    } else if (density >= 1 && density <= 4) {
      score += 10;
    }

    // Readability check
    if (analysis.current.readabilityScore >= 60) {
      score += 15;
    } else if (analysis.current.readabilityScore >= 40) {
      score += 10;
    }

    // Structure check
    if (analysis.current.headingCount >= 3) {
      score += 10;
    }
    if (analysis.current.linkCount > 0) {
      score += 5;
    }

    return Math.min(100, score);
  },

  /**
   * Build prompt for meta descriptions
   */
  _buildMetaDescriptionPrompt(contentPreview, keywords, count, includeCTA, maxLength) {
    return `Generate ${count} unique, SEO-optimized meta descriptions for content about: "${contentPreview.substring(0, 200)}..."

Target keywords: ${keywords.join(', ')}
Maximum length: ${maxLength} characters
${includeCTA ? 'Include a call-to-action in each description.' : ''}

Each meta description should:
1. Include the primary keyword naturally
2. Be compelling and click-worthy
4. Accurately represent the content
5. ${includeCTA ? 'Include a clear call-to-action' : 'Be informative'}

Format as a JSON array of strings.`;
  },

  /**
   * Get fallback meta descriptions
   */
  _getFallbackMetaDescriptions(contentPreview, keywords, count) {
    const primaryKeyword = keywords[0] || 'this topic';
    const descriptions = [];

    const templates = [
      `Discover everything about ${primaryKeyword}. Learn the best strategies, tips, and techniques to succeed. Read now!`,
      `Looking for information on ${primaryKeyword}? Our comprehensive guide covers everything you need to know. Start learning today.`,
      `Master ${primaryKeyword} with our expert guide. Proven tips and strategies to help you achieve your goals.`,
      `Learn about ${primaryKeyword} and how it can benefit you. Step-by-step instructions and expert advice included.`,
      `The ultimate guide to ${primaryKeyword}. Discover key insights, best practices, and actionable tips.`
    ];

    for (let i = 0; i < count; i++) {
      descriptions.push(templates[i % templates.length]);
    }

    return JSON.stringify(descriptions);
  },

  /**
   * Parse meta descriptions from response
   */
  _parseMetaDescriptions(response, maxLength) {
    try {
      const parsed = JSON.parse(response);
      const descriptions = Array.isArray(parsed) ? parsed : [parsed];

      return descriptions
        .map(d => typeof d === 'string' ? d : d.text || d.description || '')
        .filter(d => d.length > 0)
        .map(d => d.substring(0, maxLength));
    } catch (e) {
      // Extract from text if not JSON
      return response.split('\n')
        .filter(l => l.trim().length > 50)
        .map(l => l.trim().substring(0, maxLength))
        .slice(0, 5);
    }
  },

  /**
   * Check if text has call-to-action
   */
  _hasCallToAction(text) {
    const ctaPhrases = [
      'read more', 'learn more', 'find out', 'discover', 'start now',
      'get started', 'try now', 'sign up', 'register', 'buy now',
      'shop now', 'order now', 'click here', 'visit us', 'check out'
    ];

    const lower = text.toLowerCase();
    return ctaPhrases.some(phrase => lower.includes(phrase));
  },

  /**
   * Score meta description
   */
  _scoreMetaDescription(desc, keywords, includeCTA) {
    let score = 0;

    // Length check (150-160 is ideal)
    const length = desc.length;
    if (length >= 150 && length <= 160) {
      score += 30;
    } else if (length >= 140 && length <= 170) {
      score += 20;
    } else if (length >= 120 && length <= 180) {
      score += 10;
    }

    // Keyword inclusion
    if (desc.includesKeyword) {
      score += 30;
    }

    // Call-to-action
    if (!includeCTA || desc.hasCallToAction) {
      score += 20;
    }

    // Length not too short
    if (length >= 120) {
      score += 10;
    }

    // Length not too long
    if (length <= 160) {
      score += 10;
    }

    return score;
  },

  /**
   * Get context around a keyword match
   */
  _getContext(content, position, contextLength) {
    const start = Math.max(0, position - contextLength);
    const end = Math.min(content.length, position + contextLength);
    return content.substring(start, end).trim();
  },

  /**
   * Get density status
   */
  _getDensityStatus(currentDensity, targetDensity) {
    if (currentDensity < targetDensity * 0.5) {
      return 'too_low';
    } else if (currentDensity > targetDensity * 1.5) {
      return 'too_high';
    } else if (currentDensity >= targetDensity * 0.8 && currentDensity <= targetDensity * 1.2) {
      return 'optimal';
    }
    return 'acceptable';
  },

  /**
   * Extract top phrases from content
   */
  _extractTopPhrases(content, count) {
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3);

    const phrases = {};
    for (let i = 0; i < words.length - 1; i++) {
      const phrase = `${words[i]} ${words[i + 1]}`;
      phrases[phrase] = (phrases[phrase] || 0) + 1;
    }

    return Object.entries(phrases)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([phrase, freq]) => ({ phrase, frequency: freq }));
  },

  /**
   * Detect keyword stuffing
   */
  _detectKeywordStuffing(keywordPositions, totalWords) {
    const alerts = [];

    Object.entries(keywordPositions).forEach(([keyword, positions]) => {
      // Check for too many occurrences close together
      for (let i = 0; i < positions.length - 1; i++) {
        const distance = positions[i + 1].position - positions[i].position;
        if (distance < 10) { // Less than 10 words apart
          alerts.push({
            type: 'close_proximity',
            keyword,
            message: `Keyword "${keyword}" appears too frequently in close proximity`,
            severity: 'warning'
          });
          break;
        }
      }

      // Check for excessive usage overall
      const density = (positions.length / totalWords) * 100;
      if (density > 5) {
        alerts.push({
          type: 'excessive_usage',
          keyword,
          message: `Keyword "${keyword}" density is ${density.toFixed(2)}%, which may be considered stuffing`,
          severity: 'error'
        });
      }
    });

    return alerts;
  },

  /**
   * Generate density recommendations
   */
  _generateDensityRecommendations(densityAnalysis) {
    const recommendations = [];

    densityAnalysis.forEach(analysis => {
      if (analysis.status === 'too_low') {
        recommendations.push({
          keyword: analysis.keyword,
          action: 'increase',
          message: `Increase usage of "${analysis.keyword}" to reach optimal density`,
          suggestion: `Add "${analysis.keyword}" ${Math.ceil(analysis.targetDensity * 10 / 100 * 1000 / 10)} more times naturally in the content`
        });
      } else if (analysis.status === 'too_high') {
        recommendations.push({
          keyword: analysis.keyword,
          action: 'decrease',
          message: `Decrease usage of "${analysis.keyword}" to avoid keyword stuffing`,
          suggestion: `Reduce "${analysis.keyword}" usage by ${Math.ceil((analysis.density - analysis.targetDensity) / 100 * 1000 / 10)} occurrences`
        });
      }
    });

    return recommendations;
  }
};

export default seoContentSuggestions;
