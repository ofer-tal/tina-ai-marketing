/**
 * Post Management Tools for Tina
 *
 * Implementation of post creation, editing, video generation, and scheduling tools.
 * These tools allow Tina to manage marketing posts without requiring approval.
 */

import Story from '../../models/Story.js';
import MarketingPost from '../../models/MarketingPost.js';
import StoryBlacklist from '../../models/StoryBlacklist.js';
import Music from '../../models/Music.js';
import { getLogger } from '../../utils/logger.js';
import tieredVideoGenerator from '../tieredVideoGenerator.js';
import captionGenerationService from '../captionGenerationService.js';
import hashtagGenerationService from '../hashtagGenerationService.js';
import hookGenerationService from '../hookGenerationService.js';
import path from 'path';

const logger = getLogger('post-management-tools', 'post-management-tools');

/**
 * Convert storage file path to URL for frontend access
 * Converts Windows and WSL paths to /storage/ URLs
 * @param {string} filePath - Absolute file path
 * @returns {string|null} URL path like /storage/videos/tier1/final/video.mp4
 */
function storagePathToUrl(filePath) {
  if (!filePath) return null;

  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, '/');

  // Match the storage directory (after normalization to forward slashes)
  // Try multiple patterns: WSL (/mnt/c/...), Windows (C:/...), and already-converted (/storage/...)
  const storageMatch = normalizedPath.match(/\/?mnt\/[cC]\/Projects\/blush-marketing\/storage\/(.+)/) ||
                      normalizedPath.match(/[A-Z]:\/Projects\/blush-marketing\/storage\/(.+)/) ||
                      normalizedPath.match(/\/storage\/(.+)/);

  if (storageMatch) {
    return `/storage/${storageMatch[1]}`;
  }

  // If path is already under /storage, use as-is
  if (normalizedPath.startsWith('/storage/')) {
    return normalizedPath;
  }

  // Log warning if path couldn't be converted
  logger.warn('Could not convert path to URL', { input: filePath, normalized: normalizedPath });
  return filePath; // Return original if no pattern matched
}

// Valid platforms
const VALID_PLATFORMS = ['tiktok', 'instagram', 'youtube_shorts'];

// Valid voices
const VALID_VOICES = ['female_1', 'female_2', 'female_3', 'male_1', 'male_2', 'male_3'];

// Valid content tiers
const VALID_CONTENT_TIERS = ['tier_1', 'tier_2', 'tier_3'];

// Default effects for video generation
const DEFAULT_EFFECTS = {
  kenBurns: true,
  pan: false,
  textOverlay: true,
  vignette: true,
  fadeIn: true,
  fadeOut: true
};

/**
 * Create an approval todo for a newly created post
 *
 * @param {Object} post - MarketingPost document
 * @param {Object} story - Story document
 * @returns {Promise<Object>} Todo creation result
 */
async function createApprovalTodo(post, story) {
  try {
    const mongoose = await import('mongoose');

    // Check if connection is established
    if (!mongoose.connection || !mongoose.connection.db) {
      logger.warn('MongoDB connection not available for approval todo creation');
      return { success: false, error: 'Database connection not available' };
    }

    const platformDisplay = post.platform.charAt(0).toUpperCase() + post.platform.slice(1).replace('_', ' ');
    const title = `✅ Approve Post: ${platformDisplay} - ${post.title.substring(0, 40)}...`;

    // Calculate priority based on scheduled time
    const scheduledAt = post.scheduledAt || new Date();
    const now = new Date();
    const hoursUntilScheduled = (scheduledAt - now) / (1000 * 60 * 60);

    let priority = 'medium';
    if (hoursUntilScheduled < 12) priority = 'urgent';
    else if (hoursUntilScheduled < 48) priority = 'high';
    else if (hoursUntilScheduled > 168) priority = 'low';

    const todo = {
      title,
      description: `Review and approve the marketing post for "${story.name}" scheduled for ${scheduledAt.toLocaleString()}.\n\n` +
        `Platform: ${platformDisplay}\n` +
        `Caption: ${post.caption?.substring(0, 100) || 'N/A'}...\n` +
        `Hook: ${post.hook || 'N/A'}\n` +
        `CTA: ${post.cta || 'N/A'}`,
      category: 'content_approval',
      priority,
      status: 'pending',
      scheduledAt: now,
      dueAt: scheduledAt,
      completedAt: null,
      resources: [
        { type: 'post', id: post._id.toString(), label: `View Post: ${post.title}` },
        { type: 'story', id: story._id.toString(), label: `View Story: ${story.name}` }
      ],
      estimatedTime: 5, // 5 minutes to review
      actualTime: null,
      createdBy: 'tina',
      relatedPostId: post._id.toString(),
      relatedStoryId: story._id.toString(),
      metadata: {
        taskType: 'post_approval',
        platform: post.platform,
        contentType: post.contentType,
        contentTier: post.contentTier,
        hasVideo: !!post.videoPath,
        scheduledAt: scheduledAt.toISOString()
      },
      createdAt: now,
      updatedAt: now
    };

    const result = await mongoose.connection.collection('marketing_tasks').insertOne(todo);

    logger.info('Approval todo created', {
      todoId: result.insertedId,
      postId: post._id,
      priority
    });

    return {
      success: true,
      todoId: result.insertedId
    };
  } catch (error) {
    logger.error('Failed to create approval todo', {
      postId: post._id,
      error: error.message
    });
    return { success: false, error: error.message };
  }
}

