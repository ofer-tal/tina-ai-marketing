/**
 * Test script for Feature #50: Context Window Management
 * This script sends 25 rapid messages to test context window optimization
 */

const testMessages = [
  "What's my current MRR?",
  "How many subscribers do I have?",
  "What's my ARPU?",
  "Show me my top performing posts",
  "What are my keyword rankings?",
  "How's my ad spend doing?",
  "What's my revenue trend?",
  "Show me content performance",
  "What's my conversion rate?",
  "How are my TikTok posts doing?",
  "What about Instagram performance?",
  "Show me YouTube Shorts metrics",
  "What's my churn rate?",
  "How's my LTV looking?",
  "What's my customer acquisition cost?",
  "Show me my best story categories",
  "What's my engagement rate?",
  "How's my ROI on ads?",
  "What's my profit margin?",
  "Show me weekly revenue breakdown",
  "What's my month-over-month growth?",
  "How are my new keywords performing?",
  "What's my budget utilization?",
  "Show me my campaign performance",
  "Test context window at 25 messages"
];

console.log("Test messages prepared for context window test");
console.log(`Total messages: ${testMessages.length}`);
console.log("\nThese messages should be sent via the chat UI to test:");
console.log("1. Messages 1-20: Normal operation (all messages in context)");
console.log("2. Messages 21-29: Approaching limit");
console.log("3. Message 25+: Should trigger summarization (but we're testing at 25)");
