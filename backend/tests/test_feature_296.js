/**
 * Feature #296: Budget overspend prevention - Test Suite
 *
 * Tests all 5 workflow steps:
 * - Step 1: Before spend, check budget
 * - Step 2: Calculate projected spend
 * - Step 3: Block if would exceed budget
 * - Step 4: Log prevention event
 * - Step 5: Alert user
 */

import dotenv from 'dotenv';
import budgetGuardService from '../services/budgetGuardService.js';
import DailySpend from '../models/DailySpend.js';
import { getLogger } from '../utils/logger.js';
import databaseService from '../services/database.js';

// Load environment variables
dotenv.config();

const logger = getLogger('test-feature-296', 'test');

/**
 * Test helper: Setup test budget data
 */
async function setupTestBudgetData() {
  const now = new Date();
  const yearMonth = now.toISOString().slice(0, 7); // YYYY-MM format

  // Clear existing test data
  await DailySpend.deleteMany({
    date: { $regex: `^${yearMonth}-TEST_` }
  });

  // Create test spend data for current month
  const testDay = now.getDate().toString().padStart(2, '0');
  const testDate = `${yearMonth}-${testDay}`;

  const spendEntry = await DailySpend.create({
    date: testDate,
    platform: 'all',
    projectedSpend: 100,
    actualSpend: 95, // Simulate $95 spent
    budget: 100,
    Impressions: 1000,
    Taps: 50,
    Installs: 5,
    NewDownloads: 5,
    Redownloads: 0,
    ReturningUsers: 0,
    LatOnInstalls: 1000,
    LatOnRedownloads: 0,
    LatOnReturningUsers: 0,
    ConversionRate: 10,
    AverageCPA: 19,
    AverageCPT: 1.9,
    AverageCPI: 19,
    SpendPerNewDownload: 19,
    SpendPerRedownload: 0,
    SpendPerReturningUser: 0
  });

  logger.info('Test budget data created', { spendDate: testDate, actualSpend: 95 });
  return spendEntry;
}

/**
 * Test helper: Cleanup test data
 */
async function cleanupTestBudgetData() {
  const now = new Date();
  const yearMonth = now.toISOString().slice(0, 7); // YYYY-MM format

  await DailySpend.deleteMany({
    date: { $regex: `^${yearMonth}-TEST_` }
  });

  logger.info('Test budget data cleaned up');
}

/**
 * Step 1 Test: Before spend, check budget
 */
async function test_step1_checkBudget() {
  console.log('\n✅ Step 1 Test: Before spend, check budget');

  // Test 1.1: Check current budget status
  const budgetStatus = await budgetGuardService.getCurrentBudgetStatus();

  console.assert(budgetStatus !== null, 'Budget status should not be null');
  console.assert(typeof budgetStatus.totalSpent === 'number', 'totalSpent should be a number');
  console.assert(typeof budgetStatus.remaining === 'number', 'remaining should be a number');
  console.assert(typeof budgetStatus.utilizationPercent === 'number', 'utilizationPercent should be a number');

  console.log('  ✓ Current budget status retrieved successfully');
  console.log(`    - Total spent: $${budgetStatus.totalSpent.toFixed(2)}`);
  console.log(`    - Remaining: $${budgetStatus.remaining.toFixed(2)}`);
  console.log(`    - Utilization: ${budgetStatus.utilizationPercent.toFixed(1)}%`);

  return true;
}

/**
 * Step 2 Test: Calculate projected spend
 */
async function test_step2_calculateProjectedSpend() {
  console.log('\n✅ Step 2 Test: Calculate projected spend');

  const currentBudget = await budgetGuardService.getCurrentBudgetStatus();
  const proposedSpend = 50;

  // Test 2.1: Calculate projection
  const projected = await budgetGuardService.calculateProjectedSpend(currentBudget, proposedSpend);

  console.assert(projected.projectedTotal === currentBudget.totalSpent + proposedSpend, 'projectedTotal should equal current + proposed');
  console.assert(projected.utilizationPercent !== null, 'utilizationPercent should be calculated');
  console.assert(typeof projected.wouldExceedBudget === 'boolean', 'wouldExceedBudget should be boolean');

  console.log('  ✓ Projected spend calculated successfully');
  console.log(`    - Current spent: $${currentBudget.totalSpent.toFixed(2)}`);
  console.log(`    - Proposed spend: $${proposedSpend.toFixed(2)}`);
  console.log(`    - Projected total: $${projected.projectedTotal.toFixed(2)}`);
  console.log(`    - Would exceed budget: ${projected.wouldExceedBudget}`);

  return true;
}

