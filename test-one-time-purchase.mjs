import dotenv from 'dotenv';
import DailyRevenueAggregate from './backend/models/DailyRevenueAggregate.js';
import databaseService from './backend/services/database.js';

// Load environment variables
dotenv.config();

(async () => {
  try {
    console.log('Connecting to database...');
    await databaseService.connect();

    console.log('Fetching latest daily aggregate...');
    const sample = await DailyRevenueAggregate.findOne().sort({ dateObj: -1 });

    if (sample) {
      console.log('\n✅ Sample DailyRevenueAggregate document found:');
      console.log('   Date:', sample.date);
      console.log('   Net Revenue:', sample.revenue?.netRevenue || 0);
      console.log('   Subscription Revenue:', sample.breakdown?.subscriptionRevenue || 0);
      console.log('   One-Time Purchase Revenue:', sample.breakdown?.oneTimePurchaseRevenue || 0);

      // Verify breakdown data exists
      if (sample.breakdown && 'oneTimePurchaseRevenue' in sample.breakdown) {
        console.log('\n✅ Feature #158 VERIFIED: oneTimePurchaseRevenue field exists in database');
      } else {
        console.log('\n⚠️  oneTimePurchaseRevenue field not found in breakdown');
      }
    } else {
      console.log('\n⚠️  No daily aggregates found in database');
      console.log('   Run revenue sync job to populate data: npm run revenue-sync');
    }

    await databaseService.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
