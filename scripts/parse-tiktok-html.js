import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config();

/**
 * Parse TikTok profile HTML to extract video data
 * This works around the rate-limited API by parsing the web page
 */

async function extractVideosFromHTML() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();

    console.log('=== PARSING TIKTOK PROFILE PAGE (@blush.app) ===\n');

    const username = 'blush.app';
    const profileUrl = `https://www.tiktok.com/@${username}`;

    console.log('Fetching profile page:', profileUrl);

    const response = await fetch(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      console.log('ERROR: Could not fetch profile page');
      console.log('Status:', response.status);
      return;
    }

    const html = await response.text();
    console.log('HTML length:', html.length);
    console.log('Looking for video data...\n');

    // TikTok embeds data in script tags with __INITIAL_STATE__ or similar
    const patterns = [
      /"videoList":\s*(\[[\s\S]*?\])/,
      /"videos":\s*(\[[\s\S]*?\}\])/,
      /__INITIAL_STATE__\s*=\s*({[\s\S]*?});/,
      /window\['__INITIAL_STATE__'\]\s*=\s*({[\s\S]*?});/,
      /<script\s+id="__NEXT_DATA__"\s+type="application\/json">({[\s\S]*?)<\/script>/,
    ];

    let foundData = null;
    let videos = [];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        console.log('Found match with pattern:', pattern.source.substring(0, 50));
        console.log('Match preview:', match[1].substring(0, 200));

        try {
          const parsed = JSON.parse(match[1]);
          if (Array.isArray(parsed)) {
            videos = parsed;
            foundData = match[1];
            break;
          } else if (parsed.videoList || parsed.videos) {
            videos = parsed.videoList || parsed.videos || [];
            foundData = match[1];
            break;
          }
        } catch (e) {
          console.log('Could not parse this pattern');
        }
      }
    }

    // Alternative: Look for individual video objects
    if (videos.length === 0) {
      console.log('\nTrying to find individual video objects...');

      // Find all video IDs in the format of TikTok URLs
      const urlMatches = html.match(/\/video\/(\d+)/g);
      if (urlMatches) {
        const videoIds = [...new Set(urlMatches.map(u => u.replace('/video/', '')))];
        console.log(`Found ${videoIds.length} unique video IDs in URLs`);

        videos = videoIds.map(id => ({
          id: id,
          video_id: id,
          share_url: `https://www.tiktok.com/@${username}/video/${id}`,
          title: '',
          create_time: null,
        }));

        foundData = 'extracted from URLs';
      }
    }

    if (videos.length > 0) {
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

      // Find missing videos
      const missingVideos = videos.filter(v => {
        const vid = v.video_id || v.id;
        return vid && !existingVideoIds.has(vid.toString());
      });

      const matchedVideos = videos.filter(v => {
        const vid = v.video_id || v.id;
        return vid && existingVideoIds.has(vid.toString());
      });

      console.log(`Videos found on TikTok: ${videos.length}`);
      console.log(`Videos NOT in database: ${missingVideos.length}`);
      console.log(`Videos already in database: ${matchedVideos.length}\n`);

      // List matched videos with their titles from database
      if (matchedVideos.length > 0) {
        console.log('=== MATCHED VIDEOS (can update metrics) ===');
        matchedVideos.forEach((v, i) => {
          const vid = v.video_id || v.id;
          const post = existingPosts.find(p => p.tiktokVideoId === vid.toString());
          console.log(`  ${i + 1}. ${v.share_url || post?.tiktokShareUrl}`);
          console.log(`     Database caption: ${post?.caption?.substring(0, 40) || 'N/A'}...`);
        });
        console.log();
      }

      // Import missing videos
      if (missingVideos.length > 0) {
        console.log('=== IMPORTING MISSING VIDEOS ===\n');

        const newPosts = missingVideos.map((video) => {
          const videoId = (video.video_id || video.id).toString();
          const shareUrl = video.share_url || `https://www.tiktok.com/@${username}/video/${videoId}`;
          const title = video.title || video.desc || video.description || '';
          const createTime = video.create_time || video.createTime;
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
          const videoId = (v.video_id || v.id).toString();
          console.log(`  ${i + 1}. https://www.tiktok.com/@${username}/video/${videoId}`);
          console.log(`     Title: ${v.title?.substring(0, 50) || 'N/A'}...`);
        });
        console.log();
      }

      // Summary
      console.log('=== SYNC COMPLETE ===');
      console.log(`Total videos found on TikTok: ${videos.length}`);
      console.log(`Posts already in database: ${existingPosts.length}`);
      console.log(`Matched: ${matchedVideos.length}`);
      console.log(`Imported: ${missingVideos.length}`);
      console.log(`New total in database: ${existingPosts.length + missingVideos.length}`);

    } else {
      console.log('Could not extract any videos from the profile page.');
      console.log('TikTok may have changed their HTML structure.');
    }

  } finally {
    await client.close();
  }
}

extractVideosFromHTML().catch(console.error);
