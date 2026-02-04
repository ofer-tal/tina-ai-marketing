/**
 * Tina Goal Progress Job
 *
 * Runs daily to update goal progress based on current metrics.
 * Calculates trajectory and creates alerts for at-risk goals.
 *
 * Schedule: 0 7 * * * (Daily at 7am UTC)
 */

import { getLogger } from '../utils/logger.js';
import MarketingGoal from '../models/MarketingGoal.js';
import TinaObservation from '../models/TinaObservation.js';
import { generateObservationId } from '../utils/tinaIdGenerator.js';

const logger = getLogger('jobs', 'tina-goal-progress');

/**
 * Fetch current metric value based on goal type
 * This is a placeholder implementation - you should integrate with your actual metrics APIs
 */
async function fetchMetricValue(goal) {
  try {
    switch (goal.type) {
      case 'revenue': {
        // TODO: Integrate with actual revenue API
        // For now, return current value if it exists, otherwise return 0
        // This allows manual progress updates while API integration is pending
        return goal.currentValue || 0;
      }

      case 'engagement': {
        // TODO: Integrate with engagement metrics API
        // Calculate average engagement rate
        return goal.currentValue || 0;
      }

      case 'growth': {
        // TODO: Integrate with growth metrics API
        // Calculate user/subscriber growth rate
        return goal.currentValue || 0;
      }

      case 'brand': {
        // Brand metrics (awareness, sentiment, etc.)
        // Often manually updated
        return goal.currentValue || 0;
      }

      case 'experiment': {
        // Experiment metrics - typically manually updated
        return goal.currentValue || 0;
      }

      case 'custom':
      default:
        // Custom goals are manually updated
        return goal.currentValue || 0;
    }
  } catch (error) {
    logger.warn('Error fetching metric value', {
      goalId: goal.goalId,
      goalType: goal.type,
      error: error.message
    });
    return goal.currentValue || 0;
  }
}

/**
 * Create an observation for an at-risk goal
 */
async function createGoalAlertObservation(goal, reason = '') {
  try {
    const timeElapsed = Date.now() - goal.startDate.getTime();
    const timeTotal = goal.targetDate.getTime() - goal.startDate.getTime();
    const expectedProgress = (timeElapsed / timeTotal) * 100;

    const observation = new TinaObservation({
      observationId: generateObservationId(),
      urgency: 'high',
      category: 'risk',
      title: `Goal "${goal.name}" is at risk`,
      summary: `Goal is behind trajectory: ${goal.progressPercent.toFixed(0)}% actual vs ${expectedProgress.toFixed(0)}% expected`,
      details: {
        metric: goal.type,
        value: goal.currentValue,
        previousValue: goal.startValue,
        changePercent: goal.progressPercent,
        changeDirection: 'up',
        context: reason || 'Behind schedule'
      },
      relatedGoalId: goal.goalId,
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      tags: ['goal-alert', 'at-risk', goal.type]
    });

    await observation.save();

    logger.info('Goal alert observation created', {
      observationId: observation.observationId,
      goalId: goal.goalId
    });

    return observation;
  } catch (error) {
    logger.error('Error creating goal alert observation', {
      goalId: goal.goalId,
      error: error.message
    });
  }
}

/**
 * Create a milestone achievement observation
 */
async function createMilestoneAchievementObservation(goal, milestone) {
  try {
    const observation = new TinaObservation({
      observationId: generateObservationId(),
      urgency: 'medium',
      category: 'milestone',
      title: `Milestone achieved: ${milestone.name}`,
      summary: `Goal "${goal.name}" reached milestone: ${milestone.name} (${milestone.targetValue})`,
      details: {
        metric: goal.type,
        value: goal.currentValue,
        context: 'Milestone achieved'
      },
      relatedGoalId: goal.goalId,
      status: 'pending',
      tags: ['milestone', 'achievement', goal.type]
    });

    await observation.save();

    logger.info('Milestone achievement observation created', {
      observationId: observation.observationId,
      goalId: goal.goalId,
      milestone: milestone.name
    });

    return observation;
  } catch (error) {
    logger.error('Error creating milestone observation', {
      goalId: goal.goalId,
      error: error.message
    });
  }
}

/**
 * Main job function to update goal progress
 */
