import { execSync } from 'child_process';
try {
  execSync('taskkill /F /IM node.exe', { stdio: 'inherit' });
} catch (e) {
  console.log('No node processes found or already killed');
}
