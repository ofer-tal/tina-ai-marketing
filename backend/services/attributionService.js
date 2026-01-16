/**
 * Attribution Service
 *
 * Tracks user touchpoints and attributes conversions to marketing channels
 * Supports multiple attribution models: last-click, first-click, linear, time-decay
 */

import mongoose from 'mongoose';

// Import models
import MarketingPost from '../models/MarketingPost.js';
import MarketingRevenue from '../models/MarketingRevenue.js';

class AttributionService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Step 1: Track user touchpoints
   * Extract touchpoints from content performance data
   */
  async trackTouchpoints(filters = {}) {
    const cacheKey = `touchpoints_${JSON.stringify(filters)}`;

    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const { startDate, endDate, platform } = filters;

      // Build query
      const query = { status: 'posted' };

      if (startDate || endDate) {
        query.postedAt = {};
        if (startDate) query.postedAt.$gte = new Date(startDate);
        if (endDate) query.postedAt.$lte = new Date(endDate);
      }

      if (platform) {
        query.platform = platform;
      }

      // Fetch posted content with performance metrics
      const posts = await MarketingPost.find(query).lean();

      // Extract touchpoints from posts
      const touchpoints = posts.map(post => ({
        id: post._id,
        type: 'content_view',
        channel: post.platform,
        platform: post.platform,
        contentId: post._id,
        timestamp: post.postedAt || post.createdAt,
        metrics: {
          views: post.performanceMetrics?.views || 0,
          likes: post.performanceMetrics?.likes || 0,
          comments: post.performanceMetrics?.comments || 0,
          shares: post.performanceMetrics?.shares || 0,
          engagementRate: post.performanceMetrics?.engagementRate || 0
        },
        metadata: {
          title: post.title,
          storyCategory: post.storyCategory,
          caption: post.caption,
          hashtags: post.hashtags
        }
      }));

      const result = {
        touchpoints,
        total: touchpoints.length,
        byChannel: this.groupByChannel(touchpoints),
        dateRange: {
          start: startDate || 'all time',
          end: endDate || 'present'
        }
      };

      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (error) {
      console.error('Error tracking touchpoints:', error);
      throw new Error(`Failed to track touchpoints: ${error.message}`);
    }
  }

  /**
   * Step 2: Model attribution (last click, multi-touch)
   * Apply attribution models to touchpoint data
   */
  async applyAttributionModel(touchpoints, model = 'last_click', revenueData = null) {
    try {
      // Group touchpoints by hypothetical user journeys
      // Since we don't have individual user tracking, we'll simulate journeys
      // based on temporal proximity and channel patterns

      const journeys = this.simulateJourneys(touchpoints);

      let attributions = [];

      switch (model) {
        case 'last_click':
          attributions = this.lastClickAttribution(journeys);
          break;
        case 'first_click':
          attributions = this.firstClickAttribution(journeys);
          break;
        case 'linear':
          attributions = this.linearAttribution(journeys);
          break;
        case 'time_decay':
          attributions = this.timeDecayAttribution(journeys);
          break;
        case 'position_based':
          attributions = this.positionBasedAttribution(journeys);
          break;
        default:
          throw new Error(`Unknown attribution model: ${model}`);
      }

      return {
        model,
        attributions,
        totalJourneys: journeys.length,
        totalConversions: journeys.filter(j => j.converted).length,
        summary: this.summarizeAttributions(attributions)
      };
    } catch (error) {
      console.error('Error applying attribution model:', error);
      throw new Error(`Failed to apply attribution model: ${error.message}`);
    }
  }

  /**
   * Simulate user journeys from touchpoints
   * Groups touchpoints into hypothetical conversion paths
   */
  simulateJourneys(touchpoints) {
    const journeys = [];
    const touchpointGroups = this.groupTouchpointsByTimeWindow(touchpoints, 7 * 24 * 60 * 60 * 1000); // 7 days

    for (const group of touchpointGroups) {
      // Sort by timestamp
      const sorted = group.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // Simulate conversion based on engagement
      const totalEngagement = sorted.reduce((sum, tp) => {
        return sum + (tp.metrics.views + tp.metrics.likes * 2 + tp.metrics.comments * 3 + tp.metrics.shares * 5);
      }, 0);

      // Assume conversion if engagement exceeds threshold
      const converted = totalEngagement > 1000;

      journeys.push({
        touchpoints: sorted,
        converted,
        conversionValue: converted ? this.estimateConversionValue(sorted) : 0,
        totalEngagement,
        path: sorted.map(tp => ({
          channel: tp.channel,
          timestamp: tp.timestamp,
          engagement: tp.metrics.engagementRate
        }))
      });
    }

    return journeys;
  }

  /**
   * Group touchpoints by time window to simulate user sessions
   */
  groupTouchpointsByTimeWindow(touchpoints, windowSize) {
    const groups = [];
    const used = new Set();

    for (let i = 0; i < touchpoints.length; i++) {
      if (used.has(i)) continue;

      const group = [touchpoints[i]];
      used.add(i);
      const baseTime = new Date(touchpoints[i].timestamp).getTime();

      // Find related touchpoints within time window
      for (let j = i + 1; j < touchpoints.length; j++) {
        if (used.has(j)) continue;

        const timeDiff = new Date(touchpoints[j].timestamp).getTime() - baseTime;
        if (timeDiff <= windowSize && timeDiff >= 0) {
          group.push(touchpoints[j]);
          used.add(j);
        }
      }

      if (group.length > 0) {
        groups.push(group);
      }
    }

    return groups;
  }

  /**
   * Estimate conversion value based on engagement
   */
  estimateConversionValue(touchpoints) {
    // Base subscription value
    const baseValue = 9.99; // Average subscription price

    // Adjust based on engagement quality
    const avgEngagement = touchpoints.reduce((sum, tp) => sum + tp.metrics.engagementRate, 0) / touchpoints.length;
    const multiplier = 1 + (avgEngagement / 100);

    return baseValue * multiplier;
  }

  /**
   * Last-click attribution: 100% credit to last touchpoint
   */
  lastClickAttribution(journeys) {
    const channelCredit = {};

    for (const journey of journeys) {
      if (!journey.converted || journey.touchpoints.length === 0) continue;

      const lastTouchpoint = journey.touchpoints[journey.touchpoints.length - 1];
      const channel = lastTouchpoint.channel;

      if (!channelCredit[channel]) {
        channelCredit[channel] = { credit: 0, conversions: 0, value: 0 };
      }

      channelCredit[channel].credit += 1;
      channelCredit[channel].conversions += 1;
      channelCredit[channel].value += journey.conversionValue;
    }

    return Object.entries(channelCredit).map(([channel, data]) => ({
      channel,
      creditPercentage: 100, // Last click gets 100%
      conversions: data.conversions,
      attributedValue: data.value,
      touchpoints: data.credit
    }));
  }

  /**
   * First-click attribution: 100% credit to first touchpoint
   */
  firstClickAttribution(journeys) {
    const channelCredit = {};

    for (const journey of journeys) {
      if (!journey.converted || journey.touchpoints.length === 0) continue;

      const firstTouchpoint = journey.touchpoints[0];
      const channel = firstTouchpoint.channel;

      if (!channelCredit[channel]) {
        channelCredit[channel] = { credit: 0, conversions: 0, value: 0 };
      }

      channelCredit[channel].credit += 1;
      channelCredit[channel].conversions += 1;
      channelCredit[channel].value += journey.conversionValue;
    }

    return Object.entries(channelCredit).map(([channel, data]) => ({
      channel,
      creditPercentage: 100,
      conversions: data.conversions,
      attributedValue: data.value,
      touchpoints: data.credit
    }));
  }

  /**
   * Linear attribution: Equal credit to all touchpoints
   */
  linearAttribution(journeys) {
    const channelCredit = {};

    for (const journey of journeys) {
      if (!journey.converted || journey.touchpoints.length === 0) continue;

      const creditPerTouchpoint = journey.conversionValue / journey.touchpoints.length;

      for (const touchpoint of journey.touchpoints) {
        const channel = touchpoint.channel;

        if (!channelCredit[channel]) {
          channelCredit[channel] = { credit: 0, conversions: 0, value: 0 };
        }

        channelCredit[channel].credit += 1;
        channelCredit[channel].value += creditPerTouchpoint;
      }

      // Count conversions for each channel involved
      const uniqueChannels = [...new Set(journey.touchpoints.map(tp => tp.channel))];
      for (const channel of uniqueChannels) {
        channelCredit[channel].conversions += 1;
      }
    }

    return Object.entries(channelCredit).map(([channel, data]) => ({
      channel,
      creditPercentage: null, // Varies by journey
      conversions: data.conversions,
      attributedValue: data.value,
      touchpoints: data.credit
    }));
  }

  /**
   * Time-decay attribution: More credit to recent touchpoints
   */
  timeDecayAttribution(journeys) {
    const channelCredit = {};
    const halfLifeDays = 7; // Credit halves every 7 days

    for (const journey of journeys) {
      if (!journey.converted || journey.touchpoints.length === 0) continue;

      const timestamps = journey.touchpoints.map(tp => new Date(tp.timestamp).getTime());
      const maxTime = Math.max(...timestamps);
      const minTime = Math.min(...timestamps);
      const timeSpan = maxTime - minTime;

      // Calculate decay weights
      const weights = journey.touchpoints.map(tp => {
        const age = maxTime - new Date(tp.timestamp).getTime();
        const daysSince = age / (24 * 60 * 60 * 1000);
        const weight = Math.pow(0.5, daysSince / halfLifeDays);
        return weight;
      });

      const totalWeight = weights.reduce((sum, w) => sum + w, 0);

      // Distribute conversion value based on weights
      for (let i = 0; i < journey.touchpoints.length; i++) {
        const touchpoint = journey.touchpoints[i];
        const channel = touchpoint.channel;
        const credit = journey.conversionValue * (weights[i] / totalWeight);

        if (!channelCredit[channel]) {
          channelCredit[channel] = { credit: 0, conversions: 0, value: 0 };
        }

        channelCredit[channel].credit += weights[i] / totalWeight;
        channelCredit[channel].value += credit;
      }

      // Count conversions
      const uniqueChannels = [...new Set(journey.touchpoints.map(tp => tp.channel))];
      for (const channel of uniqueChannels) {
        channelCredit[channel].conversions += 1;
      }
    }

    return Object.entries(channelCredit).map(([channel, data]) => ({
      channel,
      creditPercentage: null,
      conversions: data.conversions,
      attributedValue: data.value,
      touchpoints: data.credit
    }));
  }

  /**
   * Position-based attribution: 40% first, 40% last, 20% middle
   */
  positionBasedAttribution(journeys) {
    const channelCredit = {};

    for (const journey of journeys) {
      if (!journey.converted || journey.touchpoints.length === 0) continue;

      const numTouchpoints = journey.touchpoints.length;

      for (let i = 0; i < numTouchpoints; i++) {
        const touchpoint = journey.touchpoints[i];
        const channel = touchpoint.channel;

        let creditPercentage;
        if (numTouchpoints === 1) {
          creditPercentage = 1;
        } else if (i === 0) {
          creditPercentage = 0.4; // First touchpoint
        } else if (i === numTouchpoints - 1) {
          creditPercentage = 0.4; // Last touchpoint
        } else {
          creditPercentage = 0.2 / (numTouchpoints - 2); // Middle touchpoints
        }

        const credit = journey.conversionValue * creditPercentage;

        if (!channelCredit[channel]) {
          channelCredit[channel] = { credit: 0, conversions: 0, value: 0 };
        }

        channelCredit[channel].credit += creditPercentage;
        channelCredit[channel].value += credit;
      }

      const uniqueChannels = [...new Set(journey.touchpoints.map(tp => tp.channel))];
      for (const channel of uniqueChannels) {
        channelCredit[channel].conversions += 1;
      }
    }

    return Object.entries(channelCredit).map(([channel, data]) => ({
      channel,
      creditPercentage: null,
      conversions: data.conversions,
      attributedValue: data.value,
      touchpoints: data.credit
    }));
  }

  /**
   * Step 3: Attribute revenue to channels
   * Combine attribution results with actual revenue data
   */
  async attributeRevenue(filters = {}, model = 'last_click') {
    try {
      // Get touchpoints
      const touchpointsResult = await this.trackTouchpoints(filters);

      // Get revenue data
      const revenueQuery = {};
      if (filters.startDate || filters.endDate) {
        revenueQuery.date = {};
        if (filters.startDate) revenueQuery.date.$gte = new Date(filters.startDate);
        if (filters.endDate) revenueQuery.date.$lte = new Date(filters.endDate);
      }

      const revenueData = await MarketingRevenue.find(revenueQuery)
        .sort({ date: -1 })
        .lean();

      const totalRevenue = revenueData.reduce((sum, r) => sum + (r.netRevenue || 0), 0);

      // Apply attribution model
      const attributionResult = await this.applyAttributionModel(
        touchpointsResult.touchpoints,
        model,
        revenueData
      );

      // Scale attributed values to match actual revenue
      const totalAttributedValue = attributionResult.summary.totalAttributedValue || totalRevenue;
      const scalingFactor = totalRevenue / totalAttributedValue;

      const channelRevenue = attributionResult.attributions.map(attr => ({
        ...attr,
        attributedRevenue: attr.attributedValue * scalingFactor,
        attributedRevenuePercentage: (attr.attributedValue * scalingFactor / totalRevenue) * 100,
        scalingFactor
      }));

      return {
        model,
        totalRevenue,
        totalAttributedValue,
        scalingFactor,
        channelRevenue,
        touchpointsSummary: {
          total: touchpointsResult.total,
          byChannel: touchpointsResult.byChannel
        },
        revenueData: {
          records: revenueData.length,
          dateRange: revenueData.length > 0 ? {
            start: revenueData[revenueData.length - 1].date,
            end: revenueData[0].date
          } : null
        }
      };
    } catch (error) {
      console.error('Error attributing revenue:', error);
      throw new Error(`Failed to attribute revenue: ${error.message}`);
    }
  }

  /**
   * Step 4: Calculate attributed ROI
   * Calculate ROI for each channel based on attributed revenue and estimated costs
   */
  async calculateAttributedROI(filters = {}, model = 'last_click') {
    try {
      const revenueAttribution = await this.attributeRevenue(filters, model);

      // Estimate costs per channel (in production, these would come from actual spend data)
      const costEstimates = {
        tiktok: 0.50, // $0.50 per conversion
        instagram: 0.60,
        youtube_shorts: 0.70
      };

      const channelROI = revenueAttribution.channelRevenue.map(channel => {
        const costPerConversion = costEstimates[channel.channel] || 0.50;
        const estimatedCost = channel.conversions * costPerConversion;
        const attributedRevenue = channel.attributedRevenue || 0;
        const roi = estimatedCost > 0 ? ((attributedRevenue - estimatedCost) / estimatedCost) * 100 : 0;

        return {
          ...channel,
          estimatedCost,
          roi: roi.toFixed(2),
          profit: attributedRevenue - estimatedCost,
          profitMargin: attributedRevenue > 0 ? ((attributedRevenue - estimatedCost) / attributedRevenue) * 100 : 0,
          costPerConversion
        };
      });

      // Calculate overall ROI
      const totalCost = channelROI.reduce((sum, ch) => sum + ch.estimatedCost, 0);
      const totalRevenue = revenueAttribution.totalRevenue;
      const overallROI = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;

      return {
        ...revenueAttribution,
        channelROI,
        overall: {
          totalRevenue,
          totalCost,
          totalProfit: totalRevenue - totalCost,
          roi: overallROI.toFixed(2),
          profitMargin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0
        },
        costEstimates
      };
    } catch (error) {
      console.error('Error calculating attributed ROI:', error);
      throw new Error(`Failed to calculate attributed ROI: ${error.message}`);
    }
  }

  /**
   * Step 5: Display attribution report
   * Generate comprehensive attribution report
   */
  async generateAttributionReport(filters = {}, model = 'last_click') {
    try {
      const roiData = await this.calculateAttributedROI(filters, model);

      // Generate insights
      const insights = this.generateInsights(roiData);

      // Generate recommendations
      const recommendations = this.generateRecommendations(roiData);

      return {
        ...roiData,
        insights,
        recommendations,
        reportMetadata: {
          generatedAt: new Date().toISOString(),
          model,
          filters,
          dataQuality: this.assessDataQuality(roiData)
        }
      };
    } catch (error) {
      console.error('Error generating attribution report:', error);
      throw new Error(`Failed to generate attribution report: ${error.message}`);
    }
  }

  /**
   * Generate insights from attribution data
   */
  generateInsights(attributionData) {
    const insights = [];
    const { channelROI, overall } = attributionData;

    // Best performing channel
    const bestChannel = [...channelROI].sort((a, b) => b.roi - a.roi)[0];
    if (bestChannel) {
      insights.push({
        type: 'best_performer',
        priority: 'high',
        title: 'Best Performing Channel',
        description: `${bestChannel.channel.toUpperCase()} has the highest ROI at ${bestChannel.roi}%`,
        data: bestChannel
      });
    }

    // Most conversions
    const mostConversions = [...channelROI].sort((a, b) => b.conversions - a.conversions)[0];
    if (mostConversions) {
      insights.push({
        type: 'most_conversions',
        priority: 'high',
        title: 'Most Conversions',
        description: `${mostConversions.channel.toUpperCase()} drives the most conversions (${mostConversions.conversions})`,
        data: mostConversions
      });
    }

    // Highest revenue
    const highestRevenue = [...channelROI].sort((a, b) => b.attributedRevenue - a.attributedRevenue)[0];
    if (highestRevenue) {
      insights.push({
        type: 'highest_revenue',
        priority: 'high',
        title: 'Highest Revenue Contribution',
        description: `${highestRevenue.channel.toUpperCase()} contributes ${highestRevenue.attributedRevenuePercentage.toFixed(1)}% of total revenue`,
        data: highestRevenue
      });
    }

    // Overall profitability
    if (parseFloat(overall.roi) > 100) {
      insights.push({
        type: 'profitability',
        priority: 'high',
        title: 'Strong Overall ROI',
        description: `Overall marketing ROI is ${overall.roi}%, indicating healthy profitability`,
        data: overall
      });
    } else if (parseFloat(overall.roi) < 50) {
      insights.push({
        type: 'profitability',
        priority: 'medium',
        title: 'Low ROI Alert',
        description: `Overall marketing ROI is ${overall.roi}%. Consider optimizing spend allocation`,
        data: overall
      });
    }

    return insights;
  }

  /**
   * Generate recommendations from attribution data
   */
  generateRecommendations(attributionData) {
    const recommendations = [];
    const { channelROI } = attributionData;

    // Shift budget to high ROI channels
    const highROIChannels = channelROI.filter(ch => parseFloat(ch.roi) > 100);
    if (highROIChannels.length > 0) {
      recommendations.push({
        type: 'budget_reallocation',
        priority: 'high',
        title: 'Increase Budget for High ROI Channels',
        description: `Consider increasing spend on ${highROIChannels.map(ch => ch.channel).join(', ')} which show ROI > 100%`,
        impact: 'high',
        effort: 'low',
        channels: highROIChannels.map(ch => ch.channel)
      });
    }

    // Investigate low ROI channels
    const lowROIChannels = channelROI.filter(ch => parseFloat(ch.roi) < 50);
    if (lowROIChannels.length > 0) {
      recommendations.push({
        type: 'optimization',
        priority: 'medium',
        title: 'Optimize Low Performing Channels',
        description: `Review and optimize campaigns on ${lowROIChannels.map(ch => ch.channel).join(', ')} with ROI < 50%`,
        impact: 'medium',
        effort: 'medium',
        channels: lowROIChannels.map(ch => ch.channel)
      });
    }

    // Focus on best converter
    const bestConverter = [...channelROI].sort((a, b) => b.conversions - a.conversions)[0];
    if (bestConverter) {
      recommendations.push({
        type: 'scale_success',
        priority: 'medium',
        title: 'Scale Top Conversion Channel',
        description: `${bestConverter.channel.toUpperCase()} generates the most conversions. Consider scaling successful creatives`,
        impact: 'high',
        effort: 'medium',
        channel: bestConverter.channel
      });
    }

    return recommendations;
  }

  /**
   * Assess data quality
   */
  assessDataQuality(attributionData) {
    const { touchpointsSummary, revenueData, channelROI } = attributionData;

    let quality = 'medium';
    const issues = [];

    if (touchpointsSummary && touchpointsSummary.total < 10) {
      issues.push('Limited touchpoint data');
      quality = 'low';
    }

    if (!revenueData || !revenueData.records || revenueData.records === 0) {
      issues.push('No revenue data available');
      quality = 'low';
    }

    if (!channelROI || channelROI.length === 0) {
      issues.push('No channel attribution data');
      quality = 'low';
    }

    return { quality, issues };
  }

  /**
   * Helper: Group touchpoints by channel
   */
  groupByChannel(touchpoints) {
    const grouped = {};

    for (const tp of touchpoints) {
      if (!grouped[tp.channel]) {
        grouped[tp.channel] = [];
      }
      grouped[tp.channel].push(tp);
    }

    return Object.entries(grouped).map(([channel, tps]) => ({
      channel,
      count: tps.length,
      totalViews: tps.reduce((sum, tp) => sum + tp.metrics.views, 0),
      totalEngagement: tps.reduce((sum, tp) => sum + tp.metrics.engagementRate, 0) / tps.length
    }));
  }

  /**
   * Helper: Summarize attributions
   */
  summarizeAttributions(attributions) {
    return {
      totalConversions: attributions.reduce((sum, attr) => sum + attr.conversions, 0),
      totalAttributedValue: attributions.reduce((sum, attr) => sum + attr.attributedValue, 0),
      channelCount: attributions.length,
      topChannel: attributions.sort((a, b) => b.attributedValue - a.attributedValue)[0]
    };
  }

  /**
   * Compare attribution models
   */
  async compareModels(filters = {}) {
    try {
      const models = ['last_click', 'first_click', 'linear', 'time_decay', 'position_based'];
      const results = {};

      for (const model of models) {
        results[model] = await this.calculateAttributedROI(filters, model);
      }

      return {
        models,
        results,
        comparison: this.generateModelComparison(results)
      };
    } catch (error) {
      console.error('Error comparing models:', error);
      throw new Error(`Failed to compare models: ${error.message}`);
    }
  }

  /**
   * Generate model comparison
   */
  generateModelComparison(results) {
    const comparison = [];

    for (const [model, data] of Object.entries(results)) {
      comparison.push({
        model,
        totalROI: data.overall.roi,
        totalRevenue: data.overall.totalRevenue,
        totalCost: data.overall.totalCost,
        topChannel: data.channelROI.sort((a, b) => b.attributedRevenue - a.attributedRevenue)[0]?.channel
      });
    }

    return comparison;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

export default new AttributionService();
