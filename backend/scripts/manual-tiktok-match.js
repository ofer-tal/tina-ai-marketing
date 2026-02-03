/**
 * Manual script to match the stuck TikTok post
 * Video ID: 7602422754113047839
 * Post ID: 69813508c18417477ac36138
 */

import databaseService from '../services/database.js';
import MarketingPost from '../models/MarketingPost.js';
import tiktokPostingService from '../services/tiktokPostingService.js';

async function run() {
  try {
    // Connect to DB
    await databaseService.connect();
    console.log('Connected to DB');

    // Get the stuck post
    const post = await MarketingPost.findById('69813508c18417477ac36138');
    if (!post) {
      console.log('Post not found!');
      await databaseService.disconnect();
      return;
    }

    console.log('\n=== STUCK POST ===');
    console.log('ID:', post._id);
    console.log('Title:', post.title);
    console.log('Status:', post.status);
    console.log('Platform:', post.platform);
    console.log('Caption:', post.caption?.substring(0, 100) + '...');
    console.log('Scheduled At:', post.scheduledAt);
    console.log('Sheet Triggered At:', post.sheetTriggeredAt);
    console.log('TikTok Video ID:', post.tiktokVideoId || 'NOT SET');
    console.log('TikTok Share URL:', post.tiktokShareUrl || 'NOT SET');

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
    const targetVideoId = '7602422754113047839';
    const targetVideo = fetchResult.videos.find(v => v.id === targetVideoId);

    if (targetVideo) {
      console.log('\n=== TARGET VIDEO FOUND ===');
      console.log('Video ID:', targetVideo.id);
      console.log('Create Time:', new Date(targetVideo.create_time * 1000).toISOString());
      console.log('Caption:', targetVideo.video_description?.substring(0, 100) + '...');
      console.log('Share URL:', targetVideo.share_url);
      console.log('Views:', targetVideo.view_count);
      console.log('Likes:', targetVideo.like_count);

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

      // Try to manually update the post
      console.log('\n=== UPDATING POST ===');
      await MarketingPost.findByIdAndUpdate(post._id, {
        tiktokVideoId: targetVideo.id,
        tiktokShareUrl: targetVideo.share_url,
        status: 'posted',
        postedAt: videoCreatedAt,
        'performanceMetrics.views': targetVideo.view_count || 0,
        'performanceMetrics.likes': targetVideo.like_count || 0,
        'performanceMetrics.comments': targetVideo.comment_count || 0,
        'performanceMetrics.shares': targetVideo.share_count || 0,
      });

      console.log('Post updated successfully!');
      console.log('New status: posted');
      console.log('TikTok Video ID:', targetVideo.id);

    } else {
      console.log('\n=== TARGET VIDEO NOT FOUND ===');
      console.log('Looking for video ID:', targetVideoId);
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
