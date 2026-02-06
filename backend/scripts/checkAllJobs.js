/**
 * Check all scheduled jobs
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

import ScheduledJobExecution from '../models/ScheduledJobExecution.js';
import databaseService from '../services/database.js';

async function check() {
  await databaseService.connect();

  console.log('=== ALL SCHEDULED JOB RECORDS ===');
  const allJobs = await ScheduledJobExecution.find({}).sort({ createdAt: -1 });

  console.log(`Found ${allJobs.length} job records`);
  console.log('');

  for (const job of allJobs) {
    console.log(`Job: ${job.jobName}`);
    console.log(`  Created: ${job.createdAt}`);
    console.log(`  Last Run: ${job.lastRunAt}`);
    console.log(`  Status: ${job.lastRunStatus}`);
    console.log(`  Next Run: ${job.nextRunAt}`);
    console.log(`  Is Active: ${job.isActive}`);
    console.log('');
  }

  process.exit(0);
}

check().catch(console.error);
