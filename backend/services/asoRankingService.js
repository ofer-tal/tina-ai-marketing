import ASOKeyword from '../models/ASOKeyword.js';
import appStoreConnectService from './appStoreConnectService.js';

/**
 * ASO Ranking Service
 * Manages keyword ranking tracking and analysis for App Store Optimization
 */
class ASORankingService {
  /**
   * Initialize ASO tracking with target keywords
   */
  async initializeTargetKeywords() {
    const defaultKeywords = [
      { keyword: 'romance stories', volume: 8500, competition: 'high', difficulty: 75, target: true },
      { keyword: 'romantic stories', volume: 6200, competition: 'high', difficulty: 70, target: true },
      { keyword: 'love stories', volume: 12000, competition: 'high', difficulty: 85, target: true },
      { keyword: 'spicy stories', volume: 3200, competition: 'medium', difficulty: 55, target: true },
      { keyword: 'romance novels', volume: 9800, competition: 'high', difficulty: 80, target: false },
      { keyword: 'interactive stories', volume: 4500, competition: 'medium', difficulty: 60, target: true },
      { keyword: 'story games', volume: 7800, competition: 'high', difficulty: 72, target: true },
      { keyword: 'romantic games', volume: 2800, competition: 'medium', difficulty: 50, target: false },
      { keyword: 'choose your story', volume: 5400, competition: 'medium', difficulty: 65, target: true },
      { keyword: 'episode stories', volume: 4100, competition: 'medium', difficulty: 58, target: false },
      { keyword: 'otome games', volume: 3500, competition: 'low', difficulty: 45, target: true },
      { keyword: 'dating sims', volume: 2900, competition: 'low', difficulty: 40, target: false },
      { keyword: 'fiction stories', volume: 5600, competition: 'medium', difficulty: 62, target: true },
      { keyword: 'audio stories', volume: 2300, competition: 'low', difficulty: 38, target: false },
      { keyword: 'book apps', volume: 1800, competition: 'low', difficulty: 35, target: false }
    ];

    const added = [];
    for (const kw of defaultKeywords) {
      const existing = await ASOKeyword.findOne({ keyword: kw.keyword });
      if (!existing) {
        const newKeyword = new ASOKeyword(kw);
        newKeyword.calculateOpportunityScore();
        await newKeyword.save();
        added.push(kw.keyword);
      }
    }

    return {
      total: defaultKeywords.length,
      added,
      alreadyExists: defaultKeywords.length - added.length
    };
  }

  /**
   * Query keyword rankings from App Store Connect API
   * Note: This is a simulated implementation. In production, you would use
   * the actual App Store Connect API to fetch real ranking data.
   */
  async fetchKeywordRanking(keyword) {
    try {
      // TODO: Replace with actual App Store Connect API call
      // The App Store Connect API doesn't directly provide keyword rankings.
      // In production, you would need to:
      // 1. Use a third-party ASO tool API (AppTweak, SensorTower, MobileAction)
      // 2. Or scrape App Store search results (against ToS)
      // 3. Or use manual tracking with periodic checks

      // For now, simulate ranking based on keyword difficulty and random variation
      const baseRanking = Math.max(1, Math.floor(keyword.difficulty / 2) + Math.floor(Math.random() * 20));

      return baseRanking;
    } catch (error) {
      console.error(`Error fetching ranking for keyword "${keyword}":`, error.message);
      return null;
    }
  }

  /**
   * Update rankings for all tracked keywords
   */
  async updateAllRankings() {
    const keywords = await ASOKeyword.find({ target: true });
    const results = {
      success: 0,
      failed: 0,
      total: keywords.length
    };

    for (const keyword of keywords) {
      try {
        const ranking = await this.fetchKeywordRanking(keyword);
        if (ranking !== null) {
          await keyword.addRankingToHistory(ranking);
          results.success++;
        } else {
          results.failed++;
        }
      } catch (error) {
        console.error(`Failed to update ranking for "${keyword.keyword}":`, error.message);
        results.failed++;
      }
    }

    return results;
  }

  /**
   * Get current rankings for all keywords
   */
  async getCurrentRankings() {
    const keywords = await ASOKeyword.find({})
      .sort({ target: -1, opportunityScore: -1 });

    return keywords.map(kw => ({
      id: kw._id,
      keyword: kw.keyword,
      ranking: kw.ranking,
      volume: kw.volume,
      competition: kw.competition,
      difficulty: kw.difficulty,
      opportunityScore: kw.opportunityScore,
      target: kw.target,
      lastCheckedAt: kw.lastCheckedAt,
      trackedSince: kw.trackedSince,
      rankingHistory: kw.rankingHistory.slice(-10) // Last 10 entries
    }));
  }

