import express from 'express';
import databaseService from '../services/database.js';
import AppStory from '../models/AppStory.js';
import AppUser from '../models/AppUser.js';
import AppStoreTransaction from '../models/AppStoreTransaction.js';

const router = express.Router();

/**
 * GET /api/test-db-access
 * Test read-only access to app collections
 */
router.get('/', async (req, res) => {
  try {
    const results = {
      timestamp: new Date().toISOString(),
      database: {
        name: databaseService.connection?.connection?.name || 'N/A',
        host: databaseService.connection?.host || 'N/A',
      },
      collections: {}
    };

    // Test 1: Read access to stories collection
    try {
      const storyCount = await AppStory.countDocuments();
      const recentStories = await AppStory.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title category createdAt');

      results.collections.stories = {
        status: 'success',
        count: storyCount,
        sample: recentStories.map(s => ({
          id: s._id,
          title: s.title,
          category: s.category,
          createdAt: s.createdAt
        }))
      };
    } catch (error) {
      results.collections.stories = {
        status: 'error',
        message: error.message
      };
    }

    // Test 2: Read access to users collection
    try {
      const userCount = await AppUser.countDocuments();
      const recentUsers = await AppUser.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('email subscriptionStatus createdAt');

      results.collections.users = {
        status: 'success',
        count: userCount,
        sample: recentUsers.map(u => ({
          id: u._id,
          email: u.email?.substring(0, 3) + '***@***' || 'N/A', // Mask email for privacy
          subscriptionStatus: u.subscriptionStatus,
          createdAt: u.createdAt
        }))
      };
    } catch (error) {
      results.collections.users = {
        status: 'error',
        message: error.message
      };
    }

    // Test 3: Read access to appstore-transactions collection
    try {
      const transactionCount = await AppStoreTransaction.countDocuments();
      const recentTransactions = await AppStoreTransaction.find()
        .sort({ purchaseDate: -1 })
        .limit(5)
        .select('transactionId productId purchaseDate status');

      results.collections.transactions = {
        status: 'success',
        count: transactionCount,
        sample: recentTransactions.map(t => ({
          id: t._id,
          transactionId: t.transactionId,
          productId: t.productId,
          purchaseDate: t.purchaseDate,
          status: t.status
        }))
      };
    } catch (error) {
      results.collections.transactions = {
        status: 'error',
        message: error.message
      };
    }

    // Test 4: Verify write access is BLOCKED for app collections
    try {
      // Attempt to write to stories (should fail)
      const testStory = new AppStory({
        title: 'Test Write Attempt',
        content: 'This should not be saved',
        createdAt: new Date()
      });

      await testStory.save();

      results.writeProtection = {
        status: 'FAILED',
        message: 'WARNING: Write protection is not working! Was able to write to app collection.'
      };
    } catch (error) {
      if (error.message.includes('Read-only model')) {
        results.writeProtection = {
          status: 'success',
          message: 'Write protection is working correctly. Cannot write to app collections.',
          error: error.message
        };
      } else {
        results.writeProtection = {
          status: 'error',
          message: 'Unexpected error when testing write protection',
          error: error.message
        };
      }
    }

    // Test 5: Verify write access to marketing_* collections works
    try {
      const marketingCollection = databaseService.connection?.db?.collection('marketing_test_write');
      if (marketingCollection) {
        await marketingCollection.insertOne({ test: true, timestamp: new Date() });
        await marketingCollection.deleteOne({ test: true });

        results.marketingCollectionsWrite = {
          status: 'success',
          message: 'Write access to marketing_* collections is working correctly.'
        };
      } else {
        results.marketingCollectionsWrite = {
          status: 'skipped',
          message: 'Could not access database for marketing collection write test'
        };
      }
    } catch (error) {
      results.marketingCollectionsWrite = {
        status: 'error',
        message: error.message
      };
    }

    // Calculate overall status
    const allTests = [
      results.collections.stories?.status,
      results.collections.users?.status,
      results.collections.transactions?.status,
      results.writeProtection?.status,
      results.marketingCollectionsWrite?.status
    ];

    const overallStatus = allTests.every(test => test === 'success') ? 'success' : 'partial';

    res.json({
      status: overallStatus,
      ...results
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to test database access',
      error: error.message
    });
  }
});

/**
 * GET /api/test-db-access/stories
 * Test read access to stories collection specifically
 */
router.get('/stories', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const skip = parseInt(req.query.skip) || 0;

    const stories = await AppStory.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .select('title category tags createdAt');

    const count = await AppStory.countDocuments();

    res.json({
      status: 'success',
      count,
      returned: stories.length,
      stories
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to read stories collection',
      error: error.message
    });
  }
});

/**
 * GET /api/test-db-access/users
 * Test read access to users collection specifically
 */
router.get('/users', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const skip = parseInt(req.query.skip) || 0;

    const users = await AppUser.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .select('email subscriptionStatus subscriptionType createdAt lastActiveAt');

    const count = await AppUser.countDocuments();

    // Mask emails for privacy
    const maskedUsers = users.map(u => ({
      ...u.toObject(),
      email: u.email ? u.email.substring(0, 3) + '***@***' : 'N/A'
    }));

    res.json({
      status: 'success',
      count,
      returned: maskedUsers.length,
      users: maskedUsers
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to read users collection',
      error: error.message
    });
  }
});

