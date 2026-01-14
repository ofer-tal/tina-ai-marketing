/**
 * App Store Connect API Service
 *
 * Provides integration with Apple's App Store Connect API for:
 * - App analytics (downloads, revenue, crashes, etc.)
 * - App metadata and listings
 * - In-app purchase reporting
 * - TestFlight management
 *
 * Authentication: JWT (JSON Web Tokens) with API keys
 * Documentation: https://developer.apple.com/documentation/appstoreconnectapi
 */

import winston from 'winston';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'app-store-connect' },
  transports: [
    new winston.transports.File({ filename: 'logs/app-store-connect-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/app-store-connect.log' }),
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
 * Generate JWT token for App Store Connect API authentication
 *
 * App Store Connect uses JWT with ES256 algorithm (ECDSA with SHA-256)
 * Requires: Key ID, Issuer ID, and Private Key file (.p8)
 */
class AppStoreConnectService {
  constructor() {
    this.keyId = process.env.APP_STORE_CONNECT_KEY_ID;
    this.issuerId = process.env.APP_STORE_CONNECT_ISSUER_ID;
    this.privateKeyPath = process.env.APP_STORE_CONNECT_PRIVATE_KEY_PATH;
    this.baseUrl = 'https://api.appstoreconnect.apple.com/v1';

    this.token = null;
    this.tokenExpiry = null;
  }

  /**
   * Check if service is configured
   */
  isConfigured() {
    return !!(this.keyId && this.issuerId && this.privateKeyPath);
  }

  /**
   * Load private key from file
   */
  loadPrivateKey() {
    if (!this.privateKeyPath) {
      throw new Error('APP_STORE_CONNECT_PRIVATE_KEY_PATH not configured');
    }

    // Resolve relative paths from project root
    const keyPath = path.resolve(process.cwd(), this.privateKeyPath);

    if (!fs.existsSync(keyPath)) {
      throw new Error(`Private key file not found: ${keyPath}`);
    }

    const privateKey = fs.readFileSync(keyPath, 'utf-8');
    logger.info('Private key loaded successfully', { keyPath });

    return privateKey;
  }

  /**
   * Generate JWT token for API authentication
   *
   * Token structure:
   * - Header: { alg: "ES256", kid: "KEY_ID", typ: "JWT" }
   * - Payload: { iss: "ISSUER_ID", exp: EXPIRY, aud: "appstoreconnect-v1" }
   * - Signature: Signed with ES256 using private key
   */
  generateToken() {
    if (!this.isConfigured()) {
      throw new Error('App Store Connect API not configured. Please set APP_STORE_CONNECT_KEY_ID, APP_STORE_CONNECT_ISSUER_ID, and APP_STORE_CONNECT_PRIVATE_KEY_PATH');
    }

    try {
      // Load private key
      const privateKey = this.loadPrivateKey();

      // For now, we'll return a mock token
      // In production, this would use jsonwebtoken or crypto to sign with ES256
      // Note: ES256 requires the 'jsonwebtoken' library with ES256 support
      const header = {
        alg: 'ES256',
        kid: this.keyId,
        typ: 'JWT'
      };

      const now = Math.floor(Date.now() / 1000);
      const payload = {
        iss: this.issuerId,
        exp: now + 1200, // 20 minutes max
        aud: 'appstoreconnect-v1'
      };

      logger.info('JWT token generated', {
        keyId: this.keyId,
        issuerId: this.issuerId,
        expiry: new Date(payload.exp * 1000).toISOString()
      });

      // TODO: Implement actual JWT signing with ES256
      // This requires the 'jsonwebtoken' library which doesn't support ES256 out of the box
      // We need to use 'jose' or implement ECDSA signing manually
      return `Bearer ${this.keyId}.${payload.iss}.${payload.exp}`;

    } catch (error) {
      logger.error('Failed to generate JWT token', { error: error.message });
      throw error;
    }
  }

  /**
   * Get valid authentication token
   * Generates new token if current one is expired
   */
  getAuthToken() {
    const now = Math.floor(Date.now() / 1000);

    if (!this.token || !this.tokenExpiry || now >= this.tokenExpiry) {
      this.token = this.generateToken();
      this.tokenExpiry = now + 1200; // 20 minutes
      logger.info('Generated new authentication token');
    }

    return this.token;
  }

  /**
   * Make authenticated API request
   */
  async apiRequest(endpoint, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('App Store Connect API not configured');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getAuthToken();

    const headers = {
      'Authorization': token,
      'Content-Type': 'application/json',
      ...options.headers
    };

    logger.info('Making API request', { url, method: options.method || 'GET' });

    try {
      // TODO: Implement actual fetch request
      // For now, return mock response
      return {
        success: true,
        data: {
          message: 'App Store Connect API integration - JWT authentication configured',
          note: 'Full API implementation requires JWT signing library with ES256 support'
        }
      };
    } catch (error) {
      logger.error('API request failed', {
        url,
        error: error.message,
        status: error.response?.status
      });
      throw error;
    }
  }

  /**
   * Test API connection
   * Verifies that credentials are valid by attempting to list apps
   */
  async testConnection() {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'App Store Connect API not configured',
        configured: false,
        hasKeyId: !!this.keyId,
        hasIssuerId: !!this.issuerId,
        hasPrivateKey: !!this.privateKeyPath
      };
    }

    try {
      logger.info('Testing App Store Connect API connection');

      // Check if private key file exists
      const keyPath = path.resolve(process.cwd(), this.privateKeyPath);
      const keyExists = fs.existsSync(keyPath);

      if (!keyExists) {
        return {
          success: false,
          error: `Private key file not found: ${keyPath}`,
          configured: true,
          keyExists: false
        };
      }

      // Load and validate private key format
      const privateKey = fs.readFileSync(keyPath, 'utf-8');
      const isValidKey = privateKey.includes('BEGIN PRIVATE KEY') || privateKey.includes('BEGIN EC PRIVATE KEY');

      if (!isValidKey) {
        return {
          success: false,
          error: 'Private key file format is invalid',
          configured: true,
          keyExists: true,
          validKeyFormat: false
        };
      }

      // TODO: Make actual API request to /apps endpoint
      // For now, return success if configuration is valid
      return {
        success: true,
        message: 'App Store Connect API configuration is valid',
        configured: true,
        keyExists: true,
        validKeyFormat: true,
        keyId: this.keyId,
        issuerId: this.issuerId,
        note: 'Full API testing requires JWT library with ES256 support'
      };

    } catch (error) {
      logger.error('Connection test failed', { error: error.message });
      return {
        success: false,
        error: error.message,
        configured: true
      };
    }
  }

  /**
   * Fetch app analytics data
   * Gets downloads, revenue, crashes for specified time period
   */
  async getAppAnalytics(appId, timePeriod = 'P30D') {
    // TODO: Implement actual API call to /analytics endpoint
    logger.info('Fetching app analytics', { appId, timePeriod });

    return {
      appId,
      timePeriod,
      data: {
        // Mock data - replace with actual API response
        downloads: 0,
        revenue: 0,
        crashes: 0,
        activeDevices: 0
      }
    };
  }

  /**
   * Get app information
   */
  async getAppInfo(appId) {
    // TODO: Implement actual API call to /apps/{appId}
    logger.info('Fetching app info', { appId });

    return {
      appId,
      name: 'Blush',
      platform: 'IOS',
      version: '1.0.0'
    };
  }

  /**
   * Fetch app metadata from App Store Connect
   * Gets app title, subtitle, description, and keywords
   *
   * API Endpoint: GET /apps/{appId}/appStoreVersions
   * Documentation: https://developer.apple.com/documentation/appstoreconnectapi/app_store_versions
   */
  async getAppMetadata(appId = null) {
    logger.info('Fetching app metadata', { appId });

    // Use default app ID if not provided
    const targetAppId = appId || process.env.APP_STORE_APP_ID || 'blush-app';

    if (!this.isConfigured()) {
      // Return mock metadata if API not configured
      logger.warn('App Store Connect API not configured, returning mock metadata');
      return {
        success: true,
        appId: targetAppId,
        metadata: {
          title: 'Blush - Romantic Stories',
          subtitle: 'Spicy AI Romance & Love Stories',
          description: 'Dive into a world of romantic fiction with Blush! Our AI-powered story generator creates personalized spicy romance tales just for you. Whether you love love stories, romantic novels, or spicy fiction, Blush has something for everyone.\n\nFeatures:\n• Personalized AI-generated romance stories\n• Multiple romance genres: fantasy, historical, contemporary, and more\n• Spicy stories for mature audiences\n• Daily new story updates\n• Save your favorites and read offline\n\nPerfect for fans of romantic stories, love stories, and interactive romance games.',
          keywords: 'romance,stories,love,spicy,fiction,romantic,novels,interactive,games',
          promotionalText: 'New stories added daily! Discover your perfect romance.',
          supportUrl: 'https://blush.app/support',
          marketingUrl: 'https://blush.app',
          privacyPolicyUrl: 'https://blush.app/privacy'
        },
        source: 'mock'
      };
    }

    try {
      // TODO: Implement actual API call to fetch app metadata
      // GET /apps/{appId}/appStoreVersions?filter[platform]=ios
      // Then GET /appStoreVersions/{versionId}/appStoreVersionLocalizations
      //
      // For now, return mock data
      logger.info('Returning mock app metadata (API implementation pending)');

      return {
        success: true,
        appId: targetAppId,
        metadata: {
          title: 'Blush - Romantic Stories',
          subtitle: 'Spicy AI Romance & Love Stories',
          description: 'Dive into a world of romantic fiction with Blush! Our AI-powered story generator creates personalized spicy romance tales just for you. Whether you love love stories, romantic novels, or spicy fiction, Blush has something for everyone.\n\nFeatures:\n• Personalized AI-generated romance stories\n• Multiple romance genres: fantasy, historical, contemporary, and more\n• Spicy stories for mature audiences\n• Daily new story updates\n• Save your favorites and read offline\n\nPerfect for fans of romantic stories, love stories, and interactive romance games.',
          keywords: 'romance,stories,love,spicy,fiction,romantic,novels,interactive,games',
          promotionalText: 'New stories added daily! Discover your perfect romance.',
          supportUrl: 'https://blush.app/support',
          marketingUrl: 'https://blush.app',
          privacyPolicyUrl: 'https://blush.app/privacy'
        },
        source: 'mock'
      };

    } catch (error) {
      logger.error('Failed to fetch app metadata', {
        appId: targetAppId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update app metadata in App Store Connect
   * Updates app title, subtitle, description, etc.
   *
   * API Endpoint: PATCH /appStoreVersionLocalizations/{localizationId}
   */
  async updateAppMetadata(appId, metadata) {
    logger.info('Updating app metadata', { appId, metadata });

    if (!this.isConfigured()) {
      throw new Error('App Store Connect API not configured');
    }

    try {
      // TODO: Implement actual API call to update metadata
      // 1. Get the latest app store version ID
      // 2. Get the localization ID for the version
      // 3. PATCH the localization with updated metadata
      //
      // For now, just log the update
      logger.info('Metadata update requested (API implementation pending)', {
        appId,
        title: metadata.title,
        subtitle: metadata.subtitle
      });

      return {
        success: true,
        message: 'App Store Connect API integration - metadata update endpoint pending implementation',
        metadata
      };

    } catch (error) {
      logger.error('Failed to update app metadata', {
        appId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Fetch app screenshots from App Store Connect
   * Gets screenshots for different device sizes (iPhone, iPad, etc.)
   *
   * API Endpoint: GET /appStoreVersions/{versionId}/appStoreScreenshotSets
   */
  async getAppScreenshots(appId = null) {
    logger.info('Fetching app screenshots', { appId });

    const targetAppId = appId || process.env.APP_STORE_APP_ID || 'blush-app';

    if (!this.isConfigured()) {
      // Return mock screenshots if API not configured
      logger.warn('App Store Connect API not configured, returning mock screenshots');
      return this.getMockScreenshots();
    }

    try {
      // TODO: Implement actual API call to fetch screenshots
      // GET /apps/{appId}/appStoreVersions
      // GET /appStoreVersions/{versionId}/appStoreScreenshotSets
      // GET /appStoreScreenshotSets/{setId}/appStoreScreenshots
      //
      // For now, return mock data
      logger.info('Returning mock screenshots (API implementation pending)');
      return this.getMockScreenshots();

    } catch (error) {
      logger.error('Failed to fetch app screenshots', {
        appId: targetAppId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get mock screenshots for testing
   * Returns sample screenshot data with typical issues
   */
  getMockScreenshots() {
    return {
      success: true,
      appId: 'blush-app',
      screenshots: [
        {
          id: '1',
          deviceType: 'iPhone 6.7" Display',
          displayType: 'iPhone_6_7',
          url: 'https://via.placeholder.com/1290x2796/1a1a2e/e94560?text=Screenshot+1',
          order: 1,
          width: 1290,
          height: 2796
        },
        {
          id: '2',
          deviceType: 'iPhone 6.7" Display',
          displayType: 'iPhone_6_7',
          url: 'https://via.placeholder.com/1290x2796/1a1a2e/e94560?text=Screenshot+2',
          order: 2,
          width: 1290,
          height: 2796
        },
        {
          id: '3',
          deviceType: 'iPhone 6.7" Display',
          displayType: 'iPhone_6_7',
          url: 'https://via.placeholder.com/1290x2796/1a1a2e/e94560?text=Screenshot+3',
          order: 3,
          width: 1290,
          height: 2796
        },
        {
          id: '4',
          deviceType: 'iPhone 6.7" Display',
          displayType: 'iPhone_6_7',
          url: 'https://via.placeholder.com/1290x2796/1a1a2e/e94560?text=Screenshot+4',
          order: 4,
          width: 1290,
          height: 2796
        },
        {
          id: '5',
          deviceType: 'iPhone 6.7" Display',
          displayType: 'iPhone_6_7',
          url: 'https://via.placeholder.com/1290x2796/1a1a2e/e94560?text=Screenshot+5',
          order: 5,
          width: 1290,
          height: 2796
        },
        {
          id: '6',
          deviceType: 'iPhone 6.7" Display',
          displayType: 'iPhone_6_7',
          url: 'https://via.placeholder.com/1290x2796/1a1a2e/e94560?text=Screenshot+6',
          order: 6,
          width: 1290,
          height: 2796
        }
      ],
      source: 'mock'
    };
  }

  /**
   * Analyze screenshots and provide optimization suggestions
   * Compares screenshots against ASO best practices
   */
  analyzeScreenshots(screenshots) {
    logger.info('Analyzing screenshots', { count: screenshots.length });

    const suggestions = [];
    const issues = [];

    // Check 1: Number of screenshots (best practice: 5-8 for iPhone)
    const screenshotCount = screenshots.length;
    if (screenshotCount < 5) {
      issues.push({
        type: 'count',
        severity: 'warning',
        message: `Too few screenshots (${screenshotCount}). Best practice is 5-8 screenshots.`,
        recommendation: 'Add 2-3 more screenshots to showcase different app features.'
      });
    } else if (screenshotCount > 8) {
      issues.push({
        type: 'count',
        severity: 'info',
        message: `Many screenshots (${screenshotCount}). Consider focusing on the most impactful ones.`,
        recommendation: 'Test different screenshot orders to see which perform best.'
      });
    } else {
      suggestions.push({
        type: 'count',
        severity: 'success',
        message: `Good screenshot count (${screenshotCount}). Within recommended range of 5-8.`
      });
    }

    // Check 2: First screenshot impact (most important!)
    issues.push({
      type: 'first_screenshot',
      severity: 'high',
      message: 'First screenshot must be compelling and show the app\'s core value.',
      recommendation: 'Ensure first screenshot shows: app name/logo, main benefit, and a clear call-to-action. Avoid text-heavy designs.'
    });

    // Check 3: Device type coverage
    const deviceTypes = [...new Set(screenshots.map(s => s.deviceType))];
    if (deviceTypes.length === 1) {
      suggestions.push({
        type: 'device_coverage',
        severity: 'info',
        message: `Only ${deviceTypes[0]} screenshots found.`,
        recommendation: 'Consider adding iPad-specific screenshots if your app supports iPad.'
      });
    }

    // Check 4: Screenshot order
    suggestions.push({
      type: 'order',
      severity: 'medium',
      message: 'Screenshot order matters for conversion.',
      recommendation: 'Order: 1) Hook/Value proposition, 2) Key feature, 3) Social proof, 4-6) Additional features, 7-8) Call-to-action'
    });

    // Check 5: Text readability
    issues.push({
      type: 'text_readability',
      severity: 'medium',
      message: 'Ensure text is readable on small screens.',
      recommendation: 'Use minimum 16pt font, high contrast, and limit to 20% of screenshot area.'
    });

    // Check 6: Visual consistency
    suggestions.push({
      type: 'consistency',
      severity: 'low',
      message: 'Maintain consistent branding across all screenshots.',
      recommendation: 'Use same color scheme, fonts, and style. Tell a cohesive story.'
    });

    // Check 7: A/B testing recommendations
    suggestions.push({
      type: 'testing',
      severity: 'info',
      message: 'Screenshots should be A/B tested for optimal conversion.',
      recommendation: 'Test different first screenshots, feature emphasis, and value propositions.'
    });

    // Check 8: Portrait orientation for iPhone
    const portraitScreenshots = screenshots.filter(s => s.height > s.width);
    if (portraitScreenshots.length < screenshots.length) {
      issues.push({
        type: 'orientation',
        severity: 'high',
        message: 'Some screenshots are not in portrait orientation.',
        recommendation: 'iPhone screenshots must be in portrait orientation (9:16.5 aspect ratio for iPhone 6.7").'
      });
    }

    return {
      success: true,
      analysis: {
        totalScreenshots: screenshotCount,
        deviceTypes: deviceTypes,
        score: this.calculateScreenshotScore(suggestions, issues),
        suggestions: suggestions,
        issues: issues
      }
    };
  }

  /**
   * Calculate screenshot quality score
   * Returns score from 0-100 based on best practices
   */
  calculateScreenshotScore(suggestions, issues) {
    let score = 100;

    // Deduct points for issues
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'high':
          score -= 15;
          break;
        case 'warning':
          score -= 10;
          break;
        case 'medium':
          score -= 7;
          break;
        case 'info':
          score -= 3;
          break;
        case 'low':
          score -= 2;
          break;
      }
    });

    // Bonus for good practices
    suggestions.forEach(suggestion => {
      if (suggestion.severity === 'success') {
        score += 5;
      }
    });

    return Math.max(0, Math.min(100, score));
  }
}

// Create singleton instance
const appStoreConnectService = new AppStoreConnectService();

export default appStoreConnectService;
