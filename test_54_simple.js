#!/usr/bin/env node

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4001';

async function testGeneration() {
  console.log('Testing RunPod video generation...');

  try {
    const response = await fetch(`${API_BASE}/api/video/generate/runpod`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'A romantic beach sunset',
        spiciness: 1,
        duration: 5
      })
    });

    console.log(`Response status: ${response.status}`);

    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('\n✓ SUCCESS: Video generation working!');
    } else {
      console.log('\n✗ FAILED:', data.error);
    }
  } catch (error) {
    console.error('✗ ERROR:', error.message);
  }
}

testGeneration();
