# Regression Test Suite

## Overview

The regression test suite ensures that no functionality breaks when changes are made to the codebase. It covers the most critical aspects of the application and should be run before any deployment or after significant changes.

## What's Tested

The regression suite tests **10 critical areas**:

### 1. Database Operations
- MongoDB connectivity
- CRUD operations (Create, Read, Update, Delete)
- Aggregation queries
- Data persistence

### 2. Data Models
- Marketing posts model
- Marketing tasks model
- Revenue records model
- Field validation

### 3. API Endpoint Functionality
- Health check endpoint
- Dashboard metrics
- Budget utilization
- Content library
- Todo management
- Error responses

### 4. Error Handling
- Invalid ObjectId format
- Missing required fields
- Database connection errors
- Graceful degradation

### 5. Data Validation
- Enum value validation (platform, status)
- Date field validation
- Required field validation

### 6. Performance Benchmarks
- Simple read queries (< 100ms)
- Aggregation queries (< 500ms)
- API health checks (< 200ms)

### 7. Integration Points
- Database indexes
- Collection structure
- External API health

### 8. Critical User Flows
- Task creation and completion workflow
- Content creation and approval workflow
- End-to-end scenarios

### 9. Data Consistency
- Timestamp consistency
- Automatic updatedAt updates
- Data integrity

### 10. Security and Validation
- Input sanitization
- Special character handling
- XSS prevention

## Running the Tests

### Option 1: Quick Regression Tests (Recommended for Development)

```bash
npm run test:regression
```

This runs the full regression suite with detailed reporting.

### Option 2: Run Tests Directly with Vitest

```bash
npx vitest run backend/tests/regression-suite.test.js --reporter=verbose
```

### Option 3: Watch Mode (During Development)

```bash
npx vitest watch backend/tests/regression-suite.test.js
```

### Option 4: Run Specific Test Category

```bash
# Run only database tests
npx vitest run backend/tests/regression-suite.test.js -t "Database Operations"

# Run only API tests
npx vitest run backend/tests/regression-suite.test.js -t "API Endpoint Functionality"
```

## Continuous Integration

The regression tests run automatically:

1. **On every push** to `main` or `develop` branches
2. **On every pull request** targeting `main` or `develop`
3. **Daily at 6 AM UTC** (scheduled run)
4. **Manual trigger** via GitHub Actions UI

### CI/CD Pipeline

See `.github/workflows/regression-tests.yml` for the complete CI/CD configuration.

The pipeline includes:
- ✅ Regression test suite
- ✅ Performance benchmarks
- ✅ Load testing
- ✅ Security scanning
- 📊 Test result reporting
- 💬 PR comments with results

## Pre-Commit Hooks

A pre-commit hook runs quick smoke tests before each commit:

```bash
# Automatically runs before commit
git commit .
```

The pre-commit tests are fast and catch obvious issues early.

## Test Reports

After running tests, a report is generated at:

```
test-reports/regression-report.json
```

This includes:
- Timestamp
- Duration
- Pass/fail status
- Coverage areas
- Error details (if failed)

## Interpreting Results

### ✅ All Tests Passed

```
✅ REGRESSION TESTS PASSED

All regression tests passed successfully!
Duration: 5.23s
Timestamp: 2026-01-15T18:30:00.000Z

📊 Test Coverage Areas:
   ✓ Database Operations
   ✓ Data Models
   ✓ API Endpoint Functionality
   ✓ Error Handling
   ✓ Data Validation
   ✓ Performance Benchmarks
   ✓ Integration Points
   ✓ Critical User Flows
   ✓ Data Consistency
   ✓ Security and Validation

✨ No regressions detected!
```

**Action**: None needed. Your changes are safe to deploy.

### ❌ Tests Failed

```
❌ REGRESSION TESTS FAILED

One or more regression tests failed!
Duration: 3.45s
Timestamp: 2026-01-15T18:30:00.000Z

⚠️  Regressions detected!
Please review the failed tests above and fix the issues.

💡 Common causes:
   1. Breaking changes to database schema
   2. API endpoint modifications
   3. Data validation logic changes
   4. Performance degradation
   5. Error handling updates
```

**Action**: Review the failed tests, fix the issues, and run again.

## Troubleshooting

### Server Not Running

If you see:
```
❌ Server health check failed
   Error: fetch failed
```

**Solution**: Start the backend server
```bash
npm run dev:backend
```

### Database Connection Issues

If you see:
```
MongoServerError: Connection refused
```

**Solution**: Ensure MongoDB is running and MONGODB_URI is set in `.env`

### Performance Test Failures

If performance benchmarks fail:
```
Expected duration to be less than 100ms, but got 250ms
```

**Solution**: This indicates performance degradation. Check:
- Database query optimization
- Network latency
- Server load
- Index usage

## Adding New Tests

To add a new regression test:

1. Open `backend/tests/regression-suite.test.js`
2. Add a new `describe` block or `it` test
3. Follow the existing pattern
4. Test actual functionality, not implementation details

Example:

```javascript
describe('New Feature Tests', () => {
  it('should do something critical', async () => {
    const result = await someOperation();
    expect(result).toBe(expectedValue);
  });
});
```

## Best Practices

### When to Run Regression Tests

- ✅ **Before deploying** to any environment
- ✅ **After merging** pull requests
- ✅ **After database schema changes**
- ✅ **After API modifications**
- ✅ **After refactoring**
- ✅ **Before releases**

### Test Maintenance

1. **Keep tests fast**: Tests should complete in under 10 seconds
2. **Test behavior, not implementation**: Focus on what the user sees
3. **Use real data**: Don't mock critical paths
4. **Clean up after tests**: Remove test data
5. **Update tests when features change**: Keep tests in sync

### Code Quality

- Write clear, descriptive test names
- Add comments for complex test logic
- Use setup/teardown properly
- Test both success and failure cases
- Mock external services appropriately

## Performance Benchmarks

Current thresholds (may need adjustment):

| Operation | Threshold | Current Average |
|-----------|-----------|-----------------|
| Simple read query | < 100ms | ~20ms |
| Aggregation query | < 500ms | ~87ms |
| API health check | < 200ms | ~50ms |

If thresholds are consistently exceeded, consider:
- Adding database indexes
- Optimizing queries
- Caching frequently accessed data
- Scaling infrastructure

## Related Tests

- **Unit tests**: `backend/tests/*.test.js` - Test individual functions
- **Integration tests**: `backend/tests/*-integration.test.js` - Test component interactions
- **Performance tests**: `backend/tests/data-aggregation-performance.test.js`
- **Load tests**: `backend/tests/load-testing.test.js`

## Support

If you encounter issues:

1. Check the test output for specific error messages
2. Review server logs: `logs/backend.log`
3. Verify environment configuration
4. Check MongoDB connection
5. Review recent code changes

## Future Improvements

- [ ] Add visual regression tests for UI
- [ ] Add API contract testing
- [ ] Add chaos engineering tests
- [ ] Add multi-region testing
- [ ] Add canary deployment testing

## Version History

- **v1.0** (2026-01-15): Initial regression test suite with 10 coverage areas
