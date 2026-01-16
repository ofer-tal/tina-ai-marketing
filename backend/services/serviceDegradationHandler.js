/**
 * Service Degradation Handler
 *
 * Provides graceful degradation when external services are unavailable.
 * Features:
 * - Service availability tracking
 * - Fallback mode activation
 * - Cached data retrieval
 * - Mock data generation for testing
 * - User notification support
 */

import cacheService from './cacheService.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('service-degradation', 'degradation');

/**
 * Service degradation levels
 */
const DegradationLevel = {
  NORMAL: 'normal',           // All services operational
  DEGRADED: 'degraded',       // Some services unavailable, using fallbacks
  SEVERE: 'severe',           // Most services unavailable, limited functionality
  OFFLINE: 'offline'          // All external services unavailable
};

/**
 * Service degradation handler
 */
class ServiceDegradationHandler {
  constructor() {
    // Service status tracking
    this.serviceStatus = new Map();

    // Fallback configurations for each service
    this.fallbackConfig = {
      // AI Services
      fal_ai: {
        useMock: true,
        cacheOnly: true,
        mockGenerators: {
          generateVideo: this._mockVideoGeneration.bind(this),
          generateImage: this._mockImageGeneration.bind(this)
        }
      },
      runpod: {
        useMock: true,
        cacheOnly: true,
        mockGenerators: {
          generateVideo: this._mockVideoGeneration.bind(this)
        }
      },
      glm47: {
        useMock: true,
        cacheOnly: true,
        mockGenerators: {
          chat: this._mockChatResponse.bind(this),
          generateCaption: this._mockCaptionGeneration.bind(this)
        }
      },

      // Platform APIs
      tiktok: {
        useMock: false,
        cacheOnly: true,
        mockGenerators: {
          postVideo: this._mockPostVideo.bind(this),
          getTrendingAudio: this._mockTrendingAudio.bind(this)
        }
      },
      instagram: {
        useMock: false,
        cacheOnly: true,
        mockGenerators: {
          postVideo: this._mockPostVideo.bind(this)
        }
      },

      // Analytics Services
      google_analytics: {
        useMock: false,
        cacheOnly: true,
        mockGenerators: {
          getRealtimeReport: this._mockRealtimeReport.bind(this),
          getPageViews: this._mockPageViews.bind(this)
        }
      },

      // App Store Services
      appstore_connect: {
        useMock: false,
        cacheOnly: true,
        mockGenerators: {
          getAppDetails: this._mockAppDetails.bind(this),
          getSalesReport: this._mockSalesReport.bind(this)
        }
      },
      apple_search_ads: {
        useMock: false,
        cacheOnly: true,
        mockGenerators: {
          getCampaigns: this._mockCampaigns.bind(this),
          getSpend: this._mockSpend.bind(this)
        }
      }
    };

    // Degradation level
    this.currentLevel = DegradationLevel.NORMAL;
  }

  /**
   * Update service status
   * Called by API health monitor
   *
   * @param {string} serviceKey - Service identifier
   * @param {boolean} available - Whether service is available
   */
  updateServiceStatus(serviceKey, available) {
    const previousStatus = this.serviceStatus.get(serviceKey);
    const nowAvailable = available;

    this.serviceStatus.set(serviceKey, {
      available: nowAvailable,
      lastCheck: new Date(),
      lastUnavailable: previousStatus && !previousStatus.available && nowAvailable
        ? previousStatus.lastUnavailable
        : (!nowAvailable ? new Date() : null)
    });

    // Log status changes
    if (previousStatus && previousStatus.available !== nowAvailable) {
      if (nowAvailable) {
        logger.info(`Service recovered: ${serviceKey}`);
      } else {
        logger.warn(`Service unavailable: ${serviceKey}`);
      }
    }

    // Recalculate degradation level
    this._calculateDegradationLevel();
  }

  /**
   * Check if service is available
   *
   * @param {string} serviceKey - Service identifier
   * @returns {boolean} Service availability
   */
  isServiceAvailable(serviceKey) {
    const status = this.serviceStatus.get(serviceKey);
    return status ? status.available : true; // Default to available if not tracked
  }

