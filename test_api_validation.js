/**
 * Test API endpoint for response validation
 * This creates a simple test endpoint that returns various response types
 */

import express from 'express';
const router = express.Router();

// Test endpoint 1: Valid response
router.get('/valid', (req, res) => {
  res.json({
    success: true,
    data: {
      id: '123',
      name: 'Test User',
      email: 'test@example.com',
    },
  });
});

// Test endpoint 2: Missing required field
router.get('/missing-field', (req, res) => {
  res.json({
    success: true,
    data: {
      id: '123',
      // Missing 'name' field
      email: 'test@example.com',
    },
  });
});

// Test endpoint 3: Wrong field type
router.get('/wrong-type', (req, res) => {
  res.json({
    success: true,
    data: {
      id: 123, // Should be string
      name: 'Test User',
      email: 'test@example.com',
    },
  });
});

// Test endpoint 4: Null response
router.get('/null-response', (req, res) => {
  res.json(null);
});

// Test endpoint 5: Empty object
router.get('/empty', (req, res) => {
  res.json({});
});

// Test endpoint 6: Array response
router.get('/array', (req, res) => {
  res.json([
    { id: '1', name: 'Item 1' },
    { id: '2', name: 'Item 2' },
  ]);
});

export default router;
