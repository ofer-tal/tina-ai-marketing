import dotenv from 'dotenv';
import mongoose from 'mongoose';
import DailyRevenueAggregate from './backend/models/DailyRevenueAggregate.js';

dotenv.config();

async function checkAggregates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Get all daily aggregates, sorted by date descending
    const aggregates = await DailyRevenueAggregate.find({})
      .sort({ date: -1 })
      .limit(5);

    console.log('Last 5 daily aggregates:');
    console.log('================================\n');

    for (const agg of aggregates) {
      console.log(`Date: ${agg.date}`);
      console.log(`  Subscribers: ${JSON.stringify(agg.subscribers, null, 2)}`);
      console.log(`  Churn: ${JSON.stringify(agg.churn, null, 2)}`);
      console.log(`  MRR: ${JSON.stringify(agg.mrr, null, 2)}`);
      console.log(`  ARPU: ${JSON.stringify(agg.arpu, null, 2)}`);
      console.log(`  LTV: ${JSON.stringify(agg.ltv, null, 2)}`);
      console.log(`  Costs: ${JSON.stringify(agg.costs, null, 2)}`);
      console.log(`  Profit Margin: ${JSON.stringify(agg.profitMargin, null, 2)}`);
      console.log('');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkAggregates();
