import TinaLearning from '../models/TinaLearning.js';
import MarketingPost from '../models/MarketingPost.js';
import MarketingExperiment from '../models/MarketingExperiment.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('services', 'pattern-detection');

/**
 * Tina Pattern Detection Service
 *
 * Analyzes data to discover patterns and create/update learnings.
 * Supports content, time-based, hashtag, platform, and experiment patterns.
 */
class TinaPatternDetection {
  /**
   * Detect all types of patterns from recent data
   */
  async detectAllPatterns(days = 30) {
    logger.info('Starting comprehensive pattern detection', { days });

    const results = {
      contentPatterns: [],
      timePatterns: [],
      hashtagPatterns: [],
      platformPatterns: [],
      experimentPatterns: [],
      totalPatterns: 0
    };

    try {
      // Run all pattern detection in parallel
      const [
        contentPatterns,
        timePatterns,
        hashtagPatterns,
        platformPatterns,
        experimentPatterns
      ] = await Promise.all([
        this.detectContentPatterns(days),
        this.detectTimePatterns(days),
        this.detectHashtagPatterns(days),
        this.detectPlatformPatterns(days),
        this.detectExperimentPatterns()
      ]);

      results.contentPatterns = contentPatterns;
      results.timePatterns = timePatterns;
      results.hashtagPatterns = hashtagPatterns;
      results.platformPatterns = platformPatterns;
      results.experimentPatterns = experimentPatterns;

      results.totalPatterns = (
        contentPatterns.length +
        timePatterns.length +
        hashtagPatterns.length +
        platformPatterns.length +
        experimentPatterns.length
      );

      logger.info('Pattern detection complete', {
        content: contentPatterns.length,
        time: timePatterns.length,
        hashtag: hashtagPatterns.length,
        platform: platformPatterns.length,
        experiment: experimentPatterns.length,
        total: results.totalPatterns
      });

      return results;
    } catch (error) {
      logger.error('Error detecting patterns', { error: error.message, stack: error.stack });
      return results;
    }
  }

