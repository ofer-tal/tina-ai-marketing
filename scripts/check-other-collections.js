import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

async function checkOtherCollections() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();

    console.log('=== MARKETING_STRATEGY SAMPLE ===\n');
    const strategies = await db.collection('marketing_strategy').find({}).limit(2).toArray();
    strategies.forEach((s, i) => {
      console.log(`Strategy ${i + 1}:`);
      console.log('  Type:', typeof s);
      console.log('  Keys:', Object.keys(s).slice(0, 10));
      console.log('');
    });

    console.log('\n=== MARKETING_AUTH_TOKENS ===\n');
    const tokens = await db.collection('marketing_auth_tokens').find({}).toArray();
    tokens.forEach(t => {
      console.log('Platform:', t.platform);
      console.log('  Has accessToken:', !!t.accessToken);
      console.log('  createdAt:', t.createdAt);
    });

  } finally {
    await client.close();
  }
}

checkOtherCollections().catch(console.error);
