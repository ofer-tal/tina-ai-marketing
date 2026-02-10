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

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const messages = await db.collection('chat_messages')
    .find({ timestamp: { $gte: oneDayAgo } })
    .sort({ timestamp: -1 })
    .limit(50)
    .toArray();

  console.log('\n=== Recent Chat Messages (last 24 hours) ===');
  console.log('Total:', messages.length, '\n');

  if (messages.length === 0) {
    console.log('No chat messages in the last hour.');
  } else {
    messages.forEach(m => {
      const role = m.role || 'unknown';
      const content = (m.content || '').substring(0, 200);
      const time = new Date(m.timestamp).toISOString();
      console.log(`${time} [${role}]:`);
      console.log(content + (content.length >= 200 ? '...' : ''));
      console.log('');
    });
  }

  await mongoose.disconnect();
}

main().catch(console.error);