  /**
   * Detect patterns from recent post performance
   */
  async detectContentPatterns(days = 30) {
    const posts = await MarketingPost.find({
      publishedAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
      performanceMetrics: { $exists: true }
    }).lean();

    if (posts.length < 5) {
      logger.debug('Not enough posts for content pattern detection', { count: posts.length });
      return [];
    }

    const patterns = [];

    // Pattern 1: Content category performance
    const categoryPerformance = this.analyzeByCategory(posts);
    for (const [category, stats] of Object.entries(categoryPerformance)) {
      if (stats.count >= 5 && stats.avgEngagement > 0) {
        // Find top performing category
        const topCategories = Object.entries(categoryPerformance)
          .sort((a, b) => b[1].avgEngagement - a[1].avgEngagement);

        if (category === topCategories[0][0] && stats.avgEngagement > topCategories[1]?.[1].avgEngagement * 1.2) {
          patterns.push({
            pattern: `${category} content achieves ${Math.round(stats.avgEngagement * 10) / 10}% avg engagement (${stats.count} posts)`,
            category: 'content',
            confidence: Math.min(95, 50 + stats.count * 5),
            strength: Math.round(5 + Math.min(5, (stats.avgEngagement / 10))),
            evidence: [{
              type: 'metric_change',
              description: `${stats.count} ${category} posts analyzed with ${Math.round(stats.avgEngagement * 10) / 10}% avg engagement`,
              strength: Math.round(stats.avgEngagement / 2)
            }],
            patternType: 'preference'
          });
        }
      }
    }

    // Pattern 2: Video length performance (when we have duration data)
    const lengthPerformance = this.analyzeByVideoLength(posts);
    if (Object.keys(lengthPerformance).length > 0) {
      const bestLength = Object.entries(lengthPerformance)
        .sort((a, b) => b[1].avgEngagement - a[1].avgEngagement)[0];

      if (bestLength && bestLength[1].count >= 5) {
        const [lengthLabel, stats] = bestLength;
        patterns.push({
          pattern: `${lengthLabel} videos achieve ${Math.round(stats.avgEngagement * 10) / 10}% avg engagement`,
          category: 'format',
          confidence: Math.min(85, 50 + stats.count * 3),
          strength: Math.round(5 + Math.min(5, (stats.avgEngagement / 10))),
          evidence: [{
            type: 'metric_change',
            description: `${stats.count} ${lengthLabel} videos analyzed`,
            strength: Math.round(stats.avgEngagement / 2)
          }],
          patternType: 'optimal'
        });
      }
    }

    // Pattern 3: Caption length correlation
    const captionPerformance = this.analyzeByCaptionLength(posts);
    if (Object.keys(captionPerformance).length > 0) {
      const bestCaptionLength = Object.entries(captionPerformance)
        .sort((a, b) => b[1].avgEngagement - a[1].avgEngagement)[0];

      if (bestCaptionLength && bestCaptionLength[1].count >= 5) {
        const [lengthLabel, stats] = bestCaptionLength;
        patterns.push({
          pattern: `${lengthLabel} captions correlate with higher engagement (${Math.round(stats.avgEngagement * 10) / 10}% avg)`,
          category: 'copy',
          confidence: Math.min(80, 50 + stats.count * 3),
          strength: Math.round(4 + Math.min(4, (stats.avgEngagement / 15))),
          evidence: [{
            type: 'metric_change',
            description: `${stats.count} posts with ${lengthLabel} captions`,
            strength: Math.round(stats.avgEngagement / 3)
          }],
          patternType: 'correlation'
        });
      }
    }

    // Pattern 4: Hook/C patterns (if available in posts)
    const hookPerformance = this.analyzeByHookPresence(posts);
    if (hookPerformance.hasHooks > 0 && hookPerformance.noHooks > 0) {
      const hookAdvantage = (hookPerformance.withHooksAvg - hookPerformance.withoutHooksAvg) /
                            Math.max(hookPerformance.withoutHooksAvg, 0.1);

      if (hookAdvantage > 0.2 && hookPerformance.hasHooks >= 5) {
        patterns.push({
          pattern: `Posts with explicit hooks achieve ${Math.round(hookAdvantage * 100)}% higher engagement`,
          category: 'copy',
          confidence: Math.min(85, 50 + hookPerformance.hasHooks * 4),
          strength: Math.round(5 + Math.min(5, hookAdvantage * 10)),
          evidence: [{
            type: 'metric_change',
            description: `${hookPerformance.hasHooks} posts with hooks vs ${hookPerformance.noHooks} without`,
            strength: Math.round(hookAdvantage * 20)
          }],
          patternType: 'correlation'
        });
      }
    }

    // Pattern 5: CTA patterns
    const ctaPerformance = this.analyzeByCTA(posts);
    if (ctaPerformance.bestCTA && ctaPerformance.bestCTA.count >= 3) {
      patterns.push({
        pattern: `CTA "${ctaPerformance.bestCTA.cta.substring(0, 30)}" achieves ${Math.round(ctaPerformance.bestCTA.avgEngagement * 10) / 10}% avg engagement`,
        category: 'copy',
        confidence: Math.min(80, 50 + ctaPerformance.bestCTA.count * 5),
        strength: Math.round(5 + Math.min(5, (ctaPerformance.bestCTA.avgEngagement / 10))),
        evidence: [{
          type: 'metric_change',
          description: `${ctaPerformance.bestCTA.count} posts with this CTA`,
          strength: Math.round(ctaPerformance.bestCTA.avgEngagement / 2)
        }],
        patternType: 'optimal'
      });
    }

    logger.debug('Content patterns detected', { count: patterns.length });
    return patterns;
  }

