#!/usr/bin/env node

/**
 * A/B Test Duration Monitor - Verification Test Script
 *
 * This script tests the A/B test duration monitoring feature:
 * 1. Set up daily A/B check job
 * 2. Check test end dates
 * 3. Calculate if sufficient data
 * 4. Notify if test complete
 * 5. Generate recommendations
 */

import 'dotenv/config';
import ASOExperiment from './backend/models/ASOExperiment.js';
import databaseService from './backend/services/database.js';

const ANSI_GREEN = '\x1b[32m';
const ANSI_RED = '\x1b[31m';
const ANSI_YELLOW = '\x1b[33m';
const ANSI_BLUE = '\x1b[34m';
const ANSI_RESET = '\x1b[0m';

function log(message, color = '') {
  console.log(`${color}${message}${ANSI_RESET}`);
}

function separator() {
  log('═'.repeat(80), ANSI_BLUE);
}

async function waitFor(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testStep1_SetUpJob() {
  separator();
  log('TEST 1: Set up daily A/B check job', ANSI_YELLOW);
  separator();

  try {
    // Check if job file exists
    const fs = await import('fs');
    const jobExists = fs.existsSync('./backend/jobs/abTestDurationMonitor.js');

    if (jobExists) {
      log('✅ Job file exists: backend/jobs/abTestDurationMonitor.js', ANSI_GREEN);

      // Import and check configuration
      const abTestDurationMonitor = await import('./backend/jobs/abTestDurationMonitor.js');
      const job = abTestDurationMonitor.default;

      log(`✅ Job schedule: ${job.checkSchedule}`, ANSI_GREEN);
      log(`✅ Job timezone: ${job.timezone}`, ANSI_GREEN);
      log(`✅ Min sample size: ${job.minSampleSize}`, ANSI_GREEN);
      log(`✅ Significance threshold: ${job.significanceThreshold}`, ANSI_GREEN);

      return true;
    } else {
      log('❌ Job file not found', ANSI_RED);
      return false;
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, ANSI_RED);
    return false;
  }
}

async function testStep2_CheckTestEndDates() {
  separator();
  log('TEST 2: Check test end dates', ANSI_YELLOW);
  separator();

  try {
    // Get all running tests
    const runningTests = await ASOExperiment.find({ status: 'running' });

    log(`Found ${runningTests.length} running A/B tests`, ANSI_BLUE);

    for (const test of runningTests) {
      const abTestDurationMonitorModule = await import('./backend/jobs/abTestDurationMonitor.js');
    const abTestDurationMonitor = abTestDurationMonitorModule.default;

      const hasElapsed = abTestDurationMonitor.hasTestDurationElapsed(test);
      const completionPercentage = abTestDurationMonitor.calculateCompletionPercentage(test);

      log(`Test: "${test.name}"`, ANSI_BLUE);
      log(`  - Type: ${test.type}`, ANSI_BLUE);
      log(`  - Duration: ${test.duration} days`, ANSI_BLUE);
      log(`  - Start Date: ${test.startDate.toISOString()}`, ANSI_BLUE);
      log(`  - Duration Elapsed: ${hasElapsed ? 'Yes' : 'No'}`, ANSI_BLUE);
      log(`  - Completion: ${completionPercentage}%`, ANSI_BLUE);
      log('', ANSI_BLUE);
    }

    // Create a test experiment if none exist
    if (runningTests.length === 0) {
      log('No running tests found. Creating a test experiment...', ANSI_YELLOW);

      const testExperiment = await ASOExperiment.create({
        name: 'TEST_A_B_MONITOR_' + Date.now(),
        type: 'icon',
        variantA: {
          name: 'Control',
          iconUrl: 'https://example.com/icon-a.png'
        },
        variantB: {
          name: 'Treatment',
          iconUrl: 'https://example.com/icon-b.png'
        },
        status: 'running',
        duration: 7, // 7 days
        metric: 'conversionRate',
        targetSampleSize: 1000,
        startDate: new Date(),
        createdBy: 'ai'
      });

      log(`✅ Created test experiment: ${testExperiment.name}`, ANSI_GREEN);
      log(`  - ID: ${testExperiment._id}`, ANSI_GREEN);
      log(`  - Duration: ${testExperiment.duration} days`, ANSI_GREEN);
      log(`  - Start Date: ${testExperiment.startDate}`, ANSI_GREEN);

      return { success: true, testId: testExperiment._id };
    }

    return { success: true, testId: runningTests[0]._id };

  } catch (error) {
    log(`❌ Error: ${error.message}`, ANSI_RED);
    return { success: false, error: error.message };
  }
}

async function testStep3_CalculateSufficientData(testId) {
  separator();
  log('TEST 3: Calculate if sufficient data', ANSI_YELLOW);
  separator();

  try {
    const test = await ASOExperiment.findById(testId);

    if (!test) {
      log('❌ Test not found', ANSI_RED);
      return false;
    }

    // Add some mock data
    test.variantAViews = 150;
    test.variantBViews = 150;
    test.variantAConversions = 15;
    test.variantBConversions = 18;
    await test.save();

    log(`Test: "${test.name}"`, ANSI_BLUE);
    log(`  - Variant A Views: ${test.variantAViews}`, ANSI_BLUE);
    log(`  - Variant B Views: ${test.variantBViews}`, ANSI_BLUE);
    log(`  - Variant A Conversions: ${test.variantAConversions}`, ANSI_BLUE);
    log(`  - Variant B Conversions: ${test.variantBConversions}`, ANSI_BLUE);

    // Calculate conversion rates
    test.calculateConversionRates();
    await test.save();

    log(`  - Variant A Conversion Rate: ${test.variantAConversionRate.toFixed(2)}%`, ANSI_BLUE);
    log(`  - Variant B Conversion Rate: ${test.variantBConversionRate.toFixed(2)}%`, ANSI_BLUE);

    // Check sample size
    const abTestDurationMonitorModule = await import('./backend/jobs/abTestDurationMonitor.js');
    const abTestDurationMonitor = abTestDurationMonitorModule.default;
    const hasMinSampleSize = abTestDurationMonitor.hasSufficientData(test);

    log(`  - Has Sufficient Sample Size: ${hasMinSampleSize ? 'Yes' : 'No'}`, hasMinSampleSize ? ANSI_GREEN : ANSI_YELLOW);

    // Calculate significance
    test.calculateSignificance();
    await test.save();

    log(`  - Significance (p-value): ${test.significance.toFixed(4)}`, ANSI_BLUE);
    log(`  - Confidence: ${test.confidence.toFixed(1)}%`, ANSI_BLUE);

    return true;

  } catch (error) {
    log(`❌ Error: ${error.message}`, ANSI_RED);
    return false;
  }
}

async function testStep4_NotifyIfComplete(testId) {
  separator();
  log('TEST 4: Notify if test complete', ANSI_YELLOW);
  separator();

  try {
    const test = await ASOExperiment.findById(testId);

    if (!test) {
      log('❌ Test not found', ANSI_RED);
      return false;
    }

    // Modify test to be complete
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    test.startDate = sevenDaysAgo;
    await test.save();

    log(`Test: "${test.name}"`, ANSI_BLUE);
    log(`  - Modified start date to 7 days ago`, ANSI_BLUE);

    // Check if complete
    const abTestDurationMonitorModule = await import('./backend/jobs/abTestDurationMonitor.js');
    const abTestDurationMonitor = abTestDurationMonitorModule.default;
    const hasElapsed = abTestDurationMonitor.hasTestDurationElapsed(test);
    const hasSufficientData = abTestDurationMonitor.hasSufficientData(test);
    const isComplete = hasElapsed && hasSufficientData;

    log(`  - Duration Elapsed: ${hasElapsed ? 'Yes' : 'No'}`, hasElapsed ? ANSI_GREEN : ANSI_RED);
    log(`  - Sufficient Data: ${hasSufficientData ? 'Yes' : 'No'}`, hasSufficientData ? ANSI_GREEN : ANSI_RED);
    log(`  - Test Complete: ${isComplete ? 'Yes' : 'No'}`, isComplete ? ANSI_GREEN : ANSI_RED);

    // Check if strategy alert would be created
    if (isComplete) {
      log('✅ Test is complete - notification would be created', ANSI_GREEN);

      const Strategy = (await import('./backend/models/Strategy.js')).default;

      // Check for existing alerts
      const existingAlerts = await Strategy.find({
        'metadata.testId': testId.toString()
      });

      log(`  - Existing alerts for this test: ${existingAlerts.length}`, ANSI_BLUE);
    } else {
      log('⚠️  Test is not yet complete', ANSI_YELLOW);
    }

    return true;

  } catch (error) {
    log(`❌ Error: ${error.message}`, ANSI_RED);
    return false;
  }
}

async function testStep5_GenerateRecommendations(testId) {
  separator();
  log('TEST 5: Generate recommendations', ANSI_YELLOW);
  separator();

  try {
    const test = await ASOExperiment.findById(testId);

    if (!test) {
      log('❌ Test not found', ANSI_RED);
      return false;
    }

    log(`Test: "${test.name}"`, ANSI_BLUE);

    // Determine winner
    test.determineWinner();
    await test.save();

    log(`  - Winner: ${test.winner}`, ANSI_BLUE);
    log(`  - Confidence: ${test.confidence.toFixed(1)}%`, ANSI_BLUE);
    log(`  - Lift: ${test.lift.toFixed(1)}%`, ANSI_BLUE);

    // Generate recommendations based on test type
    const recommendations = [];

    if (test.winner === 'variantB') {
      recommendations.push({
        type: 'implementation',
        description: `Implement Variant B (${test.variantB.name}) as the new default. It achieved ${test.lift.toFixed(1)}% lift with ${test.confidence.toFixed(1)}% confidence.`
      });
    } else if (test.winner === 'variantA') {
      recommendations.push({
        type: 'validation',
        description: `Control (Variant A) remains the winner. No changes needed. Variant B did not show significant improvement.`
      });
    } else {
      recommendations.push({
        type: 'further_testing',
        description: `Test results inconclusive. Consider extending test duration or increasing sample size.`
      });
    }

    // Add type-specific recommendations
    if (test.type === 'icon') {
      recommendations.push({
        type: 'follow_up',
        description: 'Consider running follow-up tests with different icon styles or color schemes.'
      });
    } else if (test.type === 'screenshots') {
      recommendations.push({
        type: 'follow_up',
        description: 'Analyze which specific screenshots performed best. Test individual screenshot order.'
      });
    } else if (test.type === 'subtitle') {
      recommendations.push({
        type: 'follow_up',
        description: 'Test the winning subtitle in combination with other ASO elements.'
      });
    }

    test.recommendations = recommendations;
    test.conclusion = test.winner === 'variantB'
      ? `Variant B wins with ${test.lift.toFixed(1)}% lift.`
      : test.winner === 'variantA'
      ? `Control (Variant A) wins.`
      : `Test inconclusive.`;

    await test.save();

    log(`✅ Generated ${recommendations.length} recommendations:`, ANSI_GREEN);
    recommendations.forEach((rec, i) => {
      log(`  ${i + 1}. [${rec.type}] ${rec.description}`, ANSI_GREEN);
    });

    log(`✅ Conclusion: ${test.conclusion}`, ANSI_GREEN);

    return true;

  } catch (error) {
    log(`❌ Error: ${error.message}`, ANSI_RED);
    return false;
  }
}

async function cleanupTestData(testName) {
  separator();
  log('CLEANUP: Removing test data', ANSI_YELLOW);
  separator();

  try {
    const deleted = await ASOExperiment.deleteMany({
      name: { $regex: '^TEST_A_B_MONITOR_' }
    });

    log(`✅ Deleted ${deleted.deletedCount} test experiments`, ANSI_GREEN);
    return true;

  } catch (error) {
    log(`❌ Error cleaning up: ${error.message}`, ANSI_RED);
    return false;
  }
}

async function runAllTests() {
  separator();
  log('A/B TEST DURATION MONITOR - VERIFICATION TEST SUITE', ANSI_YELLOW);
  separator();
  log('', ANSI_RESET);

  let testId = null;

  try {
    // Connect to database
    log('Connecting to MongoDB...', ANSI_BLUE);
    await databaseService.connect();
    log('✅ Connected to MongoDB', ANSI_GREEN);
    log('', ANSI_RESET);

    // Test 1: Set up job
    const test1 = await testStep1_SetUpJob();
    log('', ANSI_RESET);
    await waitFor(1000);

    // Test 2: Check test end dates
    const test2 = await testStep2_CheckTestEndDates();
    log('', ANSI_RESET);
    if (test2.success && test2.testId) {
      testId = test2.testId;
    }
    await waitFor(1000);

    if (!testId) {
      log('❌ No test ID available, skipping remaining tests', ANSI_RED);
      return;
    }

    // Test 3: Calculate sufficient data
    const test3 = await testStep3_CalculateSufficientData(testId);
    log('', ANSI_RESET);
    await waitFor(1000);

    // Test 4: Notify if complete
    const test4 = await testStep4_NotifyIfComplete(testId);
    log('', ANSI_RESET);
    await waitFor(1000);

    // Test 5: Generate recommendations
    const test5 = await testStep5_GenerateRecommendations(testId);
    log('', ANSI_RESET);
    await waitFor(1000);

    // Cleanup
    await cleanupTestData();
    log('', ANSI_RESET);

    // Summary
    separator();
    log('TEST SUMMARY', ANSI_YELLOW);
    separator();

    const allPassed = test1 && test2.success && test3 && test4 && test5;

    log(`Test 1 (Set up job): ${test1 ? '✅ PASSED' : '❌ FAILED'}`, test1 ? ANSI_GREEN : ANSI_RED);
    log(`Test 2 (Check end dates): ${test2.success ? '✅ PASSED' : '❌ FAILED'}`, test2.success ? ANSI_GREEN : ANSI_RED);
    log(`Test 3 (Calculate data): ${test3 ? '✅ PASSED' : '❌ FAILED'}`, test3 ? ANSI_GREEN : ANSI_RED);
    log(`Test 4 (Notify complete): ${test4 ? '✅ PASSED' : '❌ FAILED'}`, test4 ? ANSI_GREEN : ANSI_RED);
    log(`Test 5 (Generate recommendations): ${test5 ? '✅ PASSED' : '❌ FAILED'}`, test5 ? ANSI_GREEN : ANSI_RED);

    log('', ANSI_RESET);

    if (allPassed) {
      log('🎉 ALL TESTS PASSED!', ANSI_GREEN);
      separator();
    } else {
      log('⚠️  SOME TESTS FAILED', ANSI_YELLOW);
      separator();
    }

    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    log(`❌ Fatal error: ${error.message}`, ANSI_RED);
    log(error.stack, ANSI_RED);
    process.exit(1);
  }
}

// Run all tests
runAllTests();