  /**
   * Execute service call with fallback
   *
   * @param {string} serviceKey - Service identifier
   * @param {string} method - Method name
   * @param {Function} serviceCall - Actual service call
   * @param {Array} args - Arguments for service call
   * @returns {Promise<any>} Result or fallback data
   */
  async executeWithFallback(serviceKey, method, serviceCall, args = []) {
    const available = this.isServiceAvailable(serviceKey);

    if (available) {
      try {
        // Service available, execute call
        logger.debug(`Executing ${serviceKey}.${method}`);
        const result = await serviceCall(...args);

        // Cache successful results
        if (result && this.fallbackConfig[serviceKey]?.cacheOnly) {
          const cacheKey = this._generateCacheKey(serviceKey, method, args);
          const ttl = this._getCacheTTL(serviceKey);
          cacheService.set(cacheKey, result, ttl);
        }

        return result;

      } catch (error) {
        logger.warn(`Service call failed: ${serviceKey}.${method}`, {
          error: error.message
        });

        // Mark service as unavailable and return fallback
        this.updateServiceStatus(serviceKey, false);
        return await this._getFallback(serviceKey, method, args);
      }

    } else {
      // Service unavailable, use fallback
      logger.info(`Service unavailable, using fallback: ${serviceKey}.${method}`);
      return await this._getFallback(serviceKey, method, args);
    }
  }

  /**
   * Get fallback data for unavailable service
   *
   * @param {string} serviceKey - Service identifier
   * @param {string} method - Method name
   * @param {Array} args - Arguments
   * @returns {Promise<any>} Fallback data
   */
  async _getFallback(serviceKey, method, args) {
    const config = this.fallbackConfig[serviceKey];

    if (!config) {
      logger.error(`No fallback config for service: ${serviceKey}`);
      throw new Error(`Service ${serviceKey} is unavailable and no fallback configured`);
    }

    // Try cache first if cacheOnly is enabled
    if (config.cacheOnly) {
      const cacheKey = this._generateCacheKey(serviceKey, method, args);
      const cached = cacheService.get(cacheKey);

      if (cached) {
        logger.info(`Using cached data for ${serviceKey}.${method}`);
        return {
          success: true,
          cached: true,
          degraded: true,
          data: cached
        };
      }
    }

    // Use mock generator if available
    if (config.useMock && config.mockGenerators && config.mockGenerators[method]) {
      logger.info(`Using mock data for ${serviceKey}.${method}`);
      const mockData = await config.mockGenerators[method](...args);

      return {
        success: true,
        mock: true,
        degraded: true,
        data: mockData
      };
    }

    // No fallback available
    logger.error(`No fallback available for ${serviceKey}.${method}`);
    throw new Error(`Service ${serviceKey} is unavailable. Please try again later.`);
  }

  /**
   * Get current degradation level
   *
   * @returns {string} Degradation level
   */
  getDegradationLevel() {
    return this.currentLevel;
  }

  /**
   * Get all service statuses
   *
   * @returns {object} Service status summary
   */
  getServiceStatuses() {
    const statuses = {};

    for (const [key, status] of this.serviceStatus.entries()) {
      statuses[key] = {
        available: status.available,
        lastCheck: status.lastCheck,
        lastUnavailable: status.lastUnavailable
      };
    }

    return {
      level: this.currentLevel,
      services: statuses,
      timestamp: new Date()
    };
  }

  /**
   * Get user-friendly notification message
   *
   * @returns {object|null} Notification object or null if no degradation
   */
  getUserNotification() {
    if (this.currentLevel === DegradationLevel.NORMAL) {
      return null;
    }

    const unavailableServices = Array.from(this.serviceStatus.entries())
      .filter(([_, status]) => !status.available)
      .map(([key]) => this._formatServiceName(key));

    const messages = {
      [DegradationLevel.DEGRADED]: {
        type: 'warning',
        title: 'Some Services Unavailable',
        message: `We're experiencing issues with ${unavailableServices.join(', ')}. Using cached data where possible.`
      },
      [DegradationLevel.SEVERE]: {
        type: 'error',
        title: 'Multiple Services Unavailable',
        message: `Many external services are unavailable. Functionality is limited. We're working to restore full service.`
      },
      [DegradationLevel.OFFLINE]: {
        type: 'error',
        title: 'Offline Mode',
        message: 'All external services are unavailable. Running in limited offline mode.'
      }
    };

    return messages[this.currentLevel] || null;
  }

