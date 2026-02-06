/**
 * Check Instagram token permissions and debug info
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

  console.log('=== CHECKING TOKEN DEBUG INFO ===');
  console.log('');

  // Debug token endpoint
  const debugUrl = `https://graph.facebook.com/v18.0/debug_token?input_token=${accessToken}`;
  console.log('URL:', debugUrl);
  const resp = await fetch(debugUrl);
  const data = await resp.json();
  console.log(JSON.stringify(data, null, 2));
  console.log('');

  if (data.data) {
    const tokenInfo = data.data;
    console.log('=== TOKEN INFO ===');
    console.log('App ID:', tokenInfo.app_id);
    console.log('Type:', tokenInfo.type);
    console.log('Is Valid:', tokenInfo.is_valid);
    console.log('Expires At:', tokenInfo.expires_at ? new Date(tokenInfo.expires_at * 1000).toISOString() : 'N/A');
    console.log('Scopes:', tokenInfo.scopes);
    console.log('User ID:', tokenInfo.user_id);
    console.log('Granular Scopes:', tokenInfo.granular_scopes ? JSON.stringify(tokenInfo.granular_scopes, null, 2) : 'N/A');
    console.log('');
  }

  // Check if we need to use /me/accounts with the appsecret_proof
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  if (appSecret) {
    console.log('=== TRYING WITH APPSECRET_PROOF ===');
    const crypto = await import('crypto');
    const appsecret_proof = crypto.createHmac('sha256', appSecret)
      .update(accessToken)
      .digest('hex');

    const accountsUrl = `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,instagram_business_account&appsecret_proof=${appsecret_proof}`;
    console.log('URL:', accountsUrl);
    const resp2 = await fetch(accountsUrl);
    const data2 = await resp2.json();
    console.log(JSON.stringify(data2, null, 2));
  }

  process.exit(0);
}

check().catch(console.error);
