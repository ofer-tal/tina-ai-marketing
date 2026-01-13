import winston from 'winston';

// Create logger for hook generation service
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'hook-generation' },
  transports: [
    new winston.transports.File({ filename: 'logs/hook-generation-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/hook-generation.log' }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

/**
 * Hook Generation Service
 * Generates engaging text hooks for social media posts based on story content
 *
 * Text hooks are critical for capturing attention in the first 3 seconds
 * of viewing content on platforms like TikTok, Instagram Reels, and YouTube Shorts.
 *
 * Hook Types:
 * 1. Question Hook - Ask intriguing question
 * 2. Statement Hook - Bold, controversial statement
 * 3. Story Hook - Tease dramatic moment
 * 4. Relatable Hook - Common situation/experience
 * 5. Curiosity Hook - Hint at secret/reveal
 */
class HookGenerationService {
  constructor() {
    this.maxHookLength = 280; // Twitter/social media character limit
  }

  /**
   * Generate text hooks based on story content
   *
   * @param {object} story - Story object with title, description, chapters, category, spiciness
   * @param {object} options - Generation options
   * @param {number} options.count - Number of hooks to generate (default: 5)
   * @param {string} options.hookType - Specific hook type (optional)
   * @param {boolean} options.includeEmojis - Include emojis in hooks (default: true)
   * @returns {object} Generated hooks with metadata
   */
  async generateHooks(story, options = {}) {
    const {
      count = 5,
      hookType = null,
      includeEmojis = true,
      feedback = null // User feedback for regeneration
    } = options;

    logger.info('Generating text hooks', {
      storyId: story._id,
      storyTitle: story.title,
      spiciness: story.spiciness,
      category: story.category,
      count,
      hookType,
      hasFeedback: !!feedback
    });

    try {
      // Step 1: Analyze story content
      const analysis = this._analyzeStoryContent(story);

      // If feedback is provided, adjust analysis
      if (feedback) {
        const feedbackLower = feedback.toLowerCase();

        if (feedbackLower.includes('sexier') || feedbackLower.includes('more passion')) {
          analysis.tone.push('passionate', 'intense', 'steamy');
          analysis.themes.push('desire', 'chemistry', 'tension');
        } else if (feedbackLower.includes('funny') || feedbackLower.includes('humor')) {
          analysis.tone.push('humorous', 'lighthearted', 'witty');
        } else if (feedbackLower.includes('dramatic') || feedbackLower.includes('intense')) {
          analysis.tone.push('dramatic', 'intense', 'emotional');
        }
      }

      // Step 2: Generate hook variations
      const hooks = this._generateHookVariations(analysis, count, hookType, includeEmojis);

      // Step 3: Score and rank hooks based on engagement patterns
      const rankedHooks = this._scoreAndRankHooks(hooks, analysis);

      // Step 4: Filter to character limit
      const validHooks = rankedHooks.filter(hook =>
        hook.text.length <= this.maxHookLength
      );

      // Step 5: Select best hooks
      const selectedHooks = validHooks.slice(0, count);

      logger.info('Text hooks generated successfully', {
        totalGenerated: hooks.length,
        selectedCount: selectedHooks.length,
        avgLength: Math.round(
          selectedHooks.reduce((sum, h) => sum + h.text.length, 0) / selectedHooks.length
        ),
        topHook: selectedHooks[0]?.text?.substring(0, 50)
      });

      return {
        success: true,
        storyId: story._id,
        storyTitle: story.title,
        analysis: {
          category: story.category,
          spiciness: story.spiciness,
          themes: analysis.themes,
          tone: analysis.tone
        },
        hooks: selectedHooks,
        metadata: {
          totalGenerated: hooks.length,
          selectedCount: selectedHooks.length,
          characterLimit: this.maxHookLength,
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('Failed to generate text hooks', {
        error: error.message,
        stack: error.stack,
        storyId: story._id
      });
      throw error;
    }
  }

  /**
   * Analyze story content to extract key themes and elements
   * @private
   */
  _analyzeStoryContent(story) {
    const themes = [];
    const tone = [];

    // Extract from category
    const categoryThemes = {
      'Contemporary': ['modern love', 'dating', 'relationships', 'career', 'city life'],
      'Historical': ['forbidden love', 'time periods', 'historical romance', 'period drama'],
      'Fantasy': ['magic', 'otherworldly', 'fantasy creatures', 'enchanted', 'destiny'],
      'Paranormal': ['supernatural', 'vampires', 'shifters', 'mysterious', 'dark'],
      'Billionaire': ['wealth', 'power dynamics', 'luxury', 'CEO', 'business romance'],
      'Sports': ['competition', 'athletes', 'underdog', 'team', 'victory'],
      'Small Town': ['community', 'secrets', 'homecoming', 'charming', 'rustic']
    };

    if (categoryThemes[story.category]) {
      themes.push(...categoryThemes[story.category]);
    }

    // Extract from spiciness
    if (story.spiciness <= 1) {
      tone.push('sweet', 'wholesome', 'heartwarming', 'tender');
    } else if (story.spiciness === 2) {
      tone.push('spicy', 'passionate', 'steamy', 'chemistry');
    } else if (story.spiciness === 3) {
      tone.push('intense', 'forbidden', 'scandalous', 'temptation');
    }

    // Extract from title
    const titleWords = story.title.toLowerCase().split(/\s+/);
    const titleThemes = titleWords.filter(word =>
      word.length > 4 &&
      !['with', 'from', 'about', 'into', 'over', 'after'].includes(word)
    );
    themes.push(...titleThemes.slice(0, 3));

    // Extract from description/first chapter
    let excerpt = '';
    if (story.description) {
      excerpt = story.description;
    } else if (story.chapters && story.chapters.length > 0) {
      const firstChapter = story.chapters[0];
      if (firstChapter.content) {
        excerpt = firstChapter.content.substring(0, 500);
      }
    }

    // Look for key phrases in excerpt
    const keyPhrases = [
      'love at first sight', 'forbidden', 'secret', 'betrayal',
      'second chance', 'fake dating', 'enemies to lovers', 'best friend',
      'boss', 'rival', 'marriage of convenience', 'accident', 'pregnant'
    ];

    keyPhrases.forEach(phrase => {
      if (excerpt.toLowerCase().includes(phrase)) {
        themes.push(phrase);
      }
    });

    return {
      themes: [...new Set(themes)], // Remove duplicates
      tone: [...new Set(tone)],
      excerpt: excerpt.substring(0, 200)
    };
  }

  /**
   * Generate multiple hook variations
   * @private
   */
  _generateHookVariations(analysis, count, specificType, includeEmojis) {
    const hooks = [];
    const types = specificType
      ? [specificType]
      : ['question', 'statement', 'story', 'relatable', 'curiosity'];

    const emojis = includeEmojis ? this._getEmojis(analysis.tone) : [];

    // Question hooks
    if (types.includes('question')) {
      hooks.push(...this._generateQuestionHooks(analysis, emojis));
    }

    // Statement hooks
    if (types.includes('statement')) {
      hooks.push(...this._generateStatementHooks(analysis, emojis));
    }

    // Story hooks
    if (types.includes('story')) {
      hooks.push(...this._generateStoryHooks(analysis, emojis));
    }

    // Relatable hooks
    if (types.includes('relatable')) {
      hooks.push(...this._generateRelatableHooks(analysis, emojis));
    }

    // Curiosity hooks
    if (types.includes('curiosity')) {
      hooks.push(...this._generateCuriosityHooks(analysis, emojis));
    }

    return hooks;
  }

  /**
   * Generate question-based hooks
   * @private
   */
  _generateQuestionHooks(analysis, emojis) {
    const themes = analysis.themes.slice(0, 2);
    const hooks = [];

    const templates = [
      `What would you do if ${themes[0] || 'love'} changed everything?`,
      `Can you resist ${themes[0] || 'temptation'} when it's right in front of you?`,
      `Have you ever fallen for someone you shouldn't? ${emojis[0] || '🤔'}`,
      `What's the worst thing that could happen when ${themes[1] || 'desire'} takes over?`,
      `Would you risk it all for ${themes[0] || 'love'}? ${emojis[1] || '💔'}`,
      `Is it worth losing everything for ${themes[1] || 'passion'}?`,
      `How far would you go for true ${themes[0] || 'love'}? ${emojis[0] || '💕'}`
    ];

    templates.forEach(template => {
      hooks.push({
        type: 'question',
        text: template,
        score: 0
      });
    });

    return hooks;
  }

  /**
   * Generate statement-based hooks
   * @private
   */
  _generateStatementHooks(analysis, emojis) {
    const themes = analysis.themes.slice(0, 2);
    const hooks = [];

    const templates = [
      `Some risks are worth taking. ${themes[0] || 'Love'} is one of them. ${emojis[0] || '🔥'}`,
      `I never thought I'd fall for ${themes[1] || 'someone like him'}, but here we are.`,
      `They said it was wrong. They didn't know how it felt. ${emojis[1] || '😏'}`,
      `One moment changed everything between us.`,
      `The heart wants what the heart wants. Even when it's ${themes[0] || 'forbidden'}. ${emojis[0] || '💔'}`,
      `Some love stories are written in the stars. Ours was written in ${themes[1] || 'scandal'}.`,
      `I knew it was a mistake. But I couldn't stay away. ${emojis[1] || '😈'}`
    ];

    templates.forEach(template => {
      hooks.push({
        type: 'statement',
        text: template,
        score: 0
      });
    });

    return hooks;
  }

  /**
   * Generate story teaser hooks
   * @private
   */
  _generateStoryHooks(analysis, emojis) {
    const themes = analysis.themes.slice(0, 2);
    const hooks = [];

    const templates = [
      `The moment our eyes met, I knew ${themes[0] || 'nothing would ever be the same'}.`,
      `One night. One mistake. One ${themes[1] || 'life-changing consequence'}. ${emojis[0] || '😱'}`,
      `He was everything I needed to avoid. And everything I wanted. ${emojis[1] || '🔥'}`,
      `I promised myself I wouldn't fall. But promises are meant to be broken.`,
      `From strangers to lovers to ${themes[0] || 'something more'}. This is our story.`,
      `The line between love and ${themes[1] || 'hate'} has never been thinner. ${emojis[0] || '💔'}`,
      `What happens in ${themes[0] || 'the dark'} doesn't always stay there. ${emojis[1] || '🌙'}`
    ];

    templates.forEach(template => {
      hooks.push({
        type: 'story',
        text: template,
        score: 0
      });
    });

    return hooks;
  }

  /**
   * Generate relatable situation hooks
   * @private
   */
  _generateRelatableHooks(analysis, emojis) {
    const themes = analysis.themes.slice(0, 2);
    const hooks = [];

    const templates = [
      `That moment when you realize ${themes[0] || "he's been in love with you all along"}... ${emojis[0] || '😍'}`,
      `We've all been there. Falling for the one person we shouldn't. ${emojis[1] || '😅'}`,
      `POV: You accidentally caught feelings for your ${themes[1] || 'boss'}. ${emojis[0] || '🫣'}`,
      `When your brain says "run" but your heart says "stay" ${emojis[1] || '💔'}`,
      `Tell me you're in love without telling me you're in love. ${emojis[0] || '🙈'}`,
      `That awkward moment when ${themes[0] || 'the tension'} becomes undeniable. ${emojis[1] || '🔥'}`,
      `Me: I won't fall for him. Also me: *reads ${themes[1] || 'this story'} in one sitting* ${emojis[0] || '😌'}`
    ];

    templates.forEach(template => {
      hooks.push({
        type: 'relatable',
        text: template,
        score: 0
      });
    });

    return hooks;
  }

  /**
   * Generate curiosity/mystery hooks
   * @private
   */
  _generateCuriosityHooks(analysis, emojis) {
    const themes = analysis.themes.slice(0, 2);
    const hooks = [];

    const templates = [
      `You won't believe what happened when ${themes[0] || 'he'} finally confessed... ${emojis[0] || '😱'}`,
      `The secret that could destroy us both. Or make us unstoppable. ${emojis[1] || '🤫'}`,
      `I never expected ${themes[1] || 'this'} to change my life forever.`,
      `Nobody expected them to end up together. Especially not them. ${emojis[0] || '💫'}`,
      `The truth about ${themes[0] || 'us'}? It's more complicated than you think. ${emojis[1] || '🔮'}`,
      `One decision. Two lives. Infinite ${themes[1] || 'possibilities'}.`,
      `What really happens when ${themes[0] || 'nobody is watching'}... ${emojis[0] || '👀'}`
    ];

    templates.forEach(template => {
      hooks.push({
        type: 'curiosity',
        text: template,
        score: 0
      });
    });

    return hooks;
  }

  /**
   * Score hooks based on engagement patterns
   * Higher score = better hook
   * @private
   */
  _scoreAndRankHooks(hooks, analysis) {
    return hooks.map(hook => {
      let score = 0;

      // Length score (prefer shorter hooks under 150 chars)
      if (hook.text.length < 100) score += 10;
      else if (hook.text.length < 150) score += 7;
      else if (hook.text.length < 200) score += 5;
      else score += 2;

      // Question hook bonus (questions perform well)
      if (hook.type === 'question') score += 8;

      // Statement hook bonus (bold statements create engagement)
      if (hook.type === 'statement') score += 7;

      // Relatable hook bonus (POV format is popular)
      if (hook.type === 'relatable' && hook.text.includes('POV')) score += 9;

      // Curiosity hook bonus (mystery drives clicks)
      if (hook.type === 'curiosity') score += 8;

      // Emoji bonus (1-2 emojis optimal)
      const emojiCount = (hook.text.match(/[\u{1F600}-\u{1F64F}]/gu) || []).length;
      if (emojiCount >= 1 && emojiCount <= 2) score += 5;
      else if (emojiCount > 3) score -= 3;

      // Theme relevance bonus
      analysis.themes.forEach(theme => {
        if (hook.text.toLowerCase().includes(theme.toLowerCase())) {
          score += 3;
        }
      });

      // Tone relevance bonus
      analysis.tone.forEach(toneWord => {
        if (hook.text.toLowerCase().includes(toneWord.toLowerCase())) {
          score += 2;
        }
      });

      // Cliffhanger/curiosity words bonus
      const curiosityWords = [
        'secret', 'revealed', 'nobody expected', 'won\'t believe',
        'what happened', 'truth about', 'finally', 'surprise',
        'changed everything', 'couldn\'t', 'didn\'t know', 'never thought',
        'consequence', 'mistake', 'destroy', 'unstoppable', 'one',
        'watching', 'expect', 'happen', 'when', 'believ'
      ];
      curiosityWords.forEach(word => {
        if (hook.text.toLowerCase().includes(word)) {
          score += 4;
        }
      });

      // Engagement words bonus
      const engagementWords = [
        'tell me', 'have you ever', 'would you', 'can you',
        'we\'ve all been there', 'pov', 'that moment'
      ];
      engagementWords.forEach(word => {
        if (hook.text.toLowerCase().includes(word)) {
          score += 5;
        }
      });

      hook.score = score;
      return hook;
    }).sort((a, b) => b.score - a.score); // Sort by score descending
  }

  /**
   * Get appropriate emojis based on tone
   * @private
   */
  _getEmojis(tone) {
    const emojiSets = {
      sweet: ['💕', '🌸', '✨', '🦋', '🌷', '☁️', '🥰', '💗'],
      wholesome: ['💕', '🌸', '✨', '🦋', '🌷', '☁️', '🥰', '💗'],
      spicy: ['🔥', '😏', '💋', '😈', '🌶️', '🥵', '💜', '✨'],
      passionate: ['🔥', '😏', '💋', '😈', '🌶️', '🥵', '💜', '✨'],
      steamy: ['🔥', '😏', '💋', '🌶️', '🥵', '💜', '✨', '😈'],
      intense: ['💔', '🌙', '⚡', '🖤', '😈', '🔥', '💜', '🩸'],
      forbidden: ['💔', '🌙', '⚡', '🖤', '🤫', '🚫', '🔥', '😈'],
      scandalous: ['💔', '🌙', '⚡', '🖤', '🤫', '🚫', '🔥', '😈'],
      temptation: ['🔥', '😏', '🍒', '🌶️', '😈', '💋', '🥵', '✨'],
      tender: ['💕', '🌸', '✨', '🦋', '🌷', '☁️', '💗', '🥰'],
      heartwarming: ['💕', '🌸', '✨', '🦋', '🌷', '☁️', '💗', '🥰']
    };

    // Get emojis for all matching tones
    let selectedEmojis = [];
    tone.forEach(t => {
      if (emojiSets[t]) {
        selectedEmojis.push(...emojiSets[t]);
      }
    });

    // Remove duplicates and return sample
    return [...new Set(selectedEmojis)].slice(0, 8);
  }

  /**
   * Validate hook meets requirements
   *
   * @param {string} hookText - The hook text to validate
   * @returns {object} Validation result
   */
  validateHook(hookText) {
    const errors = [];
    const warnings = [];

    // Check character limit
    if (hookText.length > this.maxHookLength) {
      errors.push(`Hook exceeds ${this.maxHookLength} character limit (${hookText.length} chars)`);
    }

    // Check for cliffhanger or intrigue
    const intrigueWords = [
      'secret', 'revealed', 'nobody expected', 'won\'t believe',
      'what happened', 'truth about', 'finally', 'surprise',
      'changed everything', 'couldn\'t', 'didn\'t know', 'never thought',
      'consequence', 'mistake', 'destroy', 'unstoppable', 'one',
      'watching', 'expect', 'happen', 'when', 'believ'
    ];

    const hasIntrigue = intrigueWords.some(word =>
      hookText.toLowerCase().includes(word)
    );

    if (!hasIntrigue) {
      warnings.push('Hook may lack intrigue or cliffhanger element');
    }

    // Check for engagement elements
    const engagementElements = ['?', 'you', 'your', 'POV', 'me', 'we'];
    const hasEngagement = engagementElements.some(element =>
      hookText.toLowerCase().includes(element.toLowerCase())
    );

    if (!hasEngagement) {
      warnings.push('Hook may lack engagement elements');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      characterCount: hookText.length,
      withinLimit: hookText.length <= this.maxHookLength,
      hasIntrigue,
      hasEngagement
    };
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      service: 'hook-generation',
      status: 'operational',
      maxHookLength: this.maxHookLength,
      supportedHookTypes: [
        'question',
        'statement',
        'story',
        'relatable',
        'curiosity'
      ],
      scoringFactors: [
        'length',
        'hook_type',
        'emoji_count',
        'theme_relevance',
        'tone_relevance',
        'curiosity_words',
        'engagement_words'
      ]
    };
  }
}

// Create and export singleton instance
const hookGenerationService = new HookGenerationService();
export default hookGenerationService;