/**
 * Get available common library stories for post creation
 *
 * @param {Object} options - Query options
 * @param {string} options.category - Filter by category
 * @param {number} options.spiciness - Maximum spiciness level (0-3)
 * @param {number} options.limit - Maximum number of stories to return
 * @param {string} options.search - Search term for title/category/description
 * @returns {Promise<Object>} Stories response
 */
export async function getStories({ category, spiciness, limit = 20, search } = {}) {
  try {
    const query = {
      userId: null,     // Common library only
      status: 'ready',   // Ready stories only
      'fullStory.textUrl': { $ne: null, $exists: true }  // Only stories with narrated text excerpts
    };

    // Note: category and spiciness are nested under parameters in the actual database
    // We'll filter client-side or use a more complex query if needed

    // Add server-side search if provided
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { 'parameters.category': searchRegex },
        { description: searchRegex }
      ];
    }

    const stories = await Story.find(query)
      .sort({ createdAt: -1 })  // Most recently created first
      .limit(Math.min(parseInt(limit), 50));

    logger.info('Retrieved stories for post creation', {
      count: stories.length,
      category: category || 'all',
      spiciness: spiciness || 'any',
      search: search || 'none'
    });

    // Filter by category/spiciness (nested under parameters) and map results
    let filteredStories = stories;

    if (category && category !== 'all') {
      filteredStories = filteredStories.filter(s =>
        s.category === category || s.parameters?.category === category
      );
    }

    if (spiciness !== undefined) {
      const maxSpiciness = parseInt(spiciness);
      filteredStories = filteredStories.filter(s => {
        const storySpiciness = s.spiciness ?? s.parameters?.spiciness ?? 0;
        return storySpiciness <= maxSpiciness;
      });
    }

    return {
      count: filteredStories.length,
      stories: filteredStories.map(s => ({
        id: s._id.toString(),
        title: s.name || 'Untitled Story',
        name: s.name || 'Untitled Story',
        description: s.description || '',
        category: s.category || s.parameters?.category || 'Other',
        spiciness: s.spiciness ?? s.parameters?.spiciness ?? 0,
        tags: s.tags || [],
        coverPath: s.coverPath || s.imageUrl,
        imageUrl: s.imageUrl,
        thumbnailUrl: s.thumbnailUrl,
        createdAt: s.createdAt
      }))
    };
  } catch (error) {
    logger.error('Error fetching stories', { error: error.message });
    throw new Error(`Failed to fetch stories: ${error.message}`);
  }
}

/**
 * Get available background music tracks
 *
 * @param {Object} options - Query options
 * @param {string} options.style - Filter by style
 * @returns {Promise<Object>} Music tracks response
 */
export async function getMusic({ style = 'all' } = {}) {
  try {
    const query = { status: 'available' };
    if (style && style !== 'all') {
      query.style = style;
    }

    const tracks = await Music.find(query)
      .sort({ timesUsed: -1, createdAt: -1 })
      .limit(50)
      .lean();

    logger.info('Retrieved music tracks for Tina', {
      count: tracks.length,
      style: style || 'all'
    });

    return {
      count: tracks.length,
      tracks: tracks.map(t => ({
        id: t._id.toString(),
        name: t.name,
        style: t.style,
        prompt: t.prompt,
        duration: t.duration,
        timesUsed: t.timesUsed || 0,
        createdAt: t.createdAt
      }))
    };
  } catch (error) {
    logger.error('Error fetching music tracks', { error: error.message });
    throw new Error(`Failed to fetch music tracks: ${error.message}`);
  }
}

/**
 * Validate create post parameters
 *
 * @param {Object} params - Create post parameters
 * @returns {Promise<Object>} Validation result with errors array
 */
