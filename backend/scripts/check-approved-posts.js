import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const uri = process.env.MONGODB_URI;

async function checkApprovedPosts() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collection = db.collection('marketing_posts');

    // Find all approved posts
    const approved = await collection.find({ status: 'approved' }).toArray();

    console.log(`Found ${approved.length} approved posts:\n`);

    for (const post of approved) {
      console.log('ID:', post._id.toString());
      console.log('Title:', post.title?.substring(0, 50));
      console.log('Platform:', post.platform);
      console.log('Status:', post.status);
      console.log('Scheduled At:', post.scheduledAt);
      console.log('Video Path:', post.videoPath || 'NO VIDEO');
      console.log('Has videoPath:', !!post.videoPath);
      console.log('---');
    }

    // Also check for posts with scheduledAt in the past
    const now = new Date();
    console.log(`\nCurrent time: ${now.toISOString()}`);
    console.log(`Current time PST: ${now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`);

    const pastScheduled = await collection.find({
      scheduledAt: { $lte: now }
    }).toArray();

    console.log(`\nPosts with scheduledAt in the past: ${pastScheduled.length}`);
    for (const post of pastScheduled) {
      console.log(`  - ${post.title?.substring(0,40)}: status=${post.status}, scheduledAt=${post.scheduledAt}, hasVideo=${!!post.videoPath}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkApprovedPosts();
