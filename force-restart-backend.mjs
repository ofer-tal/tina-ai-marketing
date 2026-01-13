#!/usr/bin/env node

import { execSync } from 'child_process';
import http from 'http';

const PORT = 3001;

console.log('Force restarting backend server...');

// Try to find and kill process on port 3001
try {
  // Try lsof first (Mac/Linux)
  try {
    const pid = execSync(`lsof -ti:${PORT}`, { encoding: 'utf-8' }).trim();
    if (pid) {
      console.log(`Killing process ${pid} on port ${PORT}...`);
      process.kill(parseInt(pid), 'SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } catch (e) {
    console.log('lsof not available or no process found');
  }
} catch (error) {
  console.log('Could not kill process:', error.message);
}

// Start new server
console.log(`Starting backend server on port ${PORT}...`);
const serverProcess = spawn('node', ['backend/server.js'], {
  cwd: process.cwd(),
  detached: true,
  stdio: 'ignore',
  env: { ...process.env, PORT: PORT.toString() }
});

serverProcess.unref();
console.log(`Server started with PID: ${serverProcess.pid}`);

// Wait for server to be ready
await new Promise(resolve => setTimeout(resolve, 5000));

// Test health endpoint
const testHealth = () => {
  return new Promise((resolve) => {
    http.get(`http://localhost:${PORT}/api/health`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const health = JSON.parse(data);
          console.log('Server health:', health.status);
          console.log('Uptime:', health.uptimeHuman);
          resolve(true);
        } catch (e) {
          resolve(false);
        }
      });
    }).on('error', () => resolve(false));
  });
};

const isHealthy = await testHealth();
if (isHealthy) {
  console.log('\n✅ Backend server restarted successfully!');
} else {
  console.log('\n❌ Backend server may not be healthy');
}

process.exit(0);

function spawn(command, args, options) {
  const { spawn } = child_process;
  return spawn(command, args, options);
}

import { spawn as spawnImport } from 'child_process';
const { spawn } = spawnImport;
