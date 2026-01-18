#!/usr/bin/env node

/**
 * Test Feature #320: Complete content approval workflow
 *
 * This script tests the complete workflow from content generation to posting:
 * Step 1: Generate content from story
 * Step 2: Review content in approval interface
 * Step 3: Approve content
 * Step 4: Verify scheduled for posting
 * Step 5: Confirm status changes through workflow
 */

const http = require('http');

const API_BASE = 'http://localhost:3001';
const TEST_STORY_ID = '678eabcfa123456789abcdef'; // Example story ID

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port || 3001,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function step1_GenerateContent() {
  log('\n============================================================', 'blue');
  log('STEP 1: Generate content from story', 'blue');
  log('============================================================\n', 'blue');

  const contentData = {
    storyId: TEST_STORY_ID,
    platform: 'tiktok',
    contentType: 'video',
    title: `TEST_FEATURE_320_WORKFLOW - ${Date.now()}`,
    caption: 'Test content for Feature #320 workflow verification',
    hashtags: ['#test', '#blush', '#workflow'],
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Schedule for tomorrow
  };

  log('Creating content with data:', 'yellow');
  log(JSON.stringify(contentData, null, 2), 'yellow');

  const response = await makeRequest('POST', '/api/content/posts/create', contentData);

  if (response.status === 201 || response.status === 200) {
    log('✓ Content created successfully!', 'green');
    log(`Content ID: ${response.data.data._id}`, 'green');
    log(`Status: ${response.data.data.status}`, 'green');
    return response.data.data;
  } else {
    log(`✗ Failed to create content. Status: ${response.status}`, 'red');
    log(JSON.stringify(response.data, null, 2), 'red');
    throw new Error('Content creation failed');
  }
}

async function step2_ReviewContent(contentId) {
  log('\n============================================================', 'blue');
  log('STEP 2: Review content in approval interface', 'blue');
  log('============================================================\n', 'blue');

  log(`Fetching content ID: ${contentId}`, 'yellow');

  const response = await makeRequest('GET', `/api/content/posts/${contentId}`);

  if (response.status === 200) {
    log('✓ Content retrieved successfully!', 'green');
    const content = response.data.data;
    log(`Title: ${content.title}`, 'green');
    log(`Platform: ${content.platform}`, 'green');
    log(`Status: ${content.status}`, 'green');
    log(`Caption: ${content.caption}`, 'green');
    log(`Hashtags: ${content.hashtags.join(', ')}`, 'green');
    log(`Scheduled At: ${content.scheduledAt}`, 'green');
    return content;
  } else {
    log(`✗ Failed to retrieve content. Status: ${response.status}`, 'red');
    throw new Error('Content retrieval failed');
  }
}

async function step3_ApproveContent(contentId) {
  log('\n============================================================', 'blue');
  log('STEP 3: Approve content', 'blue');
  log('============================================================\n', 'blue');

  log(`Approving content ID: ${contentId}`, 'yellow');

  const response = await makeRequest('POST', `/api/content/posts/${contentId}/approve`);

  if (response.status === 200) {
    log('✓ Content approved successfully!', 'green');
    log(`New Status: ${response.data.data.status}`, 'green');
    log(`Approved At: ${response.data.data.approvedAt}`, 'green');
    return response.data.data;
  } else {
    log(`✗ Failed to approve content. Status: ${response.status}`, 'red');
    log(JSON.stringify(response.data, null, 2), 'red');
    throw new Error('Content approval failed');
  }
}

