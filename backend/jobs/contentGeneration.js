import cron from 'node-cron';
import winston from 'winston';
import Story from '../models/Story.js';
import StoryBlacklist from '../models/StoryBlacklist.js';

// Create logger for content generation job
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'content-generation' },
  transports: [
    new winston.transports.File({ filename: 'logs/content-generation-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/content-generation.log' }),
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
 * Content Generation Job
 * Selects stories from database for content generation
 *
 * Story Selection Criteria:
 * 1. userId = null (system stories only, no user-generated content)
 * 2. status = 'ready' (published and ready to use)
 * 3. category != 'LGBTQ+' (excluded for marketing)
 * 4. spiciness preference: prefer 1-2, careful with 3
 * 5. storyId not in blacklist
 */
class ContentGenerationJob {
  constructor() {
    this.isRunning = false;
    this.task = null;
    this.lastRun = null;
    this.lastRunResults = null;
  }

  /**
   * Main job execution - select stories for content generation
   */
  async execute(options = {}) {
    if (this.isRunning) {
      logger.warn('Content generation job already running, skipping');
      return null;
    }

    this.isRunning = true;
    const startTime = Date.now();

    logger.info('Starting content generation job', { options });

    try {
      // Step 1: Get blacklisted story IDs
      logger.info('Fetching blacklisted stories...');
      const blacklistedIds = await StoryBlacklist.getActiveBlacklistedIds();
      logger.info(`Found ${blacklistedIds.length} blacklisted stories`);

      // Step 2: Query stories with filters
      logger.info('Querying stories for marketing content generation...');

      const query = {
        userId: null, // Only system stories
        status: 'ready', // Only ready stories
        category: { $ne: 'LGBTQ+' }, // Exclude LGBTQ+ category
        _id: { $nin: blacklistedIds } // Exclude blacklisted stories
      };

      // Execute query with sorting
      // Sort by spiciness (ascending) to get milder content first
      // Then by createdAt (descending) to get newer stories
      const stories = await Story.find(query)
        .sort({ spiciness: 1, createdAt: -1 })
        .limit(10) // Get up to 10 stories
        .lean();

      logger.info(`Query executed`, {
        totalFound: stories.length,
        query: JSON.stringify(query)
      });

      // Step 3: Categorize by spiciness
      const mildStories = stories.filter(s => s.spiciness <= 1);
      const mediumStories = stories.filter(s => s.spiciness === 2);
      const spicyStories = stories.filter(s => s.spiciness === 3);

      logger.info('Stories categorized by spiciness', {
        mild: mildStories.length,
        medium: mediumStories.length,
        spicy: spicyStories.length
      });

      // Step 4: Prioritize stories for content generation
      // Priority order: mild (1) > medium (2) > spicy (3)
      const prioritizedStories = [
        ...mildStories,
        ...mediumStories,
        ...spicyStories
      ];

      // Step 5: Prepare results
      const results = {
        timestamp: new Date().toISOString(),
        totalStories: stories.length,
        blacklistedCount: blacklistedIds.length,
        stories: prioritizedStories.map(story => ({
          id: story._id,
          title: story.title,
          category: story.category,
          spiciness: story.spiciness,
          status: story.status,
          chapters: story.chapters?.length || 0,
          createdAt: story.createdAt,
          coverPath: story.coverPath,
          tags: story.tags || []
        })),
        summary: {
          mild: mildStories.length,
          medium: mediumStories.length,
          spicy: spicyStories.length,
          categories: this._categorizeByCategory(prioritizedStories)
        }
      };

      // Step 6: Log success
      const duration = Date.now() - startTime;
      logger.info('Content generation job completed', {
        duration: `${duration}ms`,
        storiesSelected: results.totalStories,
        distribution: results.summary
      });

      this.lastRun = new Date();
      this.lastRunResults = results;

      return results;

    } catch (error) {
      logger.error('Content generation job failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Categorize stories by category for summary
   */
  _categorizeByCategory(stories) {
    const categories = {};
    stories.forEach(story => {
      categories[story.category] = (categories[story.category] || 0) + 1;
    });
    return categories;
  }

  /**
   * Get a single story for content generation
   * Returns the highest priority story (mild, newer)
   */
  async getSingleStory() {
    logger.info('Getting single story for content generation');

    try {
      // Get blacklisted story IDs
      const blacklistedIds = await StoryBlacklist.getActiveBlacklistedIds();

      // Query for the best story
      const story = await Story.findOne({
        userId: null,
        status: 'ready',
        category: { $ne: 'LGBTQ+' },
        _id: { $nin: blacklistedIds }
      })
        .sort({ spiciness: 1, createdAt: -1 })
        .lean();

      if (!story) {
        logger.warn('No stories found for content generation');
        return null;
      }

      logger.info('Story selected for content generation', {
        id: story._id,
        title: story.title,
        category: story.category,
        spiciness: story.spiciness
      });

      return story;

    } catch (error) {
      logger.error('Failed to get story for content generation', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Verify story selection criteria (for testing)
   */
  async verifySelection(storyId) {
    logger.info('Verifying story selection', { storyId });

    const story = await Story.findById(storyId).lean();

    if (!story) {
      return {
        valid: false,
        reason: 'Story not found'
      };
    }

    const checks = {
      userId: story.userId === null,
      status: story.status === 'ready',
      category: story.category !== 'LGBTQ+'
    };

    // Check blacklist
    const blacklisted = await StoryBlacklist.findOne({
      storyId: storyId,
      isActive: true
    });

    checks.notBlacklisted = !blacklisted;

    const valid = Object.values(checks).every(v => v === true);

    return {
      valid,
      checks,
      story: {
        id: story._id,
        title: story.title,
        userId: story.userId,
        status: story.status,
        category: story.category,
        spiciness: story.spiciness
      }
    };
  }

  /**
   * Start scheduled job (runs daily at 6 AM)
   */
  startSchedule() {
    if (this.task) {
      logger.warn('Content generation job already scheduled');
      return;
    }

    // Run daily at 6:00 AM
    this.task = cron.schedule('0 6 * * *', async () => {
      logger.info('Scheduled content generation job triggered');
      await this.execute();
    }, {
      timezone: 'America/Los_Angeles' // PST/PDT
    });

    logger.info('Content generation job scheduled for daily 6:00 AM PST');
  }

  /**
   * Stop scheduled job
   */
  stopSchedule() {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('Content generation job stopped');
    }
  }

  /**
   * Get job status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      lastRunResults: this.lastRunResults ? {
        timestamp: this.lastRunResults.timestamp,
        totalStories: this.lastRunResults.totalStories,
        summary: this.lastRunResults.summary
      } : null,
      isScheduled: !!this.task
    };
  }

  /**
   * Get content tone guidelines based on spiciness level
   * This helps adjust caption and hashtag generation for appropriate tone
   *
   * @param {number} spiciness - Story spiciness level (0-3)
   * @returns {object} Tone guidelines for content generation
   */
  getContentToneGuidelines(spiciness) {
    const guidelines = {
      spiciness,
      tone: 'romantic',
      emojiStyle: 'moderate',
      keywords: [],
      restrictions: []
    };

    if (spiciness <= 1) {
      // Mild content - sweet, romantic, wholesome
      guidelines.tone = 'sweet romantic';
      guidelines.emojiStyle = 'light';
      guidelines.keywords = [
        'romance', 'love story', 'heartwarming', 'sweet',
        'butterflies', 'first love', 'tender', 'wholesome'
      ];
      guidelines.restrictions = [
        'Avoid overly suggestive language',
        'Keep content PG-13',
        'Focus on emotional connection rather than physical'
      ];
    } else if (spiciness === 2) {
      // Medium content - romantic, sexy, empowering
      guidelines.tone = 'romantic sexy';
      guidelines.emojiStyle = 'moderate';
      guidelines.keywords = [
        'spicy', 'romance', 'passionate', 'chemistry',
        'tension', 'desire', 'steamy', 'hot', 'romantic'
      ];
      guidelines.restrictions = [
        'Sex-positive and empowering',
        'Romantic and sensual but not explicit',
        'Focus on tension and chemistry',
        'Avoid graphic descriptions'
      ];
    } else if (spiciness === 3) {
      // Spicy content - careful handling needed
      guidelines.tone = 'suggestive romantic';
      guidelines.emojiStyle = 'minimal';
      guidelines.keywords = [
        'passionate', 'intense', 'forbidden', 'temptation',
        'desire', 'scandalous', 'bold'
      ];
      guidelines.restrictions = [
        'Careful with explicit content - keep it suggestive',
        'Focus on emotional intensity rather than graphic details',
        'Use double entendre and innuendo',
        'Avoid explicit descriptions',
        'Maintain romantic context',
        'Platform guidelines: ensure content meets TikTok/Instagram community standards'
      ];
    }

    logger.info('Content tone guidelines applied', {
      spiciness,
      tone: guidelines.tone,
      keywordCount: guidelines.keywords.length
    });

    return guidelines;
  }

  /**
   * Generate appropriate hashtags based on spiciness level
   *
   * @param {number} spiciness - Story spiciness level (0-3)
   * @param {string} category - Story category
   * @returns {string[]} Appropriate hashtags for the content
   */
  generateHashtags(spiciness, category = '') {
    const guidelines = this.getContentToneGuidelines(spiciness);

    // Base hashtags (always included)
    const baseHashtags = ['#romance', '#reading', '#bookrecommendation'];

    // Spiciness-specific hashtags
    const spicinessHashtags = guidelines.keywords.map(k => `#${k.replace(/\s+/g, '')}`);

    // Category-specific hashtags
    const categoryHashtags = [];
    if (category) {
      categoryHashtags.push(`#${category.replace(/\s+/g, '')}Romance`);
    }

    // Combine and deduplicate
    const allHashtags = [...baseHashtags, ...spicinessHashtags, ...categoryHashtags];
    return [...new Set(allHashtags)].slice(0, 15); // Max 15 hashtags
  }
}

// Create singleton instance
const contentGenerationJob = new ContentGenerationJob();

export default contentGenerationJob;
