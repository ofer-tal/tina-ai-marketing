import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;

async function checkBoth() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  console.log('Collection 1: marketing_posts');
  const mpCount = await db.collection('marketing_posts').countDocuments();
  console.log(`  Count: ${mpCount}`);

  console.log('\nCollection 2: marketingposts');
  const mp2Count = await db.collection('marketingposts').countDocuments();
  console.log(`  Count: ${mp2Count}`);

  if (mp2Count > 0) {
    const sample = await db.collection('marketingposts').findOne();
    console.log('\nSample from marketingposts:');
    console.log(JSON.stringify(sample, null, 2));
  }

  await mongoose.connection.close();
}

checkBoth().catch(console.error);