async function validateCreatePost(params) {
  const errors = [];

  // Validate storyId exists and is available
  const story = await Story.findOne({
    _id: params.storyId,
    userId: null,     // Common library only
    status: 'ready'   // Ready stories only
  });

  if (!story) {
    errors.push('Story not found or not available for post creation (must be a ready common library story)');
    return { valid: false, errors, story: null };
  }

  // Validate platforms
  if (!params.platforms || !Array.isArray(params.platforms) || params.platforms.length === 0) {
    errors.push('At least one platform must be specified');
  } else {
    for (const platform of params.platforms) {
      if (!VALID_PLATFORMS.includes(platform)) {
        errors.push(`Invalid platform: ${platform}. Valid options: ${VALID_PLATFORMS.join(', ')}`);
      }
    }
  }

  // Validate voice
  if (params.voice && !VALID_VOICES.includes(params.voice)) {
    errors.push(`Invalid voice: ${params.voice}. Valid options: ${VALID_VOICES.join(', ')}`);
  }

  // Validate contentTier
  if (params.contentTier && !VALID_CONTENT_TIERS.includes(params.contentTier)) {
    errors.push(`Invalid content tier: ${params.contentTier}. Valid options: ${VALID_CONTENT_TIERS.join(', ')}`);
  }

  // Check if story is blacklisted
  const blacklisted = await StoryBlacklist.findOne({
    storyId: params.storyId,
    isActive: true
  });

  if (blacklisted) {
    errors.push(`Story is blacklisted. Reason: ${blacklisted.reason || 'No reason provided'}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    story
  };
}

/**
 * Create a new marketing post from a story
 *
 * IMPORTANT: Video generation is ASYNCHRONOUS. When generateVideo=true, this function
 * returns immediately after launching the generation process. The video will be generated
 * in the background. Check the post's videoGenerationProgress.status to track completion.
 *
 * @param {Object} params - Create post parameters
 * @param {string} params.storyId - Story ID
 * @param {Array<string>} params.platforms - Target platforms
 * @param {string} params.caption - Post caption (optional - auto-generated)
 * @param {string} params.hook - Hook text (optional - auto-generated)
 * @param {Array<string>} params.hashtags - Hashtags (optional - auto-generated)
 * @param {string} params.contentType - Content type (default: 'video')
 * @param {string} params.contentTier - Content tier (default: 'tier_1')
 * @param {Object} params.tierParameters - Tier-specific parameters (e.g., animationStyle for tier_1)
 * @param {string} params.voice - Voice selection (default: 'female_1')
 * @param {boolean} params.generateVideo - Generate video immediately (default: true, ASYNC)
 * @param {string} params.scheduleFor - ISO date to schedule (optional - auto-scheduled if not provided)
 * @returns {Promise<Object>} Created post data
 */
export async function createPost(params = {}) {
  const {
    storyId,
    platforms,
    caption: providedCaption,
    hook: providedHook,
    hashtags: providedHashtags,
    contentType = 'video',
    contentTier = 'tier_1',
    tierParameters = {},
    // Tier 1 specific parameters
    preset = 'triple_visual',
    cta = 'Read more on Blush 🔥',
    musicId = null,
    effects = {},
    voice = 'female_1',
    generateVideo = true,
    scheduleFor
  } = params;

  // Validate parameters
  const validation = await validateCreatePost(params);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
  }

  const story = validation.story;

  // Auto-generate caption if not provided
  let caption = providedCaption;
  if (!caption) {
    try {
      caption = await captionGenerationService.generateForStory(story, {
        platform: platforms[0],
        maxLength: 500
      });
    } catch (error) {
      logger.warn('Caption generation failed, using fallback', { error: error.message });
      caption = `Check out this amazing ${story.category || story.parameters?.category || 'Other'} story! "${story.name}" - available now on the blush app. 💕`;
    }
  }

  // Auto-generate hook if not provided
  let hook = providedHook;
  if (!hook) {
    try {
      hook = await hookGenerationService.generateForStory(story, {
        platform: platforms[0]
      });
    } catch (error) {
      logger.warn('Hook generation failed, using fallback', { error: error.message });
      hook = `You won't believe what happens next...`;
    }
  }

  // Auto-generate hashtags if not provided
  let hashtags = providedHashtags;
  if (!hashtags || hashtags.length === 0) {
    try {
      hashtags = await hashtagGenerationService.generateForStory(story, {
        platform: platforms[0],
        count: 8
      });
    } catch (error) {
      logger.warn('Hashtag generation failed, using fallback', { error: error.message });
      hashtags = ['#blushapp', '#romance', '#storytime', '#fyp', '#viral'];
    }
  }

  // Determine scheduled date
  let scheduledDate;
  if (scheduleFor) {
    scheduledDate = new Date(scheduleFor);

    // Validate the date is valid
    if (isNaN(scheduledDate.getTime())) {
      throw new Error('Invalid scheduled date format. Use ISO 8601 format (e.g., 2026-02-02T15:00:00Z)');
    }

    // Validate the date is in the future (at least 30 minutes from now to account for processing time)
    const now = new Date();
    const minScheduleTime = new Date(now.getTime() + 30 * 60 * 1000);
    if (scheduledDate < minScheduleTime) {
      // If the requested time is in the past, use the next available slot instead
      logger.warn('Requested scheduled time is in the past, using next available slot', {
        requestedTime: scheduleFor,
        currentTime: now.toISOString(),
        minScheduleTime: minScheduleTime.toISOString()
      });
      scheduledDate = getNextAvailableSlot();
    }
  } else {
    scheduledDate = getNextAvailableSlot();
  }

  // Create posts for each platform
  const createdPosts = [];
  const generationResults = [];

  for (const platform of platforms) {
    // Convert tierParameters object to Map format for Mongoose
    const tierParametersMap = new Map(
      Object.entries(tierParameters).map(([key, value]) => [key, { parameterKey: key, parameterValue: value }])
    );

    // Convert effects object to array of effect names (where value is true)
    const effectsArray = Object.entries(DEFAULT_EFFECTS)
      .filter(([_, enabled]) => enabled)
      .map(([name, _]) => name);

    const post = new MarketingPost({
      title: `${story.name} - ${platform}`,
      description: story.description || `Marketing post for ${story.name}`,
      platform,
      status: 'draft',
      contentType,
      contentTier,
      caption,
      hook,
      cta,
      hashtags,
      scheduledAt: scheduledDate,
      storyId: story._id,
      storyName: story.name,
      storyCategory: story.category || story.parameters?.category || 'Other',
      storySpiciness: story.spiciness ?? story.parameters?.spiciness ?? 1,
      tierParameters: tierParametersMap,
      generationMetadata: {
        tier: contentTier,
        preset,
        voice,
        musicId,
        effects: effectsArray
      }
    });

    await post.save();
    createdPosts.push(post);

    logger.info('Created marketing post', {
      postId: post._id,
      platform,
      storyId: story._id,
      status: post.status
    });

    // Generate video if requested - ASYNCHRONOUS (launch and forget)
    if (generateVideo && contentType === 'video') {
      // Merge provided effects with defaults
      const mergedEffects = { ...DEFAULT_EFFECTS, ...effects };

      logger.info('Launching ASYNCHRONOUS video generation for post', {
        postId: post._id,
        platform,
        musicId,
        hasMusic: !!musicId
      });

      // Mark post as generating - this happens synchronously
      post.status = 'generating';
      post.videoGenerationProgress = {
        status: 'initializing',
        progress: 0,
        currentStep: 'Initializing...',
        totalSteps: 7,
        startedAt: new Date()
      };
      await post.save();

      // Launch async generation WITHOUT awaiting
      // This returns immediately to the LLM
      generatePostVideoInternal(post, story, {
        voice,
        preset,
        cta,
        musicId,
        effects: mergedEffects
      }).then(async (videoResult) => {
        if (videoResult.success) {
          post.videoPath = videoResult.videoPath;
          post.thumbnailPath = videoResult.thumbnailPath;
          post.status = 'ready';
          post.videoGenerationProgress = {
            status: 'completed',
            progress: 100,
            currentStep: 'Complete',
            completedAt: new Date(),
            result: {
              videoPath: videoResult.videoPath,
              duration: videoResult.duration,
              metadata: videoResult.metadata
            }
          };
          post.generationMetadata = {
            ...post.generationMetadata,
            ...videoResult.metadata
          };
          logger.info('Async video generation completed', {
            postId: post._id,
            videoPath: videoResult.videoPath
          });
          // Create approval todo NOW that video is ready
          await createApprovalTodo(post, story);
        } else {
          post.status = 'draft';
          post.videoGenerationProgress = {
            status: 'failed',
            progress: 0,
            currentStep: 'Failed',
            completedAt: new Date(),
            errorMessage: videoResult.error
          };
          logger.error('Async video generation failed', {
            postId: post._id,
            error: videoResult.error
          });
        }
        await post.save();
      }).catch(async (error) => {
        logger.error('Async video generation error', {
          postId: post._id,
          error: error.message
        });
        post.status = 'draft';
        post.videoGenerationProgress = {
          status: 'failed',
          progress: 0,
          currentStep: 'Failed',
          completedAt: new Date(),
          errorMessage: error.message
        };
        await post.save();
      });

      generationResults.push({
        postId: post._id,
        platform,
        launched: true,
        message: 'Video generation launched asynchronously'
      });
    }
  }

  // Note: Approval todo is created when async video generation completes
  // Not immediately, to avoid confusion with posts still generating

  return {
    success: true,
    created: createdPosts.length,
    posts: createdPosts.map(p => ({
      id: p._id.toString(),
      platform: p.platform,
      title: p.title,
      status: p.status,
      scheduledAt: p.scheduledAt,
      hasVideo: !!p.videoPath,
      videoGenerationStatus: p.videoGenerationProgress?.status || 'not_started'
    })),
    videoGenerated: false, // Always false now - video generation is async
    message: generateVideo
      ? `Launched async video generation for ${createdPosts.length} post(s). Videos are generating in the background. Approval todos will be created once generation completes (check back in a few minutes).`
      : `${createdPosts.length} post(s) created without video generation.`,
    generationResults: generationResults.length > 0 ? generationResults : undefined,
    asyncVideoGeneration: true // Explicitly flag that this is async
  };
}

