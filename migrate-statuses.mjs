import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;

async function migrateStatuses() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const posts = db.collection('marketing_posts');

  console.log('📊 Analyzing statuses in marketing_posts...');
  const statuses = await posts.distinct('status');
  console.log('Current statuses:', statuses);

  console.log('\n🔄 Migrating status values to match schema...');

  // Map old status values to new schema
  const statusMap = {
    'active': 'posted',
    'Active': 'posted',
    'ACTIVE': 'posted',
    'posted': 'posted',  // already correct
    'draft': 'draft',     // already correct
    'ready': 'ready',     // already correct
    'approved': 'approved', // already correct
    'scheduled': 'scheduled', // already correct
    'failed': 'failed',   // already correct
    'rejected': 'rejected' // already correct
  };

  let migrated = 0;
  for (const [oldStatus, newStatus] of Object.entries(statusMap)) {
    if (oldStatus !== newStatus) {
      const result = await posts.updateMany(
        { status: oldStatus },
        { $set: { status: newStatus } }
      );
      if (result.modifiedCount > 0) {
        console.log(`  ✅ "${oldStatus}" → "${newStatus}": ${result.modifiedCount} documents`);
        migrated += result.modifiedCount;
      }
    }
  }

  console.log(`\n✅ Total documents migrated: ${migrated}`);

  // Verify
  const newStatuses = await posts.distinct('status');
  console.log('\n📊 New statuses:', newStatuses);

  // Check for any posts without proper titles
  const emptyTitleCount = await posts.countDocuments({ title: '' });
  console.log(`\n⚠️  Posts with empty titles: ${emptyTitleCount}`);

  await mongoose.connection.close();
}

migrateStatuses().catch(console.error);
