/**
 * Check full learning details
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

// Get the learning
const learning = await TinaLearning.findOne({ learningId: 'learning_1770320701_01u2' });

console.log('Full learning document:');
console.log(JSON.stringify(learning.toObject(), null, 2));

process.exit(0);
