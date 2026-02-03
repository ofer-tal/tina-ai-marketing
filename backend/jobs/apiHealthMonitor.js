import schedulerService from '../services/scheduler.js';
import appStoreConnectService from '../services/appStoreConnectService.js';
import appleSearchAdsService from '../services/appleSearchAdsService.js';
import tiktokPostingService from '../services/tiktokPostingService.js';
import googleAnalyticsService from '../services/googleAnalyticsService.js';
import glmService from '../services/glmService.js';
import falAiService from '../services/falAiService.js';
import runPodService from '../services/runPodService.js';
import mongoose from 'mongoose';
import { getLogger } from '../utils/logger.js';
import serviceDegradationHandler from '../services/serviceDegradationHandler.js';
import Strategy from '../models/Strategy.js';

const logger = getLogger('api-health-monitor', 'api-health-monitor');

/**
 * Get Strategy model
 * Uses the actual Strategy model from models/Strategy.js
 */
const getStrategyModel = () => {
  return Strategy;
};

/**
 * API Health Monitoring Job
 *
 * Periodically checks health of external API connections:
 * - Step 1: Set up health check job
 * - Step 2: Test each API connection
 * - Step 3: Log any failures
 * - Step 4: Alert on repeated failures
 * - Step 5: Track uptime metrics
 *
 * Runs every 30 minutes by default (configurable)
 */
class ApiHealthMonitorJob {
  constructor() {
    this.jobName = 'api-health-monitor';
    this.isScheduled = false;
    this.failureThreshold = 3; // Alert after 3 consecutive failures
    this.healthStatus = new Map(); // Track health status for each API
  }

