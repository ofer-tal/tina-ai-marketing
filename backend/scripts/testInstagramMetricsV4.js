import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI;

async function testInstagramMetrics() {
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const schema = new mongoose.Schema({}, { strict: false });
  const AuthToken = mongoose.model('AuthToken', schema, 'marketing_auth_tokens');

  const tokenDoc = await AuthToken.findOne({ platform: 'instagram' });

  if (!tokenDoc?.accessToken) {
    console.error('No Instagram access token found!');
    await mongoose.connection.close();
    return;
  }

  const mediaId = '18093037919063083';
  // Try basic media fields first (not insights)
  const url = `https://graph.facebook.com/v18.0/${mediaId}?fields=ig_id,media_type,media_url,permalink,owner,timestamp,like_count,comments_count,shares_count&access_token=${tokenDoc.accessToken}`;

  console.log('Fetching Instagram media data for:', mediaId);

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error('\nInstagram API Error:', data.error.message);
      await mongoose.connection.close();
      return;
    }

    console.log('\n=== Instagram Media Data ===');
    console.log(JSON.stringify(data, null, 2));

    console.log('\n=== Basic Metrics ===');
    console.log('Likes:', data.like_count || 0);
    console.log('Comments:', data.comments_count || 0);
    console.log('Shares:', data.shares_count || 0);

  } catch (error) {
    console.error('Fetch error:', error.message);
  }

  await mongoose.connection.close();
}

testInstagramMetrics().catch(console.error);
