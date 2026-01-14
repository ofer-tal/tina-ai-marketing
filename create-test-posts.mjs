import mongoose from 'mongoose';
import dotenv from 'dotenv';
import MarketingPost from './backend/models/MarketingPost.js';

dotenv.config();

const testPosts = [
  {
    title: 'TEST_SEARCH_ROMANCE_12345',
    description: 'Test post for search functionality - romance',
    platform: 'tiktok',
    status: 'approved',
    caption: 'This is a test romance story with keyword SEARCH_ROMANCE',
    hashtags: ['#romance', '#test', '#blush'],
    scheduledAt: new Date(),
    storyId: new mongoose.Types.ObjectId(),
    storyName: 'The Duke\'s Secret SEARCH_ROMANCE',
    storyCategory: 'Historical Romance',
    storySpiciness: 1,
    contentType: 'video',
    videoPath: '/test/video1.mp4'
  },
  {
    title: 'TEST_SEARCH_FANTASY_67890',
    description: 'Test post for search functionality - fantasy',
    platform: 'instagram',
    status: 'draft',
    caption: 'Fantasy adventure test with keyword SEARCH_FANTASY',
    hashtags: ['#fantasy', '#magic', '#test'],
    scheduledAt: new Date(),
    storyId: new mongoose.Types.ObjectId(),
    storyName: 'The Dragon\'s SEARCH_FANTASY Quest',
    storyCategory: 'Fantasy Romance',
    storySpiciness: 2,
    contentType: 'video',
    videoPath: '/test/video2.mp4'
  },
  {
    title: 'TEST_POST_THIRD_11111',
    description: 'Third test post for filtering',
    platform: 'youtube_shorts',
    status: 'posted',
    caption: 'Posted test content with unique identifier',
    hashtags: ['#youtube', '#shorts', '#test'],
    scheduledAt: new Date(),
    postedAt: new Date(),
    storyId: new mongoose.Types.ObjectId(),
    storyName: 'Modern Romance TEST_POST_THIRD',
    storyCategory: 'Contemporary Romance',
    storySpiciness: 0,
    contentType: 'video',
    videoPath: '/test/video3.mp4'
  }
];

async function createTestData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clean up existing test data
    await MarketingPost.deleteMany({
      title: { $in: testPosts.map(p => p.title) }
    });
    console.log('Cleaned up old test data');

    // Insert new test data
    const inserted = await MarketingPost.insertMany(testPosts);
    console.log(`Created ${inserted.length} test posts:`);
    inserted.forEach(post => {
      console.log(`- ${post.title} (${post.platform}, ${post.status})`);
    });

    await mongoose.disconnect();
    console.log('\nTest data created successfully!');
    process.exit(0);

  } catch (error) {
    console.error('Error creating test data:', error);
    process.exit(1);
  }
}

createTestData();
