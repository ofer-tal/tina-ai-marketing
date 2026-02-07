/**
 * Check recent chat for create_post tool calls
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
const { default: ToolProposal } = await import('../models/ToolProposal.js');

// Get the most recent chat
const chats = await ChatConversation.find().sort({ updatedAt: -1 }).limit(1);

if (chats.length > 0) {
  const chat = chats[0];
  const messages = chat.messages || [];

  console.log('=== MOST RECENT CHAT ===');
  console.log('Last updated:', chat.updatedAt);
  console.log('Total messages:', messages.length);
  console.log('');

  // Find all tool calls
  let toolCallCount = 0;
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    
    if (msg.toolCalls && msg.toolCalls.length > 0) {
      for (const tc of msg.toolCalls) {
        toolCallCount++;
        console.log(`\n--- Tool Call #${toolCallCount} (Message ${i}) ---`);
        console.log('Tool:', tc.name);
        console.log('Status:', tc.status || 'unknown');
        
        if (tc.arguments) {
          const args = typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments);
          console.log('Arguments:', args.substring(0, 500));
        }
        
        if (tc.error) {
          console.log('ERROR:', tc.error);
        }
        
        if (tc.result) {
          const result = typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result);
          console.log('Result:', result.substring(0, 300));
        }
      }
    }
  }

  if (toolCallCount === 0) {
    console.log('No tool calls found in this chat.');
  }

  // Also check ToolProposal collection for recent create_post attempts
  console.log('\n=== RECENT TOOL PROPOSALS (create_post) ===');
  const proposals = await ToolProposal.find({
    toolName: 'create_post'
  }).sort({ createdAt: -1 }).limit(5);

  console.log('Found:', proposals.length);
  for (const p of proposals) {
    console.log('\n---');
    console.log('ID:', p._id.toString());
    console.log('Status:', p.status);
    console.log('CreatedAt:', p.createdAt);
    console.log('Requires Approval:', p.requiresApproval);
    console.log('Executed:', p.status === 'executed');
    console.log('Error:', p.executionError || 'None');
    
    if (p.toolParameters) {
      const params = typeof p.toolParameters === 'string' ? p.toolParameters : JSON.stringify(p.toolParameters);
      console.log('Params:', params.substring(0, 200));
    }
    
    if (p.executionResult) {
      const result = typeof p.executionResult === 'string' ? p.executionResult : JSON.stringify(p.executionResult);
      console.log('Result:', result.substring(0, 200));
    }
  }

} else {
  console.log('No chats found');
}

process.exit(0);
