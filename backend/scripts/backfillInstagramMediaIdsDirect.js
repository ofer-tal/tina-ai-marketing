/**
 * Backfill Script: Fix Instagram Media IDs and Fetch Metrics
 * Direct MongoDB version - uses native fetch
 *
 * Run: node backend/scripts/backfillInstagramMediaIdsDirect.js
 */

import dotenv from 'dotenv';
dotenv.config();

import { MongoClient } from 'mongodb';

const FACEBOOK_GRAPH_API = 'https://graph.facebook.com/v18.0';
const MONGODB_URI = process.env.MONGODB_URI;
const INSTAGRAM_USER_ID = process.env.INSTAGRAM_USER_ID || '17841480157857414';

async function fetchGet(url, token) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response;
}

async function getPageAccessTokenFromDb(client) {
  const db = client.db();
  const tokens = db.collection('marketing_auth_tokens');

  const tokenDoc = await tokens.findOne({ platform: 'instagram' });

  if (!tokenDoc) {
    throw new Error('No Instagram token found in database. Please authenticate first.');
  }

  let pageAccessToken = tokenDoc.metadata?.pageAccessToken;
  const userToken = tokenDoc.accessToken;

  // Try to discover the Facebook Page
  if (!pageAccessToken) {
    console.log('\n📡 Discovering Facebook Page...');

    const pagesUrl = `${FACEBOOK_GRAPH_API}/me/accounts?fields=id,name,access_token`;
    const pagesResp = await fetchGet(pagesUrl, userToken);

    if (!pagesResp.ok) {
      const errorText = await pagesResp.text();
      throw new Error(`Failed to query Pages: ${pagesResp.status} - ${errorText}`);
    }

    const pagesData = await pagesResp.json();

    if (pagesData.error) {
      throw new Error(`API Error: ${pagesData.error.message}`);
    }

    if (pagesData.data && pagesData.data.length > 0) {
      const page = pagesData.data.find(p => p.access_token) || pagesData.data[0];
      const pageId = page.id;
      pageAccessToken = page.access_token;

      console.log(`✓ Found Facebook Page: ${page.name}`);

      // Save to token metadata
      await tokens.updateOne(
        { _id: tokenDoc._id },
        {
          $set: {
            'metadata.pageId': pageId,
            'metadata.pageAccessToken': pageAccessToken
          }
        }
      );

      console.log(`✓ Page Access Token saved to database`);
    } else {
      throw new Error('No Facebook Pages found. Please ensure your Instagram account is connected to a Facebook Page.');
    }
  }

  if (!pageAccessToken) {
    throw new Error('Could not obtain Page Access Token. Please check authentication.');
  }

  return pageAccessToken;
}

async function queryUserMedia(instagramUserId, pageAccessToken, limit = 50) {
  // Use insights field format: metric(metric1,metric2,...)
  // Note: We fetch media first, then make separate insights call
  const fields = 'id,permalink,timestamp,media_type,like_count,comments_count,share_count';
  const url = `${FACEBOOK_GRAPH_API}/${instagramUserId}/media?fields=${fields}&limit=${limit}`;

  console.log(`\n📡 Querying: ${url.substring(0, 130)}...`);

  const resp = await fetchGet(url, pageAccessToken);

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`API Error ${resp.status}: ${errorText}`);
  }

  const data = await resp.json();

  if (data.error) {
    throw new Error(`Instagram API Error: ${data.error.message}`);
  }

  const mediaArray = data.data || [];
  console.log(`✓ Found ${mediaArray.length} media items`);

  return mediaArray;
}