  /**
   * Detect time-based patterns (best posting times)
   */
  async detectTimePatterns(days = 30) {
    const posts = await MarketingPost.find({
      publishedAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
      performanceMetrics: { $exists: true }
    }).lean();

    if (posts.length < 10) {
      logger.debug('Not enough posts for time pattern detection', { count: posts.length });
      return [];
    }

    const patterns = [];

    // Group by hour of day
    const hourlyPerformance = {};
    for (const post of posts) {
      if (post.publishedAt && post.performanceMetrics) {
        const hour = new Date(post.publishedAt).getHours();
        const engagement = post.performanceMetrics.engagementRate || 0;

        if (!hourlyPerformance[hour]) {
          hourlyPerformance[hour] = { count: 0, totalEngagement: 0, posts: [] };
        }
        hourlyPerformance[hour].count++;
        hourlyPerformance[hour].totalEngagement += engagement;
        hourlyPerformance[hour].posts.push(post._id);
      }
    }

    // Calculate averages and find best hours
    for (const hour in hourlyPerformance) {
      hourlyPerformance[hour].avgEngagement =
        hourlyPerformance[hour].totalEngagement / hourlyPerformance[hour].count;
    }

    // Find top performing hours
    const sortedHours = Object.entries(hourlyPerformance)
      .filter(([_, stats]) => stats.count >= 3)
      .sort((a, b) => b[1].avgEngagement - a[1].avgEngagement);

    if (sortedHours.length > 0) {
      const [bestHour, stats] = sortedHours[0];
      const hourNum = parseInt(bestHour);

      // Format hour as readable time
      const timeStr = this.formatHour(hourNum);

      // Only add pattern if significantly better than average
      const avgEngagement = Object.values(hourlyPerformance)
        .reduce((sum, s) => sum + s.avgEngagement, 0) / Object.values(hourlyPerformance).length;

      if (stats.avgEngagement > avgEngagement * 1.2) {
        patterns.push({
          pattern: `Posts at ${timeStr} achieve ${Math.round(stats.avgEngagement * 10) / 10}% avg engagement (${Math.round((stats.avgEngagement / avgEngagement - 1) * 100)}% above average)`,
          category: 'timing',
          confidence: Math.min(85, 50 + stats.count * 5),
          strength: Math.round(5 + Math.min(5, ((stats.avgEngagement / avgEngagement - 1) * 10))),
          evidence: [{
            type: 'metric_change',
            description: `${stats.count} posts at ${timeStr}`,
            strength: Math.round(stats.avgEngagement / 2)
          }],
          patternType: 'optimal'
        });
      }
    }

    // Group by day of week
    const dailyPerformance = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (const post of posts) {
      if (post.publishedAt && post.performanceMetrics) {
        const day = new Date(post.publishedAt).getDay();
        const engagement = post.performanceMetrics.engagementRate || 0;

        if (!dailyPerformance[day]) {
          dailyPerformance[day] = { count: 0, totalEngagement: 0 };
        }
        dailyPerformance[day].count++;
        dailyPerformance[day].totalEngagement += engagement;
      }
    }

    for (const day in dailyPerformance) {
      dailyPerformance[day].avgEngagement =
        dailyPerformance[day].totalEngagement / dailyPerformance[day].count;
    }

    const sortedDays = Object.entries(dailyPerformance)
      .filter(([_, stats]) => stats.count >= 3)
      .sort((a, b) => b[1].avgEngagement - a[1].avgEngagement);

    if (sortedDays.length > 0) {
      const [bestDay, stats] = sortedDays[0];
      const dayName = dayNames[parseInt(bestDay)];

      const avgEngagement = Object.values(dailyPerformance)
        .reduce((sum, s) => sum + s.avgEngagement, 0) / Object.values(dailyPerformance).length;

      if (stats.avgEngagement > avgEngagement * 1.15) {
        patterns.push({
          pattern: `Posts on ${dayName}s achieve ${Math.round(stats.avgEngagement * 10) / 10}% avg engagement`,
          category: 'timing',
          confidence: Math.min(85, 50 + stats.count * 5),
          strength: Math.round(5 + Math.min(5, ((stats.avgEngagement / avgEngagement - 1) * 10))),
          evidence: [{
            type: 'metric_change',
            description: `${stats.count} posts on ${dayName}s`,
            strength: Math.round(stats.avgEngagement / 2)
          }],
          patternType: 'optimal'
        });
      }
    }

    logger.debug('Time patterns detected', { count: patterns.length });
    return patterns;
  }

