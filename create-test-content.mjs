import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/blush';
const client = new MongoClient(uri);

async function createTestContent() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();
    const postsCollection = db.collection('marketing_posts');

    // Check if test content already exists
    const existing = await postsCollection.findOne({
      title: { $regex: 'TEST_EDIT_CAPTION' }
    });

    if (existing) {
      console.log('⚠️  Test content already exists, deleting old test data...');
      await postsCollection.deleteMany({ title: { $regex: 'TEST_EDIT_CAPTION' } });
    }

    // Create test content item
    const testPost = {
      title: 'TEST_EDIT_CAPTION_12345',
      description: 'Test content for verifying caption editing feature',
      platform: 'tiktok',
      status: 'draft',
      contentType: 'video',
      videoPath: '/test/video.mp4',
      caption: 'Original caption for testing - PLEASE EDIT ME',
      hashtags: ['#test', '#original', '#editme'],
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      storyId: new mongoose.Types.ObjectId(),
      storyName: 'Test Story',
      storyCategory: 'Romance',
      generatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await postsCollection.insertOne(testPost);
    console.log('✅ Test content created with ID:', result.insertedId);
    console.log('📝 Title:', testPost.title);
    console.log('📝 Caption:', testPost.caption);
    console.log('🏷️  Hashtags:', testPost.hashtags.join(', '));

    await client.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTestContent();
