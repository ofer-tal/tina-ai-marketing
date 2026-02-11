/**
 * Gopher Data Service
 *
 * TikTok data collection via Gopher AI API with strict cost controls.
 * - ONLY runs on scheduled job (once daily)
 * - NEVER runs on-demand
 * - Stores all fetched data locally for use by tools/APIs
 * - Guardrails prevent accidental multiple runs
 * - ALL requests/responses logged for replay during troubleshooting
 *
 * API Docs: https://developers.gopher-ai.com/docs/data/tiktok
 *
 * Authentication: Authorization: Bearer <API_KEY> header
 *
 * API Request Types:
 * - searchbyquery: For hashtag/keyword search. Params: type, search[], max_items
 * - searchbytrending: For trending content. Params: type, sort_by, period, country_code, max_items
 *
 * REPLAY MODE: Set GOPHER_REPLAY_MODE=true to use logged responses
 * instead of making actual API calls (for troubleshooting without wasting credits)
 */

import BaseApiClient from '../baseApiClient.js';
import { getLogger } from '../../utils/logger.js';
import MarketingBookTrendMetrics from '../../models/MarketingBookTrendMetrics.js';
import MarketingHookPattern from '../../models/MarketingHookPattern.js';
import MarketingHashtagPerformance from '../../models/MarketingHashtagPerformance.js';
import MarketingBookTokInfluencer from '../../models/MarketingBookTokInfluencer.js';
import configService from '../config.js';
import gopherReplayManager from './gopherReplayManager.js';

const logger = getLogger('services', 'booktok-gopher-data');

// Gopher API configuration
const GOPHER_BASE_URL = 'https://data.gopher-ai.com/api/v1';
const GOPHER_API_KEY = process.env.GOPHER_API_KEY;

// Critical: Minimum time between runs (23 hours) to prevent accidental multiple runs
const MIN_RUN_INTERVAL_MS = 23 * 60 * 60 * 1000; // 23 hours

// BookTok hashtags to monitor (kept minimal to reduce API calls)
const BOOKTOK_HASHTAGS = [
  '#booktok',
  '#romancebooks',
  '#bookrecommendations'
];

class GopherDataService extends BaseApiClient {
  constructor(config = {}) {
    super({
      name: 'GopherDataService',
      baseURL: GOPHER_BASE_URL,
      timeout: 60000, // Longer timeout for API requests
      ...config,
    });

    this.isRunning = false;
    this.lastRunTime = null;
    this.lastRunCompletedAt = null;
    this.postsCollected = 0;
    this.apiCallCount = 0; // Track API calls to stay within budget

    // Check if API key is configured
    this.isConfigured = !!GOPHER_API_KEY;

    logger.info('Gopher Data Service initialized', {
      configured: this.isConfigured,
      scheduledOnly: true,
      minInterval: '23 hours'
    });
  }

