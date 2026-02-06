/**
 * Debug script to test various Facebook Graph API endpoints
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root (2 levels up from scripts dir)
dotenv.config({ path: join(__dirname, '../../.env') });

import AuthToken from '../models/AuthToken.js';
import databaseService from '../services/database.js';

async function debugInstagramApi() {
  await databaseService.connect();

  const token = await AuthToken.getActiveToken('instagram');

  if (!token || !token.accessToken) {
    console.log('No Instagram token found');
    process.exit(1);
  }

  console.log('=== TOKEN INFO ===');
  console.log('Token preview:', token.accessToken.substring(0, 30) + '...');
  console.log('Expires at:', token.expiresAt);
  console.log('Scope:', token.scope);
  console.log('Metadata:', JSON.stringify(token.metadata, null, 2));

  // Test various endpoints
  const endpoints = [
    { name: 'Basic me', url: 'https://graph.facebook.com/v18.0/me' },
    { name: 'Me with fields', url: 'https://graph.facebook.com/v18.0/me?fields=id,name,email' },
    { name: 'Me accounts (no fields)', url: 'https://graph.facebook.com/v18.0/me/accounts' },
    { name: 'Me accounts (with id,name)', url: 'https://graph.facebook.com/v18.0/me/accounts?fields=id,name' },
    { name: 'Me accounts (full)', url: 'https://graph.facebook.com/v18.0/me/accounts?fields=id,name,category,instagram_business_account{id,username},tasks,access_token' },
    { name: 'Permissions', url: 'https://graph.facebook.com/v18.0/me/permissions' },
    { name: 'v22.0 accounts', url: 'https://graph.facebook.com/v22.0/me/accounts' },
    { name: 'v21.0 accounts', url: 'https://graph.facebook.com/v21.0/me/accounts' },
    { name: 'v20.0 accounts', url: 'https://graph.facebook.com/v20.0/me/accounts' },
    { name: 'Debug token', url: `https://graph.facebook.com/v18.0/debug_token?input_token=${token.accessToken}` },
    { name: 'Me likes (test basic edge)', url: 'https://graph.facebook.com/v18.0/me/likes' },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url, {
        headers: { 'Authorization': 'Bearer ' + token.accessToken }
      });
      const data = await response.json();

      console.log('\n=== ' + endpoint.name + ' ===');
      console.log('Status:', response.status);
      console.log('Response:', JSON.stringify(data, null, 2));

      // Truncate if too long
      const jsonStr = JSON.stringify(data, null, 2);
      if (jsonStr.length > 1000) {
        console.log('(truncated, full response above)');
      }
    } catch (e) {
      console.log('\n=== ' + endpoint.name + ' === ERROR:', e.message);
    }
  }

  process.exit(0);
}

debugInstagramApi().catch(console.error);
