/**
 * Reactivate failed TikTok post
 * Post ID: 6981ad591054df976c3841f5
 */

import { MongoClient, ObjectId } from 'mongodb';
import { config } from 'dotenv';

config();

const POST_ID = '6981ad591054df976c3841f5';

async function reactivatePost() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('AdultStoriesCluster');
  const coll = db.collection('marketing_posts');

  // Get the post
  const post = await coll.findOne({ _id: new ObjectId(POST_ID) });

  if (!post) {
    console.log('Post not found!');
    await client.close();
    return;
  }

  console.log('CURRENT POST STATE:');
  console.log('-------------------');
  console.log('ID:', post._id);
  console.log('Title:', post.title);
  console.log('Status:', post.status);
  console.log('Platform:', post.platform);
  console.log('Caption:', post.caption?.substring(0, 100) + '...');
  console.log('scheduledAt:', post.scheduledAt);
  console.log('sheetTriggeredAt:', post.sheetTriggeredAt);
  console.log('tiktokVideoId:', post.tiktokVideoId || 'NOT SET');
  console.log('storyId:', post.storyId);
  console.log('videoPath:', post.videoPath);

  // Update to approved status
  console.log('\nUPDATING TO APPROVED...');
  const result = await coll.updateOne(
    { _id: new ObjectId(POST_ID) },
    {
      $set: {
        status: 'approved',
        // Reset any posting-related fields
        sheetTriggeredAt: null,
        tiktokVideoId: null,
        tiktokShareUrl: null,
        postedAt: null,
        // Clear any error data
        error: null,
        lastRetryAt: null,
        retryCount: 0
      }
    }
  );

  console.log('Updated:', result.modifiedCount, 'document');

  // Verify the update
  const updated = await coll.findOne({ _id: new ObjectId(POST_ID) });
  console.log('\nNEW STATE:');
  console.log('----------');
  console.log('Status:', updated.status);
  console.log('scheduledAt:', updated.scheduledAt);
  console.log('sheetTriggeredAt:', updated.sheetTriggeredAt);
  console.log('Caption (first 100):', updated.caption?.substring(0, 100));

  // Check what the posting scheduler needs
  console.log('\nPOSTING SCHEDULER CHECK:');
  console.log('------------------------');
  console.log('Has caption:', !!updated.caption);
  console.log('Has videoPath:', !!updated.videoPath);
  console.log('Has storyId:', !!updated.storyId);
  console.log('Status is "approved":', updated.status === 'approved');

  await client.close();
  console.log('\n✓ Post is ready for posting scheduler');
}

reactivatePost();
