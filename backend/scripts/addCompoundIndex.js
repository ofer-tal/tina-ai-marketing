#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../..');
const envPath = path.join(projectRoot, '.env');
dotenv.config({ path: envPath });

async function addCompoundIndex() {
  const mongoose = await import('mongoose');

  await mongoose.default.connect(process.env.MONGODB_URI);

  console.log('Connected to MongoDB');

  // Get the collection
  const collection = mongoose.default.connection.collection('marketing_daily_spends');

  // List current indexes
  console.log('\nCurrent indexes:');
  const indexes = await collection.indexes();
  indexes.forEach(idx => {
    console.log(`  ${idx.name}: ${JSON.stringify(idx.key)} ${idx.unique ? '(UNIQUE)' : ''}`);
  });

  // Check if compound index already exists
  const existingCompoundIndex = indexes.find(idx =>
    idx.key &&
    idx.key.date === 1 &&
    idx.key.campaignId === 1 &&
    idx.key.platform === 1 &&
    idx.unique
  );

  if (existingCompoundIndex) {
    console.log('\n✓ Compound unique index on (date, campaignId, platform) already exists');
  } else {
    console.log('\nAdding compound unique index on (date, campaignId, platform)...');
    await collection.createIndex(
      { date: 1, campaignId: 1, platform: 1 },
      { unique: true, name: 'date_1_campaignId_1_platform_1_unique' }
    );
    console.log('✓ Compound unique index added successfully');
  }

  // Show final indexes
  console.log('\nFinal indexes:');
  const finalIndexes = await collection.indexes();
  finalIndexes.forEach(idx => {
    console.log(`  ${idx.name}: ${JSON.stringify(idx.key)} ${idx.unique ? '(UNIQUE)' : ''}`);
  });

  await mongoose.default.disconnect();
  console.log('\nDone!');
}

addCompoundIndex().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
