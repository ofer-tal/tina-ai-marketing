import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI;

async function checkMediaIds() {
  await mongoose.connect(uri);

  const schema = new mongoose.Schema({}, { strict: false });
  const MarketingPost = mongoose.model('MarketingPost', schema, 'marketing_posts');

  const post = await MarketingPost.findById('69884d71a1eae8dba9e64d04');

  console.log('=== Post Media IDs ===');
  console.log('Instagram Media ID (legacy):', post.instagramMediaId);
  console.log('Instagram Media ID (platformStatus):', post.platformStatus?.instagram?.mediaId);
  console.log('TikTok Video ID (legacy):', post.tiktokVideoId);
  console.log('TikTok Video ID (platformStatus):', post.platformStatus?.tiktok?.mediaId);

  await mongoose.connection.close();
}

checkMediaIds().catch(console.error);
