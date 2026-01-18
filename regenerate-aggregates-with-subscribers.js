import mongoose from 'mongoose';
import dotenv from 'dotenv';
import DailyRevenueAggregate from './backend/models/DailyRevenueAggregate.js';

dotenv.config();

async function regenerateAggregates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the last 30 days of aggregates
    const today = new Date();
    const dates = [];

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(date);
    }

    console.log(`Regenerating ${dates.length} daily aggregates...`);

    for (const date of dates) {
      console.log(`Processing ${date.toISOString().split('T')[0]}...`);
      try {
        const aggregate = await DailyRevenueAggregate.aggregateForDate(date);
        if (aggregate) {
          console.log(`  ✓ Created aggregate for ${aggregate.date}`);
          console.log(`    Subscribers: ${aggregate.subscribers?.totalCount || 0} total`);
          console.log(`    MRR: $${aggregate.mrr || 0}`);
        } else {
          console.log(`  - No transactions for ${date.toISOString().split('T')[0]}`);
        }
      } catch (error) {
        console.error(`  ✗ Error processing ${date.toISOString().split('T')[0]}:`, error.message);
      }
    }

    console.log('\n✓ Regeneration complete!');

    // Show latest aggregate
    const latest = await DailyRevenueAggregate.findOne().sort({ date: -1 }).limit(1);
    if (latest) {
      console.log('\nLatest aggregate:');
      console.log(`  Date: ${latest.date}`);
      console.log(`  Subscribers: ${latest.subscribers?.totalCount || 0}`);
      console.log(`    - Monthly: ${latest.subscribers?.monthlyCount || 0}`);
      console.log(`    - Annual: ${latest.subscribers?.annualCount || 0}`);
      console.log(`    - Lifetime: ${latest.subscribers?.lifetimeCount || 0}`);
      console.log(`    - Trial: ${latest.subscribers?.trialCount || 0}`);
      console.log(`  MRR: $${latest.mrr || 0}`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

regenerateAggregates();
