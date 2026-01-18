/**
 * Manual test for Feature #166: Financial Projections
 *
 * This script demonstrates the expected API responses for the financial projections endpoints.
 * Run after restarting the backend server to verify the implementation.
 *
 * SERVER RESTART REQUIRED:
 *   node backend/server.js
 *   or
 *   npm run dev:backend
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001';

console.log('═══════════════════════════════════════════════════════════════');
console.log('MANUAL TEST: Financial Projections Endpoints');
console.log('═══════════════════════════════════════════════════════════════\n');

async function testProjectionsEndpoint() {
  console.log('📊 TEST 1: GET /api/dashboard/projections');
  console.log('─────────────────────────────────────────────────────────────\n');

  try {
    const response = await fetch(`${API_BASE}/api/dashboard/projections?period=90d&horizon=6`);
    const data = await response.json();

    if (response.ok && data.success) {
      console.log('✅ Endpoint responding successfully');
      console.log('\nResponse structure:');
      console.log(`  - Historical period: ${data.analysis.historical.period}`);
      console.log(`  - Data points: ${data.analysis.historical.dataPoints}`);
      console.log(`  - Trend direction: ${data.analysis.historical.statistics.trendDirection}`);
      console.log(`  - Growth rate: ${data.analysis.historical.statistics.avgDailyGrowthRate.toFixed(4)}% daily`);

      const { projections } = data.analysis;
      console.log('\nProjections summary:');
      console.log(`  - Horizon: ${projections.horizon} months`);
      console.log(`  - Model: ${projections.model}`);
      console.log(`  - Total projected: $${projections.summary.totalProjected.toFixed(2)}`);
      console.log(`  - Average monthly: $${projections.summary.averageMonthly.toFixed(2)}`);
      console.log(`  - Final month: $${projections.summary.finalMonthRevenue.toFixed(2)}`);
      console.log(`  - Growth rate: ${projections.summary.growthRate.toFixed(2)}% monthly`);

      console.log('\nScenario analysis:');
      console.log(`  - Optimistic (95th): $${projections.scenarios.optimistic.total.toFixed(2)}`);
      console.log(`  - Base case: $${projections.scenarios.base.total.toFixed(2)}`);
      console.log(`  - Pessimistic (5th): $${projections.scenarios.pessimistic.total.toFixed(2)}`);

      console.log('\nMonthly projections:');
      projections.monthlyProjections.forEach((month, i) => {
        console.log(`  ${i + 1}. ${month.month}: $${month.projectedRevenue.toFixed(2)} ($${month.lowerBound.toFixed(2)} - $${month.upperBound.toFixed(2)})`);
      });

      console.log('\n✅ TEST 1 PASSED');
      return true;
    } else {
      console.log('❌ Endpoint returned error:', data.error || data.message);
      console.log('\n⚠️  POSSIBLE CAUSE: Server needs to be restarted');
      console.log('   Run: node backend/server.js');
      return false;
    }
  } catch (error) {
    console.log('❌ TEST 1 FAILED:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  Server not running on port 3001');
      console.log('   Start the server with: node backend/server.js');
    }
    return false;
  }
}

async function testStrategicDashboardEndpoint() {
  console.log('\n\n📈 TEST 2: GET /api/dashboard/strategic/financial-projections');
  console.log('─────────────────────────────────────────────────────────────\n');

  try {
    const response = await fetch(`${API_BASE}/api/dashboard/strategic/financial-projections?horizon=6`);
    const data = await response.json();

    if (response.ok && data.success) {
      console.log('✅ Strategic dashboard endpoint responding successfully');
      console.log('\nChart data points:', data.projections.chartData.length);
      console.log('\nSummary cards:');
      data.projections.summaryCards.forEach(card => {
        console.log(`  - ${card.title}: ${card.value} ${card.change ? `(${card.change})` : ''}`);
      });

      console.log('\n✅ TEST 2 PASSED');
      return true;
    } else {
      console.log('❌ Endpoint returned error:', data.error || data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ TEST 2 FAILED:', error.message);
    return false;
  }
}

async function runTests() {
  const test1 = await testProjectionsEndpoint();
  const test2 = await testStrategicDashboardEndpoint();

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\nTest 1 (Projections API): ${test1 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Test 2 (Strategic Dashboard): ${test2 ? '✅ PASSED' : '❌ FAILED'}`);

  if (test1 && test2) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('\nFeature #166 is complete and working correctly.');
    process.exit(0);
  } else {
    console.log('\n⚠️  SOME TESTS FAILED');
    console.log('\nMost likely cause: Server needs to be restarted');
    console.log('Run: node backend/server.js');
    console.log('Then run this test again');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('\n❌ TEST SUITE FAILED:', error.message);
  process.exit(1);
});
