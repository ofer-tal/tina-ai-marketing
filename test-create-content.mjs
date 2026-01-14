import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;

async function createTestContent() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');

    const db = client.db();
    const posts = db.collection('marketing_posts');

    const count = await posts.countDocuments();
    console.log('📊 Total posts:', count);

    // Check for existing test content
    const existing = await posts.findOne({ title: /TEST_EDIT_CAPTION/ });
    if (existing) {
      console.log('🗑️  Deleting old test content...');
      await posts.deleteMany({ title: /TEST_EDIT_CAPTION/ });
    }

    // Create new test content
    const timestamp = Date.now();
    const testPost = {
      title: 'TEST_EDIT_CAPTION_12345',
      description: 'Test content for verifying caption editing feature',
      platform: 'tiktok',
      status: 'draft',
      contentType: 'video',
      caption: 'Original caption PLEASE EDIT ME_' + timestamp,
      hashtags: ['#test', '#original', '#editme_' + timestamp],
      storyName: 'Test Story',
      storyCategory: 'Romance',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await posts.insertOne(testPost);
    console.log('✅ Test content created ID:', result.insertedId);
    console.log('📝 Caption:', testPost.caption);
    console.log('🏷️  Hashtags:', testPost.hashtags.join(', '));

    await client.close();
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

createTestContent();
