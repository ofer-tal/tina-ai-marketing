module.exports = {
  apps: {
    'blush-marketing-backend': {
      name: 'Blush Marketing Backend',
      script: 'node server.js',
      cwd: './backend',
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: '3001'
      },
      // Restart strategy: restart with delay to prevent crash loops
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
      }
    }
  }
};
