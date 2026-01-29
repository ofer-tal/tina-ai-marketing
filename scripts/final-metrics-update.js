import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

/**
 * Final metrics update - properly update the 20 recent videos with metrics
 */

async function finalMetricsUpdate() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();

    const token = await db.collection('marketing_auth_tokens').findOne({
      platform: 'tiktok'
    });

    // Fetch from API
    const fields = 'id,title,video_description,create_time,share_url,like_count,comment_count,share_count,view_count';
    const apiUrl = `https://open.tiktokapis.com/v2/video/list/?fields=${encodeURIComponent(fields)}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ max_count: 20 }),
    });

    const result = await response.json();
    const apiVideos = result.data?.videos || [];

    console.log(`=== UPDATING METRICS FOR ${apiVideos.length} VIDEOS ===\n`);

    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;

    for (const video of apiVideos) {
      const post = await db.collection('marketing_posts').findOne({
        platform: 'tiktok',
        tiktokVideoId: video.id
      });

      if (post) {
        const views = video.view_count || 0;
        const likes = video.like_count || 0;
        const comments = video.comment_count || 0;
        const shares = video.share_count || 0;

        totalViews += views;
        totalLikes += likes;
        totalComments += comments;
        totalShares += shares;

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
                  ? ((((likes + comments + shares) / views) * 100).toFixed(2) + '%')
                  : '0%'
              },
              metricsLastFetchedAt: new Date(),
              updatedAt: new Date(),
            }
          }
        );

        const postedAt = new Date(parseInt(video.create_time) * 1000).toLocaleDateString();
        console.log(`✓ ${postedAt} | ${views} views | ${likes} likes | ${video.share_url}`);
      }
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Updated videos: ${apiVideos.length}`);
    console.log(`Total views: ${totalViews.toLocaleString()}`);
    console.log(`Total likes: ${totalLikes}`);
    console.log(`Total comments: ${totalComments}`);
    console.log(`Total shares: ${totalShares}`);
    console.log(`Avg engagement rate: ${totalViews > 0 ? ((totalLikes + totalComments + totalShares) / totalViews * 100).toFixed(2) : 0}%`);

  } finally {
    await client.close();
  }
}

finalMetricsUpdate().catch(console.error);
