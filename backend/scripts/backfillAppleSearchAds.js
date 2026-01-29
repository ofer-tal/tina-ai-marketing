#!/usr/bin/env node

/**
 * Apple Search Ads Data Back-fill Script
 *
 * Fetches and stores historical campaign performance data from Apple Search Ads
 * going back up to 6 months (180 days)
 *
 * Run: node backend/scripts/backfillAppleSearchAds.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const projectRoot = path.resolve(__dirname, '../..');
const envPath = path.join(projectRoot, '.env');
dotenv.config({ path: envPath });

console.log(`Loading .env from: ${envPath}`);
console.log(`SEARCH_ADS_CLIENT_ID is set: ${!!process.env.SEARCH_ADS_CLIENT_ID}`);
console.log(`SEARCH_ADS_TEAM_ID is set: ${!!process.env.SEARCH_ADS_TEAM_ID}`);

// Dynamic imports after env is loaded
const { default: appleSearchAdsService } = await import('../services/appleSearchAdsService.js');
const { default: databaseService } = await import('../services/database.js');
const { default: DailySpend } = await import('../models/DailySpend.js');
const { default: AdGroup } = await import('../models/AdGroup.js');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
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

function section(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

// Configuration
const DAYS_TO_BACKFILL = parseInt(process.env.ASA_BACKFILL_DAYS || '180');

/**
 * Main back-fill function
 */
