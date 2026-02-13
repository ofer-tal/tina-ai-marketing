// MongoDB migration script for chat_conversations → marketing_chat_conversations

exports.migrate = async function(db) {
  const sourceColl = db.collection('chat_conversations');
  const targetColl = db.collection('marketing_chat_conversations');

  const sourceCount = await sourceColl.countDocuments();
  console.log(`📊 Source: ${sourceCount} documents`);

  const targetExists = (await targetColl.countDocuments()) > 0;

  if (targetExists) {
    throw new Error(`Target collection already has ${await targetColl.countDocuments()} documents. Clear it manually first.`);
  }

  console.log('🔄 Migrating documents...');
  let migrated = 0;

  const cursor = sourceColl.find({});

  for await cursor.forEachAsync(doc => {
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

  await targetColl.createIndex({ collectionName: 1, createdAt: -1, updatedAt: -1, isActive: 1 });

  console.log(`\n✅ Migration complete!`);
  console.log(`   📊 Processed: ${migrated} / ${sourceCount}`);
  console.log(`   ✅ Migrated: ${migrated} documents`);

  if (migrated < sourceCount) {
    console.warn(`\n⚠️  Warning: Only ${migrated}/${sourceCount} documents were processed`);
  }

  return { processed: sourceCount, migrated };
};
