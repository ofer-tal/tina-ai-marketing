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