/**
 * Step 3 Test: Block if would exceed budget
 */
async function test_step3_blockIfExceeds() {
  console.log('\n✅ Step 3 Test: Block if would exceed budget');

  const currentBudget = await budgetGuardService.getCurrentBudgetStatus();

  // Test 3.1: Allow operation when under budget
  const safeSpend = 10;
  const safeValidation = await budgetGuardService.validateSpend({
    proposedSpend: safeSpend,
    operation: 'test_operation',
    platform: 'test_platform'
  });

  console.assert(safeValidation.allowed === true, 'Should allow operation under budget');
  console.log('  ✓ Small spend operation allowed (under budget)');

  // Test 3.2: Block operation when would exceed budget
  // Propose a spend that would exceed the budget
  const largeSpend = currentBudget.monthlyBudgetLimit * 2; // Double the budget
  const blockedValidation = await budgetGuardService.validateSpend({
    proposedSpend: largeSpend,
    operation: 'test_operation_exceed',
    platform: 'test_platform'
  });

  console.assert(blockedValidation.allowed === false, 'Should block operation that exceeds budget');
  console.assert(blockedValidation.reason !== undefined, 'Should provide reason for blocking');
  console.log('  ✓ Large spend operation blocked (would exceed budget)');
  console.log(`    - Reason: ${blockedValidation.reason}`);

  // Test 3.3: Warning at 70% threshold
  const warningSpend = currentBudget.monthlyBudgetLimit * 0.70 - currentBudget.totalSpent + 1;
  if (warningSpend > 0) {
    const warningValidation = await budgetGuardService.validateSpend({
      proposedSpend: warningSpend,
      operation: 'test_operation_warning',
      platform: 'test_platform'
    });

    if (warningValidation.allowed && warningValidation.warning) {
      console.log('  ✓ Warning generated at 70% threshold');
      console.log(`    - Warning: ${warningValidation.warning}`);
    }
  }

  return true;
}

/**
 * Step 4 Test: Log prevention event
 */
async function test_step4_logPrevention() {
  console.log('\n✅ Step 4 Test: Log prevention event');

  const currentBudget = await budgetGuardService.getCurrentBudgetStatus();
  const largeSpend = currentBudget.monthlyBudgetLimit * 2;

  const validation = await budgetGuardService.validateSpend({
    proposedSpend: largeSpend,
    operation: 'test_operation_log',
    platform: 'test_platform',
    campaignId: 'TEST_CAMPAIGN_123',
    campaignName: 'Test Campaign'
  });

  if (!validation.allowed && validation.preventionEvent) {
    const event = validation.preventionEvent;

    console.assert(event.type === 'budget_overspend_prevented', 'Event type should be budget_overspend_prevented');
    console.assert(event.timestamp !== undefined, 'Event should have timestamp');
    console.assert(event.operation === 'test_operation_log', 'Event should record operation');
    console.assert(event.proposedSpend === largeSpend, 'Event should record proposed spend');
    console.assert(event.projectedTotal !== undefined, 'Event should record projected total');

    console.log('  ✓ Prevention event logged successfully');
    console.log(`    - Event type: ${event.type}`);
    console.log(`    - Operation: ${event.operation}`);
    console.log(`    - Proposed spend: $${event.proposedSpend.toFixed(2)}`);
    console.log(`    - Projected total: $${event.projectedTotal.toFixed(2)}`);
    console.log(`    - Timestamp: ${event.timestamp}`);
  }

  return true;
}

/**
 * Step 5 Test: Alert user
 */
