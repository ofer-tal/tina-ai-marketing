import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    strictPort: false, // Allow trying other ports if 5173 is taken
    watch: {
      usePolling: true // Better file watching in WSL
    }
  }
});
