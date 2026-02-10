import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

import MarketingPost from '../models/MarketingPost.js';

const POST_ID = '69884d71a1eae8dba9e64d04';
const TIKTOK_VIDEO_ID = '7604571814760566029';
const TIKTOK_SHARE_URL = 'https://www.tiktok.com/@blush.app/video/7604571814760566029';
const VIEWS = 27; // As you mentioned

async function updateTikTokVideo() {
  await mongoose.connect(process.env.MONGODB_URI);

  console.log('=== Updating TikTok Video Info ===');
  console.log('Post ID:', POST_ID);
  console.log('TikTok Video ID:', TIKTOK_VIDEO_ID);
  console.log('TikTok Share URL:', TIKTOK_SHARE_URL);

  // Get current post state
  const post = await MarketingPost.findById(POST_ID);
  if (!post) {
    console.error('Post not found!');
    await mongoose.connection.close();
    return;
  }

  console.log('\nCurrent state:');
  console.log('  TikTok mediaId (platformStatus):', post.platformStatus?.tiktok?.mediaId);
  console.log('  Instagram mediaId:', post.platformStatus?.instagram?.mediaId);

  // Calculate engagement rate (assuming 27 views, some likes/comments)
  const likes = 0; // We'll update this when metrics are fetched
  const comments = 0;
  const shares = 0;
  const engagementRate = VIEWS > 0 ? ((likes + comments + shares) / VIEWS) * 100 : 0;

  // Update the database
  console.log('\nUpdating database...');

  await MarketingPost.findByIdAndUpdate(POST_ID, {
    // Legacy fields
    tiktokVideoId: TIKTOK_VIDEO_ID,
    tiktokShareUrl: TIKTOK_SHARE_URL,
    // New multi-platform fields
    'platformStatus.tiktok.mediaId': TIKTOK_VIDEO_ID,
    'platformStatus.tiktok.shareUrl': TIKTOK_SHARE_URL,
    'platformStatus.tiktok.status': 'posted',
    'platformStatus.tiktok.postedAt': new Date('2026-02-08T19:00:14.000Z'), // From earlier check
    'platformStatus.tiktok.performanceMetrics': {
      views: VIEWS,
      likes: likes,
      comments: comments,
      shares: shares,
      engagementRate: engagementRate
    },
    'platformStatus.tiktok.lastFetchedAt': new Date(),
    // Update overall performance metrics (aggregate across platforms)
    // Instagram had 0 views, TikTok has 27
    'performanceMetrics.views': VIEWS + (post.performanceMetrics?.views || 0),
    'performanceMetrics.likes': likes + (post.performanceMetrics?.likes || 0),
    'performanceMetrics.comments': comments + (post.performanceMetrics?.comments || 0),
    'performanceMetrics.shares': shares + (post.performanceMetrics?.shares || 0),
    metricsLastFetchedAt: new Date()
  });

  console.log('✅ Database updated successfully!');

  // Verify the update
  const updatedPost = await MarketingPost.findById(POST_ID);
  console.log('\n=== VERIFIED ===');
  console.log('TikTok:');
  console.log('  mediaId:', updatedPost.platformStatus?.tiktok?.mediaId);
  console.log('  shareUrl:', updatedPost.platformStatus?.tiktok?.shareUrl);
  console.log('  status:', updatedPost.platformStatus?.tiktok?.status);
  console.log('  performanceMetrics.views:', updatedPost.platformStatus?.tiktok?.performanceMetrics?.views);
  console.log('Instagram:');
  console.log('  mediaId:', updatedPost.platformStatus?.instagram?.mediaId);
  console.log('  permalink:', updatedPost.platformStatus?.instagram?.permalink);
  console.log('\nOverall performanceMetrics:');
  console.log('  views:', updatedPost.performanceMetrics?.views);
  console.log('  likes:', updatedPost.performanceMetrics?.likes);

  await mongoose.connection.close();
  console.log('\nDone!');
}

updateTikTokVideo().catch(console.error);
