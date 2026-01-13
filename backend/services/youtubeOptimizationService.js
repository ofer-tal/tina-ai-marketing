import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'youtube-optimization' },
  transports: [
    new winston.transports.File({ filename: 'logs/youtube-optimization-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/youtube-optimization.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

/**
 * YouTube Shorts Optimization Service
 * Optimizes content for YouTube Shorts platform requirements and trends
 */
class YoutubeOptimizationService {
  constructor() {
    // YouTube Shorts trending audio tracks (simulated - would integrate YouTube API in production)
    this.trendingAudio = [
      { id: 'yt_trending_1', title: 'Shorts Romance Beat', duration: 15, popularity: 96 },
      { id: 'yt_trending_2', title: 'Viral Shorts Sound', duration: 30, popularity: 93 },
      { id: 'yt_trending_3', title: 'Dreamy Story Vibes', duration: 20, popularity: 90 },
      { id: 'yt_trending_4', title: 'Book Community Hit', duration: 25, popularity: 88 },
      { id: 'yt_trending_5', title: 'Romance Short', duration: 18, popularity: 86 },
      { id: 'yt_trending_6', title: 'Page Turner Sound', duration: 22, popularity: 84 },
      { id: 'yt_trending_7', title: 'BookTube Favorite', duration: 28, popularity: 82 },
      { id: 'yt_trending_8', title: 'Reading Mood Shorts', duration: 16, popularity: 80 },
      { id: 'yt_trending_9', title: 'Story Hook Audio', duration: 24, popularity: 78 },
      { id: 'yt_trending_10', title: 'Viral Romance Beat', duration: 19, popularity: 76 },
    ];

    // YouTube Shorts video specifications
    this.youtubeSpecs = {
      aspectRatio: '9:16',
      resolution: '1080x1920',
      minResolution: '720x1280',
      maxDuration: 60, // seconds (YouTube Shorts limit)
      recommendedDuration: 15, // seconds (optimal for Shorts retention)
      minDuration: 1, // seconds (Shorts can be very short)
      maxFileSize: 256, // MB (recommended limit)
      formats: ['mp4', 'mov', 'mpeg', 'avi', 'flv'],
      fps: [24, 25, 30, 60],
      recommendedFps: 30,
      codec: 'h264',
      audioCodec: 'aac',
      bitrate: '8-10 Mbps (recommended)',
      audioBitrate: '128-192 kbps',
    };

    // YouTube Shorts audience optimization strategies
    this.audienceStrategies = {
      hook: {
        attentionSpan: '1-2 seconds (shorter than other platforms)',
        strategies: [
          'Immediate visual hook in first frame',
          'Start mid-action or dialogue',
          'Use text overlay immediately',
          'Create instant curiosity',
          'Use trending Shorts audio',
          'Fast-paced editing required',
        ]
      },
      pacing: {
        recommended: 'Very fast-paced',
        cuts: 'Every 1-2 seconds',
        transitions: 'Quick cuts and jumps',
        text: 'Large, readable text overlays',
        audio: 'Music-driven editing',
      },
      engagement: {
        cta: [
          'Watch the full story on Blush',
          'Subscribe for more romance',
          'Check the link in bio',
          'Follow for daily book recs',
          'Share this with your friends',
        ],
        interactive: [
          'Use engagement buttons (like, comment, share)',
          'Ask questions in title/text',
          'Create series content',
          'Use popular hashtags',
          'Respond to comments with new Shorts',
        ]
      }
    };

    // YouTube Shorts-specific content patterns
    this.contentPatterns = {
      romance: {
        hooks: [
          'This scene changed my life',
          'Nobody talks about this book enough',
          'I stayed up all night reading this',
          'If you love [trope], read this',
          'This book ruined me (in a good way)',
          'POV: You\'re obsessed with this story',
        ],
        keywords: [
          'BookTuber', 'ShortsBooks', 'RomanceBooks', 'BookRecommendation',
          'ReadingCommunity', 'BookCommunity', 'MustRead', 'TBR',
          'BookLover', 'StoryTime', 'Shorts', 'FYP',
          'BooksOfYouTube', 'ReadingShorts',
        ],
        categories: {
          contemporary: [
            '#ContemporaryRomance', '#RomanceNovel', '#LoveStory',
            '#ModernRomance', '#BookRecommendation', '#MustRead',
          ],
          fantasy: [
            '#FantasyRomance', '#Romantasy', '#MagicAndLove',
            '#FantasyBooks', '#BookCommunity', '#ReadingCommunity',
          ],
          historical: [
            '#HistoricalRomance', '#PeriodRomance', '#HistoricalFiction',
            '#RegencyRomance', '#RomanceNovel', '#ClassicRomance',
          ],
          spicy: [
            '#SpicyBook', '#RomanceBooks', '#BookRecommendation',
            '#SteamyRomance', '#HotRead', '#RomanceReader',
          ],
          sweet: [
            '#SweetRomance', '#CleanRomance', '#WholesomeRomance',
            '#FeelGoodRomance', '#Heartwarming', '#CozyRead',
          ],
        }
      }
    };

    // YouTube Shorts title and description optimization
    this.titleOptimization = {
      maxLength: 100,
      optimalLength: 50,
      strategies: [
        'Use click-worthy hooks',
        'Include emotional words',
        'Add numbers when relevant',
        'Use capitalization for emphasis',
        'Include relevant keywords',
        'Create curiosity gaps',
      ],
      examples: [
        'This Book RUINED Me 💔😭',
        'I Read This At 3am And Cried',
        'The Scene That Changed EVERYTHING',
        'Why This Romance Book Is VIRAL',
        'POV: You Found Your New Obsession',
      ]
    };

    // YouTube Shorts description optimization
    this.descriptionOptimization = {
      maxLength: 5000,
      optimalLength: 200,
      structure: [
        'Hook or question (1-2 sentences)',
        'Book summary (2-3 sentences)',
        'Why you should read it (1-2 sentences)',
        'Call to action',
        'Hashtags',
      ],
      elements: {
        hook: 'Grab attention in first line',
        summary: 'Brief plot overview without spoilers',
        recommendation: 'Why this book stands out',
        cta: 'Direct viewers to Blush app',
        hashtags: '3-5 relevant hashtags maximum',
      }
    };

    // YouTube Shorts hashtag strategy
    this.hashtagStrategy = {
      maxHashtags: 15, // YouTube allows more, but 3-5 is optimal
      recommendedHashtags: 5,
      position: 'end of description',
      mix: [
        'Broad: #Shorts, #Books, #Reading',
        'Niche: #RomanceBooks, #BookTuber',
        'Specific: #ContemporaryRomance, #SpicyBooks',
        'Trending: #ViralBooks, #BookCommunity',
      ],
      categories: {
        base: ['#Shorts', '#Books', '#Reading', '#BookRecommendation', '#BookTuber'],
        contemporary: ['#ContemporaryRomance', '#RomanceNovel', '#ModernRomance', '#LoveStory'],
        fantasy: ['#FantasyRomance', '#Romantasy', '#FantasyBooks', '#MagicAndLove'],
        historical: ['#HistoricalRomance', '#PeriodRomance', '#RegencyRomance'],
        spicy: ['#SpicyBook', '#SteamyRomance', '#RomanceBooks', '#HotRead'],
        sweet: ['#SweetRomance', '#CleanRomance', '#WholesomeRomance', '#CozyRead'],
        lgbtq: ['#LGBTQBooks', '#QueerRomance', '#RainbowBooks', '#DiverseBooks'],
      },
      spiciness: {
        1: ['#SweetRomance', '#CleanRomance', '#Wholesome', '#FeelGood'],
        2: ['#RomanceNovel', '#LoveStory', '#ContemporaryRomance', '#ModernRomance'],
        3: ['#SpicyBook', '#SteamyRomance', '#HotRead', '#RomanceBooks'],
      }
    };

    // YouTube Shorts best practices
    this.bestPractices = {
      posting: {
        frequency: 'Daily recommended',
        bestTimes: ['2-4pm', '7-9pm'], // Weekdays
        bestDays: ['Thursday', 'Friday', 'Saturday'],
        consistency: 'Post at same time daily',
      },
      content: {
        firstFrame: 'Critical for retention',
        loop: 'Make videos loop seamlessly',
        captions: 'Always include captions',
        text: 'Use large, readable text',
        pacing: 'Fast cuts every 1-2 seconds',
        music: 'Use trending audio',
      },
      optimization: {
        thumbnails: 'Auto-generated, focus on first frame',
        titles: 'Click-worthy and descriptive',
        descriptions: 'Keyword-rich with CTAs',
        hashtags: '3-5 relevant hashtags',
      },
      audience: {
        demographics: 'BookTube community',
        behavior: 'Quick scrolling, low attention',
        retention: 'Drop-off after 15 seconds',
        engagement: 'Like, comment, subscribe',
      }
    };

    // YouTube Shorts-specific features
    this.features = {
      loops: 'Videos should loop seamlessly',
      audio: 'Can use any audio (music library)',
      effects: 'Built-in effects and filters',
      text: 'Text overlays and captions',
      stitching: 'Remix and stitch other Shorts',
      comments: 'Video replies to comments',
      series: 'Create episodic content',
      remix: 'Remix popular content',
    };
  }

  /**
   * Check YouTube Shorts trending audio
   * Returns trending audio tracks sorted by popularity
   */
  getTrendingAudio(options = {}) {
    try {
      const { limit = 5, category = 'all' } = options;

      logger.info('Fetching YouTube Shorts trending audio', { limit, category });

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
   * Validate and adjust video format for YouTube Shorts specs
   */
  validateVideoFormat(videoData) {
    try {
      logger.info('Validating video for YouTube Shorts specs', {
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
      } else if (videoData.duration < this.youtubeSpecs.minDuration) {
        issues.push(`Video too short: ${videoData.duration}s (minimum: ${this.youtubeSpecs.minDuration}s)`);
      } else if (videoData.duration > this.youtubeSpecs.maxDuration) {
        issues.push(`Video too long: ${videoData.duration}s (maximum: ${this.youtubeSpecs.maxDuration}s for Shorts)`);
      } else if (videoData.duration > this.youtubeSpecs.recommendedDuration * 2) {
        warnings.push(`Video longer than optimal: ${videoData.duration}s (recommended: ${this.youtubeSpecs.recommendedDuration}s for retention)`);
      } else if (videoData.duration !== this.youtubeSpecs.recommendedDuration) {
        recommendations.push(`Consider trimming to ${this.youtubeSpecs.recommendedDuration}s for optimal retention`);
      }

      // Check aspect ratio
      if (videoData.aspectRatio) {
        const [width, height] = videoData.aspectRatio.split(':').map(Number);
        const ratio = width / height;

        if (ratio !== 9/16) {
          issues.push(`Incorrect aspect ratio: ${videoData.aspectRatio} (required: 9:16 vertical for Shorts)`);
        }
      }

      // Check resolution
      if (videoData.resolution) {
        const [width, height] = videoData.resolution.split('x').map(Number);

        if (width < 720 || height < 1280) {
          issues.push(`Resolution too low: ${videoData.resolution} (minimum: ${this.youtubeSpecs.minResolution})`);
        } else if (width !== 1080 || height !== 1920) {
          warnings.push(`Resolution not optimal: ${videoData.resolution} (recommended: ${this.youtubeSpecs.resolution})`);
        }
      }

      // Check format
      if (videoData.format && !this.youtubeSpecs.formats.includes(videoData.format.toLowerCase())) {
        issues.push(`Unsupported format: ${videoData.format} (supported: ${this.youtubeSpecs.formats.join(', ')})`);
      }

      // Check FPS
      if (videoData.fps && !this.youtubeSpecs.fps.includes(videoData.fps)) {
        warnings.push(`Non-standard FPS: ${videoData.fps} (recommended: ${this.youtubeSpecs.recommendedFps})`);
      }

      // Check file size
      if (videoData.fileSizeMB && videoData.fileSizeMB > this.youtubeSpecs.maxFileSize) {
        issues.push(`File too large: ${videoData.fileSizeMB}MB (maximum: ${this.youtubeSpecs.maxFileSize}MB)`);
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
        specs: this.youtubeSpecs,
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
   * Optimize title for YouTube Shorts
   */
  optimizeTitle(titleData) {
    try {
      const { title, story, spiciness = 1 } = titleData;

      logger.info('Optimizing title for YouTube Shorts', {
        titleLength: title?.length,
        story: story?.title,
        spiciness
      });

      let optimizedTitle = title || '';
      const analysis = {
        originalLength: optimizedTitle.length,
        improvements: [],
        warnings: []
      };

      const maxLength = this.titleOptimization.maxLength;
      const optimalLength = this.titleOptimization.optimalLength;

      // Check length
      if (optimizedTitle.length > maxLength) {
        analysis.warnings.push(`Title too long: ${optimizedTitle.length} chars (maximum: ${maxLength})`);
        optimizedTitle = optimizedTitle.substring(0, maxLength - 3) + '...';
      }

      if (optimizedTitle.length > optimalLength * 1.5) {
        analysis.improvements.push(`Consider shortening to ${optimalLength} chars for better click-through`);
      }

      // Check for emotional words
      const emotionalWords = ['ruined', 'changed', 'cried', 'obsessed', 'viral', 'everything', 'life'];
      const hasEmotional = emotionalWords.some(word =>
        optimizedTitle.toLowerCase().includes(word)
      );

      if (!hasEmotional) {
        analysis.improvements.push('Add emotional words to increase click-through rate');
      }

      // Check for hooks
      const hooks = ['POV:', 'Nobody talks about', 'Why', 'This', 'If you love'];
      const hasHook = hooks.some(hook => optimizedTitle.includes(hook));

      if (!hasHook) {
        analysis.improvements.push('Start with a hook phrase (POV:, Nobody talks about, Why)');
      }

      // Check for capitalization
      const hasCaps = /[A-Z]{2,}/.test(optimizedTitle);
      if (!hasCaps) {
        analysis.improvements.push('Use CAPITALIZATION for emphasis on key words');
      }

      // Suggest title if missing
      if (!optimizedTitle && story) {
        const suggestedTitles = [
          `POV: You're Reading "${story.title}" At 3am`,
          `Why "${story.title}" Is Going VIRAL`,
          `This Book RUINED Me 💔😭`,
          `"${story.title}" Changed Everything`,
          `I Can't Stop Thinking About This Scene`,
        ];

        optimizedTitle = suggestedTitles[0];
        analysis.improvements.push('Generated title from story name');
      }

      analysis.finalLength = optimizedTitle.length;
      analysis.isOptimal = analysis.finalLength <= optimalLength;

      logger.info('Title optimization complete', {
        originalLength: analysis.originalLength,
        finalLength: analysis.finalLength,
        isOptimal: analysis.isOptimal
      });

      return {
        success: true,
        title: optimizedTitle,
        analysis,
        examples: this.titleOptimization.examples,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error optimizing title', {
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message,
        title: titleData.title || '',
        analysis: { improvements: [], warnings: [] }
      };
    }
  }

  /**
   * Optimize description for YouTube Shorts
   */
  optimizeDescription(descriptionData) {
    try {
      const { description, story, spiciness = 1 } = descriptionData;

      logger.info('Optimizing description for YouTube Shorts', {
        descriptionLength: description?.length,
        story: story?.title,
        spiciness
      });

      let optimizedDescription = description || '';
      const analysis = {
        originalLength: optimizedDescription.length,
        improvements: [],
        warnings: [],
        missingElements: []
      };

      const optimalLength = this.descriptionOptimization.optimalLength;
      const maxLength = this.descriptionOptimization.maxLength;

      // Check length
      if (optimizedDescription.length > maxLength) {
        analysis.warnings.push(`Description too long: ${optimizedDescription.length} chars (maximum: ${maxLength})`);
      }

      if (optimizedDescription.length > optimalLength * 2) {
        analysis.improvements.push(`Consider shortening to ${optimalLength} chars for better engagement`);
      }

      // Check for hook
      const hasHook = optimizedDescription.split('\n')[0].length < 100;
      if (!hasHook && optimizedDescription.length > 0) {
        analysis.improvements.push('Start with a short, engaging hook');
      }

      // Check for CTA
      const ctaPhrases = ['link in bio', 'subscribe', 'watch more', 'check out'];
      const hasCTA = ctaPhrases.some(cta =>
        optimizedDescription.toLowerCase().includes(cta)
      );

      if (!hasCTA) {
        analysis.missingElements.push('Call to action (e.g., "Watch more on Blush")');
      }

      // Check for hashtags
      const hashtagCount = (optimizedDescription.match(/#/g) || []).length;
      if (hashtagCount === 0) {
        analysis.missingElements.push('Hashtags (add 3-5 relevant hashtags)');
      } else if (hashtagCount > this.hashtagStrategy.recommendedHashtags) {
        analysis.warnings.push(`Too many hashtags: ${hashtagCount} (recommended: ${this.hashtagStrategy.recommendedHashtags})`);
      }

      // Generate description if missing
      if (!optimizedDescription && story) {
        const categoryKey = story.category?.toLowerCase() || 'contemporary';
        const categoryHashtags = this.hashtagStrategy.categories[categoryKey] ||
                               this.hashtagStrategy.categories.contemporary;

        optimizedDescription = `This scene from "${story.title}" absolutely RUINED me 💔😭

I stayed up all night reading this and I have zero regrets. The chemistry? Off the charts. The tension? Unbearable.

If you love ${story.category || 'romance'} books, you NEED to read this.

📱 Read the full story on Blush app
👍 Like & subscribe for more book recs!

${categoryHashtags.slice(0, 5).join(' ')}`;

        analysis.improvements.push('Generated description from story data');
      }

      analysis.finalLength = optimizedDescription.length;
      analysis.hasCTA = hasCTA;
      analysis.hashtagCount = hashtagCount;

      logger.info('Description optimization complete', {
        originalLength: analysis.originalLength,
        finalLength: analysis.finalLength,
        hasCTA: analysis.hasCTA
      });

      return {
        success: true,
        description: optimizedDescription,
        analysis,
        structure: this.descriptionOptimization.structure,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error optimizing description', {
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message,
        description: descriptionData.description || '',
        analysis: { improvements: [], warnings: [] }
      };
    }
  }

  /**
   * Generate YouTube Shorts hashtags
   */
  getYoutubeHashtags(hashtagData) {
    try {
      const { category, spiciness = 1, limit = 5 } = hashtagData;

      logger.info('Generating YouTube Shorts hashtags', {
        category,
        spiciness,
        limit
      });

      let hashtags = [];

      // Add base hashtags
      hashtags.push(...this.hashtagStrategy.categories.base.slice(0, 2));

      // Add category-specific hashtags
      if (category) {
        const categoryKey = category.toLowerCase();
        const categoryHashtags = this.hashtagStrategy.categories[categoryKey] ||
                                 this.hashtagStrategy.categories.contemporary;
        hashtags.push(...categoryHashtags.slice(0, 3));
      }

      // Add spiciness-specific hashtags
      const spicinessLevel = Math.min(Math.max(spiciness, 1), 3);
      if (this.hashtagStrategy.spiciness[spicinessLevel]) {
        hashtags.push(...this.hashtagStrategy.spiciness[spicinessLevel].slice(0, 2));
      }

      // Remove duplicates and limit
      hashtags = [...new Set(hashtags)].slice(0, limit);

      logger.info('Hashtags generated', {
        count: hashtags.length,
        hashtags: hashtags.join(', ')
      });

      return {
        success: true,
        hashtags,
        count: hashtags.length,
        strategy: this.hashtagStrategy,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error generating hashtags', {
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
   * Verify aspect ratio for YouTube Shorts
   */
  verifyAspectRatio(videoData) {
    try {
      logger.info('Verifying aspect ratio for YouTube Shorts', {
        width: videoData.width,
        height: videoData.height,
        aspectRatio: videoData.aspectRatio
      });

      const result = {
        isValid: false,
        currentRatio: null,
        recommendedRatio: '9:16',
        isVertical: false,
        adjustments: []
      };

      // Calculate aspect ratio from dimensions
      if (videoData.width && videoData.height) {
        const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
        const divisor = gcd(videoData.width, videoData.height);
        result.currentRatio = `${videoData.width / divisor}:${videoData.height / divisor}`;

        // Check if vertical
        result.isVertical = videoData.height > videoData.width;

        // Check if 9:16
        const ratio = videoData.width / videoData.height;
        const targetRatio = 9 / 16;

        if (Math.abs(ratio - targetRatio) < 0.01) {
          result.isValid = true;
        } else {
          result.adjustments.push(`Resize to 9:16 aspect ratio (1080x1920 recommended)`);
        }
      }

      // Check provided aspect ratio
      if (videoData.aspectRatio) {
        const [width, height] = videoData.aspectRatio.split(':').map(Number);
        const ratio = width / height;

        if (ratio === 9/16) {
          result.isValid = true;
        } else {
          result.adjustments.push(`Change aspect ratio from ${videoData.aspectRatio} to 9:16`);
        }
      }

      logger.info('Aspect ratio verification complete', {
        isValid: result.isValid,
        currentRatio: result.currentRatio
      });

      return {
        success: true,
        ...result,
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
   * Comprehensive optimization for YouTube Shorts
   * Combines title, description, hashtags, and format validation
   */
  optimizeForYoutube(contentData) {
    try {
      const {
        video,
        title,
        description,
        story,
        hashtags,
        spiciness = 1
      } = contentData;

      logger.info('Starting comprehensive YouTube Shorts optimization', {
        hasVideo: !!video,
        hasTitle: !!title,
        hasDescription: !!description,
        hasStory: !!story,
        spiciness
      });

      const optimization = {
        video: null,
        title: null,
        description: null,
        hashtags: null,
        overallScore: 0,
        recommendations: []
      };

      // Step 1: Validate video format
      if (video) {
        const videoValidation = this.validateVideoFormat(video);
        optimization.video = videoValidation;

        if (!videoValidation.isValid) {
          optimization.recommendations.push('Fix video format issues before posting');
        } else if (videoValidation.warnings.length > 0) {
          optimization.recommendations.push(...videoValidation.warnings);
        }
      }

      // Step 2: Optimize title
      const titleOptimization = this.optimizeTitle({ title, story, spiciness });
      optimization.title = titleOptimization;

      if (!titleOptimization.title) {
        optimization.recommendations.push('Add a compelling title for better click-through');
      } else if (titleOptimization.analysis.improvements.length > 0) {
        optimization.recommendations.push(...titleOptimization.analysis.improvements);
      }

      // Step 3: Optimize description
      const descriptionOptimization = this.optimizeDescription({ description, story, spiciness });
      optimization.description = descriptionOptimization;

      if (descriptionOptimization.analysis.missingElements.length > 0) {
        optimization.recommendations.push(...descriptionOptimization.analysis.missingElements);
      }

      // Step 4: Generate hashtags
      const category = story?.category || 'contemporary';
      const hashtagResult = this.getYoutubeHashtags({
        category,
        spiciness,
        limit: this.hashtagStrategy.recommendedHashtags
      });
      optimization.hashtags = hashtagResult;

      // Calculate overall score
      let score = 0;
      if (optimization.video?.isValid) score += 25;
      if (optimization.title?.title) score += 25;
      if (optimization.description?.description) score += 25;
      if (optimization.hashtags?.hashtags?.length > 0) score += 25;

      optimization.overallScore = score;
      optimization.isReady = score >= 75;

      // Add platform-specific recommendations
      optimization.recommendations.push('Ensure first frame is engaging (critical for Shorts retention)');
      optimization.recommendations.push('Add captions for accessibility and better engagement');
      optimization.recommendations.push('Make video loop seamlessly for better retention');

      logger.info('YouTube Shorts optimization complete', {
        overallScore: optimization.overallScore,
        isReady: optimization.isReady
      });

      return {
        success: true,
        optimization,
        platform: 'youtube_shorts',
        specs: this.youtubeSpecs,
        bestPractices: this.bestPractices,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error in comprehensive optimization', {
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message,
        optimization: null
      };
    }
  }

  /**
   * Health check for the service
   */
  healthCheck() {
    return {
      status: 'healthy',
      service: 'youtube-optimization',
      timestamp: new Date().toISOString(),
      features: {
        trendingAudio: true,
        videoValidation: true,
        titleOptimization: true,
        descriptionOptimization: true,
        hashtagGeneration: true,
        aspectRatioVerification: true,
        comprehensiveOptimization: true,
      },
      specs: this.youtubeSpecs,
      version: '1.0.0'
    };
  }
}

const youtubeOptimizationService = new YoutubeOptimizationService();
export default youtubeOptimizationService;
