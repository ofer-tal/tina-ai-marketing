#!/usr/bin/env node

/**
 * January 2026 Revenue Re-fetch Script
 *
 * Re-fetches January 2026 sales data from App Store Connect
 * to populate missing metadata fields (productType, currency, etc.)
 * after schema fix that allows arbitrary metadata fields.
 *
 * Run: node backend/scripts/backfillJanuary2026.js
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

/**
 * Main re-fetch function for January 2026
 */
async function runJanuaryBackfill() {
  log('January 2026 Revenue Re-fetch Script', 'bright');
  log('Re-fetching January 2026 to populate missing metadata fields', 'cyan');

  try {
    // Connect to database
    section('Step 1: Connecting to Database');
    await databaseService.connect();
    success('Connected to database');

    // Check if ASC service is configured
    section('Step 2: Verifying App Store Connect Configuration');
    if (!appStoreConnectService.isConfigured()) {
      error('App Store Connect service is not configured');
      await databaseService.disconnect();
      process.exit(1);
    }
    success('App Store Connect service is configured');

    // January 2026 date range
    section('Step 3: January 2026 Date Range');
    const startDate = new Date('2026-01-01');
    const endDate = new Date('2026-02-01'); // Exclusive end date

    log(`Start Date: 2026-01-01`, 'cyan');
    log(`End Date: 2026-02-01`, 'cyan');

    // Check existing data
    section('Step 4: Checking Existing January Data');
    const existingCount = await MarketingRevenue.countDocuments({
      transactionDate: {
        $gte: startDate,
        $lt: endDate
      }
    });

    log(`Found ${existingCount} existing transactions in January 2026`, 'cyan');

    // Delete existing January data to ensure clean re-import
    section('Step 5: Deleting Existing January Data');
    const deleteResult = await MarketingRevenue.deleteMany({
      transactionDate: {
        $gte: startDate,
        $lt: endDate
      }
    });
    success(`Deleted ${deleteResult.deletedCount} existing transactions`);

    // Fetch and store data day by day
    section('Step 6: Fetching and Storing January Sales Data');

    let totalStored = 0;
    let failedDays = [];
    let totalPaidRevenue = 0;

    // Process each day in January 2026
    const currentDate = new Date(startDate);
    while (currentDate < endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfMonth = currentDate.getDate();

      info(`Processing ${dateStr} (Day ${dayOfMonth} of 31)`);

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
            }
          }

          const dayRevenue = reportData.totals?.netRevenue || 0;
          if (dayRevenue > 0) {
            success(`${dateStr}: ${reportData.transactions.length} txns, $${dayRevenue.toFixed(2)} revenue`);
          } else {
            log(`${dateStr}: ${reportData.transactions.length} txns (no positive revenue)`, 'yellow');
          }
        } else {
          log(`${dateStr}: No transactions found`, 'yellow');
        }

      } catch (err) {
        error(`Failed to process ${dateStr}: ${err.message}`);
        failedDays.push({ date: dateStr, error: err.message });
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    section('Re-fetch Summary');
    log(`Total Transactions Stored: ${totalStored}`, 'cyan');
    if (totalPaidRevenue > 0) {
      log(`Total Paid Revenue: $${totalPaidRevenue.toFixed(2)}`, 'green');
    }

    if (failedDays.length > 0) {
      log(`Failed Days: ${failedDays.length}`, 'yellow');
      failedDays.forEach(day => {
        log(`  - ${day.date}: ${day.error}`, 'yellow');
      });
    }

    // Verify data with breakdown
    section('Step 7: Verification - New vs Renewal Breakdown');

    const janTx = await MarketingRevenue.find({
      transactionDate: { $gte: startDate, $lt: endDate }
    }).lean();

    // Count by customer.new and product type
    let newSalesCount = 0;
    let newSalesGross = 0;
    let renewalCount = 0;
    let renewalGross = 0;
    let refundCount = 0;
    let refundTotal = 0;

    const byProductType = {};
    const byAmount = {};

    for (const tx of janTx) {
      const gross = tx.revenue?.grossAmount || 0;
      const isNew = tx.customer?.new === true;
      const productType = tx.metadata?.productType || 'unknown';
      const subscriptionType = tx.customer?.subscriptionType || 'unknown';

      // Track by amount
      const amtKey = gross.toFixed(2);
      if (!byAmount[amtKey]) byAmount[amtKey] = { count: 0, total: 0, isNew: [], renewal: [] };
      byAmount[amtKey].count++;
      byAmount[amtKey].total += gross;
      if (gross > 0) {
        if (isNew) byAmount[amtKey].isNew.push(gross);
        else byAmount[amtKey].renewal.push(gross);
      }

      // Track by product type
      const typeKey = `${productType}/${subscriptionType}`;
      if (!byProductType[typeKey]) byProductType[typeKey] = { count: 0, gross: 0 };
      byProductType[typeKey].count++;
      byProductType[typeKey].gross += gross;

      // Categorize
      if (gross < 0) {
        refundCount++;
        refundTotal += gross;
      } else if (isNew) {
        newSalesCount++;
        newSalesGross += gross;
      } else {
        renewalCount++;
        renewalGross += gross;
      }
    }

    log(`\nTotal Transactions: ${janTx.length}`, 'cyan');
    log(`NEW Sales (gross): ${newSalesCount} txns, $${newSalesGross.toFixed(2)}`, 'green');
    log(`Renewals (gross): ${renewalCount} txns, $${renewalGross.toFixed(2)}`, 'yellow');
    log(`Refunds: ${refundCount} txns, $${refundTotal.toFixed(2)}`, 'red');
    log(`Net After Refunds: $${(newSalesGross + refundTotal).toFixed(2)}`, 'cyan');

    log(`\nExpected (App Store Connect): $381.00`, 'cyan');
    log(`Our NEW Sales: $${newSalesGross.toFixed(2)}`, newSalesGross > 350 ? 'green' : 'yellow');
    log(`Difference: $${(newSalesGross - 381).toFixed(2)}`, Math.abs(newSalesGross - 381) < 50 ? 'green' : 'yellow');

    console.log('\n--- BY AMOUNT (helps identify product tiers) ---');
    for (const [amt, data] of Object.entries(byAmount).sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))) {
      if (parseFloat(amt) > 0) {
        const newSum = data.isNew.reduce((a, b) => a + b, 0);
        const renewalSum = data.renewal.reduce((a, b) => a + b, 0);
        console.log(`$${amt}: ${data.count} txns (NEW: ${data.isNew.length} = $${newSum.toFixed(2)}, RENEWAL: ${data.renewal.length} = $${renewalSum.toFixed(2)})`);
      }
    }

    console.log('\n--- BY PRODUCT TYPE ---');
    for (const [type, data] of Object.entries(byProductType).sort((a, b) => b[1].gross - a[1].gross)) {
      console.log(`${type}: ${data.count} txns, $${data.gross.toFixed(2)}`);
    }

    console.log('\n' + '='.repeat(60) + '\n');

  } catch (err) {
    error(`Re-fetch failed: ${err.message}`);
    console.error(err);
    await databaseService.disconnect();
    process.exit(1);
  } finally {
    await databaseService.disconnect();
  }
}

// Run the re-fetch
runJanuaryBackfill().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
