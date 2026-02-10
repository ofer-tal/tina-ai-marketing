import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/blush';

async function main() {
  await mongoose.connect(MONGODB_URI);

  // Use ObjectId for the query
  const { ObjectId } = mongoose.Types;
  const post = await mongoose.connection.collection('marketing_posts').findOne({ _id: new ObjectId('695aea83422803d890b06cbf') });

  if (!post) {
    console.log('Post not found, trying to find any post with metrics...');
    const anyPost = await mongoose.connection.collection('marketing_posts').findOne({
      performanceMetrics: { $exists: true },
      'performanceMetrics.views': { $gt: 0 }
    });
    if (anyPost) {
      console.log('Found post:', anyPost._id.toString());
      console.log('\n=== Aggregate Metrics ===');
      console.log(JSON.stringify(anyPost.performanceMetrics, null, 2));
      console.log('\n=== Per-Platform Metrics ===');
      console.log('TikTok:', JSON.stringify(anyPost.platformStatus?.tiktok?.performanceMetrics || null, null, 2));
      console.log('Instagram:', JSON.stringify(anyPost.platformStatus?.instagram?.performanceMetrics || null, null, 2));
      console.log('YouTube:', JSON.stringify(anyPost.platformStatus?.youtube_shorts?.performanceMetrics || null, null, 2));
    } else {
      console.log('No posts with metrics found');
    }
  } else {
    console.log('Post ID:', post._id.toString());
    console.log('\n=== Aggregate Metrics ===');
    console.log(JSON.stringify(post.performanceMetrics, null, 2));
    console.log('\n=== Per-Platform Metrics (TikTok) ===');
    console.log(JSON.stringify(post.platformStatus?.tiktok?.performanceMetrics, null, 2));
    console.log('\n=== Last Fetched At ===');
    console.log('platformStatus.tiktok.lastFetchedAt:', post.platformStatus?.tiktok?.lastFetchedAt);
  }

  await mongoose.disconnect();
}

main().catch(console.error);
