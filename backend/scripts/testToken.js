import { MongoClient } from 'mongodb';
import { config } from 'dotenv';

config();

async function testToken() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  await client.connect();
  const db = client.db('AdultStoriesCluster');
  const collection = db.collection('marketing_auth_tokens');

  const token = await collection.findOne({ platform: 'google', isActive: true }, {
    sort: { createdAt: -1 }
  });

  if (token) {
    console.log('ACTIVE GOOGLE TOKEN FOUND!');
    console.log('Expires:', token.expiresAt);
    console.log('Has Refresh:', !!token.refreshToken);
    console.log('Access Token (first 30 chars):', token.accessToken?.substring(0, 30));
  } else {
    console.log('NO ACTIVE GOOGLE TOKEN!');
  }

  await client.close();
}

testToken();
