/**
 * Test Instagram Business Account Discovery
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

import AuthToken from '../models/AuthToken.js';
import databaseService from '../services/database.js';

async function testDiscovery() {
  await databaseService.connect();

  const token = await AuthToken.getActiveToken('instagram');

  if (!token || !token.accessToken) {
    console.log('No Instagram token found. Please authorize first.');
    process.exit(1);
  }

  console.log('=== Instagram Business Account Discovery Test ===\n');

  const baseURL = 'https://graph.facebook.com/v18.0';
  const PAGE_ID = '1002795712911665'; // From granular_scopes

  // Step 1: Get Page access token directly
  console.log('Step 1: Fetching Page access token...');
  const pageUrl = `${baseURL}/${PAGE_ID}?fields=id,name,access_token`;
  const pageResp = await fetch(pageUrl, {
    headers: { 'Authorization': `Bearer ${token.accessToken}` }
  });

  if (!pageResp.ok) {
    console.log('ERROR: Failed to fetch Page');
    process.exit(1);
  }

  const page = await pageResp.json();
  console.log('Found Page:', page.name, `(${page.id})`);
  console.log('Has Page Access Token:', !!page.access_token);

  // Step 2: Get Instagram accounts
  console.log('\nStep 2: Fetching Instagram accounts...');
  const pageId = page.id;
  const pageAccessToken = page.access_token;
  const igAccountsUrl = `${baseURL}/${pageId}/instagram_accounts`;
  const igAccountsResp = await fetch(igAccountsUrl, {
    headers: { 'Authorization': `Bearer ${pageAccessToken}` }
  });

  if (!igAccountsResp.ok) {
    const error = await igAccountsResp.json();
    console.log('ERROR: Failed to fetch Instagram accounts');
    console.log(error);
    process.exit(1);
  }

  const igAccountsData = await igAccountsResp.json();
  console.log('Found Instagram accounts:', igAccountsData.data?.length || 0);

  if (!igAccountsData.data || igAccountsData.data.length === 0) {
    console.log('ERROR: No Instagram accounts found');
    process.exit(1);
  }

  const igAccountId = igAccountsData.data[0].id;
  console.log('Instagram Account ID:', igAccountId);

  // Step 3: Get business_discovery info
  console.log('\nStep 3: Fetching business_discovery info...');
  const businessDiscUrl = `${baseURL}/${page.id}?fields=business_discovery.username(blush.spicy){id,username,profile_picture_url}`;
  const businessDiscResp = await fetch(businessDiscUrl, {
    headers: { 'Authorization': `Bearer ${pageAccessToken}` }
  });

  if (businessDiscResp.ok) {
    const businessDiscData = await businessDiscResp.json();
    console.log('Business Discovery:', JSON.stringify(businessDiscData.business_discovery, null, 2));

    // Store the Instagram User ID in token metadata
    if (businessDiscData.business_discovery) {
      token.metadata = token.metadata || {};
      token.metadata.instagramUserId = businessDiscData.business_discovery.id;
      token.metadata.instagramUsername = businessDiscData.business_discovery.username;
      token.metadata.pageId = page.id;
      await token.save();
      console.log('\n✓ Instagram User ID stored in token metadata');
    }
  }

  // Step 4: Test creating a media container
  console.log('\nStep 4: Testing media container creation...');
  const testVideoUrl = 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4';
  const createParams = new URLSearchParams({
    video_url: testVideoUrl,
    caption: 'Test post from Blush Marketing',
    media_type: 'REELS',
  });

  const createUrl = `${baseURL}/${igAccountId}/media?${createParams}`;
  const createResp = await fetch(createUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${pageAccessToken}` }
  });

  console.log('Create container status:', createResp.status);
  const createData = await createResp.json();
  console.log('Response:', JSON.stringify(createData, null, 2));

  if (createData.id) {
    console.log('\n✓ SUCCESS: Media container created! ID:', createData.id);
  }

  process.exit(0);
}

testDiscovery().catch(console.error);
