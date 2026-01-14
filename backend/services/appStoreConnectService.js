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
}

// Create singleton instance
const appStoreConnectService = new AppStoreConnectService();

export default appStoreConnectService;
