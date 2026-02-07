/**
 * Test TikTok video fetch with refreshed token
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const dbModule = await import('../services/database.js');
const databaseService = dbModule.default;
await databaseService.connect();

const tiktokPostingService = (await import('../services/tiktokPostingService.js')).default;

console.log('=== Testing TikTok Video Fetch ===\n');

try {
  const result = await tiktokPostingService.fetchUserVideos();
  
  if (result.success) {
    console.log('SUCCESS! Fetched', result.totalCount, 'videos from TikTok');
    console.log('\nFirst 3 videos:');
    result.videos.slice(0, 3).forEach(video => {
      console.log('  -', video.id, ':', (video.video_description || video.title || '(no description)').substring(0, 50));
    });
  } else {
    console.log('FAILED:', result.error);
  }
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}

process.exit(0);
