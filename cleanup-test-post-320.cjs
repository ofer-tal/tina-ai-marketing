#!/usr/bin/env node

/**
 * Cleanup test post for Feature #320
 */

const http = require('http');

const API_BASE = 'http://localhost:3001';
const POST_ID = '696c9d35d13bbfa57077b51f';

function makeRequest(method, path) {
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
    req.end();
  });
}

async function cleanup() {
  console.log('Cleaning up test post for Feature #320...');
  console.log(`Post ID: ${POST_ID}\n`);

  const response = await makeRequest('DELETE', `/api/content/posts/${POST_ID}`);

  if (response.status === 200) {
    console.log('✓ Test post deleted successfully!');
  } else {
    console.log(`⚠ Failed to delete. Status: ${response.status}`);
  }
}

cleanup().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
