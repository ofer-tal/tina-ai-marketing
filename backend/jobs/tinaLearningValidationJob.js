import TinaLearning from '../models/TinaLearning.js';
import MarketingPost from '../models/MarketingPost.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('jobs', 'tina-learning-validation');

/**
 * Validate learnings that need review
 *
 * Re-tests existing learnings with recent data to confirm they still hold true.
 * Marks learnings as validated (confidence increases) or invalid (if no longer true).
 */
export async function validateLearnings() {
  // Get learnings that need review
  const learningsToReview = await TinaLearning.getNeedingReview();

  if (learningsToReview.length === 0) {
    logger.info('No learnings needing review');
    return {
      reviewed: 0,
      validated: 0,
      invalidated: 0,
      errors: 0
    };
  }

  logger.info('Starting learning validation', { count: learningsToReview.length });

  const results = {
    reviewed: 0,
    validated: 0,
    invalidated: 0,
    errors: 0,
    details: []
  };

  for (const learning of learningsToReview) {
    try {
      // Test if pattern still holds with recent data
      const stillValid = await testLearning(learning);

      if (stillValid.valid) {
        await learning.markValidated(stillValid.evidence);
        results.validated++;
        results.details.push({
          learningId: learning.learningId,
          action: 'validated',
          newConfidence: learning.confidence
        });
        logger.info('Learning validated', {
          learningId: learning.learningId,
          newConfidence: learning.confidence
        });
      } else {
        await learning.invalidate(stillValid.reason);
        results.invalidated++;
        results.details.push({
          learningId: learning.learningId,
          action: 'invalidated',
          reason: stillValid.reason
        });
        logger.info('Learning invalidated', {
          learningId: learning.learningId,
          reason: stillValid.reason
        });
      }

      results.reviewed++;
    } catch (error) {
      logger.error('Error validating learning', {
        learningId: learning.learningId,
        error: error.message,
        stack: error.stack
      });
      results.errors++;
    }
  }

  logger.info('Learning validation complete', results);

  return results;
}

/**
 * Test if a learning still holds true with recent data
 */
async function testLearning(learning) {
  // Test the pattern against recent data (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get recent posts to test against
  const recentPosts = await MarketingPost.find({
    publishedAt: { $gte: thirtyDaysAgo },
    performanceMetrics: { $exists: true }
  }).lean();

  if (recentPosts.length === 0) {
    return { valid: true, evidence: null }; // Can't test, assume valid
  }

  // Test based on learning category
  switch (learning.category) {
    case 'content':
      return await testContentPattern(learning, recentPosts);
    case 'timing':
      return await testTimePattern(learning, recentPosts);
    case 'hashtags':
      return await testHashtagPattern(learning, recentPosts);
    case 'format':
      return await testFormatPattern(learning, recentPosts);
    case 'platform':
      return await testPlatformPattern(learning, recentPosts);
    case 'copy':
      return await testCopyPattern(learning, recentPosts);
    default:
      return { valid: true, evidence: null };
  }
}

/**
 * Test content-related patterns
 */
async function testContentPattern(learning, posts) {
  const pattern = learning.pattern.toLowerCase();

  // Extract category from pattern
  // Pattern format: "X content achieves Y% avg engagement"
  const categoryMatch = pattern.match(/(\w+)\s+content\s+achieves\s+(\d+)%?\s*avg\s+engagement/i);

  if (categoryMatch) {
    const category = categoryMatch[1];
    const expectedEngagement = parseFloat(categoryMatch[2]);

    const categoryPosts = posts.filter(p => {
      const postCategory = (p.storyCategory || 'general').toLowerCase();
      return postCategory === category.toLowerCase();
    });

    if (categoryPosts.length < 5) {
      return { valid: true, evidence: null }; // Not enough data
    }

    const avgEngagement = categoryPosts.reduce((sum, p) =>
      sum + (p.performanceMetrics?.engagementRate || 0), 0
    ) / categoryPosts.length;

    const tolerance = expectedEngagement * 0.25; // 25% tolerance
    const isValid = Math.abs(avgEngagement - expectedEngagement) <= tolerance;

    return {
      valid: isValid,
      evidence: {
        type: 'metric_change',
        description: `${categoryPosts.length} recent posts avg ${Math.round(avgEngagement * 10) / 10}% engagement vs expected ${expectedEngagement}%`,
        strength: Math.round(avgEngagement / 2)
      },
      reason: isValid ? null : `Recent avg (${Math.round(avgEngagement * 10) / 10}%) differs from expected (${expectedEngagement}%)`
    };
  }

  // Check for platform-content combos
  // Pattern format: "X content on Y achieves Z% avg engagement"
  const platformContentMatch = pattern.match(/(\w+)\s+content\s+on\s+(\w+)\s+achieves\s+(\d+)%?\s*avg\s+engagement/i);

  if (platformContentMatch) {
    const category = platformContentMatch[1];
    const platform = platformContentMatch[2].toLowerCase();
    const expectedEngagement = parseFloat(platformContentMatch[3]);

    const filteredPosts = posts.filter(p => {
      const postCategory = (p.storyCategory || '').toLowerCase();
      const postPlatform = (p.platform || '').toLowerCase();
      return postCategory === category.toLowerCase() && postPlatform === platform;
    });

    if (filteredPosts.length < 3) {
      return { valid: true, evidence: null };
    }

    const avgEngagement = filteredPosts.reduce((sum, p) =>
      sum + (p.performanceMetrics?.engagementRate || 0), 0
    ) / filteredPosts.length;

    const tolerance = expectedEngagement * 0.3; // 30% tolerance for combos
    const isValid = Math.abs(avgEngagement - expectedEngagement) <= tolerance;

    return {
      valid: isValid,
      evidence: {
        type: 'metric_change',
        description: `${filteredPosts.length} recent ${category} posts on ${platform} avg ${Math.round(avgEngagement * 10) / 10}% engagement`,
        strength: Math.round(avgEngagement / 2)
      },
      reason: isValid ? null : `Recent avg (${Math.round(avgEngagement * 10) / 10}%) differs from expected (${expectedEngagement}%)`
    };
  }

  return { valid: true, evidence: null };
}

