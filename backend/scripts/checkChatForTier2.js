/**
 * Check chat logs for tier_2 post creation
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

// Get the most recent chat
const chats = await ChatConversation.find().sort({ updatedAt: -1 }).limit(1);

if (chats.length > 0) {
  const chat = chats[0];
  const messages = chat.messages || [];

  console.log('Total messages:', messages.length);
  console.log('\n--- Last 10 messages ---\n');

  for (const msg of messages.slice(-10)) {
    console.log('Role:', msg.role);
    const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
    console.log('Content:', content.substring(0, 400));
    if (msg.toolCalls && msg.toolCalls.length > 0) {
      console.log('Tool calls:', msg.toolCalls.length);
      for (const tc of msg.toolCalls) {
        console.log('  - Tool:', tc.name);
        if (tc.arguments) {
          const args = typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments);
          console.log('    Args:', args.substring(0, 200));
        }
      }
    }
    console.log('---');
  }
} else {
  console.log('No chats found');
}

process.exit(0);
