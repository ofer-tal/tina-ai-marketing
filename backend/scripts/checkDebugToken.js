/**
 * Check debug_token response
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

import AuthToken from '../models/AuthToken.js';
import databaseService from '../services/database.js';

async function test() {
  await databaseService.connect();

  const token = await AuthToken.getActiveToken('instagram');

  if (!token || !token.accessToken) {
    console.log('No Instagram token found');
    process.exit(1);
  }

  console.log('Token found');
  console.log('Token (first 50 chars):', token.accessToken.substring(0, 50) + '...');

  // Test debug_token endpoint
  console.log('\n=== Testing debug_token ===');
  const debugUrl = 'https://graph.facebook.com/v18.0/debug_token?input_token=' + token.accessToken;
  console.log('URL:', debugUrl);

  const debugResp = await fetch(debugUrl);
  console.log('Status:', debugResp.status);
  console.log('Content-Type:', debugResp.headers.get('content-type'));

  const debugText = await debugResp.text();
  console.log('Response text:', debugText.substring(0, 500));

  try {
    const debugData = JSON.parse(debugText);
    console.log('\nParsed JSON:');
    console.log(JSON.stringify(debugData, null, 2));
  } catch (e) {
    console.log('Failed to parse as JSON');
  }

  // Also test with appsecret_proof
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  if (appSecret) {
    console.log('\n=== Testing debug_token with appsecret_proof ===');
    const crypto = await import('crypto');
    const appsecret_proof = crypto.createHmac('sha256', appSecret)
      .update(token.accessToken)
      .digest('hex');

    const debugUrl2 = `https://graph.facebook.com/v18.0/debug_token?input_token=${token.accessToken}&appsecret_proof=${appsecret_proof}`;
    const debugResp2 = await fetch(debugUrl2);
    const debugData2 = await debugResp2.json();
    console.log('With appsecret_proof:', JSON.stringify(debugData2, null, 2).substring(0, 500));
  }

  process.exit(0);
}

test().catch(console.error);
