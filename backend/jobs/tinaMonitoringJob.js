/**
 * Tina Monitoring Job
 *
 * Runs every 6 hours to perform proactive monitoring checks.
 * Uses the proactivity rules engine to detect:
 * - Goals behind trajectory
 * - Strategy stagnation
 * - Strategy overperformance
 * - Metric anomalies
 *
 * Schedule: Every 6 hours (cron: 0 star-slash-6 star star star)
 */

import { getLogger } from '../utils/logger.js';
import proactivityRules from '../services/tinaProactivityEngine.js';
import MarketingGoal from '../models/MarketingGoal.js';
import MarketingStrategy from '../models/MarketingStrategy.js';
import TinaObservation from '../models/TinaObservation.js';
import { generateObservationId } from '../utils/tinaIdGenerator.js';

const logger = getLogger('jobs', 'tina-monitoring');

/**
 * Check goal health and create observations if needed
 */
async function checkGoalHealth(goal) {
  try {
    // Check if goal is overdue
    const now = new Date();
    if (goal.targetDate < now && goal.status !== 'achieved' && goal.status !== 'missed') {
      return {
        needsAlert: true,
        urgency: 'critical',
        type: 'goal_overdue',
        goal
      };
    }

    // Check if goal is approaching deadline (within 7 days)
    const daysUntilDeadline = Math.ceil((goal.targetDate - now) / (1000 * 60 * 60 * 24));
    if (daysUntilDeadline <= 7 && daysUntilDeadline > 0) {
      const range = goal.targetValue - goal.startValue;
      const current = goal.currentValue - goal.startValue;
      const progress = range > 0 ? (current / range) * 100 : 0;

      if (progress < 80) {
        return {
          needsAlert: true,
          urgency: daysUntilDeadline <= 3 ? 'critical' : 'high',
          type: 'goal_deadline_approaching',
          goal,
          context: `Only ${daysUntilDeadline} days remaining, ${progress.toFixed(0)}% complete`
        };
      }
    }

    // Check trajectory via proactivity rules
    const trajectoryResult = await proactivityRules.checkGoalTrajectory(goal);
    if (trajectoryResult.trigger) {
      return {
        needsAlert: true,
        urgency: trajectoryResult.urgency,
        type: 'goal_trajectory',
        goal,
        ruleResult: trajectoryResult
      };
    }

    return { needsAlert: false };

  } catch (error) {
    logger.error('Error checking goal health', {
      goalId: goal.goalId,
      error: error.message
    });
    return { needsAlert: false };
  }
}

/**
 * Check strategy performance and create observations if needed
 */
async function checkStrategyPerformance(strategy) {
  try {
    // Check for stagnation
    const stagnationResult = await proactivityRules.checkStrategyStagnation(strategy);
    if (stagnationResult.trigger) {
      return {
        needsAlert: true,
        urgency: stagnationResult.urgency,
        type: 'strategy_stagnant',
        strategy,
        ruleResult: stagnationResult
      };
    }

    // Check for overperformance
    const overperformanceResult = await proactivityRules.checkStrategyOverperformance(strategy);
    if (overperformanceResult.trigger) {
      return {
        needsAlert: true,
        urgency: overperformanceResult.urgency,
        type: 'strategy_overperforming',
        strategy,
        ruleResult: overperformanceResult
      };
    }

    return { needsAlert: false };

  } catch (error) {
    logger.error('Error checking strategy performance', {
      strategyId: strategy.strategyId,
      error: error.message
    });
    return { needsAlert: false };
  }
}

/**
 * Create an observation from a check result
 */
async function createObservationForResult(result) {
  try {
    const observation = new TinaObservation({
      observationId: generateObservationId(),
      urgency: result.urgency || 'medium',
      category: result.urgency === 'critical' || result.urgency === 'high' ? 'risk' : 'opportunity',
      title: result.ruleResult?.title || getDefaultTitle(result.type),
      summary: result.ruleResult?.message || getDefaultSummary(result),
      details: result.ruleResult?.details || {},
      relatedGoalId: result.goal?.goalId || null,
      relatedStrategyId: result.strategy?.strategyId || null,
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      tags: [result.type]
    });

    // Add action request if available
    if (result.ruleResult?.suggestedActions && result.ruleResult.suggestedActions.length > 0) {
      const action = result.ruleResult.suggestedActions[0];
      observation.actionRequest = {
        type: action.toolName,
        description: action.rationale,
        parameters: action.parameters,
        estimatedEffort: action.priority || 'medium'
      };
      observation.autoExecutable = true;
    }

    await observation.save();

    logger.info('Monitoring observation created', {
      observationId: observation.observationId,
      type: result.type,
      urgency: result.urgency
    });

    return observation;

  } catch (error) {
    logger.error('Error creating observation from result', {
      error: error.message
    });
    return null;
  }
}

