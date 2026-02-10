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
  const proposals = await db.collection('marketing_tool_proposals')
    .find({ createdAt: { $gte: oneHourAgo } })
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();

  console.log('\n=== Recent Tool Proposals (last hour) ===');
  console.log('Total:', proposals.length, '\n');

  proposals.forEach(p => {
    console.log(new Date(p.createdAt).toISOString());
    console.log('  Tool:', p.toolName);
    console.log('  Status:', p.status, '| Approved:', p.approved);
    if (p.parameters) {
      const paramsStr = JSON.stringify(p.parameters);
      console.log('  Params:', paramsStr.substring(0, 150) + (paramsStr.length > 150 ? '...' : ''));
    }
    console.log('');
  });

  // Check all schedule_tier_2_post proposals
  const scheduleProposals = await db.collection('marketing_tool_proposals')
    .find({ toolName: 'schedule_tier_2_post' })
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();

  console.log('\n=== All schedule_tier_2_post proposals (last 10) ===');
  console.log('Total:', scheduleProposals.length, '\n');

  scheduleProposals.forEach(p => {
    console.log(new Date(p.createdAt).toISOString());
    console.log('  Status:', p.status, '| Approved:', p.approved);
    if (p.parameters) {
      console.log('  Stories:', p.parameters.story_ids?.length || 0, '| Scheduled:', p.parameters.scheduled_at);
    }
    console.log('');
  });

  await mongoose.disconnect();
}

main().catch(console.error);