  /**
   * Start the scheduled API health monitor job
   * Uses SchedulerService for centralized job management
   *
   * @param {object} options - Scheduling options
   * @param {string} options.interval - Interval in cron format (default: every 30 minutes)
   * @param {string} options.timezone - Timezone for scheduling (default: "UTC")
   */
  start(options = {}) {
    if (this.isScheduled) {
      logger.warn('API health monitor already started');
      return;
    }

    try {
      // Get interval from environment or options
      // Default: Run every 30 minutes
      const cronExpression = options.interval || process.env.API_HEALTH_CHECK_INTERVAL || '*/30 * * * *';
      const timezone = options.timezone || process.env.API_HEALTH_CHECK_TIMEZONE || 'UTC';

      logger.info('Starting API health monitor scheduler', {
        jobName: this.jobName,
        cronExpression,
        timezone
      });

      // Start the scheduler service if not already running
      if (schedulerService.getStatus().status !== 'running') {
        schedulerService.start();
        logger.info('Scheduler service started');
      }

      // Schedule the job using SchedulerService
      schedulerService.schedule(
        this.jobName,
        cronExpression,
        async () => await this.execute(),
        {
          timezone,
          immediate: options.runImmediately || false
        }
      );

      this.isScheduled = true;
      logger.info('API health monitor scheduler started successfully', {
        jobName: this.jobName,
        cronExpression,
        timezone
      });

    } catch (error) {
      logger.error('Failed to start API health monitor scheduler', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Stop the scheduled API health monitor job
   */
  stop() {
    if (!this.isScheduled) {
      logger.warn('API health monitor not currently scheduled');
      return;
    }

    try {
      schedulerService.unschedule(this.jobName);
      this.isScheduled = false;
      logger.info('API health monitor scheduler stopped', {
        jobName: this.jobName
      });
    } catch (error) {
      logger.error('Failed to stop API health monitor scheduler', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Execute the API health check
   * Main entry point for the scheduled job
   */
  async execute() {
    const startTime = Date.now();
    logger.info('Executing API health check...');

    try {
      // Check all API connections
      const healthResults = await this.checkAllApis();

      // Log failures
      this.logFailures(healthResults);

      // Alert on repeated failures
      await this.alertOnFailures(healthResults);

      // Track uptime metrics
      await this.trackUptimeMetrics(healthResults);

      const duration = Date.now() - startTime;
      logger.info('API health check completed', {
        duration: `${duration}ms`,
        totalApis: healthResults.length,
        healthy: healthResults.filter(r => r.healthy).length,
        unhealthy: healthResults.filter(r => !r.healthy).length
      });

    } catch (error) {
      logger.error('Error during API health check', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Check all API connections
   * Returns health status for each API
   *
   * @returns {Array} Array of health check results
   */
  async checkAllApis() {
    const apis = [
      {
        name: 'App Store Connect',
        key: 'appstore_connect',
        check: () => this.checkAppStoreConnect()
      },
      {
        name: 'Apple Search Ads',
        key: 'apple_search_ads',
        check: () => this.checkAppleSearchAds()
      },
      {
        name: 'TikTok',
        key: 'tiktok',
        check: () => this.checkTikTok()
      },
      {
        name: 'Google Analytics',
        key: 'google_analytics',
        check: () => this.checkGoogleAnalytics()
      },
      {
        name: 'GLM4.7 AI',
        key: 'glm47',
        check: () => this.checkGLM47()
      },
      {
        name: 'Fal.ai',
        key: 'fal_ai',
        check: () => this.checkFalAi()
      },
      {
        name: 'RunPod',
        key: 'runpod',
        check: () => this.checkRunPod()
      }
    ];

    const results = [];

    for (const api of apis) {
      try {
        logger.info(`Checking ${api.name}...`);
        const result = await api.check();
        results.push({
          name: api.name,
          key: api.key,
          ...result
        });

        // Update health status tracking
        this.updateHealthStatus(api.key, result.healthy);

        // Update service degradation handler
        serviceDegradationHandler.updateServiceStatus(api.key, result.healthy);

        logger.info(`${api.name} health check completed`, {
          healthy: result.healthy,
          responseTime: result.responseTime
        });

      } catch (error) {
        logger.error(`Error checking ${api.name}`, {
          error: error.message
        });

        results.push({
          name: api.name,
          key: api.key,
          healthy: false,
          error: error.message,
          responseTime: null
        });

        // Update health status tracking
        this.updateHealthStatus(api.key, false);

        // Update service degradation handler
        serviceDegradationHandler.updateServiceStatus(api.key, false);
      }
    }

    return results;
  }

  /**
   * Check App Store Connect API health
   *
   * @returns {object} Health check result
   */
  async checkAppStoreConnect() {
    const startTime = Date.now();

    try {
      // Check if API is configured
      const isConfigured = !!(
        process.env.APP_STORE_CONNECT_KEY_ID &&
        process.env.APP_STORE_CONNECT_ISSUER_ID &&
        process.env.APP_STORE_CONNECT_PRIVATE_KEY_PATH
      );

      if (!isConfigured) {
        return {
          healthy: false,
          configured: false,
          error: 'API not configured',
          responseTime: Date.now() - startTime
        };
      }

      // Attempt a simple API call to test connectivity
      // Get app details (lightweight call)
      await appStoreConnectService.getAppDetails();

      return {
        healthy: true,
        configured: true,
        responseTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        healthy: false,
        configured: true,
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check Apple Search Ads API health
   *
   * @returns {object} Health check result
   */
  async checkAppleSearchAds() {
    const startTime = Date.now();

    try {
      // Check if API is configured with JWT credentials
      const isConfigured = !!(
        process.env.SEARCH_ADS_CLIENT_ID &&
        process.env.SEARCH_ADS_TEAM_ID &&
        process.env.SEARCH_ADS_KEY_ID &&
        process.env.SEARCH_ADS_PRIVATE_KEY_PATH &&
        process.env.SEARCH_ADS_ORGANIZATION_ID
      );

      if (!isConfigured) {
        return {
          healthy: false,
          configured: false,
          error: 'API not configured',
          responseTime: Date.now() - startTime
        };
      }

      // Attempt a simple API call to test connectivity
      // Get campaign list (lightweight call)
      await appleSearchAdsService.getCampaigns();

      return {
        healthy: true,
        configured: true,
        responseTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        healthy: false,
        configured: true,
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check TikTok API health
   *
   * @returns {object} Health check result
   */
  async checkTikTok() {
    const startTime = Date.now();

    try {
      // Check if API is configured
      const isConfigured = !!(
        process.env.TIKTOK_APP_KEY &&
        process.env.TIKTOK_APP_SECRET
      );

      if (!isConfigured) {
        return {
          healthy: false,
          configured: false,
          error: 'API not configured',
          responseTime: Date.now() - startTime
        };
      }

      // Attempt a simple API call to test connectivity
      // Get user info (lightweight call)
      await tiktokPostingService.getUserInfo();

      return {
        healthy: true,
        configured: true,
        responseTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        healthy: false,
        configured: true,
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check Google Analytics API health
   *
   * @returns {object} Health check result
   */
  async checkGoogleAnalytics() {
    const startTime = Date.now();

    try {
      // Check if API is configured
      const isConfigured = !!(
        process.env.GOOGLE_ANALYTICS_VIEW_ID ||
        process.env.GOOGLE_ANALYTICS_PROPERTY_ID
      );

      if (!isConfigured) {
        return {
          healthy: false,
          configured: false,
          error: 'API not configured',
          responseTime: Date.now() - startTime
        };
      }

      // Attempt a simple API call to test connectivity
      // Get real-time report (lightweight call)
      await googleAnalyticsService.getRealtimeReport();

      return {
        healthy: true,
        configured: true,
        responseTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        healthy: false,
        configured: true,
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check GLM4.7 AI API health
   *
   * @returns {object} Health check result
   */
  async checkGLM47() {
    const startTime = Date.now();

    try {
      // Check if API is configured
      const isConfigured = !!process.env.GLM47_API_KEY;

      if (!isConfigured) {
        return {
          healthy: false,
          configured: false,
          error: 'API not configured',
          responseTime: Date.now() - startTime
        };
      }

      // Attempt a simple API call to test connectivity
      // Simple test message
      const testMessage = {
        role: 'user',
        content: 'Hello'
      };

      await glmService.chat([testMessage], {
        maxTokens: 10,
        temperature: 0.1
      });

      return {
        healthy: true,
        configured: true,
        responseTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        healthy: false,
        configured: true,
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check Fal.ai API health
   *
   * @returns {object} Health check result
   */
  async checkFalAi() {
    const startTime = Date.now();

    try {
      // Check if API is configured
      const isConfigured = !!process.env.FAL_AI_API_KEY;

      if (!isConfigured) {
        return {
          healthy: false,
          configured: false,
          error: 'API not configured',
          responseTime: Date.now() - startTime
        };
      }

      // Check if service has a health check method
      if (typeof falAiService.healthCheck === 'function') {
        await falAiService.healthCheck();
      } else {
        // Fallback: just verify configuration
        logger.warn('Fal.ai health check not implemented, using configuration check');
      }

      return {
        healthy: true,
        configured: true,
        responseTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        healthy: false,
        configured: true,
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check RunPod API health
   *
   * @returns {object} Health check result
   */
  async checkRunPod() {
    const startTime = Date.now();

    try {
      // Check if API is configured
      const isConfigured = !!process.env.RUNPOD_API_KEY;

      if (!isConfigured) {
        return {
          healthy: false,
          configured: false,
          error: 'API not configured',
          responseTime: Date.now() - startTime
        };
      }

      // Check if service has a health check method
      if (typeof runPodService.healthCheck === 'function') {
        await runPodService.healthCheck();
      } else {
        // Fallback: just verify configuration
        logger.warn('RunPod health check not implemented, using configuration check');
      }

      return {
        healthy: true,
        configured: true,
        responseTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        healthy: false,
        configured: true,
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Update health status tracking for an API
   *
   * @param {string} apiKey - API key
   * @param {boolean} healthy - Whether the API is healthy
   */
  updateHealthStatus(apiKey, healthy) {
    if (!this.healthStatus.has(apiKey)) {
      this.healthStatus.set(apiKey, {
        consecutiveFailures: 0,
        lastCheck: new Date(),
        lastFailure: null,
        uptime: 100 // Start with 100% uptime
      });
    }

    const status = this.healthStatus.get(apiKey);
    status.lastCheck = new Date();

    if (healthy) {
      status.consecutiveFailures = 0;
    } else {
      status.consecutiveFailures++;
      status.lastFailure = new Date();
    }

    // Calculate uptime percentage (simple moving average)
    // Weight: 90% previous uptime, 10% current status
    const currentUptime = healthy ? 100 : 0;
    status.uptime = Math.round((status.uptime * 0.9) + (currentUptime * 0.1));

    this.healthStatus.set(apiKey, status);
  }

  /**
   * Log any failures from health check results
   *
   * @param {Array} healthResults - Health check results
   */
  logFailures(healthResults) {
    const failures = healthResults.filter(r => !r.healthy);

    if (failures.length === 0) {
      logger.info('All APIs healthy');
      return;
    }

    logger.warn('API health check failures detected', {
      count: failures.length,
      apis: failures.map(f => ({
        name: f.name,
        error: f.error,
        configured: f.configured
      }))
    });
  }

  /**
   * Alert on repeated failures
   *
   * @param {Array} healthResults - Health check results
   */
  async alertOnFailures(healthResults) {
    const alerts = [];

    for (const [apiKey, status] of this.healthStatus.entries()) {
      if (status.consecutiveFailures >= this.failureThreshold) {
        const api = healthResults.find(r => r.key === apiKey);
        if (api) {
          alerts.push({
            api: api.name,
            key: apiKey,
            consecutiveFailures: status.consecutiveFailures,
            lastFailure: status.lastFailure,
            uptime: status.uptime
          });
        }
      }
    }

    if (alerts.length > 0) {
      logger.error('API health alerts: Repeated failures detected', {
        count: alerts.length,
        alerts
      });

      // Create strategy entries for alerts
      for (const alert of alerts) {
        try {
          await getStrategyModel().create({
            type: 'alert',  // Valid enum value for Strategy model
            title: `⚠️ API Health Alert: ${alert.api}`,
            content: `${alert.api} API has failed ${alert.consecutiveFailures} consecutive health checks. Current uptime: ${alert.uptime}%. Last failure: ${alert.lastFailure.toISOString()}`,
            reasoning: 'Repeated API failures may indicate service degradation or configuration issues. Immediate attention required to prevent service disruption.',
            status: 'pending',  // Valid enum value for Strategy model
            priority: 'high',
            expectedOutcome: 'API connectivity restored',
            createdAt: new Date()
          });

          logger.info(`Created health alert for ${alert.api}`);

        } catch (error) {
          logger.error(`Failed to create health alert for ${alert.api}`, {
            error: error.message
          });
        }
      }
    }
  }

  /**
   * Track uptime metrics in database
   *
   * @param {Array} healthResults - Health check results
   */
  async trackUptimeMetrics(healthResults) {
    try {
      // Store health check results in strategy collection for historical tracking
      const summary = {
        type: 'analysis',  // Valid enum value for Strategy model
        title: `API Health Check - ${new Date().toISOString()}`,
        content: this.generateHealthReport(healthResults),
        reasoning: 'Automated health monitoring report for all external API connections',
        status: 'completed',  // Valid enum value for Strategy model (reports are completed when created)
        priority: 'low',
        dataReferences: healthResults.map(r => ({
          api: r.name,
          healthy: r.healthy,
          responseTime: r.responseTime,
          configured: r.configured
        })),
        createdAt: new Date()
      };

      await getStrategyModel().create(summary);

      logger.info('API health metrics tracked successfully');

    } catch (error) {
      logger.error('Failed to track API health metrics', {
        error: error.message
      });
    }
  }

  /**
   * Generate human-readable health report
   *
   * @param {Array} healthResults - Health check results
   * @returns {string} Markdown report
   */
  generateHealthReport(healthResults) {
    const healthy = healthResults.filter(r => r.healthy);
    const unhealthy = healthResults.filter(r => !r.healthy);

    let report = '# API Health Check Report\n\n';
    report += `**Timestamp:** ${new Date().toISOString()}\n`;
    report += `**Total APIs:** ${healthResults.length}\n`;
    report += `**Healthy:** ${healthy.length}\n`;
    report += `**Unhealthy:** ${unhealthy.length}\n\n`;

    if (healthy.length > 0) {
      report += '## ✅ Healthy APIs\n\n';
      healthy.forEach(api => {
        report += `- **${api.name}** (${api.responseTime}ms)\n`;
      });
      report += '\n';
    }

    if (unhealthy.length > 0) {
      report += '## ❌ Unhealthy APIs\n\n';
      unhealthy.forEach(api => {
        report += `- **${api.name}**\n`;
        report += `  - Error: ${api.error}\n`;
        report += `  - Configured: ${api.configured ? 'Yes' : 'No'}\n`;
      });
      report += '\n';
    }

    // Add uptime statistics
    report += '## 📊 Uptime Statistics\n\n';
    for (const [apiKey, status] of this.healthStatus.entries()) {
      const api = healthResults.find(r => r.key === apiKey);
      if (api) {
        report += `- **${api.name}**\n`;
        report += `  - Uptime: ${status.uptime}%\n`;
        report += `  - Consecutive Failures: ${status.consecutiveFailures}\n`;
        if (status.lastFailure) {
          report += `  - Last Failure: ${status.lastFailure.toISOString()}\n`;
        }
      }
    }

    return report;
  }

  /**
   * Get current health status for all APIs
   *
   * @returns {object} Health status summary
   */
  getHealthStatus() {
    const status = {};

    for (const [key, value] of this.healthStatus.entries()) {
      status[key] = {
        ...value,
        healthy: value.consecutiveFailures === 0
      };
    }

    return status;
  }

  /**
   * Get health status for a specific API
   *
   * @param {string} apiKey - API key
   * @returns {object|null} Health status or null if not found
   */
  getApiHealthStatus(apiKey) {
    const status = this.healthStatus.get(apiKey);
    if (!status) {
      return null;
    }

    return {
      ...status,
      healthy: status.consecutiveFailures === 0
    };
  }
}

// Export singleton instance
const apiHealthMonitorJob = new ApiHealthMonitorJob();
export default apiHealthMonitorJob;
