import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'tiktok-optimization' },
  transports: [
    new winston.transports.File({ filename: 'logs/tiktok-optimization-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/tiktok-optimization.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

/**
 * TikTok Optimization Service
 * Optimizes content for TikTok platform requirements and trends
 */
class TiktokOptimizationService {
  constructor() {
    // TikTok trending audio tracks (simulated - would integrate TikTok API in production)
    this.trendingAudio = [
      { id: 'trending_1', title: 'Romantic Vibes', duration: 15, popularity: 95 },
      { id: 'trending_2', title: 'Spicy Beat', duration: 30, popularity: 92 },
      { id: 'trending_3', title: 'Dreamy Atmosphere', duration: 20, popularity: 89 },
      { id: 'trending_4', title: 'Story Time', duration: 25, popularity: 87 },
      { id: 'trending_5', title: 'Love Story', duration: 18, popularity: 85 },
      { id: 'trending_6', title: 'Page Turner', duration: 22, popularity: 83 },
      { id: 'trending_7', title: 'BookTok Favorite', duration: 28, popularity: 81 },
      { id: 'trending_8', title: 'Reading Mood', duration: 16, popularity: 79 },
      { id: 'trending_9', title: 'Romance Novel', duration: 24, popularity: 77 },
      { id: 'trending_10', title: 'Story Hook', duration: 19, popularity: 75 },
    ];

    // TikTok video specifications
    this.tiktokSpecs = {
      aspectRatio: '9:16',
      resolution: '1080x1920',
      minResolution: '540x960',
      maxDuration: 60, // seconds
      recommendedDuration: 15, // seconds (optimal for TikTok)
      minDuration: 3, // seconds
      maxFileSize: 287, // MB (iOS limit)
      formats: ['mp4', 'mov', 'mpeg', '3gp', 'avi'],
      fps: [23, 24, 25, 30, 50, 60],
      recommendedFps: 30,
      codec: 'h264',
      audioCodec: 'aac',
    };

    // TikTok audience optimization strategies
    this.audienceStrategies = {
      hook: {
        attentionSpan: '1.5-3 seconds',
        strategies: [
          'Start with action or dialogue',
          'Use visual hook in first frame',
          'Pose a question immediately',
          'Create curiosity gap',
          'Use trending sound or effect',
        ]
      },
      pacing: {
        recommended: 'Fast-paced',
        cuts: 'Every 2-3 seconds',
        transitions: 'Quick and smooth',
        text: 'On-screen text for key points',
      },
      engagement: {
        cta: [
          'Read the full story on Blush',
          'Link in bio for more',
          'Follow for more romance stories',
          'Comment what happens next',
          'Share with someone who needs this',
        ],
        interactive: [
          'Ask questions in caption',
          'Use "duet this" prompts',
          'Create relatable scenarios',
          'Use trending effects/filters',
        ]
      }
    };

    // TikTok-specific content patterns
    this.contentPatterns = {
      romance: {
        hooks: [
          'POV: You\'re reading this at 2am',
          'This book ruined me in the best way',
          'Nobody talks about this scene enough',
          'I can\'t stop thinking about this scene',
          'If you love [trope], you need this',
        ],
        keywords: [
          'BookTok', 'RomanceTok', 'BookRecommendation', 'MustRead',
          'TBR', 'BookCommunity', 'RomanceBooks', 'ReadingCommunity',
          'BookLover', 'StoryTime', 'FYP', 'Foryou', 'Foryoupage',
        ],
        timing: {
          best: ['6-9am', '12-3pm', '7-11pm'],
          worst: ['9am-12pm', '3-5pm'],
        }
      }
    };
  }

  /**
   * Check TikTok trending audio
   * Returns trending audio tracks sorted by popularity
   */
  getTrendingAudio(options = {}) {
    try {
      const { limit = 5, category = 'all' } = options;

      logger.info('Fetching TikTok trending audio', { limit, category });

      let trending = [...this.trendingAudio];

      // Filter by category if specified
      if (category !== 'all') {
        // In production, would filter by actual TikTok categories
        trending = trending.filter(track =>
          track.title.toLowerCase().includes(category.toLowerCase())
        );
      }

      // Sort by popularity and limit
      const result = trending
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, limit);

      logger.info('Trending audio retrieved', {
        count: result.length,
        topTrack: result[0]?.title
      });

      return {
        success: true,
        trending: result,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error fetching trending audio', {
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message,
        trending: []
      };
    }
  }

  /**
   * Validate and adjust video format for TikTok specs
   */
  validateVideoFormat(videoData) {
    try {
      logger.info('Validating video for TikTok specs', {
        duration: videoData.duration,
        resolution: videoData.resolution,
        format: videoData.format
      });

      const issues = [];
      const warnings = [];
      const recommendations = [];

      // Check duration
      if (!videoData.duration) {
        issues.push('Video duration is required');
      } else if (videoData.duration < this.tiktokSpecs.minDuration) {
        issues.push(`Video too short: ${videoData.duration}s (minimum: ${this.tiktokSpecs.minDuration}s)`);
      } else if (videoData.duration > this.tiktokSpecs.maxDuration) {
        issues.push(`Video too long: ${videoData.duration}s (maximum: ${this.tiktokSpecs.maxDuration}s)`);
      } else if (videoData.duration > this.tiktokSpecs.recommendedDuration * 2) {
        warnings.push(`Video longer than optimal: ${videoData.duration}s (recommended: ${this.tiktokSpecs.recommendedDuration}s)`);
      } else if (videoData.duration !== this.tiktokSpecs.recommendedDuration) {
        recommendations.push(`Consider trimming to ${this.tiktokSpecs.recommendedDuration}s for optimal engagement`);
      }

      // Check aspect ratio
      if (videoData.aspectRatio) {
        const [width, height] = videoData.aspectRatio.split(':').map(Number);
        const ratio = width / height;

        if (ratio !== 9/16) {
          issues.push(`Incorrect aspect ratio: ${videoData.aspectRatio} (required: 9:16 vertical)`);
        }
      }

      // Check resolution
      if (videoData.resolution) {
        const [width, height] = videoData.resolution.split('x').map(Number);

        if (width < 540 || height < 960) {
          issues.push(`Resolution too low: ${videoData.resolution} (minimum: ${this.tiktokSpecs.minResolution})`);
        } else if (width !== 1080 || height !== 1920) {
          warnings.push(`Resolution not optimal: ${videoData.resolution} (recommended: ${this.tiktokSpecs.resolution})`);
        }
      }

      // Check format
      if (videoData.format && !this.tiktokSpecs.formats.includes(videoData.format.toLowerCase())) {
        issues.push(`Unsupported format: ${videoData.format} (supported: ${this.tiktokSpecs.formats.join(', ')})`);
      }

      // Check FPS
      if (videoData.fps && !this.tiktokSpecs.fps.includes(videoData.fps)) {
        warnings.push(`Non-standard FPS: ${videoData.fps} (recommended: ${this.tiktokSpecs.recommendedFps})`);
      }

      // Check file size
      if (videoData.fileSizeMB && videoData.fileSizeMB > this.tiktokSpecs.maxFileSize) {
        issues.push(`File too large: ${videoData.fileSizeMB}MB (maximum: ${this.tiktokSpecs.maxFileSize}MB)`);
      }

      const isValid = issues.length === 0;

      logger.info('Video validation complete', {
        isValid,
        issues: issues.length,
        warnings: warnings.length
      });

      return {
        success: true,
        isValid,
        specs: this.tiktokSpecs,
        issues,
        warnings,
        recommendations,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error validating video format', {
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message,
        isValid: false,
        issues: ['Validation failed']
      };
    }
  }

  /**
   * Optimize caption for TikTok audience
   */
  optimizeCaption(captionData) {
    try {
      const { caption, story, spiciness = 1 } = captionData;

      logger.info('Optimizing caption for TikTok', {
        captionLength: caption?.length,
        story: story?.title,
        spiciness
      });

      let optimizedCaption = caption || '';
      const analysis = {
        originalLength: optimizedCaption.length,
        hooks: [],
        improvements: [],
        warnings: []
      };

      // TikTok caption limit (actually 2200, but 150-200 is optimal)
      const optimalLength = 150;
      const maxLength = 2200;

      if (optimizedCaption.length > maxLength) {
        analysis.warnings.push(`Caption too long: ${optimizedCaption.length} chars (maximum: ${maxLength})`);
        optimizedCaption = optimizedCaption.substring(0, maxLength - 3) + '...';
      }

      if (optimizedCaption.length > optimalLength * 1.5) {
        analysis.improvements.push(`Consider shortening to ${optimalLength} chars for better engagement`);
      }

      // Add hook if missing
      const hasHook = this.contentPatterns.romance.hooks.some(hook =>
        optimizedCaption.toLowerCase().includes(hook.toLowerCase().substring(0, 20))
      );

      if (!hasHook) {
        const suggestedHook = this.contentPatterns.romance.hooks[
          Math.floor(Math.random() * this.contentPatterns.romance.hooks.length)
        ];
        analysis.hooks.push(suggestedHook);
      }

      // Check for CTA
      const ctaKeywords = ['link in bio', 'follow', 'comment', 'share', 'blush'];
      const hasCTA = ctaKeywords.some(keyword =>
        optimizedCaption.toLowerCase().includes(keyword)
      );

      if (!hasCTA) {
        const suggestedCTA = this.audienceStrategies.engagement.cta[
          Math.floor(Math.random() * this.audienceStrategies.engagement.cta.length)
        ];
        analysis.improvements.push(`Add CTA: "${suggestedCTA}"`);
      }

      // Check for question (engagement booster)
      const hasQuestion = optimizedCaption.includes('?');
      if (!hasQuestion) {
        analysis.improvements.push('Add a question to boost engagement');
      }

      // Spiciness-based adjustments
      if (spiciness >= 3) {
        analysis.improvements.push('Consider using subtle language for TikTok guidelines compliance');
      }

      // Analyze structure
      const sentences = optimizedCaption.split(/[.!?]+/).filter(s => s.trim().length > 0);
      if (sentences.length > 3) {
        analysis.improvements.push(`Consider breaking into ${sentences.length} shorter sentences for readability`);
      }

      logger.info('Caption optimization complete', {
        optimizedLength: optimizedCaption.length,
        hooks: analysis.hooks.length,
        improvements: analysis.improvements.length
      });

      return {
        success: true,
        caption: optimizedCaption,
        analysis,
        suggestedHooks: this.contentPatterns.romance.hooks.slice(0, 3),
        suggestedCTAs: this.audienceStrategies.engagement.cta.slice(0, 3),
        bestPostingTimes: this.contentPatterns.romance.timing,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error optimizing caption', {
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message,
        caption: captionData.caption
      };
    }
  }

  /**
   * Get TikTok-specific hashtags
   */
  getTiktokHashtags(options = {}) {
    try {
      const { count = 8, category = 'romance', spiciness = 1 } = options;

      logger.info('Generating TikTok hashtags', { count, category, spiciness });

      // Base TikTok hashtags
      const baseHashtags = [
        '#fyp', '#foryou', '#foryoupage', '#viral', '#trending',
        '#BookTok', '#RomanceTok', '#bookrecommendation', '#reading',
      ];

      // Category-specific hashtags
      const categoryHashtags = {
        romance: ['#romancebooks', '#romancereads', '#lovestory', '#booklover'],
        contemporary: ['#contemporaryromance', '#modernromance', '#realisticfiction'],
        historical: ['#historicalromance', '#periodromance', '#historicalfiction'],
        fantasy: ['#fantasyromance', '#paranormalromance', '#magicalromance'],
        scifi: ['#scifiromance', '#scifi', '#futurromance'],
      };

      // Spiciness-specific hashtags
      const spicinessHashtags = {
        0: ['#sweetromance', '#cleanromance', '#wholesomeromance', '#squeakyyclean'],
        1: ['#romancenovel', '#romancereader', '#bookworm', '#tbr'],
        2: ['#spicyromance', '#romancebooks', '#steamyromance', '#hotreads'],
        3: ['#darkromance', '#spicybook', '#romance', '#romancereads'],
      };

      let hashtags = [...baseHashtags];

      // Add category hashtags
      if (categoryHashtags[category]) {
        hashtags.push(...categoryHashtags[category]);
      }

      // Add spiciness hashtags
      if (spicinessHashtags[spiciness]) {
        hashtags.push(...spicinessHashtags[spiciness]);
      }

      // Add BookTok specific
      hashtags.push('#BookTokMadeMeDoIt', '#BookCommunity', '#MustRead', '#TBR');

      // Remove duplicates and limit
      const uniqueHashtags = [...new Set(hashtags)];
      const selectedHashtags = uniqueHashtags.slice(0, count);

      logger.info('TikTok hashtags generated', {
        count: selectedHashtags.length,
        category,
        spiciness
      });

      return {
        success: true,
        hashtags: selectedHashtags,
        count: selectedHashtags.length,
        recommended: 3, // TikTok recommends 3-5 hashtags
        optimal: 8, // But 8-12 works well
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error generating TikTok hashtags', {
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message,
        hashtags: []
      };
    }
  }

  /**
   * Verify vertical 9:16 aspect ratio
   */
  verifyAspectRatio(videoData) {
    try {
      const { width, height, aspectRatio } = videoData;

      logger.info('Verifying aspect ratio', { width, height, aspectRatio });

      let calculatedRatio;
      let isValid = false;

      if (aspectRatio) {
        const [w, h] = aspectRatio.split(':').map(Number);
        calculatedRatio = w / h;
      } else if (width && height) {
        calculatedRatio = width / height;
      } else {
        return {
          success: false,
          error: 'Must provide either aspectRatio or width/height',
          isValid: false
        };
      }

      // Check if 9:16 (0.5625)
      const tiktokRatio = 9 / 16;
      const tolerance = 0.01;
      const ratioDiff = Math.abs(calculatedRatio - tiktokRatio);

      isValid = ratioDiff <= tolerance;

      // Additional checks
      const isVertical = calculatedRatio < 1;
      const isExact = ratioDiff === 0;

      let message = isValid
        ? 'Valid 9:16 vertical aspect ratio'
        : `Invalid aspect ratio: ${calculatedRatio.toFixed(4)} (expected: ${tiktokRatio.toFixed(4)})`;

      logger.info('Aspect ratio verification complete', {
        isValid,
        calculatedRatio: calculatedRatio.toFixed(4),
        expectedRatio: tiktokRatio.toFixed(4),
        difference: ratioDiff.toFixed(4)
      });

      return {
        success: true,
        isValid,
        isVertical,
        isExact,
        calculatedRatio: calculatedRatio.toFixed(4),
        expectedRatio: '9:16',
        expectedDecimal: tiktokRatio.toFixed(4),
        difference: ratioDiff.toFixed(4),
        message,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error verifying aspect ratio', {
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message,
        isValid: false
      };
    }
  }

  /**
   * Comprehensive optimization for TikTok content
   * Combines all optimization steps
   */
  optimizeForTikTok(contentData) {
    try {
      logger.info('Starting comprehensive TikTok optimization', {
        story: contentData.story?.title,
        spiciness: contentData.spiciness
      });

      const results = {
        success: true,
        optimizations: {},
        timestamp: new Date().toISOString()
      };

      // Step 1: Get trending audio
      results.optimizations.trendingAudio = this.getTrendingAudio({
        limit: 5,
        category: contentData.story?.category
      });

      // Step 2: Validate video format
      if (contentData.video) {
        results.optimizations.videoFormat = this.validateVideoFormat(contentData.video);
      }

      // Step 3: Optimize caption
      if (contentData.caption) {
        results.optimizations.caption = this.optimizeCaption({
          caption: contentData.caption,
          story: contentData.story,
          spiciness: contentData.spiciness
        });
      }

      // Step 4: Generate hashtags
      results.optimizations.hashtags = this.getTiktokHashtags({
        count: 8,
        category: contentData.story?.category || 'romance',
        spiciness: contentData.spiciness || 1
      });

      // Step 5: Verify aspect ratio
      if (contentData.video) {
        results.optimizations.aspectRatio = this.verifyAspectRatio(contentData.video);
      }

      // Overall assessment
      const isValid = Object.values(results.optimizations).every(opt => opt.success !== false);

      results.summary = {
        isValid,
        stepsCompleted: Object.keys(results.optimizations).length,
        recommendations: this._generateRecommendations(results.optimizations)
      };

      logger.info('TikTok optimization complete', {
        isValid,
        stepsCompleted: results.summary.stepsCompleted
      });

      return results;

    } catch (error) {
      logger.error('Error in comprehensive optimization', {
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate recommendations based on optimization results
   */
  _generateRecommendations(optimizations) {
    const recommendations = [];

    // Video recommendations
    if (optimizations.videoFormat?.issues?.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'video',
        message: 'Fix video format issues before posting',
        details: optimizations.videoFormat.issues
      });
    }

    if (optimizations.videoFormat?.recommendations?.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'video',
        message: 'Consider these video improvements',
        details: optimizations.videoFormat.recommendations
      });
    }

    // Caption recommendations
    if (optimizations.caption?.analysis?.improvements?.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'caption',
        message: 'Improve caption for better engagement',
        details: optimizations.caption.analysis.improvements
      });
    }

    // Audio recommendations
    if (optimizations.trendingAudio?.trending?.length > 0) {
      recommendations.push({
        priority: 'low',
        category: 'audio',
        message: 'Use trending audio for better reach',
        details: [`Top track: ${optimizations.trendingAudio.trending[0].title}`]
      });
    }

    return recommendations;
  }

  /**
   * Health check for the service
   */
  healthCheck() {
    return {
      success: true,
      service: 'tiktok-optimization',
      status: 'ok',
      timestamp: new Date().toISOString(),
      capabilities: {
        trendingAudioTracks: this.trendingAudio.length,
        videoSpecs: Object.keys(this.tiktokSpecs).length,
        audienceStrategies: Object.keys(this.audienceStrategies).length,
        contentPatterns: Object.keys(this.contentPatterns).length,
        supportedCategories: ['romance', 'contemporary', 'historical', 'fantasy', 'scifi'],
        spicinessLevels: [0, 1, 2, 3],
        optimizations: [
          'trending_audio',
          'video_validation',
          'caption_optimization',
          'hashtag_generation',
          'aspect_ratio_verification'
        ]
      }
    };
  }
}

export default new TiktokOptimizationService();
