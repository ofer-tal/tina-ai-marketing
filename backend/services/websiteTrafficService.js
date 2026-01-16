/**
 * Website Traffic Service
 *
 * Integrates with Google Analytics to:
 * - Fetch website traffic data
 * - Store metrics in database for trend tracking
 * - Aggregate traffic by source, medium, and campaign
 * - Calculate engagement metrics
 * - Track conversion rates
 *
 * Feature #269: Website traffic tracking from GA
 */

import winston from 'winston';
import AnalyticsMetric from '../models/AnalyticsMetric.js';
import googleAnalyticsService from './googleAnalyticsService.js';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'website-traffic' },
  transports: [
    new winston.transports.File({ filename: 'logs/website-traffic-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/website-traffic.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

/**
 * Website Traffic Service Class
 */
class WebsiteTrafficService {
  constructor() {
    this.enabled = googleAnalyticsService.isConfigured();
    logger.info('Website Traffic Service initialized', { enabled: this.enabled });
  }

  /**
   * Fetch and store traffic data from Google Analytics
   *
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @returns {Promise<Object>} Stored traffic data
   */
  async fetchAndStoreTrafficData(startDate, endDate) {
    try {
      if (!this.enabled) {
        throw new Error('Google Analytics is not configured');
      }

      logger.info(`Fetching traffic data from ${startDate} to ${endDate}`);

      // Fetch data from Google Analytics
      const pageViewsData = await googleAnalyticsService.fetchPageViewsAndSessions(startDate, endDate);
      const trafficSourcesData = await googleAnalyticsService.fetchTrafficSources(startDate, endDate);
      const topPagesData = await googleAnalyticsService.fetchTopPages(startDate, endDate, 20);
      const userAcquisitionData = await googleAnalyticsService.fetchUserAcquisition(startDate, endDate);

      // Store metrics in database
      const storedMetrics = await this.storeTrafficMetrics({
        dateRange: { startDate, endDate },
        pageViews: pageViewsData,
        trafficSources: trafficSourcesData,
        topPages: topPagesData,
        userAcquisition: userAcquisitionData
      });

      logger.info('Successfully fetched and stored traffic data', {
        metricsStored: storedMetrics.length,
        dateRange: { startDate, endDate }
      });

      return {
        success: true,
        dateRange: { startDate, endDate },
        summary: {
          pageViews: pageViewsData.metrics.pageViews,
          sessions: pageViewsData.metrics.sessions,
          users: pageViewsData.metrics.users,
          bounceRate: pageViewsData.metrics.bounceRate,
          avgSessionDuration: pageViewsData.metrics.avgSessionDuration
        },
        trafficSources: trafficSourcesData.sources,
        topPages: topPagesData,
        userAcquisition: userAcquisitionData,
        storedMetrics: storedMetrics.length
      };
    } catch (error) {
      logger.error('Error fetching and storing traffic data:', error);
      throw error;
    }
  }

  /**
   * Store traffic metrics in database
   *
   * @param {Object} trafficData - Complete traffic data from GA
   * @returns {Promise<Array>} Array of stored metrics
   */
  async storeTrafficMetrics(trafficData) {
    const { dateRange, pageViews, trafficSources, topPages, userAcquisition } = trafficData;
    const metrics = [];
    const timestamp = new Date();
    const dateStr = dateRange.startDate;

    // 1. Store overall page views metric
    const pageViewsMetric = await AnalyticsMetric.create({
      metric: 'ga_pageviews',
      value: pageViews.metrics.pageViews,
      dimensions: {
        source: 'google_analytics',
        channel: 'all'
      },
      timestamp,
      period: 'daily',
      source: 'ga',
      metadata: { date: dateStr }
    });
    metrics.push(pageViewsMetric);

    // 2. Store sessions metric
    const sessionsMetric = await AnalyticsMetric.create({
      metric: 'ga_sessions',
      value: pageViews.metrics.sessions,
      dimensions: {
        source: 'google_analytics',
        channel: 'all'
      },
      timestamp,
      period: 'daily',
      source: 'ga',
      metadata: { date: dateStr }
    });
    metrics.push(sessionsMetric);

    // 3. Store users metric
    const usersMetric = await AnalyticsMetric.create({
      metric: 'ga_users',
      value: pageViews.metrics.users,
      dimensions: {
        source: 'google_analytics',
        channel: 'all'
      },
      timestamp,
      period: 'daily',
      source: 'ga',
      metadata: { date: dateStr }
    });
    metrics.push(usersMetric);

    // 4. Store bounce rate metric
    const bounceRateMetric = await AnalyticsMetric.create({
      metric: 'ga_bounce_rate',
      value: parseFloat(pageViews.metrics.bounceRate),
      dimensions: {
        source: 'google_analytics',
        channel: 'all'
      },
      timestamp,
      period: 'daily',
      source: 'ga',
      metadata: { date: dateStr }
    });
    metrics.push(bounceRateMetric);

    // 5. Store average session duration metric
    const avgSessionDurationMetric = await AnalyticsMetric.create({
      metric: 'ga_avg_session_duration',
      value: pageViews.metrics.avgSessionDuration,
      dimensions: {
        source: 'google_analytics',
        channel: 'all'
      },
      timestamp,
      period: 'daily',
      source: 'ga',
      metadata: { date: dateStr }
    });
    metrics.push(avgSessionDurationMetric);

    // 6. Store traffic source breakdown
    for (const source of trafficSources.sources) {
      const sourceMetric = await AnalyticsMetric.create({
        metric: 'ga_sessions_by_source',
        value: source.sessions,
        dimensions: {
          source: 'google_analytics',
          channel: source.source,
          trafficSource: source.source
        },
        timestamp,
        period: 'daily',
        source: 'ga',
        metadata: {
          date: dateStr,
          percentage: source.percentage
        }
      });
      metrics.push(sourceMetric);
    }

    // 7. Store top pages data
    for (const page of topPages) {
      const pageMetric = await AnalyticsMetric.create({
        metric: 'ga_pageviews_by_page',
        value: page.pageViews,
        dimensions: {
          source: 'google_analytics',
          pagePath: page.path,
          uniqueViews: page.uniqueViews
        },
        timestamp,
        period: 'daily',
        source: 'ga',
        metadata: { date: dateStr }
      });
      metrics.push(pageMetric);
    }

    // 8. Store user acquisition data
    const newUsersMetric = await AnalyticsMetric.create({
      metric: 'ga_new_users',
      value: userAcquisition.newUsers,
      dimensions: {
        source: 'google_analytics',
        channel: 'all'
      },
      timestamp,
      period: 'daily',
      source: 'ga',
      metadata: { date: dateStr }
    });
    metrics.push(newUsersMetric);

    const returningUsersMetric = await AnalyticsMetric.create({
      metric: 'ga_returning_users',
      value: userAcquisition.returningUsers,
      dimensions: {
        source: 'google_analytics',
        channel: 'all'
      },
      timestamp,
      period: 'daily',
      source: 'ga',
      metadata: { date: dateStr }
    });
    metrics.push(returningUsersMetric);

    // 9. Store acquisition channel breakdown
    for (const channel of userAcquisition.acquisitionChannels) {
      const channelMetric = await AnalyticsMetric.create({
        metric: 'ga_users_by_channel',
        value: channel.users,
        dimensions: {
          source: 'google_analytics',
          channel: channel.channel,
          acquisitionChannel: channel.channel
        },
        timestamp,
        period: 'daily',
        source: 'ga',
        metadata: {
          date: dateStr,
          percentage: channel.percentage
        }
      });
      metrics.push(channelMetric);
    }

    // 10. Store conversion rate
    const conversionRateMetric = await AnalyticsMetric.create({
      metric: 'ga_conversion_rate',
      value: parseFloat(userAcquisition.conversionRate) * 100, // Store as percentage
      dimensions: {
        source: 'google_analytics',
        channel: 'all'
      },
      timestamp,
      period: 'daily',
      source: 'ga',
      metadata: { date: dateStr }
    });
    metrics.push(conversionRateMetric);

    logger.info(`Stored ${metrics.length} traffic metrics for ${dateStr}`);
    return metrics;
  }

  /**
   * Get traffic trends over time
   *
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @returns {Promise<Object>} Traffic trend data
   */
  async getTrafficTrends(startDate, endDate) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Fetch metrics from database
      const pageViews = await AnalyticsMetric.getMetrics('ga_pageviews', start, end);
      const sessions = await AnalyticsMetric.getMetrics('ga_sessions', start, end);
      const users = await AnalyticsMetric.getMetrics('ga_users', start, end);
      const bounceRate = await AnalyticsMetric.getMetrics('ga_bounce_rate', start, end);
      const avgSessionDurationMetrics = await AnalyticsMetric.getMetrics('ga_avg_session_duration', start, end);

      // Organize by date for charts
      const trendsByDate = {};
      const allMetrics = [...pageViews, ...sessions, ...users, ...bounceRate, ...avgSessionDurationMetrics];

      for (const metric of allMetrics) {
        const date = metric.metadata.date;
        if (!trendsByDate[date]) {
          trendsByDate[date] = {
            date,
            pageViews: 0,
            sessions: 0,
            users: 0,
            bounceRate: 0,
            avgSessionDuration: 0
          };
        }

        switch (metric.metric) {
          case 'ga_pageviews':
            trendsByDate[date].pageViews = metric.value;
            break;
          case 'ga_sessions':
            trendsByDate[date].sessions = metric.value;
            break;
          case 'ga_users':
            trendsByDate[date].users = metric.value;
            break;
          case 'ga_bounce_rate':
            trendsByDate[date].bounceRate = metric.value;
            break;
          case 'ga_avg_session_duration':
            trendsByDate[date].avgSessionDuration = metric.value;
            break;
        }
      }

      // Convert to array and sort by date
      const trendArray = Object.values(trendsByDate).sort((a, b) =>
        new Date(a.date) - new Date(b.date)
      );

      // Calculate totals and averages
      const totalPageViews = trendArray.reduce((sum, day) => sum + day.pageViews, 0);
      const totalSessions = trendArray.reduce((sum, day) => sum + day.sessions, 0);
      const totalUsers = trendArray.reduce((sum, day) => sum + day.users, 0);
      const avgBounceRate = trendArray.length > 0
        ? trendArray.reduce((sum, day) => sum + day.bounceRate, 0) / trendArray.length
        : 0;
      const avgSessionDuration = trendArray.length > 0
        ? trendArray.reduce((sum, day) => sum + day.avgSessionDuration, 0) / trendArray.length
        : 0;

      return {
        dateRange: { startDate, endDate },
        summary: {
          totalPageViews,
          totalSessions,
          totalUsers,
          avgBounceRate: avgBounceRate.toFixed(2),
          avgSessionDuration: Math.round(avgSessionDuration),
          daysWithData: trendArray.length
        },
        dailyTrends: trendArray
      };
    } catch (error) {
      logger.error('Error getting traffic trends:', error);
      throw error;
    }
  }

  /**
   * Get traffic sources breakdown
   *
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @returns {Promise<Object>} Traffic sources data
   */
  async getTrafficSources(startDate, endDate) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const metrics = await AnalyticsMetric.getMetrics('ga_sessions_by_source', start, end);

      // Aggregate by source
      const sources = {};
      let totalSessions = 0;

      for (const metric of metrics) {
        const source = metric.dimensions.trafficSource;
        if (!sources[source]) {
          sources[source] = {
            source,
            sessions: 0,
            percentage: 0,
            dailyData: []
          };
        }
        sources[source].sessions += metric.value;
        sources[source].dailyData.push({
          date: metric.metadata.date,
          sessions: metric.value
        });
        totalSessions += metric.value;
      }

      // Calculate percentages
      const sourceArray = Object.values(sources).map(s => ({
        ...s,
        percentage: totalSessions > 0 ? ((s.sessions / totalSessions) * 100).toFixed(1) : 0
      }));

      // Sort by sessions
      sourceArray.sort((a, b) => b.sessions - a.sessions);

      return {
        dateRange: { startDate, endDate },
        totalSessions,
        sources: sourceArray
      };
    } catch (error) {
      logger.error('Error getting traffic sources:', error);
      throw error;
    }
  }

  /**
   * Get top pages
   *
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @param {number} limit - Maximum number of pages to return
   * @returns {Promise<Object>} Top pages data
   */
  async getTopPages(startDate, endDate, limit = 10) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const metrics = await AnalyticsMetric.getMetrics('ga_pageviews_by_page', start, end);

      // Aggregate by page path
      const pages = {};
      for (const metric of metrics) {
        const path = metric.dimensions.pagePath;
        if (!pages[path]) {
          pages[path] = {
            path,
            pageViews: 0,
            uniqueViews: 0
          };
        }
        pages[path].pageViews += metric.value;
        pages[path].uniqueViews += metric.dimensions.uniqueViews || 0;
      }

      // Convert to array, sort, and limit
      const pageArray = Object.values(pages)
        .sort((a, b) => b.pageViews - a.pageViews)
        .slice(0, limit);

      return {
        dateRange: { startDate, endDate },
        pages: pageArray,
        count: pageArray.length
      };
    } catch (error) {
      logger.error('Error getting top pages:', error);
      throw error;
    }
  }

  /**
   * Get user acquisition data
   *
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @returns {Promise<Object>} User acquisition data
   */
  async getUserAcquisition(startDate, endDate) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const newUsersMetrics = await AnalyticsMetric.getMetrics('ga_new_users', start, end);
      const returningUsersMetrics = await AnalyticsMetric.getMetrics('ga_returning_users', start, end);
      const channelMetrics = await AnalyticsMetric.getMetrics('ga_users_by_channel', start, end);
      const conversionRateMetrics = await AnalyticsMetric.getMetrics('ga_conversion_rate', start, end);

      // Aggregate totals
      const totalNewUsers = newUsersMetrics.reduce((sum, m) => sum + m.value, 0);
      const totalReturningUsers = returningUsersMetrics.reduce((sum, m) => sum + m.value, 0);
      const avgConversionRate = conversionRateMetrics.length > 0
        ? conversionRateMetrics.reduce((sum, m) => sum + m.value, 0) / conversionRateMetrics.length
        : 0;

      // Aggregate by channel
      const channels = {};
      for (const metric of channelMetrics) {
        const channel = metric.dimensions.acquisitionChannel;
        if (!channels[channel]) {
          channels[channel] = { channel, users: 0, percentage: 0 };
        }
        channels[channel].users += metric.value;
      }

      const totalUsers = totalNewUsers + totalReturningUsers;
      const channelArray = Object.values(channels).map(c => ({
        ...c,
        percentage: totalUsers > 0 ? ((c.users / totalUsers) * 100).toFixed(1) : 0
      }));

      return {
        dateRange: { startDate, endDate },
        newUsers: totalNewUsers,
        returningUsers: totalReturningUsers,
        totalUsers,
        acquisitionChannels: channelArray.sort((a, b) => b.users - a.users),
        conversionRate: (avgConversionRate / 100).toFixed(3) // Convert back to decimal
      };
    } catch (error) {
      logger.error('Error getting user acquisition:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive traffic dashboard data
   *
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @returns {Promise<Object>} Complete dashboard data
   */
  async getDashboardData(startDate, endDate) {
    try {
      logger.info(`Fetching dashboard data from ${startDate} to ${endDate}`);

      const [trends, sources, topPages, acquisition] = await Promise.all([
        this.getTrafficTrends(startDate, endDate),
        this.getTrafficSources(startDate, endDate),
        this.getTopPages(startDate, endDate, 10),
        this.getUserAcquisition(startDate, endDate)
      ]);

      return {
        dateRange: { startDate, endDate },
        trends,
        sources,
        topPages,
        acquisition
      };
    } catch (error) {
      logger.error('Error getting dashboard data:', error);
      throw error;
    }
  }

  /**
   * Refresh traffic data (fetch latest from GA and store)
   *
   * @returns {Promise<Object>} Refresh result
   */
  async refreshTrafficData() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const result = await this.fetchAndStoreTrafficData(sevenDaysAgo, today);

      logger.info('Traffic data refreshed successfully', {
        metricsStored: result.storedMetrics,
        dateRange: result.dateRange
      });

      return result;
    } catch (error) {
      logger.error('Error refreshing traffic data:', error);
      throw error;
    }
  }

  /**
   * Check service health
   */
  async healthCheck() {
    const gaHealth = await googleAnalyticsService.healthCheck();
    return {
      service: 'website-traffic',
      enabled: this.enabled,
      googleAnalytics: gaHealth,
      timestamp: new Date().toISOString()
    };
  }
}

// Create singleton instance
const websiteTrafficService = new WebsiteTrafficService();

export default websiteTrafficService;
