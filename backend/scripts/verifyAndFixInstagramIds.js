import dotenv from 'dotenv';
dotenv.config();
import { MongoClient } from 'mongodb';

const FACEBOOK_GRAPH_API = 'https://graph.facebook.com/v18.0';
const IG_USER_ID = '17841480157857414';

async function testMediaId(mediaId, pageAccessToken) {
  const insightsUrl = `${FACEBOOK_GRAPH_API}/${mediaId}/insights?metric=impressions`;
  const resp = await fetch(insightsUrl, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${pageAccessToken}` }
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    process.stdout.write(`Error fetching insights: ${errorText}\n`);
    return false;
  }

  const data = await resp.json();

  if (data.error) {
    process.stdout.write(`API Error: ${data.error.message}\n`);
    return false;
  }

  if (data.data && Array.isArray(data.data)) {
    process.stdout.write(`Found ${data.data.length} insight metrics\n`);
    for (const metric of data.data) {
      const value = metric.values?.[0]?.value || 'N/A';
      process.stdout.write(`  - ${metric.name}: ${value}\n`);
    }
  } else {
    process.stdout.write(`No insights data array\n`);
  }

  return resp.ok && !data.error;
}

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    process.stdout.write('Connected to MongoDB\n');

    const db = client.db();
    const tokens = db.collection('marketing_auth_tokens');

    const token = await tokens.findOne({ platform: 'instagram' });

    if (!token || !token.accessToken) {
      process.stdout.write('ERROR: No Instagram access token\n');
      await client.close();
      process.exit(1);
    }

    let pageAccessToken = token.metadata?.pageAccessToken;

    // Get Page Access Token if needed
    if (!pageAccessToken && token.metadata?.pageId) {
      process.stdout.write('Fetching Page Access Token...\n');
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
          process.stdout.write('Page Access Token fetched\n');
        }
      }
    }

    if (!pageAccessToken) {
      process.stdout.write('ERROR: No Page Access Token\n');
      await client.close();
      process.exit(1);
    }

    process.stdout.write('\n=== Testing media IDs for smoking gun post ===\n');

    const posts = db.collection('marketing_posts');
    const smokingGunPost = await posts.findOne({ _id: '698b0417e644774ef82b3eb1' });

    if (!smokingGunPost) {
      process.stdout.write('ERROR: Post not found\n');
      await client.close();
      process.exit(1);
    }

    const storedId = smokingGunPost.instagramMediaId;
    const permalink = smokingGunPost.platformStatus?.instagram?.permalink;

    process.stdout.write(`Stored mediaId: ${storedId}\n`);
    process.stdout.write(`Permalink: ${permalink}\n`);

    // Test stored ID
    process.stdout.write(`\n=== Testing stored ID: ${storedId} ===\n`);
    const storedWorks = await testMediaId(storedId, pageAccessToken);
    process.stdout.write(`Result: ${storedWorks ? 'WORKS' : 'FAILS'}\n`);

    // Test correct ID
    const correctId = '3829651129524890758';
    process.stdout.write(`\n=== Testing correct ID: ${correctId} ===\n`);
    const correctWorks = await testMediaId(correctId, pageAccessToken);
    process.stdout.write(`Result: ${correctWorks ? 'WORKS' : 'FAILS'}\n`);

    process.stdout.write('\n=== SUMMARY ===\n');
    if (storedWorks) {
      process.stdout.write('ERROR: Stored ID works but should not!\n');
    } else if (correctWorks) {
      process.stdout.write('SOLUTION: Update all posts to use correct ID\n');
      process.stdout.write(`  Correct ID ${correctId} should replace ${storedId}\n`);
    } else {
      process.stdout.write('ERROR: Correct ID also fails!\n');
      process.stdout.write('May need to verify Instagram Business account setup\n');
    }

    await client.close();

  } catch (error) {
    process.stdout.write(`ERROR: ${error.message}\n`);
    if (error.stack) process.stdout.write(`${error.stack}\n`);
    await client.close();
    process.exit(1);
  }
}

main();
