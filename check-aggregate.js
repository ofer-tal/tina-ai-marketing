import dotenv from 'dotenv';
import mongoose from 'mongoose';
import DailyRevenueAggregate from './backend/models/DailyRevenueAggregate.js';

dotenv.config();

async function checkAggregate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const latest = await DailyRevenueAggregate.findOne().sort({ date: -1 }).limit(1);
    console.log('Latest aggregate:', JSON.stringify({
      date: latest.date,
      subscribers: latest.subscribers,
      mrr: latest.mrr
    }, null, 2));
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAggregate();