async function runBackfill() {
  log('Apple Search Ads Data Back-fill Script', 'bright');
  log(`Back-filling up to ${DAYS_TO_BACKFILL} days of campaign data`, 'cyan');

  try {
    // Connect to database
    section('Step 1: Connecting to Database');
    await databaseService.connect();
    success('Connected to database');

    // Verify ASA service configuration
    section('Step 2: Verifying Apple Search Ads Configuration');
    const configStatus = appleSearchAdsService.getConfigStatus();

    if (!configStatus.configured) {
      error('Apple Search Ads service is not configured');
      info('Please set the following environment variables:');
      info('  - SEARCH_ADS_CLIENT_ID');
      info('  - SEARCH_ADS_TEAM_ID');
      info('  - SEARCH_ADS_KEY_ID');
      info('  - SEARCH_ADS_PRIVATE_KEY_PATH');
      info('  - SEARCH_ADS_ORGANIZATION_ID');
      await databaseService.disconnect();
      process.exit(1);
    }
    success('Apple Search Ads service is configured');

    // Test OAuth connection
    info('Testing OAuth connection...');
    await appleSearchAdsService.authenticate();
    success('OAuth connection successful');

    // Get list of campaigns
    section('Step 3: Fetching Campaigns');
    const campaignsResponse = await appleSearchAdsService.getCampaigns(200, 0);

    if (!campaignsResponse.success || !campaignsResponse.campaigns) {
      error('Failed to fetch campaigns');
      await databaseService.disconnect();
      process.exit(1);
    }

    const campaigns = campaignsResponse.campaigns;
    success(`Fetched ${campaigns.length} campaigns`);

    if (campaigns.length === 0) {
      log('No campaigns found - nothing to back-fill', 'yellow');
      await databaseService.disconnect();
      return;
    }

    // Display campaign summary
    log('\n  Campaigns to back-fill:', 'bright');
    campaigns.forEach((c, i) => {
      log(`    ${i + 1}. ${c.name} (ID: ${c.id}, Status: ${c.status})`, 'cyan');
    });

    // Calculate date range
    section('Step 4: Calculating Date Range');
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - DAYS_TO_BACKFILL);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    log(`Start Date: ${startDateStr}`, 'cyan');
    log(`End Date: ${endDateStr}`, 'cyan');
    log(`Total Days: ${DAYS_TO_BACKFILL}`, 'cyan');

    // Check existing data
    section('Step 5: Checking Existing Data');
    const existingCount = await DailySpend.countDocuments({
      platform: 'apple_search_ads',
      date: {
        $gte: startDateStr,
        $lte: endDateStr
      }
    });

    if (existingCount > 0) {
      log(`Found ${existingCount} existing daily spend records`, 'yellow');
      info('Existing records will be updated with fresh data');
    } else {
      success('No existing data found - will create new records');
    }

    // Fetch and store spend data
    section('Step 6: Fetching and Storing Campaign Spend Data');

    let totalStored = 0;
    let failedCampaigns = [];

    // Apple Search Ads API limits DAILY granularity to 30-day ranges
    // Break the full date range into 30-day chunks
    const DAY_CHUNK_SIZE = 30;
    let currentDate = new Date(startDate);
    const finalEndDate = new Date(endDate);

    for (const campaign of campaigns) {
      info(`Processing campaign: ${campaign.name} (${campaign.id})`);

      let campaignStored = 0;

      // Process in 30-day chunks
      while (currentDate < finalEndDate) {
        let chunkEndDate = new Date(currentDate);
        chunkEndDate.setDate(chunkEndDate.getDate() + DAY_CHUNK_SIZE);
        if (chunkEndDate > finalEndDate) {
          chunkEndDate = new Date(finalEndDate);
        }

        const chunkStartDateStr = currentDate.toISOString().split('T')[0];
        const chunkEndDateStr = chunkEndDate.toISOString().split('T')[0];

        info(`  Fetching ${chunkStartDateStr} to ${chunkEndDateStr}...`);

        try {
          // Fetch spend data for this campaign and date chunk
          const spendData = await appleSearchAdsService.getDailySpendData(
            chunkStartDateStr,
            chunkEndDateStr,
            campaign.id
          );

          if (spendData.success && spendData.data && spendData.data.length > 0) {
            // Store or update daily spend records
            for (const dayData of spendData.data) {
              try {
                await DailySpend.findOneAndUpdate(
                  {
                    platform: 'apple_search_ads',
                    campaignId: String(campaign.id),
                    date: dayData.date
                  },
                  {
                    platform: 'apple_search_ads',
                    campaignId: String(campaign.id),
                    campaignName: campaign.name,
                    date: dayData.date,
                    dailyBudget: parseFloat(campaign.dailyBudget?.amount || 0),
                    actualSpend: parseFloat(dayData.spend || 0),
                    spendBreakdown: {
                      impressions: parseInt(dayData.impressions || 0),
                      clicks: parseInt(dayData.clicks || 0),
                      conversions: parseInt(dayData.conversions || 0)
                    },
                    metrics: {
                      cpm: dayData.impressions > 0 ? (dayData.spend / dayData.impressions) * 1000 : 0,
                      cpc: dayData.clicks > 0 ? dayData.spend / dayData.clicks : 0,
                      cpa: dayData.conversions > 0 ? dayData.spend / dayData.conversions : 0,
                      ctr: dayData.impressions > 0 ? (dayData.clicks / dayData.impressions) * 100 : 0,
                      conversionRate: dayData.clicks > 0 ? (dayData.conversions / dayData.clicks) * 100 : 0
                    },
                    budgetStatus: calculateBudgetStatus(
                      parseFloat(campaign.dailyBudget?.amount || 0),
                      parseFloat(dayData.spend || 0)
                    ),
                    dataSource: 'api',
                    calculatedAt: new Date()
                  },
                  { upsert: true, new: true }
                );
                totalStored++;
                campaignStored++;
              } catch (err) {
                error(`Failed to store daily spend for ${dayData.date}: ${err.message}`);
              }
            }
          }

          // Move to next chunk
          currentDate = new Date(chunkEndDate);

        } catch (err) {
          error(`Failed to process chunk ${chunkStartDateStr} to ${chunkEndDateStr}: ${err.message}`);
          // Move to next chunk on error
          currentDate = new Date(chunkEndDate);
        }
      }

      // Reset currentDate for next campaign
      currentDate = new Date(startDate);

      if (campaignStored > 0) {
        success(`Stored ${campaignStored} daily spend records for ${campaign.name}`);
      } else {
        log(`No spend data found for ${campaign.name}`, 'yellow');
      }
    }

    // Fetch and store ad group data
    section('Step 7: Fetching and Storing Ad Group Data');

    let adGroupsStored = 0;

    // Limit to first 10 campaigns for ad group data to avoid rate limits
    const campaignsForAdGroups = campaigns.slice(0, 10);

    for (const campaign of campaignsForAdGroups) {
      info(`Fetching ad groups for: ${campaign.name}`);

      try {
        const adGroupsResponse = await appleSearchAdsService.getAdGroups(campaign.id, 200, 0);

        if (adGroupsResponse.success && adGroupsResponse.adGroups) {
          for (const adGroup of adGroupsResponse.adGroups) {
            try {
              await AdGroup.findOneAndUpdate(
                { campaignId: campaign.id, adGroupId: adGroup.id },
                {
                  campaignId: campaign.id,
                  campaignName: campaign.name,
                  adGroupId: adGroup.id,
                  adGroupName: adGroup.name,
                  status: adGroup.status,
                  servingStatus: adGroup.servingStatus,
                  dailyBudget: adGroup.dailyBudget?.amount || 0,
                  createdAt: adGroup.createdAt,
                  metadata: {
                    lastSyncAt: new Date(),
                    dataSource: 'apple_search_ads_api'
                  }
                },
                { upsert: true, new: true }
              );
              adGroupsStored++;
            } catch (err) {
              error(`Failed to store ad group ${adGroup.id}: ${err.message}`);
            }
          }
          success(`Stored ${adGroupsResponse.adGroups.length} ad groups for ${campaign.name}`);
        }

      } catch (err) {
        error(`Failed to fetch ad groups for ${campaign.name}: ${err.message}`);
      }
    }

    // Print summary
    section('Back-fill Summary');
    log(`Total Daily Spend Records Stored: ${totalStored}`, 'cyan');
    log(`Total Ad Groups Stored: ${adGroupsStored}`, 'cyan');

    if (failedCampaigns.length > 0) {
      log(`Failed Campaigns: ${failedCampaigns.length}`, 'yellow');
      failedCampaigns.forEach(c => {
        log(`  - ${c.campaignName}: ${c.error}`, 'yellow');
      });
    }

    // Calculate totals
    section('Step 8: Calculating Totals');
    const totalSpend = await DailySpend.aggregate([
      {
        $match: {
          platform: 'apple_search_ads',
          date: { $gte: startDateStr, $lte: endDateStr }
        }
      },
      {
        $group: {
          _id: null,
          totalSpend: { $sum: '$actualSpend' },
          totalImpressions: { $sum: '$spendBreakdown.impressions' },
          totalClicks: { $sum: '$spendBreakdown.clicks' },
          totalConversions: { $sum: '$spendBreakdown.conversions' }
        }
      }
    ]);

    if (totalSpend.length > 0) {
      const totals = totalSpend[0];
      log(`Total Spend: $${totals.totalSpend.toFixed(2)}`, 'green');
      log(`Total Impressions: ${totals.totalImpressions.toLocaleString()}`, 'cyan');
      log(`Total Clicks: ${totals.totalClicks.toLocaleString()}`, 'cyan');
      log(`Total Conversions: ${totals.totalConversions.toLocaleString()}`, 'cyan');

      if (totals.totalClicks > 0) {
        const avgCpc = totals.totalSpend / totals.totalClicks;
        log(`Avg CPC: $${avgCpc.toFixed(2)}`, 'cyan');
      }

      if (totals.totalConversions > 0) {
        const avgCpa = totals.totalSpend / totals.totalConversions;
        log(`Avg CPA: $${avgCpa.toFixed(2)}`, 'cyan');
      }
    }

    console.log('\n' + '='.repeat(60) + '\n');

  } catch (err) {
    error(`Back-fill failed: ${err.message}`);
    console.error(err);
    await databaseService.disconnect();
    process.exit(1);
  } finally {
    await databaseService.disconnect();
  }
}

/**
 * Calculate budget status
 */
function calculateBudgetStatus(budget, actualSpend) {
  if (budget === 0) {
    return actualSpend > 0 ? 'over' : 'unknown';
  }

  const percentage = (actualSpend / budget) * 100;

  if (percentage >= 100) {
    return 'exceeded';
  } else if (percentage >= 90) {
    return 'warning';
  } else if (percentage >= 70) {
    return 'on_track';
  } else {
    return 'under';
  }
}

// Run the back-fill
runBackfill().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
