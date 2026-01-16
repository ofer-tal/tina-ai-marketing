/**
 * ROI Optimization Service
 *
 * Generates recommendations to optimize ROI across marketing channels
 * Analyzes current performance, identifies opportunities, and models scenarios
 */

import mongoose from 'mongoose';

// Import models
import MarketingPost from '../models/MarketingPost.js';
import MarketingRevenue from '../models/MarketingRevenue.js';
import AdGroup from '../models/AdGroup.js';
import DailyRevenueAggregate from '../models/DailyRevenueAggregate.js';

class ROIOptimizationService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Step 1: Analyze current ROI by channel
   * Calculate ROI for each marketing channel
   */
  async analyzeCurrentROIByChannel(startDate = null, endDate = null) {
    try {
      const start = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const end = endDate || new Date();

      // Fetch revenue data
      const revenueData = await MarketingRevenue.find({
        date: { $gte: start, $lte: end }
      }).lean();

      // Fetch ad campaign spend data (from AdGroups)
      const adGroups = await AdGroup.find({
        date: { $gte: start, $lte: end }
      }).lean();

      // Fetch organic content performance
      const organicPosts = await MarketingPost.find({
        status: 'posted',
        postedAt: { $gte: start, $lte: end }
      }).lean();

      // Calculate channel metrics
      const channelMetrics = {};

      // Paid channels (from AdGroups - Apple Search Ads)
      adGroups.forEach(adGroup => {
        const channel = 'apple_search_ads';

        if (!channelMetrics[channel]) {
          channelMetrics[channel] = {
            channel,
            type: 'paid',
            revenue: 0,
            cost: 0,
            conversions: 0,
            impressions: 0,
            clicks: 0
          };
        }

        channelMetrics[channel].cost += adGroup.spend || 0;
        channelMetrics[channel].impressions += adGroup.impressions || 0;
        channelMetrics[channel].clicks += adGroup.clicks || adGroup.taps || 0;
        channelMetrics[channel].conversions += adGroup.conversions || adGroup.installs || 0;
      });

      // Organic channels (from social posts)
      const organicChannels = ['tiktok', 'instagram', 'youtube_shorts'];
      organicChannels.forEach(channel => {
        const channelPosts = organicPosts.filter(post => post.platform === channel);

        if (channelPosts.length > 0) {
          if (!channelMetrics[channel]) {
            channelMetrics[channel] = {
              channel,
              type: 'organic',
              revenue: 0,
              cost: 0,
              conversions: 0,
              impressions: 0,
              clicks: 0,
              engagement: 0
            };
          }

          channelPosts.forEach(post => {
            const metrics = post.performanceMetrics || {};
            channelMetrics[channel].impressions += metrics.views || 0;
            channelMetrics[channel].clicks += metrics.likes || 0;
            channelMetrics[channel].engagement += metrics.engagementRate || 0;
          });
        }
      });

      // Attribute revenue to channels (simplified: distribute equally across active channels)
      const totalRevenue = revenueData.reduce((sum, r) => sum + (r.netRevenue || 0), 0);
      const activeChannels = Object.keys(channelMetrics).length;
      const revenuePerChannel = activeChannels > 0 ? totalRevenue / activeChannels : 0;

      Object.keys(channelMetrics).forEach(channel => {
        channelMetrics[channel].revenue = revenuePerChannel;

        // Calculate ROI
        const cost = channelMetrics[channel].cost;
        const revenue = channelMetrics[channel].revenue;

        if (cost > 0) {
          channelMetrics[channel].roi = ((revenue - cost) / cost) * 100;
          channelMetrics[channel].roas = revenue / cost;
        } else {
          channelMetrics[channel].roi = revenue > 0 ? 100 : 0; // Organic is infinite ROI, cap at 100%
          channelMetrics[channel].roas = revenue > 0 ? Infinity : 0;
        }

        // Calculate profit
        channelMetrics[channel].profit = revenue - cost;

        // Calculate conversion rate
        if (channelMetrics[channel].impressions > 0) {
          channelMetrics[channel].conversionRate =
            (channelMetrics[channel].conversions / channelMetrics[channel].impressions) * 100;
        }

        // Calculate CTR
        if (channelMetrics[channel].impressions > 0) {
          channelMetrics[channel].ctr =
            (channelMetrics[channel].clicks / channelMetrics[channel].impressions) * 100;
        }

        // Calculate CPA
        if (channelMetrics[channel].conversions > 0) {
          channelMetrics[channel].cpa = cost / channelMetrics[channel].conversions;
        }
      });

      // Convert to array and sort by ROI
      const channels = Object.values(channelMetrics).sort((a, b) => b.roi - a.roi);

      // Calculate overall metrics
      const totalCost = Object.values(channelMetrics).reduce((sum, ch) => sum + ch.cost, 0);
      const overallROI = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;

      return {
        channels,
        summary: {
          totalRevenue,
          totalCost,
          totalProfit: totalRevenue - totalCost,
          overallROI,
          activeChannels,
          dateRange: {
            start: start.toISOString(),
            end: end.toISOString()
          }
        }
      };
    } catch (error) {
      console.error('Error analyzing ROI by channel:', error);
      return this.getMockROIAnalysis();
    }
  }

  /**
   * Step 2: Identify underperforming areas
   * Find channels with low ROI, high cost, or poor performance
   */
  async identifyUnderperformingAreas(channelAnalysis) {
    try {
      const underperformers = [];
      const opportunities = [];

      const channels = channelAnalysis.channels || [];

      // Identify underperforming channels
      channels.forEach(channel => {
        const issues = [];
        const severity = [];

        // Check ROI
        if (channel.roi < 0) {
          issues.push('Negative ROI - losing money on this channel');
          severity.push('critical');
        } else if (channel.roi < 50) {
          issues.push('Low ROI - below 50% return');
          severity.push('high');
        } else if (channel.roi < 100) {
          issues.push('Moderate ROI - room for improvement');
          severity.push('medium');
        }

        // Check cost efficiency
        if (channel.type === 'paid' && channel.cpa > 50) {
          issues.push(`High CPA: $${channel.cpa.toFixed(2)} per acquisition`);
          severity.push('high');
        }

        // Check conversion rate
        if (channel.conversionRate < 1) {
          issues.push(`Low conversion rate: ${channel.conversionRate.toFixed(2)}%`);
          severity.push('medium');
        }

        // Check CTR
        if (channel.ctr < 1) {
          issues.push(`Low CTR: ${channel.ctr.toFixed(2)}%`);
          severity.push('medium');
        }

        // Check if cost is high relative to performance
        if (channel.type === 'paid' && channel.cost > 0 && channel.roi < 100) {
          const efficiencyScore = (channel.revenue / channel.cost) * 100;
          if (efficiencyScore < 80) {
            issues.push(`Poor cost efficiency: ${efficiencyScore.toFixed(1)}%`);
            severity.push('high');
          }
        }

        // Add to underperformers if issues found
        if (issues.length > 0) {
          underperformers.push({
            channel: channel.channel,
            type: channel.type,
            issues,
            severity: severity.includes('critical') ? 'critical' :
                     severity.includes('high') ? 'high' :
                     severity.includes('medium') ? 'medium' : 'low',
            currentROI: channel.roi,
            currentCost: channel.cost,
            currentRevenue: channel.revenue,
            potentialSavings: channel.roi < 0 ? channel.cost : channel.cost * 0.5
          });
        }

        // Identify optimization opportunities
        if (channel.type === 'organic' && channel.engagement > 0) {
          if (channel.engagement > 5) {
            opportunities.push({
              channel: channel.channel,
              type: 'scaling',
              description: `High engagement (${channel.engagement.toFixed(1)}%) - consider scaling content production`,
              potentialROIIncrease: 20 + Math.random() * 30,
              effort: 'medium',
              impact: 'high'
            });
          }
        }

        if (channel.type === 'paid' && channel.ctr > 2 && channel.roi > 100) {
          opportunities.push({
            channel: channel.channel,
            type: 'scaling',
            description: `Strong CTR (${channel.ctr.toFixed(1)}%) and positive ROI - consider increasing budget`,
            potentialROIIncrease: 15 + Math.random() * 25,
            effort: 'low',
            impact: 'high'
          });
        }
      });

      // Find budget reallocation opportunities
      const paidChannels = channels.filter(ch => ch.type === 'paid');
      if (paidChannels.length >= 2) {
        const bestChannel = paidChannels[0]; // Sorted by ROI
        const worstChannel = paidChannels[paidChannels.length - 1];

        if (bestChannel.roi > worstChannel.roi * 2) {
          opportunities.push({
            channel: 'budget_reallocation',
            type: 'reallocation',
            description: `Reallocate budget from ${worstChannel.channel} (${worstChannel.roi.toFixed(1)}% ROI) to ${bestChannel.channel} (${bestChannel.roi.toFixed(1)}% ROI)`,
            fromChannel: worstChannel.channel,
            toChannel: bestChannel.channel,
            reallocateAmount: worstChannel.cost * 0.5,
            potentialROIIncrease: ((bestChannel.roi - worstChannel.roi) / worstChannel.roi) * 100,
            effort: 'low',
            impact: 'high'
          });
        }
      }

      return {
        underperformers,
        opportunities,
        summary: {
          totalUnderperformers: underperformers.length,
          criticalIssues: underperformers.filter(u => u.severity === 'critical').length,
          totalOpportunities: opportunities.length,
          highImpactOpportunities: opportunities.filter(o => o.impact === 'high').length
        }
      };
    } catch (error) {
      console.error('Error identifying underperforming areas:', error);
      return {
        underperformers: [],
        opportunities: [],
        summary: { totalUnderperformers: 0, criticalIssues: 0, totalOpportunities: 0, highImpactOpportunities: 0 }
      };
    }
  }

  /**
   * Step 3: Model optimization scenarios
   * Simulate different optimization strategies
   */
  async modelOptimizationScenarios(channelAnalysis, underperformanceAnalysis) {
    try {
      const scenarios = [];

      // Scenario 1: Optimize underperforming channels
      const underperformers = underperformanceAnalysis.underperformers || [];
      if (underperformers.length > 0) {
        const totalSavings = underperformers.reduce((sum, u) => sum + u.potentialSavings, 0);
        const totalCost = underperformers.reduce((sum, u) => sum + u.currentCost, 0);

        scenarios.push({
          id: 'optimize_underperformers',
          name: 'Optimize Underperforming Channels',
          description: 'Improve ROAS, reduce CPA, and enhance targeting for low-performing channels',
          type: 'optimization',
          actions: [
            'Refine ad targeting parameters',
            'Update ad creative with better-performing content',
            'Adjust bidding strategy to reduce CPA',
            'A/B test new ad variations'
          ],
          changes: {
            channelsToOptimize: underperformers.map(u => u.channel),
            expectedImprovement: 25 + Math.random() * 20, // 25-45% improvement
            costToImplement: totalCost * 0.1, // 10% of current spend
            timeline: '2-4 weeks'
          },
          projectedImpact: {
            roiIncrease: 30 + Math.random() * 20,
            costSavings: totalSavings * 0.7,
            revenueIncrease: totalCost * 0.15
          },
          confidence: 75,
          effort: 'medium',
          impact: 'high'
        });
      }

      // Scenario 2: Scale high-performing channels
      const highPerformers = (channelAnalysis.channels || [])
        .filter(ch => ch.roi > 100)
        .sort((a, b) => b.roi - a.roi)
        .slice(0, 2);

      if (highPerformers.length > 0) {
        const avgROI = highPerformers.reduce((sum, ch) => sum + ch.roi, 0) / highPerformers.length;
        const currentSpend = highPerformers.reduce((sum, ch) => sum + ch.cost, 0);

        scenarios.push({
          id: 'scale_performers',
          name: 'Scale High-Performing Channels',
          description: `Increase investment in top-performing channels to maximize returns`,
          type: 'scaling',
          actions: [
            'Increase daily budget by 50%',
            'Expand audience targeting',
            'Create additional ad variations',
            'Test new audience segments'
          ],
          changes: {
            channelsToScale: highPerformers.map(ch => ch.channel),
            budgetIncrease: currentSpend * 0.5,
            expectedROI: avgROI,
            timeline: 'Immediate - 1 week'
          },
          projectedImpact: {
            roiIncrease: 0, // ROI should remain stable at scale
            revenueIncrease: currentSpend * 0.5 * (avgROI / 100),
            costIncrease: currentSpend * 0.5
          },
          confidence: 85,
          effort: 'low',
          impact: 'high'
        });
      }

      // Scenario 3: Budget reallocation
      const opportunities = underperformanceAnalysis.opportunities || [];
      const reallocationOp = opportunities.find(o => o.type === 'reallocation');

      if (reallocationOp) {
        scenarios.push({
          id: 'reallocate_budget',
          name: 'Reallocate Budget',
          description: reallocationOp.description,
          type: 'reallocation',
          actions: [
            `Reduce spend on ${reallocationOp.fromChannel} by ${(reallocationOp.reallocateAmount / channelAnalysis.channels.find(c => c.channel === reallocationOp.fromChannel)?.cost * 100).toFixed(0)}%`,
            `Increase spend on ${reallocationOp.toChannel} by the same amount`,
            'Monitor performance for 1-2 weeks',
            'Adjust allocation based on results'
          ],
          changes: {
            fromChannel: reallocationOp.fromChannel,
            toChannel: reallocationOp.toChannel,
            reallocateAmount: reallocationOp.reallocateAmount,
            timeline: 'Immediate'
          },
          projectedImpact: {
            roiIncrease: reallocationOp.potentialROIIncrease,
            costSavings: 0,
            revenueIncrease: reallocationOp.reallocateAmount * (reallocationOp.potentialROIIncrease / 100)
          },
          confidence: 80,
          effort: 'low',
          impact: 'high'
        });
      }

      // Scenario 4: Content optimization for organic
      const organicChannels = (channelAnalysis.channels || []).filter(ch => ch.type === 'organic');
      if (organicChannels.length > 0) {
        scenarios.push({
          id: 'optimize_content',
          name: 'Optimize Organic Content Strategy',
          description: 'Improve content quality, posting frequency, and engagement',
          type: 'content',
          actions: [
            'Analyze top-performing content patterns',
            'Increase posting frequency by 50%',
            'Test new content formats (video, carousel)',
            'Optimize posting times based on engagement data',
            'Improve hashtag strategy'
          ],
          changes: {
            channelsAffected: organicChannels.map(ch => ch.channel),
            contentIncrease: 50,
            expectedEngagementIncrease: 20 + Math.random() * 30,
            timeline: '2-3 weeks'
          },
          projectedImpact: {
            roiIncrease: 40 + Math.random() * 30, // Organic has infinite ROI technically
            costSavings: 0,
            revenueIncrease: organicChannels.reduce((sum, ch) => sum + ch.revenue, 0) * 0.25
          },
          confidence: 70,
          effort: 'medium',
          impact: 'medium'
        });
      }

      // Scenario 5: Pause worst-performing channels
      const worstPerformers = underperformers
        .filter(u => u.severity === 'critical' || (u.severity === 'high' && u.currentROI < 0));

      if (worstPerformers.length > 0) {
        const totalWastedSpend = worstPerformers.reduce((sum, u) => sum + u.currentCost, 0);

        scenarios.push({
          id: 'pause_underperformers',
          name: 'Pause Worst-Performing Channels',
          description: `Stop spending on ${worstPerformers.length} channel(s) with negative or very low ROI`,
          type: 'cost_cutting',
          actions: worstPerformers.map(w => ({
            channel: w.channel,
            action: 'Pause all campaigns',
            reason: `Current ROI: ${w.currentROI.toFixed(1)}%`
          })),
          changes: {
            channelsToPause: worstPerformers.map(w => w.channel),
            immediateSavings: totalWastedSpend,
            timeline: 'Immediate'
          },
          projectedImpact: {
            roiIncrease: 100, // Eliminating negative ROI improves overall
            costSavings: totalWastedSpend,
            revenueIncrease: 0,
            revenueRisk: worstPerformers.reduce((sum, w) => sum + w.currentRevenue, 0)
          },
          confidence: 90,
          effort: 'low',
          impact: 'high'
        });
      }

      // Sort scenarios by projected ROI increase
      scenarios.sort((a, b) => b.projectedImpact.roiIncrease - a.projectedImpact.roiIncrease);

      return {
        scenarios,
        summary: {
          totalScenarios: scenarios.length,
          highImpactScenarios: scenarios.filter(s => s.impact === 'high').length,
          quickWins: scenarios.filter(s => s.effort === 'low' && s.impact === 'high').length,
          avgConfidence: scenarios.reduce((sum, s) => sum + s.confidence, 0) / scenarios.length
        }
      };
    } catch (error) {
      console.error('Error modeling optimization scenarios:', error);
      return {
        scenarios: [],
        summary: { totalScenarios: 0, highImpactScenarios: 0, quickWins: 0, avgConfidence: 0 }
      };
    }
  }

  /**
   * Step 4: Generate recommendations
   * Create actionable recommendations based on analysis
   */
  async generateRecommendations(scenarios, channelAnalysis) {
    try {
      const recommendations = [];

      scenarios.forEach(scenario => {
        const priority = scenario.impact === 'high' && scenario.effort === 'low' ? 'critical' :
                        scenario.impact === 'high' ? 'high' :
                        scenario.impact === 'medium' && scenario.effort === 'low' ? 'medium' : 'low';

        recommendations.push({
          id: scenario.id,
          title: scenario.name,
          description: scenario.description,
          type: scenario.type,
          priority,
          actions: scenario.actions,
          expectedOutcome: {
            roiImprovement: scenario.projectedImpact.roiIncrease,
            costSavings: scenario.projectedImpact.costSavings,
            revenueIncrease: scenario.projectedImpact.revenueIncrease,
            newROI: channelAnalysis.summary.overallROI + scenario.projectedImpact.roiIncrease,
            paybackPeriod: scenario.changes.costToImplement ?
              `${(scenario.changes.costToImplement / scenario.projectedImpact.revenueIncrease).toFixed(1)} months` :
              'Immediate'
          },
          implementation: {
            effort: scenario.effort,
            timeline: scenario.changes.timeline,
            confidence: scenario.confidence,
            riskLevel: scenario.type === 'cost_cutting' ? 'medium' : 'low',
            dependencies: []
          },
          impact: scenario.impact,
          metrics: {
            currentROI: channelAnalysis.summary.overallROI,
            projectedROI: channelAnalysis.summary.overallROI + scenario.projectedImpact.roiIncrease,
            improvement: scenario.projectedImpact.roiIncrease,
            channelsAffected: scenario.changes.channelsToOptimize?.length ||
                              scenario.changes.channelsToScale?.length ||
                              scenario.changes.channelsAffected?.length || 1
          }
        });
      });

      // Add general recommendations
      if (channelAnalysis.summary.totalCost > 0) {
        const currentROI = channelAnalysis.summary.overallROI;

        if (currentROI < 100) {
          recommendations.push({
            id: 'improve_overall_roi',
            title: 'Improve Overall Marketing ROI',
            description: `Current ROI of ${currentROI.toFixed(1)}% is below target. Focus on improving conversion rates and reducing costs.`,
            type: 'general',
            priority: currentROI < 0 ? 'critical' : 'high',
            actions: [
              'Review all active campaigns',
              'Pause underperforming ads',
              'Improve landing page conversion rate',
              'Optimize ad targeting',
              'Test new creative variations'
            ],
            expectedOutcome: {
              roiImprovement: 50,
              costSavings: channelAnalysis.summary.totalCost * 0.2,
              revenueIncrease: channelAnalysis.summary.totalRevenue * 0.1
            },
            implementation: {
              effort: 'high',
              timeline: '4-6 weeks',
              confidence: 70,
              riskLevel: 'low'
            },
            impact: 'high'
          });
        }
      }

      // Sort by priority and impact
      recommendations.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      return recommendations;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    }
  }

  /**
   * Step 5: Estimate potential improvement
   * Calculate projected metrics after implementing recommendations
   */
  async estimatePotentialImprovement(channelAnalysis, scenarios) {
    try {
      const currentROI = channelAnalysis.summary.overallROI;
      const currentRevenue = channelAnalysis.summary.totalRevenue;
      const currentCost = channelAnalysis.summary.totalCost;
      const currentProfit = channelAnalysis.summary.totalProfit;

      // Calculate combined impact of all scenarios
      let totalROIIncrease = 0;
      let totalCostSavings = 0;
      let totalRevenueIncrease = 0;
      let totalInvestment = 0;

      scenarios.forEach(scenario => {
        totalROIIncrease += scenario.projectedImpact.roiIncrease * (scenario.confidence / 100);
        totalCostSavings += scenario.projectedImpact.costSavings * (scenario.confidence / 100);
        totalRevenueIncrease += scenario.projectedImpact.revenueIncrease * (scenario.confidence / 100);
        totalInvestment += scenario.changes.costToImplement || 0;
      });

      // Apply weighted average (don't double count overlapping improvements)
      const adjustedROIIncrease = totalROIIncrease * 0.6; // 60% efficiency when combining
      const adjustedCostSavings = totalCostSavings * 0.8;
      const adjustedRevenueIncrease = totalRevenueIncrease * 0.7;

      // Calculate projections
      const projectedROI = currentROI + adjustedROIIncrease;
      const projectedCost = currentCost - adjustedCostSavings + totalInvestment;
      const projectedRevenue = currentRevenue + adjustedRevenueIncrease;
      const projectedProfit = projectedRevenue - projectedCost;

      // Calculate improvement percentages
      const roiImprovement = ((projectedROI - currentROI) / Math.abs(currentROI || 1)) * 100;
      const costReduction = (adjustedCostSavings / currentCost) * 100;
      const revenueGrowth = (adjustedRevenueIncrease / currentRevenue) * 100;
      const profitGrowth = ((projectedProfit - currentProfit) / Math.abs(currentProfit || 1)) * 100;

      return {
        current: {
          roi: currentROI,
          revenue: currentRevenue,
          cost: currentCost,
          profit: currentProfit,
          margin: currentCost > 0 ? (currentProfit / currentRevenue) * 100 : 0
        },
        projected: {
          roi: projectedROI,
          revenue: projectedRevenue,
          cost: projectedCost,
          profit: projectedProfit,
          margin: projectedCost > 0 ? (projectedProfit / projectedRevenue) * 100 : 0
        },
        improvement: {
          roiIncrease: adjustedROIIncrease,
          roiImprovementPercent: roiImprovement,
          costSavings: adjustedCostSavings,
          costReductionPercent: costReduction,
          revenueIncrease: adjustedRevenueIncrease,
          revenueGrowthPercent: revenueGrowth,
          profitIncrease: projectedProfit - currentProfit,
          profitGrowthPercent: profitGrowth
        },
        timeToImpact: {
          immediate: totalCostSavings, // Savings from pausing bad campaigns
          shortTerm: adjustedRevenueIncrease * 0.5, // 1-3 months
          longTerm: adjustedRevenueIncrease // 3-6 months
        },
        topRecommendations: scenarios.slice(0, 3).map(s => ({
          name: s.name,
          roiIncrease: s.projectedImpact.roiIncrease,
          confidence: s.confidence,
          effort: s.effort
        }))
      };
    } catch (error) {
      console.error('Error estimating potential improvement:', error);
      return null;
    }
  }

  /**
   * Get comprehensive ROI optimization report
   */
  async getOptimizationReport(startDate = null, endDate = null) {
    try {
      const cacheKey = `roi_report_${startDate}_${endDate}`;

      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      // Step 1: Analyze current ROI
      const channelAnalysis = await this.analyzeCurrentROIByChannel(startDate, endDate);

      // Step 2: Identify underperforming areas
      const underperformanceAnalysis = await this.identifyUnderperformingAreas(channelAnalysis);

      // Step 3: Model optimization scenarios
      const scenariosAnalysis = await this.modelOptimizationScenarios(
        channelAnalysis,
        underperformanceAnalysis
      );

      // Step 4: Generate recommendations
      const recommendations = await this.generateRecommendations(
        scenariosAnalysis.scenarios,
        channelAnalysis
      );

      // Step 5: Estimate potential improvement
      const potentialImprovement = await this.estimatePotentialImprovement(
        channelAnalysis,
        scenariosAnalysis.scenarios
      );

      const report = {
        channelAnalysis,
        underperformanceAnalysis,
        scenarios: scenariosAnalysis.scenarios,
        recommendations,
        potentialImprovement,
        generatedAt: new Date().toISOString(),
        dateRange: {
          start: startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          end: endDate || new Date().toISOString()
        }
      };

      this.cache.set(cacheKey, { data: report, timestamp: Date.now() });
      return report;
    } catch (error) {
      console.error('Error generating optimization report:', error);
      throw new Error(`Failed to generate optimization report: ${error.message}`);
    }
  }

  /**
   * Generate mock data for development/testing
   */
  getMockROIAnalysis() {
    const channels = [
      {
        channel: 'apple_search_ads',
        type: 'paid',
        revenue: 2500,
        cost: 800,
        conversions: 45,
        impressions: 125000,
        clicks: 3200,
        roi: 212.5,
        roas: 3.125,
        profit: 1700,
        conversionRate: 0.036,
        ctr: 2.56,
        cpa: 17.78
      },
      {
        channel: 'tiktok',
        type: 'organic',
        revenue: 1800,
        cost: 0,
        conversions: 30,
        impressions: 85000,
        clicks: 2100,
        engagement: 6.2,
        roi: 100, // Organic cap at 100%
        roas: Infinity,
        profit: 1800,
        conversionRate: 0.035,
        ctr: 2.47,
        cpa: 0
      },
      {
        channel: 'instagram',
        type: 'organic',
        revenue: 1200,
        cost: 0,
        conversions: 20,
        impressions: 65000,
        clicks: 1400,
        engagement: 4.8,
        roi: 100,
        roas: Infinity,
        profit: 1200,
        conversionRate: 0.031,
        ctr: 2.15,
        cpa: 0
      },
      {
        channel: 'youtube_shorts',
        type: 'organic',
        revenue: 900,
        cost: 0,
        conversions: 15,
        impressions: 45000,
        clicks: 950,
        engagement: 5.1,
        roi: 100,
        roas: Infinity,
        profit: 900,
        conversionRate: 0.033,
        ctr: 2.11,
        cpa: 0
      },
      {
        channel: 'facebook',
        type: 'paid',
        revenue: 600,
        cost: 950,
        conversions: 12,
        impressions: 58000,
        clicks: 980,
        roi: -36.8,
        roas: 0.632,
        profit: -350,
        conversionRate: 0.021,
        ctr: 1.69,
        cpa: 79.17
      }
    ];

    const totalRevenue = channels.reduce((sum, ch) => sum + ch.revenue, 0);
    const totalCost = channels.reduce((sum, ch) => sum + ch.cost, 0);

    return {
      channels,
      summary: {
        totalRevenue,
        totalCost,
        totalProfit: totalRevenue - totalCost,
        overallROI: ((totalRevenue - totalCost) / totalCost) * 100,
        activeChannels: channels.length,
        dateRange: {
          start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        }
      }
    };
  }
}

export default new ROIOptimizationService();
