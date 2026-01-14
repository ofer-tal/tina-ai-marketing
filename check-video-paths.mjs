import MarketingPost from './backend/models/MarketingPost.js';
import { connectToDatabase } from './backend/services/database.js';

await connectToDatabase();

const posts = await MarketingPost.find({}).limit(5);
console.log('Found', posts.length, 'posts\n');

posts.forEach(p => {
  console.log('Title:', p.title);
  console.log('  contentType:', p.contentType);
  console.log('  Has videoPath:', !!p.videoPath, p.videoPath || '');
  console.log('  Has imagePath:', !!p.imagePath, p.imagePath || '');
  console.log('  Has caption:', !!p.caption);
  console.log('  Has hashtags:', !!p.hashtags, p.hashtags?.length || 0);
  console.log('---');
});

process.exit(0);
