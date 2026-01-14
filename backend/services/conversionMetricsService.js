/**
 * Conversion Metrics Service
 *
 * Manages App Store conversion rate tracking from impressions to downloads.
 * Fetches data from App Store Connect API and calculates conversion metrics.
 *
 * Features:
 * - Fetch daily impressions and downloads from App Store Connect
 * - Calculate conversion rates at each funnel stage
 * - Store historical metrics for trend analysis
 * - Compare with previous periods
 * - Identify dropoff points in conversion funnel
 */

import BaseApiClient from './baseApiClient.js';
import ConversionMetrics from '../models/ConversionMetrics.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('services', 'conversion-metrics');

class ConversionMetricsService extends BaseApiClient {
  constructor(config = {}) {
    super({
      name: 'ConversionMetrics',
      ...config,
    });

    this.appId = process.env.APP_STORE_APP_ID || '1234567890';
    this.dataRetentionDays = 365; // Keep 1 year of daily data
  }

  /**
   * Fetch conversion metrics from App Store Connect
   * Returns daily impressions, product page views, downloads, and installs
   */
  async fetchConversionMetrics(startDate, endDate = new Date()) {
    try {
      logger.info('Fetching conversion metrics from App Store Connect...', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      // Check if App Store Connect is configured
      const isConfigured =
        process.env.APP_STORE_CONNECT_KEY_ID &&
        process.env.APP_STORE_CONNECT_ISSUER_ID &&
        process.env.APP_STORE_CONNECT_PRIVATE_KEY_PATH;

      if (!isConfigured) {
        logger.warn('App Store Connect not configured, returning mock data');
        return this.getMockConversionMetrics(startDate, endDate);
      }

      // TODO: Implement actual App Store Connect API calls
      // This would use the Analytics API to fetch:
      // - Impressions (times app appeared in search/browse)
      // - Product Page Views
      // - App Units (downloads)
      // - Installations
      // - Active Devices
      // - Crashes (for quality metrics)

      // For now, return mock data
      logger.info('Using mock conversion metrics data');
      return this.getMockConversionMetrics(startDate, endDate);
    } catch (error) {
      logger.error('Error fetching conversion metrics:', error);
      throw error;
    }
  }

  /**
   * Get mock conversion metrics for development/testing
   */
  getMockConversionMetrics(startDate, endDate) {
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const metrics = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      // Base metrics with some randomness
      const impressions = this.getRandomInRange(40000, 50000);
      const productPageViews = Math.floor(impressions * this.getRandomInRange(0.38, 0.45)); // 38-45% conversion
      const downloads = Math.floor(productPageViews * this.getRandomInRange(0.15, 0.20)); // 15-20% conversion
      const installs = Math.floor(downloads * this.getRandomInRange(0.88, 0.93)); // 88-93% conversion
      const signups = Math.floor(installs * this.getRandomInRange(0.65, 0.75)); // 65-75% conversion
      const trials = Math.floor(signups * this.getRandomInRange(0.75, 0.85)); // 75-85% conversion
      const paid = Math.floor(trials * this.getRandomInRange(0.25, 0.35)); // 25-35% conversion

      metrics.push({
        date,
        period: 'daily',
        impressions,
        productPageViews,
        downloads,
        installs,
        accountSignups: signups,
        trialActivations: trials,
        paidSubscriptions: paid,
        metadata: {
          source: 'App Store Connect (Mock)',
          appId: this.appId,
          platform: 'iOS',
        },
        dataQuality: {
          isEstimated: true,
          estimatedFields: ['impressions', 'productPageViews', 'downloads', 'installs'],
          completeness: 100,
        },
      });
    }

    return metrics;
  }

