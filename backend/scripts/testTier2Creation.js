/**
 * Direct test of tier_2 post creation
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

const { createPost } = await import('../services/tinaTools/postManagementTools.js');

console.log('=== TESTING TIER_2 POST CREATION ===\n');

const testParams = {
  storyId: '6984ccc8fb5a974975d1f251', // Whispers of the Crimson Court
  platforms: ['instagram'],
  contentTier: 'tier_2',
  avatarId: '6983e7c73341d911310ad671', // Abbey
  script: 'Test script for tier_2 post - this should work!',
  scheduleFor: '2026-02-08T22:00:00',
  generateVideo: false
};

console.log('Parameters:', JSON.stringify(testParams, null, 2));
console.log('\nCalling createPost...\n');

try {
  const result = await createPost(testParams);
  
  console.log('=== RESULT ===');
  console.log(JSON.stringify(result, null, 2));
  console.log('\nSuccess:', result.success);
  console.log('Created:', result.created);
  
  if (result.posts && result.posts.length > 0) {
    console.log('\nPost IDs:', result.posts.map(p => p.id));
  }
} catch (error) {
  console.error('=== ERROR ===');
  console.error('Message:', error.message);
  console.error('Stack:', error.stack);
}

process.exit(0);
