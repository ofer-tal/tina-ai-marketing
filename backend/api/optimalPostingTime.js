import express from 'express';
import OptimalPostingTimeService from '../services/optimalPostingTimeService.js';

const router = express.Router();
const postingTimeService = new OptimalPostingTimeService();

/**
 * GET /api/posting-time/analysis
 * Get complete optimal posting time analysis
 * Query params:
 * - platform: Filter by platform (tiktok, instagram, youtube_shorts)
 * - days: Number of days to analyze (default: 30)
 * - timezone: Target timezone (default: America/New_York)
 * - postsPerDay: Number of posts to schedule per day (default: 3)
 * - minIntervalHours: Minimum hours between posts (default: 4)
 */
router.get('/analysis', async (req, res) => {
  try {
    const {
      platform = null,
      days = 30,
      timezone = 'America/New_York',
      postsPerDay = 3,
      minIntervalHours = 4
    } = req.query;

    // Validate days
    const numDays = parseInt(days);
    if (isNaN(numDays) || numDays < 1 || numDays > 365) {
      return res.status(400).json({
        error: 'Invalid days parameter. Must be between 1 and 365.'
      });
    }

    // Validate platform
    if (platform && !['tiktok', 'instagram', 'youtube_shorts'].includes(platform)) {
      return res.status(400).json({
        error: 'Invalid platform. Must be tiktok, instagram, or youtube_shorts.'
      });
    }

    // Validate posts per day
    const numPosts = parseInt(postsPerDay);
    if (isNaN(numPosts) || numPosts < 1 || numPosts > 10) {
      return res.status(400).json({
        error: 'Invalid postsPerDay parameter. Must be between 1 and 10.'
      });
    }

    // Get complete analysis
    const analysis = await postingTimeService.getCompleteAnalysis({
      platform,
      days: numDays,
      timezone,
      postsPerDay: numPosts,
      minIntervalHours: parseInt(minIntervalHours) || 4
    });

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Error fetching posting time analysis:', error);
    res.status(500).json({
      error: 'Failed to fetch posting time analysis',
      message: error.message
    });
  }
});

/**
 * GET /api/posting-time/hourly
 * Get hourly engagement data
 * Query params:
 * - platform: Filter by platform
 * - days: Number of days to analyze (default: 30)
 */
router.get('/hourly', async (req, res) => {
  try {
    const {
      platform = null,
      days = 30
    } = req.query;

    const numDays = parseInt(days);
    if (isNaN(numDays) || numDays < 1 || numDays > 365) {
      return res.status(400).json({
        error: 'Invalid days parameter. Must be between 1 and 365.'
      });
    }

    // Aggregate engagement by hour
    const hourlyData = await postingTimeService.aggregateEngagementByHour({
      platform,
      days: numDays
    });

    // Calculate averages
    const averageEngagement = postingTimeService.calculateAverageEngagement(hourlyData);

    res.json({
      success: true,
      data: {
        hourlyData: averageEngagement.byHour,
        overall: averageEngagement.overall,
        summary: {
          totalHours: hourlyData.length,
          totalPosts: averageEngagement.overall?.totalPosts || 0,
          dateRange: `${numDays} days`
        }
      }
    });
  } catch (error) {
    console.error('Error fetching hourly engagement data:', error);
    res.status(500).json({
      error: 'Failed to fetch hourly engagement data',
      message: error.message
    });
  }
});

/**
 * GET /api/posting-time/peak
 * Get peak and worst posting times
 * Query params:
 * - platform: Filter by platform
 * - days: Number of days to analyze (default: 30)
 * - topCount: Number of peak times to return (default: 5)
 * - timezone: Target timezone (default: America/New_York)
 */
