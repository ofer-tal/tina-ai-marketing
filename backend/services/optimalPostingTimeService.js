import MarketingPost from '../models/MarketingPost.js';

/**
 * Optimal Posting Time Service
 * Analyzes post performance data to identify best posting times
 */

class OptimalPostingTimeService {
  constructor() {
    this.timezone = 'UTC'; // Default timezone
  }

  /**
   * Set timezone for analysis
   * @param {string} timezone - IANA timezone (e.g., 'America/New_York')
   */
  setTimezone(timezone) {
    this.timezone = timezone;
  }

  /**
   * Step 1: Aggregate engagement by posting hour
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} Hourly engagement data
   */
  async aggregateEngagementByHour(options = {}) {
    const {
      platform = null,         // Filter by platform
      days = 30,              // Number of days to analyze
      minPosts = 3            // Minimum posts per hour to be reliable
    } = options;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build query
    const query = {
      status: 'posted',
      postedAt: { $gte: startDate },
      'performanceMetrics.views': { $gt: 0 }
    };

    if (platform) {
      query.platform = platform;
    }

    // Fetch posted posts with performance metrics
    const posts = await MarketingPost.find(query)
      .select('platform postedAt performanceMetrics')
      .lean();

    if (posts.length === 0) {
      return [];
    }

    // Aggregate by hour (0-23)
    const hourlyData = {};

    for (const post of posts) {
      const postedAt = new Date(post.postedAt);
      const hour = postedAt.getUTCHours(); // Hour in UTC (0-23)
      const metrics = post.performanceMetrics || {};

      // Calculate engagement score (weighted)
      const engagementScore = this._calculateEngagementScore(metrics);

      if (!hourlyData[hour]) {
        hourlyData[hour] = {
          hour,
          postCount: 0,
          totalViews: 0,
          totalLikes: 0,
          totalComments: 0,
          totalShares: 0,
          totalEngagementRate: 0,
          totalEngagementScore: 0,
          platforms: {}
        };
      }

      const hourData = hourlyData[hour];
      hourData.postCount++;
      hourData.totalViews += metrics.views || 0;
      hourData.totalLikes += metrics.likes || 0;
      hourData.totalComments += metrics.comments || 0;
      hourData.totalShares += metrics.shares || 0;
      hourData.totalEngagementRate += metrics.engagementRate || 0;
      hourData.totalEngagementScore += engagementScore;

      // Track by platform
      if (!hourData.platforms[post.platform]) {
        hourData.platforms[post.platform] = {
          postCount: 0,
          totalEngagementScore: 0
        };
      }
      hourData.platforms[post.platform].postCount++;
      hourData.platforms[post.platform].totalEngagementScore += engagementScore;
    }

    // Convert to array and calculate averages
    const result = Object.values(hourlyData)
      .filter(hour => hour.postCount >= minPosts)
      .map(hour => ({
        hour: hour.hour,
        postCount: hour.postCount,
        avgViews: Math.round(hour.totalViews / hour.postCount),
        avgLikes: Math.round(hour.totalLikes / hour.postCount),
        avgComments: Math.round(hour.totalComments / hour.postCount),
        avgShares: Math.round(hour.totalShares / hour.postCount),
        avgEngagementRate: parseFloat((hour.totalEngagementRate / hour.postCount).toFixed(2)),
        avgEngagementScore: parseFloat((hour.totalEngagementScore / hour.postCount).toFixed(2)),
        platforms: Object.entries(hour.platforms).map(([platform, data]) => ({
          platform,
          postCount: data.postCount,
          avgEngagementScore: parseFloat((data.totalEngagementScore / data.postCount).toFixed(2))
        }))
      }))
      .sort((a, b) => a.hour - b.hour);

    return result;
  }

