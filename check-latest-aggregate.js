import mongoose from 'mongoose';
import dotenv from 'dotenv';
import DailyRevenueAggregate from './backend/models/DailyRevenueAggregate.js';

dotenv.config();

async function checkLatestAggregate() {
  await mongoose.connect(process.env.MONGODB_URI);

  const latest = await DailyRevenueAggregate.findOne().sort({ date: -1 }).limit(1);

  console.log('Latest Daily Aggregate:');
  console.log('  Date:', latest.date);
  console.log('  Subscribers:', latest.subscribers?.totalCount || 'N/A');
  console.log('  ARPU:', latest.arpu?.value || 'N/A');
  console.log('  MRR:', latest.mrr || 'N/A');
  console.log('  Net Revenue:', latest.revenue?.netRevenue || 'N/A');

  await mongoose.disconnect();
}

checkLatestAggregate().catch(console.error);
