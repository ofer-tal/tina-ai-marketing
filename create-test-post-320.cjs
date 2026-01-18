#!/usr/bin/env node

/**
 * Create a test post for Feature #320 workflow testing
 */

const http = require('http');

const API_BASE = 'http://localhost:3001';
const uniqueId = Date.now();

const contentData = {
  storyId: '678eabcfa123456789abcdef',
  platform: 'tiktok',
  contentType: 'image',
  title: `WORKFLOW_TEST_320_${uniqueId}`,
  caption: `Feature #320 workflow test - ${uniqueId}`,
  hashtags: ['#feature320', '#workflow', '#test'],
  scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
};

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port || 3001,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function createTestPost() {
  console.log('Creating test post for Feature #320 workflow...');
  console.log(JSON.stringify(contentData, null, 2));

  const response = await makeRequest('POST', '/api/content/posts/create', contentData);

  if (response.status === 201 || response.status === 200) {
    const post = response.data.data;
    console.log('\n✓ Test post created successfully!');
    console.log(`Post ID: ${post._id}`);
    console.log(`Title: ${post.title}`);
    console.log(`Status: ${post.status}`);
    console.log('\nYou can now test the workflow in the UI at http://localhost:5173/content/library');
    console.log(`Search for the title: ${post.title}`);
  } else {
    console.error('✗ Failed to create test post');
    console.error(JSON.stringify(response.data, null, 2));
    process.exit(1);
  }
}

createTestPost().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
