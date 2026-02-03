#!/usr/bin/env node

/**
 * January 2026 Revenue Re-fetch Script - V3
 *
 * This version:
 * 1. Adds version parameter to SUBSCRIPTION_EVENT calls
 * 2. Filters transactions to only include Blush app subscriptions
 *    (excludes "Blush: Spicy Audio Books" and "Bedtime Stories: Counting Sheep")
 *
 * Run: node backend/scripts/backfillJanuary2026_v3.js
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
  magenta: '\x1b[35m',
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
 * Filter transactions to only include Blush app subscriptions
 * Excludes:
 * - "Blush: Spicy Audio Books" (one.v6v.spice)
 * - "Bedtime Stories: Counting Sheep" (one.v6v.countingsheep)
 *
 * Includes:
 * - "Premium Annual Subscription 7-day Trial" (subscription products)
 * - "Premium Monthly Subscription" (subscription products)
 * - "Premium Weekly Subscription" (subscription products)
 */
function isBlushAppTransaction(tx) {
  const title = tx.metadata?.title || '';
  const sku = tx.metadata?.productId || '';
  const productType = tx.metadata?.productType || '';

  // Exclude other apps
  const excludeTitles = [
    'Blush: Spicy Audio Books',
    'Spicy Audio Books',
    'Bedtime Stories: Counting Sheep',
    'Counting Sheep'
  ];

  const excludeSkus = [
    'one.v6v.spice',
    'one.v6v.countingsheep'
  ];

  for (const excludeTitle of excludeTitles) {
    if (title.includes(excludeTitle)) {
      return false;
    }
  }

  for (const excludeSku of excludeSkus) {
    if (sku.includes(excludeSku)) {
      return false;
    }
  }

  // Only include subscription products (or if productType is 'subscription')
  // This excludes one-time app purchases
  if (productType === 'in-app-purchase') {
    return false;
  }

  return true;
}

/**
 * Main re-fetch function for January 2026
 */
