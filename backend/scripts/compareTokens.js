/**
 * Compare current token with previous tokens
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

import AuthToken from '../models/AuthToken.js';
import databaseService from '../services/database.js';

async function check() {
  await databaseService.connect();

  const currentToken = await AuthToken.getActiveToken('instagram');

  console.log('=== CURRENT TOKEN ===');
  if (currentToken) {
    console.log('  Created:', currentToken.createdAt);
    console.log('  Expires:', currentToken.expiresAt);
    console.log('  Metadata keys:', Object.keys(currentToken.metadata || {}));
    console.log('  Metadata:', JSON.stringify(currentToken.metadata, null, 2));
    console.log('  Scope:', currentToken.scope);
    console.log('  Token preview:', currentToken.accessToken?.substring(0, 50) + '...');
  } else {
    console.log('  No active token found');
  }

  // Check token history
  const allTokens = await AuthToken.find({ platform: 'instagram' })
    .sort({ createdAt: -1 })
    .limit(5);

  console.log('\n=== TOKEN HISTORY (' + allTokens.length + ' tokens) ===');
  allTokens.forEach((t, i) => {
    console.log(`\n[${i + 1}] Created: ${t.createdAt}`);
    console.log(`    Active: ${t.isActive}`);
    console.log(`    Has metadata: ${!!t.metadata}`);
    if (t.metadata) {
      console.log(`    Metadata: ${JSON.stringify(t.metadata)}`);
    }
    console.log(`    Token preview: ${t.accessToken?.substring(0, 30)}...`);
  });

  process.exit(0);
}

check().catch(console.error);
