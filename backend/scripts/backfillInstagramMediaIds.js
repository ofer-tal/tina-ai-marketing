/**
 * Backfill Script: Fix Instagram Media IDs and Fetch Metrics
 *
 * This script fixes the issue where Instagram media IDs stored after publishing
 * don't work with the insights API. It:
 *
 * 1. Finds multi-platform posts with Instagram status='posted' but zero views
 * 2. Queries /me/media to find matching media by permalink
 * 3. Extracts the correct media ID (the one that works with insights)
 * 4. Fetches actual metrics from Instagram insights API
 * 5. Updates the database with correct media ID and metrics
 *
 * Run: node backend/scripts/backfillInstagramMediaIds.js
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { fetch } from 'undici';

// Load environment
const MONGODB_URI = process.env.MONGODB_URI;
const FACEBOOK_GRAPH_API = 'https://graph.facebook.com/v18.0';

// Instagram Business Account ID (from your Meta app)
// You can find this in: Instagram Posting Service settings or AuthToken collection
const INSTAGRAM_USER_ID = process.env.INSTAGRAM_USER_ID || '';

async function getPageAccessToken() {
  // Get from database or use env var
  const { default: AuthToken } = await import('../models/AuthToken.js');
  const tokenDoc = await AuthToken.getActiveToken('instagram');

  if (!tokenDoc) {
    console.error('No Instagram token found in database. Please authenticate first.');
    return { pageId: null, pageAccessToken: null, instagramUserId: null };
  }

  // Try to get Page Access Token from token metadata
  let pageId = tokenDoc.metadata?.pageId;
  let pageAccessToken = tokenDoc.metadata?.pageAccessToken;
  let instagramUserId = tokenDoc.metadata?.instagramUserId;

  if (!pageAccessToken && pageId) {
    // Need to fetch Page Access Token using Page ID
    console.log('Fetching Page Access Token using Page ID:', pageId);

    const userToken = tokenDoc.accessToken;
    const pageUrl = `${FACEBOOK_GRAPH_API}/${pageId}?fields=access_token`;
    const pageResp = await fetch(pageUrl, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    const pageData = await pageResp.json();

    if (pageData && pageData.access_token) {
      pageAccessToken = pageData.access_token;

      // Save to token metadata
      tokenDoc.metadata = tokenDoc.metadata || {};
      tokenDoc.metadata.pageAccessToken = pageAccessToken;
      await tokenDoc.save();

      console.log('✓ Page Access Token fetched and saved');
    } else {
      console.error('Could not fetch Page Access Token for Page:', pageId);
      return { pageId, pageAccessToken: null, instagramUserId };
    }
  }

  return { pageId, pageAccessToken, instagramUserId };
}

async function getInstagramUserId(pageAccessToken) {
  try {
    const url = `${FACEBOOK_GRAPH_API}/me/accounts?fields=instagram_business_account{id,username}`;
    const resp = await fetch(url, {
      headers: { 'Authorization': `Bearer ${pageAccessToken}` }
    });
    const data = await resp.json();

    if (data.data && data.data.length > 0) {
      const igBizAcc = data.data[0].instagram_business_account;
      if (igBizAcc) {
        return igBizAcc.id;
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting Instagram User ID:', error.message);
    return null;
  }
}

async function queryUserMedia(instagramUserId, pageAccessToken, limit = 50) {
  try {
    const url = `${FACEBOOK_GRAPH_API}/${instagramUserId}/media?fields=id,permalink,timestamp,media_type,like_count,comments_count,share_count,insights.metric(impressions,engagement,reach,saves)&limit=${limit}`;
    console.log(`\n📡 Querying: ${url}`);

    const resp = await fetch(url, {
      headers: { 'Authorization': `Bearer ${pageAccessToken}` }
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`API Error ${resp.status}: ${errorText}`);
    }

    const data = await resp.json();

    if (data.error) {
      throw new Error(`Instagram API Error: ${data.error.message}`);
    }

    return data.data || [];
  } catch (error) {
    console.error('Error querying user media:', error.message);
    return [];
  }
}

function extractShortCodeFromPermalink(permalink) {
  if (!permalink) return null;
  const match = permalink.match(/instagram\.com\/reel\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

async function backfillPosts() {
  console.log('=== Instagram Media ID & Metrics Backfill ===');
  console.log('This script will:');
  console.log('1. Find multi-platform posts with Instagram but zero views');
  console.log('2. Query /me/media to find correct media IDs');
  console.log('3. Fetch actual metrics from Instagram insights');
  console.log('4. Update database with correct media IDs and metrics\n');

  // Get Page Access Token and Instagram User ID
  const { pageAccessToken, instagramUserId } = await getPageAccessToken();
  console.log(`✓ Page Access Token: ${pageAccessToken ? 'configured' : 'MISSING'}`);

  if (!pageAccessToken) {
    console.error('\n❌ Cannot proceed without Page Access Token');
    process.exit(1);
  }

  if (instagramUserId) {
    console.log(`✓ Instagram User ID: ${instagramUserId}`);
  }

  // Get all user media
  const userIdForQuery = instagramUserId || INSTAGRAM_USER_ID;
  if (!userIdForQuery) {
    console.error('\n❌ No Instagram User ID available. Set INSTAGRAM_USER_ID in .env');
    process.exit(1);
  }

  console.log('\n📡 Fetching recent media from Instagram...');
  const userMedia = await queryUserMedia(userIdForQuery, pageAccessToken, 100);
  console.log(`✓ Found ${userMedia.length} media items`);

  // Build lookup maps: permalink -> media ID and permalink -> metrics
  const mediaByPermalink = new Map();
  const metricsByPermalink = new Map();

  for (const media of userMedia) {
    const shortCode = extractShortCodeFromPermalink(media.permalink);
    if (shortCode) {
      mediaByPermalink.set(shortCode, media.id);
      metricsByPermalink.set(shortCode, {
        views: media.insights?.metric?.values?.[0]?.impressions || media.insights?.data?.[0]?.impressions || media.like_count || 0,
        likes: media.like_count || 0,
        comments: media.comments_count || 0,
        shares: media.share_count || 0,
        saved: media.insights?.metric?.values?.[0]?.saves || media.saved || 0,
        reach: media.insights?.metric?.values?.[0]?.reach || 0,
        mediaId: media.id
      });
    }
  }

  // Find posts that need backfilling
  const MarketingPost = mongoose.model('MarketingPost', new mongoose.Schema({}, { strict: false }), 'marketing_posts');

  console.log('\n📡 Finding posts that need backfill...');

  const postsNeedingBackfill = await MarketingPost.find({
    'platforms': 'instagram',
    'platformStatus.instagram.status': 'posted',
    $or: [
      { 'platformStatus.instagram.performanceMetrics.views': { $exists: false } },
      { 'platformStatus.instagram.performanceMetrics.views': 0 },
      { 'platformStatus.instagram.performanceMetrics.views': null }
    ]
  });

  console.log(`✓ Found ${postsNeedingBackfill.length} posts needing backfill`);

  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (const post of postsNeedingBackfill) {
    try {
      const permalink = post.platformStatus?.instagram?.permalink || post.instagramPermalink;
      const shortCode = extractShortCodeFromPermalink(permalink);
      const currentMediaId = post.platformStatus?.instagram?.mediaId || post.instagramMediaId;

      console.log(`\n📝 Post: ${post.title?.substring(0, 50)}...`);
      console.log(`   Current mediaId: ${currentMediaId}`);
      console.log(`   Short code: ${shortCode || 'N/A'}`);

      if (!shortCode) {
        console.log(`   ⚠️  Could not extract short code from permalink: ${permalink}`);
        notFound++;
        continue;
      }

      const mediaData = metricsByPermalink.get(shortCode);

      if (!mediaData) {
        console.log(`   ⚠️  No matching media found in recent 100 items`);
        notFound++;
        continue;
      }

      const correctMediaId = mediaData.mediaId;
      console.log(`   Correct mediaId: ${correctMediaId}`);

      // Check if media IDs differ
      if (currentMediaId === correctMediaId) {
        console.log(`   ℹ️  Media IDs match - just updating metrics`);
      } else {
        console.log(`   ✓ Media IDs DIFFER - updating both mediaId and metrics`);
      }

      // Calculate engagement rate
      const engagementRate = mediaData.views > 0
        ? ((mediaData.likes + mediaData.comments + mediaData.shares + mediaData.saved) / mediaData.views) * 100
        : 0;

      // Update the post with correct media ID and metrics
      await MarketingPost.updateOne(
        { _id: post._id },
        {
          $set: {
            'platformStatus.instagram.mediaId': correctMediaId,
            'instagramMediaId': correctMediaId,
            'platformStatus.instagram.performanceMetrics.views': mediaData.views,
            'platformStatus.instagram.performanceMetrics.likes': mediaData.likes,
            'platformStatus.instagram.performanceMetrics.comments': mediaData.comments,
            'platformStatus.instagram.performanceMetrics.shares': mediaData.shares,
            'platformStatus.instagram.performanceMetrics.saved': mediaData.saved,
            'platformStatus.instagram.performanceMetrics.reach': mediaData.reach,
            'platformStatus.instagram.performanceMetrics.engagementRate': engagementRate,
            'platformStatus.instagram.lastFetchedAt': new Date(),
            // Also update legacy performanceMetrics
            'performanceMetrics.views': mediaData.views,
            'performanceMetrics.likes': mediaData.likes,
            'performanceMetrics.comments': mediaData.comments,
            'performanceMetrics.shares': mediaData.shares,
            'performanceMetrics.engagementRate': engagementRate,
            'metricsLastFetchedAt': new Date(),
          }
        }
      );

      console.log(`   ✓ Updated with metrics: 👁 ${mediaData.views} | ❤️ ${mediaData.likes} | 💬 ${mediaData.comments}`);
      updated++;

    } catch (error) {
      console.error(`   ❌ Error updating post: ${error.message}`);
      errors++;
    }
  }

  console.log('\n=== Backfill Complete ===');
  console.log(`✓ Updated: ${updated} posts`);
  console.log(`⚠️  Not found: ${notFound} posts`);
  console.log(`❌ Errors: ${errors} posts`);

  await mongoose.disconnect();
  process.exit(0);
}

// Run the backfill
backfillPosts().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
