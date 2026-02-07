/**
 * Check execution results for tier_2 tool proposals
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

const { default: ToolProposal } = await import('../models/ToolProposal.js');

// Get recent tier_2 create_post attempts
const proposals = await ToolProposal.find({
  toolName: 'create_post'
}).sort({ createdAt: -1 }).limit(5);

console.log('=== TIER_2 TOOL PROPOSAL EXECUTION RESULTS ===\n');

for (const p of proposals) {
  const params = JSON.parse(JSON.stringify(p.toolParameters));
  if (params.contentTier === 'tier_2') {
    console.log('---');
    console.log('Proposal ID:', p._id.toString());
    console.log('CreatedAt:', p.createdAt);
    console.log('Status:', p.status);
    console.log('Story ID:', params.storyId);
    console.log('Platform:', params.platforms);
    console.log('Avatar ID:', params.avatarId);
    console.log('Script:', params.script?.substring(0, 100));
    
    console.log('\nExecution Result:');
    if (p.executionResult) {
      console.log(JSON.stringify(p.executionResult, null, 2));
    } else {
      console.log('NULL - No execution result stored!');
    }
    
    console.log('\nExecution Error:', p.executionError || 'None');
    console.log('');
  }
}

process.exit(0);
