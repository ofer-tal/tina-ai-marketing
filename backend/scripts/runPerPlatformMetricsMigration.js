/**
 * Per-Platform Metrics Migration Runner
 *
 * Run: node backend/scripts/runPerPlatformMetricsMigration.js [--dry-run] [--validate]
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

import perPlatformMetricsMigration from '../migrations/migrateToPerPlatformMetrics.js';

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/blush';

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const validateOnly = args.includes('--validate');

  console.log('========================================');
  console.log('Per-Platform Metrics Migration');
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
      const validation = await perPlatformMetricsMigration.validate();
      console.log('');
      console.log('Validation Results:');
      console.log(`  Valid: ${validation.valid ? 'YES' : 'NO'}`);
      console.log(`  Total posts with metrics: ${validation.totalPostsWithMetrics}`);
      console.log(`  With per-platform metrics: ${validation.withPerPlatformMetrics}`);
      console.log(`  Needs migration: ${validation.needsMigration}`);
      console.log(`  Migration complete: ${validation.percentage}%`);
    } else {
      // Run migration
      console.log('Running migration...');
      const result = await perPlatformMetricsMigration.run({ dryRun });
      console.log('');
      console.log('Migration Results:');
      console.log(`  Total: ${result.total}`);
      console.log(`  Migrated: ${result.success}`);
      console.log(`  Skipped: ${result.skipped}`);
      console.log(`  Failed: ${result.failed}`);

      if (result.failed > 0) {
        console.log('');
        console.log('Failed Details:');
        result.details.filter(d => d.failed).forEach(d => {
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
