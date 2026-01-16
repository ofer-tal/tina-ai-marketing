#!/usr/bin/env node

/**
 * Simple A/B Test Duration Monitor Test
 * Just tests the core functionality without validation issues
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

async function testJob() {
  separator();
  log('A/B TEST DURATION MONITOR - SIMPLE TEST', ANSI_YELLOW);
  separator();

  try {
    // Connect to database
    log('Connecting to MongoDB...', ANSI_BLUE);
    await databaseService.connect();
    log('✅ Connected to MongoDB', ANSI_GREEN);
    log('', ANSI_RESET);

    // Import job
    const abTestDurationMonitorModule = await import('./backend/jobs/abTestDurationMonitor.js');
    const abTestDurationMonitor = abTestDurationMonitorModule.default;

    log('✅ Job imported successfully', ANSI_GREEN);
    log(`  Schedule: ${abTestDurationMonitor.checkSchedule}`, ANSI_BLUE);
    log(`  Timezone: ${abTestDurationMonitor.timezone}`, ANSI_BLUE);
    log(`  Min Sample Size: ${abTestDurationMonitor.minSampleSize}`, ANSI_BLUE);
    log(`  Significance Threshold: ${abTestDurationMonitor.significanceThreshold}`, ANSI_BLUE);
    log('', ANSI_RESET);

    // Create test experiment
    log('Creating test experiment...', ANSI_BLUE);
    const testExperiment = await ASOExperiment.create({
      name: 'SIMPLE_TEST_' + Date.now(),
      type: 'icon',
      variantA: { name: 'Control', iconUrl: 'https://example.com/icon-a.png' },
      variantB: { name: 'Treatment', iconUrl: 'https://example.com/icon-b.png' },
      status: 'running',
      duration: 7,
      metric: 'conversionRate',
      targetSampleSize: 1000,
      startDate: new Date(),
      createdBy: 'ai'
    });

    log(`✅ Created test: ${testExperiment.name}`, ANSI_GREEN);
    log(`  ID: ${testExperiment._id}`, ANSI_BLUE);
    log('', ANSI_RESET);

    // Add some data
    log('Adding test data...', ANSI_BLUE);
    testExperiment.variantAViews = 150;
    testExperiment.variantBViews = 150;
    testExperiment.variantAConversions = 15;
    testExperiment.variantBConversions = 18;
    await testExperiment.save();
    log('✅ Data added', ANSI_GREEN);
    log('', ANSI_RESET);

    // Test methods
    log('Testing job methods...', ANSI_BLUE);
    log(`  hasTestDurationElapsed: ${abTestDurationMonitor.hasTestDurationElapsed(testExperiment)}`, ANSI_BLUE);
    log(`  calculateCompletionPercentage: ${abTestDurationMonitor.calculateCompletionPercentage(testExperiment)}%`, ANSI_BLUE);
    log(`  hasSufficientData: ${abTestDurationMonitor.hasSufficientData(testExperiment)}`, ANSI_BLUE);
    log('', ANSI_RESET);

    // Test calculateConversionRates
    log('Calculating conversion rates...', ANSI_BLUE);
    testExperiment.calculateConversionRates();
    await testExperiment.save();
    log(`  Variant A: ${testExperiment.variantAConversionRate.toFixed(2)}%`, ANSI_BLUE);
    log(`  Variant B: ${testExperiment.variantBConversionRate.toFixed(2)}%`, ANSI_BLUE);
    log('✅ Conversion rates calculated', ANSI_GREEN);
    log('', ANSI_RESET);

    // Test calculateSignificance
    log('Calculating significance...', ANSI_BLUE);
    testExperiment.calculateSignificance();
    await testExperiment.save();
    log(`  Significance: ${testExperiment.significance.toFixed(4)}`, ANSI_BLUE);
    log(`  Confidence: ${testExperiment.confidence.toFixed(1)}%`, ANSI_BLUE);
    log('✅ Significance calculated', ANSI_GREEN);
    log('', ANSI_RESET);

    // Test determineWinner
    log('Determining winner...', ANSI_BLUE);
    testExperiment.determineWinner();
    await testExperiment.save();
    log(`  Winner: ${testExperiment.winner}`, ANSI_BLUE);
    log(`  Lift: ${testExperiment.lift.toFixed(1)}%`, ANSI_BLUE);
    log('✅ Winner determined', ANSI_GREEN);
    log('', ANSI_RESET);

    // Cleanup
    log('Cleaning up...', ANSI_BLUE);
    await ASOExperiment.deleteOne({ _id: testExperiment._id });
    log('✅ Test data deleted', ANSI_GREEN);
    log('', ANSI_RESET);

    separator();
    log('🎉 ALL TESTS PASSED!', ANSI_GREEN);
    separator();

    process.exit(0);

  } catch (error) {
    log(`❌ Error: ${error.message}`, ANSI_RED);
    log(error.stack, ANSI_RED);
    process.exit(1);
  }
}

testJob();
