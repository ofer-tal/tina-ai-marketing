/**
 * PM2 Ecosystem Configuration
 * Core configuration for blush-marketing application
 *
 * Features:
 * - Persistent process management (survives SSH session closures)
 * - Automatic restart on crashes (not file changes by default)
 * - Graceful shutdown with 60-second timeout
 * - Environment variable support
 */

module.exports = {
  apps: [
    {
      name: "blush-marketing-backend",
      script: "./backend/server.js",
      instances: 1,
      exec_mode: "fork",

      // Watch settings (disabled by default - use development overrides for watch mode)
      watch: false,
      watch_delay: 3000, // Wait 3 seconds before restarting on file change
      watch_ignore: [
        "node_modules/**",
        "logs/**",
        ".git/**",
        "storage/**",
        "frontend/**",
        "backend/tests/**",
        "*.log",
        "ecosystem/**",
      ],

      // Auto-restart settings
      autorestart: true, // Restart on crashes
      max_restarts: 10, // Max restarts per hour
      min_uptime: "10s", // Consider app stable after 10s
      restart_delay: 4000, // Wait 4s between crash restarts
      kill_timeout: 60000, // 60s graceful shutdown timeout

      // Environment variables
      env: {
        NODE_ENV: "development",
        PORT: 3001,
      },

      // Logging
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "./logs/pm2-backend-error.log",
      out_file: "./logs/pm2-backend-out.log",
      log_file: "./logs/pm2-backend-combined.log",
      combine_logs: true,
      merge_logs: true,

      // Process management
      max_memory_restart: "2G", // Restart if memory exceeds 2GB
      kill_with_signal: "SIGTERM", // Use SIGTERM for graceful shutdown

      // Source map support for debugging
      source_map_support: true,

      // Instance variables for clustering (if needed in future)
      instance_var: "INSTANCE_ID",

      // Disable tree kill to avoid killing child processes prematurely
      tree_kill: false,
    },
    {
      name: "blush-marketing-frontend",
      script: "./node_modules/vite/bin/vite.js",
      args: "--host 0.0.0.0 --port 5173",
      cwd: "./",
      instances: 1,
      exec_mode: "fork",

      // Watch settings (Vite has its own hot reload)
      watch: false,
      watch_delay: 3000,
      watch_ignore: [
        "node_modules/**",
        "logs/**",
        ".git/**",
        "storage/**",
        "backend/**",
        "*.log",
      ],

      // Auto-restart settings
      autorestart: true,
      max_restarts: 5,
      min_uptime: "10s",
      restart_delay: 4000,
      kill_timeout: 10000, // 10s shutdown for Vite (quicker)

      // Environment variables
      env: {
        NODE_ENV: "development",
      },

      // Logging
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "./logs/pm2-frontend-error.log",
      out_file: "./logs/pm2-frontend-out.log",
      log_file: "./logs/pm2-frontend-combined.log",
      combine_logs: true,
      merge_logs: true,

      // Process management
      max_memory_restart: "1G",
      kill_with_signal: "SIGTERM",
      source_map_support: true,

      // Don't auto-restart on 0 exit code (clean shutdown)
      autostart: false, // Don't auto-start frontend by default
    },
  ],
};
