/**
 * SSE (Server-Sent Events) Service
 *
 * Manages SSE client connections and broadcasts events to connected clients.
 * Replaces polling-based updates with push-based real-time notifications.
 *
 * Event Types:
 * - post.created: New post created
 * - post.updated: Post data changed (caption, hashtags, assets)
 * - post.deleted: Post removed
 * - post.status_changed: Status transitioned
 * - post.progress: Video generation/upload progress update
 */

import { getLogger } from '../utils/logger.js';

const logger = getLogger('sse-service', 'sse-service');

/**
 * SSE Client representation
 * @typedef {Object} SSEClient
 * @property {string} id - Unique client identifier
 * @property {import('http').ServerResponse} response - HTTP response object
 * @property {Date} connectedAt - When the client connected
 * @property {string} userId - Optional user ID for targeted broadcasts
 */

class SSEService {
  constructor() {
    /** @type {Map<string, SSEClient>} */
    this.clients = new Map();
    this.clientIdCounter = 0;
    this.keepAliveInterval = null;
    this.cleanupInterval = null;
    this.isStarted = false;
  }

  /**
   * Start the SSE service (setup keepalive and cleanup intervals)
   */
  start() {
    if (this.isStarted) {
      logger.warn('SSE service already started');
      return;
    }

    this.isStarted = true;

    // Send keepalive comment every 30 seconds to prevent proxy timeouts
    this.keepAliveInterval = setInterval(() => {
      this.broadcastKeepalive();
    }, 30 * 1000);

    // Cleanup disconnected clients every 60 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupDisconnectedClients();
    }, 60 * 1000);

    logger.info('SSE service started');
  }

  /**
   * Stop the SSE service
   */
  stop() {
    if (!this.isStarted) {
      return;
    }

    this.isStarted = false;

    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Close all client connections
    for (const [clientId, client] of this.clients) {
      try {
        client.response.end();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }

    this.clients.clear();
    logger.info('SSE service stopped');
  }

  /**
   * Add a new SSE client
   * @param {import('http').ServerResponse} response - HTTP response object
   * @param {string} [userId] - Optional user ID
   * @returns {string} Client ID
   */
  addClient(response, userId = null) {
    const clientId = `client_${++this.clientIdCounter}_${Date.now()}`;

    const client = {
      id: clientId,
      response,
      connectedAt: new Date(),
      userId
    };

    this.clients.set(clientId, client);

    logger.info('SSE client connected', {
      clientId,
      userId,
      totalClients: this.clients.size
    });

    // Send connection confirmation event
    this.sendEvent(clientId, 'connected', {
      clientId,
      connectedAt: client.connectedAt.toISOString(),
      serverTime: new Date().toISOString()
    });

    return clientId;
  }

  /**
   * Remove an SSE client
   * @param {string} clientId - Client ID to remove
   */
  removeClient(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        client.response.end();
      } catch (error) {
        // Response may already be closed
      }
      this.clients.delete(clientId);

      logger.info('SSE client disconnected', {
        clientId,
        remainingClients: this.clients.size
      });
    }
  }

  /**
   * Send an event to a specific client
   * @param {string} clientId - Target client ID
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   * @returns {boolean} True if sent successfully
   */
  sendEvent(clientId, eventType, data) {
    const client = this.clients.get(clientId);
    if (!client) {
      return false;
    }

    try {
      const event = this.formatSSEEvent(eventType, data);
      client.response.write(event);
      return true;
    } catch (error) {
      // Client likely disconnected
      logger.debug('Failed to send event to client', {
        clientId,
        error: error.message
      });
      this.removeClient(clientId);
      return false;
    }
  }

  /**
   * Broadcast an event to all connected clients
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   * @param {string} [targetUserId] - Optional: only send to specific user
   * @returns {number} Number of clients the event was sent to
   */
  broadcast(eventType, data, targetUserId = null) {
    let sentCount = 0;

    for (const [clientId, client] of this.clients) {
      // Filter by user if specified
      if (targetUserId && client.userId !== targetUserId) {
        continue;
      }

      if (this.sendEvent(clientId, eventType, data)) {
        sentCount++;
      }
    }

    // Always log at info level for status_changed events, debug for others
    const logLevel = eventType === 'post.status_changed' ? 'info' : 'debug';
    logger[logLevel]('SSE event broadcast', {
      eventType,
      targetUserId: targetUserId || 'all',
      sentCount,
      totalClients: this.clients.size,
      noClientsWarning: sentCount === 0 && this.clients.size === 0 ? 'No SSE clients connected' : null
    });

    return sentCount;
  }

  /**
   * Send keepalive comment to all clients (prevents timeouts)
   */
  broadcastKeepalive() {
    const keepalive = ': keepalive\n\n';
    let sentCount = 0;

    for (const [clientId, client] of this.clients) {
      try {
        client.response.write(keepalive);
        sentCount++;
      } catch (error) {
        this.removeClient(clientId);
      }
    }

    if (this.clients.size > 0) {
      logger.debug('SSE keepalive sent', {
        sentCount,
        totalClients: this.clients.size
      });
    }
  }

  /**
   * Clean up disconnected clients
   */
  cleanupDisconnectedClients() {
    const toRemove = [];

    for (const [clientId, client] of this.clients) {
      // Check if response is still writable
      if (client.response.writableEnded || !client.response.writable) {
        toRemove.push(clientId);
      }
    }

    for (const clientId of toRemove) {
      this.clients.delete(clientId);
    }

    if (toRemove.length > 0) {
      logger.info('Cleaned up disconnected SSE clients', {
        removed: toRemove.length,
        remaining: this.clients.size
      });
    }
  }

  /**
   * Format data as SSE event
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   * @returns {string} Formatted SSE event
   */
  formatSSEEvent(eventType, data) {
    const jsonData = JSON.stringify(data);
    return `event: ${eventType}\ndata: ${jsonData}\n\n`;
  }

  /**
   * Get service statistics
   * @returns {Object} Service stats
   */
  getStats() {
    return {
      isStarted: this.isStarted,
      clientCount: this.clients.size,
      clients: Array.from(this.clients.values()).map(client => ({
        id: client.id,
        userId: client.userId,
        connectedAt: client.connectedAt
      }))
    };
  }

  // ============================================================
  // Convenience methods for specific event types
  // ============================================================

  /**
   * Broadcast post created event
   * @param {Object} post - Post document
   * @returns {number} Number of clients notified
   */
  broadcastPostCreated(post) {
    return this.broadcast('post.created', {
      post: this.serializePost(post)
    });
  }

  /**
   * Broadcast post updated event
   * @param {Object} post - Post document
   * @returns {number} Number of clients notified
   */
  broadcastPostUpdated(post) {
    return this.broadcast('post.updated', {
      post: this.serializePost(post)
    });
  }

  /**
   * Broadcast post deleted event
   * @param {string} postId - Deleted post ID
   * @returns {number} Number of clients notified
   */
  broadcastPostDeleted(postId) {
    return this.broadcast('post.deleted', {
      postId
    });
  }

  /**
   * Broadcast post status changed event
   * @param {Object} post - Post document with new status
   * @param {string} [oldStatus] - Previous status
   * @returns {number} Number of clients notified
   */
  broadcastPostStatusChanged(post, oldStatus = null) {
    return this.broadcast('post.status_changed', {
      postId: post._id?.toString() || post.id,
      newStatus: post.status,
      oldStatus,
      post: this.serializePost(post)
    });
  }

  /**
   * Broadcast post progress event (for video generation/upload)
   * @param {string} postId - Post ID
   * @param {Object} progressData - Progress information
   * @param {string} progressData.stage - Current stage (e.g., 'generating', 'uploading')
   * @param {number} progressData.percent - Progress percentage (0-100)
   * @param {string} progressData.message - Progress message
   * @returns {number} Number of clients notified
   */
  broadcastPostProgress(postId, progressData) {
    return this.broadcast('post.progress', {
      postId,
      ...progressData
    });
  }

  /**
   * Broadcast post metrics updated event
   * @param {string} postId - Post ID
   * @param {Object} metrics - Updated metrics
   * @returns {number} Number of clients notified
   */
  broadcastPostMetricsUpdated(postId, metrics) {
    return this.broadcast('post.metrics_updated', {
      postId,
      metrics
    });
  }

  /**
   * Serialize post for SSE transmission
   * Converts Mongoose documents to plain objects and handles dates
   * @param {Object} post - Post document
   * @returns {Object} Serialized post
   */
  serializePost(post) {
    if (!post) return null;

    // Helper function to convert storage paths to URLs
    const pathToUrl = (filePath) => {
      if (!filePath) return null;
      // Already a URL path (starts with /storage/)
      if (filePath.startsWith('/storage/')) return filePath;
      // Convert absolute path to URL
      const normalizedPath = filePath.replace(/\\/g, '/');
      // Match various storage path patterns
      const storageMatch = normalizedPath.match(/\/?mnt\/[cC]\/Projects\/blush-marketing\/storage\/(.+)/) ||
                          normalizedPath.match(/[A-Z]:\/Projects\/blush-marketing\/storage\/(.+)/) ||
                          normalizedPath.match(/\/storage\/(.+)/);
      if (storageMatch) {
        return `/storage/${storageMatch[1]}`;
      }
      // Return as-is if no pattern matches
      return filePath;
    };

    // Handle both Mongoose documents and plain objects
    const plainPost = post.toObject ? post.toObject() : post;

    // Handle tierParameters - convert Map to plain object
    let tierParameters = null;
    if (plainPost.tierParameters) {
      if (plainPost.tierParameters instanceof Map) {
        tierParameters = Object.fromEntries(plainPost.tierParameters);
      } else {
        tierParameters = plainPost.tierParameters;
      }
    }

    return {
      _id: plainPost._id?.toString() || plainPost.id,
      title: plainPost.title,
      description: plainPost.description,
      platform: plainPost.platform,
      status: plainPost.status,
      contentType: plainPost.contentType,
      contentTier: plainPost.contentTier,
      caption: plainPost.caption,
      hook: plainPost.hook,
      cta: plainPost.cta,
      hashtags: plainPost.hashtags,
      tierParameters, // Include tierParameters for tier_2 posts
      videoPath: pathToUrl(plainPost.videoPath),
      thumbnailPath: pathToUrl(plainPost.thumbnailPath),
      imagePath: pathToUrl(plainPost.imagePath),
      scheduledAt: plainPost.scheduledAt?.toISOString() || plainPost.scheduledAt,
      postedAt: plainPost.postedAt?.toISOString() || plainPost.postedAt,
      createdAt: plainPost.createdAt?.toISOString() || plainPost.createdAt,
      updatedAt: plainPost.updatedAt?.toISOString() || plainPost.updatedAt,
      videoGenerationProgress: plainPost.videoGenerationProgress,
      uploadProgress: plainPost.uploadProgress,
      // Performance metrics (for posted content)
      performance: plainPost.performance,
      views: plainPost.views,
      likes: plainPost.likes,
      shares: plainPost.shares,
      comments: plainPost.comments,
      // External IDs
      tiktokPostId: plainPost.tiktokPostId,
      instagramMediaId: plainPost.instagramMediaId,
      instagramPermalink: plainPost.instagramPermalink,
      youtubeVideoId: plainPost.youtubeVideoId
    };
  }
}

// Create and export singleton instance
const sseService = new SSEService();

export default sseService;
export { SSEService };