  /**
   * Calculate conversion rates from raw metrics
   */
  calculateConversionRates(metrics) {
    const conversionRates = {};

    if (metrics.impressions > 0) {
      conversionRates.impressionsToProductPage =
        (metrics.productPageViews / metrics.impressions) * 100;
    }

    if (metrics.productPageViews > 0) {
      conversionRates.productPageToDownload =
        (metrics.downloads / metrics.productPageViews) * 100;
    }

    if (metrics.downloads > 0) {
      conversionRates.downloadToInstall =
        (metrics.installs / metrics.downloads) * 100;
    }

    if (metrics.installs > 0) {
      conversionRates.installToSignup =
        (metrics.accountSignups / metrics.installs) * 100;
    }

    if (metrics.accountSignups > 0) {
      conversionRates.signupToTrial =
        (metrics.trialActivations / metrics.accountSignups) * 100;
    }

    if (metrics.trialActivations > 0) {
      conversionRates.trialToPaid =
        (metrics.paidSubscriptions / metrics.trialActivations) * 100;
    }

    if (metrics.impressions > 0) {
      conversionRates.overallConversionRate =
        (metrics.paidSubscriptions / metrics.impressions) * 100;
    }

    return conversionRates;
  }

  /**
   * Store conversion metrics in database
   */
  async storeConversionMetrics(metricsData) {
    try {
      logger.info('Storing conversion metrics in database...');

      const results = [];

      for (const data of metricsData) {
        // Calculate conversion rates
        const conversionRates = this.calculateConversionRates(data);

        // Create or update metric record
        const metric = await ConversionMetrics.findOneAndUpdate(
          {
            date: data.date,
            period: data.period || 'daily',
          },
          {
            ...data,
            conversionRates,
            calculatedAt: new Date(),
          },
          {
            upsert: true,
            new: true,
          }
        );

        results.push(metric);
      }

      logger.info(`Stored ${results.length} conversion metrics records`);
      return results;
    } catch (error) {
      logger.error('Error storing conversion metrics:', error);
      throw error;
    }
  }

  /**
   * Get conversion metrics for a date range
   */
  async getConversionMetrics(startDate, endDate, period = 'daily') {
    try {
      const metrics = await ConversionMetrics.find({
        date: {
          $gte: startDate,
          $lte: endDate,
        },
        period,
      }).sort({ date: 1 });

      return metrics;
    } catch (error) {
      logger.error('Error getting conversion metrics:', error);
      throw error;
    }
  }

  /**
   * Get latest conversion metrics
   */
  async getLatestMetrics(period = 'daily') {
    try {
      const latest = await ConversionMetrics.findOne({
        period,
      }).sort({ date: -1 });

      return latest;
    } catch (error) {
      logger.error('Error getting latest metrics:', error);
      throw error;
    }
  }

