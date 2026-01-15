/**
 * Apple Search Ads API Service
 *
 * Provides integration with Apple's Search Ads API for:
 * - Campaign management and monitoring
 * - Ad group management
 * - Keyword bidding and management
 * - Performance metrics and reporting
 * - Budget management and optimization
 *
 * Authentication: OAuth 2.0 Client Credentials flow
 * Documentation: https://developer.apple.com/documentation/apple_ads/apple-search-ads-campaign-management-api-5
 */

import winston from 'winston';
import retryService from './retry.js';

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'apple-search-ads' },
  transports: [
    new winston.transports.File({ filename: 'logs/apple-search-ads-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/apple-search-ads.log' }),
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
 * Apple Search Ads Service
 * Handles OAuth 2.0 authentication and API requests
 */
class AppleSearchAdsService {
  constructor() {
    // OAuth 2.0 Configuration
    this.clientId = process.env.APPLE_SEARCH_ADS_CLIENT_ID;
    this.clientSecret = process.env.APPLE_SEARCH_ADS_CLIENT_SECRET;
    this.organizationId = process.env.APPLE_SEARCH_ADS_ORGANIZATION_ID;

    // API Endpoints
    // Sandbox for testing, Production for live campaigns
    this.isSandbox = process.env.APPLE_SEARCH_ADS_ENVIRONMENT === 'sandbox';
    this.tokenUrl = this.isSandbox
      ? 'https://apple-search-ads-sandbox.itunes.apple.com/oauth/access_token'
      : 'https://apple-search-ads.itunes.apple.com/oauth/access_token';

    this.baseUrl = this.isSandbox
      ? 'https://apple-search-ads-sandbox.itunes.apple.com/v5'
      : 'https://apple-search-ads.itunes.apple.com/v5';

    // Token management
    this.accessToken = null;
    this.tokenExpiry = null;

    logger.info('Apple Search Ads Service initialized', {
      environment: this.isSandbox ? 'sandbox' : 'production',
      hasClientId: !!this.clientId,
      hasClientSecret: !!this.clientSecret,
      hasOrganizationId: !!this.organizationId,
    });
  }

  /**
   * Check if service is configured with required credentials
   */
  isConfigured() {
    return !!(this.clientId && this.clientSecret && this.organizationId);
  }

  /**
   * Get configuration status
   */
  getConfigStatus() {
    return {
      configured: this.isConfigured(),
      environment: this.isSandbox ? 'sandbox' : 'production',
      clientIdConfigured: !!this.clientId,
      clientSecretConfigured: !!this.clientSecret,
      organizationIdConfigured: !!this.organizationId,
    };
  }

  /**
   * Step 1: Configure Apple Search Ads credentials
   * Validates that all required environment variables are set
   */
  validateCredentials() {
    const errors = [];

    if (!this.clientId) {
      errors.push('APPLE_SEARCH_ADS_CLIENT_ID is not configured');
    }

    if (!this.clientSecret) {
      errors.push('APPLE_SEARCH_ADS_CLIENT_SECRET is not configured');
    }

    if (!this.organizationId) {
      errors.push('APPLE_SEARCH_ADS_ORGANIZATION_ID is not configured');
    }

    if (errors.length > 0) {
      throw new Error(`Apple Search Ads credentials incomplete: ${errors.join(', ')}`);
    }

    logger.info('Apple Search Ads credentials validated successfully');
    return true;
  }

  /**
   * Step 2: Set up OAuth 2.0 authentication
   * Obtains access token using client credentials flow
   */
  async authenticate() {
    if (!this.isConfigured()) {
      this.validateCredentials();
    }

    // Check if current token is still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      logger.debug('Using existing access token');
      return this.accessToken;
    }

    logger.info('Obtaining new access token from Apple Search Ads');

    try {
      // OAuth 2.0 Client Credentials Flow
      // Token request requires: grant_type, client_id, client_secret, scope
      const tokenRequest = {
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: this.organizationId, // Organization ID as the scope
      };

      // Make token request using fetch
      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(tokenRequest).toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const tokenData = await response.json();

      // Extract access token and calculate expiry
      // Apple Search Ads tokens typically expire in 3600 seconds (1 hour)
      this.accessToken = tokenData.access_token;
      const expiresIn = tokenData.expires_in || 3600;
      this.tokenExpiry = Date.now() + (expiresIn * 1000) - 60000; // Refresh 1 minute early

      logger.info('Access token obtained successfully', {
        expiresIn,
        expiresAt: new Date(this.tokenExpiry).toISOString(),
      });

      return this.accessToken;

    } catch (error) {
      logger.error('Failed to obtain access token', {
        error: error.message,
        stack: error.stack,
      });
      throw new Error(`Apple Search Ads authentication failed: ${error.message}`);
    }
  }

  /**
   * Make authenticated API request with automatic token refresh
   */
  async makeRequest(endpoint, options = {}) {
    await this.authenticate();

    const url = `${this.baseUrl}${endpoint}`;

    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const requestOptions = {
      ...options,
      headers,
    };

    logger.debug('Making API request', {
      method: requestOptions.method || 'GET',
      endpoint,
    });

    try {
      const response = await fetch(url, requestOptions);

      // Handle token expiry - refresh and retry once
      if (response.status === 401) {
        logger.warn('Received 401 Unauthorized, refreshing token and retrying');
        this.accessToken = null;
        this.tokenExpiry = null;
        await this.authenticate();

        // Retry with new token
        requestOptions.headers['Authorization'] = `Bearer ${this.accessToken}`;
        const retryResponse = await fetch(url, requestOptions);

        if (!retryResponse.ok) {
          throw new Error(`API request failed after token refresh: ${retryResponse.status} ${retryResponse.statusText}`);
        }

        return await retryResponse.json();
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return await response.json();

    } catch (error) {
      logger.error('API request failed', {
        endpoint,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Step 3: Test API connection
   * Verifies credentials and connectivity by fetching organization details
   */
  async testConnection() {
    logger.info('Testing Apple Search Ads API connection');

    try {
      // Start with authentication test
      await this.authenticate();

      // Fetch organization details to verify access
      const response = await this.makeRequest(`/orgs/${this.organizationId}/campaigns`);

      logger.info('API connection test successful', {
        campaigns: response.data?.length || 0,
      });

      return {
        success: true,
        authenticated: true,
        message: 'Successfully connected to Apple Search Ads API',
        environment: this.isSandbox ? 'sandbox' : 'production',
      };

    } catch (error) {
      logger.error('API connection test failed', {
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        authenticated: false,
        message: `Connection failed: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Step 4: Verify campaign access
   * Fetches and returns accessible campaigns for the organization
   */
  async getCampaigns(limit = 20, offset = 0) {
    logger.info('Fetching campaigns');

    try {
      const response = await this.makeRequest(
        `/orgs/${this.organizationId}/campaigns?limit=${limit}&offset=${offset}`
      );

      const campaigns = response.data || [];

      logger.info('Campaigns fetched successfully', {
        count: campaigns.length,
        total: response.pagination?.totalResults || campaigns.length,
      });

      return {
        success: true,
        campaigns,
        pagination: response.pagination,
      };

    } catch (error) {
      logger.error('Failed to fetch campaigns', {
        error: error.message,
      });

      throw new Error(`Failed to fetch campaigns: ${error.message}`);
    }
  }

  /**
   * Step 5: Confirm permissions granted
   * Verifies specific permissions by attempting different API operations
   */
  async verifyPermissions() {
    logger.info('Verifying Apple Search Ads API permissions');

    const permissions = {
      campaigns: { allowed: false, description: 'Read campaigns' },
      adGroups: { allowed: false, description: 'Read ad groups' },
      keywords: { allowed: false, description: 'Read keywords' },
      reports: { allowed: false, description: 'Read reports' },
    };

    try {
      // Test campaign access
      try {
        await this.makeRequest(`/orgs/${this.organizationId}/campaigns?limit=1`);
        permissions.campaigns.allowed = true;
        logger.info('✓ Campaign permissions verified');
      } catch (error) {
        logger.warn('✗ Campaign permissions denied', { error: error.message });
      }

      // Test ad group access
      try {
        // First get a campaign ID
        const campaignsResponse = await this.makeRequest(`/orgs/${this.organizationId}/campaigns?limit=1`);
        if (campaignsResponse.data && campaignsResponse.data.length > 0) {
          const campaignId = campaignsResponse.data[0].id;
          await this.makeRequest(`/orgs/${this.organizationId}/campaigns/${campaignId}/adgroups?limit=1`);
          permissions.adGroups.allowed = true;
          logger.info('✓ Ad group permissions verified');
        }
      } catch (error) {
        logger.warn('✗ Ad group permissions denied', { error: error.message });
      }

      // Test keyword access
      try {
        const campaignsResponse = await this.makeRequest(`/orgs/${this.organizationId}/campaigns?limit=1`);
        if (campaignsResponse.data && campaignsResponse.data.length > 0) {
          const campaignId = campaignsResponse.data[0].id;
          await this.makeRequest(`/orgs/${this.organizationId}/campaigns/${campaignId}/keywords?limit=1`);
          permissions.keywords.allowed = true;
          logger.info('✓ Keyword permissions verified');
        }
      } catch (error) {
        logger.warn('✗ Keyword permissions denied', { error: error.message });
      }

      // Test reporting access
      try {
        // Try to access campaign-level reports
        await this.makeRequest(`/orgs/${this.organizationId}/reports/campaigns?limit=1`);
        permissions.reports.allowed = true;
        logger.info('✓ Report permissions verified');
      } catch (error) {
        logger.warn('✗ Report permissions denied', { error: error.message });
      }

      const grantedCount = Object.values(permissions).filter(p => p.allowed).length;
      const totalCount = Object.keys(permissions).length;

      logger.info('Permission verification complete', {
        granted: grantedCount,
        total: totalCount,
      });

      return {
        success: true,
        permissions,
        summary: {
          total: totalCount,
          granted: grantedCount,
          denied: totalCount - grantedCount,
        },
      };

    } catch (error) {
      logger.error('Permission verification failed', {
        error: error.message,
      });

      throw new Error(`Failed to verify permissions: ${error.message}`);
    }
  }

  /**
   * Get detailed campaign metrics
   */
  async getCampaignMetrics(campaignId) {
    try {
      const response = await this.makeRequest(
        `/orgs/${this.organizationId}/campaigns/${campaignId}`
      );

      return {
        success: true,
        campaign: response.data,
      };

    } catch (error) {
      logger.error('Failed to fetch campaign metrics', {
        campaignId,
        error: error.message,
      });

      throw new Error(`Failed to fetch campaign metrics: ${error.message}`);
    }
  }

  /**
   * Get campaign performance report
   */
  async getCampaignReport(campaignId, startDate, endDate) {
    try {
      const response = await this.makeRequest(
        `/orgs/${this.organizationId}/reports/campaigns?campaignId=${campaignId}&startTime=${startDate}&endTime=${endDate}&granularity=DAILY`
      );

      return {
        success: true,
        report: response.data,
      };

    } catch (error) {
      logger.error('Failed to fetch campaign report', {
        campaignId,
        error: error.message,
      });

      throw new Error(`Failed to fetch campaign report: ${error.message}`);
    }
  }

  /**
   * Update campaign budget
   */
  async updateCampaignBudget(campaignId, dailyBudget) {
    try {
      const response = await this.makeRequest(
        `/orgs/${this.organizationId}/campaigns/${campaignId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            dailyBudget: {
              amount: dailyBudget,
              currency: 'USD',
            },
          }),
        }
      );

      logger.info('Campaign budget updated', {
        campaignId,
        dailyBudget,
      });

      return {
        success: true,
        campaign: response.data,
      };

    } catch (error) {
      logger.error('Failed to update campaign budget', {
        campaignId,
        dailyBudget,
        error: error.message,
      });

      throw new Error(`Failed to update campaign budget: ${error.message}`);
    }
  }

  /**
   * Pause or resume campaign
   */
  async setCampaignStatus(campaignId, paused) {
    try {
      const response = await this.makeRequest(
        `/orgs/${this.organizationId}/campaigns/${campaignId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            status: paused ? 'PAUSED' : 'ENABLED',
          }),
        }
      );

      logger.info('Campaign status updated', {
        campaignId,
        paused,
      });

      return {
        success: true,
        campaign: response.data,
      };

    } catch (error) {
      logger.error('Failed to update campaign status', {
        campaignId,
        paused,
        error: error.message,
      });

      throw new Error(`Failed to update campaign status: ${error.message}`);
    }
  }
}

// Create and export singleton instance
const appleSearchAdsService = new AppleSearchAdsService();

export default appleSearchAdsService;
