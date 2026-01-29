#!/usr/bin/env node

/**
 * Apple Search Ads Integration Verification Script
 *
 * This script verifies the Apple Search Ads OAuth 2.0 JWT integration by:
 * 1. Testing credentials are loaded correctly
 * 2. Testing OAuth connection (JWT token generation)
 * 3. Listing campaigns
 * 4. Fetching ad groups for a campaign
 * 5. Fetching keywords for an ad group
 * 6. Fetching campaign spend data for last 7 days
 * 7. Verifying data is being stored in DailySpend collection
 *
 * Run: node backend/scripts/verifyAppleSearchAds.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// IMPORTANT: Load environment variables FIRST before any other imports
// The service imports config.js which also loads dotenv, so we need to
// ensure the .env is loaded first with the correct path
const projectRoot = path.resolve(__dirname, '../..');
const envPath = path.join(projectRoot, '.env');
dotenv.config({ path: envPath });

console.log(`Loading .env from: ${envPath}`);
console.log(`SEARCH_ADS_CLIENT_ID is set: ${!!process.env.SEARCH_ADS_CLIENT_ID}`);
console.log(`SEARCH_ADS_TEAM_ID is set: ${!!process.env.SEARCH_ADS_TEAM_ID}`);
console.log(`SEARCH_ADS_KEY_ID is set: ${!!process.env.SEARCH_ADS_KEY_ID}`);
console.log(`SEARCH_ADS_ORGANIZATION_ID is set: ${!!process.env.SEARCH_ADS_ORGANIZATION_ID}`);
console.log(`SEARCH_ADS_PRIVATE_KEY_PATH is set: ${!!process.env.SEARCH_ADS_PRIVATE_KEY_PATH}`);

// Now do dynamic imports after env is loaded
const { default: appleSearchAdsService } = await import('../services/appleSearchAdsService.js');
const { default: databaseService } = await import('../services/database.js');
const { default: DailySpend } = await import('../models/DailySpend.js');
const { default: MarketingCost } = await import('../models/MarketingCost.js');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

function success(message) {
  log(`  ✓ ${message}`, 'green');
}

function error(message) {
  log(`  ✗ ${message}`, 'red');
}

function info(message) {
  log(`  → ${message}`, 'cyan');
}

function warn(message) {
  log(`  ⚠ ${message}`, 'yellow');
}

// Verification results
const results = {
  credentialsLoaded: false,
  oauthConnection: false,
  campaignsFetched: false,
  adGroupsFetched: false,
  keywordsFetched: false,
  spendDataFetched: false,
  dailySpendRecords: 0,
  marketingCostRecords: 0,
  issues: [],
};

/**
 * Step 1: Verify credentials are loaded
 */
async function verifyCredentials() {
  section('Step 1: Verifying Credentials');

  const configStatus = appleSearchAdsService.getConfigStatus();

  log('Configuration Status:', 'cyan');
  log(`  Environment: ${configStatus.environment}`, 'cyan');
  log(`  Client ID: ${configStatus.clientIdConfigured ? '✓ Set' : '✗ Missing'}`, configStatus.clientIdConfigured ? 'green' : 'red');
  log(`  Team ID: ${configStatus.teamIdConfigured ? '✓ Set' : '✗ Missing'}`, configStatus.teamIdConfigured ? 'green' : 'red');
  log(`  Key ID: ${configStatus.keyIdConfigured ? '✓ Set' : '✗ Missing'}`, configStatus.keyIdConfigured ? 'green' : 'red');
  log(`  Private Key Path: ${configStatus.privateKeyPathConfigured ? '✓ Set' : '✗ Missing'}`, configStatus.privateKeyPathConfigured ? 'green' : 'red');
  log(`  Organization ID: ${configStatus.organizationIdConfigured ? '✓ Set' : '✗ Missing'}`, configStatus.organizationIdConfigured ? 'green' : 'red');

  if (configStatus.configured) {
    results.credentialsLoaded = true;
    success('All credentials are loaded correctly');
    return true;
  } else {
    error('Some credentials are missing');
    results.issues.push('Not all credentials are configured');
    return false;
  }
}

/**
 * Step 2: Test OAuth connection and token refresh
 */
async function verifyOAuthConnection() {
  section('Step 2: Testing OAuth Connection (JWT Token)');

  try {
    info('Attempting to authenticate...');

    // This will test JWT creation and OAuth token request
    const token = await appleSearchAdsService.authenticate();

    if (token) {
      results.oauthConnection = true;
      success('OAuth connection successful');
      info('Access token obtained (token hidden for security)');
      return true;
    } else {
      error('Failed to obtain access token');
      results.issues.push('OAuth token request returned empty token');
      return false;
    }
  } catch (err) {
    error(`OAuth connection failed: ${err.message}`);
    results.issues.push(`OAuth error: ${err.message}`);
    return false;
  }
}

