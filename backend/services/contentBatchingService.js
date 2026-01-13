import winston from 'winston';
import Story from '../models/Story.js';
import StoryBlacklist from '../models/StoryBlacklist.js';
import MarketingPost from '../models/MarketingPost.js';

// Create logger for content batching service
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'content-batching' },
  transports: [
    new winston.transports.File({ filename: 'logs/content-batching-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/content-batching.log' }),
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
 * Content Batching Service
 * Generates content in batches 1-2 days before scheduled posting
 *
 * Features:
 * - Batch size limits (3-5 posts per batch)
 * - Scheduling 1-2 days ahead
 * - Multi-platform support (TikTok, Instagram, YouTube Shorts)
 * - Draft status for review before posting
 * - Spiciness-aware content selection
 */
class ContentBatchingService {
  constructor() {
    // Configuration
    this.config = {
      minBatchSize: 3,
      maxBatchSize: 5,
      minDaysAhead: 1,
      maxDaysAhead: 2,
      defaultPostTimes: {
        tiktok: ['09:00', '15:00', '20:00'],
        instagram: ['08:00', '13:00', '19:00'],
        youtube_shorts: ['10:00', '16:00', '21:00']
      },
      platforms: ['tiktok', 'instagram', 'youtube_shorts']
    };

    this.isRunning = false;
    this.lastBatchResults = null;
  }

  /**
   * Generate a batch of content posts
   * Creates 3-5 posts scheduled 1-2 days ahead
   *
   * @param {object} options - Batch generation options
   * @returns {object} Batch generation results
   */
  async generateBatch(options = {}) {
    if (this.isRunning) {
      logger.warn('Content batching already in progress');
      return {
        success: false,
        error: 'Batch generation already in progress'
      };
    }

    this.isRunning = true;
    const startTime = Date.now();

    logger.info('Starting content batch generation', { options });

    try {
      // Step 1: Determine batch parameters
      const batchSize = this._determineBatchSize(options.batchSize);
      const daysAhead = this._determineDaysAhead(options.daysAhead);
      const platforms = options.platforms || this.config.platforms;

      logger.info('Batch parameters determined', {
        batchSize,
        daysAhead,
        platforms
      });

      // Step 2: Get scheduled times for posts
      const scheduledTimes = this._generateScheduledTimes(
        batchSize,
        daysAhead,
        platforms
      );

      logger.info('Scheduled times generated', {
        count: scheduledTimes.length,
        firstTime: scheduledTimes[0]?.scheduledAt,
        lastTime: scheduledTimes[scheduledTimes.length - 1]?.scheduledAt
      });

      // Step 3: Get stories for content generation
      const stories = await this._getStoriesForBatch(batchSize);

      if (!stories || stories.length === 0) {
        logger.warn('No stories available for batch generation');
        return {
          success: true,
          data: {
            postsCreated: 0,
            message: 'No stories available for batch generation'
          }
        };
      }

      logger.info('Stories retrieved for batch', {
        count: stories.length
      });

      // Step 4: Generate marketing posts from stories
      const posts = await this._createMarketingPosts(
        stories,
        scheduledTimes
      );

      // Step 5: Prepare results
      const results = {
        timestamp: new Date().toISOString(),
        postsCreated: posts.length,
        batchSize,
        daysAhead,
        posts: posts.map(post => ({
          id: post._id,
          title: post.title,
          platform: post.platform,
          status: post.status,
          scheduledAt: post.scheduledAt,
          storyName: post.storyName,
          storyCategory: post.storyCategory,
          storySpiciness: post.storySpiciness
        })),
        summary: {
          byPlatform: this._summarizeByPlatform(posts),
          byCategory: this._summarizeByCategory(posts),
          bySpiciness: this._summarizeBySpiciness(posts)
        }
      };

      const duration = Date.now() - startTime;
      logger.info('Content batch generation completed', {
        duration: `${duration}ms`,
        postsCreated: results.postsCreated,
        summary: results.summary
      });

      this.lastBatchResults = results;

      return {
        success: true,
        data: results
      };

    } catch (error) {
      logger.error('Content batch generation failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Determine batch size within allowed limits
   * @private
   */
  _determineBatchSize(requestedSize) {
    if (requestedSize) {
      return Math.max(
        this.config.minBatchSize,
        Math.min(requestedSize, this.config.maxBatchSize)
      );
    }

    // Random size between min and max for variety
    return Math.floor(
      Math.random() * (this.config.maxBatchSize - this.config.minBatchSize + 1)
    ) + this.config.minBatchSize;
  }

  /**
   * Determine days ahead within allowed limits
   * @private
   */
  _determineDaysAhead(requestedDays) {
    if (requestedDays) {
      return Math.max(
        this.config.minDaysAhead,
        Math.min(requestedDays, this.config.maxDaysAhead)
      );
    }

    // Random day between min and max
    return Math.random() > 0.5 ? this.config.maxDaysAhead : this.config.minDaysAhead;
  }

  /**
   * Generate scheduled times for posts
   * Spreads posts across optimal posting times
   * @private
   */
  _generateScheduledTimes(count, daysAhead, platforms) {
    const times = [];
    const now = new Date();
    const targetDate = new Date(now);

    // Add days ahead
    targetDate.setDate(targetDate.getDate() + daysAhead);

    // Distribute posts across platforms and times
    for (let i = 0; i < count; i++) {
      const platform = platforms[i % platforms.length];
      const postTimes = this.config.defaultPostTimes[platform];
      const timeIndex = Math.floor(i / platforms.length) % postTimes.length;
      const [hour, minute] = postTimes[timeIndex].split(':');

      const scheduledAt = new Date(targetDate);
      scheduledAt.setHours(parseInt(hour), parseInt(minute), 0, 0);

      // Ensure posts are spaced apart (minimum 2 hours)
      if (times.length > 0) {
        const lastTime = times[times.length - 1].scheduledAt;
        const minNextTime = new Date(lastTime);
        minNextTime.setHours(minNextTime.getHours() + 2);

        if (scheduledAt < minNextTime) {
          scheduledAt.setTime(minNextTime.getTime());
        }
      }

      times.push({
        platform,
        scheduledAt,
        timeSlot: postTimes[timeIndex]
      });
    }

    return times;
  }

  /**
   * Get stories for batch generation
   * @private
   */
  async _getStoriesForBatch(count) {
    try {
      // Get blacklisted story IDs
      const blacklistedIds = await StoryBlacklist.getActiveBlacklistedIds();

      // Query stories with filters
      const stories = await Story.find({
        userId: null,
        status: 'ready',
        category: { $ne: 'LGBTQ+' },
        _id: { $nin: blacklistedIds }
      })
        .sort({ spiciness: 1, createdAt: -1 })
        .limit(count * 2) // Get extra stories for variety
        .lean();

      // Prioritize by spiciness (prefer milder content)
      const mildStories = stories.filter(s => s.spiciness <= 1);
      const mediumStories = stories.filter(s => s.spiciness === 2);
      const spicyStories = stories.filter(s => s.spiciness === 3);

      // Mix spiciness levels (mostly mild, some medium, careful with spicy)
      const selectedStories = [];
      const mildCount = Math.ceil(count * 0.6);
      const mediumCount = Math.ceil(count * 0.3);
      const spicyCount = count - mildCount - mediumCount;

      selectedStories.push(...mildStories.slice(0, mildCount));
      selectedStories.push(...mediumStories.slice(0, mediumCount));
      if (spicyCount > 0) {
        selectedStories.push(...spicyStories.slice(0, spicyCount));
      }

      return selectedStories.slice(0, count);

    } catch (error) {
      logger.error('Failed to get stories for batch', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create marketing posts from stories
   * @private
   */
  async _createMarketingPosts(stories, scheduledTimes) {
    const posts = [];

    for (let i = 0; i < Math.min(stories.length, scheduledTimes.length); i++) {
      const story = stories[i];
      const { platform, scheduledAt } = scheduledTimes[i];

      try {
        // Generate basic caption and hashtags
        const caption = this._generateBasicCaption(story);
        const hashtags = this._generateBasicHashtags(story);

        // Create marketing post
        const post = new MarketingPost({
          title: this._generatePostTitle(story, platform),
          description: `Generated content for ${platform}`,
          platform,
          status: 'draft', // Draft status for review
          contentType: 'video',
          caption,
          hashtags,
          scheduledAt,
          storyId: story._id,
          storyName: story.title,
          storyCategory: story.category,
          storySpiciness: story.spiciness
        });

        await post.save();
        posts.push(post);

        logger.info('Marketing post created', {
          postId: post._id,
          platform,
          scheduledAt,
          story: story.title
        });

      } catch (error) {
        logger.error('Failed to create marketing post', {
          error: error.message,
          story: story.title,
          platform
        });
      }
    }

    return posts;
  }

  /**
   * Generate basic caption for post
   * @private
   */
  _generateBasicCaption(story) {
    const templates = [
      `📖 ${story.title} - a ${story.category} romance that will make your heart flutter ✨`,
      `You won't be able to put this one down! ${story.title} is now available 💕`,
      `Looking for your next obsession? Meet ${story.title} 📚🔥`,
      `The chemistry in ${story.title}? Absolutely electric ⚡`,
      `Warning: ${story.title} may cause sleepless nights 😴📖`
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Generate basic hashtags for post
   * @private
   */
  _generateBasicHashtags(story) {
    const baseHashtags = ['#romance', '#reading', '#bookrecommendation', '#blushapp'];
    const categoryHashtag = `#${story.category.replace(/\s+/g, '')}Romance`;

    return [...baseHashtags, categoryHashtag];
  }

  /**
   * Generate post title
   * @private
   */
  _generatePostTitle(story, platform) {
    const platformNames = {
      tiktok: 'TikTok',
      instagram: 'Instagram',
      youtube_shorts: 'YouTube Shorts'
    };

    return `${story.title} - ${platformNames[platform]} Content`;
  }

  /**
   * Summarize posts by platform
   * @private
   */
  _summarizeByPlatform(posts) {
    const summary = {};
    posts.forEach(post => {
      summary[post.platform] = (summary[post.platform] || 0) + 1;
    });
    return summary;
  }

  /**
   * Summarize posts by category
   * @private
   */
  _summarizeByCategory(posts) {
    const summary = {};
    posts.forEach(post => {
      summary[post.storyCategory] = (summary[post.storyCategory] || 0) + 1;
    });
    return summary;
  }

  /**
   * Summarize posts by spiciness
   * @private
   */
  _summarizeBySpiciness(posts) {
    const summary = { 0: 0, 1: 0, 2: 0, 3: 0 };
    posts.forEach(post => {
      summary[post.storySpiciness]++;
    });
    return summary;
  }

  /**
   * Get upcoming scheduled posts
   *
   * @param {number} days - Number of days ahead to look
   * @returns {array} Upcoming posts
   */
  async getUpcomingPosts(days = 7) {
    try {
      logger.info('Fetching upcoming posts', { days });

      const posts = await MarketingPost.getUpcoming(days);

      logger.info('Upcoming posts retrieved', {
        count: posts.length,
        days
      });

      return posts;

    } catch (error) {
      logger.error('Failed to get upcoming posts', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get posts scheduled within a date range
   *
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {array} Scheduled posts
   */
  async getScheduledInRange(startDate, endDate) {
    try {
      logger.info('Fetching posts in range', {
        startDate,
        endDate
      });

      const posts = await MarketingPost.getScheduledInRange(startDate, endDate);

      logger.info('Posts in range retrieved', {
        count: posts.length
      });

      return posts;

    } catch (error) {
      logger.error('Failed to get posts in range', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get batch generation status
   *
   * @returns {object} Status information
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastBatchResults: this.lastBatchResults ? {
        timestamp: this.lastBatchResults.timestamp,
        postsCreated: this.lastBatchResults.postsCreated,
        summary: this.lastBatchResults.summary
      } : null,
      config: this.config
    };
  }

  /**
   * Health check for the batching service
   *
   * @returns {object} Health status
   */
  healthCheck() {
    return {
      service: 'content-batching',
      status: 'ok',
      isRunning: this.isRunning,
      lastBatch: this.lastBatchResults?.timestamp || null,
      config: {
        minBatchSize: this.config.minBatchSize,
        maxBatchSize: this.config.maxBatchSize,
        minDaysAhead: this.config.minDaysAhead,
        maxDaysAhead: this.config.maxDaysAhead
      },
      timestamp: new Date().toISOString()
    };
  }
}

// Create singleton instance
const contentBatchingService = new ContentBatchingService();

export default contentBatchingService;
