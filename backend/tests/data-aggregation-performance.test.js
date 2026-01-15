/**
 * Performance Tests for Data Aggregation Queries
 *
 * Tests the performance of aggregation queries with large datasets
 * to ensure they complete within acceptable time limits (under 5 seconds).
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import mongoose from 'mongoose';
import MarketingPost from '../models/MarketingPost.js';
import DailyRevenueAggregate from '../models/DailyRevenueAggregate.js';
import ConversionMetrics from '../models/ConversionMetrics.js';

// Test database configuration
const MONGODB_URI = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI;
const TEST_DB_NAME = 'blush_marketing_perf_test';
const LARGE_DATASET_SIZE = 10000;
const PERFORMANCE_THRESHOLD_MS = 5000; // 5 seconds
const WARNING_THRESHOLD_MS = 3000; // 3 seconds

// Performance tracking
const performanceMetrics = {
  createLargeDataset: null,
  aggregationByPlatform: null,
  aggregationByStatus: null,
  aggregationByDateRange: null,
  aggregationWithGrouping: null,
  aggregationWithLookup: null,
  aggregationComplexPipeline: null
};

// Database connection
let connection;

/**
 * Helper: Generate random date within range
 */
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Helper: Generate random platform
 */
function randomPlatform() {
  const platforms = ['tiktok', 'instagram', 'youtube_shorts'];
  return platforms[Math.floor(Math.random() * platforms.length)];
}

/**
 * Helper: Generate random status
 */
