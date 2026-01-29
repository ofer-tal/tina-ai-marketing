/**
 * Google Analytics Sync Job
 *
 * Syncs analytics data from Google Analytics 4:
 * - Sessions and page views
 * - User acquisition by channel
 * - Traffic sources
 * - Real-time active users
 *
 * Runs hourly to keep web analytics data fresh
 */

import schedulerService from '../services/scheduler.js';
import googleAnalyticsService from '../services/googleAnalyticsService.js';
import GoogleAnalyticsDaily from '../models/GoogleAnalyticsDaily.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('google-analytics-sync', 'scheduler');

/**
 * Google Analytics Sync Job Class
 */
class GoogleAnalyticsSyncJob {
  constructor() {
    this.jobName = 'google-analytics-sync';
    this.isRunning = false;
    this.lastSyncStats = null;

    // Configuration from environment
    this.syncSchedule = process.env.GA_SYNC_SCHEDULE || '0 * * * *'; // Every hour
    this.timezone = process.env.GA_SYNC_TIMEZONE || 'UTC';
  }

  /**
   * Initialize and schedule the job
   */
  initialize() {
    logger.info(`Initializing Google Analytics sync job with schedule: ${this.syncSchedule}`);

    // Register job with scheduler
    schedulerService.registerJob(
      this.jobName,
      this.syncSchedule,
      () => this.execute(),
      {
        timezone: this.timezone,
        metadata: { description: 'Sync analytics data from Google Analytics 4' }
      }
    );

    // Start the job
    schedulerService.startJob(this.jobName);

    logger.info('Google Analytics sync job initialized and scheduled');
  }

  /**
   * Stop the job
   */
  stop() {
    schedulerService.stopJob(this.jobName);
    logger.info('Google Analytics sync job stopped');
  }

