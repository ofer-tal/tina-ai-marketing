/**
 * Community Sources Monitor Service
 *
 * Monitors community discussions from:
 * - Reddit (r/romancebooks, r/books)
 * - Discord servers
 * - Facebook groups
 *
 * Extracts:
 * - Books being discussed
 * - Community opinions
 * - Controversial topics
 * - Emerging trends
 */

import BaseApiClient from '../baseApiClient.js';
import { getLogger } from '../../utils/logger.js';
import rateLimiterService from '../rateLimiter.js';
import MarketingBook from '../../models/MarketingBook.js';
import MarketingBookTrendMetrics from '../../models/MarketingBookTrendMetrics.js';

const logger = getLogger('services', 'booktok-community-monitor');

// Reddit configuration
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;
const REDDIT_USER_AGENT = 'BlushMarketing/1.0';

// Subreddits to monitor
const SUBREDDITS = [
  'romancebooks',
  'books',
  'BookRecommendations',
  'FantasyRomance',
  'RomanceBooks'
];

// Discord server IDs to monitor (if configured)
const DISCORD_SERVERS = process.env.DISCORD_SERVER_IDS?.split(',') || [];

// Facebook groups (would require page access tokens)
const FACEBOOK_GROUPS = process.env.FACEBOOK_GROUP_IDS?.split(',') || [];

class CommunitySourcesMonitor extends BaseApiClient {
  constructor(config = {}) {
    super({
      name: 'CommunitySourcesMonitor',
      baseURL: 'https://www.reddit.com',
      timeout: 30000,
      ...config,
    });

    this.rateLimiter = rateLimiterService;
    this.isRunning = false;
    this.lastRunTime = null;

    this.redditConfigured = !!(REDDIT_CLIENT_ID && REDDIT_CLIENT_SECRET);
    this.discordConfigured = DISCORD_SERVERS.length > 0;

    logger.info('Community Sources Monitor initialized', {
      redditConfigured: this.redditConfigured,
      discordConfigured: this.discordConfigured,
      facebookGroups: FACEBOOK_GROUPS.length
    });
  }

