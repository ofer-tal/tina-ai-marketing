/**
 * Simple integration test for validation middleware
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { validate, schemas, sanitizeString, sanitizeNumber, createSchema } from '../middleware/validation.js';

describe('Feature #297: Data validation - Simple Integration Tests', () => {
  it('Step 1: Validation schemas are defined', () => {
    expect(schemas.todo).toBeDefined();
    expect(schemas.post).toBeDefined();
    expect(schemas.chatMessage).toBeDefined();
    expect(schemas.contentApproval).toBeDefined();
    expect(schemas.campaign).toBeDefined();
  });

  it('Step 2: API input validation works', async () => {
    const app = express();
    app.use(express.json());
    app.post('/test',
      validate(schemas.todo),
      (req, res) => res.json({ success: true })
    );

    // Test valid input
    const validResponse = await request(app)
      .post('/test')
      .send({ title: 'Test todo' });
    expect(validResponse.status).toBe(200);

    // Test missing required field
    const invalidResponse = await request(app)
      .post('/test')
      .send({ description: 'Missing title' });
    expect(invalidResponse.status).toBe(400);
    expect(invalidResponse.body.validationErrors).toBeDefined();
  });

  it('Step 3: Form validation accepts optional fields', async () => {
    const app = express();
    app.use(express.json());
    app.post('/test',
      validate(schemas.todo),
      (req, res) => res.json({ success: true })
    );

    const response = await request(app)
      .post('/test')
      .send({ title: 'Minimal todo' });

    expect(response.status).toBe(200);
  });

  it('Step 4: Validation errors are returned correctly', async () => {
    const app = express();
    app.use(express.json());
    app.post('/test',
      validate(schemas.todo),
      (req, res) => res.json({ success: true })
    );

    const response = await request(app)
      .post('/test')
      .send({});

    expect(response.body).toMatchObject({
      success: false,
      error: 'Validation failed'
    });
    expect(response.body.validationErrors).toBeInstanceOf(Array);
    expect(response.body.validationErrors[0]).toHaveProperty('field');
    expect(response.body.validationErrors[0]).toHaveProperty('message');
    expect(response.body.validationErrors[0]).toHaveProperty('code');
  });

  it('Step 5: Data sanitization works', () => {
    // Test string sanitization
    expect(sanitizeString('  test  ')).toBe('test');
    expect(sanitizeString('test\x00string')).toBe('teststring');
    expect(sanitizeString('a'.repeat(200), { maxLength: 50 }).length).toBe(50);

    // Test number sanitization
    expect(sanitizeNumber(-5, { min: 0, max: 100 })).toBe(0);
    expect(sanitizeNumber(150, { min: 0, max: 100 })).toBe(100);
    expect(sanitizeNumber('42', { min: 0 })).toBe(42);
  });

  it('Custom schema validators work', () => {
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

    // Valid input
    expect(validator({ email: 'test@example.com', age: 25 })).toBeNull();

    // Invalid email
    const emailErrors = validator({ email: 'invalid', age: 25 });
    expect(emailErrors).not.toBeNull();

    // Age too low
    const ageErrors = validator({ email: 'test@example.com', age: 15 });
    expect(ageErrors).not.toBeNull();
  });

  it('Enum validation works', async () => {
    const app = express();
    app.use(express.json());
    app.post('/test',
      validate(schemas.todo),
      (req, res) => res.json({ success: true })
    );

    // Valid enum
    const validResponse = await request(app)
      .post('/test')
      .send({ title: 'Test', priority: 'high' });
    expect(validResponse.status).toBe(200);

    // Invalid enum
    const invalidResponse = await request(app)
      .post('/test')
      .send({ title: 'Test', priority: 'invalid' });
    expect(invalidResponse.status).toBe(400);
    expect(invalidResponse.body.validationErrors[0].code).toBe('INVALID_VALUE');
  });

  it('String length validation works', async () => {
    const app = express();
    app.use(express.json());
    app.post('/test',
      validate(schemas.todo),
      (req, res) => res.json({ success: true })
    );

    // Too long
    const response = await request(app)
      .post('/test')
      .send({ title: 'a'.repeat(201) });
    expect(response.status).toBe(400);
    expect(response.body.validationErrors[0].code).toBe('TOO_LONG');
  });

  it('Number range validation works', async () => {
    const app = express();
    app.use(express.json());
    app.post('/test',
      validate(schemas.todo),
      (req, res) => res.json({ success: true })
    );

    // Negative number
    const response = await request(app)
      .post('/test')
      .send({ title: 'Test', estimatedTime: -10 });
    expect(response.status).toBe(400);
    expect(response.body.validationErrors[0].code).toBe('TOO_SMALL');
  });
});
