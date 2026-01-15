# Code Coverage Reporting

## Overview

This project has comprehensive code coverage reporting configured using **Vitest** with the **v8** coverage provider. Coverage reports help ensure code quality and maintain high test coverage across the codebase.

## Configuration

### Coverage Provider
- **Tool**: Vitest with v8 provider (`@vitest/coverage-v8`)
- **Version**: ^4.0.17
- **Threshold**: 80% minimum coverage for lines, branches, functions, and statements

### Configuration Files
- `vitest.config.api.js` - Vitest coverage configuration
- `jest.config.js` - Jest coverage configuration (for legacy tests)
- `run-coverage-report.mjs` - Coverage report generation script
- `scripts/upload-coverage.mjs` - Coverage upload script

## Usage

### Generate Coverage Report

```bash
# Generate full coverage report
npm run test:coverage

# Run unit tests with coverage
npm run test:unit

# Verify coverage configuration
node verify-coverage.mjs
```

### Coverage Reports

After running tests with coverage, reports are generated in multiple formats:

- **HTML Report**: `coverage/vitest/index.html`
  - Interactive HTML coverage report
  - Open in browser to explore coverage by file

- **LCOV Report**: `coverage/vitest/lcov.info`
  - Standard LCOV format
  - Used by CI/CD systems and coverage services

- **JSON Summary**: `coverage/vitest/coverage-summary.json`
  - Machine-readable coverage data
  - Used for programmatic analysis

- **Text Report**: Console output
  - Quick overview of coverage metrics
  - Shows files below threshold

### Uploading Coverage

```bash
# Upload to coverage service (local storage)
node scripts/upload-coverage.mjs local

# Upload to Codecov (requires CODECOV_TOKEN)
COVERAGE_SERVICE=codecov node scripts/upload-coverage.mjs

# Upload to Coveralls (requires COVERALLS_REPO_TOKEN)
COVERAGE_SERVICE=coveralls node scripts/upload-coverage.mjs
```

## Coverage Thresholds

The project enforces **80% minimum coverage** across all metrics:

- **Lines**: 80%
- **Branches**: 80%
- **Functions**: 80%
- **Statements**: 80%

If coverage falls below these thresholds, the build will fail.

## Coverage Reports in CI/CD

### GitHub Actions

The project includes automated coverage reporting in CI/CD:

```yaml
# .github/workflows/test-automation.yml
- name: Run Tests with Coverage
  run: npm run test:coverage

- name: Upload Coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/vitest/lcov.info
    flags: unittests
```

### Local Development

For local development, coverage reports are generated automatically when running:

```bash
npm run test:coverage
```

View the HTML report:

```bash
# On Linux/Mac
open coverage/vitest/index.html

# On Windows
start coverage/vitest/index.html
```

## Interpreting Coverage Reports

### Coverage Metrics

- **Line Coverage**: Percentage of executable lines that were executed
- **Branch Coverage**: Percentage of code branches that were executed
- **Function Coverage**: Percentage of functions that were called
- **Statement Coverage**: Percentage of statements that were executed

### HTML Report

The HTML report provides:
- File-by-file breakdown
- Line-by-line coverage indicators
- Color-coded coverage (green = covered, red = uncovered)
- Click to drill down into specific files

### Improving Coverage

To improve coverage:

1. **Identify uncovered code**:
   ```bash
   npm run test:coverage
   open coverage/vitest/index.html
   ```

2. **Add tests for uncovered paths**:
   - Look for red lines in HTML report
   - Focus on critical business logic
   - Test edge cases and error conditions

3. **Re-run coverage**:
   ```bash
   npm run test:coverage
   ```

4. **Verify threshold met**:
   - Check console output for coverage percentage
   - Ensure all metrics are ≥ 80%

## Best Practices

1. **Run coverage before committing**:
   ```bash
   npm run test:coverage
   ```

2. **Review coverage reports regularly**:
   - Check for declining coverage
   - Identify untested critical paths

3. **Maintain high coverage**:
   - Aim for 80%+ coverage
   - Focus coverage on business logic
   - Don't obsess over 100% coverage

4. **Use coverage as a guide, not a goal**:
   - High coverage ≠ bug-free code
   - Quality of tests matters more than quantity
   - Focus on meaningful tests

## Troubleshooting

### Coverage not generating

**Problem**: Coverage reports not generated after running tests

**Solution**:
1. Verify `@vitest/coverage-v8` is installed:
   ```bash
   npm list @vitest/coverage-v8
   ```

2. Check vitest config includes coverage settings:
   ```bash
   grep -A 10 "coverage:" vitest.config.api.js
   ```

3. Run with explicit coverage flag:
   ```bash
   npx vitest run --coverage
   ```

### Coverage below threshold

**Problem**: Coverage below 80% threshold

**Solution**:
1. Identify which files need coverage:
   ```bash
   npm run test:coverage
   open coverage/vitest/index.html
   ```

2. Add tests for uncovered code paths

3. Re-run coverage to verify improvement

### Slow coverage generation

**Problem**: Coverage generation takes too long

**Solution**:
1. Run tests on specific files:
   ```bash
   npx vitest run backend/tests/health-unit.test.js --coverage
   ```

2. Exclude test files from coverage:
   ```javascript
   // vitest.config.api.js
   coverage: {
     exclude: [
       'backend/tests/**',
       'node_modules/**'
     ]
   }
   ```

## CI/CD Integration

### Codecov

1. Add `CODECOV_TOKEN` to repository secrets
2. Coverage uploads automatically in CI/CD
3. View coverage at https://codecov.io

### Coveralls

1. Add `COVERALLS_REPO_TOKEN` to repository secrets
2. Coverage uploads automatically in CI/CD
3. View coverage at https://coveralls.io

## Additional Resources

- [Vitest Coverage Documentation](https://vitest.dev/guide/coverage.html)
- [v8 Coverage Provider](https://github.com/istanbuljs/v8-to-istanbul)
- [Codecov Documentation](https://docs.codecov.com/)
- [LCOV Format](http://ltp.sourceforge.net/coverage/lcov.php)

## Summary

✅ **Coverage tool configured**: Vitest with v8 provider
✅ **Coverage threshold**: 80% minimum
✅ **Report formats**: HTML, JSON, LCOV, text
✅ **CI/CD integration**: Automated coverage uploads
✅ **Documentation**: Complete usage guide

For questions or issues, refer to this documentation or check the Vitest coverage guide.
