# CI/CD Automated Testing Documentation

## Overview

This document describes the automated testing infrastructure for the blush-marketing project. The CI/CD pipeline uses GitHub Actions to automatically run tests on every push, pull request, and on a daily schedule.

## CI/CD Platform

**Platform:** GitHub Actions

GitHub Actions was chosen because:
- Native integration with GitHub repositories
- Free for public repositories, generous free tier for private repos
- Excellent support for Node.js, MongoDB, and testing frameworks
- Easy workflow configuration with YAML
- Built-in artifact storage and reporting
- PR commenting capabilities

## Workflow Files

### 1. `test-automation.yml` (Main Test Suite)

This is the comprehensive automated test suite that runs on:
- Every push to `main`, `develop`, or `feature/**` branches
- Every pull request to `main` or `develop`
- Daily at 2 AM UTC (full test suite)
- Manual trigger via `workflow_dispatch`

#### Jobs

#### Job 1: Unit Tests
- **Purpose:** Test individual functions and components in isolation
- **Tests Run:** All Jest unit tests
- **Coverage:** Generates code coverage reports
- **Artifacts:** Coverage reports uploaded to Codecov
- **Duration:** ~2-3 minutes

#### Job 2: Integration Tests
- **Purpose:** Test API endpoints and database operations
- **Tests Run:** All Vitest integration tests
- **Database:** MongoDB service container
- **Artifacts:** Test results uploaded as artifacts
- **Duration:** ~3-5 minutes

#### Job 3: End-to-End Tests
- **Purpose:** Test complete user workflows
- **Tests Run:** Integration tests with running backend
- **Setup:** Builds frontend, starts backend server
- **Artifacts:** E2E test results
- **Duration:** ~5-7 minutes

#### Job 4: Performance Tests
- **Purpose:** Ensure performance doesn't degrade
- **Tests Run:**
  - Data aggregation performance (must complete < 5 seconds)
  - Load testing (100 concurrent users, 1000 requests)
- **Artifacts:** Performance metrics, load test results
- **PR Comments:** Posts performance summary to PR
- **Duration:** ~2-3 minutes

#### Job 5: Regression Tests
- **Purpose:** Catch regressions in existing functionality
- **Tests Run:** Full regression suite (30 tests)
- **Coverage Areas:**
  - Database operations
  - Data models
  - API endpoints
  - Error handling
  - Data validation
  - Performance benchmarks
  - Integration points
  - User flows
  - Data consistency
  - Security
- **Artifacts:** Regression test report
- **Duration:** ~5-8 minutes

#### Job 6: Security Scanning
- **Purpose:** Identify security vulnerabilities
- **Scans:**
  - npm audit (dependency vulnerabilities)
  - TruffleHog (secret detection)
  - CodeQL analysis
- **Duration:** ~2-3 minutes

#### Job 7: Code Quality
- **Purpose:** Maintain code quality standards
- **Checks:**
  - ESLint (linting)
  - Prettier (code formatting)
- **Duration:** ~1-2 minutes

#### Job 8: Test Summary
- **Purpose:** Aggregate all test results
- **Output:**
  - GitHub Step Summary
  - PR comment with overall status
- **Duration:** ~30 seconds

#### Job 9: Notify on Failure
- **Purpose:** Alert on test failures
- **Triggers:** Only runs if critical tests fail
- **Output:** Error messages with job statuses

### 2. `regression-tests.yml` (Legacy Regression Tests)

This is the original regression test workflow. It runs on:
- Push to `main` or `develop`
- Pull requests
- Daily at 6 AM UTC

This workflow is kept for backward compatibility but will be deprecated in favor of `test-automation.yml`.

## Test Reporting

### PR Comments

When tests run on a pull request, automated comments are posted:

1. **Regression Test Results**
   - Overall status (passed/failed)
   - Duration
   - Coverage areas
   - Error details if failed

2. **Performance Test Results**
   - Aggregation query performance
   - Load test metrics
   - Throughput and response times

