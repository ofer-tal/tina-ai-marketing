/**
 * Fix posts with empty platforms array
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function main() {
  console.log('Fixing posts with empty platforms array...');

  await mongoose.connect(process.env.MONGODB_URI);
  const collection = mongoose.connection.collection('marketing_posts');

  // Find posts with empty platforms array but have platform field
  const posts = await collection.find({
    platforms: { $exists: true, $size: 0 },
    platform: { $exists: true, $ne: null }
  }).toArray();

  console.log(`Found ${posts.length} posts with empty platforms array`);

  for (const post of posts) {
    const platform = post.platform;
    const status = post.status || 'draft';

    // Build platformStatus
    const platformStatusKey = `platformStatus.${platform}`;
    const platformStatusValue = { status: 'pending' };

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

    await collection.updateOne(
      { _id: post._id },
      {
        $set: {
          platforms: [platform],
          [platformStatusKey]: platformStatusValue
        }
      }
    );

    console.log(`Fixed post ${post._id}: ${platform} (${status})`);
  }

  console.log('Done!');
  await mongoose.disconnect();
}

main();
