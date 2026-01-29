import express from 'express';
import winston from 'winston';
import tiktokPostingService from '../services/tiktokPostingService.js';
import MarketingPost from '../models/MarketingPost.js';

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
 * Step 4: Check sandbox app configured
 */
router.get('/sandbox-status', async (req, res) => {
  try {
    logger.info('Checking TikTok sandbox status...');

    const result = await tiktokPostingService.checkSandboxStatus();

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
 */
router.get('/authorize-url', async (req, res) => {
  try {
    logger.info('Generating TikTok authorization URL...');

    const scopes = req.query.scopes
      ? req.query.scopes.split(',')
      : ['video.upload', 'video.publish'];

    const url = tiktokPostingService.getAuthorizationUrl(scopes);

    res.json({
      success: true,
      data: {
        url,
        scopes,
        message: 'Visit this URL to authorize the application',
      },
    });
  } catch (error) {
    logger.error('Failed to generate authorization URL', {
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
 * Post a marketing post to TikTok
 */
router.post('/post/:postId', async (req, res) => {
  try {
    const { postId } = req.params;

    logger.info('Posting to TikTok...', { postId });

    // Find the marketing post
    const post = await MarketingPost.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Marketing post not found',
      });
    }

    if (post.platform !== 'tiktok') {
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

    // Prepare caption and hashtags
    const caption = post.caption;
    const hashtags = post.hashtags || [];

    // Initialize upload progress tracking
    await post.updateUploadProgress('initializing', 0, 'Starting upload');

    // Progress callback to update database
    const onProgress = async (progressData) => {
      try {
        logger.info('Upload progress update', {
          postId,
          progress: progressData.progress,
          stage: progressData.stage,
          status: progressData.status,
        });

        await post.updateUploadProgress(
          progressData.status,
          progressData.progress,
          progressData.stage,
          progressData.status === 'initializing' ? null : post.uploadProgress?.publishId,
          progressData.error
        );
      } catch (error) {
        logger.error('Failed to update upload progress', {
          error: error.message,
        });
      }
    };

    // Post to TikTok with progress tracking
    const result = await tiktokPostingService.postVideo(
      post.videoPath,
      caption,
      hashtags,
      onProgress
    );

    if (result.success) {
      // Update post status
      post.status = 'posted';
      post.postedAt = new Date();
      post.tiktokVideoId = result.videoId;
      post.tiktokShareUrl = result.shareUrl;

      // Update progress to completed
      await post.updateUploadProgress('completed', 100, 'Successfully posted', result.publishId);

      await post.save();

      logger.info('Successfully posted to TikTok', {
        postId,
        videoId: result.videoId,
      });

      res.json({
        success: true,
        message: 'Posted to TikTok successfully',
        data: {
          videoId: result.videoId,
          shareUrl: result.shareUrl,
          post: {
            id: post._id,
            status: post.status,
            postedAt: post.postedAt,
          },
        },
      });
    } else {
      // Update post status to failed
      post.status = 'failed';
      post.error = result.error;

      // Update progress to failed
      await post.updateUploadProgress('failed', post.uploadProgress?.progress || 0, 'Upload failed', null, result.error);

      await post.save();

      logger.error('Failed to post to TikTok', {
        postId,
        error: result.error,
      });

      res.status(500).json({
        success: false,
        error: result.error,
        code: result.code,
      });
    }
  } catch (error) {
    logger.error('TikTok post failed', {
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

    // Get existing posts
    const existingPosts = await MarketingPost.find({ platform: 'tiktok' });

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

export default router;
