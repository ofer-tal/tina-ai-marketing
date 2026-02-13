#!/bin/bash

echo "╔═════════════════════════════════════════════════════════════╗"
echo "║  MongoDB Collection Migration: chat_conversations → marketing_chat_conversations ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Configuration
SOURCE_COLLECTION="chat_conversations"
TARGET_COLLECTION="marketing_chat_conversations"

# Get MONGODB_URI from environment or use default
if [ -n "$MONGODB_URI" ]; then
    CONNECTION_STRING="$MONGODB_URI"
    # Replace collection name
    CONNECTION_STRING="${CONNECTION_STRING//chat_conversations/marketing_chat_conversations}"
else
    CONNECTION_STRING="mongodb+srv://blush-marketing:_cluster0.kwwnwxx.mongodb.net:27017/blush?retryWrites=true&w=majority&appName=blush-marketing"
fi

echo "✅ MongoDB URI: ${CONNECTION_STRING:0:80}..."
echo ""

# Check for dry-run
if [[ "$1" == "--dry-run" || "$1" == "--dry" ]]; then
    echo "🔍 DRY RUN MODE - No changes will be made"
    echo ""
    echo "To actually run migration, remove --dry-run flag"
    exit 0
fi

echo "🔄 Starting migration..."
echo "   Source: $SOURCE_COLLECTION"
echo "   Target: $TARGET_COLLECTION"
echo ""

# Use mongosh with JavaScript
mongosh "$CONNECTION_STRING" --eval "
// Start timer
var startTime = new Date();
var sourceCount = 0;
var migrated = 0;

// Connect to source collection
db = db.getCollection('$SOURCE_COLLECTION');

// Count documents
sourceCount = db.count();
print('📊 Source collection: ' + sourceCount + ' documents');

// Check target collection
var targetColl = db.getCollection('$TARGET_COLLECTION');
var targetExists = targetColl !== null;
var targetCount = targetExists ? targetColl.count() : 0;

if (targetExists) {
  print('⚠️  Target collection already exists with ' + targetCount + ' documents');
  if (targetCount > 0) {
    print('❌ ERROR: Target collection already has data. Please clear it manually.');
    quit(1);
  }
}

// Create indexes
targetColl.createIndex({collectionName: 1, createdAt: -1, updatedAt: -1, isActive: 1});
print('✅ Indexes created');

// Migrate documents
db.'$SOURCE_COLLECTION'.find().forEach(function(doc) {
  migrated++;
  var newDoc = {
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
  targetColl.insertOne(newDoc);
});

// Complete
print('✅ Migration complete!');
print('📊 Processed: ' + migrated + ' /' + sourceCount);
print('✅ Migrated: ' + migrated + ' documents');

if (migrated !== sourceCount) {
  print('⚠️ Warning: Only ' + migrated + '/' + sourceCount + ' documents were processed');
}
" 2>&1 | grep -E "E137|not shown|Invalid|blocks" || true
echo ""
