/**
 * Load Tests for Concurrent Operations
 *
 * Tests the system under concurrent load to ensure it can handle
 * multiple simultaneous users without performance degradation.
 *
 * Feature #197: Load tests for concurrent operations
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import mongoose from 'mongoose';
import MarketingPost from '../models/MarketingPost.js';
import fetch from 'node-fetch';

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const CONCURRENT_USERS = 100;
const REQUESTS_PER_USER = 10;
const MAX_RESPONSE_TIME_MS = 2000; // 2 seconds per request
const MAX_ERROR_RATE = 0.05; // 5% error rate threshold

// Performance tracking
const loadTestResults = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimes: [],
  errors: [],
  averageResponseTime: 0,
  minResponseTime: Infinity,
  maxResponseTime: 0,
  percentile95: 0,
  percentile99: 0,
  requestsPerSecond: 0,
  errorRate: 0
};

/**
 * Helper: Simulate a single user session
 */
async function simulateUserSession(userId) {
  const userResults = {
    userId,
    requests: 0,
    successes: 0,
    failures: 0,
    responseTimes: []
  };

  const operations = [
    // GET requests (read operations)
    { method: 'GET', path: '/api/health' },
    { method: 'GET', path: '/api/dashboard/metrics?period=24h' },
    { method: 'GET', path: '/api/dashboard/metrics?period=7d' },
    { method: 'GET', path: '/api/dashboard/metrics?period=30d' },
    { method: 'GET', path: '/api/content/posts?limit=10' },
    { method: 'GET', path: '/api/content/posts?limit=20' },
    { method: 'GET', path: '/api/todos' }
  ];

  for (let i = 0; i < REQUESTS_PER_USER; i++) {
    const operation = operations[Math.floor(Math.random() * operations.length)];

    try {
      const startTime = performance.now();
      const response = await fetch(`${API_BASE_URL}${operation.path}`, {
        method: operation.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: operation.body ? JSON.stringify(operation.body) : undefined
      });
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      userResults.requests++;
      userResults.responseTimes.push(responseTime);

      if (response.ok) {
        userResults.successes++;
      } else {
        userResults.failures++;
        loadTestResults.errors.push({
          userId,
          operation: operation.method + ' ' + operation.path,
          status: response.status,
          statusText: response.statusText
        });
      }
    } catch (error) {
      userResults.failures++;
      userResults.requests++;
      loadTestResults.errors.push({
        userId,
        operation: operation.method + ' ' + operation.path,
        error: error.message
      });
    }

    // Small random delay between requests (100-500ms)
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));
  }

  return userResults;
}

/**
 * Helper: Calculate percentiles
 */
function calculatePercentile(values, percentile) {
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index] || 0;
}

/**
 * Helper: Run concurrent load test
 */
async function runConcurrentLoadTest(userCount) {
  console.log(`\n🚀 Starting load test with ${userCount} concurrent users...`);
  const startTime = performance.now();

  // Create an array of user promises
  const userPromises = [];
  for (let i = 0; i < userCount; i++) {
    userPromises.push(simulateUserSession(i + 1));
  }

  // Execute all users concurrently
  const userResults = await Promise.all(userPromises);

  const endTime = performance.now();
  const totalDuration = endTime - startTime;

  // Aggregate results
  loadTestResults.totalRequests = userResults.reduce((sum, user) => sum + user.requests, 0);
  loadTestResults.successfulRequests = userResults.reduce((sum, user) => sum + user.successes, 0);
  loadTestResults.failedRequests = userResults.reduce((sum, user) => sum + user.failures, 0);

  // Collect all response times
  loadTestResults.responseTimes = userResults.flatMap(user => user.responseTimes);

  // Calculate statistics
  loadTestResults.averageResponseTime = loadTestResults.responseTimes.reduce((sum, time) => sum + time, 0) / loadTestResults.responseTimes.length;
  loadTestResults.minResponseTime = Math.min(...loadTestResults.responseTimes);
  loadTestResults.maxResponseTime = Math.max(...loadTestResults.responseTimes);
  loadTestResults.percentile95 = calculatePercentile(loadTestResults.responseTimes, 95);
  loadTestResults.percentile99 = calculatePercentile(loadTestResults.responseTimes, 99);
  loadTestResults.requestsPerSecond = (loadTestResults.totalRequests / totalDuration) * 1000;
  loadTestResults.errorRate = loadTestResults.failedRequests / loadTestResults.totalRequests;

  console.log(`✅ Load test completed in ${totalDuration.toFixed(2)}ms`);
  console.log(`📊 Total requests: ${loadTestResults.totalRequests}`);
  console.log(`✅ Successful: ${loadTestResults.successfulRequests}`);
  console.log(`❌ Failed: ${loadTestResults.failedRequests}`);
  console.log(`⚡ Requests per second: ${loadTestResults.requestsPerSecond.toFixed(2)}`);

  return userResults;
}

