/**
 * TikTok BookTok Monitor Service
 *
 * Monitors TikTok for trending BookTok content, extracting:
 * - Views, likes, shares, comments, saves
 * - Captions, hashtags, books mentioned
 * - Posting time, creator info
 *
 * Uses TikTok API for data collection with rate limiting
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

const logger = getLogger('services', 'booktok-tiktok-monitor');

// BookTok related hashtags to monitor
const BOOKTOK_HASHTAGS = [
  '#booktok',
  '#booktokmadness',
  '#bookrecommendations',
  '#romancebooks',
  '#romancerecommendations',
  '#spicybooks',
  '#darkromance',
  '#fantasyromance',
  '#contemporaryromance',
  '#bookstagram',
  '#bookcommunity',
  '#reading',
  '#booklover',
  '#booktoker',
  '#romancebooktoker',
  '#whyweread'
];

class TikTokBookTokMonitor extends BaseApiClient {
  constructor(config = {}) {
    super({
      name: 'TikTokBookTokMonitor',
      baseURL: 'https://open.tiktokapis.com/v2',
      timeout: 30000,
      ...config,
    });

    this.rateLimiter = rateLimiterService;
    this.isRunning = false;
    this.lastRunTime = null;
    this.postsCollected = 0;

    logger.info('TikTok BookTok Monitor Service initialized');
  }

  /**
   * Fetch trending BookTok posts from TikTok
   * @param {number} limit - Maximum number of posts to fetch
   * @param {string} timeWindow - Time window for posts (e.g., '7d', '24h')
   * @returns {Promise<Array>} Array of post data
   */
  async fetchTrendingBookTokPosts(limit = 50, timeWindow = '24h') {
    if (this.isRunning) {
      logger.warn('TikTok BookTok Monitor is already running');
      return [];
    }

    this.isRunning = true;
    const startTime = Date.now();
    const posts = [];

    try {
      logger.info('Fetching trending BookTok posts', { limit, timeWindow });

      // Get TikTok access token
      const tokenData = await oauthManager.getValidToken('tiktok');
      if (!tokenData || !tokenData.access_token) {
        throw new Error('No valid TikTok access token available');
      }

      // For each hashtag, fetch trending posts
      const hashtagsToSearch = BOOKTOK_HASHTAGS.slice(0, 5); // Start with top 5

      for (const hashtag of hashtagsToSearch) {
        try {
          await this.rateLimiter.throttle('tiktok-api', 10, 60000); // 10 requests per minute

          // Note: TikTok's API has limited hashtag search capabilities
          // This is a simplified implementation - production would need
          // either TikTok Research API or web scraping
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
      logger.info('TikTok BookTok collection completed', {
        postsCollected: posts.length,
        duration: `${duration}ms`
      });

      return posts;

    } catch (error) {
      logger.error('Error in fetchTrendingBookTokPosts', {
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
   * @param {string} accessToken - TikTok access token
   * @returns {Promise<Array>} Array of posts
   */
  async fetchHashtagPosts(hashtag, limit, accessToken) {
    try {
      const cleanHashtag = hashtag.startsWith('#') ? hashtag.substring(1) : hashtag;

      // TikTok Research API would be used here if available
      // For now, we'll use a simplified endpoint structure
      // In production, you'd need to use TikTok's Research API or approved endpoints

      // This is a placeholder - actual implementation depends on API access level
      logger.debug(`Fetching posts for hashtag: ${cleanHashtag}`, { limit });

      // Simulated response structure - replace with actual API call
      // const response = await this.get(`/research/tag/hashtag/videos/?query=${cleanHashtag}`, {
      //   headers: {
      //     'Authorization': `Bearer ${accessToken}`
      //   }
      // });

      // Return empty array for now - this needs actual API integration
      return [];

    } catch (error) {
      logger.error(`Error fetching hashtag posts for ${hashtag}`, {
        error: error.message
      });
      return [];
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

    logger.info('Processing collected posts', { count: posts.length });

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
   * @param {Object} post - Post data from TikTok
   */
  async processSinglePost(post) {
    // Extract hashtags
    const hashtags = this.extractHashtags(post);

    // Extract books mentioned
    const booksMentioned = await this.extractBooksMentioned(post);

    // Extract hook
    const hook = this.extractHook(post);

    // Update hashtag performance
    for (const hashtag of hashtags) {
      await MarketingHashtagPerformance.recordUsage(hashtag, 'tiktok', {
        views: post.stats?.play_count || 0,
        engagementRate: this.calculateEngagementRate(post.stats),
        pairedHashtags: hashtags.filter(h => h !== hashtag),
        topic: this.detectTopic(post)
      });
    }

    // Update hook patterns
    if (hook) {
      await MarketingHookPattern.recordPerformance(hook, {
        platform: 'tiktok',
        engagementRate: this.calculateEngagementRate(post.stats),
        views: post.stats?.play_count || 0,
        topic: this.detectTopic(post),
        url: post.web_url || post.share_url
      });
    }

    // Update trend metrics for entities
    await this.updateTrendMetrics(post, hashtags, booksMentioned);

    // Update influencer if this is from a known creator
    if (post.author?.username) {
      await this.updateInfluencerData(post.author, post);
    }
  }

  /**
   * Extract hashtags from post
   * @param {Object} post - Post data
   * @returns {Array<string>} Array of hashtags (without #)
   */
  extractHashtags(post) {
    const hashtags = [];

    // From caption
    if (post.caption) {
      const hashtagRegex = /#(\w+)/g;
      let match;
      while ((match = hashtagRegex.exec(post.caption)) !== null) {
        hashtags.push(match[1]);
      }
    }

    // From hashtags field if available
    if (post.hashtags && Array.isArray(post.hashtags)) {
      for (const tag of post.hashtags) {
        const tagText = tag.hashtag_name || tag.tag || tag.text || tag;
        const cleanTag = tagText.replace(/^#/, '');
        if (cleanTag && !hashtags.includes(cleanTag)) {
          hashtags.push(cleanTag);
        }
      }
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
    const caption = post.caption || post.text_description || '';

    // Common book title patterns in BookTok posts
    // This is a simplified extraction - would use NLP/GLM-4.7 in production
    const patterns = [
      /by\s+([A-Z][a-zA-Z\s]+?)(?:\s|$|\.|,)/gi,
      /"([^"]{10,80})"/g,
      /'([^']{10,80})'/g,
    ];

    for (const pattern of patterns) {
      const matches = caption.match(pattern);
      if (matches) {
        for (const match of matches) {
          const title = match.replace(/^['"]|['"]$/g, '').replace(/^(by\s+)/i, '').trim();
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
    const caption = post.caption || post.text_description || '';
    if (!caption) return null;

    // Get first sentence or first line as hook
    const lines = caption.split('\n');
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      if (firstLine.length > 5 && firstLine.length < 200) {
        return firstLine;
      }
    }

    // Get first sentence
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
   * @param {Object} stats - Post stats
   * @returns {number} Engagement rate percentage
   */
  calculateEngagementRate(stats) {
    if (!stats) return 0;

    const views = stats.play_count || stats.views || 0;
    const likes = stats.digg_count || stats.likes || 0;
    const comments = stats.comment_count || stats.comments || 0;
    const shares = stats.share_count || stats.shares || 0;

    if (views === 0) return 0;

    return ((likes + comments + shares) / views) * 100;
  }

  /**
   * Detect topic from post
   * @param {Object} post - Post data
   * @returns {string} Detected topic
   */
  detectTopic(post) {
    const caption = (post.caption || post.text_description || '').toLowerCase();

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
    const views = post.stats?.play_count || 0;

    // Record metrics for hashtags
    for (const hashtag of hashtags) {
      await MarketingBookTrendMetrics.recordMetrics({
        entityType: 'hashtag',
        entityId: hashtag,
        entityName: hashtag,
        platform: 'tiktok',
        timestamp,
        mentionCount: 1,
        avgEngagementRate: engagementRate,
        postsSampled: 1,
        topPosts: [{
          postId: post.id,
          platform: 'tiktok',
          views,
          engagementRate,
          url: post.web_url || post.share_url
        }]
      });
    }

    // Record metrics for books mentioned
    for (const book of books) {
      await MarketingBookTrendMetrics.recordMetrics({
        entityType: 'book',
        entityId: book.title,
        entityName: book.title,
        platform: 'tiktok',
        timestamp,
        mentionCount: 1,
        avgEngagementRate: engagementRate,
        postsSampled: 1
      });
    }
  }

  /**
   * Update influencer data
   * @param {Object} author - Author data
   * @param {Object} post - Post data
   */
  async updateInfluencerData(author, post) {
    try {
      const influencer = await MarketingBookTokInfluencer.findOrCreate({
        username: author.unique_id || author.username,
        platform: 'tiktok',
        displayName: author.nickname || author.display_name,
        followerCount: author.stats?.follower_count || author.follower_count || 0,
        verified: author.is_verified || author.verified || false
      });

      // Add this post to influencer's recent posts
      await influencer.addPost({
        postId: post.id,
        url: post.web_url || post.share_url,
        caption: post.caption,
        postedAt: new Date(post.create_time * 1000),
        views: post.stats?.play_count || 0,
        likes: post.stats?.digg_count || 0,
        comments: post.stats?.comment_count || 0,
        shares: post.stats?.share_count || 0,
        engagementRate: this.calculateEngagementRate(post.stats),
        topics: [this.detectTopic(post)],
        booksMentioned: await this.extractBooksMentioned(post),
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
const tikTokBookTokMonitor = new TikTokBookTokMonitor();
export default tikTokBookTokMonitor;
