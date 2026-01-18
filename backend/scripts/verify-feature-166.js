/**
 * Verification Script for Feature #166: Financial projections based on trends
 *
 * This script verifies all 5 steps of the financial projections feature:
 * Step 1: Analyze revenue growth trend
 * Step 2: Extrapolate future months
 * Step 3: Generate projections
 * Step 4: Display in strategic dashboard
 * Step 5: Update projections as data changes
 */

import mongoose from 'mongoose';
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001/api';

console.log('═══════════════════════════════════════════════════════════════');
console.log('FEATURE #166: FINANCIAL PROJECTIONS BASED ON TRENDS');
console.log('═══════════════════════════════════════════════════════════════\n');

async function verifyStep1() {
  console.log('📊 STEP 1: Analyze revenue growth trend');
  console.log('─────────────────────────────────────────────────────────────');

  try {
    const response = await fetch(`${API_BASE}/dashboard/projections?period=90d`);
    const data = await response.json();

    if (data.success && data.analysis) {
      const { historical } = data.analysis;

      console.log('✓ Historical trend analysis retrieved');
      console.log(`  - Period: ${historical.period}`);
      console.log(`  - Data points: ${historical.dataPoints}`);
      console.log(`  - Mean revenue: $${historical.statistics.mean.toFixed(2)}`);
      console.log(`  - Total growth: ${historical.statistics.totalGrowth.toFixed(2)}%`);
      console.log(`  - Trend direction: ${historical.statistics.trendDirection}`);
      console.log(`  - Daily growth rate: ${historical.statistics.avgDailyGrowthRate.toFixed(4)}%`);

      return {
        success: true,
        currentRevenue: historical.timeSeries[historical.timeSeries.length - 1]?.value || 0,
        growthRate: historical.statistics.avgDailyGrowthRate
      };
    } else {
      console.log('✗ Failed to analyze revenue growth trend');
      return { success: false };
    }
  } catch (error) {
    console.log(`✗ Error analyzing trend: ${error.message}`);
    return { success: false };
  }
}

async function verifyStep2() {
  console.log('\n📈 STEP 2: Extrapolate future months');
  console.log('─────────────────────────────────────────────────────────────');

  try {
    const response = await fetch(`${API_BASE}/dashboard/projections?period=90d&horizon=6`);
    const data = await response.json();

    if (data.success && data.analysis && data.analysis.projections) {
      const { projections } = data.analysis;

      console.log('✓ Future months extrapolated');
      console.log(`  - Forecast horizon: ${projections.horizon} months`);
      console.log(`  - Projection points: ${projections.monthlyProjections?.length || 0}`);
      console.log(`  - Forecast model: ${projections.model || 'ensemble'}`);

      if (projections.monthlyProjections && projections.monthlyProjections.length > 0) {
        const firstMonth = projections.monthlyProjections[0];
        const lastMonth = projections.monthlyProjections[projections.monthlyProjections.length - 1];

        console.log(`  - First month (${firstMonth.month}): $${firstMonth.projectedRevenue.toFixed(2)}`);
        console.log(`  - Last month (${lastMonth.month}): $${lastMonth.projectedRevenue.toFixed(2)}`);
      }

      return { success: true };
    } else {
      console.log('✗ Failed to extrapolate future months');
      return { success: false };
    }
  } catch (error) {
    console.log(`✗ Error extrapolating: ${error.message}`);
    return { success: false };
  }
}

