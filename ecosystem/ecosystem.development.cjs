/**
 * PM2 Development Environment Override
 *
 * Two development modes:
 * 1. STABLE (default): No watch, crash-only restarts - BEST FOR API/JOB WORK
 * 2. WATCH: Hot reload enabled - BEST FOR FRONTEND/UI WORK
 *
 * Usage:
 *   pm2 start ecosystem/ecosystem.config.js --env development
 *   pm2 start ecosystem/ecosystem.config.js --env development-watch
 */

module.exports = {
  apps: [
    {
      name: "blush-marketing-backend",
      // Stable mode: no watch, restart only on crashes
      env: {
        NODE_ENV: "development",
        PORT: 3001,
        LOG_LEVEL: "debug",
      },
      // Override watch: false by default for stable development
      watch: false,
      autorestart: true, // Restart on crashes only
    },
    {
      name: "blush-marketing-frontend",
      env: {
        NODE_ENV: "development",
      },
      watch: false,
      autorestart: true,
      autostart: false, // Don't auto-start frontend
    },
  ],
  // Development-specific overrides for watch mode
  env_development_watch: {
    NODE_ENV: "development",
    PORT: 3001,
    LOG_LEVEL: "debug",
  },
  // Watch mode settings (applied via PM2's --watch flag or config merge)
  watch_mode: {
    watch: true,
    watch_delay: 3000,
  },
};

/**
 * Usage notes:
 *
 * STABLE MODE (Recommended for most work):
 *   pm2 start ecosystem/ecosystem.config.js --env development
 *   - No restart on file changes
 *   - Jobs won't be interrupted
 *   - Manual restart when needed: npm run pm2:restart
 *
 * WATCH MODE (For frontend/UI work):
 *   pm2 start ecosystem/ecosystem.config.js --watch --env development
 *   - Hot reload on file changes (3s delay)
 *   - Use with caution - may interrupt long-running jobs
 *   - Better: use Vite's dev server separately for frontend
 */
