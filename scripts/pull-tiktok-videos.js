import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config();

async function pullTikTokVideosAndSync() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();

    // Get the TikTok auth token
    const token = await db.collection('marketing_auth_tokens').findOne({
      platform: 'tiktok'
    });

    if (!token) {
      console.log('ERROR: No TikTok auth token found. Please re-authenticate.');
      return;
    }

    console.log('=== FETCHING TIKTOK VIDEOS ===\n');
    console.log('Using Open ID:', token.metadata?.open_id);

    // Get user info first
    const userInfoUrl = `https://open.tiktokapis.com/v2/user/info/?fields=${encodeURIComponent('open_id,union_id,avatar_url,display_name')}`;
    const userResponse = await fetch(userInfoUrl, {
      headers: { 'Authorization': `Bearer ${token.accessToken}` },
    });
    const userResult = await userResponse.json();

    if (userResult.data?.user) {
      console.log('Authenticated as:', userResult.data.user.display_name);
    }

    // Get videos using the video/list API
    // Note: We need to use GET with fields parameter, not POST
    console.log('\nFetching video list...');
    const fields = 'id,video_id,title,share_url,create_time,cover_image_url,embed_html,embed_link,like_count,comment_count,share_count,view_count';
    const videosUrl = `https://open.tiktokapis.com/v2/video/list/?fields=${encodeURIComponent(fields)}`;
    const videosResponse = await fetch(videosUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token.accessToken}`,
      },
    });

    // Get response text first for debugging
    const responseText = await videosResponse.text();
    console.log('Response status:', videosResponse.status);
    console.log('Response preview:', responseText.substring(0, 500));

    let videosResult;
    try {
      videosResult = JSON.parse(responseText);
    } catch (e) {
      console.log('ERROR: Could not parse response as JSON');
      console.log('Full response:', responseText);
      return;
    }

    if (videosResult.error?.code !== 'ok') {
      console.log('ERROR:', videosResult.error);
      return;
    }

    const tiktokVideos = videosResult.data?.videos || [];
    console.log(`\nFound ${tiktokVideos.length} videos on TikTok\n`);

    // Get existing posts from marketing_posts
    const existingPosts = await db.collection('marketing_posts').find({
      platform: 'tiktok'
    }).toArray();

    const existingVideoIds = new Set(
      existingPosts
        .filter(p => p.tiktokVideoId)
        .map(p => p.tiktokVideoId)
    );

    console.log(`Existing posts in database: ${existingPosts.length}`);
    console.log(`Existing TikTok video IDs: ${existingVideoIds.size}\n`);

    // Videos found on TikTok but not in database
    const missingVideos = tiktokVideos.filter(v => !existingVideoIds.has(v.video_id));
    console.log(`Videos on TikTok NOT in database: ${missingVideos.length}\n`);

    // Videos in database that should be on TikTok (for verification)
    const matchedVideos = tiktokVideos.filter(v => existingVideoIds.has(v.video_id));
    console.log(`Videos matched between TikTok and database: ${matchedVideos.length}\n`);

    // Update existing posts with latest metrics
    console.log('=== UPDATING METRICS FOR EXISTING POSTS ===');
    let updatedCount = 0;

    for (const video of matchedVideos) {
      const post = existingPosts.find(p => p.tiktokVideoId === video.video_id);
      if (post) {
        // TikTok API doesn't return metrics in video/list, we'd need to call video/query
        // For now, just verify the post exists
        console.log(`✓ ${video.video_id} - ${video.share_url}`);
        updatedCount++;
      }
    }

    console.log(`\nVerified ${updatedCount} existing posts\n`);

    // Import missing videos
    if (missingVideos.length > 0) {
      console.log('=== IMPORTING MISSING VIDEOS ===\n');

      const newPosts = missingVideos.map((video, index) => {
        const postedAt = new Date(parseInt(video.create_time) * 1000);
        const videoId = video.video_id;

        return {
          title: video.title || 'TikTok Post',
          description: `Imported from TikTok - ${video.title || ''}`,
          platform: 'tiktok',
          status: 'posted',
          contentType: 'video',
          caption: video.title || '',
          hashtags: [], // TikTok API doesn't return hashtags in list
          scheduledAt: postedAt,
          postedAt: postedAt,
          storyId: new ObjectId(), // Placeholder - no story association
          storyName: 'Imported from TikTok',
          storyCategory: 'imported',
          storySpiciness: 1,
          generatedAt: postedAt,
          approvedBy: 'System',
          // TikTok-specific data
          tiktokVideoId: videoId,
          tiktokShareUrl: video.share_url,
          // Performance metrics (would need separate API call)
          performanceMetrics: {
            views: 0,
            likes: 0,
            comments: 0,
            shares: 0,
            engagementRate: 0
          },
          metricsLastFetchedAt: new Date(),
          createdAt: postedAt,
          updatedAt: new Date(),
        };
      });

      await db.collection('marketing_posts').insertMany(newPosts);
      console.log(`✓ Imported ${newPosts.length} new posts\n`);

      // List imported posts
      console.log('Imported posts:');
      missingVideos.forEach((v, i) => {
        console.log(`  ${i + 1}. ${v.share_url}`);
        console.log(`     Posted: ${new Date(parseInt(v.create_time) * 1000).toLocaleDateString()}`);
      });
    }

    // Summary
    console.log('\n=== SYNC COMPLETE ===');
    console.log(`Total videos on TikTok: ${tiktokVideos.length}`);
    console.log(`Posts in database: ${existingPosts.length}`);
    console.log(`Matched: ${matchedVideos.length}`);
    console.log(`Imported: ${missingVideos.length}`);
    console.log(`New total in database: ${existingPosts.length + missingVideos.length}`);

  } finally {
    await client.close();
  }
}

pullTikTokVideosAndSync().catch(console.error);
