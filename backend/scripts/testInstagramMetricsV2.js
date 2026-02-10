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

  // Get the auth token directly
  const schema = new mongoose.Schema({}, { strict: false });
  const AuthToken = mongoose.model('AuthToken', schema, 'marketing_auth_tokens');

  const tokenDoc = await AuthToken.findOne({ platform: 'instagram' });
  console.log('Token doc exists:', !!tokenDoc);
  console.log('Has accessToken:', !!tokenDoc?.accessToken);

  if (!tokenDoc?.accessToken) {
    console.error('No Instagram access token found in database!');
    await mongoose.connection.close();
    return;
  }

  const mediaId = '18093037919063083';
  const url = `https://graph.facebook.com/v18.0/${mediaId}/insights?metric=engagement,impressions,reach,shares,like_count,comment_count&access_token=${tokenDoc.accessToken}`;

  console.log('Fetching Instagram metrics...');

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log('\n=== Instagram API Response ===');
    console.log(JSON.stringify(data, null, 2));

    if (data.error) {
      console.error('\nInstagram API Error:', data.error.message);
      if (data.error.code === 190) {
        console.error('Error code 190 means token has expired. Need to re-authenticate.');
      }
    } else if (data.data) {
      console.log('\n=== Parsed Metrics ===');
      data.data.forEach(item => {
        const value = item.values?.[0]?.value || 0;
        console.log(`${item.name}: ${value}`);
      });
    }
  } catch (error) {
    console.error('Fetch error:', error.message);
  }

  await mongoose.connection.close();
}

testInstagramMetrics().catch(console.error);