/**
 * Get the next available posting slot
 *
 * Business hours logic:
 * - MORNING: 8am-11am (best for "tomorrow morning" requests)
 * - AFTERNOON: 2pm-5pm
 * - EVENING: 7pm-10pm
 * - Avoids: late night (11pm-6am), early morning (6am-7am)
 *
 * @returns {Date} Next available slot
 */
function getNextAvailableSlot() {
  const now = new Date();

  // Define posting windows (start hour, end hour exclusive)
  // These are SOCIAL MEDIA posting times, not work hours
  const windows = [
    { name: 'morning', start: 8, end: 11 },   // 8am-11am
    { name: 'afternoon', start: 14, end: 17 }, // 2pm-5pm
    { name: 'evening', start: 19, end: 22 }    // 7pm-10pm
  ];

  // Try each window for today
  for (const window of windows) {
    const slot = new Date(now);
    slot.setHours(window.start, 0, 0, 0);

    if (slot > now) {
      // Still within this window today
      return slot;
    }
  }

  // All windows passed today - schedule for tomorrow morning at 9am
  // (Middle of morning window, not too early, not too late)
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return tomorrow;
}

/**
 * Get the next available posting slot with flexible timing
 *
 * @param {string} timePreference - Optional: 'morning', 'afternoon', 'evening', or 'any'
 * @param {number} daysFromNow - Optional: days offset (0=today, 1=tomorrow, etc.)
 * @returns {Date} Next available slot
 */