  /**
   * Detect hashtag patterns
   */
  async detectHashtagPatterns(days = 30) {
    const posts = await MarketingPost.find({
      publishedAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
      performanceMetrics: { $exists: true },
      hashtags: { $exists: true, $not: { $size: 0 } }
    }).lean();

    if (posts.length < 10) {
      logger.debug('Not enough posts for hashtag pattern detection', { count: posts.length });
      return [];
    }

    const patterns = [];

    // Analyze hashtag count correlation
    const hashtagCountPerformance = {};
    for (const post of posts) {
      const tagCount = post.hashtags?.length || 0;
      const engagement = post.performanceMetrics?.engagementRate || 0;

      // Bucket by count ranges
      let bucket;
      if (tagCount === 0) bucket = 'none';
      else if (tagCount <= 3) bucket = '1-3';
      else if (tagCount <= 5) bucket = '4-5';
      else if (tagCount <= 7) bucket = '6-7';
      else if (tagCount <= 10) bucket = '8-10';
      else bucket = '11+';

      if (!hashtagCountPerformance[bucket]) {
        hashtagCountPerformance[bucket] = { count: 0, totalEngagement: 0 };
      }
      hashtagCountPerformance[bucket].count++;
      hashtagCountPerformance[bucket].totalEngagement += engagement;
    }

    // Calculate averages
    for (const bucket in hashtagCountPerformance) {
      hashtagCountPerformance[bucket].avgEngagement =
        hashtagCountPerformance[bucket].totalEngagement / hashtagCountPerformance[bucket].count;
    }

    // Find optimal count
    const sortedBuckets = Object.entries(hashtagCountPerformance)
      .filter(([_, stats]) => stats.count >= 5)
      .sort((a, b) => b[1].avgEngagement - a[1].avgEngagement);

    if (sortedBuckets.length > 0) {
      const [bestBucket, stats] = sortedBuckets[0];
      const avgEngagement = Object.values(hashtagCountPerformance)
        .reduce((sum, s) => sum + s.avgEngagement, 0) / Object.values(hashtagCountPerformance).length;

      if (stats.avgEngagement > avgEngagement * 1.1) {
        patterns.push({
          pattern: `Posts with ${bestBucket} hashtags achieve ${Math.round(stats.avgEngagement * 10) / 10}% avg engagement`,
          category: 'hashtags',
          confidence: Math.min(80, 50 + stats.count * 3),
          strength: Math.round(5 + Math.min(5, ((stats.avgEngagement / avgEngagement - 1) * 10))),
          evidence: [{
            type: 'metric_change',
            description: `${stats.count} posts with ${bestBucket} hashtags`,
            strength: Math.round(stats.avgEngagement / 3)
          }],
          patternType: 'optimal'
        });
      }
    }

    // Analyze individual high-performing hashtags
    const hashtagPerformance = {};
    for (const post of posts) {
      const engagement = post.performanceMetrics?.engagementRate || 0;
      const hashtags = post.hashtags || [];

      for (const tag of hashtags) {
        const normalizedTag = tag.toLowerCase().trim();
        if (!hashtagPerformance[normalizedTag]) {
          hashtagPerformance[normalizedTag] = { count: 0, totalEngagement: 0, posts: [] };
        }
        hashtagPerformance[normalizedTag].count++;
        hashtagPerformance[normalizedTag].totalEngagement += engagement;
        hashtagPerformance[normalizedTag].posts.push(post._id);
      }
    }

    // Calculate averages for individual hashtags
    for (const tag in hashtagPerformance) {
      hashtagPerformance[tag].avgEngagement =
        hashtagPerformance[tag].totalEngagement / hashtagPerformance[tag].count;
    }

    // Find top individual hashtags
    const sortedTags = Object.entries(hashtagPerformance)
      .filter(([_, stats]) => stats.count >= 5)
      .sort((a, b) => b[1].avgEngagement - a[1].avgEngagement);

    // Add top 3 hashtags as patterns if they perform well
    for (let i = 0; i < Math.min(3, sortedTags.length); i++) {
      const [tag, stats] = sortedTags[i];
      const avgEngagement = Object.values(hashtagPerformance)
        .reduce((sum, s) => sum + s.avgEngagement, 0) / Object.values(hashtagPerformance).length;

      if (stats.avgEngagement > avgEngagement * 1.2) {
        patterns.push({
          pattern: `Hashtag #${tag} correlates with ${Math.round(stats.avgEngagement * 10) / 10}% avg engagement`,
          category: 'hashtags',
          confidence: Math.min(75, 50 + stats.count * 3),
          strength: Math.round(5 + Math.min(5, ((stats.avgEngagement / avgEngagement - 1) * 8))),
          evidence: [{
            type: 'metric_change',
            description: `Found in ${stats.count} posts`,
            strength: Math.round(stats.avgEngagement / 3)
          }],
          patternType: 'correlation',
          tags: [tag]
        });
      }
    }

    logger.debug('Hashtag patterns detected', { count: patterns.length });
    return patterns;
  }