  /**
   * Execute the Google Analytics sync job
   */
  async execute() {
    if (this.isRunning) {
      logger.warn('Google Analytics sync job already running, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting Google Analytics sync');

      // Check if GA service is configured
      if (!googleAnalyticsService.isConfigured()) {
        logger.warn('Google Analytics service is not configured, skipping sync');
        return {
          success: false,
          message: 'Google Analytics service not configured'
        };
      }

      const stats = {
        timestamp: new Date().toISOString(),
        duration: 0,
        sessions: null,
        trafficSources: null,
        userAcquisition: null,
        realtime: null
      };

      // Get date range (last 24 hours for detailed data)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Step 1: Sync page views and sessions
      logger.info('Step 1: Fetching page views and sessions');
      stats.sessions = await googleAnalyticsService.fetchPageViewsAndSessions(startDateStr, endDateStr);

      // Step 2: Sync traffic sources
      logger.info('Step 2: Fetching traffic sources');
      stats.trafficSources = await googleAnalyticsService.fetchTrafficSources(startDateStr, endDateStr);

      // Step 3: Sync user acquisition
      logger.info('Step 3: Fetching user acquisition data');
      stats.userAcquisition = await googleAnalyticsService.fetchUserAcquisition(startDateStr, endDateStr);

      // Step 4: Sync real-time users
      logger.info('Step 4: Fetching real-time users');
      stats.realtime = await googleAnalyticsService.fetchRealtimeUsers();

      // Step 5: Store aggregated data
      logger.info('Step 5: Storing aggregated data');
      await this.storeAggregatedData(stats);

      stats.duration = Date.now() - startTime;
      this.lastSyncStats = stats;

      logger.info('Google Analytics sync completed', {
        duration: `${stats.duration}ms`,
        sessions: stats.sessions?.metrics?.sessions || 0,
        users: stats.sessions?.metrics?.users || 0,
        realtime: stats.realtime?.activeUsers || 0
      });

      return stats;

    } catch (error) {
      logger.error('Error in Google Analytics sync job', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Store aggregated analytics data
   * Stores GA4 data to GoogleAnalyticsDaily collection
   */
  async storeAggregatedData(stats) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);

      // Store data for each day in the dailyData array
      const dailyData = stats.sessions?.dailyData || [];

      for (const dayData of dailyData) {
        const dateStr = dayData.date;
        const dateObj = new Date(dateStr);

        // Build traffic sources for this date
        const trafficSources = (stats.trafficSources?.sources || []).map(source => ({
          source: source.source,
          sessions: Math.round(source.sessions * (dayData.sessions / (stats.sessions?.metrics?.sessions || 1))), // Pro-rate based on day's sessions
          users: 0,
          percentage: source.percentage,
          originalSource: source.originalSource,
          originalMedium: source.medium
        }));

        // Build user acquisition data
        const userAcquisition = {
          newUsers: Math.round((stats.userAcquisition?.newUsers || 0) / dailyData.length),
          returningUsers: Math.round((stats.userAcquisition?.returningUsers || 0) / dailyData.length),
          acquisitionChannels: stats.userAcquisition?.acquisitionChannels || []
        };

        // Build real-time snapshots
        const realtimeSnapshots = [];
        if (stats.realtime) {
          realtimeSnapshots.push({
            timestamp: new Date(stats.realtime.timestamp),
            activeUsers: stats.realtime.activeUsers || 0,
            activeLast30Minutes: stats.realtime.activeLast30Minutes || 0,
            activeLast60Minutes: stats.realtime.activeLast60Minutes || 0
          });
        }

        // Upsert the daily record
        await GoogleAnalyticsDaily.findOneAndUpdate(
          { date: dateStr },
          {
            date: dateStr,
            dateObj: dateObj,
            sessions: {
              totalSessions: dayData.sessions || 0,
              totalUsers: dayData.users || 0,
              totalPageViews: dayData.pageViews || 0,
              bounceRate: stats.sessions?.metrics?.bounceRate || 0,
              avgSessionDuration: stats.sessions?.metrics?.avgSessionDuration || 0
            },
            trafficSources,
            userAcquisition,
            realtimeSnapshots,
            dataQuality: {
              lastSyncAt: new Date(),
              completeness: 100,
              hasRealtimeData: !!(stats.realtime?.activeUsers)
            },
            metadata: {
              source: 'google_analytics',
              propertyId: googleAnalyticsService.propertyId,
              syncedAt: new Date()
            }
          },
          { upsert: true, new: true }
        );

        logger.info(`Stored GA4 data for ${dateStr}: ${dayData.sessions} sessions, ${dayData.users} users`);
      }

      // If no dailyData (single day query), store today's data
      if (dailyData.length === 0 && stats.sessions?.metrics) {
        const todayStr = endDate.toISOString().split('T')[0];

        await GoogleAnalyticsDaily.findOneAndUpdate(
          { date: todayStr },
          {
            date: todayStr,
            dateObj: endDate,
            sessions: {
              totalSessions: stats.sessions.metrics.sessions || 0,
              totalUsers: stats.sessions.metrics.users || 0,
              totalPageViews: stats.sessions.metrics.pageViews || 0,
              bounceRate: stats.sessions.metrics.bounceRate || 0,
              avgSessionDuration: stats.sessions.metrics.avgSessionDuration || 0
            },
            trafficSources: (stats.trafficSources?.sources || []).map(source => ({
              source: source.source,
              sessions: source.sessions,
              users: 0,
              percentage: source.percentage,
              originalSource: source.originalSource,
              originalMedium: source.medium
            })),
            userAcquisition: {
              newUsers: stats.userAcquisition?.newUsers || 0,
              returningUsers: stats.userAcquisition?.returningUsers || 0,
              acquisitionChannels: stats.userAcquisition?.acquisitionChannels || []
            },
            realtimeSnapshots: stats.realtime ? [{
              timestamp: new Date(stats.realtime.timestamp),
              activeUsers: stats.realtime.activeUsers || 0,
              activeLast30Minutes: stats.realtime.activeLast30Minutes || 0,
              activeLast60Minutes: stats.realtime.activeLast60Minutes || 0
            }] : [],
            dataQuality: {
              lastSyncAt: new Date(),
              completeness: 100,
              hasRealtimeData: !!(stats.realtime?.activeUsers)
            },
            metadata: {
              source: 'google_analytics',
              propertyId: googleAnalyticsService.propertyId,
              syncedAt: new Date()
            }
          },
          { upsert: true, new: true }
        );

        logger.info(`Stored GA4 data for ${todayStr}: ${stats.sessions.metrics.sessions} sessions, ${stats.sessions.metrics.users} users`);
      }

    } catch (error) {
      logger.error('Error storing aggregated data:', error);
    }
  }

  /**
   * Get last sync stats
   */
  getLastSyncStats() {
    return this.lastSyncStats;
  }

  /**
   * Get job status
   */
  getStatus() {
    return {
      name: this.jobName,
      schedule: this.syncSchedule,
      isRunning: this.isRunning,
      lastSync: this.lastSyncStats?.timestamp || null,
      lastSyncStats: this.lastSyncStats
    };
  }
}

// Create singleton instance
const googleAnalyticsSyncJob = new GoogleAnalyticsSyncJob();

export default googleAnalyticsSyncJob;