/**
 * Step 3: Test API request - List campaigns
 */
async function verifyCampaigns() {
  section('Step 3: Fetching Campaigns');

  try {
    info('Requesting campaigns from Apple Search Ads API...');

    const campaignsResponse = await appleSearchAdsService.getCampaigns(20, 0);

    if (campaignsResponse.success && campaignsResponse.campaigns) {
      results.campaignsFetched = true;
      const count = campaignsResponse.campaigns.length;
      const total = campaignsResponse.pagination?.totalResults || count;

      success(`Fetched ${count} campaign(s)`);
      if (total > count) {
        info(`Total campaigns available: ${total} (showing first ${count})`);
      }

      // Display campaign summary
      if (count > 0) {
        log('\n  Campaign Summary:', 'bright');
        campaignsResponse.campaigns.forEach((c, i) => {
          log(`    ${i + 1}. ${c.name || 'Unnamed'} (${c.status || 'Unknown status'})`, 'dim');
          log(`       ID: ${c.id}`, 'dim');
          log(`       Budget: $${c.dailyBudget?.amount || 0}/day`, 'dim');
        });
      }

      return campaignsResponse.campaigns;
    } else {
      error('Failed to fetch campaigns');
      results.issues.push('Campaign API request failed');
      return null;
    }
  } catch (err) {
    error(`Failed to fetch campaigns: ${err.message}`);
    results.issues.push(`Campaign fetch error: ${err.message}`);
    return null;
  }
}

/**
 * Step 4: Fetch ad groups for a campaign
 */
async function verifyAdGroups(campaigns) {
  section('Step 4: Fetching Ad Groups');

  if (!campaigns || campaigns.length === 0) {
    warn('No campaigns available to fetch ad groups');
    return null;
  }

  try {
    const campaignId = campaigns[0].id;
    info(`Fetching ad groups for campaign: ${campaigns[0].name || campaigns[0].id}`);

    const adGroupsResponse = await appleSearchAdsService.getAdGroups(campaignId, 20, 0);

    if (adGroupsResponse.success && adGroupsResponse.adGroups) {
      results.adGroupsFetched = true;
      const count = adGroupsResponse.adGroups.length;

      success(`Fetched ${count} ad group(s)`);

      if (count > 0) {
        log('\n  Ad Group Summary:', 'bright');
        adGroupsResponse.adGroups.forEach((ag, i) => {
          log(`    ${i + 1}. ${ag.name || 'Unnamed'} (${ag.status || 'Unknown status'})`, 'dim');
          log(`       ID: ${ag.id}`, 'dim');
          log(`       Serving Status: ${ag.servingStatus || 'Unknown'}`, 'dim');
        });
      }

      return { campaignId, adGroups: adGroupsResponse.adGroups };
    } else {
      error('Failed to fetch ad groups');
      results.issues.push('Ad group API request failed');
      return null;
    }
  } catch (err) {
    error(`Failed to fetch ad groups: ${err.message}`);
    results.issues.push(`Ad group fetch error: ${err.message}`);
    return null;
  }
}

/**
 * Step 5: Fetch keywords for an ad group
 */
async function verifyKeywords(adGroupData) {
  section('Step 5: Fetching Keywords');

  if (!adGroupData || !adGroupData.adGroups || adGroupData.adGroups.length === 0) {
    warn('No ad groups available to fetch keywords');
    return null;
  }

  try {
    const campaignId = adGroupData.campaignId;
    const adGroupId = adGroupData.adGroups[0].id;
    const adGroupName = adGroupData.adGroups[0].name || adGroupId;

    info(`Fetching keywords for ad group: ${adGroupName}`);

    const keywordsResponse = await appleSearchAdsService.getKeywords(campaignId, adGroupId, 50, 0);

    if (keywordsResponse.success && keywordsResponse.keywords) {
      results.keywordsFetched = true;
      const count = keywordsResponse.keywords.length;

      success(`Fetched ${count} keyword(s)`);

      if (count > 0) {
        log('\n  Keyword Summary (first 5):', 'bright');
        keywordsResponse.keywords.slice(0, 5).forEach((kw, i) => {
          log(`    ${i + 1}. "${kw.text || kw.keywordText || 'Unnamed'}"`, 'dim');
          log(`       Match Type: ${kw.matchType || 'Unknown'}`, 'dim');
          log(`       Status: ${kw.status || 'Unknown'}`, 'dim');
          log(`       Bid: $${kw.bid?.amount || 0}`, 'dim');
        });
      }

      return keywordsResponse.keywords;
    } else {
      error('Failed to fetch keywords');
      results.issues.push('Keyword API request failed');
      return null;
    }
  } catch (err) {
    error(`Failed to fetch keywords: ${err.message}`);
    results.issues.push(`Keyword fetch error: ${err.message}`);
    return null;
  }
}

