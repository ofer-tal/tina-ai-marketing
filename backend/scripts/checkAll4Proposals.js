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

  // Get the 4 most recent create_post proposals
  const proposals = await db.collection('tool_proposals')
    .find({ toolName: 'create_post' })
    .sort({ createdAt: -1 })
    .limit(4)
    .toArray();

  console.log('\n=== The 4 Recent create_post Proposals ===\n');

  for (let i = 0; i < proposals.length; i++) {
    const p = proposals[i];
    console.log(`Post #${i + 1}:`);
    console.log('  Created:', new Date(p.createdAt).toISOString());
    console.log('  Status:', p.status);
    if (p.toolParameters) {
      console.log('  Platforms:', p.toolParameters.platforms);
      console.log('  Tier:', p.toolParameters.contentTier);
      console.log('  Scheduled:', p.toolParameters.scheduleFor);
      console.log('  Story ID:', p.toolParameters.storyId);
    }
    if (p.result) {
      console.log('  Result:', p.result);
    }
    if (p.error) {
      console.log('  Error:', p.error);
    }
    console.log('');
  }

  await mongoose.disconnect();
}

main().catch(console.error);