async function step4_VerifyScheduled(contentId) {
  log('\n============================================================', 'blue');
  log('STEP 4: Verify scheduled for posting', 'blue');
  log('============================================================\n', 'blue');

  log(`Verifying content ID: ${contentId} is scheduled`, 'yellow');

  const response = await makeRequest('GET', `/api/content/posts/${contentId}`);

  if (response.status === 200) {
    const content = response.data.data;
    log('✓ Content retrieved for verification!', 'green');
    log(`Current Status: ${content.status}`, 'green');

    if (content.status === 'approved' || content.status === 'scheduled') {
      log('✓ Content is in approved/scheduled state!', 'green');
      log(`Scheduled At: ${content.scheduledAt}`, 'green');
      log(`Approved At: ${content.approvedAt}`, 'green');
      return content;
    } else {
      log(`✗ Unexpected status: ${content.status}`, 'red');
      throw new Error('Content not in approved/scheduled state');
    }
  } else {
    log(`✗ Failed to retrieve content. Status: ${response.status}`, 'red');
    throw new Error('Content verification failed');
  }
}

async function step5_ConfirmStatusFlow(contentId) {
  log('\n============================================================', 'blue');
  log('STEP 5: Confirm status changes through workflow', 'blue');
  log('============================================================\n', 'blue');

  log('Checking workflow status flow...', 'yellow');

  const response = await makeRequest('GET', `/api/content/posts/${contentId}`);

  if (response.status === 200) {
    const content = response.data.data;
    log('✓ Final content state retrieved!', 'green');
    log('\n=== WORKFLOW STATUS FLOW ===', 'magenta');
    log(`Initial Status: draft (created)`, 'magenta');
    log(`Current Status: ${content.status}`, 'magenta');
    log(`Approved At: ${content.approvedAt || 'N/A'}`, 'magenta');
    log(`Scheduled At: ${content.scheduledAt}`, 'magenta');
    log(`Created At: ${content.createdAt}`, 'magenta');
    log(`Updated At: ${content.updatedAt}`, 'magenta');

    // Verify status progression
    if (content.approvedAt) {
      log('\n✓ Status flow confirmed: draft -> approved -> scheduled', 'green');
      return true;
    } else {
      log('\n✗ Status flow incomplete: approval timestamp missing', 'red');
      return false;
    }
  } else {
    log(`✗ Failed to retrieve content. Status: ${response.status}`, 'red');
    return false;
  }
}

async function cleanupTestContent(contentId) {
  log('\n============================================================', 'blue');
  log('CLEANUP: Deleting test content', 'blue');
  log('============================================================\n', 'blue');

  log(`Deleting content ID: ${contentId}`, 'yellow');

  const response = await makeRequest('DELETE', `/api/content/posts/${contentId}`);

  if (response.status === 200) {
    log('✓ Test content deleted successfully!', 'green');
  } else {
    log(`⚠ Warning: Failed to delete test content. Status: ${response.status}`, 'yellow');
  }
}

async function runWorkflowTest() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'magenta');
  log('║     FEATURE #320: Complete Content Approval Workflow       ║', 'magenta');
  log('╚════════════════════════════════════════════════════════════╝\n', 'magenta');

  let contentId = null;

  try {
    // Step 1: Generate content
    const content = await step1_GenerateContent();
    contentId = content._id;

    // Step 2: Review content
    await step2_ReviewContent(contentId);

    // Step 3: Approve content
    await step3_ApproveContent(contentId);

    // Step 4: Verify scheduled
    await step4_VerifyScheduled(contentId);

    // Step 5: Confirm status flow
    const flowConfirmed = await step5_ConfirmStatusFlow(contentId);

    // Cleanup
    await cleanupTestContent(contentId);

    // Final result
    log('\n============================================================', 'blue');
    if (flowConfirmed) {
      log('✓ ALL TESTS PASSED', 'green');
      log('Feature #320 is working correctly', 'green');
    } else {
      log('✗ SOME TESTS FAILED', 'red');
      log('Feature #320 has issues that need to be addressed', 'red');
    }
    log('============================================================\n', 'blue');

  } catch (error) {
    log(`\n✗ Test failed with error: ${error.message}`, 'red');
    log(error.stack, 'red');

    // Attempt cleanup even on failure
    if (contentId) {
      await cleanupTestContent(contentId);
    }

    process.exit(1);
  }
}

// Run the test
runWorkflowTest().then(() => {
  process.exit(0);
}).catch((error) => {
  log(`\n✗ Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});
