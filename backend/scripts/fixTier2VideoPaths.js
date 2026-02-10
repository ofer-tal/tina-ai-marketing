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
  const db = mongoose.connection.db;

  console.log('\n=== Fixing tier_2 video paths ===\n');

  // Find all tier_2 posts with Windows paths in videoPath
  const posts = await db.collection('marketing_posts').find({
    contentTier: 'tier_2',
    videoPath: { $regex: '^C:\\\\Projects', $options: 'i' }
  }).toArray();

  console.log(`Found ${posts.length} tier_2 posts with Windows paths\n`);

  for (const post of posts) {
    const oldVideoPath = post.videoPath;
    const oldThumbnailPath = post.thumbnailPath;

    // Extract filename from Windows path
    const videoFilename = path.basename(oldVideoPath);
    const thumbnailFilename = path.basename(oldThumbnailPath);

    // Convert to URL format
    const newVideoPath = `/storage/videos/tier2/final/${videoFilename}`;
    const newThumbnailPath = `/storage/thumbnails/${thumbnailFilename}`;

    console.log(`Post: ${post._id}`);
    console.log(`  Old video: ${oldVideoPath}`);
    console.log(`  New video: ${newVideoPath}`);

    // Update the post
    await db.collection('marketing_posts').updateOne(
      { _id: post._id },
      {
        $set: {
          videoPath: newVideoPath,
          thumbnailPath: newThumbnailPath
        }
      }
    );

    console.log(`  ✅ Fixed\n`);
  }

  console.log('Done!');
  await mongoose.disconnect();
}

main().catch(console.error);
