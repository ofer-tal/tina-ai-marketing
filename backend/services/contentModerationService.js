import winston from 'winston';

// Create logger for content moderation service
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'content-moderation' },
  transports: [
    new winston.transports.File({ filename: 'logs/content-moderation-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/content-moderation.log' }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

/**
 * Content Moderation Service
 *
 * Checks generated content for policy violations before finalizing.
 * Integrates with moderation APIs (e.g., OpenAI Moderation, content safety APIs)
 * and provides local content safety checks.
 */
class ContentModerationService {
  constructor() {
    this.moderationResults = [];
    this.apiConfigured = this._checkApiConfiguration();
  }

  /**
   * Check if moderation API is configured
   * @private
   */
  _checkApiConfiguration() {
    // Check for various moderation API keys
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasGoogleSafety = !!process.env.GOOGLE_CONTENT_SAFETY_API_KEY;
    const hasAzureContentSafety = !!process.env.AZURE_CONTENT_SAFETY_KEY;

    return {
      openai: hasOpenAI,
      google: hasGoogleSafety,
      azure: hasAzureContentSafety,
      anyConfigured: hasOpenAI || hasGoogleSafety || hasAzureContentSafety
    };
  }

  /**
   * Moderate content draft
   * @param {Object} contentDraft - Content draft to moderate
   * @param {string} contentDraft.caption - Caption text
   * @param {Array} contentDraft.hashtags - Hashtags
   * @param {string} contentDraft.hook - Text hook
   * @param {string} contentDraft.platform - Platform (tiktok, instagram, youtube_shorts)
   * @param {Object} contentDraft.story - Associated story data
   * @returns {Promise<Object>} Moderation result
   */
  async moderateContent(contentDraft) {
    const startTime = Date.now();

    logger.info('Starting content moderation check', {
      platform: contentDraft.platform,
      hasCaption: !!contentDraft.caption,
      hasHashtags: contentDraft.hashtags?.length > 0
    });

    try {
      // Step 1: Run local content checks
      const localChecks = this._runLocalChecks(contentDraft);

      // Step 2: If API configured, run API moderation
      let apiChecks = { passed: true, flags: [] };
      if (this.apiConfigured.anyConfigured) {
        apiChecks = await this._runApiChecks(contentDraft);
      } else {
        logger.warn('No moderation API configured, using local checks only');
      }

      // Step 3: Combine results
      const combinedResult = this._combineModerationResults(localChecks, apiChecks);

      // Step 4: Generate moderation report
      const moderationResult = {
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        platform: contentDraft.platform,
        passed: combinedResult.passed,
        confidence: combinedResult.confidence,
        checks: {
          local: localChecks,
          api: apiChecks
        },
        flags: combinedResult.flags,
        recommendations: combinedResult.recommendations,
        metadata: {
          apiConfigured: this.apiConfigured.anyConfigured,
          checkMethods: combinedResult.methodsUsed
        }
      };

      // Step 5: Log moderation results
      logger.info('Content moderation completed', {
        passed: moderationResult.passed,
        flags: moderationResult.flags.length,
        confidence: moderationResult.confidence,
        duration: `${moderationResult.duration}ms`
      });

      // Store moderation result
      this.moderationResults.push(moderationResult);

      // Keep only last 100 results in memory
      if (this.moderationResults.length > 100) {
        this.moderationResults.shift();
      }

      return moderationResult;

    } catch (error) {
      logger.error('Content moderation error', {
        error: error.message,
        stack: error.stack
      });

      // On error, take conservative approach - flag for manual review
      return {
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        platform: contentDraft.platform,
        passed: false,
        confidence: 0,
        error: error.message,
        flags: [{
          type: 'system_error',
          severity: 'high',
          message: 'Moderation check failed. Manual review required.',
          details: error.message
        }],
        recommendations: ['Manual review required due to system error'],
        checks: { local: { passed: false }, api: { passed: false } }
      };
    }
  }

  /**
   * Run local content safety checks
   * @private
   */
  _runLocalChecks(contentDraft) {
    const flags = [];
    const textToCheck = [
      contentDraft.caption || '',
      contentDraft.hook || '',
      ...(contentDraft.hashtags || [])
    ].join(' ').toLowerCase();

    // Local content safety rules

    // 1. Check for excessive profanity
    const profanityPatterns = [
      /\bfuck\b/gi,
      /\bshit\b/gi,
      /\bdamn\b/gi,
      /\bass\b/gi,
      /\bbitch\b/gi
    ];

    let profanityCount = 0;
    profanityPatterns.forEach(pattern => {
      const matches = textToCheck.match(pattern);
      if (matches) profanityCount += matches.length;
    });

    if (profanityCount > 3) {
      flags.push({
        type: 'excessive_profanity',
        severity: 'medium',
        message: `Content contains ${profanityCount} profanity instances`,
        details: 'Consider reducing profanity for broader audience appeal'
      });
    }

    // 2. Check for sexual explicit content (beyond brand standards)
    const explicitPatterns = [
      /\bporn\b/gi,
      /\bnude\b/gi,
      /\bnaked\b/gi,
      /\bsex\s+scene\b/gi,
      /\bexplicit\b/gi
    ];

    let explicitCount = 0;
    explicitPatterns.forEach(pattern => {
      if (pattern.test(textToCheck)) explicitCount++;
    });

    if (explicitCount > 0) {
      flags.push({
        type: 'explicit_content',
        severity: 'high',
        message: 'Content may contain explicit references',
        details: 'Review for platform policy compliance'
      });
    }

    // 3. Check for hate speech indicators
    const hateSpeechPatterns = [
      /\bhate\b/gi,
      /\bkill\s+\w+\b/gi,
      /\bterrorist\b/gi,
      /\bviolence\b/gi
    ];

    let hateSpeechCount = 0;
    hateSpeechPatterns.forEach(pattern => {
      if (pattern.test(textToCheck)) hateSpeechCount++;
    });

    if (hateSpeechCount > 0) {
      flags.push({
        type: 'hate_speech_indicator',
        severity: 'high',
        message: 'Content contains potentially problematic language',
        details: 'Manual review required for hate speech policies'
      });
    }

    // 4. Check hashtag appropriateness
    if (contentDraft.hashtags && contentDraft.hashtags.length > 0) {
      const inappropriateHashtags = contentDraft.hashtags.filter(tag =>
        tag.toLowerCase().includes('nsfw') ||
        tag.toLowerCase().includes('adult') ||
        tag.toLowerCase().includes('xxx')
      );

      if (inappropriateHashtags.length > 0) {
        flags.push({
          type: 'inappropriate_hashtags',
          severity: 'medium',
          message: `Found ${inappropriateHashtags.length} potentially inappropriate hashtags`,
          details: `Hashtags: ${inappropriateHashtags.join(', ')}`
        });
      }
    }

    // 5. Check for personal information
    const personalInfoPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN pattern
      /\b\d{10,}\b/g, // Phone number pattern
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g // Email pattern
    ];

    let personalInfoCount = 0;
    personalInfoPatterns.forEach(pattern => {
      if (pattern.test(textToCheck)) personalInfoCount++;
    });

    if (personalInfoCount > 0) {
      flags.push({
        type: 'personal_information',
        severity: 'high',
        message: 'Content may contain personal information',
        details: 'Remove any emails, phone numbers, or identifiers'
      });
    }

    // 6. Check for platform-specific violations
    const platformChecks = this._checkPlatformCompliance(contentDraft);
    flags.push(...platformChecks);

    // 7. Check caption length (platform-specific)
    const lengthChecks = this._checkContentLength(contentDraft);
    if (lengthChecks.length > 0) {
      flags.push(...lengthChecks);
    }

    return {
      passed: flags.filter(f => f.severity === 'high').length === 0,
      flags: flags,
      confidence: flags.length === 0 ? 0.85 : 0.6, // Local checks have good but not perfect confidence
      methodsUsed: ['local_patterns', 'platform_rules', 'length_validation']
    };
  }

  /**
   * Run API-based moderation checks
   * @private
   */
  async _runApiChecks(contentDraft) {
    const flags = [];

    // Try OpenAI Moderation API if configured
    if (this.apiConfigured.openai) {
      try {
        const openaiResult = await this._runOpenAIModeration(contentDraft);
        if (openaiResult.flagged) {
          flags.push({
            type: 'openai_moderation',
            severity: 'high',
            message: 'Flagged by OpenAI moderation',
            categories: openaiResult.categories,
            scores: openaiResult.category_scores
          });
        }
      } catch (error) {
        logger.warn('OpenAI moderation check failed', { error: error.message });
      }
    }

    // Add other API integrations here (Google, Azure, etc.)

    return {
      passed: flags.filter(f => f.severity === 'high').length === 0,
      flags: flags,
      confidence: flags.length === 0 ? 0.95 : 0.85, // API checks have higher confidence
      methodsUsed: this.apiConfigured.openai ? ['openai_moderation_api'] : []
    };
  }

  /**
   * Run OpenAI Moderation API
   * @private
   */
  async _runOpenAIModeration(contentDraft) {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const textToModerate = [
      contentDraft.caption || '',
      contentDraft.hook || '',
      ...(contentDraft.hashtags || [])
    ].join('\n');

    const moderation = await openai.moderations.create({
      input: textToModerate
    });

    const result = moderation.results[0];
    return {
      flagged: result.flagged,
      categories: {
        hate: result.categories.hate,
        'hate/threatening': result.categories['hate/threatening'],
        self_harm: result.categories.self_harm,
        sexual: result.categories.sexual,
        'sexual/minors': result.categories['sexual/minors'],
        violence: result.categories.violence,
        'violence/graphic': result.categories['violence/graphic']
      },
      category_scores: result.category_scores
    };
  }

  /**
   * Check platform-specific compliance
   * @private
   */
  _checkPlatformCompliance(contentDraft) {
    const flags = [];
    const platform = contentDraft.platform;

    // TikTok-specific rules
    if (platform === 'tiktok') {
      // Check for misleading hashtags
      const misleadingHashtags = ['#fyp', '#foryou', '#viral', '#trending'];
      const foundMisleading = (contentDraft.hashtags || []).filter(tag =>
        misleadingHashtags.includes(tag.toLowerCase())
      );

      if (foundMisleading.length > 2) {
        flags.push({
          type: 'platform_compliance',
          severity: 'low',
          message: 'Excessive discovery hashtags may reduce reach',
          details: 'TikTok algorithm may penalize overuse of #fyp, #foryou',
          platform: 'tiktok'
        });
      }
    }

    // Instagram-specific rules
    if (platform === 'instagram') {
      // Check for hashtag spam
      if ((contentDraft.hashtags || []).length > 30) {
        flags.push({
          type: 'platform_compliance',
          severity: 'medium',
          message: 'Too many hashtags for Instagram',
          details: 'Instagram allows max 30 hashtags',
          platform: 'instagram'
        });
      }
    }

    // YouTube Shorts-specific rules
    if (platform === 'youtube_shorts') {
      // Check for clickbait patterns
      const clickbaitPatterns = [
        /you won't believe/gi,
        /shocking/gi,
        /unbelievable/gi,
        /must watch/gi
      ];

      const textToCheck = (contentDraft.caption || '').toLowerCase();
      const clickbaitCount = clickbaitPatterns.filter(p => p.test(textToCheck)).length;

      if (clickbaitCount > 0) {
        flags.push({
          type: 'platform_compliance',
          severity: 'low',
          message: 'Potentially clickbait language detected',
          details: 'YouTube may penalize clickbait titles',
          platform: 'youtube_shorts'
        });
      }
    }

    return flags;
  }

  /**
   * Check content length compliance
   * @private
   */
  _checkContentLength(contentDraft) {
    const flags = [];
    const platform = contentDraft.platform;
    const captionLength = (contentDraft.caption || '').length;

    const limits = {
      tiktok: { max: 2200, warning: 2000 },
      instagram: { max: 2200, warning: 2000 },
      youtube_shorts: { max: 5000, warning: 4500 }
    };

    const limit = limits[platform];
    if (limit && captionLength > limit.max) {
      flags.push({
        type: 'length_violation',
        severity: 'high',
        message: `Caption exceeds ${platform} character limit`,
        details: `Caption is ${captionLength} chars, max is ${limit.max}`,
        platform: platform
      });
    } else if (limit && captionLength > limit.warning) {
      flags.push({
        type: 'length_warning',
        severity: 'low',
        message: `Caption approaching ${platform} character limit`,
        details: `Caption is ${captionLength} chars, max is ${limit.max}`,
        platform: platform
      });
    }

    return flags;
  }

  /**
   * Combine moderation results from local and API checks
   * @private
   */
  _combineModerationResults(localChecks, apiChecks) {
    const allFlags = [
      ...localChecks.flags,
      ...apiChecks.flags
    ];

    const highSeverityFlags = allFlags.filter(f => f.severity === 'high');
    const passed = highSeverityFlags.length === 0;

    // Calculate overall confidence
    // If API checks ran, use higher confidence. Otherwise use local check confidence.
    let confidence;
    if (apiChecks.methodsUsed && apiChecks.methodsUsed.length > 0) {
      confidence = apiChecks.confidence;
    } else {
      confidence = localChecks.confidence;
    }

    // Generate recommendations based on flags
    const recommendations = this._generateRecommendations(allFlags, passed);

    return {
      passed,
      confidence,
      flags: allFlags,
      recommendations,
      methodsUsed: [
        ...localChecks.methodsUsed,
        ...(apiChecks.methodsUsed || [])
      ]
    };
  }

  /**
   * Generate recommendations based on moderation flags
   * @private
   */
  _generateRecommendations(flags, passed) {
    if (passed && flags.length === 0) {
      return ['Content looks good! Ready to post.'];
    }

    if (flags.length === 0) {
      return [];
    }

    const recommendations = [];

    // High severity flags
    const highSeverityFlags = flags.filter(f => f.severity === 'high');
    if (highSeverityFlags.length > 0) {
      recommendations.push(`⚠️ ${highSeverityFlags.length} high-severity issue(s) found - manual review required`);
    }

    // Medium severity flags
    const mediumSeverityFlags = flags.filter(f => f.severity === 'medium');
    if (mediumSeverityFlags.length > 0) {
      recommendations.push(`⚠️ ${mediumSeverityFlags.length} medium-severity issue(s) found - review recommended`);
    }

    // Low severity flags
    const lowSeverityFlags = flags.filter(f => f.severity === 'low');
    if (lowSeverityFlags.length > 0 && highSeverityFlags.length === 0) {
      recommendations.push(`ℹ️ ${lowSeverityFlags.length} minor optimization(s) suggested`);
    }

    // Specific recommendations by flag type
    const flagTypes = flags.map(f => f.type);
    if (flagTypes.includes('excessive_profanity')) {
      recommendations.push('Consider reducing profanity for broader audience appeal');
    }
    if (flagTypes.includes('explicit_content')) {
      recommendations.push('Review for platform policy compliance on explicit content');
    }
    if (flagTypes.includes('personal_information')) {
      recommendations.push('Remove any personal information before posting');
    }
    if (flagTypes.includes('length_violation')) {
      recommendations.push('Shorten caption to meet platform character limits');
    }

    return recommendations;
  }

  /**
   * Get moderation statistics
   */
  getStatistics() {
    const totalChecks = this.moderationResults.length;
    const passedChecks = this.moderationResults.filter(r => r.passed).length;
    const failedChecks = totalChecks - passedChecks;

    const flagsByType = {};
    this.moderationResults.forEach(result => {
      result.flags.forEach(flag => {
        flagsByType[flag.type] = (flagsByType[flag.type] || 0) + 1;
      });
    });

    const flagsBySeverity = {
      high: 0,
      medium: 0,
      low: 0
    };

    this.moderationResults.forEach(result => {
      result.flags.forEach(flag => {
        flagsBySeverity[flag.severity]++;
      });
    });

    return {
      totalChecks,
      passedChecks,
      failedChecks,
      passRate: totalChecks > 0 ? (passedChecks / totalChecks * 100).toFixed(2) + '%' : 'N/A',
      flagsByType,
      flagsBySeverity,
      apiConfigured: this.apiConfigured.anyConfigured
    };
  }

  /**
   * Clear moderation history
   */
  clearHistory() {
    this.moderationResults = [];
    logger.info('Moderation history cleared');
  }
}

// Create and export singleton instance
const contentModerationService = new ContentModerationService();
export default contentModerationService;
