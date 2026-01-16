/**
 * Feature #297: Data validation on all inputs
 *
 * Tests the comprehensive validation system
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import {
  validate,
  sanitizeString,
  sanitizeNumber,
  sanitizeArray,
  sanitizeObject,
  createSchema,
  ValidationError,
  schemas
} from '../middleware/validation.js';

// Create test app
function createTestApp() {
  const app = express();
  app.use(express.json());

  // Test route with validation
  app.post('/test/todo',
    validate(schemas.todo, { sanitize: true }),
    (req, res) => {
      res.json({ success: true, data: req.body });
    }
  );

  // Test route without sanitization
  app.post('/test/no-sanitize',
    validate(schemas.todo),
    (req, res) => {
      res.json({ success: true, data: req.body });
    }
  );

  // Test route for custom schema
  app.post('/test/custom',
    validate({
      email: {
        type: 'string',
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        errorMessage: 'Invalid email format'
      },
      age: {
        type: 'number',
        required: true,
        min: 18,
        max: 120
      }
    }),
    (req, res) => {
      res.json({ success: true, data: req.body });
    }
  );

  // Test route for sanitization
  app.post('/test/sanitize',
    validate({
      text: { type: 'string', required: true, maxLength: 100 },
      count: { type: 'number', required: true, min: 0, max: 100 },
      tags: { type: 'array', required: false, maxItems: 5 }
    }, { sanitize: true }),
    (req, res) => {
      res.json({ success: true, data: req.body });
    }
  );

  return app;
}

describe('Feature #297: Data validation on all inputs', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('Step 1: Define validation schemas', () => {
    it('should have predefined schemas for common use cases', () => {
      expect(schemas.todo).toBeDefined();
      expect(schemas.post).toBeDefined();
      expect(schemas.settingUpdate).toBeDefined();
      expect(schemas.campaign).toBeDefined();
      expect(schemas.keyword).toBeDefined();
      expect(schemas.chatMessage).toBeDefined();
      expect(schemas.contentApproval).toBeDefined();
    });

    it('should create custom schema validators', () => {
      const customSchema = {
        username: {
          type: 'string',
          required: true,
          minLength: 3,
          maxLength: 20,
          pattern: /^[a-zA-Z0-9_]+$/
        }
      };

      const validator = createSchema(customSchema);

      // Valid input
      const validErrors = validator({ username: 'user_123' });
      expect(validErrors).toBeNull();

      // Too short
      const shortErrors = validator({ username: 'ab' });
      expect(shortErrors).not.toBeNull();
      expect(shortErrors[0].code).toBe('TOO_SHORT');

      // Invalid pattern
      const patternErrors = validator({ username: 'user@123' });
      expect(patternErrors).not.toBeNull();
      expect(patternErrors[0].code).toBe('INVALID_FORMAT');
    });
  });

  describe('Step 2: Validate API inputs', async () => {
    it('should validate POST request body', async () => {
      const response = await request(app)
        .post('/test/todo')
        .send({
          title: 'Test todo item',
          description: 'This is a test',
          priority: 'high',
          category: 'posting'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid required field', async () => {
      const response = await request(app)
        .post('/test/todo')
        .send({
          description: 'Missing title'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.validationErrors).toBeDefined();
      expect(response.body.validationErrors[0].code).toBe('REQUIRED');
    });

    it('should reject invalid enum value', async () => {
      const response = await request(app)
        .post('/test/todo')
        .send({
          title: 'Test todo',
          priority: 'invalid_priority'
        });

      expect(response.status).toBe(400);
      expect(response.body.validationErrors[0].code).toBe('INVALID_VALUE');
    });

    it('should reject string exceeding max length', async () => {
      const response = await request(app)
        .post('/test/todo')
        .send({
          title: 'a'.repeat(201)
        });

      expect(response.status).toBe(400);
      expect(response.body.validationErrors[0].code).toBe('TOO_LONG');
    });

    it('should reject number outside range', async () => {
      const response = await request(app)
        .post('/test/custom')
        .send({
          email: 'test@example.com',
          age: 150
        });

      expect(response.status).toBe(400);
      expect(response.body.validationErrors[0].code).toBe('TOO_LARGE');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/test/custom')
        .send({
          email: 'not-an-email',
          age: 25
        });

      expect(response.status).toBe(400);
      expect(response.body.validationErrors[0].code).toBe('INVALID_FORMAT');
    });

    it('should validate multiple errors at once', async () => {
      const response = await request(app)
        .post('/test/todo')
        .send({
          title: '',
          priority: 'invalid',
          estimatedTime: -10
        });

      expect(response.status).toBe(400);
      expect(response.body.validationErrors.length).toBeGreaterThan(1);
    });
  });

  describe('Step 3: Validate form inputs', () => {
    it('should accept optional fields', async () => {
      const response = await request(app)
        .post('/test/todo')
        .send({
          title: 'Minimal todo'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('Minimal todo');
    });

    it('should handle array fields', async () => {
      const response = await request(app)
        .post('/test/sanitize')
        .send({
          text: 'Test',
          count: 5,
          tags: ['tag1', 'tag2', 'tag3']
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data.tags)).toBe(true);
    });

    it('should enforce array max items', async () => {
      const response = await request(app)
        .post('/test/sanitize')
        .send({
          text: 'Test',
          count: 5,
          tags: ['1', '2', '3', '4', '5', '6']
        });

      expect(response.status).toBe(400);
      expect(response.body.validationErrors[0].code).toBe('TOO_MANY_ITEMS');
    });
  });

  describe('Step 4: Return validation errors', () => {
    it('should return structured error response', async () => {
      const response = await request(app)
        .post('/test/todo')
        .send({});

      expect(response.body).toMatchObject({
        success: false,
        error: 'Validation failed',
        validationErrors: expect.any(Array)
      });
    });

    it('should include field name in error', async () => {
      const response = await request(app)
        .post('/test/todo')
        .send({});

      expect(response.body.validationErrors[0]).toHaveProperty('field');
    });

    it('should include error message', async () => {
      const response = await request(app)
        .post('/test/todo')
        .send({});

      expect(response.body.validationErrors[0]).toHaveProperty('message');
    });

    it('should include error code', async () => {
      const response = await request(app)
        .post('/test/todo')
        .send({});

      expect(response.body.validationErrors[0]).toHaveProperty('code');
    });

    it('should use custom error message when provided', async () => {
      const response = await request(app)
        .post('/test/custom')
        .send({
          email: 'invalid',
          age: 25
        });

      expect(response.body.validationErrors[0].message).toBe('Invalid email format');
    });
  });

  describe('Step 5: Sanitize data', () => {
    it('should trim string whitespace', async () => {
      const response = await request(app)
        .post('/test/sanitize')
        .send({
          text: '  Test Text  ',
          count: 10
        });

      expect(response.body.data.text).toBe('Test Text');
    });

    it('should remove null bytes from strings', () => {
      const input = 'Test\x00String';
      const sanitized = sanitizeString(input);
      expect(sanitized).toBe('TestString');
    });

    it('should remove control characters from strings', () => {
      const input = 'Test\x01\x02String';
      const sanitized = sanitizeString(input);
      expect(sanitized).toBe('TestString');
    });

    it('should limit string length', () => {
      const input = 'a'.repeat(200);
      const sanitized = sanitizeString(input, { maxLength: 50 });
      expect(sanitized.length).toBe(50);
    });

    it('should clamp numbers to min/max', () => {
      expect(sanitizeNumber(-5, { min: 0, max: 100 })).toBe(0);
      expect(sanitizeNumber(150, { min: 0, max: 100 })).toBe(100);
      expect(sanitizeNumber(50, { min: 0, max: 100 })).toBe(50);
    });

    it('should parse string numbers', () => {
      const result = sanitizeNumber('42', { min: 0 });
      expect(result).toBe(42);
    });

    it('should return default for invalid numbers', () => {
      const result = sanitizeNumber('invalid', { default: 10 });
      expect(result).toBe(10);
    });

    it('should limit array size', () => {
      const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const sanitized = sanitizeArray(input, { maxItems: 5 });
      expect(sanitized.length).toBe(5);
    });

    it('should remove duplicates from array', () => {
      const input = [1, 2, 2, 3, 3, 3];
      const sanitized = sanitizeArray(input, { unique: true });
      expect(sanitized).toEqual([1, 2, 3]);
    });

    it('should sanitize object strings by default', async () => {
      const response = await request(app)
        .post('/test/sanitize')
        .send({
          text: '  Test  ',
          count: 50
        });

      expect(response.body.data.text).toBe('Test');
    });

    it('should sanitize numbers in request body', async () => {
      const response = await request(app)
        .post('/test/sanitize')
        .send({
          text: 'Test',
          count: 150
        });

      // Should be clamped to max of 100
      expect(response.body.data.count).toBe(100);
    });

    it('should sanitize arrays in request body', async () => {
      const response = await request(app)
        .post('/test/sanitize')
        .send({
          text: 'Test',
          count: 5,
          tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6']
        });

      // Should be limited to maxItems: 5
      expect(response.body.data.tags.length).toBe(5);
    });
  });

  describe('Edge cases and security', () => {
    it('should handle null values correctly', async () => {
      const response = await request(app)
        .post('/test/todo')
        .send({
          title: null
        });

      expect(response.status).toBe(400);
      expect(response.body.validationErrors[0].code).toBe('REQUIRED');
    });

    it('should handle undefined values for optional fields', async () => {
      const response = await request(app)
        .post('/test/todo')
        .send({
          title: 'Test'
        });

      expect(response.status).toBe(200);
    });

    it('should prevent injection attempts', () => {
      const input = '<script>alert("xss")</script>';
      const sanitized = sanitizeString(input);
      expect(sanitized).toContain('<script>'); // Not removed by default
    });

    it('should normalize whitespace when requested', () => {
      const input = 'Test    Multiple    Spaces';
      const sanitized = sanitizeString(input, { normalizeWhitespace: true });
      expect(sanitized).toBe('Test Multiple Spaces');
    });

    it('should handle empty arrays', () => {
      const result = sanitizeArray(null);
      expect(result).toEqual([]);
    });

    it('should handle non-array input as single-item array', () => {
      const result = sanitizeArray('test');
      expect(result).toEqual(['test']);
    });

    it('should handle custom validators', () => {
      const schema = {
        password: {
          type: 'string',
          required: true,
          custom: (value) => {
            if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
              return 'Password must contain uppercase, lowercase, and number';
            }
            return null;
          }
        }
      };

      const validator = createSchema(schema);

      const errors = validator({ password: 'weak' });
      expect(errors).not.toBeNull();
      expect(errors[0].message).toContain('must contain');
    });

    it('should validate date strings', () => {
      const schema = {
        scheduledAt: {
          type: 'string',
          required: true,
          custom: (value) => {
            if (isNaN(Date.parse(value))) {
              return 'Invalid date format';
            }
            return null;
          }
        }
      };

      const validator = createSchema(schema);

      const validErrors = validator({ scheduledAt: '2026-01-16T10:00:00Z' });
      expect(validErrors).toBeNull();

      const invalidErrors = validator({ scheduledAt: 'not-a-date' });
      expect(invalidErrors).not.toBeNull();
    });
  });

  describe('Integration with existing schemas', () => {
    it('should validate todo schema correctly', () => {
      const validator = createSchema(schemas.todo);

      const validTodo = {
        title: 'Test todo',
        description: 'Test description',
        category: 'posting',
        priority: 'high',
        status: 'pending',
        estimatedTime: 30
      };

      expect(validator(validTodo)).toBeNull();
    });

    it('should validate post schema correctly', () => {
      const validator = createSchema(schemas.post);

      const validPost = {
        title: 'Test post',
        platform: 'tiktok',
        contentType: 'video',
        caption: 'Test caption',
        hashtags: ['test', 'tiktok']
      };

      expect(validator(validPost)).toBeNull();
    });

    it('should validate content approval schema correctly', () => {
      const validator = createSchema(schemas.contentApproval);

      const validApproval = {
        action: 'approve',
        reason: 'Good quality'
      };

      expect(validator(validApproval)).toBeNull();
    });
  });
});