  /**
   * CRITICAL: Only call this from scheduled job - NEVER on demand
   * Fetches TikTok BookTok data and stores locally for all other services to use
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Collection results
   */
  async fetchDailyTikTokData(options = {}) {
    const {
      maxItemsPerHashtag = 25, // Limit to stay within budget
      period = '7' // 7 or 30 days
    } = options;

    // GUARDRAIL 1: Check if configured
    if (!this.isConfigured) {
      logger.warn('Gopher API not configured - skipping data collection');
      return {
        success: false,
        reason: 'not_configured',
        postsCollected: 0,
        apiCalls: 0
      };
    }

    // GUARDRAIL 2: Prevent concurrent runs
    if (this.isRunning) {
      logger.warn('Gopher data collection already in progress - skipping');
      return {
        success: false,
        reason: 'already_running',
        postsCollected: 0,
        apiCalls: this.apiCallCount
      };
    }

    // GUARDRAIL 3: Enforce minimum interval between runs
    if (this.lastRunCompletedAt) {
      const timeSinceLastRun = Date.now() - this.lastRunCompletedAt.getTime();
      if (timeSinceLastRun < MIN_RUN_INTERVAL_MS) {
        const hoursUntilNextRun = ((MIN_RUN_INTERVAL_MS - timeSinceLastRun) / (60 * 60 * 1000)).toFixed(1);
        logger.warn(`Gopher data collection run too soon - must wait ${hoursUntilNextRun} hours`, {
          lastRun: this.lastRunCompletedAt,
          hoursSinceLastRun: (timeSinceLastRun / (60 * 60 * 1000)).toFixed(1)
        });
        return {
          success: false,
          reason: 'too_soon',
          hoursUntilNextRun,
          postsCollected: 0,
          apiCalls: 0
        };
      }
    }

    this.isRunning = true;
    this.apiCallCount = 0;
    const startTime = Date.now();
    const allPosts = [];

    try {
      logger.info('Starting DAILY Gopher TikTok data collection', {
        hashtags: BOOKTOK_HASHTAGS.length,
        maxItemsPerHashtag,
        period
      });

      // Fetch trending posts for each hashtag
      for (const hashtag of BOOKTOK_HASHTAGS) {
        const posts = await this.fetchTikTokByHashtag(hashtag, maxItemsPerHashtag, period);
        allPosts.push(...posts);
      }

      // Process and store all collected posts
      await this.processAndStorePosts(allPosts);

      this.postsCollected = allPosts.length;
      this.lastRunTime = new Date();
      this.lastRunCompletedAt = new Date();

      const duration = Date.now() - startTime;
      logger.info('Gopher DAILY data collection completed', {
        postsCollected: allPosts.length,
        apiCalls: this.apiCallCount,
        duration: `${duration}ms`,
        nextRun: new Date(Date.now() + MIN_RUN_INTERVAL_MS).toISOString()
      });

      return {
        success: true,
        postsCollected: allPosts.length,
        apiCalls: this.apiCallCount,
        duration
      };

    } catch (error) {
      logger.error('Error in fetchDailyTikTokData', {
        error: error.message,
        stack: error.stack
      });
      return {
        success: false,
        reason: 'error',
        error: error.message,
        postsCollected: allPosts.length,
        apiCalls: this.apiCallCount
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Fetch TikTok posts by hashtag using Gopher API
   * All requests/responses are logged for replay during troubleshooting.
   * @param {string} hashtag - Hashtag to search (with or without #)
   * @param {number} maxItems - Maximum items to fetch
   * @param {string} period - Time period (7 or 30 days)
   * @returns {Promise<Array>} Array of post data
   */
  async fetchTikTokByHashtag(hashtag, maxItems, period) {
    const cleanHashtag = hashtag.startsWith('#') ? hashtag.substring(1) : hashtag;
    const endpoint = `search-by-hashtag-${cleanHashtag}`;

    try {
      this.apiCallCount++;

      logger.debug(`Fetching TikTok posts for #${cleanHashtag}`, {
        maxItems,
        period,
        apiCall: this.apiCallCount,
        replayMode: gopherReplayManager.REPLAY_MODE
      });

      // NOTE: searchbyquery only supports: type, search, max_items
      // period and sort_by are ONLY valid for searchbytrending
      // See: https://developers.gopher-ai.com/docs/data/tiktok
      const requestBody = {
        type: 'tiktok',
        arguments: {
          type: 'searchbyquery',
          search: [`#${cleanHashtag}`],
          max_items: maxItems
        }
      };

      // Authentication via Authorization: Bearer header
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GOPHER_API_KEY}`
      };

      // Wrap API call with logging/replay functionality
      const response = await gopherReplayManager.withLogging(
        async () => {
          // Direct fetch call to bypass BaseApiClient and isolate issue
          const fetchResponse = await fetch(`${GOPHER_BASE_URL}/search/live`, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
          });

          if (!fetchResponse.ok) {
            // Try to get error details from response body
            let errorDetails = '';
            try {
              const errorBody = await fetchResponse.text();
              errorDetails = ` - ${errorBody}`;
            } catch (e) {
              // Ignore error body parsing error
            }
            const error = new Error(`HTTP ${fetchResponse.status}: ${fetchResponse.statusText}${errorDetails}`);
            error.status = fetchResponse.status;
            error.response = fetchResponse;
            throw error;
          }

          const data = await fetchResponse.json();
          return { data, status: fetchResponse.status, headers: {} };
        },
        {
          endpoint,
          url: `${GOPHER_BASE_URL}/search/live`,
          headers,
          body: requestBody
        }
      );

      // Log replay info if this was a replayed response
      if (response._isReplay) {
        logger.info(`🔄 REPLAYED: Used logged response from ${response._replayFile}`, {
          replayFile: response._replayFile
        });
      } else if (response._logFile) {
        logger.info(`📝 LOGGED: Response saved to ${response._logFile}`, {
          logFile: response._logFile
        });
      }

      // Gopher API is async - returns a UUID that we need to poll for results
      // Process: POST /search/live → GET /search/live/status/{uuid} → GET /search/live/result/{uuid}
      if (response.data && response.data.uuid) {
        logger.debug(`Gopher API job created with UUID: ${response.data.uuid}`, {
          hashtag: cleanHashtag
        });

        // Poll for job completion and get results
        return await this.pollForJobResults(response.data.uuid, cleanHashtag);
      }

      // Legacy: handle direct data response if API changes
      if (response.data && response.data.data) {
        const posts = this.normalizeGopherPosts(response.data.data);
        logger.debug(`Fetched ${posts.length} posts for #${cleanHashtag}`);
        return posts;
      }

      logger.warn('Unexpected Gopher API response structure', {
        responseKeys: response.data ? Object.keys(response.data) : 'no data'
      });
      return [];

    } catch (error) {
      logger.error(`Error fetching posts for ${hashtag}`, {
        error: error.message,
        status: error.response?.status
      });
      return [];
    }
  }

  /**
   * Fetch trending TikTok posts (no specific hashtag)
   * All requests/responses are logged for replay during troubleshooting.
   * @param {number} maxItems - Maximum items to fetch
   * @returns {Promise<Array>} Array of post data
   */
  async fetchTikTokTrending(maxItems = 25) {
    const endpoint = 'search-trending';

    try {
      this.apiCallCount++;

      logger.debug('Fetching trending TikTok posts', {
        maxItems,
        apiCall: this.apiCallCount,
        replayMode: gopherReplayManager.REPLAY_MODE
      });

      // NOTE: searchbytrending uses sort_by (not sort) and period
      // Authentication via Authorization: Bearer header
      // See: https://developers.gopher-ai.com/docs/data/tiktok
      const requestBody = {
        type: 'tiktok',
        arguments: {
          type: 'searchbytrending',
          max_items: maxItems,
          period: '7',
          sort_by: 'vv'
        }
      };

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GOPHER_API_KEY}`
      };

      // Wrap API call with logging/replay functionality
      const response = await gopherReplayManager.withLogging(
        async () => {
          // Direct fetch call
          const fetchResponse = await fetch(`${GOPHER_BASE_URL}/search/live`, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
          });

          if (!fetchResponse.ok) {
            let errorDetails = '';
            try {
              const errorBody = await fetchResponse.text();
              errorDetails = ` - ${errorBody}`;
            } catch (e) {
              // Ignore
            }
            const error = new Error(`HTTP ${fetchResponse.status}: ${fetchResponse.statusText}${errorDetails}`);
            error.status = fetchResponse.status;
            error.response = fetchResponse;
            throw error;
          }

          const data = await fetchResponse.json();
          return { data, status: fetchResponse.status, headers: {} };
        },
        {
          endpoint,
          url: `${GOPHER_BASE_URL}/search/live`,
          headers,
          body: requestBody
        }
      );

      // Log replay info if this was a replayed response
      if (response._isReplay) {
        logger.info(`🔄 REPLAYED: Used logged response from ${response._replayFile}`, {
          replayFile: response._replayFile
        });
      } else if (response._logFile) {
        logger.info(`📝 LOGGED: Response saved to ${response._logFile}`, {
          logFile: response._logFile
        });
      }

      // Gopher API is async - poll for results
      if (response.data && response.data.uuid) {
        logger.debug(`Gopher trending job created with UUID: ${response.data.uuid}`);
        return await this.pollForJobResults(response.data.uuid, 'trending');
      }

      // Legacy: handle direct data response
      if (response.data && response.data.data) {
        return this.normalizeGopherPosts(response.data.data);
      }

      return [];

    } catch (error) {
      logger.error('Error fetching trending TikTok posts', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Poll for Gopher API job results
   * Process: GET /search/live/status/{uuid} until 'completed' or 'done', then GET /search/live/result/{uuid}
   * @param {string} uuid - Job UUID
   * @param {string} jobType - Type of job (hashtag name or 'trending')
   * @returns {Promise<Array>} Array of normalized posts
   */
  async pollForJobResults(uuid, jobType = 'unknown') {
    const maxPollTime = 120000; // 120 seconds max wait time (TikTok scraping takes time)
    const pollInterval = 3000; // Check every 3 seconds
    const startTime = Date.now();
    const headers = {
      'Authorization': `Bearer ${GOPHER_API_KEY}`
    };

    try {
      logger.info(`Polling Gopher job ${uuid} for ${jobType}`, {
        uuid,
        jobType
      });

      // Poll for status
      let jobStatus = 'pending';
      while (Date.now() - startTime < maxPollTime) {
        const statusResponse = await fetch(`${GOPHER_BASE_URL}/search/live/status/${uuid}`, {
          method: 'GET',
          headers
        });

        if (!statusResponse.ok) {
          logger.warn(`Status check returned ${statusResponse.status} for job ${uuid}`);
          // Continue anyway, try to get results
          break;
        }

        const statusData = await statusResponse.json();
        jobStatus = statusData.status;
        logger.debug(`Job ${uuid} status: ${jobStatus}`, {
          status: jobStatus
        });

        // Check for completion (API returns 'done' or 'completed')
        if (jobStatus === 'completed' || jobStatus === 'done') {
          break;
        }

        if (jobStatus === 'failed') {
          logger.error(`Gopher job ${uuid} failed`, { jobType });
          return [];
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }

      // Get the results
      const resultResponse = await fetch(`${GOPHER_BASE_URL}/search/live/result/${uuid}`, {
        method: 'GET',
        headers
      });

      if (!resultResponse.ok) {
        logger.error(`Failed to get results for job ${uuid}`, {
          status: resultResponse.status
        });
        return [];
      }

      const resultData = await resultResponse.json();

      if (Array.isArray(resultData) && resultData.length > 0) {
        const posts = this.normalizeGopherPosts(resultData);
        logger.info(`Gopher job ${uuid} (${jobStatus}) returned ${posts.length} posts`, {
          jobType,
          postsCount: posts.length
        });
        return posts;
      }

      logger.warn(`Gopher job ${uuid} returned empty results`, { jobType, jobStatus });
      return [];

    } catch (error) {
      logger.error(`Error polling Gopher job ${uuid}`, {
        error: error.message,
        jobType
      });
      return [];
    }
  }

  /**
   * Normalize Gopher API response to our internal format
   * @param {Array} posts - Raw posts from Gopher
   * @returns {Array} Normalized posts
   */
  normalizeGopherPosts(posts) {
    if (!Array.isArray(posts)) return [];

    return posts.map(post => {
      // Handle new Gopher API response format from /search/live/result/{uuid}
      // Format: { id, source, content, metadata: { cover, duration, item_url, region, title }, updated_at }
      if (post.content && post.metadata) {
        return {
          id: post.id,
          platform: post.source || 'tiktok',
          caption: post.content || post.metadata.title || '',
          hashtags: this.extractHashtagsFromString(post.content || ''),
          author: this.extractAuthorFromItemUrl(post.metadata.item_url),
          stats: {
            views: 0, // Not included in trending response
            likes: 0,
            comments: 0,
            shares: 0,
            playCount: 0,
            diggCount: 0
          },
          url: post.metadata.item_url || '',
          thumbnailUrl: post.metadata.cover || '',
          createdAt: post.updated_at && post.updated_at !== '0001-01-01T00:00:00Z'
            ? new Date(post.updated_at)
            : new Date(),
          music: { title: null, author: null },
          duration: post.metadata.duration || null,
          region: post.metadata.region || null
        };
      }

      // Legacy format - handle old response structure
      return {
        id: post.video_id || post.id,
        platform: 'tiktok',
        caption: post.text_description || post.caption || '',
        hashtags: post.hashtags || [],
        author: {
          username: post.username || post.author?.unique_id,
          displayName: post.nickname || post.author?.nickname,
          followerCount: post.author_stats?.follower_count || 0,
          verified: post.author?.is_verified || false
        },
        stats: {
          views: post.view_count || post.stats?.play_count || 0,
          likes: post.like_count || post.stats?.digg_count || 0,
          comments: post.comment_count || post.stats?.comment_count || 0,
          shares: post.share_count || post.stats?.share_count || 0,
          playCount: post.view_count || post.stats?.play_count || 0,
          diggCount: post.like_count || post.stats?.digg_count || 0
        },
        url: post.web_video_url || post.share_url || post.url || '',
        thumbnailUrl: post.cover_url || post.thumbnail_url || '',
        createdAt: post.create_time ? new Date(post.create_time * 1000) : new Date(),
        music: {
          title: post.music_title || post.music_info?.title,
          author: post.music_author || post.music_info?.author
        }
      };
    });
  }

  /**
   * Extract hashtags from caption string
   * @param {string} caption - Post caption
   * @returns {Array} Array of hashtags (without #)
   */
  extractHashtagsFromString(caption) {
    if (!caption) return [];
    const hashtags = [];
    const hashtagRegex = /#(\w+)/g;
    let match;
    while ((match = hashtagRegex.exec(caption)) !== null) {
      hashtags.push(match[1]);
    }
    return hashtags;
  }

  /**
   * Extract username from TikTok item URL
   * Format: https://www.tiktok.com/@username/video/12345
   * @param {string} itemUrl - TikTok video URL
   * @returns {Object} Author info
   */
  extractAuthorFromItemUrl(itemUrl) {
    if (!itemUrl) return {
      username: '',
      displayName: '',
      followerCount: 0,
      verified: false
    };

    const match = itemUrl.match(/tiktok\.com\/@([^\/]+)/);
    const username = match ? match[1] : '';

    return {
      username,
      displayName: username, // No display name in URL
      followerCount: 0, // Not included in response
      verified: false
    };
  }

  /**
   * Process and store posts locally for all other services to use
   * This is the ONLY place where external API data enters the system
   * @param {Array} posts - Normalized posts
   */
  async processAndStorePosts(posts) {
    if (!posts || posts.length === 0) {
      logger.info('No posts to process');
      return;
    }

    logger.info('Processing and storing posts locally', { count: posts.length });

    for (const post of posts) {
      try {
        await this.processSinglePost(post);
      } catch (error) {
        logger.error('Error processing single post', {
          error: error.message,
          postId: post.id
        });
      }
    }

    // Update timestamp for data freshness
    await this.updateDataFreshnessTimestamp();
  }

  /**
   * Process a single post and update all local data stores
   * @param {Object} post - Normalized post data
   */
  async processSinglePost(post) {
    const timestamp = new Date();
    const hashtags = this.extractHashtags(post);
    const engagementRate = this.calculateEngagementRate(post.stats);

    // 1. Store hashtag performance data locally
    for (const hashtag of hashtags) {
      await MarketingHashtagPerformance.recordUsage(hashtag, 'tiktok', {
        views: post.stats.views,
        engagementRate,
        pairedHashtags: hashtags.filter(h => h !== hashtag),
        topic: this.detectTopic(post)
      }).catch(err => logger.debug('Error recording hashtag usage', { error: err.message }));
    }

    // 2. Store hook pattern data locally
    const hook = this.extractHook(post);
    if (hook) {
      await MarketingHookPattern.recordPerformance(hook, {
        platform: 'tiktok',
        engagementRate,
        views: post.stats.views,
        topic: this.detectTopic(post),
        url: post.url
      }).catch(err => logger.debug('Error recording hook performance', { error: err.message }));
    }

    // 3. Store trend metrics locally
    await MarketingBookTrendMetrics.recordMetrics({
      entityType: 'hashtag',
      entityId: hashtags[0] || 'general',
      entityName: hashtags[0] || 'general',
      platform: 'tiktok',
      timestamp,
      mentionCount: 1,
      avgEngagementRate: engagementRate,
      postsSampled: 1,
      topPosts: [{
        postId: post.id,
        platform: 'tiktok',
        views: post.stats.views,
        engagementRate,
        url: post.url
      }]
    }).catch(err => logger.debug('Error recording trend metrics', { error: err.message }));

    // 4. Update influencer data locally
    if (post.author?.username) {
      await this.updateInfluencerData(post.author, post).catch(err => {
        logger.debug('Error updating influencer data', { error: err.message });
      });
    }
  }

  /**
   * Extract hashtags from post
   */
  extractHashtags(post) {
    const hashtags = [];

    // From hashtags field
    if (post.hashtags && Array.isArray(post.hashtags)) {
      for (const tag of post.hashtags) {
        const cleanTag = typeof tag === 'string' ? tag.replace(/^#/, '') : (tag.hashtag_name || tag.text || '');
        if (cleanTag && !hashtags.includes(cleanTag)) {
          hashtags.push(cleanTag);
        }
      }
    }

    // From caption
    if (post.caption) {
      const hashtagRegex = /#(\w+)/g;
      let match;
      while ((match = hashtagRegex.exec(post.caption)) !== null) {
        if (!hashtags.includes(match[1])) {
          hashtags.push(match[1]);
        }
      }
    }

    return hashtags;
  }

  /**
   * Extract hook from post caption
   */
  extractHook(post) {
    const caption = post.caption || '';
    if (!caption) return null;

    // Get first sentence or first line
    const lines = caption.split('\n');
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      if (firstLine.length > 5 && firstLine.length < 200) {
        return firstLine;
      }
    }

    const sentences = caption.split(/[.!?]/);
    if (sentences.length > 0) {
      const firstSentence = sentences[0].trim();
      if (firstSentence.length > 5 && firstSentence.length < 200) {
        return firstSentence;
      }
    }

    return caption.substring(0, 100).trim();
  }

  /**
   * Calculate engagement rate
   */
  calculateEngagementRate(stats) {
    if (!stats) return 0;

    const views = stats.views || stats.playCount || 0;
    const likes = stats.likes || stats.diggCount || 0;
    const comments = stats.comments || 0;
    const shares = stats.shares || 0;

    if (views === 0) return 0;

    return ((likes + comments + shares) / views) * 100;
  }

  /**
   * Detect topic from post
   */
  detectTopic(post) {
    const caption = (post.caption || '').toLowerCase();

    const topicKeywords = {
      'romance': ['romance', 'love story', 'couple', 'relationship'],
      'fantasy': ['fantasy', 'magic', 'fae', 'dragon', 'witch'],
      'spicy': ['spice', 'spicy', 'smut', 'steamy', 'hot'],
      'contemporary': ['contemporary', 'modern', 'office', 'friends to lovers'],
      'dark': ['dark romance', 'dark', 'captive', 'anti-hero'],
      'historical': ['historical', 'regency', 'victorian', 'duke', 'duchess'],
    };

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      for (const keyword of keywords) {
        if (caption.includes(keyword)) {
          return topic;
        }
      }
    }

    return 'general';
  }

  /**
   * Update influencer data
   */
  async updateInfluencerData(author, post) {
    try {
      const influencer = await MarketingBookTokInfluencer.findOrCreate({
        username: author.username,
        platform: 'tiktok',
        displayName: author.displayName,
        followerCount: author.followerCount,
        verified: author.verified
      });

      await influencer.addPost({
        postId: post.id,
        url: post.url,
        caption: post.caption,
        postedAt: post.createdAt,
        views: post.stats.views,
        likes: post.stats.likes,
        comments: post.stats.comments,
        shares: post.stats.shares,
        engagementRate: this.calculateEngagementRate(post.stats),
        topics: [this.detectTopic(post)],
        hashtags: this.extractHashtags(post)
      });
    } catch (error) {
      logger.error('Error updating influencer data', {
        error: error.message,
        username: author.username
      });
    }
  }

  /**
   * Update data freshness timestamp for all services to check
   */
  async updateDataFreshnessTimestamp() {
    // Store in a simple marker that other services can check
    // This could be in Redis or a simple collection
    const timestamp = new Date();
    logger.info('Data freshness updated', { timestamp });
    return timestamp;
  }

  /**
   * Get data freshness info for other services to check
   * @returns {Object} Data freshness information
   */
  getDataFreshness() {
    return {
      lastFetch: this.lastRunCompletedAt,
      isStale: !this.lastRunCompletedAt || (Date.now() - this.lastRunCompletedAt.getTime()) > (25 * 60 * 60 * 1000),
      hoursSinceLastFetch: this.lastRunCompletedAt
        ? (Date.now() - this.lastRunCompletedAt.getTime()) / (60 * 60 * 1000)
        : Infinity
    };
  }

  /**
   * CRITICAL: This method should NEVER be called except by scheduled job
   * Log warning if called outside of scheduled context
   */
  async fetchDailyData(options = {}) {
    logger.warn('⚠️ fetchDailyData called - should only be called by scheduled job');

    // Additional safety check: verify we're being called from scheduler
    // (In production, you'd verify the caller context)
    return this.fetchDailyTikTokData(options);
  }

  /**
   * Get service status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isConfigured: this.isConfigured,
      lastRunTime: this.lastRunTime,
      lastRunCompletedAt: this.lastRunCompletedAt,
      postsCollected: this.postsCollected,
      apiCallCount: this.apiCallCount,
      scheduledOnly: true,
      minIntervalHours: 23,
      dataFreshness: this.getDataFreshness()
    };
  }

  /**
   * Manual trigger for testing - PRODUCTION USE ONLY IF APPROVED
   * This bypasses guardrails but logs warning
   * @param {string} reason - Reason for manual trigger
   */
  async manualTrigger(reason = 'unspecified') {
    logger.warn('⚠️⚠️⚠️ MANUAL TRIGGER - This uses API quota!', { reason });

    // Still check for concurrent runs
    if (this.isRunning) {
      throw new Error('Cannot manually trigger - collection already in progress');
    }

    return this.fetchDailyTikTokData();
  }

  /**
   * Replay from log file - For troubleshooting without wasting API credits
   * @param {string} filename - Log filename to replay
   * @returns {Promise<Object>} Collection results using replayed data
   */
  async replayFromLog(filename) {
    logger.info(`🔄 REPLAY MODE: Replaying from log file: ${filename}`);

    this.isRunning = true;
    this.apiCallCount = 0;
    const startTime = Date.now();
    const allPosts = [];

    try {
      // Load the log entry
      const logEntry = gopherReplayManager.loadLogEntry(filename);
      if (!logEntry) {
        throw new Error(`Failed to load log file: ${filename}`);
      }

      // Process the replayed response
      if (logEntry.response && logEntry.response.data) {
        const posts = this.normalizeGopherPosts(logEntry.response.data);
        allPosts.push(...posts);
      }

      // Process and store the replayed posts
      await this.processAndStorePosts(allPosts);

      this.postsCollected = allPosts.length;
      this.lastRunTime = new Date();
      this.lastRunCompletedAt = new Date();

      const duration = Date.now() - startTime;
      logger.info('🔄 REPLAY COMPLETE', {
        postsCollected: allPosts.length,
        duration: `${duration}ms`,
        replayFile: filename
      });

      return {
        success: true,
        postsCollected: allPosts.length,
        apiCalls: 0, // No actual API calls made
        duration,
        replayed: true,
        replayFile: filename
      };

    } catch (error) {
      logger.error('Error in replayFromLog', {
        error: error.message,
        stack: error.stack
      });
      return {
        success: false,
        reason: 'replay_error',
        error: error.message,
        postsCollected: 0,
        apiCalls: 0
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get list of available replay logs
   * @param {Object} options - Filter options
   * @returns {Array} List of available log entries
   */
  getAvailableReplays(options = {}) {
    return gopherReplayManager.listLogEntries(options);
  }

  /**
   * Get a specific replay log entry
   * @param {string} filename - Log filename
   * @returns {Object|null} Log entry
   */
  getReplayLog(filename) {
    return gopherReplayManager.getLogEntry(filename);
  }

  /**
   * Get replay manager status
   * @returns {Object} Replay manager status
   */
  getReplayStatus() {
    return {
      ...gopherReplayManager.getStatus(),
      replayMode: gopherReplayManager.REPLAY_MODE
    };
  }
}

// Export singleton instance
const gopherDataService = new GopherDataService();
export default gopherDataService;
