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
  // Use valid metrics for Instagram Reels
  const metrics = 'impressions,reach,likes,comments,shares,saved,video_views';
  const url = `https://graph.facebook.com/v18.0/${mediaId}/insights?metric=${metrics}&access_token=${tokenDoc.accessToken}`;

  console.log('Fetching Instagram metrics for media:', mediaId);
  console.log('Metrics requested:', metrics);

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error('\nInstagram API Error:', data.error.message);
      await mongoose.connection.close();
      return;
    }

    console.log('\n=== Instagram Metrics ===');

    // Parse metrics into a map
    const metricsMap = {};
    if (data.data) {
      data.data.forEach(item => {
        const value = item.values?.[0]?.value || 0;
        metricsMap[item.name] = value;
        console.log(`${item.name}: ${value}`);
      });
    }

    // Calculate engagement rate
    const views = metricsMap.video_views || metricsMap.impressions || 0;
    const likes = metricsMap.likes || 0;
    const comments = metricsMap.comments || 0;
    const shares = metricsMap.shares || 0;
    const saved = metricsMap.saved || 0;

    const engagement = likes + comments + shares + saved;
    const engagementRate = views > 0 ? ((engagement / views) * 100).toFixed(2) : 0;

    console.log('\n=== Calculated ===');
    console.log('Views:', views);
    console.log('Likes:', likes);
    console.log('Comments:', comments);
    console.log('Shares:', shares);
    console.log('Saved:', saved);
    console.log('Total Engagement:', engagement);
    console.log('Engagement Rate:', engagementRate + '%');

  } catch (error) {
    console.error('Fetch error:', error.message);
  }

  await mongoose.connection.close();
}

testInstagramMetrics().catch(console.error);
