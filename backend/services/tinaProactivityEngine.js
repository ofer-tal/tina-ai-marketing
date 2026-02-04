/**
 * Tina Proactivity Rules Engine
 *
 * Centralized rules for proactive monitoring and observation creation.
 * Determines when Tina should create observations based on:
 * - Goal trajectory analysis
 * - Anomaly detection (sudden metric changes)
 * - Strategy stagnation detection
 * - Strategy overperformance detection
 */

import { getLogger } from '../utils/logger.js';
import MarketingGoal from '../models/MarketingGoal.js';
import MarketingStrategy from '../models/MarketingStrategy.js';
import TinaObservation from '../models/TinaObservation.js';
import { generateObservationId } from '../utils/tinaIdGenerator.js';
import configService from './config.js';

const logger = getLogger('services', 'tina-proactivity');

// Configuration thresholds with defaults
const TRAJECTORY_WARNING_THRESHOLD = configService.get('TINA_GOAL_TRAJECTORY_WARNING_THRESHOLD', 0.8);
const ANOMALY_DROP_PERCENT = configService.get('TINA_ANOMALY_DETECTION_DROP_PERCENT', 25);
const ANOMALY_SPIKE_PERCENT = configService.get('TINA_ANOMALY_DETECTION_SPIKE_PERCENT', 50);
const STRATEGY_STAGNANT_DAYS = configService.get('TINA_STRATEGY_STAGNANT_DAYS', 7);

/**
 * Main class for proactivity rules
 */
class ProactivityRules {
  /**
   * Check goal trajectory and create alert if behind
   */
  async checkGoalTrajectory(goal) {
    try {
      const now = new Date();
      const totalDuration = goal.targetDate.getTime() - goal.startDate.getTime();
      const elapsed = now.getTime() - goal.startDate.getTime();
      const expectedProgress = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;

      // Skip if too early to tell
      if (expectedProgress < 10) {
        return { trigger: false };
      }

      const valueProgress = goal.progressPercent || 0;

      // Check if behind trajectory
      if (valueProgress < expectedProgress * TRAJECTORY_WARNING_THRESHOLD) {
        const gap = expectedProgress - valueProgress;
        const urgency = gap > 30 ? 'critical' : gap > 15 ? 'high' : 'medium';

        return {
          trigger: true,
          urgency,
          category: 'risk',
          title: `Goal "${goal.name}" is behind trajectory`,
          message: `Goal is ${gap.toFixed(0)}% behind schedule (${valueProgress.toFixed(0)}% vs expected ${expectedProgress.toFixed(0)}%)`,
          details: {
            metric: goal.type,
            value: goal.currentValue,
            previousValue: goal.startValue,
            changePercent: valueProgress,
            changeDirection: 'up',
            context: `Target: ${goal.targetValue}, Current: ${goal.currentValue}`
          },
          suggestedActions: [
            {
              toolName: 'get_goal_progress',
              parameters: { goalId: goal.goalId },
              rationale: 'Review detailed progress breakdown and trajectory',
              priority: urgency
            }
          ]
        };
      }

      // Check if ahead of trajectory (positive reinforcement)
      if (valueProgress > expectedProgress * 1.2) {
        const ahead = valueProgress - expectedProgress;
        return {
          trigger: true,
          urgency: 'low',
          category: 'opportunity',
          title: `Goal "${goal.name}" is ahead of schedule`,
          message: `Great progress! Goal is ${ahead.toFixed(0)}% ahead of schedule`,
          details: {
            metric: goal.type,
            value: goal.currentValue,
            changePercent: valueProgress,
            context: 'Ahead of trajectory'
          }
        };
      }

      return { trigger: false };

    } catch (error) {
      logger.error('Error checking goal trajectory', {
        goalId: goal.goalId,
        error: error.message
      });
      return { trigger: false };
    }
  }

