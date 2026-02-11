/**
 * BookTok Data Collection Job
 *
 * COST-CONTROLLED IMPLEMENTATION - ONCE DAILY ONLY
 *
 * This job replaces the previous frequent-polling implementation.
 * All external API data is collected once per day and stored locally.
 *
 * API Usage (Daily):
 * - Gopher API (TikTok): ~3-5 calls per day (strictly limited)
 * - Google Books API: ~5 calls per day (free tier: 1,000/day)
 * - NYTimes Books API: ~4 calls per day (free tier: 500/day)
 *
 * IMPORTANT: This job enforces strict guardrails to prevent accidental
 * multiple API calls. Never bypass these checks.
 */

import schedulerService from '../services/scheduler.js';
import { getLogger } from '../utils/logger.js';
import gopherDataService from '../services/bookTok/gopherDataService.js';
import googleBooksService from '../services/bookTok/googleBooksService.js';
import { nyTimesBestsellerService } from '../services/bookTok/bestsellerApiService.js';
import configService from '../services/config.js';

const logger = getLogger('booktok-data-collection', 'booktok-data-collection-job');

// Minimum interval between runs (23 hours) - GUARDRAIL
const MIN_RUN_INTERVAL_MS = 23 * 60 * 60 * 1000;

// Track last run times for each service
const lastRunTimes = {
  gopher: null,
  googleBooks: null,
  nytimes: null
};

/**
 * Check if enough time has passed since last run
 * @param {string} service - Service name
 * @returns {boolean} True if can run
 */
function canRunService(service) {
  const lastRun = lastRunTimes[service];
  if (!lastRun) return true;

  const timeSinceLastRun = Date.now() - lastRun.getTime();
  return timeSinceLastRun >= MIN_RUN_INTERVAL_MS;
}

/**
 * Update last run time for service
 * @param {string} service - Service name
 */
function updateLastRunTime(service) {
  lastRunTimes[service] = new Date();
}

class BookTokDataCollectionJob {
  constructor() {
    this.baseJobName = 'booktok-data-collection';
    this.isScheduled = false;

    // Individual job names
    this.jobNames = {
      gopher: `${this.baseJobName}-gopher`,
      googleBooks: `${this.baseJobName}-google-books`,
      nytimes: `${this.baseJobName}-nytimes`
    };

    // Default schedules (ONCE DAILY)
    this.schedules = {
      gopher: configService.get('GOPHER_DATA_SCHEDULE', '0 2 * * *'), // 2 AM UTC daily
      googleBooks: configService.get('GOOGLE_BOOKS_SCHEDULE', '0 3 * * *'), // 3 AM UTC daily
      nytimes: configService.get('NYTIMES_SCHEDULE', '0 4 * * 1'), // 4 AM UTC Mondays
      timezone: 'UTC'
    };

    // Job status tracking
    this.jobStatus = {
      gopher: { lastRun: null, lastStatus: 'idle' },
      googleBooks: { lastRun: null, lastStatus: 'idle' },
      nytimes: { lastRun: null, lastStatus: 'idle' }
    };
  }

