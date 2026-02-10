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

  // The 11am post ID - use ObjectId
  const { ObjectId } = mongoose.Types;
  const postId = new ObjectId('69884d71a1eae8dba9e64d04');

  const post = await db.collection('marketing_posts').findOne({ _id: postId });

  if (post) {
    console.log('\n=== 11:00 AM Post Details ===\n');
    console.log('ID:', post._id.toString());
    console.log('Title:', post.title);
    console.log('Status:', post.status);
    console.log('Platforms:', JSON.stringify(post.platforms || post.platform));
    console.log('Content Tier:', post.contentTier);
    console.log('Video Path:', post.videoPath || 'NULL');
    console.log('Thumbnail Path:', post.thumbnailPath || 'NULL');
    console.log('Scheduled At:', post.scheduledAt);
    console.log('Platform Status:', JSON.stringify(post.platformStatus, null, 2));

    // Check approval history
    if (post.approvalHistory && post.approvalHistory.length > 0) {
      console.log('\n=== Approval History ===');
      post.approvalHistory.forEach(h => {
        console.log(`- ${h.action} at ${new Date(h.timestamp).toISOString()} by ${h.userId}`);
      });
    }
  } else {
    console.log('Post not found!');
  }

  await mongoose.disconnect();
}

main().catch(console.error);