  /**
   * Detect anomalies in metrics (sudden drops or spikes)
   * Compares current metrics against previous period
   */
  async checkAnomalyDetection() {
    try {
      const observations = [];

      // This is a placeholder for anomaly detection
      // In production, you would integrate with your actual metrics APIs
      // to get today's vs yesterday's metrics

      // Example patterns for anomaly detection:

      /*
      const metrics = ['revenue', 'engagement', 'installs'];

      for (const metric of metrics) {
        const today = await getMetricToday(metric);
        const yesterday = await getMetricYesterday(metric);

        if (yesterday === 0) continue; // Avoid division by zero

        const percentChange = ((today - yesterday) / yesterday) * 100;

        // Check for drop
        if (percentChange < -ANOMALY_DROP_PERCENT) {
          observations.push({
            trigger: true,
            urgency: 'critical',
            category: 'risk',
            title: `Sudden ${metric} drop detected`,
            message: `${metric} dropped by ${Math.abs(percentChange).toFixed(0)}% in 24h`,
            details: {
              metric,
              value: today,
              previousValue: yesterday,
              changePercent: percentChange,
              changeDirection: 'down'
            }
          });
        }

        // Check for spike (opportunity)
        if (percentChange > ANOMALY_SPIKE_PERCENT) {
          observations.push({
            trigger: true,
            urgency: 'high',
            category: 'opportunity',
            title: `Sudden ${metric} spike detected`,
            message: `${metric} increased by ${percentChange.toFixed(0)}% in 24h`,
            details: {
              metric,
              value: today,
              previousValue: yesterday,
              changePercent: percentChange,
              changeDirection: 'up'
            }
          });
        }
      }
      */

      return observations;

    } catch (error) {
      logger.error('Error in anomaly detection', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Check if a strategy has gone stale (active but no progress)
   */
  async checkStrategyStagnation(strategy) {
    try {
      const daysSinceUpdate = Math.floor(
        (Date.now() - strategy.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceUpdate < STRATEGY_STAGNANT_DAYS) {
        return { trigger: false };
      }

      // Check if there's any positive progress
      const hasProgress = strategy.currentValue > (strategy.currentBaseline || 0);

      if (!hasProgress) {
        return {
          trigger: true,
          urgency: 'medium',
          category: 'risk',
          title: `Strategy "${strategy.name}" is stagnant`,
          message: `Strategy has been active for ${daysSinceUpdate} days with no progress`,
          details: {
            metric: strategy.successMetric,
            value: strategy.currentValue,
            previousValue: strategy.currentBaseline,
            context: `No progress after ${daysSinceUpdate} days`
          },
          suggestedActions: [
            {
              toolName: 'pause_strategy',
              parameters: {
                strategyId: strategy.strategyId,
                reason: `No progress after ${daysSinceUpdate} days`
              },
              rationale: 'Consider pausing to re-evaluate approach',
              priority: 'medium'
            },
            {
              toolName: 'get_strategy_details',
              parameters: { strategyId: strategy.strategyId },
              rationale: 'Review strategy details before deciding',
              priority: 'low'
            }
          ]
        };
      }

      return { trigger: false };

    } catch (error) {
      logger.error('Error checking strategy stagnation', {
        strategyId: strategy.strategyId,
        error: error.message
      });
      return { trigger: false };
    }
  }

  /**
   * Check if a strategy is overperforming (at 2x expected progress)
   */
  async checkStrategyOverperformance(strategy) {
    try {
      if (!strategy.timeframe || !strategy.timeframe.start) {
        return { trigger: false };
      }

      const now = new Date();
      const startDate = new Date(strategy.timeframe.start);
      const daysSinceStart = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));

      // Need at least 7 days of data
      if (daysSinceStart < 7) {
        return { trigger: false };
      }

      const target = strategy.targetValue;
      const baseline = strategy.currentBaseline || 0;
      const current = strategy.currentValue || 0;
      const range = target - baseline;

      if (range <= 0) {
        return { trigger: false };
      }

      const progress = ((current - baseline) / range) * 100;
      const daysTotal = strategy.timeframe?.end
        ? Math.floor((new Date(strategy.timeframe.end) - startDate) / (1000 * 60 * 60 * 24))
        : 30;

      const expectedProgress = (daysSinceStart / daysTotal) * 100;

      // Check if at 2x or more of expected progress
      if (progress >= expectedProgress * 2 && progress < 100) {
        return {
          trigger: true,
          urgency: 'medium',
          category: 'opportunity',
          title: `Strategy "${strategy.name}" is overperforming`,
          message: `Strategy is at ${progress.toFixed(0)}% vs expected ${expectedProgress.toFixed(0)}% - consider scaling up`,
          details: {
            metric: strategy.successMetric,
            value: current,
            previousValue: baseline,
            changePercent: progress,
            context: 'Overperforming by 2x or more'
          },
          suggestedActions: [
            {
              toolName: 'get_strategy_details',
              parameters: { strategyId: strategy.strategyId },
              rationale: 'Review strategy details to understand success factors',
              priority: 'medium'
            }
          ]
        };
      }

      return { trigger: false };

    } catch (error) {
      logger.error('Error checking strategy overperformance', {
        strategyId: strategy.strategyId,
        error: error.message
      });
      return { trigger: false };
    }
  }

  /**
   * Create an observation from a rule trigger
   */
  async createObservation(ruleResult, relatedGoalId = null, relatedStrategyId = null) {
    try {
      if (!ruleResult || !ruleResult.trigger) {
        return null;
      }

      const observation = new TinaObservation({
        observationId: generateObservationId(),
        urgency: ruleResult.urgency || 'medium',
        category: ruleResult.category || 'general',
        title: ruleResult.title || 'System Observation',
        summary: ruleResult.message || '',
        details: ruleResult.details || {},
        relatedGoalId,
        relatedStrategyId,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        tags: ruleResult.tags || []
      });

      // Add action request if suggested actions provided
      if (ruleResult.suggestedActions && ruleResult.suggestedActions.length > 0) {
        observation.actionRequest = {
          type: ruleResult.suggestedActions[0].toolName,
          description: ruleResult.suggestedActions[0].rationale,
          parameters: ruleResult.suggestedActions[0].parameters,
          estimatedEffort: ruleResult.suggestedActions[0].priority || 'medium'
        };
        observation.autoExecutable = true;
      }

      await observation.save();

      logger.info('Observation created from proactivity rule', {
        observationId: observation.observationId,
        category: ruleResult.category,
        urgency: ruleResult.urgency
      });

      return observation;

    } catch (error) {
      logger.error('Error creating observation', {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Run all proactivity checks
   * Main entry point for the monitoring job
   */
  async runAllChecks() {
    logger.info('Running proactivity rule checks');

    const observations = [];
    let checksRun = 0;

    try {
      // Check all active goals for trajectory issues
      const activeGoals = await MarketingGoal.find({
        status: { $in: ['active', 'at_risk'] }
      });

      for (const goal of activeGoals) {
        const result = await this.checkGoalTrajectory(goal);
        if (result.trigger) {
          const obs = await this.createObservation(result, goal.goalId, null);
          if (obs) observations.push(obs);
        }
        checksRun++;
      }

      // Check all active strategies for stagnation or overperformance
      const activeStrategies = await MarketingStrategy.find({
        status: 'active'
      });

      for (const strategy of activeStrategies) {
        // Check for stagnation
        const stagnationResult = await this.checkStrategyStagnation(strategy);
        if (stagnationResult.trigger) {
          const obs = await this.createObservation(null, null, strategy.strategyId);
          if (obs) {
            obs.title = stagnationResult.title;
            obs.summary = stagnationResult.message;
            obs.details = stagnationResult.details;
            obs.suggestedActions = stagnationResult.suggestedActions;
            await obs.save();
            observations.push(obs);
          }
        }

        // Check for overperformance
        const overperformanceResult = await this.checkStrategyOverperformance(strategy);
        if (overperformanceResult.trigger) {
          const obs = await this.createObservation(null, null, strategy.strategyId);
          if (obs) {
            obs.title = overperformanceResult.title;
            obs.summary = overperformanceResult.message;
            obs.details = overperformanceResult.details;
            obs.suggestedActions = overperformanceResult.suggestedActions;
            await obs.save();
            observations.push(obs);
          }
        }

        checksRun++;
      }

      // Run anomaly detection
      const anomalyResults = await this.checkAnomalyDetection();
      for (const anomaly of anomalyResults) {
        const obs = await this.createObservation(anomaly);
        if (obs) observations.push(obs);
      }
      checksRun++;

      logger.info('Proactivity checks completed', {
        checksRun,
        observationsCreated: observations.length
      });

      return {
        success: true,
        checksRun,
        observationsCreated: observations.length,
        observations
      };

    } catch (error) {
      logger.error('Error running proactivity checks', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}

// Create singleton instance
const proactivityRules = new ProactivityRules();

export default proactivityRules;