3. **Overall Test Suite Summary**
   - Status of all 7 test jobs
   - Overall pass/fail status

### Artifacts

Test artifacts are stored for 30 days:
- Unit test coverage reports
- Integration test results
- E2E test results
- Performance metrics
- Regression test reports
- Security scan results

### GitHub Step Summary

Each workflow run generates a step summary visible in the Actions tab showing:
- Individual job statuses
- Overall status
- Links to artifacts

## Test Failure Notifications

### Automatic Notifications

Test failures trigger:

1. **GitHub Status Checks**
   - PR checks show red ✖ for failed jobs
   - Commit status indicators

2. **PR Comments**
   - Detailed failure information
   - Links to logs

3. **Error Messages**
   - `::error::` annotations in workflow logs
   - Job failure notifications

4. **Workflow Summary**
   - Failed jobs highlighted in red
   - Overall status shows FAILED

### Notification Channels

Currently supported:
- GitHub UI (status checks, comments, summaries)
- GitHub Actions logs

Future enhancements (optional):
- Slack notifications
- Email notifications
- Discord webhook
- Microsoft Teams integration

## Running Tests Locally

Before pushing, run tests locally:

```bash
# Run all unit tests
npm test

# Run unit tests with coverage
npm run test:coverage

# Run integration tests
npm run test:api

# Run regression tests
npm run test:regression

# Run specific test file
npx vitest run backend/tests/dashboard.test.js

# Run tests in watch mode
npm run test:watch
```

## Test Categories

### Unit Tests
- **Framework:** Jest
- **Purpose:** Test individual functions and classes
- **Location:** `backend/tests/*.test.js`
- **Examples:**
  - `health-unit.test.js`
  - `logger.test.js`
  - `rateLimiter.test.js`

### Integration Tests
- **Framework:** Vitest
- **Purpose:** Test API endpoints and database operations
- **Location:** `backend/tests/*integration*.test.js`
- **Examples:**
  - `mongodb-integration.test.js`
  - `external-api-integration.test.js`
  - `chat-integration.test.js`

### End-to-End Tests
- **Framework:** Vitest
- **Purpose:** Test complete workflows
- **Location:** `backend/tests/*e2e*.test.js`
- **Examples:**
  - `dashboard-e2e.test.js`
  - `content-approval-e2e.test.js`

### Performance Tests
- **Framework:** Vitest
- **Purpose:** Benchmark performance
- **Location:** `backend/tests/data-aggregation-performance.test.js`
- **Thresholds:**
  - Aggregation queries: < 5 seconds
  - Load tests: 100 concurrent users, < 2% error rate

### Regression Tests
- **Framework:** Vitest
- **Purpose:** Catch regressions
- **Location:** `backend/tests/regression-suite.test.js`
- **Coverage:** 30 tests across 10 areas

## Performance Benchmarks

### Data Aggregation
- **Threshold:** 5 seconds
- **Current Performance:** ~87ms average
- **Status:** ✅ Well under threshold

### Load Testing
- **Threshold:** < 2% error rate
- **Current Performance:** 0% error rate
- **Throughput:** 73 requests/second
- **Status:** ✅ Passing

## Security Scanning

### npm Audit
- **Frequency:** Every test run
- **Severity:** Moderate and above
- **Action:** Fails on critical vulnerabilities

### TruffleHog
- **Purpose:** Detect secrets in code
- **Scan:** Full repository diff
- **Action:** Fails on secrets found

### CodeQL
- **Purpose:** Static code analysis
- **Language:** JavaScript
- **Action:** Reports security issues

## Code Quality

### ESLint
- **Purpose:** Code linting
- **Configuration:** `.eslintrc.js`
- **Action:** Reports linting errors

### Prettier
- **Purpose:** Code formatting
- **Configuration:** `.prettierrc`
- **Action:** Checks formatting

## Troubleshooting

### Tests Failing in CI but Passing Locally

**Possible Causes:**
1. Environment differences (Node version, MongoDB version)
2. Race conditions in tests
3. Timing issues (CI runs slower)
4. Missing environment variables

