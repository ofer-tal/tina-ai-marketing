import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'backend/tests/external-api-integration.test.js',
      'backend/tests/data-aggregation-performance.test.js',
      'backend/tests/load-testing.test.js',
      'backend/tests/regression-suite.test.js'
    ],
    testTimeout: 120000, // 2 minutes for load tests
    hookTimeout: 120000, // 2 minutes for setup/teardown
    setupFiles: ['./backend/tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage/vitest',
      exclude: [
        'node_modules/**',
        'backend/tests/**',
        'backend/test-data/**',
        '**/*.config.js',
        '**/*.config.mjs',
        'backend/server.js',
        'backend/scripts/**'
      ],
      all: true,
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80
    }
  },
});
