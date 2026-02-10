/**
 * Migration Runner Script
 *
 * Run: node backend/scripts/runMigration.js [--dry-run] [--validate]
 * Options:
 *   --dry-run: Run without making changes
 *   --validate: Check migration status without running
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

import multiPlatformPostsMigration from '../migrations/multiPlatformPosts.js';

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/blush';

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const validateOnly = args.includes('--validate');

  console.log('========================================');
  console.log('Multi-Platform Posts Migration');
  console.log('========================================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'} ${validateOnly ? '(VALIDATE ONLY)' : ''}`);
  console.log('');

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully');
    console.log('');

    if (validateOnly) {
      // Run validation only
      console.log('Running validation...');
      const validation = await multiPlatformPostsMigration.validate();
      console.log('');
      console.log('Validation Results:');
      console.log(`  Valid: ${validation.valid ? '✅ YES' : '❌ NO'}`);
      console.log(`  Needs Migration: ${validation.needsMigration}`);
      console.log(`  Missing platformStatus: ${validation.missingPlatformStatus}`);
      console.log(`  Multi-platform Posts: ${validation.multiPlatformPosts}`);
      console.log(`  Total Posts: ${validation.totalPosts}`);
      console.log(`  Migration Complete: ${validation.percentage}%`);
    } else {
      // Run migration
      console.log('Running migration...');
      const result = await multiPlatformPostsMigration.run({ dryRun });
      console.log('');
      console.log('Migration Results:');
      console.log(`  Total: ${result.total}`);
      console.log(`  Success: ${result.success}`);
      console.log(`  Failed: ${result.failed}`);
      console.log(`  Skipped: ${result.skipped}`);

      if (result.failed > 0) {
        console.log('');
        console.log('Failed Details:');
        result.details.filter(d => !d.success).forEach(d => {
          console.log(`  - ${d.postId}: ${d.error}`);
        });
      }
    }

  } catch (error) {
    console.error('Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('');
    console.log('========================================');
    console.log('Done');
    console.log('========================================');
  }
}

main();
