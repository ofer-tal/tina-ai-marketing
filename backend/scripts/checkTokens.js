/**
 * Quick script to check auth tokens in database
 */
import { config } from 'dotenv';
import { MongoClient } from 'mongodb';

// Load environment variables
config();

async function checkTokens() {
  const uri = process.env.MONGODB_URI;
  console.log('Connecting to MongoDB Atlas...');
  console.log('URI:', uri.replace(/:[^:@]+@/, ':****@'));
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    // Use the correct database name from MONGODB_URI (AdultStoriesCluster)
    const db = client.db('AdultStoriesCluster');
    const tokens = await db.collection('marketing_auth_tokens')
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    console.log('\n=== TOKENS IN DATABASE ===');
    console.log(`Total tokens found: ${tokens.length}\n`);

    if (tokens.length === 0) {
      console.log('NO TOKENS FOUND! The collection is empty.');
      return;
    }

    tokens.forEach((t, i) => {
      console.log(`--- Token ${i + 1} ---`);
      console.log(`  Platform: ${t.platform}`);
      console.log(`  Has AccessToken: ${!!t.accessToken}`);
      console.log(`  Has RefreshToken: ${!!t.refreshToken}`);
      console.log(`  IsActive: ${t.isActive}`);
      console.log(`  ExpiresAt: ${t.expiresAt}`);
      console.log(`  CreatedAt: ${t.createdAt}`);
      console.log(`  UpdatedAt: ${t.updatedAt}`);
      console.log(`  ID: ${t._id}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

checkTokens();
