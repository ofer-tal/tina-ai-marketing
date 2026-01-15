export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'backend/**/*.js',
    '!backend/tests/**',
    '!backend/test-data/**',
    '!node_modules/**',
    '!**/node_modules/**',
    '!backend/server.js', // Exclude entry point
    '!**/*.config.js',
    '!**/*.config.mjs',
    '!backend/scripts/**' // Exclude utility scripts
  ],
  coverageDirectory: 'coverage/jest',
  coverageReporters: [
    'json',
    'json-summary',
    'lcov',
    'text',
    'text-summary',
    'html'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  verbose: true,
  testTimeout: 10000
};
