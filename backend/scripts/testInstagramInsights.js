/**
 * Test Instagram insights endpoint for stats fetching
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

// Find the posted Instagram post
const post = await MarketingPost.findOne({
  platform: 'instagram',
  instagramMediaId: { $exists: true, $ne: null }
});

console.log('=== INSTAGRAM POST ===');
console.log('Post ID:', post._id);
console.log('Instagram Media ID:', post.instagramMediaId);
console.log('');

// Get tokens
const tokenModel = await AuthToken.getActiveToken('instagram');
const accessToken = tokenModel.accessToken;
const pageId = tokenModel.metadata?.pageId;
const igUserId = tokenModel.metadata?.instagramUserId;

console.log('=== GETTING PAGE ACCESS TOKEN ===');
const pageUrl = `https://graph.facebook.com/v18.0/${pageId}?fields=access_token,instagram_business_account`;
const pageResp = await fetch(pageUrl, {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
const pageData = await pageResp.json();
const pageAccessToken = pageData.access_token;
const igUserIdFromPage = pageData.instagram_business_account?.id || igUserId;

console.log('Page Access Token (first 30):', pageAccessToken.substring(0, 30) + '...');
console.log('IG User ID:', igUserIdFromPage);
console.log('');

// Try getting user's recent media with insights
console.log('=== TESTING USER MEDIA WITH INSIGHTS ===');
// Get recent media from the user with insights metrics
const userMediaUrl = `https://graph.facebook.com/v18.0/${igUserIdFromPage}/media?fields=id,like_count,comments_count,media_type,timestamp,insights.metric(impressions)`;
console.log('URL:', userMediaUrl);

const userMediaResp = await fetch(userMediaUrl, {
  headers: { 'Authorization': `Bearer ${pageAccessToken}` }
});

console.log('Status:', userMediaResp.status);
const userMediaText = await userMediaResp.text();
console.log('Response:', userMediaText.substring(0, 1000));
console.log('');

// Try with different metric names for Reels
console.log('=== TESTING WITH VIEWS METRIC ===');
const viewsUrl = `https://graph.facebook.com/v18.0/${igUserIdFromPage}/media?fields=id,like_count,comments_count,media_type,timestamp,insights.metric(views)`;
console.log('URL:', viewsUrl);

const viewsResp = await fetch(viewsUrl, {
  headers: { 'Authorization': `Bearer ${pageAccessToken}` }
});

console.log('Status:', viewsResp.status);
const viewsText = await viewsResp.text();
console.log('Response:', viewsText.substring(0, 800));
console.log('');

// Try get all media without insights first, then get insights per media
console.log('=== TESTING GET ALL MEDIA FIRST ===');
const allMediaUrl = `https://graph.facebook.com/v18.0/${igUserIdFromPage}/media?fields=id,caption,media_type,timestamp,like_count,comments_count`;
console.log('URL:', allMediaUrl);

const allMediaResp = await fetch(allMediaUrl, {
  headers: { 'Authorization': `Bearer ${pageAccessToken}` }
});

console.log('Status:', allMediaResp.status);
const allMediaData = await allMediaResp.json();
console.log('Media count:', allMediaData.data?.length || 0);

if (allMediaData.data) {
  for (const media of allMediaData.data) {
    console.log(`Media: ${media.id} | Type: ${media.media_type} | Likes: ${media.like_count} | Comments: ${media.comments_count}`);
  }
}
console.log('');

// Now try getting insights for our specific media
console.log('=== TESTING INSIGHTS FOR SPECIFIC MEDIA ===');
// Different valid metric combinations to try
const metricSets = [
  ['impressions'],
  ['views'],
  ['reach'],
  ['engagement'],
  ['likes', 'comments', 'shares'],
];

for (const metrics of metricSets) {
  const testUrl = `https://graph.facebook.com/v18.0/${post.instagramMediaId}/insights?metric=${metrics.join(',')}`;
  console.log(`Trying metrics: ${metrics.join(',')}`);

  try {
    const testResp = await fetch(testUrl, {
      headers: { 'Authorization': `Bearer ${pageAccessToken}` }
    });

    if (testResp.ok) {
      const testData = await testResp.json();
      if (testData.data && testData.data.length > 0) {
        console.log(`  SUCCESS! Got ${testData.data.length} metrics`);
        for (const m of testData.data) {
          const val = m.values?.[0]?.value || 0;
          console.log(`    ${m.name}: ${val}`);
        }
      } else {
        console.log(`  SUCCESS but no data returned`);
      }
    } else {
      const errorText = await testResp.text();
      const errorMatch = errorText.match(/"message":"([^"]+)"/);
      console.log(`  FAILED: ${errorMatch ? errorMatch[1] : testResp.status}`);
    }
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
  }
}

process.exit(0);
