// Manual sync script for multi-platform Instagram metrics
// Usage: node backend/scripts/manualSyncInstagramMetrics.js

import { config } from 'dotenv';
config({ path: process.cwd() + '/.env' });
import { MongoClient, ObjectId } from 'mongodb';
import { fetch } from 'undici';

const FACEBOOK_GRAPH_API = 'https://graph.facebook.com/v18.0';
const IG_USER_ID = '17841480157857414';

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const posts = db.collection('marketing_posts');

    // Find multi-platform posts with Instagram posted
    const multiPlatformPosts = await posts.find({
      'platforms': 'instagram',
      'platformStatus.instagram.status': 'posted'
    }).toArray();

    console.log(`Found ${multiPlatformPosts.length} multi-platform posts with Instagram posted`);

    if (multiPlatformPosts.length === 0) {
      console.log('No multi-platform Instagram posts found');
      await client.close();
      process.exit(0);
    }

    // Get Page Access Token
    const tokens = db.collection('marketing_auth_tokens');
    const token = await tokens.findOne({ platform: 'instagram' });

    let pageAccessToken = token.metadata?.pageAccessToken;

    if (!pageAccessToken && token.metadata?.pageId && token.accessToken) {
      console.log('Fetching Page Access Token...');
      const PAGE_ID = '1002795712911665';
      const pageUrl = `${FACEBOOK_GRAPH_API}/${PAGE_ID}?fields=access_token`;
      const pageResp = await fetch(pageUrl, {
        headers: { 'Authorization': `Bearer ${token.accessToken}` }
      });

      if (pageResp.ok) {
        const pageData = await pageResp.json();
        if (pageData.access_token) {
          pageAccessToken = pageData.access_token;

          // Save to database
          await tokens.updateOne(
            { _id: token._id },
            {
              '$set': {
                'metadata.pageAccessToken': pageAccessToken
              }
            }
          );

          console.log('Page Access Token fetched');
        }
      }
    }

    if (!pageAccessToken) {
      console.error('Cannot proceed without Page Access Token');
      await client.close();
      process.exit(1);
    }

    console.log('Page Access Token:', pageAccessToken ? pageAccessToken.substring(0, 30) + '...' : 'MISSING');

    let synced = 0;
    let notFound = 0;

    // Process each post
    for (const post of multiPlatformPosts) {
      const permalink = post.platformStatus?.instagram?.permalink || post.instagramPermalink;
      const shortCode = permalink ? permalink.match(/instagram\.com\/reel\/([A-Za-z0-9_-]+)/)?.[1] : null;

      if (!shortCode) {
        console.log(`Skipping post ${post._id}: no permalink found`);
        notFound++;
        continue;
      }

      console.log(`Processing post ${post._id} (${shortCode})...`);

      // Query /me/media to find correct media ID
      const mediaUrl = `${FACEBOOK_GRAPH_API}/${IG_USER_ID}/media?fields=id,permalink&limit=50`;
      const mediaResp = await fetch(mediaUrl, {
        headers: { 'Authorization': `Bearer ${pageAccessToken}` }
      });

      if (!mediaResp.ok) {
        console.error('Media query failed:', mediaResp.status);
        continue;
      }

      const mediaData = await mediaResp.json();

      if (mediaData.error) {
        console.error('Instagram API error:', mediaData.error.message);
        continue;
      }

      const mediaItems = mediaData.data || [];

      // Find matching media by short code
      let mediaItem = mediaItems.find(m => {
        const itemShortCode = m.permalink ? m.permalink.match(/instagram\.com\/reel\/([A-Za-z0-9_-]+)/)?.[1] : null;
        return itemShortCode === shortCode;
      });

      const correctMediaId = mediaItem ? mediaItem.id : null;

      if (!mediaItem) {
        console.log(` ⚠️  No matching media found for ${shortCode}`);
        notFound++;
        continue;
      }

      if (correctMediaId) {
        console.log(`✓ Found correct media ID: ${correctMediaId}`);

        // Fetch insights - for Reels use 'views' not 'impressions'
        const insightsUrl = `${FACEBOOK_GRAPH_API}/${correctMediaId}/insights?metric=views,reach,saved,likes,comments,shares`;
        const insightsResp = await fetch(insightsUrl, {
          headers: { 'Authorization': `Bearer ${pageAccessToken}` }
        });

        if (!insightsResp.ok) {
          const errorText = await insightsResp.text();
          console.error('Insights fetch failed:', insightsResp.status, errorText.substring(0, 200));
          continue;
        }

        const insightsData = await insightsResp.json();

        if (insightsData.error) {
          console.error('Insights API error:', insightsData.error.message);
          continue;
        }

        // Extract metrics
        let views = 0;
        let likes = 0;
        let comments = 0;
        let shares = 0;
        let saved = 0;
        let reach = 0;

        if (Array.isArray(insightsData.data)) {
          for (const metric of insightsData.data) {
            const value = metric.values?.[0]?.value || 0;

            if (metric.name === 'views') {
              views = value;
            } else if (metric.name === 'likes') {
              likes = value;
            } else if (metric.name === 'comments') {
              comments = value;
            } else if (metric.name === 'shares') {
              shares = value;
            } else if (metric.name === 'saved') {
              saved = value;
            } else if (metric.name === 'reach') {
              reach = value;
            }
          }
        }

        // Update database
        await posts.updateOne(
          { _id: post._id },
          {
            '$set': {
              'platformStatus.instagram.performanceMetrics': {
                views,
                likes,
                comments,
                shares,
                saved,
                reach,
                engagementRate: views > 0 ? ((likes + comments + shares) / views * 100).toFixed(2) : 0
              },
              'platformStatus.instagram.lastFetchedAt': new Date().toISOString()
            }
          }
        );

        synced++;

        console.log(`✓ Synced post ${post._id}: 👁 ${views} | ❤️ ${likes} | 💬 ${comments} | 🔗 ${shares}`);
      } else {
        console.log(`Failed to sync post ${post._id}`);
      }
    }

    await client.close();

    console.log('\n=== Sync Complete ===');
    console.log(`✓ Synced ${synced} posts`);
    console.log(`⚠️  Not found: ${notFound} posts`);
    console.log('Next: Restart backend server so Instagram Reels Matcher job can pick up these changes');

  } catch (error) {
    console.error('Fatal error:', error.message);
  } finally {
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
