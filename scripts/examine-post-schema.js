import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

async function examinePostSchema() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    const posts = await db.collection('marketing_posts').find({}).toArray();

    console.log('=== EXISTING MARKETING_POSTS SCHEMA ANALYSIS ===\n');

    if (posts.length > 0) {
      const samplePost = posts[0];
      console.log('SAMPLE POST (first document):');
      console.log(JSON.stringify(samplePost, null, 2));

      console.log('\n=== ALL FIELDS FOUND ACROSS POSTS ===');
      const allFields = new Set();
      posts.forEach(p => Object.keys(p).forEach(k => allFields.add(k)));
      console.log(Array.from(allFields).sort());

      console.log('\n=== FIELD PRESENCE COUNT ===');
      Array.from(allFields).sort().forEach(field => {
        const count = posts.filter(p => p[field] !== undefined && p[field] !== null).length;
        console.log(`  ${field}: ${count}/${posts.length}`);
      });

      console.log('\n=== UNIQUE PLATFORMS ===');
      const platforms = [...new Set(posts.map(p => p.platform))];
      platforms.forEach(p => {
        console.log(`  ${p}: ${posts.filter(post => post.platform === p).length} posts`);
      });

      console.log('\n=== CHECKING FOR URL FIELDS ===');
      posts.forEach(p => {
        console.log(`\nPost ${p._id}:`);
        console.log('  videoUrl:', p.videoUrl?.substring(0, 50) + '...' || '(none)');
        console.log('  pinterestUrl:', p.pinterestUrl?.substring(0, 50) + '...' || '(none)');
        console.log('  appleTrackingUrl:', p.appleTrackingUrl?.substring(0, 50) + '...' || '(none)');
        console.log('  utmSource:', p.utmSource || '(none)');
      });
    }

  } finally {
    await client.close();
  }
}

examinePostSchema().catch(console.error);
