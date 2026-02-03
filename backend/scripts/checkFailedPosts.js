import path from 'path';
import { fileURLToPath } from 'url';
import configService from '../services/config.js';
import databaseService from '../services/database.js';
import MarketingPost from '../models/MarketingPost.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.MONGODB_URI = configService.get('MONGODB_URI');

async function checkFailedPosts() {
  try {
    await databaseService.connect();

    // Look for failed or posting posts from today or yesterday
    const posts = await MarketingPost.find({
      platform: 'tiktok',
      $or: [
        { status: 'failed' },
        { status: 'posting' }
      ]
    }).sort({ scheduledAt: -1 }).limit(10);

    console.log('\n=== TikTok Posts with Issues ===');
    console.log('Posts found:', posts.length);

    for (const p of posts) {
      const id = p._id.toString().substring(0, 8);
      console.log(`\n[${id}] ${p.title?.substring(0, 60)}...`);
      console.log(`  Status: ${p.status}`);
      console.log(`  Scheduled: ${p.scheduledAt?.toISOString()}`);
      console.log(`  publishingStatus: ${p.publishingStatus || 'N/A'}`);
      console.log(`  videoPath: ${p.videoPath || 'N/A'}`);
      if (p.error) {
        console.log(`  ❌ Error: ${p.error}`);
      }
      if (p.publishingError) {
        console.log(`  Publishing Error: ${p.publishingError}`);
      }
      if (p.failedAt) {
        console.log(`  Failed At: ${p.failedAt.toISOString()}`);
      }
      if (p.s3Url) {
        console.log(`  S3 URL: ${p.s3Url}`);
      }
      if (p.sheetTabUsed) {
        console.log(`  Sheet Used: ${p.sheetTabUsed}`);
      }
    }

    await databaseService.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkFailedPosts();
