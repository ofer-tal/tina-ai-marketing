import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;

// Recreate the exact schema from backend/models/MarketingPost.js
const marketingPostSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  platform: {
    type: String,
    enum: ['tiktok', 'instagram', 'youtube_shorts'],
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'ready', 'approved', 'scheduled', 'posted', 'failed', 'rejected'],
    default: 'draft',
    required: true
  },
  contentType: {
    type: String,
    enum: ['video', 'image', 'carousel'],
    default: 'video'
  },
  caption: { type: String, trim: true },
  hashtags: [{ type: String }],
  storyName: String,
  storyCategory: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const MarketingPost = mongoose.model('MarketingPost', marketingPostSchema);

async function testQuery() {
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');

  // First, check raw collection
  const db = mongoose.connection.db;
  const rawCount = await db.collection('marketing_posts').countDocuments();
  console.log(`\n📊 Raw collection count: ${rawCount}`);

  // Check distinct platforms in raw data
  const rawPlatforms = await db.collection('marketing_posts').distinct('platform');
  console.log(`📊 Raw platforms:`, rawPlatforms);

  // Check distinct statuses in raw data
  const rawStatuses = await db.collection('marketing_posts').distinct('status');
  console.log(`📊 Raw statuses:`, rawStatuses);

  // Now query with Mongoose model
  console.log('\n🔍 Querying with Mongoose model...');
  const mongooseCount = await MarketingPost.countDocuments();
  console.log(`📊 Mongoose count: ${mongooseCount}`);

  const mongoosePosts = await MarketingPost.find({}).limit(5);
  console.log(`\n📄 Sample Mongoose posts (${mongoosePosts.length}):`);
  mongoosePosts.forEach(p => {
    console.log(`- ${p._id} | ${p.title || '(no title)'} | ${p.platform} | ${p.status}`);
  });

  await mongoose.connection.close();
}

testQuery().catch(console.error);
