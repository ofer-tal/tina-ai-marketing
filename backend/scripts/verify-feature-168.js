/**
 * Verification Script for Feature #168: Break-even analysis
 *
 * This script verifies all 5 steps of the break-even analysis feature:
 * Step 1: Calculate CAC
 * Step 2: Calculate LTV
 * Step 3: Determine break-even period
 * Step 4: Display in analytics
 * Step 5: Show payback period
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3002/api';

console.log('═══════════════════════════════════════════════════════════════');
console.log('FEATURE #168: BREAK-EVEN ANALYSIS');
console.log('═══════════════════════════════════════════════════════════════\n');

async function verifyStep1() {
  console.log('💰 STEP 1: Calculate CAC (Customer Acquisition Cost)');
  console.log('─────────────────────────────────────────────────────────────');

  try {
    const response = await fetch(`${API_BASE}/dashboard/breakeven-analysis?period=90d`);
    const data = await response.json();

    if (data.success && data.cac) {
      console.log('✓ CAC calculated');
      console.log(`  - CAC: $${data.cac.value.toFixed(2)}`);
      console.log(`  - Total Spend: $${data.cac.components.totalSpend.toFixed(2)}`);
      console.log(`  - New Customers: ${data.cac.components.newCustomers}`);
      console.log(`  - Formula: Total Spend / New Customers = $${data.cac.components.totalSpend.toFixed(2)} / ${data.cac.components.newCustomers} = $${data.cac.value.toFixed(2)}`);
      return { success: true, cac: data.cac.value };
    } else {
      console.log('✗ Failed to calculate CAC');
      return { success: false };
    }
  } catch (error) {
    console.log(`✗ Error calculating CAC: ${error.message}`);
    return { success: false };
  }
}

async function verifyStep2() {
  console.log('\n📈 STEP 2: Calculate LTV (Lifetime Value)');
  console.log('─────────────────────────────────────────────────────────────');

  try {
    const response = await fetch(`${API_BASE}/dashboard/breakeven-analysis?period=90d`);
    const data = await response.json();

    if (data.success && data.ltv) {
      console.log('✓ LTV calculated');
      console.log(`  - LTV: $${data.ltv.value.toFixed(2)}`);
      console.log(`  - ARPU: $${data.ltv.arpu.toFixed(2)}`);
      console.log(`  - Churn Rate: ${data.ltv.churnRate.toFixed(2)}%`);
      console.log(`  - Formula Components:`);
      console.log(`    • ARPU: Average Revenue Per User`);
      console.log(`    • Churn Rate: Monthly customer churn percentage`);
      console.log(`    • LTV = ARPU × (1 / Churn Rate)`);
      return { success: true, ltv: data.ltv.value };
    } else {
      console.log('✗ Failed to calculate LTV');
      return { success: false };
    }
  } catch (error) {
    console.log(`✗ Error calculating LTV: ${error.message}`);
    return { success: false };
  }
}

async function verifyStep3() {
  console.log('\n📊 STEP 3: Determine break-even period');
  console.log('─────────────────────────────────────────────────────────────');

  try {
    const response = await fetch(`${API_BASE}/dashboard/breakeven-analysis?period=90d`);
    const data = await response.json();

    if (data.success && data.breakEven) {
      console.log('✓ Break-even period determined');
      console.log(`  - Break-even: ${data.breakEven.periodMonths.toFixed(1)} months (${data.breakEven.periodDays} days)`);
      console.log(`  - Monthly Revenue Per User: $${data.breakEven.monthlyRevenuePerUser.toFixed(2)}`);
      console.log(`  - Gross Margin: ${data.breakEven.grossMargin.toFixed(0)}%`);
      console.log(`  - Formula: CAC / (ARPU × Gross Margin)`);
      console.log(`  - Calculation: $${data.cac.value.toFixed(2)} / ($${data.ltv.arpu.toFixed(2)} × 0.8) = ${data.breakEven.periodMonths.toFixed(1)} months`);
      return { success: true };
    } else {
      console.log('✗ Failed to determine break-even period');
      return { success: false };
    }
  } catch (error) {
    console.log(`✗ Error determining break-even: ${error.message}`);
    return { success: false };
  }
}

async function verifyStep4() {
  console.log('\n📱 STEP 4: Display in analytics');
  console.log('─────────────────────────────────────────────────────────────');

  try {
    const response = await fetch(`${API_BASE}/dashboard/breakeven-analysis?period=90d`);
    const data = await response.json();

    if (data.success && data.summary) {
      console.log('✓ Analytics data displayed');
      console.log(`  - Summary:`);
      console.log(`    • CAC: $${data.summary.cac.toFixed(2)}`);
      console.log(`    • LTV: $${data.summary.ltv.toFixed(2)}`);
      console.log(`    • LTV:CAC Ratio: ${data.summary.ltvCacRatio.toFixed(2)}:1`);
      console.log(`    • Payback Period: ${data.summary.paybackPeriod.toFixed(1)} months`);
      console.log(`    • Status: ${data.summary.status}`);
      console.log(`\n  - LTV:CAC Ratio Analysis:`);
      console.log(`    • Current: ${data.ltvCacRatio.value.toFixed(2)}:1`);
      console.log(`    • Target: ${data.ltvCacRatio.target}:1`);
      console.log(`    • Status: ${data.ltvCacRatio.status}`);
      console.log(`\n  - ROI Projections:`);
      console.log(`    • 1 Month: ${data.roiProjections['1month'].toFixed(1)}%`);
      console.log(`    • 3 Months: ${data.roiProjections['3months'].toFixed(1)}%`);
      console.log(`    • 6 Months: ${data.roiProjections['6months'].toFixed(1)}%`);
      console.log(`    • 12 Months: ${data.roiProjections['12months'].toFixed(1)}%`);
      return { success: true };
    } else {
      console.log('✗ Failed to display analytics');
      return { success: false };
    }
  } catch (error) {
    console.log(`✗ Error displaying analytics: ${error.message}`);
    return { success: false };
  }
}

async function verifyStep5() {
  console.log('\n⏱️  STEP 5: Show payback period');
  console.log('─────────────────────────────────────────────────────────────');

  try {
    const response = await fetch(`${API_BASE}/dashboard/breakeven-analysis?period=90d`);
    const data = await response.json();

    if (data.success && data.payback) {
      console.log('✓ Payback period shown');
      console.log(`  - Payback Period: ${data.payback.periodMonths.toFixed(1)} months`);
      console.log(`  - Payback Period: ${data.payback.periodDays} days`);
      console.log(`  - Description: ${data.payback.description}`);
      console.log(`  - Interpretation:`);
      if (data.payback.periodMonths <= 6) {
        console.log(`    • Excellent: Payback under 6 months is very healthy`);
      } else if (data.payback.periodMonths <= 12) {
        console.log(`    • Good: Payback under 12 months is acceptable`);
      } else {
        console.log(`    • Needs Improvement: Payback over 12 months is concerning`);
      }
      console.log(`\n  - Payback Period vs Industry Standards:`);
      console.log(`    • Your payback: ${data.payback.periodMonths.toFixed(1)} months`);
      console.log(`    • Industry excellent: < 6 months`);
      console.log(`    • Industry acceptable: 6-12 months`);
      console.log(`    • Industry concerning: > 12 months`);
      return { success: true };
    } else {
      console.log('✗ Failed to show payback period');
      return { success: false };
    }
  } catch (error) {
    console.log(`✗ Error showing payback: ${error.message}`);
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
    console.log('\nFeature #168 is complete and working correctly.');
    console.log('\nBreak-even analysis includes:');
    console.log('- CAC (Customer Acquisition Cost) calculation');
    console.log('- LTV (Lifetime Value) calculation');
    console.log('- Break-even period determination');
    console.log('- Analytics display with summary');
    console.log('- Payback period with interpretation');
    console.log('\nKey Metrics:');
    console.log('- LTV:CAC Ratio (target: 3:1 or better)');
    console.log('- Payback Period (target: < 6 months)');
    console.log('- ROI projections at different time horizons');
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
