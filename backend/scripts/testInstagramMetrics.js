import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

import oauthManager from '../services/oauthManager.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('test-instagram-metrics', 'scripts');

async function testInstagramMetrics() {
  const mediaId = '18093037919063083'; // From our multi-platform post

  console.log('Testing Instagram metrics fetch for mediaId:', mediaId);

  try {
    // Get Instagram access token
    const token = await oauthManager.getToken('instagram');
    console.log('Token exists:', !!token);
    console.log('Token accessToken:', !!token?.accessToken);

    if (!token?.accessToken) {
      console.error('No Instagram access token available!');
      console.log('Please authenticate Instagram first.');
      return;
    }

    // Fetch metrics from Instagram Graph API
    const baseUrl = 'https://graph.facebook.com/v18.0';
    const url = `${baseUrl}/${mediaId}/insights?metric=engagement,impressions,reach,shares&access_token=${token.accessToken}`;

    console.log('Fetching from:', url.replace(token.accessToken, 'REDACTED'));

    const response = await fetch(url);
    const data = await response.json();

    console.log('\nResponse:', JSON.stringify(data, null, 2));

    if (data.error) {
      console.error('Instagram API Error:', data.error);
    } else {
      // Parse metrics
      const metrics = {};
      if (data.data) {
        data.data.forEach(item => {
          metrics[item.name] = item.values[0]?.value || 0;
        });
      }

      console.log('\n=== Parsed Metrics ===');
      console.log('Engagement:', metrics.engagement || 0);
      console.log('Impressions (views):', metrics.impressions || 0);
      console.log('Reach:', metrics.reach || 0);
      console.log('Shares:', metrics.shares || 0);
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }

  process.exit(0);
}

testInstagramMetrics();