  /**
   * Get ranking trends for a specific keyword
   */
  async getKeywordTrends(keywordId) {
    const keyword = await ASOKeyword.findById(keywordId);
    if (!keyword) {
      throw new Error('Keyword not found');
    }

    const history = keyword.rankingHistory.sort((a, b) => a.date - b.date);

    // Calculate trend
    let trend = 'stable';
    if (history.length >= 2) {
      const recent = history.slice(-7); // Last 7 entries
      const avgRecent = recent.reduce((sum, h) => sum + h.ranking, 0) / recent.length;
      const older = history.slice(-14, -7) || history.slice(0, Math.min(7, history.length));
      const avgOlder = older.reduce((sum, h) => sum + h.ranking, 0) / older.length;

      if (avgRecent < avgOlder - 5) trend = 'improving';
      else if (avgRecent > avgOlder + 5) trend = 'declining';
    }

    return {
      keyword: keyword.keyword,
      currentRanking: keyword.ranking,
      trend,
      history: history.map(h => ({
        date: h.date,
        ranking: h.ranking
      })),
      bestRanking: Math.min(...history.map(h => h.ranking)),
      worstRanking: Math.max(...history.map(h => h.ranking)),
      avgRanking: history.reduce((sum, h) => sum + h.ranking, 0) / history.length
    };
  }

  /**
   * Get keyword opportunities (high potential, low competition)
   */
  async getKeywordOpportunities() {
    const keywords = await ASOKeyword.find({
      target: true,
      opportunityScore: { $gte: 60 }
    }).sort({ opportunityScore: -1 });

    return keywords.map(kw => ({
      keyword: kw.keyword,
      opportunityScore: kw.opportunityScore,
      volume: kw.volume,
      competition: kw.competition,
      currentRanking: kw.ranking,
      difficulty: kw.difficulty
    }));
  }

  /**
   * Add a new keyword to track
   */
  async addKeyword(keywordData) {
    const existing = await ASOKeyword.findOne({ keyword: keywordData.keyword });
    if (existing) {
      throw new Error('Keyword already exists');
    }

    const newKeyword = new ASOKeyword(keywordData);
    newKeyword.calculateOpportunityScore();
    await newKeyword.save();

    return newKeyword;
  }

  /**
   * Update keyword details
   */
  async updateKeyword(keywordId, updates) {
    const keyword = await ASOKeyword.findById(keywordId);
    if (!keyword) {
      throw new Error('Keyword not found');
    }

    Object.assign(keyword, updates);
    keyword.calculateOpportunityScore();
    await keyword.save();

    return keyword;
  }

  /**
   * Remove keyword from tracking
   */
  async removeKeyword(keywordId) {
    const keyword = await ASOKeyword.findByIdAndDelete(keywordId);
    if (!keyword) {
      throw new Error('Keyword not found');
    }

    return { success: true, keyword: keyword.keyword };
  }

  /**
   * Get ASO performance summary
   */
  async getPerformanceSummary() {
    const keywords = await ASOKeyword.find({ target: true });

    const totalTracked = keywords.length;
    const withRankings = keywords.filter(kw => kw.ranking !== null).length;
    const avgRanking = withRankings > 0
      ? keywords.reduce((sum, kw) => sum + (kw.ranking || 0), 0) / withRankings
      : 0;

    const inTop10 = keywords.filter(kw => kw.ranking && kw.ranking <= 10).length;
    const inTop50 = keywords.filter(kw => kw.ranking && kw.ranking <= 50).length;

    return {
      totalTracked,
      withRankings,
      avgRanking: Math.round(avgRanking),
      inTop10,
      inTop50,
      top10Percentage: totalTracked > 0 ? Math.round((inTop10 / totalTracked) * 100) : 0
    };
  }
  /**
   * Suggest new keyword opportunities based on analysis
   * Analyzes app content/niche and suggests high-volume, low-competition keywords
   */
  async getKeywordSuggestions() {
    // Step 1: Analyze app content and niche
    // Get existing tracked keywords to understand current focus
    const trackedKeywords = await ASOKeyword.find({});
    const trackedKeywordSet = new Set(trackedKeywords.map(kw => kw.keyword.toLowerCase()));

    // Define app niche categories based on existing keywords
    const nicheCategories = {
      romance: [
        'romantic chat', 'love simulator', 'dating story', 'romantic chatbot',
        'virtual boyfriend', 'love game', 'romance anime', 'interactive romance'
      ],
      stories: [
        'interactive fiction', 'story games', 'text adventure', 'visual novel',
        'episode games', 'choice games', 'narrative games', 'story app'
      ],
      spicy: [
        'otome romance', 'love episodes', 'romantic episodes', 'dating anime',
        'romantic visual novel', 'love stories free', 'romantic novels free'
      ],
      games: [
        'romance games free', 'dating simulator', 'love simulation', 'romantic rpg',
        'otome free', 'romance otome', 'dating games free', 'love games free'
      ]
    };

    // Step 2: Query related keyword search volumes
    // Generate potential suggestions from all categories
    const allSuggestions = Object.values(nicheCategories).flat();

    // Step 3: Find high volume low competition keywords
    // For each suggestion, estimate metrics and filter out already-tracked keywords
    const opportunities = [];

    for (const keyword of allSuggestions) {
      // Skip if already tracked
      if (trackedKeywordSet.has(keyword.toLowerCase())) {
        continue;
      }

      // Estimate metrics based on keyword characteristics
      // In production, this would come from App Store Connect API or ASO tools
      const estimatedVolume = this.estimateKeywordVolume(keyword);
      const estimatedDifficulty = this.estimateKeywordDifficulty(keyword);
      const competition = this.estimateCompetition(estimatedDifficulty);

      // Calculate opportunity score
      const volumeScore = Math.min((estimatedVolume / 10000) * 100, 100);
      const competitionScore = competition === 'low' ? 100 : competition === 'medium' ? 50 : 0;
      const difficultyScore = 100 - estimatedDifficulty;
      const opportunityScore = Math.round(
        (volumeScore * 0.4) + (competitionScore * 0.3) + (difficultyScore * 0.3)
      );

      // Only include high-opportunity keywords (score >= 60)
      if (opportunityScore >= 60) {
        opportunities.push({
          keyword,
          volume: estimatedVolume,
          difficulty: estimatedDifficulty,
          competition,
          opportunityScore,
          category: this.categorizeKeyword(keyword),
          reason: this.getSuggestionReason(keyword, competition, estimatedVolume)
        });
      }
    }

    // Step 4: Generate opportunity list
    // Sort by opportunity score and return top suggestions
    opportunities.sort((a, b) => b.opportunityScore - a.opportunityScore);

    return {
      total: opportunities.length,
      suggestions: opportunities.slice(0, 20), // Return top 20
      categories: {
        romance: opportunities.filter(kw => kw.category === 'romance').length,
        stories: opportunities.filter(kw => kw.category === 'stories').length,
        spicy: opportunities.filter(kw => kw.category === 'spicy').length,
        games: opportunities.filter(kw => kw.category === 'games').length
      }
    };
  }