  /**
   * Detect platform patterns
   */
  async detectPlatformPatterns(days = 30) {
    const posts = await MarketingPost.find({
      publishedAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
      performanceMetrics: { $exists: true }
    }).lean();

    if (posts.length < 10) {
      logger.debug('Not enough posts for platform pattern detection', { count: posts.length });
      return [];
    }

    const patterns = [];

    // Group by platform
    const platformPerformance = {};
    for (const post of posts) {
      const platform = post.platform || 'unknown';
      const engagement = post.performanceMetrics?.engagementRate || 0;

      if (!platformPerformance[platform]) {
        platformPerformance[platform] = { count: 0, totalEngagement: 0, totalViews: 0 };
      }
      platformPerformance[platform].count++;
      platformPerformance[platform].totalEngagement += engagement;
      platformPerformance[platform].totalViews += post.performanceMetrics?.views || 0;
    }

    // Calculate averages
    for (const platform in platformPerformance) {
      platformPerformance[platform].avgEngagement =
        platformPerformance[platform].totalEngagement / platformPerformance[platform].count;
      platformPerformance[platform].avgViews =
        platformPerformance[platform].totalViews / platformPerformance[platform].count;
    }

    // Find best performing platform
    const sortedPlatforms = Object.entries(platformPerformance)
      .filter(([_, stats]) => stats.count >= 5)
      .sort((a, b) => b[1].avgEngagement - a[1].avgEngagement);

    if (sortedPlatforms.length >= 2) {
      const [bestPlatform, bestStats] = sortedPlatforms[0];
      const [worstPlatform, worstStats] = sortedPlatforms[sortedPlatforms.length - 1];

      const engagementDiff = bestStats.avgEngagement - worstStats.avgEngagement;
      const relativeAdvantage = engagementDiff / Math.max(worstStats.avgEngagement, 0.1);

      if (relativeAdvantage > 0.2) {
        patterns.push({
          pattern: `${bestPlatform} achieves ${Math.round(bestStats.avgEngagement * 10) / 10}% avg engagement, ${Math.round(relativeAdvantage * 100)}% higher than ${worstPlatform}`,
          category: 'platform',
          confidence: Math.min(85, 50 + bestStats.count * 3),
          strength: Math.round(5 + Math.min(5, relativeAdvantage * 10)),
          evidence: [{
            type: 'metric_change',
            description: `${bestStats.count} ${bestPlatform} posts vs ${worstStats.count} ${worstPlatform} posts`,
            strength: Math.round(bestStats.avgEngagement / 2)
          }],
          patternType: 'preference'
        });
      }
    }

    // Check for platform-content type preferences
    const platformCategoryCombo = {};
    for (const post of posts) {
      const platform = post.platform || 'unknown';
      const category = post.storyCategory || 'general';
      const engagement = post.performanceMetrics?.engagementRate || 0;

      const key = `${platform}:${category}`;
      if (!platformCategoryCombo[key]) {
        platformCategoryCombo[key] = { count: 0, totalEngagement: 0 };
      }
      platformCategoryCombo[key].count++;
      platformCategoryCombo[key].totalEngagement += engagement;
    }

    for (const key in platformCategoryCombo) {
      platformCategoryCombo[key].avgEngagement =
        platformCategoryCombo[key].totalEngagement / platformCategoryCombo[key].count;
    }

    // Find best platform-category combinations
    const sortedCombos = Object.entries(platformCategoryCombo)
      .filter(([_, stats]) => stats.count >= 5)
      .sort((a, b) => b[1].avgEngagement - a[1].avgEngagement);

    if (sortedCombos.length > 0) {
      const [bestCombo, stats] = sortedCombos[0];
      const [platform, category] = bestCombo.split(':');

      // Calculate average for this platform across all categories
      const platformAvg = Object.entries(platformCategoryCombo)
        .filter(([key]) => key.startsWith(platform + ':'))
        .reduce((sum, [_, s]) => sum + s.avgEngagement, 0) /
        Object.entries(platformCategoryCombo).filter(([key]) => key.startsWith(platform + ':')).length;

      if (stats.avgEngagement > platformAvg * 1.2) {
        patterns.push({
          pattern: `${category} content on ${platform} performs ${Math.round(((stats.avgEngagement / platformAvg) - 1) * 100)}% above platform average`,
          category: 'content',
          confidence: Math.min(80, 50 + stats.count * 3),
          strength: Math.round(5 + Math.min(5, ((stats.avgEngagement / platformAvg - 1) * 10))),
          evidence: [{
            type: 'metric_change',
            description: `${stats.count} ${category} posts on ${platform}`,
            strength: Math.round(stats.avgEngagement / 2)
          }],
          patternType: 'correlation'
        });
      }
    }

    logger.debug('Platform patterns detected', { count: patterns.length });
    return patterns;
  }

