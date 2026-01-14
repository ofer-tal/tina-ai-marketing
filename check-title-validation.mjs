import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;

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
});

const MarketingPost = mongoose.model('MarketingPost', marketingPostSchema);

async function checkTitles() {
  await mongoose.connect(uri);

  const db = mongoose.connection.db;

  // Check posts with empty titles
  const emptyTitles = await db.collection('marketing_posts').find({
    platform: 'tiktok',
    title: ''
  }).toArray();
  console.log('📊 TikTok posts with EMPTY titles:', emptyTitles.length);

  // Check posts with non-empty titles
  const withTitles = await db.collection('marketing_posts').find({
    platform: 'tiktok',
    title: { $ne: '' }
  }).toArray();
  console.log('📊 TikTok posts with titles:', withTitles.length);

  // Try querying with Mongoose - with lean() to skip schema validation
  const leanPosts = await MarketingPost.find({}).lean();
  console.log('\n🔍 Mongoose with lean():', leanPosts.length);

  // Without lean (with schema validation)
  const strictPosts = await MarketingPost.find({});
  console.log('🔍 Mongoose with schema validation:', strictPosts.length);

  await mongoose.connection.close();
}

checkTitles().catch(console.error);
