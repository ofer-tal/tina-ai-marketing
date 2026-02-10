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

  // Check recent tool proposals
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const proposals = await db.collection('tool_proposals')
    .find({ createdAt: { $gte: oneHourAgo } })
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();

  console.log('\n=== Recent Tool Proposals (last hour) ===');
  console.log('Total:', proposals.length, '\n');

  if (proposals.length === 0) {
    console.log('No tool proposals in the last hour.');
  } else {
    proposals.forEach(p => {
      console.log(new Date(p.createdAt).toISOString());
      console.log('  Tool:', p.toolName);
      console.log('  Status:', p.status, '| Approved:', p.approved);
      if (p.parameters) {
        const paramsStr = JSON.stringify(p.parameters);
        console.log('  Params:', paramsStr.substring(0, 200) + (paramsStr.length > 200 ? '...' : ''));
      }
      console.log('');
    });
  }

  // Check all create_post proposals
  const createPostProposals = await db.collection('tool_proposals')
    .find({ toolName: 'create_post' })
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();

  console.log('\n=== All create_post proposals (last 10) ===');
  console.log('Total found:', createPostProposals.length, '\n');

  createPostProposals.forEach(p => {
    console.log(new Date(p.createdAt).toISOString());
    console.log('  Status:', p.status, '| Approved:', p.approved);
    if (p.parameters) {
      console.log('  contentTier:', p.parameters.contentTier);
      console.log('  platforms:', p.parameters.platforms);
      console.log('  scheduled_at:', p.parameters.scheduled_at);
    }
    console.log('');
  });

  await mongoose.disconnect();
}

main().catch(console.error);
