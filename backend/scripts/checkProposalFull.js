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

  // Get one recent create_post proposal
  const proposal = await db.collection('tool_proposals')
    .find({ toolName: 'create_post' })
    .sort({ createdAt: -1 })
    .limit(1)
    .toArray();

  if (proposal.length > 0) {
    console.log('\n=== Full Tool Proposal Document ===\n');
    console.log(JSON.stringify(proposal[0], null, 2));
  }

  await mongoose.disconnect();
}

main().catch(console.error);