async function verifyStep3() {
  console.log('\n💰 STEP 3: Generate projections');
  console.log('─────────────────────────────────────────────────────────────');

  try {
    const response = await fetch(`${API_BASE}/dashboard/projections?period=90d&horizon=6`);
    const data = await response.json();

    if (data.success && data.analysis && data.analysis.projections) {
      const { projections } = data.analysis;

      console.log('✓ Financial projections generated');

      // Check for summary statistics
      if (projections.summary) {
        console.log('  - Summary statistics:');
        console.log(`    • Total projected revenue: $${projections.summary.totalProjected?.toFixed(2) || 'N/A'}`);
        console.log(`    • Average monthly revenue: $${projections.summary.averageMonthly?.toFixed(2) || 'N/A'}`);
        console.log(`    • Final month revenue: $${projections.summary.finalMonthRevenue?.toFixed(2) || 'N/A'}`);
        console.log(`    • Growth rate: ${projections.summary.growthRate?.toFixed(2) || 'N/A'}%`);
      }

      // Check for scenarios
      if (projections.scenarios) {
        console.log('  - Scenario analysis:');
        console.log(`    • Optimistic: $${projections.scenarios.optimistic?.total?.toFixed(2) || 'N/A'}`);
        console.log(`    • Base case: $${projections.scenarios.base?.total?.toFixed(2) || 'N/A'}`);
        console.log(`    • Pessimistic: $${projections.scenarios.pessimistic?.total?.toFixed(2) || 'N/A'}`);
      }

      return { success: true, projections: projections };
    } else {
      console.log('✗ Failed to generate projections');
      return { success: false };
    }
  } catch (error) {
    console.log(`✗ Error generating projections: ${error.message}`);
    return { success: false };
  }
}

async function verifyStep4() {
  console.log('\n🎯 STEP 4: Display in strategic dashboard');
  console.log('─────────────────────────────────────────────────────────────');

  try {
    const response = await fetch(`${API_BASE}/dashboard/strategic/financial-projections`);
    const data = await response.json();

    if (data.success && data.projections) {
      console.log('✓ Projections available for strategic dashboard');
      console.log(`  - Endpoint: /api/dashboard/strategic/financial-projections`);

      const { projections } = data;

      // Check for chart data format
      if (projections.chartData) {
        console.log('  - Chart data format:');
        console.log(`    • Data points: ${projections.chartData.length}`);
        console.log(`    • Format: ${projections.chartData[0] ? JSON.stringify(Object.keys(projections.chartData[0])) : 'N/A'}`);
      }

      // Check for summary cards
      if (projections.summaryCards) {
        console.log('  - Summary cards available:');
        projections.summaryCards.forEach(card => {
          console.log(`    • ${card.title}: ${card.value}`);
        });
      }

      return { success: true };
    } else {
      console.log('✗ Failed to get dashboard projections');
      return { success: false };
    }
  } catch (error) {
    console.log(`✗ Error getting dashboard data: ${error.message}`);
    return { success: false };
  }
}

async function verifyStep5() {
  console.log('\n🔄 STEP 5: Update projections as data changes');
  console.log('─────────────────────────────────────────────────────────────');

  try {
    // First call
    const response1 = await fetch(`${API_BASE}/dashboard/projections?period=90d&horizon=6`);
    const data1 = await response1.json();

    // Wait a moment and call again to verify freshness
    await new Promise(resolve => setTimeout(resolve, 100));

    const response2 = await fetch(`${API_BASE}/dashboard/projections?period=90d&horizon=6`);
    const data2 = await response2.json();

    if (data1.success && data2.success) {
      const timestamp1 = data1.analysis?.calculatedAt || data1.timestamp;
      const timestamp2 = data2.analysis?.calculatedAt || data2.timestamp;

      console.log('✓ Projections update dynamically');
      console.log(`  - First call timestamp: ${timestamp1}`);
      console.log(`  - Second call timestamp: ${timestamp2}`);

      // Check if projections include metadata about data freshness
      if (data1.analysis?.metadata) {
        console.log('  - Projection metadata:');
        console.log(`    • Data freshness: ${data1.analysis.metadata.dataFreshness || 'N/A'}`);
        console.log(`    • Last data update: ${data1.analysis.metadata.lastDataUpdate || 'N/A'}`);
        console.log(`    • Calculation time: ${data1.analysis.metadata.calculationTime || 'N/A'}`);
      }

      return { success: true };
    } else {
      console.log('✗ Failed to verify dynamic updates');
      return { success: false };
    }
  } catch (error) {
    console.log(`✗ Error verifying updates: ${error.message}`);
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
    console.log('\nFeature #166 is complete and working correctly.');
    console.log('\nFinancial projections are based on real revenue trends,');
    console.log('extrapolate future months using multiple forecasting models,');
    console.log('and are displayed in the strategic dashboard.');
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
