/**
 * Test script for Platform Optimization API
 */

const testContent = {
  videoPath: '/storage/videos/test-video.mp4',
  caption: 'A steamy romance story about a forbidden office romance that will leave you wanting more. Read the full story on the Blush app! #romance #spicy #forbidden',
  hashtags: ['#romance', '#spicy', '#forbidden', '#blush', '#lovestory', '#romancebooks', '#spicyfiction', '#steamy'],
  storyId: '507f1f77bcf86cd799439011',
  title: 'Forbidden Office Romance',
  category: 'Romance',
  spiciness: 2,
  videoDuration: 30,
  videoResolution: { width: 1080, height: 1920 }
};

async function testPlatformOptimization() {
  const baseUrl = 'http://localhost:3003';

  console.log('🧪 Testing Platform Optimization API\n');

  // Test 1: Get platform specs
  console.log('Test 1: Getting platform specifications...');
  try {
    const response = await fetch(`${baseUrl}/api/platform-optimization/specs`);
    const data = await response.json();
    if (data.success) {
      console.log('✅ Platform specs retrieved');
      console.log('   Available platforms:', Object.keys(data.data).join(', '));
    } else {
      console.log('❌ Failed to get platform specs:', data.error);
    }
  } catch (error) {
    console.log('❌ Error fetching specs:', error.message);
  }

  console.log('\nTest 2: Generate base content...');
  try {
    const response = await fetch(`${baseUrl}/api/platform-optimization/base`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testContent)
    });
    const data = await response.json();
    if (data.success) {
      console.log('✅ Base content generated');
      console.log('   Caption length:', data.data.captionLength);
      console.log('   Hashtag count:', data.data.hashtagCount);
      return data.data; // Return for next tests
    } else {
      console.log('❌ Failed to generate base content:', data.error);
      return null;
    }
  } catch (error) {
    console.log('❌ Error generating base content:', error.message);
    return null;
  }
}

async function testPlatformOptimizations(baseContent) {
  if (!baseContent) {
    console.log('\n⚠️  Skipping platform optimization tests (no base content)');
    return;
  }

  const platforms = ['tiktok', 'instagram', 'youtube'];

  for (const platform of platforms) {
    console.log(`\nTest ${platforms.indexOf(platform) + 3}: Create ${platform}-optimized version...`);
    try {
      const response = await fetch(`http://localhost:3003/api/platform-optimization/${platform}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseContent)
      });
      const data = await response.json();
      if (data.success) {
        console.log(`✅ ${platform} optimization created`);
        console.log('   Caption length:', data.data.caption.length);
        console.log('   Hashtag count:', data.data.hashtags.length);
        console.log('   Meets specs:', data.data.videoSpecs.meetsSpecs);
      } else {
        console.log(`❌ Failed to create ${platform} optimization:`, data.error);
      }
    } catch (error) {
      console.log(`❌ Error creating ${platform} optimization:`, error.message);
    }
  }

  console.log('\nTest 6: Verify all platforms...');
  try {
    const response = await fetch('http://localhost:3003/api/platform-optimization/verify-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(baseContent)
    });
    const data = await response.json();
    if (data.success) {
      console.log('✅ All platforms verified');
      console.log('   Summary:', data.data.summary);
      console.log('   TikTok verified:', data.data.platforms.tiktok.verified);
      console.log('   Instagram verified:', data.data.platforms.instagram.verified);
      console.log('   YouTube verified:', data.data.platforms.youtube.verified);
    } else {
      console.log('❌ Failed to verify platforms:', data.error);
    }
  } catch (error) {
    console.log('❌ Error verifying platforms:', error.message);
  }
}

async function runTests() {
  const baseContent = await testPlatformOptimization();
  await testPlatformOptimizations(baseContent);
  console.log('\n✅ Tests complete');
}

runTests();
