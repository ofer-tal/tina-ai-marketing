/**
 * Regenerate all aggregates to include marketing costs
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

import WeeklyRevenueAggregate from './backend/models/WeeklyRevenueAggregate.js';
import MonthlyRevenueAggregate from './backend/models/MonthlyRevenueAggregate.js';
import MarketingRevenue from './backend/models/MarketingRevenue.js';

async function regenerateAggregates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Get week number
    const startOfYear = new Date(year, 0, 1);
    const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);

    console.log('Regenerating aggregates to include marketing costs...');
    console.log('=================================================\n');

    // Regenerate weekly aggregate
    console.log(`Regenerating weekly aggregate: ${year}-W${weekNumber}`);
    try {
      const weeklyResult = await WeeklyRevenueAggregate.aggregateForWeek(year, weekNumber);
      if (weeklyResult) {
        console.log('✅ Weekly aggregate regenerated');
        console.log(`   Total Cost: $${weeklyResult.costs?.totalCost?.toFixed(2) || 0}`);
        console.log(`   Cloud: $${weeklyResult.costs?.cloudServices?.toFixed(2) || 0}`);
        console.log(`   API: $${weeklyResult.costs?.apiServices?.toFixed(2) || 0}`);
        console.log(`   % Revenue: ${weeklyResult.costs?.percentageOfRevenue?.toFixed(1) || 0}%\n`);
      }
    } catch (error) {
      console.error('Error regenerating weekly:', error.message);
    }

    // Regenerate monthly aggregate
    console.log(`Regenerating monthly aggregate: ${year}-${month}`);
    try {
      const monthlyResult = await MonthlyRevenueAggregate.aggregateForMonth(year, month);
      if (monthlyResult) {
        console.log('✅ Monthly aggregate regenerated');
        console.log(`   Total Cost: $${monthlyResult.costs?.totalCost?.toFixed(2) || 0}`);
        console.log(`   Cloud: $${monthlyResult.costs?.cloudServices?.toFixed(2) || 0}`);
        console.log(`   API: $${monthlyResult.costs?.apiServices?.toFixed(2) || 0}`);
        console.log(`   % Revenue: ${monthlyResult.costs?.percentageOfRevenue?.toFixed(1) || 0}%\n`);
      }
    } catch (error) {
      console.error('Error regenerating monthly:', error.message);
    }

    console.log('=================================================');
    console.log('✅ All aggregates regenerated with marketing costs');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

regenerateAggregates();
