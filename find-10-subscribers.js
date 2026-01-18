import dotenv from 'dotenv';
import mongoose from 'mongoose';
import DailyRevenueAggregate from './backend/models/DailyRevenueAggregate.js';

dotenv.config();

async function find10Subscribers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Find aggregates with 10 subscribers
    const aggregates = await DailyRevenueAggregate.find({
      'subscribers.totalCount': 10
    }).sort({ date: -1 });

    console.log(`Found ${aggregates.length} aggregates with 10 subscribers:`);
    for (const agg of aggregates) {
      console.log(`  ${agg.date} - MRR: $${agg.mrr}`);
    }

    // Also check what findOne().sort({ date: -1 }) returns
    const latest = await DailyRevenueAggregate.findOne()
      .sort({ date: -1 })
      .limit(1);

    console.log('\nLatest aggregate (findOne + sort):');
    console.log(`  Date: ${latest?.date}`);
    console.log(`  Subscribers: ${latest?.subscribers?.totalCount}`);
    console.log(`  Churn: ${latest?.churn?.rate || 0}%`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

find10Subscribers();
