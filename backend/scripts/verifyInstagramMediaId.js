import dotenv from 'dotenv';
dotenv.config();

import { MongoClient } from 'mongodb';

const FACEBOOK_GRAPH_API = 'https://graph.facebook.com/v18.0';
const IG_USER_ID = '17841480157857414';

async function testMediaId(mediaId, pageAccessToken) {
  const insightsUrl = `${FACEBOOK_GRAPH_API}/${mediaId}/insights?metric=impressions`;
  console.log(`\nTesting insights API for mediaId: ${mediaId}`);

  const resp = await fetch(insightsUrl, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${pageAccessToken}` }
  });

  console.log(`  Response status: ${resp.status}`);

  if (resp.ok) {
    const data = await resp.json();
    console.log('  Response data:', JSON.stringify(data, null, 2));

    if (data.data && Array.isArray(data.data)) {
      console.log(`  Found ${data.data.length} insight metrics`);
      for (const metric of data.data) {
        console.log(`    - ${metric.name}: ${metric.values?.[0]?.value || 'N/A'}`);
      }
    } else if (data.error) {
      console.log(`  API Error: ${data.error.message} (code: ${data.error.code})`);
    }
  } else {
    const errorText = await resp.text();
    console.log(`  Error: ${errorText}`);
  }

  return resp.ok && (!data.error);
}

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const tokens = db.collection('marketing_auth_tokens');

    const token = await tokens.findOne({ platform: 'instagram' });

    if (!token || !token.accessToken) {
      console.error('No Instagram access token found');
      await client.close();
      process.exit(1);
    }

    let pageAccessToken = token.metadata?.pageAccessToken;

    // Get Page Access Token if needed
    if (!pageAccessToken && token.metadata?.pageId) {
      const PAGE_ID = '1002795712911665';
      const pageUrl = `${FACEBOOK_GRAPH_API}/${PAGE_ID}?fields=access_token`;
      const pageResp = await fetch(pageUrl, {
        headers: { 'Authorization': `Bearer ${token.accessToken}` }
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

          console.log('Page Access Token fetched');
        }
      }
    }

    if (!pageAccessToken) {
      console.error('No Page Access Token available');
      await client.close();
      process.exit(1);
    }

    console.log('\n=== Testing media IDs ===');

    // Test the smoking gun post
    const smokingGunPost = await db.collection('marketing_posts').findOne({
      _id: '698b0417e644774ef82b3eb1'
    });

    if (smokingGunPost) {
      const storedId = smokingGunPost.platformStatus?.instagram?.mediaId || smokingGunPost.instagramMediaId;
      console.log('\nSmoking Gun Post:');
      console.log('  Title:', smokingGunPost.title?.substring(0, 50));
      console.log('  Stored mediaId:', storedId);
      console.log('  Permalink:', smokingGunPost.platformStatus?.instagram?.permalink);

      // Test the stored ID (should fail - it's the publish ID)
      const storedWorks = await testMediaId(storedId, pageAccessToken);
      console.log(`  Stored ID ${storedId} works with insights: ${storedWorks ? 'YES' : 'NO'}`);

      // Also test the correct ID from insights URL
      const correctId = '3829651129524890758';
      console.log(`\nTesting correct ID ${correctId} from insights URL...`);
      const correctWorks = await testMediaId(correctId, pageAccessToken);
      console.log(`  Correct ID ${correctId} works with insights: ${correctWorks ? 'YES' : 'NO'}`);
    }

    await client.close();
    console.log('\n=== Test Complete ===');
    console.log('RESULT: The correct media ID from insights URL should be stored and used for metrics.');

  } catch (error) {
    console.error('Error:', error.message);
    if (error.stack) console.error(error.stack);
    await client.close();
    process.exit(1);
  }
}

main();
