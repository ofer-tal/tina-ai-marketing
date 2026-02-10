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

console.log('=== FULL POST DATA ===');
console.log('Title:', post.title);
console.log('Status:', post.status);
console.log('ScheduledAt:', post.scheduledAt);
console.log('PostedAt:', post.postedAt);
console.log('CreatedAt:', post.createdAt);
console.log('\n--- LEGACY FIELDS ---');
console.log('tiktokVideoId:', post.tiktokVideoId);
console.log('tiktokShareUrl:', post.tiktokShareUrl);
console.log('instagramMediaId:', post.instagramMediaId);
console.log('instagramPermalink:', post.instagramPermalink);

console.log('\n--- PLATFORM STATUS ---');
console.log('TikTok:');
console.log('  status:', post.platformStatus?.tiktok?.status);
console.log('  mediaId:', post.platformStatus?.tiktok?.mediaId);
console.log('  shareUrl:', post.platformStatus?.tiktok?.shareUrl);
console.log('  postedAt:', post.platformStatus?.tiktok?.postedAt);
console.log('Instagram:');
console.log('  status:', post.platformStatus?.instagram?.status);
console.log('  mediaId:', post.platformStatus?.instagram?.mediaId);
console.log('  permalink:', post.platformStatus?.instagram?.permalink);
console.log('  postedAt:', post.platformStatus?.instagram?.postedAt);

console.log('\n--- CAPTION (for matching) ---');
const captionPreview = post.caption ? post.caption.substring(0, 100) : 'NO CAPTION';
console.log('Caption (first 100 chars):', captionPreview);

await mongoose.connection.close();
