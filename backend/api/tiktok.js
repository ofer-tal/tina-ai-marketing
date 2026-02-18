import express from 'express';
import winston from 'winston';
import tiktokPostingService from '../services/tiktokPostingService.js';
import MarketingPost from '../models/MarketingPost.js';
import { formatHashtagsForPosting } from '../utils/hashtagUtils.js';

const router = express.Router();

// Create logger for TikTok API
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'tiktok-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/tiktok-api-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/tiktok-api.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

/**
 * GET /api/tiktok/test-connection
 * Step 1: Test connection to TikTok API
 */
router.get('/test-connection', async (req, res) => {
  try {
    logger.info('Testing TikTok API connection...');

    const result = await tiktokPostingService.testConnection();

    if (result.success) {
      res.json({
        success: true,
        message: 'TikTok API connection successful',
        data: result,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        code: result.code,
        details: result.details,
      });
    }
  } catch (error) {
    logger.error('TikTok connection test failed', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/tiktok/token-status
 * Step 2 & 3: Verify authentication token obtained
 */
router.get('/token-status', async (req, res) => {
  try {
    logger.info('Checking TikTok token status...');

    const result = await tiktokPostingService.checkTokenStatus();

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Token status check failed', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/tiktok/sandbox-status
 * Step 4: Check sandbox app configured and authentication status
 */
router.get('/sandbox-status', async (req, res) => {
  try {
    logger.info('Checking TikTok sandbox status...');

    const result = await tiktokPostingService.checkSandboxStatus();

    // Also check authentication status via oauthManager
    const oauthManager = (await import('../services/oauthManager.js')).default;
    const isAuthenticated = await oauthManager.isAuthenticated('tiktok');

    if (result.success) {
      res.json({
        success: true,
        data: {
          ...result,
          authenticated: isAuthenticated,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        code: result.code,
      });
    }
  } catch (error) {
    logger.error('Sandbox status check failed', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/tiktok/permissions
 * Step 5: Confirm API permissions granted
 */
router.get('/permissions', async (req, res) => {
  try {
    logger.info('Checking TikTok API permissions...');

    const result = await tiktokPostingService.verifyPermissions();

    if (result.success) {
      res.json({
        success: true,
        data: result,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        code: result.code,
      });
    }
  } catch (error) {
    logger.error('Permission check failed', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/tiktok/authorize-url
 * Get authorization URL for OAuth flow
 * @deprecated Use GET /api/oauth/tiktok/authorize-url instead
 */
router.get('/authorize-url', async (req, res) => {
  try {
    logger.info('Generating TikTok authorization URL...');

    const scopes = req.query.scopes
      ? req.query.scopes.split(',')
      : ['video.upload', 'video.publish'];

    logger.info('TikTok scopes', { scopes });

    // getAuthorizationUrl is now async and returns { authUrl, state }
    const url = await tiktokPostingService.getAuthorizationUrl(scopes);

    logger.info('TikTok auth URL generated successfully', { url: url?.substring(0, 100) + '...' });

    res.json({
      success: true,
      data: {
        url: url,  // For backward compatibility, url is the authUrl string
        scopes,
        message: 'Visit this URL to authorize the application',
      },
    });
  } catch (error) {
    logger.error('Failed to generate authorization URL', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      constructorName: error.constructor.name,
    });

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/tiktok/exchange-token
 * Exchange authorization code for access token
 */
router.post('/exchange-token', async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required',
      });
    }

    logger.info('Exchanging authorization code for token...');

    const result = await tiktokPostingService.exchangeCodeForToken(code, state);

    if (result.success) {
      res.json({
        success: true,
        message: 'Authentication successful',
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        code: result.code,
      });
    }
  } catch (error) {
    logger.error('Token exchange failed', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/tiktok/post/:postId
 * Post a marketing post to TikTok via Buffer/Zapier flow
 *
 * IMPORTANT: TikTok posts MUST go through Buffer/Zapier flow (S3 + Google Sheets)
 * Direct TikTok API posting is NOT supported (permissions not available)
 */
router.post('/post/:postId', async (req, res) => {
  try {
    const { postId } = req.params;

    logger.info('Posting to TikTok via Buffer/Zapier flow...', { postId });

    // Find the marketing post
    const post = await MarketingPost.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Marketing post not found',
      });
    }

    // Check if post targets TikTok (handles both new platforms array and legacy platform field)
    const platforms = post.platforms && Array.isArray(post.platforms) && post.platforms.length > 0
      ? post.platforms
      : [post.platform];

    if (!platforms.includes('tiktok')) {
      return res.status(400).json({
        success: false,
        error: 'Post is not a TikTok post',
      });
    }

    if (post.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Post must be approved before posting',
      });
    }

    if (!post.videoPath) {
      return res.status(400).json({
        success: false,
        error: 'Post does not have a video',
      });
    }

    // CRITICAL GUARDRAIL: Never write to Google Sheets if already written
    // Once sheetTriggeredAt is set, that post MUST NEVER be written to the Google Sheet again
    if (post.sheetTriggeredAt) {
      const error = `Refusing to write post ${post._id} to Google Sheets - sheetTriggeredAt already set to ${post.sheetTriggeredAt.toISOString()}`;
      logger.error(`[GUARDRAIL] ${error}`, {
        postId: post._id,
        sheetTriggeredAt: post.sheetTriggeredAt
      });
      return res.status(400).json({
        success: false,
        error: error
      });
    }

    // Import services for Buffer/Zapier flow
    const s3VideoUploader = (await import('../services/s3VideoUploader.js')).default;
    const googleSheetsService = (await import('../services/googleSheetsService.js')).default;
    const path = await import('path');

    // Check prerequisites
    if (!s3VideoUploader.isConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'S3 not configured - required for TikTok posting',
      });
    }

    if (!googleSheetsService.isConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'Google Sheets not configured - required for TikTok posting',
      });
    }

    // Convert URL to file path if needed
    let videoFilePath = post.videoPath;
    if (videoFilePath?.startsWith('/storage/')) {
      videoFilePath = path.join(process.cwd(), 'storage', videoFilePath.substring('/storage/'.length));
    }

    // Initialize upload progress tracking
    await post.updateUploadProgress('initializing', 0, 'Starting S3 upload');

    // Step 1: Upload video to S3
    logger.info('[TikTok Post] Step 1/3: Uploading to S3...', { postId });

    await post.updateUploadProgress('uploading', 10, 'Uploading to S3');

    const uploadResult = await s3VideoUploader.uploadVideo(
      videoFilePath,
      `tiktok-${postId}-${Date.now()}.mp4`
    );

    if (!uploadResult.success) {
      await post.updateUploadProgress('failed', 0, 'S3 upload failed', null, uploadResult.error);
      post.status = 'failed';
      post.error = `S3 upload failed: ${uploadResult.error}`;
      await post.save();

      return res.status(500).json({
        success: false,
        error: `S3 upload failed: ${uploadResult.error}`,
      });
    }

    // Store S3 URL
    post.s3Url = uploadResult.publicUrl;
    await post.save();

    logger.info('[TikTok Post] S3 upload complete', {
      postId,
      s3Url: uploadResult.publicUrl
    });

    // Step 2: Append to Google Sheets (triggers Zapier → Buffer → TikTok)
    logger.info('[TikTok Post] Step 2/3: Appending to Google Sheets...', { postId });

    await post.updateUploadProgress('processing', 50, 'Triggering Buffer via Zapier');

    // Get hashtags for TikTok and format with "#" prefix
    const hashtags = post.hashtags?.tiktok || post.hashtags || [];
    const hashtagString = formatHashtagsForPosting(hashtags).join(' ');

    const fullCaption = hashtagString
      ? `${post.caption}\n\n${hashtagString}`
      : post.caption;

    await googleSheetsService.appendPostRow({
      s3Url: uploadResult.publicUrl,
      caption: fullCaption,
      platform: 'tiktok',
      postId: postId
    });

    // Step 3: Return success (posting will happen via Zapier → Buffer → TikTok)
    logger.info('[TikTok Post] Step 3/3: Waiting for Zapier → Buffer → TikTok flow...', { postId });

    await post.updateUploadProgress('completed', 100, 'Triggered Buffer posting');
    await post.save();

    logger.info('[TikTok Post] Successfully triggered Buffer posting', { postId });

    res.json({
      success: true,
      message: 'TikTok post triggered via Buffer/Zapier flow',
      data: {
        postId,
        s3Url: uploadResult.publicUrl,
        note: 'The tiktokVideoMatcher job will mark this as posted when the video is live on TikTok',
        post: {
          id: post._id,
          status: post.status,
        },
      },
    });
  } catch (error) {
    logger.error('TikTok post failed', {
      error: error.message,
      stack: error.stack,
    });

    // Update post status to failed
    try {
      const post = await MarketingPost.findById(req.params.postId);
      if (post) {
        post.status = 'failed';
        post.error = error.message;
        await post.save();
      }
    } catch (saveError) {
      logger.error('Failed to update post status', { error: saveError.message });
    }

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/tiktok/upload-progress/:postId
 * Get upload progress for a specific post
 */
router.get('/upload-progress/:postId', async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await MarketingPost.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Marketing post not found',
      });
    }

    res.json({
      success: true,
      data: {
        postId: post._id,
        uploadProgress: post.uploadProgress || {
          status: 'idle',
          progress: 0
        },
        postStatus: post.status,
      },
    });
  } catch (error) {
    logger.error('Failed to get upload progress', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/tiktok/user-info
 * Get current TikTok user information
 */
router.get('/user-info', async (req, res) => {
  try {
    logger.info('Fetching TikTok user info...');

    const result = await tiktokPostingService.getUserInfo();

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    logger.error('Failed to fetch user info', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/tiktok/health
 * Health check for TikTok posting service
 */
router.get('/health', async (req, res) => {
  try {
    const health = tiktokPostingService.healthCheck();

    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/tiktok/sync-videos
 * Sync all TikTok videos and update metrics in database
 */
router.post('/sync-videos', async (req, res) => {
  try {
    logger.info('Syncing TikTok videos...');

    // Fetch all videos from TikTok
    const result = await tiktokPostingService.fetchUserVideos();

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to fetch videos from TikTok',
      });
    }

    const videos = result.videos;
    const updatedPosts = [];
    const importedPosts = [];

    // Get existing posts (handles both new platforms array and legacy platform field)
    const existingPosts = await MarketingPost.find({
      $or: [
        { platform: 'tiktok' },
        { platforms: 'tiktok' }
      ]
    });

    for (const video of videos) {
      const existingPost = existingPosts.find(p => p.tiktokVideoId === video.id);

      if (existingPost) {
        // Update metrics for existing post
        const views = video.view_count || 0;
        const likes = video.like_count || 0;
        const comments = video.comment_count || 0;
        const shares = video.share_count || 0;
        let engagementRate = '0';
        if (views > 0) {
          engagementRate = (((likes + comments + shares) / views) * 100).toFixed(2);
        }

        existingPost.title = (video.title || video.video_description || existingPost.title).substring(0, 100);
        existingPost.caption = video.video_description || video.title || existingPost.caption;
        existingPost.tiktokShareUrl = video.share_url || existingPost.tiktokShareUrl;
        existingPost.performanceMetrics = {
          views,
          likes,
          comments,
          shares,
          engagementRate
        };
        existingPost.metricsLastFetchedAt = new Date();
        existingPost.updatedAt = new Date();

        await existingPost.save();
        updatedPosts.push({
          id: existingPost._id,
          tiktokVideoId: video.id,
          views,
          likes,
        });
      } else {
        // Import new post
        const postedAt = new Date(parseInt(video.create_time) * 1000);
        const views = video.view_count || 0;
        const likes = video.like_count || 0;
        const comments = video.comment_count || 0;
        const shares = video.share_count || 0;
        let engagementRate = '0';
        if (views > 0) {
          engagementRate = (((likes + comments + shares) / views) * 100).toFixed(2);
        }

        const newPost = new MarketingPost({
          title: (video.title || video.video_description || 'TikTok Post').substring(0, 100),
          description: 'Imported from TikTok',
          platform: 'tiktok',
          status: 'posted',
          contentType: 'video',
          caption: video.video_description || video.title || '',
          hashtags: [],
          scheduledAt: postedAt,
          postedAt: postedAt,
          storyId: existingPosts[0]?.storyId || null,
          storyName: 'Imported from TikTok',
          storyCategory: 'imported',
          storySpiciness: 1,
          generatedAt: postedAt,
          approvedBy: 'System',
          tiktokVideoId: video.id.toString(),
          tiktokShareUrl: video.share_url,
          performanceMetrics: {
            views,
            likes,
            comments,
            shares,
            engagementRate
          },
          metricsLastFetchedAt: new Date(),
        });

        await newPost.save();
        importedPosts.push({
          id: newPost._id,
          tiktokVideoId: video.id,
          views,
        });
      }
    }

    logger.info('TikTok sync complete', {
      totalVideos: videos.length,
      updated: updatedPosts.length,
      imported: importedPosts.length,
    });

    res.json({
      success: true,
      message: 'TikTok videos synced successfully',
      data: {
        totalVideos: videos.length,
        updatedPosts: updatedPosts.length,
        importedPosts: importedPosts.length,
        updated: updatedPosts,
        imported: importedPosts,
      },
    });
  } catch (error) {
    logger.error('TikTok sync failed', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/tiktok/videos
 * Get list of TikTok videos from API
 */
router.get('/videos', async (req, res) => {
  try {
    logger.info('Fetching TikTok videos...');

    const result = await tiktokPostingService.fetchUserVideos();

    if (result.success) {
      res.json({
        success: true,
        data: result,
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to fetch videos',
      });
    }
  } catch (error) {
    logger.error('Failed to fetch TikTok videos', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/tiktok/matcher/trigger
 * Manually trigger the TikTok video matcher job
 */
router.post('/matcher/trigger', async (req, res) => {
  try {
    logger.info('Manual trigger of TikTok video matcher');

    const tikTokVideoMatcherJob = (await import('../jobs/tikTokVideoMatcher.js')).default;
    const result = await tikTokVideoMatcherJob.trigger();

    res.json({
      success: true,
      message: 'TikTok video matcher completed',
      data: result
    });
  } catch (error) {
    logger.error('Failed to trigger TikTok video matcher', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tiktok/matcher/status
 * Get status of the TikTok video matcher job
 */
router.get('/matcher/status', async (req, res) => {
  try {
    const tikTokVideoMatcherJob = (await import('../jobs/tikTokVideoMatcher.js')).default;
    const status = tikTokVideoMatcherJob.getStatus();

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Failed to get TikTok video matcher status', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tiktok/manual-match
 * Manually match a post to a TikTok video
 * Used when automatic matching fails due to timing issues
 */
router.post('/manual-match', async (req, res) => {
  try {
    const { postId, tiktokUrl, tiktokVideoId } = req.body;

    // Validate inputs
    if (!postId) {
      return res.status(400).json({
        success: false,
        error: 'postId is required'
      });
    }

    if (!tiktokUrl && !tiktokVideoId) {
      return res.status(400).json({
        success: false,
        error: 'tiktokUrl or tiktokVideoId is required'
      });
    }

    logger.info('Manual TikTok match requested', { postId, tiktokUrl, tiktokVideoId });

    // Extract video ID from URL if needed
    let videoId = tiktokVideoId;
    if (tiktokUrl) {
      try {
        videoId = extractVideoIdFromUrl(tiktokUrl);
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
    }

    // Validate video ID format (should be numeric, reasonable length)
    if (!videoId || !/^\d{10,20}$/.test(videoId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid TikTok video ID format'
      });
    }

    // Check if post exists
    const post = await MarketingPost.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // Check if post is a TikTok post (handles both new platforms array and legacy platform field)
    const platforms = post.platforms && Array.isArray(post.platforms) && post.platforms.length > 0
      ? post.platforms
      : [post.platform];

    if (!platforms.includes('tiktok')) {
      return res.status(400).json({
        success: false,
        error: 'Post is not a TikTok post'
      });
    }

    // Check if post already has a TikTok video linked (optional warning)
    const existingVideoId = post.tiktokVideoId || post.platformStatus?.tiktok?.mediaId;
    if (existingVideoId) {
      logger.warn('Post already has a TikTok video linked', {
        postId,
        existingVideoId,
        newVideoId: videoId
      });
      // Continue anyway - allow re-matching if needed
    }

    // Fetch video data from TikTok API
    const fetchResult = await tiktokPostingService.fetchUserVideos();
    if (!fetchResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch videos from TikTok',
        details: fetchResult.error
      });
    }

    // Find the video
    const video = fetchResult.videos.find(v => v.id === videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found in TikTok account',
        details: `Video ID ${videoId} not found in the account's videos`
      });
    }

    // Calculate engagement rate
    const engagementRate = video.view_count > 0
      ? ((video.like_count + video.comment_count + video.share_count) / video.view_count) * 100
      : 0;

    const postedAt = new Date(video.create_time * 1000);

    // Update the post with TikTok data
    // Update both legacy fields and new platformStatus for multi-platform posts
    await MarketingPost.findByIdAndUpdate(postId, {
      // Legacy fields (for backward compatibility)
      tiktokVideoId: video.id,
      tiktokShareUrl: video.share_url,
      postedAt: postedAt,
      // New multi-platform fields
      'platformStatus.tiktok.status': 'posted',
      'platformStatus.tiktok.mediaId': video.id,
      'platformStatus.tiktok.shareUrl': video.share_url,
      'platformStatus.tiktok.postedAt': postedAt,
      'platformStatus.tiktok.performanceMetrics.views': video.view_count || 0,
      'platformStatus.tiktok.performanceMetrics.likes': video.like_count || 0,
      'platformStatus.tiktok.performanceMetrics.comments': video.comment_count || 0,
      'platformStatus.tiktok.performanceMetrics.shares': video.share_count || 0,
      'platformStatus.tiktok.performanceMetrics.engagementRate': engagementRate,
      'platformStatus.tiktok.lastFetchedAt': new Date(),
      'platformStatus.tiktok.error': null,
      // Legacy overall performanceMetrics
      'performanceMetrics.views': video.view_count || 0,
      'performanceMetrics.likes': video.like_count || 0,
      'performanceMetrics.comments': video.comment_count || 0,
      'performanceMetrics.shares': video.share_count || 0,
      'performanceMetrics.engagementRate': engagementRate,
      metricsLastFetchedAt: new Date(),
    });

    logger.info('Manual TikTok match successful', {
      postId,
      videoId: video.id,
      views: video.view_count,
      likes: video.like_count,
      postedAt
    });

    return res.json({
      success: true,
      data: {
        postId,
        videoId: video.id,
        shareUrl: video.share_url,
        views: video.view_count,
        likes: video.like_count,
        comments: video.comment_count,
        shares: video.share_count,
        engagementRate,
        postedAt
      }
    });
  } catch (error) {
    logger.error('Manual TikTok match error', {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Helper function to extract video ID from various TikTok URL formats
 * Supports:
 * - https://www.tiktok.com/@user/video/1234567890
 * - https://www.tiktok.com/@blush.app/video/7606860514483916045
 * - https://www.tiktok.com/v/1234567890
 * - Direct ID input: 1234567890
 */
function extractVideoIdFromUrl(url) {
  // Match various TikTok URL formats:
  const patterns = [
    /\/video\/(\d+)/,
    /\/v\/(\d+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  // If no pattern matched, check if the input is a direct ID (numeric, 10-20 digits)
  if (/^\d{10,20}$/.test(url.trim())) {
    return url.trim();
  }

  throw new Error('Could not extract video ID from URL. Please enter a valid TikTok URL or video ID.');
}

export default router;