function getAvailableSlot(timePreference = 'any', daysFromNow = 0) {
  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + daysFromNow);
  targetDate.setHours(0, 0, 0, 0);

  // Define posting windows
  const windows = {
    morning: { start: 8, end: 11, defaultHour: 9 },
    afternoon: { start: 14, end: 17, defaultHour: 15 },
    evening: { start: 19, end: 22, defaultHour: 20 }
  };

  // If asking for today and preference is 'any', use next available
  if (daysFromNow === 0 && timePreference === 'any') {
    return getNextAvailableSlot();
  }

  // If specific time preference
  if (timePreference !== 'any' && windows[timePreference]) {
    const window = windows[timePreference];
    const slot = new Date(targetDate);
    slot.setHours(window.defaultHour, 0, 0, 0);

    // If slot is in the past and we're asking for today, move to tomorrow
    if (slot <= now && daysFromNow === 0) {
      slot.setDate(slot.getDate() + 1);
    }

    return slot;
  }

  // Default to tomorrow morning if daysFromNow > 0
  if (daysFromNow > 0) {
    const slot = new Date(targetDate);
    slot.setHours(9, 0, 0, 0);
    return slot;
  }

  return getNextAvailableSlot();
}

/**
 * Edit an existing post
 *
 * @param {Object} params - Edit parameters
 * @param {string} params.postId - Post ID to edit
 * @param {string} params.caption - New caption
 * @param {string} params.hook - New hook
 * @param {Array<string>} params.hashtags - New hashtags
 * @param {string} params.voice - New voice
 * @param {string} params.contentTier - New content tier
 * @returns {Promise<Object>} Updated post data
 */
export async function editPost(params = {}) {
  const {
    postId,
    caption,
    hook,
    hashtags,
    voice,
    contentTier
  } = params;

  // Find post
  const post = await MarketingPost.findById(postId);
  if (!post) {
    throw new Error('Post not found');
  }

  // Check if post can be edited
  if (post.status === 'posted') {
    throw new Error('Cannot edit posted posts');
  }

  // Track if this is an approved/scheduled post (requires re-approval)
  const wasApproved = ['approved', 'scheduled'].includes(post.status);
  const resetToPending = wasApproved;

  // Build update object
  const updates = {};
  const changes = [];

  if (caption !== undefined && caption !== post.caption) {
    updates.caption = caption;
    changes.push('caption');
  }

  if (hook !== undefined && hook !== post.hook) {
    updates.hook = hook;
    changes.push('hook');
  }

  if (hashtags !== undefined) {
    updates.hashtags = hashtags;
    changes.push('hashtags');
  }

  if (voice !== undefined) {
    if (!VALID_VOICES.includes(voice)) {
      throw new Error(`Invalid voice: ${voice}`);
    }
    updates.generationMetadata = { ...post.generationMetadata, voice };
    changes.push('voice');
  }

  if (contentTier !== undefined) {
    if (!VALID_CONTENT_TIERS.includes(contentTier)) {
      throw new Error(`Invalid content tier: ${contentTier}`);
    }
    updates.contentTier = contentTier;
    updates.generationMetadata = { ...post.generationMetadata, tier: contentTier };
    changes.push('contentTier');
  }

  if (Object.keys(updates).length === 0) {
    return {
      success: true,
      message: 'No changes to apply',
      post: {
        id: post._id.toString(),
        status: post.status,
        changes: []
      }
    };
  }

  // Update status if needed
  if (resetToPending) {
    updates.status = 'pending';
    // Add to approval history
    updates.approvalHistory = post.approvalHistory || [];
    updates.approvalHistory.push({
      timestamp: new Date(),
      action: 'edited',
      userId: 'tina_tool',
      details: {
        reason: 'Post edited after approval',
        changes: changes
      }
    });
  }

  // Apply updates
  Object.assign(post, updates);
  await post.save();

  logger.info('Post edited', {
    postId: post._id,
    changes,
    wasApproved,
    resetToPending
  });

  return {
    success: true,
    message: resetToPending
      ? 'Post updated. Status reset to pending, requiring re-approval.'
      : 'Post updated successfully.',
    post: {
      id: post._id.toString(),
      status: post.status,
      changes,
      resetToPending
    }
  };
}

/**
 * Internal function to generate video for a post
 *
 * @param {MarketingPost} post - Post document
 * @param {Story} story - Story document
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Generation result
 */
