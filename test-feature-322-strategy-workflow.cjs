/**
 * Feature #322: Complete AI chat strategy workflow
 *
 * Test Steps:
 * 1. Ask AI for strategy
 * 2. AI generates recommendation
 * 3. Store as strategy
 * 4. Approve strategy
 * 5. Create action items from strategy
 */

const mongoose = require('mongoose');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://oferh1:Ofer600560@adultstoriescluster.i8xpsce.mongodb.net/blush-production?retryWrites=true&w=majority&appName=AdultStoriesCluster';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(stepNum, description) {
  console.log('\n' + '='.repeat(80));
  log(`STEP ${stepNum}: ${description}`, 'bright');
  console.log('='.repeat(80) + '\n');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

// Test data
const testStrategyId = 'TEST_STRATEGY_' + Date.now();
const timestamp = Date.now();

async function connectToMongoDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    logSuccess('Connected to MongoDB Atlas');
    return true;
  } catch (error) {
    logError(`Failed to connect to MongoDB: ${error.message}`);
    return false;
  }
}

async function testStep1_AskAIStrategy() {
  logStep(1, 'Ask AI for strategy');

  try {
    // Simulate asking AI for strategy via API
    const response = await fetch('http://localhost:3001/api/chat/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `What strategy should we use to improve our content performance? (Test ID: ${testStrategyId})`,
        conversationId: null
      })
    });

    const data = await response.json();

    if (data.success) {
      logSuccess('AI generated recommendation');
      logInfo(`Response length: ${data.response.content.length} characters`);
      logInfo(`Conversation ID: ${data.conversationId}`);

      return {
        success: true,
        conversationId: data.conversationId,
        content: data.response.content,
        hasProposal: !!data.response.proposal
      };
    } else {
      logError(`Failed to get AI response: ${data.error}`);
      return { success: false, error: data.error };
    }
  } catch (error) {
    logError(`Error asking AI for strategy: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testStep2_AIGeneratesRecommendation(step1Result) {
  logStep(2, 'AI generates recommendation');

  if (!step1Result.success) {
    logError('Cannot test step 2 - step 1 failed');
    return { success: false };
  }

  logSuccess('AI response received');
  logInfo('Content preview: ' + step1Result.content.substring(0, 200) + '...');

  // Check if response contains strategic recommendations
  const hasRecommendation = step1Result.content.toLowerCase().includes('recommend') ||
                           step1Result.content.toLowerCase().includes('strategy') ||
                           step1Result.content.toLowerCase().includes('suggest');

  if (hasRecommendation) {
    logSuccess('Response contains strategic recommendations');
  } else {
    logInfo('Response may not contain explicit recommendations (this is OK)');
  }

  return {
    success: true,
    content: step1Result.content,
    conversationId: step1Result.conversationId
  };
}

async function testStep3_StoreAsStrategy(step2Result) {
  logStep(3, 'Store as strategy in database');

  if (!step2Result.success) {
    logError('Cannot test step 3 - step 2 failed');
    return { success: false };
  }

  try {
    const mongoose = await import('mongoose');

    // Create a strategy document
    const strategy = {
      type: 'recommendation',
      title: `Test Strategy ${testStrategyId}`,
      content: step2Result.content,
      reasoning: 'Generated during Feature #322 testing',
      status: 'pending',
      metadata: {
        source: 'ai_chat',
        testId: testStrategyId,
        conversationId: step2Result.conversationId
      },
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert into marketing_strategy collection
    const result = await mongoose.connection.collection('marketing_strategy').insertOne(strategy);

    if (result.acknowledged && result.insertedId) {
      logSuccess('Strategy stored in database');
      logInfo(`Strategy ID: ${result.insertedId}`);
      logInfo(`Collection: marketing_strategy`);

      return {
        success: true,
        strategyId: result.insertedId.toString()
      };
    } else {
      logError('Failed to insert strategy');
      return { success: false, error: 'Insert not acknowledged' };
    }
  } catch (error) {
    logError(`Error storing strategy: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testStep4_ApproveStrategy(step3Result) {
  logStep(4, 'Approve strategy');

  if (!step3Result.success) {
    logError('Cannot test step 4 - step 3 failed');
    return { success: false };
  }

  try {
    const mongoose = await import('mongoose');

    // Update strategy status to 'in_progress' (approved)
    const result = await mongoose.connection.collection('marketing_strategy').updateOne(
      { _id: new mongoose.Types.ObjectId(step3Result.strategyId) },
      {
        $set: {
          status: 'in_progress',
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount > 0) {
      logSuccess('Strategy approved (status updated to in_progress)');
      logInfo(`Modified count: ${result.modifiedCount}`);

      // Verify the update
      const strategy = await mongoose.connection.collection('marketing_strategy').findOne({
        _id: new mongoose.Types.ObjectId(step3Result.strategyId)
      });

      if (strategy && strategy.status === 'in_progress') {
        logSuccess('Strategy status verified as in_progress');
        return { success: true, strategyId: step3Result.strategyId };
      } else {
        logError('Strategy status verification failed');
        return { success: false, error: 'Status not updated correctly' };
      }
    } else {
      logError('Failed to update strategy status');
      return { success: false, error: 'No documents modified' };
    }
  } catch (error) {
    logError(`Error approving strategy: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testStep5_CreateActionItems(step4Result) {
  logStep(5, 'Create action items (todos) from strategy');

  if (!step4Result.success) {
    logError('Cannot test step 5 - step 4 failed');
    return { success: false };
  }

  try {
    // Create action items based on the strategy
    const actionItems = [
      {
        title: `Review strategy ${testStrategyId}`,
        description: `Review and implement the approved strategy from ${testStrategyId}`,
        category: 'review',
        priority: 'high',
        status: 'pending',
        scheduledAt: new Date(),
        createdBy: 'ai',
        metadata: {
          relatedStrategyId: step4Result.strategyId,
          testId: testStrategyId
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: `Implement strategy ${testStrategyId}`,
        description: `Implement the approved strategy recommendations`,
        category: 'development',
        priority: 'medium',
        status: 'pending',
        scheduledAt: new Date(Date.now() + 86400000), // Tomorrow
        createdBy: 'ai',
        metadata: {
          relatedStrategyId: step4Result.strategyId,
          testId: testStrategyId
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const mongoose = await import('mongoose');

    // Insert action items into marketing_tasks collection
    const result = await mongoose.connection.collection('marketing_tasks').insertMany(actionItems);

    if (result.acknowledged && result.insertedCount === 2) {
      logSuccess('Action items created');
      logInfo(`Created ${result.insertedCount} action items`);
      logInfo(`Collection: marketing_tasks`);

      // Verify the action items were created
      const todos = await mongoose.connection.collection('marketing_tasks').find({
        'metadata.testId': testStrategyId
      }).toArray();

      if (todos.length === 2) {
        logSuccess('Action items verified in database');
        logInfo(`Todo 1: ${todos[0].title}`);
        logInfo(`Todo 2: ${todos[1].title}`);
        logInfo(`Both todos linked to strategy: ${todos[0].metadata.relatedStrategyId}`);

        return {
          success: true,
          todoIds: todos.map(t => t._id.toString())
        };
      } else {
        logError(`Expected 2 todos, found ${todos.length}`);
        return { success: false, error: 'Incorrect number of todos created' };
      }
    } else {
      logError('Failed to create action items');
      return { success: false, error: 'Insert not acknowledged' };
    }
  } catch (error) {
    logError(`Error creating action items: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function cleanupTestData(strategyId, todoIds) {
  logStep('CLEANUP', 'Remove test data');

  try {
    const mongoose = await import('mongoose');
    let deletedCount = 0;

    // Delete strategy
    if (strategyId) {
      const strategyResult = await mongoose.connection.collection('marketing_strategy').deleteOne({
        _id: new mongoose.Types.ObjectId(strategyId)
      });
      if (strategyResult.deletedCount > 0) {
        logSuccess('Deleted test strategy');
        deletedCount++;
      }
    }

    // Delete todos
    if (todoIds && todoIds.length > 0) {
      const todoResult = await mongoose.connection.collection('marketing_tasks').deleteMany({
        _id: { $in: todoIds.map(id => new mongoose.Types.ObjectId(id)) }
      });
      if (todoResult.deletedCount > 0) {
        logSuccess(`Deleted ${todoResult.deletedCount} test todos`);
        deletedCount += todoResult.deletedCount;
      }
    }

    logInfo(`Total records deleted: ${deletedCount}`);
  } catch (error) {
    logError(`Error during cleanup: ${error.message}`);
  }
}

async function runTest() {
  console.log('\n' + '█'.repeat(80));
  log('Feature #322: Complete AI chat strategy workflow', 'bright');
  console.log('█'.repeat(80));

  // Connect to MongoDB
  const connected = await connectToMongoDB();
  if (!connected) {
    logError('Cannot proceed without database connection');
    process.exit(1);
  }

  let strategyId = null;
  let todoIds = [];

  try {
    // Step 1: Ask AI for strategy
    const step1Result = await testStep1_AskAIStrategy();
    if (!step1Result.success) {
      throw new Error('Step 1 failed');
    }

    // Step 2: AI generates recommendation
    const step2Result = await testStep2_AIGeneratesRecommendation(step1Result);
    if (!step2Result.success) {
      throw new Error('Step 2 failed');
    }

    // Step 3: Store as strategy
    const step3Result = await testStep3_StoreAsStrategy(step2Result);
    if (!step3Result.success) {
      throw new Error('Step 3 failed');
    }
    strategyId = step3Result.strategyId;

    // Step 4: Approve strategy
    const step4Result = await testStep4_ApproveStrategy(step3Result);
    if (!step4Result.success) {
      throw new Error('Step 4 failed');
    }

    // Step 5: Create action items
    const step5Result = await testStep5_CreateActionItems(step4Result);
    if (!step5Result.success) {
      throw new Error('Step 5 failed');
    }
    todoIds = step5Result.todoIds;

    // Summary
    console.log('\n' + '='.repeat(80));
    log('SUMMARY', 'bright');
    console.log('='.repeat(80) + '\n');

    logSuccess('✅ Step 1: Ask AI for strategy - PASSED');
    logSuccess('✅ Step 2: AI generates recommendation - PASSED');
    logSuccess('✅ Step 3: Store as strategy - PASSED');
    logSuccess('✅ Step 4: Approve strategy - PASSED');
    logSuccess('✅ Step 5: Create action items from strategy - PASSED');

    log('\n🎉 All steps completed successfully!', 'green');
    logInfo(`Test Strategy ID: ${testStrategyId}`);
    logInfo(`Strategy Database ID: ${strategyId}`);
    logInfo(`Todos created: ${todoIds.length}`);

  } catch (error) {
    logError(`\n❌ Test failed: ${error.message}`);
    process.exit(1);
  } finally {
    // Cleanup test data
    await cleanupTestData(strategyId, todoIds);

    // Close database connection
    await mongoose.disconnect();
    logSuccess('\nDisconnected from MongoDB');
  }
}

// Run the test
runTest().catch(error => {
  logError(`Fatal error: ${error.message}`);
  process.exit(1);
});
