/**
 * Manually trigger a specific post to be posted now
 * Post ID: 6981ad591054df976c3841f5
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { resolve } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
const projectRoot = resolve(__dirname, '../..');
dotenv.config({ path: resolve(projectRoot, '.env') });

import databaseService from '../services/database.js';
import MarketingPost from '../models/MarketingPost.js';
import googleSheetsService from '../services/googleSheetsService.js';
import s3VideoUploader from '../services/s3VideoUploader.js';

// Convert URL path to file system path
function urlToFilePath(urlPath) {
  if (!urlPath) return urlPath;
  if (urlPath.startsWith('/storage/')) {
    return path.join(__dirname, '../../storage', urlPath.replace('/storage/', ''));
  }
  return urlPath;
}

const POST_ID = '6981ad591054df976c3841f5';

async function triggerPost() {
  try {
    // Connect to DB
    await databaseService.connect();
    console.log('✓ Connected to DB');

    // Get the post
    const post = await MarketingPost.findById(POST_ID);
    if (!post) {
      console.log('❌ Post not found!');
      await databaseService.disconnect();
      return;
    }

    console.log('\n=== POST DETAILS ===');
    console.log('ID:', post._id);
    console.log('Title:', post.title);
    console.log('Status:', post.status);
    console.log('Platform:', post.platform);
    console.log('Caption:', post.caption?.substring(0, 100) + '...');
    console.log('Video Path:', post.videoPath);

    // Initialize Google Sheets service
    console.log('\n=== INITIALIZING GOOGLE SHEETS SERVICE ===');
    await googleSheetsService.initialize();

    // Check if video file exists
    const filePath = urlToFilePath(post.videoPath);
    console.log('\n=== CHECKING VIDEO FILE ===');
    console.log('Resolved path:', filePath);

    try {
      await fs.access(filePath);
      console.log('✓ Video file exists');
    } catch (err) {
      console.log('❌ Video file not found:', err.message);
      await databaseService.disconnect();
      return;
    }

    // Upload to S3
    console.log('\n=== UPLOADING TO S3 ===');
    const keyName = `${post._id.toString()}.mp4`;
    const uploadResult = await s3VideoUploader.uploadVideo(filePath, keyName);

    if (!uploadResult.success) {
      console.log('❌ S3 upload failed:', uploadResult.error);
      await databaseService.disconnect();
      return;
    }

    console.log('✓ S3 upload successful');
    console.log('  S3 Key:', uploadResult.s3Key);

    // Build public URL (CloudFront)
    const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN || 'content.blush.v6v.one';
    const publicUrl = `https://${cloudFrontDomain}/${uploadResult.s3Key}`;
    console.log('  Public URL:', publicUrl);

    // Trigger Google Sheets flow
    console.log('\n=== TRIGGERING GOOGLE SHEETS FLOW ===');
    const sheetResult = await googleSheetsService.triggerZapierFlow(
      publicUrl,
      post.caption,
      post.hashtags || []
    );

    if (!sheetResult.success) {
      console.log('❌ Google Sheets trigger failed:', sheetResult.error);
      await databaseService.disconnect();
      return;
    }

    console.log('✓ Google Sheets flow triggered');
    console.log('  Sheet name:', sheetResult.sheetName);

    // Update post status
    console.log('\n=== UPDATING POST STATUS ===');
    // CRITICAL: Set postingStartedAt for accurate timeout detection by postMonitoringService
    if (!post.postingStartedAt) {
      post.postingStartedAt = new Date();
    }
    post.status = 'posting';
    post.sheetTriggeredAt = new Date();
    post.s3VideoUrl = publicUrl;
    await post.save();

    console.log('✓ Post status updated to "posting"');
    console.log('  sheetTriggeredAt:', post.sheetTriggeredAt);

    console.log('\n=== SUMMARY ===');
    console.log('Post is now in "posting" status');
    console.log('The TikTok video matcher will match it once Buffer posts it');
    console.log('Matcher runs every 30 minutes and looks for posts with:');
    console.log('  - status: "posting"');
    console.log('  - caption match');
    console.log('  - posted within ~1 hour of sheetTriggeredAt');

    await databaseService.disconnect();
    console.log('\n✓ Done!');

  } catch (error) {
    console.error('ERROR:', error.message);
    console.error('Stack:', error.stack);
    await databaseService.disconnect();
    process.exit(1);
  }
}

triggerPost();