  /**
   * Calculate degradation level based on service status
   *
   * @private
   */
  _calculateDegradationLevel() {
    const services = Array.from(this.serviceStatus.values());
    const totalServices = services.length;
    const unavailableServices = services.filter(s => !s.available).length;

    if (totalServices === 0) {
      this.currentLevel = DegradationLevel.NORMAL;
      return;
    }

    const unavailablePercentage = (unavailableServices / totalServices) * 100;

    if (unavailablePercentage === 0) {
      this.currentLevel = DegradationLevel.NORMAL;
    } else if (unavailablePercentage < 25) {
      this.currentLevel = DegradationLevel.DEGRADED;
    } else if (unavailablePercentage < 75) {
      this.currentLevel = DegradationLevel.SEVERE;
    } else {
      this.currentLevel = DegradationLevel.OFFLINE;
    }

    logger.info(`Degradation level: ${this.currentLevel}`, {
      unavailableServices,
      totalServices,
      unavailablePercentage: `${unavailablePercentage.toFixed(1)}%`
    });
  }

  /**
   * Generate cache key for service call
   *
   * @private
   */
  _generateCacheKey(serviceKey, method, args) {
    const argsString = JSON.stringify(args);
    return `degradation:${serviceKey}:${method}:${argsString}`;
  }

  /**
   * Get cache TTL for service
   *
   * @private
   */
  _getCacheTTL(serviceKey) {
    const ttls = {
      fal_ai: 3600,      // 1 hour
      runpod: 3600,      // 1 hour
      glm47: 1800,       // 30 minutes
      tiktok: 300,       // 5 minutes
      instagram: 300,    // 5 minutes
      google_analytics: 300,  // 5 minutes
      appstore_connect: 600,  // 10 minutes
      apple_search_ads: 600   // 10 minutes
    };

    return ttls[serviceKey] || 300; // Default 5 minutes
  }

  /**
   * Format service name for display
   *
   * @private
   */
  _formatServiceName(serviceKey) {
    const names = {
      fal_ai: 'Fal.ai Video Generation',
      runpod: 'RunPod Video Generation',
      glm47: 'AI Content Generation',
      tiktok: 'TikTok',
      instagram: 'Instagram',
      google_analytics: 'Google Analytics',
      appstore_connect: 'App Store Connect',
      apple_search_ads: 'Apple Search Ads'
    };

    return names[serviceKey] || serviceKey;
  }

  // ============= MOCK DATA GENERATORS =============

