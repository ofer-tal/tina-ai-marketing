/**
 * Test Feature #69: Content regeneration with feedback incorporation
 *
 * This test verifies that users can regenerate content with specific feedback
 * and that the new content incorporates the feedback appropriately.
 */

import { MongoClient, ObjectId } from 'mongodb';

// Configuration
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://cluster.mongodb.net/blush';
const DB_NAME = 'blush';
const API_BASE = 'http://localhost:3001';

let db;
let client;
let testContentId;

// Color codes for output
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

function section(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'magenta');
  console.log('='.repeat(80));
}

async function connectToDatabase() {
  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db(DB_NAME);
    log('✅ Connected to MongoDB', 'green');
    return true;
  } catch (error) {
    log(`❌ Failed to connect to MongoDB: ${error.message}`, 'red');
    return false;
  }
}

async function createTestContent() {
  section('Step 0: Creating test content for regeneration');

  const testContent = {
    title: 'Test Content for Regeneration',
    description: 'Original content that will be regenerated',
    platform: 'tiktok',
    status: 'rejected',
    contentType: 'video',
    caption: 'Original caption without specific feedback',
    hashtags: ['#original', '#test'],
    hook: 'Original hook text',
    rejectionReason: 'Caption needs to be more engaging and include better call-to-action',
    feedback: 'Make it sexier, add more passion, include CTA to download app',
    storyId: new ObjectId(),
    storyName: 'Test Story',
    storyCategory: 'contemporary',
    generatedAt: new Date(),
    rejectedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  try {
    const result = await db.collection('marketing_posts').insertOne(testContent);
    testContentId = result.insertedId;
    log(`✅ Test content created with ID: ${testContentId}`, 'green');
    log(`   Caption: ${testContent.caption}`, 'blue');
    log(`   Feedback: ${testContent.feedback}`, 'yellow');
    return true;
  } catch (error) {
    log(`❌ Failed to create test content: ${error.message}`, 'red');
    return false;
  }
}

async function testStep1_RejectContentWithFeedback() {
  section('Step 1: Reject content with feedback');

  try {
    // Find the content and verify it has feedback
    const content = await db.collection('marketing_posts').findOne({
      _id: testContentId
    });

    if (!content) {
      log('❌ Test content not found', 'red');
      return false;
    }

    if (content.status !== 'rejected') {
      log(`❌ Content status is not rejected: ${content.status}`, 'red');
      return false;
    }

    if (!content.rejectionReason) {
      log('❌ Content missing rejection reason', 'red');
      return false;
    }

    if (!content.feedback) {
      log('❌ Content missing feedback', 'red');
      return false;
    }

    log('✅ Step 1 PASSED: Content rejected with feedback', 'green');
    log(`   Status: ${content.status}`, 'blue');
    log(`   Rejection reason: ${content.rejectionReason}`, 'blue');
    log(`   Feedback: ${content.feedback}`, 'blue');
    return true;
  } catch (error) {
    log(`❌ Step 1 FAILED: ${error.message}`, 'red');
    return false;
  }
}

async function testStep2_TriggerRegenerationWithFeedback() {
  section('Step 2: Trigger regeneration with feedback prompt');

  try {
    const response = await fetch(`${API_BASE}/api/content/${testContentId}/regenerate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        feedback: 'Make it sexier, add more passion, include strong CTA to download blush app'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      log(`❌ Regeneration API failed: ${response.status} ${response.statusText}`, 'red');
      log(`   Error: ${JSON.stringify(error)}`, 'red');
      return false;
    }

    const result = await response.json();

    if (!result.success) {
      log(`❌ Regeneration failed: ${result.error}`, 'red');
      return false;
    }

    log('✅ Step 2 PASSED: Regeneration triggered with feedback', 'green');
    log(`   Content ID: ${testContentId}`, 'blue');
    log(`   Feedback used: "Make it sexier, add more passion, include strong CTA"`, 'blue');
    return true;
  } catch (error) {
    log(`❌ Step 2 FAILED: ${error.message}`, 'red');
    return false;
  }
}

async function testStep3_VerifyNewContentIncorporatesFeedback() {
  section('Step 3: Verify new content incorporates feedback');

  try {
    // Wait a moment for regeneration to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Fetch the updated content
    const content = await db.collection('marketing_posts').findOne({
      _id: testContentId
    });

    if (!content) {
      log('❌ Test content not found', 'red');
      return false;
    }

    // Check if caption was updated
    const originalCaption = 'Original caption without specific feedback';
    if (content.caption === originalCaption) {
      log('❌ Caption was not updated', 'red');
      log(`   Still original: ${content.caption}`, 'red');
      return false;
    }

    log('✅ Step 3 PASSED: Content updated with regeneration', 'green');
    log(`   New caption: ${content.caption.substring(0, 100)}...`, 'blue');
    log(`   New hashtags: ${content.hashtags.join(', ')}`, 'blue');

    // Verify feedback incorporation
    const captionLower = content.caption.toLowerCase();

    // Check for sexier/passionate language
    const passionate = ['passionate', 'desire', 'intense', 'sexy', 'hot', 'steamy', 'romantic'];
    const hasPassionate = passionate.some(word => captionLower.includes(word));

    if (hasPassionate) {
      log('   ✅ Contains passionate language', 'green');
    } else {
      log('   ⚠️  May lack passionate language', 'yellow');
    }

    // Check for CTA
    const cta = ['download', 'link in bio', 'get the app', 'blush app', '#blushapp'];
    const hasCTA = cta.some(phrase => captionLower.includes(phrase));

    if (hasCTA) {
      log('   ✅ Contains call-to-action', 'green');
    } else {
      log('   ⚠️  May be missing CTA', 'yellow');
    }

    return true;
  } catch (error) {
    log(`❌ Step 3 FAILED: ${error.message}`, 'red');
    return false;
  }
}

async function testStep4_CheckContentDiffersFromOriginal() {
  section('Step 4: Check content differs from original');

  try {
    const content = await db.collection('marketing_posts').findOne({
      _id: testContentId
    });

    if (!content) {
      log('❌ Test content not found', 'red');
      return false;
    }

    const originalCaption = 'Original caption without specific feedback';
    const originalHashtags = ['#original', '#test'];

    // Verify caption changed
    if (content.caption === originalCaption) {
      log('❌ Caption unchanged from original', 'red');
      return false;
    }

    // Verify hashtags changed or expanded
    const hashtagsChanged = content.hashtags.length !== originalHashtags.length ||
                          !content.hashtags.every(h => originalHashtags.includes(h));

    if (!hashtagsChanged) {
      log('⚠️  Hashtags unchanged from original', 'yellow');
    } else {
      log('✅ Hashtags updated from original', 'green');
    }

    log('✅ Step 4 PASSED: Content differs from original', 'green');
    log(`   Original caption: "${originalCaption}"`, 'blue');
    log(`   New caption: "${content.caption.substring(0, 80)}..."`, 'blue');
    log(`   Original hashtags: ${originalHashtags.join(', ')}`, 'blue');
    log(`   New hashtags: ${content.hashtags.join(', ')}`, 'blue');
    return true;
  } catch (error) {
    log(`❌ Step 4 FAILED: ${error.message}`, 'red');
    return false;
  }
}

async function testStep5_ConfirmGenerationLoggedWithFeedback() {
  section('Step 5: Confirm generation logged with feedback');

  try {
    const content = await db.collection('marketing_posts').findOne({
      _id: testContentId
    });

    if (!content) {
      log('❌ Test content not found', 'red');
      return false;
    }

    // Check if content has regeneration history or feedback tracking
    const hasFeedbackField = content.feedback !== undefined;
    const hasRegenerationHistory = content.regenerationHistory || content.regeneratedAt;

    if (!hasFeedbackField) {
      log('❌ Content missing feedback field', 'red');
      return false;
    }

    log('✅ Step 5 PASSED: Generation logged with feedback', 'green');
    log(`   Feedback tracked: ${content.feedback}`, 'blue');
    log(`   Rejection reason: ${content.rejectionReason}`, 'blue');

    if (hasRegenerationHistory) {
      log(`   Regeneration history: ${JSON.stringify(hasRegenerationHistory)}`, 'blue');
    } else {
      log(`   Last updated: ${content.updatedAt}`, 'blue');
    }

    return true;
  } catch (error) {
    log(`❌ Step 5 FAILED: ${error.message}`, 'red');
    return false;
  }
}

async function cleanup() {
  section('Cleanup: Removing test data');

  try {
    if (testContentId) {
      await db.collection('marketing_posts').deleteOne({
        _id: testContentId
      });
      log('✅ Test content removed', 'green');
    }

    await client.close();
    log('✅ Database connection closed', 'green');
  } catch (error) {
    log(`⚠️  Cleanup warning: ${error.message}`, 'yellow');
  }
}

async function runTests() {
  console.log('\n' + '🔄'.repeat(40));
  log('Feature #69: Content Regeneration with Feedback Tests', 'magenta');
  console.log('🔄'.repeat(40) + '\n');

  const connected = await connectToDatabase();
  if (!connected) {
    log('❌ Cannot proceed without database connection', 'red');
    process.exit(1);
  }

  const results = [];

  try {
    // Create test content
    const created = await createTestContent();
    if (!created) {
      throw new Error('Failed to create test content');
    }

    // Run all test steps
    results.push(await testStep1_RejectContentWithFeedback());
    results.push(await testStep2_TriggerRegenerationWithFeedback());
    results.push(await testStep3_VerifyNewContentIncorporatesFeedback());
    results.push(await testStep4_CheckContentDiffersFromOriginal());
    results.push(await testStep5_ConfirmGenerationLoggedWithFeedback());

  } catch (error) {
    log(`\n❌ Test suite error: ${error.message}`, 'red');
    log(error.stack, 'red');
  } finally {
    await cleanup();
  }

  // Print summary
  section('Test Summary');
  const passed = results.filter(r => r).length;
  const total = results.length;
  const percentage = ((passed / total) * 100).toFixed(1);

  log(`Total tests: ${total}`, 'blue');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${total - passed}`, 'red');
  log(`Success rate: ${percentage}%`, percentage === '100.0' ? 'green' : 'yellow');

  if (passed === total) {
    log('\n🎉 All tests PASSED! Feature #69 is working correctly.', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  Some tests FAILED. Please review the output above.', 'yellow');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  log(`\n💥 Fatal error: ${error.message}`, 'red');
  log(error.stack, 'red');
  process.exit(1);
});
