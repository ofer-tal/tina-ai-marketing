import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config();

/**
 * Use TikTok oEmbed API to get video details
 * Since we can't list videos, we'll extract video IDs from the database
 * and fetch fresh data for each one using oEmbed
 */

async function syncWithOEmbed() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();

    console.log('=== SYNCING TIKTOK POSTS USING OEMBED API ===\n');

    // Get existing TikTok posts with video IDs
    const existingPosts = await db.collection('marketing_posts').find({
      platform: 'tiktok',
      tiktokVideoId: { $exists: true, $ne: null }
    }).toArray();

    console.log(`Found ${existingPosts.length} existing TikTok posts in database\n`);

    if (existingPosts.length === 0) {
      console.log('No existing TikTok posts found to sync.');
      return;
    }

    // Try to fetch fresh data for each post using oEmbed
    console.log('Fetching fresh data for existing posts...\n');

    let updatedCount = 0;
    let errorCount = 0;

    for (const post of existingPosts) {
      const videoId = post.tiktokVideoId;
      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(`https://www.tiktok.com/@blush.app/video/${videoId}`)}`;

      try {
        const response = await fetch(oembedUrl);
        if (response.ok) {
          const data = await response.json();

          // Update the post with fresh data
          const updateData = {
            title: data.title || post.title,
            description: post.description,
            caption: data.title || post.caption,
            tiktokShareUrl: data.share_url || post.tiktokShareUrl,
            updatedAt: new Date(),
          };

          await db.collection('marketing_posts').updateOne(
            { _id: post._id },
            { $set: updateData }
          );

          console.log(`✓ Updated ${videoId}: ${data.title?.substring(0, 40) || 'No title'}...`);
          updatedCount++;
        } else {
          console.log(`✗ Failed ${videoId}: HTTP ${response.status}`);
          errorCount++;
        }

        // Rate limiting - delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.log(`✗ Error ${videoId}: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n=== OEMBED SYNC COMPLETE ===`);
    console.log(`Updated: ${updatedCount}/${existingPosts.length}`);
    console.log(`Errors: ${errorCount}/${existingPosts.length}`);

    // Summary of current state
    const finalPosts = await db.collection('marketing_posts').find({
      platform: 'tiktok'
    }).toArray();

    console.log(`\nTotal TikTok posts in database: ${finalPosts.length}`);
    console.log('\nExisting posts (with TikTok URLs):');
    finalPosts
      .filter(p => p.tiktokShareUrl)
      .sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt))
      .forEach((p, i) => {
        const postedAt = new Date(p.postedAt).toLocaleDateString();
        console.log(`  ${i + 1}. ${p.tiktokShareUrl}`);
        console.log(`     Posted: ${postedAt} | Caption: ${p.caption?.substring(0, 40) || 'N/A'}...`);
      });

    // Check for gaps - user mentioned 9 missing posts
    console.log('\n=== INFO ===');
    console.log('To find missing posts on TikTok:');
    console.log('1. Visit https://www.tiktok.com/@blush.app');
    console.log('2. Compare the videos with the list above');
    console.log('3. Provide the missing TikTok URLs to import them');
    console.log('\nThe current TikTok API credentials only support posting, not listing.');
    console.log('To enable automatic video listing, you need TikTok Research API access.');

  } finally {
    await client.close();
  }
}

syncWithOEmbed().catch(console.error);
