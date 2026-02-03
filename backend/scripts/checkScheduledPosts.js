import path from 'path';
import { fileURLToPath } from 'url';
import configService from '../services/config.js';
import databaseService from '../services/database.js';
import MarketingPost from '../models/MarketingPost.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env vars from project root
process.env.MONGODB_URI = configService.get('MONGODB_URI');

async function checkScheduledPosts() {
  try {
    await databaseService.connect();

    const posts = await MarketingPost.find({
      platform: 'tiktok',
      $or: [
        { status: 'approved' },
        { status: 'posting' },
        { status: 'scheduled' }
      ]
    }).sort({ scheduledAt: -1 }).limit(10);

    console.log('\n=== Recent TikTok Posts ===');
    console.log('Current time (UTC):', new Date().toISOString());
    console.log('Current time (local):', new Date().toString());
    console.log('\nPosts found:', posts.length);

    for (const p of posts) {
      const id = p._id.toString().substring(0, 8);
      console.log(`\n[${id}] ${p.title}`);
      console.log(`  Status: ${p.status}`);
      console.log(`  Scheduled: ${p.scheduledAt.toISOString()} (${p.scheduledAt.toString()})`);
      console.log(`  publishingStatus: ${p.publishingStatus || 'N/A'}`);
      console.log(`  videoPath: ${p.videoPath || 'N/A'}`);
      if (p.error) {
        console.log(`  Error: ${p.error}`);
      }
      if (p.s3Url) {
        console.log(`  S3 URL: ${p.s3Url}`);
      }
    }

    await databaseService.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkScheduledPosts();
