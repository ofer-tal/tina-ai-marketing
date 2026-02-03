import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const uri = process.env.MONGODB_URI;

async function testQuery() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collection = db.collection('marketing_posts');

    // Exact query from posting scheduler
    const now = new Date();
    console.log(`Current time (UTC): ${now.toISOString()}`);
    console.log(`Current time (PST): ${now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}\n`);

    const scheduledContent = await collection.find({
      status: 'approved',
      scheduledAt: { $lte: now },
      videoPath: { $exists: true, $ne: null }
    }).toArray();

    console.log(`Found ${scheduledContent.length} posts with scheduler query:\n`);

    for (const post of scheduledContent) {
      console.log('ID:', post._id.toString());
      console.log('Title:', post.title?.substring(0, 50));
      console.log('Status:', post.status);
      console.log('Scheduled At:', post.scheduledAt);
      console.log('Video Path:', post.videoPath);
      console.log('---');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testQuery();
