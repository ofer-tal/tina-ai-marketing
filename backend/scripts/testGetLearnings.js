/**
 * Test get_learnings function
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

// Simulate what getLearnings function does
async function testGetLearnings({ category, minConfidence, isValid = true, isActionable, limit = 50 } = {}) {
  const query = {};

  if (category) {
    query.category = category;
  }

  if (minConfidence !== undefined) {
    query.confidence = { $gte: minConfidence };
  }

  if (isValid !== undefined) {
    query.isValid = isValid;
  }

  if (isActionable !== undefined) {
    query.isActionable = isActionable;
  }

  console.log('Query:', JSON.stringify(query, null, 2));

  const learnings = await TinaLearning.find(query)
    .sort({ confidence: -1, createdAt: -1 })
    .limit(parseInt(limit))
    .lean();

  return {
    message: `Found ${learnings.length} learning${learnings.length !== 1 ? 's' : ''}`,
    learnings: learnings.map(l => ({
      id: l._id,
      learningId: l.learningId,
      pattern: l.pattern,
      category: l.category,
      confidence: l.confidence,
      strength: l.strength,
      patternType: l.patternType,
      isValid: l.isValid,
      isActionable: l.isActionable,
      validationCount: l.validationCount,
      createdAt: l.createdAt
    }))
  };
}

console.log('Test 1: No parameters (should use default isValid=true)');
const result1 = await testGetLearnings();
console.log('Result:', result1.message);

console.log('');
console.log('Test 2: isValid explicitly true');
const result2 = await testGetLearnings({ isValid: true });
console.log('Result:', result2.message);

console.log('');
console.log('Test 3: isValid explicitly false');
const result3 = await testGetLearnings({ isValid: false });
console.log('Result:', result3.message);

console.log('');
console.log('Test 4: Empty object {}');
const result4 = await testGetLearnings({});
console.log('Result:', result4.message);

console.log('');
console.log('Test 5: minConfidence=0 (should include all)');
const result5 = await testGetLearnings({ minConfidence: 0 });
console.log('Result:', result5.message);

process.exit(0);
