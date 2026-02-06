/**
 * Recover Instagram post with existing container
 *
 * This script works around the issue where a container was created
 * but we don't have its ID. It uploads the same video to S3 with
 * a different key so Instagram treats it as a new video.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// IMPORTANT: Load dotenv BEFORE importing any services that depend on env vars
dotenv.config({ path: join(__dirname, '../../.env') });

// Dynamic imports to ensure dotenv loads first
const { default: MarketingPost } = await import('../models/MarketingPost.js');
const dbModule = await import('../services/database.js');
const { default: s3VideoUploader } = await import('../services/s3VideoUploader.js');

const databaseService = dbModule.default;

// Convert URL path to file system path (same as in postingScheduler.js)
function urlToFilePath(urlPath) {
  if (!urlPath) return urlPath;
  if (urlPath.startsWith('/storage/')) {
    return path.join(__dirname, '../../storage', urlPath.replace('/storage/', ''));
  }
  return urlPath;
}

async function recoverPost(postId) {
  await databaseService.connect();

  const post = await MarketingPost.findById(postId);

  if (!post) {
    console.log('Post not found');
    process.exit(1);
  }

  console.log('=== POST TO RECOVER ===');
  console.log(`ID: ${post._id}`);
  console.log(`Title: ${post.title}`);
  console.log(`Platform: ${post.platform}`);
  console.log(`Status: ${post.status}`);
  console.log(`Has instagramContainerId: ${!!post.instagramContainerId}`);
  console.log(`Error: ${post.error || 'None'}`);
  console.log('');

  // Check if we can recover this post
  if (post.instagramContainerId) {
    console.log('This post already has a container ID. The retry logic should handle it.');
    console.log('No need to use this recovery script.');
    process.exit(0);
  }

  if (!post.videoPath) {
    console.log('No video path found on post');
    process.exit(1);
  }

  console.log('=== RECOVERY STRATEGY ===');
  console.log('Uploading the same video to S3 with a new key');
  console.log('This will cause Instagram to create a new container');
  console.log('');

  const videoFilePath = urlToFilePath(post.videoPath);

  // Generate a unique key with timestamp
  const timestamp = Date.now();
  const newS3Key = `instagram-${post._id.toString()}-retry-${timestamp}.mp4`;

  console.log(`Uploading to S3: ${newS3Key}`);
  console.log(`Local file: ${videoFilePath}`);
  console.log('');

  const s3Result = await s3VideoUploader.uploadVideo(
    videoFilePath,
    newS3Key
  );

  if (!s3Result.success) {
    console.log(`S3 upload failed: ${s3Result.error}`);
    process.exit(1);
  }

  console.log(`S3 upload successful!`);
  console.log(`Public URL: ${s3Result.publicUrl}`);
  console.log('');

  // Clear any error on the post
  post.error = undefined;
  await post.save();

  console.log('=== POST READY FOR RETRY ===');
  console.log('The post has been updated and is ready for the scheduler.');
  console.log('');
  console.log('To manually trigger posting immediately, you can:');
  console.log('1. Go to the Content Library and click "Post Now" on this post, or');
  console.log('2. Wait for the next scheduler run (every 15 minutes)');
  console.log('');
  console.log('Post ID:', post._id.toString());
  console.log('S3 URL for manual posting:', s3Result.publicUrl);

  process.exit(0);
}

// Get post ID from command line
const postId = process.argv[2];

if (!postId) {
  console.log('Usage: node recoverInstagramPost.js <post_id>');
  console.log('');
  console.log('To recover the Instagram post that failed:');
  console.log('  node recoverInstagramPost.js 6984f0a359585ce5ff08a24f');
  process.exit(1);
}

recoverPost(postId).catch(console.error);
