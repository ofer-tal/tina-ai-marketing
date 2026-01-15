
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['backend/tests/external-api-integration.test.js'],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
