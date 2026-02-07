/**
 * Check learnings in database
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const dbModule = await import('../services/database.js');
const databaseService = dbModule.default;
await databaseService.connect();

const { default: TinaLearning } = await import('../models/TinaLearning.js');

// Get all learnings
const allLearnings = await TinaLearning.find({}).lean();
console.log('Total learnings in database:', allLearnings.length);

// Get valid learnings
const validLearnings = await TinaLearning.find({ isValid: true }).lean();
console.log('Valid learnings:', validLearnings.length);

// Get recent learnings (last 7 days)
const weekAgo = new Date();
weekAgo.setDate(weekAgo.getDate() - 7);
const recentLearnings = await TinaLearning.find({ createdAt: { $gte: weekAgo } }).lean();
console.log('Recent learnings (last 7 days):', recentLearnings.length);

if (allLearnings.length > 0) {
  console.log('');
  console.log('All learnings:');
  for (const l of allLearnings) {
    console.log('  -', l.learningId, '|', l.pattern?.substring(0, 80), '| isValid:', l.isValid, '| createdAt:', l.createdAt);
  }
} else {
  console.log('');
  console.log('No learnings found in database!');
  console.log('');
  console.log('This means either:');
  console.log('1. No learnings have been created yet');
  console.log('2. Learnings are being created but not saved (tool bug)');
  console.log('3. Learnings were created but deleted/invalidated');
}

process.exit(0);
