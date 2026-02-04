import { MongoClient } from 'mongodb';
import { config } from 'dotenv';

config();

async function checkRawTokens() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  await client.connect();
  const db = client.db('AdultStoriesCluster');
  const tokens = await db.collection('marketing_auth_tokens')
    .find({ platform: 'google' })
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();

  console.log('\n=== RAW GOOGLE TOKENS (from MongoDB) ===');
  tokens.forEach((t, i) => {
    console.log(`Token ${i + 1}:`);
    console.log('  _id:', t._id);
    console.log('  isActive:', t.isActive);
    console.log('  expiresAt (raw):', t.expiresAt);
    console.log('  accessToken (length):', t.accessToken?.length || 0);
    console.log('  refreshToken (length):', t.refreshToken?.length || 0);
    console.log('  createdAt:', t.createdAt);
    console.log('  updatedAt:', t.updatedAt);
    console.log('  tokenType:', t.tokenType);
    console.log('');
  });

  await client.close();
}

checkRawTokens();
