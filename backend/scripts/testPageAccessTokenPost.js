/**
 * Test Instagram posting with Page Access Token
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

await databaseService.connect();

const { default: MarketingPost } = await import('../models/MarketingPost.js');

async function test() {
  // Get token
  const tokenModel = await AuthToken.getActiveToken('instagram');
  const accessToken = tokenModel.accessToken;
  const pageId = tokenModel.metadata?.pageId;

  console.log('=== GETTING PAGE ACCESS TOKEN ===');
  const pageUrl = `https://graph.facebook.com/v18.0/${pageId}?fields=access_token,instagram_business_account`;
  const pageResp = await fetch(pageUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const pageData = await pageResp.json();
  const pageAccessToken = pageData.access_token;
  const igUserId = pageData.instagram_business_account.id;

  console.log('Page Access Token (first 50):', pageAccessToken.substring(0, 50) + '...');
  console.log('IG User ID:', igUserId);
  console.log('');

  // Find the failed post
  const post = await MarketingPost.findById('6984f0a359585ce5ff08a24f');
  console.log('=== POST DETAILS ===');
  console.log('Caption:', post.caption?.substring(0, 80) + '...');
  console.log('S3 URL:', post.s3Url);
  console.log('');

  // Reset post
  post.status = 'approved';
  post.error = null;
  await post.save();
  console.log('Post reset to approved status');
  console.log('');

  // STEP 1: Create container
  console.log('=== STEP 1: CREATING CONTAINER ===');
  const hashtags = ['#Blush', '#SpicyStories', '#Romance', '#BookTok', '#AudioBooks'];
  const fullCaption = `${post.caption}\n\n${hashtags.join(' ')}`;

  const params = new URLSearchParams({
    video_url: post.s3Url,
    caption: fullCaption,
    media_type: 'REELS',
  });

  const containerUrl = `https://graph.facebook.com/v18.0/${igUserId}/media?${params}`;
  console.log('Container URL:', containerUrl.substring(0, 100) + '...');

  const containerResp = await fetch(containerUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${pageAccessToken}` }
  });

  console.log('Status:', containerResp.status);
  const containerText = await containerResp.text();
  console.log('Response:', containerText.substring(0, 500));

  if (!containerResp.ok) {
    console.log('FAILED: Container creation failed');
    process.exit(1);
  }

  const containerData = JSON.parse(containerText);
  const containerId = containerData.id;
  console.log('Container ID:', containerId);
  console.log('');

  // Save container ID to post
  post.instagramContainerId = containerId;
  post.instagramContainerStatus = 'IN_PROGRESS';
  await post.save();
  console.log('Saved container ID to post');
  console.log('');

  // STEP 2: Wait for processing
  console.log('=== STEP 2: WAITING FOR CONTAINER PROCESSING ===');
  let attempts = 0;
  const maxAttempts = 20;
  let isFinished = false;

  while (!isFinished && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 3000));

    const statusUrl = `https://graph.facebook.com/v18.0/${containerId}?fields=status_code`;
    const statusResp = await fetch(statusUrl, {
      headers: { 'Authorization': `Bearer ${pageAccessToken}` }
    });

    if (statusResp.ok) {
      const statusData = await statusResp.json();
      const statusCode = statusData.status_code;
      console.log(`Attempt ${attempts + 1}/${maxAttempts}: Status = ${statusCode}`);

      if (statusCode === 'FINISHED') {
        isFinished = true;
        post.instagramContainerStatus = 'FINISHED';
        await post.save();
      } else if (statusCode === 'ERROR' || statusCode === 'EXPIRED') {
        console.log('FAILED: Container is in error or expired state');
        process.exit(1);
      }
    }

    attempts++;
  }

  if (!isFinished) {
    console.log('FAILED: Video processing timed out');
    process.exit(1);
  }

  console.log('Container processing finished!');
  console.log('');

  // STEP 3: Publish
  console.log('=== STEP 3: PUBLISHING MEDIA ===');
  const publishParams = new URLSearchParams({
    creation_id: containerId,
  });

  const publishUrl = `https://graph.facebook.com/v18.0/${igUserId}/media_publish?${publishParams}`;
  console.log('Publish URL:', publishUrl);

  const publishResp = await fetch(publishUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${pageAccessToken}` }
  });

  console.log('Status:', publishResp.status);
  const publishText = await publishResp.text();
  console.log('Response:', publishText.substring(0, 500));

  if (!publishResp.ok) {
    console.log('FAILED: Publishing failed');
    process.exit(1);
  }

  const publishData = JSON.parse(publishText);
  const mediaId = publishData.id;
  console.log('Media ID:', mediaId);
  console.log('');

  // STEP 4: Get permalink
  console.log('=== STEP 4: GETTING PERMALINK ===');
  const permalinkUrl = `https://graph.facebook.com/v18.0/${mediaId}?fields=permalink`;
  const permalinkResp = await fetch(permalinkUrl, {
    headers: { 'Authorization': `Bearer ${pageAccessToken}` }
  });

  if (permalinkResp.ok) {
    const permalinkData = await permalinkResp.json();
    const permalink = permalinkData.permalink;
    console.log('Permalink:', permalink);

    // Update post
    post.status = 'posted';
    post.postedAt = new Date();
    post.instagramMediaId = mediaId;
    post.instagramPermalink = permalink;
    await post.save();

    console.log('');
    console.log('=== SUCCESS! ===');
    console.log('Post marked as posted successfully!');
    console.log('Media ID:', mediaId);
    console.log('Permalink:', permalink);
  } else {
    console.log('WARNING: Could not fetch permalink (non-critical)');
    // Still mark as posted
    post.status = 'posted';
    post.postedAt = new Date();
    post.instagramMediaId = mediaId;
    await post.save();
    console.log('Post marked as posted (without permalink)');
  }

  process.exit(0);
}

test().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