  /**
   * Step 2: Calculate average engagement per hour
   * @param {Array} hourlyData - Data from aggregateEngagementByHour
   * @returns {Object} Average engagement metrics
   */
  calculateAverageEngagement(hourlyData) {
    if (!hourlyData || hourlyData.length === 0) {
      return {
        overall: null,
        byHour: []
      };
    }

    // Calculate overall averages
    const totalPosts = hourlyData.reduce((sum, hour) => sum + hour.postCount, 0);
    const totalViews = hourlyData.reduce((sum, hour) => sum + (hour.avgViews * hour.postCount), 0);
    const totalLikes = hourlyData.reduce((sum, hour) => sum + (hour.avgLikes * hour.postCount), 0);
    const totalComments = hourlyData.reduce((sum, hour) => sum + (hour.avgComments * hour.postCount), 0);
    const totalShares = hourlyData.reduce((sum, hour) => sum + (hour.avgShares * hour.postCount), 0);
    const totalEngagementRate = hourlyData.reduce((sum, hour) => sum + (hour.avgEngagementRate * hour.postCount), 0);
    const totalEngagementScore = hourlyData.reduce((sum, hour) => sum + (hour.avgEngagementScore * hour.postCount), 0);

    const overall = {
      totalPosts,
      avgViews: Math.round(totalViews / totalPosts),
      avgLikes: Math.round(totalLikes / totalPosts),
      avgComments: Math.round(totalComments / totalPosts),
      avgShares: Math.round(totalShares / totalPosts),
      avgEngagementRate: parseFloat((totalEngagementRate / totalPosts).toFixed(2)),
      avgEngagementScore: parseFloat((totalEngagementScore / totalPosts).toFixed(2))
    };

    // Add normalized scores (0-100) for each hour
    const byHour = hourlyData.map(hour => {
      const normalizedScore = this._normalizeScore(hour.avgEngagementScore, overall.avgEngagementScore);
      return {
        ...hour,
        normalizedScore,
        isAboveAverage: hour.avgEngagementScore > overall.avgEngagementScore
      };
    });

    return {
      overall,
      byHour
    };
  }

  /**
   * Step 3: Identify peak times
   * @param {Array} hourlyData - Data from calculateAverageEngagement
   * @param {number} topCount - Number of peak times to return
   * @returns {Object} Peak time analysis
   */
  identifyPeakTimes(hourlyData, topCount = 5) {
    if (!hourlyData || hourlyData.length === 0) {
      return {
        peakTimes: [],
        worstTimes: [],
        analysis: null
      };
    }

    // Sort by engagement score
    const sortedByScore = [...hourlyData].sort((a, b) => b.avgEngagementScore - a.avgEngagementScore);

    // Get peak times
    const peakTimes = sortedByScore.slice(0, topCount).map(hour => ({
      hour: hour.hour,
      hourFormatted: this._formatHour(hour.hour),
      avgEngagementScore: hour.avgEngagementScore,
      avgEngagementRate: hour.avgEngagementRate,
      postCount: hour.postCount,
      normalizedScore: hour.normalizedScore
    }));

    // Get worst times
    const worstTimes = sortedByScore.slice(-topCount).reverse().map(hour => ({
      hour: hour.hour,
      hourFormatted: this._formatHour(hour.hour),
      avgEngagementScore: hour.avgEngagementScore,
      avgEngagementRate: hour.avgEngagementRate,
      postCount: hour.postCount,
      normalizedScore: hour.normalizedScore
    }));

    // Calculate time ranges
    const analysis = this._analyzeTimeRanges(hourlyData);

    // Calculate average for comparison
    const avgScore = hourlyData.reduce((sum, h) => sum + h.avgEngagementScore, 0) / hourlyData.length;

    return {
      peakTimes,
      worstTimes,
      analysis: {
        bestHour: peakTimes[0],
        worstHour: worstTimes[0],
        bestHourVsAverage: peakTimes[0] ? ((peakTimes[0].avgEngagementScore / avgScore - 1) * 100).toFixed(1) + '%' : null,
        worstHourVsAverage: worstTimes[0] ? ((worstTimes[0].avgEngagementScore / avgScore - 1) * 100).toFixed(1) + '%' : null,
        ...analysis
      }
    };
  }

