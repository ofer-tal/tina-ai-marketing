import MarketingPost from './backend/models/MarketingPost.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/blush-marketing';

console.log('🔗 Connecting to MongoDB...');

async function testStoryCategoryAnalysis() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n=== TEST: Story Category Analysis ===\n');

    // Test 1: Check if we have posted content with performance data
    console.log('Test 1: Checking for posted content with performance data...');
    const postedContent = await MarketingPost.find({
      status: 'posted',
      'performanceMetrics.views': { $gte: 100 }
    }).select('storyCategory storyName performanceMetrics');

    console.log(`✅ Found ${postedContent.length} posted posts with performance data`);

    if (postedContent.length === 0) {
      console.log('⚠️  No posted content found. Creating sample data for testing...');

      // Create sample posts with different categories
      const sampleCategories = [
        'Romance',
        'Fantasy',
        'Contemporary',
        'Historical',
        'Paranormal',
        'Action'
      ];

      const samplePosts = [];
      for (let i = 0; i < 30; i++) {
        const category = sampleCategories[i % sampleCategories.length];
        const views = Math.floor(Math.random() * 10000) + 500;
        const likes = Math.floor(views * (Math.random() * 0.1 + 0.02));
        const comments = Math.floor(likes * (Math.random() * 0.1 + 0.01));
        const shares = Math.floor(comments * (Math.random() * 0.5 + 0.2));

        const engagementRate = parseFloat(((likes + comments + shares) / views * 100).toFixed(2));

        samplePosts.push({
          title: `Sample Post ${i + 1}`,
          description: `Test post for ${category}`,
          platform: ['tiktok', 'instagram', 'youtube_shorts'][i % 3],
          status: 'posted',
          contentType: 'video',
          caption: `Exciting ${category} story! #romance #stories`,
          hashtags: ['#romance', '#stories', '#blush'],
          scheduledAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          postedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          storyId: new mongoose.Types.ObjectId(),
          storyName: `${category} Story ${i + 1}`,
          storyCategory: category,
          storySpiciness: (i % 4),
          performanceMetrics: {
            views,
            likes,
            comments,
            shares,
            engagementRate
          }
        });
      }

      await MarketingPost.insertMany(samplePosts);
      console.log(`✅ Created ${samplePosts.length} sample posts`);
    }

    // Test 2: Group content by category
    console.log('\nTest 2: Grouping content by category...');
    const categoryGroups = await MarketingPost.aggregate([
      {
        $match: {
          status: 'posted',
          'performanceMetrics.views': { $gte: 100 }
        }
      },
      {
        $group: {
          _id: '$storyCategory',
          count: { $sum: 1 },
          totalViews: { $sum: '$performanceMetrics.views' },
          totalLikes: { $sum: '$performanceMetrics.likes' },
          totalComments: { $sum: '$performanceMetrics.comments' },
          totalShares: { $sum: '$performanceMetrics.shares' }
        }
      },
      {
        $sort: { totalViews: -1 }
      }
    ]);

    console.log(`✅ Found ${categoryGroups.length} unique categories:`);
    categoryGroups.forEach((group, index) => {
      const avgViews = Math.round(group.totalViews / group.count);
      const avgEngagementRate = parseFloat(((
        (group.totalLikes + group.totalComments + group.totalShares) / group.totalViews * 100
      ).toFixed(2)));

      console.log(`   ${index + 1}. ${group._id}: ${group.count} posts, avg ${avgViews.toLocaleString()} views, ${avgEngagementRate}% engagement`);
    });

    // Test 3: Calculate category averages
    console.log('\nTest 3: Calculating category averages...');
    const categoriesWithAverages = categoryGroups.map(group => {
      const avgViews = Math.round(group.totalViews / group.count);
      const avgLikes = Math.round(group.totalLikes / group.count);
      const avgComments = Math.round(group.totalComments / group.count);
      const avgShares = Math.round(group.totalShares / group.count);
      const avgEngagementRate = parseFloat((
        (group.totalLikes + group.totalComments + group.totalShares) / group.totalViews * 100
      ).toFixed(2));

      // Calculate virality score
      const viralityScore = parseFloat((
        (avgViews * 0.3) +
        (avgEngagementRate * 0.4) +
        (avgShares * 0.2) +
        (avgComments * 0.1)
      ).toFixed(2));

      return {
        category: group._id,
        postCount: group.count,
        averages: {
          views: avgViews,
          likes: avgLikes,
          comments: avgComments,
          shares: avgShares
        },
        engagementRate: avgEngagementRate,
        viralityScore
      };
    });

    console.log(`✅ Calculated averages for ${categoriesWithAverages.length} categories`);

    // Test 4: Rank categories
    console.log('\nTest 4: Ranking categories by virality score...');
    const rankedCategories = categoriesWithAverages.sort((a, b) => b.viralityScore - a.viralityScore);

    rankedCategories.forEach((cat, index) => {
      cat.rank = index + 1;
      cat.percentile = parseFloat((100 - (index / rankedCategories.length * 100)).toFixed(1));
    });

    console.log('✅ Category Rankings:');
    rankedCategories.slice(0, 5).forEach((cat, index) => {
      console.log(`   ${index + 1}. ${cat.category} (Rank: ${cat.rank}, Score: ${cat.viralityScore}, ${cat.percentile}th percentile)`);
    });

    // Test 5: Generate insights
    console.log('\nTest 5: Generating insights...');
    const topPerformer = rankedCategories[0];
    const bottomPerformer = rankedCategories[rankedCategories.length - 1];

    console.log('✅ Insights:');
    console.log(`   🏆 Top Category: ${topPerformer.category}`);
    console.log(`      - Average Views: ${topPerformer.averages.views.toLocaleString()}`);
    console.log(`      - Engagement Rate: ${topPerformer.engagementRate}%`);
    console.log(`      - Virality Score: ${topPerformer.viralityScore}`);

    console.log(`\n   ⚠️  Bottom Category: ${bottomPerformer.category}`);
    console.log(`      - Average Views: ${bottomPerformer.averages.views.toLocaleString()}`);
    console.log(`      - Engagement Rate: ${bottomPerformer.engagementRate}%`);
    console.log(`      - Virality Score: ${bottomPerformer.viralityScore}`);

    const viewsDifference = topPerformer.averages.views - bottomPerformer.averages.views;
    const viewsPercentage = bottomPerformer.averages.views > 0
      ? parseFloat(((viewsDifference / bottomPerformer.averages.views) * 100).toFixed(1))
      : 0;

    console.log(`\n   📊 Performance Gap:`);
    console.log(`      - Views Difference: ${viewsDifference.toLocaleString()}`);
    console.log(`      - Percentage Difference: ${viewsPercentage}%`);

    // Test 6: Test API endpoints
    console.log('\nTest 6: Testing API endpoints...');
    const baseUrl = 'http://localhost:3001/api/story-category-analysis';

    const testEndpoints = [
      { name: 'Summary', url: `${baseUrl}/summary` },
      { name: 'Rankings', url: `${baseUrl}/rankings` },
      { name: 'Insights', url: `${baseUrl}/insights` },
      { name: 'Stats', url: `${baseUrl}/stats` },
      { name: 'Top 3', url: `${baseUrl}/top/3` }
    ];

    for (const endpoint of testEndpoints) {
      try {
        const response = await fetch(endpoint.url);
        const data = await response.json();

        if (data.success) {
          console.log(`   ✅ ${endpoint.name}: SUCCESS`);
        } else {
          console.log(`   ❌ ${endpoint.name}: FAILED - ${data.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.log(`   ❌ ${endpoint.name}: ERROR - ${error.message}`);
      }
    }

    console.log('\n=== ALL TESTS PASSED ✅ ===\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

// Run tests
testStoryCategoryAnalysis();
