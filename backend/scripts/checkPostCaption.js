import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (2 levels up from scripts/ directory)
const projectRoot = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(projectRoot, '.env') });

import databaseService from '../services/database.js';
import MarketingPost from '../models/MarketingPost.js';

await databaseService.connect();

const post = await MarketingPost.findById('6984f0a359585ce5ff08a24f');

if (post) {
  console.log('Post found!');
  console.log('Status:', post.status);
  console.log('ScheduledAt (UTC):', post.scheduledAt);
  console.log('ScheduledAt (Local):', post.scheduledAt ? new Date(post.scheduledAt).toLocaleString() : 'N/A');
  console.log('Caption:', post.caption);
  console.log('Caption length:', post.caption?.length);
} else {
  console.log('Post not found');
}

await databaseService.disconnect();
