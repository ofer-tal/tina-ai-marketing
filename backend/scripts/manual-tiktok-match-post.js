/**
 * Manual script to match a stuck TikTok post
 * Video ID: 7602349297576906015
 * Post ID: 6980522a0392a8ff13ba86a3
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (parent of backend/) - same as config.js does
const projectRoot = resolve(__dirname, '../..');
dotenv.config({ path: resolve(projectRoot, '.env') });

// Verify env loaded
console.log('Project root:', projectRoot);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');

import databaseService from '../services/database.js';
import MarketingPost from '../models/MarketingPost.js';
import tiktokPostingService from '../services/tiktokPostingService.js';

const POST_ID = '6980522a0392a8ff13ba86a3';
const VIDEO_ID = '7602349297576906015';

async function run() {
  try {
    // Connect to DB
    await databaseService.connect();
    console.log('Connected to DB');

    // Get the stuck post
    const post = await MarketingPost.findById(POST_ID);
    if (!post) {
      console.log('Post not found!');
      await databaseService.disconnect();
      return;
    }

    console.log('\n=== CURRENT POST STATE ===');
    console.log('ID:', post._id);
    console.log('Title:', post.title);
    console.log('Status:', post.status);
    console.log('Platform:', post.platform);
    console.log('Caption:', post.caption?.substring(0, 100) + '...');
    console.log('Scheduled At:', post.scheduledAt);
    console.log('Sheet Triggered At:', post.sheetTriggeredAt);
    console.log('TikTok Video ID:', post.tiktokVideoId || 'NOT SET');
    console.log('TikTok Share URL:', post.tiktokShareUrl || 'NOT SET');
    console.log('Posted At:', post.postedAt || 'NOT SET');
    console.log('Performance Metrics:', JSON.stringify(post.performanceMetrics, null, 2));

    // Initialize TikTok service
    await tiktokPostingService.initialize();

    console.log('\n=== FETCHING TIKTOK VIDEOS ===');
    const fetchResult = await tiktokPostingService.fetchUserVideos();

    if (!fetchResult.success) {
      console.log('Failed to fetch TikTok videos:', fetchResult.error);
      await databaseService.disconnect();
      return;
    }

    console.log('Fetched', fetchResult.videos.length, 'videos from TikTok');

    // Look for the specific video
    const targetVideo = fetchResult.videos.find(v => v.id === VIDEO_ID);

    if (targetVideo) {
      console.log('\n=== TARGET VIDEO FOUND ===');
      console.log('Video ID:', targetVideo.id);
      console.log('Create Time:', new Date(targetVideo.create_time * 1000).toISOString());
      console.log('Caption:', targetVideo.video_description?.substring(0, 100) + '...');
      console.log('Share URL:', targetVideo.share_url);
      console.log('Views:', targetVideo.view_count);
      console.log('Likes:', targetVideo.like_count);
      console.log('Comments:', targetVideo.comment_count);
      console.log('Shares:', targetVideo.share_count);

      // Compare captions
      const postCaption = post.caption?.substring(0, 100) || '';
      const videoCaption = (targetVideo.video_description || '').substring(0, 100);
      console.log('\n=== CAPTION COMPARISON ===');
      console.log('Post caption (first 100):', postCaption);
      console.log('Video caption (first 100):', videoCaption);
      console.log('Match:', postCaption === videoCaption);

      // Check time window
      const videoCreatedAt = new Date(targetVideo.create_time * 1000);
      const sheetTriggeredAt = post.sheetTriggeredAt || post.scheduledAt;
      const timeDiff = videoCreatedAt.getTime() - sheetTriggeredAt.getTime();

      console.log('\n=== TIME CHECK ===');
      console.log('Video created at:', videoCreatedAt.toISOString());
      console.log('Sheet triggered at:', sheetTriggeredAt?.toISOString());
      console.log('Time difference:', Math.round(timeDiff / 1000), 'seconds (' + Math.round(timeDiff / 60000) + ' minutes)');

      // Update the post with all proper fields
      console.log('\n=== UPDATING POST ===');
      const updateData = {
        tiktokVideoId: targetVideo.id,
        tiktokShareUrl: targetVideo.share_url,
        status: 'posted',
        postedAt: videoCreatedAt,
        // Update performance metrics properly
        performanceMetrics: {
          views: targetVideo.view_count || 0,
          likes: targetVideo.like_count || 0,
          comments: targetVideo.comment_count || 0,
          shares: targetVideo.share_count || 0,
          // Keep any existing metrics
          ...post.performanceMetrics,
          // Override with fresh data
          views: targetVideo.view_count || 0,
          likes: targetVideo.like_count || 0,
          comments: targetVideo.comment_count || 0,
          shares: targetVideo.share_count || 0,
        },
        // Update metrics timestamp
        metricsLastSyncedAt: new Date(),
      };

      await MarketingPost.findByIdAndUpdate(POST_ID, updateData);

      console.log('Post updated successfully!');
      console.log('New status: posted');
      console.log('TikTok Video ID:', targetVideo.id);
      console.log('Performance Metrics:', JSON.stringify({
        views: targetVideo.view_count || 0,
        likes: targetVideo.like_count || 0,
        comments: targetVideo.comment_count || 0,
        shares: targetVideo.share_count || 0,
      }, null, 2));

      // Verify the update
      console.log('\n=== VERIFYING UPDATE ===');
      const updatedPost = await MarketingPost.findById(POST_ID);
      console.log('Status:', updatedPost.status);
      console.log('TikTok Video ID:', updatedPost.tiktokVideoId);
      console.log('Performance Metrics:', JSON.stringify(updatedPost.performanceMetrics, null, 2));

    } else {
      console.log('\n=== TARGET VIDEO NOT FOUND ===');
      console.log('Looking for video ID:', VIDEO_ID);
      console.log('Available video IDs:', fetchResult.videos.map(v => v.id));
    }

    await databaseService.disconnect();
  } catch (error) {
    console.error('ERROR:', error.message);
    console.error('Stack:', error.stack);
    await databaseService.disconnect();
    process.exit(1);
  }
}

run();
