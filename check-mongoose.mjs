import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// Simple check without importing the full model
const uri = process.env.MONGODB_URI;

async function checkPosts() {
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');

  const MarketingPost = mongoose.model('MarketingPost', new mongoose.Schema({}, {strict: false}));

  const allPosts = await MarketingPost.find({}).limit(10);
  console.log('\n📊 Sample posts (raw):');
  allPosts.forEach(p => {
    console.log(`- ID: ${p._id}`);
    console.log(`  Title: "${p.title}"`);
    console.log(`  Platform: ${p.platform}`);
    console.log(`  Status: ${p.status}`);
    console.log(`  Has title field: ${!!p.title}`);
    console.log('');
  });

  const count = await MarketingPost.countDocuments();
  console.log(`Total posts in DB: ${count}`);

  await mongoose.connection.close();
}

checkPosts().catch(console.error);