/**
 * Test timing-related patterns
 */
async function testTimePattern(learning, posts) {
  const pattern = learning.pattern.toLowerCase();

  // Pattern: "Posts at X AM/PM achieve Y% avg engagement"
  const hourMatch = pattern.match(/posts\s+at\s+(\d+)\s*(am|pm)?\s+achieve\s+(\d+)%?\s*avg\s+engagement/i);

  if (hourMatch) {
    let hour = parseInt(hourMatch[1]);
    const ampm = hourMatch[2]?.toLowerCase();

    if (ampm === 'pm' && hour !== 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;

    const expectedEngagement = parseFloat(hourMatch[3]);

    const hourPosts = posts.filter(p => {
      const postHour = new Date(p.publishedAt).getHours();
      return postHour === hour;
    });

    if (hourPosts.length < 3) {
      return { valid: true, evidence: null };
    }

    const avgEngagement = hourPosts.reduce((sum, p) =>
      sum + (p.performanceMetrics?.engagementRate || 0), 0
    ) / hourPosts.length;

    const tolerance = expectedEngagement * 0.3; // 30% tolerance
    const isValid = Math.abs(avgEngagement - expectedEngagement) <= tolerance;

    return {
      valid: isValid,
      evidence: {
        type: 'metric_change',
        description: `${hourPosts.length} recent posts at ${hour}:00 avg ${Math.round(avgEngagement * 10) / 10}% engagement`,
        strength: Math.round(avgEngagement / 2)
      },
      reason: isValid ? null : `Recent avg (${Math.round(avgEngagement * 10) / 10}%) differs from expected (${expectedEngagement}%)`
    };
  }

  // Pattern: "Posts on Xdays achieve Y% avg engagement"
  const dayMatch = pattern.match(/posts\s+on\s+(\w+)s?\s+achieve\s+(\d+)%?\s*avg\s+engagement/i);

  if (dayMatch) {
    const dayName = dayMatch[1].toLowerCase();
    const expectedEngagement = parseFloat(dayMatch[2]);

    const dayMap = {
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    };

    const targetDay = dayMap[dayName];
    if (targetDay === undefined) {
      return { valid: true, evidence: null };
    }

    const dayPosts = posts.filter(p => {
      const postDay = new Date(p.publishedAt).getDay();
      return postDay === targetDay;
    });

    if (dayPosts.length < 3) {
      return { valid: true, evidence: null };
    }

    const avgEngagement = dayPosts.reduce((sum, p) =>
      sum + (p.performanceMetrics?.engagementRate || 0), 0
    ) / dayPosts.length;

    const tolerance = expectedEngagement * 0.3;
    const isValid = Math.abs(avgEngagement - expectedEngagement) <= tolerance;

    return {
      valid: isValid,
      evidence: {
        type: 'metric_change',
        description: `${dayPosts.length} recent posts on ${dayName}s avg ${Math.round(avgEngagement * 10) / 10}% engagement`,
        strength: Math.round(avgEngagement / 2)
      },
      reason: isValid ? null : `Recent avg (${Math.round(avgEngagement * 10) / 10}%) differs from expected (${expectedEngagement}%)`
    };
  }

  return { valid: true, evidence: null };
}

/**
 * Test hashtag-related patterns
 */
async function testHashtagPattern(learning, posts) {
  const pattern = learning.pattern.toLowerCase();

  // Pattern: "Posts with X-Y hashtags achieve Z% avg engagement"
  const countMatch = pattern.match(/posts\s+with\s+(\d+)-?(\d+)?\s+hashtags\s+achieve\s+(\d+)%?\s*avg\s+engagement/i);

  if (countMatch) {
    const minCount = parseInt(countMatch[1]);
    const maxCount = countMatch[2] ? parseInt(countMatch[2]) : minCount;
    const expectedEngagement = parseFloat(countMatch[3]);

    const filteredPosts = posts.filter(p => {
      const tagCount = p.hashtags?.length || 0;
      return tagCount >= minCount && tagCount <= maxCount;
    });

    if (filteredPosts.length < 5) {
      return { valid: true, evidence: null };
    }

    const avgEngagement = filteredPosts.reduce((sum, p) =>
      sum + (p.performanceMetrics?.engagementRate || 0), 0
    ) / filteredPosts.length;

    const tolerance = expectedEngagement * 0.25;
    const isValid = Math.abs(avgEngagement - expectedEngagement) <= tolerance;

    return {
      valid: isValid,
      evidence: {
        type: 'metric_change',
        description: `${filteredPosts.length} recent posts with ${minCount}-${maxCount} hashtags avg ${Math.round(avgEngagement * 10) / 10}% engagement`,
        strength: Math.round(avgEngagement / 2)
      },
      reason: isValid ? null : `Recent avg (${Math.round(avgEngagement * 10) / 10}%) differs from expected (${expectedEngagement}%)`
    };
  }

  // Pattern: "Hashtag #X correlates with Y% avg engagement"
  const tagMatch = pattern.match(/hashtag\s+#(\w+)\s+correlates\s+with\s+(\d+)%?\s*avg\s+engagement/i);

  if (tagMatch) {
    const tag = tagMatch[1].toLowerCase();
    const expectedEngagement = parseFloat(tagMatch[2]);

    const postsWithTag = posts.filter(p => {
      return p.hashtags?.some(h => h.toLowerCase().includes(tag));
    });

    if (postsWithTag.length < 3) {
      return { valid: true, evidence: null };
    }

    const avgEngagement = postsWithTag.reduce((sum, p) =>
      sum + (p.performanceMetrics?.engagementRate || 0), 0
    ) / postsWithTag.length;

    const tolerance = expectedEngagement * 0.35; // Higher tolerance for individual tags
    const isValid = Math.abs(avgEngagement - expectedEngagement) <= tolerance;

    return {
      valid: isValid,
      evidence: {
        type: 'metric_change',
        description: `${postsWithTag.length} recent posts with #${tag} avg ${Math.round(avgEngagement * 10) / 10}% engagement`,
        strength: Math.round(avgEngagement / 2)
      },
      reason: isValid ? null : `Recent avg (${Math.round(avgEngagement * 10) / 10}%) differs from expected (${expectedEngagement}%)`
    };
  }

  return { valid: true, evidence: null };
}

/**
 * Test format-related patterns
 */
async function testFormatPattern(learning, posts) {
  const pattern = learning.pattern.toLowerCase();

  // Pattern: "X videos achieve Y% avg engagement"
  const lengthMatch = pattern.match(/(\w+(?:\s+\w+)?)\s+videos?\s+achieve\s+(\d+)%?\s*avg\s+engagement/i);

  if (lengthMatch) {
    const lengthLabel = lengthMatch[1].toLowerCase();
    const expectedEngagement = parseFloat(lengthMatch[2]);

    // Try to match length labels to actual video durations
    let minDuration = 0;
    let maxDuration = Infinity;

    if (lengthLabel.includes('short') || lengthLabel.includes('<15')) {
      maxDuration = 15;
    } else if (lengthLabel.includes('medium') || lengthLabel.includes('15-30')) {
      minDuration = 15;
      maxDuration = 30;
    } else if (lengthLabel.includes('long') || lengthLabel.includes('30-60')) {
      minDuration = 30;
      maxDuration = 60;
    } else if (lengthLabel.includes('extended') || lengthLabel.includes('>60')) {
      minDuration = 60;
    }

    // For now, skip format validation if we can't determine duration
    // In production, we'd need actual video duration data
    return { valid: true, evidence: null };
  }

  return { valid: true, evidence: null };
}

/**
 * Test platform-related patterns
 */
async function testPlatformPattern(learning, posts) {
  const pattern = learning.pattern.toLowerCase();

  // Pattern: "X achieves Y% avg engagement, Z% higher than W"
  const platformMatch = pattern.match(/^(\w+)\s+achieves\s+(\d+)%?\s*avg\s+engagement/i);

  if (platformMatch) {
    const platform = platformMatch[1].toLowerCase();
    const expectedEngagement = parseFloat(platformMatch[2]);

    const platformPosts = posts.filter(p => {
      return (p.platform || '').toLowerCase() === platform;
    });

    if (platformPosts.length < 5) {
      return { valid: true, evidence: null };
    }

    const avgEngagement = platformPosts.reduce((sum, p) =>
      sum + (p.performanceMetrics?.engagementRate || 0), 0
    ) / platformPosts.length;

    const tolerance = expectedEngagement * 0.25;
    const isValid = Math.abs(avgEngagement - expectedEngagement) <= tolerance;

    return {
      valid: isValid,
      evidence: {
        type: 'metric_change',
        description: `${platformPosts.length} recent ${platform} posts avg ${Math.round(avgEngagement * 10) / 10}% engagement`,
        strength: Math.round(avgEngagement / 2)
      },
      reason: isValid ? null : `Recent avg (${Math.round(avgEngagement * 10) / 10}%) differs from expected (${expectedEngagement}%)`
    };
  }

  return { valid: true, evidence: null };
}

/**
 * Test copy-related patterns
 */
async function testCopyPattern(learning, posts) {
  const pattern = learning.pattern.toLowerCase();

  // Pattern: "Posts with explicit hooks achieve X% higher engagement"
  if (pattern.includes('hooks') && pattern.includes('higher engagement')) {
    const match = pattern.match(/achieve\s+(\d+)%\s+higher\s+engagement/i);
    const expectedImprovement = match ? parseFloat(match[1]) : 20;

    const withHooks = posts.filter(p => p.hook && p.hook.length > 0);
    const withoutHooks = posts.filter(p => !p.hook || p.hook.length === 0);

    if (withHooks.length < 3 || withoutHooks.length < 3) {
      return { valid: true, evidence: null };
    }

    const withHooksAvg = withHooks.reduce((sum, p) =>
      sum + (p.performanceMetrics?.engagementRate || 0), 0
    ) / withHooks.length;

    const withoutHooksAvg = withoutHooks.reduce((sum, p) =>
      sum + (p.performanceMetrics?.engagementRate || 0), 0
    ) / withoutHooks.length;

    const actualImprovement = withoutHooksAvg > 0
      ? ((withHooksAvg - withoutHooksAvg) / withoutHooksAvg) * 100
      : 0;

    const tolerance = expectedImprovement * 0.4; // 40% tolerance
    const isValid = Math.abs(actualImprovement - expectedImprovement) <= tolerance;

    return {
      valid: isValid,
      evidence: {
        type: 'metric_change',
        description: `${withHooks.length} posts with hooks avg ${Math.round(withHooksAvg * 10) / 10}% vs ${withoutHooks.length} without at ${Math.round(withoutHooksAvg * 10) / 10}%`,
        strength: Math.round(withHooksAvg / 2)
      },
      reason: isValid ? null : `Recent improvement (${Math.round(actualImprovement)}%) differs from expected (${expectedImprovement}%)`
    };
  }

  // Pattern: "X captions correlate with higher engagement"
  if (pattern.includes('captions') && pattern.includes('correlate')) {
    const match = pattern.match(/(\w+(?:-\w+)*)\s+captions/i);

    if (match) {
      const lengthLabel = match[1].toLowerCase();

      // Determine caption length range
      let minLength = 0;
      let maxLength = Infinity;

      if (lengthLabel.includes('very-short') || lengthLabel === 'very-short') {
        maxLength = 50;
      } else if (lengthLabel.includes('short')) {
        minLength = 50;
        maxLength = 100;
      } else if (lengthLabel.includes('medium')) {
        minLength = 100;
        maxLength = 150;
      } else if (lengthLabel.includes('long')) {
        minLength = 150;
        maxLength = 200;
      } else if (lengthLabel.includes('very-long')) {
        minLength = 200;
      }

      const filteredPosts = posts.filter(p => {
        const len = p.caption?.length || 0;
        return len >= minLength && len < maxLength;
      });

      if (filteredPosts.length < 5) {
        return { valid: true, evidence: null };
      }

      const avgEngagement = filteredPosts.reduce((sum, p) =>
        sum + (p.performanceMetrics?.engagementRate || 0), 0
      ) / filteredPosts.length;

      // Compare with overall average
      const overallAvg = posts.reduce((sum, p) =>
        sum + (p.performanceMetrics?.engagementRate || 0), 0
      ) / posts.length;

      // Should be above average
      const isValid = avgEngagement >= overallAvg * 0.95;

      return {
        valid: isValid,
        evidence: {
          type: 'metric_change',
          description: `${filteredPosts.length} posts with ${lengthLabel} captions avg ${Math.round(avgEngagement * 10) / 10}% engagement`,
          strength: Math.round(avgEngagement / 2)
        },
        reason: isValid ? null : `${lengthLabel} captions no longer show above-average engagement`
      };
    }
  }

  return { valid: true, evidence: null };
}

export default { validateLearnings };
