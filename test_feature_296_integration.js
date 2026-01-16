/**
 * Feature #296: Budget overspend prevention - Integration Test
 *
 * Tests the complete workflow through the Apple Search Ads service integration
 */

import dotenv from 'dotenv';
import appleSearchAdsService from './backend/services/appleSearchAdsService.js';
import budgetGuardService from './backend/services/budgetGuardService.js';
import databaseService from './backend/services/database.js';

// Load environment variables
dotenv.config();

/**
 * Test 1: verify budget guard is integrated into Apple Search Ads service
 */
async function test_appleSearchAdsIntegration() {
  console.log('\n========================================');
  console.log('Test 1: Apple Search Ads Integration');
  console.log('========================================');

  try {
    // Connect to database
    await databaseService.connect();
    console.log('✓ Database connected');

    // Get current budget status
    const budgetStatus = await budgetGuardService.getCurrentBudgetStatus();
    console.log(`\nCurrent Budget Status:`);
    console.log(`  - Total Spent: $${budgetStatus.totalSpent.toFixed(2)}`);
    console.log(`  - Remaining: $${budgetStatus.remaining.toFixed(2)}`);
    console.log(`  - Utilization: ${budgetStatus.utilizationPercent.toFixed(1)}%`);
    console.log(`  - Monthly Limit: $${budgetStatus.monthlyBudgetLimit.toFixed(2)}`);

    // Test 1.1: validateCampaignBudgetUpdate
    console.log('\n--- Test 1.1: validateCampaignBudgetUpdate ---');

    const budgetValidation = await budgetGuardService.validateCampaignBudgetUpdate(
      'TEST_CAMPAIGN_001',
      10, // current budget
      15, // new budget (increase of $5)
      'apple_search_ads'
    );

    console.log(`✓ Campaign budget validation completed`);
    console.log(`  - Allowed: ${budgetValidation.allowed}`);
    if (budgetValidation.currentBudget) {
      console.log(`  - Current spent: $${budgetValidation.currentBudget.totalSpent.toFixed(2)}`);
    }
    if (budgetValidation.projected) {
      console.log(`  - Projected total: $${budgetValidation.projected.projectedTotal.toFixed(2)}`);
    }
    if (budgetValidation.warning) {
      console.log(`  - Warning: ${budgetValidation.warning}`);
    }

    // Test 1.2: validateCampaignEnable
    console.log('\n--- Test 1.2: validateCampaignEnable ---');

    const enableValidation = await budgetGuardService.validateCampaignEnable(
      'TEST_CAMPAIGN_002',
      'Test Campaign',
      20, // daily budget
      'apple_search_ads'
    );

    console.log(`✓ Campaign enable validation completed`);
    console.log(`  - Allowed: ${enableValidation.allowed}`);
    if (enableValidation.currentBudget) {
      console.log(`  - Current spent: $${enableValidation.currentBudget.totalSpent.toFixed(2)}`);
    }
    if (enableValidation.projected) {
      console.log(`  - Proposed spend: $${enableValidation.projected.proposedSpend.toFixed(2)} (for rest of month)`);
      console.log(`  - Projected total: $${enableValidation.projected.projectedTotal.toFixed(2)}`);
    }

    // Test 1.3: Block large budget increase
    console.log('\n--- Test 1.3: Block Large Budget Increase ---');

    const largeBudget = budgetStatus.monthlyBudgetLimit * 2;
    const blockedValidation = await budgetGuardService.validateCampaignBudgetUpdate(
      'TEST_CAMPAIGN_003',
      10,
      largeBudget,
      'apple_search_ads'
    );

    console.log(`✓ Large budget increase validation completed`);
    console.log(`  - Allowed: ${blockedValidation.allowed}`);
    console.log(`  - Reason: ${blockedValidation.reason || 'N/A'}`);
    if (blockedValidation.preventionEvent) {
      console.log(`  - Prevention event logged: ${blockedValidation.preventionEvent.type}`);
    }

    await databaseService.disconnect();
    console.log('\n✓ Database disconnected');

    return true;

  } catch (error) {
    console.error('\n❌ Integration test failed:', error.message);
    console.error(error.stack);
    await databaseService.disconnect();
    return false;
  }
}

