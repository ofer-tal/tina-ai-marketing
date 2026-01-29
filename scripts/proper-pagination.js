import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config();

/**
 * Proper TikTok pagination - cursor in request body
 */

async function properPagination() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();

    const token = await db.collection('marketing_auth_tokens').findOne({
      platform: 'tiktok'
    });

    const fields = 'id,title,video_description,create_time,share_url,like_count,comment_count,share_count,view_count';

    // Use a Map to deduplicate
    const uniqueVideos = new Map();
    let cursor = 0;
    let hasMore = true;
    let pageCount = 0;

    console.log('=== PROPER TIKTOK PAGINATION ===\n');

    while (hasMore && pageCount < 5) {
      pageCount++;
      console.log(`Fetching page ${pageCount}... (cursor: ${cursor})`);

      const apiUrl = `https://open.tiktokapis.com/v2/video/list/?fields=${encodeURIComponent(fields)}`;

      // IMPORTANT: cursor goes in the BODY, not query param
      const body = { max_count: 20 };
      if (cursor > 0) {
        body.cursor = cursor;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.error?.code !== 'ok') {
        console.log('  Error:', result.error);
        break;
      }

      const videos = result.data?.videos || [];
      hasMore = result.data?.has_more || false;
      cursor = result.data?.cursor || 0;

      // Deduplicate
      for (const video of videos) {
        if (!uniqueVideos.has(video.id)) {
          uniqueVideos.set(video.id, video);
        }
      }

      console.log(`  Returned: ${videos.length} videos (unique total: ${uniqueVideos.size})`);
      console.log(`  has_more: ${hasMore}, next_cursor: ${cursor}`);

      if (videos.length === 0) break;
      if (!hasMore) break;

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`\n=== FOUND ${uniqueVideos.size} UNIQUE VIDEOS ===\n`);

    // Get existing posts
    const existingPosts = await db.collection('marketing_posts').find({
      platform: 'tiktok'
    }).toArray();

    const existingVideoIds = new Set(
      existingPosts.filter(p => p.tiktokVideoId).map(p => p.tiktokVideoId)
    );

    const matchedVideos = [];
    const missingVideos = [];

    for (const [id, video] of uniqueVideos) {
      if (existingVideoIds.has(id.toString())) {
        matchedVideos.push(video);
      } else {
        missingVideos.push(video);
      }
    }

    console.log(`Database: ${existingPosts.length} posts`);
    console.log(`API: ${uniqueVideos.size} unique videos`);
    console.log(`Matched: ${matchedVideos.length}`);
    console.log(`Missing (to import): ${missingVideos.length}\n`);

    if (missingVideos.length > 0) {
      console.log('=== IMPORTING MISSING VIDEOS ===');
      const newPosts = missingVideos.map((video) => {
        const postedAt = new Date(parseInt(video.create_time) * 1000);
        return {
          title: (video.title || video.video_description || 'TikTok').substring(0, 100),
          description: 'Imported from TikTok',
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
            views: video.view_count || 0,
            likes: video.like_count || 0,
            comments: video.comment_count || 0,
            shares: video.share_count || 0,
            engagementRate: '0'
          },
          metricsLastFetchedAt: new Date(),
          createdAt: postedAt,
          updatedAt: new Date(),
        };
      });

      await db.collection('marketing_posts').insertMany(newPosts);
      console.log(`✓ Imported ${newPosts.length} new posts\n`);

      missingVideos.forEach((v, i) => {
        const postedAt = new Date(parseInt(v.create_time) * 1000).toLocaleDateString();
        console.log(`  ${i + 1}. ${postedAt} | ${v.view_count} views | ${v.share_url}`);
      });
    }

    // Update metrics for all matched posts
    if (matchedVideos.length > 0) {
      console.log('=== UPDATING METRICS ===');
      let totalViews = 0;
      let totalLikes = 0;

      for (const video of matchedVideos) {
        const post = existingPosts.find(p => p.tiktokVideoId === video.id.toString());
        if (post) {
          const views = video.view_count || 0;
          const likes = video.like_count || 0;
          const comments = video.comment_count || 0;
          const shares = video.share_count || 0;
          let engagementRate = '0';
          if (views > 0) {
            engagementRate = (((likes + comments + shares) / views) * 100).toFixed(2);
          }

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
                  engagementRate
                },
                metricsLastFetchedAt: new Date(),
                updatedAt: new Date(),
              }
            }
          );
        }
      }

      console.log(`Updated ${matchedVideos.length} posts`);
      console.log(`Total views: ${totalViews.toLocaleString()}`);
      console.log(`Total likes: ${totalLikes}`);
    }

    const finalCount = await db.collection('marketing_posts').countDocuments({
      platform: 'tiktok'
    });

    console.log('\n=== FINAL ===');
    console.log(`Total TikTok posts in database: ${finalCount}`);

  } finally {
    await client.close();
  }
}

properPagination().catch(console.error);
