#!/usr/bin/env node
/**
 * Verify MRR calculation for a specific day
 */

import mongoose from 'mongoose';
import MarketingRevenue from './backend/models/MarketingRevenue.js';
import DailyRevenueAggregate from './backend/models/DailyRevenueAggregate.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function verifyMRR() {
  console.log('=== MRR Verification for Latest Date ===\n');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get the latest aggregate
    const latestAggregate = await DailyRevenueAggregate.findOne().sort({ date: -1 });

    if (!latestAggregate) {
      console.log('No aggregates found');
      return;
    }

    console.log(`Date: ${latestAggregate.date}`);
    console.log(`Stored MRR: $${latestAggregate.mrr || 0}\n`);

    // Get transactions for this date
    const startOfDay = new Date(latestAggregate.dateObj);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(latestAggregate.dateObj);
    endOfDay.setHours(23, 59, 59, 999);

    const transactions = await MarketingRevenue.find({
      transactionDate: { $gte: startOfDay, $lte: endOfDay }
    });

    console.log(`Transactions on this date: ${transactions.length}\n`);

    // Group by subscription type
    const byType = {
      monthly: { count: 0, revenue: 0, subscriptions: new Set() },
      annual: { count: 0, revenue: 0, subscriptions: new Set() },
      trial: { count: 0, revenue: 0 }
    };

    for (const tx of transactions) {
      const type = tx.customer?.subscriptionType;
      if (type && byType[type]) {
        byType[type].count++;
        byType[type].revenue += tx.revenue?.netAmount || 0;
        if (tx.customer?.subscriptionId && (type === 'monthly' || type === 'annual')) {
          byType[type].subscriptions.add(tx.customer.subscriptionId);
        }
      }
    }

    console.log('Monthly subscriptions:');
    console.log(`  Transactions: ${byType.monthly.count}`);
    console.log(`  Revenue: $${byType.monthly.revenue.toFixed(2)}`);
    console.log(`  Unique subscribers: ${byType.monthly.subscriptions.size}`);
    const avgMonthlyPrice = byType.monthly.count > 0 ? byType.monthly.revenue / byType.monthly.count : 0;
    const monthlyMRR = byType.monthly.subscriptions.size * avgMonthlyPrice;
    console.log(`  Avg price: $${avgMonthlyPrice.toFixed(2)}`);
    console.log(`  Monthly MRR contribution: $${monthlyMRR.toFixed(2)}\n`);

    console.log('Annual subscriptions:');
    console.log(`  Transactions: ${byType.annual.count}`);
    console.log(`  Revenue: $${byType.annual.revenue.toFixed(2)}`);
    console.log(`  Unique subscribers: ${byType.annual.subscriptions.size}`);
    const avgAnnualPrice = byType.annual.count > 0 ? byType.annual.revenue / byType.annual.count : 0;
    const annualMRR = byType.annual.subscriptions.size * (avgAnnualPrice / 12);
    console.log(`  Avg price: $${avgAnnualPrice.toFixed(2)}`);
    console.log(`  Annual MRR contribution: $${annualMRR.toFixed(2)} (monthly equivalent)\n`);

    const calculatedMRR = monthlyMRR + annualMRR;
    console.log(`Total calculated MRR: $${calculatedMRR.toFixed(2)}`);
    console.log(`Stored MRR: $${latestAggregate.mrr?.toFixed(2) || 0}`);
    console.log(`Match: ${Math.abs(calculatedMRR - (latestAggregate.mrr || 0)) < 0.01 ? '✅' : '❌'}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

verifyMRR();
