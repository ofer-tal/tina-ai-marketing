import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;

// Recreate the exact schema from backend/models/MarketingPost.js
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
  },
  caption: { type: String, required: true },
  hashtags: [{ type: String, trim: true }],
  scheduledAt: { type: Date, required: true },
  storyId: { type: mongoose.Schema.Types.ObjectId, required: true },
  storyName: { type: String, required: true },
  storyCategory: { type: String, required: true },
  storySpiciness: { type: Number, required: true },
}, {
  timestamps: true
});

const MarketingPost = mongoose.model('MarketingPost', marketingPostSchema);

async function testTikTok() {
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');

  // Query only TikTok posts
  console.log('\n🔍 Querying TikTok posts...');
  const tiktokPosts = await MarketingPost.find({ platform: 'tiktok' }).limit(5);
  console.log(`📊 Found ${tiktokPosts.length} TikTok posts`);

  tiktokPosts.forEach(p => {
    console.log(`- ${p._id} | "${p.title}" | ${p.status}`);
  });

  await mongoose.connection.close();
}

testTikTok().catch(console.error);
