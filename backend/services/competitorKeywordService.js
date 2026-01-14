import CompetitorKeyword from '../models/CompetitorKeyword.js';
import ASOKeyword from '../models/ASOKeyword.js';
import appStoreConnectService from './appStoreConnectService.js';

/**
 * Competitor Keyword Service
 * Monitors competitor keyword rankings and strategies
 */
class CompetitorKeywordService {
  /**
   * Get list of known competitor apps in the romance/story category
   */
  getKnownCompetitors() {
    return [
      {
        appId: 'com.episode.romance',
        name: 'Episode',
        category: 'Games',
        subcategory: 'Simulation'
      },
      {
        appId: 'com.chapter.choosing',
        name: 'Chapters',
        category: 'Books',
        subcategory: 'Romance'
      },
      {
        appId: 'com.pixelberry.choosing',
        name: 'Choices',
        category: 'Games',
        subcategory: 'Simulation'
      },
      {
        appId: 'com.your.romance.club',
        name: 'Romance Club',
        category: 'Games',
        subcategory: 'Simulation'
      },
      {
        appId: 'com.lunime.romantic',
        name: 'Love Island',
        category: 'Games',
        subcategory: 'Simulation'
      }
    ];
  }

  /**
   * Identify competitor apps based on category and keyword overlap
   */
  async identifyCompetitors() {
    try {
      const competitors = this.getKnownCompetitors();

      // Add metadata about each competitor
      const enrichedCompetitors = competitors.map(comp => ({
        ...comp,
        identifiedAt: new Date(),
        source: 'category_analysis',
        relevanceScore: Math.floor(Math.random() * 30) + 70 // 70-100 score
      }));

      return {
        total: enrichedCompetitors.length,
        competitors: enrichedCompetitors
      };
    } catch (error) {
      console.error('Error identifying competitors:', error.message);
      throw error;
    }
  }

  /**
   * Fetch competitor ranking for a specific keyword
   * Note: This is a simulated implementation. In production, you would use
   * a third-party ASO tool API or App Store Connect API
   */
  async fetchCompetitorKeywordRanking(competitorAppId, keyword) {
    try {
      // TODO: Replace with actual API call
      // For now, simulate ranking based on keyword difficulty
      // Competitors typically rank better than us on average
      const baseRanking = Math.max(1, Math.floor(Math.random() * 25) + 5);

      return baseRanking;
    } catch (error) {
      console.error(`Error fetching competitor ranking for "${keyword}":`, error.message);
      return null;
    }
  }

  /**
   * Analyze competitor keyword strategy
   */
  async analyzeCompetitorStrategy(competitorAppId) {
    try {
      const competitors = this.getKnownCompetitors();
      const competitor = competitors.find(c => c.appId === competitorAppId);

      if (!competitor) {
        throw new Error(`Competitor ${competitorAppId} not found`);
      }

      // Simulate strategy analysis
      const strategy = {
        competitorAppName: competitor.name,
        totalKeywordsTracked: Math.floor(Math.random() * 50) + 30,
        topKeywords: [],
        keywordDensity: {
          title: (Math.random() * 3 + 1).toFixed(1),
          subtitle: (Math.random() * 5 + 2).toFixed(1),
          description: (Math.random() * 10 + 5).toFixed(1)
        },
        primaryKeywordCategories: [
          'romance',
          'stories',
          'interactive',
          'games'
        ],
        keywordGaps: [], // Will be populated
        strengths: [],
        weaknesses: []
      };

      // Get tracked keywords
      const ourKeywords = await ASOKeyword.find({ target: true }).limit(20);

      // Analyze each keyword
      for (const kw of ourKeywords) {
        const competitorRanking = await this.fetchCompetitorKeywordRanking(competitorAppId, kw.keyword);

        if (competitorRanking !== null) {
          strategy.topKeywords.push({
            keyword: kw.keyword,
            ranking: competitorRanking,
            volume: kw.volume,
            difficulty: kw.difficulty
          });

          // If competitor ranks significantly better, it's a keyword gap
          if (competitorRanking < kw.ranking - 5) {
            strategy.keywordGaps.push({
              keyword: kw.keyword,
              ourRanking: kw.ranking,
              competitorRanking: competitorRanking,
              gap: kw.ranking - competitorRanking,
              priority: kw.difficulty < 50 ? 'high' : 'medium'
            });
          }
        }
      }

      // Sort top keywords by ranking
      strategy.topKeywords.sort((a, b) => a.ranking - b.ranking);
      strategy.topKeywords = strategy.topKeywords.slice(0, 10);

      // Identify strengths (keywords where we rank better)
      strategy.strengths = ourKeywords
        .filter(kw => kw.ranking && kw.ranking < 20)
        .map(kw => ({
          keyword: kw.keyword,
          ranking: kw.ranking,
          volume: kw.volume
        }))
        .slice(0, 5);

      // Identify weaknesses (keywords where we rank poorly)
      strategy.weaknesses = ourKeywords
        .filter(kw => kw.ranking && kw.ranking > 40)
        .map(kw => ({
          keyword: kw.keyword,
          ranking: kw.ranking,
          volume: kw.volume
        }))
        .slice(0, 5);

      return strategy;
    } catch (error) {
      console.error('Error analyzing competitor strategy:', error.message);
      throw error;
    }
  }