  /**
   * Detect patterns from experiment results
   */
  async detectExperimentPatterns() {
    const experiments = await MarketingExperiment.find({
      status: 'completed',
      'results.0': { $exists: true }
    }).lean();

    if (experiments.length === 0) {
      logger.debug('No completed experiments for pattern detection');
      return [];
    }

    const patterns = [];

    for (const exp of experiments) {
      // Find significant results
      const significantResults = exp.results?.filter(r => r.isSignificant) || [];

      if (significantResults.length > 0) {
        for (const result of significantResults) {
          const confidence = result.confidence || 0;

          if (confidence > 70) {
            const lift = result.changePercent || 0;
            const category = this.inferCategory(exp);

            patterns.push({
              pattern: `Experiment "${exp.name}" found ${result.variantName} achieves ${Math.round(lift)}% lift in ${result.metric} with ${Math.round(confidence)}% confidence`,
              category,
              confidence: Math.min(95, Math.round(confidence)),
              strength: Math.min(10, Math.max(5, Math.round(5 + Math.abs(lift) / 10))),
              evidence: [{
                type: 'experiment',
                sourceId: exp.experimentId,
                description: `Lift: ${Math.round(lift)}%, Confidence: ${Math.round(confidence)}%`,
                strength: Math.round(confidence / 10)
              }],
              patternType: 'causation',
              supportingExperimentIds: [exp._id.toString()]
            });
          }
        }
      }

      // Also check for winning variant
      if (exp.winningVariant) {
        const winningResult = exp.results?.find(r => r.variantName === exp.winningVariant);
        if (winningResult && winningResult.confidence > 70) {
          const category = this.inferCategory(exp);
          const lift = winningResult.changePercent || 0;

          patterns.push({
            pattern: `${exp.winningVariant} outperformed in "${exp.name}" (${Math.round(lift)}% lift, ${Math.round(winningResult.confidence)}% confidence)`,
            category,
            confidence: Math.min(95, Math.round(winningResult.confidence)),
            strength: Math.min(10, Math.max(5, Math.round(5 + Math.abs(lift) / 10))),
            evidence: [{
              type: 'experiment',
              sourceId: exp.experimentId,
              description: `Winner: ${exp.winningVariant}, Lift: ${Math.round(lift)}%`,
              strength: Math.round(winningResult.confidence / 10)
            }],
            patternType: 'causation',
            supportingExperimentIds: [exp._id.toString()]
          });
        }
      }
    }

    logger.debug('Experiment patterns detected', { count: patterns.length });
    return patterns;
  }

