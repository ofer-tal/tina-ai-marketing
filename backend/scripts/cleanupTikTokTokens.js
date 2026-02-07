/**
 * Cleanup duplicate/old TikTok tokens
 * Keep only the active one and delete the rest
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

const { default: AuthToken } = await import('../models/AuthToken.js');

console.log('=== Cleaning up TikTok tokens ===\n');

// Get all TikTok tokens
const allTokens = await AuthToken.find({ platform: 'tiktok' }).sort({ createdAt: -1 });

console.log('Total TikTok tokens:', allTokens.length);

// Get the active token
const activeToken = await AuthToken.getActiveToken('tiktok');
const activeTokenId = activeToken?._id.toString();

console.log('Active token ID:', activeTokenId || 'None');

// Count tokens to delete
const tokensToDelete = allTokens.filter(t => t._id.toString() !== activeTokenId);
console.log('Tokens to delete:', tokensToDelete.length);

if (tokensToDelete.length > 0) {
  const idsToDelete = tokensToDelete.map(t => t._id);
  
  console.log('\nDeleting old tokens...');
  const result = await AuthToken.deleteMany({
    _id: { $in: idsToDelete }
  });
  
  console.log('Deleted:', result.deletedCount, 'tokens');
} else {
  console.log('No tokens to delete (only active token exists)');
}

// Verify final state
const remainingTokens = await AuthToken.find({ platform: 'tiktok' });
console.log('\nRemaining TikTok tokens:', remainingTokens.length);

const finalActiveToken = await AuthToken.getActiveToken('tiktok');
if (finalActiveToken) {
  console.log('Active token is valid:');
  console.log('  expiresAt:', finalActiveToken.expiresAt?.toISOString());
  console.log('  isActive:', finalActiveToken.isActive);
} else {
  console.log('WARNING: No active token found!');
}

process.exit(0);