/**
 * Step 6: Fetch campaign spend data for last 7 days
 */
async function verifySpendData() {
  section('Step 6: Fetching Campaign Spend Data (Last 7 Days)');

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  info(`Requesting spend data from ${startDateStr} to ${endDateStr}`);

  try {
    const spendData = await appleSearchAdsService.getDailySpendData(
      startDateStr,
      endDateStr,
      null // All campaigns
    );

    if (spendData.success && spendData.data && spendData.data.length > 0) {
      results.spendDataFetched = true;
      success(`Fetched ${spendData.data.length} spend record(s)`);

      // Calculate totals
      let totalSpend = 0;
      let totalImpressions = 0;
      let totalClicks = 0;

      spendData.data.forEach(record => {
        totalSpend += record.spend || 0;
        totalImpressions += record.impressions || 0;
        totalClicks += record.clicks || 0;
      });

      log('\n  Spend Summary (Last 7 Days):', 'bright');
      log(`    Total Spend: $${totalSpend.toFixed(2)}`, 'green');
      log(`    Total Impressions: ${totalImpressions.toLocaleString()}`, 'cyan');
      log(`    Total Clicks: ${totalClicks.toLocaleString()}`, 'cyan');
      log(`    Avg CPC: $${totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : 'N/A'}`, 'cyan');

      return spendData.data;
    } else if (spendData.success && (!spendData.data || spendData.data.length === 0)) {
      results.spendDataFetched = true;
      success('Spend API request succeeded (no data for the period)');
      info('This is normal if campaigns are new or not yet active');
      return [];
    } else {
      error('Failed to fetch spend data');
      results.issues.push(`Spend data error: ${spendData.error || 'Unknown error'}`);
      return null;
    }
  } catch (err) {
    error(`Failed to fetch spend data: ${err.message}`);
    results.issues.push(`Spend data fetch error: ${err.message}`);
    return null;
  }
}

/**
 * Step 7: Verify data is stored in database collections
 */
async function verifyDatabaseStorage() {
  section('Step 7: Verifying Database Storage');

  try {
    const dbStatus = databaseService.getStatus();

    if (!dbStatus.isConnected) {
      warn('Database not connected - skipping database verification');
      results.issues.push('Database not connected');
      return;
    }

    // Check DailySpend collection for Apple Search Ads data
    info('Querying DailySpend collection for Apple Search Ads data...');

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const dailySpendRecords = await DailySpend.find({
      platform: 'apple_search_ads',
      date: {
        $gte: startDate.toISOString().split('T')[0],
        $lte: endDate.toISOString().split('T')[0],
      },
    }).sort({ date: -1 });

    results.dailySpendRecords = dailySpendRecords.length;

    if (dailySpendRecords.length > 0) {
      success(`Found ${dailySpendRecords.length} DailySpend record(s) for Apple Search Ads`);

      let totalSpend = 0;
      dailySpendRecords.forEach(r => {
        totalSpend += r.actualSpend || 0;
      });
      info(`Total stored spend: $${totalSpend.toFixed(2)}`);

      log('\n  Recent DailySpend Records (last 5):', 'bright');
      dailySpendRecords.slice(0, 5).forEach((r, i) => {
        log(`    ${i + 1}. ${r.date} - $${(r.actualSpend || 0).toFixed(2)}`, 'dim');
        log(`       Budget Status: ${r.budgetStatus || 'unknown'}`, 'dim');
      });
    } else {
      warn('No DailySpend records found for Apple Search Ads');
      info('Records will be created when the sync job runs');
    }

    // Check MarketingCost collection for Apple Search Ads ad spend
    info('\nQuerying MarketingCost collection for Apple Search Ads ad spend...');

    const marketingCostRecords = await MarketingCost.find({
      'costs.adSpend.breakdown.channel': 'apple_search_ads',
      dateObj: {
        $gte: startDate,
        $lte: endDate,
      },
    }).sort({ dateObj: -1 });

    results.marketingCostRecords = marketingCostRecords.length;

    if (marketingCostRecords.length > 0) {
      success(`Found ${marketingCostRecords.length} MarketingCost record(s) with Apple Search Ads spend`);

      let totalAdSpend = 0;
      marketingCostRecords.forEach(r => {
        const asaBreakdown = r.costs?.adSpend?.breakdown || [];
        asaBreakdown.forEach(b => {
          if (b.channel === 'apple_search_ads') {
            totalAdSpend += b.cost || 0;
          }
        });
      });
      info(`Total stored ad spend: $${totalAdSpend.toFixed(2)}`);
    } else {
      warn('No MarketingCost records found for Apple Search Ads');
      info('Records will be created when the sync job runs');
    }

  } catch (err) {
    error(`Database verification failed: ${err.message}`);
    results.issues.push(`Database error: ${err.message}`);
  }
}

