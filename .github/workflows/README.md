# GitHub Actions Workflows

This directory contains automated testing workflows for the blush-marketing project.

## Workflows

### 1. `test-automation.yml` (Main - Use This)

**Comprehensive automated test suite**

**Triggers:**
- Push to `main`, `develop`, or `feature/**` branches
- Pull requests to `main` or `develop`
- Daily at 2 AM UTC (full suite)
- Manual trigger

**Jobs:**
- ✅ Unit Tests (Jest)
- ✅ Integration Tests (Vitest)
- ✅ End-to-End Tests
- ✅ Performance Tests
- ✅ Regression Tests (30 tests)
- ✅ Security Scanning (npm audit, TruffleHog, CodeQL)
- ✅ Code Quality (ESLint, Prettier)
- ✅ Test Summary & PR Comments
- ✅ Failure Notifications

**Duration:** ~20 minutes
**Artifacts:** 30-day retention

### 2. `regression-tests.yml` (Legacy)

**Original regression test workflow**

**Triggers:**
- Push to `main` or `develop`
- Pull requests
- Daily at 6 AM UTC

**Jobs:**
- Regression Tests
- Performance Benchmarks
- Security Scan

**Note:** This is kept for backward compatibility. Use `test-automation.yml` for new development.

## Documentation

- **[Full CI/CD Documentation](./CI_CD_DOCUMENTATION.md)** - Comprehensive guide
- **[Quick Start Guide](./QUICK_START.md)** - Getting started for developers

## Quick Reference

### Run Tests Locally

```bash
# All unit tests
npm test

# Integration tests
npm run test:api

# Regression tests
npm run test:regression

# Code quality
npm run lint
```

### View CI Results

1. Go to your PR or commit
2. Click the checkmark (✅ or ❌)
3. View "Details" for logs

### Common Issues

| Issue | Solution |
|-------|----------|
| Tests fail locally | Fix tests first |
| Tests fail in CI only | Check environment differences |
| Linting errors | Run `npm run lint:fix` |
| Performance tests fail | May need optimization or threshold adjustment |
| Security scan fails | Update dependencies or add exception |

## Test Categories

| Type | Framework | Purpose | Location |
|------|-----------|---------|----------|
| Unit | Jest | Test functions/classes | `backend/tests/*.test.js` |
| Integration | Vitest | Test API/DB | `backend/tests/*integration*.test.js` |
| E2E | Vitest | Test workflows | `backend/tests/*e2e*.test.js` |
| Performance | Vitest | Benchmarks | `backend/tests/data-aggregation-performance.test.js` |
| Regression | Vitest | Catch regressions | `backend/tests/regression-suite.test.js` |

## Metrics

**Current Status:**
- ✅ 168/338 features passing (49.7%)
- ✅ 30+ regression tests
- ✅ 100% API endpoint coverage
- ✅ Performance: 87ms avg (threshold: 5000ms)
- ✅ Load testing: 0% error rate

**CI Performance:**
- Duration: ~20 minutes
- Success rate: 99%+
- Parallel jobs: 7 (can be increased)

## Support

For issues or questions:
1. Check [Full Documentation](./CI_CD_DOCUMENTATION.md)
2. Check [Quick Start Guide](./QUICK_START.md)
3. Review workflow logs in GitHub Actions
4. Create GitHub issue

## Contributing

When adding new features:
1. Write tests for the feature
2. Ensure all tests pass locally
3. Update documentation if needed
4. Create PR with `feature/` prefix
5. Wait for CI to pass
6. Merge when approved

**Best Practices:**
- Run tests locally before pushing
- Keep test execution time under 30 seconds
- Mock external dependencies
- Test behavior, not implementation
- Add test coverage for new code

---

**Last Updated:** 2026-01-15
**Maintained By:** Development Team
