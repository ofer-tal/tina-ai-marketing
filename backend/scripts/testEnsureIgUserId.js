/**
 * Test ensureInstagramUserId method
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

import instagramPostingService from '../services/instagramPostingService.js';
import databaseService from '../services/database.js';

async function test() {
  await databaseService.connect();

  // Clear any cached Instagram User ID
  instagramPostingService.instagramUserId = null;
  instagramPostingService.instagramBusinessAccountId = null;

  console.log('Testing ensureInstagramUserId...');
  const result = await instagramPostingService.ensureInstagramUserId();

  console.log('Result:', JSON.stringify(result, null, 2));

  if (result.success) {
    console.log('\n✓ Instagram User ID:', result.instagramUserId);
    console.log('✓ Service now has instagramUserId:', instagramPostingService.instagramUserId);
  }

  process.exit(0);
}

test().catch(console.error);
