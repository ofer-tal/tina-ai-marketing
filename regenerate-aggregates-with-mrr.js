#!/usr/bin/env node
/**
 * Regenerate revenue aggregates with MRR calculation
 * Feature #159: MRR Monthly Recurring Revenue calculation
 */

import mongoose from 'mongoose';
import MarketingRevenue from './backend/models/MarketingRevenue.js';
import DailyRevenueAggregate from './backend/models/DailyRevenueAggregate.js';
import WeeklyRevenueAggregate from './backend/models/WeeklyRevenueAggregate.js';
import MonthlyRevenueAggregate from './backend/models/MonthlyRevenueAggregate.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function regenerateAggregates() {
  console.log('=== Regenerating Revenue Aggregates with MRR ===\n');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all unique transaction dates
    console.log('Step 1: Fetching all transaction dates...');
    const dates = await MarketingRevenue.distinct('transactionDate');
    console.log(`✅ Found ${dates.length} unique transaction dates\n`);

    // Process each date
    for (let i = 0; i < dates.length; i++) {
      const date = new Date(dates[i]);
      const dateStr = date.toISOString().split('T')[0];
      console.log(`[${i + 1}/${dates.length}] Processing ${dateStr}...`);

      try {
        const aggregate = await DailyRevenueAggregate.aggregateForDate(date);
        if (aggregate) {
          console.log(`  ✅ MRR: $${aggregate.mrr || 0}`);
        } else {
          console.log(`  ⚠️  No transactions for this date`);
        }
      } catch (error) {
        console.error(`  ❌ Error: ${error.message}`);
      }
    }

    console.log('\n✅ Daily aggregates regenerated!\n');

    // Regenerate weekly aggregates
    console.log('Step 2: Regenerating weekly aggregates...');
    const weeks = await MarketingRevenue.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$transactionDate' },
            week: { $week: '$transactionDate' }
          }
        }
      },
      { $sort: { '_id.year': -1, '_id.week': -1 } }
    ]);

    for (const week of weeks) {
      console.log(`Processing ${week._id.year}-W${week._id.week.toString().padStart(2, '0')}...`);
      try {
        const aggregate = await WeeklyRevenueAggregate.aggregateForWeek(week._id.year, week._id.week);
        if (aggregate) {
          console.log(`  ✅ MRR: $${aggregate.mrr || 0}`);
        }
      } catch (error) {
        console.error(`  ❌ Error: ${error.message}`);
      }
    }

    console.log('\n✅ Weekly aggregates regenerated!\n');

    // Regenerate monthly aggregates
    console.log('Step 3: Regenerating monthly aggregates...');
    const months = await MarketingRevenue.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$transactionDate' },
            month: { $month: '$transactionDate' }
          }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } }
    ]);

    for (const month of months) {
      console.log(`Processing ${month._id.year}-${month._id.month.toString().padStart(2, '0')}...`);
      try {
        const aggregate = await MonthlyRevenueAggregate.aggregateForMonth(month._id.year, month._id.month);
        if (aggregate) {
          console.log(`  ✅ MRR: $${aggregate.mrr || 0}`);
        }
      } catch (error) {
        console.error(`  ❌ Error: ${error.message}`);
      }
    }

    console.log('\n✅ Monthly aggregates regenerated!\n');

    // Summary
    const latestDaily = await DailyRevenueAggregate.findOne().sort({ date: -1 });
    const latestWeekly = await WeeklyRevenueAggregate.findOne().sort({ weekStart: -1 });
    const latestMonthly = await MonthlyRevenueAggregate.findOne().sort({ monthStart: -1 });

    console.log('=== Summary ===');
    console.log(`Latest daily aggregate (${latestDaily?.date}):`);
    console.log(`  MRR: $${latestDaily?.mrr || 0}`);
    console.log(`  Net revenue: $${latestDaily?.revenue?.netRevenue || 0}`);
    console.log(`\nLatest weekly aggregate (${latestWeekly?.weekIdentifier}):`);
    console.log(`  MRR: $${latestWeekly?.mrr || 0}`);
    console.log(`  Net revenue: $${latestWeekly?.revenue?.netRevenue || 0}`);
    console.log(`\nLatest monthly aggregate (${latestMonthly?.monthIdentifier}):`);
    console.log(`  MRR: $${latestMonthly?.mrr || 0}`);
    console.log(`  Net revenue: $${latestMonthly?.revenue?.netRevenue || 0}`);

    console.log('\n✅ All aggregates regenerated successfully with MRR!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

regenerateAggregates();
