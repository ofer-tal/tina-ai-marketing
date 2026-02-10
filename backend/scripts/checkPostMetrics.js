import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI;

async function checkMetrics() {
  await mongoose.connect(uri);

  const schema = new mongoose.Schema({}, { strict: false });
  const MarketingPost = mongoose.model('MarketingPost', schema, 'marketing_posts');

  const post = await MarketingPost.findById('69884d71a1eae8dba9e64d04');

  console.log('=== Multi-Platform Post Stats ===');
  console.log('ID:', post._id);
  console.log('Title:', post.title);
  console.log('Status:', post.status);
  console.log('\n--- Per-Platform Performance Metrics ---');

  if (post.platformStatus) {
    ['tiktok', 'instagram'].forEach(platform => {
      const data = post.platformStatus[platform];
      console.log(`\n${platform.toUpperCase()}:`);
      console.log('  Status:', data?.status);
      console.log('  Performance metrics:', JSON.stringify(data?.performanceMetrics, null, 2));
    });
  }

  console.log('\n--- Legacy Performance Metrics ---');
  console.log('Overall:', JSON.stringify(post.performanceMetrics, null, 2));

  await mongoose.connection.close();
}

checkMetrics().catch(console.error);
