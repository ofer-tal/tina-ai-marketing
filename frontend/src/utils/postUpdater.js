/**
 * Post Updater Utility
 *
 * Smart in-place merging for post arrays.
 * Preserves scroll position, modal states, and filter states by updating
 * only the changed data without full array replacement.
 *
 * All functions are pure and return the same array reference when no changes
 * are needed, preventing unnecessary React re-renders.
 */

/**
 * Merge a single updated post into existing posts array
 * Updates the post in-place if it exists, or prepends if new
 *
 * @param {Array<Object>} posts - Current posts array
 * @param {Object} updatedPost - Post data to merge
 * @returns {Array<Object>} Updated posts array (same ref if no change)
 */
export function mergeUpdatedPost(posts, updatedPost) {
  if (!posts || !updatedPost) {
    return posts;
  }

  // Find post index
  const index = posts.findIndex(p => p._id === updatedPost._id || p.id === updatedPost._id);

  if (index === -1) {
    // Post doesn't exist - prepend as new post
    return [updatedPost, ...posts];
  }

  // Check if post actually changed (shallow compare of key fields)
  const existingPost = posts[index];
  const hasChanged = isPostChanged(existingPost, updatedPost);

  if (!hasChanged) {
    return posts; // Return same reference to prevent re-render
  }

  // Create new array with updated post (preserves position)
  const newPosts = [...posts];
  newPosts[index] = {
    ...existingPost,
    ...updatedPost,
    // Preserve nested objects that weren't updated
    videoGenerationProgress: updatedPost.videoGenerationProgress || existingPost.videoGenerationProgress,
    uploadProgress: updatedPost.uploadProgress || existingPost.uploadProgress
  };

  return newPosts;
}

/**
 * Merge multiple new posts into existing posts array
 * Prepends new posts that don't exist, updates existing ones
 *
 * @param {Array<Object>} posts - Current posts array
 * @param {Array<Object>} newPosts - Posts to merge
 * @param {string} sortBy - Sort field (default: 'createdAt')
 * @param {string} sortOrder - 'desc' or 'asc' (default: 'desc')
 * @returns {Array<Object>} Updated posts array
 */
export function mergeNewPosts(posts, newPosts, sortBy = 'createdAt', sortOrder = 'desc') {
  if (!posts || !newPosts || newPosts.length === 0) {
    return posts;
  }

  // Create a map of existing posts by ID for fast lookup
  const existingIds = new Set(posts.map(p => p._id || p.id));

  // Separate into updates and truly new posts
  const updates = [];
  const trulyNew = [];

  for (const newPost of newPosts) {
    const id = newPost._id || newPost.id;
    if (existingIds.has(id)) {
      updates.push(newPost);
    } else {
      trulyNew.push(newPost);
    }
  }

  let result = posts;

  // Apply updates
  for (const updatedPost of updates) {
    result = mergeUpdatedPost(result, updatedPost);
  }

  // Prepend truly new posts (sorted by date)
  if (trulyNew.length > 0) {
    const sorted = [...trulyNew].sort((a, b) => {
      const aVal = a[sortBy] || a.createdAt || 0;
      const bVal = b[sortBy] || b.createdAt || 0;
      const aDate = new Date(aVal).getTime();
      const bDate = new Date(bVal).getTime();
      return sortOrder === 'desc' ? bDate - aDate : aDate - bDate;
    });
    result = [...sorted, ...result];
  }

  return result;
}

/**
 * Remove a deleted post from posts array
 *
 * @param {Array<Object>} posts - Current posts array
 * @param {string} deletedPostId - ID of post to remove
 * @returns {Array<Object>} Updated posts array (same ref if not found)
 */
export function removeDeletedPost(posts, deletedPostId) {
  if (!posts || !deletedPostId) {
    return posts;
  }

  const index = posts.findIndex(p => p._id === deletedPostId || p.id === deletedPostId);

  if (index === -1) {
    return posts; // Post not found, return same reference
  }

  // Create new array without the deleted post
  const newPosts = [...posts];
  newPosts.splice(index, 1);
  return newPosts;
}

/**
 * Merge progress update into posts array
 * Updates only the progress fields of a specific post
 *
 * @param {Array<Object>} posts - Current posts array
 * @param {string} postId - ID of post to update
 * @param {Object} progressData - Progress data
 * @param {string} [progressData.stage] - Current stage
 * @param {number} [progressData.percent] - Progress percentage
 * @param {string} [progressData.message] - Progress message
 * @param {string} [progressData.status] - Post status
 * @returns {Array<Object>} Updated posts array (same ref if no change)
 */
