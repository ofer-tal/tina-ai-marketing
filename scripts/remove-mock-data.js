// This script replaces all mock data in backend/api/dashboard.js with zero/empty values

import fs from 'fs';

const filePath = 'backend/api/dashboard.js';
let content = fs.readFileSync(filePath, 'utf8');

// Track replacements made
const replacements = [];

// 1. Fix acquisition-split (organic vs paid mock data)
const acquisitionSplitMatch = content.match(/\/\/ TODO: In production, fetch from MongoDB marketing_metrics collection[\s\S]*?\/\/ For now, generate mock data showing organic vs paid split[\s\S]*?const splitData = \{[\s\S]*?\n    \};/);
if (acquisitionSplitMatch) {
  const replacement = `// NO REAL DATA YET - Return empty structure
    // TODO: Connect to real analytics source when available
    const data = [];
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      data.push({
        date: date.toISOString().split('T')[0],
        totalUsers: 0,
        organicUsers: 0,
        paidUsers: 0,
        organicPercent: 0,
        paidPercent: 0
      });
    }

    const splitData = {
      range: range,
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
      data: data,
      summary: {
        totalUsers: 0,
        organicUsers: 0,
        paidUsers: 0,
        organicPercent: 0,
        paidPercent: 0,
        previous: {
          organicPercent: 0,
          paidPercent: 0
        },
        trend: 'neutral'
      }
    };`;
  content = content.replace(acquisitionSplitMatch[0], replacement);
  replacements.push('acquisition-split');
}

// 2. Fix revenue-spend-trend (mock revenue and spend data)
const revenueSpendMatch = content.match(/\/\/ Generate mock data - revenue and spend over time[\s\S]*?res\.json\(\{[\s\S]*?\n    \}\);/);
if (revenueSpendMatch) {
  const replacement = `// NO REAL DATA YET - Return empty structure
    // TODO: Connect to real analytics source when available
    const data = [];
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      data.push({
        date: date.toISOString().split('T')[0],
        revenue: 0,
        spend: 0,
        profit: 0,
        cumulativeRevenue: 0,
        cumulativeSpend: 0
      });
    }

    res.json({
      range: range,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      data: data,
      summary: {
        current: { revenue: 0, spend: 0, profit: 0, profitMargin: 0 },
        previous: { revenue: 0, spend: 0, profit: 0 },
        change: { revenue: 0, spend: 0 },
        averages: { revenue: 0, spend: 0, profitMargin: 0 },
        totalProfit: 0
      }
    });`;
  content = content.replace(revenueSpendMatch[0], replacement);
  replacements.push('revenue-spend-trend');
}

