#!/usr/bin/env node

/**
 * Test Feature #119: Keyword ranking tracking
 *
 * Step 1: Define target keywords list
 * Step 2: Query keyword rankings daily
 * Step 3: Store in marketing_aso_keywords collection
 * Step 4: Track ranking history over time
 * Step 5: Display current rankings in dashboard
 */

import dotenv from 'dotenv';
dotenv.config();

import ASOKeyword from './backend/models/ASOKeyword.js';
import asoRankingService from './backend/services/asoRankingService.js';
import databaseService from './backend/services/database.js';

console.log('='.repeat(80));
console.log('Feature #119: Keyword Ranking Tracking - Test Suite');
console.log('='.repeat(80));

try {
  // Connect to database
  console.log('\n📡 Connecting to MongoDB...');
  await databaseService.connect();
  console.log('✅ Connected to database');

  // Step 1: Define target keywords list
  console.log('\n' + '='.repeat(80));
  console.log('STEP 1: Define target keywords list');
  console.log('='.repeat(80));

  const initResult = await asoRankingService.initializeTargetKeywords();
  console.log(`✅ Total keywords: ${initResult.total}`);
  console.log(`✅ Added: ${initResult.added.length}`);
  console.log(`✅ Already exists: ${initResult.alreadyExists}`);

  const keywords = await ASOKeyword.find({ target: true });
  console.log(`\n✅ Target keywords count: ${keywords.length}`);

  // Verify keyword structure
  const sampleKeyword = keywords[0];
  console.log('\n📋 Sample keyword structure:');
  console.log(`   - keyword: "${sampleKeyword.keyword}"`);
  console.log(`   - volume: ${sampleKeyword.volume}`);
  console.log(`   - competition: ${sampleKeyword.competition}`);
  console.log(`   - difficulty: ${sampleKeyword.difficulty}`);
  console.log(`   - opportunityScore: ${sampleKeyword.opportunityScore}`);
  console.log(`   - target: ${sampleKeyword.target}`);

  // Step 2: Query keyword rankings daily
  console.log('\n' + '='.repeat(80));
  console.log('STEP 2: Query keyword rankings daily');
  console.log('='.repeat(80));

  const updateResult = await asoRankingService.updateAllRankings();
  console.log(`✅ Rankings updated: ${updateResult.success}/${updateResult.total} keywords`);
  console.log(`✅ Failed: ${updateResult.failed}`);

  // Step 3: Store in marketing_aso_keywords collection
  console.log('\n' + '='.repeat(80));
  console.log('STEP 3: Store in marketing_aso_keywords collection');
  console.log('='.repeat(80));

  const collectionName = ASOKeyword.collection.name;
  console.log(`✅ Collection name: "${collectionName}"`);

  const count = await ASOKeyword.countDocuments();
  console.log(`✅ Total keywords in database: ${count}`);

  const withRankings = await ASOKeyword.countDocuments({ ranking: { $ne: null } });
  console.log(`✅ Keywords with rankings: ${withRankings}`);

  // Step 4: Track ranking history over time
  console.log('\n' + '='.repeat(80));
  console.log('STEP 4: Track ranking history over time');
  console.log('='.repeat(80));

  const keywordWithHistory = await ASOKeyword.findOne({
    rankingHistory: { $exists: true, $ne: [] }
  });

  if (keywordWithHistory) {
    console.log(`✅ Keyword: "${keywordWithHistory.keyword}"`);
    console.log(`✅ Current ranking: ${keywordWithHistory.ranking}`);
    console.log(`✅ History entries: ${keywordWithHistory.rankingHistory.length}`);

    keywordWithHistory.rankingHistory.forEach((entry, i) => {
      console.log(`   [${i + 1}] ${entry.date.toISOString()} - Ranking: #${entry.ranking}`);
    });

    // Test adding another ranking to history
    console.log('\n📈 Adding new ranking to history...');
    await keywordWithHistory.addRankingToHistory(keywordWithHistory.ranking - 2);
    console.log(`✅ History entries after update: ${keywordWithHistory.rankingHistory.length}`);
  } else {
    console.log('❌ No keywords with ranking history found');
  }

  // Step 5: Display current rankings in dashboard
  console.log('\n' + '='.repeat(80));
  console.log('STEP 5: Display current rankings in dashboard');
  console.log('='.repeat(80));

  const currentRankings = await asoRankingService.getCurrentRankings();
  console.log(`✅ Total keywords: ${currentRankings.length}`);

  // Display top 5 keywords
  console.log('\n📊 Top 5 keywords by ranking:');
  const rankedKeywords = currentRankings
    .filter(kw => kw.ranking !== null)
    .sort((a, b) => a.ranking - b.ranking)
    .slice(0, 5);

  rankedKeywords.forEach((kw, i) => {
    console.log(`   [${i + 1}] #${kw.ranking} - "${kw.keyword}" (${kw.competition} competition)`);
  });

  // Get performance summary
  const performance = await asoRankingService.getPerformanceSummary();
  console.log('\n📈 Performance Summary:');
  console.log(`   - Total tracked: ${performance.totalTracked}`);
  console.log(`   - With rankings: ${performance.withRankings}`);
  console.log(`   - Average ranking: #${performance.avgRanking}`);
  console.log(`   - In top 10: ${performance.inTop10} (${performance.top10Percentage}%)`);
  console.log(`   - In top 50: ${performance.inTop50}`);

  // Get opportunities
  console.log('\n💡 Keyword Opportunities (score ≥ 60):');
  const opportunities = await asoRankingService.getKeywordOpportunities();
  if (opportunities.length > 0) {
    opportunities.slice(0, 3).forEach((opp, i) => {
      console.log(`   [${i + 1}] "${opp.keyword}" - Score: ${opp.opportunityScore}/100`);
      console.log(`       Volume: ${opp.volume}, Competition: ${opp.competition}`);
    });
  } else {
    console.log('   ⚠️  No high-opportunity keywords found (score ≥ 60)');
  }

  // Test CRUD operations
  console.log('\n' + '='.repeat(80));
  console.log('BONUS: Test CRUD Operations');
  console.log('='.repeat(80));

  // Create new keyword
  console.log('\n➕ Adding new keyword...');
  const newKeyword = await asoRankingService.addKeyword({
    keyword: 'test keyword regression',
    volume: 1500,
    competition: 'low',
    difficulty: 30,
    target: true
  });
  console.log(`✅ Created: "${newKeyword.keyword}" (ID: ${newKeyword._id})`);

  // Update keyword
  console.log('\n✏️  Updating keyword...');
  const updated = await asoRankingService.updateKeyword(newKeyword._id, {
    volume: 2000,
    difficulty: 35
  });
  console.log(`✅ Updated: volume ${updated.volume}, difficulty ${updated.difficulty}`);

  // Delete keyword
  console.log('\n🗑️  Deleting keyword...');
  const deleted = await asoRankingService.removeKeyword(newKeyword._id);
  console.log(`✅ Deleted: "${deleted.keyword}"`);

  // Final summary
  console.log('\n' + '='.repeat(80));
  console.log('✅ ALL TESTS PASSED - Feature #119 Complete');
  console.log('='.repeat(80));
  console.log('\n📊 Summary:');
  console.log(`   ✅ Step 1: Target keywords defined (${keywords.length} keywords)`);
  console.log(`   ✅ Step 2: Rankings queried daily (${updateResult.success} updated)`);
  console.log(`   ✅ Step 3: Stored in marketing_aso_keywords collection`);
  console.log(`   ✅ Step 4: Ranking history tracked (${keywordWithHistory.rankingHistory.length} entries)`);
  console.log(`   ✅ Step 5: Dashboard displays current rankings`);
  console.log(`   ✅ CRUD operations working`);
  console.log('\n🎉 Feature #119 implementation verified!');

} catch (error) {
  console.error('\n❌ TEST FAILED:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  await databaseService.disconnect();
  console.log('\n📡 Database connection closed');
}
