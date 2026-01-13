import express from "express";
import databaseService from "../services/database.js";

const router = express.Router();

// Mock historical data for development (simulates database queries)
const mockHistoricalData = {
  revenue: {
    current: { mrr: 425, subscribers: 38, arpu: 11.18 },
    lastMonth: { mrr: 379, subscribers: 34, arpu: 11.15 },
    threeMonthsAgo: { mrr: 285, subscribers: 26, arpu: 10.96 },
    trend: [
      { date: '2024-10-13', mrr: 285, subscribers: 26 },
      { date: '2024-11-13', mrr: 332, subscribers: 30 },
      { date: '2024-12-13', mrr: 379, subscribers: 34 },
      { date: '2025-01-13', mrr: 425, subscribers: 38 }
    ],
    growth: { mrr: '+12%', subscribers: '+12%', monthOverMonth: true }
  },
  posts: [
    { id: '1', title: 'Forbidden Professor Chapter 1', platform: 'tiktok', views: 45200, likes: 1898, comments: 142, shares: 89, engagementRate: 4.2, postedAt: '2025-01-12T18:30:00Z', category: 'Professor Romance', spiciness: 2 },
    { id: '2', title: "Billionaire's Secret Baby", platform: 'tiktok', views: 38100, likes: 1448, comments: 98, shares: 72, engagementRate: 3.8, postedAt: '2025-01-11T20:15:00Z', category: 'Secret Baby', spiciness: 2 },
    { id: '3', title: 'Office Romance Compilation', platform: 'instagram', views: 29400, likes: 1498, comments: 87, shares: 65, engagementRate: 5.1, postedAt: '2025-01-10T19:00:00Z', category: 'Office Romance', spiciness: 1 },
    { id: '4', title: 'Bad Boy Roommate Scene', platform: 'tiktok', views: 25600, likes: 896, comments: 64, shares: 42, engagementRate: 3.5, postedAt: '2025-01-09T17:45:00Z', category: 'Bad Boy', spiciness: 2 },
    { id: '5', title: 'Small Town Sweet Romance', platform: 'youtube_shorts', views: 18900, likes: 756, comments: 48, shares: 31, engagementRate: 4.0, postedAt: '2025-01-08T16:30:00Z', category: 'Small Town', spiciness: 1 },
    { id: '6', title: 'Forbidden Attraction Chapter 3', platform: 'tiktok', views: 42100, likes: 1179, comments: 126, shares: 84, engagementRate: 2.8, postedAt: '2025-01-07T21:00:00Z', category: 'Forbidden Romance', spiciness: 3 },
    { id: '7', title: 'College Sweetheart Reunion', platform: 'instagram', views: 22300, likes: 1004, comments: 67, shares: 45, engagementRate: 4.5, postedAt: '2025-01-06T18:00:00Z', category: 'College Romance', spiciness: 1 },
    { id: '8', title: 'CEO\'s Secret Assistant', platform: 'tiktok', views: 34800, likes: 1183, comments: 94, shares: 66, engagementRate: 3.4, postedAt: '2025-01-05T19:30:00Z', category: 'CEO Romance', spiciness: 2 },
    { id: '9', title: 'Summer Fling Preview', platform: 'tiktok', views: 27500, likes: 908, comments: 71, shares: 49, engagementRate: 3.3, postedAt: '2025-01-04T17:00:00Z', category: 'Summer Romance', spiciness: 1 },
    { id: '10', title: 'Dark Romance Scene 2', platform: 'instagram', views: 31200, likes: 1435, comments: 103, shares: 78, engagementRate: 4.6, postedAt: '2025-01-03T20:00:00Z', category: 'Dark Romance', spiciness: 3 }
  ],
  keywords: [
    { keyword: 'spicy fiction', ranking: 7, volume: 45000, competition: 'high', change: -2, trackedSince: '2024-10-01' },
    { keyword: 'romance stories', ranking: 12, volume: 38000, competition: 'medium', change: 0, trackedSince: '2024-10-01' },
    { keyword: 'fiction app', ranking: 18, volume: 29000, competition: 'low', change: +3, trackedSince: '2024-11-01' },
    { keyword: 'romance novels', ranking: 45, volume: 62000, competition: 'low', change: -1, trackedSince: '2024-12-01' },
    { keyword: 'love stories', ranking: 38, volume: 41000, competition: 'medium', change: +2, trackedSince: '2024-12-01' },
    { keyword: 'fanfiction', ranking: 52, volume: 78000, competition: 'low', change: 0, trackedSince: '2025-01-01' },
    { keyword: 'erotic stories', ranking: 28, volume: 35000, competition: 'high', change: +1, trackedSince: '2024-10-01' }
  ],
  campaigns: [
    { name: 'Apple Search Ads - Exact Match', spend: 1200, impressions: 45200, clicks: 1248, conversions: 8, roi: -45, status: 'active' },
    { name: 'TikTok Ads - Interest Targeting', spend: 720, impressions: 89400, clicks: 2670, conversions: 4, roi: -66, status: 'active' },
    { name: 'Instagram Ads - Lookalike', spend: 240, impressions: 31200, clicks: 624, conversions: 1, roi: -72, status: 'active' }
  ]
};

