import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;

async function checkCollections() {
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log('\n📁 Collections in database:');
  collections.forEach(c => {
    console.log(`- ${c.name}`);
  });

  // Check marketing_posts specifically
  const postsCount = await db.collection('marketing_posts').countDocuments();
  console.log(`\n📊 marketing_posts count: ${postsCount}`);

  // Get one sample post
  const sample = await db.collection('marketing_posts').findOne();
  console.log('\n📄 Sample post:', JSON.stringify(sample, null, 2));

  await mongoose.connection.close();
}

checkCollections().catch(console.error);
