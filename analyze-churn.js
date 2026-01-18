import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function analyzeChurn() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    console.log('--- Analyzing Churn Data ---\n');

    // 1. Get a sample user to see subscription structure
    const sampleUser = await db.collection('users').findOne({
      'subscription.status': 'active'
    });

    if (sampleUser) {
      console.log('Sample active user subscription:');
      console.log(JSON.stringify(sampleUser.subscription, null, 2));
    }

    // 2. Check different subscription statuses
    const statusCounts = await db.collection('users').aggregate([
      { $group: { _id: '$subscription.status', count: { $sum: 1 } } }
    ]).toArray();

    console.log('\nSubscription status distribution:');
    console.log(JSON.stringify(statusCounts, null, 2));

    // 3. Check subscription history for expired/canceled users
    const expiredUsers = await db.collection('users').find({
      'subscription.status': { $in: ['expired', 'canceled', 'cancelled'] }
    }).limit(5).toArray();

    console.log('\nExpired/canceled users sample:', expiredUsers.length);
    if (expiredUsers.length > 0) {
      console.log('Sample expired user:');
      console.log(JSON.stringify(expiredUsers[0].subscription, null, 2));
    }

    // 4. Count subscribers by type with better patterns
    const monthlyCount = await db.collection('users').countDocuments({
      'subscription.status': 'active',
      'subscription.type.productId': /monthly/
    });

    const annualCount = await db.collection('users').countDocuments({
      'subscription.status': 'active',
      'subscription.type.productId': /annual/
    });

    const lifetimeCount = await db.collection('users').countDocuments({
      'subscription.status': 'active',
      'subscription.type.productId': /lifetime/
    });

    const trialCount = await db.collection('users').countDocuments({
      'subscription.status': 'active',
      'subscription.type.productId': /trial/
    });

    console.log('\n--- Current Active Subscribers ---');
    console.log('Total:', await db.collection('users').countDocuments({ 'subscription.status': 'active' }));
    console.log('Monthly:', monthlyCount);
    console.log('Annual:', annualCount);
    console.log('Lifetime:', lifetimeCount);
    console.log('Trial:', trialCount);

    // 5. Calculate churn for last 30 days
    // Churn = users who went from active to expired/canceled in the period
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const churnedUsers = await db.collection('users').countDocuments({
      'subscription.status': { $in: ['expired', 'canceled', 'cancelled', 'expired_redeemable'] },
      'subscription.changeDate': { $gte: thirtyDaysAgo }
    });

    console.log('\n--- Churn Analysis (Last 30 Days) ---');
    console.log('Churned users:', churnedUsers);

    // 6. Get subscribers at start of period (approximate using current + churned)
    const activeNow = await db.collection('users').countDocuments({
      'subscription.status': 'active'
    });

    // This is approximate - in reality we'd need historical snapshots
    const subscribersAtStart = activeNow + churnedUsers;
    const churnRate = subscribersAtStart > 0 ? (churnedUsers / subscribersAtStart * 100).toFixed(2) : 0;

    console.log('Active now:', activeNow);
    console.log('Approximate subscribers at start:', subscribersAtStart);
    console.log('Monthly churn rate:', churnRate + '%');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

analyzeChurn();
