import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'instagram-optimization' },
  transports: [
    new winston.transports.File({ filename: 'logs/instagram-optimization-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/instagram-optimization.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

/**
 * Instagram Optimization Service
 * Optimizes content for Instagram Reels platform requirements and trends
 */
class InstagramOptimizationService {
  constructor() {
    // Instagram trending audio tracks (simulated - would integrate Instagram API in production)
    this.trendingAudio = [
      { id: 'ig_trending_1', title: 'Instagram Romance', duration: 15, popularity: 94 },
      { id: 'ig_trending_2', title: 'Reels Vibes', duration: 30, popularity: 91 },
      { id: 'ig_trending_3', title: 'Dreamy Romance', duration: 20, popularity: 88 },
      { id: 'ig_trending_4', title: 'Story Time', duration: 25, popularity: 86 },
      { id: 'ig_trending_5', title: 'Love Story Mode', duration: 18, popularity: 84 },
      { id: 'ig_trending_6', title: 'Page Turner Reel', duration: 22, popularity: 82 },
      { id: 'ig_trending_7', title: 'Booksta Favorite', duration: 28, popularity: 80 },
      { id: 'ig_trending_8', title: 'Reading Mood', duration: 16, popularity: 78 },
      { id: 'ig_trending_9', title: 'Romance Novel', duration: 24, popularity: 76 },
      { id: 'ig_trending_10', title: 'Story Hook', duration: 19, popularity: 74 },
    ];

    // Instagram Reels video specifications
    this.instagramSpecs = {
      aspectRatio: '9:16',
      resolution: '1080x1920',
      minResolution: '720x1280',
      maxDuration: 90, // seconds (Instagram allows longer than TikTok)
      recommendedDuration: 30, // seconds (optimal for Instagram Reels)
      minDuration: 3, // seconds
      maxFileSize: 250, // MB
      formats: ['mp4', 'mov', 'mpeg', 'mkv', 'avi'],
      fps: [23, 24, 25, 30, 60],
      recommendedFps: 30,
      codec: 'h264',
      audioCodec: 'aac',
    };

    // Instagram audience optimization strategies
    this.audienceStrategies = {
      hook: {
        attentionSpan: '2-3 seconds',
        strategies: [
          'Start with emotional moment',
          'Use text overlay in first frame',
          'Create visual curiosity',
          'Use trending Reels audio',
          'Start mid-action',
        ]
      },
      pacing: {
        recommended: 'Medium-paced',
        cuts: 'Every 3-4 seconds',
        transitions: 'Smooth transitions',
        text: 'Use text overlays for context',
      },
      engagement: {
        cta: [
          'Read more on Blush app',
          'Link in bio for full story',
          'Follow for daily romance recs',
          'Save this for your TBR',
          'Share with your book friends',
        ],
        interactive: [
          'Engage with questions in captions',
          'Use "Save this" prompts',
          'Create relatable content',
          'Use trending Reels audio',
          'Add location tags',
        ]
      }
    };

    // Instagram-specific content patterns
    this.contentPatterns = {
      romance: {
        hooks: [
          'This book gave me all the feels',
          'If you love [trope], read this next',
          'The scene that ruined me',
          'I couldn\'t put this down',
          'This belongs on your TBR',
        ],
        keywords: [
          'Bookstagram', 'BookRecommendation', 'RomanceBooks', 'MustRead',
          'TBR', 'BookCommunity', 'RomanceReader', 'ReadingCommunity',
          'BookLover', 'StoryTime', 'Booksta', 'IGBooks',
        ],
        timing: {
          best: ['7-9am', '12-2pm', '7-10pm'],
          worst: ['10am-12pm', '3-5pm'],
        }
      }
    };
  }

  /**
   * Check Instagram trending audio
   * Returns trending audio tracks sorted by popularity
   */
  getTrendingAudio(options = {}) {
    try {
      const { limit = 5, category = 'all' } = options;

      logger.info('Fetching Instagram trending audio', { limit, category });

      let trending = [...this.trendingAudio];

      // Filter by category if specified
      if (category !== 'all') {
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
   * Validate and adjust video format for Instagram Reels specs
   */
  validateVideoFormat(videoData) {
    try {
      logger.info('Validating video for Instagram Reels specs', {
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
      } else if (videoData.duration < this.instagramSpecs.minDuration) {
        issues.push(`Video too short: ${videoData.duration}s (minimum: ${this.instagramSpecs.minDuration}s)`);
      } else if (videoData.duration > this.instagramSpecs.maxDuration) {
        issues.push(`Video too long: ${videoData.duration}s (maximum: ${this.instagramSpecs.maxDuration}s)`);
      } else if (videoData.duration > this.instagramSpecs.recommendedDuration * 2) {
        warnings.push(`Video longer than optimal: ${videoData.duration}s (recommended: ${this.instagramSpecs.recommendedDuration}s)`);
      } else if (videoData.duration !== this.instagramSpecs.recommendedDuration) {
        recommendations.push(`Consider trimming to ${this.instagramSpecs.recommendedDuration}s for optimal engagement`);
      }

      // Check aspect ratio
      if (videoData.aspectRatio) {
        const [width, height] = videoData.aspectRatio.split(':').map(Number);
        const ratio = width / height;

        if (ratio !== 9/16) {
          issues.push(`Incorrect aspect ratio: ${videoData.aspectRatio} (required: 9:16 vertical for Reels)`);
        }
      }

      // Check resolution
      if (videoData.resolution) {
        const [width, height] = videoData.resolution.split('x').map(Number);

        if (width < 720 || height < 1280) {
          issues.push(`Resolution too low: ${videoData.resolution} (minimum: ${this.instagramSpecs.minResolution})`);
        } else if (width !== 1080 || height !== 1920) {
          warnings.push(`Resolution not optimal: ${videoData.resolution} (recommended: ${this.instagramSpecs.resolution})`);
        }
      }

      // Check format
      if (videoData.format && !this.instagramSpecs.formats.includes(videoData.format.toLowerCase())) {
        issues.push(`Unsupported format: ${videoData.format} (supported: ${this.instagramSpecs.formats.join(', ')})`);
      }

      // Check FPS
      if (videoData.fps && !this.instagramSpecs.fps.includes(videoData.fps)) {
        warnings.push(`Non-standard FPS: ${videoData.fps} (recommended: ${this.instagramSpecs.recommendedFps})`);
      }

      // Check file size
      if (videoData.fileSizeMB && videoData.fileSizeMB > this.instagramSpecs.maxFileSize) {
        issues.push(`File too large: ${videoData.fileSizeMB}MB (maximum: ${this.instagramSpecs.maxFileSize}MB)`);
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
        specs: this.instagramSpecs,
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
   * Optimize caption for Instagram audience
   */
  optimizeCaption(captionData) {
    try {
      const { caption, story, spiciness = 1 } = captionData;

      logger.info('Optimizing caption for Instagram', {
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

      // Instagram caption limit (2200 chars, but 150-200 is optimal)
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
      const ctaKeywords = ['link in bio', 'follow', 'comment', 'share', 'save', 'blush'];
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
        analysis.improvements.push('Consider using subtle language for Instagram guidelines compliance');
      }

      // Analyze structure
      const sentences = optimizedCaption.split(/[.!?]+/).filter(s => s.trim().length > 0);
      if (sentences.length > 3) {
        analysis.improvements.push(`Consider breaking into ${sentences.length} shorter sentences for readability`);
      }

      // Instagram-specific: Check for emojis (Instagram audiences love emojis)
      const emojiCount = (optimizedCaption.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu) || []).length;
      if (emojiCount < 2) {
        analysis.improvements.push('Add 2-3 emojis to make caption more engaging');
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
   * Get Instagram-specific hashtags
   */
  getInstagramHashtags(options = {}) {
    try {
      const { count = 10, category = 'romance', spiciness = 1 } = options;

      logger.info('Generating Instagram hashtags', { count, category, spiciness });

      // Base Instagram hashtags
      const baseHashtags = [
        '#bookstagram', '#bookrecommendation', '#reading', '#booklover',
        '#romancebooks', '#mustread', '#tbrlist', '#bookcommunity',
      ];

      // Category-specific hashtags
      const categoryHashtags = {
        romance: ['#romancereads', '#lovestory', '#bookstagramfeatures', '#romancereaders'],
        contemporary: ['#contemporaryromance', '#modernromance', '#realisticfiction', '#booksofinstagram'],
        historical: ['#historicalromance', '#periodromance', '#historicalfiction', '#classicromance'],
        fantasy: ['#fantasyromance', '#paranormalromance', '#magicalromance', '#fantasybooks'],
        scifi: ['#scifiromance', '#scifibooks', '#futurromance', '#scififantasy'],
      };

      // Spiciness-specific hashtags
      const spicinessHashtags = {
        0: ['#sweetromance', '#cleanromance', '#wholesomeromance', '#squeakyclean'],
        1: ['#romancenovel', '#romancereader', '#bookworm', '#tbr'],
        2: ['#spicybooks', '#romancebooks', '#steamyromance', '#hotreads'],
        3: ['#darkromance', '#spicybook', '#romance', '#romancereads'],
      };

      // Instagram-specific community hashtags
      const communityHashtags = [
        '#booksta', '#igreads', '#instabooks', '#bookish',
        '#bookishfeatures', '#currentlyreading', '#bookphotography',
      ];

      let hashtags = [...baseHashtags];

      // Add category hashtags
      if (categoryHashtags[category]) {
        hashtags.push(...categoryHashtags[category]);
      }

      // Add spiciness hashtags
      if (spicinessHashtags[spiciness]) {
        hashtags.push(...spicinessHashtags[spiciness]);
      }

      // Add community hashtags
      hashtags.push(...communityHashtags);

      // Remove duplicates and limit
      const uniqueHashtags = [...new Set(hashtags)];
      const selectedHashtags = uniqueHashtags.slice(0, count);

      logger.info('Instagram hashtags generated', {
        count: selectedHashtags.length,
        category,
        spiciness
      });

      return {
        success: true,
        hashtags: selectedHashtags,
        count: selectedHashtags.length,
        recommended: 5, // Instagram recommends 5-10 hashtags
        optimal: 10, // But 10-15 works well
        max: 30, // Instagram allows up to 30 hashtags
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error generating Instagram hashtags', {
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
   * Verify Reels-compatible format (9:16 aspect ratio)
   */
  verifyAspectRatio(videoData) {
    try {
      const { width, height, aspectRatio } = videoData;

      logger.info('Verifying aspect ratio for Instagram Reels', { width, height, aspectRatio });

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

      // Check if 9:16 (0.5625) for Instagram Reels
      const reelsRatio = 9 / 16;
      const tolerance = 0.01;
      const ratioDiff = Math.abs(calculatedRatio - reelsRatio);

      isValid = ratioDiff <= tolerance;

      // Additional checks
      const isVertical = calculatedRatio < 1;
      const isExact = ratioDiff === 0;

      let message = isValid
        ? 'Valid 9:16 vertical aspect ratio for Instagram Reels'
        : `Invalid aspect ratio: ${calculatedRatio.toFixed(4)} (expected: ${reelsRatio.toFixed(4)} for Reels)`;

      logger.info('Aspect ratio verification complete', {
        isValid,
        calculatedRatio: calculatedRatio.toFixed(4),
        expectedRatio: reelsRatio.toFixed(4),
        difference: ratioDiff.toFixed(4)
      });

      return {
        success: true,
        isValid,
        isVertical,
        isExact,
        calculatedRatio: calculatedRatio.toFixed(4),
        expectedRatio: '9:16',
        expectedDecimal: reelsRatio.toFixed(4),
        difference: ratioDiff.toFixed(4),
        message,
        platform: 'Instagram Reels',
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
   * Check video duration under 90 seconds
   */
  verifyDuration(videoData) {
    try {
      const { duration } = videoData;

      logger.info('Verifying video duration for Instagram Reels', { duration });

      if (!duration) {
        return {
          success: false,
          error: 'Duration is required',
          isValid: false
        };
      }

      const issues = [];
      const warnings = [];

      // Check minimum duration
      if (duration < this.instagramSpecs.minDuration) {
        issues.push(`Video too short: ${duration}s (minimum: ${this.instagramSpecs.minDuration}s)`);
      }

      // Check maximum duration (Instagram Reels allows up to 90 seconds)
      if (duration > this.instagramSpecs.maxDuration) {
        issues.push(`Video too long: ${duration}s (maximum: ${this.instagramSpecs.maxDuration}s for Reels)`);
      }

      // Check optimal duration
      if (duration > this.instagramSpecs.recommendedDuration * 2) {
        warnings.push(`Video longer than optimal: ${duration}s (recommended: ${this.instagramSpecs.recommendedDuration}s)`);
      }

      const isValid = issues.length === 0;
      const isOptimal = duration === this.instagramSpecs.recommendedDuration;

      let message = isValid
        ? (isOptimal
          ? `Optimal duration: ${duration}s (exactly ${this.instagramSpecs.recommendedDuration}s recommended)`
          : `Valid duration: ${duration}s (within 3-90s range)`)
        : 'Duration validation failed';

      logger.info('Duration verification complete', {
        isValid,
        isOptimal,
        duration,
        issues: issues.length,
        warnings: warnings.length
      });

      return {
        success: true,
        isValid,
        isOptimal,
        duration,
        minDuration: this.instagramSpecs.minDuration,
        maxDuration: this.instagramSpecs.maxDuration,
        recommendedDuration: this.instagramSpecs.recommendedDuration,
        issues,
        warnings,
        message,
        platform: 'Instagram Reels',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error verifying duration', {
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
   * Comprehensive optimization for Instagram Reels content
   * Combines all optimization steps
   */
  optimizeForInstagram(contentData) {
    try {
      logger.info('Starting comprehensive Instagram optimization', {
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
      results.optimizations.hashtags = this.getInstagramHashtags({
        count: 10,
        category: contentData.story?.category || 'romance',
        spiciness: contentData.spiciness || 1
      });

      // Step 5: Verify Reels-compatible format
      if (contentData.video) {
        results.optimizations.aspectRatio = this.verifyAspectRatio(contentData.video);
        results.optimizations.duration = this.verifyDuration(contentData.video);
      }

      // Overall assessment
      const isValid = Object.values(results.optimizations).every(opt => opt.success !== false);

      results.summary = {
        isValid,
        stepsCompleted: Object.keys(results.optimizations).length,
        recommendations: this._generateRecommendations(results.optimizations)
      };

      logger.info('Instagram optimization complete', {
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

    if (optimizations.duration?.issues?.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'duration',
        message: 'Fix duration issues',
        details: optimizations.duration.issues
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
      service: 'instagram-optimization',
      status: 'ok',
      timestamp: new Date().toISOString(),
      capabilities: {
        trendingAudioTracks: this.trendingAudio.length,
        videoSpecs: Object.keys(this.instagramSpecs).length,
        audienceStrategies: Object.keys(this.audienceStrategies).length,
        contentPatterns: Object.keys(this.contentPatterns).length,
        supportedCategories: ['romance', 'contemporary', 'historical', 'fantasy', 'scifi'],
        spicinessLevels: [0, 1, 2, 3],
        maxDuration: 90, // Instagram Reels allows 90 seconds
        optimizations: [
          'trending_audio',
          'video_validation',
          'caption_optimization',
          'hashtag_generation',
          'aspect_ratio_verification',
          'duration_verification'
        ]
      }
    };
  }
}

export default new InstagramOptimizationService();
