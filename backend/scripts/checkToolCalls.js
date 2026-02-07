/**
 * Check tool calls in recent chat
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

const { default: ChatConversation } = await import('../models/ChatConversation.js');

const chats = await ChatConversation.find().sort({ updatedAt: -1 }).limit(1);

if (chats.length > 0) {
  const chat = chats[0];
  const messages = chat.messages || [];

  console.log('=== ALL TOOL CALLS IN CHAT ===\n');

  let toolCallCount = 0;
  for (const msg of messages) {
    if (msg.toolCalls && msg.toolCalls.length > 0) {
      for (const tc of msg.toolCalls) {
        toolCallCount++;
        console.log(`\n--- Tool Call #${toolCallCount} ---`);
        console.log('Tool:', tc.name);
        console.log('Status:', tc.status || 'N/A');
        if (tc.arguments) {
          const args = typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments, null, 2);
          console.log('Arguments:', args.substring(0, 800));
        }
        if (tc.result) {
          const result = typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result);
          console.log('Result:', result.substring(0, 400));
        }
        if (tc.error) {
          console.log('Error:', tc.error);
        }
      }
    }
  }

  if (toolCallCount === 0) {
    console.log('No tool calls found in this chat.');
  }
} else {
  console.log('No chats found');
}

process.exit(0);
