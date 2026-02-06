/**
 * Check why discovery is failing
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

  console.log('Token found, expires at:', token.expiresAt);

  // Test /me/accounts endpoint
  console.log('\n=== Testing /me/accounts ===');
  const pagesUrl = 'https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token';
  const pagesResp = await fetch(pagesUrl, {
    headers: { 'Authorization': `Bearer ${token.accessToken}` }
  });
  const pagesData = await pagesResp.json();
  console.log('Status:', pagesResp.status);
  console.log('Response:', JSON.stringify(pagesData, null, 2));

  // Test debug_token endpoint
  console.log('\n=== Testing debug_token ===');
  const debugUrl = 'https://graph.facebook.com/v18.0/debug_token?input_token=' + token.accessToken;
  const debugResp = await fetch(debugUrl);
  const debugData = await debugResp.json();
  console.log('is_valid:', debugData.data?.is_valid);

  const pageScope = debugData.data?.granular_scopes?.find(s => s.scope === 'pages_show_list');
  console.log('pages_show_list scope:', JSON.stringify(pageScope, null, 2));

  // Test direct Page access
  if (pageScope?.target_ids?.[0]) {
    const pageId = pageScope.target_ids[0];
    console.log('\n=== Testing direct Page access ===');
    console.log('Page ID from scopes:', pageId);

    const pageUrl = `https://graph.facebook.com/v18.0/${pageId}?fields=id,name,access_token`;
    const pageResp = await fetch(pageUrl, {
      headers: { 'Authorization': `Bearer ${token.accessToken}` }
    });
    const pageData = await pageResp.json();
    console.log('Status:', pageResp.status);
    console.log('Response:', JSON.stringify(pageData, null, 2));

    // Test /instagram_accounts edge
    if (pageData.access_token) {
      console.log('\n=== Testing /instagram_accounts edge ===');
      const igAccountsUrl = `https://graph.facebook.com/v18.0/${pageId}/instagram_accounts`;
      const igAccountsResp = await fetch(igAccountsUrl, {
        headers: { 'Authorization': `Bearer ${pageData.access_token}` }
      });
      const igAccountsData = await igAccountsResp.json();
      console.log('Status:', igAccountsResp.status);
      console.log('Response:', JSON.stringify(igAccountsData, null, 2));
    }
  }

  process.exit(0);
}

test().catch(console.error);
