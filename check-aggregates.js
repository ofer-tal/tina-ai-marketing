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
      console.log(`  Subscribers: ${agg.subscribers?.totalCount || 0}`);
      console.log(`  Churn rate: ${agg.churn?.rate || 0}%`);
      console.log(`  MRR: $${agg.mrr || 0}`);
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
