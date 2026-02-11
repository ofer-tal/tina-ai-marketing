/**
 * Instagram Bookstagram Monitor Service
 *
 * Monitors Instagram for trending Bookstagram content, extracting:
 * - Views, likes, shares, comments, saves
 * - Captions, hashtags, books mentioned
 * - Posting time, creator info
 *
 * Uses Instagram Graph API for data collection with rate limiting
 */

import BaseApiClient from '../baseApiClient.js';
import { getLogger } from '../../utils/logger.js';
import rateLimiterService from '../rateLimiter.js';
import MarketingBook from '../../models/MarketingBook.js';
import MarketingBookTrendMetrics from '../../models/MarketingBookTrendMetrics.js';
import MarketingHookPattern from '../../models/MarketingHookPattern.js';
import MarketingHashtagPerformance from '../../models/MarketingHashtagPerformance.js';
import MarketingBookTokInfluencer from '../../models/MarketingBookTokInfluencer.js';
import oauthManager from '../oauthManager.js';

const logger = getLogger('services', 'booktok-instagram-monitor');

// Bookstagram related hashtags to monitor
const BOOKSTAGRAM_HASHTAGS = [
  '#bookstagram',
  '#bookrecommendations',
  '#romancebooks',
  '#romancerecommendations',
  '#spicybooks',
  '#darkromance',
  '#fantasyromance',
  '#contemporaryromance',
  '#bookcommunity',
  '#reading',
  '#booklover',
  '#igreads',
  '#instabooks',
  '#bookish',
  '#currentread',
  '#tbrpile'
];

class InstagramBookstagramMonitor extends BaseApiClient {
  constructor(config = {}) {
    super({
      name: 'InstagramBookstagramMonitor',
      baseURL: 'https://graph.facebook.com/v18.0',
      timeout: 30000,
      ...config,
    });

    this.rateLimiter = rateLimiterService;
    this.isRunning = false;
    this.lastRunTime = null;
    this.postsCollected = 0;

    logger.info('Instagram Bookstagram Monitor Service initialized');
  }

