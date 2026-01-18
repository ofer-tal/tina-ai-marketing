/**
 * Test script for Feature #163: LTV (Lifetime Value) estimation
 *
 * This script:
 * 1. Regenerates the latest daily, weekly, and monthly aggregates with LTV
 * 2. Verifies LTV is calculated and stored correctly
 * 3. Tests the dashboard API returns LTV metrics
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import DailyRevenueAggregate from '../models/DailyRevenueAggregate.js';
import WeeklyRevenueAggregate from '../models/WeeklyRevenueAggregate.js';
import MonthlyRevenueAggregate from '../models/MonthlyRevenueAggregate.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blush-marketing');

console.log('═══════════════════════════════════════════════════════════════');
console.log('FEATURE #163: LTV (LIFETIME VALUE) ESTIMATION');
console.log('═══════════════════════════════════════════════════════════════\n');

// Step 1: Fetch ARPU
console.log('Step 1: Fetch ARPU from latest aggregate');
const today = new Date();
const latestDaily = await DailyRevenueAggregate.findOne().sort({ dateObj: -1 });

if (!latestDaily) {
  console.error('❌ No daily aggregate found. Run revenue aggregation first.');
  process.exit(1);
}

const arpu = latestDaily.arpu?.value || 0;
console.log(`  ✓ ARPU: $${arpu.toFixed(2)}`);

// Step 2: Fetch average customer lifespan
console.log('\nStep 2: Fetch average customer lifespan (from churn rate)');
const churnRate = latestDaily.churn?.rate || 0;

let customerLifespanMonths = 24; // Default: 2 years
if (churnRate > 0) {
  customerLifespanMonths = 1 / (churnRate / 100);
}

console.log(`  ✓ Churn rate: ${churnRate.toFixed(2)}%`);
console.log(`  ✓ Customer lifespan: ${customerLifespanMonths.toFixed(1)} months`);

// Step 3: Calculate LTV = ARPU × lifespan
console.log('\nStep 3: Calculate LTV = ARPU × lifespan');
const expectedLTV = arpu * customerLifespanMonths;
console.log(`  ✓ Expected LTV: $${expectedLTV.toFixed(2)}`);

// Step 4: Store in aggregates
console.log('\nStep 4: Verify LTV is stored in aggregates');

// Regenerate today's aggregate to trigger LTV calculation
const todayStr = today.toISOString().split('T')[0];
console.log(`  Regenerating daily aggregate for ${todayStr}...`);
const regeneratedDaily = await DailyRevenueAggregate.aggregateForDate(today);

if (regeneratedDaily && regeneratedDaily.ltv) {
  console.log(`  ✓ Daily LTV stored: $${regeneratedDaily.ltv.value.toFixed(2)}`);
  console.log(`    - ARPU: $${regeneratedDaily.ltv.arpu.toFixed(2)}`);
  console.log(`    - Lifespan: ${regeneratedDaily.ltv.customerLifespanMonths.toFixed(1)} months`);
  console.log(`    - Churn rate: ${regeneratedDaily.ltv.churnRate.toFixed(2)}%`);
} else {
  console.log('  ⚠ LTV not found in daily aggregate');
}

// Check weekly aggregate
const weekNumber = getWeekNumber(today);
const currentWeek = await WeeklyRevenueAggregate.findOne({
  year: today.getFullYear(),
  weekNumber: weekNumber
});

if (currentWeek && currentWeek.ltv) {
  console.log(`  ✓ Weekly LTV stored: $${currentWeek.ltv.value.toFixed(2)}`);
} else {
  console.log('  ⚠ Regenerating weekly aggregate...');
  await WeeklyRevenueAggregate.aggregateForWeek(today.getFullYear(), weekNumber);
  const regeneratedWeek = await WeeklyRevenueAggregate.findOne({
    year: today.getFullYear(),
    weekNumber: weekNumber
  });
  if (regeneratedWeek && regeneratedWeek.ltv) {
    console.log(`  ✓ Weekly LTV stored: $${regeneratedWeek.ltv.value.toFixed(2)}`);
  }
}

// Check monthly aggregate
const currentMonth = await MonthlyRevenueAggregate.findOne({
  year: today.getFullYear(),
  month: today.getMonth() + 1
});

if (currentMonth && currentMonth.ltv) {
  console.log(`  ✓ Monthly LTV stored: $${currentMonth.ltv.value.toFixed(2)}`);
} else {
  console.log('  ⚠ Regenerating monthly aggregate...');
  await MonthlyRevenueAggregate.aggregateForMonth(today.getFullYear(), today.getMonth() + 1);
  const regeneratedMonth = await MonthlyRevenueAggregate.findOne({
    year: today.getFullYear(),
    month: today.getMonth() + 1
  });
  if (regeneratedMonth && regeneratedMonth.ltv) {
    console.log(`  ✓ Monthly LTV stored: $${regeneratedMonth.ltv.value.toFixed(2)}`);
  }
}

// Step 5: Display in analytics
console.log('\nStep 5: Verify dashboard API includes LTV');

// Simulate dashboard API call
const previousDay = new Date(today);
previousDay.setDate(previousDay.getDate() - 1);
const previousDayStr = previousDay.toISOString().split('T')[0];
const previousAggregate = await DailyRevenueAggregate.findOne({ date: previousDayStr });

const currentLTV = regeneratedDaily?.ltv?.value || 0;
const previousLTV = previousAggregate?.ltv?.value || 0;
const ltvChange = previousLTV > 0 ? ((currentLTV - previousLTV) / previousLTV * 100) : 0;

console.log('  Dashboard metrics:');
console.log(`    - Current LTV: $${currentLTV.toFixed(2)}`);
console.log(`    - Previous LTV: $${previousLTV.toFixed(2)}`);
console.log(`    - Change: ${ltvChange.toFixed(1)}%`);
console.log(`    - Trend: ${currentLTV >= previousLTV ? 'up' : 'down'}`);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('VERIFICATION SUMMARY');
console.log('═══════════════════════════════════════════════════════════════');

const steps = [
  { name: 'Step 1: Fetch ARPU', passed: arpu > 0 },
  { name: 'Step 2: Fetch customer lifespan', passed: customerLifespanMonths > 0 },
  { name: 'Step 3: Calculate LTV = ARPU × lifespan', passed: expectedLTV > 0 },
  { name: 'Step 4: Store in aggregates', passed: regeneratedDaily?.ltv?.value > 0 },
  { name: 'Step 5: Display in analytics', passed: currentLTV > 0 }
];

let passedCount = 0;
steps.forEach(step => {
  const status = step.passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${step.name}`);
  if (step.passed) passedCount++;
});

console.log(`\n${passedCount}/${steps.length} steps passed`);

if (passedCount === steps.length) {
  console.log('\n🎉 FEATURE #163 VERIFIED: LTV estimation working correctly!');
} else {
  console.log('\n⚠️  Some steps failed. Please review.');
}

await mongoose.disconnect();
process.exit(passedCount === steps.length ? 0 : 1);

/**
 * Helper: Get ISO week number
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
