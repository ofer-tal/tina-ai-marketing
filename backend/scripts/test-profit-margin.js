/**
 * Test script for Feature #165: Profit margin calculation
 *
 * This script:
 * 1. Regenerates the latest daily, weekly, and monthly aggregates with profit margin
 * 2. Verifies profit margin is calculated and stored correctly
 * 3. Tests the dashboard API returns profit margin metrics
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import DailyRevenueAggregate from '../models/DailyRevenueAggregate.js';
import WeeklyRevenueAggregate from '../models/WeeklyRevenueAggregate.js';
import MonthlyRevenueAggregate from '../models/MonthlyRevenueAggregate.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/adultstoriescluster');

console.log('═══════════════════════════════════════════════════════════════');
console.log('FEATURE #165: PROFIT MARGIN CALCULATION');
console.log('═══════════════════════════════════════════════════════════════\n');

// Step 1: Fetch net revenue
console.log('Step 1: Fetch net revenue from latest aggregate');
const today = new Date();
const latestDaily = await DailyRevenueAggregate.findOne().sort({ date: -1 });

if (!latestDaily) {
  console.error('❌ No daily aggregate found. Run revenue aggregation first.');
  process.exit(1);
}

const netRevenue = latestDaily.revenue?.netRevenue || 0;
console.log(`  ✓ Net revenue: $${netRevenue.toFixed(2)}`);

// Step 2: Subtract marketing costs
console.log('\nStep 2: Fetch marketing costs');
const totalCosts = latestDaily.costs?.totalCost || 0;
const cloudServices = latestDaily.costs?.cloudServices || 0;
const apiServices = latestDaily.costs?.apiServices || 0;
console.log(`  ✓ Total costs: $${totalCosts.toFixed(2)}`);
console.log(`    - Cloud services: $${cloudServices.toFixed(2)}`);
console.log(`    - API services: $${apiServices.toFixed(2)}`);

// Step 3: Subtract other operational costs
console.log('\nStep 3: Other operational costs');
const otherCosts = latestDaily.costs?.other || 0;
console.log(`  ✓ Other costs: $${otherCosts.toFixed(2)}`);

// Step 4: Calculate profit margin
console.log('\nStep 4: Calculate profit margin');
const expectedProfitMargin = netRevenue - totalCosts - otherCosts;
const expectedProfitMarginPercentage = netRevenue > 0 ? (expectedProfitMargin / netRevenue) * 100 : 0;
console.log(`  ✓ Expected profit margin: $${expectedProfitMargin.toFixed(2)} (${expectedProfitMarginPercentage.toFixed(1)}%)`);

// Step 5: Display in dashboard
console.log('\nStep 5: Verify profit margin is stored in aggregates');

// Regenerate today's aggregate to trigger profit margin calculation
const todayStr = today.toISOString().split('T')[0];
console.log(`  Regenerating daily aggregate for ${todayStr}...`);
const regeneratedDaily = await DailyRevenueAggregate.aggregateForDate(today);

if (regeneratedDaily && regeneratedDaily.profitMargin) {
  console.log(`  ✓ Daily profit margin stored:`);
  console.log(`    - Value: $${regeneratedDaily.profitMargin.value.toFixed(2)}`);
  console.log(`    - Percentage: ${regeneratedDaily.profitMargin.percentage.toFixed(1)}%`);
  console.log(`    - Net revenue: $${regeneratedDaily.profitMargin.netRevenue.toFixed(2)}`);
  console.log(`    - Total costs: $${regeneratedDaily.profitMargin.totalCosts.toFixed(2)}`);

  // Verify calculation
  if (Math.abs(regeneratedDaily.profitMargin.value - expectedProfitMargin) < 0.01) {
    console.log(`  ✅ Calculation is correct!`);
  } else {
    console.log(`  ❌ Calculation mismatch: expected $${expectedProfitMargin.toFixed(2)}, got $${regeneratedDaily.profitMargin.value.toFixed(2)}`);
  }
} else {
  console.log('  ❌ Profit margin not found in daily aggregate');
}

// Check weekly aggregate
const weekNumber = getWeekNumber(today);
const currentWeek = await WeeklyRevenueAggregate.findOne({
  year: today.getFullYear(),
  weekNumber: weekNumber
});

if (currentWeek && currentWeek.profitMargin) {
  console.log(`  ✓ Weekly profit margin: $${currentWeek.profitMargin.value.toFixed(2)} (${currentWeek.profitMargin.percentage.toFixed(1)}%)`);
} else {
  console.log('  ⚠ Regenerating weekly aggregate...');
  await WeeklyRevenueAggregate.aggregateForWeek(today.getFullYear(), weekNumber);
  const regeneratedWeek = await WeeklyRevenueAggregate.findOne({
    year: today.getFullYear(),
    weekNumber: weekNumber
  });
  if (regeneratedWeek && regeneratedWeek.profitMargin) {
    console.log(`  ✓ Weekly profit margin: $${regeneratedWeek.profitMargin.value.toFixed(2)} (${regeneratedWeek.profitMargin.percentage.toFixed(1)}%)`);
  }
}

// Check monthly aggregate
const currentMonth = await MonthlyRevenueAggregate.findOne({
  year: today.getFullYear(),
  month: today.getMonth() + 1
});

if (currentMonth && currentMonth.profitMargin) {
  console.log(`  ✓ Monthly profit margin: $${currentMonth.profitMargin.value.toFixed(2)} (${currentMonth.profitMargin.percentage.toFixed(1)}%)`);
} else {
  console.log('  ⚠ Regenerating monthly aggregate...');
  await MonthlyRevenueAggregate.aggregateForMonth(today.getFullYear(), today.getMonth() + 1);
  const regeneratedMonth = await MonthlyRevenueAggregate.findOne({
    year: today.getFullYear(),
    month: today.getMonth() + 1
  });
  if (regeneratedMonth && regeneratedMonth.profitMargin) {
    console.log(`  ✓ Monthly profit margin: $${regeneratedMonth.profitMargin.value.toFixed(2)} (${regeneratedMonth.profitMargin.percentage.toFixed(1)}%)`);
  }
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('VERIFICATION COMPLETE');
console.log('═══════════════════════════════════════════════════════════════');

await mongoose.disconnect();

// Helper function to get week number
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
