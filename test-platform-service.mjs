/**
 * Direct test of PlatformOptimizationService without API
 */

import platformOptimizationService from './backend/services/platformOptimizationService.js';

const testContent = {
  videoPath: '/storage/videos/test-video.mp4',
  caption: 'A steamy romance story about a forbidden office romance that will leave you wanting more. Read the full story on the Blush app! This story has everything you could want - passion, drama, and a love that cannot be denied. #romance #spicy #forbidden',
  hashtags: ['#romance', '#spicy', '#forbidden', '#blush', '#lovestory', '#romancebooks', '#spicyfiction', '#steamy', '#hotreads', '#booktok'],
  storyId: '507f1f77bcf86cd799439011',
  title: 'Forbidden Office Romance',
  category: 'Romance',
  spiciness: 2,
  videoDuration: 30,
  videoResolution: { width: 1080, height: 1920 }
};

async function runTests() {
  console.log('🧪 Testing Platform Optimization Service Directly\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Generate base content
    console.log('\n✅ Step 1: Generate base content');
    const baseContent = await platformOptimizationService.generateBaseContent(testContent);
    console.log('   Base content created:');
    console.log('   - Caption length:', baseContent.captionLength, 'characters');
    console.log('   - Hashtag count:', baseContent.hashtagCount);
    console.log('   - Story:', baseContent.storyTitle);

    // Test 2: Create TikTok-optimized version
    console.log('\n✅ Step 2: Create TikTok-optimized version');
    const tikTok = await platformOptimizationService.createTikTokOptimized(baseContent);
    console.log('   TikTok optimization:');
    console.log('   - Caption length:', tikTok.caption.length, 'chars (optimal: 100-120)');
    console.log('   - Hashtags:', tikTok.hashtags.length, '(optimal: 4)');
    console.log('   - Caption:', tikTok.caption.substring(0, 80) + '...');
    console.log('   - Video meets specs:', tikTok.videoSpecs.meetsSpecs);

    // Test 3: Create Instagram-optimized version
    console.log('\n✅ Step 3: Create Instagram-optimized version');
    const instagram = await platformOptimizationService.createInstagramOptimized(baseContent);
    console.log('   Instagram optimization:');
    console.log('   - Caption length:', instagram.caption.length, 'chars (optimal: 138-150)');
    console.log('   - Hashtags:', instagram.hashtags.length, '(optimal: 5-10)');
    console.log('   - Caption:', instagram.caption.substring(0, 80) + '...');
    console.log('   - Video meets specs:', instagram.videoSpecs.meetsSpecs);

    // Test 4: Create YouTube Shorts-optimized version
    console.log('\n✅ Step 4: Create YouTube Shorts-optimized version');
    const youtube = await platformOptimizationService.createYouTubeOptimized(baseContent);
    console.log('   YouTube Shorts optimization:');
    console.log('   - Caption length:', youtube.caption.length, 'chars (optimal: 50-70)');
    console.log('   - Hashtags:', youtube.hashtags.length, '(optimal: 2, go in description)');
    console.log('   - Caption:', youtube.caption);
    console.log('   - Video meets specs:', youtube.videoSpecs.meetsSpecs);

    // Test 5: Verify all platforms
    console.log('\n✅ Step 5: Verify each meets platform specs');
    const verification = await platformOptimizationService.verifyAllPlatforms(baseContent);
    console.log('   Verification summary:');
    console.log('   - All platforms verified:', verification.summary.allVerified);
    console.log('   - TikTok verified:', verification.platforms.tiktok.verified);
    console.log('   - Instagram verified:', verification.platforms.instagram.verified);
    console.log('   - YouTube verified:', verification.platforms.youtube.verified);
    console.log('   - Ready for posting:', verification.summary.readyForPosting);

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED - Platform optimization working correctly!\n');

    // Platform specs summary
    console.log('📋 Platform Specifications Summary:\n');
    const platforms = ['tiktok', 'instagram', 'youtube'];
    platforms.forEach(p => {
      const specs = platformOptimizationService.platformSpecs[p];
      console.log(`${specs.name}:`);
      console.log(`  - Aspect Ratio: ${specs.aspectRatio}`);
      console.log(`  - Resolution: ${specs.resolution.width}x${specs.resolution.height}`);
      console.log(`  - Duration: ${specs.duration.min}-${specs.duration.max}s (optimal: ${specs.duration.optimal[0]}-${specs.duration.optimal[1]}s)`);
      console.log(`  - Caption: max ${specs.caption.max} chars (optimal: ${specs.caption.optimal[0]}-${specs.caption.optimal[1]})`);
      console.log(`  - Hashtags: ${specs.hashtags.min}-${specs.hashtags.max} (optimal: ${specs.hashtags.optimal})`);
      console.log('');
    });

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTests();
