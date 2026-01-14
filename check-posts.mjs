import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkPosts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('marketing_posts');

    const count = await collection.countDocuments();
    console.log('Total posts in marketing_posts:', count);

    const posts = await collection.find({}).toArray();
    console.log('Posts found:', posts.length);

    posts.forEach(post => {
      console.log(`- ${post.title} (${post.status}) - Platform: ${post.platform}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPosts();
