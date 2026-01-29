#!/usr/env node
/**
 * Apple APIs Verification Script
 *
 * This script tests Apple Search Ads and App Store Connect API authentication
 * and fetches sample data to verify the integrations are working.
 *
 * Usage: node scripts/verify-apple-apis.js
 *
 * Environment Variables Required:
 *
 * For Apple Search Ads:
 *   - SEARCH_ADS_CLIENT_ID
 *   - SEARCH_ADS_TEAM_ID
 *   - SEARCH_ADS_KEY_ID
 *   - SEARCH_ADS_PRIVATE_KEY_PATH
 *   - SEARCH_ADS_ORGANIZATION_ID
 *
 * For App Store Connect:
 *   - APP_STORE_CONNECT_KEY_ID
 *   - APP_STORE_CONNECT_ISSUER_ID
 *   - APP_STORE_CONNECT_PRIVATE_KEY_PATH
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables BEFORE importing services
const projectRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(projectRoot, '.env') });

// Now import services after env is loaded
const appleSearchAdsService = (await import('../backend/services/appleSearchAdsService.js')).default;
const appStoreConnectService = (await import('../backend/services/appStoreConnectService.js')).default;

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  log(`\n════════════════════════════════════════════════════════════════`, 'cyan');
  log(`  ${title}`, 'cyan');
  log(`════════════════════════════════════════════════════════════════`, 'cyan');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

/**
 * Verify Apple Search Ads API
 */
async function verifyAppleSearchAds() {
  logSection('Apple Search Ads API Verification');

  const config = appleSearchAdsService.getConfigStatus();

  log('Configuration Status:', 'bright');
  log(`  Client ID: ${config.clientIdConfigured ? '✓ Configured' : '✗ Missing'}`, config.clientIdConfigured ? 'green' : 'red');
  log(`  Team ID: ${config.teamIdConfigured ? '✓ Configured' : '✗ Missing'}`, config.teamIdConfigured ? 'green' : 'red');
  log(`  Key ID: ${config.keyIdConfigured ? '✓ Configured' : '✗ Missing'}`, config.keyIdConfigured ? 'green' : 'red');
  log(`  Private Key Path: ${config.privateKeyPathConfigured ? '✓ Configured' : '✗ Missing'}`, config.privateKeyPathConfigured ? 'green' : 'red');
  log(`  Organization ID: ${config.organizationIdConfigured ? '✓ Configured' : '✗ Missing'}`, config.organizationIdConfigured ? 'green' : 'red');

  if (!config.configured) {
    logError('Apple Search Ads API is not properly configured');
    log('\nRequired environment variables:');
    log('  - SEARCH_ADS_CLIENT_ID');
    log('  - SEARCH_ADS_TEAM_ID');
    log('  - SEARCH_ADS_KEY_ID');
    log('  - SEARCH_ADS_PRIVATE_KEY_PATH');
    log('  - SEARCH_ADS_ORGANIZATION_ID');
    return {
      success: false,
      reason: 'not_configured'
    };
  }

  logSuccess('All required environment variables are configured');

  // Test API connection
  log('\nTesting API connection...');
  try {
    const connectionTest = await appleSearchAdsService.testConnection();

    if (connectionTest.success) {
      logSuccess('API connection successful');
      log(`  Environment: ${connectionTest.environment || 'production'}`);

      // Fetch campaigns
      log('\nFetching campaigns...');
      const campaignsResponse = await appleSearchAdsService.getCampaigns(10, 0);

      if (campaignsResponse.success) {
        const campaigns = campaignsResponse.campaigns || [];
        logSuccess(`Fetched ${campaigns.length} campaigns`);

        if (campaigns.length > 0) {
          log('\nSample campaigns:', 'bright');
          campaigns.slice(0, 3).forEach((campaign, index) => {
            log(`  ${index + 1}. ${campaign.name || campaign.id}`, 'blue');
            log(`     Status: ${campaign.status || 'Unknown'}`, 'blue');
            log(`     Daily Budget: $${campaign.dailyBudget?.amount || 0}`, 'blue');
          });

          if (campaigns.length > 3) {
            log(`  ... and ${campaigns.length - 3} more`, 'cyan');
          }
        }
      }

      // Verify permissions
      log('\nVerifying API permissions...');
      const permissions = await appleSearchAdsService.verifyPermissions();

      if (permissions.success) {
        const grantedCount = permissions.summary.granted;
        const totalCount = permissions.summary.total;
        logSuccess(`${grantedCount}/${totalCount} permissions granted`);

        Object.entries(permissions.permissions).forEach(([key, perm]) => {
          const status = perm.allowed ? '✓' : '✗';
          const color = perm.allowed ? 'green' : 'red';
          log(`  ${status} ${perm.description}`, color);
        });
      }

      return {
        success: true,
        api: 'apple_search_ads',
        campaignsCount: campaignsResponse.campaigns?.length || 0,
        permissions: permissions
      };

    } else {
      logError(`API connection failed: ${connectionTest.message}`);
      return {
        success: false,
        api: 'apple_search_ads',
        error: connectionTest.message
      };
    }

  } catch (error) {
    logError(`API test failed: ${error.message}`);
    return {
      success: false,
      api: 'apple_search_ads',
      error: error.message
    };
  }
}

/**
 * Verify App Store Connect API
 */