  /**
   * Step 4: Factor in timezone
   * @param {Array} peakTimes - Peak times from identifyPeakTimes
   * @param {string} targetTimezone - Target timezone
   * @returns {Array} Peak times in target timezone
   */
  adjustForTimezone(peakTimes, targetTimezone = 'America/New_York') {
    if (!peakTimes || peakTimes.length === 0) {
      return [];
    }

    return peakTimes.map(peak => {
      const utcHour = peak.hour;
      const localHour = this._convertUTCHourToLocal(utcHour, targetTimezone);

      return {
        ...peak,
        localHour,
        localHourFormatted: this._formatHour(localHour),
        timezone: targetTimezone,
        utcHourFormatted: this._formatHour(utcHour)
      };
    });
  }

  /**
   * Step 5: Recommend optimal schedule
   * @param {Object} peakTimeData - Data from identifyPeakTimes
   * @param {Object} options - Scheduling options
   * @returns {Object} Optimal schedule recommendations
   */
  recommendOptimalSchedule(peakTimeData, options = {}) {
    const {
      postsPerDay = 3,           // Number of posts to schedule per day
      minIntervalHours = 4,      // Minimum hours between posts
      platforms = ['tiktok', 'instagram', 'youtube_shorts'],
      targetTimezone = 'America/New_York'
    } = options;

    if (!peakTimeData || !peakTimeData.peakTimes || peakTimeData.peakTimes.length === 0) {
      return {
        schedule: [],
        recommendations: [],
        reasoning: 'Insufficient data to generate schedule recommendations'
      };
    }

    // Get peak times adjusted for target timezone
    const peakTimesLocal = this.adjustForTimezone(peakTimeData.peakTimes, targetTimezone);

    // Select best times (respecting minimum interval)
    const selectedTimes = this._selectOptimalTimes(peakTimesLocal, postsPerDay, minIntervalHours);

    // Generate schedule for each platform
    const schedule = platforms.map(platform => ({
      platform,
      postingTimes: selectedTimes.map(time => ({
        hour: time.localHour,
        hourFormatted: time.localHourFormatted,
        dayOfWeek: 'all', // Can be refined based on day-of-week analysis
        priority: time.priority,
        expectedEngagement: time.expectedEngagement,
        confidence: this._calculateConfidence(time)
      }))
    }));

    // Generate recommendations
    const recommendations = this._generateRecommendations(peakTimeData, selectedTimes, targetTimezone);

    return {
      schedule,
      recommendations,
      timezone: targetTimezone,
      totalPostsPerDay: postsPerDay,
      reasoning: this._generateScheduleReasoning(peakTimeData, selectedTimes, targetTimezone)
    };
  }

  /**
   * Get comprehensive posting time analysis
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Complete analysis
   */
  async getCompleteAnalysis(options = {}) {
    const {
      platform = null,
      days = 30,
      timezone = 'America/New_York',
      postsPerDay = 3,
      minIntervalHours = 4
    } = options;

    // Step 1: Aggregate engagement by hour
    const hourlyData = await this.aggregateEngagementByHour({ platform, days });

    if (hourlyData.length === 0) {
      return {
        error: 'No post data available for analysis',
        suggestions: ['Post more content to gather performance data', 'Wait at least 7 days after first posts']
      };
    }

    // Step 2: Calculate average engagement
    const averageEngagement = this.calculateAverageEngagement(hourlyData);

    // Step 3: Identify peak times
    const peakTimeData = this.identifyPeakTimes(averageEngagement.byHour, 5);
    peakTimeData.overall = averageEngagement.overall;

    // Step 4: Adjust for timezone
    const peakTimesLocal = this.adjustForTimezone(peakTimeData.peakTimes, timezone);
    const worstTimesLocal = this.adjustForTimezone(peakTimeData.worstTimes, timezone);

    // Step 5: Recommend optimal schedule
    const schedule = this.recommendOptimalSchedule(peakTimeData, {
      postsPerDay,
      minIntervalHours,
      platforms: platform ? [platform] : ['tiktok', 'instagram', 'youtube_shorts'],
      targetTimezone: timezone
    });

    return {
      summary: {
        totalPostsAnalyzed: averageEngagement.overall.totalPosts,
        dateRange: `${days} days`,
        timezone,
        platform: platform || 'all platforms'
      },
      hourlyData: averageEngagement.byHour,
      overallAverages: averageEngagement.overall,
      peakTimes: peakTimesLocal,
      worstTimes: worstTimesLocal,
      schedule,
      analysis: peakTimeData.analysis
    };
  }

