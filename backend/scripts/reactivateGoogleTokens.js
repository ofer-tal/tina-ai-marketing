import { MongoClient, ObjectId } from 'mongodb';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
// scripts is in backend, so parent of scripts is backend, parent of backend is project root
const projectRoot = path.resolve(path.dirname(__filename), '..', '..');
config({ path: path.join(projectRoot, '.env') });

async function reactivateGoogleTokens() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('AdultStoriesCluster');
  const coll = db.collection('marketing_auth_tokens');

  // Find all Google tokens with refresh tokens
  const tokens = await coll.find({
    platform: 'google',
    refreshToken: { $exists: true, $ne: null }
  }).sort({ createdAt: -1 }).limit(1).toArray();

  if (tokens.length === 0) {
    console.log('NO GOOGLE TOKENS FOUND WITH REFRESH TOKEN!');
    await client.close();
    return;
  }

  const token = tokens[0];
  const oneHourFromNow = new Date(Date.now() + (60 * 60 * 1000));

  console.log('Reactivating token:', token._id);
  console.log('Current isActive:', token.isActive);
  console.log('Setting expiresAt to:', oneHourFromNow.toISOString());

  await coll.updateOne(
    { _id: token._id },
    {
      $set: {
        isActive: true,
        expiresAt: oneHourFromNow,
        lastRefreshedAt: new Date()
      }
    }
  );

  console.log('Token reactivated!');

  // Verify
  const activeToken = await coll.findOne({ platform: 'google', isActive: true });
  if (activeToken) {
    console.log('VERIFIED: Active token found', activeToken._id);
  } else {
    console.log('ERROR: No active token after reactivation!');
  }

  await client.close();
}

reactivateGoogleTokens();