describe('Load Tests for Concurrent Operations', () => {

  it('Step 1: Set up load testing tool', async () => {
    console.log('\n📋 Step 1: Setting up load testing infrastructure...');

    // Verify API is accessible
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      expect(response.ok).toBe(true);

      const health = await response.json();
      console.log('✅ API server is running and healthy');
      console.log(`   Environment: ${health.environment}`);
      console.log(`   Uptime: ${health.uptimeHuman}`);
      console.log(`   Database: ${health.database.connected ? 'Connected' : 'Disconnected'}`);
    } catch (error) {
      throw new Error(`API server not accessible: ${error.message}`);
    }

    console.log('✅ Load testing tool setup complete');
  }, 30000);

  it('Step 2: Simulate 100 concurrent users', async () => {
    console.log('\n👥 Step 2: Simulating concurrent users...');

    const userResults = await runConcurrentLoadTest(CONCURRENT_USERS);

    // Verify all users completed their sessions
    expect(userResults).toHaveLength(CONCURRENT_USERS);

    userResults.forEach(user => {
      expect(user.requests).toBe(REQUESTS_PER_USER);
      expect(user.responseTimes).toHaveLength(REQUESTS_PER_USER);
    });

    console.log(`✅ Successfully simulated ${CONCURRENT_USERS} concurrent users`);
    console.log(`   Each user made ${REQUESTS_PER_USER} requests`);
    console.log(`   Total requests: ${loadTestResults.totalRequests}`);
  }, 120000); // 2 minute timeout for concurrent test

  it('Step 3: Verify response times acceptable', async () => {
    console.log('\n⏱️  Step 3: Analyzing response times...');

    console.log('\n📊 Response Time Statistics:');
    console.log(`   Average: ${loadTestResults.averageResponseTime.toFixed(2)}ms`);
    console.log(`   Minimum: ${loadTestResults.minResponseTime.toFixed(2)}ms`);
    console.log(`   Maximum: ${loadTestResults.maxResponseTime.toFixed(2)}ms`);
    console.log(`   95th percentile: ${loadTestResults.percentile95.toFixed(2)}ms`);
    console.log(`   99th percentile: ${loadTestResults.percentile99.toFixed(2)}ms`);

    // Verify average response time is acceptable
    expect(loadTestResults.averageResponseTime).toBeLessThan(MAX_RESPONSE_TIME_MS);
    console.log(`✅ Average response time within threshold (< ${MAX_RESPONSE_TIME_MS}ms)`);

    // Verify 95th percentile is acceptable (stricter threshold)
    expect(loadTestResults.percentile95).toBeLessThan(MAX_RESPONSE_TIME_MS * 1.5);
    console.log(`✅ 95th percentile response time acceptable (< ${MAX_RESPONSE_TIME_MS * 1.5}ms)`);

    // Verify 99th percentile is acceptable (even stricter threshold)
    expect(loadTestResults.percentile99).toBeLessThan(MAX_RESPONSE_TIME_MS * 2);
    console.log(`✅ 99th percentile response time acceptable (< ${MAX_RESPONSE_TIME_MS * 2}ms)`);

    console.log('\n✅ All response time metrics are within acceptable limits');
  }, 10000);

  it('Step 4: Check for errors', async () => {
    console.log('\n🔍 Step 4: Checking for errors...');

    console.log(`\n📊 Error Statistics:`);
    console.log(`   Total requests: ${loadTestResults.totalRequests}`);
    console.log(`   Successful: ${loadTestResults.successfulRequests}`);
    console.log(`   Failed: ${loadTestResults.failedRequests}`);
    console.log(`   Error rate: ${(loadTestResults.errorRate * 100).toFixed(2)}%`);

    // Verify error rate is within acceptable threshold
    expect(loadTestResults.errorRate).toBeLessThan(MAX_ERROR_RATE);
    console.log(`✅ Error rate within acceptable threshold (< ${MAX_ERROR_RATE * 100}%)`);

    // Display sample errors if any occurred
    if (loadTestResults.errors.length > 0) {
      console.log(`\n⚠️  Sample errors (first 10):`);
      loadTestResults.errors.slice(0, 10).forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.operation}: ${error.status || error.error}`);
      });

      if (loadTestResults.errors.length > 10) {
        console.log(`   ... and ${loadTestResults.errors.length - 10} more errors`);
      }
    } else {
      console.log('\n✅ No errors detected during load test');
    }

    console.log('\n✅ System handled concurrent load successfully');
  }, 10000);

  it('Step 5: Identify bottlenecks', async () => {
    console.log('\n🔎 Step 5: Identifying potential bottlenecks...');

    console.log('\n📊 System Performance Analysis:');

    // Analyze throughput
    console.log(`\n⚡ Throughput Analysis:`);
    console.log(`   Requests per second: ${loadTestResults.requestsPerSecond.toFixed(2)}`);
    console.log(`   Concurrent users: ${CONCURRENT_USERS}`);
    console.log(`   Requests per user: ${REQUESTS_PER_USER}`);

    if (loadTestResults.requestsPerSecond < 50) {
      console.log('   ⚠️  WARNING: Low throughput detected');
      console.log('      Recommendation: Investigate database query optimization');
    } else if (loadTestResults.requestsPerSecond < 100) {
      console.log('   ⚠️  NOTICE: Moderate throughput');
      console.log('      Recommendation: Monitor under higher load');
    } else {
      console.log('   ✅ Excellent throughput');
    }

    // Analyze response time distribution
    console.log(`\n⏱️  Response Time Distribution:`);
    const veryFastRequests = loadTestResults.responseTimes.filter(t => t < 200).length;
    const fastRequests = loadTestResults.responseTimes.filter(t => t >= 200 && t < 500).length;
    const moderateRequests = loadTestResults.responseTimes.filter(t => t >= 500 && t < 1000).length;
    const slowRequests = loadTestResults.responseTimes.filter(t => t >= 1000).length;

    console.log(`   Very fast (< 200ms): ${veryFastRequests} (${(veryFastRequests / loadTestResults.totalRequests * 100).toFixed(1)}%)`);
    console.log(`   Fast (200-500ms): ${fastRequests} (${(fastRequests / loadTestResults.totalRequests * 100).toFixed(1)}%)`);
    console.log(`   Moderate (500-1000ms): ${moderateRequests} (${(moderateRequests / loadTestResults.totalRequests * 100).toFixed(1)}%)`);
    console.log(`   Slow (> 1000ms): ${slowRequests} (${(slowRequests / loadTestResults.totalRequests * 100).toFixed(1)}%)`);

    if (slowRequests > loadTestResults.totalRequests * 0.1) {
      console.log('   ⚠️  WARNING: More than 10% of requests are slow');
      console.log('      Recommendations:');
      console.log('      - Check database connection pooling');
      console.log('      - Review API endpoint efficiency');
      console.log('      - Consider implementing caching');
    }

    // Analyze error patterns
    console.log(`\n❌ Error Pattern Analysis:`);
    if (loadTestResults.errors.length > 0) {
      const errorsByOperation = {};
      loadTestResults.errors.forEach(error => {
        const operation = error.operation;
        errorsByOperation[operation] = (errorsByOperation[operation] || 0) + 1;
      });

      console.log('   Errors by operation:');
      Object.entries(errorsByOperation)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .forEach(([operation, count]) => {
          console.log(`   - ${operation}: ${count} errors`);
        });

      const operationsWithErrors = Object.keys(errorsByOperation).length;
      console.log(`   Operations with errors: ${operationsWithErrors}`);

      if (operationsWithErrors > 0) {
        console.log('\n   🔧 Recommendations:');
        if (errorsByOperation['GET /api/dashboard/metrics?period=24h'] > 0) {
          console.log('      - Optimize dashboard metrics queries for 24h period');
        }
        if (errorsByOperation['GET /api/dashboard/metrics?period=7d'] > 0) {
          console.log('      - Optimize dashboard metrics queries for 7d period');
        }
        if (errorsByOperation['GET /api/dashboard/metrics?period=30d'] > 0) {
          console.log('      - Optimize dashboard metrics queries for 30d period');
        }
        if (errorsByOperation['GET /api/content/posts?limit=10'] > 0) {
          console.log('      - Optimize posts listing query');
        }
        if (errorsByOperation['GET /api/content/posts?limit=20'] > 0) {
          console.log('      - Optimize posts listing query with higher limit');
        }
        if (errorsByOperation['GET /api/todos'] > 0) {
          console.log('      - Optimize todos listing query');
        }
      }
    } else {
      console.log('   ✅ No error patterns detected');
    }

    // Summary and recommendations
    console.log('\n📋 Bottleneck Analysis Summary:');
    const bottlenecks = [];

    if (loadTestResults.averageResponseTime > MAX_RESPONSE_TIME_MS * 0.5) {
      bottlenecks.push('Average response time is approaching threshold');
    }

    if (loadTestResults.errorRate > MAX_ERROR_RATE * 0.5) {
      bottlenecks.push('Error rate is approaching threshold');
    }

    if (loadTestResults.requestsPerSecond < 50) {
      bottlenecks.push('Low throughput detected');
    }

    if (slowRequests > loadTestResults.totalRequests * 0.1) {
      bottlenecks.push('High percentage of slow requests');
    }

    if (bottlenecks.length === 0) {
      console.log('✅ No significant bottlenecks detected');
      console.log('   The system handles concurrent load well');
    } else {
      console.log('⚠️  Potential bottlenecks identified:');
      bottlenecks.forEach((bottleneck, index) => {
        console.log(`   ${index + 1}. ${bottleneck}`);
      });
    }

    console.log('\n✅ Bottleneck analysis complete');
  }, 15000);
});

/**
 * Export results for external reporting
 */
export { loadTestResults };
