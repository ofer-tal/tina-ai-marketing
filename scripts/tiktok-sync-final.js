import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config();

/**
 * Final TikTok sync - properly deduplicates and imports missing videos
 */

async function tikTokSyncFinal() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();

    const token = await db.collection('marketing_auth_tokens').findOne({
      platform: 'tiktok'
    });

    if (!token) {
      console.log('ERROR: No TikTok auth token');
      return;
    }

    console.log('=== TIKTOK SYNC - FINAL VERSION ===\n');

    const fields = 'id,title,video_description,create_time,cover_image_url,share_url,embed_link,like_count,comment_count,share_count,view_count';
    const accessToken = token.accessToken;

    // Use a Map to deduplicate by video ID
    const uniqueVideos = new Map();
    let cursor = 0;
    let hasMore = true;
    let pageCount = 0;

    while (hasMore && pageCount < 20) {
      pageCount++;
      console.log(`Fetching page ${pageCount}...`);

      const apiUrl = `https://open.tiktokapis.com/v2/video/list/?fields=${encodeURIComponent(fields)}&cursor=${cursor}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ max_count: 20 }),
      });

      if (!response.ok) break;

      const result = await response.json();
      if (result.error?.code !== 'ok') break;

      const videos = result.data?.videos || [];

      // Deduplicate by video ID
      for (const video of videos) {
        if (video.id && !uniqueVideos.has(video.id)) {
          uniqueVideos.set(video.id, video);
        }
      }

      console.log(`  Page ${pageCount}: ${videos.length} videos (unique total: ${uniqueVideos.size})`);

      hasMore = result.data?.has_more || false;
      cursor = result.data?.cursor || 0;

      // Stop if we got all unique videos (no new ones added)
      if (videos.length === 0 || uniqueVideos.size < pageCount * 20) {
        console.log('  No new unique videos, stopping pagination');
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n=== FOUND ${uniqueVideos.size} UNIQUE VIDEOS ===\n`);

    // Get existing posts
    const existingPosts = await db.collection('marketing_posts').find({
      platform: 'tiktok'
    }).toArray();

    const existingVideoIds = new Set(
      existingPosts
        .filter(p => p.tiktokVideoId)
        .map(p => p.tiktokVideoId)
    );

    // Categorize
    const matchedVideos = [];
    const missingVideos = [];

    for (const [id, video] of uniqueVideos) {
      if (existingVideoIds.has(id.toString())) {
        matchedVideos.push(video);
      } else {
        missingVideos.push(video);
      }
    }

    console.log(`Database has: ${existingPosts.length} TikTok posts`);
    console.log(`API returned: ${uniqueVideos.size} unique videos`);
    console.log(`Matched: ${matchedVideos.length}`);
    console.log(`Missing (to import): ${missingVideos.length}\n`);

    // Update existing posts with metrics
    if (matchedVideos.length > 0) {
      console.log('=== UPDATING EXISTING POSTS METRICS ===');
      let updateCount = 0;
      let totalViews = 0;
      let totalLikes = 0;

      for (const video of matchedVideos) {
        const post = existingPosts.find(p => p.tiktokVideoId === video.id.toString());
        if (post) {
          const views = video.view_count || 0;
          const likes = video.like_count || 0;
          const comments = video.comment_count || 0;
          const shares = video.share_count || 0;

          totalViews += views;
          totalLikes += likes;

          await db.collection('marketing_posts').updateOne(
            { _id: post._id },
            {
              $set: {
                title: (video.title || video.video_description || post.title).substring(0, 100),
                caption: video.video_description || video.title || post.caption,
                tiktokShareUrl: video.share_url || post.tiktokShareUrl,
                performanceMetrics: {
                  views,
                  likes,
                  comments,
                  shares,
                  engagementRate: views > 0
                    ? (((likes + comments + shares) / views) * 100).toFixed(2)
                    : 0
                },
                metricsLastFetchedAt: new Date(),
                updatedAt: new Date(),
              }
            }
          );
          updateCount++;
        }
      }

      console.log(`Updated ${updateCount} posts`);
      console.log(`Total views: ${totalViews.toLocaleString()}`);
      console.log(`Total likes: ${totalLikes.toLocaleString()}\n`);
    }

    // Import missing videos
    if (missingVideos.length > 0) {
      console.log(`=== IMPORTING ${missingVideos.length} NEW POSTS ===\n`);

      const newPosts = missingVideos.map((video) => {
        const postedAt = video.create_time ? new Date(parseInt(video.create_time) * 1000) : new Date();
        const views = video.view_count || 0;
        const likes = video.like_count || 0;
        const comments = video.comment_count || 0;
        const shares = video.share_count || 0;

        return {
          title: (video.title || video.video_description || 'TikTok Post').substring(0, 100),
          description: `Imported from TikTok`,
          platform: 'tiktok',
          status: 'posted',
          contentType: 'video',
          caption: video.video_description || video.title || '',
          hashtags: [],
          scheduledAt: postedAt,
          postedAt: postedAt,
          storyId: new ObjectId(),
          storyName: 'Imported from TikTok',
          storyCategory: 'imported',
          storySpiciness: 1,
          generatedAt: postedAt,
          approvedBy: 'System',
          tiktokVideoId: video.id.toString(),
          tiktokShareUrl: video.share_url,
          performanceMetrics: {
            views,
            likes,
            comments,
            shares,
            engagementRate: views > 0
              ? (((likes + comments + shares) / views) * 100).toFixed(2)
              : 0
          },
          metricsLastFetchedAt: new Date(),
          createdAt: postedAt,
          updatedAt: new Date(),
        };
      });

      // Import in batches to avoid document size limits
      const batchSize = 100;
      for (let i = 0; i < newPosts.length; i += batchSize) {
        const batch = newPosts.slice(i, i + batchSize);
        await db.collection('marketing_posts').insertMany(batch);
        console.log(`  Imported batch ${Math.floor(i / batchSize) + 1}: ${batch.length} posts`);
      }

      console.log(`\n✓ Total imported: ${newPosts.length} new posts\n`);

      // Show some imported posts
      console.log('Sample of imported posts:');
      missingVideos.slice(0, 10).forEach((v, i) => {
        const postedAt = new Date(parseInt(v.create_time) * 1000).toLocaleDateString();
        console.log(`  ${i + 1}. ${postedAt} | ${v.view_count} views | ${v.share_url}`);
      });
      if (missingVideos.length > 10) {
        console.log(`  ... and ${missingVideos.length - 10} more`);
      }
    }

    // Final summary
    const finalCount = await db.collection('marketing_posts').countDocuments({
      platform: 'tiktok'
    });

    console.log('\n=== FINAL SUMMARY ===');
    console.log(`Videos fetched from TikTok: ${uniqueVideos.size}`);
    console.log(`Posts updated with metrics: ${matchedVideos.length}`);
    console.log(`New posts imported: ${missingVideos.length}`);
    console.log(`Total TikTok posts in database: ${finalCount}`);

  } finally {
    await client.close();
  }
}

tikTokSyncFinal().catch(console.error);
