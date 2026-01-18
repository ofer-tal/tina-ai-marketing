/**
 * Test dashboard churn rate directly
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import DailyRevenueAggregate from './backend/models/DailyRevenueAggregate.js';
import MonthlyRevenueAggregate from './backend/models/MonthlyRevenueAggregate.js';

dotenv.config();

async function testDashboardChurn() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const now = new Date();

    // Get latest daily aggregate
    const latestAggregate = await DailyRevenueAggregate.findOne()
      .sort({ date: -1 })
      .limit(1);

    console.log('Latest daily aggregate:', {
      date: latestAggregate?.date,
      subscribers: latestAggregate?.subscribers,
      churn: latestAggregate?.churn
    });

    // Get current month aggregate
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const currentMonthAggregate = await MonthlyRevenueAggregate.findOne({
      year: currentYear,
      month: currentMonth
    });

    console.log('\nCurrent month aggregate:', {
      monthIdentifier: currentMonthAggregate?.monthIdentifier,
      subscribers: currentMonthAggregate?.subscribers,
      churn: currentMonthAggregate?.churn
    });

    // Get previous month aggregate
    const prevMonth = currentMonth - 1;
    let previousMonthAggregate = null;

    if (prevMonth > 0) {
      previousMonthAggregate = await MonthlyRevenueAggregate.findOne({
        year: currentYear,
        month: prevMonth
      });
    } else if (prevMonth === 0) {
      previousMonthAggregate = await MonthlyRevenueAggregate.findOne({
        year: currentYear - 1,
        month: 12
      });
    }

    console.log('\nPrevious month aggregate:', {
      monthIdentifier: previousMonthAggregate?.monthIdentifier,
      churn: previousMonthAggregate?.churn
    });

    // Calculate what the dashboard should return
    let currentChurnRate = 0;
    let previousChurnRate = 0;

    if (currentMonthAggregate) {
      currentChurnRate = currentMonthAggregate.churn?.rate || 0;
    } else {
      currentChurnRate = latestAggregate?.churn?.rate || 0;
    }

    if (previousMonthAggregate) {
      previousChurnRate = previousMonthAggregate.churn?.rate || 0;
    } else {
      previousChurnRate = latestAggregate?.churn?.rate || 0;
    }

    const churnChange = previousChurnRate > 0 ? ((currentChurnRate - previousChurnRate) / previousChurnRate * 100) : 0;

    console.log('\n═══════════════════════════════════════════');
    console.log('DASHBOARD CHURN METRICS:');
    console.log('═══════════════════════════════════════════');
    console.log('current:', parseFloat(currentChurnRate.toFixed(2)));
    console.log('previous:', parseFloat(previousChurnRate.toFixed(2)));
    console.log('change:', parseFloat(churnChange.toFixed(1)));
    console.log('trend:', currentChurnRate <= previousChurnRate ? 'down' : 'up');
    console.log('═══════════════════════════════════════════\n');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testDashboardChurn();
