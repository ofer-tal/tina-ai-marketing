/**
 * Check token validity and test basic endpoints
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const { default: AuthToken } = await import('../models/AuthToken.js');
const dbModule = await import('../services/database.js');
const databaseService = dbModule.default;

async function check() {
  await databaseService.connect();

  const token = await AuthToken.getActiveToken('instagram');

  if (!token || !token.accessToken) {
    console.log('No Instagram token found');
    process.exit(1);
  }

  const accessToken = token.accessToken;

  console.log('=== TOKEN INFO ===');
  console.log('Created:', token.createdAt);
  console.log('Last Refreshed:', token.lastRefreshedAt);
  console.log('Expires At:', token.expiresAt);
  console.log('Is Active:', token.isActive);
  console.log('');

  console.log('=== TESTING BASIC ENDPOINTS ===');
  console.log('');

  // Test 1: Simple /me endpoint
  console.log('Test 1: GET /me');
  try {
    const resp1 = await fetch('https://graph.facebook.com/v18.0/me', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    console.log('Status:', resp1.status);
    const data1 = await resp1.json();
    console.log('Response:', JSON.stringify(data1, null, 2));
  } catch (e) {
    console.log('Error:', e.message);
  }
  console.log('');

  // Test 2: Try with just the access token as URL param
  console.log('Test 2: GET /me?access_token=...');
  try {
    const resp2 = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${accessToken}`);
    console.log('Status:', resp2.status);
    const data2 = await resp2.json();
    console.log('Response:', JSON.stringify(data2, null, 2));
  } catch (e) {
    console.log('Error:', e.message);
  }
  console.log('');

  // Test 3: Check the Page ID directly
  const pageId = token.metadata?.pageId;
  console.log('Test 3: GET /' + pageId);
  try {
    const resp3 = await fetch(`https://graph.facebook.com/v18.0/${pageId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    console.log('Status:', resp3.status);
    const data3 = await resp3.json();
    console.log('Response:', JSON.stringify(data3, null, 2));
  } catch (e) {
    console.log('Error:', e.message);
  }
  console.log('');

  // Test 4: Check if we need to re-authorize
  console.log('=== RECOMMENDATION ===');
  console.log('If the above tests show token errors, you may need to re-authorize.');
  console.log('Go to Settings -> Instagram -> Connect/Reconnect');
  console.log('');

  process.exit(0);
}

check().catch(console.error);
