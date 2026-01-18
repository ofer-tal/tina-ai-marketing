import mongoose from 'mongoose';
import dotenv from 'dotenv';
import DailyRevenueAggregate from './backend/models/DailyRevenueAggregate.js';
import WeeklyRevenueAggregate from './backend/models/WeeklyRevenueAggregate.js';
import MonthlyRevenueAggregate from './backend/models/MonthlyRevenueAggregate.js';

dotenv.config();

async function regenerateAggregatesWithARPU() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const now = new Date();

    // Regenerate today's daily aggregate
    console.log('\n=== Regenerating Daily Aggregate ===');
    const todayDailyAggregate = await DailyRevenueAggregate.aggregateForDate(now);
    if (todayDailyAggregate) {
      console.log(`✅ Daily aggregate for ${now.toISOString().split('T')[0]} regenerated`);
      console.log(`   ARPU: $${todayDailyAggregate.arpu?.value || 0}`);
      console.log(`   Revenue: $${todayDailyAggregate.revenue?.netRevenue || 0}`);
      console.log(`   Subscribers: ${todayDailyAggregate.subscribers?.totalCount || 0}`);
    } else {
      console.log('⚠️  No daily aggregate data for today');
    }

    // Regenerate this week's weekly aggregate
    console.log('\n=== Regenerating Weekly Aggregate ===');
    const currentWeekNumber = getWeekNumber(now);
    const currentYear = now.getFullYear();
    const weeklyAggregate = await WeeklyRevenueAggregate.aggregateForWeek(currentYear, currentWeekNumber);
    if (weeklyAggregate) {
      console.log(`✅ Weekly aggregate for ${currentYear}-W${currentWeekNumber} regenerated`);
      console.log(`   ARPU: $${weeklyAggregate.arpu?.value || 0}`);
      console.log(`   Revenue: $${weeklyAggregate.revenue?.netRevenue || 0}`);
      console.log(`   Subscribers: ${weeklyAggregate.subscribers?.totalCount || 0}`);
    } else {
      console.log('⚠️  No weekly aggregate data for this week');
    }

    // Regenerate this month's monthly aggregate
    console.log('\n=== Regenerating Monthly Aggregate ===');
    const currentMonth = now.getMonth() + 1;
    const monthlyAggregate = await MonthlyRevenueAggregate.aggregateForMonth(currentYear, currentMonth);
    if (monthlyAggregate) {
      console.log(`✅ Monthly aggregate for ${currentYear}-${currentMonth} regenerated`);
      console.log(`   ARPU: $${monthlyAggregate.arpu?.value || 0}`);
      console.log(`   Revenue: $${monthlyAggregate.revenue?.netRevenue || 0}`);
      console.log(`   Subscribers: ${monthlyAggregate.subscribers?.totalCount || 0}`);
    } else {
      console.log('⚠️  No monthly aggregate data for this month');
    }

    console.log('\n✅ Aggregate regeneration complete!');

    // Test dashboard API
    console.log('\n=== Testing Dashboard API ===');
    console.log('Latest daily aggregate:');
    console.log(`  MRR: $${todayDailyAggregate?.mrr || 0}`);
    console.log(`  Subscribers: ${todayDailyAggregate?.subscribers?.totalCount || 0}`);
    console.log(`  ARPU: $${todayDailyAggregate?.arpu?.value || 0}`);
    console.log(`  Churn: ${todayDailyAggregate?.churn?.rate || 0}%`);

  } catch (error) {
    console.error('Error regenerating aggregates:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Helper function to get ISO week number
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return weekNo;
}

regenerateAggregatesWithARPU();
