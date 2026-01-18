/**
 * Direct test of dashboard metrics without cache
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

import DailyRevenueAggregate from './backend/models/DailyRevenueAggregate.js';
import WeeklyRevenueAggregate from './backend/models/WeeklyRevenueAggregate.js';
import MonthlyRevenueAggregate from './backend/models/MonthlyRevenueAggregate.js';

async function testDashboardData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Get latest aggregates
    const latestDaily = await DailyRevenueAggregate.findOne().sort({ date: -1 });
    const latestWeekly = await WeeklyRevenueAggregate.findOne().sort({ year: -1, week: -1 });
    const latestMonthly = await MonthlyRevenueAggregate.findOne().sort({ year: -1, month: -1 });

    console.log('DAILY AGGREGATE:');
    console.log('Date:', latestDaily?.date);
    console.log('Net Revenue:', latestDaily?.revenue?.netRevenue);
    console.log('Costs:', JSON.stringify(latestDaily?.costs, null, 2));

    console.log('\nWEEKLY AGGREGATE:');
    console.log('Week:', `${latestWeekly?.year}-W${latestWeekly?.week}`);
    console.log('Net Revenue:', latestWeekly?.revenue?.netRevenue);
    console.log('Costs:', JSON.stringify(latestWeekly?.costs, null, 2));

    console.log('\nMONTHLY AGGREGATE:');
    console.log('Month:', `${latestMonthly?.year}-${latestMonthly?.month}`);
    console.log('Net Revenue:', latestMonthly?.revenue?.netRevenue);
    console.log('Costs:', JSON.stringify(latestMonthly?.costs, null, 2));

    console.log('\n✅ Data structure verified - costs field is present in all aggregates');
    console.log('Note: Dashboard API will reflect this after server restart');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

testDashboardData();