async function generatePostVideoInternal(post, story, options = {}) {
  const {
    voice = post.generationMetadata?.voice || 'female_1',
    preset = 'triple_visual',
    cta = post.cta || 'Read more on Blush 🔥',
    musicId = null,
    effects = DEFAULT_EFFECTS
  } = options;

  logger.info('generatePostVideoInternal called', {
    postId: post._id,
    musicId,
    hasMusic: !!musicId
  });

  try {
    const result = await tieredVideoGenerator.generateTier1Video({
      story,
      caption: post.caption || '',
      hook: post.hook || '',
      cta,
      voice,
      preset,
      musicId,
      effects
    });

    if (result.success) {
      return {
        success: true,
        videoPath: storagePathToUrl(result.videoPath),
        thumbnailPath: storagePathToUrl(result.thumbnailPath),
        duration: result.duration,
        metadata: {
          ...result.metadata,
          preset,
          musicId,
          voice,
          videoGeneratedAt: new Date()
        }
      };
    } else {
      return {
        success: false,
        error: result.error || 'Video generation failed'
      };
    }
  } catch (error) {
    logger.error('Video generation error', { error: error.message });
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check video generation services health
 *
 * @returns {Promise<Object>} Health status
 */
async function checkVideoServicesHealth() {
  // In a real implementation, this would check the actual services
  // For now, assume healthy if the tieredVideoGenerator is available
  return {
    healthy: true,
    services: {
      imageGen: 'healthy',
      tts: 'healthy',
      ffmpeg: 'healthy',
      audio: 'healthy'
    }
  };
}

/**
 * Generate video for an existing post
 *
 * @param {Object} params - Generation parameters
 * @param {string} params.postId - Post ID
 * @param {string} params.preset - Slide composition preset
 * @param {string} params.voice - Voice selection
 * @param {string} params.cta - Call-to-action text (supports emojis)
 * @param {string} params.musicId - Background music track ID (optional)
 * @param {Object} params.effects - Effect configuration
 * @param {boolean} params.forceRegenerate - Force regeneration even if video exists
 * @returns {Promise<Object>} Generation result
 */
export async function generatePostVideo(params = {}) {
  const {
    postId,
    preset,
    voice,
    cta,
    musicId = null,
    effects,
    forceRegenerate = false
  } = params;

  // Find post
  const post = await MarketingPost.findById(postId);
  if (!post) {
    throw new Error('Post not found');
  }

  if (!post.storyId) {
    throw new Error('Post has no associated story');
  }

  // Check if video already exists
  if (post.videoPath && !forceRegenerate) {
    return {
      success: true,
      skipped: true,
      message: 'Video already exists',
      postId: post._id.toString(),
      videoPath: post.videoPath
    };
  }

  // Check services health
  const health = await checkVideoServicesHealth();
  if (!health.healthy) {
    throw new Error('Video generation services not available');
  }

  // Get story
  const story = await Story.findById(post.storyId);
  if (!story) {
    throw new Error('Associated story not found');
  }

  // Determine voice
  const selectedVoice = voice || post.generationMetadata?.voice || 'female_1';

  // Determine preset
  const selectedPreset = preset || post.generationMetadata?.preset || 'triple_visual';

  // Determine CTA
  const selectedCta = cta || post.cta || 'Read more on Blush 🔥';

  // Determine effects
  const selectedEffects = effects || post.generationMetadata?.effects || DEFAULT_EFFECTS;

  // Generate video
  const startTime = Date.now();
  const result = await generatePostVideoInternal(post, story, {
    voice: selectedVoice,
    preset: selectedPreset,
    cta: selectedCta,
    musicId,
    effects: selectedEffects
  });
  const generationTime = Date.now() - startTime;

  if (!result.success) {
    throw new Error(result.error || 'Video generation failed');
  }

  // Update post with video path and thumbnail (already URL-formatted)
  post.videoPath = result.videoPath;
  post.thumbnailPath = result.thumbnailPath;
  post.generationMetadata = {
    ...post.generationMetadata,
    ...result.metadata,
    preset: selectedPreset,
    voice: selectedVoice,
    effects: selectedEffects,
    generationTime
  };
  await post.save();

  // Create approval todo for regenerated video
  await createApprovalTodo(post, story);

  logger.info('Video generated for post', {
    postId: post._id,
    videoPath: result.videoPath,
    duration: result.duration,
    generationTime
  });

  return {
    success: true,
    postId: post._id.toString(),
    videoPath: result.videoPath,
    duration: result.duration,
    generationTime,
    skipped: false,
    metadata: result.metadata
  };
}

/**
 * Regenerate video with feedback
 *
 * @param {Object} params - Regeneration parameters
 * @param {string} params.postId - Post ID
 * @param {string} params.feedback - What to change
 * @param {string} params.voice - New voice
 * @param {string} params.hook - New hook
 * @param {string} params.caption - New caption
 * @param {string} params.cta - New call-to-action text (supports emojis)
 * @param {Object} params.effects - New effects
 * @returns {Promise<Object>} Regeneration result
 */
export async function regeneratePostVideo(params = {}) {
  const {
    postId,
    preset,
    feedback,
    voice,
    hook,
    caption,
    cta,
    musicId = null,
    effects
  } = params;

  // Find post
  const post = await MarketingPost.findById(postId);
  if (!post) {
    throw new Error('Post not found');
  }

  // Track regeneration count
  const currentCount = post.regenerationCount || 0;
  if (currentCount >= 3) {
    logger.warn('Post regeneration limit reached', { postId, count: currentCount });
  }

  // Store previous state in history
  const previousState = {
    preset: post.generationMetadata?.preset,
    videoPath: post.videoPath,
    caption: post.caption,
    hook: post.hook,
    cta: post.cta,
    hashtags: [...(post.hashtags || [])],
    voice: post.generationMetadata?.voice,
    effects: post.generationMetadata?.effects,
    musicId: post.generationMetadata?.musicId
  };

  // Update caption/hook/cta/preset if provided
  if (caption) post.caption = caption;
  if (hook) post.hook = hook;
  if (cta) post.cta = cta;
  if (preset) {
    post.generationMetadata = post.generationMetadata || {};
    post.generationMetadata.preset = preset;
  }

  // Add to regeneration history
  post.regenerationHistory = post.regenerationHistory || [];
  post.regenerationHistory.push({
    timestamp: new Date(),
    feedback,
    previousCaption: previousState.caption,
    previousHashtags: previousState.hashtags,
    previousHook: previousState.hook
  });

  // Track in approval history
  post.approvalHistory = post.approvalHistory || [];
  post.approvalHistory.push({
    timestamp: new Date(),
    action: 'regenerated',
    userId: 'tina_tool',
    details: {
      feedback,
      previousCaption: previousState.caption,
      previousHook: previousState.hook
    }
  });

  // Update regeneration count
  post.regenerationCount = currentCount + 1;
  post.lastRegeneratedAt = new Date();

  // Reset status to draft
  post.status = 'draft';
  post.feedback = feedback;

  await post.save();

  // Get story
  const story = await Story.findById(post.storyId);
  if (!story) {
    throw new Error('Associated story not found');
  }

  // Determine generation parameters
  const selectedPreset = preset || previousState.preset || 'triple_visual';
  const selectedVoice = voice || previousState.voice || 'female_1';
  const selectedCta = cta || previousState.cta || 'Read more on Blush 🔥';
  const selectedMusicId = musicId !== null ? musicId : previousState.musicId;
  const selectedEffects = effects || previousState.effects || DEFAULT_EFFECTS;

  // Generate new video
  const startTime = Date.now();
  const result = await generatePostVideoInternal(post, story, {
    preset: selectedPreset,
    voice: selectedVoice,
    cta: selectedCta,
    musicId: selectedMusicId,
    effects: selectedEffects
  });
  const generationTime = Date.now() - startTime;

  if (!result.success) {
    throw new Error(result.error || 'Video regeneration failed');
  }

  // Update post with new video and thumbnail (already URL-formatted)
  post.videoPath = result.videoPath;
  post.thumbnailPath = result.thumbnailPath;
  post.generationMetadata = {
    ...post.generationMetadata,
    ...result.metadata,
    preset: selectedPreset,
    voice: selectedVoice,
    cta: selectedCta,
    effects: selectedEffects,
    generationTime
  };
  await post.save();

  // Create approval todo for regenerated video
  await createApprovalTodo(post, story);

  logger.info('Video regenerated for post', {
    postId: post._id,
    feedback,
    regenerationCount: post.regenerationCount,
    newVideoPath: result.videoPath
  });

  return {
    success: true,
    postId: post._id.toString(),
    previousVideoPath: previousState.videoPath,
    newVideoPath: result.videoPath,
    regenerationCount: post.regenerationCount,
    warning: post.regenerationCount >= 3
      ? 'This post has been regenerated 3+ times. Consider creating a new post instead.'
      : undefined,
    metadata: result.metadata
  };
}

/**
 * Schedule posts for specific dates
 *
 * @param {Object} params - Scheduling parameters
 * @param {Array<string>} params.postIds - Post IDs to schedule
 * @param {string} params.scheduledAt - ISO date for scheduling
 * @returns {Promise<Object>} Scheduling result
 */
export async function schedulePosts(params = {}) {
  const { postIds, scheduledAt } = params;

  if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
    throw new Error('At least one post ID must be provided');
  }

  // Validate date
  const scheduledDate = new Date(scheduledAt);
  if (isNaN(scheduledDate.getTime())) {
    throw new Error('Invalid scheduled date');
  }

  // Validate the date is in the future (at least 30 minutes from now)
  const now = new Date();
  const minScheduleTime = new Date(now.getTime() + 30 * 60 * 1000);
  if (scheduledDate < minScheduleTime) {
    throw new Error(`Scheduled date must be at least 30 minutes in the future. Current time: ${now.toISOString()}, Minimum: ${minScheduleTime.toISOString()}`);
  }

  // Find all posts
  const posts = await MarketingPost.find({
    _id: { $in: postIds }
  });

  if (posts.length !== postIds.length) {
    throw new Error('Some posts not found');
  }

  const scheduled = [];
  const skipped = [];

  for (const post of posts) {
    // Only approved posts can be scheduled
    if (post.status !== 'approved') {
      skipped.push({
        id: post._id.toString(),
        reason: `Post status is "${post.status}", must be "approved"`
      });
      continue;
    }

    // Schedule the post
    post.status = 'scheduled';
    post.scheduledAt = scheduledDate;
    await post.save();

    scheduled.push({
      id: post._id.toString(),
      scheduledFor: scheduledDate
    });

    logger.info('Post scheduled', {
      postId: post._id,
      scheduledFor: scheduledDate
    });
  }

  return {
    success: true,
    scheduled: scheduled.length,
    skipped: skipped.length,
    scheduledPosts: scheduled,
    skippedPosts: skipped
  };
}

/**
 * Get Tina's recent activity - tool calls, posts created, videos generated
 * This gives Tina memory of what she recently did
 *
 * @param {Object} params - Function parameters
 * @param {number} params.limit - Maximum number of activities to return
 * @param {string} params.activityType - Filter by activity type
 * @returns {Promise<Object>} Recent activity data
 */
export async function getRecentActivity({ limit = 20, activityType = 'all' } = {}) {
  try {
    const ToolProposal = (await import('../../models/ToolProposal.js')).default;
    const mongoose = await import('mongoose');

    const activities = [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get recent tool proposals from the last hour (Tina's actions)
    const recentProposals = await ToolProposal.find({
      proposedBy: 'tina',
      createdAt: { $gte: oneDayAgo }
    })
      .sort({ createdAt: -1 })
      .limit(limit);

    for (const proposal of recentProposals) {
      if (activities.length >= limit) break;

      const timeAgo = getTimeAgo(proposal.createdAt);
      const activity = {
        type: 'tool_call',
        timestamp: proposal.createdAt,
        timeAgo,
        toolName: proposal.toolName,
        status: proposal.status,
        parameters: proposal.toolParameters
      };

      // Add specific details based on tool type
      if (proposal.toolName === 'create_post') {
        const params = proposal.toolParameters;
        activity.summary = `Created post for story ${params.storyId?.substring(0, 8)}...`;
        activity.details = {
          platforms: params.platforms || [],
          preset: params.preset || 'triple_visual',
          voice: params.voice || 'female_1',
          cta: params.cta || 'Read more on Blush 🔥',
          generateVideo: params.generateVideo !== false,
          scheduleFor: params.scheduleFor || null
        };
      } else if (proposal.toolName === 'generate_post_video') {
        const params = proposal.toolParameters;
        activity.summary = `Generated video for post ${params.postId?.substring(0, 8)}...`;
        activity.details = {
          preset: params.preset || 'triple_visual',
          voice: params.voice || 'female_1',
          forceRegenerate: params.forceRegenerate || false
        };
      } else if (proposal.toolName === 'regenerate_post_video') {
        const params = proposal.toolParameters;
        activity.summary = `Regenerated video for post ${params.postId?.substring(0, 8)}...`;
        activity.details = {
          preset: params.preset || 'triple_visual',
          feedback: params.feedback || 'No feedback provided'
        };
      } else if (proposal.toolName === 'get_stories') {
        const params = proposal.toolParameters;
        activity.summary = `Searched for stories`;
        activity.details = {
          search: params.search || null,
          category: params.category || null,
          spiciness: params.spiciness || null,
          limit: params.limit || 20
        };
      } else {
        activity.summary = `Called ${proposal.toolName}`;
      }

      // Add execution result if available
      if (proposal.executionResult) {
        activity.result = proposal.executionResult;
      }

      activities.push(activity);
    }

    // Get recently created posts (last day)
    // Note: MarketingPost doesn't have createdBy field, so we just get recent posts
    if (activityType === 'all' || activityType === 'posts_created') {
      const recentPosts = await MarketingPost.find({
        createdAt: { $gte: oneDayAgo }
      })
        .sort({ createdAt: -1 })
        .limit(Math.floor(limit / 2));

      for (const post of recentPosts) {
        if (activities.length >= limit) break;

        activities.push({
          type: 'post_created',
          timestamp: post.createdAt,
          timeAgo: getTimeAgo(post.createdAt),
          summary: `Created "${post.title}" for ${post.platform}`,
          details: {
            postId: post._id.toString(),
            platform: post.platform,
            status: post.status,
            contentType: post.contentType,
            contentTier: post.contentTier,
            preset: post.generationMetadata?.preset || 'triple_visual',
            voice: post.generationMetadata?.voice || 'female_1',
            hasVideo: !!post.videoPath,
            scheduledAt: post.scheduledAt
          }
        });
      }
    }

    // Sort by timestamp (newest first)
    activities.sort((a, b) => b.timestamp - a.timestamp);

    // Take only the requested limit
    const limitedActivities = activities.slice(0, limit);

    logger.info('Retrieved recent activity for Tina', {
      count: limitedActivities.length,
      activityType,
      limit
    });

    return {
      success: true,
      activities: limitedActivities,
      summary: generateActivitySummary(limitedActivities)
    };
  } catch (error) {
    logger.error('Error getting recent activity', { error: error.message });
    return {
      success: false,
      error: error.message,
      activities: []
    };
  }
}

/**
 * Generate a human-readable time ago string
 */
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

/**
 * Generate a summary of recent activities
 */
function generateActivitySummary(activities) {
  if (activities.length === 0) {
    return 'No recent activity found.';
  }

  const toolCalls = activities.filter(a => a.type === 'tool_call').length;
  const postsCreated = activities.filter(a => a.type === 'post_created').length;
  const videosGenerated = activities.filter(a =>
    a.toolName === 'generate_post_video' || a.toolName === 'regenerate_post_video'
  ).length;

  const parts = [];
  if (toolCalls > 0) parts.push(`${toolCalls} tool call${toolCalls > 1 ? 's' : ''}`);
  if (postsCreated > 0) parts.push(`${postsCreated} post${postsCreated > 1 ? 's' : ''} created`);
  if (videosGenerated > 0) parts.push(`${videosGenerated} video${videosGenerated > 1 ? 's' : ''} generated`);

  return parts.length > 0 ? parts.join(', ') : 'No recent activity';
}

export default {
  getStories,
  getMusic,
  createPost,
  editPost,
  generatePostVideo,
  regeneratePostVideo,
  schedulePosts,
  getRecentActivity
};
