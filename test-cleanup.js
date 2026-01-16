#!/usr/bin/env node

/**
 * Test script for data cleanup functionality
 * Tests the data cleanup job directly without API
 */

import dataCleanupJob from './backend/jobs/dataCleanup.js';

async function testCleanup() {
  console.log('=== Data Cleanup Test ===\n');

  // Test 1: Check status
  console.log('Test 1: Getting job status...');
  const status = dataCleanupJob.getStatus();
  console.log('Status:', JSON.stringify(status, null, 2));

  // Test 2: Find old files
  console.log('\nTest 2: Finding old temp files...');
  const oldFiles = await dataCleanupJob.findOldTempFiles();
  console.log(`Found ${oldFiles.length} old files:`);
  oldFiles.forEach(file => {
    console.log(`  - ${file.path} (${file.size} bytes, ${file.ageDays} days old)`);
  });

  // Test 3: Preview cleanup (without deleting)
  console.log('\nTest 3: Cleanup preview...');
  console.log(`Would delete ${oldFiles.length} files`);
  const totalSize = oldFiles.reduce((sum, f) => sum + f.size, 0);
  console.log(`Total space that would be freed: ${dataCleanupJob.formatBytes(totalSize)}`);

  // Test 4: Manual trigger (actually delete files)
  console.log('\nTest 4: Manually triggering cleanup...');
  try {
    const result = await dataCleanupJob.trigger();
    console.log('Cleanup result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Cleanup failed:', error.message);
  }

  // Test 5: Verify files were deleted
  console.log('\nTest 5: Verifying files were deleted...');
  const remainingFiles = await dataCleanupJob.findOldTempFiles();
  console.log(`Remaining old files: ${remainingFiles.length}`);

  console.log('\n=== Test Complete ===');
}

// Run the test
testCleanup().catch(console.error);
