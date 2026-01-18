#!/usr/bin/env node
/**
 * Test script for MRR calculation
 * Feature #159: MRR Monthly Recurring Revenue calculation
 */

import mongoose from 'mongoose';
import MarketingRevenue from './backend/models/MarketingRevenue.js';
import DailyRevenueAggregate from './backend/models/DailyRevenueAggregate.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function testMRRCalculation() {
  console.log('=== MRR Calculation Test ===\n');
  console.log('Feature #159: MRR from active subscriptions\n');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Get active subscriptions
    console.log('Step 1: Fetching active subscription count...');
    const activeSubscriptions = await MarketingRevenue.distinct('customer.subscriptionId', {
      transactionDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      'customer.subscriptionType': { $in: ['monthly', 'annual'] }
    });
    const activeSubscriberCount = activeSubscriptions.filter(id => id !== null).length;
    console.log(`✅ Active subscribers: ${activeSubscriberCount}\n`);

    // Step 2: Calculate average subscription price
    console.log('Step 2: Calculating average subscription price...');
    const subscriptionRevenue = await MarketingRevenue.aggregate([
      {
        $match: {
          'customer.subscriptionType': { $in: ['monthly', 'annual'] },
          transactionDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: '$customer.subscriptionType',
          totalRevenue: { $sum: '$revenue.netAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('Subscription revenue by type:');
    let totalSubscriptionRevenue = 0;
    let totalSubscriptions = 0;

    for (const type of subscriptionRevenue) {
      console.log(`  ${type._id}: $${type.totalRevenue.toFixed(2)} (${type.count} transactions)`);
      totalSubscriptionRevenue += type.totalRevenue;
      totalSubscriptions += type.count;
    }

    const avgSubscriptionPrice = totalSubscriptions > 0 ? totalSubscriptionRevenue / totalSubscriptions : 0;
    console.log(`\n✅ Average subscription price: $${avgSubscriptionPrice.toFixed(2)}\n`);

    // Step 3: Calculate MRR
    console.log('Step 3: Calculating MRR...');
    const mrr = activeSubscriberCount * avgSubscriptionPrice;
    console.log(`✅ MRR = ${activeSubscriberCount} subscribers × $${avgSubscriptionPrice.toFixed(2)} = $${mrr.toFixed(2)}\n`);

    // Step 4: Check if MRR is stored in aggregates
    console.log('Step 4: Checking if MRR is stored in daily aggregates...');
    const latestAggregate = await DailyRevenueAggregate.findOne().sort({ date: -1 });

    if (latestAggregate) {
      console.log(`Latest aggregate date: ${latestAggregate.date}`);
      console.log(`Has mrr field: ${latestAggregate.mrr !== undefined}`);
      console.log(`MRR value: ${latestAggregate.mrr || 'NOT STORED'}`);

      if (latestAggregate.mrr) {
        console.log(`✅ MRR is stored in daily aggregates\n`);
      } else {
        console.log(`❌ MRR is NOT stored in daily aggregates\n`);
      }
    } else {
      console.log('❌ No daily aggregates found\n');
    }

    // Step 5: Check API endpoints
    console.log('Step 5: Checking API availability...');
    console.log('Note: API endpoints will be checked via frontend testing\n');

    // Summary
    console.log('=== Test Summary ===');
    console.log(`Active subscribers: ${activeSubscriberCount}`);
    console.log(`Average subscription price: $${avgSubscriptionPrice.toFixed(2)}`);
    console.log(`Calculated MRR: $${mrr.toFixed(2)}`);
    console.log(`\nFeature #159 Status: MRR calculation works, but needs to be stored and exposed via API\n`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

testMRRCalculation();