  /**
   * Track keyword rankings for a specific competitor
   */
  async trackCompetitorKeywords(competitorAppId) {
    try {
      const ourKeywords = await ASOKeyword.find({ target: true });
      const results = {
        competitorAppId,
        keywordsTracked: 0,
        newTracked: 0,
        updated: 0,
        highOpportunityGaps: 0,
        mediumOpportunityGaps: 0
      };

      for (const kw of ourKeywords) {
        try {
          // Fetch competitor ranking
          const competitorRanking = await this.fetchCompetitorKeywordRanking(competitorAppId, kw.keyword);

          if (competitorRanking === null) continue;

          // Check if we already track this competitor/keyword pair
          let competitorKeyword = await CompetitorKeyword.findOne({
            competitorAppId,
            keyword: kw.keyword
          });

          if (competitorKeyword) {
            // Update existing record
            await competitorKeyword.addRankingSnapshot(kw.ranking, competitorRanking);
            results.updated++;
          } else {
            // Create new record
            competitorKeyword = new CompetitorKeyword({
              competitorAppId,
              competitorAppName: this.getCompetitorName(competitorAppId),
              keyword: kw.keyword,
              ranking: kw.ranking,
              competitorRanking: competitorRanking
            });

            competitorKeyword.calculateRankingDifference();
            competitorKeyword.determineOpportunityLevel();
            await competitorKeyword.save();
            results.newTracked++;
          }

          results.keywordsTracked++;

          // Count opportunities
          if (competitorKeyword.opportunityLevel === 'high') {
            results.highOpportunityGaps++;
          } else if (competitorKeyword.opportunityLevel === 'medium') {
            results.mediumOpportunityGaps++;
          }
        } catch (error) {
          console.error(`Error tracking keyword "${kw.keyword}":`, error.message);
        }
      }

      return results;
    } catch (error) {
      console.error('Error tracking competitor keywords:', error.message);
      throw error;
    }
  }

  /**
   * Identify keyword gaps where competitors outrank us
   */
  async identifyKeywordGaps() {
    try {
      const competitors = this.getKnownCompetitors();
      const allGaps = [];

      for (const competitor of competitors) {
        const competitorKeywords = await CompetitorKeyword.find({
          competitorAppId: competitor.appId,
          opportunityLevel: { $in: ['high', 'medium'] }
        });

        for (const ck of competitorKeywords) {
          allGaps.push({
            competitorAppName: competitor.name,
            competitorAppId: competitor.appId,
            keyword: ck.keyword,
            ourRanking: ck.ranking,
            competitorRanking: ck.competitorRanking,
            gap: ck.rankingDifference,
            opportunityLevel: ck.opportunityLevel,
            trackedSince: ck.trackedSince,
            trend: ck.getRankingTrend(30)
          });
        }
      }

      // Sort by gap size (largest gaps first)
      allGaps.sort((a, b) => Math.abs(a.gap) - Math.abs(b.gap));

      return {
        totalGaps: allGaps.length,
        highOpportunity: allGaps.filter(g => g.opportunityLevel === 'high').length,
        mediumOpportunity: allGaps.filter(g => g.opportunityLevel === 'medium').length,
        gaps: allGaps.slice(0, 20) // Return top 20 gaps
      };
    } catch (error) {
      console.error('Error identifying keyword gaps:', error.message);
      throw error;
    }
  }