  /**
   * Fetch discussions from Reddit
   * @param {Object} options - Fetch options
   * @returns {Promise<Array>} Array of discussion data
   */
  async fetchRedditDiscussions(options = {}) {
    const {
      subreddits = SUBREDDITS,
      limit = 50,
      timeWindow = 'day' // hour, day, week, month, year, all
    } = options;

    try {
      logger.info('Fetching Reddit discussions', { subreddits, limit });

      if (!this.redditConfigured) {
        logger.warn('Reddit not configured');
        return [];
      }

      const discussions = [];

      for (const subreddit of subreddits) {
        await this.rateLimiter.throttle('reddit-api', 30, 60000); // 30 requests per minute

        const subredditPosts = await this.fetchSubredditPosts(subreddit, limit, timeWindow);
        discussions.push(...subredditPosts);
      }

      // Process discussions
      await this.processRedditDiscussions(discussions);

      logger.info(`Fetched ${discussions.length} discussions from Reddit`);

      return discussions;

    } catch (error) {
      logger.error('Error fetching Reddit discussions', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Fetch posts from a specific subreddit
   * @param {string} subreddit - Subreddit name
   * @param {number} limit - Maximum posts to fetch
   * @param {string} timeWindow - Time window filter
   * @returns {Promise<Array>} Array of posts
   */
  async fetchSubredditPosts(subreddit, limit, timeWindow) {
    try {
      // Use Reddit's JSON endpoint (no OAuth required for public reads)
      const url = `/r/${subreddit}/hot.json`;
      const response = await this.get(url, {
        params: {
          limit: limit,
          t: timeWindow
        },
        headers: {
          'User-Agent': REDDIT_USER_AGENT
        }
      });

      if (response.data && response.data.data && response.data.data.children) {
        return response.data.data.children.map(child => ({
          id: child.data.id,
          title: child.data.title,
          selftext: child.data.selftext || '',
          author: child.data.author,
          subreddit: child.data.subreddit,
          score: child.data.score,
          numComments: child.data.numComments,
          created: child.data.created_utc,
          permalink: `https://www.reddit.com${child.data.permalink}`,
          url: child.data.url,
          isSelf: child.data.is_self
        }));
      }

      return [];

    } catch (error) {
      logger.error(`Error fetching posts from r/${subreddit}`, {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Process Reddit discussions and extract insights
   * @param {Array} discussions - Array of discussions
   */
  async processRedditDiscussions(discussions) {
    if (!discussions || discussions.length === 0) {
      return;
    }

    logger.info('Processing Reddit discussions', { count: discussions.length });

    for (const discussion of discussions) {
      try {
        await this.processSingleDiscussion(discussion);
      } catch (error) {
        logger.error('Error processing discussion', {
          error: error.message,
          postId: discussion.id
        });
      }
    }
  }

  /**
   * Process a single discussion
   * @param {Object} discussion - Discussion data
   */
  async processSingleDiscussion(discussion) {
    const text = `${discussion.title} ${discussion.selftext}`.toLowerCase();

    // Extract books mentioned
    const booksMentioned = this.extractBooksFromText(text);

    // Detect tropes
    const tropes = this.detectTropes(text);

    // Detect sentiment
    const sentiment = this.analyzeSentiment(discussion);

    // Record trend metrics
    for (const book of booksMentioned) {
      await MarketingBookTrendMetrics.recordMetrics({
        entityType: 'book',
        entityId: book.title,
        entityName: book.title,
        platform: 'all', // Reddit is platform-agnostic
        timestamp: new Date(discussion.created * 1000),
        mentionCount: 1,
        avgEngagementRate: 0, // Reddit doesn't have engagement rate like social
        postsSampled: 1,
        topPosts: [{
          postId: discussion.id,
          platform: 'reddit',
          views: 0,
          engagementRate: discussion.score || 0,
          url: discussion.permalink
        }]
      });
    }

    // Record metrics for tropes
    for (const trope of tropes) {
      await MarketingBookTrendMetrics.recordMetrics({
        entityType: 'trope',
        entityId: trope,
        entityName: trope,
        platform: 'all',
        timestamp: new Date(discussion.created * 1000),
        mentionCount: 1,
        avgEngagementRate: 0,
        postsSampled: 1
      });
    }
  }

  /**
   * Extract book titles from text
   * @param {string} text - Text to search
   * @returns {Array<Object>} Extracted books
   */
  extractBooksFromText(text) {
    const books = [];

    // Pattern for book titles in quotes
    const titlePatterns = [
      /"([^"]{5,80})"/g,
      /'([^']{5,80})'/g,
      /\*\*([^*]{5,80})\*\*/g
    ];

    // Look for "by author" patterns
    const authorPattern = /by\s+([A-Z][a-zA-Z\s]+?)(?:\s|$|\.|,)/gi;

    const textUpperCase = text;
    const authors = [];
    let match;
    while ((match = authorPattern.exec(textUpperCase)) !== null) {
      const author = match[1].trim();
      if (author.length > 3 && author.length < 50) {
        authors.push(author);
      }
    }

    for (const pattern of titlePatterns) {
      pattern.lastIndex = 0; // Reset regex
      while ((match = pattern.exec(text)) !== null) {
        const title = match[1].trim();
        if (title.length > 5 && title.length < 100 && !this.isCommonWord(title)) {
          books.push({
            title: this.capitalizeTitle(title),
            confidence: 0.6
          });
        }
      }
    }

    return books;
  }

  /**
   * Detect tropes from text
   * @param {string} text - Text to analyze
   * @returns {Array<string>} Detected tropes
   */
  detectTropes(text) {
    const tropes = [];

    const tropeKeywords = {
      'enemies to lovers': ['enemies', 'rivals', 'enemy to lover'],
      'fake dating': ['fake dating', 'fake relationship'],
      'friends to lovers': ['friends to lovers', 'best friend'],
      'forced proximity': ['forced proximity', 'roommates', 'trapped'],
      'age gap': ['age gap', 'older', 'younger'],
      'single dad': ['single dad'],
      'arranged marriage': ['arranged marriage'],
      'virgin': ['virgin', 'inexperienced'],
      'billionaire': ['billionaire', 'ceo']
    };

    for (const [trope, keywords] of Object.entries(tropeKeywords)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          tropes.push(trope);
          break;
        }
      }
    }

    return [...new Set(tropes)];
  }

  /**
   * Analyze sentiment of discussion
   * @param {Object} discussion - Discussion data
   * @returns {Object} Sentiment data
   */
  analyzeSentiment(discussion) {
    const text = `${discussion.title} ${discussion.selftext}`.toLowerCase();

    const positiveWords = ['love', 'loved', 'amazing', 'great', 'best', 'favorite', 'good', 'excellent'];
    const negativeWords = ['hate', 'hated', 'terrible', 'worst', 'boring', 'disappointed', 'bad'];

    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of positiveWords) {
      if (text.includes(word)) positiveCount++;
    }

    for (const word of negativeWords) {
      if (text.includes(word)) negativeCount++;
    }

    let sentiment = 'neutral';
    if (positiveCount > negativeCount * 2) sentiment = 'positive';
    else if (negativeCount > positiveCount * 2) sentiment = 'negative';

    return {
      sentiment,
      positiveCount,
      negativeCount,
      score: discussion.score || 0,
      commentCount: discussion.numComments || 0
    };
  }

