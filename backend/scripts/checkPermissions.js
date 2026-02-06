/**
 * Check what permissions/grants we have for Instagram
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

  console.log('=== TOKEN INFO ===');
  console.log('Scopes from token object:', token.scope);
  console.log('');

  // Check token permissions using the permissions endpoint
  const accessToken = token.accessToken;

  console.log('=== CHECKING PERMISSIONS ===');
  console.log('');

  // Get app permissions
  const appId = process.env.INSTAGRAM_APP_ID;
  console.log('App ID:', appId);
  console.log('');

  // Test /me/permissions endpoint
  console.log('Test: GET /me/permissions');
  const permsUrl = `https://graph.facebook.com/v18.0/me/permissions`;
  const resp = await fetch(permsUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  console.log('Status:', resp.status);
  const data = await resp.json();
  console.log(JSON.stringify(data, null, 2));
  console.log('');

  // Also check what the OauthManager thinks our scopes are
  console.log('=== CONFIGURED SCOPES IN OAUTH MANAGER ===');
  const oauthModule = await import('../services/oauthManager.js');
  const { default: oauthManager } = oauthModule;
  const provider = oauthManager.providers.get('instagram');
  if (provider) {
    console.log('Scopes:', provider.scopes || provider.scope);
  }
  console.log('');

  console.log('=== REQUIRED PERMISSIONS FOR INSTAGRAM POSTING ===');
  console.log('- instagram_basic: Required for basic access');
  console.log('- instagram_content_publish: REQUIRED for posting content');
  console.log('- pages_read_engagement: Required to read pages');
  console.log('- pages_show_list: Required to show page list');
  console.log('');

  // Check if instagram_content_publish is in our scopes
  const hasContentPublish = token.scope?.includes('instagram_content_publish');
  console.log('Has instagram_content_publish:', hasContentPublish ? 'YES' : 'NO');
  console.log('');

  if (!hasContentPublish) {
    console.log('!!! MISSING instagram_content_publish PERMISSION !!!');
    console.log('You need to re-authorize with this permission.');
    console.log('');
  }

  process.exit(0);
}

check().catch(console.error);
