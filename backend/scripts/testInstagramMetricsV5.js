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
  // Try basic fields that should exist
  const url = `https://graph.facebook.com/v18.0/${mediaId}?fields=ig_id,media_type,media_url,permalink,owner,timestamp,like_count,comments_count&access_token=${tokenDoc.accessToken}`;

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
    console.log('IG ID:', data.ig_id);
    console.log('Media Type:', data.media_type);
    console.log('Permalink:', data.permalink);
    console.log('Timestamp:', data.timestamp);
    console.log('Likes:', data.like_count || 0);
    console.log('Comments:', data.comments_count || 0);

    // Now try insights
    console.log('\n--- Fetching Insights ---');
    const insightsUrl = `https://graph.facebook.com/v18.0/${mediaId}/insights?metric=likes,comments,saved&access_token=${tokenDoc.accessToken}`;
    const insightsResponse = await fetch(insightsUrl);
    const insightsData = await insightsResponse.json();

    if (insightsData.data) {
      insightsData.data.forEach(item => {
        const value = item.values?.[0]?.value || 0;
        console.log(`${item.name}: ${value}`);
      });
    } else if (insightsData.error) {
      console.log('Insights error:', insightsData.error.message);
    }

  } catch (error) {
    console.error('Fetch error:', error.message);
  }

  await mongoose.connection.close();
}

testInstagramMetrics().catch(console.error);
