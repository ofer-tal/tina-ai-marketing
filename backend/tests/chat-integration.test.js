/**
 * Integration Tests for AI Chat Workflows
 *
 * Feature #189: Integration tests for AI chat functionality
 *
 * Tests cover:
 * - GLM4.7 API response mocking
 * - Chat message handling
 * - Conversation storage
 * - Strategy generation
 * - Context window management
 * - Multi-turn conversations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import databaseService from '../services/database.js';

// Mock the database service
vi.mock('../services/database.js', () => ({
  default: {
    getCollection: vi.fn(() => ({
      find: vi.fn(() => ({
        sort: vi.fn(() => ({
          limit: vi.fn(() => ({
            toArray: vi.fn(() => Promise.resolve([]))
          }))
        }))
      })),
      insertOne: vi.fn(() => Promise.resolve({ insertedId: 'mock-id-123' })),
      updateOne: vi.fn(() => Promise.resolve({ modifiedCount: 1 })),
      findOne: vi.fn(() => Promise.resolve(null)),
      aggregate: vi.fn(() => ({
        toArray: vi.fn(() => Promise.resolve([]))
      }))
    })),
    getStatus: vi.fn(() => ({ isConnected: true, readyState: 1 })),
    getHealthStatus: vi.fn(() => ({ connected: true, readyState: 1 })),
    close: vi.fn(() => Promise.resolve())
  }
}));

// Import the chat routes
import chatRouter from '../api/chat.js';

// Create a test Express app
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/chat', chatRouter);
  return app;
}

describe('Feature #189: Integration Tests for AI Chat Workflows', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Step 1: Mock GLM4.7 API responses
   */
  describe('Step 1: Mock GLM4.7 API Responses', () => {
    it('should return mock response for revenue queries', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: 'What is our current revenue?'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.response.role).toBe('assistant');
      expect(response.body.response.content).toBeDefined();
      expect(response.body.response.content).toMatch(/revenue/i);
      expect(response.body.response.content).toMatch(/mrr/i);
    });

    it('should return mock response for content strategy queries', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: 'How are our posts performing?'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.response.content).toBeDefined();
      expect(response.body.response.content).toMatch(/content/i);
      expect(response.body.response.content).toMatch(/views/i);
    });

    it('should return mock response for ads/budget queries', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: 'What is our ad spend?'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.response.content).toBeDefined();
      expect(response.body.response.content).toMatch(/campaign|spend|roi/i);
    });

    it('should return mock response for ASO/keyword queries', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: 'How are our keywords ranking?'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.response.content).toBeDefined();
      expect(response.body.response.content).toMatch(/keyword|ranking|aso/i);
    });

    it('should return mock response with historical data context', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: 'Show me the MRR trend'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.response.content).toBeDefined();
      // Should contain historical mock data
      expect(response.body.response.content).toMatch(/\$425|\$379|\$285/); // Mock MRR values
    });

    it('should handle unknown queries gracefully', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: 'Tell me something random'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.response.content).toBeDefined();
    });
  });

  /**
   * Step 2: Write test for chat message handling
   */
  describe('Step 2: Chat Message Handling', () => {
    it('should handle user message and return AI response', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: 'What is our MRR?'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('role', 'assistant');
      expect(response.body.data).toHaveProperty('content');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(typeof response.body.response.content).toBe('string');
      expect(response.body.response.content.length).toBeGreaterThan(0);
    });

    it('should validate message is provided', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle empty message', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should include conversation context if provided', async () => {
      const conversationHistory = [
        { role: 'user', content: 'What is our MRR?' },
        { role: 'assistant', content: 'Your MRR is $425' }
      ];

      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: 'And what about last month?',
          conversationHistory
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.response.content).toBeDefined();
    });

    it('should handle special characters in message', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: 'What about "Forbidden Professor" & "Billionaire\'s Baby"?'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle long messages', async () => {
      const longMessage = 'Analyze this: ' + 'word '.repeat(1000);

      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: longMessage
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  /**
   * Step 3: Test conversation storage
   */
  describe('Step 3: Conversation Storage', () => {
    it('should retrieve chat history', async () => {
      const response = await request(app)
        .get('/api/chat/history')
        .query({ conversationId: 'test-conv-123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return empty array for new conversation', async () => {
      const response = await request(app)
        .get('/api/chat/history')
        .query({ conversationId: 'new-conversation-xyz' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should handle missing conversationId parameter', async () => {
      const response = await request(app)
        .get('/api/chat/history');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should store conversation in memory (mock mode)', async () => {
      const messageResponse = await request(app)
        .post('/api/chat/message')
        .send({
          message: 'Test message for storage',
          conversationId: 'storage-test-123'
        });

      expect(messageResponse.status).toBe(200);
      expect(messageResponse.body.success).toBe(true);

      // Retrieve history
      const historyResponse = await request(app)
        .get('/api/chat/history')
        .query({ conversationId: 'storage-test-123' });

      expect(historyResponse.status).toBe(200);
      expect(Array.isArray(historyResponse.data)).toBe(true);
    });

    it('should maintain message order in conversation', async () => {
      const conversationId = 'order-test-123';

      // Send multiple messages
      const messages = [
        'First message',
        'Second message',
        'Third message'
      ];

      for (const msg of messages) {
        await request(app)
          .post('/api/chat/message')
          .send({ message: msg, conversationId });
      }

      // Retrieve history
      const response = await request(app)
        .get('/api/chat/history')
        .query({ conversationId });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  /**
   * Step 4: Test strategy generation
   */
  describe('Step 4: Strategy Generation', () => {
    it('should generate strategy recommendations', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: 'What should we do to improve revenue?'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.response.content).toBeDefined();

      // Should contain recommendations
      const content = response.body.response.content.toLowerCase();
      const hasRecommendation =
        content.includes('recommend') ||
        content.includes('suggest') ||
        content.includes('should') ||
        content.includes('focus');

      expect(hasRecommendation).toBe(true);
    });

    it('should include data-driven insights', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: 'Analyze our content performance'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const content = response.body.response.content;

      // Should include metrics/data
      const hasData =
        content.includes('$') ||
        content.includes('%') ||
        content.includes('views') ||
        content.includes('engagement') ||
        /\d+/.test(content);

      expect(hasData).toBe(true);
    });

    it('should provide actionable next steps', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: 'What is our strategy?'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const content = response.body.response.content.toLowerCase();

      // Should include action items
      const hasActionItems =
        content.includes('next step') ||
        content.includes('action') ||
        content.includes('should') ||
        content.includes('plan');

      expect(hasActionItems).toBe(true);
    });

    it('should reference historical data in strategy', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: 'Should we pivot our strategy?'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const content = response.body.response.content;

      // Should reference current state
      expect(content).toMatch(/current|data|performance|mrr|revenue|growth/i);
    });

    it('should handle strategy approval requests', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: 'I approve this strategy'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle strategy rejection with reason', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: 'I reject this because the budget is too high'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.response.content).toBeDefined();
    });
  });

  /**
   * Step 5: Run and verify tests pass
   * (This is done by running the test suite)
   */

  /**
   * Additional tests for context window management
   */
  describe('Context Window Management', () => {
    it('should handle conversation with context history', async () => {
      const conversationHistory = [
        { role: 'user', content: 'What is our MRR?' },
        { role: 'assistant', content: 'Your MRR is $425' },
        { role: 'user', content: 'What about last month?' },
        { role: 'assistant', content: 'Last month it was $379' },
        { role: 'user', content: 'And subscribers?' },
        { role: 'assistant', content: 'You have 38 subscribers' }
      ];

      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: 'What is the growth rate?',
          conversationHistory,
          conversationId: 'context-test-123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.response.content).toBeDefined();
    });

    it('should maintain context across multi-turn conversation', async () => {
      const conversationId = 'multi-turn-test';

      // First message
      const r1 = await request(app)
        .post('/api/chat/message')
        .send({
          message: 'What is our MRR?',
          conversationId
        });

      expect(r1.status).toBe(200);

      // Follow-up message
      const r2 = await request(app)
        .post('/api/chat/message')
        .send({
          message: 'And what about growth?',
          conversationId,
          conversationHistory: [
            { role: 'user', content: 'What is our MRR?' },
            { role: 'assistant', content: r1.body.data.content }
          ]
        });

      expect(r2.status).toBe(200);
      expect(r2.body.data.content).toBeDefined();
    });

    it('should handle follow-up questions with context', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: 'And what about last week?',
          conversationHistory: [
            { role: 'user', content: 'What is our revenue?' },
            { role: 'assistant', content: 'Your revenue is $425 MRR' }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Should detect follow-up and provide contextual response
      const content = response.body.response.content.toLowerCase();
      expect(content).toMatch(/week|last|prior|revenue|mrr|\$/i);
    });
  });

  /**
   * Error handling tests
   */
  describe('Error Handling', () => {
    it('should handle malformed request body', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send('invalid json string');

      expect(response.status).toBe(400);
    });

    it('should handle missing message field gracefully', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({ otherField: 'value' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle very long conversation history', async () => {
      const longHistory = Array(50).fill(null).map((_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message number ${i}`
      }));

      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: 'Final message',
          conversationHistory: longHistory
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  /**
   * Data integration tests
   */
  describe('Data Integration', () => {
    it('should include mock revenue data in responses', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({ message: 'Show me revenue data' });

      expect(response.status).toBe(200);
      const content = response.body.response.content;

      // Mock data values
      expect(content).toMatch(/\$425|\$379|\$285/);
    });

    it('should include mock post performance data', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({ message: 'How are posts performing?' });

      expect(response.status).toBe(200);
      const content = response.body.response.content;

      // Should mention posts with views
      expect(content).toMatch(/views|likes|engagement|post/i);
    });

    it('should include mock keyword ranking data', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({ message: 'Keyword rankings' });

      expect(response.status).toBe(200);
      const content = response.body.response.content;

      expect(content).toMatch(/keyword|ranking|position/i);
    });

    it('should include mock campaign data', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({ message: 'Ad campaign performance' });

      expect(response.status).toBe(200);
      const content = response.body.response.content;

      expect(content).toMatch(/campaign|spend|roi|ad/i);
    });
  });

  /**
   * Response quality tests
   */
  describe('Response Quality', () => {
    it('should provide structured responses with formatting', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({ message: 'Revenue analysis' });

      expect(response.status).toBe(200);
      const content = response.body.response.content;

      // Should use markdown formatting
      const hasFormatting =
        content.includes('**') || // Bold
        content.includes('##') || // Headers
        content.includes('•') ||  // Bullets
        content.includes('-') ||  // Dashes
        content.includes('📊') || // Emojis
        content.includes('📈');   // Emojis

      expect(hasFormatting).toBe(true);
    });

    it('should provide actionable insights', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({ message: 'What should we focus on?' });

      expect(response.status).toBe(200);
      const content = response.body.response.content.toLowerCase();

      // Should include recommendations
      const hasRecommendations =
        content.includes('recommend') ||
        content.includes('focus') ||
        content.includes('should') ||
        content.includes('priority') ||
        content.includes('next');

      expect(hasRecommendations).toBe(true);
    });

    it('should maintain professional tone', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({ message: 'Hello' });

      expect(response.status).toBe(200);
      const content = response.body.response.content;

      // Should be professional
      expect(content).toBeDefined();
      expect(content.length).toBeGreaterThan(20);
    });

    it('should include timestamps in responses', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({ message: 'Test message' });

      expect(response.status).toBe(200);
      expect(response.body.response.timestamp).toBeDefined();

      const timestamp = new Date(response.body.response.timestamp);
      expect(timestamp.isValid()).toBe(true);
    });
  });
});