export function mergeProgressUpdate(posts, postId, progressData) {
  if (!posts || !postId || !progressData) {
    return posts;
  }

  const index = posts.findIndex(p => p._id === postId || p.id === postId);

  if (index === -1) {
    return posts; // Post not found
  }

  const existingPost = posts[index];

  // Determine which progress field to update
  const isUploadProgress = progressData.stage === 'uploading' || progressData.stage === 'upload';
  const progressField = isUploadProgress ? 'uploadProgress' : 'videoGenerationProgress';

  // Check if progress actually changed
  const existingProgress = existingPost[progressField];
  if (existingProgress &&
      existingProgress.percent === progressData.percent &&
      existingProgress.status === progressData.status) {
    return posts; // No change, return same reference
  }

  // Create new array with updated progress
  const newPosts = [...posts];
  newPosts[index] = {
    ...existingPost,
    [progressField]: {
      ...existingProgress,
      ...progressData
    },
    // Also update status if provided
    ...(progressData.status && { status: progressData.status })
  };

  return newPosts;
}

/**
 * Merge metrics update into posts array
 *
 * @param {Array<Object>} posts - Current posts array
 * @param {string} postId - ID of post to update
 * @param {Object} metrics - Metrics data
 * @returns {Array<Object>} Updated posts array (same ref if no change)
 */
export function mergeMetricsUpdate(posts, postId, metrics) {
  if (!posts || !postId || !metrics) {
    return posts;
  }

  const index = posts.findIndex(p => p._id === postId || p.id === postId);

  if (index === -1) {
    return posts;
  }

  const existingPost = posts[index];

  // Create new array with updated metrics
  const newPosts = [...posts];
  newPosts[index] = {
    ...existingPost,
    performance: {
      ...existingPost.performance,
      ...metrics
    },
    // Also update individual metric fields for compatibility
    views: metrics.views ?? existingPost.views,
    likes: metrics.likes ?? existingPost.likes,
    shares: metrics.shares ?? existingPost.shares,
    comments: metrics.comments ?? existingPost.comments
  };

  return newPosts;
}

/**
 * Check if post data has changed
 * Compares key fields that affect rendering
 *
 * @param {Object} existing - Existing post
 * @param {Object} updated - Updated post data
 * @returns {boolean} True if post changed
 */
function isPostChanged(existing, updated) {
  // Key fields to compare
  const keyFields = [
    'status',
    'title',
    'caption',
    'hook',
    'cta',
    'videoPath',
    'thumbnailPath',
    'scheduledAt',
    'postedAt',
    'tiktokPostId',
    'instagramMediaId',
    'youtubeVideoId',
    'views',
    'likes',
    'shares',
    'comments'
  ];

  for (const field of keyFields) {
    const existingVal = existing[field];
    const updatedVal = updated[field];

    // Handle Date objects and ISO strings
    if (existingVal instanceof Date || updatedVal instanceof Date) {
      const existingTime = existingVal ? new Date(existingVal).getTime() : null;
      const updatedTime = updatedVal ? new Date(updatedVal).getTime() : null;
      if (existingTime !== updatedTime) return true;
    } else if (existingVal !== updatedVal) {
      return true;
    }
  }

  // Check nested progress objects
  if (updated.videoGenerationProgress) {
    const existingProgress = existing.videoGenerationProgress;
    const updatedProgress = updated.videoGenerationProgress;
    if (!existingProgress ||
        existingProgress.status !== updatedProgress.status ||
        existingProgress.percent !== updatedProgress.percent) {
      return true;
    }
  }

  if (updated.uploadProgress) {
    const existingProgress = existing.uploadProgress;
    const updatedProgress = updated.uploadProgress;
    if (!existingProgress ||
        existingProgress.status !== updatedProgress.status ||
        existingProgress.percent !== updatedProgress.percent) {
      return true;
    }
  }

  return false;
}

/**
 * Batch apply multiple SSE updates to posts array
 * Efficiently processes a batch of events in order
 *
 * @param {Array<Object>} posts - Current posts array
 * @param {Array<Object>} events - SSE events to apply
 * @returns {Array<Object>} Updated posts array
 */
export function applyBatchUpdates(posts, events) {
  if (!posts || !events || events.length === 0) {
    return posts;
  }

  let result = posts;

  for (const event of events) {
    switch (event.type) {
      case 'post.created':
      case 'post.updated':
        result = mergeUpdatedPost(result, event.data.post);
        break;
      case 'post.deleted':
        result = removeDeletedPost(result, event.data.postId);
        break;
      case 'post.status_changed':
        result = mergeUpdatedPost(result, event.data.post);
        break;
      case 'post.progress':
        result = mergeProgressUpdate(result, event.data.postId, event.data);
        break;
      case 'post.metrics_updated':
        result = mergeMetricsUpdate(result, event.data.postId, event.data.metrics);
        break;
    }
  }

  return result;
}

export default {
  mergeUpdatedPost,
  mergeNewPosts,
  removeDeletedPost,
  mergeProgressUpdate,
  mergeMetricsUpdate,
  applyBatchUpdates
};
