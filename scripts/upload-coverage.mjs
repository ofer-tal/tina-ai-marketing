#!/usr/bin/env node

/**
 * Coverage Upload Script
 *
 * This script uploads coverage reports to various coverage services.
 * Supports:
 * - Codecov (https://codecov.io)
 * - Coveralls (https://coveralls.io)
 * - Local storage for CI/CD integration
 *
 * Usage:
 *   node scripts/upload-coverage.mjs [service]
 *
 * Environment Variables:
 *   - COVERAGE_SERVICE: codecov, coveralls, or local
 *   - CODECOV_TOKEN: Codecov upload token (required for Codecov)
 *   - COVERALLS_REPO_TOKEN: Coveralls repo token (required for Coveralls)
 *   - CI: Set to true in CI environments
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Get service from environment or argument
const service = process.env.COVERAGE_SERVICE || process.argv[2] || 'local';

console.log(`${colors.cyan}${colors.bright}═══════════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.cyan}${colors.bright}📤 Coverage Upload Service${colors.reset}`);
console.log(`${colors.cyan}${colors.bright}═══════════════════════════════════════════════════════${colors.reset}`);
console.log('');
console.log(`Service: ${colors.bright}${service}${colors.reset}`);
console.log('');

// Locate coverage files
const coverageFiles = {
  lcov: findFile('coverage', 'lcov.info'),
  json: findFile('coverage', 'coverage-final.json'),
  summary: findFile('coverage/reports', 'coverage-summary.json')
};

// Verify coverage files exist
const missingFiles = Object.entries(coverageFiles)
  .filter(([_, path]) => !path)
  .map(([name, _]) => name);

if (missingFiles.length > 0) {
  console.error(`${colors.red}❌ Missing coverage files:${colors.reset}`, missingFiles.join(', '));
  console.error(`${colors.yellow}Run ${colors.cyan}npm run test:coverage${colors.yellow} first${colors.reset}`);
  process.exit(1);
}

console.log(`${colors.green}✅ Found coverage files:${colors.reset}`);
Object.entries(coverageFiles).forEach(([name, filePath]) => {
  console.log(`  • ${name}: ${filePath}`);
});
console.log('');

// Upload to selected service
switch (service.toLowerCase()) {
  case 'codecov':
    await uploadToCodecov();
    break;
  case 'coveralls':
    await uploadToCoveralls();
    break;
  case 'local':
    await uploadToLocal();
    break;
  default:
    console.error(`${colors.red}❌ Unknown service: ${service}${colors.reset}`);
    console.log(`${colors.yellow}Available services: codecov, coveralls, local${colors.reset}`);
    process.exit(1);
}

console.log('');
console.log(`${colors.cyan}${colors.bright}═══════════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.green}${colors.bright}✅ Coverage upload complete!${colors.reset}`);
console.log(`${colors.cyan}${colors.bright}═══════════════════════════════════════════════════════${colors.reset}`);

/**
 * Find a file in directory or subdirectories
 */
function findFile(dir, filename) {
  const searchPath = path.join(process.cwd(), dir);

  if (!fs.existsSync(searchPath)) {
    return null;
  }

  // Search recursively
  function search(currentPath) {
    const items = fs.readdirSync(currentPath);

    for (const item of items) {
      const itemPath = path.join(currentPath, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        const found = search(itemPath);
        if (found) return found;
      } else if (item === filename) {
        return itemPath;
      }
    }

    return null;
  }

  return search(searchPath);
}

/**
 * Upload to Codecov
 */
async function uploadToCodecov() {
  console.log(`${colors.blue}Uploading to Codecov...${colors.reset}`);

  const token = process.env.CODECOV_TOKEN;
  if (!token && process.env.CI) {
    console.warn(`${colors.yellow}⚠️  CODECOV_TOKEN not set${colors.reset}`);
    console.warn(`${colors.yellow}In CI/CD, token is usually required${colors.reset}`);
  }

  // For CI environments, use the Codecov uploader
  if (process.env.CI) {
    console.log(`${colors.cyan}CI environment detected${colors.reset}`);
    console.log(`${colors.yellow}💡 CI/CD will handle upload automatically${colors.reset}`);
    console.log(`${colors.yellow}💡 Add Codecov step to your workflow${colors.reset}`);
    return;
  }

  // For local development, provide instructions
  console.log(`${colors.yellow}💡 Local development - manual upload required:${colors.reset}`);
  console.log('');
  console.log(`1. Install Codecov CLI:`);
  console.log(`   ${colors.cyan}npm install -g codecovcli${colors.reset}`);
  console.log('');
  console.log(`2. Set token in .env:`);
  console.log(`   ${colors.cyan}CODECOV_TOKEN=your_token_here${colors.reset}`);
  console.log('');
  console.log(`3. Run upload:`);
  console.log(`   ${colors.cyan}codecovcli upload-coverage --file ${coverageFiles.lcov}${colors.reset}`);
  console.log('');
}