  /**
   * Generate competitive insights and recommendations
   */
  async generateCompetitiveInsights() {
    try {
      const competitors = this.getKnownCompetitors();
      const insights = {
        summary: '',
        topGaps: [],
        recommendations: [],
      competitiveThreats: [],
        opportunities: []
      };

      // Get all competitor keyword data
      const allCompetitorKeywords = await CompetitorKeyword.find({});

      if (allCompetitorKeywords.length === 0) {
        insights.summary = 'No competitor keyword data available. Start tracking competitor keywords to generate insights.';
        return insights;
      }

      // Analyze gaps
      const gaps = await this.identifyKeywordGaps();
      insights.topGaps = gaps.gaps.slice(0, 5);

      // Generate summary
      const avgGap = allCompetitorKeywords.reduce((sum, ck) =>
        sum + (ck.rankingDifference || 0), 0) / allCompetitorKeywords.length;

      insights.summary = `Tracking ${allCompetitorKeywords.length} keywords across ${competitors.length} competitors. ` +
        `On average, competitors rank ${Math.abs(Math.round(avgGap))} positions ${avgGap < 0 ? 'better' : 'worse'} than us. ` +
        `Found ${gaps.highOpportunity} high-priority and ${gaps.mediumOpportunity} medium-priority keyword gaps.`;

      // Generate recommendations based on gaps
      for (const gap of insights.topGaps) {
        if (gap.opportunityLevel === 'high') {
          insights.recommendations.push({
            type: 'keyword_gap',
            priority: 'high',
            title: `Optimize for "${gap.keyword}"`,
            description: `We rank #${gap.ourRanking} while ${gap.competitorAppName} ranks #${gap.competitorRanking}. ` +
              `Consider adding this keyword to your app metadata and optimizing content.`,
            keyword: gap.keyword,
            competitor: gap.competitorAppName,
            potentialGain: Math.round((gap.gap / gap.ourRanking) * 100)
          });
        }
      }

      // Identify threats (competitors outranking us on high-value keywords)
      const highValueKeywords = await ASOKeyword.find({
        target: true,
        volume: { $gte: 5000 }
      });

      for (const kw of highValueKeywords) {
        const competitorData = await CompetitorKeyword.find({
          keyword: kw.keyword,
          rankingDifference: { $lt: -5 }
        }).sort({ rankingDifference: 1 });

        if (competitorData.length > 0) {
          insights.competitiveThreats.push({
            keyword: kw.keyword,
            volume: kw.volume,
            ourRanking: kw.ranking,
            threats: competitorData.map(cd => ({
              competitor: cd.competitorAppName,
              ranking: cd.competitorRanking,
              gap: cd.rankingDifference
            }))
          });
        }
      }

      insights.competitiveThreats = insights.competitiveThreats.slice(0, 5);

      // Identify opportunities (keywords where we outrank competitors)
      const ourAdvantages = await CompetitorKeyword.find({
        rankingDifference: { $gt: 5 }
      }).sort({ rankingDifference: -1 }).limit(5);

      insights.opportunities = ourAdvantages.map(ck => ({
        keyword: ck.keyword,
        ourRanking: ck.ranking,
        competitorRanking: ck.competitorRanking,
        advantage: ck.rankingDifference,
        competitorAppName: ck.competitorAppName
      }));

      return insights;
    } catch (error) {
      console.error('Error generating competitive insights:', error.message);
      throw error;
    }
  }

  /**
   * Get competitor keyword data for dashboard display
   */
  async getCompetitorKeywordData() {
    try {
      const competitors = this.getKnownCompetitors();
      const competitorData = [];

      for (const competitor of competitors) {
        const keywords = await CompetitorKeyword.find({
          competitorAppId: competitor.appId
        });

        if (keywords.length === 0) continue;

        const highOpportunity = keywords.filter(k => k.opportunityLevel === 'high').length;
        const mediumOpportunity = keywords.filter(k => k.opportunityLevel === 'medium').length;
        const avgGap = keywords.reduce((sum, k) => sum + (k.rankingDifference || 0), 0) / keywords.length;

        competitorData.push({
          competitorAppId: competitor.appId,
          competitorAppName: competitor.name,
          keywordsTracked: keywords.length,
          highOpportunityGaps: highOpportunity,
          mediumOpportunityGaps: mediumOpportunity,
          averageGap: Math.round(avgGap * 10) / 10,
          lastChecked: keywords[0].lastCheckedAt
        });
      }

      return competitorData;
    } catch (error) {
      console.error('Error getting competitor keyword data:', error.message);
      throw error;
    }
  }

  /**
   * Get keyword history for a competitor
   */
  async getCompetitorKeywordHistory(competitorAppId, keyword, days = 30) {
    try {
      const competitorKeyword = await CompetitorKeyword.findOne({
        competitorAppId,
        keyword
      });

      if (!competitorKeyword) {
        return null;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const history = competitorKeyword.rankingHistory
        .filter(entry => entry.date >= cutoffDate)
        .sort((a, b) => a.date - b.date);

      return {
        keyword,
        competitorAppName: competitorKeyword.competitorAppName,
        currentOurRanking: competitorKeyword.ranking,
        currentCompetitorRanking: competitorKeyword.competitorRanking,
        currentGap: competitorKeyword.rankingDifference,
        opportunityLevel: competitorKeyword.opportunityLevel,
        trend: competitorKeyword.getRankingTrend(days),
        history: history
      };
    } catch (error) {
      console.error('Error getting competitor keyword history:', error.message);
      throw error;
    }
  }

  /**
   * Helper: Get competitor name from app ID
   */
  getCompetitorName(appId) {
    const competitors = this.getKnownCompetitors();
    const competitor = competitors.find(c => c.appId === appId);
    return competitor ? competitor.name : appId;
  }
}

export default new CompetitorKeywordService();