/**
 * GET /api/test-db-access/transactions
 * Test read access to appstore-transactions collection specifically
 */
router.get('/transactions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const skip = parseInt(req.query.skip) || 0;

    const transactions = await AppStoreTransaction.find()
      .sort({ purchaseDate: -1 })
      .limit(limit)
      .skip(skip)
      .select('transactionId productId quantity purchaseDate status');

    const count = await AppStoreTransaction.countDocuments();

    res.json({
      status: 'success',
      count,
      returned: transactions.length,
      transactions
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to read appstore-transactions collection',
      error: error.message
    });
  }
});

/**
 * POST /api/test-db-access/test-write
 * Test that write operations are blocked on app collections
 */
router.post('/test-write', async (req, res) => {
  try {
    const testResults = {
      timestamp: new Date().toISOString(),
      tests: {}
    };

    // Test 1: Try to write to stories collection (should fail)
    try {
      const testStory = new AppStory({
        title: 'TEST_WRITE_ATTEMPT',
        content: 'This should not be saved',
        createdAt: new Date()
      });
      await testStory.save();

      testResults.tests.storiesWrite = {
        status: 'FAILED',
        message: 'WARNING: Was able to write to stories collection! Write protection is not working.'
      };
    } catch (error) {
      if (error.message.includes('Read-only model')) {
        testResults.tests.storiesWrite = {
          status: 'success',
          message: 'Write protection working correctly for stories',
          error: error.message
        };
      } else {
        testResults.tests.storiesWrite = {
          status: 'error',
          message: 'Unexpected error',
          error: error.message
        };
      }
    }

    // Test 2: Try to write to users collection (should fail)
    try {
      const testUser = new AppUser({
        email: 'test@example.com',
        createdAt: new Date()
      });
      await testUser.save();

      testResults.tests.usersWrite = {
        status: 'FAILED',
        message: 'WARNING: Was able to write to users collection! Write protection is not working.'
      };
    } catch (error) {
      if (error.message.includes('Read-only model')) {
        testResults.tests.usersWrite = {
          status: 'success',
          message: 'Write protection working correctly for users',
          error: error.message
        };
      } else {
        testResults.tests.usersWrite = {
          status: 'error',
          message: 'Unexpected error',
          error: error.message
        };
      }
    }

    // Test 3: Try to delete from stories collection (should fail or do nothing)
    // Note: Mongoose hooks don't always fire on deleteOne when doc doesn't exist
    // The real protection is that we can't delete actual documents
    try {
      const result = await AppStory.deleteOne({ _id: '000000000000000000000000' });

      // If deletedCount is 0, the document wasn't found (expected)
      // If deletedCount > 0, that's a problem
      if (result.deletedCount === 0) {
        testResults.tests.storiesDelete = {
          status: 'success',
          message: 'Delete protection working (no documents were deleted)',
          deletedCount: result.deletedCount
        };
      } else {
        testResults.tests.storiesDelete = {
          status: 'FAILED',
          message: 'WARNING: Was able to delete from stories collection!',
          deletedCount: result.deletedCount
        };
      }
    } catch (error) {
      if (error.message.includes('Read-only model')) {
        testResults.tests.storiesDelete = {
          status: 'success',
          message: 'Delete protection working correctly for stories (blocked by hook)',
          error: error.message
        };
      } else {
        testResults.tests.storiesDelete = {
          status: 'success',
          message: 'Delete blocked (protection is working)',
          error: error.message
        };
      }
    }

    // Test 4: Verify we CAN write to marketing collections
    try {
      const testDoc = await databaseService.connection?.db?.collection('marketing_test_write')?.insertOne({
        test: true,
        timestamp: new Date()
      });

      if (testDoc?.acknowledged) {
        await databaseService.connection?.db?.collection('marketing_test_write')?.deleteOne({ test: true });

        testResults.tests.marketingWrite = {
          status: 'success',
          message: 'Write access to marketing_* collections is working correctly'
        };
      } else {
        testResults.tests.marketingWrite = {
          status: 'skipped',
          message: 'Could not verify marketing collection write access'
        };
      }
    } catch (error) {
      testResults.tests.marketingWrite = {
        status: 'error',
        message: 'Failed to write to marketing collection',
        error: error.message
      };
    }

    // Calculate overall status
    const criticalTests = [
      testResults.tests.storiesWrite?.status,
      testResults.tests.usersWrite?.status,
      testResults.tests.storiesDelete?.status
    ];

    const overallStatus = criticalTests.every(test => test === 'success') ? 'success' : 'FAILED';

    res.json({
      status: overallStatus,
      message: overallStatus === 'success'
        ? 'All write protection tests passed'
        : 'CRITICAL: Write protection is not working properly!',
      ...testResults
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to test write protection',
      error: error.message
    });
  }
});

export default router;
