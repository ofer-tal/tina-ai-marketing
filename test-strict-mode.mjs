import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;

// Test with strict: false
const marketingPostSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  platform: {
    type: String,
    enum: ['tiktok', 'instagram', 'youtube_shorts'],
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'ready', 'approved', 'scheduled', 'posted', 'failed', 'rejected'],
    required: true
  }
}, {
  strict: false, // Allow fields not defined in schema
  strictQuery: false // Allow queries with fields not in schema
});

const MarketingPost = mongoose.model('MarketingPost', marketingPostSchema);

async function testStrict() {
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db;

  // Count raw tiktok posts
  const rawTiktok = await db.collection('marketing_posts').countDocuments({ platform: 'tiktok' });
  console.log(`\n📊 Raw TikTok posts: ${rawTiktok}`);

  // Query with Mongoose
  const mongoosePosts = await MarketingPost.find({ platform: 'tiktok' });
  console.log(`📊 Mongoose TikTok posts (strict: false, strictQuery: false): ${mongoosePosts.length}`);

  // Try without any filters
  const allPosts = await MarketingPost.find({});
  console.log(`📊 Mongoose all posts: ${allPosts.length}`);

  await mongoose.connection.close();
}

testStrict().catch(console.error);
