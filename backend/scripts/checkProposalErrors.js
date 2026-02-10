import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/blush';

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  // Get the most recent create_post proposals
  const proposals = await db.collection('tool_proposals')
    .find({ toolName: 'create_post' })
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();

  console.log('\n=== Recent create_post Proposals (with full details) ===\n');

  for (const p of proposals) {
    console.log('Time:', new Date(p.createdAt).toISOString());
    console.log('Status:', p.status);
    console.log('Platforms:', p.toolParameters?.platforms);
    console.log('Tier:', p.toolParameters?.contentTier);
    console.log('Story:', p.toolParameters?.storyId);
    if (p.result) {
      console.log('Result:', JSON.stringify(p.result).substring(0, 300));
    }
    if (p.error) {
      console.log('Error:', p.error);
    }
    if (p.executionError) {
      console.log('Execution Error:', p.executionError);
    }
    console.log('---');
  }

  await mongoose.disconnect();
}

main().catch(console.error);