  // ===== Helper Methods =====

  /**
   * Calculate engagement score (weighted)
   */
  _calculateEngagementScore(metrics) {
    const views = metrics.views || 0;
    const likes = metrics.likes || 0;
    const comments = metrics.comments || 0;
    const shares = metrics.shares || 0;

    if (views === 0) return 0;

    // Weighted engagement score
    // Likes: 1x, Comments: 5x, Shares: 3x (comments and shares are more valuable)
    const engagementScore = ((likes * 1) + (comments * 5) + (shares * 3)) / views * 100;

    return parseFloat(engagementScore.toFixed(2));
  }

  /**
   * Normalize score to 0-100 range
   */
  _normalizeScore(score, average) {
    if (average === 0) return 0;
    const normalized = (score / average) * 100;
    return parseFloat(normalized.toFixed(1));
  }

  /**
   * Format hour as readable string
   */
  _formatHour(hour) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${period}`;
  }

  /**
   * Convert UTC hour to local timezone hour
   */
  _convertUTCHourToLocal(utcHour, timezone) {
    const now = new Date();
    const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), utcHour, 0, 0));
    const localDate = new Date(utcDate.toLocaleString('en-US', { timeZone: timezone }));
    return localDate.getHours();
  }

  /**
   * Analyze time ranges (morning, afternoon, evening, night)
   */
  _analyzeTimeRanges(hourlyData) {
    const ranges = {
      morning: { hours: [6, 7, 8, 9, 10, 11], score: 0, count: 0 },
      afternoon: { hours: [12, 13, 14, 15, 16, 17], score: 0, count: 0 },
      evening: { hours: [18, 19, 20, 21], score: 0, count: 0 },
      night: { hours: [22, 23, 0, 1, 2, 3, 4, 5], score: 0, count: 0 }
    };

    for (const hour of hourlyData) {
      if (hour.hour >= 6 && hour.hour <= 11) {
        ranges.morning.score += hour.avgEngagementScore;
        ranges.morning.count++;
      } else if (hour.hour >= 12 && hour.hour <= 17) {
        ranges.afternoon.score += hour.avgEngagementScore;
        ranges.afternoon.count++;
      } else if (hour.hour >= 18 && hour.hour <= 21) {
        ranges.evening.score += hour.avgEngagementScore;
        ranges.evening.count++;
      } else {
        ranges.night.score += hour.avgEngagementScore;
        ranges.night.count++;
      }
    }

    const result = {};
    for (const [name, data] of Object.entries(ranges)) {
      result[name] = data.count > 0
        ? parseFloat((data.score / data.count).toFixed(2))
        : 0;
    }

    // Find best range
    const bestRange = Object.entries(result).sort((a, b) => b[1] - a[1])[0];

    return {
      timeRanges: result,
      bestTimeRange: bestRange[0],
      bestTimeRangeScore: bestRange[1]
    };
  }

  /**
   * Select optimal times respecting minimum interval
   */
  _selectOptimalTimes(peakTimes, count, minInterval) {
    const selected = [];
    const usedHours = new Set();

    for (const peak of peakTimes) {
      if (selected.length >= count) break;

      // Check minimum interval
      let tooClose = false;
      for (const used of usedHours) {
        const diff = Math.abs(peak.localHour - used);
        const circularDiff = Math.min(diff, 24 - diff);
        if (circularDiff < minInterval) {
          tooClose = true;
          break;
        }
      }

      if (!tooClose) {
        selected.push({
          localHour: peak.localHour,
          localHourFormatted: peak.localHourFormatted,
          expectedEngagement: peak.avgEngagementScore,
          priority: selected.length + 1
        });
        usedHours.add(peak.localHour);
      }
    }

    return selected;
  }

  /**
   * Calculate confidence level
   */
  _calculateConfidence(time) {
    // Based on post count - more posts = higher confidence
    const postCount = time.postCount || 0;
    if (postCount >= 20) return 'high';
    if (postCount >= 10) return 'medium';
    return 'low';
  }

  /**
   * Generate recommendations
   */
  _generateRecommendations(peakTimeData, selectedTimes, timezone) {
    const recommendations = [];

    // Best time recommendation
    if (peakTimeData.peakTimes.length > 0) {
      const best = peakTimeData.peakTimes[0];
      recommendations.push({
        type: 'best_time',
        priority: 'high',
        title: 'Post at Peak Engagement Time',
        description: `Best time to post is ${best.localHourFormatted} (${timezone}), which shows ${(parseFloat(peakTimeData.analysis.bestHourVsAverage) > 0 ? '+' : '')}${peakTimeData.analysis.bestHourVsAverage} engagement vs average`,
        action: `Schedule most important content for ${best.localHourFormatted}`,
        impact: 'high'
      });
    }

    // Avoid worst times
    if (peakTimeData.worstTimes.length > 0) {
      const worst = peakTimeData.worstTimes[0];
      recommendations.push({
        type: 'avoid_worst',
        priority: 'medium',
        title: 'Avoid Low Engagement Hours',
        description: `Avoid posting at ${worst.localHourFormatted} (${timezone}), which shows ${parseFloat(peakTimeData.analysis.worstHourVsAverage)}% below average engagement`,
        action: `Reschedule content away from ${worst.localHourFormatted}`,
        impact: 'medium'
      });
    }

    // Time of day recommendation
    if (peakTimeData.analysis.bestTimeRange) {
      recommendations.push({
        type: 'time_range',
        priority: 'medium',
        title: `Focus on ${peakTimeData.analysis.bestTimeRange.charAt(0).toUpperCase() + peakTimeData.analysis.bestTimeRange.slice(1)} Posts`,
        description: `${peakTimeData.analysis.bestTimeRange.charAt(0).toUpperCase() + peakTimeData.analysis.bestTimeRange.slice(1)} hours show highest engagement overall`,
        action: `Schedule majority of posts during ${peakTimeData.analysis.bestTimeRange}`,
        impact: 'medium'
      });
    }

    // Frequency recommendation
    recommendations.push({
      type: 'frequency',
      priority: 'low',
      title: 'Maintain Consistent Posting Schedule',
      description: 'Post consistently at optimal times to build audience expectations',
      action: 'Set up automated posting for peak times',
      impact: 'low'
    });

    return recommendations;
  }

  /**
   * Generate schedule reasoning
   */
  _generateScheduleReasoning(peakTimeData, selectedTimes, timezone) {
    const parts = [];

    parts.push(`Based on analysis of ${peakTimeData.overall.totalPosts} posts,`);
    parts.push(`identified ${selectedTimes.length} optimal posting times in ${timezone} timezone.`);

    if (peakTimeData.analysis.bestTimeRange) {
      parts.push(`${peakTimeData.analysis.bestTimeRange.charAt(0).toUpperCase() + peakTimeData.analysis.bestTimeRange.slice(1)} shows highest engagement overall.`);
    }

    if (peakTimeData.peakTimes.length > 0) {
      const best = peakTimeData.peakTimes[0];
      parts.push(`Best performing hour is ${best.localHourFormatted} with ${best.avgEngagementScore} avg engagement score.`);
    }

    return parts.join(' ');
  }
}

export default OptimalPostingTimeService;
