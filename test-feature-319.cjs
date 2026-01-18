/**
 * Feature #319: Dashboard metrics reflect real data
 *
 * This test verifies that:
 * 1. Test revenue records can be created
 * 2. Dashboard fetches real data from database
 * 3. MRR displays test data correctly
 * 4. Metrics are calculated correctly
 * 5. Test data can be cleaned up
 */

const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

// Configuration
const API_BASE = 'http://localhost:3001/api';
const MONGO_URI = process.env.MONGODB_URI;

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(stepNum, description) {
  console.log('\n' + '='.repeat(60));
  log(`STEP ${stepNum}: ${description}`, 'cyan');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`  ${message}`, 'blue');
}

// Test state
let testRevenueRecords = [];
let testTransactionIds = [];

async function connectToDatabase() {
  logInfo('Connecting to MongoDB...');
  try {
    await mongoose.connect(MONGO_URI);
    logSuccess('Connected to MongoDB successfully');
    return true;
  } catch (error) {
    logError(`Failed to connect to MongoDB: ${error.message}`);
    return false;
  }
}

async function closeDatabaseConnection() {
  await mongoose.connection.close();
  logInfo('Database connection closed');
}

// STEP 1: Create test revenue records
async function step1_createTestRevenueRecords() {
  logStep(1, 'Create test revenue records');

  try {
    // Import the MarketingRevenue model properly
    const { default: MarketingRevenue } = await import('./backend/models/MarketingRevenue.js');

    const now = new Date();
    const records = [];

    // Create 5 test revenue records for current period (last 24 hours)
    for (let i = 0; i < 5; i++) {
      const transactionId = `TEST_FEATURE_319_${Date.now()}_${i}`;
      testTransactionIds.push(transactionId);

      const record = {
        transactionId: transactionId,
        attributedTo: {
          channel: 'organic',
          campaignName: `Test Campaign ${i}`
        },
        revenue: {
          grossAmount: 29.99,
          appleFee: 0.15,
          appleFeeAmount: 4.50,
          netAmount: 25.49,
          currency: 'USD'
        },
        transactionDate: new Date(now.getTime() - (i * 2 * 60 * 60 * 1000)), // Last 10 hours
        touchpointDate: new Date(now.getTime() - (i * 2 * 60 * 60 * 1000)),
        customer: {
          new: true,
          subscriptionType: 'monthly',
          subscriptionId: `sub_test_${i}`
        },
        attributionConfidence: 100,
        metadata: {
          source: 'feature_319_test',
          testRecord: true
        }
      };

      records.push(record);
    }

    // Insert records into database
    await MarketingRevenue.insertMany(records);
    testRevenueRecords = records;

    logSuccess(`Created ${records.length} test revenue records`);
    logInfo(`Total MRR from test records: $${(records.length * 25.49).toFixed(2)}`);

    // Verify records were inserted
    const count = await MarketingRevenue.countDocuments({
      transactionId: { $in: testTransactionIds }
    });

    if (count === records.length) {
      logSuccess(`Verified ${count} records in database`);
      return true;
    } else {
      logError(`Expected ${records.length} records, found ${count}`);
      return false;
    }
  } catch (error) {
    logError(`Failed to create test revenue records: ${error.message}`);
    return false;
  }
}

