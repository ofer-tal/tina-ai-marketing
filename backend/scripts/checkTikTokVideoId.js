import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

await mongoose.connect(process.env.MONGODB_URI);
const schema = new mongoose.Schema({}, { strict: false });
const MarketingPost = mongoose.model('MarketingPost', schema, 'marketing_posts');
const post = await MarketingPost.findById('69884d71a1eae8dba9e64d04');
console.log('TikTok Video ID (legacy):', post.tiktokVideoId);
console.log('TikTok Video ID (platformStatus):', post.platformStatus?.tiktok?.mediaId);
console.log('TikTok Status:', post.platformStatus?.tiktok?.status);
await mongoose.connection.close();
