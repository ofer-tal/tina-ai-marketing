import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI;

async function checkMultiPlatformPosts() {
  await mongoose.connect(uri);

  const schema = new mongoose.Schema({}, { strict: false });
  const MarketingPost = mongoose.model('MarketingPost', schema, 'marketing_posts');

  // Find all multi-platform posts
  const posts = await MarketingPost.find({
    platforms: { $exists: true, $ne: [] }
  }).sort({ postedAt: -1 }).limit(5);

  console.log(`=== Found ${posts.length} multi-platform posts ===\n`);

  for (const post of posts) {
    console.log(`Post: ${post.title}`);
    console.log(`  ID: ${post._id}`);
    console.log(`  Status: ${post.status}`);
    console.log(`  PostedAt: ${post.postedAt}`);
    console.log(`  Platforms: ${JSON.stringify(post.platforms)}`);
    console.log(`\n  Platform Status:`);

    if (post.platforms) {
      for (const platform of post.platforms) {
        const ps = post.platformStatus?.[platform];
        console.log(`    ${platform}:`);
        console.log(`      status: ${ps?.status || 'N/A'}`);
        console.log(`      mediaId: ${ps?.mediaId || 'N/A'}`);
        console.log(`      postedAt: ${ps?.postedAt || 'N/A'}`);
        if (ps?.performanceMetrics) {
          console.log(`      metrics: views=${ps.performanceMetrics.views}, likes=${ps.performanceMetrics.likes}, comments=${ps.performanceMetrics.comments}`);
        }
      }
    }

    console.log(`\n  Legacy performanceMetrics:`);
    console.log(`    views: ${post.performanceMetrics?.views || 0}`);
    console.log(`    likes: ${post.performanceMetrics?.likes || 0}`);
    console.log(`    engagementRate: ${post.performanceMetrics?.engagementRate || 0}`);
    console.log('');
  }

  await mongoose.connection.close();
}

checkMultiPlatformPosts().catch(console.error);
