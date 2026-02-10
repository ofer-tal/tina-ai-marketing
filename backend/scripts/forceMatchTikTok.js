import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

import tiktokPostingService from '../services/tiktokPostingService.js';
import MarketingPost from '../models/MarketingPost.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('force-match-tiktok', 'scripts');

const POST_ID = '69884d71a1eae8dba9e64d04';
const CAPTION_MATCH_LENGTH = 100;

async function forceMatchTikTok() {
  await mongoose.connect(process.env.MONGODB_URI);

  console.log('=== Force Match TikTok for Post ===');
  console.log('Post ID:', POST_ID);

  // Get the post
  const post = await MarketingPost.findById(POST_ID);
  if (!post) {
    console.error('Post not found!');
    await mongoose.connection.close();
    return;
  }

  console.log('Title:', post.title);
  console.log('Caption:', post.caption?.substring(0, 50));
  console.log('Status:', post.status);
  console.log('Current TikTok mediaId:', post.platformStatus?.tiktok?.mediaId);

  if (post.platformStatus?.tiktok?.mediaId) {
    console.log('\nTikTok already has mediaId - skipping');
    await mongoose.connection.close();
    return;
  }

  // Fetch all TikTok videos
  console.log('\nFetching TikTok videos...');
  const fetchResult = await tiktokPostingService.fetchUserVideos();

  if (!fetchResult.success) {
    console.error('Failed to fetch TikTok videos:', fetchResult.error);
    await mongoose.connection.close();
    return;
  }

  const videos = fetchResult.videos || [];
  console.log(`Fetched ${videos.length} videos from TikTok`);

  // Get the post caption for matching
  const postCaption = (post.caption || '').substring(0, CAPTION_MATCH_LENGTH);
  console.log('\nLooking for video with caption starting with:', postCaption.substring(0, 30));

  // Try to find matching video by caption
  let matchedVideo = null;
  for (const video of videos) {
    const videoCaption = (video.video_description || '').substring(0, CAPTION_MATCH_LENGTH);

    // Check for exact caption match
    if (videoCaption === postCaption) {
      console.log(`\n✅ EXACT MATCH found!`);
      matchedVideo = video;
      break;
    }

    // Check if post caption is contained in video caption
    if (postCaption && videoCaption && videoCaption.includes(postCaption)) {
      console.log(`\n✅ CONTAINS MATCH found!`);
      matchedVideo = video;
      break;
    }

    // Check if video caption is contained in post caption
    if (postCaption && videoCaption && postCaption.includes(videoCaption)) {
      console.log(`\n✅ REVERSE CONTAINS MATCH found!`);
      matchedVideo = video;
      break;
    }
  }

  if (!matchedVideo) {
    console.log('\n❌ No matching video found');
    console.log('\nAll video captions:');
    videos.forEach((v, i) => {
      console.log(`  ${i + 1}. ${v.id}: "${(v.video_description || '').substring(0, 50)}..."`);
    });
    await mongoose.connection.close();
    return;
  }

  // Found a match - update the database
  console.log('\n=== MATCHED VIDEO ===');
  console.log('Video ID:', matchedVideo.id);
  console.log('Video Caption:', (matchedVideo.video_description || '').substring(0, 100));
  console.log('Share URL:', matchedVideo.share_url);
  console.log('Views:', matchedVideo.view_count);
  console.log('Likes:', matchedVideo.like_count);

  // Calculate engagement rate
  const engagementRate = matchedVideo.view_count > 0
    ? ((matchedVideo.like_count + matchedVideo.comment_count + matchedVideo.share_count) / matchedVideo.view_count) * 100
    : 0;

  // Update the database
  console.log('\nUpdating database...');

  await MarketingPost.findByIdAndUpdate(POST_ID, {
    // Legacy fields
    tiktokVideoId: matchedVideo.id,
    tiktokShareUrl: matchedVideo.share_url,
    // New multi-platform fields
    'platformStatus.tiktok.mediaId': matchedVideo.id,
    'platformStatus.tiktok.shareUrl': matchedVideo.share_url,
    'platformStatus.tiktok.status': 'posted',
    'platformStatus.tiktok.postedAt': new Date(matchedVideo.create_time * 1000),
    'platformStatus.tiktok.performanceMetrics': {
      views: matchedVideo.view_count || 0,
      likes: matchedVideo.like_count || 0,
      comments: matchedVideo.comment_count || 0,
      shares: matchedVideo.share_count || 0,
      engagementRate: engagementRate
    },
    'platformStatus.tiktok.lastFetchedAt': new Date(),
    // Update overall performance metrics (aggregate across platforms)
    'performanceMetrics.views': (post.performanceMetrics?.views || 0) + (matchedVideo.view_count || 0),
    'performanceMetrics.likes': (post.performanceMetrics?.likes || 0) + (matchedVideo.like_count || 0),
    'performanceMetrics.comments': (post.performanceMetrics?.comments || 0) + (matchedVideo.comment_count || 0),
    'performanceMetrics.shares': (post.performanceMetrics?.shares || 0) + (matchedVideo.share_count || 0),
    metricsLastFetchedAt: new Date()
  });

  console.log('✅ Database updated successfully!');

  // Verify the update
  const updatedPost = await MarketingPost.findById(POST_ID);
  console.log('\n=== VERIFIED ===');
  console.log('TikTok mediaId:', updatedPost.platformStatus?.tiktok?.mediaId);
  console.log('TikTok shareUrl:', updatedPost.platformStatus?.tiktok?.shareUrl);
  console.log('TikTok metrics views:', updatedPost.platformStatus?.tiktok?.performanceMetrics?.views);
  console.log('Overall performanceMetrics views:', updatedPost.performanceMetrics?.views);

  await mongoose.connection.close();
  console.log('\nDone!');
}

forceMatchTikTok().catch(console.error);
