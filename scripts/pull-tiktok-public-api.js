import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config();

/**
 * Use a public TikTok API to get user videos
 * This uses tikwm.com which provides TikTok data without authentication
 */

async function pullTikTokVideosPublicAPI() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();

    console.log('=== PULLING TIKTOK VIDEOS USING PUBLIC API ===\n');

    const username = 'blush.app';

    // Try multiple public APIs
    const apis = [
      {
        name: 'TikWM API',
        url: `https://www.tikwm.com/api/user/posts/${username}?count=50`,
        parseFunc: (data) => {
          if (data.data && data.data.videos) {
            return data.data.videos.map(v => ({
              video_id: v.video_id || v.id,
              title: v.title || v.desc || v.description || '',
              share_url: v.play || v.share_url || `https://www.tiktok.com/@${username}/video/${v.video_id || v.id}`,
              create_time: v.create_time || v.createdAt,
              stats: {
                views: v.play_count || v.views || 0,
                likes: v.digg_count || v.likes || 0,
                comments: v.comment_count || v.comments || 0,
                shares: v.share_count || v.shares || 0,
              }
            }));
          }
          return [];
        }
      },
    ];

    let foundVideos = [];

    for (const api of apis) {
      console.log(`Trying ${api.name}...`);
      console.log(`URL: ${api.url}`);

      try {
        const response = await fetch(api.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        const text = await response.text();
        console.log('Status:', response.status);
        console.log('Response preview:', text.substring(0, 300));

        if (response.ok) {
          try {
            const data = JSON.parse(text);
            console.log('Parsed JSON successfully');

            foundVideos = api.parseFunc(data);
            if (foundVideos.length > 0) {
              console.log(`✓ Found ${foundVideos.length} videos!`);
              break;
            }
          } catch (e) {
            console.log('Could not parse JSON:', e.message);
          }
        }
      } catch (error) {
        console.log('Error:', error.message);
      }

      console.log();
    }

    if (foundVideos.length > 0) {
      console.log(`\n=== FOUND ${foundVideos.length} VIDEOS ===\n`);

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

      // Find missing and matched videos
      const missingVideos = foundVideos.filter(v => !existingVideoIds.has(v.video_id.toString()));
      const matchedVideos = foundVideos.filter(v => existingVideoIds.has(v.video_id.toString()));

      console.log(`Videos found on TikTok: ${foundVideos.length}`);
      console.log(`Videos NOT in database: ${missingVideos.length}`);
      console.log(`Videos already in database: ${matchedVideos.length}\n`);

      // Update metrics for existing posts
      if (matchedVideos.length > 0) {
        console.log('=== UPDATING METRICS FOR EXISTING POSTS ===');
        let updateCount = 0;

        for (const video of matchedVideos) {
          const post = existingPosts.find(p => p.tiktokVideoId === video.video_id.toString());
          if (post && video.stats) {
            const updateData = {
              performanceMetrics: {
                views: video.stats.views,
                likes: video.stats.likes,
                comments: video.stats.comments,
                shares: video.stats.shares,
                engagementRate: video.stats.views > 0
                  ? ((video.stats.likes + video.stats.comments + video.stats.shares) / video.stats.views * 100).toFixed(2)
                  : 0
              },
              metricsLastFetchedAt: new Date(),
              updatedAt: new Date(),
            };

            await db.collection('marketing_posts').updateOne(
              { _id: post._id },
              { $set: updateData }
            );

            console.log(`  ✓ Updated ${video.video_id}: ${video.stats.views} views, ${video.stats.likes} likes`);
            updateCount++;
          }
        }

        console.log(`\nUpdated ${updateCount} posts with latest metrics\n`);
      }

      // Import missing videos
      if (missingVideos.length > 0) {
        console.log('=== IMPORTING MISSING VIDEOS ===\n');

        const newPosts = missingVideos.map((video) => {
          const videoId = video.video_id.toString();
          const shareUrl = video.share_url || `https://www.tiktok.com/@${username}/video/${videoId}`;
          const title = video.title || '';
          const createTime = video.create_time;
          const postedAt = createTime ? new Date(parseInt(createTime) * 1000) : new Date();

          return {
            title: title.substring(0, 100) || 'TikTok Post',
            description: `Imported from TikTok${title ? ' - ' + title.substring(0, 200) : ''}`,
            platform: 'tiktok',
            status: 'posted',
            contentType: 'video',
            caption: title,
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
            performanceMetrics: video.stats ? {
              views: video.stats.views,
              likes: video.stats.likes,
              comments: video.stats.comments,
              shares: video.stats.shares,
              engagementRate: video.stats.views > 0
                ? ((video.stats.likes + video.stats.comments + video.stats.shares) / video.stats.views * 100).toFixed(2)
                : 0
            } : {
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
          const postedAt = v.create_time ? new Date(parseInt(v.create_time) * 1000) : new Date();
          console.log(`  ${i + 1}. ${v.share_url}`);
          console.log(`     Posted: ${postedAt.toLocaleDateString()}`);
          console.log(`     Title: ${v.title?.substring(0, 50) || 'N/A'}...`);
          if (v.stats) {
            console.log(`     Stats: ${v.stats.views} views, ${v.stats.likes} likes`);
          }
          console.log();
        });
      }

      // Summary
      console.log('=== SYNC COMPLETE ===');
      console.log(`Total videos found on TikTok: ${foundVideos.length}`);
      console.log(`Posts already in database: ${existingPosts.length}`);
      console.log(`Matched & updated: ${matchedVideos.length}`);
      console.log(`Imported: ${missingVideos.length}`);
      console.log(`New total in database: ${existingPosts.length + missingVideos.length}`);

    } else {
      console.log('\nCould not fetch videos from any public API.');
      console.log('You may need to:');
      console.log('1. Manually provide the missing TikTok video URLs');
      console.log('2. Or upgrade to TikTok Research API access');
    }

  } finally {
    await client.close();
  }
}

pullTikTokVideosPublicAPI().catch(console.error);