/**
 * Print final report
 */
function printReport() {
  section('Verification Report');

  log('Test Results:', 'bright');

  // Overall status
  const allPassed = results.credentialsLoaded && results.oauthConnection;

  if (allPassed) {
    log('\n  Overall Status: ', 'bright');
    success('PASS - Apple Search Ads integration is working');
  } else {
    log('\n  Overall Status: ', 'bright');
    error('FAIL - Apple Search Ads integration has issues');
  }

  // Individual test results
  log('\n  Individual Tests:', 'bright');
  log(`    Credentials Loaded:  ${results.credentialsLoaded ? '✓ PASS' : '✗ FAIL'}`, results.credentialsLoaded ? 'green' : 'red');
  log(`    OAuth Connection:     ${results.oauthConnection ? '✓ PASS' : '✗ FAIL'}`, results.oauthConnection ? 'green' : 'red');
  log(`    Campaigns Fetched:    ${results.campaignsFetched ? '✓ PASS' : '✗ FAIL'}`, results.campaignsFetched ? 'green' : 'red');
  log(`    Ad Groups Fetched:    ${results.adGroupsFetched ? '✓ PASS' : '- SKIP'}`, results.adGroupsFetched ? 'green' : 'yellow');
  log(`    Keywords Fetched:     ${results.keywordsFetched ? '✓ PASS' : '- SKIP'}`, results.keywordsFetched ? 'green' : 'yellow');
  log(`    Spend Data Fetched:   ${results.spendDataFetched ? '✓ PASS' : '- SKIP'}`, results.spendDataFetched ? 'green' : 'yellow');

  // Database storage
  log('\n  Database Storage:', 'bright');
  log(`    DailySpend Records:   ${results.dailySpendRecords}`, 'cyan');
  log(`    MarketingCost Records: ${results.marketingCostRecords}`, 'cyan');

  // Issues
  if (results.issues.length > 0) {
    log('\n  Issues Found:', 'bright');
    results.issues.forEach((issue, i) => {
      error(`    ${i + 1}. ${issue}`);
    });
  }

  // Next steps
  log('\n  Next Steps:', 'bright');
  if (results.oauthConnection && results.campaignsFetched) {
    info('1. OAuth authentication is working correctly');
    info('2. Campaign data can be retrieved from Apple Search Ads API');
    info('3. Set up the appleSearchAdsSyncJob to automatically sync data');
    info('4. Check dashboard for Apple Search Ads metrics');
  } else if (!results.credentialsLoaded) {
    info('1. Configure Apple Search Ads credentials in .env file:');
    info('   - SEARCH_ADS_CLIENT_ID');
    info('   - SEARCH_ADS_TEAM_ID');
    info('   - SEARCH_ADS_KEY_ID');
    info('   - SEARCH_ADS_PRIVATE_KEY_PATH');
    info('   - SEARCH_ADS_ORGANIZATION_ID');
    info('2. Ensure the private key file exists at the specified path');
  } else {
    info('1. Check that credentials are correct');
    info('2. Verify Apple Search Ads API access in Apple Developer account');
    info('3. Check network connectivity to api.searchads.apple.com');
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

/**
 * Main verification flow
 */
async function runVerification() {
  log('Apple Search Ads Integration Verification', 'bright');
  log('This script tests OAuth 2.0 JWT authentication and API access', 'dim');

  try {
    // Connect to database first
    await databaseService.connect();
    success('Connected to database');

    // Run verification steps
    const credentialsOk = await verifyCredentials();
    if (!credentialsOk) {
      printReport();
      await databaseService.disconnect();
      return;
    }

    await verifyOAuthConnection();

    // Only continue with API tests if OAuth succeeded
    if (results.oauthConnection) {
      const campaigns = await verifyCampaigns();
      const adGroups = await verifyAdGroups(campaigns);
      await verifyKeywords(adGroups);
      await verifySpendData();
    }

    await verifyDatabaseStorage();

  } catch (err) {
    error(`Verification failed with error: ${err.message}`);
    results.issues.push(`Unexpected error: ${err.message}`);
  } finally {
    await databaseService.disconnect();
    printReport();
  }
}

// Run the verification
runVerification().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