  /**
   * Start all scheduled data collection jobs
   * @param {Object} options - Configuration options
   */
  start(options = {}) {
    if (this.isScheduled) {
      logger.warn('BookTok data collection jobs already started');
      return;
    }

    try {
      // Start scheduler service if not running
      if (schedulerService.getStatus().status !== 'running') {
        schedulerService.start();
        logger.info('Scheduler service started');
      }

      const timezone = options.timezone || this.schedules.timezone;

      // Schedule Gopher/TikTok data collection (DAILY - NOT every 15 minutes!)
      this.scheduleGopherCollection(timezone);

      // Schedule Google Books collection (DAILY)
      this.scheduleGoogleBooksCollection(timezone);

      // Schedule NYTimes collection (WEEKLY)
      this.scheduleNYTimesCollection(timezone);

      this.isScheduled = true;

      logger.info('╔════════════════════════════════════════════════════════╗');
      logger.info('║   BookTok Data Collection Jobs Started                  ║');
      logger.info('║   COST-CONTROLLED: Once daily, NOT real-time            ║');
      logger.info('╚════════════════════════════════════════════════════════╝');
      logger.info('Jobs scheduled:', {
        gopherSchedule: this.schedules.gopher,
        googleBooksSchedule: this.schedules.googleBooks,
        nytimesSchedule: this.schedules.nytimes,
        timezone
      });

    } catch (error) {
      logger.error('Error starting BookTok data collection jobs', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    if (!this.isScheduled) {
      logger.warn('BookTok data collection jobs not running');
      return;
    }

    try {
      // Unschedule all jobs
      for (const jobName of Object.values(this.jobNames)) {
        schedulerService.unschedule(jobName);
      }

      this.isScheduled = false;
      logger.info('All BookTok data collection jobs stopped');

    } catch (error) {
      logger.error('Error stopping BookTok data collection jobs', {
        error: error.message
      });
    }
  }

  /**
   * Schedule Gopher/TikTok data collection
   * @param {string} timezone - Timezone
   */
  scheduleGopherCollection(timezone) {
    schedulerService.schedule(
      this.jobNames.gopher,
      this.schedules.gopher,
      async () => await this.executeGopherCollection(),
      { timezone }
    );

    logger.info('Gopher/TikTok collection scheduled (DAILY, NOT real-time)', {
      schedule: this.schedules.gopher
    });
  }

  /**
   * Schedule Google Books collection
   * @param {string} timezone - Timezone
   */
  scheduleGoogleBooksCollection(timezone) {
    schedulerService.schedule(
      this.jobNames.googleBooks,
      this.schedules.googleBooks,
      async () => await this.executeGoogleBooksCollection(),
      { timezone }
    );

    logger.info('Google Books collection scheduled (DAILY)', {
      schedule: this.schedules.googleBooks
    });
  }

  /**
   * Schedule NYTimes collection
   * @param {string} timezone - Timezone
   */
  scheduleNYTimesCollection(timezone) {
    schedulerService.schedule(
      this.jobNames.nytimes,
      this.schedules.nytimes,
      async () => await this.executeNYTimesCollection(),
      { timezone }
    );

    logger.info('NYTimes bestseller collection scheduled (WEEKLY)', {
      schedule: this.schedules.nytimes
    });
  }

  /**
   * Execute Gopher/TikTok collection with GUARDRAILS
   */
  async executeGopherCollection() {
    const startTime = Date.now();
    this.jobStatus.gopher.lastStatus = 'running';

    // GUARDRAIL: Check minimum interval
    if (!canRunService('gopher')) {
      const hoursUntil = ((MIN_RUN_INTERVAL_MS - (Date.now() - lastRunTimes.gopher.getTime())) / (60 * 60 * 1000)).toFixed(1);
      logger.warn(`⚠️ Gopher collection skipped - too soon (${hoursUntil}h until next run)`);

      this.jobStatus.gopher = {
        lastRun: lastRunTimes.gopher,
        lastStatus: 'skipped',
        reason: 'too_soon',
        hoursUntilNextRun: hoursUntil
      };
      return;
    }

    logger.info('Starting Gopher/TikTok DAILY collection');

    try {
      const result = await gopherDataService.fetchDailyTikTokData({
        maxItemsPerHashtag: 25,
        period: '7' // 7 days
      });

      updateLastRunTime('gopher');

      const duration = Date.now() - startTime;

      this.jobStatus.gopher = {
        lastRun: new Date(),
        lastStatus: result.success ? 'completed' : 'failed',
        postsCollected: result.postsCollected || 0,
        apiCalls: result.apiCalls || 0,
        duration
      };

      logger.info('Gopher/TikTok DAILY collection completed', {
        postsCollected: result.postsCollected || 0,
        apiCalls: result.apiCalls || 0,
        duration: `${duration}ms`
      });

    } catch (error) {
      this.jobStatus.gopher.lastStatus = 'failed';
      logger.error('Error in Gopher collection', {
        error: error.message
      });
    }
  }

  /**
   * Execute Google Books collection with GUARDRAILS
   */
  async executeGoogleBooksCollection() {
    const startTime = Date.now();
    this.jobStatus.googleBooks.lastStatus = 'running';

    // GUARDRAIL: Check minimum interval
    if (!canRunService('googleBooks')) {
      const hoursUntil = ((MIN_RUN_INTERVAL_MS - (Date.now() - lastRunTimes.googleBooks.getTime())) / (60 * 60 * 1000)).toFixed(1);
      logger.warn(`⚠️ Google Books collection skipped - too soon (${hoursUntil}h until next run)`);

      this.jobStatus.googleBooks = {
        lastRun: lastRunTimes.googleBooks,
        lastStatus: 'skipped',
        reason: 'too_soon',
        hoursUntilNextRun: hoursUntil
      };
      return;
    }

    logger.info('Starting Google Books DAILY collection');

    try {
      const books = await googleBooksService.fetchTrendingRomanceBooks(50);

      updateLastRunTime('googleBooks');

      const duration = Date.now() - startTime;

      this.jobStatus.googleBooks = {
        lastRun: new Date(),
        lastStatus: 'completed',
        booksCollected: books.length || 0,
        duration
      };

      logger.info('Google Books DAILY collection completed', {
        booksCollected: books.length || 0,
        duration: `${duration}ms`
      });

    } catch (error) {
      this.jobStatus.googleBooks.lastStatus = 'failed';
      logger.error('Error in Google Books collection', {
        error: error.message
      });
    }
  }

  /**
   * Execute NYTimes collection with GUARDRAILS
   */
  async executeNYTimesCollection() {
    const startTime = Date.now();
    this.jobStatus.nytimes.lastStatus = 'running';

    // GUARDRAIL: Check minimum interval
    if (!canRunService('nytimes')) {
      const hoursUntil = ((MIN_RUN_INTERVAL_MS - (Date.now() - lastRunTimes.nytimes.getTime())) / (60 * 60 * 1000)).toFixed(1);
      logger.warn(`⚠️ NYTimes collection skipped - too soon (${hoursUntil}h until next run)`);

      this.jobStatus.nytimes = {
        lastRun: lastRunTimes.nytimes,
        lastStatus: 'skipped',
        reason: 'too_soon',
        hoursUntilNextRun: hoursUntil
      };
      return;
    }

    logger.info('Starting NYTimes WEEKLY collection');

    try {
      const result = await nyTimesBestsellerService.updateAllBestsellerLists();

      updateLastRunTime('nytimes');

      const duration = Date.now() - startTime;

      this.jobStatus.nytimes = {
        lastRun: new Date(),
        lastStatus: result.success ? 'completed' : 'failed',
        romanceBooksFound: result.totalRomanceBooks || 0,
        subgenres: result.subgenres || [],
        duration
      };

      logger.info('NYTimes WEEKLY collection completed', {
        romanceBooksFound: result.totalRomanceBooks || 0,
        subgenres: result.subgenres || [],
        duration: `${duration}ms`
      });

    } catch (error) {
      this.jobStatus.nytimes.lastStatus = 'failed';
      logger.error('Error in NYTimes collection', {
        error: error.message
      });
    }
  }

  /**
   * Get job status
   * @returns {Object} Status of all jobs
   */
  getStatus() {
    return {
      isScheduled: this.isScheduled,
      jobs: this.jobStatus,
      serviceStatus: {
        gopher: gopherDataService.getStatus(),
        googleBooks: googleBooksService.getStatus(),
        nytimes: nyTimesBestsellerService.getStatus()
      },
      costControl: {
        mode: 'once_daily',
        minIntervalHours: 23,
        apiCallsPerRun: '~125-150 per weekly run (5 NYTimes lists + ~100 Google Books lookups)',
        breakdown: {
          gopher: '3-5 calls/day',
          googleBooks: '~100 calls/week (free tier: 1,000/day)',
          nytimes: '5 calls/week (free tier: 500/day)'
        }
      }
    };
  }

  /**
   * Manually trigger a specific job
   * ⚠️ WARNING: This uses API quota! Only use when necessary.
   * @param {string} job - Job name to trigger
   * @param {string} reason - Reason for manual trigger
   */
  async triggerJob(job, reason = 'manual') {
    logger.warn(`⚠️⚠️⚠️ MANUAL TRIGGER - This uses API quota!`, { job, reason });

    switch (job) {
      case 'gopher':
        await this.executeGopherCollection();
        break;
      case 'googleBooks':
        await this.executeGoogleBooksCollection();
        break;
      case 'nytimes':
        await this.executeNYTimesCollection();
        break;
      case 'all':
        await this.executeGopherCollection();
        await new Promise(resolve => setTimeout(resolve, 5000));
        await this.executeGoogleBooksCollection();
        await new Promise(resolve => setTimeout(resolve, 5000));
        await this.executeNYTimesCollection();
        break;
      default:
        logger.warn(`Unknown job: ${job}`);
    }
  }

  /**
   * Get API usage summary
   * @returns {Object} API usage information
   */
  getApiUsageSummary() {
    const gopherStatus = gopherDataService.getStatus();
    const googleBooksStatus = googleBooksService.getStatus();
    const nytimesStatus = nyTimesBestsellerService.getStatus();

    return {
      gopher: {
        lastRun: gopherStatus.lastRunCompletedAt,
        apiCallCount: gopherStatus.apiCallCount,
        configured: gopherStatus.isConfigured
      },
      googleBooks: {
        lastRun: googleBooksStatus.lastRunTime,
        booksCollected: googleBooksStatus.booksCollected,
        hasApiKey: googleBooksStatus.hasApiKey
      },
      nytimes: {
        lastRun: nytimesStatus.lastRunTime,
        configured: nytimesStatus.isConfigured
      },
      totalApiCallsToday: gopherStatus.apiCallCount || 0,
      monthlyEstimate: (gopherStatus.apiCallCount || 0) * 30
    };
  }
}

// Export singleton instance
const bookTokDataCollectionJob = new BookTokDataCollectionJob();

// Auto-start if environment variable is set
if (process.env.BOOKTOK_DATA_COLLECTION_ENABLED === 'true') {
  logger.info('Auto-starting BookTok data collection job');
  bookTokDataCollectionJob.start();
}

export default bookTokDataCollectionJob;