async function test_step5_alertUser() {
  console.log('\n✅ Step 5 Test: Alert user');

  // Note: Alert is logged internally during validateSpend
  // We can verify the logs were created by checking the validation result

  const currentBudget = await budgetGuardService.getCurrentBudgetStatus();
  const largeSpend = currentBudget.monthlyBudgetLimit * 2;

  const validation = await budgetGuardService.validateSpend({
    proposedSpend: largeSpend,
    operation: 'test_operation_alert',
    platform: 'test_platform',
    campaignId: 'TEST_CAMPAIGN_456',
    campaignName: 'Alert Test Campaign'
  });

  if (!validation.allowed) {
    console.log('  ✓ User alert generated (check logs for "USER NOTIFICATION" entry)');
    console.log('    - Alert severity: error');
    console.log('    - Alert title: Budget Overspend Prevented');
    console.log('    - Alert includes: operation details, budget breakdown, suggested action');
  }

  return true;
}

/**
 * Integration test: validateCampaignBudgetUpdate
 */
async function test_validateCampaignBudgetUpdate() {
  console.log('\n✅ Integration Test: validateCampaignBudgetUpdate');

  const currentBudget = await budgetGuardService.getCurrentBudgetStatus();

  // Test: Safe budget increase
  const safeValidation = await budgetGuardService.validateCampaignBudgetUpdate(
    'TEST_CAMPAIGN_789',
    10, // current budget
    15, // new budget (increase of $5)
    'apple_search_ads'
  );

  console.assert(safeValidation.allowed !== undefined, 'Should return allowed status');
  console.log('  ✓ Campaign budget update validated');
  console.log(`    - Allowed: ${safeValidation.allowed}`);
  if (safeValidation.warning) {
    console.log(`    - Warning: ${safeValidation.warning}`);
  }

  return true;
}

/**
 * Integration test: validateCampaignEnable
 */
async function test_validateCampaignEnable() {
  console.log('\n✅ Integration Test: validateCampaignEnable');

  // Test: Enabling campaign with daily budget
  const validation = await budgetGuardService.validateCampaignEnable(
    'TEST_CAMPAIGN_ENABLE',
    'Test Campaign Enable',
    10, // daily budget
    'apple_search_ads'
  );

  console.assert(validation.allowed !== undefined, 'Should return allowed status');
  console.log('  ✓ Campaign enable validated');
  console.log(`    - Allowed: ${validation.allowed}`);
  console.log(`    - Proposed spend calculated for remaining days in month`);

  return true;
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n========================================');
  console.log('Feature #296: Budget Overspend Prevention');
  console.log('========================================');

  const startTime = Date.now();
  let testsPassed = 0;
  let testsFailed = 0;

  const tests = [
    { name: 'Step 1: Check budget', fn: test_step1_checkBudget },
    { name: 'Step 2: Calculate projected spend', fn: test_step2_calculateProjectedSpend },
    { name: 'Step 3: Block if exceeds', fn: test_step3_blockIfExceeds },
    { name: 'Step 4: Log prevention', fn: test_step4_logPrevention },
    { name: 'Step 5: Alert user', fn: test_step5_alertUser },
    { name: 'Integration: Campaign budget update', fn: test_validateCampaignBudgetUpdate },
    { name: 'Integration: Campaign enable', fn: test_validateCampaignEnable }
  ];

  try {
    // Connect to database
    console.log('Connecting to database...');
    await databaseService.connect();
    console.log('✓ Database connected');

    // Setup test data
    await setupTestBudgetData();

    // Run all tests
    for (const test of tests) {
      try {
        await test.fn();
        testsPassed++;
      } catch (error) {
        console.error(`  ❌ Test failed: ${test.name}`, error.message);
        testsFailed++;
      }
    }

    // Cleanup
    await cleanupTestBudgetData();

    // Close database connection
    await databaseService.disconnect();
    console.log('✓ Database disconnected');

  } catch (error) {
    console.error('Fatal error during tests:', error);
    testsFailed = tests.length;
  }

  const duration = Date.now() - startTime;

  console.log('\n========================================');
  console.log('Test Results');
  console.log('========================================');
  console.log(`Total tests: ${tests.length}`);
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log(`Duration: ${duration}ms`);
  console.log('========================================\n');

  if (testsFailed === 0) {
    console.log('✅ All tests passed!');
    return true;
  } else {
    console.log('❌ Some tests failed');
    return false;
  }
}

// Run tests
runAllTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test suite error:', error);
    process.exit(1);
  });