  /**
   * Check if a word is too common to be a title
   * @param {string} word - Word to check
   * @returns {boolean} True if common word
   */
  isCommonWord(word) {
    const commonWords = ['the', 'and', 'but', 'for', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'are', 'this', 'that'];
    return commonWords.includes(word.toLowerCase());
  }

  /**
   * Capitalize a title properly
   * @param {string} title - Title to capitalize
   * @returns {string} Capitalized title
   */
  capitalizeTitle(title) {
    return title.replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Fetch activity from Discord servers
   * @param {Object} options - Fetch options
   * @returns {Promise<Array>} Array of activity data
   */
  async fetchDiscordActivity(options = {}) {
    const {
      servers = DISCORD_SERVERS,
      limit = 50
    } = options;

    try {
      logger.info('Fetching Discord activity', { servers });

      if (!this.discordConfigured) {
        logger.warn('Discord not configured');
        return [];
      }

      // Placeholder implementation
      // Would use Discord bot API to fetch messages

      logger.debug('Discord activity fetch is placeholder implementation');

      return [];

    } catch (error) {
      logger.error('Error fetching Discord activity', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Get trending topics from community discussions
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Trending topics
   */
  async getTrendingTopics(options = {}) {
    const {
      hours = 24,
      minMentions = 5
    } = options;

    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - hours);

      // Query trend metrics for community-mentioned entities
      const trending = await MarketingBookTrendMetrics.aggregate([
        {
          $match: {
            platform: 'all',
            timestamp: { $gte: cutoffDate },
            mentionCount: { $gte: minMentions }
          }
        },
        {
          $group: {
            _id: '$entityId',
            entityType: { $first: '$entityType' },
            entityName: { $first: '$entityName' },
            totalMentions: { $sum: '$mentionCount' },
            avgScore: { $avg: '$topPosts.engagementRate' }
          }
        },
        {
          $sort: { totalMentions: -1 }
        },
        {
          $limit: 20
        }
      ]);

      return trending;

    } catch (error) {
      logger.error('Error getting trending topics', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Get controversial topics (high discussion but mixed sentiment)
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Controversial topics
   */
  async getControversialTopics(options = {}) {
    const {
      hours = 24
    } = options;

    try {
      // Look for topics with high comment counts but mixed scores
      // This would be implemented by analyzing Reddit posts with
      // high comment counts and low or controversial scores

      logger.debug('Controversial topics detection not fully implemented');

      return [];

    } catch (error) {
      logger.error('Error getting controversial topics', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Run full community monitoring cycle
   * @returns {Promise<Object>} Monitoring results
   */
  async runMonitoringCycle() {
    if (this.isRunning) {
      logger.warn('Community monitoring is already running');
      return { success: false, message: 'Already running' };
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting community monitoring cycle');

      // Fetch Reddit discussions
      const redditDiscussions = await this.fetchRedditDiscussions();

      // Fetch Discord activity (if configured)
      const discordActivity = await this.fetchDiscordActivity();

      const duration = Date.now() - startTime;
      this.lastRunTime = new Date();

      logger.info('Community monitoring cycle completed', {
        redditDiscussions: redditDiscussions.length,
        discordActivity: discordActivity.length,
        duration: `${duration}ms`
      });

      return {
        success: true,
        redditDiscussions: redditDiscussions.length,
        discordActivity: discordActivity.length,
        duration
      };

    } catch (error) {
      logger.error('Error in community monitoring cycle', {
        error: error.message
      });
      return {
        success: false,
        error: error.message
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get service status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      redditConfigured: this.redditConfigured,
      discordConfigured: this.discordConfigured
    };
  }
}

// Export singleton instance
const communitySourcesMonitor = new CommunitySourcesMonitor();
export default communitySourcesMonitor;