async function fetchMediaInsights(mediaId, pageAccessToken) {
  // Fetch insights for a specific media
  const metrics = 'impressions,engagement,reach,saves';
  const url = `${FACEBOOK_GRAPH_API}/${mediaId}/insights?metric=${metrics}`;

  console.log(`    Fetching insights for ${mediaId}...`);

  const resp = await fetchGet(url, pageAccessToken);

  if (!resp.ok) {
    return null;
  }

  const data = await resp.json();

  if (data.error || !data.data) {
    return null;
  }

  return data.data;
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

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');

    const db = client.db();
    const posts = db.collection('marketing_posts');

    // Get Page Access Token
    const pageAccessToken = await getPageAccessTokenFromDb(client);
    console.log(`✓ Page Access Token configured: ${pageAccessToken.substring(0, 15)}...`);

    // Get all user media
    console.log('\n📡 Fetching recent media from Instagram...');
    const userMedia = await queryUserMedia(INSTAGRAM_USER_ID, pageAccessToken, 50);

    // Build lookup maps: permalink -> media ID and permalink -> metrics
    const mediaByPermalink = new Map();
    const metricsByPermalink = new Map();

    console.log('\n📊 Fetching insights for each media item...');

    for (const media of userMedia) {
      const shortCode = extractShortCodeFromPermalink(media.permalink);
      if (!shortCode) continue;

      // Fetch insights for this media
      const insightsData = await fetchMediaInsights(media.id, pageAccessToken);

      // Parse insights
      let views = media.like_count || 0;
      let likes = media.like_count || 0;
      let comments = media.comments_count || 0;
      let shares = media.share_count || 0;
      let saved = 0;
      let reach = 0;

      if (insightsData) {
        for (const insight of insightsData) {
          if (insight.name === 'impressions' && insight.values && insight.values[0]) {
            views = insight.values[0].value;
          }
          if (insight.name === 'saved' && insight.values && insight.values[0]) {
            saved = insight.values[0].value;
          }
          if (insight.name === 'reach' && insight.values && insight.values[0]) {
            reach = insight.values[0].value;
          }
        }
      }

      metricsByPermalink.set(shortCode, {
        views, likes, comments, shares, saved, reach, mediaId: media.id
      });
    }

    console.log(`✓ Built lookup maps with ${metricsByPermalink.size} entries`);

    // Find posts needing backfill
    console.log('\n📡 Finding posts needing backfill...');

    const postsNeedingBackfill = await posts.find({
      'platforms': 'instagram',
      'platformStatus.instagram.status': 'posted'
    }).toArray();

    console.log(`✓ Found ${postsNeedingBackfill.length} posts with Instagram posted`);

    // Filter to only those with zero/missing views OR where media ID differs
    const postsToUpdate = [];

    for (const post of postsNeedingBackfill) {
      const permalink = post.platformStatus && post.platformStatus.instagram && post.platformStatus.instagram.permalink;
      const currentMediaId = post.platformStatus && post.platformStatus.instagram && post.platformStatus.instagram.mediaId;
      const currentViews = post.platformStatus && post.platformStatus.instagram && post.platformStatus.instagram.performanceMetrics &&
                        post.platformStatus.instagram.performanceMetrics.views;

      // Include if views are zero/missing/null, OR if we found matching media
      const shortCode = extractShortCodeFromPermalink(permalink);
      const hasMatchingMedia = shortCode && mediaByPermalink.has(shortCode);

      if (!currentViews || currentViews === 0 || hasMatchingMedia) {
        postsToUpdate.push({
          post,
          permalink,
          shortCode,
          currentMediaId,
          currentViews: currentViews || 0,
          hasMatchingMedia
        });
      }
    }

    console.log(`✓ Of these, ${postsToUpdate.length} posts need media ID/metrics update`);

    let updated = 0;
    let notFound = 0;
    let noChange = 0;
    let errors = 0;

    for (const item of postsToUpdate) {
      const post = item.post;
      const permalink = item.permalink;
      const shortCode = item.shortCode;
      const currentMediaId = item.currentMediaId;
      const currentViews = item.currentViews;

      try {
        const title = post.title ? post.title.substring(0, 50) : 'Untitled';
        console.log(`\n📝 Post: ${title}...`);
        console.log(`   Current mediaId: ${currentMediaId || 'MISSING'}`);
        console.log(`   Current views: ${currentViews}`);
        console.log(`   Short code: ${shortCode || 'N/A'}`);

        const mediaData = metricsByPermalink.get(shortCode);

        if (!mediaData) {
          console.log(`   ⚠️  No matching media found (permalink: ${permalink})`);
          notFound++;
          continue;
        }

        const correctMediaId = mediaData.mediaId;
        console.log(`   Correct mediaId: ${correctMediaId}`);

        // Check if update needed
        if (currentMediaId === correctMediaId && currentViews > 0) {
          console.log(`   ℹ️  Media ID matches and already has views - skipping`);
          noChange++;
          continue;
        }

        // Calculate engagement rate
        const engagementRate = mediaData.views > 0
          ? ((mediaData.likes + mediaData.comments + mediaData.shares + mediaData.saved) / mediaData.views) * 100
          : 0;

        // Update the post
        const updateDoc = {
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
            'performanceMetrics.saved': mediaData.saved,
            'performanceMetrics.reach': mediaData.reach,
            'metricsLastFetchedAt': new Date(),
          }
        };

        await posts.updateOne(
          { _id: post._id },
          updateDoc
        );

        console.log(`   ✓ Updated: 👁 ${mediaData.views} | ❤️ ${mediaData.likes} | 💬 ${mediaData.comments} | 💾 ${mediaData.saved}`);
        updated++;

      } catch (error) {
        console.error(`   ❌ Error updating post: ${error.message}`);
        errors++;
      }
    }

    console.log('\n=== Backfill Complete ===');
    console.log(`✓ Updated: ${updated} posts`);
    console.log(`⚠️  Not found: ${notFound} posts`);
    console.log(`ℹ️  No change needed: ${noChange} posts`);
    console.log(`❌ Errors: ${errors} posts`);

    await client.close();

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the backfill
backfillPosts();