async function runJanuaryBackfill() {
  log('January 2026 Revenue Re-fetch Script V3', 'bright');
  log('Filtering to ONLY Blush app subscriptions', 'cyan');

  try {
    section('Step 1: Connecting to Database');
    await databaseService.connect();
    success('Connected to database');

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
    const endDate = new Date('2026-02-01');

    log(`Start Date: 2026-01-01`, 'cyan');
    log(`End Date: 2026-02-01`, 'cyan');

    // Delete existing January data for clean re-import
    section('Step 4: Deleting Existing January Data');
    const deleteResult = await MarketingRevenue.deleteMany({
      transactionDate: {
        $gte: startDate,
        $lt: endDate
      }
    });
    success(`Deleted ${deleteResult.deletedCount} existing transactions`);

    // Fetch and store data day by day
    section('Step 5: Fetching and Filtering Transactions');

    let totalStored = 0;
    let totalFetched = 0;
    let totalFilteredOut = 0;
    let failedDays = [];
    let totalPaidRevenue = 0;
    const filteredDetails = { byTitle: {}, byReason: {} };

    // Process each day in January 2026
    const currentDate = new Date(startDate);
    while (currentDate < endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfMonth = currentDate.getDate();

      info(`Processing ${dateStr} (Day ${dayOfMonth} of 31)`);

      try {
        // Fetch SALES report
        let allTransactions = [];
        try {
          const salesReport = await appStoreConnectService.fetchSalesReports({
            frequency: 'DAILY',
            reportType: 'SALES',
            reportSubType: 'SUMMARY',
            reportDate: dateStr
          });
          allTransactions = salesReport.transactions || [];
          totalFetched += allTransactions.length;
        } catch (err) {
          error(`SALES report failed: ${err.message}`);
        }

        // Filter to only Blush app subscriptions
        const blushTransactions = allTransactions.filter(isBlushAppTransaction);
        const filteredOut = allTransactions.length - blushTransactions.length;
        totalFilteredOut += filteredOut;

        // Track what was filtered out
        for (const tx of allTransactions) {
          if (!isBlushAppTransaction(tx)) {
            const title = tx.metadata?.title || 'Unknown';
            const reason = tx.metadata?.productType === 'in-app-purchase' ? 'App purchase' : 'Other app';
            if (!filteredDetails.byTitle[title]) filteredDetails.byTitle[title] = 0;
            filteredDetails.byTitle[title]++;
            if (!filteredDetails.byReason[reason]) filteredDetails.byReason[reason] = 0;
            filteredDetails.byReason[reason]++;
          }
        }

        if (filteredOut > 0) {
          log(`  Filtered out ${filteredOut} non-Blush transactions`, 'yellow');
        }

        // Store transactions
        for (const transaction of blushTransactions) {
          try {
            const result = await MarketingRevenue.findOneAndUpdate(
              { transactionId: transaction.transactionId },
              transaction,
              { upsert: true, new: true, overwrite: true }
            );
            totalStored++;

            if (transaction.revenue && transaction.revenue.netAmount > 0) {
              totalPaidRevenue += transaction.revenue.netAmount;
            }
          } catch (err) {
            error(`Failed to store transaction ${transaction.transactionId}: ${err.message}`);
          }
        }

        if (blushTransactions.length > 0) {
          const dayRevenue = blushTransactions.reduce((sum, tx) =>
            sum + (tx.revenue?.netAmount > 0 ? tx.revenue.netAmount : 0), 0);
          success(`${dateStr}: ${blushTransactions.length} Blush txns, $${dayRevenue.toFixed(2)} revenue`);
        } else if (allTransactions.length > 0) {
          log(`${dateStr}: ${allTransactions.length} txns fetched, ${filteredOut} filtered out`, 'yellow');
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
    log(`Total Transactions Fetched: ${totalFetched}`, 'cyan');
    log(`Total Filtered Out: ${totalFilteredOut}`, 'yellow');
    log(`Total Transactions Stored: ${totalStored}`, 'cyan');
    log(`Total Paid Revenue: $${totalPaidRevenue.toFixed(2)}`, 'green');

    if (Object.keys(filteredDetails.byTitle).length > 0) {
      log(`\n--- Filtered Out By Title ---`, 'yellow');
      for (const [title, count] of Object.entries(filteredDetails.byTitle)) {
        log(`  "${title}": ${count} txns`, 'yellow');
      }
    }

    if (Object.keys(filteredDetails.byReason).length > 0) {
      log(`\n--- Filtered Out By Reason ---`, 'yellow');
      for (const [reason, count] of Object.entries(filteredDetails.byReason)) {
        log(`  ${reason}: ${count} txns`, 'yellow');
      }
    }

    if (failedDays.length > 0) {
      log(`Failed Days: ${failedDays.length}`, 'yellow');
      failedDays.forEach(day => {
        log(`  - ${day.date}: ${day.error}`, 'yellow');
      });
    }

    // Verification
    section('Step 6: Verification - New vs Renewal Breakdown');

    const janTx = await MarketingRevenue.find({
      transactionDate: { $gte: startDate, $lt: endDate }
    }).lean();

    let newSalesCount = 0;
    let newSalesGross = 0;
    let renewalCount = 0;
    let renewalGross = 0;
    let refundCount = 0;
    let refundTotal = 0;

    const byProductType = {};

    for (const tx of janTx) {
      const gross = tx.revenue?.grossAmount || 0;
      const isNew = tx.customer?.new === true;
      const productType = tx.metadata?.productType || 'unknown';
      const subscriptionType = tx.customer?.subscriptionType || 'unknown';
      const title = tx.metadata?.title || 'Unknown';

      const typeKey = `${productType}/${subscriptionType}`;
      if (!byProductType[typeKey]) byProductType[typeKey] = { count: 0, gross: 0, titles: new Set() };
      byProductType[typeKey].count++;
      byProductType[typeKey].gross += gross;
      byProductType[typeKey].titles.add(title);

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

    log(`\nExpected (App Store Connect): $381.00`, 'cyan');
    log(`Our NEW Sales: $${newSalesGross.toFixed(2)}`, newSalesGross > 350 ? 'green' : 'yellow');
    const difference = newSalesGross - 381;
    log(`Difference: $${difference.toFixed(2)}`, Math.abs(difference) < 50 ? 'green' : 'yellow');

    console.log('\n--- BY PRODUCT TYPE ---');
    for (const [type, data] of Object.entries(byProductType).sort((a, b) => b[1].gross - a[1].gross)) {
      const titles = Array.from(data.titles).join(', ');
      console.log(`${type}: ${data.count} txns, $${data.gross.toFixed(2)} (${titles})`);
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

runJanuaryBackfill().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
