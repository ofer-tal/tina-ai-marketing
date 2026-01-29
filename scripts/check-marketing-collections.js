import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

async function checkCollections() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    const collections = await db.listCollections().toArray();

    console.log('=== ALL COLLECTIONS IN DATABASE ===');
    const marketingCollections = [];
    const otherCollections = [];

    collections.forEach(c => {
      if (c.name.startsWith('marketing_')) {
        marketingCollections.push(c.name);
      } else {
        otherCollections.push(c.name);
      }
    });

    console.log('\nMARKETING COLLECTIONS:');
    marketingCollections.forEach(c => console.log('  -', c));

    console.log('\nOTHER COLLECTIONS (DO NOT TOUCH):');
    otherCollections.forEach(c => console.log('  -', c));

    // Now check counts in marketing collections
    console.log('\n=== DOCUMENT COUNTS IN MARKETING COLLECTIONS ===');
    for (const name of marketingCollections) {
      const count = await db.collection(name).countDocuments();
      console.log(name + ':', count, 'documents');
    }

  } finally {
    await client.close();
  }
}

checkCollections().catch(console.error);
