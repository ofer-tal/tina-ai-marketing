/**
 * Background Job Scheduler Tests
 *
 * Tests for node-cron based background job scheduling
 */

import schedulerService from '../services/scheduler.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('test', 'scheduler-test');

// Test results tracker
const results = {
  passed: [],
  failed: []
};

function logResult(testName, passed, details = '') {
  const result = { test: testName, passed, details, timestamp: new Date().toISOString() };
  if (passed) {
    results.passed.push(result);
    console.log(`✅ PASS: ${testName}`);
    if (details) console.log(`   ${details}`);
  } else {
    results.failed.push(result);
    console.log(`❌ FAIL: ${testName}`);
    if (details) console.log(`   ${details}`);
  }
}

async function runTests() {
  console.log('\n=================================');
  console.log('Scheduler Service Tests');
  console.log('=================================\n');

  // Test 1: Verify node-cron package is installed
  console.log('\n--- Test 1: Verify node-cron package installed ---');
  try {
    const cron = await import('node-cron');
    const hasValidate = typeof cron.validate === 'function';
    const hasSchedule = typeof cron.schedule === 'function';

    logResult(
      'Step 1: Verify node-cron package installed',
      hasValidate && hasSchedule,
      `node-cron version loaded with validate and schedule functions`
    );
  } catch (error) {
    logResult(
      'Step 1: Verify node-cron package installed',
      false,
      `Error: ${error.message}`
    );
  }

  // Test 2: Test scheduled job runs at specified time (every 2 seconds for testing)
  console.log('\n--- Test 2: Test scheduled job runs at specified time ---');
  try {
    let executionCount = 0;
    let firstExecutionTime = null;

    // Start scheduler
    schedulerService.start();

    // Schedule a job to run every 2 seconds
    schedulerService.schedule(
      'test-job-every-2-seconds',
      '*/2 * * * * *', // Every 2 seconds (6 fields for seconds)
      async () => {
        executionCount++;
        const now = new Date();
        if (!firstExecutionTime) {
          firstExecutionTime = now;
          console.log(`   Job first executed at: ${firstExecutionTime.toISOString()}`);
        }
        console.log(`   Job execution #${executionCount} at: ${now.toISOString()}`);
      }
    );

    // Wait for 7 seconds (should execute 3-4 times)
    console.log('   Waiting for job executions (7 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 7000));

    // Stop the job
    schedulerService.stopJob('test-job-every-2-seconds');

    const expectedExecutions = 3; // Should run at 2s, 4s, 6s
    const actualExecutions = executionCount;

    logResult(
      'Step 2: Test scheduled job runs at specified time',
      actualExecutions >= expectedExecutions,
      `Job ran ${actualExecutions} times in 7 seconds (expected at least ${expectedExecutions})`
    );
  } catch (error) {
    logResult(
      'Step 2: Test scheduled job runs at specified time',
      false,
      `Error: ${error.message}`
    );
  }

  // Test 3: Verify job logs execution on each run
  console.log('\n--- Test 3: Verify job logs execution on each run ---');
  try {
    const jobInfo = schedulerService.getJob('test-job-every-2-seconds');

    const hasStats = jobInfo && jobInfo.stats;
    const hasRunCount = hasStats && jobInfo.stats.runCount > 0;
    const hasLastRun = hasStats && jobInfo.stats.lastRun !== null;
    const hasDuration = hasStats && jobInfo.stats.lastDuration !== null;

    logResult(
      'Step 3: Verify job logs execution on each run',
      hasRunCount && hasLastRun && hasDuration,
      `Job stats: runCount=${jobInfo?.stats?.runCount}, lastRun=${jobInfo?.stats?.lastRun?.toISOString()}, lastDuration=${jobInfo?.stats?.lastDuration}ms`
    );
  } catch (error) {
    logResult(
      'Step 3: Verify job logs execution on each run',
      false,
      `Error: ${error.message}`
    );
  }

  // Test 4: Test stopping scheduled job
  console.log('\n--- Test 4: Test stopping scheduled job ---');
  try {
    // Create a new job for this test
    let stopTestCount = 0;

    schedulerService.schedule(
      'test-job-stop',
      '*/1 * * * * *', // Every second
      async () => {
        stopTestCount++;
        console.log(`   Stop test job execution #${stopTestCount}`);
      }
    );

    // Wait 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));

    const countBeforeStop = stopTestCount;
    console.log(`   Executions before stop: ${countBeforeStop}`);

    // Stop the job
    schedulerService.stopJob('test-job-stop');

    // Wait 3 more seconds
    await new Promise(resolve => setTimeout(resolve, 3000));

    const countAfterStop = stopTestCount;
    console.log(`   Executions after stop: ${countAfterStop}`);

    const jobStopped = countAfterStop === countBeforeStop;
    const jobInfo = schedulerService.getJob('test-job-stop');
    const markedAsStopped = jobInfo && !jobInfo.scheduled;

    logResult(
      'Step 4: Test stopping scheduled job',
      jobStopped && markedAsStopped,
      `Job stopped: executions stayed at ${countBeforeStop}, scheduled flag=${jobInfo?.scheduled}`
    );
  } catch (error) {
    logResult(
      'Step 4: Test stopping scheduled job',
      false,
      `Error: ${error.message}`
    );
  }

  // Test 5: Confirm multiple jobs can run concurrently
  console.log('\n--- Test 5: Confirm multiple jobs can run concurrently ---');
  try {
    let job1Count = 0;
    let job2Count = 0;
    let job3Count = 0;

    // Schedule 3 different jobs
    schedulerService.schedule('concurrent-job-1', '*/2 * * * * *', async () => {
      job1Count++;
      console.log(`   Job 1 execution #${job1Count}`);
    });

    schedulerService.schedule('concurrent-job-2', '*/2 * * * * *', async () => {
      job2Count++;
      console.log(`   Job 2 execution #${job2Count}`);
    });

    schedulerService.schedule('concurrent-job-3', '*/2 * * * * *', async () => {
      job3Count++;
      console.log(`   Job 3 execution #${job3Count}`);
    });

    // Wait 6 seconds (should execute 3 times each)
    console.log('   Waiting for concurrent job executions (6 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 6000));

    // Stop all jobs
    schedulerService.stopJob('concurrent-job-1');
    schedulerService.stopJob('concurrent-job-2');
    schedulerService.stopJob('concurrent-job-3');

    const allJobsRan = job1Count >= 3 && job2Count >= 3 && job3Count >= 3;
    const allJobsRanSameAmount = job1Count === job2Count && job2Count === job3Count;

    logResult(
      'Step 5: Confirm multiple jobs can run concurrently',
      allJobsRan,
      `Job 1: ${job1Count} runs, Job 2: ${job2Count} runs, Job 3: ${job3Count} runs`
    );

    // Cleanup test jobs
    schedulerService.unschedule('test-job-every-2-seconds');
    schedulerService.unschedule('test-job-stop');
    schedulerService.unschedule('concurrent-job-1');
    schedulerService.unschedule('concurrent-job-2');
    schedulerService.unschedule('concurrent-job-3');

  } catch (error) {
    logResult(
      'Step 5: Confirm multiple jobs can run concurrently',
      false,
      `Error: ${error.message}`
    );
  }

  // Additional Test: Scheduler status
  console.log('\n--- Additional Test: Scheduler status ---');
  try {
    const status = schedulerService.getStatus();

    const hasStatus = status && typeof status.status === 'string';
    const hasJobCount = typeof status.jobCount === 'number';
    const hasActiveJobs = typeof status.activeJobs === 'number';

    logResult(
      'Scheduler status tracking',
      hasStatus && hasJobCount && hasActiveJobs,
      `Status: ${status.status}, Total jobs: ${status.jobCount}, Active: ${status.activeJobs}`
    );
  } catch (error) {
    logResult(
      'Scheduler status tracking',
      false,
      `Error: ${error.message}`
    );
  }

  // Print summary
  console.log('\n=================================');
  console.log('Test Summary');
  console.log('=================================\n');
  console.log(`Total tests: ${results.passed.length + results.failed.length}`);
  console.log(`Passed: ${results.passed.length}`);
  console.log(`Failed: ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log('\nFailed tests:');
    results.failed.forEach(f => {
      console.log(`  - ${f.test}: ${f.details}`);
    });
  }

  // Stop scheduler
  schedulerService.stop();

  return results.failed.length === 0;
}

// Run tests
runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test suite error:', error);
    process.exit(1);
  });