function randomStatus() {
  const statuses = ['draft', 'ready', 'approved', 'scheduled', 'posted', 'failed', 'rejected'];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

/**
 * Helper: Measure execution time
 */
async function measurePerformance(name, operation) {
  const startTime = performance.now();
  const result = await operation();
  const endTime = performance.now();
  const duration = endTime - startTime;

  if (performanceMetrics[name] !== undefined) {
    performanceMetrics[name] = duration;
  }

  return { result, duration };
}

describe('Data Aggregation Performance Tests', () => {
  beforeAll(async () => {
    // Create a separate connection for performance tests
    connection = mongoose.createConnection(MONGODB_URI, {
      dbName: TEST_DB_NAME,
    });

    // Wait for connection to be ready
    await connection.asPromise();

    console.log('✅ Connected to performance test database:', TEST_DB_NAME);

    // Clean up any existing test data
    await connection.model('MarketingPost', MarketingPost.schema).deleteMany({ title: { $regex: '^PERF_TEST_' } });
    await connection.model('DailyRevenueAggregate', DailyRevenueAggregate.schema).deleteMany({ date: { $gte: new Date('2024-01-01') } });
    await connection.model('ConversionMetrics', ConversionMetrics.schema).deleteMany({ date: { $gte: new Date('2024-01-01') } });
  }, 60000); // 60 second timeout

  afterAll(async () => {
    // Clean up test data
    await connection.model('MarketingPost', MarketingPost.schema).deleteMany({ title: { $regex: '^PERF_TEST_' } });
    await connection.model('DailyRevenueAggregate', DailyRevenueAggregate.schema).deleteMany({ date: { $gte: new Date('2024-01-01') } });
    await connection.model('ConversionMetrics', ConversionMetrics.schema).deleteMany({ date: { $gte: new Date('2024-01-01') } });

    // Close connection
    if (connection) {
      await connection.close();
      console.log('✅ Closed performance test database connection');
    }

    // Print performance summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 PERFORMANCE TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');

    for (const [test, duration] of Object.entries(performanceMetrics)) {
      if (duration !== null) {
        const status = duration > PERFORMANCE_THRESHOLD_MS ? '❌ FAIL' :
                      duration > WARNING_THRESHOLD_MS ? '⚠️  WARN' : '✅ PASS';
        console.log(`${status} ${test}: ${duration.toFixed(2)}ms`);
      }
    }

    console.log(`Performance Threshold: ${PERFORMANCE_THRESHOLD_MS}ms`);
    console.log('═══════════════════════════════════════════════════════════════\n');
  }, 30000);

  /**
   * STEP 1: Create large dataset (10k records)
   */
  describe('Step 1: Create large dataset', () => {
    it('should ensure 10,000 marketing post records exist', async () => {
      const PostModel = connection.model('MarketingPost', MarketingPost.schema);

      // Check if we already have test data
      const existingCount = await PostModel.countDocuments({ title: { $regex: '^PERF_TEST_' } });

      if (existingCount >= LARGE_DATASET_SIZE) {
        console.log(`✅ Found ${existingCount} existing test records, skipping creation`);
        return;
      }

      // Create records in batches to avoid timeout
      const BATCH_SIZE = 1000;
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      let totalCreated = 0;

      const startTime = performance.now();

      for (let batch = 0; batch < (LARGE_DATASET_SIZE / BATCH_SIZE); batch++) {
        const posts = [];
        for (let i = 0; i < BATCH_SIZE; i++) {
          const index = batch * BATCH_SIZE + i;
          posts.push({
            title: `PERF_TEST_POST_${index}`,
            description: `Performance test post ${index}`,
            platform: randomPlatform(),
            status: randomStatus(),
            contentType: 'video',
            caption: `Test caption for post ${index}`,
            hashtags: [`#test${index}`, `#perf${index}`],
            scheduledFor: randomDate(startDate, endDate),
            postedAt: randomDate(startDate, endDate),
            engagement: {
              likes: Math.floor(Math.random() * 10000),
              comments: Math.floor(Math.random() * 1000),
              shares: Math.floor(Math.random() * 500)
            },
            metadata: {
              generatedBy: 'perf-test',
              testIndex: index
            }
          });
        }

        try {
          const result = await PostModel.insertMany(posts, { ordered: false });
          totalCreated += result.length;
          console.log(`   Batch ${batch + 1}: Created ${result.length} records`);
        } catch (error) {
          // Some records might have been inserted even if there was an error
          console.log(`   Batch ${batch + 1}: Insert completed with errors`);
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      performanceMetrics.createLargeDataset = duration;

      console.log(`✅ Created total of ${totalCreated} records in ${duration.toFixed(2)}ms`);

      // Verify we have at least 10k records
      const finalCount = await PostModel.countDocuments({ title: { $regex: '^PERF_TEST_' } });
      expect(finalCount).toBeGreaterThanOrEqual(LARGE_DATASET_SIZE);
    });

    it('should verify all records were created', async () => {
      const PostModel = connection.model('MarketingPost', MarketingPost.schema);
      const count = await PostModel.countDocuments({ title: { $regex: '^PERF_TEST_' } });
      expect(count).toBeGreaterThanOrEqual(LARGE_DATASET_SIZE);
      console.log(`✅ Verified ${count} records in database`);
    });
  });

  /**
   * STEP 2: Run aggregation query by platform
   */
  describe('Step 2: Aggregation by platform', () => {
    it('should aggregate posts by platform efficiently', async () => {
      const PostModel = connection.model('MarketingPost', MarketingPost.schema);
      const { result, duration } = await measurePerformance(
        'aggregationByPlatform',
        async () => {
          return await PostModel.aggregate([
            {
              $match: {
                title: { $regex: '^PERF_TEST_' }
              }
            },
            {
              $group: {
                _id: '$platform',
                count: { $sum: 1 },
                totalLikes: { $sum: '$engagement.likes' },
                totalComments: { $sum: '$engagement.comments' },
                totalShares: { $sum: '$engagement.shares' },
                avgLikes: { $avg: '$engagement.likes' }
              }
            },
            {
              $sort: { count: -1 }
            }
          ]);
        }
      );

      expect(result).toHaveLength(3); // tiktok, instagram, youtube_shorts
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      console.log(`✅ Aggregated by platform in ${duration.toFixed(2)}ms`);
      console.log(`   - TikTok: ${result.find(r => r._id === 'tiktok')?.count || 0} posts`);
      console.log(`   - Instagram: ${result.find(r => r._id === 'instagram')?.count || 0} posts`);
      console.log(`   - YouTube: ${result.find(r => r._id === 'youtube_shorts')?.count || 0} posts`);
    });
  });

  /**
   * STEP 3: Run aggregation query by status
   */
  describe('Step 3: Aggregation by status', () => {
    it('should aggregate posts by status efficiently', async () => {
      const PostModel = connection.model('MarketingPost', MarketingPost.schema);
      const { result, duration } = await measurePerformance(
        'aggregationByStatus',
        async () => {
          return await PostModel.aggregate([
            {
              $match: {
                title: { $regex: '^PERF_TEST_' }
              }
            },
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalEngagement: {
                  $sum: {
                    $add: ['$engagement.likes', '$engagement.comments', '$engagement.shares']
                  }
                }
              }
            },
            {
              $sort: { count: -1 }
            }
          ]);
        }
      );

      expect(result.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      console.log(`✅ Aggregated by status in ${duration.toFixed(2)}ms`);
      result.forEach(r => {
        console.log(`   - ${r._id}: ${r.count} posts`);
      });
    });
  });

  /**
   * STEP 4: Run aggregation query by date range
   */
  describe('Step 4: Aggregation by date range', () => {
    it('should aggregate posts by date range efficiently', async () => {
      const PostModel = connection.model('MarketingPost', MarketingPost.schema);
      const { result, duration } = await measurePerformance(
        'aggregationByDateRange',
        async () => {
          return await PostModel.aggregate([
            {
              $match: {
                title: { $regex: '^PERF_TEST_' },
                postedAt: {
                  $gte: new Date('2024-01-01'),
                  $lte: new Date('2024-12-31')
                }
              }
            },
            {
              $group: {
                _id: {
                  year: { $year: '$postedAt' },
                  month: { $month: '$postedAt' },
                  day: { $dayOfMonth: '$postedAt' }
                },
                count: { $sum: 1 },
                totalLikes: { $sum: '$engagement.likes' }
              }
            },
            {
              $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
            },
            {
              $limit: 365 // Limit to 1 year of data
            }
          ]);
        }
      );

      expect(result.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      console.log(`✅ Aggregated by date range in ${duration.toFixed(2)}ms`);
      console.log(`   - ${result.length} days with activity`);
    });
  });

  /**
   * STEP 5: Run aggregation with complex grouping
   */
  describe('Step 5: Aggregation with complex grouping', () => {
    it('should aggregate posts by platform and status with grouping', async () => {
      const PostModel = connection.model('MarketingPost', MarketingPost.schema);
      const { result, duration } = await measurePerformance(
        'aggregationWithGrouping',
        async () => {
          return await PostModel.aggregate([
            {
              $match: {
                title: { $regex: '^PERF_TEST_' }
              }
            },
            {
              $group: {
                _id: {
                  platform: '$platform',
                  status: '$status'
                },
                count: { $sum: 1 },
                avgLikes: { $avg: '$engagement.likes' },
                totalEngagement: {
                  $sum: {
                    $add: ['$engagement.likes', '$engagement.comments', '$engagement.shares']
                  }
                }
              }
            },
            {
              $sort: { '_id.platform': 1, 'count': -1 }
            }
          ]);
        }
      );

      expect(result.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      console.log(`✅ Aggregated with grouping in ${duration.toFixed(2)}ms`);
      console.log(`   - ${result.length} platform/status combinations`);
    });
  });

  /**
   * STEP 6: Run aggregation with lookup
   */
  describe('Step 6: Aggregation with lookup', () => {
    it('should perform aggregation with lookup operation', async () => {
      const PostModel = connection.model('MarketingPost', MarketingPost.schema);
      const RevenueModel = connection.model('DailyRevenueAggregate', DailyRevenueAggregate.schema);

      // First create some daily revenue aggregates to lookup
      const revenueData = [];
      for (let i = 0; i < 100; i++) {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + i);
        revenueData.push({
          date: date.toISOString().split('T')[0], // YYYY-MM-DD format
          dateObj: date, // Date object for queries
          period: 'daily',
          grossRevenue: Math.random() * 1000,
          netRevenue: Math.random() * 850,
          transactions: Math.floor(Math.random() * 100),
          newCustomers: Math.floor(Math.random() * 50),
          returningCustomers: Math.floor(Math.random() * 30)
        });
      }
      await RevenueModel.insertMany(revenueData);

      const { result, duration } = await measurePerformance(
        'aggregationWithLookup',
        async () => {
          return await PostModel.aggregate([
            {
              $match: {
                title: { $regex: '^PERF_TEST_' },
                postedAt: {
                  $gte: new Date('2024-01-01'),
                  $lte: new Date('2024-04-10')
                }
              }
            },
            {
              $group: {
                _id: {
                  year: { $year: '$postedAt' },
                  month: { $month: '$postedAt' },
                  day: { $dayOfMonth: '$postedAt' }
                },
                postCount: { $sum: 1 },
                totalLikes: { $sum: '$engagement.likes' }
              }
            },
            {
              $lookup: {
                from: 'dailyrevenueaggregates',
                let: { postDate: '$_id' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: [{ $year: '$date' }, '$$postDate.year'] },
                          { $eq: [{ $month: '$date' }, '$$postDate.month'] },
                          { $eq: [{ $dayOfMonth: '$date' }, '$$postDate.day'] }
                        ]
                      }
                    }
                  }
                ],
                as: 'revenue'
              }
            },
            {
              $unwind: {
                path: '$revenue',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $project: {
                date: '$_id',
                postCount: 1,
                totalLikes: 1,
                revenue: '$revenue.netRevenue'
              }
            },
            {
              $sort: { 'date.year': 1, 'date.month': 1, 'date.day': 1 }
            }
          ]);
        }
      );

      expect(result.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      console.log(`✅ Aggregated with lookup in ${duration.toFixed(2)}ms`);
      console.log(`   - ${result.length} days with posts and revenue data`);
    });
  });

  /**
   * STEP 7: Run complex aggregation pipeline
   */
  describe('Step 7: Complex aggregation pipeline', () => {
    it('should perform complex multi-stage aggregation', async () => {
      const PostModel = connection.model('MarketingPost', MarketingPost.schema);
      const { result, duration } = await measurePerformance(
        'aggregationComplexPipeline',
        async () => {
          return await PostModel.aggregate([
            // Stage 1: Match and filter
            {
              $match: {
                title: { $regex: '^PERF_TEST_' },
                postedAt: {
                  $gte: new Date('2024-01-01'),
                  $lte: new Date('2024-12-31')
                }
              }
            },

            // Stage 2: Add computed fields
            {
              $addFields: {
                totalEngagement: {
                  $add: ['$engagement.likes', '$engagement.comments', '$engagement.shares']
                },
                engagementRate: {
                  $multiply: [
                    {
                      $divide: [
                        { $add: ['$engagement.likes', '$engagement.comments', '$engagement.shares'] },
                        1000
                      ]
                    },
                    100
                  ]
                }
              }
            },

            // Stage 3: Group by platform and month
            {
              $group: {
                _id: {
                  platform: '$platform',
                  year: { $year: '$postedAt' },
                  month: { $month: '$postedAt' }
                },
                postCount: { $sum: 1 },
                totalLikes: { $sum: '$engagement.likes' },
                totalComments: { $sum: '$engagement.comments' },
                totalShares: { $sum: '$engagement.shares' },
                avgEngagementRate: { $avg: '$engagementRate' },
                maxLikes: { $max: '$engagement.likes' },
                minLikes: { $min: '$engagement.likes' }
              }
            },

            // Stage 4: Sort and filter
            {
              $sort: { '_id.year': 1, '_id.month': 1, 'postCount': -1 }
            },

            // Stage 5: Add ranking
            {
              $group: {
                _id: '$_id.platform',
                monthlyStats: {
                  $push: {
                    month: '$_id.month',
                    year: '$_id.year',
                    postCount: '$postCount',
                    totalLikes: '$totalLikes',
                    avgEngagementRate: '$avgEngagementRate'
                  }
                },
                totalPosts: { $sum: '$postCount' },
                totalLikes: { $sum: '$totalLikes' }
              }
            },

            // Stage 6: Final projection
            {
              $project: {
                platform: '$_id',
                monthlyStats: 1,
                totalPosts: 1,
                totalLikes: 1,
                avgMonthlyPosts: { $avg: '$postCount' }
              }
            }
          ]);
        }
      );

      expect(result).toHaveLength(3); // 3 platforms
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      console.log(`✅ Complex aggregation pipeline in ${duration.toFixed(2)}ms`);
      result.forEach(r => {
        console.log(`   - ${r.platform}: ${r.totalPosts} posts, ${r.totalLikes} total likes`);
      });
    });
  });

  /**
   * STEP 8: Verify all queries are under 5 seconds
   */
  describe('Step 8: Verify performance thresholds', () => {
    it('should have all aggregation queries under 5 seconds', () => {
      const failedTests = [];
      const warningTests = [];

      // Skip createLargeDataset from threshold check (bulk insert, not aggregation)
      const aggregationMetrics = { ...performanceMetrics };
      delete aggregationMetrics.createLargeDataset;

      for (const [test, duration] of Object.entries(aggregationMetrics)) {
        if (duration !== null) {
          if (duration > PERFORMANCE_THRESHOLD_MS) {
            failedTests.push({ test, duration });
          } else if (duration > WARNING_THRESHOLD_MS) {
            warningTests.push({ test, duration });
          }
        }
      }

      if (failedTests.length > 0) {
        console.log('\n❌ FAILED PERFORMANCE TESTS:');
        failedTests.forEach(({ test, duration }) => {
          console.log(`   - ${test}: ${duration.toFixed(2)}ms (exceeds ${PERFORMANCE_THRESHOLD_MS}ms)`);
        });
      }

      if (warningTests.length > 0) {
        console.log('\n⚠️  WARNING TESTS:');
        warningTests.forEach(({ test, duration }) => {
          console.log(`   - ${test}: ${duration.toFixed(2)}ms (exceeds ${WARNING_THRESHOLD_MS}ms)`);
        });
      }

      expect(failedTests).toHaveLength(0);
    });

    it('should calculate average query performance', () => {
      // Exclude createLargeDataset from average (it's bulk insert, not aggregation)
      const aggregationMetrics = { ...performanceMetrics };
      delete aggregationMetrics.createLargeDataset;

      const durations = Object.values(aggregationMetrics).filter(d => d !== null);
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

      console.log(`\n📊 Average aggregation query duration: ${avgDuration.toFixed(2)}ms`);
      console.log(`   Threshold: ${PERFORMANCE_THRESHOLD_MS}ms`);

      expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });
  });
});
