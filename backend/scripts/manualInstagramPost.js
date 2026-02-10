import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../.env') });

import MarketingPost from '../models/MarketingPost.js';
import instagramPostingService from '../services/instagramPostingService.js';
import s3VideoUploader from '../services/s3VideoUploader.js';
import path from 'path';

async function manualInstagramPost() {
  try {
    const postId = '69884d71a1eae8dba9e64d04';
    const post = await MarketingPost.findById(postId);
    
    if (!post) {
      console.log('Post not found!');
      return;
    }
    
    console.log('Found post:', post.title);
    console.log('Instagram status:', post.platformStatus?.instagram?.status);
    
    // Check if already posted
    if (post.platformStatus?.instagram?.status === 'posted') {
      console.log('Instagram already posted!');
      return;
    }
    
    console.log('\nStarting Instagram post...');
    
    // Get S3 URL if exists, otherwise upload
    let s3Url = post.s3Url;
    if (!s3Url) {
      console.log('Uploading to S3 first...');
      const videoFilePath = post.videoPath.startsWith('/storage/')
        ? path.join(__dirname, '../../storage', post.videoPath.replace('/storage/', ''))
        : post.videoPath;
        
      const s3Result = await s3VideoUploader.uploadVideo(
        videoFilePath,
        `instagram-${post._id.toString()}.mp4`
      );
      
      if (!s3Result.success) {
        throw new Error(`S3 upload failed: ${s3Result.error}`);
      }
      s3Url = s3Result.publicUrl;
      console.log('S3 upload complete:', s3Url);
    }
    
    // Get hashtags for Instagram
    const getPlatformHashtags = (post, platform) => {
      if (!post.hashtags) return [];
      if (typeof post.hashtags === 'object' && !Array.isArray(post.hashtags)) {
        return post.hashtags[platform] || post.hashtags.tiktok || [];
      }
      return post.hashtags || [];
    };
    
    const hashtags = getPlatformHashtags(post, 'instagram');
    console.log('Hashtags:', hashtags);
    
    // Post to Instagram
    console.log('\nPosting to Instagram...');
    const result = await instagramPostingService.postVideo(
      post.videoPath,
      post.caption,
      hashtags,
      (progress) => {
        console.log('Progress:', progress + '%');
      },
      s3Url,
      post
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Instagram posting failed');
    }
    
    console.log('\n✅ Instagram post successful!');
    console.log('Media ID:', result.mediaId);
    console.log('Permalink:', result.permalink);
    
    // Update platform status
    await post.setPlatformStatus('instagram', 'posted', {
      postedAt: new Date(),
      mediaId: result.mediaId,
      permalink: result.permalink
    });
    
    console.log('\nPost status updated to:', post.status);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

manualInstagramPost();
