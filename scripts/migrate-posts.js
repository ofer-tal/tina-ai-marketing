import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config();

/**
 * Migration script to:
 * 1. Rename marketing_posts to marketing_posts_old
 * 2. Migrate old posts to new schema format
 * 3. Create fresh marketing_posts collection
 */

async function migratePosts() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();

    console.log('=== MARKETING_POSTS MIGRATION ===\n');

    // Step 1: Check if marketing_posts_old already exists
    const oldCollectionExists = await db.listCollections({ name: 'marketing_posts_old' }).toArray();
    if (oldCollectionExists.length > 0) {
      console.log('marketing_posts_old already exists. Dropping it first...');
      await db.collection('marketing_posts_old').drop();
    }

    // Step 2: Rename marketing_posts to marketing_posts_old
    console.log('Step 1: Renaming marketing_posts to marketing_posts_old...');
    await db.collection('marketing_posts').rename('marketing_posts_old');
    console.log('  Done.\n');

    // Step 3: Read all old posts
    console.log('Step 2: Reading old posts from marketing_posts_old...');
    const oldPosts = await db.collection('marketing_posts_old').find({}).toArray();
    console.log(`  Found ${oldPosts.length} posts\n`);

    // Step 4: Transform old schema to new schema
    console.log('Step 3: Transforming posts to new schema...');
    const transformedPosts = oldPosts.map(oldPost => {
      // Parse the old _id if it's a string
      let postId;
      try {
        postId = typeof oldPost._id === 'string' ? new ObjectId(oldPost._id) : oldPost._id;
      } catch {
        postId = new ObjectId();
      }

      const newPost = {
        _id: postId,

        // Basic post information
        title: oldPost.title || '',
        description: oldPost.description || oldPost.caption || '',

        // Platform and status
        platform: oldPost.platform === 'pinterest' ? 'tiktok' : oldPost.platform, // Pinterest not supported in new schema, map to tiktok for now
        status: oldPost.status === 'posted' ? 'posted' : 'draft',
        contentType: oldPost.contentType || 'video',

        // Text content
        caption: oldPost.caption || oldPost.description || '',
        hashtags: Array.isArray(oldPost.hashtags) ? oldPost.hashtags :
                   (oldPost.metadata?.hashtags || []),

        // Scheduling
        scheduledAt: oldPost.scheduledFor || oldPost.scheduledAt || oldPost.postedAt || new Date(),
        postedAt: oldPost.postedAt || null,

        // Associated story (may need manual review if storyId is not valid ObjectId)
        storyId: oldPost.storyId ? new ObjectId(oldPost.storyId) : new ObjectId(),
        storyName: oldPost.storyName || 'Unknown Story',
        storyCategory: oldPost.storyCategory || 'romance',
        storySpiciness: oldPost.storySpiciness !== undefined ? oldPost.storySpiciness : 1,

        // Generated timestamp
        generatedAt: oldPost.generatedAt || oldPost.createdAt || new Date(),

        // Platform-specific data
        tiktokVideoId: oldPost.postId || null,
        tiktokShareUrl: oldPost.postUrl || null,

        // Approval workflow (set defaults)
        approvedBy: 'Founder',

        // Metadata
        createdAt: oldPost.createdAt || new Date(),
        updatedAt: oldPost.updatedAt || new Date(),
      };

      // Map Pinterest specific fields (if we add Pinterest support later)
      if (oldPost.platform === 'pinterest') {
        // For now, store Pinterest data in manual posting fields
        newPost.manualPostUrl = oldPost.postUrl || null;
        newPost.status = 'posted'; // All Pinterest posts were posted
      }

      return newPost;
    });
    console.log(`  Transformed ${transformedPosts.length} posts\n`);

    // Step 5: Insert into new marketing_posts collection
    console.log('Step 4: Creating new marketing_posts collection...');
    if (transformedPosts.length > 0) {
      await db.collection('marketing_posts').insertMany(transformedPosts);
    }
    console.log(`  Inserted ${transformedPosts.length} posts\n`);

    // Step 6: Summary
    console.log('=== MIGRATION COMPLETE ===\n');
    console.log('Summary:');
    console.log(`  - marketing_posts_old: ${oldPosts.length} posts (preserved)`);
    console.log(`  - marketing_posts: ${transformedPosts.length} posts (new schema)`);
    console.log('\nField mappings:');
    console.log('  - postId → tiktokVideoId');
    console.log('  - postUrl → tiktokShareUrl');
    console.log('  - scheduledFor → scheduledAt');
    console.log('  - Pinterest posts marked with manualPostUrl');

    // Show sample of migrated posts
    console.log('\n=== SAMPLE MIGRATED POSTS ===');
    const sampleNewPosts = await db.collection('marketing_posts').find({}).limit(3).toArray();
    sampleNewPosts.forEach((post, i) => {
      console.log(`\nPost ${i + 1}:`);
      console.log('  _id:', post._id.toString());
      console.log('  platform:', post.platform);
      console.log('  status:', post.status);
      console.log('  tiktokVideoId:', post.tiktokVideoId);
      console.log('  tiktokShareUrl:', post.tiktokShareUrl);
      console.log('  caption:', post.caption?.substring(0, 50) + '...');
    });

  } finally {
    await client.close();
  }
}

migratePosts().catch(console.error);
