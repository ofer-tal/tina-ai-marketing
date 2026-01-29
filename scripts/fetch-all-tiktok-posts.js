import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config();

/**
 * Fetch ALL TikTok videos with pagination
 * TikTok API v2 returns max 20 videos per page
 */

async function fetchAllTikTokPostsWithPagination() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();

    // Get auth token
    const token = await db.collection('marketing_auth_tokens').findOne({
      platform: 'tiktok'
    });

    if (!token) {
      console.log('ERROR: No TikTok auth token found');
      return;
    }

    console.log('=== FETCHING ALL TIKTOK VIDEOS (WITH PAGINATION) ===\n');

    const fields = 'id,title,video_description,create_time,cover_image_url,share_url,embed_link,like_count,comment_count,share_count,view_count';
    const accessToken = token.accessToken;

    let allVideos = [];
    let cursor = 0;
    let hasMore = true;
    let pageCount = 0;

    // Paginate through all videos
    while (hasMore) {
      pageCount++;
      console.log(`Fetching page ${pageCount}...`);

      const apiUrl = `https://open.tiktokapis.com/v2/video/list/?fields=${encodeURIComponent(fields)}&cursor=${cursor}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          max_count: 20
        }),
      });

      if (!response.ok) {
        console.log(`Error on page ${pageCount}: HTTP ${response.status}`);
        break;
      }

      const result = await response.json();

      if (result.error?.code !== 'ok') {
        console.log(`Error on page ${pageCount}:`, result.error);
        break;
      }

      const videos = result.data?.videos || [];
      allVideos = allVideos.concat(videos);
      console.log(`  Found ${videos.length} videos (total: ${allVideos.length})`);

      hasMore = result.data?.has_more || false;
      cursor = result.data?.cursor || 0;

      // Safety limit
      if (pageCount > 10) {
        console.log('Reached safety limit of 10 pages');
        break;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n=== FOUND ${allVideos.length} TOTAL VIDEOS ===\n`);

    if (allVideos.length === 0) {
      console.log('No videos found');
      return;
    }

    // Get existing posts
    const existingPosts = await db.collection('marketing_posts').find({
      platform: 'tiktok'
    }).toArray();

    const existingVideoIds = new Set(
      existingPosts
        .filter(p => p.tiktokVideoId)
        .map(p => p.tiktokVideoId)
    );

    // Categorize videos
    const matchedVideos = [];
    const missingVideos = [];

    for (const video of allVideos) {
      const videoId = video.id;
      if (!videoId) continue;

      if (existingVideoIds.has(videoId.toString())) {
        matchedVideos.push({ ...video, videoId });
      } else {
        missingVideos.push({ ...video, videoId });
      }
    }

    console.log(`Database state:`);
    console.log(`  Existing posts: ${existingPosts.length}`);
    console.log(`  Matched: ${matchedVideos.length}`);
    console.log(`  Missing (to import): ${missingVideos.length}\n`);

    // Update metrics for existing posts
    if (matchedVideos.length > 0) {
      console.log('=== UPDATING METRICS FOR EXISTING POSTS ===');
      let updateCount = 0;
      let totalViews = 0;
      let totalLikes = 0;

      for (const video of matchedVideos) {
        const post = existingPosts.find(p => p.tiktokVideoId === video.videoId.toString());
        if (post) {
          const views = video.view_count || 0;
          const likes = video.like_count || 0;
          totalViews += views;
          totalLikes += likes;

          const updateData = {
            title: (video.title || video.video_description || post.title).substring(0, 100),
            caption: video.video_description || video.title || post.caption,
            tiktokShareUrl: video.share_url || post.tiktokShareUrl,
            performanceMetrics: {
              views: views,
              likes: likes,
              comments: video.comment_count || 0,
              shares: video.share_count || 0,
              engagementRate: views > 0
                ? ((likes + (video.comment_count || 0) + (video.share_count || 0)) / views * 100).toFixed(2)
                : 0
            },
            metricsLastFetchedAt: new Date(),
            updatedAt: new Date(),
          };

          await db.collection('marketing_posts').updateOne(
            { _id: post._id },
            { $set: updateData }
          );

          console.log(`✓ ${video.videoId}: ${views} views, ${likes} likes`);
          updateCount++;
        }
      }

      console.log(`\nUpdated ${updateCount} posts`);
      console.log(`Total views across all posts: ${totalViews.toLocaleString()}`);
      console.log(`Total likes across all posts: ${totalLikes.toLocaleString()}\n`);
    }

    // Import missing videos
    if (missingVideos.length > 0) {
      console.log('=== IMPORTING MISSING VIDEOS ===\n');

      const newPosts = missingVideos.map((video) => {
        const videoId = video.videoId.toString();
        const shareUrl = video.share_url || `https://www.tiktok.com/@blush.app/video/${videoId}`;
        const createTime = video.create_time;
        const postedAt = createTime ? new Date(parseInt(createTime) * 1000) : new Date();

        return {
          title: (video.title || video.video_description || 'TikTok Post').substring(0, 100),
          description: `Imported from TikTok - ${(video.title || video.video_description || '').substring(0, 200)}`,
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
          tiktokVideoId: videoId,
          tiktokShareUrl: shareUrl,
          performanceMetrics: {
            views: video.view_count || 0,
            likes: video.like_count || 0,
            comments: video.comment_count || 0,
            shares: video.share_count || 0,
            engagementRate: video.view_count > 0
              ? ((video.like_count + video.comment_count + video.share_count) / video.view_count * 100).toFixed(2)
              : 0
          },
          metricsLastFetchedAt: new Date(),
          createdAt: postedAt,
          updatedAt: new Date(),
        };
      });

      await db.collection('marketing_posts').insertMany(newPosts);
      console.log(`✓ Imported ${newPosts.length} new posts\n`);

      missingVideos.forEach((v, i) => {
        const postedAt = v.create_time ? new Date(parseInt(v.create_time) * 1000) : new Date();
        console.log(`  ${i + 1}. ${v.share_url}`);
        console.log(`     Posted: ${postedAt.toLocaleDateString()} | ${v.view_count} views, ${v.like_count} likes`);
      });
    }

    // Final summary
    const finalCount = await db.collection('marketing_posts').countDocuments({
      platform: 'tiktok'
    });

    console.log('\n=== SYNC COMPLETE ===');
    console.log(`Videos fetched from TikTok API: ${allVideos.length}`);
    console.log(`Posts updated with metrics: ${matchedVideos.length}`);
    console.log(`New posts imported: ${missingVideos.length}`);
    console.log(`Total TikTok posts in database: ${finalCount}`);

    // List all posts with metrics
    console.log('\n=== ALL TIKTOK POSTS WITH METRICS ===');
    const allPosts = await db.collection('marketing_posts').find({
      platform: 'tiktok',
      tiktokVideoId: { $exists: true, $ne: null }
    }).sort({ postedAt: -1 }).toArray();

    allPosts.forEach((p, i) => {
      const postedAt = new Date(p.postedAt).toLocaleDateString();
      const metrics = p.performanceMetrics || {};
      console.log(`${i + 1}. ${postedAt} | ${metrics.views || 0} views | ${metrics.likes || 0} likes`);
      console.log(`   ${p.tiktokShareUrl}`);
      console.log();
    });

  } finally {
    await client.close();
  }
}

fetchAllTikTokPostsWithPagination().catch(console.error);
