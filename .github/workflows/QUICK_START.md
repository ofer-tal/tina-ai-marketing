# CI/CD Quick Start Guide

## For Developers

### Running Tests Before Pushing

Always run tests locally before pushing to avoid CI failures:

```bash
# 1. Install dependencies (if needed)
npm install

# 2. Run unit tests
npm test

# 3. Run integration tests
npm run test:api

# 4. Run regression tests
npm run test:regression

# 5. Check code quality
npm run lint
```

### Understanding CI Results

When you push or create a PR, GitHub Actions will automatically run tests.

**View Results:**
1. Go to the PR or commit
2. Click the ❌ or ✅ check mark
3. View "Details" for full logs

**Possible Outcomes:**
- ✅ **All checks passed** - Safe to merge
- ⚠️ **Some checks passed** - Review failures, may be non-critical
- ❌ **Checks failed** - Fix issues before merging

### Fixing CI Failures

**Common Issues:**

1. **Unit Tests Fail**
   ```bash
   # Run locally to see detailed errors
   npm test -- --verbose
   ```

2. **Integration Tests Fail**
   ```bash
   # Ensure MongoDB is running
   # Run integration tests
   npm run test:api
   ```

3. **Linting Errors**
   ```bash
   # Auto-fix many issues
   npm run lint:fix
   ```

4. **Performance Tests Fail**
   - Check if changes affect performance
   - Verify thresholds are realistic
   - May need to optimize queries

### PR Workflow

1. **Create feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes and commit**
   ```bash
   git add .
   git commit -m "Add my feature"
   ```

3. **Run tests locally**
   ```bash
   npm test
   npm run test:api
   npm run lint
   ```

4. **Push and create PR**
   ```bash
   git push origin feature/my-feature
   # Create PR in GitHub
   ```

5. **Wait for CI results**
   - Check PR for status updates
   - Review automated comments

6. **Address any failures**
   - Fix issues
   - Push fixes
   - CI will re-run automatically

7. **Merge when all checks pass**

## For Maintainers

### Monitoring CI Health

**Daily:**
- Check scheduled runs (2 AM UTC)
- Review any failures

**Weekly:**
- Review test duration trends
- Update dependencies if needed

**Monthly:**
- Review and update workflows
- Add new test types as needed

### Managing Test Failures

**Actions to take:**

1. **Critical Tests Fail** (unit, integration, regression)
   - Block merges until fixed
   - Create issue to track fix
   - Assign to developer

2. **Non-Critical Tests Fail** (security, code quality)
   - Allow merge with caution
   - Create issue to track
   - Fix soon

3. **Performance Degrades**
   - Investigate cause
   - Optimize if needed
   - Update thresholds if justified

### Updating Workflows

**To modify test automation:**

1. Edit `.github/workflows/test-automation.yml`
2. Test changes in a feature branch
3. Verify CI runs successfully
4. Merge when validated

**To add new tests:**

1. Add test file to `backend/tests/`
2. Update relevant job in workflow
3. Update documentation
4. Test and merge

## Environment Setup

### Required for Local Testing

- Node.js 22+
- MongoDB 6.0+ (or MongoDB Atlas connection)
- npm or yarn

### Environment Variables

Create `.env.test` file:
```env
MONGODB_URI=mongodb://localhost:27017/blush-marketing-test
NODE_ENV=test
PORT=3001
```

### GitHub Secrets

No secrets required for test workflows (uses test database).

For production deployment, configure:
- `MONGODB_URI` - Production database
- `API_KEYS` - External service keys
- `DEPLOY_KEY` - Deployment credentials

## Emergency Procedures

### CI is Down

**Symptoms:**
- All workflows failing
- Cannot run tests

**Actions:**
1. Check GitHub Actions status page
2. Check for GitHub outages
3. Review recent workflow changes
4. Revert if recent change broke CI

### Flaky Tests

**Symptoms:**
- Tests pass locally, fail in CI
- Random failures

**Actions:**
1. Add retries to test
2. Increase timeout
3. Add proper cleanup
4. Mock external dependencies

### Performance Degradation

**Symptoms:**
- Tests getting slower
- CI taking > 30 minutes

**Actions:**
1. Identify slow tests
2. Optimize or parallelize
3. Split into smaller jobs
4. Use caching

## Contact

For CI/CD issues:
1. Check this documentation
2. Check workflow logs
3. Ask in team chat
4. Create GitHub issue

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Jest Documentation](https://jestjs.io/)
- [Vitest Documentation](https://vitest.dev/)
- [Full CI/CD Documentation](./CI_CD_DOCUMENTATION.md)
