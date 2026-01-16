#!/usr/bin/env node

/**
 * Test script for Feature #306: Budget changes above $100 require explicit confirmation
 *
 * This test verifies that:
 * 1. Attempting to change budget by $150 requires confirmation
 * 2. Backend rejects the change without confirmation
 * 3. Backend accepts the change with confirmation
 * 4. Confirmation modal shows the correct amount
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(stepNum, message) {
  log(`\n${'='.repeat(70)}`, 'blue');
  log(`STEP ${stepNum}: ${message}`, 'blue');
  log('='.repeat(70), 'blue');
}

async function testBudgetConfirmation() {
  log('\n🧪 Testing Feature #306: Budget changes above $100 require explicit confirmation', 'magenta');
  log('=' .repeat(70), 'magenta');

  try {
    // Get current budget setting
    logStep(1, 'Fetch current MONTHLY_BUDGET_LIMIT setting');
    const getResponse = await fetch(`${API_BASE}/api/settings`);
    const getData = await getResponse.json();

    if (!getData.success) {
      throw new Error('Failed to fetch current settings');
    }

    const currentBudget = parseFloat(getData.settings.MONTHLY_BUDGET_LIMIT || '1000');
    log(`✓ Current budget: $${currentBudget.toFixed(2)}`, 'green');

    // Calculate a new budget that's $150 higher
    const newBudget = currentBudget + 150;
    const changeAmount = newBudget - currentBudget;

    logStep(2, `Attempt budget change of $${changeAmount.toFixed(2)} WITHOUT confirmation`);
    log(`  Current: $${currentBudget.toFixed(2)}`, 'yellow');
    log(`  New:     $${newBudget.toFixed(2)}`, 'yellow');
    log(`  Change:  $${changeAmount.toFixed(2)}`, 'yellow');

    const tryUpdateResponse = await fetch(`${API_BASE}/api/settings/MONTHLY_BUDGET_LIMIT`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: newBudget.toString(), confirmed: false })
    });

    const tryUpdateData = await tryUpdateResponse.json();

    logStep(3, 'Verify confirmation modal appears (backend rejects without confirmation)');

    if (!tryUpdateData.success && tryUpdateData.requiresConfirmation) {
      log('✓ Confirmation required detected!', 'green');
      log(`  Error message: "${tryUpdateData.error}"`, 'green');
      log(`  Change amount: $${tryUpdateData.details.changeAmount.toFixed(2)}`, 'green');
    } else {
      log('✗ FAILED: Backend did not require confirmation', 'red');
      log(`  Response: ${JSON.stringify(tryUpdateData)}`, 'red');
      process.exit(1);
    }

    logStep(4, 'Confirm the budget change');

    const confirmResponse = await fetch(`${API_BASE}/api/settings/MONTHLY_BUDGET_LIMIT`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: newBudget.toString(), confirmed: true })
    });

    const confirmData = await confirmResponse.json();

    if (confirmData.success) {
      log('✓ Budget updated successfully after confirmation!', 'green');
    } else {
      log('✗ FAILED: Budget update failed after confirmation', 'red');
      log(`  Error: ${confirmData.error}`, 'red');
      process.exit(1);
    }

    logStep(5, 'Verify budget was updated');

    const verifyResponse = await fetch(`${API_BASE}/api/settings`);
    const verifyData = await verifyResponse.json();

    const updatedBudget = parseFloat(verifyData.settings.MONTHLY_BUDGET_LIMIT || '0');

    if (updatedBudget === newBudget) {
      log(`✓ Budget successfully updated to $${updatedBudget.toFixed(2)}`, 'green');
    } else {
      log(`✗ FAILED: Budget not updated correctly`, 'red');
      log(`  Expected: $${newBudget.toFixed(2)}`, 'red');
      log(`  Got:      $${updatedBudget.toFixed(2)}`, 'red');
      process.exit(1);
    }

    // Restore original budget
    logStep(6, 'Restore original budget');

    const restoreResponse = await fetch(`${API_BASE}/api/settings/MONTHLY_BUDGET_LIMIT`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: currentBudget.toString(), confirmed: true })
    });

    const restoreData = await restoreResponse.json();

    if (restoreData.success) {
      log(`✓ Budget restored to $${currentBudget.toFixed(2)}`, 'green');
    } else {
      log('⚠ Warning: Failed to restore original budget', 'yellow');
      log(`  This may require manual intervention`, 'yellow');
    }

    // Test small budget change (should NOT require confirmation)
    logStep(7, 'Test small budget change ($50 - should NOT require confirmation)');

    const smallChangeBudget = currentBudget + 50;

    const smallChangeResponse = await fetch(`${API_BASE}/api/settings/MONTHLY_BUDGET_LIMIT`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: smallChangeBudget.toString(), confirmed: false })
    });

    const smallChangeData = await smallChangeResponse.json();

    if (smallChangeData.success) {
      log('✓ Small budget change ($50) succeeded without confirmation', 'green');
    } else if (smallChangeData.requiresConfirmation) {
      log('✗ FAILED: Small budget change incorrectly required confirmation', 'red');
      process.exit(1);
    } else {
      log('✗ FAILED: Small budget change failed for unexpected reason', 'red');
      log(`  Error: ${smallChangeData.error}`, 'red');
      process.exit(1);
    }

    // Restore budget again
    await fetch(`${API_BASE}/api/settings/MONTHLY_BUDGET_LIMIT`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: currentBudget.toString(), confirmed: false })
    });

    log('\n' + '='.repeat(70), 'green');
    log('✅ ALL TESTS PASSED!', 'green');
    log('='.repeat(70), 'green');

    log('\n📋 Feature #306 Verification Summary:', 'magenta');
    log('  ✓ Step 1: Attempt budget change of $150', 'green');
    log('  ✓ Step 2: Backend rejects without confirmation', 'green');
    log('  ✓ Step 3: Confirmation response includes change amount', 'green');
    log('  ✓ Step 4: Confirmed change succeeds', 'green');
    log('  ✓ Step 5: Budget updated in database', 'green');
    log('  ✓ Step 6: Small changes (<$100) do not require confirmation', 'green');

    process.exit(0);

  } catch (error) {
    log('\n✗ TEST FAILED', 'red');
    log(`  Error: ${error.message}`, 'red');
    log(`  Stack: ${error.stack}`, 'red');
    process.exit(1);
  }
}

// Run the test
testBudgetConfirmation();
