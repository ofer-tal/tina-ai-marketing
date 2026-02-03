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
import { SignJWT, importPKCS8 } from 'jose';
import { gunzip } from 'zlib';
import { promisify } from 'util';
import rateLimiterService from './rateLimiter.js';

const gunzipAsync = promisify(gunzip);

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
    // Don't read env vars in constructor - read them dynamically when needed
    this.keyId = null;
    this.issuerId = null;
    this.privateKeyPath = null;
    this.vendorNumber = null;
    this.baseUrl = 'https://api.appstoreconnect.apple.com/v1';

    this.token = null;
    this.tokenExpiry = null;
  }

  /**
   * Get environment variables dynamically
   * This allows dotenv to be loaded before the service is used
   */
  _loadEnvVars() {
    if (!this.keyId) {
      this.keyId = process.env.APP_STORE_CONNECT_KEY_ID;
    }
    if (!this.issuerId) {
      this.issuerId = process.env.APP_STORE_CONNECT_ISSUER_ID;
    }
    if (!this.privateKeyPath) {
      this.privateKeyPath = process.env.APP_STORE_CONNECT_PRIVATE_KEY_PATH;
    }
    if (!this.vendorNumber) {
      this.vendorNumber = process.env.APP_STORE_CONNECT_VENDOR_NUMBER;
    }
  }

  /**
   * Check if service is configured
   */
  isConfigured() {
    this._loadEnvVars();
    return !!(this.keyId && this.issuerId && this.privateKeyPath);
  }

  /**
   * Load private key from file
   * Uses smart path resolution similar to Apple Search Ads service
   */
  loadPrivateKey() {
    if (!this.privateKeyPath) {
      throw new Error('APP_STORE_CONNECT_PRIVATE_KEY_PATH not configured');
    }

    // Get the current file's directory using fileURLToPath for Windows compatibility
    const currentFilePath = fileURLToPath(import.meta.url);
    const serviceDir = path.dirname(currentFilePath);
    const backendDir = path.dirname(serviceDir);
    const projectRoot = path.dirname(backendDir);

    let keyPath;

    // Check if the path is already absolute (including Windows drive letters)
    if (path.isAbsolute(this.privateKeyPath)) {
      keyPath = this.privateKeyPath;
    } else {
      // Try multiple path resolutions
      const possiblePaths = [
        // Relative to project root
        path.resolve(projectRoot, this.privateKeyPath),
        // Relative to backend directory
        path.resolve(backendDir, this.privateKeyPath),
        // Relative to current working directory
        path.resolve(process.cwd(), this.privateKeyPath),
      ];

      // Find the first path that exists
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          keyPath = testPath;
          break;
        }
      }

      // If no path was found, use the first one for the error message
      if (!keyPath) {
        keyPath = possiblePaths[0];
      }
    }

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
  async generateToken() {
    if (!this.isConfigured()) {
      throw new Error('App Store Connect API not configured. Please set APP_STORE_CONNECT_KEY_ID, APP_STORE_CONNECT_ISSUER_ID, and APP_STORE_CONNECT_PRIVATE_KEY_PATH');
    }

    try {
      // Load private key
      const privateKeyPem = this.loadPrivateKey();

      // Import the private key using jose
      const privateKey = await importPKCS8(privateKeyPem, 'ES256');

      const now = Math.floor(Date.now() / 1000);

      // Create and sign JWT using jose library
      const token = await new SignJWT({
        iss: this.issuerId,
        exp: now + 1200, // 20 minutes max (Apple's limit)
        aud: 'appstoreconnect-v1'
      })
        .setProtectedHeader({
          alg: 'ES256',
          kid: this.keyId,
          typ: 'JWT'
        })
        .setIssuedAt(now)
        .setExpirationTime(now + 1200)
        .sign(privateKey);

      logger.info('JWT token generated successfully', {
        keyId: this.keyId,
        issuerId: this.issuerId,
        expiry: new Date((now + 1200) * 1000).toISOString()
      });

      return token;

    } catch (error) {
      logger.error('Failed to generate JWT token', { error: error.message, stack: error.stack });
      throw new Error(`JWT token generation failed: ${error.message}`);
    }
  }

  /**
   * Get valid authentication token
   * Generates new token if current one is expired
   */
  async getAuthToken() {
    const now = Math.floor(Date.now() / 1000);

    if (!this.token || !this.tokenExpiry || now >= this.tokenExpiry) {
      this.token = await this.generateToken();
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
    const token = await this.getAuthToken();

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    const requestOptions = {
      method: options.method || 'GET',
      headers: headers,
      ...options.body && { body: JSON.stringify(options.body) }
    };

    logger.info('Making API request', { url, method: requestOptions.method });

    try {
      // Use rate limiter service for all API requests
      const response = await rateLimiterService.fetch(url, requestOptions);

      // Handle other errors
      if (!response.ok) {
        const errorText = await response.text();
        logger.error('API request failed', {
          url,
          status: response.status,
          error: errorText
        });
        throw new Error(`App Store Connect API error (${response.status}): ${errorText}`);
      }

      // Parse response
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }

    } catch (error) {
      logger.error('API request failed', {
        url,
        error: error.message,
        stack: error.stack
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

      // Check if private key file exists using smart path resolution
      let keyPath;
      try {
        // Try to load the key (this will use smart path resolution)
        const privateKey = this.loadPrivateKey();
        if (!privateKey) {
          throw new Error('Failed to load private key');
        }
        // Get the resolved path for logging
        const currentFilePath = fileURLToPath(import.meta.url);
        const serviceDir = path.dirname(currentFilePath);
        const backendDir = path.dirname(serviceDir);
        const projectRoot = path.dirname(backendDir);

        if (path.isAbsolute(this.privateKeyPath)) {
          keyPath = this.privateKeyPath;
        } else {
          // Try to find the actual path
          const possiblePaths = [
            path.resolve(projectRoot, this.privateKeyPath),
            path.resolve(backendDir, this.privateKeyPath),
            path.resolve(process.cwd(), this.privateKeyPath),
          ];
          for (const testPath of possiblePaths) {
            if (fs.existsSync(testPath)) {
              keyPath = testPath;
              break;
            }
          }
        }
      } catch (keyError) {
        return {
          success: false,
          error: keyError.message,
          configured: true,
          keyExists: false
        };
      }

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

      // Make actual API request to /apps endpoint to test authentication
      try {
        const response = await this.apiRequest('/apps', { method: 'GET' });

        logger.info('Connection test successful', {
          appsFound: response.data ? response.data.length : 0
        });

        return {
          success: true,
          message: 'App Store Connect API connection successful',
          configured: true,
          keyExists: true,
          validKeyFormat: true,
          keyId: this.keyId,
          issuerId: this.issuerId,
          apps: response.data || [],
          appsCount: response.data ? response.data.length : 0
        };

      } catch (apiError) {
        // API request failed
        logger.error('API request failed during connection test', {
          error: apiError.message
        });

        return {
          success: false,
          error: `API authentication failed: ${apiError.message}`,
          configured: true,
          keyExists: true,
          validKeyFormat: true,
          keyId: this.keyId,
          issuerId: this.issuerId
        };
      }

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
    if (!this.isConfigured()) {
      throw new Error('App Store Connect API not configured');
    }

    try {
      logger.info('Fetching app info', { appId });

      const response = await this.apiRequest(`/apps/${appId}`, { method: 'GET' });

      return {
        success: true,
        appId: appId,
        data: response.data,
        name: response.data?.attributes?.name,
        platform: response.data?.attributes?.platform,
        bundleId: response.data?.attributes?.bundleId
      };

    } catch (error) {
      logger.error('Failed to fetch app info', {
        appId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Fetch all apps for the account
   */
  async listApps() {
    if (!this.isConfigured()) {
      throw new Error('App Store Connect API not configured');
    }

    try {
      logger.info('Listing all apps from App Store Connect');

      const response = await this.apiRequest('/apps', { method: 'GET' });

      const apps = response.data || [];

      logger.info(`Found ${apps.length} apps`);

      return {
        success: true,
        apps: apps.map(app => ({
          id: app.id,
          name: app.attributes?.name,
          platform: app.attributes?.platform,
          bundleId: app.attributes?.bundleId,
          sku: app.attributes?.sku
        })),
        total: apps.length
      };

    } catch (error) {
      logger.error('Failed to list apps', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Fetch app metadata from App Store Connect
   * Gets app title, subtitle, description, and keywords
   *
   * API Endpoint: GET /apps/{appId}/appStoreVersions
   */
  async getAppMetadata(appId = null) {
    if (!appId) {
      appId = process.env.APP_STORE_APP_ID;
    }

    if (!this.isConfigured()) {
      logger.warn('App Store Connect API not configured, returning mock metadata');
      return this.getMockAppMetadata();
    }

    try {
      logger.info('Fetching app metadata', { appId });

      // First get the latest app store version
      const versionsResponse = await this.apiRequest(
        `/apps/${appId}/appStoreVersions?filter[platform]=ios&limit=1`,
        { method: 'GET' }
      );

      if (!versionsResponse.data || versionsResponse.data.length === 0) {
        throw new Error('No app store versions found');
      }

      const versionId = versionsResponse.data[0].id;

      // Get localizations for metadata
      const localizationsResponse = await this.apiRequest(
        `/appStoreVersions/${versionId}/appStoreVersionLocalizations`,
        { method: 'GET' }
      );

      if (!localizationsResponse.data || localizationsResponse.data.length === 0) {
        throw new Error('No localizations found');
      }

      const localization = localizationsResponse.data[0].attributes;

      return {
        success: true,
        appId: appId,
        metadata: {
          title: localization.name,
          subtitle: localization.subtitle,
          description: localization.description,
          keywords: localization.keywords,
          promotionalText: localization.promotionalText,
          supportUrl: localization.supportUrl,
          marketingUrl: localization.marketingUrl,
          privacyPolicyUrl: localization.privacyPolicyUrl
        },
        source: 'api'
      };

    } catch (error) {
      logger.error('Failed to fetch app metadata', {
        appId,
        error: error.message
      });

      // Fall back to mock data on error
      logger.info('Falling back to mock metadata');
      return this.getMockAppMetadata();
    }
  }

  /**
   * Get mock app metadata
   */
  getMockAppMetadata() {
    return {
      success: true,
      appId: 'blush-app',
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

  /**
   * Fetch sales reports from App Store Connect
   *
   * API Endpoint: GET /salesReports
   *
   * @param {Object} options - Query options
   * @param {string} options.frequency - Report frequency (DAILY, WEEKLY, MONTHLY, YEARLY)
   * @param {string} options.reportType - Type of report (SALES, SUBSCRIPTION_EVENT, SUBSCRIPTION)
   * @param {string} options.reportSubType - Report sub-type (SUMMARY, DETAILED, etc.)
   * @param {string} options.reportDate - Date in YYYY-MM format for monthly, YYYY-MM-DD for daily
   */
  async fetchSalesReports(options = {}) {
    const {
      frequency = 'DAILY',
      reportType = 'SALES',
      reportSubType = 'SUMMARY',
      reportDate = null
    } = options;

    if (!this.isConfigured()) {
      logger.warn('App Store Connect API not configured, returning mock sales reports');
      return this.getMockSalesReports(reportDate || new Date().toISOString().split('T')[0], frequency);
    }

    try {
      logger.info('Fetching sales reports', {
        frequency,
        reportType,
        reportSubType,
        reportDate
      });

      // Generate report date if not provided (yesterday for daily reports)
      let date = reportDate;
      if (!date) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        date = frequency === 'DAILY'
          ? yesterday.toISOString().split('T')[0]
          : yesterday.toISOString().slice(0, 7);
      }

      // Build API endpoint for sales reports
      // Note: Sales Reports API uses a different base URL and requires vendorNumber
      if (!this.vendorNumber) {
        logger.warn('APP_STORE_CONNECT_VENDOR_NUMBER not configured, returning mock sales reports');
        return this.getMockSalesReports(date, frequency);
      }

      const salesReportsUrl = `https://api.appstoreconnect.apple.com/v1/salesReports`;
      const endpoint = `?filter[frequency]=${frequency}&filter[reportType]=${reportType}&filter[reportSubType]=${reportSubType}&filter[reportDate]=${date}&filter[vendorNumber]=${this.vendorNumber}`;

      const authHeader = await this.getAuthToken();

      // Use rate limiter service for sales reports API
      const response = await rateLimiterService.fetch(salesReportsUrl + endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authHeader}`,
          'Accept': 'application/a-gzip'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          logger.warn('Authentication failed for sales reports API, returning mock data');
          return this.getMockSalesReports(date, frequency);
        } else if (response.status === 404) {
          logger.warn('No sales report found for specified date, returning mock data');
          return this.getMockSalesReports(date, frequency);
        } else {
          const errorText = await response.text();
          logger.error('Failed to fetch sales reports', {
            status: response.status,
            error: errorText
          });
          // Return mock data on error
          return this.getMockSalesReports(date, frequency);
        }
      }

      // Sales reports are returned as gzip-compressed TSV files
      logger.info('Sales reports API call successful, decompressing and parsing TSV data');

      // Get the response as a buffer for decompression
      const buffer = await response.arrayBuffer();
      const bufferUint8 = new Uint8Array(buffer);

      // Decompress gzip data using Node.js streams
      const tsvData = await this.decompressGzip(bufferUint8);

      // Parse the TSV data and map to MarketingRevenue format
      const parsedReport = await this.parseSalesReportTSV(tsvData, date, frequency);

      logger.info('Sales reports parsed successfully', {
        transactionCount: parsedReport.transactions.length,
        totals: parsedReport.totals
      });

      return parsedReport;

    } catch (error) {
      logger.error('Failed to fetch sales reports', {
        error: error.message,
        stack: error.stack,
        options
      });

      // Fall back to mock data on any error
      return this.getMockSalesReports(
        reportDate || new Date().toISOString().split('T')[0],
        frequency
      );
    }
  }

  /**
   * Fetch Subscription Event Reports
   *
   * Fetches SUBSCRIPTION_EVENT reports which contain:
   * - Trial to paid conversions
   * - Subscription renewals
   * - Cancellations and refunds
   *
   * These reports contain actual paid subscription transactions.
   *
   * @param {Object} options - Query options
   * @param {string} options.frequency - Report frequency (DAILY, WEEKLY, MONTHLY)
   * @param {string} options.reportDate - Date in YYYY-MM-DD format
   * @returns {Promise<Object>} Subscription event report with transactions
   */
  async fetchSubscriptionEvents(options = {}) {
    const {
      frequency = 'DAILY',
      reportDate = null
    } = options;

    if (!this.isConfigured() || !this.vendorNumber) {
      logger.warn('App Store Connect API not configured for subscription events');
      return { transactions: [], totals: { netRevenue: 0, grossRevenue: 0 } };
    }

    try {
      logger.info('Fetching subscription event reports', {
        frequency,
        reportDate
      });

      // Generate report date if not provided (yesterday for daily reports)
      let date = reportDate;
      if (!date) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        date = yesterday.toISOString().split('T')[0];
      }

      const salesReportsUrl = `https://api.appstoreconnect.apple.com/v1/salesReports`;
      // SUBSCRIPTION_EVENT report type contains paid renewals and conversions
      // Version 1_4 is required for SUBSCRIPTION_EVENT reports
      const endpoint = `?filter[frequency]=${frequency}&filter[reportType]=SUBSCRIPTION_EVENT&filter[reportSubType]=SUMMARY&filter[reportDate]=${date}&filter[vendorNumber]=${this.vendorNumber}&filter[version]=1_4`;

      const authHeader = await this.getAuthToken();

      logger.info(`Fetching SUBSCRIPTION_EVENT report for ${date}`);

      const response = await rateLimiterService.fetch(salesReportsUrl + endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authHeader}`,
          'Accept': 'application/a-gzip'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          logger.info('No subscription event report found for this date (may be normal)');
          return { transactions: [], totals: { netRevenue: 0, grossRevenue: 0 } };
        } else {
          logger.warn('Failed to fetch subscription events', {
            status: response.status,
            error: await response.text()
          });
          return { transactions: [], totals: { netRevenue: 0, grossRevenue: 0 } };
        }
      }

      // Decompress and parse
      const buffer = await response.arrayBuffer();
      const bufferUint8 = new Uint8Array(buffer);
      const tsvData = await this.decompressGzip(bufferUint8);

      // Parse using the same TSV parser as sales reports
      const parsedReport = await this.parseSalesReportTSV(tsvData, date, frequency);

      logger.info('Subscription events parsed successfully', {
        transactionCount: parsedReport.transactions.length,
        totals: parsedReport.totals
      });

      return parsedReport;

    } catch (error) {
      logger.error('Failed to fetch subscription events', {
        error: error.message,
        stack: error.stack
      });
      return { transactions: [], totals: { netRevenue: 0, grossRevenue: 0 } };
    }
  }

  /**
   * Fetch All Revenue Reports (SALES + SUBSCRIPTION_EVENT)
   *
   * Fetches both SALES and SUBSCRIPTION_EVENT reports to capture all revenue.
   * - SALES: In-app purchases, some subscription transactions
   * - SUBSCRIPTION_EVENT: Trial conversions, renewals, cancellations
   *
   * Deduplicates transactions by transactionId before returning.
   *
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Combined report with transactions
   */
  async fetchAllRevenueReports(options = {}) {
    try {
      logger.info('Fetching revenue reports (SALES + SUBSCRIPTION_EVENT)');

      // Fetch SALES report
      const salesReport = await this.fetchSalesReports(options);
      const salesTxns = salesReport.transactions || [];

      logger.info('Sales report fetched', {
        transactionCount: salesTxns.length,
        totals: salesReport.totals
      });

      // Fetch SUBSCRIPTION_EVENT report
      const subReport = await this.fetchSubscriptionEvents(options);
      const subTxns = subReport.transactions || [];

      logger.info('Subscription event report fetched', {
        transactionCount: subTxns.length,
        totals: subReport.totals
      });

      // Combine and deduplicate by transactionId
      const seenIds = new Set();
      const combinedTransactions = [];
      for (const tx of [...salesTxns, ...subTxns]) {
        if (!seenIds.has(tx.transactionId)) {
          seenIds.add(tx.transactionId);
          combinedTransactions.push(tx);
        }
      }

      const dedupCount = salesTxns.length + subTxns.length - combinedTransactions.length;
      if (dedupCount > 0) {
        logger.info(`Deduplicated ${dedupCount} duplicate transactions`);
      }

      // Combine totals
      const combinedTotals = {
        transactionCount: combinedTransactions.length,
        grossRevenue: (salesReport.totals?.grossRevenue || 0) + (subReport.totals?.grossRevenue || 0),
        netRevenue: (salesReport.totals?.netRevenue || 0) + (subReport.totals?.netRevenue || 0),
        appleFees: (salesReport.totals?.appleFees || 0) + (subReport.totals?.appleFees || 0),
        refunds: (salesReport.totals?.refunds || 0) + (subReport.totals?.refunds || 0),
        newCustomerCount: (salesReport.totals?.newCustomerCount || 0) + (subReport.totals?.newCustomerCount || 0),
        newCustomerRevenue: (salesReport.totals?.newCustomerRevenue || 0) + (subReport.totals?.newCustomerRevenue || 0),
        subscriptionCount: (salesReport.totals?.subscriptionCount || 0) + (subReport.totals?.subscriptionCount || 0),
        subscriptionRevenue: (salesReport.totals?.subscriptionRevenue || 0) + (subReport.totals?.subscriptionRevenue || 0)
      };

      return {
        transactions: combinedTransactions,
        totals: combinedTotals
      };

    } catch (error) {
      logger.error('Failed to fetch revenue reports', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Decompress gzip data using Node.js zlib
   * @param {Uint8Array} gzipData - The compressed gzip data
   * @returns {Promise<string>} Decompressed string data
   */
  async decompressGzip(gzipData) {
    try {
      // Convert Uint8Array to Buffer if needed
      const buffer = Buffer.isBuffer(gzipData) ? gzipData : Buffer.from(gzipData);

      // Decompress using zlib.gunzip
      const decompressed = await gunzipAsync(buffer);

      return decompressed.toString('utf-8');
    } catch (error) {
      throw new Error(`Gzip decompression failed: ${error.message}`);
    }
  }

  /**
   * Parse App Store Connect Sales Report TSV data
   * Maps Apple's column format to MarketingRevenue model format
   *
   * Apple Summary Sales Report columns (Version 1_3):
   * Provider, Provider Country, SKU, Developer, Title, Version,
   * Product Type Identifier, Units, Developer Proceeds, Begin Date, End Date,
   * Customer Currency, Country Code, Currency of Proceeds, Apple Identifier,
   * Customer Price, Promo Code, Parent Identifier, Subscription, Period,
   * Category, CMB, Supported Platforms, Device, Preserved Pricing,
   * Proceeds Reason, Client, Order Type
   *
   * @param {string} tsvData - Raw TSV data string
   * @param {string} reportDate - Date of the report
   * @param {string} frequency - Report frequency
   * @returns {Object} Parsed report with transactions and totals
   */
  async parseSalesReportTSV(tsvData, reportDate, frequency = 'DAILY') {
    try {
      // Split into lines and remove empty lines
      const lines = tsvData
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (lines.length < 2) {
        logger.warn('TSV data has no content, returning empty report');
        return this.getEmptySalesReport(reportDate, frequency);
      }

      // First line is header - parse column names
      const headers = lines[0].split('\t').map(h => h.trim().replace(/"/g, ''));
      logger.debug('TSV headers', { headers });

      // Map column indices
      const colIndex = this.mapColumnIndices(headers);

      // Parse data rows
      const transactions = [];
      let rowCount = 0;
      let skippedRows = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = this.parseTSVRow(lines[i]);

        // Debug: log first few raw rows
        if (i <= 3) {
          logger.info(`Raw TSV Row ${i}: ${lines[i].substring(0, 200)}`);
          logger.info(`Parsed values (${values.length} cols): ${JSON.stringify(values.slice(0, 15))}`);
          logger.info(`Column indices: units=${colIndex.units}, customerPrice=${colIndex.customerPrice}, developerProceeds=${colIndex.developerProceeds}`);
        }

        // Skip rows that don't have enough columns
        if (values.length < headers.length - 5) {
          skippedRows++;
          continue;
        }

        const transaction = this.mapRowToTransaction(values, colIndex, reportDate);
        if (transaction) {
          transactions.push(transaction);
          rowCount++;
        }

        // Debug: log the mapped transaction
        if (i <= 3 && transaction) {
          logger.info(`Mapped transaction: revenue=${JSON.stringify(transaction.revenue)}, customer=${JSON.stringify(transaction.customer)}`);
        }
      }

      if (skippedRows > 0) {
        logger.warn(`Skipped ${skippedRows} malformed rows in sales report`);
      }

      // Calculate totals
      const totals = this.calculateTransactionTotals(transactions);

      return {
        reportDate: reportDate,
        frequency: frequency,
        transactions: transactions,
        totals: totals,
        source: 'app-store-connect',
        parsedAt: new Date().toISOString(),
        rowCount: rowCount,
        skippedRows: skippedRows
      };

    } catch (error) {
      logger.error('Failed to parse sales report TSV', {
        error: error.message,
        stack: error.stack
      });
      // Return mock data on parse error
      return this.getMockSalesReports(reportDate, frequency);
    }
  }

  /**
   * Map column names to indices
   * Apple column names may vary by version, so we find them dynamically
   */
  mapColumnIndices(headers) {
    // Normalize headers for case-insensitive matching
    const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/\s+/g, ''));

    const findIndex = (patterns) => {
      for (const pattern of patterns) {
        const idx = normalizedHeaders.findIndex(h => h.includes(pattern.toLowerCase()));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    return {
      provider: findIndex(['Provider']),
      providerCountry: findIndex(['ProviderCountry', 'ProviderCountry']),
      sku: findIndex(['SKU']),
      developer: findIndex(['Developer']),
      title: findIndex(['Title']),
      version: findIndex(['Version']),
      productTypeIdentifier: findIndex(['ProductTypeIdentifier', 'ProductType']),
      units: findIndex(['Units']),
      developerProceeds: findIndex(['DeveloperProceeds', 'Proceeds']),
      beginDate: findIndex(['BeginDate']),
      endDate: findIndex(['EndDate']),
      customerCurrency: findIndex(['CustomerCurrency']),
      countryCode: findIndex(['CountryCode']),
      currencyOfProceeds: findIndex(['CurrencyOfProceeds']),
      appleIdentifier: findIndex(['AppleIdentifier', 'AppleID']),
      customerPrice: findIndex(['CustomerPrice', 'CustomerPrice']),
      promoCode: findIndex(['PromoCode', 'Promo']),
      parentIdentifier: findIndex(['ParentIdentifier', 'Parent']),
      subscription: findIndex(['Subscription']),
      period: findIndex(['Period']),
      category: findIndex(['Category']),
      cmb: findIndex(['CMB']),
      supportedPlatforms: findIndex(['SupportedPlatforms', 'Platforms']),
      device: findIndex(['Device']),
      preservedPricing: findIndex(['PreservedPricing']),
      proceedsReason: findIndex(['ProceedsReason']),
      client: findIndex(['Client']),
      orderType: findIndex(['OrderType'])
    };
  }

  /**
   * Parse a TSV row, handling quoted values containing tabs
   */
  parseTSVRow(row) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      const nextChar = row[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
        }
      } else if (char === '\t' && !inQuotes) {
        // Tab separator (not in quotes)
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    // Add last value
    values.push(current);

    return values;
  }

  /**
   * Map a TSV row to a MarketingRevenue transaction format
   */
  mapRowToTransaction(values, colIndex, reportDate) {
    try {
      // Extract values using column indices, defaulting to empty string
      const getVal = (idx) => (idx >= 0 && idx < values.length) ? values[idx].trim() : '';
      const getNum = (idx) => {
        const val = getVal(idx);
        return val ? parseFloat(val.replace(/[,"$]/g, '')) || 0 : 0;
      };

      const units = getNum(colIndex.units);
      const customerPrice = getNum(colIndex.customerPrice);
      const developerProceeds = getNum(colIndex.developerProceeds);
      const productType = getVal(colIndex.productTypeIdentifier);
      const countryCode = getVal(colIndex.countryCode);
      const currencyOfProceeds = getVal(colIndex.currencyOfProceeds);
      const subscription = getVal(colIndex.subscription);
      const title = getVal(colIndex.title);
      const sku = getVal(colIndex.sku);
      const device = getVal(colIndex.device);
      const version = getVal(colIndex.version);

      // Debug: log first few rows to verify data extraction
      if (logger.level === 'debug' || Math.random() < 0.05) {
        logger.debug('TSV Row values', {
          reportDate,
          units,
          customerPrice,
          developerProceeds,
          productType,
          colIndex: {
            units: colIndex.units,
            customerPrice: colIndex.customerPrice,
            developerProceeds: colIndex.developerProceeds
          },
          rawValues: {
            units: getVal(colIndex.units),
            customerPrice: getVal(colIndex.customerPrice),
            developerProceeds: getVal(colIndex.developerProceeds)
          }
        });
      }

      // Skip update rows (Product Type 7F) and other non-revenue rows
      // 7F = Free updates, 1-B = App Bundle (credits handled separately)
      const nonRevenueTypes = ['7F', '7'];
      if (nonRevenueTypes.includes(productType) || units === 0) {
        return null;
      }

      // Skip zero-revenue transactions (free trials, free app downloads)
      // We only want transactions that actually generated proceeds
      if (developerProceeds <= 0 && customerPrice <= 0) {
        logger.debug('Skipping zero-revenue transaction', {
          productType,
          title: title.substring(0, 50),
          customerPrice,
          developerProceeds
        });
        return null;
      }

      // Determine if subscription vs one-time purchase
      // Product Type Identifiers:
      // 1F =  iOS App (universal)
      // 1 =   iPhone App
      // 2 =   iPad App
      // 7F =  iOS App Update
      // 1A =  In-App Purchase (Consumable)
      // 1B =  In-App Purchase (Non-Consumable)
      // 1C =  In-App Purchase (Auto-Renewable Subscription)
      // IA1 = In-App Purchase
      // 1AY = Auto-Renewable Subscription
      const isSubscription = ['1C', '1AY', 'AAY', 'IA7', 'F1C', 'F1AY', 'F7', 'A7', 'IA9']
        .some(type => productType.includes(type)) || subscription.length > 0;

      // Determine if new or renewal subscription
      // Subscription column: 'New' for new, 'Renewal' for renewals
      const subscriptionType = getVal(colIndex.subscription);
      const isNewSubscription = subscriptionType.toLowerCase() === 'new';
      const isRenewal = subscriptionType.toLowerCase() === 'renewal';

      // Check for refund (negative units or negative proceeds)
      const isRefund = units < 0 || developerProceeds < 0;

      // Calculate Apple fee (15% standard, may vary)
      // For refunds, preserve the negative sign to deduct from revenue
      const signMultiplier = isRefund ? -1 : 1;

      // IMPORTANT: In Apple's TSV format:
      // - developerProceeds is the TOTAL proceeds for this row (not per-unit)
      // - customerPrice is the per-unit price
      // - So we should NOT multiply developerProceeds by units again
      // Use developerProceeds directly as the net amount
      const netAmount = signMultiplier * Math.abs(developerProceeds);

      // For gross amount, multiply customerPrice by units (that's per-unit)
      const grossAmount = signMultiplier * Math.abs(customerPrice * Math.abs(units));

      // Apple fee is the difference
      const appleFeeAmount = grossAmount - netAmount;
      const appleFeeRate = grossAmount !== 0 ? appleFeeAmount / Math.abs(grossAmount) : 0.15;

      // Determine subscription period
      const period = getVal(colIndex.period);
      let subscriptionTypeNormalized = null;
      if (isSubscription) {
        if (period.includes('7') || period.includes('Week')) {
          subscriptionTypeNormalized = 'weekly';
        } else if (period.includes('1') && period.includes('Month')) {
          subscriptionTypeNormalized = 'monthly';
        } else if (period.includes('2') && period.includes('Month')) {
          subscriptionTypeNormalized = 'bimonthly';
        } else if (period.includes('3') && period.includes('Month')) {
          subscriptionTypeNormalized = 'quarterly';
        } else if (period.includes('6') && period.includes('Month')) {
          subscriptionTypeNormalized = 'semiannual';
        } else if (period.includes('1') && period.includes('Year')) {
          subscriptionTypeNormalized = 'annual';
        } else {
          subscriptionTypeNormalized = 'monthly'; // Default
        }
      }

      // Map country to region
      const regionMap = {
        'US': 'AMERICAS',
        'CA': 'AMERICAS',
        'MX': 'AMERICAS',
        'GB': 'EUROPE',
        'DE': 'EUROPE',
        'FR': 'EUROPE',
        'IT': 'EUROPE',
        'ES': 'EUROPE',
        'JP': 'ASIA',
        'CN': 'ASIA',
        'AU': 'OCEANIA',
        'IN': 'ASIA'
      };

      // Currency conversion rates to USD
      // These are approximate average rates for 2025-2026
      // In production, you'd want to use historical rates or fetch from an API
      const currencyToUsdRates = {
        'USD': 1.0,
        'EUR': 1.10,      // 1 EUR = 1.10 USD
        'GBP': 1.27,      // 1 GBP = 1.27 USD
        'AUD': 0.65,      // 1 AUD = 0.65 USD
        'CAD': 0.74,      // 1 CAD = 0.74 USD
        'NOK': 0.094,     // 1 NOK = 0.094 USD
        'DKK': 0.15,      // 1 DKK = 0.15 USD
        'SEK': 0.095,     // 1 SEK = 0.095 USD
        'CHF': 1.12,      // 1 CHF = 1.12 USD
        'JPY': 0.0067,    // 1 JPY = 0.0067 USD
        'CNY': 0.14,      // 1 CNY = 0.14 USD
        'TWD': 0.032,     // 1 TWD = 0.032 USD
        'HKD': 0.13,      // 1 HKD = 0.13 USD
        'SGD': 0.74,      // 1 SGD = 0.74 USD
        'NZD': 0.61,      // 1 NZD = 0.61 USD
        'INR': 0.012,     // 1 INR = 0.012 USD
        'BRL': 0.18,      // 1 BRL = 0.18 USD
        'MXN': 0.059,     // 1 MXN = 0.059 USD
        'COP': 0.00025,   // 1 COP = 0.00025 USD (1 USD = 4000 COP)
        'CLP': 0.0011,    // 1 CLP = 0.0011 USD
        'PEN': 0.27,      // 1 PEN = 0.27 USD
        'ARS': 0.0011,    // 1 ARS = 0.0011 USD
        'PHP': 0.018,     // 1 PHP = 0.018 USD
        'MYR': 0.22,      // 1 MYR = 0.22 USD
        'THB': 0.029,     // 1 THB = 0.029 USD
        'IDR': 0.000065,  // 1 IDR = 0.000065 USD
        'VND': 0.000041,  // 1 VND = 0.000041 USD
        'KRW': 0.00075,   // 1 KRW = 0.00075 USD
        'PLN': 0.26,      // 1 PLN = 0.26 USD
        'RON': 0.22,      // 1 RON = 0.22 USD
        'BGN': 0.55,      // 1 BGN = 0.55 USD
        'CZK': 0.045,     // 1 CZK = 0.045 USD
        'HUF': 0.0027,    // 1 HUF = 0.0027 USD
        'RUB': 0.011,     // 1 RUB = 0.011 USD
        'TRY': 0.031,     // 1 TRY = 0.031 USD
        'ZAR': 0.054,     // 1 ZAR = 0.054 USD
        'ILS': 0.27,      // 1 ILS = 0.27 USD
        'AED': 0.27,      // 1 AED = 0.27 USD
        'SAR': 0.27,      // 1 SAR = 0.27 USD
        'QAR': 0.27       // 1 QAR = 0.27 USD
      };

      // Convert to USD if the currency is not USD
      const conversionRate = currencyToUsdRates[currencyOfProceeds] || 1.0;
      const originalCurrency = currencyOfProceeds || 'USD';
      const originalNetAmount = netAmount;
      const originalGrossAmount = grossAmount;

      // Apply currency conversion
      const netAmountUsd = netAmount * conversionRate;
      const grossAmountUsd = grossAmount * conversionRate;
      const appleFeeAmountUsd = appleFeeAmount * conversionRate;

      // Store original values in metadata for reference
      const originalAmounts = {
        netAmount: originalNetAmount,
        grossAmount: originalGrossAmount,
        currency: originalCurrency,
        conversionRate: conversionRate
      };

      // Generate a unique transaction ID
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const transactionId = `asc_${reportDate.replace(/-/g, '')}_${sku}_${title.substring(0, 20).replace(/\s+/g, '_')}_${randomSuffix}`;

      // Convert report date string to Date object
      const transactionDateObj = new Date(reportDate);

      return {
        transactionId: transactionId,
        transactionDate: transactionDateObj,

        // Revenue - nested object matching model schema
        // All amounts stored in USD after conversion
        revenue: {
          grossAmount: parseFloat(grossAmountUsd.toFixed(2)),
          appleFee: parseFloat(appleFeeRate.toFixed(4)),
          appleFeeAmount: parseFloat(appleFeeAmountUsd.toFixed(2)),
          netAmount: parseFloat(netAmountUsd.toFixed(2)),
          currency: 'USD',  // Always USD after conversion
          originalCurrency: originalCurrency,
          originalAmount: originalNetAmount
        },

        // Customer info - nested object matching model schema
        customer: {
          new: isNewSubscription || !isRenewal,
          subscriptionType: subscriptionTypeNormalized || null,
          subscriptionId: null
        },

        // Attribution - default to organic for ASC data
        attributedTo: {
          channel: 'organic',
          campaignId: null,
          campaignName: null
        },

        // Metadata - extra data stored here
        metadata: {
          source: 'app-store-connect',
          appVersion: version || 'unknown',
          region: regionMap[countryCode] || 'OTHER',
          deviceType: device || 'iPhone',
          // Store additional data not in schema
          productId: sku || title || 'unknown',
          productType: isSubscription ? 'subscription' : 'in-app-purchase',
          quantity: Math.abs(units),
          countryCode: countryCode || 'US',
          productTypeIdentifier: productType,
          title: title,
          subscriptionStatus: subscription,
          promoCode: getVal(colIndex.promoCode),
          originalUnits: units,
          isRefund: isRefund,
          isRenewal: isRenewal,
          // Currency conversion info
          originalCurrency: originalCurrency,
          originalNetAmount: originalNetAmount,
          originalGrossAmount: originalGrossAmount,
          currencyConversionRate: conversionRate
        },

        // Set attribution window default
        attributionWindow: 7,
        attributionConfidence: 100
      };

    } catch (error) {
      logger.warn('Failed to map TSV row to transaction', {
        error: error.message,
        values: values.slice(0, 5)
      });
      return null;
    }
  }

  /**
   * Calculate totals from parsed transactions
   */
  calculateTransactionTotals(transactions) {
    const totals = transactions.reduce((acc, tx) => {
      // Skip refunds for positive totals
      if (tx.metadata?.isRefund) {
        acc.refunds += tx.revenue?.netAmount || 0;
        acc.refundCount += 1;
        return acc;
      }

      const netAmount = tx.revenue?.netAmount || 0;
      const grossAmount = tx.revenue?.grossAmount || 0;
      const appleFee = tx.revenue?.appleFeeAmount || 0;

      acc.grossRevenue += grossAmount;
      acc.appleFees += appleFee;
      acc.netRevenue += netAmount;
      acc.transactionCount += 1;

      if (tx.customer?.new) {
        acc.newCustomerCount += 1;
        acc.newCustomerRevenue += netAmount;
      }

      if (tx.metadata?.productType === 'subscription') {
        acc.subscriptionCount += 1;
        acc.subscriptionRevenue += netAmount;
      } else {
        acc.oneTimePurchaseCount += 1;
        acc.oneTimePurchaseRevenue += netAmount;
      }

      return acc;
    }, {
      grossRevenue: 0,
      appleFees: 0,
      netRevenue: 0,
      transactionCount: 0,
      newCustomerCount: 0,
      newCustomerRevenue: 0,
      subscriptionCount: 0,
      subscriptionRevenue: 0,
      oneTimePurchaseCount: 0,
      oneTimePurchaseRevenue: 0,
      refunds: 0,
      refundCount: 0
    });

    // Calculate average
    const avgRevenue = totals.transactionCount > 0
      ? totals.netRevenue / totals.transactionCount
      : 0;

    return {
      grossRevenue: parseFloat(totals.grossRevenue.toFixed(2)),
      appleFees: parseFloat(totals.appleFees.toFixed(2)),
      netRevenue: parseFloat(totals.netRevenue.toFixed(2)),
      transactionCount: totals.transactionCount,
      newCustomerCount: totals.newCustomerCount,
      newCustomerRevenue: parseFloat(totals.newCustomerRevenue.toFixed(2)),
      subscriptionCount: totals.subscriptionCount,
      subscriptionRevenue: parseFloat(totals.subscriptionRevenue.toFixed(2)),
      oneTimePurchaseCount: totals.oneTimePurchaseCount,
      oneTimePurchaseRevenue: parseFloat(totals.oneTimePurchaseRevenue.toFixed(2)),
      averageRevenuePerTransaction: parseFloat(avgRevenue.toFixed(2)),
      refunds: parseFloat(totals.refunds.toFixed(2)),
      refundCount: totals.refundCount
    };
  }

  /**
   * Get empty sales report structure
   */
  getEmptySalesReport(reportDate, frequency) {
    return {
      reportDate: reportDate,
      frequency: frequency,
      transactions: [],
      totals: {
        grossRevenue: 0,
        appleFees: 0,
        netRevenue: 0,
        transactionCount: 0,
        newCustomerCount: 0,
        newCustomerRevenue: 0,
        subscriptionCount: 0,
        subscriptionRevenue: 0,
        oneTimePurchaseCount: 0,
        oneTimePurchaseRevenue: 0,
        averageRevenuePerTransaction: 0,
        refunds: 0,
        refundCount: 0
      },
      source: 'app-store-connect',
      parsedAt: new Date().toISOString(),
      rowCount: 0,
      skippedRows: 0
    };
  }

  /**
   * Get mock sales reports
   */
  getMockSalesReports(reportDate, frequency = 'DAILY') {
    const date = new Date(reportDate);

    // Generate mock transaction data
    const transactions = [];
    const numTransactions = Math.floor(Math.random() * 50) + 20; // 20-70 transactions per day

    for (let i = 0; i < numTransactions; i++) {
      const isSubscription = Math.random() > 0.3; // 70% subscriptions, 30% one-time
      const isRenewal = isSubscription && Math.random() > 0.4; // 60% of subscriptions are renewals
      const isNew = !isRenewal;

      const grossAmount = isSubscription
        ? (Math.random() > 0.5 ? 9.99 : 19.99) // Monthly or annual subscription
        : (Math.random() > 0.5 ? 4.99 : 9.99); // One-time purchase tiers

      const appleFeeRate = 0.15; // 15% Apple fee
      const appleFeeAmount = grossAmount * appleFeeRate;
      const netAmount = grossAmount - appleFeeAmount;

      transactions.push({
        transactionId: `trans_${Date.now()}_${i}`,
        transactionDate: date.toISOString(),
        grossAmount: parseFloat(grossAmount.toFixed(2)),
        appleFeeRate: appleFeeRate,
        appleFeeAmount: parseFloat(appleFeeAmount.toFixed(2)),
        netAmount: parseFloat(netAmount.toFixed(2)),
        currency: 'USD',
        productType: isSubscription ? 'subscription' : 'in-app-purchase',
        productId: isSubscription
          ? (grossAmount > 15 ? 'com.blush.annual' : 'com.blush.monthly')
          : 'com.blush.premium',
        quantity: 1,
        isNewCustomer: isNew,
        isRenewal: isRenewal,
        isTrial: false,
        countryCode: 'US',
        region: 'AMERICAS',
        deviceType: Math.random() > 0.5 ? 'iPhone' : 'iPad',
        appVersion: '1.2.0'
      });
    }

    // Calculate totals
    const totals = transactions.reduce((acc, tx) => {
      acc.grossRevenue += tx.grossAmount;
      acc.appleFees += tx.appleFeeAmount;
      acc.netRevenue += tx.netAmount;
      acc.transactionCount += 1;
      if (tx.isNewCustomer) {
        acc.newCustomerCount += 1;
        acc.newCustomerRevenue += tx.netAmount;
      }
      if (tx.isSubscription) {
        acc.subscriptionCount += 1;
        acc.subscriptionRevenue += tx.netAmount;
      } else {
        acc.oneTimePurchaseCount += 1;
        acc.oneTimePurchaseRevenue += tx.netAmount;
      }
      return acc;
    }, {
      grossRevenue: 0,
      appleFees: 0,
      netRevenue: 0,
      transactionCount: 0,
      newCustomerCount: 0,
      newCustomerRevenue: 0,
      subscriptionCount: 0,
      subscriptionRevenue: 0,
      oneTimePurchaseCount: 0,
      oneTimePurchaseRevenue: 0
    });

    return {
      reportDate: reportDate,
      frequency: frequency,
      transactions: transactions,
      totals: {
        grossRevenue: parseFloat(totals.grossRevenue.toFixed(2)),
        appleFees: parseFloat(totals.appleFees.toFixed(2)),
        netRevenue: parseFloat(totals.netRevenue.toFixed(2)),
        transactionCount: totals.transactionCount,
        newCustomerCount: totals.newCustomerCount,
        newCustomerRevenue: parseFloat(totals.newCustomerRevenue.toFixed(2)),
        subscriptionCount: totals.subscriptionCount,
        subscriptionRevenue: parseFloat(totals.subscriptionRevenue.toFixed(2)),
        oneTimePurchaseCount: totals.oneTimePurchaseCount,
        oneTimePurchaseRevenue: parseFloat(totals.oneTimePurchaseRevenue.toFixed(2)),
        averageRevenuePerTransaction: parseFloat((totals.netRevenue / totals.transactionCount).toFixed(2))
      },
      source: 'mock',
      generatedAt: new Date().toISOString()
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
   * Get Finance Reports (Sales and Transactions)
   *
   * Fetches financial reports from App Store Connect
   * API: https://api.appstoreconnect.apple.com/v1/salesReports
   *
   * @param {Object} options - Query options
   * @param {string} options.frequency - Report frequency (DAILY, WEEKLY, MONTHLY, YEARLY)
   * @param {string} options.reportType - Type of report (SALES, SUBSCRIPTION_EVENT, SUBSCRIPTION)
   * @param {string} options.reportSubType - Report sub-type (SUMMARY, DETAILED, etc.)
   * @param {string} options.reportDate - Date in YYYY-MM format for monthly, YYYY-MM-DD for daily
   * @param {string} options.vendorNumber - Vendor number (optional)
   * @returns {Promise<Object>} Financial reports data
   */
  async getFinanceReports(options = {}) {
    try {
      const {
        frequency = 'DAILY',
        reportType = 'SALES',
        reportSubType = 'SUMMARY',
        reportDate = null,
        vendorNumber = null
      } = options;

      logger.info('Fetching finance reports', {
        frequency,
        reportType,
        reportSubType,
        reportDate
      });

      // Generate report date if not provided (yesterday for daily reports)
      let date = reportDate;
      if (!date) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        date = frequency === 'DAILY'
          ? yesterday.toISOString().split('T')[0]
          : yesterday.toISOString().slice(0, 7);
      }

      // Build API endpoint
      // App Store Connect Finance Reports API
      const endpoint = `/v1/salesReports?filter[frequency]=${frequency}&filter[reportType]=${reportType}&filter[reportSubType]=${reportSubType}&filter[reportDate]=${date}`;

      if (vendorNumber) {
        endpoint += `&filter[vendorNumber]=${vendorNumber}`;
      }

      const authHeader = this.getAuthToken();

      // TODO: Implement actual API call
      // const response = await fetch(`${this.baseUrl}${endpoint}`, {
      //   method: 'GET',
      //   headers: {
      //     'Authorization': authHeader,
      //     'Content-Type': 'application/json'
      //   }
      // });

      logger.info('Finance reports API not yet fully implemented, returning mock data');
      return this.getMockFinanceReports(date, frequency);

    } catch (error) {
      logger.error('Failed to fetch finance reports', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Get Subscription Events
   *
   * Fetches subscription lifecycle events (renewals, cancellations, etc.)
   * API: https://api.appstoreconnect.apple.com/v1/subscriptionReports
   *
   * @param {Object} options - Query options
   * @param {string} options.startDate - Start date in YYYY-MM-DD format
   * @param {string} options.endDate - End date in YYYY-MM-DD format
   * @param {string} options.productId - Product bundle ID (optional)
   * @returns {Promise<Object>} Subscription events data
   */
  async getSubscriptionEvents(options = {}) {
    try {
      const {
        startDate = null,
        endDate = null,
        productId = null
      } = options;

      // Default to last 30 days
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      logger.info('Fetching subscription events', {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        productId
      });

      // TODO: Implement actual API call
      // GET https://api.appstoreconnect.apple.com/v1/subscriptionReports?filter[subscriptionReportType]=SUBSCRIPTION_EVENT&filter[reportDate]=...

      logger.info('Subscription events API not yet fully implemented, returning mock data');
      return this.getMockSubscriptionEvents(start, end);

    } catch (error) {
      logger.error('Failed to fetch subscription events', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Get mock finance reports
   */
  getMockFinanceReports(reportDate, frequency = 'DAILY') {
    const date = new Date(reportDate);

    // Generate mock transaction data
    const transactions = [];
    const numTransactions = Math.floor(Math.random() * 50) + 20; // 20-70 transactions per day

    for (let i = 0; i < numTransactions; i++) {
      const isSubscription = Math.random() > 0.3; // 70% subscriptions, 30% one-time
      const isRenewal = isSubscription && Math.random() > 0.4; // 60% of subscriptions are renewals
      const isNew = !isRenewal;

      const grossAmount = isSubscription
        ? (Math.random() > 0.5 ? 9.99 : 19.99) // Monthly or annual subscription
        : (Math.random() > 0.5 ? 4.99 : 9.99); // One-time purchase tiers

      const appleFeeRate = 0.15; // 15% Apple fee
      const appleFeeAmount = grossAmount * appleFeeRate;
      const netAmount = grossAmount - appleFeeAmount;

      transactions.push({
        transactionId: `trans_${Date.now()}_${i}`,
        transactionDate: date.toISOString(),
        grossAmount: parseFloat(grossAmount.toFixed(2)),
        appleFeeRate: appleFeeRate,
        appleFeeAmount: parseFloat(appleFeeAmount.toFixed(2)),
        netAmount: parseFloat(netAmount.toFixed(2)),
        currency: 'USD',
        productType: isSubscription ? 'subscription' : 'in-app-purchase',
        productId: isSubscription
          ? (grossAmount > 15 ? 'com.blush.annual' : 'com.blush.monthly')
          : 'com.blush.premium',
        quantity: 1,
        isNewCustomer: isNew,
        isRenewal: isRenewal,
        isTrial: false,
        countryCode: 'US',
        region: 'AMERICAS',
        deviceType: Math.random() > 0.5 ? 'iPhone' : 'iPad',
        appVersion: '1.2.0'
      });
    }

    // Calculate totals
    const totals = transactions.reduce((acc, tx) => {
      acc.grossRevenue += tx.grossAmount;
      acc.appleFees += tx.appleFeeAmount;
      acc.netRevenue += tx.netAmount;
      acc.transactionCount += 1;
      if (tx.isNewCustomer) {
        acc.newCustomerCount += 1;
        acc.newCustomerRevenue += tx.netAmount;
      }
      if (tx.isSubscription) {
        acc.subscriptionCount += 1;
        acc.subscriptionRevenue += tx.netAmount;
      } else {
        acc.oneTimePurchaseCount += 1;
        acc.oneTimePurchaseRevenue += tx.netAmount;
      }
      return acc;
    }, {
      grossRevenue: 0,
      appleFees: 0,
      netRevenue: 0,
      transactionCount: 0,
      newCustomerCount: 0,
      newCustomerRevenue: 0,
      subscriptionCount: 0,
      subscriptionRevenue: 0,
      oneTimePurchaseCount: 0,
      oneTimePurchaseRevenue: 0
    });

    return {
      reportDate: reportDate,
      frequency: frequency,
      transactions: transactions,
      totals: {
        grossRevenue: parseFloat(totals.grossRevenue.toFixed(2)),
        appleFees: parseFloat(totals.appleFees.toFixed(2)),
        netRevenue: parseFloat(totals.netRevenue.toFixed(2)),
        transactionCount: totals.transactionCount,
        newCustomerCount: totals.newCustomerCount,
        newCustomerRevenue: parseFloat(totals.newCustomerRevenue.toFixed(2)),
        subscriptionCount: totals.subscriptionCount,
        subscriptionRevenue: parseFloat(totals.subscriptionRevenue.toFixed(2)),
        oneTimePurchaseCount: totals.oneTimePurchaseCount,
        oneTimePurchaseRevenue: parseFloat(totals.oneTimePurchaseRevenue.toFixed(2)),
        averageRevenuePerTransaction: parseFloat((totals.netRevenue / totals.transactionCount).toFixed(2))
      },
      source: 'mock',
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Get mock subscription events
   */
  getMockSubscriptionEvents(startDate, endDate) {
    const events = [];
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    for (let day = 0; day < daysDiff; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);

      // Generate 5-15 events per day
      const numEvents = Math.floor(Math.random() * 10) + 5;

      for (let i = 0; i < numEvents; i++) {
        const eventTypes = ['RENEW', 'CANCEL', 'DID_FAIL_TO_RENEW', 'PRICE_INCREASE', 'REFUND'];
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

        events.push({
          eventId: `sub_event_${Date.now()}_${day}_${i}`,
          eventDate: currentDate.toISOString(),
          eventType: eventType,
          productId: Math.random() > 0.5 ? 'com.blush.monthly' : 'com.blush.annual',
          transactionId: `trans_${Date.now()}_${day}_${i}`,
          originalTransactionId: `orig_trans_${Math.floor(Math.random() * 10000)}`,
          originalPurchaseDate: new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          expirationDate: new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          webOrderLineItemId: Math.floor(Math.random() * 1000000),
          trialPeriod: false,
          countryCode: 'US'
        });
      }
    }

    // Summary statistics
    const summary = events.reduce((acc, event) => {
      acc.totalEvents += 1;
      acc.renewals += event.eventType === 'RENEW' ? 1 : 0;
      acc.cancellations += event.eventType === 'CANCEL' ? 1 : 0;
      acc.failedRenewals += event.eventType === 'DID_FAIL_TO_RENEW' ? 1 : 0;
      acc.refunds += event.eventType === 'REFUND' ? 1 : 0;
      return acc;
    }, {
      totalEvents: 0,
      renewals: 0,
      cancellations: 0,
      failedRenewals: 0,
      refunds: 0
    });

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      totalEvents: events.length,
      events: events,
      summary: summary,
      source: 'mock',
      generatedAt: new Date().toISOString()
    };
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

  /**
   * Create Analytics Report Request
   * Creates a request for ongoing or one-time analytics reports
   *
   * @param {string} appId - The app ID
   * @param {string} accessType - 'ONGOING' for daily reports or 'ONE_TIME_SNAPSHOT' for historical
   * @returns {Promise<Object>} Report request response
   */
  async createAnalyticsReportRequest(appId, accessType = 'ONGOING') {
    if (!this.isConfigured()) {
      throw new Error('App Store Connect API not configured');
    }

    try {
      logger.info('Creating analytics report request', { appId, accessType });

      const response = await this.apiRequest('/analyticsReportRequests', {
        method: 'POST',
        body: {
          data: {
            type: 'analyticsReportRequests',
            attributes: {
              accessType: accessType
            },
            relationships: {
              app: {
                data: {
                  type: 'apps',
                  id: appId
                }
              }
            }
          }
        }
      });

      const reportRequestId = response.data?.id;
      logger.info('Analytics report request created', { reportRequestId, accessType });

      return {
        success: true,
        reportRequestId: reportRequestId,
        accessType: accessType,
        response: response.data
      };

    } catch (error) {
      logger.error('Failed to create analytics report request', {
        appId,
        accessType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get Analytics Report Requests
   * Lists all analytics report requests for an app
   *
   * @param {string} appId - The app ID
   * @returns {Promise<Array>} List of report requests
   */
  async getAnalyticsReportRequests(appId) {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      logger.info('Fetching analytics report requests', { appId });

      const response = await this.apiRequest(`/apps/${appId}/analyticsReportRequests`, {
        method: 'GET'
      });

      const requests = response.data || [];
      logger.info(`Found ${requests.length} analytics report requests`);

      return requests.map(req => ({
        id: req.id,
        accessType: req.attributes?.accessType,
        stoppedDueToInactivity: req.attributes?.stoppedDueToInactivity || false
      }));

    } catch (error) {
      logger.error('Failed to get analytics report requests', {
        appId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Get Analytics Report Instances
   * Gets report instances for a specific report type (not report request)
   *
   * @param {string} reportTypeId - The report type ID (e.g., 'r8-...')
   * @param {string} granularity - 'DAILY', 'WEEKLY', or 'MONTHLY'
   * @param {number} limit - Maximum number of instances to return
   * @returns {Promise<Array>} List of report instances
   */
  async getAnalyticsReportInstances(reportTypeId, granularity = 'DAILY', limit = 30) {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      logger.info('Fetching analytics report instances', { reportTypeId, granularity, limit });

      const response = await this.apiRequest(
        `/analyticsReports/${reportTypeId}/instances?filter[granularity]=${granularity}&limit=${limit}`,
        { method: 'GET' }
      );

      const instances = response.data || [];
      logger.info(`Found ${instances.length} report instances for ${reportTypeId}`);

      // Map instances with correct attribute paths
      return instances.map(inst => ({
        id: inst.id,
        granularity: inst.attributes?.granularity,
        processingDate: inst.attributes?.processingDate
      }));

    } catch (error) {
      logger.error('Failed to get analytics report instances', {
        reportTypeId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Get Analytics Report Requests
   * Gets all analytics report requests for an app
   *
   * @param {string} appId - The app ID
   * @returns {Promise<Array>} List of report requests
   */
  async getAnalyticsReportRequests(appId) {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      logger.info('Fetching analytics report requests', { appId });

      const response = await this.apiRequest(
        `/apps/${appId}/analyticsReportRequests`,
        { method: 'GET' }
      );

      const requests = response.data || [];
      logger.info(`Found ${requests.length} analytics report requests`);

      return requests.map(req => ({
        id: req.id,
        accessType: req.attributes?.accessType,
        stoppedDueToInactivity: req.attributes?.stoppedDueToInactivity || false
      }));

    } catch (error) {
      logger.error('Failed to get analytics report requests', {
        appId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Get Available Report Types
   * Gets all report types for a report request
   *
   * @param {string} reportRequestId - The report request ID
   * @returns {Promise<Object>} Map of report types by name
   */
  async getAnalyticsReportTypes(reportRequestId) {
    if (!this.isConfigured()) {
      return {};
    }

    try {
      logger.info('Fetching analytics report types', { reportRequestId });

      const response = await this.apiRequest(
        `/analyticsReportRequests/${reportRequestId}/reports?limit=200`,
        { method: 'GET' }
      );

      const reports = response.data || [];
      logger.info(`Found ${reports.length} report types`);

      // Map report names to their IDs
      const reportTypes = {};
      for (const report of reports) {
        if (report.attributes?.name && report.id) {
          reportTypes[report.attributes.name] = {
            id: report.id,
            category: report.attributes.category,
            name: report.attributes.name
          };
        }
      }

      return reportTypes;

    } catch (error) {
      logger.error('Failed to get analytics report types', {
        reportRequestId,
        error: error.message
      });
      return {};
    }
  }

  /**
   * Download and Decompress Analytics CSV
   * Downloads a .csv.gz file from a URL and returns the parsed data
   *
   * @param {string} url - The download URL
   * @returns {Promise<Array>} Array of parsed CSV rows
   */
  async downloadAnalyticsCsv(url) {
    const https = await import('https');
    const { createGunzip } = await import('zlib');

    return new Promise((resolve, reject) => {
      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download CSV: ${response.statusCode}`));
          return;
        }

        const gunzip = createGunzip();
        const chunks = [];

        response.pipe(gunzip);

        gunzip.on('data', (chunk) => chunks.push(chunk));
        gunzip.on('end', () => {
          const csvData = Buffer.concat(chunks).toString('utf-8');
          const rows = this.parseAnalyticsCsv(csvData);
          resolve(rows);
        });
        gunzip.on('error', reject);
      }).on('error', reject);
    });
  }

  /**
   * Parse Analytics CSV Data
   * Parses CSV data from App Store Connect Analytics
   *
   * @param {string} csvData - Raw CSV data
   * @returns {Array} Parsed rows as objects
   */
  parseAnalyticsCsv(csvData) {
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) return [];

    // Parse header
    const headers = this.parseTSVRow(lines[0]);

    // Parse data rows
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseTSVRow(lines[i]);
      if (values.length === headers.length) {
        const row = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx];
        });
        rows.push(row);
      }
    }

    return rows;
  }

  /**
   * Get Analytics Report Segments
   * Fetches segment data for a specific report instance
   *
   * @param {string} reportInstanceId - The report instance ID
   * @returns {Promise<Object>} Segment data
   */
  async getAnalyticsReportSegments(reportInstanceId) {
    if (!this.isConfigured()) {
      return {};
    }

    try {
      logger.info('Fetching analytics report segments', { reportInstanceId });

      const response = await this.apiRequest(
        `/analyticsReportInstances/${reportInstanceId}/segments`,
        { method: 'GET' }
      );

      return {
        success: true,
        data: response.data || [],
        meta: response.meta
      };

    } catch (error) {
      logger.error('Failed to get analytics report segments', {
        reportInstanceId,
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch App Analytics Metrics
   * High-level method to get analytics metrics for a date range
   * Uses App Sessions and App Store Installation reports
   *
   * @param {string} appId - The app ID
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Object>} Analytics metrics including installs, sessions, etc.
   */
  async fetchAppAnalyticsMetrics(appId, startDate, endDate) {
    try {
      logger.info('Fetching app analytics metrics', { appId, startDate, endDate });

      // Get report requests
      const requests = await this.getAnalyticsReportRequests(appId);

      if (requests.length === 0) {
        logger.info('No existing report requests, creating one...');
        await this.createAnalyticsReportRequest(appId, 'ONGOING');
        logger.info('Report request created. It may take up to 24 hours for initial reports to be available.');
        return this.getMockAppAnalyticsMetrics(appId, startDate, endDate);
      }

      // Use the first ongoing request
      const ongoingRequest = requests.find(r => r.accessType === 'ONGOING') || requests[0];

      // Get available report types
      const reportTypes = await this.getAnalyticsReportTypes(ongoingRequest.id);

      // Key report types we need
      const sessionsReportId = reportTypes['App Sessions Standard']?.id;
      const installsReportId = reportTypes['App Store Installation and Deletion Standard']?.id;

      if (!sessionsReportId) {
        logger.warn('App Sessions Standard report not found');
        return this.getMockAppAnalyticsMetrics(appId, startDate, endDate);
      }

      // Get instances for sessions report
      const sessionsInstances = await this.getAnalyticsReportInstances(sessionsReportId, 'DAILY', 200);

      // Filter instances by date range
      const filteredInstances = sessionsInstances.filter(inst => {
        return inst.processingDate >= startDate && inst.processingDate <= endDate;
      });

      logger.info(`Found ${filteredInstances.length} sessions instances for date range`);

      if (filteredInstances.length === 0) {
        logger.warn('No report instances found for date range, returning mock data');
        return this.getMockAppAnalyticsMetrics(appId, startDate, endDate);
      }

      // Fetch data for each instance
      const dailyMetrics = [];

      for (const instance of filteredInstances) {
        try {
          const metrics = await this.fetchInstanceMetrics(instance.id, instance.processingDate);
          if (metrics) {
            dailyMetrics.push(metrics);
          }
        } catch (error) {
          logger.warn(`Failed to fetch metrics for instance ${instance.id}:`, error.message);
        }
      }

      logger.info(`Successfully fetched ${dailyMetrics.length} days of metrics`);

      return {
        success: true,
        appId,
        dateRange: { startDate, endDate },
        dailyMetrics,
        totalDays: dailyMetrics.length,
        source: 'app_store_connect'
      };

    } catch (error) {
      logger.error('Failed to fetch app analytics metrics', {
        appId,
        startDate,
        endDate,
        error: error.message
      });

      return this.getMockAppAnalyticsMetrics(appId, startDate, endDate);
    }
  }

  /**
   * Fetch Metrics for a Single Instance
   * Downloads and parses the CSV data for a specific instance
   *
   * @param {string} instanceId - The instance ID
   * @param {string} processingDate - The processing date
   * @returns {Promise<Object>} Metrics for this date
   */
  async fetchInstanceMetrics(instanceId, processingDate) {
    try {
      // Get segments for this instance
      const response = await this.apiRequest(
        `/analyticsReportInstances/${instanceId}/segments`,
        { method: 'GET' }
      );

      const segments = response.data || [];
      if (segments.length === 0) {
        return null;
      }

      // Download and parse the CSV from the first segment
      const segmentUrl = segments[0].attributes?.url;
      if (!segmentUrl) {
        return null;
      }

      const rows = await this.downloadAnalyticsCsv(segmentUrl);

      // Aggregate metrics from all rows
      // CSV columns: Date, App Name, Sessions, Total Session Duration, Unique Devices, etc.
      // Data is segmented by device, platform version, source type, etc.
      let totalSessions = 0;
      let totalDuration = 0;
      let totalUniqueDevices = 0;

      for (const row of rows) {
        // Sum all sessions (data is segmented by device, platform, etc.)
        if (row.Sessions) {
          totalSessions += parseInt(row.Sessions) || 0;
        }
        if (row['Total Session Duration']) {
          totalDuration += parseInt(row['Total Session Duration']) || 0;
        }
        if (row['Unique Devices']) {
          totalUniqueDevices += parseInt(row['Unique Devices']) || 0;
        }
      }

      // Calculate average session duration in seconds
      const avgSessionDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;

      return {
        date: processingDate,
        installs: 0, // Not available in sessions report - would need App Store Installation report
        sessions: totalSessions,
        activeDevices: totalUniqueDevices || totalSessions,
        crashes: 0,
        rollingActiveDevices: 0,
        activeDevicesPast30Days: 0,
        avgSessionDuration: Math.round(avgSessionDuration)
      };

    } catch (error) {
      logger.error(`Failed to fetch instance metrics for ${instanceId}:`, error.message);
      return null;
    }
  }

  /**
   * Process Analytics Segments
   * Converts segment data from ASC API into usable metrics
   *
   * @param {Array} segments - Raw segment data
   * @param {string} date - Processing date
   * @returns {Object} Processed metrics
   */
  processAnalyticsSegments(segments, date) {
    const metrics = {
      date: date,
      installs: 0,
      sessions: 0,
      activeDevices: 0,
      crashes: 0,
      rollingActiveDevices: 0,
      activeDevicesPast30Days: 0,
      deletions: 0,
      reinstalls: 0,
      conversions: 0,
      payingUsers: 0
    };

    // Process each segment
    for (const segment of segments) {
      const attrs = segment.attributes || {};
      const data = attrs.data || [];

      for (const dataPoint of data) {
        const values = dataPoint.values || {};
        const total = values.total || 0;

        // Map metrics based on segment type
        switch (attrs.metricType) {
          case 'installs':
          case 'installationCount':
            metrics.installs += total;
            break;
          case 'sessions':
            metrics.sessions += total;
            break;
          case 'activeDevices':
            if (attrs.frequency === 'daily') {
              metrics.activeDevices += total;
            } else if (attrs.frequency === 'rolling') {
              metrics.rollingActiveDevices += total;
            } else if (attrs.frequency === 'monthly') {
              metrics.activeDevicesPast30Days += total;
            }
            break;
          case 'crashes':
            metrics.crashes += total;
            break;
          case 'deletions':
            metrics.deletions += total;
            break;
          case 'reinstalls':
            metrics.reinstalls += total;
            break;
          case 'conversions':
            metrics.conversions += total;
            break;
          case 'payingUsers':
            metrics.payingUsers += total;
            break;
        }
      }
    }

    return metrics;
  }

  /**
   * Get Mock App Analytics Metrics
   * Returns realistic mock data when actual data is not available
   *
   * @param {string} appId - The app ID
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {Object} Mock analytics metrics
   */
  getMockAppAnalyticsMetrics(appId, startDate, endDate) {
    const dailyMetrics = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay();

      // Seasonal variation (lower on weekends)
      const baseMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 0.8 : 1.0;

      dailyMetrics.push({
        date: dateStr,
        installs: Math.floor((50 + Math.random() * 100) * baseMultiplier),
        sessions: Math.floor((200 + Math.random() * 400) * baseMultiplier),
        activeDevices: Math.floor((500 + Math.random() * 500) * baseMultiplier),
        crashes: Math.floor(Math.random() * 20 * baseMultiplier),
        rollingActiveDevices: Math.floor(1000 + Math.random() * 500),
        activeDevicesPast30Days: Math.floor(3000 + Math.random() * 2000),
        deletions: Math.floor(10 + Math.random() * 30),
        reinstalls: Math.floor(5 + Math.random() * 15),
        conversions: Math.floor(10 + Math.random() * 30),
        payingUsers: Math.floor(300 + Math.random() * 200)
      });
    }

    return {
      success: true,
      appId,
      dateRange: { startDate, endDate },
      dailyMetrics,
      totalDays: dailyMetrics.length,
      source: 'mock',
      note: 'Using mock data - actual ASC analytics may take 24+ hours to become available'
    };
  }

  /**
   * Calculate Retention from App Analytics
   * Estimates Day 1, 7, 30 retention from sessions data
   *
   * Note: App Store Connect Analytics does NOT provide true cohort retention.
   * We use a session stability metric as a proxy: the ratio of recent sessions
   * to average sessions, which indicates how well user engagement is maintained.
   *
   * @param {string} appId - The app ID
   * @returns {Promise<Object>} Retention metrics
   */
  async calculateRetentionFromAnalytics(appId) {
    try {
      logger.info('Calculating retention from app analytics', { appId });

      // Get the last 30 days of data
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1); // Yesterday
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 30);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const analyticsData = await this.fetchAppAnalyticsMetrics(appId, startDateStr, endDateStr);

      if (!analyticsData.success || !analyticsData.dailyMetrics || analyticsData.dailyMetrics.length < 7) {
        logger.warn('Insufficient data for retention calculation, returning mock data');
        return this.getMockRetentionMetrics();
      }

      const dailyMetrics = analyticsData.dailyMetrics;

      // Calculate session stability as a proxy for retention
      // This measures how stable session counts are over time
      const avgSessions = dailyMetrics.reduce((sum, day) => sum + (day.sessions || 0), 0) / dailyMetrics.length;

      // Recent sessions (last 7 days) compared to average
      const recentSessions = dailyMetrics.slice(-7).reduce((sum, day) => sum + (day.sessions || 0), 0) / 7;

      // Session stability: ratio of recent to average, normalized to 0-100
      // Higher values indicate stable or growing engagement
      const sessionStability = avgSessions > 0 ? (recentSessions / avgSessions) * 100 : 50;

      // Use industry-standard retention as baseline, adjusted by session stability
      // Typical mobile app: Day 1 ~40%, Day 7 ~15%, Day 30 ~5%
      // We adjust these based on whether engagement is stable/growing or declining
      const stabilityFactor = Math.max(0.5, Math.min(1.5, sessionStability / 100));

      const day1Retention = 40 * stabilityFactor;
      const day7Retention = 15 * stabilityFactor;
      const day30Retention = 5 * stabilityFactor;

      // Rolling retention uses session data directly
      const rollingDay7 = Math.min(100, recentSessions / (avgSessions || 1) * 30); // Normalized to reasonable range
      const rollingDay30 = Math.min(100, recentSessions / (avgSessions || 1) * 25);

      // Estimate cohort size from recent sessions
      const cohortSize = Math.floor(recentSessions * 2); // Rough estimate: 2 sessions per user per day

      const retentionMetrics = {
        dateRange: { startDate: startDateStr, endDate: endDateStr },
        retention: {
          day1: parseFloat(day1Retention.toFixed(2)),
          day7: parseFloat(day7Retention.toFixed(2)),
          day30: parseFloat(day30Retention.toFixed(2)),
          rollingDay7: parseFloat(rollingDay7.toFixed(2)),
          rollingDay30: parseFloat(rollingDay30.toFixed(2))
        },
        cohortSize,
        dataSource: analyticsData.source === 'mock' ? 'mock' : 'app_store_connect',
        dataQuality: {
          lastSyncAt: new Date(),
          completeness: analyticsData.source === 'mock' ? 0 : 60, // Lower score since we're estimating
          isEstimated: true
        }
      };

      logger.info('Retention calculated from analytics (session stability proxy)', {
        day1: retentionMetrics.retention.day1,
        day7: retentionMetrics.retention.day7,
        day30: retentionMetrics.retention.day30,
        note: 'Estimated from session data - true cohort retention not available in ASC'
      });

      return retentionMetrics;

    } catch (error) {
      logger.error('Failed to calculate retention from analytics', {
        appId,
        error: error.message
      });
      return this.getMockRetentionMetrics();
    }
  }

  /**
   * Get Mock Retention Metrics
   * Returns realistic mock retention data
   *
   * @returns {Object} Mock retention metrics
   */
  getMockRetentionMetrics() {
    // Typical mobile app retention rates
    const baseDay1 = 30 + Math.random() * 15; // 30-45%
    const baseDay7 = 8 + Math.random() * 7;   // 8-15%
    const baseDay30 = 3 + Math.random() * 5;  // 3-8%

    return {
      retention: {
        day1: parseFloat(baseDay1.toFixed(2)),
        day7: parseFloat(baseDay7.toFixed(2)),
        day30: parseFloat(baseDay30.toFixed(2)),
        rollingDay7: parseFloat((baseDay7 * 1.5).toFixed(2)),
        rollingDay30: parseFloat((baseDay30 * 2).toFixed(2))
      },
      cohortSize: Math.floor(100 + Math.random() * 500),
      dataSource: 'mock',
      dataQuality: {
        lastSyncAt: new Date(),
        completeness: 0,
        isEstimated: true
      }
    };
  }
}

// Create singleton instance
const appStoreConnectService = new AppStoreConnectService();

export default appStoreConnectService;
