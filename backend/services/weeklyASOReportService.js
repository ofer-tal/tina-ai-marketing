import WeeklyASOReport from '../models/WeeklyASOReport.js';
import ASOKeyword from '../models/ASOKeyword.js';
import ASOScore from '../models/ASOScore.js';
import CategoryRanking from '../models/CategoryRanking.js';
import ConversionMetrics from '../models/ConversionMetrics.js';
import CompetitorKeyword from '../models/CompetitorKeyword.js';
import logger from '../utils/logger.js';

/**
 * Weekly ASO Report Service
 * Generates weekly App Store Optimization performance summary reports
 */
class WeeklyASOReportService {
  /**
   * Generate a complete weekly ASO report for the specified week
   * @param {Date} weekStart - Start of the week (defaults to last completed week)
   * @returns {Object} Generated report
   */
  async generateWeeklyReport(weekStart = null) {
    try {
      // Determine week period
      let weekStartDt, weekEndDt, year, weekNumber;

      if (weekStart) {
        weekStartDt = new Date(weekStart);
        weekStartDt.setHours(0, 0, 0, 0);
        const isoWeek = WeeklyASOReport.getISOWeek(weekStartDt);
        year = isoWeek.year;
        weekNumber = isoWeek.week;
        const weekDates = WeeklyASOReport.getWeekDates(year, weekNumber);
        weekStartDt = weekDates.weekStart;
        weekEndDt = weekDates.weekEnd;
      } else {
        // Default to last completed week
        const today = new Date();
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);
        const isoWeek = WeeklyASOReport.getISOWeek(lastWeek);
        year = isoWeek.year;
        weekNumber = isoWeek.week;
        const weekDates = WeeklyASOReport.getWeekDates(year, weekNumber);
        weekStartDt = weekDates.weekStart;
        weekEndDt = weekDates.weekEnd;
      }

      logger.info(`Generating weekly ASO report for week ${weekNumber} of ${year}`);

      // Check if report already exists
      const existingReport = await WeeklyASOReport.findOne({
        year,
        weekNumber
      });

      if (existingReport) {
        logger.info(`Report already exists for week ${weekNumber} of ${year}, updating...`);
      }

      // Get previous week for comparison
      const prevWeekNumber = weekNumber === 1 ? 52 : weekNumber - 1;
      const prevYear = weekNumber === 1 ? year - 1 : year;
      const prevWeekDates = WeeklyASOReport.getWeekDates(prevYear, prevWeekNumber);

      // Gather all data
      const [
        overallScore,
        keywordRankings,
        rankingChanges,
        categoryRanking,
        conversionMetrics,
        competitorComparison,
        highlights,
        recommendations
      ] = await Promise.all([
        this.getOverallScore(weekStartDt, weekEndDt, prevWeekDates.weekStart, prevWeekDates.weekEnd),
        this.getKeywordRankingsSummary(),
        this.getRankingChanges(weekStartDt, weekEndDt),
        this.getCategoryRanking(weekStartDt, weekEndDt),
        this.getConversionMetrics(weekStartDt, weekEndDt),
        this.getCompetitorComparison(),
        this.generateHighlights(weekStartDt, weekEndDt),
        this.generateRecommendations()
      ]);

      // Calculate component scores
      const componentScores = await this.getComponentScores(weekStartDt, weekEndDt, prevWeekDates.weekStart, prevWeekDates.weekEnd);

      // Create or update report
      const reportData = {
        weekStart: weekStartDt,
        weekEnd: weekEndDt,
        year,
        weekNumber,
        overallScore,
        componentScores,
        keywordRankings,
        rankingChanges,
        categoryRanking,
        conversionMetrics,
        competitorComparison,
        highlights,
        recommendations,
        generatedAt: new Date()
      };

      const report = existingReport
        ? await WeeklyASOReport.findByIdAndUpdate(existingReport._id, reportData, { new: true, upsert: true })
        : await WeeklyASOReport.create(reportData);

      logger.info(`Weekly ASO report generated successfully for week ${weekNumber} of ${year}`);

      return report;
    } catch (error) {
      logger.error('Error generating weekly ASO report:', error);
      throw error;
    }
  }

  /**
   * Get overall ASO score for the period
   */
  async getOverallScore(weekStart, weekEnd, prevWeekStart, prevWeekEnd) {
    try {
      const currentScore = await ASOScore
        .findOne({
          timestamp: { $gte: weekStart, $lte: weekEnd }
        })
        .sort({ timestamp: -1 });

      const previousScore = await ASOScore
        .findOne({
          timestamp: { $gte: prevWeekStart, $lte: prevWeekEnd }
        })
        .sort({ timestamp: -1 });

      const current = currentScore?.overallScore || 0;
      const previous = previousScore?.overallScore || 0;
      const change = current - previous;

      return {
        current,
        previous,
        change: Math.round(change * 10) / 10,
        trend: this.determineTrend(change, 1)
      };
    } catch (error) {
      logger.error('Error getting overall score:', error);
      return { current: 0, previous: 0, change: 0, trend: 'stable' };
    }
  }

  /**
   * Get component scores breakdown
   */
  async getComponentScores(weekStart, weekEnd, prevWeekStart, prevWeekEnd) {
    try {
      const currentScore = await ASOScore
        .findOne({
          timestamp: { $gte: weekStart, $lte: weekEnd }
        })
        .sort({ timestamp: -1 });

      const previousScore = await ASOScore
        .findOne({
          timestamp: { $gte: prevWeekStart, $lte: prevWeekEnd }
        })
        .sort({ timestamp: -1 });

      const components = ['keywordScore', 'metadataScore', 'visualScore', 'ratingsScore', 'conversionScore'];
      const result = {};

      for (const component of components) {
        const current = currentScore?.[component] || 0;
        const previous = previousScore?.[component] || 0;
        const change = current - previous;

        result[component] = {
          current,
          previous,
          change: Math.round(change * 10) / 10,
          trend: this.determineTrend(change, 1)
        };
      }

      return result;
    } catch (error) {
      logger.error('Error getting component scores:', error);
      return {};
    }
  }

  /**
   * Get keyword rankings summary
   */
  async getKeywordRankingsSummary() {
    try {
      const keywords = await ASOKeyword.find({});

      const rankings = keywords
        .map(k => k.ranking)
        .filter(r => r !== null && r !== undefined);

      const summary = {
        totalTracked: keywords.length,
        inTop10: 0,
        inTop25: 0,
        inTop50: 0,
        notRanked: 0,
        averageRanking: null,
        medianRanking: null
      };

      for (const ranking of rankings) {
        if (ranking <= 10) summary.inTop10++;
        if (ranking <= 25) summary.inTop25++;
        if (ranking <= 50) summary.inTop50++;
      }

      summary.notRanked = keywords.length - rankings.length;

      if (rankings.length > 0) {
        const sum = rankings.reduce((a, b) => a + b, 0);
        summary.averageRanking = Math.round(sum / rankings.length);

        const sorted = [...rankings].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        summary.medianRanking = sorted.length % 2 !== 0
          ? sorted[mid]
          : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
      }

      return summary;
    } catch (error) {
      logger.error('Error getting keyword rankings summary:', error);
      return {
        totalTracked: 0,
        inTop10: 0,
        inTop25: 0,
        inTop50: 0,
        notRanked: 0,
        averageRanking: null,
        medianRanking: null
      };
    }
  }

  /**
   * Get keyword ranking changes for the week
   */
  async getRankingChanges(weekStart, weekEnd) {
    try {
      const keywords = await ASOKeyword.find({});

      const changes = {
        improved: 0,
        declined: 0,
        stable: 0,
        new: 0,
        topMovers: []
      };

      const movers = [];

      for (const keyword of keywords) {
        if (!keyword.rankingHistory || keyword.rankingHistory.length < 2) {
          changes.new++;
          continue;
        }

        // Find the oldest and newest entries within the week
        const weekHistory = keyword.rankingHistory.filter(h =>
          new Date(h.date) >= weekStart && new Date(h.date) <= weekEnd
        );

        if (weekHistory.length < 2) {
          changes.stable++;
          continue;
        }

        const sortedHistory = weekHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
        const previousRanking = sortedHistory[0].ranking;
        const currentRanking = sortedHistory[sortedHistory.length - 1].ranking;
        const change = previousRanking - currentRanking; // Positive = improved (lower ranking number is better)

        if (change > 0) {
          changes.improved++;
        } else if (change < 0) {
          changes.declined++;
        } else {
          changes.stable++;
        }

        // Track top movers (improvements or significant declines)
        if (Math.abs(change) >= 5) {
          movers.push({
            keyword: keyword.keyword,
            previousRanking,
            currentRanking,
            change,
            volume: keyword.volume || 0
          });
        }
      }

      // Sort movers by absolute change and take top 10
      movers.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
      changes.topMovers = movers.slice(0, 10);

      return changes;
    } catch (error) {
      logger.error('Error getting ranking changes:', error);
      return {
        improved: 0,
        declined: 0,
        stable: 0,
        new: 0,
        topMovers: []
      };
    }
  }

  /**
   * Get category ranking for the week
   */
  async getCategoryRanking(weekStart, weekEnd) {
    try {
      const currentRanking = await CategoryRanking
        .findOne({
          lastChecked: { $gte: weekStart, $lte: weekEnd }
        })
        .sort({ lastChecked: -1 });

      const prevWeekStart = new Date(weekStart);
      prevWeekStart.setDate(prevWeekStart.getDate() - 7);
      const prevWeekEnd = new Date(weekEnd);
      prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);

      const previousRanking = await CategoryRanking
        .findOne({
          lastChecked: { $gte: prevWeekStart, $lte: prevWeekEnd }
        })
        .sort({ lastChecked: -1 });

      const current = {
        ranking: currentRanking?.ranking || null,
        percentile: currentRanking?.percentile || null
      };

      const previous = {
        ranking: previousRanking?.ranking || null,
        percentile: previousRanking?.percentile || null
      };

      const change = current.ranking && previous.ranking
        ? previous.ranking - current.ranking
        : 0;

      return {
        current,
        previous,
        change,
        trend: this.determineTrend(change, 1)
      };
    } catch (error) {
      logger.error('Error getting category ranking:', error);
      return {
        current: { ranking: null, percentile: null },
        previous: { ranking: null, percentile: null },
        change: 0,
        trend: 'stable'
      };
    }
  }

  /**
   * Get conversion metrics for the week
   */
  async getConversionMetrics(weekStart, weekEnd) {
    try {
      const metrics = await ConversionMetrics.find({
        date: { $gte: weekStart, $lte: weekEnd },
        period: 'daily'
      });

      const aggregated = {
        impressions: 0,
        downloads: 0,
        paidSubscriptions: 0
      };

      for (const metric of metrics) {
        aggregated.impressions += metric.impressions || 0;
        aggregated.downloads += metric.downloads || 0;
        aggregated.paidSubscriptions += metric.paidSubscriptions || 0;
      }

      const currentRate = aggregated.impressions > 0
        ? (aggregated.paidSubscriptions / aggregated.impressions) * 100
        : 0;

      // Get previous week for comparison
      const prevWeekStart = new Date(weekStart);
      prevWeekStart.setDate(prevWeekStart.getDate() - 7);
      const prevWeekEnd = new Date(weekEnd);
      prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);

      const prevMetrics = await ConversionMetrics.find({
        date: { $gte: prevWeekStart, $lte: prevWeekEnd },
        period: 'daily'
      });

      let prevImpressions = 0;
      let prevSubscriptions = 0;

      for (const metric of prevMetrics) {
        prevImpressions += metric.impressions || 0;
        prevSubscriptions += metric.paidSubscriptions || 0;
      }

      const previousRate = prevImpressions > 0
        ? (prevSubscriptions / prevImpressions) * 100
        : 0;

      const change = currentRate - previousRate;

      return {
        overallRate: {
          current: Math.round(currentRate * 100) / 100,
          previous: Math.round(previousRate * 100) / 100,
          change: Math.round(change * 100) / 100,
          trend: this.determineTrend(change, 0.1)
        },
        impressions: aggregated.impressions,
        downloads: aggregated.downloads,
        conversions: aggregated.paidSubscriptions
      };
    } catch (error) {
      logger.error('Error getting conversion metrics:', error);
      return {
        overallRate: { current: 0, previous: 0, change: 0, trend: 'stable' },
        impressions: 0,
        downloads: 0,
        conversions: 0
      };
    }
  }

  /**
   * Get competitor comparison
   */
  async getCompetitorComparison() {
    try {
      const competitors = await CompetitorKeyword.aggregate([
        {
          $group: {
            _id: '$competitorAppName',
            competitorAppId: { $first: '$competitorAppId' },
            avgRanking: { $avg: '$competitorRanking' },
            count: { $sum: 1 }
          }
        }
      ]);

      const ourKeywords = await ASOKeyword.find({});
      const ourAvgRanking = ourKeywords.length > 0
        ? ourKeywords.reduce((sum, k) => sum + (k.ranking || 100), 0) / ourKeywords.length
        : 100;

      const comparison = [];

      for (const competitor of competitors) {
        const gap = ourAvgRanking - competitor.avgRanking; // Positive = we're behind

        // Count keywords where we win/lose
        const competitorKeywords = await CompetitorKeyword.find({
          competitorAppName: competitor._id
        });

        let keywordsWon = 0;
        let keywordsLost = 0;

        for (const ck of competitorKeywords) {
          const ourKeyword = await ASOKeyword.findOne({ keyword: ck.keyword });
          if (ourKeyword && ourKeyword.ranking && ck.competitorRanking) {
            if (ourKeyword.ranking < ck.competitorRanking) {
              keywordsWon++;
            } else {
              keywordsLost++;
            }
          }
        }

        comparison.push({
          competitorName: competitor._id,
          competitorAppId: competitor.competitorAppId,
          theirAverageRanking: Math.round(competitor.avgRanking),
          ourAverageRanking: Math.round(ourAvgRanking),
          gap: Math.round(gap),
          keywordsWon,
          keywordsLost
        });
      }

      // Sort by gap (most competitive first)
      comparison.sort((a, b) => b.gap - a.gap);

      return comparison.slice(0, 5); // Top 5 competitors
    } catch (error) {
      logger.error('Error getting competitor comparison:', error);
      return [];
    }
  }

  /**
   * Generate highlights for the week
   */
  async generateHighlights(weekStart, weekEnd) {
    const highlights = [];

    try {
      // Check for top 10 achievements
      const top10Keywords = await ASOKeyword.countDocuments({
        ranking: { $lte: 10 }
      });

      if (top10Keywords > 0) {
        highlights.push({
          type: 'milestone',
          title: `${top10Keywords} Keywords in Top 10`,
          description: `Great progress! You have ${top10Keywords} keyword${top10Keywords > 1 ? 's' : ''} ranking in the top 10.`,
          metric: 'Top 10 Keywords',
          value: top10Keywords.toString()
        });
      }

      // Check for significant improvements
      const keywords = await ASOKeyword.find({});
      for (const keyword of keywords) {
        if (!keyword.rankingHistory || keyword.rankingHistory.length < 2) continue;

        const weekHistory = keyword.rankingHistory.filter(h =>
          new Date(h.date) >= weekStart && new Date(h.date) <= weekEnd
        );

        if (weekHistory.length < 2) continue;

        const sorted = weekHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
        const change = sorted[0].ranking - sorted[sorted.length - 1].ranking;

        if (change >= 20 && sorted[sorted.length - 1].ranking <= 50) {
          highlights.push({
            type: 'improvement',
            title: `Big Jump: "${keyword.keyword}"`,
            description: `Improved ${change} positions this week, now ranking #${sorted[sorted.length - 1].ranking}!`,
            metric: 'Ranking Improvement',
            value: `+${change} positions`
          });
          break;
        }
      }

      // Check for alerts (significant declines)
      for (const keyword of keywords) {
        if (!keyword.rankingHistory || keyword.rankingHistory.length < 2) continue;

        const weekHistory = keyword.rankingHistory.filter(h =>
          new Date(h.date) >= weekStart && new Date(h.date) <= weekEnd
        );

        if (weekHistory.length < 2) continue;

        const sorted = weekHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
        const change = sorted[sorted.length - 1].ranking - sorted[0].ranking;

        if (change >= 15 && keyword.volume > 5000) {
          highlights.push({
            type: 'alert',
            title: `Alert: "${keyword.keyword}" Declining`,
            description: `Dropped ${change} positions this week on a high-volume keyword.`,
            metric: 'Ranking Decline',
            value: `-${change} positions`
          });
          break;
        }
      }

      // Check ASO score trend
      const currentScore = await ASOScore
        .findOne({ timestamp: { $gte: weekStart, $lte: weekEnd } })
        .sort({ timestamp: -1 });

      if (currentScore && currentScore.overallScore >= 75) {
        highlights.push({
          type: 'milestone',
          title: 'Strong ASO Score',
          description: `Your overall ASO score is ${currentScore.overallScore}, indicating strong optimization!`,
          metric: 'ASO Score',
          value: currentScore.overallScore.toString()
        });
      }

    } catch (error) {
      logger.error('Error generating highlights:', error);
    }

    return highlights.slice(0, 5); // Max 5 highlights
  }

  /**
   * Generate actionable recommendations
   */
  async generateRecommendations() {
    const recommendations = [];

    try {
      const keywords = await ASOKeyword.find({});

      // Check for keywords not in top 50 with high volume
      const highVolumeNotRanked = keywords.filter(k =>
        k.volume > 5000 && (!k.ranking || k.ranking > 50)
      );

      if (highVolumeNotRanked.length > 0) {
        recommendations.push({
          priority: 'high',
          category: 'keyword',
          title: 'Optimize High-Volume Keywords',
          description: `${highVolumeNotRanked.length} high-volume keywords are not ranking in the top 50.`,
          actionItem: `Focus on these keywords: ${highVolumeNotRanked.slice(0, 3).map(k => k.keyword).join(', ')}`,
          expectedImpact: 'Significant traffic increase',
          estimatedEffort: 'moderate'
        });
      }

      // Check for keywords with declining trends
      let decliningCount = 0;
      for (const keyword of keywords) {
        if (keyword.rankingHistory && keyword.rankingHistory.length >= 3) {
          const recent = keyword.rankingHistory.slice(-3);
          const trend = recent[2].ranking - recent[0].ranking;
          if (trend > 5) decliningCount++;
        }
      }

      if (decliningCount >= 3) {
        recommendations.push({
          priority: 'high',
          category: 'keyword',
          title: 'Address Declining Keywords',
          description: `${decliningCount} keywords show declining ranking trends over the past week.`,
          actionItem: 'Review and refresh content for declining keywords',
          expectedImpact: 'Stabilize rankings',
          estimatedEffort: 'significant'
        });
      }

      // Check visual score
      const latestScore = await ASOScore.findOne().sort({ timestamp: -1 });
      if (latestScore && latestScore.visualScore < 60) {
        recommendations.push({
          priority: 'medium',
          category: 'visual',
          title: 'Improve App Visuals',
          description: 'Visual score is below 60, indicating room for improvement in screenshots and icon.',
          actionItem: 'Consider A/B testing new screenshots or icon designs',
          expectedImpact: 'Improved conversion rate',
          estimatedEffort: 'significant'
        });
      }

      // Check metadata score
      if (latestScore && latestScore.metadataScore < 70) {
        recommendations.push({
          priority: 'medium',
          category: 'metadata',
          title: 'Optimize App Metadata',
          description: 'Metadata score can be improved by refining title, subtitle, and description.',
          actionItem: 'Review keyword density and placement in app metadata',
          expectedImpact: 'Better keyword rankings',
          estimatedEffort: 'quick'
        });
      }

      // Screenshot testing recommendation
      if (latestScore && latestScore.conversionScore < 50) {
        recommendations.push({
          priority: 'high',
          category: 'visual',
          title: 'Test New Screenshots',
          description: 'Conversion score is low. Screenshots may not be effectively showcasing the app.',
          actionItem: 'Create and test 3-5 new screenshot variations highlighting key features',
          expectedImpact: 'Higher conversion rate',
          estimatedEffort: 'moderate'
        });
      }

      // Competitor opportunity
      const competitorKeywords = await CompetitorKeyword.find({
        opportunityLevel: { $in: ['high', 'medium'] }
      }).limit(5);

      if (competitorKeywords.length > 0) {
        recommendations.push({
          priority: 'medium',
          category: 'competitive',
          title: 'Competitor Keyword Opportunities',
          description: `Found ${competitorKeywords.length} keywords where competitors are outranking us.`,
          actionItem: `Target these keywords: ${competitorKeywords.map(k => k.keyword).slice(0, 3).join(', ')}`,
          expectedImpact: 'Gain market share',
          estimatedEffort: 'moderate'
        });
      }

    } catch (error) {
      logger.error('Error generating recommendations:', error);
    }

    return recommendations.slice(0, 6); // Max 6 recommendations
  }

  /**
   * Determine trend from change value
   */
  determineTrend(change, threshold = 0.01) {
    if (Math.abs(change) < threshold) return 'stable';
    return change > 0 ? 'up' : 'down';
  }

  /**
   * Get the latest weekly report
   */
  async getLatestReport() {
    try {
      return await WeeklyASOReport.findOne().sort({ weekStart: -1 });
    } catch (error) {
      logger.error('Error getting latest report:', error);
      return null;
    }
  }

  /**
   * Get a specific weekly report by year and week number
   */
  async getWeeklyReport(year, weekNumber) {
    try {
      return await WeeklyASOReport.findOne({ year, weekNumber });
    } catch (error) {
      logger.error('Error getting weekly report:', error);
      return null;
    }
  }

  /**
   * Get reports for a date range
   */
  async getReportsInRange(startDate, endDate) {
    try {
      return await WeeklyASOReport.find({
        weekStart: { $gte: startDate, $lte: endDate }
      }).sort({ weekStart: -1 });
    } catch (error) {
      logger.error('Error getting reports in range:', error);
      return [];
    }
  }

  /**
   * Mark report as sent via chat
   */
  async markAsSent(reportId) {
    try {
      return await WeeklyASOReport.findByIdAndUpdate(
        reportId,
        {
          sentViaChat: true,
          sentAt: new Date()
        },
        { new: true }
      );
    } catch (error) {
      logger.error('Error marking report as sent:', error);
      throw error;
    }
  }

  /**
   * Get report summary for chat notification
   */
  getReportSummary(report) {
    if (!report) return null;

    const period = report.getPeriodString();
    const scoreChange = report.overallScore.change >= 0 ? '+' : '';
    const rankingTrend = report.overallScore.trend === 'up' ? '▲' : report.overallScore.trend === 'down' ? '▼' : '─';

    let summary = `📊 Weekly ASO Report: ${period}\n\n`;
    summary += `Overall Score: ${report.overallScore.current}/100 ${rankingTrend} (${scoreChange}${report.overallScore.change})\n\n`;

    summary += `📈 Keyword Rankings:\n`;
    summary += `• Top 10: ${report.keywordRankings.inTop10}\n`;
    summary += `• Top 25: ${report.keywordRankings.inTop25}\n`;
    summary += `• Top 50: ${report.keywordRankings.inTop50}\n`;
    summary += `• Avg Ranking: #${report.keywordRankings.averageRanking || 'N/A'}\n\n`;

    if (report.rankingChanges.improved > 0 || report.rankingChanges.declined > 0) {
      summary += `🔄 Ranking Changes:\n`;
      summary += `• Improved: ${report.rankingChanges.improved}\n`;
      summary += `• Declined: ${report.rankingChanges.declined}\n`;
      summary += `• Stable: ${report.rankingChanges.stable}\n\n`;
    }

    if (report.highlights && report.highlights.length > 0) {
      summary += `✨ Highlights:\n`;
      report.highlights.forEach(h => {
        const emoji = h.type === 'improvement' ? '🟢' : h.type === 'decline' ? '🔴' : h.type === 'alert' ? '⚠️' : '🏆';
        summary += `${emoji} ${h.title}\n`;
      });
      summary += '\n';
    }

    if (report.recommendations && report.recommendations.length > 0) {
      summary += `💡 Top Recommendations:\n`;
      report.recommendations.slice(0, 3).forEach((r, i) => {
        const emoji = r.priority === 'high' ? '🔴' : r.priority === 'medium' ? '🟡' : '🟢';
        summary += `${emoji} ${r.title}\n`;
      });
    }

    return summary;
  }
}

export default new WeeklyASOReportService();