router.get('/peak', async (req, res) => {
  try {
    const {
      platform = null,
      days = 30,
      topCount = 5,
      timezone = 'America/New_York'
    } = req.query;

    const numDays = parseInt(days);
    if (isNaN(numDays) || numDays < 1 || numDays > 365) {
      return res.status(400).json({
        error: 'Invalid days parameter. Must be between 1 and 365.'
      });
    }

    const numTopCount = parseInt(topCount);
    if (isNaN(numTopCount) || numTopCount < 1 || numTopCount > 24) {
      return res.status(400).json({
        error: 'Invalid topCount parameter. Must be between 1 and 24.'
      });
    }

    // Get hourly data
    const hourlyData = await postingTimeService.aggregateEngagementByHour({
      platform,
      days: numDays
    });

    // Calculate averages
    const averageEngagement = postingTimeService.calculateAverageEngagement(hourlyData);

    // Identify peak times
    const peakTimeData = postingTimeService.identifyPeakTimes(
      averageEngagement.byHour,
      numTopCount
    );
    peakTimeData.overall = averageEngagement.overall;

    // Adjust for timezone
    const peakTimesLocal = postingTimeService.adjustForTimezone(peakTimeData.peakTimes, timezone);
    const worstTimesLocal = postingTimeService.adjustForTimezone(peakTimeData.worstTimes, timezone);

    res.json({
      success: true,
      data: {
        peakTimes: peakTimesLocal,
        worstTimes: worstTimesLocal,
        overall: averageEngagement.overall,
        analysis: peakTimeData.analysis,
        timezone
      }
    });
  } catch (error) {
    console.error('Error fetching peak posting times:', error);
    res.status(500).json({
      error: 'Failed to fetch peak posting times',
      message: error.message
    });
  }
});

/**
 * GET /api/posting-time/schedule
 * Get optimal posting schedule recommendations
 * Query params:
 * - platform: Filter by platform
 * - days: Number of days to analyze (default: 30)
 * - postsPerDay: Number of posts to schedule per day (default: 3)
 * - minIntervalHours: Minimum hours between posts (default: 4)
 * - timezone: Target timezone (default: America/New_York)
 */
router.get('/schedule', async (req, res) => {
  try {
    const {
      platform = null,
      days = 30,
      postsPerDay = 3,
      minIntervalHours = 4,
      timezone = 'America/New_York'
    } = req.query;

    const numDays = parseInt(days);
    if (isNaN(numDays) || numDays < 1 || numDays > 365) {
      return res.status(400).json({
        error: 'Invalid days parameter. Must be between 1 and 365.'
      });
    }

    const numPosts = parseInt(postsPerDay);
    if (isNaN(numPosts) || numPosts < 1 || numPosts > 10) {
      return res.status(400).json({
        error: 'Invalid postsPerDay parameter. Must be between 1 and 10.'
      });
    }

    // Get hourly data
    const hourlyData = await postingTimeService.aggregateEngagementByHour({
      platform,
      days: numDays
    });

    // Calculate averages
    const averageEngagement = postingTimeService.calculateAverageEngagement(hourlyData);

    // Identify peak times
    const peakTimeData = postingTimeService.identifyPeakTimes(averageEngagement.byHour, 10);
    peakTimeData.overall = averageEngagement.overall;

    // Generate schedule
    const schedule = postingTimeService.recommendOptimalSchedule(peakTimeData, {
      postsPerDay: numPosts,
      minIntervalHours: parseInt(minIntervalHours) || 4,
      platforms: platform ? [platform] : ['tiktok', 'instagram', 'youtube_shorts'],
      targetTimezone: timezone
    });

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Error generating posting schedule:', error);
    res.status(500).json({
      error: 'Failed to generate posting schedule',
      message: error.message
    });
  }
});

/**
 * GET /api/posting-time/recommendations
 * Get posting time recommendations only
 * Query params:
 * - platform: Filter by platform
 * - days: Number of days to analyze (default: 30)
 * - timezone: Target timezone (default: America/New_York)
 */
router.get('/recommendations', async (req, res) => {
  try {
    const {
      platform = null,
      days = 30,
      timezone = 'America/New_York'
    } = req.query;

    const numDays = parseInt(days);
    if (isNaN(numDays) || numDays < 1 || numDays > 365) {
      return res.status(400).json({
        error: 'Invalid days parameter. Must be between 1 and 365.'
      });
    }

    // Get hourly data
    const hourlyData = await postingTimeService.aggregateEngagementByHour({
      platform,
      days: numDays
    });

    // Calculate averages
    const averageEngagement = postingTimeService.calculateAverageEngagement(hourlyData);

    // Identify peak times
    const peakTimeData = postingTimeService.identifyPeakTimes(averageEngagement.byHour, 5);
    peakTimeData.overall = averageEngagement.overall;

    // Check if we have data
    if (!peakTimeData.peakTimes || peakTimeData.peakTimes.length === 0) {
      return res.json({
        success: true,
        data: {
          recommendations: [],
          bestTime: null,
          worstTime: null,
          bestTimeRange: null,
          schedule: [],
          timezone,
          message: 'Insufficient data to generate recommendations'
        }
      });
    }

    // Get best time (handle empty arrays)
    const bestTimeArray = postingTimeService.adjustForTimezone(peakTimeData.peakTimes.slice(0, 1), timezone);
    const worstTimeArray = postingTimeService.adjustForTimezone(peakTimeData.worstTimes.slice(0, 1), timezone);

    const bestTime = bestTimeArray.length > 0 ? bestTimeArray[0] : null;
    const worstTime = worstTimeArray.length > 0 ? worstTimeArray[0] : null;

    // Generate recommendations using the recommendOptimalSchedule method
    const schedule = postingTimeService.recommendOptimalSchedule(peakTimeData, {
      postsPerDay: 3,
      minIntervalHours: 4,
      platforms: platform ? [platform] : ['tiktok', 'instagram', 'youtube_shorts'],
      targetTimezone: timezone
    });

    res.json({
      success: true,
      data: {
        recommendations: schedule.recommendations || [],
        bestTime,
        worstTime,
        bestTimeRange: peakTimeData.analysis?.bestTimeRange || null,
        schedule: schedule.schedule || [],
        timezone
      }
    });
  } catch (error) {
    console.error('Error fetching posting time recommendations:', error);
    res.status(500).json({
      error: 'Failed to fetch posting time recommendations',
      message: error.message
    });
  }
});

