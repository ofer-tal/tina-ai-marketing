import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

/**
 * Cleanup test marketing data
 * - Clears marketing_strategy (840 test AI strategies)
 * - Clears marketing_auth_tokens (expired tokens, will re-authenticate)
 */

async function cleanupTestData() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();

    console.log('=== MARKETING TEST DATA CLEANUP ===\n');

    // 1. Clear marketing_strategy (test AI strategies)
    console.log('Step 1: Clearing marketing_strategy...');
    const strategyCount = await db.collection('marketing_strategy').countDocuments();
    console.log(`  Found ${strategyCount} documents`);
    await db.collection('marketing_strategy').deleteMany({});
    console.log('  Done.\n');

    // 2. Clear marketing_auth_tokens (will re-authenticate)
    console.log('Step 2: Clearing marketing_auth_tokens...');
    const tokenCount = await db.collection('marketing_auth_tokens').countDocuments();
    console.log(`  Found ${tokenCount} tokens`);
    await db.collection('marketing_auth_tokens').deleteMany({});
    console.log('  Done.\n');

    // Summary
    console.log('=== CLEANUP COMPLETE ===\n');
    console.log('Cleared:');
    console.log(`  - marketing_strategy: ${strategyCount} documents`);
    console.log(`  - marketing_auth_tokens: ${tokenCount} tokens`);
    console.log('\nNote: You will need to re-authenticate with TikTok and other platforms');
    console.log('via the Settings page or /auth endpoints.');

  } finally {
    await client.close();
  }
}

cleanupTestData().catch(console.error);
