import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Simple schema for test post
const testPost = {
  title: 'Test Post with Performance Metrics',
  description: 'Test post to verify performance metrics display',
  platform: 'tiktok',
  status: 'posted',
  contentType: 'video',
  videoPath: 'https://www.w3schools.com/html/mov_bbb.mp4',
  caption: 'Amazing story you need to read! 📚❤️ #romance #books',
  hashtags: ['#romance', '#books', '#reading', '#lovestory'],
  scheduledAt: new Date(Date.now() - 86400000), // Yesterday
  postedAt: new Date(Date.now() - 72000000), // Posted 20 hours ago
  storyName: 'The Billionaire\'s Secret Baby',
  storyCategory: 'Romance',
  generatedAt: new Date(Date.now() - 90000000),
  performanceMetrics: {
    views: 12543,
    likes: 852,
    comments: 47,
    shares: 23,
    engagementRate: 7.46
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

async function insertTestPost() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('marketing_posts');

    const result = await collection.insertOne(testPost);
    console.log('Test post inserted with ID:', result.insertedId);

    // Verify insertion
    const found = await collection.findOne({ _id: result.insertedId });
    console.log('Verified post:', found.title, '- Status:', found.status);

    await mongoose.disconnect();
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

insertTestPost();
