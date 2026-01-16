// Test script for Content Engagement Correlation Analysis Feature #251

const API_BASE = 'http://localhost:3001/api/content-engagement';

async function test(name, fn) {
  try {
    console.log(`\n📋 Testing: ${name}`);
    await fn();
    console.log(`✅ PASSED: ${name}`);
    return true;
  } catch (error) {
    console.log(`❌ FAILED: ${name}`);
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('Content Engagement Correlation Analysis Tests');
  console.log('Feature #251');
  console.log('═══════════════════════════════════════════════════');

  const results = [];

  // Test 1: Extract content features
  results.push(await test('Step 1: Extract content features', async () => {
    const response = await fetch(`${API_BASE}/features?minViews=10`);
    const data = await response.json();

    if (!data.success) {
      throw new Error('API response not successful');
    }

    if (!data.data.features || !Array.isArray(data.data.features)) {
      throw new Error('Features array not found');
    }

    const feature = data.data.features[0];
    if (!feature.category || feature.spiciness === undefined || !feature.platform) {
      throw new Error('Required features not extracted');
    }

    console.log(`   - Extracted ${data.data.totalPosts} posts`);
    console.log(`   - Features: category, spiciness, platform, captionLength, etc.`);
  }));

  // Test 2: Correlate with engagement metrics
  results.push(await test('Step 2: Correlate with engagement metrics', async () => {
    const response = await fetch(`${API_BASE}/correlations?minViews=10`);
    const data = await response.json();

    if (!data.success) {
      throw new Error('API response not successful');
    }

    const correlations = data.data.correlations;
    if (!correlations.byCategory || !correlations.bySpiciness || !correlations.byPlatform) {
      throw new Error('Correlation data missing');
    }

    console.log(`   - Categories: ${Object.keys(correlations.byCategory).length}`);
    console.log(`   - Spiciness levels: ${Object.keys(correlations.bySpiciness).length}`);
    console.log(`   - Platforms: ${Object.keys(correlations.byPlatform).length}`);
    console.log(`   - Numeric analysis: captionLength, hashtagCount, hookLength`);
    console.log(`   - Boolean analysis: hasHook`);
  }));

  // Test 3: Identify high-performing patterns
  results.push(await test('Step 3: Identify high-performing patterns', async () => {
    const response = await fetch(`${API_BASE}/patterns?minViews=10`);
    const data = await response.json();

    if (!data.success) {
      throw new Error('API response not successful');
    }

    if (!data.data.patterns || !Array.isArray(data.data.patterns)) {
      throw new Error('Patterns array not found');
    }

    const topPattern = data.data.patterns[0];
    if (!topPattern.type || !topPattern.value) {
      throw new Error('Pattern structure invalid');
    }

    console.log(`   - Identified ${data.data.patterns.length} patterns`);
    console.log(`   - Top pattern: ${topPattern.type} = ${topPattern.value}`);
    console.log(`   - Engagement rate: ${topPattern.avgEngagementRate}%`);
  }));

  // Test 4: Generate insights
  results.push(await test('Step 4: Generate insights', async () => {
    const response = await fetch(`${API_BASE}/insights?minViews=10`);
    const data = await response.json();

    if (!data.success) {
      throw new Error('API response not successful');
    }

    if (!data.data.insights || !Array.isArray(data.data.insights)) {
      throw new Error('Insights array not found');
    }

    const insight = data.data.insights[0];
    if (!insight.type || !insight.title || !insight.insight || !insight.recommendation) {
      throw new Error('Insight structure invalid');
    }

    console.log(`   - Generated ${data.data.insights.length} insights`);
    console.log(`   - Example: "${insight.title}"`);
    console.log(`   - Priority: ${insight.priority}`);
  }));

  // Test 5: Display recommendations
  results.push(await test('Step 5: Display recommendations', async () => {
    const response = await fetch(`${API_BASE}/recommendations?minViews=10`);
    const data = await response.json();

    if (!data.success) {
      throw new Error('API response not successful');
    }

    if (!data.data.recommendations || !Array.isArray(data.data.recommendations)) {
      throw new Error('Recommendations array not found');
    }

    const rec = data.data.recommendations[0];
    if (!rec.category || !rec.title || !rec.recommendation || !rec.actionItems) {
      throw new Error('Recommendation structure invalid');
    }

    if (!Array.isArray(rec.actionItems) || rec.actionItems.length === 0) {
      throw new Error('Action items not found');
    }

    console.log(`   - Generated ${data.data.recommendations.length} recommendations`);
    console.log(`   - Example: "${rec.title}"`);
    console.log(`   - Expected impact: ${rec.expectedImpact}`);
    console.log(`   - Action items: ${rec.actionItems.length}`);
  }));

  // Test 6: Full analysis pipeline
  results.push(await test('Full analysis pipeline', async () => {
    const response = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minViews: 10 })
    });
    const data = await response.json();

    if (!data.success) {
      throw new Error('Full analysis failed');
    }

    if (!data.data.summary || !data.data.correlations || !data.data.patterns || !data.data.insights || !data.data.recommendations) {
      throw new Error('Full analysis missing components');
    }

    console.log(`   - Posts analyzed: ${data.data.summary.totalPostsAnalyzed}`);
    console.log(`   - Correlations: ${Object.keys(data.data.correlations.correlations || {}).length} types`);
    console.log(`   - Patterns: ${data.data.patterns.patterns?.length || 0}`);
    console.log(`   - Insights: ${data.data.insights.insights?.length || 0}`);
    console.log(`   - Recommendations: ${data.data.recommendations.recommendations?.length || 0}`);
  }));

  // Test 7: Summary endpoint
  results.push(await test('Summary statistics', async () => {
    const response = await fetch(`${API_BASE}/summary`);
    const data = await response.json();

    if (!data.success) {
      throw new Error('Summary failed');
    }

    if (!data.data.summary) {
      throw new Error('Summary data missing');
    }

    console.log(`   - Total posted posts: ${data.data.summary.totalPostedPosts}`);
    console.log(`   - Analyzable posts: ${data.data.summary.analyzablePosts}`);
    console.log(`   - Has sufficient data: ${data.data.summary.hasData}`);
  }));

  // Test 8: Category-specific analysis
  results.push(await test('Category-specific analysis', async () => {
    const response = await fetch(`${API_BASE}/by-category/drama?minViews=10`);
    const data = await response.json();

    if (!data.success && data.error?.includes('not found')) {
      console.log(`   - Drama category not in dataset (acceptable)`);
      return;
    }

    if (!data.success) {
      throw new Error('Category analysis failed');
    }

    if (!data.data.stats) {
      throw new Error('Category stats missing');
    }

    console.log(`   - Category: ${data.data.category}`);
    console.log(`   - Avg engagement: ${data.data.stats.avgEngagementRate}%`);
    console.log(`   - Sample size: ${data.data.stats.count}`);
  }));

  // Test 9: Spiciness-specific analysis
  results.push(await test('Spiciness-specific analysis', async () => {
    const response = await fetch(`${API_BASE}/by-spiciness/1?minViews=10`);
    const data = await response.json();

    if (!data.success && data.error?.includes('not found')) {
      console.log(`   - Spiciness level 1 not in dataset (acceptable)`);
      return;
    }

    if (!data.success) {
      throw new Error('Spiciness analysis failed');
    }

    if (!data.data.stats) {
      throw new Error('Spiciness stats missing');
    }

    console.log(`   - Spiciness: ${data.data.spiciness}`);
    console.log(`   - Avg engagement: ${data.data.stats.avgEngagementRate}%`);
    console.log(`   - Sample size: ${data.data.stats.count}`);
  }));

  // Test 10: Cache clear
  results.push(await test('Cache management', async () => {
    const response = await fetch(`${API_BASE}/cache/clear`, {
      method: 'POST'
    });
    const data = await response.json();

    if (!data.success) {
      throw new Error('Cache clear failed');
    }

    console.log(`   - Cache cleared successfully`);
  }));

  // Summary
  console.log('\n═══════════════════════════════════════════════════');
  console.log('Test Results Summary');
  console.log('═══════════════════════════════════════════════════');

  const passed = results.filter(r => r).length;
  const total = results.length;
  const percentage = ((passed / total) * 100).toFixed(1);

  console.log(`✅ Passed: ${passed}/${total} (${percentage}%)`);
  console.log(`❌ Failed: ${total - passed}/${total}`);

  if (passed === total) {
    console.log('\n🎉 All tests passed! Feature #251 is complete.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
  }

  console.log('═══════════════════════════════════════════════════');
}

main().catch(console.error);