async function updateGoalProgress() {
  const startTime = Date.now();
  logger.info('Starting goal progress update job');

  try {
    // Fetch all active and at-risk goals
    const activeGoals = await MarketingGoal.find({
      status: { $in: ['active', 'at_risk'] }
    });

    logger.info('Processing goals for progress update', {
      count: activeGoals.length
    });

    let updatedCount = 0;
    let atRiskCount = 0;
    let milestoneCount = 0;

    for (const goal of activeGoals) {
      try {
        // Fetch current metric value based on goal type
        const currentValue = await fetchMetricValue(goal);

        // Skip if value hasn't changed and we're not forcing update
        if (currentValue === goal.currentValue) {
          // Still need to check trajectory
          await goal.calculateTrajectory();
          continue;
        }

        // Update goal current value
        goal.currentValue = currentValue;

        // Recalculate progress percent
        const range = goal.targetValue - goal.startValue;
        const current = goal.currentValue - goal.startValue;

        if (range > 0) {
          goal.progressPercent = Math.min(100, Math.max(0, (current / range) * 100));
        }

        // Calculate trajectory
        const now = new Date();
        const timeElapsed = now.getTime() - goal.startDate.getTime();
        const timeTotal = goal.targetDate.getTime() - goal.startDate.getTime();
        const expectedProgress = timeTotal > 0 ? (timeElapsed / timeTotal) * 100 : 0;

        // Determine trajectory trend
        let trend = 'unknown';
        if (expectedProgress > 5) {
          if (goal.progressPercent >= expectedProgress) {
            trend = goal.progressPercent > expectedProgress * 1.1 ? 'ahead' : 'on_track';
          } else {
            trend = goal.progressPercent < expectedProgress * 0.8 ? 'behind' : 'on_track';
          }
        }

        // Update trajectory
        goal.trajectory = {
          trend,
          projectedValue: null,
          projectedAchievementDate: null,
          confidence: expectedProgress > 50 ? 75 : 50,
          lastCalculated: new Date()
        };

        // Check if goal is achieved
        if (goal.progressPercent >= 100 && goal.status === 'active') {
          goal.status = 'achieved';
          goal.achievedAt = new Date();
        }

        // Check if goal should be at_risk
        const wasAtRisk = goal.status === 'at_risk';
        const shouldBeAtRisk = trend === 'behind' && expectedProgress > 20;

        if (shouldBeAtRisk && !wasAtRisk) {
          goal.status = 'at_risk';
          await createGoalAlertObservation(
            goal,
            `Progress (${goal.progressPercent.toFixed(0)}%) is behind expected (${expectedProgress.toFixed(0)}%)`
          );
          atRiskCount++;
        } else if (!shouldBeAtRisk && wasAtRisk) {
          goal.status = 'active';
        }

        // Check for newly achieved milestones
        if (goal.milestones && goal.milestones.length > 0) {
          for (let i = 0; i < goal.milestones.length; i++) {
            const milestone = goal.milestones[i];
            if (!milestone.achieved) {
              const milestoneRange = milestone.targetValue - goal.startValue;
              if (milestoneRange > 0 && (current / milestoneRange) >= 1) {
                goal.milestones[i].achieved = true;
                goal.milestones[i].achievedAt = new Date();
                await createMilestoneAchievementObservation(goal, milestone);
                milestoneCount++;
              }
            }
          }
          goal.markModified('milestones');
        }

        await goal.save();
        updatedCount++;

      } catch (error) {
        logger.error('Error updating goal progress', {
          goalId: goal.goalId,
          error: error.message,
          stack: error.stack
        });
      }
    }

    // Check for missed goals (past target date, not achieved)
    const missedGoals = await MarketingGoal.find({
      status: { $in: ['active', 'at_risk'] },
      targetDate: { $lt: new Date() }
    });

    for (const goal of missedGoals) {
      try {
        if (goal.progressPercent < 100) {
          await goal.markMissed('Target date passed without achieving goal');
          logger.info('Goal marked as missed', { goalId: goal.goalId });
        }
      } catch (error) {
        logger.error('Error marking goal as missed', {
          goalId: goal.goalId,
          error: error.message
        });
      }
    }

    const duration = Date.now() - startTime;
    logger.info('Goal progress update job completed', {
      duration: `${duration}ms`,
      processed: activeGoals.length,
      updated: updatedCount,
      atRisk: atRiskCount,
      milestones: milestoneCount,
      missed: missedGoals.length
    });

    return {
      success: true,
      processed: activeGoals.length,
      updated: updatedCount,
      atRisk: atRiskCount,
      milestones: milestoneCount,
      missed: missedGoals.length
    };

  } catch (error) {
    logger.error('Goal progress job failed', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

export default updateGoalProgress;