// STEP 2: Navigate to dashboard (fetch API)
async function step2_navigateToDashboard() {
  logStep(2, 'Navigate to dashboard and fetch metrics');

  try {
    logInfo(`Fetching dashboard metrics from ${API_BASE}/dashboard/metrics?period=24h`);
    const response = await axios.get(`${API_BASE}/dashboard/metrics?period=24h`);

    if (response.data) {
      logSuccess('Dashboard metrics fetched successfully');
      logInfo(`Period: ${response.data.period}`);
      logInfo(`MRR: $${response.data.mrr?.current || 0}`);
      logInfo(`Subscribers: ${response.data.subscribers?.current || 0}`);
      logInfo(`Users: ${response.data.users?.current || 0}`);
      logInfo(`Posts: ${response.data.posts?.current || 0}`);
      return { success: true, data: response.data };
    } else {
      logError('No data returned from dashboard API');
      return { success: false };
    }
  } catch (error) {
    logError(`Failed to fetch dashboard metrics: ${error.message}`);
    if (error.response) {
      logInfo(`Response status: ${error.response.status}`);
      logInfo(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return { success: false };
  }
}

// STEP 3: Verify MRR displays test data
async function step3_verifyMRRDisplaysTestData(dashboardData) {
  logStep(3, 'Verify MRR displays test data');

  if (!dashboardData.success) {
    logError('No dashboard data available from Step 2');
    return false;
  }

  try {
    const currentMRR = dashboardData.data.mrr?.current || 0;
    const expectedMRR = testRevenueRecords.length * 25.49; // Each record is $25.49

    logInfo(`Current MRR from dashboard: $${currentMRR}`);
    logInfo(`Expected MRR from test records: $${expectedMRR.toFixed(2)}`);

    // MRR should include our test data (plus any existing data)
    if (currentMRR >= expectedMRR) {
      logSuccess('MRR includes test data (may include additional existing data)');
      logInfo(`Minimum expected: $${expectedMRR.toFixed(2)}`);
      logInfo(`Actual MRR: $${currentMRR}`);
      return true;
    } else {
      logError(`MRR ($${currentMRR}) is less than expected ($${expectedMRR.toFixed(2)})`);
      return false;
    }
  } catch (error) {
    logError(`Failed to verify MRR: ${error.message}`);
    return false;
  }
}

// STEP 4: Verify calculated correctly
async function step4_verifyCalculatedCorrectly() {
  logStep(4, 'Verify metrics calculated correctly');

  try {
    const { default: MarketingRevenue } = await import('./backend/models/MarketingRevenue.js');

    // Manually query database for current period
    const now = new Date();
    const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const result = await MarketingRevenue.aggregate([
      {
        $match: {
          transactionDate: { $gte: startTime, $lte: now }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$revenue.netAmount' },
          transactionCount: { $sum: 1 }
        }
      }
    ]);

    const dbMRR = result[0]?.totalRevenue || 0;
    const dbCount = result[0]?.transactionCount || 0;

    logInfo(`Database query result: $${dbMRR.toFixed(2)} from ${dbCount} transactions`);

    // Fetch dashboard metrics again for comparison
    const response = await axios.get(`${API_BASE}/dashboard/metrics?period=24h`);
    const dashboardMRR = response.data.mrr?.current || 0;

    logInfo(`Dashboard MRR: $${dashboardMRR}`);

    // Verify they match (within rounding)
    const diff = Math.abs(dbMRR - dashboardMRR);
    if (diff < 1) { // Allow $1 difference for rounding
      logSuccess('MRR calculation verified correctly');
      logInfo(`Database: $${dbMRR.toFixed(2)}`);
      logInfo(`Dashboard: $${dashboardMRR.toFixed(2)}`);
      logInfo(`Difference: $${diff.toFixed(2)} (within tolerance)`);
      return true;
    } else {
      logError(`MRR mismatch: Database=$${dbMRR.toFixed(2)}, Dashboard=$${dashboardMRR.toFixed(2)}`);
      return false;
    }
  } catch (error) {
    logError(`Failed to verify calculations: ${error.message}`);
    return false;
  }
}

// STEP 5: Clean up test data
async function step5_cleanUpTestData() {
  logStep(5, 'Clean up test data');

  try {
    const { default: MarketingRevenue } = await import('./backend/models/MarketingRevenue.js');

    const deleteResult = await MarketingRevenue.deleteMany({
      transactionId: { $in: testTransactionIds }
    });

    logSuccess(`Deleted ${deleteResult.deletedCount} test revenue records`);

    // Verify deletion
    const remainingCount = await MarketingRevenue.countDocuments({
      transactionId: { $in: testTransactionIds }
    });

    if (remainingCount === 0) {
      logSuccess('Verified all test records removed');
      return true;
    } else {
      logError(`Found ${remainingCount} test records still in database`);
      return false;
    }
  } catch (error) {
    logError(`Failed to clean up test data: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('\n' + '█'.repeat(60));
  log('Feature #319: Dashboard metrics reflect real data', 'yellow');
  console.log('█'.repeat(60) + '\n');

  const dbConnected = await connectToDatabase();
  if (!dbConnected) {
    logError('Cannot proceed without database connection');
    process.exit(1);
  }

  const results = {
    step1: false,
    step2: false,
    step3: false,
    step4: false,
    step5: false
  };

  try {
    // Run all steps
    results.step1 = await step1_createTestRevenueRecords();

    if (results.step1) {
      const dashboardResult = await step2_navigateToDashboard();
      results.step2 = dashboardResult.success;

      if (results.step2) {
        results.step3 = await step3_verifyMRRDisplaysTestData(dashboardResult);

        if (results.step3) {
          results.step4 = await step4_verifyCalculatedCorrectly();
        }
      }
    }

    // Always run cleanup
    results.step5 = await step5_cleanUpTestData();

  } finally {
    await closeDatabaseConnection();
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  log('TEST SUMMARY', 'yellow');
  console.log('='.repeat(60));

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r).length;

  Object.entries(results).forEach(([step, passed]) => {
    const status = passed ? '✓ PASS' : '✗ FAIL';
    const color = passed ? 'green' : 'red';
    const stepNames = {
      step1: 'Create test revenue records',
      step2: 'Navigate to dashboard',
      step3: 'Verify MRR displays test data',
      step4: 'Verify calculated correctly',
      step5: 'Clean up test data'
    };
    log(`${status} - ${stepNames[step]}`, color);
  });

  console.log('='.repeat(60));
  log(`Total: ${passedTests}/${totalTests} tests passed`, passedTests === totalTests ? 'green' : 'yellow');

  if (passedTests === totalTests) {
    log('\n✓ ALL TESTS PASSED', 'green');
    log('Feature #319 is working correctly\n', 'green');
    process.exit(0);
  } else {
    log('\n✗ SOME TESTS FAILED', 'red');
    log('Feature #319 needs attention\n', 'red');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
