/**
 * Hook Structure Analyzer
 *
 * Uses NLP to parse and cluster hook structures.
 * Correlates hook structures with performance.
 *
 * Identifies patterns like:
 * "Questions starting with 'What's the last' perform 40% better"
 */

import { getLogger } from '../../../utils/logger.js';
import MarketingHookPattern from '../../../models/MarketingHookPattern.js';
import MarketingPost from '../../../models/MarketingPost.js';
import glmService from '../../glmService.js';

const logger = getLogger('services', 'booktok-hook-analyzer');

// Hook structure categories
const HOOK_CATEGORIES = {
  OPINION: 'opinion',
  QUESTION: 'question',
  CONFESSION: 'confession',
  CHALLENGE: 'challenge',
  RECOMMENDATION: 'recommendation',
  HOT_TAKE: 'hot_take',
  CONTROVERSY: 'controversy',
  RELATABLE: 'relatable',
  STORY_TIME: 'story_time',
  TROPE_CALLOUT: 'trope_callout',
  SPICE_WARNING: 'spice_warning',
  BOOK_REVIEW: 'book_review'
};

// Opening patterns
const OPENING_PATTERNS = {
  QUESTION: /^(what|how|why|who|where|when|do|does|did|is|are|can|could|would|should)\b/i,
  NUMBER: /^\d+(\.\d+)?\s*(ways|reasons|books|tropes|types|kinds)/i,
  CONFESS: /^(i\s+(have\s+to\s+confess|i\s+admit|i\s+mean))/i,
  STATEMENT: /^(the|this|that|a|an|every|no|all|some)/i,
  QUOTE: /^["']/,
  STOPWORDS: /^(stop|wait|hold on|okay|so|listen)/i
};

class HookStructureAnalyzer {
  constructor() {
    this.structureCache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Parse hook structure
   * @param {string} hookText - Hook text to analyze
   * @returns {Promise<Object>} Parsed structure
   */
  async parseHookStructure(hookText) {
    if (!hookText || typeof hookText !== 'string') {
      return {
        isValid: false,
        error: 'Invalid hook text'
      };
    }

    try {
      const trimmed = hookText.trim();
      const structure = {
        isValid: true,
        text: trimmed,
        length: trimmed.length,
        wordCount: trimmed.split(/\s+/).length,
        opensWith: null,
        category: null,
        hasEmoji: /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(trimmed),
        hasNumber: /\d/.test(trimmed),
        hasCaps: /[A-Z]/.test(trimmed),
        emotionalTone: null,
        keyPhrases: []
      };

      // Determine opening pattern
      structure.opensWith = this.detectOpeningPattern(trimmed);

      // Categorize hook
      structure.category = this.categorizeHook(trimmed, structure.opensWith);

      // Detect emotional tone
      structure.emotionalTone = this.detectEmotionalTone(trimmed);

      // Extract key phrases
      structure.keyPhrases = this.extractKeyPhrases(trimmed);

      return structure;

    } catch (error) {
      logger.error('Error parsing hook structure', {
        error: error.message
      });
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Detect opening pattern
   * @param {string} hook - Hook text
   * @returns {string} Opening pattern
   */
  detectOpeningPattern(hook) {
    const firstWord = hook.split(/\s+/)[0];

    for (const [pattern, regex] of Object.entries(OPENING_PATTERNS)) {
      if (regex.test(hook)) {
        return pattern.toLowerCase();
      }
    }

    // Check for ALL CAPS opening
    if (firstWord && firstWord === firstWord.toUpperCase() && firstWord.length > 1) {
      return 'caps';
    }

    return 'statement';
  }

  /**
   * Categorize hook
   * @param {string} hook - Hook text
   * @param {string} opensWith - Opening pattern
   * @returns {string} Category
   */
  categorizeHook(hook, opensWith) {
    const lower = hook.toLowerCase();

    // Question hooks
    if (opensWith === 'question') {
      if (lower.includes('what\'s the last') || lower.includes('last book')) {
        return 'question';
      }
      return HOOK_CATEGORIES.QUESTION;
    }

    // Confession hooks
    if (lower.includes('i have to admit') || lower.includes('i confess') || lower.includes('guilty')) {
      return HOOK_CATEGORIES.CONFESSION;
    }

    // Opinion/hot take hooks
    if (lower.includes('unpopular opinion') || lower.includes('hot take') || lower.includes('controversial')) {
      return HOOK_CATEGORIES.HOT_TAKE;
    }

    // Challenge hooks
    if (lower.includes('i dare you') || lower.includes('bet you') || lower.includes('prove me wrong')) {
      return HOOK_CATEGORIES.CHALLENGE;
    }

    // Recommendation hooks
    if (lower.includes('you need to read') || lower.includes('must read') || lower.includes('recommend')) {
      return HOOK_CATEGORIES.RECOMMENDATION;
    }

    // Spice warning hooks
    if (lower.includes('spice') || lower.includes('steamy') || lower.includes('cold shower')) {
      return HOOK_CATEGORIES.SPICE_WARNING;
    }

    // Trope callout
    if (lower.includes('trope') || lower.includes('enemies to lovers') || lower.includes('fake dating')) {
      return HOOK_CATEGORIES.TROPE_CALLOUT;
    }

    // Story time
    if (lower.includes('story time') || lower.includes('so i') || lower.includes('me:')) {
      return HOOK_CATEGORIES.STORY_TIME;
    }

    // Book review
    if (lower.includes('review') || lower.includes('rating') || lower.includes('stars')) {
      return HOOK_CATEGORIES.BOOK_REVIEW;
    }

    return HOOK_CATEGORIES.OPINION;
  }

  /**
   * Detect emotional tone
   * @param {string} hook - Hook text
   * @returns {string} Emotional tone
   */
  detectEmotionalTone(hook) {
    const lower = hook.toLowerCase();

    const emotionalIndicators = {
      excited: ['excited', 'can\'t wait', 'obsessed', 'love', 'amazing', 'incredible'],
      curious: ['what', 'how', 'why', 'wonder', 'anyone else', 'am i the only one'],
      shocked: ['shocked', 'stunned', 'jaw dropped', 'can\'t believe', 'wtf'],
      nostalgic: ['remember when', 'throwback', 'childhood', 'old school'],
      angry: ['hate', 'angry', 'frustrated', 'done with', 'tired of'],
      sad: ['heartbroken', 'devastated', 'cried', 'tears', 'sad'],
      humorous: ['lol', 'lmao', 'funny', 'joke', 'can\'t even', 'literally dying']
    };

    for (const [tone, indicators] of Object.entries(emotionalIndicators)) {
      for (const indicator of indicators) {
        if (lower.includes(indicator)) {
          return tone;
        }
      }
    }

    return 'neutral';
  }

  /**
   * Extract key phrases from hook
   * @param {string} hook - Hook text
   * @returns {Array<string>} Key phrases
   */
  extractKeyPhrases(hook) {
    const phrases = [];

    // Extract phrases in quotes
    const quoteRegex = /"([^"]{3,50})"/g;
    let match;
    while ((match = quoteRegex.exec(hook)) !== null) {
      phrases.push(match[1].trim());
    }

    // Extract numbered items
    const numberRegex = /(\d+\.\s+[^.!?]{10,50})/g;
    while ((match = numberRegex.exec(hook)) !== null) {
      phrases.push(match[1].trim());
    }

    // Extract book titles (capitalized phrases)
    const titleRegex = /\b([A-Z][a-z]+(\s+[A-Z][a-z]+){1,3})\b/g;
    const potentialTitles = [];
    while ((match = titleRegex.exec(hook)) !== null) {
      const title = match[1];
      if (title.length > 10 && title.length < 60) {
        potentialTitles.push(title);
      }
    }

    return [...new Set([...phrases, ...potentialTitles])];
  }

  /**
   * Cluster similar hooks
   * @param {Array<string>} hooks - Array of hooks
   * @returns {Promise<Array<Array>>} Clusters of similar hooks
   */
  async clusterSimilarHooks(hooks) {
    if (!hooks || hooks.length === 0) {
      return [];
    }

    try {
      // Use GLM-4.7 to analyze and cluster hooks
      const prompt = `Analyze these ${hooks.length} book-related social media hooks and group them by similarity in structure and theme. Return only a JSON array where each element has the format: {"cluster": "cluster_name", "hooks": [array of hook indices belonging to this cluster], "pattern": "description of the pattern"}.

Hooks to analyze:
${hooks.map((h, i) => `${i + 1}. "${h}"`).join('\n')}`;

      const response = await glmService.generate([
        { role: 'system', content: 'You are a content analysis assistant. Always respond with valid JSON only, no additional text.' },
        { role: 'user', content: prompt }
      ], { temperature: 0.3 });

      let clusters = [];
      try {
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          clusters = JSON.parse(jsonMatch[0]);
          if (!Array.isArray(clusters)) {
            clusters = [];
          }
        }
      } catch (e) {
        logger.warn('Failed to parse hook clustering response', { error: e.message });
      }

      // Fallback: simple clustering by category
      if (clusters.length === 0) {
        clusters = await this.simpleClusterHooks(hooks);
      }

      return clusters;

    } catch (error) {
      logger.error('Error clustering hooks', {
        error: error.message
      });
      return await this.simpleClusterHooks(hooks);
    }
  }

  /**
   * Simple clustering fallback (by category)
   * @param {Array<string>} hooks - Hooks to cluster
   * @returns {Promise<Array>} Clusters
   */
  async simpleClusterHooks(hooks) {
    const categoryMap = new Map();

    for (let i = 0; i < hooks.length; i++) {
      const structure = await this.parseHookStructure(hooks[i]);
      const category = structure.category || 'other';

      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category).push(i + 1);
    }

    return Array.from(categoryMap.entries()).map(([category, indices]) => ({
      cluster: category,
      hooks: indices,
      pattern: `Hooks that start with or express ${category}`
    }));
  }

  /**
   * Correlate hook with performance
   * @param {string} hook - Hook text
   * @param {Object} performance - Performance data
   * @returns {Promise<Object>} Correlation analysis
   */
  async correlateHookWithPerformance(hook, performance) {
    try {
      const structure = await this.parseHookStructure(hook);

      // Find similar hooks in database
      const similarHooks = await MarketingHookPattern
        .find({
          active: true,
          category: structure.category
        })
        .select('hookTemplate avgEngagementRate sampleSize')
        .lean();

      if (similarHooks.length === 0) {
        return {
          hook,
          structure,
          hasComparison: false,
          message: 'No similar hooks found for comparison'
        };
      }

      // Calculate benchmarks
      const avgEngagement = similarHooks.reduce((sum, h) => sum + h.avgEngagementRate, 0) / similarHooks.length;
      const maxEngagement = Math.max(...similarHooks.map(h => h.avgEngagementRate));
      const minEngagement = Math.min(...similarHooks.map(h => h.avgEngagementRate));

      const actualEngagement = performance.engagementRate || 0;

      // Calculate percentile
      const percentile = this.calculatePercentile(actualEngagement, similarHooks.map(h => h.avgEngagementRate));

      return {
        hook,
        structure,
        hasComparison: true,
        benchmarks: {
          avg: avgEngagement,
          max: maxEngagement,
          min: minEngagement
        },
        performance: {
          actual: actualEngagement,
          vsAverage: actualEngagement - avgEngagement,
          vsAveragePercent: avgEngagement > 0 ? ((actualEngagement - avgEngagement) / avgEngagement) * 100 : 0,
          percentile
        },
        similarHooksCount: similarHooks.length,
        topPerformers: similarHooks
          .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate)
          .slice(0, 3)
          .map(h => ({
            template: h.hookTemplate,
            performance: h.avgEngagementRate
          }))
      };

    } catch (error) {
      logger.error('Error correlating hook with performance', {
        error: error.message
      });
      return {
        hook,
        hasComparison: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate percentile
   * @param {number} value - Value to check
   * @param {Array<number>} dataset - Dataset to compare against
   * @returns {number} Percentile (0-100)
   */
  calculatePercentile(value, dataset) {
    if (!dataset || dataset.length === 0) return 50;

    const sorted = [...dataset].sort((a, b) => a - b);
    const rank = sorted.filter(v => v <= value).length;
    return (rank / sorted.length) * 100;
  }

  /**
   * Generate hook variations
   * @param {string} hook - Original hook
   * @param {number} count - Number of variations
   * @returns {Promise<Array<string>>} Hook variations
   */
  async generateHookVariations(hook, count = 3) {
    try {
      const structure = await this.parseHookStructure(hook);

      const prompt = `Generate ${count} variations of the following social media hook for book promotion. Keep the same core message and emotional tone but vary the structure and wording.

Original hook: "${hook}"
Hook category: ${structure.category}
Emotional tone: ${structure.emotionalTone}

Return only a JSON array of strings, no additional text.`;

      const response = await glmService.generate([
        { role: 'system', content: 'You are a creative copywriting assistant. Always respond with valid JSON only, no additional text.' },
        { role: 'user', content: prompt }
      ], { temperature: 0.8 });

      let variations = [];
      try {
        const jsonMatch = response.content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          variations = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        logger.warn('Failed to parse hook variations response');
      }

      return Array.isArray(variations) ? variations : [];

    } catch (error) {
      logger.error('Error generating hook variations', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Analyze hook performance trends
   * @param {string} category - Hook category
   * @param {number} days - Days to analyze
   * @returns {Promise<Object>} Performance trends
   */
  async analyzeHookPerformanceTrends(category = null, days = 30) {
    try {
      const matchQuery = { active: true };
      if (category) {
        matchQuery.category = category;
      }

      const hooks = await MarketingHookPattern
        .find(matchQuery)
        .select('category avgEngagementRate sampleSize performanceHistory lastUsedAt')
        .lean();

      const byCategory = new Map();
      let totalHooks = 0;
      let totalEngagement = 0;

      for (const hook of hooks) {
        const cat = hook.category || 'other';
        if (!byCategory.has(cat)) {
          byCategory.set(cat, { count: 0, totalEngagement: 0, hooks: [] });
        }

        const catData = byCategory.get(cat);
        catData.count++;
        catData.totalEngagement += hook.avgEngagementRate;
        catData.hooks.push({
          template: hook.hookTemplate,
          engagement: hook.avgEngagementRate,
          sampleSize: hook.sampleSize
        });

        totalHooks++;
        totalEngagement += hook.avgEngagementRate;
      }

      const categoryStats = {};
      for (const [cat, data] of byCategory) {
        categoryStats[cat] = {
          count: data.count,
          avgEngagement: data.totalEngagement / data.count,
          topPerformers: data.hooks.sort((a, b) => b.engagement - a.engagement).slice(0, 3)
        };
      }

      return {
        totalHooks,
        overallAvgEngagement: totalHooks > 0 ? totalEngagement / totalHooks : 0,
        byCategory: categoryStats
      };

    } catch (error) {
      logger.error('Error analyzing hook performance trends', {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Clear the structure cache
   */
  clearCache() {
    this.structureCache.clear();
    logger.info('Hook structure analyzer cache cleared');
  }

  /**
   * Get cache status
   * @returns {Object} Cache status
   */
  getCacheStatus() {
    return {
      size: this.structureCache.size,
      keys: Array.from(this.structureCache.keys()),
      expiry: this.cacheExpiry
    };
  }
}

// Export singleton instance
const hookStructureAnalyzer = new HookStructureAnalyzer();
export default hookStructureAnalyzer;
