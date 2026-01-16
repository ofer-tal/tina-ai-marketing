import schedulerService from '../services/scheduler.js';
import ASOExperiment from '../models/ASOExperiment.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('ab-test-duration-monitor', 'scheduler');

/**
 * A/B Test Duration Monitor Job
 *
 * Runs daily to check A/B test duration and completion status
 * - Checks test end dates for running tests
 * - Calculates if sufficient data has been collected
 * - Notifies when tests are complete
 * - Generates recommendations for completed tests
 */
class ABTestDurationMonitor {
  constructor() {
    this.jobName = 'ab-test-duration-monitor';
    this.isRunning = false;
    this.lastCheckStats = null;

    // Configuration from environment
    this.checkSchedule = process.env.AB_TEST_CHECK_SCHEDULE || '0 4 * * *'; // Default: 4 AM daily
    this.timezone = process.env.AB_TEST_TIMEZONE || 'UTC';
    this.minSampleSize = parseInt(process.env.AB_TEST_MIN_SAMPLE_SIZE) || 100; // Minimum views per variant
    this.significanceThreshold = parseFloat(process.env.AB_TEST_SIGNIFICANCE_THRESHOLD) || 0.05; // p-value threshold
  }

  /**
   * Execute the A/B test duration monitoring job
   * Checks all running tests and notifies when complete
   */
  async execute() {
    if (this.isRunning) {
      logger.warn('A/B test duration monitor job already running, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting A/B test duration monitoring');

      // Step 1: Get all running A/B tests
      logger.info('Step 1: Fetching running A/B tests');
      const runningTests = await this.fetchRunningTests();
      logger.info(`Found ${runningTests.length} running A/B tests`);

      if (runningTests.length === 0) {
        logger.info('No running A/B tests to check, exiting');
        return {
          success: true,
          testCount: 0,
          completedTests: [],
          notificationsSent: []
        };
      }

      // Step 2: Check test end dates and calculate completion
      logger.info('Step 2: Checking test completion status');
      const completionStatus = await this.checkTestCompletion(runningTests);
      logger.info(`Checked ${completionStatus.length} tests for completion`);

      // Step 3: Calculate if sufficient data collected
      logger.info('Step 3: Checking if sufficient data collected');
      const dataSufficiency = await this.checkDataSufficiency(completionStatus);
      logger.info(`Checked data sufficiency for ${dataSufficiency.length} tests`);

      // Step 4: Notify if test complete
      logger.info('Step 4: Sending notifications for completed tests');
      const notifications = await this.notifyCompletedTests(dataSufficiency);
      logger.info(`Sent ${notifications.length} notifications`);

      // Step 5: Generate recommendations
      logger.info('Step 5: Generating recommendations for completed tests');
      const recommendations = await this.generateRecommendations(dataSufficiency);
      logger.info(`Generated recommendations for ${recommendations.length} tests`);

      // Log check results
      const stats = {
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        testCount: runningTests.length,
        completedTests: dataSufficiency.filter(t => t.isComplete).length,
        notificationsSent: notifications.length,
        recommendationsGenerated: recommendations.length
      };

      this.lastCheckStats = stats;

      logger.info('A/B test duration monitoring completed successfully', {
        duration: `${stats.duration}ms`,
        testCount: stats.testCount,
        completedTests: stats.completedTests,
        notificationsSent: stats.notificationsSent,
        recommendationsGenerated: stats.recommendationsGenerated
      });

      return stats;

    } catch (error) {
      logger.error('Error executing A/B test duration monitoring job', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Fetch all running A/B tests
   * Returns tests with status 'running'
   */
  async fetchRunningTests() {
    try {
      const runningTests = await ASOExperiment.find({ status: 'running' })
        .sort({ startDate: 1 })
        .lean();

      logger.info(`Found ${runningTests.length} running A/B tests`);
      return runningTests;

    } catch (error) {
      logger.error('Error fetching running A/B tests', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Check test completion status
   * Determines if tests have reached their end date or duration
   */
  async checkTestCompletion(tests) {
    try {
      const completionStatus = [];

      for (const test of tests) {
        const hasElapsed = this.hasTestDurationElapsed(test);
        const endDate = test.endDate || this.calculateEndDate(test);

        completionStatus.push({
          _id: test._id,
          name: test.name,
          type: test.type,
          status: test.status,
          startDate: test.startDate,
          endDate: endDate,
          duration: test.duration,
          hasDurationElapsed: hasElapsed,
          isComplete: hasElapsed && this.hasSufficientData(test),
          completionPercentage: this.calculateCompletionPercentage(test)
        });
      }

      logger.info(`Checked completion status for ${completionStatus.length} tests`);
      return completionStatus;

    } catch (error) {
      logger.error('Error checking test completion', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Calculate if sufficient data has been collected
   * Checks sample size and statistical significance
   */
  async checkDataSufficiency(completionStatus) {
    try {
      for (const test of completionStatus) {
        // Get full test document to access conversion data
        const testDoc = await ASOExperiment.findById(test._id);
        if (!testDoc) {
          logger.warn(`Test ${test._id} not found, skipping`);
          continue;
        }

        // Check sample size
        const hasMinSampleSize =
          testDoc.variantAViews >= this.minSampleSize &&
          testDoc.variantBViews >= this.minSampleSize;

        // Check statistical significance
        testDoc.calculateConversionRates();
        testDoc.calculateSignificance();
        await testDoc.save();

        const isSignificant = testDoc.significance <= this.significanceThreshold;

        test.dataSufficiency = {
          hasMinSampleSize,
          variantAViews: testDoc.variantAViews,
          variantBViews: testDoc.variantBViews,
          isSignificant,
          significance: testDoc.significance,
          confidence: testDoc.confidence,
          variantAConversionRate: testDoc.variantAConversionRate,
          variantBConversionRate: testDoc.variantBConversionRate,
          isSufficient: hasMinSampleSize && isSignificant
        };

        // Update isComplete flag based on data sufficiency
        test.isComplete = test.hasDurationElapsed && test.dataSufficiency.isSufficient;
      }

      logger.info(`Checked data sufficiency for ${completionStatus.length} tests`);
      return completionStatus;

    } catch (error) {
      logger.error('Error checking data sufficiency', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Notify if test is complete
   * Creates alerts for completed tests
   */
  async notifyCompletedTests(completionStatus) {
    try {
      const notifications = [];

      for (const test of completionStatus) {
        if (test.isComplete) {
          // Create notification/strategy alert
          await this.createCompletionNotification(test);
          notifications.push(test);
        }
      }

      logger.info(`Sent ${notifications.length} completion notifications`);
      return notifications;

    } catch (error) {
      logger.error('Error sending completion notifications', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Generate recommendations for completed tests
   * Provides actionable insights based on test results
   */
  async generateRecommendations(completionStatus) {
    try {
      const recommendations = [];

      for (const test of completionStatus) {
        if (test.isComplete) {
          const recommendation = await this.generateTestRecommendation(test);
          if (recommendation) {
            recommendations.push(recommendation);
            // Update test document with recommendations
            await this.updateTestWithRecommendations(test._id, recommendation);
          }
        }
      }

      logger.info(`Generated ${recommendations.length} recommendations`);
      return recommendations;

    } catch (error) {
      logger.error('Error generating recommendations', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Check if test duration has elapsed
   */
  hasTestDurationElapsed(test) {
    if (!test.endDate) {
      const elapsed = Date.now() - new Date(test.startDate).getTime();
      const durationMs = test.duration * 24 * 60 * 60 * 1000;
      return elapsed >= durationMs;
    }
    return new Date(test.endDate) <= new Date();
  }

  /**
   * Calculate end date based on start date and duration
   */
  calculateEndDate(test) {
    const startDate = new Date(test.startDate);
    const endDate = new Date(startDate.getTime() + test.duration * 24 * 60 * 60 * 1000);
    return endDate;
  }

  /**
   * Calculate test completion percentage
   */
  calculateCompletionPercentage(test) {
    const elapsed = Date.now() - new Date(test.startDate).getTime();
    const durationMs = test.duration * 24 * 60 * 60 * 1000;
    const percentage = Math.min((elapsed / durationMs) * 100, 100);
    return Math.round(percentage);
  }

  /**
   * Check if test has sufficient data
   */
  hasSufficientData(test) {
    return (
      test.variantAViews >= this.minSampleSize &&
      test.variantBViews >= this.minSampleSize
    );
  }

  /**
   * Create notification for completed test
   */
  async createCompletionNotification(test) {
    try {
      const Strategy = (await import('../models/Strategy.js')).default;

      const winner = test.dataSufficiency.variantBConversionRate > test.dataSufficiency.variantAConversionRate
        ? 'Variant B'
        : test.dataSufficiency.variantAConversionRate > test.dataSufficiency.variantBConversionRate
        ? 'Variant A'
        : 'Inconclusive';

      const lift = Math.abs(
        ((test.dataSufficiency.variantBConversionRate - test.dataSufficiency.variantAConversionRate) /
         test.dataSufficiency.variantAConversionRate) * 100
      ).toFixed(1);

      const alertMessage = `✅ A/B Test "${test.name}" Complete!

Type: ${test.type}
Duration: ${test.duration} days
Winner: ${winner}
Confidence: ${test.dataSufficiency.confidence.toFixed(1)}%
Lift: ${lift}%

Variant A: ${test.dataSufficiency.variantAConversionRate.toFixed(2)}% (${test.dataSufficiency.variantAViews} views)
Variant B: ${test.dataSufficiency.variantBConversionRate.toFixed(2)}% (${test.dataSufficiency.variantBViews} views)

Recommendations available in test details.`;

      const strategy = await Strategy.create({
        title: `A/B Test Complete: ${test.name}`,
        type: 'alert',
        priority: 'high',
        status: 'pending',
        content: alertMessage,
        metadata: {
          source: 'ab-test-duration-monitor',
          testId: test._id.toString(),
          testName: test.name,
          testType: test.type,
          winner: winner.toLowerCase(),
          confidence: test.dataSufficiency.confidence,
          lift: parseFloat(lift)
        },
        createdAt: new Date()
      });

      logger.info(`Created completion notification for test "${test.name}"`, {
        strategyId: strategy._id.toString()
      });

      return strategy;

    } catch (error) {
      logger.error(`Error creating notification for test "${test.name}"`, {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Generate recommendation for completed test
   */
  async generateTestRecommendation(test) {
    try {
      const testDoc = await ASOExperiment.findById(test._id);
      if (!testDoc) {
        return null;
      }

      // Determine winner
      testDoc.determineWinner();
      await testDoc.save();

      const recommendations = [];

      // Add recommendation based on winner
      if (testDoc.winner === 'variantB') {
        recommendations.push({
          type: 'implementation',
          description: `Implement Variant B (${testDoc.variantB.name}) as the new default. It achieved ${testDoc.lift.toFixed(1)}% lift with ${testDoc.confidence.toFixed(1)}% confidence.`
        });
      } else if (testDoc.winner === 'variantA') {
        recommendations.push({
          type: 'validation',
          description: `Control (Variant A) remains the winner. No changes needed. Variant B did not show significant improvement.`
        });
      } else {
        recommendations.push({
          type: 'further_testing',
          description: `Test results inconclusive. Consider extending test duration or increasing sample size to achieve statistical significance.`
        });
      }

      // Add specific recommendations based on test type
      if (test.type === 'icon') {
        recommendations.push({
          type: 'follow_up',
          description: 'Consider running follow-up tests with different icon styles or color schemes based on learnings.'
        });
      } else if (test.type === 'screenshots') {
        recommendations.push({
          type: 'follow_up',
          description: 'Analyze which specific screenshots performed best. Consider testing individual screenshot order or content.'
        });
      } else if (test.type === 'subtitle') {
        recommendations.push({
          type: 'follow_up',
          description: 'Test the winning subtitle in combination with other ASO elements for cumulative effects.'
        });
      } else if (test.type === 'keywords') {
        recommendations.push({
          type: 'follow_up',
          description: 'Monitor keyword rankings after implementing winning keywords. Track impact on organic traffic.'
        });
      }

      return {
        testId: test._id.toString(),
        testName: test.name,
        winner: testDoc.winner,
        confidence: testDoc.confidence,
        lift: testDoc.lift,
        recommendations: recommendations
      };

    } catch (error) {
      logger.error(`Error generating recommendation for test "${test.name}"`, {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Update test document with recommendations
   */
  async updateTestWithRecommendations(testId, recommendation) {
    try {
      const test = await ASOExperiment.findById(testId);
      if (!test) {
        logger.warn(`Test ${testId} not found, cannot update recommendations`);
        return;
      }

      // Update test status if complete
      if (test.status === 'running') {
        test.status = 'completed';
        test.completedAt = new Date();
        test.endDate = new Date();
      }

      // Add recommendations
      test.recommendations = recommendation.recommendations;
      test.winner = recommendation.winner;
      test.confidence = recommendation.confidence;
      test.lift = recommendation.lift;

      // Add conclusion
      if (recommendation.winner === 'variantB') {
        test.conclusion = `Variant B wins with ${recommendation.lift.toFixed(1)}% lift at ${recommendation.confidence.toFixed(1)}% confidence.`;
      } else if (recommendation.winner === 'variantA') {
        test.conclusion = `Control (Variant A) wins. Variant B did not show significant improvement.`;
      } else {
        test.conclusion = `Test inconclusive. Need more data or longer duration.`;
      }

      await test.save();

      logger.info(`Updated test "${test.name}" with recommendations`, {
        testId: testId,
        winner: recommendation.winner,
        confidence: recommendation.confidence
      });

      return test;

    } catch (error) {
      logger.error(`Error updating test ${testId} with recommendations`, {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get statistics about A/B test monitoring
   */
  async getMonitoringStats() {
    try {
      const totalTests = await ASOExperiment.countDocuments({ status: 'running' });
      const completedTests = await ASOExperiment.countDocuments({ status: 'completed' });

      const stats = {
        runningTests: totalTests,
        completedTests: completedTests,
        lastCheck: this.lastCheckStats?.timestamp || null,
        isRunning: this.isRunning,
        schedule: this.checkSchedule,
        timezone: this.timezone,
        config: {
          minSampleSize: this.minSampleSize,
          significanceThreshold: this.significanceThreshold
        }
      };

      return stats;

    } catch (error) {
      logger.error('Error getting monitoring stats', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Start the scheduler
   */
  start() {
    if (this.isRunning) {
      logger.warn('A/B test duration monitor already running');
      return;
    }

    logger.info(`Starting A/B test duration monitor scheduler`);
    logger.info(`Schedule: ${this.checkSchedule} (${this.timezone})`);

    // Register job with scheduler service
    schedulerService.registerJob(
      this.jobName,
      this.checkSchedule,
      () => this.execute(),
      { timezone: this.timezone }
    );

    logger.info('A/B test duration monitor started successfully');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    logger.info('Stopping A/B test duration monitor scheduler');

    schedulerService.unregisterJob(this.jobName);

    logger.info('A/B test duration monitor stopped');
  }
}

export default new ABTestDurationMonitor();
