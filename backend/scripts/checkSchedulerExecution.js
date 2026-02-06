/**
 * Check when the posting scheduler last executed
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

  console.log('=== SCHEDULER EXECUTION HISTORY ===');
  console.log('');

  const jobExecutions = await ScheduledJobExecution.find({
    jobName: 'posting-scheduler'
  }).sort({ lastRunAt: -1 }).limit(10);

  console.log(`Found ${jobExecutions.length} execution records`);
  console.log('');

  for (const exec of jobExecutions) {
    console.log(`Execution Record:`);
    console.log(`  ID: ${exec._id}`);
    console.log(`  Job: ${exec.jobName}`);
    console.log(`  Last Run: ${exec.lastRunAt}`);
    console.log(`  Last Run (ISO): ${exec.lastRunAt?.toISOString()}`);
    console.log(`  Status: ${exec.lastRunStatus}`);
    console.log(`  Duration: ${exec.lastRunDuration}ms`);
    console.log(`  Next Run: ${exec.nextRunAt}`);
    console.log(`  Next Run (ISO): ${exec.nextRunAt?.toISOString()}`);
    console.log(`  Is Active: ${exec.isActive}`);
    console.log('');
  }

  process.exit(0);
}

check().catch(console.error);
