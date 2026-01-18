import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkUserSchema() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    // Check users with subscription
    console.log('--- Checking users collection for subscriptions ---');
    const usersWithSubs = await db.collection('users').find({
      'subscription.status': 'active'
    }).limit(10).toArray();

    console.log('Users with active subscriptions:', usersWithSubs.length);

    if (usersWithSubs.length > 0) {
      console.log('Sample user subscription fields:', Object.keys(usersWithSubs[0].subscription || {}));

      // Show unique productIds from larger sample
      const largerSample = await db.collection('users').find({
        'subscription.status': 'active'
      }).limit(100).toArray();

      const productIds = largerSample.map(u => u.subscription?.type?.productId).filter(Boolean);
      const uniqueIds = [...new Set(productIds)];
      console.log('\nUnique productIds (from 100 sample):', uniqueIds);
      console.log('Count:', uniqueIds.length);
    }

    // Count active subscribers
    const activeCount = await db.collection('users').countDocuments({
      'subscription.status': 'active'
    });
    console.log('\nTotal active subscribers:', activeCount);

    // Count by subscription type (productId contains monthly/annual/lifetime)
    const monthlyCount = await db.collection('users').countDocuments({
      'subscription.status': 'active',
      'subscription.type.productId': /\.monthly\./
    });
    const annualCount = await db.collection('users').countDocuments({
      'subscription.status': 'active',
      'subscription.type.productId': /\.annual\./
    });
    const lifetimeCount = await db.collection('users').countDocuments({
      'subscription.status': 'active',
      'subscription.type.productId': /\.lifetime\./
    });

    console.log('Monthly active:', monthlyCount);
    console.log('Annual active:', annualCount);
    console.log('Lifetime active:', lifetimeCount);

    // Also check by aggregate
    const typeBreakdown = await db.collection('users').aggregate([
      { $match: { 'subscription.status': 'active' } },
      { $group: {
        _id: {
          $cond: [
            { $regexMatch: { input: '$subscription.type.productId', regex: /\.monthly\./ } },
            'monthly',
            { $cond: [
              { $regexMatch: { input: '$subscription.type.productId', regex: /\.annual\./ } },
              'annual',
              { $cond: [
                { $regexMatch: { input: '$subscription.type.productId', regex: /\.lifetime\./ } },
                'lifetime',
                'other'
              ]}
            ]}
          ]
        },
        count: { $sum: 1 }
      }}
    ]).toArray();
    console.log('\nType breakdown:', JSON.stringify(typeBreakdown, null, 2));

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUserSchema();