/**
 * Upload to Coveralls
 */
async function uploadToCoveralls() {
  console.log(`${colors.blue}Uploading to Coveralls...${colors.reset}`);

  const token = process.env.COVERALLS_REPO_TOKEN;
  if (!token && process.env.CI) {
    console.warn(`${colors.yellow}⚠️  COVERALLS_REPO_TOKEN not set${colors.reset}`);
    console.warn(`${colors.yellow}In CI/CD, token is usually required${colors.reset}`);
  }

  // For CI environments
  if (process.env.CI) {
    console.log(`${colors.cyan}CI environment detected${colors.reset}`);
    console.log(`${colors.yellow}💡 CI/CD will handle upload automatically${colors.reset}`);
    console.log(`${colors.yellow}💡 Add Coveralls step to your workflow${colors.reset}`);
    return;
  }

  // For local development
  console.log(`${colors.yellow}💡 Local development - manual upload required:${colors.reset}`);
  console.log('');
  console.log(`1. Install Coveralls CLI:`);
  console.log(`   ${colors.cyan}npm install -g coveralls${colors.reset}`);
  console.log('');
  console.log(`2. Set token in .env:`);
  console.log(`   ${colors.cyan}COVERALLS_REPO_TOKEN=your_token_here${colors.reset}`);
  console.log('');
  console.log(`3. Run upload:`);
  console.log(`   ${colors.cyan}cat ${coverageFiles.lcov} | coveralls${colors.reset}`);
  console.log('');
}

/**
 * Save coverage locally for CI/CD integration
 */
async function uploadToLocal() {
  console.log(`${colors.blue}Saving coverage locally...${colors.reset}`);

  const localDir = path.join(process.cwd(), 'coverage/artifacts');
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const artifactDir = path.join(localDir, `coverage-${timestamp}`);
  fs.mkdirSync(artifactDir, { recursive: true });

  // Copy coverage files
  const filesToCopy = [
    coverageFiles.lcov,
    coverageFiles.json,
    coverageFiles.summary
  ];

  for (const filePath of filesToCopy) {
    if (filePath && fs.existsSync(filePath)) {
      const destPath = path.join(artifactDir, path.basename(filePath));
      fs.copyFileSync(filePath, destPath);
      console.log(`${colors.green}✅ Copied:${colors.reset} ${path.basename(filePath)}`);
    }
  }

  // Create metadata file
  const metadata = {
    timestamp: new Date().toISOString(),
    branch: process.env.GITHUB_REF || 'local',
    commit: process.env.GITHUB_SHA || 'local',
    service: 'local',
    files: filesToCopy.map(f => f ? path.basename(f) : null).filter(Boolean)
  };

  fs.writeFileSync(
    path.join(artifactDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );

  console.log('');
  console.log(`${colors.green}✅ Coverage saved to:${colors.reset}`);
  console.log(`  ${colors.cyan}${artifactDir}${colors.reset}`);
  console.log('');
  console.log(`${colors.yellow}💡 In CI/CD, upload this directory as an artifact${colors.reset}`);

  // Keep only last 10 coverage reports
  cleanupOldArtifacts(localDir, 10);
}

/**
 * Clean up old coverage artifacts
 */
function cleanupOldArtifacts(dir, keep) {
  const items = fs.readdirSync(dir)
    .map(name => ({
      name,
      path: path.join(dir, name),
      time: fs.statSync(path.join(dir, name)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  const toDelete = items.slice(keep);

  for (const item of toDelete) {
    if (item.name.startsWith('coverage-')) {
      fs.rmSync(item.path, { recursive: true, force: true });
      console.log(`${colors.dim}🗑️  Removed old: ${item.name}${colors.reset}`);
    }
  }
}
