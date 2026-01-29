import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config();

/**
 * Alternative approach: Parse TikTok's public web API
 * TikTok's web uses internal APIs that can be accessed with proper headers
 */

async function scrapeTikTokProfile() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();

    console.log('=== SCRAPING TIKTOK PROFILE (@blush.app) ===\n');

    // TikTok's internal web API for user videos
    const username = 'blush.app';
    const apiUrl = `https://www.tiktok.com/api/@${username}/posts/?count=100`;

    console.log('Fetching from:', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': `https://www.tiktok.com/@${username}`,
      },
    });

    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response preview:', responseText.substring(0, 500));

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.log('Could not parse as JSON, trying alternative...');

      // Try with language headers
      const response2 = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': `https://www.tiktok.com/@${username}`,
        },
      });

      const text2 = await response2.text();
      console.log('\nSecond attempt status:', response2.status);
      console.log('Second attempt preview:', text2.substring(0, 500));

      try {
        data = JSON.parse(text2);
      } catch (e2) {
        console.log('Still could not parse. Trying fetch with cookies...');

        // Another attempt - might need to fetch the profile page first to get cookies
        const profilePage = await fetch(`https://www.tiktok.com/@${username}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        console.log('Profile page status:', profilePage.status);
        const profileHtml = await profilePage.text();

        // Try to find video data in the HTML
        const videoDataMatch = profileHtml.match(/"videoList":\s*\[([\s\S]*?)\]/);
        if (videoDataMatch) {
          console.log('\nFound video data in HTML!');
          console.log('Video data preview:', videoDataMatch[1].substring(0, 500));

          try {
            const videoJson = JSON.parse(`[${videoDataMatch[1]}]`);
            console.log(`\nParsed ${videoJson.length} videos from HTML`);
            data = { data: { videos: videoJson } };
          } catch (e3) {
            console.log('Could not parse video JSON from HTML');
          }
        }

        if (!data) {
          console.log('\nCould not extract video data from any source.');
          console.log('This approach may not work reliably due to TikTok anti-scraping measures.');
          return;
        }
      }
    }

    if (data && data.data && data.data.videos) {
      const videos = data.data.videos;
      console.log(`\n=== FOUND ${videos.length} VIDEOS ===\n`);

      // Get existing posts
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

      // Process videos
      const foundVideos = [];
      const missingVideos = [];

      for (const video of videos) {
        // TikTok web API uses different field names
        const videoId = video.id || video.video_id;
        const shareUrl = video.share_url || `https://www.tiktok.com/@${username}/video/${videoId}`;

        foundVideos.push({
          videoId,
          shareUrl,
          title: video.desc || video.title || '',
          createTime: video.create_time || video.createTime,
        });

        if (!existingVideoIds.has(videoId)) {
          missingVideos.push({
            videoId,
            shareUrl,
            title: video.desc || video.title || '',
            createTime: video.create_time || video.createTime,
          });
        }
      }

      console.log(`Videos found on TikTok: ${foundVideos.length}`);
      console.log(`Videos NOT in database: ${missingVideos.length}\n`);

      if (missingVideos.length > 0) {
        console.log('=== IMPORTING MISSING VIDEOS ===\n');

        const newPosts = missingVideos.map((video) => {
          const postedAt = new Date(parseInt(video.createTime) * 1000);

          return {
            title: video.title.substring(0, 100) || 'TikTok Post',
            description: `Imported from TikTok - ${video.title.substring(0, 200) || ''}`,
            platform: 'tiktok',
            status: 'posted',
            contentType: 'video',
            caption: video.title || '',
            hashtags: [],
            scheduledAt: postedAt,
            postedAt: postedAt,
            storyId: new ObjectId(),
            storyName: 'Imported from TikTok',
            storyCategory: 'imported',
            storySpiciness: 1,
            generatedAt: postedAt,
            approvedBy: 'System',
            tiktokVideoId: video.videoId,
            tiktokShareUrl: video.shareUrl,
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

        console.log('Imported posts:');
        missingVideos.forEach((v, i) => {
          const postedAt = new Date(parseInt(v.createTime) * 1000);
          console.log(`  ${i + 1}. ${v.shareUrl}`);
          console.log(`     Posted: ${postedAt.toLocaleDateString()}`);
          console.log(`     Title: ${v.title.substring(0, 50)}...`);
          console.log();
        });
      }

      // Summary
      console.log('=== SYNC COMPLETE ===');
      console.log(`Total videos found on TikTok: ${foundVideos.length}`);
      console.log(`Posts already in database: ${existingPosts.length}`);
      console.log(`Matched: ${foundVideos.length - missingVideos.length}`);
      console.log(`Imported: ${missingVideos.length}`);
      console.log(`New total in database: ${existingPosts.length + missingVideos.length}`);
    }

  } finally {
    await client.close();
  }
}

scrapeTikTokProfile().catch(console.error);