/**
 * GET /api/posting-time/compare
 * Compare posting times across platforms
 * Query params:
 * - days: Number of days to analyze (default: 30)
 * - timezone: Target timezone (default: America/New_York)
 */
router.get('/compare', async (req, res) => {
  try {
    const {
      days = 30,
      timezone = 'America/New_York'
    } = req.query;

    const numDays = parseInt(days);
    if (isNaN(numDays) || numDays < 1 || numDays > 365) {
      return res.status(400).json({
        error: 'Invalid days parameter. Must be between 1 and 365.'
      });
    }

    const platforms = ['tiktok', 'instagram', 'youtube_shorts'];
    const comparison = {};

    for (const platform of platforms) {
      // Get hourly data for this platform
      const hourlyData = await postingTimeService.aggregateEngagementByHour({
        platform,
        days: numDays
      });

      if (hourlyData.length === 0) {
        comparison[platform] = {
          error: 'No data available',
          peakTime: null
        };
        continue;
      }

      // Calculate averages
      const averageEngagement = postingTimeService.calculateAverageEngagement(hourlyData);

      // Identify peak times
      const peakTimeData = postingTimeService.identifyPeakTimes(averageEngagement.byHour, 1);

      // Adjust for timezone
      const peakTimesLocal = postingTimeService.adjustForTimezone(peakTimeData.peakTimes, timezone);

      comparison[platform] = {
        peakTime: peakTimesLocal[0] || null,
        overall: averageEngagement.overall,
        totalPosts: averageEngagement.overall?.totalPosts || 0,
        avgEngagementScore: averageEngagement.overall?.avgEngagementScore || 0
      };
    }

    // Find best overall platform
    const platformRankings = Object.entries(comparison)
      .filter(([_, data]) => !data.error)
      .sort((a, b) => b[1].avgEngagementScore - a[1].avgEngagementScore);

    res.json({
      success: true,
      data: {
        comparison,
        bestPlatform: platformRankings[0]?.[0] || null,
        platformRankings: platformRankings.map(([platform, data]) => ({
          platform,
          avgEngagementScore: data.avgEngagementScore
        })),
        timezone
      }
    });
  } catch (error) {
    console.error('Error comparing posting times:', error);
    res.status(500).json({
      error: 'Failed to compare posting times',
      message: error.message
    });
  }
});

/**
 * GET /api/posting-time/statistics
 * Get posting time statistics
 * Query params:
 * - platform: Filter by platform
 * - days: Number of days to analyze (default: 30)
 */
