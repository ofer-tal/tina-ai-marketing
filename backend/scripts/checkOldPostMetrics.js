import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI;

async function checkOldPost() {
  await mongoose.connect(uri);

  const schema = new mongoose.Schema({}, { strict: false });
  const AuthToken = mongoose.model('AuthToken', schema, 'marketing_auth_tokens');
  const MarketingPost = mongoose.model('MarketingPost', schema, 'marketing_posts');

  const tokenDoc = await AuthToken.findOne({ platform: 'instagram' });

  if (!tokenDoc?.accessToken) {
    console.error('No Instagram access token found!');
    await mongoose.connection.close();
    return;
  }

  // Find an older Instagram post
  const oldPost = await MarketingPost.findOne({
    platforms: 'instagram',
    status: 'posted',
    'platformStatus.instagram.mediaId': { $exists: true, $ne: null }
  }).sort({ postedAt: 1 }).limit(1);

  if (!oldPost) {
    console.log('No older posts found');
    await mongoose.connection.close();
    return;
  }

  const mediaId = oldPost.platformStatus?.instagram?.mediaId || oldPost.instagramMediaId;
  console.log('\n=== Checking older post ===');
  console.log('Title:', oldPost.title);
  console.log('Posted At:', oldPost.postedAt);
  console.log('Media ID:', mediaId);

  // Fetch basic media data
  const url = `https://graph.facebook.com/v18.0/${mediaId}?fields=ig_id,media_type,permalink,timestamp,like_count,comments_count&access_token=${tokenDoc.accessToken}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error('\nInstagram API Error:', data.error.message);
      await mongoose.connection.close();
      return;
    }

    console.log('\n=== Instagram Media Data ===');
    console.log('Timestamp:', data.timestamp);
    console.log('Likes:', data.like_count || 0);
    console.log('Comments:', data.comments_count || 0);
    console.log('Permalink:', data.permalink);

  } catch (error) {
    console.error('Fetch error:', error.message);
  }

  await mongoose.connection.close();
}

checkOldPost().catch(console.error);
