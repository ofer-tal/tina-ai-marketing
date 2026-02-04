/**
 * Test writing to marketing_auth_tokens collection
 */
import { config } from 'dotenv';
import { MongoClient } from 'mongodb';

config();

async function testWrite() {
  const uri = process.env.MONGODB_URI;
  console.log('Connecting to MongoDB...');

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected!');

    // Get database name from connection string
    const dbName = 'AdultStoriesCluster'; // From URI
    const db = client.db(dbName);

    // Test collection write
    const collection = db.collection('marketing_auth_tokens');

    const testDoc = {
      platform: 'test',
      accessToken: 'test_token_' + Date.now(),
      refreshToken: 'test_refresh',
      tokenType: 'oauth',
      isActive: true,
      expiresAt: new Date(Date.now() + 3600000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log('Attempting to write test token...');
    console.log('Document:', JSON.stringify(testDoc, null, 2));

    const result = await collection.insertOne(testDoc);

    console.log('✓ Write SUCCESS!');
    console.log('Inserted ID:', result.insertedId);

    // Try to read it back
    const found = await collection.findOne({ _id: result.insertedId });
    console.log('✓ Read back token:', found ? 'YES' : 'NO');

    // List all tokens
    const allTokens = await collection.find({}).toArray();
    console.log('\nAll tokens in collection:', allTokens.length);
    allTokens.forEach(t => {
      console.log(` - ${t.platform}: ${t.accessToken?.substring(0, 30)}...`);
    });

  } catch (error) {
    console.error('ERROR:', error.message);
    console.error('Full error:', error);
  } finally {
    await client.close();
  }
}

testWrite();
