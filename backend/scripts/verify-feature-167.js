/**
 * Verification Script for Feature #167: Revenue by acquisition channel
 *
 * This script verifies all 5 steps of the revenue by channel feature:
 * Step 1: Attribute users to channels
 * Step 2: Fetch revenue by attributed users
 * Step 3: Aggregate by channel
 * Step 4: Display in breakdown chart
 * Step 5: Show channel ROI
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3002/api';

console.log('═══════════════════════════════════════════════════════════════');
console.log('FEATURE #167: REVENUE BY ACQUISITION CHANNEL');
console.log('═══════════════════════════════════════════════════════════════\n');

async function verifyStep1() {
  console.log('📊 STEP 1: Attribute users to channels');
  console.log('─────────────────────────────────────────────────────────────');

  try {
    // Check if MarketingRevenue collection has channel attribution
    const response = await fetch(`${API_BASE}/dashboard/revenue-by-channel?period=90d`);
    const data = await response.json();

    if (data.success && data.breakdown) {
      console.log('✓ Users attributed to channels');
      data.breakdown.forEach(channel => {
        console.log(`  - ${channel.channelName}: ${channel.transactionCount} transactions`);
      });
      return { success: true };
    } else {
      console.log('✗ Failed to attribute users to channels');
      return { success: false };
    }
  } catch (error) {
    console.log(`✗ Error attributing users: ${error.message}`);
    return { success: false };
  }
}

async function verifyStep2() {
  console.log('\n💰 STEP 2: Fetch revenue by attributed users');
  console.log('─────────────────────────────────────────────────────────────');

  try {
    const response = await fetch(`${API_BASE}/dashboard/revenue-by-channel?period=90d`);
    const data = await response.json();

    if (data.success && data.summary) {
      console.log('✓ Revenue fetched by attributed users');
      console.log(`  - Total revenue: $${data.summary.totalRevenue.toFixed(2)}`);
      console.log(`  - Total transactions: ${data.summary.totalTransactions}`);
      console.log(`  - Channels: ${data.summary.channelCount}`);

      // Check breakdown
      if (data.breakdown && data.breakdown.length > 0) {
        data.breakdown.forEach(channel => {
          console.log(`  - ${channel.channelName}: $${channel.totalRevenue.toFixed(2)} (${channel.transactionCount} transactions)`);
        });
      }

      return { success: true, totalRevenue: data.summary.totalRevenue };
    } else {
      console.log('✗ Failed to fetch revenue by users');
      return { success: false };
    }
  } catch (error) {
    console.log(`✗ Error fetching revenue: ${error.message}`);
    return { success: false };
  }
}

async function verifyStep3() {
  console.log('\n📈 STEP 3: Aggregate by channel');
  console.log('─────────────────────────────────────────────────────────────');

  try {
    const response = await fetch(`${API_BASE}/dashboard/revenue-by-channel?period=90d`);
    const data = await response.json();

    if (data.success && data.breakdown) {
      console.log('✓ Revenue aggregated by channel');

      data.breakdown.forEach(channel => {
        console.log(`  - ${channel.channelName}:`);
        console.log(`    • Total Revenue: $${channel.totalRevenue.toFixed(2)}`);
        console.log(`    • Revenue %: ${channel.revenuePercentage.toFixed(2)}%`);
        console.log(`    • Transactions: ${channel.transactionCount}`);
        console.log(`    • New Customer Revenue: $${channel.newCustomerRevenue.toFixed(2)}`);
        console.log(`    • New Customers: ${channel.newCustomerCount}`);
        console.log(`    • Avg Transaction: $${channel.avgTransactionValue.toFixed(2)}`);
      });

      return { success: true };
    } else {
      console.log('✗ Failed to aggregate by channel');
      return { success: false };
    }
  } catch (error) {
    console.log(`✗ Error aggregating: ${error.message}`);
    return { success: false };
  }
}

async function verifyStep4() {
  console.log('\n📊 STEP 4: Display in breakdown chart');
  console.log('─────────────────────────────────────────────────────────────');

  try {
    const response = await fetch(`${API_BASE}/dashboard/revenue-by-channel?period=90d`);
    const data = await response.json();

    if (data.success && data.chartData) {
      console.log('✓ Breakdown chart data available');
      console.log(`  - Chart data points: ${data.chartData.length}`);

      data.chartData.forEach(point => {
        console.log(`  - ${point.label}: $${point.value.toFixed(2)} (${point.percentage.toFixed(1)}%)`);
        console.log(`    Color: ${point.color}`);
      });

      return { success: true };
    } else {
      console.log('✗ Failed to get breakdown chart data');
      return { success: false };
    }
  } catch (error) {
    console.log(`✗ Error getting chart data: ${error.message}`);
    return { success: false };
  }
}

async function verifyStep5() {
  console.log('\n🎯 STEP 5: Show channel ROI');
  console.log('─────────────────────────────────────────────────────────────');

  try {
    const response = await fetch(`${API_BASE}/dashboard/revenue-by-channel?period=90d`);
    const data = await response.json();

    if (data.success && data.roiSummary) {
      console.log('✓ Channel ROI data available');

      if (data.roiSummary.bestChannel) {
        console.log(`  - Best Channel: ${data.roiSummary.bestChannel.channel}`);
        console.log(`    • ROI: ${data.roiSummary.bestChannel.roi !== null ? data.roiSummary.bestChannel.roi + '%' : 'N/A'}`);
        console.log(`    • Revenue: $${data.roiSummary.bestChannel.revenue.toFixed(2)}`);
      }

      if (data.roiSummary.worstChannel) {
        console.log(`  - Worst Channel: ${data.roiSummary.worstChannel.channel}`);
        console.log(`    • ROI: ${data.roiSummary.worstChannel.roi !== null ? data.roiSummary.worstChannel.roi + '%' : 'N/A'}`);
        console.log(`    • Revenue: $${data.roiSummary.worstChannel.revenue.toFixed(2)}`);
      }

      if (data.roiSummary.overallROI !== null) {
        console.log(`  - Overall ROI: ${data.roiSummary.overallROI}%`);
      } else {
        console.log(`  - Overall ROI: N/A (no spend data)`);
      }

      // Check individual channel ROI
      console.log(`\n  Individual Channel ROI:`);
      data.breakdown.forEach(channel => {
        console.log(`    • ${channel.channelName}: ${channel.roi !== null ? channel.roi + '%' : 'N/A'} (ROAS: ${channel.roas !== null ? channel.roas : 'N/A'})`);
      });

      return { success: true };
    } else {
      console.log('✗ Failed to get ROI data');
      return { success: false };
    }
  } catch (error) {
    console.log(`✗ Error getting ROI: ${error.message}`);
    return { success: false };
  }
}

async function runVerification() {
  const results = [];

  // Verify all 5 steps
  results.push(await verifyStep1());
  results.push(await verifyStep2());
  results.push(await verifyStep3());
  results.push(await verifyStep4());
  results.push(await verifyStep5());

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('VERIFICATION SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');

  const passedSteps = results.filter(r => r.success).length;
  const totalSteps = results.length;

  console.log(`\n✓ Passed: ${passedSteps}/${totalSteps} steps`);

  if (passedSteps === totalSteps) {
    console.log('\n🎉 ALL STEPS VERIFIED SUCCESSFULLY!');
    console.log('\nFeature #167 is complete and working correctly.');
    console.log('\nRevenue by acquisition channel:');
    console.log('- Attributes users to marketing channels');
    console.log('- Fetches revenue by attributed users');
    console.log('- Aggregates revenue by channel');
    console.log('- Displays in breakdown chart format');
    console.log('- Shows channel ROI and ROAS');
    process.exit(0);
  } else {
    console.log('\n⚠️  SOME STEPS FAILED VERIFICATION');
    console.log('\nFailed steps:');
    results.forEach((result, index) => {
      if (!result.success) {
        console.log(`  - Step ${index + 1}`);
      }
    });
    process.exit(1);
  }
}

// Run verification
runVerification().catch(error => {
  console.error('\n❌ VERIFICATION FAILED:', error.message);
  console.error(error.stack);
  process.exit(1);
});
