/**
 * Test GLM API Connection
 *
 * Tests connectivity to the Z.AI GLM-4.7 API endpoint
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load from root .env (not backend/.env)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const GLM47_API_KEY = process.env.GLM47_API_KEY;
const GLM47_API_ENDPOINT = process.env.GLM47_API_ENDPOINT || 'https://api.z.ai/api/paas/v4';

async function testConnection() {
  console.log('='.repeat(60));
  console.log('GLM API Connection Test');
  console.log('='.repeat(60));

  // Check configuration
  console.log('\n1. Configuration Status:');
  console.log('   Endpoint:', GLM47_API_ENDPOINT);
  console.log('   API Key configured:', !!GLM47_API_KEY);
  console.log('   API Key length:', GLM47_API_KEY?.length || 0);

  if (!GLM47_API_KEY) {
    console.log('\n❌ API key not configured!');
    return;
  }

  console.log('\n2. Testing API connection...');

  const startTime = Date.now();

  try {
    const response = await fetch(GLM47_API_ENDPOINT + '/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + GLM47_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'glm-4.7',
        messages: [
          { role: 'user', content: 'Hello! Please respond with exactly "Connection successful"' }
        ],
        max_tokens: 50,
        temperature: 0.5
      }),
      signal: AbortSignal.timeout(60000)
    });

    const elapsed = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.log('\n❌ API call failed!');
      console.log('   Time elapsed:', elapsed + 'ms');
      console.log('   Status:', response.status);
      console.log('   Error:', errorText.substring(0, 500));
      return;
    }

    const data = await response.json();

    console.log('\n✅ API call successful!');
    console.log('   Response time:', elapsed + 'ms');
    console.log('   Response ID:', data.id);
    console.log('   Model:', data.model);

    // Log full response structure for debugging
    console.log('   Full response:', JSON.stringify(data, null, 2));

    if (data.choices && data.choices[0]) {
      const content = data.choices[0].message?.content || '(no content)';
      console.log('   Response content:', content);
    }

  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.log('\n❌ API call failed!');
    console.log('   Time elapsed:', elapsed + 'ms');
    console.log('   Error:', error.message);

    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      console.log('\n⏱️  The API request timed out after 60 seconds.');
      console.log('   This could indicate:');
      console.log('   - The API endpoint is slow or down');
      console.log('   - Network connectivity issues');
    }
  }

  console.log('\n' + '='.repeat(60));
}

testConnection().catch(err => {
  console.error('Test script error:', err);
});