**Solutions:**
- Ensure same Node version locally
- Use `npm ci` instead of `npm install`
- Add proper waits and retries
- Check `.env.example` for required variables

### Flaky Tests

**Identification:**
- Tests that sometimes pass, sometimes fail
- Random failures in CI

**Solutions:**
- Add proper cleanup in `afterEach`
- Use proper waits (no fixed `sleep()`)
- Increase test timeouts if needed
- Mock external dependencies

### Performance Test Failures

**Possible Causes:**
- Slower CI environment
- Database not optimized
- Large dataset

**Solutions:**
- Increase thresholds if justified
- Check query performance
- Use database indexes
- Reduce dataset size for tests

## Best Practices

### Writing Tests

1. **Test behavior, not implementation**
   - Test what users see, not how code works
   - Example: Test "user can login" not "login() function works"

2. **Keep tests independent**
   - Each test should work alone
   - Don't rely on test execution order

3. **Use descriptive test names**
   - `should return 404 when post not found`
   - Not `testPostNotFound()`

4. **Follow AAA pattern**
   - Arrange: Set up test data
   - Act: Execute code
   - Assert: Verify results

5. **Mock external dependencies**
   - Don't call real APIs in tests
   - Use test doubles for databases

### CI/CD Maintenance

1. **Keep dependencies updated**
   - Regularly update GitHub Actions
   - Update testing frameworks

2. **Monitor test duration**
   - Slow tests slow down development
   - Optimize or parallelize if > 10 minutes

3. **Review failures promptly**
   - Don't ignore red X on PRs
   - Fix tests or code, don't disable checks

4. **Keep tests in version control**
   - All tests committed with code
   - No local-only tests

## Configuration Files

### `.github/workflows/test-automation.yml`
Main CI/CD workflow configuration

### `.github/workflows/regression-tests.yml`
Legacy regression test workflow

### `vitest.config.api.js`
Vitest configuration for API tests

### `jest.config.js`
Jest configuration for unit tests

### `.eslintrc.js`
ESLint configuration

### `.prettierrc`
Prettier configuration

## NPM Scripts

```json
{
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "test:regression": "node backend/tests/run-regression-tests.mjs",
  "test:api": "vitest run backend/tests --reporter=verbose"
}
```

## Environment Variables

### Required for Tests

- `MONGODB_URI` - MongoDB connection string (test database)
- `NODE_ENV` - Set to `test`
- `CI` - Set to `true` in CI environment
- `PORT` - Backend port (default: 3001)

### Optional for Tests

- `TEST_TIMEOUT` - Override default test timeout
- `MONGODB_TEST_URI` - Alternative test DB URI

## Future Enhancements

### Planned Features

1. **Slack Integration**
   - Notify failures to Slack channel
   - Daily test summaries

2. **Test Result History**
   - Track test performance over time
   - Identify slow tests

3. **Parallel Job Execution**
   - Run jobs in parallel to reduce CI time
   - Currently ~20 minutes total

4. **Deployment Automation**
   - Auto-deploy on merge to main
   - After all tests pass

5. **Flaky Test Detection**
   - Automatically detect flaky tests
   - Retry failed tests once

6. **Coverage Tracking**
   - Track coverage percentage over time
   - Fail PRs if coverage drops

### Contributing

To add new tests or improve CI/CD:

1. Add test files to `backend/tests/`
2. Update this documentation
3. Test locally first: `npm test`
4. Ensure CI passes before merging

## Support

For issues with CI/CD:

1. Check workflow logs in GitHub Actions tab
2. Review this documentation
3. Check GitHub Actions documentation: https://docs.github.com/en/actions

## Summary

The automated testing infrastructure ensures:
- ✅ All tests run on every PR
- ✅ Performance is monitored
- ✅ Security issues are caught early
- ✅ Code quality is maintained
- ✅ Regressions are detected
- ✅ Fast feedback to developers

Total CI time: ~20 minutes
Test coverage: 30+ tests across 7 categories
Success rate: 99%+ (when code is working)
