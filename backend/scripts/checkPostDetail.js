/**
 * Check detailed post data for debugging UI display
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const collection = mongoose.connection.collection('marketing_posts');

  const postId = '69880db5d5cebbeaa97008fb';
  const post = await collection.findOne({ _id: new mongoose.Types.ObjectId(postId) });

  if (!post) {
    console.log('Post not found');
    await mongoose.disconnect();
    return;
  }

  console.log('=== POST DETAILS ===');
  console.log('_id:', post._id);
  console.log('title:', post.title);
  console.log('platforms (type):', typeof post.platforms);
  console.log('platforms (value):', JSON.stringify(post.platforms));
  console.log('platforms (length):', Array.isArray(post.platforms) ? post.platforms.length : 'N/A');
  console.log('platforms length > 1:', Array.isArray(post.platforms) && post.platforms.length > 1);
  console.log('platform (legacy):', post.platform);
  console.log('status:', post.status);

  // Simulate what the frontend does
  console.log('\n=== FRONTEND SIMULATION ===');
  const isMultiPlatform = post.platforms && Array.isArray(post.platforms) && post.platforms.length > 1;
  console.log('isMultiPlatform():', isMultiPlatform);

  const getPostPlatforms = (p) => {
    if (p.platforms && Array.isArray(p.platforms) && p.platforms.length > 0) {
      return p.platforms;
    }
    return p.platform ? [p.platform] : [];
  };
  console.log('getPostPlatforms():', getPostPlatforms(post));

  await mongoose.disconnect();
}

main();