// 3. Fix roi-by-channel (mock ROI data)
const roiChannelMatch = content.match(/\/\/ TODO: In production, fetch from MongoDB marketing_metrics collection[\s\S]*?\/\/ For now, generate mock ROI data by channel[\s\S]*?const roiData = \{[\s\S]*?\n    res\.json\(roiData\);/);
if (roiChannelMatch) {
  const replacement = `// NO REAL DATA YET - Return empty structure
    // TODO: Connect to real analytics source when available
    const channels = [
      { id: 'apple_search_ads', name: 'Apple Search Ads', category: 'paid', icon: '🍎', color: '#00d26a' },
      { id: 'tiktok_ads', name: 'TikTok Ads', category: 'paid', icon: '🎵', color: '#e94560' },
      { id: 'instagram_ads', name: 'Instagram Ads', category: 'paid', icon: '📸', color: '#7b2cbf' },
      { id: 'organic_app_store', name: 'Organic (App Store)', category: 'organic', icon: '🔍', color: '#00d4ff' },
      { id: 'social_organic', name: 'Social Organic', category: 'organic', icon: '💬', color: '#ffb020' }
    ];

    const channelData = channels.map(channel => ({
      id: channel.id,
      name: channel.name,
      category: channel.category,
      icon: channel.icon,
      color: channel.color,
      metrics: { spend: 0, revenue: 0, profit: 0, users: 0, roi: 0, roas: 0, cac: 0, ltv: 0 }
    }));

    const roiData = {
      range: range,
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
      channels: channelData,
      summary: {
        totalSpend: 0,
        totalRevenue: 0,
        totalProfit: 0,
        totalUsers: 0,
        overallROI: null,
        overallROAS: null,
        avgCAC: null,
        bestChannel: null,
        worstChannel: null
      }
    };
    res.json(roiData);`;
  content = content.replace(roiChannelMatch[0], replacement);
  replacements.push('roi-by-channel');
}

// 4. Fix alerts (remove fake alerts about MRR, campaigns, etc.)
const alertsMatch = content.match(/\/\/ TODO: In production, these would be fetched from MongoDB[\s\S]*?\/\/ For now, returning mock alerts[\s\S]*?const alerts = \[\];[\s\S]*?res\.json\(\{[\s\S]*?\n    \}\);/);
if (alertsMatch) {
  const replacement = `// NO REAL DATA YET - Return empty structure
    // TODO: Implement real alert system when connected to data sources
    const alerts = [];

    res.json({
      alerts: alerts,
      summary: {
        total: 0,
        critical: 0,
        warning: 0,
        info: 0
      },
      timestamp: now.toISOString()
    });`;
  content = content.replace(alertsMatch[0], replacement);
  replacements.push('alerts');
}

// 5. Fix budget-utilization (remove fake budget data)
const budgetMatch = content.match(/\/\/ TODO: In production, fetch from marketing_budget settings[\s\S]*?\/\/ For now, using mock data with configurable budget[\s\S]*?res\.json\(budgetData\);/);
if (budgetMatch) {
  const replacement = `// NO REAL DATA YET - Return empty structure
    // TODO: Connect to real budget/campaign data when available
    const budgetData = {
      period: {
        start: startOfMonth.toISOString(),
        end: now.toISOString(),
        currentDay: now.getDate(),
        daysInMonth: daysInMonth,
        remainingDays: daysInMonth - now.getDate()
      },
      budget: {
        monthly: 0,
        spent: 0,
        remaining: 0,
        projected: 0
      },
      variance: {
        amount: 0,
        percent: 0,
        status: 'none',
        description: 'No budget configured'
      },
      utilization: {
        percent: 0,
        amount: 0,
        ofTotal: 0
      },
      thresholds: {
        warning: 70,
        critical: 90,
        current: 'normal'
      },
      alert: {
        level: 'normal',
        message: null,
        action: null
      },
      pacing: {
        currentDailySpend: 0,
        requiredDailySpend: 0,
        budgetHealth: 'unknown'
      },
      breakdown: {
        apple_search_ads: { spent: 0, budget: 0, percent: 0, variance: { amount: 0, percent: 0 } },
        tiktok_ads: { spent: 0, budget: 0, percent: 0, variance: { amount: 0, percent: 0 } },
        instagram_ads: { spent: 0, budget: 0, percent: 0, variance: { amount: 0, percent: 0 } }
      }
    };
    res.json(budgetData);`;
  content = content.replace(budgetMatch[0], replacement);
  replacements.push('budget-utilization');
}

// 6. Fix conversion-funnel (remove fake funnel data)
const funnelMatch = content.match(/\/\/ TODO: In production, fetch from MongoDB aggregations[\s\S]*?\/\/ Mock conversion funnel data representing the user journey[\s\S]*?res\.json\(funnelData\);/);
if (funnelMatch) {
  const replacement = `// NO REAL DATA YET - Return empty structure
    // TODO: Connect to real analytics source when available
    const funnelData = {
      period: period,
      startTime: startTime.toISOString(),
      endTime: now.toISOString(),
      days: days,
      stages: [
        { id: 'impressions', name: 'App Store Impressions', description: 'Times app appeared in search or browse', count: 0, conversionRate: null, dropoffCount: null, dropoffRate: null },
        { id: 'product_page_views', name: 'Product Page Views', description: 'Users who viewed the app product page', count: 0, conversionRate: 0, dropoffCount: 0, dropoffRate: 0 },
        { id: 'downloads', name: 'App Downloads', description: 'Users who downloaded the app', count: 0, conversionRate: 0, dropoffCount: 0, dropoffRate: 0 },
        { id: 'installs', name: 'App Installs', description: 'Users who completed installation', count: 0, conversionRate: 0, dropoffCount: 0, dropoffRate: 0 },
        { id: 'signups', name: 'Account Signups', description: 'Users who created an account', count: 0, conversionRate: 0, dropoffCount: 0, dropoffRate: 0 },
        { id: 'trial_starts', name: 'Trial Activations', description: 'Users who started free trial', count: 0, conversionRate: 0, dropoffCount: 0, dropoffRate: 0 },
        { id: 'subscriptions', name: 'Paid Subscriptions', description: 'Users who converted to paid subscription', count: 0, conversionRate: 0, dropoffCount: 0, dropoffRate: 0 }
      ],
      summary: {
        totalImpressions: 0,
        totalConversions: 0,
        overallConversionRate: 0,
        avgConversionRatePerStage: 0,
        biggestDropoffStage: null,
        biggestDropoffRate: 0
      },
      stageDetails: {
        impressions: { breakdown: { search: 0, browse: 0, referrals: 0 }, topSources: [] },
        product_page_views: { avgTimeOnPage: 0, bounceRate: 0, returnVisitors: 0 },
        downloads: { abortedDownloads: 0, retryRate: 0 },
        subscriptions: { byPlan: { monthly: 0, annual: 0 }, avgTimeToSubscribe: 0, churnRate: 0 }
      }
    };
    res.json(funnelData);`;
  content = content.replace(funnelMatch[0], replacement);
  replacements.push('conversion-funnel');
}

// Write the updated content back to the file
fs.writeFileSync(filePath, content, 'utf8');

console.log('Mock data removal complete!');
console.log('Replacements made:', replacements.join(', '));
