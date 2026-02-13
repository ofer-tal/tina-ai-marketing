#!/usr/bin/env node

/**
 * MongoDB Collection Migration Script
 * Renames: chat_conversations → marketing_chat_conversations
 *
 * This script:
 * 1. Backs up the existing collection
 * 2. Copies all documents to new collection name
 * 3. Creates indexes on new collection
 * 4. Safe to run multiple times (checks if target exists)
 */

import { MongoClient } from 'mongodb';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from project root (where .env is)
const __filename = fileURLToPath(import.meta.url);
// Script is in backend/scripts/, .env is at project root, so go up TWO levels
const projectRoot = path.resolve(path.dirname(__filename), '..', '..');
config({ path: path.join(projectRoot, '.env') });

// Configuration
const SOURCE_COLLECTION = 'chat_conversations';
const TARGET_COLLECTION = 'marketing_chat_conversations';

// Get MongoDB URI from environment
const MONGODB_URI = process.env.MONGODB_URI;
const BACKUP_DIR = '/home/ofer/blush-marketing/backups/mongodb';

if (!MONGODB_URI) {
  console.error('❌ ERROR: MONGODB_URI environment variable not set');
  console.error('Please set MONGODB_URI in your environment or .env file');
  process.exit(1);
}

console.log('╔═════════════════════════════════════════════════════════════╗');
console.log('║  MongoDB Collection Migration: chat_conversations → marketing_chat_conversations ║');
console.log('╚═════════════════════════════════════════════════════════╝');
console.log('');
console.log(`📊 Source: ${SOURCE_COLLECTION}`);
console.log(`📊 Target: ${TARGET_COLLECTION}`);
console.log('');

async function main() {
  let client;

  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);

    await client.connect();
    const db = client.db();

    const sourceColl = db.collection(SOURCE_COLLECTION);
    const targetColl = db.collection(TARGET_COLLECTION);

    // Count source documents
    const sourceCount = await sourceColl.countDocuments();
    console.log(`📊 Source collection: ${sourceCount} documents`);

    // Check if target collection exists
    const collections = await db.listCollections().toArray();
    const targetExists = collections.find(c => c.name === TARGET_COLLECTION);

    if (targetExists) {
      const targetCount = await targetColl.countDocuments();

      if (targetCount > 0) {
        console.error(`❌ ERROR: Target collection already exists with ${targetCount} documents`);
        console.error('Please drop it manually first if you want to re-migrate:');
        console.error(`  mongosh "${MONGODB_URI}" --eval 'db.getCollection("${TARGET_COLLECTION}").drop()'`);
        process.exit(1);
      } else {
        console.log('✅ Target collection exists but is empty - continuing with migration');
      }
    }

    // Create backup
    console.log('\n💾 Creating backup...');
    const fs = await import('fs');
    const path = await import('path');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
    const backupFile = path.join(BACKUP_DIR, `${SOURCE_COLLECTION}_${timestamp}.json`);

    // Ensure backup directory exists
    await fs.promises.mkdir(BACKUP_DIR, { recursive: true });

    // Backup all documents
    const cursor = sourceColl.find({});
    const documents = [];

    for await (const doc of cursor) {
      documents.push(doc);
      if (documents.length % 1000 === 0) {
        process.stdout.write(`\r   Backing up: ${documents.length}/${sourceCount} documents`);
      }
    }

    await fs.promises.writeFile(backupFile, JSON.stringify(documents, null, 2));
    console.log(`\n✅ Backup saved to: ${backupFile}`);

    // Migrate documents
    console.log('\n🔄 Migrating documents...');
    let migrated = 0;

    for (const doc of documents) {
      const newDoc = {
        _id: doc._id,
        title: (doc.title || 'Migrated Conversation') + ' (Marketing)',
        messages: doc.messages || [],
        summary: doc.summary || '',
        summaryPoints: doc.summaryPoints || [],
        contextData: doc.contextData || {},
        isActive: doc.isActive !== false,
        archivedAt: doc.archivedAt || null,
        metadata: doc.metadata || {},
        categoryTags: doc.categoryTags || [],
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      };

      await targetColl.insertOne(newDoc);
      migrated++;

      if (migrated % 50 === 0 || migrated % 10 === 0) {
        process.stdout.write(`\r   Progress: ${migrated}/${sourceCount}\r`);
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   📊 Processed: ${migrated} / ${sourceCount}`);
    console.log(`   ✅ Migrated: ${migrated} documents`);

    if (migrated < sourceCount) {
      console.warn(`\n⚠️  Warning: Only ${migrated}/${sourceCount} documents were processed`);
    }

    // Create indexes
    console.log('\n📋 Creating indexes...');
    await targetColl.createIndex({ collectionName: 1, createdAt: -1, updatedAt: -1, isActive: 1 });
    console.log('✅ Indexes created');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 MongoDB connection closed');
    }
  }
}

main();
