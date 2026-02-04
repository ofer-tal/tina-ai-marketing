import { MongoClient, ObjectId } from 'mongodb';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), '..', '..');
config({ path: path.join(projectRoot, '.env') });

async function debugGoogleToken() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('AdultStoriesCluster');
  const coll = db.collection('marketing_auth_tokens');

  const tokens = await coll.find({ platform: 'google' }).sort({ createdAt: -1 }).limit(5).toArray();

  console.log('\n=== GOOGLE TOKENS ===');
  if (tokens.length === 0) {
    console.log('NO GOOGLE TOKENS FOUND!');
  } else {
    tokens.forEach((t, i) => {
      console.log(`\n${i + 1}. ID: ${t._id}`);
      console.log(`   isActive: ${t.isActive}`);
      console.log(`   expiresAt: ${t.expiresAt}`);
      console.log(`   accessToken length: ${t.accessToken?.length || 0}`);
      console.log(`   refreshToken length: ${t.refreshToken?.length || 0}`);
      console.log(`   createdAt: ${t.createdAt}`);
      console.log(`   updatedAt: ${t.updatedAt}`);
      console.log(`   lastRefreshedAt: ${t.lastRefreshedAt}`);
    });
  }

  // Check active token specifically
  const activeToken = await coll.findOne({ platform: 'google', isActive: true });
  console.log('\n=== ACTIVE TOKEN QUERY ===');
  if (activeToken) {
    console.log('ACTIVE TOKEN FOUND:');
    console.log(`  ID: ${activeToken._id}`);
    console.log(`  isActive: ${activeToken.isActive}`);
    console.log(`  expiresAt: ${activeToken.expiresAt}`);
  } else {
    console.log('NO ACTIVE TOKEN FOUND!');
  }

  await client.close();
}

debugGoogleToken();