  /**
   * Get aggregated metrics for a period (weekly, monthly)
   */
  async getAggregatedMetrics(period = 'weekly', days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const dailyMetrics = await ConversionMetrics.find({
        date: { $gte: startDate },
        period: 'daily',
      }).sort({ date: 1 });

      if (dailyMetrics.length === 0) {
        return null;
      }

      // Aggregate metrics
      const aggregated = {
        date: dailyMetrics[0].date,
        period,
        impressions: 0,
        productPageViews: 0,
        downloads: 0,
        installs: 0,
        accountSignups: 0,
        trialActivations: 0,
        paidSubscriptions: 0,
        metadata: dailyMetrics[0].metadata,
        dataQuality: {
          isEstimated: dailyMetrics.some(m => m.dataQuality?.isEstimated),
          completeness: 100,
        },
      };

      // Sum all metrics
      dailyMetrics.forEach(metric => {
        aggregated.impressions += metric.impressions;
        aggregated.productPageViews += metric.productPageViews;
        aggregated.downloads += metric.downloads;
        aggregated.installs += metric.installs;
        aggregated.accountSignups += metric.accountSignups;
        aggregated.trialActivations += metric.trialActivations;
        aggregated.paidSubscriptions += metric.paidSubscriptions;
      });

      // Calculate conversion rates from aggregated numbers
      aggregated.conversionRates = this.calculateConversionRates(aggregated);

      return aggregated;
    } catch (error) {
      logger.error('Error getting aggregated metrics:', error);
      throw error;
    }
  }

  /**
   * Get conversion funnel breakdown for latest metrics
   */
  async getConversionFunnel() {
    try {
      const latest = await this.getLatestMetrics('daily');

      if (!latest) {
        return null;
      }

      const funnel = {
        impressions: {
          label: 'App Store Impressions',
          value: latest.impressions,
          description: 'Times app appeared in search or browse',
          conversionRate: 100,
          dropoffRate: 0,
        },
        productPageViews: {
          label: 'Product Page Views',
          value: latest.productPageViews,
          description: 'Users who viewed the app product page',
          conversionRate: latest.conversionRates.impressionsToProductPage,
          dropoffRate: 100 - latest.conversionRates.impressionsToProductPage,
        },
        downloads: {
          label: 'App Downloads',
          value: latest.downloads,
          description: 'Users who downloaded the app',
          conversionRate: latest.conversionRates.productPageToDownload,
          dropoffRate: 100 - latest.conversionRates.productPageToDownload,
        },
        installs: {
          label: 'App Installs',
          value: latest.installs,
          description: 'Users who completed installation',
          conversionRate: latest.conversionRates.downloadToInstall,
          dropoffRate: 100 - latest.conversionRates.downloadToInstall,
        },
        accountSignups: {
          label: 'Account Signups',
          value: latest.accountSignups,
          description: 'Users who created an account',
          conversionRate: latest.conversionRates.installToSignup,
          dropoffRate: 100 - latest.conversionRates.installToSignup,
        },
        trialActivations: {
          label: 'Trial Activations',
          value: latest.trialActivations,
          description: 'Users who started free trial',
          conversionRate: latest.conversionRates.signupToTrial,
          dropoffRate: 100 - latest.conversionRates.signupToTrial,
        },
        paidSubscriptions: {
          label: 'Paid Subscriptions',
          value: latest.paidSubscriptions,
          description: 'Users who converted to paid subscription',
          conversionRate: latest.conversionRates.trialToPaid,
          dropoffRate: 100 - latest.conversionRates.trialToPaid,
        },
      };

      // Calculate overall metrics
      const totalImpressions = latest.impressions;
      const totalConversions = latest.paidSubscriptions;
      const overallConversionRate = totalImpressions > 0
        ? (totalConversions / totalImpressions) * 100
        : 0;

      // Find biggest dropoff
      const biggestDropoff = Object.values(funnel)
        .filter(stage => stage.dropoffRate > 0)
        .sort((a, b) => b.dropoffRate - a.dropoffRate)[0];

      return {
        stages: funnel,
        summary: {
          totalImpressions,
          totalConversions,
          overallConversionRate: overallConversionRate.toFixed(2) + '%',
          biggestDropoff: biggestDropoff ? biggestDropoff.label : 'None',
        },
      };
    } catch (error) {
      logger.error('Error getting conversion funnel:', error);
      throw error;
    }
  }

  /**
   * Sync conversion metrics from App Store Connect
   * This would be called by a scheduled job
   */
  async syncConversionMetrics(daysBack = 7) {
    try {
      logger.info(`Syncing conversion metrics for the last ${daysBack} days...`);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Fetch metrics from App Store Connect
      const metricsData = await this.fetchConversionMetrics(startDate, endDate);

      // Store in database
      const results = await this.storeConversionMetrics(metricsData);

      logger.info(`Successfully synced ${results.length} days of conversion metrics`);
      return results;
    } catch (error) {
      logger.error('Error syncing conversion metrics:', error);
      throw error;
    }
  }

  /**
   * Get conversion metrics history for trends
   */
  async getConversionHistory(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const metrics = await ConversionMetrics.find({
        date: { $gte: startDate },
        period: 'daily',
      })
        .sort({ date: 1 })
        .select('date impressions downloads conversionRates.overallConversionRate');

      return metrics.map(m => ({
        date: m.date,
        impressions: m.impressions,
        downloads: m.downloads,
        conversionRate: m.conversionRates.overallConversionRate,
      }));
    } catch (error) {
      logger.error('Error getting conversion history:', error);
      throw error;
    }
  }

  /**
   * Helper: Get random number in range
   */
  getRandomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }
}

export default ConversionMetricsService;
