#!/bin/bash

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  MongoDB Collection Migration: chat_conversations → marketing_chat_conversations ║"
echo "╚═════════════════════════════════════════════════════╝"
echo ""

# Configuration
SOURCE_COLLECTION="chat_conversations"
TARGET_COLLECTION="marketing_chat_conversations"
CONNECTION_STRING="${MONGODB_URI:-mongodb%2Bchat_conversations=marketing%2Bchat_conversations}"

# Check if MONGODB_URI is set
if [ -z "$MONGODB_URI" ]; then
  echo "❌ ERROR: MONGODB_URI environment variable not set"
  echo "Please set MONGODB_URI in your environment or .env file"
  exit 1
fi

# Replace connection string for target collection
if [[ "$CONNECTION_STRING" == *chat_conversations* ]]; then
    TARGET_CONNECTION_STRING="${CONNECTION_STRING//chat_conversations/marketing_chat_conversations}"
else
    TARGET_CONNECTION_STRING="$CONNECTION_STRING"
fi

echo "✅ Configuration:"
echo "   Source Collection: $SOURCE_COLLECTION"
echo "   Target Collection: $TARGET_COLLECTION"
echo "   Dry Run: $DRY_RUN"
echo ""

# Check if mongosh is installed
if ! command -v mongosh &> /dev/null; then
    echo "❌ ERROR: mongosh not found"
    echo "Please install MongoDB Database Tools:"
    echo "   macOS: brew install mongosh"
    echo "   Ubuntu/Debian: apt install mongo-tools"
    exit 1
fi

# Check for dry-run mode
if [[ "$1" == "--dry-run" || "$1" == "--dry" ]]; then
    echo "🔍 DRY RUN MODE - No changes will be made to MongoDB Atlas"
    echo ""
    echo "To actually run the migration, remove the --dry-run flag"
    exit 0
fi

# Function to display backup info
show_backup_info() {
    local backup_count=0
    local backup_size=0
    local oldest_backup=""
    
    if [ -d "$BACKUP_DIR" ]; then
        for backup in "$BACKUP_DIR"/"$TARGET_COLLECTION"_*.json; do
            if [ -f "$backup" ]; then
                backup_count=$((backup_count + 1))
                local size=$(du -sh "$backup" | cut -f1)
                backup_size=$((backup_size + size))
                if [ "$backup_size" -gt "$backup_size" ]; then
                    oldest_backup="$backup"
                fi
            fi
        done
    fi
    
    if [ $backup_count -eq 0 ]; then
        echo "   No backups found"
    return
    elif [ $backup_count -eq 1 ]; then
        echo "   📦 Backup:"
        echo "   📁 Found 1 backup from $(date -r "$oldest_backup" '+%Y-%m-%d %H:%M:%S')"
        echo "   💾 Size: $(numfmt --grouping=3 $backup_size)"
    else
        echo "   📦 Backups: $backup_count"
        echo "   📁 Latest: $(date -r "$oldest_backup" '+%Y-%m-%d %H:%M:%S')"
        echo "   💾 Total: $(numfmt --grouping=3 $(echo "$backup_size" | numfmt --grouping=3))"
        echo ""
        echo "   ℹ️  Note: Only the latest backup will be used for rollback"
    return
    fi
}

echo ""
echo "🔄 Starting migration..."
echo "   Source: $SOURCE_COLLECTION"
echo "   Target: $TARGET_COLLECTION"
echo ""

# Use mongosh to run migration
echo "mongosh \"$CONNECTION_STRING\" --eval "
echo 'var startTime = new Date();'
echo 'var sourceCount = db.'"$SOURCE_COLLECTION"'.count();'
echo 'var targetColl = db.'"$TARGET_COLLECTION"'.get();'
echo 'var targetExists = targetColl !== null;'
echo 'var targetCount = targetColl !== null ? targetColl.count() : 0;'
echo 'print(\"\\n📊 Source collection: \" + sourceCount + \" documents\");'
echo 'if (targetExists) {'
echo '  print(\"\\n⚠️  Target collection already exists with \" + targetCount + \" documents\");'
echo '  if (targetCount > 0) {'
echo '    print(\"\\n❌ ERROR: Target collection already has data. Please clear it manually or use --force flag.\");'
echo '    quit(1);'
echo '  }'
echo 'print(\"\\n📦 Creating indexes on target collection...\");'
echo 'targetColl.createIndex({collectionName: 1, createdAt: -1, updatedAt: -1, isActive: 1});'
echo 'print(\"\\n✅ Indexes created\");'
echo 'print(\"\\n📥 Migrating \" + sourceCount + \" documents...\");'
echo 'var migrated = 0;'
echo 'db.'"$SOURCE_COLLECTION"'.find().forEach(function(doc) {'
echo '  migrated++;'
echo '  var newDoc = {'
echo '    \"_id\": doc._id,'
echo '    \"title\": (doc.title || \"Migrated Conversation\") + \" (Marketing)\",'
echo '    \"messages\": doc.messages || [],'
echo '    \"summary\": doc.summary or \"\"\",'
echo '    \"summaryPoints\": doc.summaryPoints || [],'
echo '    \"contextData\": doc.contextData || {},'
echo '    \"isActive\": doc.isActive !== false,'
echo '    \"archivedAt\": doc.archivedAt || null,'
echo '    \"metadata\": doc.metadata || {},'
echo '    \"categoryTags\": doc.categoryTags || [],'
echo '    \"createdAt\": doc.createdAt,'
echo '    \"updatedAt\": doc.updatedAt'
echo '  };'
echo '  targetColl.insertOne(newDoc);'
echo '});'
echo 'print(\"\\n✅ Migration complete!\");'
echo 'print(\"\\n📊 Processed: \" + migrated + \"/\" + sourceCount);'
echo 'print(\"\\n✅ Migrated: \" + migrated + \" documents\");'
echo 'if (migrated !== sourceCount) {'
echo '  print(\"\\n⚠️  Warning: Only \" + migrated + \"/\" + sourceCount + \" documents were processed\");'
echo '}'
echo '"
```
chmod +x /home/ofer/blush-marketing/backend/scripts/migrate-collection.js
