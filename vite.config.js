import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.', // Explicitly set root to current directory
  publicDir: 'frontend/public', // Public assets directory
  server: {
    port: 5173,
    host: true,
    strictPort: false, // Allow trying other ports if 5173 is taken
    watch: {
      usePolling: true, // Better file watching in WSL
      // Don't reload when .env changes (we handle it manually)
      ignored: ['**/.env', '**/backend/**']
    },
    proxy: {
      '/api': {
        target: 'https://localhost:3001',
        changeOrigin: true,
        secure: false // Ignore self-signed certificate errors
      },
      '/storage': {
        target: 'https://localhost:3001',
        changeOrigin: true,
        secure: false // Ignore self-signed certificate errors
      }
    }
  }
});
