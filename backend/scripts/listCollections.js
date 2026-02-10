import 'dotenv/config.js';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function listCollections() {
  await client.connect();
  
  // Get database name from connection string
  const dbName = uri.match(/\/([^/?]+)$/)?.[1] || 'blush';
  console.log('Database:', dbName);
  
  const db = client.db(dbName);
  const collections = await db.listCollections().toArray();
  
  console.log('\nCollections:');
  for (const col of collections) {
    console.log('  -', col.name);
  }

  await client.close();
}

listCollections().catch(console.error);
