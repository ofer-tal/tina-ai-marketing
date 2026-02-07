/**
 * Test if executionResult can be saved to ToolProposal
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

console.log('=== TESTING PROPOSAL SAVE ===\n');

// Create a test proposal
const testData = {
  success: true,
  created: 1,
  posts: [
    { id: 'test123', platform: 'instagram', status: 'draft' }
  ],
  message: 'Test message'
};

console.log('Test data:', JSON.stringify(testData, null, 2));

const proposal = new ToolProposal({
  toolName: 'test',
  toolParameters: { test: true },
  reasoning: 'Test reasoning',
  proposedBy: 'tina',
  status: 'pending_approval',
  requiresApproval: false
});

console.log('\nCreated proposal, ID:', proposal._id);
console.log('executionResult before save:', proposal.executionResult);

// Set executionResult
proposal.executionResult = testData;
proposal.executedAt = new Date();
proposal.status = 'executed';

console.log('executionResult after set:', proposal.executionResult);
console.log('Type:', typeof proposal.executionResult);

// Save
await proposal.save();

console.log('\nSaved proposal');

// Reload from database
const reloaded = await ToolProposal.findById(proposal._id);

console.log('\n=== RELOADED FROM DATABASE ===');
console.log('executionResult exists:', reloaded.executionResult !== null && reloaded.executionResult !== undefined);
console.log('executionResult:', JSON.stringify(reloaded.executionResult, null, 2));
console.log('executedAt:', reloaded.executedAt);
console.log('status:', reloaded.status);

// Clean up
await ToolProposal.deleteOne({ _id: proposal._id });

process.exit(0);
