import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for end-to-end testing
 * Tests the full content approval workflow from generation to approval
 */
export default defineConfig({
  testDir: './e2e-tests',
  fullyParallel: false, // Run tests sequentially for database consistency
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid database conflicts
  timeout: 60000, // Increase timeout to 60 seconds for slow page loads
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Reuse existing backend server - don't start a new one
  // webServer: {
  //   command: 'node backend/server.js',
  //   url: 'http://localhost:3001',
  //   timeout: 120000,
  //   reuseExistingServer: !process.env.CI,
  // },
});