router.get('/statistics', async (req, res) => {
  try {
    const {
      platform = null,
      days = 30
    } = req.query;

    const numDays = parseInt(days);
    if (isNaN(numDays) || numDays < 1 || numDays > 365) {
      return res.status(400).json({
        error: 'Invalid days parameter. Must be between 1 and 365.'
      });
    }

    // Get hourly data
    const hourlyData = await postingTimeService.aggregateEngagementByHour({
      platform,
      days: numDays
    });

    if (hourlyData.length === 0) {
      return res.json({
        success: true,
        data: {
          error: 'No data available',
          stats: null
        }
      });
    }

    // Calculate statistics
    const engagementScores = hourlyData.map(h => h.avgEngagementScore);
    const avgScore = engagementScores.reduce((a, b) => a + b, 0) / engagementScores.length;
    const maxScore = Math.max(...engagementScores);
    const minScore = Math.min(...engagementScores);
    const variance = engagementScores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / engagementScores.length;
    const stdDev = Math.sqrt(variance);

    // Find peak hour
    const peakHour = hourlyData.reduce((max, hour) =>
      hour.avgEngagementScore > max.avgEngagementScore ? hour : max
    );

    // Find worst hour
    const worstHour = hourlyData.reduce((min, hour) =>
      hour.avgEngagementScore < min.avgEngagementScore ? hour : min
    );

    // Calculate coefficient of variation (lower = more consistent)
    const cv = (stdDev / avgScore) * 100;

    res.json({
      success: true,
      data: {
        summary: {
          totalHours: hourlyData.length,
          dateRange: `${numDays} days`,
          platform: platform || 'all platforms'
        },
        engagement: {
          average: parseFloat(avgScore.toFixed(2)),
          max: parseFloat(maxScore.toFixed(2)),
          min: parseFloat(minScore.toFixed(2)),
          range: parseFloat((maxScore - minScore).toFixed(2)),
          standardDeviation: parseFloat(stdDev.toFixed(2)),
          coefficientOfVariation: parseFloat(cv.toFixed(2))
        },
        peakHour: {
          hour: peakHour.hour,
          hourFormatted: postingTimeService._formatHour(peakHour.hour),
          avgEngagementScore: peakHour.avgEngagementScore
        },
        worstHour: {
          hour: worstHour.hour,
          hourFormatted: postingTimeService._formatHour(worstHour.hour),
          avgEngagementScore: worstHour.avgEngagementScore
        },
        consistency: {
          level: cv < 20 ? 'high' : cv < 40 ? 'medium' : 'low',
          interpretation: cv < 20
            ? 'High consistency - posting time has minimal impact on engagement'
            : cv < 40
            ? 'Medium consistency - posting time moderately affects engagement'
            : 'Low consistency - posting time significantly affects engagement'
        }
      }
    });
  } catch (error) {
    console.error('Error fetching posting time statistics:', error);
    res.status(500).json({
      error: 'Failed to fetch posting time statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/posting-time/hour/:hour
 * Get engagement data for a specific hour
 * Query params:
 * - platform: Filter by platform
 * - days: Number of days to analyze (default: 30)
 * - timezone: Target timezone (default: America/New_York)
 */
router.get('/hour/:hour', async (req, res) => {
  try {
    const {
      hour
    } = req.params;

    const numHour = parseInt(hour);
    if (isNaN(numHour) || numHour < 0 || numHour > 23) {
      return res.status(400).json({
        error: 'Invalid hour parameter. Must be between 0 and 23.'
      });
    }

    const {
      platform = null,
      days = 30,
      timezone = 'America/New_York'
    } = req.query;

    const numDays = parseInt(days);
    if (isNaN(numDays) || numDays < 1 || numDays > 365) {
      return res.status(400).json({
        error: 'Invalid days parameter. Must be between 1 and 365.'
      });
    }

    // Get hourly data
    const hourlyData = await postingTimeService.aggregateEngagementByHour({
      platform,
      days: numDays
    });

    // Find the requested hour
    const hourData = hourlyData.find(h => h.hour === numHour);

    if (!hourData) {
      return res.status(404).json({
        error: `No data available for hour ${numHour}`,
        hour: numHour
      });
    }

    // Convert to local timezone
    const localHour = postingTimeService._convertUTCHourToLocal(numHour, timezone);

    // Get overall averages for comparison
    const averageEngagement = postingTimeService.calculateAverageEngagement(hourlyData);

    // Calculate percentile
    const sortedScores = hourlyData.map(h => h.avgEngagementScore).sort((a, b) => a - b);
    const rank = sortedScores.indexOf(hourData.avgEngagementScore) + 1;
    const percentile = ((rank / sortedScores.length) * 100).toFixed(1);

    res.json({
      success: true,
      data: {
        hour: numHour,
        hourFormatted: postingTimeService._formatHour(numHour),
        localHour,
        localHourFormatted: postingTimeService._formatHour(localHour),
        timezone,
        metrics: hourData,
        comparison: {
          vsAverage: ((hourData.avgEngagementScore / averageEngagement.overall.avgEngagementScore - 1) * 100).toFixed(1) + '%',
          percentile: parseFloat(percentile),
          rank: `${rank} of ${sortedScores.length}`
        }
      }
    });
  } catch (error) {
    console.error('Error fetching hour data:', error);
    res.status(500).json({
      error: 'Failed to fetch hour data',
      message: error.message
    });
  }
});

export default router;