  /**
   * Mock video generation
   *
   * @private
   */
  async _mockVideoGeneration(options = {}) {
    logger.info('Generating mock video', options);

    return {
      videoUrl: 'https://placehold.co/1080x1920/1a1a2e/ffffff?text=Mock+Video',
      thumbnailUrl: 'https://placehold.co/1080x1920/1a1a2e/ffffff?text=Mock+Thumbnail',
      duration: options.duration || 15,
      width: 1080,
      height: 1920,
      format: 'mp4',
      size: 2500000,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Mock image generation
   *
   * @private
   */
  async _mockImageGeneration(options = {}) {
    logger.info('Generating mock image', options);

    return {
      imageUrl: 'https://placehold.co/1080x1920/1a1a2e/ffffff?text=Mock+Image',
      thumbnailUrl: 'https://placehold.co/1080x1920/1a1a2e/ffffff?text=Mock+Thumbnail',
      width: 1080,
      height: 1920,
      format: 'png',
      size: 500000,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Mock chat response
   *
   * @private
   */
  async _mockChatResponse(messages, options = {}) {
    logger.info('Generating mock chat response', { messageCount: messages.length });

    return {
      content: '[Service Degraded] This is a mock AI response. The AI service is currently unavailable. Please try again later.',
      role: 'assistant',
      model: 'mock-model',
      finishReason: 'stop',
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      }
    };
  }

  /**
   * Mock caption generation
   *
   * @private
   */
  async _mockCaptionGeneration(storyData) {
    logger.info('Generating mock caption', { storyId: storyData.storyId });

    return {
      caption: '[Service Degraded] Engaging romantic story excerpt #blush #romance',
      hashtags: ['#blush', '#romance', '#stories', '#degraded'],
      hook: '✨ Discover your next favorite story',
      cta: 'Read more on the Blush app! 🔥'
    };
  }

  /**
   * Mock post video
   *
   * @private
   */
  async _mockPostVideo(videoData, platform) {
    logger.info('Mock posting video', { platform });

    return {
      success: true,
      postId: `mock_${platform}_${Date.now()}`,
      platform,
      url: `https://${platform}.com/mock/post/${Date.now()}`,
      scheduled: false,
      postedAt: new Date().toISOString(),
      message: '[Service Degraded] Video was not actually posted. Platform service is unavailable.'
    };
  }

  /**
   * Mock trending audio
   *
   * @private
   */
  async _mockTrendingAudio() {
    logger.info('Generating mock trending audio');

    return [
      {
        id: 'mock_audio_1',
        title: '[Mock] Trending Song 1',
        artist: 'Unknown Artist',
        duration: 30000,
        playCount: 1000000,
        audioUrl: 'https://example.com/mock/audio1.mp3'
      },
      {
        id: 'mock_audio_2',
        title: '[Mock] Trending Song 2',
        artist: 'Unknown Artist',
        duration: 25000,
        playCount: 800000,
        audioUrl: 'https://example.com/mock/audio2.mp3'
      }
    ];
  }

  /**
   * Mock realtime report
   *
   * @private
   */
  async _mockRealtimeReport() {
    logger.info('Generating mock realtime report');

    return {
      activeUsers: Math.floor(Math.random() * 100) + 50,
      pageViews: Math.floor(Math.random() * 500) + 200,
      bounceRate: (Math.random() * 20 + 30).toFixed(2),
      avgSessionDuration: Math.floor(Math.random() * 180) + 60
    };
  }

  /**
   * Mock page views
   *
   * @private
   */
  async _mockPageViews(startDate, endDate) {
    logger.info('Generating mock page views', { startDate, endDate });

    const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    const data = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      data.push({
        date: date.toISOString().split('T')[0],
        pageViews: Math.floor(Math.random() * 1000) + 500,
        uniqueVisitors: Math.floor(Math.random() * 500) + 200
      });
    }

    return data;
  }

  /**
   * Mock app details
   *
   * @private
   */
  async _mockAppDetails() {
    logger.info('Generating mock app details');

    return {
      appName: 'Blush - Romantic Stories',
      bundleId: 'com.blush.app',
      version: '1.0.0',
      appId: '1234567890'
    };
  }

  /**
   * Mock sales report
   *
   * @private
   */
  async _mockSalesReport(startDate, endDate) {
    logger.info('Generating mock sales report', { startDate, endDate });

    return {
      totalRevenue: Math.floor(Math.random() * 1000) + 500,
      units: Math.floor(Math.random() * 100) + 50,
      averagePrice: (Math.random() * 5 + 5).toFixed(2),
      proceeds: Math.floor(Math.random() * 800) + 400
    };
  }

  /**
   * Mock campaigns
   *
   * @private
   */
  async _mockCampaigns() {
    logger.info('Generating mock campaigns');

    return [
      {
        campaignId: 'mock_campaign_1',
        name: '[Mock] Summer Campaign',
        status: 'active',
        budget: 1000,
        spent: 500
      },
      {
        campaignId: 'mock_campaign_2',
        name: '[Mock] Winter Campaign',
        status: 'paused',
        budget: 800,
        spent: 600
      }
    ];
  }

  /**
   * Mock spend data
   *
   * @private
   */
  async _mockSpend(startDate, endDate) {
    logger.info('Generating mock spend data', { startDate, endDate });

    const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    const data = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      data.push({
        date: date.toISOString().split('T')[0],
        spend: Math.floor(Math.random() * 100) + 50,
        impressions: Math.floor(Math.random() * 10000) + 5000,
        clicks: Math.floor(Math.random() * 500) + 200,
        conversions: Math.floor(Math.random() * 50) + 10
      });
    }

    return data;
  }
}

// Export singleton instance
const serviceDegradationHandler = new ServiceDegradationHandler();
export default serviceDegradationHandler;
export { DegradationLevel };
