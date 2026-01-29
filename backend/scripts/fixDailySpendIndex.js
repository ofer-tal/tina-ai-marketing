#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../..');
const envPath = path.join(projectRoot, '.env');
dotenv.config({ path: envPath });

async function fixIndex() {
  const mongoose = await import('mongoose');

  await mongoose.default.connect(process.env.MONGODB_URI);

  console.log('Connected to MongoDB');

  // Get the collection
  const collection = mongoose.default.connection.collection('marketing_daily_spends');

  // List all indexes
  console.log('\nCurrent indexes:');
  const indexes = await collection.indexes();
  indexes.forEach(idx => {
    console.log(`  ${idx.name}: ${JSON.stringify(idx.key)}`);
  });

  // Drop the unique index on date field if it exists
  const dateIndex = indexes.find(idx => idx.key && idx.key.date === 1 && idx.unique);
  if (dateIndex) {
    console.log(`\nDropping unique index: ${dateIndex.name}`);
    await collection.dropIndex(dateIndex.name);
    console.log('Index dropped successfully');
  } else {
    console.log('\nNo unique index on date field found');
  }

  await mongoose.default.disconnect();
  console.log('\nDone!');
}

fixIndex().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
