// Run: node backend/scripts/showPageAccessToken.js
// Shows how to get Page Access Token from database

import('dotenv/config');
import { MongoClient } from 'mongodb';

dotenv.config();
const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri);

client.connect().then(async () => {
  const db = client.db();

  const tokens = db.collection('marketing_auth_tokens');
  const token = await tokens.findOne({ platform: 'instagram' });

  if (!token) {
    console.error('No Instagram token found in database');
    await client.close();
    process.exit(1);
  }

  // Show token info
  console.log('=== Instagram Token Info ===');
  console.log('Has accessToken:', !!token.accessToken);
  console.log('Metadata keys:', Object.keys(token.metadata || {}));

  if (token.metadata) {
    for (const [key, value] of Object.entries(token.metadata)) {
      console.log('  ' + key + ': ' + (typeof value === 'string' ? value.substring(0, 50) + '...' : JSON.stringify(value)));
    }
  }

  // Show pageAccessToken
  console.log('');
  console.log('=== Page Access Token ===');
  console.log('Current value in database:');
  console.log('  token.metadata.pageAccessToken:', token.metadata.pageAccessToken || 'NOT SET');

  console.log('');
  console.log('To extract the Page Access Token, run:');
  console.log('  node backend/scripts/getPageAccessToken.js');
  console.log('');
  console.log('Then use the token in your API calls with: Authorization: Bearer YOUR_PAGE_ACCESS_TOKEN');

  await client.close();
  process.exit(0);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