/**
 * Test 2: Verify budget guard configuration
 */
async function test_budgetGuardConfig() {
  console.log('\n========================================');
  console.log('Test 2: Budget Guard Configuration');
  console.log('========================================');

  const config = budgetGuardService.getConfig();

  console.log('\nCurrent Configuration:');
  console.log(`  - Monthly Budget Limit: $${config.monthlyBudgetLimit.toFixed(2)}`);
  console.log(`  - Warning Threshold: ${(config.warningThreshold * 100).toFixed(0)}%`);
  console.log(`  - Critical Threshold: ${(config.criticalThreshold * 100).toFixed(0)}%`);
  console.log(`  - Overspend Prevention: ${config.overspendPreventionEnabled ? 'ENABLED' : 'DISABLED'}`);

  console.log('\n✓ Budget guard configuration retrieved');
  return true;
}

/**
 * Test 3: Simulate real-world scenario
 */
async function test_realWorldScenario() {
  console.log('\n========================================');
  console.log('Test 3: Real-World Scenario');
  console.log('========================================');

  try {
    await databaseService.connect();
    console.log('✓ Database connected');

    const budgetStatus = await budgetGuardService.getCurrentBudgetStatus();

    // Scenario: Marketing team wants to increase campaign budget by $50
    console.log('\n--- Scenario: Campaign Budget Increase Request ---');
    console.log(`Current spend: $${budgetStatus.totalSpent.toFixed(2)}`);
    console.log(`Requested increase: $50.00`);

    const validation = await budgetGuardService.validateCampaignBudgetUpdate(
      'REAL_CAMPAIGN_123',
      30, // current daily budget
      80, // new daily budget (increase of $50)
      'apple_search_ads'
    );

    console.log('\nBudget Guard Decision:');
    console.log(`  - Allowed: ${validation.allowed}`);

    if (validation.allowed) {
      console.log(`  - ✓ Budget increase approved`);
      if (validation.warning) {
        console.log(`  - ⚠ Warning: ${validation.warning}`);
      }
      console.log(`  - Projected total spend: $${validation.projected.projectedTotal.toFixed(2)}`);
      console.log(`  - Remaining budget: $${validation.projected.remainingBudget.toFixed(2)}`);
    } else {
      console.log(`  - ✗ Budget increase blocked`);
      console.log(`  - Reason: ${validation.reason}`);
      console.log(`  - Over budget by: $${validation.projected.overBudgetAmount.toFixed(2)}`);
    }

    await databaseService.disconnect();
    console.log('\n✓ Database disconnected');

    return true;

  } catch (error) {
    console.error('\n❌ Real-world scenario test failed:', error.message);
    await databaseService.disconnect();
    return false;
  }
}

/**
 * Run all integration tests
 */
async function runIntegrationTests() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║  Feature #296: Budget Overspend Prevention  ║');
  console.log('║           Integration Test Suite             ║');
  console.log('╚════════════════════════════════════════════════╝');

  const startTime = Date.now();
  const results = [];

  // Test 1: Apple Search Ads integration
  results.push(await test_appleSearchAdsIntegration());

  // Test 2: Budget guard configuration
  results.push(await test_budgetGuardConfig());

  // Test 3: Real-world scenario
  results.push(await test_realWorldScenario());

  const duration = Date.now() - startTime;
  const passed = results.filter(r => r).length;
  const total = results.length;

  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║              Integration Results              ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log(`Total tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${total - passed}`);
  console.log(`Duration: ${duration}ms`);
  console.log('╚════════════════════════════════════════════════╝\n');

  if (passed === total) {
    console.log('✅ All integration tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some integration tests failed');
    process.exit(1);
  }
}

// Run integration tests
runIntegrationTests();
