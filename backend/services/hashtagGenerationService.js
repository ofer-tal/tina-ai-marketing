import winston from 'winston';

/**
 * Hashtag Generation Service
 *
 * Generates relevant hashtags based on story content, spiciness level,
 * category, and trending tags in the romance/reading niche.
 *
 * Strategy:
 * 1. Extract keywords from story (title, category, tags, spiciness)
 * 2. Include niche-specific hashtags (romance, reading community)
 * 3. Include broad hashtags for discoverability
 * 4. Add brand hashtags (#blushapp, #romancewithblush)
 * 5. Optimize mix: 3-5 niche, 2-3 broad, 1-2 brand
 * 6. Target total: 8-12 hashtags (optimal for engagement)
 */

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'hashtag-generation' },
  transports: [
    new winston.transports.File({ filename: 'logs/hashtag-generation-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/hashtag-generation.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

class HashtagGenerationService {
  constructor() {
    // Trending hashtags in romance/reading niche (updated periodically)
    this.trendingHashtags = {
      high: [
        '#BookTok', '#RomanceTok', '#RomanceBooks', '#BookRecommendations',
        '#ReadingCommunity', '#BookLovers', '#CurrentlyReading'
      ],
      medium: [
        '#RomanceReader', '#BookCommunity', '#MustRead', '#Bookstagram',
        '#YARomance', '#RomanceNovel', '#WhatToRead'
      ],
      low: [
        '#TBR', '#BookWorm', '#ReadingList', '#BookAddict',
        '#LoveStory', '#FictionalLove', '#ReadingTime'
      ]
    };

    // Broad hashtags for discoverability
    this.broadHashtags = [
      '#fyp', '#foryou', '#foryoupage', '#viral',
      '#trending', '#explore', '#discover', '#recommended'
    ];

    // Brand hashtags
    this.brandHashtags = [
      '#blushapp', '#romancewithblush', '#blushstories',
      '#airomance', '#romanceai'
    ];

    // Niche-specific hashtag pools by category
    this.categoryHashtags = {
      'Contemporary': [
        '#contemporaryromance', '#modernromance', '#contemporarylove',
        '#cityromance', '#officelove', '#ceoromance'
      ],
      'Historical': [
        '#historicalromance', '#historicalfiction', '#perioddrama',
        '#regencyromance', '#victorianromance', '#historicallove'
      ],
      'Fantasy': [
        '#fantasyromance', '#paranormalromance', '#magicallove',
        '#fantasybooks', '#romantasy', '#fantasylover'
      ],
      'Sci-Fi': [
        '#scifiromance', '#scifibooks', '#scifilove',
        '#futuristicromance', '#spacelove', '#scififiction'
      ],
      'LGBTQ+': [
        '#lgbtqromance', '#queerromance', '#lgbtqbooks',
        '#pridemonth', '#lovewins', '#queerlove'
      ]
    };

    // Spiciness-aware hashtags
    this.spicinessHashtags = {
      0: ['#sweetromance', '#cleanromance', '#wholesomelove', '#gentleromance', '#pgromance'],
      1: ['#romance', '#lovestory', '#couplegoals', '#relationshipgoals', '#heartwarming'],
      2: ['#spicybooks', '#hotromance', '#steamyromance', '#romancereads', '#passionate'],
      3: ['#darkromance', '#intenseromance', '#spicyromance', '#hotreads', '#forbiddenlove']
    };

    logger.info('HashtagGenerationService initialized', {
      trendingCount: Object.values(this.trendingHashtags).flat().length,
      broadCount: this.broadHashtags.length,
      brandCount: this.brandHashtags.length,
      categories: Object.keys(this.categoryHashtags).length
    });
  }

  /**
   * Generate hashtags based on story metadata
   *
   * @param {Object} story - Story object with title, category, spiciness, tags
   * @param {Object} options - Generation options
   * @returns {Object} Generated hashtags with metadata
   */
  generateHashtags(story, options = {}) {
    const {
      category = story.category || '',
      spiciness = story.spiciness || 1,
      tags = story.tags || [],
      platform = 'tiktok', // tiktok, instagram, youtube
      includeTrending = true,
      includeBroad = true,
      includeBrand = true
    } = options;

    logger.info('Generating hashtags', {
      storyTitle: story.title,
      category,
      spiciness,
      tagCount: tags.length,
      platform
    });

    try {
      // Step 1: Extract story keywords
      const storyKeywords = this.extractStoryKeywords(story);

      // Step 2: Query trending hashtags (simulated - would use API in production)
      const trendingTags = includeTrending ? this.getTrendingHashtags(platform) : [];

      // Step 3: Generate mix of niche and broad hashtags
      const nicheTags = this.getNicheHashtags(category, spiciness, storyKeywords);
      const broadTags = includeBroad ? this.getBroadHashtags(platform) : [];
      const brandTags = includeBrand ? this.brandHashtags : [];

      // Step 4: Combine and optimize
      const allHashtags = [
        ...nicheTags,
        ...trendingTags,
        ...broadTags,
        ...brandTags
      ];

      // Deduplicate while preserving order
      const uniqueHashtags = [...new Set(allHashtags)];

      // Step 5: Verify optimal count (8-12 for best engagement)
      const optimizedHashtags = this.optimizeHashtagCount(uniqueHashtags, platform);

      // Step 6: Verify brand tags are included
      const finalHashtags = this.ensureBrandTags(optimizedHashtags, brandTags);

      const result = {
        hashtags: finalHashtags,
        count: finalHashtags.length,
        breakdown: {
          niche: nicheTags.slice(0, 5).length,
          trending: trendingTags.slice(0, 3).length,
          broad: broadTags.slice(0, 3).length,
          brand: brandTags.length
        },
        metadata: {
          category,
          spiciness,
          platform,
          timestamp: new Date().toISOString()
        }
      };

      logger.info('Hashtags generated successfully', {
        total: result.count,
        breakdown: result.breakdown
      });

      return result;

    } catch (error) {
      logger.error('Error generating hashtags', {
        error: error.message,
        story: story.title
      });
      throw error;
    }
  }

  /**
   * Step 1: Extract keywords from story
   */
  extractStoryKeywords(story) {
    const keywords = [];

    // From title
    if (story.title) {
      const titleWords = story.title.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3);
      keywords.push(...titleWords);
    }

    // From tags
    if (story.tags && Array.isArray(story.tags)) {
      keywords.push(...story.tags.map(tag => tag.toLowerCase()));
    }

    // From category
    if (story.category) {
      keywords.push(story.category.toLowerCase());
    }

    // Return unique keywords
    return [...new Set(keywords)];
  }

  /**
   * Step 2: Get trending hashtags for platform
   */
  getTrendingHashtags(platform) {
    // In production, this would query TikTok/Instagram API for trending tags
    // For now, return from curated list based on platform

    const platformTrending = {
      'tiktok': this.trendingHashtags.high.slice(0, 3),
      'instagram': this.trendingHashtags.medium.slice(0, 3),
      'youtube': this.trendingHashtags.high.slice(0, 2).concat(this.trendingHashtags.medium.slice(0, 1))
    };

    return platformTrending[platform] || this.trendingHashtags.high.slice(0, 3);
  }

  /**
   * Step 3: Get niche hashtags based on category and spiciness
   */
  getNicheHashtags(category, spiciness, storyKeywords) {
    const nicheTags = [];

    // Category-specific
    if (category && this.categoryHashtags[category]) {
      nicheTags.push(...this.categoryHashtags[category].slice(0, 3));
    }

    // Spiciness-specific
    if (this.spicinessHashtags[spiciness]) {
      nicheTags.push(...this.spicinessHashtags[spiciness].slice(0, 2));
    }

    // Keyword-based (convert story keywords to hashtags)
    const keywordTags = storyKeywords
      .filter(kw => kw.length > 3 && kw.length < 15)
      .slice(0, 3)
      .map(kw => `#${kw.replace(/\s+/g, '')}`);

    nicheTags.push(...keywordTags);

    return nicheTags.slice(0, 6); // Max 6 niche tags
  }

  /**
   * Step 3: Get broad hashtags for discoverability
   */
  getBroadHashtags(platform) {
    // Different platforms benefit from different broad tags
    const platformBroad = {
      'tiktok': ['#fyp', '#foryou', '#foryoupage'],
      'instagram': ['#explore', '#discover', '#reels'],
      'youtube': ['#shorts', '#trending', '#viral']
    };

    return platformBroad[platform] || this.broadHashtags.slice(0, 3);
  }

  /**
   * Step 4: Optimize hashtag count for platform
   */
  optimizeHashtagCount(hashtags, platform) {
    const limits = {
      'tiktok': 12,    // TikTok: 3-5 recommended, max technically higher
      'instagram': 30, // Instagram: max 30
      'youtube': 15    // YouTube Shorts: 15 recommended
    };

    const targetCount = limits[platform] || 12;

    // Prioritize: niche > trending > broad > brand
    // Brand tags are re-added in ensureBrandTags()
    const withoutBrand = hashtags.filter(tag =>
      !this.brandHashtags.includes(tag)
    );

    return withoutBrand.slice(0, targetCount);
  }

  /**
   * Step 5: Ensure brand tags are included
   */
  ensureBrandTags(hashtags, brandTags) {
    // Always include at least 1-2 brand tags
    const guaranteedBrand = brandTags.slice(0, 2);

    // Remove any existing brand tags to avoid duplicates
    const withoutBrand = hashtags.filter(tag =>
      !this.brandHashtags.includes(tag)
    );

    // Prepend brand tags (they appear first in captions)
    return [...guaranteedBrand, ...withoutBrand];
  }

  /**
   * Validate hashtag quality
   */
  validateHashtags(hashtags) {
    const issues = [];

    if (hashtags.length === 0) {
      issues.push('No hashtags generated');
    }

    if (hashtags.length < 5) {
      issues.push('Too few hashtags (recommend 8-12)');
    }

    if (hashtags.length > 30) {
      issues.push('Too many hashtags (max 30 for Instagram)');
    }

    // Check for banned/overused hashtags
    const bannedTags = ['#follow4follow', '#like4like', '#followtrain'];
    const hasBanned = hashtags.some(tag => bannedTags.includes(tag.toLowerCase()));
    if (hasBanned) {
      issues.push('Contains banned/low-quality hashtags');
    }

    return {
      valid: issues.length === 0,
      issues,
      score: this.calculateHashtagScore(hashtags)
    };
  }

  /**
   * Calculate hashtag quality score
   */
  calculateHashtagScore(hashtags) {
    let score = 0;

    // Niche tags: +10 points each
    const nicheCount = hashtags.filter(h =>
      Object.values(this.categoryHashtags).flat().includes(h) ||
      Object.values(this.spicinessHashtags).flat().includes(h)
    ).length;
    score += nicheCount * 10;

    // Trending tags: +15 points each
    const trendingCount = hashtags.filter(h =>
      Object.values(this.trendingHashtags).flat().includes(h)
    ).length;
    score += trendingCount * 15;

    // Brand tags: +5 points each
    const brandCount = hashtags.filter(h =>
      this.brandHashtags.includes(h)
    ).length;
    score += brandCount * 5;

    // Broad tags: +3 points each
    const broadCount = hashtags.filter(h =>
      this.broadHashtags.includes(h)
    ).length;
    score += broadCount * 3;

    // Deduplication bonus
    if (hashtags.length === new Set(hashtags).size) {
      score += 10;
    }

    // Optimal count bonus (8-12 hashtags)
    if (hashtags.length >= 8 && hashtags.length <= 12) {
      score += 20;
    }

    return Math.min(score, 100); // Max score: 100
  }

  /**
   * Health check for service
   */
  healthCheck() {
    return {
      service: 'hashtag-generation',
      status: 'ok',
      timestamp: new Date().toISOString(),
      capabilities: {
        trendingHashtags: Object.values(this.trendingHashtags).flat().length,
        categoriesSupported: Object.keys(this.categoryHashtags).length,
        spicinessLevels: Object.keys(this.spicinessHashtags).length,
        brandHashtags: this.brandHashtags.length,
        platformsSupported: ['tiktok', 'instagram', 'youtube']
      }
    };
  }
}

// Create singleton instance
const hashtagGenerationService = new HashtagGenerationService();

export default hashtagGenerationService;
