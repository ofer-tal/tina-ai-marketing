/**
 * Post Management Tools for Tina
 *
 * Implementation of post creation, editing, video generation, and scheduling tools.
 * These tools allow Tina to manage marketing posts without requiring approval.
 */

import Story from '../../models/Story.js';
import MarketingPost from '../../models/MarketingPost.js';
import StoryBlacklist from '../../models/StoryBlacklist.js';
import { getLogger } from '../../utils/logger.js';
import tieredVideoGenerator from '../tieredVideoGenerator.js';
import captionGenerationService from '../captionGenerationService.js';
import hashtagGenerationService from '../hashtagGenerationService.js';
import hookGenerationService from '../hookGenerationService.js';

const logger = getLogger('post-management-tools', 'post-management-tools');

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
 * @param {boolean} params.generateVideo - Generate video immediately (default: false)
 * @param {string} params.scheduleFor - ISO date to schedule (optional)
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
    includeMusic = true,
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
  const scheduledDate = scheduleFor ? new Date(scheduleFor) : getNextAvailableSlot();

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

    // Generate video if requested
    if (generateVideo && contentType === 'video') {
      try {
        // Merge provided effects with defaults
        const mergedEffects = { ...DEFAULT_EFFECTS, ...effects };

        const videoResult = await generatePostVideoInternal(post, story, {
          voice,
          preset,
          cta,
          includeMusic,
          effects: mergedEffects
        });

        generationResults.push({
          postId: post._id,
          platform,
          success: videoResult.success,
          videoPath: videoResult.videoPath,
          error: videoResult.error
        });

        // Update post with video path
        if (videoResult.success) {
          post.videoPath = videoResult.videoPath;
          post.generationMetadata = {
            ...post.generationMetadata,
            ...videoResult.metadata
          };
          await post.save();
        }
      } catch (error) {
        logger.error('Video generation failed during post creation', {
          postId: post._id,
          error: error.message
        });
        generationResults.push({
          postId: post._id,
          platform,
          success: false,
          error: error.message
        });
      }
    }

    // Create approval todo for each post
    await createApprovalTodo(post, story);
  }

  return {
    success: true,
    created: createdPosts.length,
    posts: createdPosts.map(p => ({
      id: p._id.toString(),
      platform: p.platform,
      title: p.title,
      status: p.status,
      scheduledAt: p.scheduledAt,
      hasVideo: !!p.videoPath
    })),
    videoGenerated: generateVideo,
    generationResults: generationResults.length > 0 ? generationResults : undefined
  };
}

/**
 * Get the next available posting slot
 *
 * @returns {Date} Next available slot
 */
function getNextAvailableSlot() {
  const now = new Date();
  // Schedule for next optimal time (e.g., 2pm, 6pm, or 10pm)
  const optimalHours = [10, 14, 18, 22];

  for (const hour of optimalHours) {
    const slot = new Date(now);
    slot.setHours(hour, 0, 0, 0);

    if (slot > now) {
      return slot;
    }
  }

  // If all slots passed today, schedule for tomorrow 10am
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  return tomorrow;
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
    includeMusic = true,
    effects = DEFAULT_EFFECTS
  } = options;

  try {
    const result = await tieredVideoGenerator.generateTier1Video({
      story,
      caption: post.caption || '',
      hook: post.hook || '',
      cta,
      voice,
      preset,
      includeMusic,
      effects
    });

    if (result.success) {
      return {
        success: true,
        videoPath: result.videoPath,
        duration: result.duration,
        metadata: {
          ...result.metadata,
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
 * @param {boolean} params.includeMusic - Include background music
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
    includeMusic = true,
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
    includeMusic,
    effects: selectedEffects
  });
  const generationTime = Date.now() - startTime;

  if (!result.success) {
    throw new Error(result.error || 'Video generation failed');
  }

  // Update post with video path
  post.videoPath = result.videoPath;
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
    effects: post.generationMetadata?.effects
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
  const selectedEffects = effects || previousState.effects || DEFAULT_EFFECTS;

  // Generate new video
  const startTime = Date.now();
  const result = await generatePostVideoInternal(post, story, {
    preset: selectedPreset,
    voice: selectedVoice,
    cta: selectedCta,
    includeMusic: true,
    effects: selectedEffects
  });
  const generationTime = Date.now() - startTime;

  if (!result.success) {
    throw new Error(result.error || 'Video regeneration failed');
  }

  // Update post with new video
  post.videoPath = result.videoPath;
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

  if (scheduledDate <= new Date()) {
    throw new Error('Scheduled date must be in the future');
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
  createPost,
  editPost,
  generatePostVideo,
  regeneratePostVideo,
  schedulePosts,
  getRecentActivity
};
