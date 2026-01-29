import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config();

/**
 * FIXED: Properly fetch TikTok user videos using the correct API format
 * Based on TikTok API v2 documentation
 */

async function fetchTikTokPostsFixed() {
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

    console.log('=== FETCHING TIKTOK VIDEOS (FIXED) ===\n');
    console.log('Open ID:', token.metadata?.open_id);
    console.log('Token:', token.accessToken.substring(0, 30) + '...\n');

    // Correct API format per TikTok documentation:
    // - POST /v2/video/list/
    // - Query param: fields (comma-separated)
    // - Body: JSON with max_count
    // - Header: Authorization Bearer token

    // Use only valid fields per documentation
    const fields = 'id,title,video_description,create_time,cover_image_url,share_url,embed_link,like_count,comment_count,share_count,view_count';
    const apiUrl = `https://open.tiktokapis.com/v2/video/list/?fields=${encodeURIComponent(fields)}`;

    console.log('API URL:', apiUrl);
    console.log('Method: POST\n');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        max_count: 20  // Max allowed is 20
      }),
    });

    const responseText = await response.text();
    console.log('Response status:', response.status);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.log('ERROR: Could not parse JSON');
      console.log('Response:', responseText.substring(0, 500));
      return;
    }

    console.log('Response:', JSON.stringify(result, null, 2));

    if (result.error?.code !== 'ok') {
      console.log('\nERROR: API returned error');
      console.log('Error:', result.error);
      return;
    }

    const videos = result.data?.videos || result.data?.video_list || [];
    console.log(`\n=== FOUND ${videos.length} VIDEOS ===\n`);

    if (videos.length === 0) {
      console.log('No videos returned. Check API scopes.');
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

    for (const video of videos) {
      const videoId = video.id || video.video_id;
      if (!videoId) continue;

      if (existingVideoIds.has(videoId.toString())) {
        matchedVideos.push({ ...video, videoId });
      } else {
        missingVideos.push({ ...video, videoId });
      }
    }

    console.log(`Existing posts in database: ${existingPosts.length}`);
    console.log(`Videos matched: ${matchedVideos.length}`);
    console.log(`Videos NOT in database: ${missingVideos.length}\n`);

    // Update metrics for existing posts
    if (matchedVideos.length > 0) {
      console.log('=== UPDATING METRICS FOR EXISTING POSTS ===');
      let updateCount = 0;

      for (const video of matchedVideos) {
        const post = existingPosts.find(p => p.tiktokVideoId === video.videoId.toString());
        if (post) {
          const updateData = {
            title: video.title || video.video_description || post.title,
            caption: video.video_description || video.title || post.caption,
            tiktokShareUrl: video.share_url || post.tiktokShareUrl,
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
            updatedAt: new Date(),
          };

          await db.collection('marketing_posts').updateOne(
            { _id: post._id },
            { $set: updateData }
          );

          console.log(`✓ ${video.videoId}: ${video.view_count || 0} views, ${video.like_count || 0} likes`);
          updateCount++;
        }
      }

      console.log(`\nUpdated ${updateCount} posts with fresh metrics\n`);
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
        console.log(`  ${i + 1}. ${v.share_url || `https://www.tiktok.com/@blush.app/video/${v.videoId}`}`);
        console.log(`     Posted: ${postedAt.toLocaleDateString()}`);
        console.log(`     Stats: ${v.view_count || 0} views, ${v.like_count || 0} likes`);
      });
    }

    // Final summary
    const finalCount = await db.collection('marketing_posts').countDocuments({
      platform: 'tiktok'
    });

    console.log('\n=== SYNC COMPLETE ===');
    console.log(`Videos found on TikTok: ${videos.length}`);
    console.log(`Posts updated with metrics: ${matchedVideos.length}`);
    console.log(`New posts imported: ${missingVideos.length}`);
    console.log(`Total TikTok posts in database: ${finalCount}`);

  } finally {
    await client.close();
  }
}

fetchTikTokPostsFixed().catch(console.error);
