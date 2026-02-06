import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');
dotenv.config({ path: join(projectRoot, '.env') });

import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
console.log('Connecting to MongoDB...');
const client = new MongoClient(uri);

await client.connect();
const db = client.db(); // Use default database from URI

// First, check current state
const tier1Count = await db.collection('marketing_posts').countDocuments({ contentTier: 'tier_1' });
const tier2Count = await db.collection('marketing_posts').countDocuments({ contentTier: 'tier_2' });
const tier3Count = await db.collection('marketing_posts').countDocuments({ contentTier: 'tier_3' });
const nullCount = await db.collection('marketing_posts').countDocuments({ contentTier: null });
const total = await db.collection('marketing_posts').countDocuments();

console.log('Before fix:');
console.log('  Total posts:', total);
console.log('  Tier 1:', tier1Count);
console.log('  Tier 2:', tier2Count);
console.log('  Tier 3:', tier3Count);
console.log('  Null tier:', nullCount);

// Update all tier_2 posts to tier_1
const result1 = await db.collection('marketing_posts').updateMany(
  { contentTier: 'tier_2' },
  { $set: { contentTier: 'tier_1' } }
);
console.log('\nUpdated', result1.modifiedCount, 'posts from tier_2 to tier_1');

// Update all null tier posts to tier_1 (these are older posts created before tier system)
const result2 = await db.collection('marketing_posts').updateMany(
  { contentTier: null },
  { $set: { contentTier: 'tier_1' } }
);
console.log('Updated', result2.modifiedCount, 'posts from null to tier_1');

// Verify the update
const newTier2 = await db.collection('marketing_posts').countDocuments({ contentTier: 'tier_2' });
const newNull = await db.collection('marketing_posts').countDocuments({ contentTier: null });
const newTier1 = await db.collection('marketing_posts').countDocuments({ contentTier: 'tier_1' });

console.log('\nAfter fix:');
console.log('  Tier 1:', newTier1);
console.log('  Tier 2:', newTier2);
console.log('  Null tier:', newNull);

await client.close();
