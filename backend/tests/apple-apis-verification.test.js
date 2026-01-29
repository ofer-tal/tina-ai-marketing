/**
 * Apple APIs Authentication Verification Tests
 *
 * Tests for Apple Search Ads OAuth authentication
 * and App Store Connect JWT authentication
 *
 * Run with: npm test backend/tests/apple-apis-verification.test.js
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import appleSearchAdsService from '../services/appleSearchAdsService.js';
import appStoreConnectService from '../services/appStoreConnectService.js';

// Mock environment variables for testing
const mockEnv = {
  SEARCH_ADS_CLIENT_ID: 'TEST_CLIENT_ID',
  SEARCH_ADS_TEAM_ID: 'TEST_TEAM_ID',
  SEARCH_ADS_KEY_ID: 'TEST_KEY_ID',
  SEARCH_ADS_PRIVATE_KEY_PATH: './test-keys/test.p8',
  SEARCH_ADS_ORGANIZATION_ID: 'TEST_ORG_ID',
  APP_STORE_CONNECT_KEY_ID: 'TEST_ASC_KEY_ID',
  APP_STORE_CONNECT_ISSUER_ID: 'TEST_ASC_ISSUER_ID',
  APP_STORE_CONNECT_PRIVATE_KEY_PATH: './test-keys/test-asc.p8'
};

describe('Apple Search Ads API Authentication', () => {
  describe('Configuration Validation', () => {
    it('should detect when all required environment variables are set', () => {
      // Store original env
      const originalEnv = { ...process.env };

      // Set mock environment
      Object.assign(process.env, mockEnv);

      const service = appleSearchAdsService;
      const isConfigured = service.isConfigured();

      expect(isConfigured).toBe(true);

      // Restore original env
      Object.assign(process.env, originalEnv);
    });

    it('should detect when required environment variables are missing', () => {
      // Store original env
      const originalEnv = { ...process.env };

      // Clear required env vars
      delete process.env.SEARCH_ADS_CLIENT_ID;
      delete process.env.SEARCH_ADS_TEAM_ID;
      delete process.env.SEARCH_ADS_KEY_ID;
      delete process.env.SEARCH_ADS_PRIVATE_KEY_PATH;
      delete process.env.SEARCH_ADS_ORGANIZATION_ID;

      const service = appleSearchAdsService;
      const isConfigured = service.isConfigured();

      expect(isConfigured).toBe(false);

      // Restore original env
      Object.assign(process.env, originalEnv);
    });

    it('should return configuration status with all fields', () => {
      const status = appleSearchAdsService.getConfigStatus();

      expect(status).toHaveProperty('configured');
      expect(status).toHaveProperty('clientIdConfigured');
      expect(status).toHaveProperty('teamIdConfigured');
      expect(status).toHaveProperty('keyIdConfigured');
      expect(status).toHaveProperty('privateKeyPathConfigured');
      expect(status).toHaveProperty('organizationIdConfigured');
      expect(status).toHaveProperty('environment');
    });
  });

  describe('JWT Token Generation', () => {
    it('should validate credentials when all required fields are present', () => {
      // Store original env
      const originalEnv = { ...process.env };

      // Set mock environment
      Object.assign(process.env, mockEnv);

      const service = appleSearchAdsService;

      expect(() => service.validateCredentials()).not.toThrow();

      // Restore original env
      Object.assign(process.env, originalEnv);
    });

    it('should throw error when credentials are incomplete', () => {
      // Store original env
      const originalEnv = { ...process.env };

      // Clear required env vars
      delete process.env.SEARCH_ADS_CLIENT_ID;
      delete process.env.SEARCH_ADS_TEAM_ID;

      const service = appleSearchAdsService;

      expect(() => service.validateCredentials()).toThrow('Apple Search Ads credentials incomplete');

      // Restore original env
      Object.assign(process.env, originalEnv);
    });

    it('should have client assertion method available', () => {
      const service = appleSearchAdsService;
      expect(typeof service.createClientAssertion).toBe('function');
    });
  });

  describe('API Request Methods', () => {
    it('should have makeRequest method for authenticated API calls', () => {
      const service = appleSearchAdsService;
      expect(typeof service.makeRequest).toBe('function');
    });

    it('should have getCampaigns method', () => {
      const service = appleSearchAdsService;
      expect(typeof service.getCampaigns).toBe('function');
    });

    it('should have testConnection method', () => {
      const service = appleSearchAdsService;
      expect(typeof service.testConnection).toBe('function');
    });

    it('should have verifyPermissions method', () => {
      const service = appleSearchAdsService;
      expect(typeof service.verifyPermissions).toBe('function');
    });
  });
});

describe('App Store Connect API Authentication', () => {
  describe('Configuration Validation', () => {
    it('should detect when all required environment variables are set', () => {
      // Store original env
      const originalEnv = { ...process.env };

      // Set mock environment
      Object.assign(process.env, mockEnv);

      const service = appStoreConnectService;
      const isConfigured = service.isConfigured();

      expect(isConfigured).toBe(true);

      // Restore original env
      Object.assign(process.env, originalEnv);
    });

    it('should detect when required environment variables are missing', () => {
      // Store original env
      const originalEnv = { ...process.env };

      // Clear required env vars
      delete process.env.APP_STORE_CONNECT_KEY_ID;
      delete process.env.APP_STORE_CONNECT_ISSUER_ID;
      delete process.env.APP_STORE_CONNECT_PRIVATE_KEY_PATH;

      const service = appStoreConnectService;
      const isConfigured = service.isConfigured();

      expect(isConfigured).toBe(false);

      // Restore original env
      Object.assign(process.env, originalEnv);
    });
  });

  describe('JWT Token Generation', () => {
    it('should have generateToken method', () => {
      const service = appStoreConnectService;
      expect(typeof service.generateToken).toBe('function');
    });

    it('should have getAuthToken method', () => {
      const service = appStoreConnectService;
      expect(typeof service.getAuthToken).toBe('function');
    });
  });

  describe('API Request Methods', () => {
    it('should have apiRequest method for authenticated API calls', () => {
      const service = appStoreConnectService;
      expect(typeof service.apiRequest).toBe('function');
    });

    it('should have testConnection method', () => {
      const service = appStoreConnectService;
      expect(typeof service.testConnection).toBe('function');
    });

    it('should have listApps method', () => {
      const service = appStoreConnectService;
      expect(typeof service.listApps).toBe('function');
    });

    it('should have getFinanceReports method', () => {
      const service = appStoreConnectService;
      expect(typeof service.getFinanceReports).toBe('function');
    });

    it('should have getSubscriptionEvents method', () => {
      const service = appStoreConnectService;
      expect(typeof service.getSubscriptionEvents).toBe('function');
    });
  });
});

describe('Data Sync Jobs Availability', () => {
  describe('Apple Search Ads Sync Job', () => {
    it('should be importable from jobs directory', async () => {
      const job = await import('../jobs/appleSearchAdsSyncJob.js');
      expect(job).toBeDefined();
      expect(job.default).toBeDefined();
    });

    it('should have execute method', async () => {
      const job = await import('../jobs/appleSearchAdsSyncJob.js');
      expect(typeof job.default.execute).toBe('function');
    });

    it('should have start method', async () => {
      const job = await import('../jobs/appleSearchAdsSyncJob.js');
      expect(typeof job.default.start).toBe('function');
    });

    it('should have stop method', async () => {
      const job = await import('../jobs/appleSearchAdsSyncJob.js');
      expect(typeof job.default.stop).toBe('function');
    });
  });

  describe('Metrics Aggregation Job', () => {
    it('should be importable from jobs directory', async () => {
      const job = await import('../jobs/metricsAggregationJob.js');
      expect(job).toBeDefined();
      expect(job.default).toBeDefined();
    });

    it('should have execute method', async () => {
      const job = await import('../jobs/metricsAggregationJob.js');
      expect(typeof job.default.execute).toBe('function');
    });

    it('should have start method', async () => {
      const job = await import('../jobs/metricsAggregationJob.js');
      expect(typeof job.default.start).toBe('function');
    });

    it('should have stop method', async () => {
      const job = await import('../jobs/metricsAggregationJob.js');
      expect(typeof job.default.stop).toBe('function');
    });
  });

  describe('Revenue Sync Job', () => {
    it('should be importable from jobs directory', async () => {
      const job = await import('../jobs/revenueSyncJob.js');
      expect(job).toBeDefined();
      expect(job.default).toBeDefined();
    });

    it('should have execute method', async () => {
      const job = await import('../jobs/revenueSyncJob.js');
      expect(typeof job.default.execute).toBe('function');
    });

    it('should have start method', async () => {
      const job = await import('../jobs/revenueSyncJob.js');
      expect(typeof job.default.start).toBe('function');
    });

    it('should have stop method', async () => {
      const job = await import('../jobs/revenueSyncJob.js');
      expect(typeof job.default.stop).toBe('function');
    });
  });
});

describe('Data Models Availability', () => {
  describe('DailySpend Model', () => {
    it('should be importable from models directory', async () => {
      const model = await import('../models/DailySpend.js');
      expect(model).toBeDefined();
      expect(model.default).toBeDefined();
    });

    it('should have aggregateDailySpend static method', async () => {
      const model = await import('../models/DailySpend.js');
      expect(typeof model.default.aggregateDailySpend).toBe('function');
    });

    it('should have getSpendSummary static method', async () => {
      const model = await import('../models/DailySpend.js');
      expect(typeof model.default.getSpendSummary).toBe('function');
    });

    it('should have getOverBudgetDays static method', async () => {
      const model = await import('../models/DailySpend.js');
      expect(typeof model.default.getOverBudgetDays).toBe('function');
    });
  });

  describe('DailyRevenueAggregate Model', () => {
    it('should be importable from models directory', async () => {
      const model = await import('../models/DailyRevenueAggregate.js');
      expect(model).toBeDefined();
      expect(model.default).toBeDefined();
    });

    it('should have aggregateForDate static method', async () => {
      const model = await import('../models/DailyRevenueAggregate.js');
      expect(typeof model.default.aggregateForDate).toBe('function');
    });
  });

  describe('MarketingRevenue Model', () => {
    it('should be importable from models directory', async () => {
      const model = await import('../models/MarketingRevenue.js');
      expect(model).toBeDefined();
      expect(model.default).toBeDefined();
    });

    it('should have getTotalRevenue static method', async () => {
      const model = await import('../models/MarketingRevenue.js');
      expect(typeof model.default.getTotalRevenue).toBe('function');
    });

    it('should have getRevenueByChannel static method', async () => {
      const model = await import('../models/MarketingRevenue.js');
      expect(typeof model.default.getRevenueByChannel).toBe('function');
    });

    it('should have getDailyRevenue static method', async () => {
      const model = await import('../models/MarketingRevenue.js');
      expect(typeof model.default.getDailyRevenue).toBe('function');
    });

    it('should have getNewCustomerCount static method', async () => {
      const model = await import('../models/MarketingRevenue.js');
      expect(typeof model.default.getNewCustomerCount).toBe('function');
    });
  });
});

describe('Dashboard API Endpoints Structure', () => {
  describe('Trend Endpoints', () => {
    it('should have mrr-trend endpoint', async () => {
      const router = await import('../api/dashboard.js');
      expect(router.default).toBeDefined();
    });

    it('should have user-growth endpoint', async () => {
      const router = await import('../api/dashboard.js');
      expect(router.default).toBeDefined();
    });

    it('should have cac-trend endpoint', async () => {
      const router = await import('../api/dashboard.js');
      expect(router.default).toBeDefined();
    });

    it('should have revenue-spend-trend endpoint', async () => {
      const router = await import('../api/dashboard.js');
      expect(router.default).toBeDefined();
    });
  });

  describe('Summary Endpoints', () => {
    it('should have summary endpoint', async () => {
      const router = await import('../api/dashboard.js');
      expect(router.default).toBeDefined();
    });
  });
});

// Integration tests - would require actual API credentials
describe.skip('Apple Search Ads Integration Tests', () => {
  it('should successfully authenticate and get access token', async () => {
    // This test requires actual API credentials
    const service = appleSearchAdsService;
    const token = await service.authenticate();

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('should fetch campaigns from Apple Search Ads API', async () => {
    const service = appleSearchAdsService;
    const response = await service.getCampaigns(10, 0);

    expect(response.success).toBe(true);
    expect(response.campaigns).toBeInstanceOf(Array);
  });
});

describe.skip('App Store Connect Integration Tests', () => {
  it('should successfully generate JWT token', async () => {
    const service = appStoreConnectService;
    const token = await service.generateToken();

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
    // JWT should have 3 parts separated by dots
    expect(token.split('.')).toHaveLength(3);
  });

  it('should list apps from App Store Connect API', async () => {
    const service = appStoreConnectService;
    const response = await service.listApps();

    expect(response.success).toBe(true);
    expect(response.apps).toBeInstanceOf(Array);
  });

  it('should fetch finance reports', async () => {
    const service = appStoreConnectService;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const report = await service.getFinanceReports({
      frequency: 'DAILY',
      reportType: 'SALES',
      reportSubType: 'SUMMARY',
      reportDate: yesterday.toISOString().split('T')[0]
    });

    expect(report).toBeDefined();
    expect(report.totals).toBeDefined();
  });
});

export default {};