  /**
   * Fetch trending Bookstagram posts from Instagram
   * @param {number} limit - Maximum number of posts to fetch
   * @param {string} timeWindow - Time window for posts (e.g., '7d', '24h')
   * @returns {Promise<Array>} Array of post data
   */
  async fetchTrendingBookstagramPosts(limit = 50, timeWindow = '24h') {
    if (this.isRunning) {
      logger.warn('Instagram Bookstagram Monitor is already running');
      return [];
    }

    this.isRunning = true;
    const startTime = Date.now();
    const posts = [];

    try {
      logger.info('Fetching trending Bookstagram posts', { limit, timeWindow });

      // Get Instagram access token
      const tokenData = await oauthManager.getValidToken('instagram');
      if (!tokenData || !tokenData.access_token) {
        throw new Error('No valid Instagram access token available');
      }

      // Instagram Graph API hashtag search requires a specific setup
      // This is a simplified implementation

      // For each hashtag, attempt to fetch trending posts
      const hashtagsToSearch = BOOKSTAGRAM_HASHTAGS.slice(0, 5);

      for (const hashtag of hashtagsToSearch) {
        try {
          await this.rateLimiter.throttle('instagram-api', 10, 60000);

          const hashtagPosts = await this.fetchHashtagPosts(
            hashtag,
            Math.floor(limit / hashtagsToSearch.length),
            tokenData.access_token
          );

          posts.push(...hashtagPosts);
        } catch (error) {
          logger.error(`Error fetching posts for ${hashtag}`, {
            error: error.message
          });
        }
      }

      // Process and store the collected posts
      await this.processCollectedPosts(posts);

      this.postsCollected = posts.length;
      this.lastRunTime = new Date();

      const duration = Date.now() - startTime;
      logger.info('Instagram Bookstagram collection completed', {
        postsCollected: posts.length,
        duration: `${duration}ms`
      });

      return posts;

    } catch (error) {
      logger.error('Error in fetchTrendingBookstagramPosts', {
        error: error.message,
        stack: error.stack
      });
      return [];
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Fetch posts for a specific hashtag
   * @param {string} hashtag - Hashtag to search (with or without #)
   * @param {number} limit - Maximum posts to fetch
   * @param {string} accessToken - Instagram access token
   * @returns {Promise<Array>} Array of posts
   */
  async fetchHashtagPosts(hashtag, limit, accessToken) {
    try {
      const cleanHashtag = hashtag.startsWith('#') ? hashtag.substring(1) : hashtag;

      // Instagram Graph API hashtag search
      // Note: This requires Instagram Business Account and specific permissions

      // First, get the hashtag ID
      const hashtagId = await this.getHashtagId(cleanHashtag, accessToken);
      if (!hashtagId) {
        logger.debug(`Could not find hashtag ID for ${cleanHashtag}`);
        return [];
      }

      // Then get top media for that hashtag
      const url = `/${hashtagId}/top_media`;
      const params = {
        user_id: await this.getInstagramUserId(accessToken),
        fields: 'id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink,owner',
        limit: limit
      };

      const response = await this.get(url, {
        params,
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.data && response.data.data) {
        return response.data.data.map(post => ({
          id: post.id,
          caption: post.caption,
          media_type: post.media_type,
          media_url: post.media_url,
          thumbnail_url: post.thumbnail_url,
          timestamp: post.timestamp,
          stats: {
            likes: post.like_count || 0,
            comments: post.comments_count || 0
          },
          permalink: post.permalink,
          owner: post.owner
        }));
      }

      return [];

    } catch (error) {
      logger.error(`Error fetching hashtag posts for ${hashtag}`, {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Get Instagram hashtag ID
   * @param {string} hashtag - Hashtag name
   * @param {string} accessToken - Access token
   * @returns {Promise<string|null>} Hashtag ID
   */
  async getHashtagId(hashtag, accessToken) {
    try {
      // Instagram Graph API hashtag lookup
      const url = '/ig_hashtag_search';
      const params = {
        user_id: await this.getInstagramUserId(accessToken),
        q: hashtag
      };

      const response = await this.get(url, {
        params,
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.data && response.data.data && response.data.data.length > 0) {
        return response.data.data[0].id;
      }

      return null;
    } catch (error) {
      logger.error('Error getting hashtag ID', { error: error.message });
      return null;
    }
  }

  /**
   * Get Instagram User ID
   * @param {string} accessToken - Access token
   * @returns {Promise<string>} Instagram User ID
   */
  async getInstagramUserId(accessToken) {
    try {
      // Try to get from token metadata
      const { default: AuthToken } = await import('../../models/AuthToken.js');
      const token = await AuthToken.getActiveToken('instagram');

      if (token && token.metadata?.instagramUserId) {
        return token.metadata.instagramUserId;
      }

      // Fallback to API call
      const response = await this.get('/me', {
        params: {
          fields: 'id'
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return response.data?.id || null;
    } catch (error) {
      logger.error('Error getting Instagram user ID', { error: error.message });
      return null;
    }
  }

  /**
   * Process collected posts and store relevant data
   * @param {Array} posts - Array of post data
   */
  async processCollectedPosts(posts) {
    if (!posts || posts.length === 0) {
      return;
    }

    logger.info('Processing collected Instagram posts', { count: posts.length });

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
  }

  /**
   * Process a single post and update all relevant data
   * @param {Object} post - Post data from Instagram
   */
  async processSinglePost(post) {
    // Extract hashtags
    const hashtags = this.extractHashtags(post);

    // Extract books mentioned
    const booksMentioned = await this.extractBooksMentioned(post);

    // Extract hook
    const hook = this.extractHook(post);

    // Calculate engagement
    const engagementRate = this.calculateEngagementRate(post.stats);

    // Update hashtag performance
    for (const hashtag of hashtags) {
      await MarketingHashtagPerformance.recordUsage(hashtag, 'instagram', {
        views: post.stats?.views || 0, // Instagram doesn't always provide views
        engagementRate,
        pairedHashtags: hashtags.filter(h => h !== hashtag),
        topic: this.detectTopic(post)
      });
    }

    // Update hook patterns
    if (hook) {
      await MarketingHookPattern.recordPerformance(hook, {
        platform: 'instagram',
        engagementRate,
        views: post.stats?.views || 0,
        topic: this.detectTopic(post),
        url: post.permalink
      });
    }

    // Update trend metrics
    await this.updateTrendMetrics(post, hashtags, booksMentioned);

    // Update influencer if this is from a known creator
    if (post.owner?.username) {
      await this.updateInfluencerData(post.owner, post);
    }
  }

  /**
   * Extract hashtags from post
   * @param {Object} post - Post data
   * @returns {Array<string>} Array of hashtags (without #)
   */
  extractHashtags(post) {
    const hashtags = [];
    const caption = post.caption || '';

    // Extract from caption
    const hashtagRegex = /#(\w+)/g;
    let match;
    while ((match = hashtagRegex.exec(caption)) !== null) {
      hashtags.push(match[1]);
    }

    return hashtags;
  }

  /**
   * Extract books mentioned from post caption
   * @param {Object} post - Post data
   * @returns {Promise<Array>} Array of book data
   */
  async extractBooksMentioned(post) {
    const books = [];
    const caption = post.caption || '';

    // Common patterns for book titles in Instagram posts
    const patterns = [
      /by\s+@?([A-Z][a-zA-Z\s]+)/gi,
      /"([^"]{10,80})"/g,
      /'([^']{10,80})'/g,
      /\*\*([^*]{10,80})\*\*/g,
    ];

    for (const pattern of patterns) {
      const matches = caption.match(pattern);
      if (matches) {
        for (const match of matches) {
          const title = match.replace(/^['"*]|['"*]$/g).replace(/^(by\s+@?)/i, '').trim();
          if (title.length > 5 && title.length < 100) {
            books.push({ title, confidence: 0.5 });
          }
        }
      }
    }

    return books;
  }

  /**
   * Extract hook from post caption
   * @param {Object} post - Post data
   * @returns {string|null} Extracted hook
   */
  extractHook(post) {
    const caption = post.caption || '';
    if (!caption) return null;

    // Remove hashtags from the end
    const cleanCaption = caption.replace(/#\w+\s*$/g, '').trim();

    // Get first sentence or first line
    const lines = cleanCaption.split('\n');
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      if (firstLine.length > 5 && firstLine.length < 200) {
        return firstLine;
      }
    }

    const sentences = cleanCaption.split(/[.!?]/);
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
   * @param {Object} stats - Post stats
   * @returns {number} Engagement rate percentage
   */
  calculateEngagementRate(stats) {
    if (!stats) return 0;

    const likes = stats.likes || 0;
    const comments = stats.comments || 0;
    const views = stats.views || likes * 10; // Estimate views if not provided

    if (views === 0) return 0;

    return ((likes + comments) / views) * 100;
  }

  /**
   * Detect topic from post
   * @param {Object} post - Post data
   * @returns {string} Detected topic
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
   * Update trend metrics for entities in the post
   * @param {Object} post - Post data
   * @param {Array} hashtags - Hashtags found
   * @param {Array} books - Books mentioned
   */
  async updateTrendMetrics(post, hashtags, books) {
    const timestamp = new Date();
    const engagementRate = this.calculateEngagementRate(post.stats);
    const views = post.stats?.views || 0;

    // Record metrics for hashtags
    for (const hashtag of hashtags) {
      await MarketingBookTrendMetrics.recordMetrics({
        entityType: 'hashtag',
        entityId: hashtag,
        entityName: hashtag,
        platform: 'instagram',
        timestamp,
        mentionCount: 1,
        avgEngagementRate: engagementRate,
        postsSampled: 1,
        topPosts: [{
          postId: post.id,
          platform: 'instagram',
          views,
          engagementRate,
          url: post.permalink
        }]
      });
    }

    // Record metrics for books mentioned
    for (const book of books) {
      await MarketingBookTrendMetrics.recordMetrics({
        entityType: 'book',
        entityId: book.title,
        entityName: book.title,
        platform: 'instagram',
        timestamp,
        mentionCount: 1,
        avgEngagementRate: engagementRate,
        postsSampled: 1
      });
    }
  }

  /**
   * Update influencer data
   * @param {Object} owner - Post owner data
   * @param {Object} post - Post data
   */
  async updateInfluencerData(owner, post) {
    try {
      const influencer = await MarketingBookTokInfluencer.findOrCreate({
        username: owner.username,
        platform: 'instagram',
        displayName: owner.username,
        followerCount: 0, // Would need separate API call to get followers
        verified: false
      });

      await influencer.addPost({
        postId: post.id,
        url: post.permalink,
        caption: post.caption,
        postedAt: post.timestamp ? new Date(post.timestamp) : new Date(),
        views: post.stats?.views || 0,
        likes: post.stats?.likes || 0,
        comments: post.stats?.comments || 0,
        shares: 0,
        engagementRate: this.calculateEngagementRate(post.stats),
        topics: [this.detectTopic(post)],
        booksMentioned: await this.extractBooksMentioned(post),
        hashtags: this.extractHashtags(post)
      });
    } catch (error) {
      logger.error('Error updating influencer data', {
        error: error.message,
        username: owner.username
      });
    }
  }

  /**
   * Get current collection status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      postsCollected: this.postsCollected
    };
  }
}

// Export singleton instance
const instagramBookstagramMonitor = new InstagramBookstagramMonitor();
export default instagramBookstagramMonitor;
