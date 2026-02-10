import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI;

async function checkPost() {
  await mongoose.connect(uri);

  const schema = new mongoose.Schema({}, { strict: false });
  const MarketingPost = mongoose.model('MarketingPost', schema, 'marketing_posts');

  const post = await MarketingPost.findById('69884d7ba1eae8dba9e64d14');

  console.log('=== 3pm Post Status ===');
  console.log('ID:', post._id);
  console.log('Overall status:', post.status);
  console.log('scheduledAt:', post.scheduledAt);
  console.log('\nPlatform statuses:');
  console.log('  TikTok:', JSON.stringify(post.platformStatus?.tiktok, null, 2));
  console.log('  Instagram:', JSON.stringify(post.platformStatus?.instagram, null, 2));

  await mongoose.connection.close();
}

checkPost().catch(console.error);
