/**
 * Check what's actually stored in the proposal
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

// Get the most recent tier_2 create_post proposal
const proposal = await ToolProposal.findOne({
  toolName: 'create_post'
})
.sort({ createdAt: -1 })
.lean();  // Use lean to get the raw document

if (proposal) {
  console.log('=== MOST RECENT create_post PROPOSAL ===');
  console.log('ID:', proposal._id);
  console.log('CreatedAt:', proposal.createdAt);
  console.log('Status:', proposal.status);
  console.log('Requires Approval:', proposal.requiresApproval);
  console.log('Executed:', proposal.status === 'executed');
  console.log('');
  console.log('=== EXECUTION DATA ===');
  console.log('Has executionResult:', proposal.executionResult !== null && proposal.executionResult !== undefined);
  console.log('executionResult type:', typeof proposal.executionResult);
  console.log('executionResult:', JSON.stringify(proposal.executionResult, null, 2));
  console.log('');
  console.log('=== RAW DOCUMENT ===');
  console.log(JSON.stringify(proposal, null, 2));
} else {
  console.log('No proposals found');
}

process.exit(0);