// Mock GLM4.7 API integration for development
// In production, this will call the actual GLM4.7 API
async function callGLM4API(messages, conversationHistory = []) {
  // For development, return mock responses with historical data
  // In production, this would make an actual API call to GLM4.7

  const lastUserMessage = messages[messages.length - 1]?.content?.toLowerCase() || "";

  // Simple mock response logic based on keywords
  if (lastUserMessage.includes("revenue") || lastUserMessage.includes("mrr") || lastUserMessage.includes("trend") || lastUserMessage.includes("growth")) {
    const data = mockHistoricalData.revenue;
    return {
      role: "assistant",
      content: `**Revenue Trend Analysis:**

📈 **Current Performance:**
- MRR: $${data.current.mrr} (${data.growth.mrr} vs last month)
- Active Subscribers: ${data.current.subscribers} (${data.growth.subscribers} growth)
- ARPU: $${data.current.arpu.toFixed(2)} (Avg Revenue Per User)

📊 **3-Month Trend:**
- Oct 2024: $${data.trend[0].mrr} MRR, ${data.trend[0].subscribers} subscribers
- Nov 2024: $${data.trend[1].mrr} MRR, ${data.trend[1].subscribers} subscribers
- Dec 2024: $${data.trend[2].mrr} MRR, ${data.trend[2].subscribers} subscribers
- Jan 2025: $${data.trend[3].mrr} MRR, ${data.trend[3].subscribers} subscribers

💡 **Analysis:**
We're growing at ~12% month-over-month, which is solid! At this rate, we'll reach $10,000 MRR in approximately 19 months (by August 2026). However, we want to accelerate this.

**Recommendations to Accelerate Growth:**
1. **Content**: Increase posting frequency from 1-2 to 3-4 posts/day
2. **ASO**: Fix the declining "spicy fiction" keyword ranking (dropped 2 spots)
3. **Ads**: Pause negative ROI campaigns and reallocat budget to content creation

Should I create a detailed growth acceleration plan?`,
      timestamp: new Date().toISOString()
    };
  } else if (lastUserMessage.includes("content strategy") || lastUserMessage.includes("content themes") || lastUserMessage.includes("content plan") || (lastUserMessage.includes("content") && (lastUserMessage.includes("suggest") || lastUserMessage.includes("recommend")))) {
    const posts = mockHistoricalData.posts;

    // Analyze content performance by category
    const categoryStats = {};
    posts.forEach(p => {
      if (!categoryStats[p.category]) {
        categoryStats[p.category] = { count: 0, views: 0, engagement: 0, spiciness: [] };
      }
      categoryStats[p.category].count++;
      categoryStats[p.category].views += p.views;
      categoryStats[p.category].engagement += p.engagementRate;
      categoryStats[p.category].spiciness.push(p.spiciness);
    });

    const categoryRankings = Object.entries(categoryStats)
      .map(([cat, stats]) => ({
        category: cat,
        ...stats,
        avgEngagement: stats.engagement / stats.count,
        avgViews: stats.views / stats.count,
        avgSpiciness: stats.spiciness.reduce((a, b) => a + b, 0) / stats.spiciness.length
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement);

    const top3Categories = categoryRankings.slice(0, 3);
    const bestCategory = categoryRankings[0];

    // Analyze posting patterns
    const postsByPlatform = {};
    posts.forEach(p => {
      if (!postsByPlatform[p.platform]) {
        postsByPlatform[p.platform] = { count: 0, views: 0, engagement: 0 };
      }
      postsByPlatform[p.platform].count++;
      postsByPlatform[p.platform].views += p.views;
      postsByPlatform[p.platform].engagement += p.engagementRate;
    });

    // Optimal posting times analysis
    const postingHours = posts.map(p => new Date(p.postedAt).getHours());
    const avgHour = postingHours.reduce((a, b) => a + b, 0) / postingHours.length;

    // Spiciness analysis
    const spicinessStats = { 1: [], 2: [], 3: [] };
    posts.forEach(p => {
      if (spicinessStats[p.spiciness]) {
        spicinessStats[p.spiciness].push(p.engagementRate);
      }
    });
    const avgEngagementBySpiciness = {};
    Object.entries(spicinessStats).forEach(([level, rates]) => {
      avgEngagementBySpiciness[level] = rates.length ? (rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(1) : 0;
    });

    return {
      role: "assistant",
      content: `**📱 Content Strategy Recommendations**

Based on analysis of your last 10 posts, here's a comprehensive content strategy:

---

**🎯 Top Content Themes (Ranked by Performance):**

**1. ${bestCategory.category}** ⭐ BEST PERFORMER
- Avg Engagement: **${bestCategory.avgEngagement.toFixed(1)}%**
- Avg Views: **${Math.round(bestCategory.avgViews).toLocaleString()}**
- Avg Spiciness: Level ${bestCategory.avgSpiciness.toFixed(1)}
- Recommendation: **Double down on this category** - create 40-50% of content here

${top3Categories.slice(1).map((cat, i) => `**${i + 2}. ${cat.category}**
- Avg Engagement: ${cat.avgEngagement.toFixed(1)}%
- Avg Views: ${Math.round(cat.avgViews).toLocaleString()}
- Avg Spiciness: Level ${cat.avgSpiciness.toFixed(1)}
- Opportunity: Solid performer, maintain current volume`).join('\n\n')}

---

**📊 Content Mix Recommendations:**

**Primary Content (60% of posts):**
- ${bestCategory.category} stories - Your highest engagement category
- Focus on relatable characters and emotional hooks
- Target spiciness level 1-2 for broader appeal

**Secondary Content (30% of posts):**
- ${top3Categories[1]?.category || 'Forbidden Romance'} - Strong performer
- ${top3Categories[2]?.category || 'Secret Baby'} - Reliable engagement
- Use for testing new formats and hooks

**Experimental Content (10% of posts):**
- New categories to expand reach
- Different spiciness levels to test audience response
- Trending formats in the romance fiction space

---

**⏰ Posting Frequency & Schedule:**

**Current Frequency:** ~1 post/day
**Recommended Frequency:** **3-4 posts/day**

**Optimal Posting Times:**
- **Early Morning:** 7-9 AM EST (commute time)
- **Lunch Break:** 12-2 PM EST
- **Prime Time:** 6-9 PM EST (highest engagement window)
- **Late Night:** 10-11 PM EST (bedtime scrolling)

**Weekly Content Calendar (Example):**
- **Monday**: 3 posts (8 AM, 1 PM, 7 PM)
- **Tuesday**: 4 posts (8 AM, 12 PM, 6 PM, 9 PM)
- **Wednesday**: 3 posts (9 AM, 2 PM, 8 PM)
- **Thursday**: 4 posts (7 AM, 1 PM, 6 PM, 10 PM)
- **Friday**: 4 posts (8 AM, 12 PM, 7 PM, 9 PM)
- **Saturday**: 3 posts (10 AM, 3 PM, 8 PM)
- **Sunday**: 3 posts (9 AM, 2 PM, 7 PM)
- **Total: 24 posts/week (vs current 7 posts/week)**

---

**📏 Video Format Specifications:**

**Length:**
- **Sweet spot**: 15-30 seconds (highest completion rates)
- **Short**: 7-15 seconds for hooks/teasers
- **Long**: 30-60 seconds for story compilations

**Style:**
- Vertical format (9:16 aspect ratio)
- Text overlay for first 3 seconds (hook)
- Captions for accessibility
- Brand watermark in corner
- Strong CTA at end ("Link in bio", "Read more in app")

---

**🌶️ Spiciness Level Strategy:**

**Level 1 (Sweet Romance):** **BEST PERFORMING** (${avgEngagementBySpiciness[1]}% avg engagement)
- Use for **60%** of content
- Broader audience appeal
- Higher shareability

**Level 2 (Spicy Romance):** Strong performer (${avgEngagementBySpiciness[2]}% avg engagement)
- Use for **30%** of content
- Good balance of appeal and engagement
- Targets core audience

**Level 3 (Very Spicy):** Lower engagement (${avgEngagementBySpiciness[3]}% avg engagement)
- Use for **10%** of content
- Niche audience
- Lower completion rates

---

**📈 Platform Strategy:**

${Object.entries(postsByPlatform).map(([platform, stats]) => {
  const avgEng = (stats.engagement / stats.count).toFixed(1);
  const avgViews = Math.round(stats.views / stats.count).toLocaleString();
  const rec = platform === 'tiktok' ? '🎯 Primary platform - 60% of posts' :
              platform === 'instagram' ? '✅ High engagement - 25% of posts' :
              '📺 Test platform - 15% of posts';
  return `**${platform.charAt(0).toUpperCase() + platform.slice(1)}:**
- Avg Engagement: ${avgEng}%
- Avg Views: ${avgViews}
- Strategy: ${rec}`;
}).join('\n\n')}

---

**💡 Content Hooks That Work:**

1. **"Chapter 1" teasers** - "You won't believe what happens next..."
2. **Character reveals** - "Professor X is about to change everything..."
3. **Emotional moments** - "The moment she realized she was in love..."
4. **Cliffhangers** - "He leaned in and whispered..."
5. **Relatable scenarios** - "When your hot roommate does THIS..."

---

**🎯 Expected Results (30 Days):**

By following this strategy:
- **Posts/week**: 7 → 24 (**+240% more content**)
- **Projected monthly views**: 315K → 800K-1M (**+150-220%**)
- **Projected engagement**: 4.0% → 4.5-5.0% (**better targeting**)
- **Estimated new users**: 80-120/month from organic content

---

**✅ Next Steps:**

1. Create content calendar for this week?
2. Generate story selection for next 7 days?
3. Set up automated posting schedule?

What would you like to tackle first?`,
      timestamp: new Date().toISOString()
    };
  } else if (lastUserMessage.includes("content") || lastUserMessage.includes("post")) {
    const posts = mockHistoricalData.posts;
    const topPosts = posts.slice(0, 5);
    const avgEngagement = (posts.reduce((sum, p) => sum + p.engagementRate, 0) / posts.length).toFixed(1);
    const totalViews = posts.reduce((sum, p) => sum + p.views, 0).toLocaleString();

    // Category performance
    const categoryStats = {};
    posts.forEach(p => {
      if (!categoryStats[p.category]) {
        categoryStats[p.category] = { count: 0, views: 0, engagement: 0 };
      }
      categoryStats[p.category].count++;
      categoryStats[p.category].views += p.views;
      categoryStats[p.category].engagement += p.engagementRate;
    });

    const topCategory = Object.entries(categoryStats)
      .map(([cat, stats]) => ({ category: cat, ...stats, avgEngagement: stats.engagement / stats.count }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)[0];

    return {
      role: "assistant",
      content: `**Content Performance Analysis (Last 10 Days):**

📱 **Top 5 Performing Posts:**
1. "${topPosts[0].title}" - ${topPosts[0].views.toLocaleString()} views, ${topPosts[0].engagementRate}% engagement
2. "${topPosts[1].title}" - ${topPosts[1].views.toLocaleString()} views, ${topPosts[1].engagementRate}% engagement
3. "${topPosts[2].title}" - ${topPosts[2].views.toLocaleString()} views, ${topPosts[2].engagementRate}% engagement
4. "${topPosts[3].title}" - ${topPosts[3].views.toLocaleString()} views, ${topPosts[3].engagementRate}% engagement
5. "${topPosts[4].title}" - ${topPosts[4].views.toLocaleString()} views, ${topPosts[4].engagementRate}% engagement

📊 **Overall Stats:**
- Total Views: ${totalViews}
- Average Engagement Rate: ${avgEngagement}%
- Best Performing Category: **${topCategory.category}** (${topCategory.avgEngagement.toFixed(1)}% avg engagement)

💡 **Key Insights:**
- **"Professor Romance"** content is performing exceptionally well
- Videos with spiciness level 1-2 get higher engagement than level 3
- TikTok drives 60% of views, Instagram has better engagement rates
- Posting between 6-9 PM EST performs best

**Recommendations:**
1. Create more "Professor Romance" and "Secret Baby" content
2. Stick to spiciness levels 1-2 for broader appeal
3. Test 15-30 second video length (sweet spot for retention)
4. Increase posting frequency to 3-4 times per day

Would you like me to generate a content calendar for this week?`,
      timestamp: new Date().toISOString()
    };
  } else if (lastUserMessage.includes("budget") || lastUserMessage.includes("spend") || lastUserMessage.includes("ad") || lastUserMessage.includes("campaign")) {
    const campaigns = mockHistoricalData.campaigns;
    const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
    const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
    const avgRoi = (campaigns.reduce((sum, c) => sum + c.roi, 0) / campaigns.length).toFixed(0);

    // Check if user wants to propose budget changes
    if (lastUserMessage.includes("proposal") || lastUserMessage.includes("propose") || lastUserMessage.includes("change") || lastUserMessage.includes("reallocat") || lastUserMessage.includes("increase") || lastUserMessage.includes("reduce")) {
      // Return budget proposal response
      return {
        role: "assistant",
        content: `**💰 Budget Change Proposal**

**Current Budget Allocation:**
- Total Monthly Budget: $3,000
- Apple Search Ads: $1,000 (33%)
- TikTok Ads: $1,000 (33%)
- Instagram Ads: $1,000 (34%)

**Proposed Changes:**
- **PAUSE Apple Search Ads** → Save $1,000/month (ROI: -45%)
- **PAUSE TikTok Ads** → Save $720/month (ROI: -66%)
- **PAUSE Instagram Ads** → Save $240/month (ROI: -72%)
- **Total Savings: $1,960/month**

**Recommended Reallocation:**
- **Video Editing Tools (CapCut Pro, etc.)**: $500/month
- **Stock Footage Subscription**: $200/month
- **Influencer Partnerships**: $800/month
- **Content Production Budget**: $460/month

**Expected Impact:**
- Monthly savings: $1,960
- Projected additional organic reach: +50-70%
- Estimated new users from content: 80-120/month
- Cost per user (content): ~$16 vs $400 from ads

**Reasoning:**
All paid campaigns have negative ROI. Organic content outperforms paid ads 3:1 on engagement. Reallocating budget to content creation will yield higher returns at lower CAC.

⚠️ **This proposal requires your approval to implement.**

Would you like me to:
1. **Approve** this budget change?
2. **Modify** the allocation?
3. **Cancel** this proposal?`,
        timestamp: new Date().toISOString(),
        proposal: {
          type: "budget_change",
          current: {
            total: 3000,
            allocations: [
              { channel: "Apple Search Ads", budget: 1000 },
              { channel: "TikTok Ads", budget: 1000 },
              { channel: "Instagram Ads", budget: 1000 }
            ]
          },
          proposed: {
            total: 3000,
            allocations: [
              { channel: "Video Editing Tools", budget: 500 },
              { channel: "Stock Footage", budget: 200 },
              { channel: "Influencer Partnerships", budget: 800 },
              { channel: "Content Production", budget: 460 },
              { channel: "Apple Search Ads", budget: 0 },
              { channel: "TikTok Ads", budget: 0 },
              { channel: "Instagram Ads", budget: 0 }
            ]
          },
          reasoning: "All paid campaigns have negative ROI. Organic content outperforms paid ads 3:1 on engagement. Reallocating budget to content creation will yield higher returns.",
          expectedImpact: {
            monthlySavings: 1960,
            projectedReachIncrease: "50-70%",
            estimatedNewUsers: "80-120/month",
            newCAC: 16,
            oldCAC: 400
          },
          status: "awaiting_approval"
        }
      };
    }

    // Regular budget analysis response
    return {
      role: "assistant",
      content: `**Paid Ad Performance Review:**

💰 **Budget Utilization:**
- Monthly Budget: $3,000
- Actual Spend: $${totalSpend.toLocaleString()} (${((totalSpend / 3000) * 100).toFixed(1)}% used)
- Remaining: $${(3000 - totalSpend).toLocaleString()}

📊 **Campaign Performance:**
1. **Apple Search Ads - Exact Match**
   - Spend: $${campaigns[0].spend}
   - ROI: ${campaigns[0].roi}% (losing $${(campaigns[0].spend * 1.45).toFixed(0)})
   - Conversions: ${campaigns[0].conversions} (@ $${(campaigns[0].spend / campaigns[0].conversions).toFixed(0)} per user)

2. **TikTok Ads - Interest Targeting**
   - Spend: $${campaigns[1].spend}
   - ROI: ${campaigns[1].roi}% (losing $${(campaigns[1].spend * 1.66).toFixed(0)})
   - Conversions: ${campaigns[1].conversions} (@ $${(campaigns[1].spend / campaigns[1].conversions).toFixed(0)} per user)

3. **Instagram Ads - Lookalike**
   - Spend: $${campaigns[2].spend}
   - ROI: ${campaigns[2].roi}% (losing $${(campaigns[2].spend * 1.72).toFixed(0)})
   - Conversions: ${campaigns[2].conversions} (@ $${(campaigns[2].spend / campaigns[2].conversions).toFixed(0)} per user)

⚠️ **Critical Issue:**
All campaigns have **negative ROI**. We're losing $${(totalSpend * 1.6).toFixed(0)} on paid ads while only acquiring ${totalConversions} users at $${(totalSpend / totalConversions).toFixed(0)} CAC.

**Recommendation:**
**PAUSE ALL PAID CAMPAIGNS IMMEDIATELY**

Our organic content is performing much better:
- Organic posts get 2-3x higher engagement
- CAC from content is ~$15 vs ~$400 from ads
- Better to invest the $2,160 remaining in content creation tools

Should I pause all campaigns and reallocate budget to content production?`,
      timestamp: new Date().toISOString()
    };
  } else if (lastUserMessage.includes("keyword") || lastUserMessage.includes("aso") || lastUserMessage.includes("ranking") || lastUserMessage.includes("app store")) {
    const keywords = mockHistoricalData.keywords;
    const declined = keywords.filter(k => k.change < 0);
    const improved = keywords.filter(k => k.change > 0);

    return {
      role: "assistant",
      content: `**ASO Keyword Rankings Update:**

📉 **Declining Keywords (⚠️ Action Needed):**
${declined.map(k => `- **"${k.keyword}"**: #${k.ranking} (${k.change > 0 ? '+' : ''}${k.change}), Volume: ${k.volume.toLocaleString()}, Competition: ${k.competition}`).join('\n')}

📈 **Improving Keywords (✅ Keep Optimizing):**
${improved.map(k => `- **"${k.keyword}"**: #${k.ranking} (${k.change > 0 ? '+' : ''}${k.change}), Volume: ${k.volume.toLocaleString()}, Competition: ${k.competition}`).join('\n')}

🎯 **Top Opportunity Keywords:**
1. **"romance novels"** - #45, High volume (62K searches), Low competition
2. **"fanfiction"** - #52, High volume (78K searches), Low competition
3. **"love stories"** - #38, Medium volume (41K searches), Medium competition

💡 **Strategy:**
- **Urgent**: Fix "spicy fiction" decline (was #5, now #7)
- **Short-term**: Target "romance novels" keyword in app description
- **Long-term**: Build backlinks for "fanfiction" term

**Proposed Actions:**
1. Update app subtitle: "Romance Novels & Spicy Fiction"
2. Add "romance novels" to app description (5-7 times)
3. Create A/B test for "spicy fiction" vs "spicy stories"
4. Reach out to romance novel bloggers for backlinks

Expected impact: +15-20% organic downloads in 30 days.

Should I implement these ASO changes?`,
      timestamp: new Date().toISOString()
    };
  } else if (lastUserMessage.includes("strategy") || lastUserMessage.includes("recommendation") || lastUserMessage.includes("recommend") || lastUserMessage.includes("plan") || lastUserMessage.includes("advice")) {
    // Strategy recommendations based on performance data
    const data = mockHistoricalData;
    const topPost = data.posts.sort((a, b) => b.engagementRate - a.engagementRate)[0];
    const worstCampaign = data.campaigns.sort((a, b) => a.roi - b.roi)[0];
    const decliningKeywords = data.keywords.filter(k => k.change < 0);

    return {
      role: "assistant",
      content: `**🎯 Strategic Recommendations for Growth Acceleration**

Based on my analysis of your performance data, here are my top strategic recommendations:

**📈 PRIORITY 1: Content Strategy (High Impact)**
- **Focus on Professor Romance content** - Your top performer "${topPost.title}" has ${topPost.engagementRate}% engagement
- **Increase posting frequency** from 1-2 to 3-4 posts/day
- **Stick to spiciness levels 1-2** for broader appeal (level 3 gets 30% less engagement)
- **Test video lengths**: 15-30 seconds is the sweet spot
- **Optimal posting time**: 6-9 PM EST

*Expected Impact: +50-70% more organic reach within 30 days*

**💰 PRIORITY 2: Budget Reallocation (Immediate Action)**
- **PAUSE ${worstCampaign.name}** - Currently losing ${Math.abs(worstCampaign.roi)}% ROI
- **Redirection**: Reallocate the $${(3000 - data.campaigns.reduce((sum, c) => sum + c.spend, 0)).toLocaleString()} remaining budget to:
  - Video editing tools (CapCut Pro, etc.)
  - Stock footage for content creation
  - Influencer partnerships for content promotion

*Expected Impact: Save $2,400/month in losses, reinvest in high-ROI content*

**🔍 PRIORITY 3: ASO Optimization (Quick Wins)**
- **Fix declining keywords**: ${decliningKeywords.map(k => `"${k.keyword}"`).join(', ')}
- **Update app subtitle** to: "Romance Novels & Spicy Fiction"
- **Add "romance novels"** to app description (5-7 times naturally)
- **Target opportunity keyword**: "romance novels" at #45 with 62K volume and low competition

*Expected Impact: +15-20% organic downloads in 30 days*

**📊 PRIORITY 4: Analytics & Optimization**
- **Track engagement rate by category** to double down on winners
- **A/B test video hooks** (first 3 seconds are critical)
- **Monitor competitor strategies** in the romance fiction space
- **Set up conversion tracking** from content to app installs

---

**🚀 30-Day Action Plan:**

**Week 1:**
- Pause all negative ROI campaigns
- Update ASO metadata (subtitle, description)
- Create 10 new Professor Romance story posts

**Week 2:**
- Test 3-4 posts per day frequency
- A/B test video hooks (20-30 seconds vs 15-20 seconds)
- Identify top 3 performing content categories

**Week 3:**
- Double down on top performing category
- Reach out to 5-10 romance fiction influencers for collaboration
- Create content calendar for next month

**Week 4:**
- Analyze results and optimize
- Scale what works, kill what doesn't
- Prepare month 2 strategy

**Projected Results:**
- MRR: $425 → $650-750 (+53-76%)
- Organic downloads: +40-60%
- Engagement rate: +20-30%

Would you like me to:
1. **Create detailed content calendar** for this week?
2. **Generate ASO keyword list** for optimization?
3. **Set up action items** for each priority?
4. **Dive deeper** into any specific recommendation?`,
      timestamp: new Date().toISOString()
    };
  } else if (lastUserMessage.includes("hello") || lastUserMessage.includes("hi") || lastUserMessage.includes("hey")) {
    return {
      role: "assistant",
      content: `Hello! I'm your AI Marketing Executive for the Blush app. 🚀

I have access to all your historical data and can help with:

**📊 Analytics & Performance**
- Revenue trends and growth analysis
- Content performance insights
- Engagement metrics tracking

**💰 Revenue & Growth**
- MRR tracking ($425 current, growing 12% MoM)
- Subscriber analysis (38 active subscribers)
- Churn rate and LTV optimization

**📱 Content Strategy**
- Top performing posts analysis
- Content calendar planning
- Platform-specific optimization

**🔍 ASO & Keywords**
- Keyword ranking tracking (7 keywords monitored)
- App Store optimization recommendations
- A/B testing strategies

**📈 Paid Advertising**
- Campaign performance monitoring
- ROI analysis and budget optimization
- Audience targeting insights

**💡 Strategic Planning**
- Growth acceleration planning
- Milestone tracking toward $10K MRR
- Competitive analysis

Quick stats: You're at $425 MRR with 38 subscribers, growing 12% month-over-month. Your best content category is "Professor Romance" with 4.5% avg engagement.

What would you like to focus on today?`,
      timestamp: new Date().toISOString()
    };
// This is the pivot code section to insert into chat.js

  } else if (lastUserMessage.includes("pivot") || lastUserMessage.includes("strategic pivot") || lastUserMessage.includes("change direction") || lastUserMessage.includes("new direction")) {
    // Strategic pivot recommendations
    const data = mockHistoricalData;

    return {
      role: "assistant",
      content: `**🔄 Strategic Pivot Recommendation**

After analyzing your performance data, I recommend a **strategic pivot from paid advertising to organic content-first growth**.

---

**📊 Current Situation Analysis:**

**Paid Ads Performance (What's NOT Working):**
- Total spend: $2,160 across 3 campaigns
- Conversions: Only 13 users acquired
- Cost Per Acquisition (CAC): $400 per user
- ROI: -60% average (losing money on every campaign)

**Organic Content Performance (What IS Working):**
- 10 posts generated ~315,000 views
- Average engagement rate: 4.0%
- Estimated organic CAC: ~$15 per user
- Organic ROI: +280% (content costs vs user value)

**The Pivot Opportunity:**
- **Current mix**: 90% paid, 10% organic → **Result: Losing money, slow growth**
- **Proposed mix**: 10% paid (for testing), 90% organic → **Expected: Profitable, fast growth**

---

**🎯 Recommended Strategic Pivot:**

**FROM:** Paid-First Growth Strategy
- Heavy investment in paid ads
- Reality: Burning $2,160/month for minimal growth

**TO:** Organic Content-First Growth Strategy
- Heavy investment in content creation
- Expected: Scale through viral content and organic reach

---

**📋 Pivot Implementation Plan:**

**Phase 1: Immediate (Week 1) - "Stop the Bleeding"**
- **PAUSE all paid campaigns** immediately
- Reallocate budget to content tools and production

**Phase 2: Build (Weeks 2-4) - "Content Engine"**
- Increase posting: 2 posts/day → 4-5 posts/day
- Content mix: 60% top performers, 30% testing, 10% experimental
- Build content pipeline: 50+ stories queued

**Phase 3: Scale (Month 2) - "Growth Acceleration"**
- Double down on winning content categories
- Test influencer collaborations

**Phase 4: Optimize (Month 3+) - "Profit Machine"**
- Reintroduce paid ads ONLY for retargeting
- Focus on high LTV users

---

**💰 Expected Outcomes (90 Days):**

**Before Pivot (Paid-First):**
- Monthly spend: $3,000
- New users: ~15/month
- CAC: $400
- Profitability: ❌ Negative

**After Pivot (Organic-First):**
- Monthly spend: $1,400
- New users: ~80-120/month
- CAC: ~$15
- Profitability: ✅ Positive

**Key Metrics Improvement:**
- **CAC**: $400 → $15 (96% reduction)
- **Monthly users**: 15 → 80-120 (5-8x increase)
- **Profit margin**: -60% → +85%

---

**⚠️ Risks & Mitigation:**

**Risk 1: Organic reach may decline**
- Mitigation: Diversify platforms (TikTok, Instagram, YouTube Shorts)

**Risk 2: Content production bottleneck**
- Mitigation: Build pipeline and hire freelancer

**Risk 3: Takes longer to see results**
- Mitigation: Run small paid tests for data

---

**🎯 Success Criteria (90 Days):**
- [ ] Posting 4-5 times daily
- [ ] At least 2 posts with >50K views
- [ ] MRR growth of $300-500/month
- [ ] Positive profit margin

---

**💡 My Recommendation:**

**Execute this pivot immediately.** The data shows paid ads are draining capital while organic content generates real growth.

This pivot transforms marketing from:
- ❌ Burning cash, slow growth, negative ROI
- ✅ Positive cash flow, rapid growth, sustainable scalability

**Shall I create action items for this pivot?**`,
      timestamp: new Date().toISOString(),
      pivot: {
        type: "strategic_pivot",
        from: "paid_first_growth",
        to: "organic_content_first_growth",
        reasoning: "Paid campaigns have -60% average ROI with $400 CAC. Organic content generates +280% ROI with ~$15 CAC. Pivot reduces CAC by 96% and increases user acquisition 5-8x.",
        expectedOutcomes: {
          beforePivot: { monthlySpend: 3000, newUsers: 15, cac: 400, profitability: "negative" },
          afterPivot: { monthlySpend: 1400, newUsers: "80-120", cac: 15, profitability: "positive" }
        },
        implementationPhases: [
          { phase: 1, name: "Stop the Bleeding", duration: "Week 1", actions: ["Pause campaigns", "Reallocate budget"] },
          { phase: 2, name: "Content Engine", duration: "Weeks 2-4", actions: ["Increase posts", "Build pipeline"] },
          { phase: 3, name: "Growth Acceleration", duration: "Month 2", actions: ["Double down", "Test influencers"] },
          { phase: 4, name: "Profit Machine", duration: "Month 3+", actions: ["Retargeting ads", "Optimize LTV"] }
        ],
        risks: [
          { risk: "Organic reach decline", mitigation: "Diversify platforms" },
          { risk: "Content bottleneck", mitigation: "Hire freelancer" },
          { risk: "Slower results", mitigation: "Small paid tests" }
        ],
        successCriteria: ["4-5 posts daily", "2+ posts >50K views", "$300-500 MRR growth", "Positive margin"],
        status: "awaiting_approval",
        reviewDate: null
      }
    };
  } else {
    return {
      role: "assistant",
      content: `I can help you with that! Here's what I have access to:

**Revenue & Growth Data:**
- Current MRR: $425 (12% growth MoM)
- 38 active subscribers, $11.18 ARPU
- 3-month trend data available

**Content Performance:**
- Last 10 posts analyzed
- Top performer: "Forbidden Professor Chapter 1" (45.2K views, 4.2% engagement)
- Best category: Professor Romance (4.5% avg engagement)

**ASO Keywords:**
- 7 keywords being tracked
- "spicy fiction" declined to #7 (⚠️ needs attention)
- Opportunity: "romance novels" at #45, low competition

**Paid Ad Campaigns:**
- 3 active campaigns, all with negative ROI
- Total spend: $2,160, only 13 conversions
- Recommendation: Pause and reallocate budget

Could you clarify which area you'd like to explore? I can dive deeper into any of these topics or provide strategic recommendations.`,
      timestamp: new Date().toISOString()
    };
  }
}

// GET /api/chat/history - Get conversation history
router.get("/history", async (req, res) => {
  try {
    const status = databaseService.getStatus();

    if (!status.isConnected || status.readyState !== 1) {
      // Return empty history if no database connection
      return res.json({
        success: true,
        conversations: [],
        message: "No database connection - using in-memory storage"
      });
    }

    const mongoose = await import('mongoose');
    const conversations = await mongoose.connection
      .collection("marketing_strategy")
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    res.json({
      success: true,
      conversations: conversations.map(conv => ({
        id: conv._id,
        type: conv.type,
        title: conv.title,
        content: conv.content,
        reasoning: conv.reasoning,
        status: conv.status,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt
      }))
    });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.json({
      success: true,
      conversations: [],
      message: "Error fetching history - starting fresh"
    });
  }
});

// POST /api/chat/message - Send a message and get AI response
router.post("/message", async (req, res) => {
  try {
    const { message, conversationId } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        error: "Message is required and must be a string"
      });
    }

    // Build messages array for AI
    const messages = [
      {
        role: "system",
        content: `You are an AI Marketing Executive for the Blush iPhone app - a romantic/spicy AI story generator. Your goal is to help grow the app from $300-500/month MRR to $10,000/month in 6 months.

Key context:
- Target audience: 90%+ female, 85% straight, ages 18-45
- Current MRR: $425 with 38 active subscribers
- Channels: TikTok, Instagram, YouTube Shorts, Apple Search Ads
- Brand voice: Sex-positive, romantic, empowering, sexy

Your role:
- Provide strategic recommendations based on data
- Be collaborative and explain your reasoning
- Create action items when appropriate
- Ask for approval before making significant changes
- Be concise but thorough

Always base recommendations on actual data when available.`
      },
      {
        role: "user",
        content: message
      }
    ];

    // Get AI response
    const aiResponse = await callGLM4API(messages);

    // Save conversation to database if available
    const status = databaseService.getStatus();
    let savedConversation = null;

    if (status.isConnected && status.readyState === 1) {
      try {
        const mongoose = await import('mongoose');
        const conversation = {
          type: "chat",
          title: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
          content: aiResponse.content,
          reasoning: `Responding to: ${message}`,
          status: "completed",
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await mongoose.connection.collection("marketing_strategy").insertOne(conversation);
        savedConversation = {
          id: result.insertedId,
          ...conversation
        };
      } catch (dbError) {
        console.error("Error saving conversation to database:", dbError);
        // Continue without saving
      }
    }

    res.json({
      success: true,
      response: {
        role: aiResponse.role,
        content: aiResponse.content,
        timestamp: aiResponse.timestamp,
        proposal: aiResponse.proposal || null
      },
      conversationId: savedConversation?.id,
      message: "Response generated successfully"
    });
  } catch (error) {
    console.error("Error processing chat message:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/chat/feedback - Provide feedback on AI response
router.post("/feedback", async (req, res) => {
  try {
    const { conversationId, feedback, type } = req.body;

    if (!conversationId || !feedback) {
      return res.status(400).json({
        success: false,
        error: "Conversation ID and feedback are required"
      });
    }

    const status = databaseService.getStatus();

    if (!status.isConnected || status.readyState !== 1) {
      return res.json({
        success: true,
        message: "Feedback received (not persisted - no database connection)"
      });
    }

    // Update conversation with feedback
    const mongoose = await import('mongoose');
    await mongoose.connection.collection("marketing_strategy").updateOne(
      { _id: conversationId },
      {
        $set: {
          feedback: feedback,
          feedbackType: type, // 'positive' or 'negative'
          feedbackGivenAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: "Feedback recorded successfully"
    });
  } catch (error) {
    console.error("Error recording feedback:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/chat/history - Clear conversation history
router.delete("/history", async (req, res) => {
  try {
    const status = databaseService.getStatus();

    if (!status.isConnected || status.readyState !== 1) {
      return res.json({
        success: true,
        message: "History cleared (no database connection)"
      });
    }

    const mongoose = await import('mongoose');
    await mongoose.connection.collection("marketing_strategy").deleteMany({ type: "chat" });

    res.json({
      success: true,
      message: "Conversation history cleared successfully"
    });
  } catch (error) {
    console.error("Error clearing chat history:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/chat/create-todo - Create todo from chat suggestion
router.post("/create-todo", async (req, res) => {
  try {
    const { title, description, category, priority, scheduledAt, dueAt, estimatedTime, relatedStrategyId } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: "Title is required"
      });
    }

    const status = databaseService.getStatus();
    let createdTodo = null;

    if (status.isConnected && status.readyState === 1) {
      try {
        const mongoose = await import('mongoose');
        const todo = {
          title,
          description: description || "",
          category: category || "review",
          priority: priority || "medium",
          status: "pending",
          scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
          dueAt: dueAt ? new Date(dueAt) : null,
          completedAt: null,
          resources: [],
          estimatedTime: estimatedTime || null,
          actualTime: null,
          createdBy: "ai",
          relatedStrategyId: relatedStrategyId || null,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await mongoose.connection.collection("marketing_tasks").insertOne(todo);
        createdTodo = {
          id: result.insertedId,
          ...todo
        };
      } catch (dbError) {
        console.error("Error saving todo to database:", dbError);
        // Continue with mock response
      }
    }

    // If no database save, return mock success
    if (!createdTodo) {
      createdTodo = {
        id: `mock_${Date.now()}`,
        title,
        description: description || "",
        category: category || "review",
        priority: priority || "medium",
        status: "pending",
        scheduledAt: scheduledAt || new Date().toISOString(),
        dueAt: dueAt || null,
        completedAt: null,
        resources: [],
        estimatedTime: estimatedTime || null,
        actualTime: null,
        createdBy: "ai",
        relatedStrategyId: relatedStrategyId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    res.json({
      success: true,
      todo: createdTodo,
      message: "Todo created successfully from chat"
    });
  } catch (error) {
    console.error("Error creating todo from chat:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/chat/approve - Approve a proposal
router.post("/approve", async (req, res) => {
  try {
    const { proposalId, conversationId, proposal } = req.body;

    if (!proposal) {
      return res.status(400).json({
        success: false,
        error: "Proposal is required"
      });
    }

    const status = databaseService.getStatus();

    // Save approved proposal to database
    if (status.isConnected && status.readyState === 1) {
      try {
        const mongoose = await import('mongoose');
        const approvedProposal = {
          type: "decision",
          title: `Budget Change: ${proposal.current.total} → ${proposal.proposed.total}`,
          content: `Approved budget reallocation from paid ads to content production`,
          reasoning: proposal.reasoning,
          dataReferences: [{
            type: "budget_change",
            current: proposal.current,
            proposed: proposal.proposed,
            expectedImpact: proposal.expectedImpact
          }],
          status: "approved",
          expectedOutcome: proposal.expectedImpact,
          actualOutcome: null,
          reviewDate: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await mongoose.connection.collection("marketing_strategy").insertOne(approvedProposal);
      } catch (dbError) {
        console.error("Error saving approved proposal to database:", dbError);
      }
    }

    res.json({
      success: true,
      message: "Proposal approved successfully",
      proposal: {
        ...proposal,
        status: "approved",
        approvedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error approving proposal:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/chat/reject - Reject a proposal
router.post("/reject", async (req, res) => {
  try {
    const { proposalId, conversationId, proposal, reason } = req.body;

    if (!proposal) {
      return res.status(400).json({
        success: false,
        error: "Proposal is required"
      });
    }

    const status = databaseService.getStatus();

    // Save rejected proposal to database
    if (status.isConnected && status.readyState === 1) {
      try {
        const mongoose = await import('mongoose');
        const rejectedProposal = {
          type: "decision",
          title: `Budget Change Rejected`,
          content: `Rejected budget reallocation. Reason: ${reason || "No reason provided"}`,
          reasoning: proposal.reasoning,
          dataReferences: [{
            type: "budget_change",
            current: proposal.current,
            proposed: proposal.proposed,
            expectedImpact: proposal.expectedImpact,
            rejectionReason: reason
          }],
          status: "rejected",
          expectedOutcome: proposal.expectedImpact,
          actualOutcome: "Proposal rejected by user",
          reviewDate: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await mongoose.connection.collection("marketing_strategy").insertOne(rejectedProposal);
      } catch (dbError) {
        console.error("Error saving rejected proposal to database:", dbError);
      }
    }

    res.json({
      success: true,
      message: "Proposal rejected successfully",
      proposal: {
        ...proposal,
        status: "rejected",
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason
      }
    });
  } catch (error) {
    console.error("Error rejecting proposal:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
