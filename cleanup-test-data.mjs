import mongoose from 'mongoose';
import dotenv from 'dotenv';
import MarketingPost from './backend/models/MarketingPost.js';

dotenv.config();

async function cleanupTestData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    await MarketingPost.deleteMany({
      title: { $in: ['TEST_SEARCH_ROMANCE_12345', 'TEST_SEARCH_FANTASY_67890', 'TEST_POST_THIRD_11111'] }
    });
    console.log('Test data cleaned up successfully');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

cleanupTestData();
