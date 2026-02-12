/**
 * PM2 Production Environment Override
 *
 * Features:
 * - No file watching (stability)
 * - Crash-only restarts
 * - Extended memory limits
 * - Production logging levels
 *
 * Usage:
 *   pm2 start ecosystem/ecosystem.config.js --env production
 */

module.exports = {
  apps: [
    {
      name: "blush-marketing-backend",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        LOG_LEVEL: "info",
      },
      // Production settings overrides
      watch: false, // Never watch in production
      autorestart: true,
      max_restarts: 10,
      min_uptime: "30s", // Consider stable after 30s
      restart_delay: 5000, // Wait 5s between restarts
      kill_timeout: 60000, // 60s graceful shutdown

      // Memory limits
      max_memory_restart: "2G",

      // Logging
      combine_logs: true,
      merge_logs: true,
    },
    {
      name: "blush-marketing-frontend",
      // Frontend in production should use pre-built static files
      // Typically served by nginx or similar
      autostart: false,
      watch: false,
    },
  ],
};

/**
 * Production deployment notes:
 *
 * 1. Frontend should be built and served statically:
 *    npm run build
 *    # Serve 'dist/' directory with nginx or similar
 *
 * 2. Only backend runs under PM2 in production
 *
 * 3. Auto-start on boot:
 *    pm2 save
 *    pm2 startup  # Follow the prompts
 */
