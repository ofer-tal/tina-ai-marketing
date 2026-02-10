import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

await mongoose.connect(process.env.MONGODB_URI);
const schema = new mongoose.Schema({}, { strict: false });
const MarketingPost = mongoose.model('MarketingPost', schema, 'marketing_posts');
const post = await MarketingPost.findById('69884d71a1eae8dba9e64d04');
console.log('Instagram permalink (legacy):', post.instagramPermalink);
console.log('Instagram permalink (platformStatus):', post.platformStatus?.instagram?.permalink);
console.log('Instagram shareUrl (platformStatus):', post.platformStatus?.instagram?.shareUrl);
await mongoose.connection.close();
