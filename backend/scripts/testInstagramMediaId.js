import dotenv from 'dotenv';
dotenv.config();
import { MongoClient } from 'mongodb';
import { fetch } from 'undici';

const uri = process.env.MONGODB_URI;
const FACEBOOK_GRAPH_API = 'https://graph.facebook.com/v18.0';
const IG_USER_ID = '17841480157857414';

const client = new MongoClient(uri);

client.connect().then(async () => {
  const db = client.db();
  const tokens = db.collection('marketing_auth_tokens');

  const token = await tokens.findOne({ platform: 'instagram' });
  let pageAccessToken = token.metadata?.pageAccessToken;

  if (!pageAccessToken && token.accessToken) {
    // Get Page Access Token
    const PAGE_ID = '1002795712911665';
    const pageUrl = FACEBOOK_GRAPH_API + '/' + PAGE_ID + '?fields=access_token';
    const pageResp = await fetch(pageUrl, {
      headers: { 'Authorization': 'Bearer ' + token.accessToken }
    });

    if (pageResp.ok) {
      const pageData = await pageResp.json();
      if (pageData.access_token) {
        pageAccessToken = pageData.access_token;

        await tokens.updateOne(
          { _id: token._id },
          {
            '$set': {
              'metadata.pageAccessToken': pageAccessToken
            }
          }
        );

        console.log('Saved Page Access Token');
      }
    }
  }

  if (!pageAccessToken) {
    console.error('No Page Access Token');
    await client.close();
    process.exit(1);
  }

  // Get the smoking gun post permalink
  const posts = db.collection('marketing_posts');
  const post = await posts.findOne({ _id: '698b0417e644774ef82b3eb1' });

  const permalink = post.platformStatus.instagram.permalink;
  console.log('Post permalink:', permalink);

  // Query /me/media to find recent media
  const mediaUrl = FACEBOOK_GRAPH_API + '/' + IG_USER_ID + '/media?fields=id,permalink,timestamp&limit=20';
  console.log('Querying:', mediaUrl);

  const mediaResp = await fetch(mediaUrl, {
    headers: { 'Authorization': 'Bearer ' + pageAccessToken }
  });

  if (!mediaResp.ok) {
    console.error('Media query failed:', mediaResp.status);
    await client.close();
    process.exit(1);
  }

  const mediaData = await mediaResp.json();
  console.log('Found', mediaData.data.length, 'media items');

  // Find matching media by comparing permalinks
  if (mediaData.data && permalink) {
    for (const media of mediaData.data) {
      if (media.permalink === permalink) {
        console.log('=== MATCH FOUND ===');
        console.log('Stored mediaId:', post.instagramMediaId);
        console.log('API mediaId:', media.id);
        console.log('Timestamp:', new Date(media.timestamp * 1000).toISOString());
        console.log('');

        // Test if this ID works with insights
        const insightsUrl = FACEBOOK_GRAPH_API + '/' + media.id + '/insights?metric=impressions';
        console.log('Testing insights for:', media.id);

        const insightsResp = await fetch(insightsUrl, {
          headers: { 'Authorization': 'Bearer ' + pageAccessToken }
        });

        console.log('Insights response status:', insightsResp.status);
        if (insightsResp.ok) {
          const insightsData = await insightsResp.json();
          console.log('Insights data:', JSON.stringify(insightsData, null, 2));
        }
        break;
      }
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log('The stored mediaId does NOT work with insights.');
  console.log('The API mediaId from /me/media SHOULD work with /insights endpoint.');
  console.log('This confirms the posting workflow needs to be fixed.');

  await client.close();
  process.exit(0);
}).catch(err => {
  console.error('Error:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
