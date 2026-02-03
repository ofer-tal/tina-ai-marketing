import schedulerService from '../services/scheduler.js';
import Story from '../models/Story.js';
import StoryBlacklist from '../models/StoryBlacklist.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('story-refresh', 'scheduler');

/**
 * Story Database Refresh Job
 *
 * Runs daily to refresh the available story pool for content generation
 * - Queries stories collection for new entries
 * - Filters by eligibility criteria
 * - Updates available story pool statistics
 * - Logs new story count and changes
 */
class StoryRefreshJob {
  constructor() {
    this.jobName = 'story-database-refresh';
    this.isRunning = false;
    this.lastRefreshStats = null;
  }

  /**
   * Execute the story refresh job
   * Queries the stories collection and updates available story pool
   */
  async execute() {
    if (this.isRunning) {
      logger.warn('Story refresh job already running, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting story database refresh');

      // Step 1: Get blacklisted story IDs
      const blacklistedIds = await StoryBlacklist.getActiveBlacklistedIds();
      logger.info(`Found ${blacklistedIds.length} blacklisted stories`);

      // Step 2: Query stories collection for eligible stories
      const eligibilityQuery = {
        userId: null, // Only system stories
        status: 'ready', // Only ready stories
        category: { $ne: 'LGBTQ+' }, // Exclude LGBTQ+ category
        _id: { $nin: blacklistedIds } // Exclude blacklisted stories
      };

      const eligibleStories = await Story.find(eligibilityQuery)
        .lean()
        .select('_id title category spiciness status createdAt chapters tags');

      logger.info(`Found ${eligibleStories.length} eligible stories in database`);

      // Step 3: Categorize stories by eligibility criteria
      const categorized = this._categorizeStories(eligibleStories);

      // Step 4: Calculate changes from last refresh
      const changes = this._calculateChanges(categorized);

      // Step 5: Update available story pool statistics
      const stats = {
        timestamp: new Date().toISOString(),
        totalEligible: eligibleStories.length,
        blacklisted: blacklistedIds.length,
        bySpiciness: categorized.bySpiciness,
        byCategory: categorized.byCategory,
        newStories: changes.newStories,
        removedStories: changes.removedStories,
        topCategories: categorized.topCategories
      };

      this.lastRefreshStats = stats;

      // Step 6: Log comprehensive refresh results
      logger.info('Story database refresh completed', {
        duration: `${Date.now() - startTime}ms`,
        totalEligible: stats.totalEligible,
        blacklisted: stats.blacklisted,
        spicinessBreakdown: stats.bySpiciness,
        categoryBreakdown: stats.byCategory,
        topCategories: stats.topCategories,
        changes: changes
      });

      // Log summary for easy reading
      this._logRefreshSummary(stats);

      return stats;

    } catch (error) {
      logger.error('Error in story refresh job', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Categorize stories by spiciness and category
   * @param {Array} stories - Array of story documents
   * @returns {Object} Categorized stories
   * @private
   */
  _categorizeStories(stories) {
    // Categorize by spiciness
    const bySpiciness = {
      mild: stories.filter(s => s.spiciness <= 1).length,
      medium: stories.filter(s => s.spiciness === 2).length,
      spicy: stories.filter(s => s.spiciness === 3).length
    };

    // Categorize by category
    const byCategory = {};
    stories.forEach(story => {
      const category = story.category || 'Other';
      byCategory[category] = (byCategory[category] || 0) + 1;
    });

    // Get top categories (sorted by count)
    const topCategories = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));

    return {
      bySpiciness,
      byCategory,
      topCategories
    };
  }

  /**
   * Calculate changes from last refresh
   * @param {Object} categorized - Current categorized stories
   * @returns {Object} Changes from last refresh
   * @private
   */
  _calculateChanges(categorized) {
    if (!this.lastRefreshStats) {
      // First run - no previous data to compare
      return {
        newStories: 0,
        removedStories: 0,
        totalChange: categorized.bySpiciness.mild + categorized.bySpiciness.medium + categorized.bySpiciness.spicy,
        isFirstRun: true
      };
    }

    const currentTotal = categorized.bySpiciness.mild + categorized.bySpiciness.medium + categorized.bySpiciness.spicy;
    const previousTotal = this.lastRefreshStats.totalEligible;

    const totalChange = currentTotal - previousTotal;

    // Simple change detection (can be enhanced with story ID tracking)
    return {
      newStories: totalChange > 0 ? totalChange : 0,
      removedStories: totalChange < 0 ? Math.abs(totalChange) : 0,
      totalChange,
      isFirstRun: false
    };
  }

  /**
   * Log a human-readable refresh summary
   * @param {Object} stats - Refresh statistics
   * @private
   */
  _logRefreshSummary(stats) {
    logger.info('═══ Story Database Refresh Summary ═══');
    logger.info(`📚 Total Eligible Stories: ${stats.totalEligible}`);
    logger.info(`🚫 Blacklisted Stories: ${stats.blacklisted}`);
    logger.info('');
    logger.info('🌶️  Spiciness Breakdown:');
    logger.info(`   Mild (0-1): ${stats.bySpiciness.mild}`);
    logger.info(`   Medium (2): ${stats.bySpiciness.medium}`);
    logger.info(`   Spicy (3): ${stats.bySpiciness.spicy}`);
    logger.info('');
    logger.info('📂 Top Categories:');
    stats.topCategories.forEach((cat, i) => {
      logger.info(`   ${i + 1}. ${cat.category}: ${cat.count}`);
    });
    logger.info('');

    if (stats.changes && stats.changes.isFirstRun) {
      logger.info('✨ First refresh run - baseline established');
    } else if (stats.changes && stats.changes.totalChange !== 0) {
      logger.info(`📊 Changes since last refresh:`);
      if (stats.changes.newStories > 0) {
        logger.info(`   +${stats.changes.newStories} new stories`);
      }
      if (stats.changes.removedStories > 0) {
        logger.info(`   -${stats.changes.removedStories} removed stories`);
      }
    } else {
      logger.info('✅ No changes since last refresh');
    }

    logger.info('═══════════════════════════════════════');
  }

  /**
   * Start the scheduled story refresh job
   * Runs daily at midnight UTC
   */
  async start() {
    if (schedulerService.getJob(this.jobName)) {
      // Job already exists (common in development with nodemon)
      return;
    }

    logger.info('Starting story database refresh job');

    // Schedule job to run daily at midnight UTC
    await schedulerService.schedule(
      this.jobName,
      '0 0 * * *', // Daily at midnight
      () => this.execute(),
      {
        timezone: 'UTC'
      }
    );

    logger.info('Story database refresh job started (runs daily at midnight UTC)');
  }

  /**
   * Stop the scheduled story refresh job
   */
  stop() {
    if (!schedulerService.getJob(this.jobName)) {
      logger.warn('Story refresh job not found');
      return;
    }

    logger.info('Stopping story database refresh job');

    schedulerService.unschedule(this.jobName);

    logger.info('Story database refresh job stopped');
  }

  /**
   * Get job status and last refresh statistics
   */
  getStatus() {
    const job = schedulerService.getJob(this.jobName);

    return {
      jobName: this.jobName,
      isRunning: this.isRunning,
      scheduled: !!job,
      lastRefresh: this.lastRefreshStats,
      stats: job ? job.stats : null
    };
  }

  /**
   * Manually trigger the job (for testing)
   */
  async trigger() {
    logger.info('Manually triggering story database refresh job');
    const result = await this.execute();
    return result;
  }

  /**
   * Get current eligible stories count (without running full refresh)
   */
  async getEligibleStoryCount() {
    try {
      const blacklistedIds = await StoryBlacklist.getActiveBlacklistedIds();

      const count = await Story.countDocuments({
        userId: null,
        status: 'ready',
        category: { $ne: 'LGBTQ+' },
        _id: { $nin: blacklistedIds }
      });

      return { count, blacklisted: blacklistedIds.length };
    } catch (error) {
      logger.error('Error getting eligible story count', {
        error: error.message
      });
      throw error;
    }
  }
}

// Create singleton instance
const storyRefreshJob = new StoryRefreshJob();

export default storyRefreshJob;
