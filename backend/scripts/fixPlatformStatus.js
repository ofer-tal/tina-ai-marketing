/**
 * Fix posts with platforms array but no platformStatus
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function main() {
  console.log('Fixing posts with platforms array but no platformStatus...');

  await mongoose.connect(process.env.MONGODB_URI);
  const collection = mongoose.connection.collection('marketing_posts');

  // Find posts with platforms but no platformStatus
  const posts = await collection.find({
    platforms: { $exists: true, $ne: null },
    platformStatus: { $exists: false }
  }).toArray();

  console.log(`Found ${posts.length} posts to fix`);

  for (const post of posts) {
    const platforms = post.platforms || [post.platform];
    const status = post.status || 'draft';

    const platformStatusUpdates = {};
    for (const platform of platforms) {
      let platformStatusValue = { status: 'pending' };

      if (status === 'posted') {
        platformStatusValue.status = 'posted';
        platformStatusValue.postedAt = post.postedAt || post.approvedAt || new Date();
        if (platform === 'tiktok') {
          platformStatusValue.mediaId = post.tiktokVideoId;
          platformStatusValue.shareUrl = post.tiktokShareUrl;
        } else if (platform === 'instagram') {
          platformStatusValue.mediaId = post.instagramMediaId;
          platformStatusValue.permalink = post.instagramPermalink;
        }
      } else if (status === 'failed') {
        platformStatusValue.status = 'failed';
        platformStatusValue.error = post.postingError || 'Posting failed';
      }

      platformStatusUpdates[`platformStatus.${platform}`] = platformStatusValue;
    }

    await collection.updateOne(
      { _id: post._id },
      { $set: platformStatusUpdates }
    );

    console.log(`Fixed post ${post._id} (${platforms.join(', ')})`);
  }

  console.log('Done!');
  await mongoose.disconnect();
}

main();