  /**
   * Detect duplicate or contradictory patterns
   */
  async findDuplicatePatterns(newPattern) {
    const existing = await TinaLearning.find({
      isValid: true,
      category: newPattern.category
    }).lean();

    // Use simple text similarity
    const duplicates = existing.filter(l => {
      const similarity = this.calculateSimilarity(l.pattern, newPattern.pattern);
      return similarity > 0.7;
    });

    return duplicates;
  }

  /**
   * Calculate text similarity (simple Jaccard approach)
   */
  calculateSimilarity(str1, str2) {
    const words1 = new Set(str1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(str2.toLowerCase().split(/\s+/).filter(w => w.length > 2));

    if (words1.size === 0 && words2.size === 0) return 1;
    if (words1.size === 0 || words2.size === 0) return 0;

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Infer category from experiment
   */
  inferCategory(experiment) {
    if (experiment.platform && experiment.platform !== 'general') return 'platform';
    if (experiment.category && experiment.category !== 'general') return experiment.category;

    const hypothesis = experiment.hypothesis?.toLowerCase() || '';

    if (hypothesis.includes('hashtag') || hypothesis.includes('tag')) return 'hashtags';
    if (hypothesis.includes('timing') || hypothesis.includes('time') || hypothesis.includes('when')) return 'timing';
    if (hypothesis.includes('caption') || hypothesis.includes('copy') || hypothesis.includes('hook')) return 'copy';
    if (hypothesis.includes('video') || hypothesis.includes('format') || hypothesis.includes('length')) return 'format';
    if (hypothesis.includes('content') || hypothesis.includes('category') || hypothesis.includes('story')) return 'content';

    return 'general';
  }

  // Helper methods for analysis

  /**
   * Analyze performance by content category
   */
  analyzeByCategory(posts) {
    const byCategory = {};
    for (const post of posts) {
      const cat = post.storyCategory || 'general';
      const engagement = post.performanceMetrics?.engagementRate || 0;

      if (!byCategory[cat]) {
        byCategory[cat] = { count: 0, totalEngagement: 0 };
      }
      byCategory[cat].count++;
      byCategory[cat].totalEngagement += engagement;
    }
    for (const cat in byCategory) {
      byCategory[cat].avgEngagement = byCategory[cat].totalEngagement / byCategory[cat].count;
    }
    return byCategory;
  }

  /**
   * Analyze performance by video length
   */
  analyzeByVideoLength(posts) {
    const byLength = {};

    for (const post of posts) {
      // Try to get duration from metadata or post
      let duration = null;

      // Check generation metadata
      if (post.generationMetadata?.narrationLength) {
        // Estimate duration from character count (avg 150 chars per 30 sec)
        duration = post.generationMetadata.narrationLength / 5; // rough estimate
      }

      // If no duration, skip this post for length analysis
      if (!duration) continue;

      const engagement = post.performanceMetrics?.engagementRate || 0;

      // Bucket by duration ranges
      let bucket;
      if (duration < 100) bucket = 'short (<15s)';
      else if (duration < 200) bucket = 'medium (15-30s)';
      else if (duration < 400) bucket = 'long (30-60s)';
      else bucket = 'extended (>60s)';

      if (!byLength[bucket]) {
        byLength[bucket] = { count: 0, totalEngagement: 0 };
      }
      byLength[bucket].count++;
      byLength[bucket].totalEngagement += engagement;
    }

    for (const bucket in byLength) {
      byLength[bucket].avgEngagement = byLength[bucket].totalEngagement / byLength[bucket].count;
    }

    return byLength;
  }

  /**
   * Analyze performance by caption length
   */
  analyzeByCaptionLength(posts) {
    const byLength = {};

    for (const post of posts) {
      const captionLen = post.caption?.length || 0;
      const engagement = post.performanceMetrics?.engagementRate || 0;

      let bucket;
      if (captionLen === 0) bucket = 'none';
      else if (captionLen < 50) bucket = 'very-short';
      else if (captionLen < 100) bucket = 'short';
      else if (captionLen < 150) bucket = 'medium';
      else if (captionLen < 200) bucket = 'long';
      else bucket = 'very-long';

      if (!byLength[bucket]) {
        byLength[bucket] = { count: 0, totalEngagement: 0 };
      }
      byLength[bucket].count++;
      byLength[bucket].totalEngagement += engagement;
    }

    for (const bucket in byLength) {
      byLength[bucket].avgEngagement = byLength[bucket].totalEngagement / byLength[bucket].count;
    }

    return byLength;
  }

  /**
   * Analyze performance by hook presence
   */
  analyzeByHookPresence(posts) {
    let withHooks = 0;
    let withoutHooks = 0;
    let withHooksTotal = 0;
    let withoutHooksTotal = 0;

    for (const post of posts) {
      const engagement = post.performanceMetrics?.engagementRate || 0;
      const hasHook = post.hook && post.hook.length > 0;

      if (hasHook) {
        withHooks++;
        withHooksTotal += engagement;
      } else {
        withoutHooks++;
        withoutHooksTotal += engagement;
      }
    }

    return {
      hasHooks: withHooks,
      noHooks: withoutHooks,
      withHooksAvg: withHooks > 0 ? withHooksTotal / withHooks : 0,
      withoutHooksAvg: withoutHooks > 0 ? withoutHooksTotal / withoutHooks : 0
    };
  }

  /**
   * Analyze performance by CTA type
   */
  analyzeByCTA(posts) {
    const byCTA = {};

    for (const post of posts) {
      const cta = post.cta || 'Read more on Blush 🔥';
      const engagement = post.performanceMetrics?.engagementRate || 0;

      if (!byCTA[cta]) {
        byCTA[cta] = { count: 0, totalEngagement: 0, cta };
      }
      byCTA[cta].count++;
      byCTA[cta].totalEngagement += engagement;
    }

    // Find best performing CTA
    let bestCTA = null;
    let bestAvg = 0;

    for (const cta in byCTA) {
      byCTA[cta].avgEngagement = byCTA[cta].totalEngagement / byCTA[cta].count;
      if (byCTA[cta].avgEngagement > bestAvg && byCTA[cta].count >= 3) {
        bestAvg = byCTA[cta].avgEngagement;
        bestCTA = byCTA[cta];
      }
    }

    return { bestCTA };
  }

  /**
   * Format hour as readable time
   */
  formatHour(hour) {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  }
}

export default new TinaPatternDetection();
