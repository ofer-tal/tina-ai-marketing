/**
 * Create test data for Feature #117: Engagement Tracking
 * Creates posts with performance metrics to verify the feature works
 */

import dotenv from 'dotenv';
dotenv.config();

const mongoose = await (await import('mongoose')).default.connect(process.env.MONGODB_URI);
const MarketingPost = (await import('./backend/models/MarketingPost.js')).default;

console.log('Creating test engagement data...\n');

// Create test posts with metrics for each platform
const testData = [
  {
    title: 'Test TikTok Post 1 - Engagement Data',
    description: 'Test post for engagement tracking',
    platform: 'tiktok',
    status: 'posted',
    contentType: 'video',
    caption: 'Test caption for TikTok #romance #spicy',
    hashtags: ['#romance', '#spicy', '#test'],
    scheduledAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    postedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    storyId: new mongoose.Types.ObjectId(),
    storyName: 'Test Story',
    storyCategory: 'romance',
    storySpiciness: 1,
    tiktokVideoId: 'test123',
    tiktokShareUrl: 'https://tiktok.com/test123',
    performanceMetrics: {
      views: 15234,
      likes: 1845,
      comments: 92,
      shares: 138,
      engagementRate: 13.59
    }
  },
  {
    title: 'Test TikTok Post 2 - Engagement Data',
    description: 'Another test post',
    platform: 'tiktok',
    status: 'posted',
    contentType: 'video',
    caption: 'Another test caption #test',
    hashtags: ['#test'],
    scheduledAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    postedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    storyId: new mongoose.Types.ObjectId(),
    storyName: 'Test Story 2',
    storyCategory: 'drama',
    storySpiciness: 2,
    tiktokVideoId: 'test456',
    tiktokShareUrl: 'https://tiktok.com/test456',
    performanceMetrics: {
      views: 8934,
      likes: 1024,
      comments: 51,
      shares: 77,
      engagementRate: 12.92
    }
  },
  {
    title: 'Test Instagram Post - Engagement Data',
    description: 'Instagram test post',
    platform: 'instagram',
    status: 'posted',
    contentType: 'video',
    caption: 'Instagram test caption #instagram #test',
    hashtags: ['#instagram', '#test'],
    scheduledAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    postedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    storyId: new mongoose.Types.ObjectId(),
    storyName: 'Test Story 3',
    storyCategory: 'contemporary',
    storySpiciness: 1,
    instagramMediaId: 'inst789',
    instagramPermalink: 'https://instagram.com/p/inst789',
    performanceMetrics: {
      views: 12456,
      likes: 2156,
      comments: 108,
      shares: 162,
      engagementRate: 19.41
    }
  },
  {
    title: 'Test YouTube Shorts Post - Engagement Data',
    description: 'YouTube test post',
    platform: 'youtube_shorts',
    status: 'posted',
    contentType: 'video',
    caption: 'YouTube test caption #shorts #test',
    hashtags: ['#shorts', '#test'],
    scheduledAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    postedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    storyId: new mongoose.Types.ObjectId(),
    storyName: 'Test Story 4',
    storyCategory: 'fantasy',
    storySpiciness: 1,
    youtubeVideoId: 'yt123',
    youtubeUrl: 'https://youtube.com/shorts/yt123',
    performanceMetrics: {
      views: 21987,
      likes: 1539,
      comments: 77,
      shares: 115,
      engagementRate: 7.65
    }
  },
  // Previous period data (8-9 days ago for 7d comparison)
  {
    title: 'Test TikTok Post - Previous Period',
    description: 'Post from previous period',
    platform: 'tiktok',
    status: 'posted',
    contentType: 'video',
    caption: 'Previous period test #test',
    hashtags: ['#test'],
    scheduledAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
    postedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    storyId: new mongoose.Types.ObjectId(),
    storyName: 'Test Story 5',
    storyCategory: 'romance',
    storySpiciness: 1,
    tiktokVideoId: 'prev123',
    performanceMetrics: {
      views: 11245,
      likes: 1245,
      comments: 62,
      shares: 93,
      engagementRate: 12.31
    }
  }
];

// Clean up old test data first
await MarketingPost.deleteMany({ title: { $regex: /^Test.*Post.*Engagement Data/ } });
console.log('Cleaned up old test data\n');

// Create new test data
const created = await MarketingPost.insertMany(testData);
console.log(`Created ${created.length} test posts with engagement metrics\n`);

created.forEach(post => {
  console.log(`✅ ${post.title}`);
  console.log(`   Platform: ${post.platform}`);
  console.log(`   Posted: ${post.postedAt}`);
  console.log(`   Metrics: ${post.performanceMetrics.views} views, ${post.performanceMetrics.likes} likes, ${post.performanceMetrics.engagementRate.toFixed(2)}% ER\n`);
});

console.log('Test data created successfully!');
console.log('You can now test the /api/dashboard/engagement endpoint');

await mongoose.disconnect();
