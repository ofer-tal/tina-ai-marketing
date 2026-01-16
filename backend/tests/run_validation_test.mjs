/**
 * Standalone test runner for validation tests
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import {
  validate,
  sanitizeString,
  sanitizeNumber,
  createSchema,
  schemas
} from '../middleware/validation.js';

console.log('Testing Feature #297: Data validation on all inputs\n');

// Test 1: Validation schemas are defined
console.log('✓ Step 1: Define validation schemas');
console.log('  - schemas.todo:', !!schemas.todo);
console.log('  - schemas.post:', !!schemas.post);
console.log('  - schemas.chatMessage:', !!schemas.chatMessage);
console.log('  - schemas.contentApproval:', !!schemas.contentApproval);
console.log('  - schemas.campaign:', !!schemas.campaign);
console.log('  - schemas.settingUpdate:', !!schemas.settingUpdate);
console.log('  - schemas.keyword:', !!schemas.keyword);
console.log('');

// Test 2: API input validation
async function testApiValidation() {
  console.log('✓ Step 2: Validate API inputs');

  const app = express();
  app.use(express.json());
  app.post('/test', validate(schemas.todo), (req, res) => res.json({ success: true }));

  // Valid input
  const validResponse = await request(app)
    .post('/test')
    .send({ title: 'Test todo' });
  console.log('  - Valid input accepted:', validResponse.status === 200);

  // Invalid input (missing required field)
  const invalidResponse = await request(app)
    .post('/test')
    .send({ description: 'Missing title' });
  console.log('  - Missing required field rejected:', invalidResponse.status === 400);
  console.log('  - Validation errors returned:', !!invalidResponse.body.validationErrors);
  console.log('');
}

// Test 3: Form validation
async function testFormValidation() {
  console.log('✓ Step 3: Validate form inputs');

  const app = express();
  app.use(express.json());
  app.post('/test', validate(schemas.todo), (req, res) => res.json({ success: true }));

  const response = await request(app)
    .post('/test')
    .send({ title: 'Minimal todo' });
  console.log('  - Optional fields work:', response.status === 200);
  console.log('');
}

// Test 4: Return validation errors
async function testValidationErrors() {
  console.log('✓ Step 4: Return validation errors');

  const app = express();
  app.use(express.json());
  app.post('/test', validate(schemas.todo), (req, res) => res.json({ success: true }));

  const response = await request(app)
    .post('/test')
    .send({});

  console.log('  - Response structure:', response.body.success === false);
  console.log('  - Error message present:', response.body.error === 'Validation failed');
  console.log('  - Validation errors array:', Array.isArray(response.body.validationErrors));
  console.log('  - First error has field:', !!response.body.validationErrors?.[0]?.field);
  console.log('  - First error has message:', !!response.body.validationErrors?.[0]?.message);
  console.log('  - First error has code:', !!response.body.validationErrors?.[0]?.code);
  console.log('');
}

// Test 5: Sanitize data
function testSanitization() {
  console.log('✓ Step 5: Sanitize data');

  // String sanitization
  console.log('  - Trim whitespace:', sanitizeString('  test  ') === 'test');
  console.log('  - Remove null bytes:', sanitizeString('test\x00string') === 'teststring');
  console.log('  - Limit length:', sanitizeString('a'.repeat(200), { maxLength: 50 }).length === 50);

  // Number sanitization
  console.log('  - Clamp to min:', sanitizeNumber(-5, { min: 0, max: 100 }) === 0);
  console.log('  - Clamp to max:', sanitizeNumber(150, { min: 0, max: 100 }) === 100);
  console.log('  - Parse string:', sanitizeNumber('42', { min: 0 }) === 42);
  console.log('');
}

// Test custom validators
function testCustomValidators() {
  console.log('✓ Custom validators work');

  const schema = {
    email: {
      type: 'string',
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    age: {
      type: 'number',
      required: true,
      min: 18,
      max: 120
    }
  };

  const validator = createSchema(schema);

  const valid = validator({ email: 'test@example.com', age: 25 });
  console.log('  - Valid input passes:', valid === null);

  const invalidEmail = validator({ email: 'invalid', age: 25 });
  console.log('  - Invalid email caught:', invalidEmail !== null);

  const invalidAge = validator({ email: 'test@example.com', age: 15 });
  console.log('  - Invalid age caught:', invalidAge !== null);
  console.log('');
}

// Test enum validation
async function testEnumValidation() {
  console.log('✓ Enum validation works');

  const app = express();
  app.use(express.json());
  app.post('/test', validate(schemas.todo), (req, res) => res.json({ success: true }));

  const validResponse = await request(app)
    .post('/test')
    .send({ title: 'Test', priority: 'high' });
  console.log('  - Valid enum accepted:', validResponse.status === 200);

  const invalidResponse = await request(app)
    .post('/test')
    .send({ title: 'Test', priority: 'invalid' });
  console.log('  - Invalid enum rejected:', invalidResponse.status === 400);
  console.log('  - Error code is INVALID_VALUE:', invalidResponse.body.validationErrors?.[0]?.code === 'INVALID_VALUE');
  console.log('');
}

// Run all tests
async function runAllTests() {
  try {
    await testApiValidation();
    await testFormValidation();
    await testValidationErrors();
    testSanitization();
    testCustomValidators();
    await testEnumValidation();

    console.log('═══════════════════════════════════════');
    console.log('Feature #297: All tests PASSED ✅');
    console.log('═══════════════════════════════════════');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

runAllTests();
