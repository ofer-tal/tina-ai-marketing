import { config } from 'dotenv';
config({ path: process.cwd() + '/.env' });
import { MongoClient } from 'mongodb';
const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri);

client.connect().then(async () => {
  const db = client.db();
  const tokens = db.collection('marketing_auth_tokens');
  const token = await tokens.findOne({ platform: 'instagram' });

  if (!token) {
    console.error('No Instagram token found');
    await client.close();
    process.exit(1);
  }

  // Show pageAccessToken
  let pageAccessToken = token.metadata?.pageAccessToken;

  if (!pageAccessToken && token.metadata?.pageId && token.accessToken) {
    // Fetch from Facebook API
    const PAGE_ID = token.metadata.pageId;
    const FACEBOOK_GRAPH_API = 'https://graph.facebook.com/v18.0';
    const pageUrl = FACEBOOK_GRAPH_API + '/' + PAGE_ID + '?fields=access_token';

    const fetch = await import('undici');
    const pageResp = await fetch.default(pageUrl, {
      headers: { 'Authorization': 'Bearer ' + token.accessToken }
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
      }
    }
  }

  if (pageAccessToken) {
    console.log('=== PAGE ACCESS TOKEN ===');
    console.log(pageAccessToken);
  } else {
    console.log('=== ERROR ===');
    console.log('Page Access Token not available. Ensure:');
    console.log('1. Instagram is authenticated');
    console.log('2. Token metadata has pageId:', !!token.metadata?.pageId);
    console.log('3. Run backend server to check Instagram authentication status');
  }

  await client.close();
  process.exit(0);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
