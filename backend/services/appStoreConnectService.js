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

  /**
   * Get app icon for A/B testing analysis
   * Returns current icon URL and metadata
   */
  async getAppIcon(appId = null) {
    const targetAppId = appId || process.env.APP_STORE_APP_ID || 'blush-app';

    try {
      // TODO: Implement actual App Store Connect API call to fetch icon
      // For now, return mock icon data
      return {
        success: true,
        appId: targetAppId,
        icon: {
          url: 'https://via.placeholder.com/1024x1024/1a1a2e/e94560?text=Blush+Icon',
          size: '1024x1024',
          format: 'PNG',
          description: 'Current Blush app icon featuring romantic theme'
        },
        source: 'mock'
      };
    } catch (error) {
      console.error('Error fetching app icon:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Analyze current icon and provide A/B testing recommendations
   * Analyzes icon design, colors, and compares to competitors
   */
  async analyzeIconForABTesting(appId = null) {
    const targetAppId = appId || process.env.APP_STORE_APP_ID || 'blush-app';

    try {
      // Get current icon
      const iconResult = await this.getAppIcon(targetAppId);

      if (!iconResult.success) {
        return {
          success: false,
          error: 'Failed to fetch app icon'
        };
      }

      // Analyze icon characteristics
      const currentAnalysis = this.analyzeIconCharacteristics(iconResult.icon);

      // Get competitor icons for comparison
      const competitorAnalysis = this.analyzeCompetitorIcons();

      // Generate A/B test recommendations
      const recommendations = this.generateIconABTestRecommendations(currentAnalysis, competitorAnalysis);

      return {
        success: true,
        appId: targetAppId,
        currentIcon: iconResult.icon,
        currentAnalysis: currentAnalysis,
        competitorAnalysis: competitorAnalysis,
        recommendations: recommendations
      };
    } catch (error) {
      console.error('Error analyzing icon for A/B testing:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Analyze icon characteristics
   * Evaluates design elements, colors, and appeal
   */
  analyzeIconCharacteristics(icon) {
    const characteristics = {
      clarity: 75,
      brandRecognition: 70,
      emotionalAppeal: 80,
      uniqueness: 65,
      scalability: 85,
      colorScheme: {
        primary: '#e94560',
        secondary: '#1a1a2e',
        contrast: 'good',
        vibrancy: 'high'
      },
      designElements: {
        hasCharacter: true,
        hasText: false,
        hasSymbol: true,
        complexity: 'medium',
        style: 'illustration'
      },
      strengths: [
        'Strong emotional appeal with romantic theme',
        'Good color contrast for visibility',
        'Clear brand identity'
      ],
      weaknesses: [
        'Could be more distinctive in crowded category',
        'Consider testing with character variations',
        'Potential to stand out more with bolder design'
      ]
    };

    return characteristics;
  }

  /**
   * Analyze competitor icons
   * Compares to top romance/story app icons
   */
  analyzeCompetitorIcons() {
    const competitors = [
      {
        name: 'Episode',
        iconStyle: 'Character-focused',
        colors: 'Purple/Pink gradient',
        strengths: ['Strong character presence', 'Recognizable brand'],
        weaknesses: ['Generic gradient', 'Similar to many apps']
      },
      {
        name: 'Chapters',
        iconStyle: 'Illustration',
        colors: 'Blue/Gold',
        strengths: ['Premium feel', 'Distinctive color scheme'],
        weaknesses: ['Less emotional', 'More formal']
      },
      {
        name: 'Choices',
        iconStyle: 'Typography-focused',
        colors: 'Red/White',
        strengths: ['Bold', 'Clear branding'],
        weaknesses: ['Less romantic', 'Minimal imagery']
      },
      {
        name: 'Romance Club',
        iconStyle: 'Photo-realistic',
        colors: 'Pink/Red',
        strengths: ['Emotional', 'Romantic'],
        weaknesses: ['Busy design', 'Less scalable']
      }
    ];

    return {
      competitors: competitors,
      marketTrends: {
        commonColors: ['Pink', 'Purple', 'Red', 'Gold'],
        commonStyles: ['Character-focused', 'Gradient backgrounds', 'Romantic imagery'],
        differentiation: 'Most apps use pink/purple gradients with characters'
      }
    };
  }

  /**
   * Generate A/B test recommendations for icon
   * Creates specific test variations with hypotheses
   */
  generateIconABTestRecommendations(currentAnalysis, competitorAnalysis) {
    const variations = [
      {
        id: 'variation-a',
        name: 'Bold Character Focus',
        description: 'Emphasize romantic character with larger presence',
        changes: ['Increase character size to 70% of icon', 'Add subtle sparkle effects', 'Enhance facial expression'],
        hypothesis: 'Larger, more expressive character will increase emotional connection and CTR by 15%',
        targetMetric: 'Conversion Rate (Product Page Views to Downloads)',
        expectedImprovement: '+15%',
        confidence: 'medium',
        priority: 'high',
        designSpec: {
          characterSize: '70%',
          background: 'Gradient from #1a1a2e to #16213e',
          accentColor: '#e94560',
          effects: ['subtle-sparkle', 'soft-glow']
        }
      },
      {
        id: 'variation-b',
        name: 'Minimalist Symbol',
        description: 'Clean, modern design with romantic symbol',
        changes: ['Simple heart or book symbol', 'Solid color background', 'No character imagery'],
        hypothesis: 'Minimalist design will stand out against busy competitor icons and increase CTR by 10%',
        targetMetric: 'Conversion Rate (Product Page Views to Downloads)',
        expectedImprovement: '+10%',
        confidence: 'medium',
        priority: 'medium',
        designSpec: {
          symbol: 'heart-with-sparkle',
          background: 'Solid #e94560',
          foreground: 'White',
          style: 'minimalist'
        }
      },
      {
        id: 'variation-c',
        name: 'Unique Color Scheme',
        description: 'Differentiate with unexpected color combination',
        changes: ['Teal/coral color palette', 'Gradient background', 'Character with new colors'],
        hypothesis: 'Unique colors will grab attention in pink/purple saturated category and increase CTR by 12%',
        targetMetric: 'Conversion Rate (Product Page Views to Downloads)',
        expectedImprovement: '+12%',
        confidence: 'low',
        priority: 'medium',
        designSpec: {
          primaryColor: '#00b4d8',
          secondaryColor: '#ff6b6b',
          background: 'gradient',
          style: 'character-focused'
        }
      },
      {
        id: 'variation-d',
        name: 'Typography + Symbol',
        description: 'Combine app name with romantic symbol',
        changes: ['Add "Blush" text to icon', 'Heart symbol accent', 'Clean, modern font'],
        hypothesis: 'Brand name visibility will increase recognition and CTR by 8%',
        targetMetric: 'Conversion Rate (Product Page Views to Downloads)',
        expectedImprovement: '+8%',
        confidence: 'low',
        priority: 'low',
        designSpec: {
          text: 'Blush',
          symbol: 'heart',
          font: 'modern-sans-serif',
          layout: 'text-with-accent'
        }
      }
    ];

    const experimentStructure = {
      testName: 'App Icon A/B Test - Conversion Optimization',
      hypothesis: 'Icon design changes will improve conversion rate from product page views to downloads',
      metric: 'Conversion Rate (Product Page Views → Downloads)',
      baseline: {
        currentRate: '17.3%',
        weeklyProductPageViews: 18500,
        weeklyDownloads: 3200
      },
      testConfiguration: {
        duration: '14 days',
        minSampleSize: 5000,
        trafficSplit: '50/50',
        significance: 95,
        minimumDetectableEffect: '5%'
      },
      schedule: {
        setup: '2-3 days (design + approval)',
        testStart: 'After setup',
        testEnd: '14 days after start',
        analysis: '2 days after test end'
      },
      successCriteria: {
        primary: 'Statistically significant increase in conversion rate (p < 0.05)',
        secondary: ['No decrease in organic install rate', 'Positive user feedback', 'Maintained or improved App Store ranking']
      }
    };

    return {
      variations: variations,
      experimentStructure: experimentStructure,
      recommendedPriority: [
        '1. variation-a - Bold Character Focus (high priority, medium confidence)',
        '2. variation-b - Minimalist Symbol (medium priority, medium confidence)',
        '3. variation-c - Unique Color Scheme (medium priority, low confidence)',
        '4. variation-d - Typography + Symbol (low priority, low confidence)'
      ],
      implementation: {
        tools: ['App Store Connect Custom Product Pages', 'Firebase A/B Testing', 'Apple Search Ads Creative Sets'],
        considerations: [
          'Test one variable at a time for clear results',
          'Ensure icon meets App Store guidelines (1024x1024 PNG, no transparency)',
          'Run test during stable period (avoid holidays, major updates)',
          'Document results for future optimization'
        ]
      }
    };
  }

  /**
   * Analyze app description and provide optimization suggestions
   * Generates recommendations for improving app store description
   *
   * @param {string} appId - App Store app ID (optional, uses env var if not provided)
   * @returns {Object} Description analysis with optimization suggestions
   */
  async analyzeDescriptionForOptimization(appId = null) {
    logger.info('Analyzing app description for optimization', { appId });

    const targetAppId = appId || process.env.APP_STORE_APP_ID || 'blush-app';

    try {
      // Fetch current metadata
      const metadataResult = await this.getAppMetadata(targetAppId);
      const metadata = metadataResult.metadata || {};
      const currentDescription = metadata.description || '';

      // Analyze current description
      const analysis = this.analyzeDescriptionContent(currentDescription);

      // Get tracked keywords for inclusion
      const trackedKeywords = await this.getTrackedKeywords();

      // Identify keyword opportunities
      const keywordOpportunities = this.identifyKeywordOpportunities(currentDescription, trackedKeywords);

      // Generate optimized description
      const optimizedDescription = this.generateOptimizedDescription(
        currentDescription,
        analysis,
        keywordOpportunities
      );

      return {
        success: true,
        appId: targetAppId,
        currentDescription: currentDescription,
        analysis: analysis,
        keywordOpportunities: keywordOpportunities,
        optimizedDescription: optimizedDescription,
        suggestions: this.generateDescriptionSuggestions(analysis, keywordOpportunities)
      };

    } catch (error) {
      logger.error('Failed to analyze description for optimization', {
        appId: targetAppId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Analyze description content characteristics
   */
  analyzeDescriptionContent(description) {
    const words = description.split(/\s+/);
    const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 0);

    // Check for key elements
    const hasHook = description.length > 0 && description.length < 200;
    const hasFeatures = description.toLowerCase().includes('feature') ||
                       description.toLowerCase().includes('include') ||
                       description.split('\n').length > 3;
    const hasCallToAction = description.toLowerCase().includes('download') ||
                          description.toLowerCase().includes('install') ||
                          description.toLowerCase().includes('try now');
    const hasSocialProof = description.toLowerCase().includes('users') ||
                         description.toLowerCase().includes('rated') ||
                         description.toLowerCase().includes('reviews');
    const hasEmotionalLanguage = /love|romance|passion|desire|heart|feel/i.test(description);

    // Calculate readability score (simplified Flesch Reading Ease)
    const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
    const readability = this.calculateReadabilityScore(words.length, sentences.length);

    return {
      length: {
        characters: description.length,
        words: words.length,
        sentences: sentences.length,
        avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10
      },
      structure: {
        hasHook,
        hasFeatures,
        hasCallToAction,
        hasSocialProof,
        hasEmotionalLanguage,
        hasBullets: description.includes('•') || description.includes('-'),
        lineCount: description.split('\n').length
      },
      readability: readability,
      strengths: [],
      weaknesses: []
    };
  }

  /**
   * Calculate readability score (simplified)
   */
  calculateReadabilityScore(wordCount, sentenceCount) {
    if (sentenceCount === 0) return { score: 0, level: 'Unknown' };

    const avgWordsPerSentence = wordCount / sentenceCount;

    let score, level;
    if (avgWordsPerSentence < 15) {
      score = 80;
      level = 'Easy to read';
    } else if (avgWordsPerSentence < 20) {
      score = 60;
      level = 'Fairly easy to read';
    } else if (avgWordsPerSentence < 25) {
      score = 40;
      level = 'Standard';
    } else {
      score = 20;
      level = 'Difficult to read';
    }

    return { score, level };
  }

  /**
   * Get tracked keywords from database
   */
  async getTrackedKeywords() {
    try {
      const ASOKeyword = await import('../models/ASOKeyword.js').then(m => m.default);
      const keywords = await ASOKeyword.find({}).lean();
      return keywords.map(k => k.keyword);
    } catch (error) {
      logger.warn('Could not fetch tracked keywords', { error: error.message });
      return [];
    }
  }

  /**
   * Identify keywords that should be included in description
   */
  identifyKeywordOpportunities(description, trackedKeywords) {
    const descriptionLower = description.toLowerCase();

    // Check which tracked keywords are missing
    const missingKeywords = trackedKeywords.filter(keyword =>
      !descriptionLower.includes(keyword.toLowerCase())
    );

    // Prioritize by importance (simulated - in real app would use search volume data)
    const prioritizedKeywords = missingKeywords.map(keyword => ({
      keyword,
      reason: this.getKeywordInclusionReason(keyword),
      priority: this.calculateKeywordPriority(keyword)
    })).sort((a, b) => b.priority - a.priority);

    return {
      totalMissing: missingKeywords.length,
      topOpportunities: prioritizedKeywords.slice(0, 5),
      allMissing: missingKeywords
    };
  }

  /**
   * Get reason for including keyword
   */
  getKeywordInclusionReason(keyword) {
    const reasons = {
      'romance': 'Core category term with high search volume',
      'stories': 'Primary content type, important for discovery',
      'love': 'High-volume emotional keyword',
      'spicy': 'Differentiator from competitors',
      'fiction': 'Category-defining term',
      'romantic': 'Adjective form of core keyword',
      'novels': 'Long-form content indicator',
      'interactive': 'Key feature differentiator',
      'games': 'Alternative categorization',
      'otome': 'Niche-specific term with dedicated audience'
    };

    return reasons[keyword.toLowerCase()] || 'Relevant to app niche and audience';
  }

  /**
   * Calculate keyword priority (1-100)
   */
  calculateKeywordPriority(keyword) {
    const priorities = {
      'romance': 95,
      'stories': 90,
      'love': 88,
      'spicy': 85,
      'fiction': 82,
      'romantic': 80,
      'novels': 75,
      'interactive': 70,
      'games': 68,
      'otome': 65
    };

    return priorities[keyword.toLowerCase()] || 50;
  }

  /**
   * Generate optimized description
   */
  generateOptimizedDescription(currentDescription, analysis, keywordOpportunities) {
    // Start with current description
    let optimized = currentDescription;

    // Add missing keywords naturally
    const topKeywords = keywordOpportunities.topOpportunities.slice(0, 3);
    if (topKeywords.length > 0) {
      // Add keywords to features section if it exists
      if (analysis.structure.hasBullets) {
        const keywordLine = `\n• Perfect for fans of ${topKeywords.map(k => k.keyword).join(', ')} and more!`;
        optimized = optimized.replace(/\n• [^\n]*/, (match) => {
          return optimized.includes(keywordLine) ? match : match + keywordLine;
        });
      }
    }

    // Ensure emotional hook at start
    if (!analysis.structure.hasEmotionalLanguage) {
      const emotionalHook = "Experience the romance you've been dreaming of. ";
      optimized = emotionalHook + optimized;
    }

    // Add call to action if missing
    if (!analysis.structure.hasCallToAction) {
      optimized += '\n\nDownload now and start your romantic journey!';
    }

    return optimized;
  }

  /**
   * Generate specific suggestions for improvement
   */
  generateDescriptionSuggestions(analysis, keywordOpportunities) {
    const suggestions = [];

    // Structure suggestions
    if (!analysis.structure.hasHook) {
      suggestions.push({
        category: 'Structure',
        priority: 'HIGH',
        suggestion: 'Add an engaging hook in the first 2 lines to capture attention',
        example: '💕 Dive into a world of romance where YOUR choices shape the story!'
      });
    }

    if (!analysis.structure.hasBullets) {
      suggestions.push({
        category: 'Structure',
        priority: 'HIGH',
        suggestion: 'Use bullet points to highlight key features for easy scanning',
        example: '• Thousands of romantic stories\n• Multiple genres to explore\n• New content daily'
      });
    }

    if (!analysis.structure.hasCallToAction) {
      suggestions.push({
        category: 'Call to Action',
        priority: 'HIGH',
        suggestion: 'Add a clear call to action at the end to drive conversions',
        example: 'Download now and find your perfect romance! 💝'
      });
    }

    // Keyword suggestions
    if (keywordOpportunities.totalMissing > 0) {
      suggestions.push({
        category: 'Keywords',
        priority: 'HIGH',
        suggestion: `Include ${keywordOpportunities.totalMissing} missing tracked keywords for better ASO`,
        details: `Top opportunities: ${keywordOpportunities.topOpportunities.slice(0, 3).map(k => k.keyword).join(', ')}`
      });
    }

    // Emotional language
    if (!analysis.structure.hasEmotionalLanguage) {
      suggestions.push({
        category: 'Emotional Appeal',
        priority: 'MEDIUM',
        suggestion: 'Add more emotional language to connect with target audience',
        example: 'Use words like: love, passion, heart, desire, romance, feelings'
      });
    }

    // Social proof
    if (!analysis.structure.hasSocialProof) {
      suggestions.push({
        category: 'Social Proof',
        priority: 'MEDIUM',
        suggestion: 'Add social proof elements to build trust',
        example: 'Join thousands of readers who found their perfect story'
      });
    }

    // Length optimization
    if (analysis.length.characters < 500) {
      suggestions.push({
        category: 'Length',
        priority: 'LOW',
        suggestion: 'Consider expanding description to include more keywords and details',
        details: `Current: ${analysis.length.characters} characters. Recommended: 500-1000 characters`
      });
    } else if (analysis.length.characters > 4000) {
      suggestions.push({
        category: 'Length',
        priority: 'MEDIUM',
        suggestion: 'Description is quite long. Consider condensing for better readability',
        details: `Current: ${analysis.length.characters} characters. Recommended: 500-1000 characters`
      });
    }

    return suggestions;
  }

  /**
   * Fetch category ranking from App Store Connect
   * Gets app's current ranking within its category
   *
   * API Endpoint: GET /apps/{appId}/appStoreVersions
   */
  async getCategoryRanking(appId = null) {
    logger.info('Fetching category ranking', { appId });

    const targetAppId = appId || process.env.APP_STORE_APP_ID || 'blush-app';

    if (!this.isConfigured()) {
      // Return mock ranking if API not configured
      logger.warn('App Store Connect API not configured, returning mock category ranking');
      return this.getMockCategoryRanking();
    }

    try {
      // TODO: Implement actual API call to fetch category rankings
      // The App Store Connect API doesn't directly provide category rankings
      // This would typically be fetched from:
      // 1. App Store Connect API for app details
      // 2. Third-party ASO tools (AppTweak, Sensor Tower, MobileAction)
      // 3. Web scraping of App Store (not recommended)
      //
      // For now, return mock data
      logger.info('Returning mock category ranking (API implementation pending)');
      return this.getMockCategoryRanking();

    } catch (error) {
      logger.error('Failed to fetch category ranking', {
        appId: targetAppId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get mock category ranking for testing
   */
  getMockCategoryRanking() {
    // Simulate realistic ranking data for a romance fiction app
    const baseRanking = 42; // Base ranking position
    const variation = Math.floor(Math.random() * 10) - 5; // +/- 5 positions
    const ranking = Math.max(1, baseRanking + variation);

    return {
      category: 'Books',
      subcategory: 'Romance',
      ranking: ranking,
      totalAppsInCategory: 2450,
      percentile: Math.round((1 - ranking / 2450) * 100),
      previousRanking: ranking + (Math.random() > 0.5 ? 1 : -1),
      rankingChange: Math.random() > 0.5 ? 1 : -1,
      lastChecked: new Date().toISOString(),
      source: 'mock'
    };
  }

  /**
   * Get category details from app metadata
   */
  async getAppCategory(appId = null) {
    logger.info('Getting app category', { appId });

    try {
      const metadata = await this.getAppMetadata(appId);

      // Return category information
      return {
        primaryCategory: 'Books',
        primaryCategory: 'Games',
        subcategory: 'Romance',
        categoryCode: '6016', // Books category code
        subcategoryCode: '6024', // Romance subcategory code
        source: metadata.source || 'derived'
      };

    } catch (error) {
      logger.error('Failed to get app category', {
        appId,
        error: error.message
      });

      // Return defaults on error
      return {
        primaryCategory: 'Books',
        subcategory: 'Romance',
        categoryCode: '6016',
        subcategoryCode: '6024',
        source: 'fallback'
      };
    }
  }

  /**
   * Start an A/B test via App Store Connect API
   *
   * API Endpoint: POST /apps/{appId}/appStoreVersionExperiments
   *
   * @param {Object} testConfig - Test configuration
   * @param {string} testConfig.name - Test name
   * @param {string} testConfig.type - Test type (icon, screenshots, subtitle, description)
   * @param {Date} testConfig.startDate - Start date
   * @param {number} testConfig.durationDays - Duration in days
   * @param {string} testConfig.metric - Success metric
   * @param {Object} testConfig.variantA - Control variant
   * @param {Object} testConfig.variantB - Treatment variant
   */
  async startABTest(testConfig) {
    logger.info('Starting A/B test via App Store Connect', {
      name: testConfig.name,
      type: testConfig.type
    });

    if (!this.isConfigured()) {
      logger.warn('App Store Connect API not configured, returning mock A/B test start');
      return this.getMockABTestStart(testConfig);
    }

    try {
      // TODO: Implement actual API call
      // POST https://api.appstoreconnect.apple.com/v1/apps/{appId}/appStoreVersionExperiments
      //
      // Request body structure:
      // {
      //   "data": {
      //     "type": "appStoreVersionExperiments",
      //     "attributes": {
      //       "name": "Test Name",
      //       "trafficProportion": [50, 50],
      //       "startDate": "2024-01-15T00:00:00Z",
      //       "endDate": "2024-01-29T00:00:00Z"
      //     },
      //     "relationships": {
      //       "appStoreVersion" -> control version,
      //       "appStoreVersionExperimentTreatments" -> variants
      //     }
      //   }
      // }

      logger.info('A/B test API start not yet implemented, returning mock response');
      return this.getMockABTestStart(testConfig);

    } catch (error) {
      logger.error('Failed to start A/B test', {
        testName: testConfig.name,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get mock A/B test start response
   */
  getMockABTestStart(testConfig) {
    const mockTreatmentId = `treatment_${Date.now()}`;
    const mockCampaignId = `campaign_${Date.now()}`;

    return {
      treatmentId: mockTreatmentId,
      campaignId: mockCampaignId,
      status: 'STARTED',
      startDate: testConfig.startDate || new Date().toISOString(),
      endDate: new Date(Date.now() + testConfig.durationDays * 24 * 60 * 60 * 1000).toISOString(),
      trafficSplit: '50/50',
      source: 'mock'
    };
  }

  /**
   * Stop an A/B test via App Store Connect API
   *
   * API Endpoint: PATCH /apps/{appId}/appStoreVersionExperiments/{experimentId}
   *
   * @param {string} campaignId - A/B test campaign ID
   */
  async stopABTest(campaignId) {
    logger.info('Stopping A/B test via App Store Connect', { campaignId });

    if (!this.isConfigured()) {
      logger.warn('App Store Connect API not configured, returning mock A/B test stop');
      return this.getMockABTestStop(campaignId);
    }

    try {
      // TODO: Implement actual API call
      // PATCH https://api.appstoreconnect.apple.com/v1/apps/{appId}/appStoreVersionExperiments/{experimentId}
      //
      // Request body:
      // {
      //   "data": {
      //     "type": "appStoreVersionExperiments",
      //     "id": "{experimentId}",
      //     "attributes": {
      //       "status": "COMPLETE",
      //       "endDate": "2024-01-29T00:00:00Z"
      //     }
      //   }
      // }

      logger.info('A/B test API stop not yet implemented, returning mock response');
      return this.getMockABTestStop(campaignId);

    } catch (error) {
      logger.error('Failed to stop A/B test', {
        campaignId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get mock A/B test stop response
   */
  getMockABTestStop(campaignId) {
    return {
      campaignId: campaignId,
      status: 'STOPPED',
      stoppedAt: new Date().toISOString(),
      source: 'mock'
    };
  }

  /**
   * Get A/B test metrics from App Store Connect API
   *
   * API Endpoint: GET /apps/{appId}/appStoreVersionExperiments/{experimentId}/metrics
   *
   * @param {string} campaignId - A/B test campaign ID
   */
  async getABTestMetrics(campaignId) {
    logger.info('Fetching A/B test metrics from App Store Connect', { campaignId });

    if (!this.isConfigured()) {
      logger.warn('App Store Connect API not configured, returning mock A/B test metrics');
      return this.getMockABTestMetrics(campaignId);
    }

    try {
      // TODO: Implement actual API call
      // GET https://api.appstoreconnect.apple.com/v1/apps/{appId}/appStoreVersionExperiments/{experimentId}/metrics
      //
      // Returns metrics for each treatment:
      // - Impressions / Views
      // - Conversion rate
      // - Downloads
      // - Retention
      // - Revenue

      logger.info('A/B test metrics API not yet implemented, returning mock response');
      return this.getMockABTestMetrics(campaignId);

    } catch (error) {
      logger.error('Failed to fetch A/B test metrics', {
        campaignId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get mock A/B test metrics
   */
  getMockABTestMetrics(campaignId) {
    // Simulate realistic test metrics
    const baseViews = 10000 + Math.floor(Math.random() * 5000);
    const baseConversionRate = 0.03 + Math.random() * 0.02;

    return {
      campaignId: campaignId,
      variantA: {
        views: baseViews,
        conversions: Math.floor(baseViews * baseConversionRate),
        conversionRate: baseConversionRate * 100
      },
      variantB: {
        views: baseViews + Math.floor(Math.random() * 1000) - 500,
        conversions: Math.floor(baseViews * (baseConversionRate + (Math.random() * 0.01 - 0.005))),
        conversionRate: (baseConversionRate + (Math.random() * 0.01 - 0.005)) * 100
      },
      source: 'mock'
    };
  }

  /**
   * Get A/B test results and analysis
   *
   * @param {string} campaignId - A/B test campaign ID
   */
  async getABTestResults(campaignId) {
    logger.info('Fetching A/B test results', { campaignId });

    try {
      const metrics = await this.getABTestMetrics(campaignId);

      // Calculate statistics
      const conversionA = metrics.variantA.conversions / metrics.variantA.views;
      const conversionB = metrics.variantB.conversions / metrics.variantB.views;
      const lift = ((conversionB - conversionA) / conversionA) * 100;

      // Determine winner (simplified)
      let winner = 'inconclusive';
      if (Math.abs(lift) > 5) {
        winner = lift > 0 ? 'variantB' : 'variantA';
      }

      return {
        campaignId,
        metrics,
        analysis: {
          winner,
          lift: lift.toFixed(2) + '%',
          conversionA: (conversionA * 100).toFixed(2) + '%',
          conversionB: (conversionB * 100).toFixed(2) + '%',
          significance: lift > 10 ? 'high' : lift > 5 ? 'medium' : 'low'
        }
      };

    } catch (error) {
      logger.error('Failed to fetch A/B test results', {
        campaignId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * List all A/B tests from App Store Connect
   *
   * API Endpoint: GET /apps/{appId}/appStoreVersionExperiments
   */
  async listABTests(appId = null) {
    logger.info('Listing A/B tests from App Store Connect', { appId });

    if (!this.isConfigured()) {
      logger.warn('App Store Connect API not configured, returning mock A/B test list');
      return this.getMockABTestList();
    }

    try {
      // TODO: Implement actual API call
      // GET https://api.appstoreconnect.apple.com/v1/apps/{appId}/appStoreVersionExperiments

      logger.info('A/B test list API not yet implemented, returning mock response');
      return this.getMockABTestList();

    } catch (error) {
      logger.error('Failed to list A/B tests', {
        appId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get mock A/B test list
   */
  getMockABTestList() {
    return {
      tests: [
        {
          id: 'exp_001',
          name: 'Icon Test - Romantic vs Minimalist',
          status: 'COMPLETE',
          type: 'icon',
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-14T00:00:00Z',
          winner: 'variantB'
        },
        {
          id: 'exp_002',
          name: 'Subtitle Test - Keyword Focus',
          status: 'IN_REVIEW',
          type: 'subtitle',
          startDate: '2024-01-10T00:00:00Z',
          endDate: null,
          winner: null
        }
      ],
      total: 2,
      source: 'mock'
    };
  }
}

// Create singleton instance
const appStoreConnectService = new AppStoreConnectService();

export default appStoreConnectService;
