#!/usr/bin/env node

/**
 * Revenue Data Back-fill Script
 *
 * Fetches and stores historical sales data from App Store Connect
 * going back up to 6 months (180 days)
 *
 * Run: node backend/scripts/backfillRevenue.js
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

// Dynamic imports after env is loaded
const { default: appStoreConnectService } = await import('../services/appStoreConnectService.js');
const { default: databaseService } = await import('../services/database.js');
const { default: MarketingRevenue } = await import('../models/MarketingRevenue.js');
const { default: DailyRevenueAggregate } = await import('../models/DailyRevenueAggregate.js');

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
const DAYS_TO_BACKFILL = parseInt(process.env.REVENUE_BACKFILL_DAYS || '180');

/**
 * Main back-fill function
 */
async function runBackfill() {
  log('Revenue Data Back-fill Script', 'bright');
  log(`Back-filling up to ${DAYS_TO_BACKFILL} days of revenue data`, 'cyan');

  try {
    // Connect to database
    section('Step 1: Connecting to Database');
    await databaseService.connect();
    success('Connected to database');

    // Check if ASC service is configured
    section('Step 2: Verifying App Store Connect Configuration');
    if (!appStoreConnectService.isConfigured()) {
      error('App Store Connect service is not configured');
      info('Please set the following environment variables:');
      info('  - APP_STORE_CONNECT_KEY_ID');
      info('  - APP_STORE_CONNECT_ISSUER_ID');
      info('  - APP_STORE_CONNECT_PRIVATE_KEY_PATH');
      await databaseService.disconnect();
      process.exit(1);
    }
    success('App Store Connect service is configured');

    // Calculate date range
    section('Step 3: Calculating Date Range');
    const endDate = new Date();
    // Sales reports have ~24 hour delay
    endDate.setDate(endDate.getDate() - 1);

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - DAYS_TO_BACKFILL);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    log(`Start Date: ${startDateStr}`, 'cyan');
    log(`End Date: ${endDateStr}`, 'cyan');
    log(`Total Days: ${DAYS_TO_BACKFILL}`, 'cyan');

    // Check existing data
    section('Step 4: Checking Existing Data');
    const existingCount = await MarketingRevenue.countDocuments({
      transactionDate: {
        $gte: startDate,
        $lte: endDate
      }
    });

    if (existingCount > 0) {
      log(`Found ${existingCount} existing transactions in the date range`, 'yellow');
      info('Existing records will be updated with fresh data');
    } else {
      success('No existing data found - will create new records');
    }

    // Fetch and store data day by day
    // Note: App Store Connect API requires fetching one day at a time
    section('Step 5: Fetching and Storing Sales Data');

    let totalProcessed = 0;
    let totalStored = 0;
    let failedDays = [];
    let daysWithPaidRevenue = 0;
    let totalPaidRevenue = 0;

    // Process each day individually (API limitation)
    for (let offset = 0; offset < DAYS_TO_BACKFILL; offset += 1) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + offset);
      const dateStr = date.toISOString().split('T')[0];

      info(`Processing ${dateStr} (${offset + 1} of ${DAYS_TO_BACKFILL})`);

      try {
        // Fetch all revenue reports for this date (SALES + SUBSCRIPTION_EVENT)
        const reportData = await appStoreConnectService.fetchAllRevenueReports({
          frequency: 'DAILY',
          reportDate: dateStr
        });

        if (reportData && reportData.transactions && reportData.transactions.length > 0) {
          // Store transactions
          for (const transaction of reportData.transactions) {
            try {
              // Debug: log the transaction structure before saving
              if (totalStored === 0) {
                info(`First transaction structure: ${JSON.stringify(transaction, null, 2)}`);
              }

              const result = await MarketingRevenue.findOneAndUpdate(
                { transactionId: transaction.transactionId },
                transaction,
                { upsert: true, new: true, overwrite: true }
              );
              totalStored++;

              // Track paid revenue (exclude refunds which are negative)
              if (transaction.revenue && transaction.revenue.netAmount > 0) {
                totalPaidRevenue += transaction.revenue.netAmount;
              }
            } catch (err) {
              error(`Failed to store transaction ${transaction.transactionId}: ${err.message}`);
              if (totalStored === 0) {
                error(`Error details: ${err.stack}`);
              }
            }
          }

          totalProcessed += reportData.transactions.length;
          const dayRevenue = reportData.totals?.netRevenue || 0;
          if (dayRevenue > 0) {
            daysWithPaidRevenue++;
            success(`Stored ${reportData.transactions.length} transactions ($${dayRevenue.toFixed(2)} revenue)`);
          } else {
            log(`Stored ${reportData.transactions.length} transactions (no paid revenue)`, 'yellow');
          }
        } else {
          log(`No transactions found for ${dateStr}`, 'yellow');
        }

      } catch (err) {
        error(`Failed to process ${dateStr}: ${err.message}`);
        failedDays.push({ date: dateStr, error: err.message });
      }
    }

    if (totalPaidRevenue > 0) {
      success(`Total paid revenue across all days: $${totalPaidRevenue.toFixed(2)}`);
    }

    // Trigger aggregation for all back-filled dates
    section('Step 6: Triggering Aggregation');
    let aggregationCount = 0;

    for (let offset = 0; offset < DAYS_TO_BACKFILL; offset += 1) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + offset);

      try {
        const aggregate = await DailyRevenueAggregate.aggregateForDate(date);
        if (aggregate) {
          aggregationCount++;
        }
      } catch (err) {
        // Silently skip aggregation errors
      }
    }

    success(`Created/updated ${aggregationCount} daily aggregate records`);

    // Print summary
    section('Back-fill Summary');
    log(`Total Transactions Processed: ${totalProcessed}`, 'cyan');
    log(`Total Transactions Stored: ${totalStored}`, 'cyan');
    log(`Days With Paid Revenue: ${daysWithPaidRevenue}`, 'cyan');
    if (totalPaidRevenue > 0) {
      log(`Total Paid Revenue: $${totalPaidRevenue.toFixed(2)}`, 'green');
    } else {
      log(`Total Paid Revenue: $0.00`, 'yellow');
    }
    log(`Daily Aggregates Created: ${aggregationCount}`, 'cyan');

    if (failedDays.length > 0) {
      log(`Failed Days: ${failedDays.length}`, 'yellow');
      failedDays.forEach(day => {
        log(`  - ${day.date}: ${day.error}`, 'yellow');
      });
    }

    // Verify data
    section('Step 7: Verifying Data');
    const finalCount = await MarketingRevenue.countDocuments({
      transactionDate: {
        $gte: startDate,
        $lte: endDate
      }
    });

    const aggregateCount = await DailyRevenueAggregate.countDocuments({
      dateObj: {
        $gte: startDate,
        $lte: endDate
      }
    });

    success(`Verification complete: ${finalCount} transactions, ${aggregateCount} daily aggregates`);

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

// Run the back-fill
runBackfill().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