function getDefaultTitle(type) {
  const titles = {
    goal_overdue: 'Goal is overdue',
    goal_deadline_approaching: 'Goal deadline approaching',
    goal_trajectory: 'Goal trajectory alert',
    strategy_stagnant: 'Strategy needs attention',
    strategy_overperforming: 'Strategy is exceeding expectations'
  };
  return titles[type] || 'Monitoring alert';
}

function getDefaultSummary(result) {
  if (result.goal) {
    return `Goal "${result.goal.name}" needs attention`;
  }
  if (result.strategy) {
    return `Strategy "${result.strategy.name}" needs attention`;
  }
  return 'Monitoring check detected an issue';
}

/**
 * Detect anomalies in metrics
 */
async function detectAnomalies() {
  try {
    const observations = [];

    // Placeholder for anomaly detection
    // In production, integrate with your metrics APIs to compare
    // today's values vs yesterday's values

    logger.info('Anomaly detection check completed', {
      anomaliesFound: observations.length
    });

    return observations;

  } catch (error) {
    logger.error('Error in anomaly detection', {
      error: error.message
    });
    return [];
  }
}

/**
 * Create a goal observation
 */
async function createGoalObservation(goal, result) {
  return createObservationForResult({
    ...result,
    goal,
    ruleResult: result.ruleResult || {
      title: getDefaultTitle(result.type),
      message: result.context || getDefaultSummary(result)
    }
  });
}

/**
 * Create a strategy observation
 */
async function createStrategyObservation(strategy, result) {
  return createObservationForResult({
    ...result,
    strategy,
    ruleResult: result.ruleResult || {
      title: getDefaultTitle(result.type),
      message: result.context || getDefaultSummary(result)
    }
  });
}

/**
 * Main monitoring job function
 */
async function runMonitoringChecks() {
  const startTime = Date.now();
  logger.info('Starting Tina monitoring checks');

  try {
    const observations = [];

    // 1. Goal Health Checks
    const goals = await MarketingGoal.find({
      status: { $in: ['active', 'at_risk'] }
    });

    logger.info('Checking goal health', { count: goals.length });

    for (const goal of goals) {
      const result = await checkGoalHealth(goal);
      if (result.needsAlert) {
        const obs = await createGoalObservation(goal, result);
        if (obs) observations.push(obs);
      }
    }

    // 2. Strategy Performance Checks
    const strategies = await MarketingStrategy.find({
      status: 'active'
    });

    logger.info('Checking strategy performance', { count: strategies.length });

    for (const strategy of strategies) {
      const result = await checkStrategyPerformance(strategy);
      if (result.needsAlert) {
        const obs = await createStrategyObservation(strategy, result);
        if (obs) observations.push(obs);
      }
    }

    // 3. Anomaly Detection
    const anomalies = await detectAnomalies();
    observations.push(...anomalies);

    // 4. Expire old pending observations
    const expiredCount = await TinaObservation.updateMany(
      {
        status: 'pending',
        expiresAt: { $lt: new Date() }
      },
      { status: 'expired' }
    );

    const duration = Date.now() - startTime;
    logger.info('Tina monitoring checks completed', {
      duration: `${duration}ms`,
      goalsChecked: goals.length,
      strategiesChecked: strategies.length,
      observationsCreated: observations.length,
      observationsExpired: expiredCount
    });

    return {
      success: true,
      goalsChecked: goals.length,
      strategiesChecked: strategies.length,
      observationsCreated: observations.length,
      observationsExpired: expiredCount,
      observations
    };

  } catch (error) {
    logger.error('Tina monitoring checks failed', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

export default runMonitoringChecks;