async function verifyAppStoreConnect() {
  logSection('App Store Connect API Verification');

  const isConfigured = appStoreConnectService.isConfigured();

  log('Configuration Status:', 'bright');

  if (isConfigured) {
    logSuccess('Service is configured');
    log(`  Key ID: ${process.env.APP_STORE_CONNECT_KEY_ID || 'N/A'}`, 'green');
    log(`  Issuer ID: ${process.env.APP_STORE_CONNECT_ISSUER_ID || 'N/A'}`, 'green');
    log(`  Private Key Path: ${process.env.APP_STORE_CONNECT_PRIVATE_KEY_PATH || 'N/A'}`, 'green');
  } else {
    logError('App Store Connect API is not configured');
    log('\nRequired environment variables:');
    log('  - APP_STORE_CONNECT_KEY_ID');
    log('  - APP_STORE_CONNECT_ISSUER_ID');
    log('  - APP_STORE_CONNECT_PRIVATE_KEY_PATH');
    return {
      success: false,
      reason: 'not_configured'
    };
  }

  // Test API connection
  log('\nTesting API connection...');
  try {
    const connectionTest = await appStoreConnectService.testConnection();

    if (connectionTest.success) {
      logSuccess('API connection successful');

      if (connectionTest.appsCount !== undefined) {
        log(`  Apps found: ${connectionTest.appsCount}`, 'green');
      }

      // List apps
      log('\nFetching apps...');
      const appsResponse = await appStoreConnectService.listApps();

      if (appsResponse.success) {
        const apps = appsResponse.apps || [];
        logSuccess(`Fetched ${apps.length} apps`);

        if (apps.length > 0) {
          log('\nAvailable apps:', 'bright');
          apps.forEach((app, index) => {
            log(`  ${index + 1}. ${app.name} (${app.bundleId})`, 'blue');
          });
        }
      }

      // Fetch finance reports (if available)
      log('\nTesting finance reports access...');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];

      const financeReports = await appStoreConnectService.getFinanceReports({
        frequency: 'DAILY',
        reportType: 'SALES',
        reportSubType: 'SUMMARY',
        reportDate: dateStr
      });

      if (financeReports && financeReports.transactions) {
        logSuccess(`Finance reports accessible (${financeReports.transactions.length} transactions for ${dateStr})`);
        log(`  Gross Revenue: $${financeReports.totals?.grossRevenue?.toFixed(2) || '0.00'}`, 'blue');
        log(`  Net Revenue: $${financeReports.totals?.netRevenue?.toFixed(2) || '0.00'}`, 'blue');
        log(`  Source: ${financeReports.source || 'unknown'}`, financeReports.source === 'api' ? 'green' : 'yellow');
      } else {
        logWarning('No finance report data available (this may be normal if no sales occurred)');
      }

      return {
        success: true,
        api: 'app_store_connect',
        appsCount: appsResponse.apps?.length || 0
      };

    } else {
      logError(`API connection failed: ${connectionTest.error}`);
      return {
        success: false,
        api: 'app_store_connect',
        error: connectionTest.error
      };
    }

  } catch (error) {
    logError(`API test failed: ${error.message}`);
    return {
      success: false,
      api: 'app_store_connect',
      error: error.message
    };
  }
}

/**
 * Generate configuration report
 */
function generateConfigurationReport(results) {
  logSection('Configuration Report');

  const report = {
    timestamp: new Date().toISOString(),
    appleSearchAds: {
      configured: results.appleSearchAds?.success || false,
      status: results.appleSearchAds?.success ? 'operational' : 'failed',
      details: results.appleSearchAds
    },
    appStoreConnect: {
      configured: results.appStoreConnect?.success || false,
      status: results.appStoreConnect?.success ? 'operational' : 'failed',
      details: results.appStoreConnect
    }
  };

  const bothConfigured = results.appleSearchAds?.success && results.appStoreConnect?.success;
  const overallStatus = bothConfigured ? 'All APIs Operational' : 'Some APIs Need Configuration';

  log(`Overall Status: ${overallStatus}`, bothConfigured ? 'green' : 'yellow');

  log('\nNext Steps:', 'bright');
  if (bothConfigured) {
    log('  ✓ Both APIs are configured and operational', 'green');
    log('  → Start the backend server with: npm run dev', 'blue');
    log('  → The scheduled jobs will automatically sync data', 'blue');
    log('  → Check dashboard for real-time metrics', 'blue');
  } else {
    if (!results.appleSearchAds?.success) {
      log('  → Configure Apple Search Ads credentials in .env file', 'yellow');
    }
    if (!results.appStoreConnect?.success) {
      log('  → Configure App Store Connect credentials in .env file', 'yellow');
    }
  }

  return report;
}

/**
 * Main execution function
 */
async function main() {
  log('╔════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║         Apple APIs Integration Verification Script                ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════╝', 'cyan');

  const results = {
    appleSearchAds: null,
    appStoreConnect: null
  };

  // Verify Apple Search Ads
  results.appleSearchAds = await verifyAppleSearchAds();

  // Verify App Store Connect
  results.appStoreConnect = await verifyAppStoreConnect();

  // Generate configuration report
  const report = generateConfigurationReport(results);

  log('\n' + '='.repeat(64), 'cyan');
  log('Verification complete!', 'cyan');
  log('='.repeat(64), 'cyan');

  // Exit with appropriate code
  const exitCode = (results.appleSearchAds?.success && results.appStoreConnect?.success) ? 0 : 1;
  process.exit(exitCode);
}

// Run the verification
main().catch(error => {
  logError(`Unhandled error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
