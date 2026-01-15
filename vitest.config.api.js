import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['backend/tests/external-api-integration.test.js', 'backend/tests/data-aggregation-performance.test.js'],
    testTimeout: 30000,
    hookTimeout: 60000,
    setupFiles: ['./backend/tests/setup.js'],
  },
});