  /**
   * Estimate keyword search volume based on characteristics
   */
  estimateKeywordVolume(keyword) {
    // Longer, more specific keywords tend to have lower volume
    const words = keyword.split(' ').length;
    const baseVolume = 5000;

    // Adjust for word count (2-3 words is optimal)
    if (words === 2) return Math.round(baseVolume * 1.2);
    if (words === 3) return baseVolume;
    if (words === 1) return Math.round(baseVolume * 0.8);
    return Math.round(baseVolume * 0.6); // 4+ words
  }

  /**
   * Estimate keyword difficulty based on characteristics
   */
  estimateKeywordDifficulty(keyword) {
    const words = keyword.split(' ');
    let difficulty = 50; // Base difficulty

    // Adjust for specific terms
    const highDifficultyTerms = ['free', 'game', 'story', 'romance'];
    const lowDifficultyTerms = ['simulator', 'visual novel', 'otome', 'chatbot'];

    const hasHighDiffTerm = words.some(w => highDifficultyTerms.includes(w.toLowerCase()));
    const hasLowDiffTerm = words.some(w => lowDifficultyTerms.includes(w.toLowerCase()));

    if (hasHighDiffTerm) difficulty += 20;
    if (hasLowDiffTerm) difficulty -= 15;

    // Longer keywords are often less competitive
    if (words.length >= 3) difficulty -= 10;

    return Math.max(1, Math.min(100, difficulty));
  }

  /**
   * Estimate competition level from difficulty
   */
  estimateCompetition(difficulty) {
    if (difficulty <= 45) return 'low';
    if (difficulty <= 65) return 'medium';
    return 'high';
  }

  /**
   * Categorize keyword based on its content
   */
  categorizeKeyword(keyword) {
    const lowerKeyword = keyword.toLowerCase();

    if (lowerKeyword.includes('romance') || lowerKeyword.includes('love') || lowerKeyword.includes('dating')) {
      return 'romance';
    }
    if (lowerKeyword.includes('story') || lowerKeyword.includes('fiction') || lowerKeyword.includes('narrative')) {
      return 'stories';
    }
    if (lowerKeyword.includes('otome') || lowerKeyword.includes('episode') || lowerKeyword.includes('visual novel')) {
      return 'spicy';
    }
    if (lowerKeyword.includes('game') || lowerKeyword.includes('simulator') || lowerKeyword.includes('rpg')) {
      return 'games';
    }

    return 'romance'; // Default
  }

  /**
   * Generate reason for suggestion
   */
  getSuggestionReason(keyword, competition, volume) {
    if (competition === 'low') {
      return `Low competition keyword with decent search volume (${volume.toLocaleString()} monthly searches)`;
    } else if (competition === 'medium') {
      return `Moderate competition with high search volume (${volume.toLocaleString()} monthly searches)`;
    }
    return `High volume keyword (${volume.toLocaleString()} monthly searches) - requires strong optimization`;
  }
}

export default new ASORankingService();
