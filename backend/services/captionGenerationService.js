import winston from 'winston';
import databaseService from './database.js';

// Create logger for caption generation service
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'caption-generation' },
  transports: [
    new winston.transports.File({ filename: 'logs/caption-generation-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/caption-generation.log' }),
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
 * Caption Generation Service
 * Generates engaging captions for social media posts with the Blush brand voice
 *
 * Brand Voice Characteristics:
 * - Sex-positive and empowering
 * - Romantic and sensual
 * - Engaging and hook-driven
 * - Platform-appropriate (TikTok, Instagram, YouTube Shorts)
 * - Spiciness-aware (adjusts tone based on content level)
 */
class CaptionGenerationService {
  constructor() {
    this.apiKey = process.env.GLM47_API_KEY;
    this.apiEndpoint = process.env.GLM47_API_ENDPOINT || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
    this.isMockMode = !this.apiKey;
  }

  /**
   * Generate a caption for a story
   *
   * @param {object} story - Story object with title, category, spiciness, tags
   * @param {string} platform - Target platform (tiktok, instagram, youtube_shorts)
   * @param {object} options - Additional options (maxLength, includeCTA, etc.)
   * @returns {Promise<object>} Generated caption with metadata
   */
  async generateCaption(story, platform = 'tiktok', options = {}) {
    const {
      maxLength = 2200, // Instagram max is 2200, TikTok is 150
      includeCTA = true,
      includeEmojis = true,
      hookStyle = 'engaging' // engaging, teaser, question, statement
    } = options;

    logger.info('Caption generation requested', {
      storyId: story._id,
      storyTitle: story.title,
      category: story.category,
      spiciness: story.spiciness,
      platform,
      maxLength,
      hookStyle
    });

    try {
      // Step 1: Analyze story theme and spiciness
      const analysis = this._analyzeStory(story);

      logger.info('Story analysis complete', {
        theme: analysis.theme,
        tone: analysis.tone,
        keywords: analysis.keywords.length,
        suggestedHooks: analysis.suggestedHooks.length
      });

      // Step 2: Generate caption with brand voice
      let caption;

      if (this.isMockMode) {
        caption = await this._generateMockCaption(story, analysis, platform, options);
      } else {
        caption = await this._generateAICaption(story, analysis, platform, options);
      }

      // Step 3: Verify tone is empowering and sex-positive
      const toneCheck = this._verifyTone(caption.text, story.spiciness);

      if (!toneCheck.appropriate) {
        logger.warn('Generated caption failed tone check', {
          issues: toneCheck.issues
        });

        // Regenerate with stricter guidelines
        if (this.isMockMode) {
          caption = await this._generateMockCaption(story, analysis, platform, {
            ...options,
            strictMode: true
          });
        } else {
          caption = await this._generateAICaption(story, analysis, platform, {
            ...options,
            strictMode: true
          });
        }
      }

      // Step 4: Check caption length
      const lengthCheck = this._checkLength(caption.text, maxLength, platform);

      if (!lengthCheck.appropriate) {
        logger.warn('Caption length exceeds platform limit', {
          length: caption.text.length,
          maxLength,
          platform
        });

        // Truncate or regenerate
        caption.text = this._adjustLength(caption.text, maxLength);
      }

      // Step 5: Ensure relevant emojis are included
      if (includeEmojis) {
        caption.text = this._ensureEmojis(caption.text, analysis.emojiSuggestions);
      }

      // Add CTA if requested
      if (includeCTA && !caption.hasCTA) {
        caption.text = this._addCTA(caption.text, platform);
      }

      logger.info('Caption generation successful', {
        finalLength: caption.text.length,
        hasCTA: caption.hasCTA,
        emojiCount: (caption.text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length
      });

      return {
        success: true,
        caption: caption.text,
        metadata: {
          platform,
          spiciness: story.spiciness,
          category: story.category,
          hookStyle: caption.hookStyle,
          hasCTA: caption.hasCTA,
          emojiCount: (caption.text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length,
          characterCount: caption.text.length,
          tone: analysis.tone,
          keywords: analysis.keywords
        }
      };

    } catch (error) {
      logger.error('Caption generation failed', {
        error: error.message,
        stack: error.stack,
        storyId: story._id
      });
      throw error;
    }
  }

  /**
   * Analyze story to extract themes, tone, and keywords
   * @private
   */
  _analyzeStory(story) {
    const { title, category, spiciness, tags = [], chapters = [] } = story;

    // Determine tone based on spiciness
    let tone;
    let theme;
    let emojiSuggestions;

    if (spiciness <= 1) {
      tone = 'sweet romantic';
      theme = 'wholesome love story';
      emojiSuggestions = ['💕', '🌸', '✨', '💗', '🦋', '🌷', '💫', '🥰', '💘', '🌺'];
    } else if (spiciness === 2) {
      tone = 'romantic sexy';
      theme = 'passionate romance';
      emojiSuggestions = ['🔥', '💋', '❤️‍🔥', '💕', '✨', '🌶️', '💗', '🔮', '💫', '😏'];
    } else {
      tone = 'suggestive romantic';
      theme = 'intense attraction';
      emojiSuggestions = ['🔥', '❤️‍🔥', '🌶️', '💋', '😏', '✨', '🔮', '💫', '🌙', '🖤'];
    }

    // Extract keywords from title, category, and tags
    const keywords = [
      ...this._extractKeywords(title),
      category.toLowerCase().replace(/\s+/g, ' '),
      ...tags.map(tag => tag.toLowerCase())
    ].filter(Boolean);

    // Generate suggested hooks based on story elements
    const suggestedHooks = this._generateHooks(story, tone);

    return {
      tone,
      theme,
      keywords,
      emojiSuggestions,
      suggestedHooks,
      spiciness
    };
  }

  /**
   * Extract keywords from text
   * @private
   */
  _extractKeywords(text) {
    if (!text) return [];

    // Common romance keywords to look for
    const keywordPatterns = [
      'love', 'romance', 'passion', 'desire', 'forbidden',
      'secret', 'billionaire', 'ceo', 'professor', 'roommate',
      'enemy', 'lover', 'heart', 'soul', 'touch', 'kiss',
      'spark', 'chemistry', 'tension', 'sensual', 'intense'
    ];

    const found = [];
    const lowerText = text.toLowerCase();

    keywordPatterns.forEach(pattern => {
      if (lowerText.includes(pattern) && !found.includes(pattern)) {
        found.push(pattern);
      }
    });

    return found;
  }

  /**
   * Generate hook suggestions for the story
   * @private
   */
  _generateHooks(story, tone) {
    const { title, category, spiciness } = story;

    const hooks = [];

    // Teaser hooks
    if (tone === 'sweet romantic') {
      hooks.push(`When ${category.split(' ')[0] || 'love'} turns into something more... 💕`);
      hooks.push(`This ${category.toLowerCase()} story will make your heart flutter 🦋`);
    } else if (tone === 'romantic sexy') {
      hooks.push(`The tension between them is unreal 🔥`);
      hooks.push(`You won't believe what happens next... 😏`);
    } else {
      hooks.push(`Some attractions are too powerful to resist ❤️‍🔥`);
      hooks.push(`When desire takes over... 🌶️`);
    }

    // Question hooks
    hooks.push(`Have you ever felt this kind of chemistry? 💫`);
    hooks.push(`Could you handle this level of passion? 🔥`);

    // Statement hooks
    hooks.push(`This scene had me blushing 😳💕`);
    hooks.push(`I'm obsessed with this story ✨📖`);

    return hooks;
  }

  /**
   * Generate mock caption for testing without API
   * @private
   */
  async _generateMockCaption(story, analysis, platform, options) {
    const { title, category, spiciness } = story;
    const { tone, emojiSuggestions, suggestedHooks } = analysis;
    const strictMode = options.strictMode || false;

    // Select a random hook
    const hook = suggestedHooks[Math.floor(Math.random() * suggestedHooks.length)];

    // Build caption based on tone and spiciness
    let captionBody;

    if (spiciness <= 1) {
      captionBody = `This sweet ${category.toLowerCase()} story absolutely made my day! 🌸 The way the characters' love story unfolds is so heartwarming and tender. Perfect for when you need a wholesome romance that'll leave you smiling. 💕`;
    } else if (spiciness === 2) {
      if (strictMode) {
        captionBody = `This ${category.toLowerCase()} story has the perfect amount of spice! 🔥 The chemistry between the characters is absolutely electric. It's romantic, empowering, and honestly - why is it so hot in here? 😏💋 Sex-positive romance at its finest! ✨`;
      } else {
        captionBody = `The tension in this ${category.toLowerCase()} story is UNREAL 🔥 The chemistry is off the charts and I am living for every moment. If you love passionate romance with the perfect amount of heat, this is for you! 💋`;
      }
    } else {
      if (strictMode) {
        captionBody = `This intense ${category.toLowerCase()} story had me hooked from the start ❤️‍🔥 The way the attraction builds is absolutely magnetic. It's empowering, romantic, and the tension? Chef's kiss 🌶️✨ Mature audiences who know what they want will LOVE this!`;
      } else {
        captionBody = `Some attractions are too powerful to ignore... ❤️‍🔥 This ${category.toLowerCase()} story brings the heat in the best way possible. The desire, the tension, the intensity - it's all there. 🔥`;
      }
    }

    // Combine parts
    let fullCaption = `${hook}\n\n${captionBody}`;

    // Add emojis if requested
    if (options.includeEmojis !== false) {
      // Ensure we have some emojis in the body
      const emojisToAdd = emojiSuggestions.slice(0, 3);
      emojisToAdd.forEach(emoji => {
        if (!fullCaption.includes(emoji)) {
          fullCaption += ` ${emoji}`;
        }
      });
    }

    // Add CTA if requested
    const hasCTA = options.includeCTA !== false;
    if (hasCTA) {
      fullCaption = this._addCTA(fullCaption, platform);
    }

    return {
      text: fullCaption,
      hookStyle: 'engaging',
      hasCTA
    };
  }

  /**
   * Generate AI caption using GLM4.7 API
   * @private
   */
  async _generateAICaption(story, analysis, platform, options) {
    const { title, category, spiciness, tags = [] } = story;
    const { tone, suggestedHooks } = analysis;
    const strictMode = options.strictMode || false;

    // Build prompt for AI
    const systemPrompt = this._buildSystemPrompt(tone, spiciness, platform, strictMode);
    const userPrompt = this._buildUserPrompt(story, analysis, platform, options);

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'glm-4',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.8,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error(`GLM4.7 API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const caption = data.choices[0].message.content.trim();

      logger.info('AI caption generated', {
        captionLength: caption.length,
        model: data.model
      });

      return {
        text: caption,
        hookStyle: 'engaging',
        hasCTA: caption.toLowerCase().includes('link') || caption.toLowerCase().includes('bio')
      };

    } catch (error) {
      logger.error('AI caption generation failed, falling back to mock', {
        error: error.message
      });

      // Fallback to mock generation
      return await this._generateMockCaption(story, analysis, platform, options);
    }
  }

  /**
   * Build system prompt for AI
   * @private
   */
  _buildSystemPrompt(tone, spiciness, platform, strictMode) {
    let prompt = `You are a social media caption writer for the Blush app - a romantic fiction platform.

**Brand Voice:**
- Sex-positive and empowering
- Romantic and sensual
- Engaging with strong hooks
- Platform-appropriate

**Current Tone:** ${tone.toUpperCase()}
**Spiciness Level:** ${spiciness}/3
**Platform:** ${platform}

**Tone Guidelines:**
`;

    if (spiciness <= 1) {
      prompt += `
- Sweet, romantic, wholesome
- Focus on emotional connection
- Light emojis: 💕 🌸 ✨ 💗 🦋
- Keep content PG-13
- Keywords: romance, love story, heartwarming, sweet, tender, wholesome`;
    } else if (spiciness === 2) {
      prompt += `
- Romantic and sexy, empowering
- Focus on chemistry and tension
- Moderate emojis: 🔥 💋 ❤️‍🔥 💕 ✨
- Sex-positive and confident
- Keywords: spicy, romance, passionate, chemistry, tension, steamy`;
    } else {
      prompt += `
- Suggestive and intense
- Focus on desire and attraction
- Minimal emojis: 🔥 ❤️‍🔥 🌶️ 💋
- Keep it suggestive, not explicit
- Use innuendo and double entendre
- Ensure content meets platform guidelines`;
    }

    if (strictMode) {
      prompt += `\n\n**STRICT MODE:** Be extra careful to keep content sex-positive, empowering, and appropriate for the platform. Avoid any potentially problematic language.`;
    }

    prompt += `

**Caption Structure:**
1. Start with an engaging hook (teaser, question, or statement)
2. 1-2 sentences describing the story vibe
3. Include relevant emojis (but don't overuse)
4. End with a CTA if appropriate

**Length Limits:**
- TikTok: 150 characters max
- Instagram: 2200 characters max
- YouTube Shorts: 500 characters max

Generate a caption that feels authentic, engaging, and perfectly captures the romantic vibe!`;

    return prompt;
  }

  /**
   * Build user prompt for AI
   * @private
   */
  _buildUserPrompt(story, analysis, platform, options) {
    const { title, category, tags = [] } = story;
    const { keywords, suggestedHooks } = analysis;

    let prompt = `Generate a social media caption for this story:\n\n`;
    prompt += `**Title:** ${title}\n`;
    prompt += `**Category:** ${category}\n`;
    prompt += `**Tags:** ${tags.join(', ') || 'none'}\n`;
    prompt += `**Platform:** ${platform}\n`;
    prompt += `**Keywords to include:** ${keywords.slice(0, 5).join(', ')}\n`;

    if (options.hookStyle === 'engaging') {
      prompt += `\nStart with an engaging hook that grabs attention immediately.`;
    }

    if (options.maxLength) {
      prompt += `\n\nKeep it under ${options.maxLength} characters.`;
    }

    return prompt;
  }

  /**
   * Verify caption tone is appropriate
   * @private
   */
  _verifyTone(caption, spiciness) {
    const issues = [];
    const captionLower = caption.toLowerCase();

    // Check for problematic words/phrases
    const problematicTerms = {
      3: ['explicit', 'graphic', 'vulgar', 'crude']
    };

    if (spiciness === 3 && problematicTerms[3]) {
      problematicTerms[3].forEach(term => {
        if (captionLower.includes(term)) {
          issues.push(`Contains inappropriate term: ${term}`);
        }
      });
    }

    // Ensure it's not too explicit
    const explicitIndicators = ['nsfw', 'xxx', 'porn', 'explicit content'];
    explicitIndicators.forEach(indicator => {
      if (captionLower.includes(indicator)) {
        issues.push(`Contains explicit indicator: ${indicator}`);
      }
    });

    // Check for empowering language
    const empoweringTerms = ['empowering', 'confident', 'own it', 'unapologetic'];
    const hasEmpoweringLanguage = empoweringTerms.some(term =>
      captionLower.includes(term)
    );

    const appropriate = issues.length === 0;

    return {
      appropriate,
      issues,
      hasEmpoweringLanguage: appropriate ? hasEmpoweringLanguage : false
    };
  }

  /**
   * Check caption length
   * @private
   */
  _checkLength(text, maxLength, platform) {
    const length = text.length;
    const appropriate = length <= maxLength;

    return {
      appropriate,
      length,
      maxLength,
      platform,
      overBy: appropriate ? 0 : length - maxLength
    };
  }

  /**
   * Adjust caption to fit length limit
   * @private
   */
  _adjustLength(text, maxLength) {
    if (text.length <= maxLength) {
      return text;
    }

    // Try to truncate at a sentence boundary
    const sentences = text.split(/[.!?]+/);
    let result = '';

    for (const sentence of sentences) {
      if ((result + sentence).length <= maxLength - 10) {
        result += sentence + '. ';
      } else {
        break;
      }
    }

    // If still too long, just truncate
    if (result.length > maxLength) {
      result = text.substring(0, maxLength - 3) + '...';
    }

    return result.trim();
  }

  /**
   * Ensure emojis are included
   * @private
   */
  _ensureEmojis(text, suggestions) {
    // Count existing emojis
    const emojiCount = (text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;

    // If we have some emojis, return as-is
    if (emojiCount >= 2) {
      return text;
    }

    // Add 2-3 emojis from suggestions
    const emojisToAdd = suggestions.slice(0, 3 - emojiCount);
    let result = text;

    emojisToAdd.forEach((emoji, index) => {
      if (!result.includes(emoji)) {
        // Add emoji at different positions
        const position = Math.floor((index + 1) * result.length / (emojisToAdd.length + 1));
        result = result.slice(0, position) + ` ${emoji} ` + result.slice(position);
      }
    });

    return result;
  }

  /**
   * Add call-to-action
   * @private
   */
  _addCTA(text, platform) {
    const ctas = {
      tiktok: '\n\n🔗 Get the Blush app - Link in bio!\n\nRead more romantic stories on Blush 💕\n\n#blushapp #romance #reading #booktok #blushstories',
      instagram: '\n\n📖 Get the Blush app - Link in bio!\n\nDiscover thousands of romantic stories on Blush ✨\n\n#blushapp #romancebooks #bookstagram #readingcommunity #blushstories',
      youtube_shorts: '\n\n🔗 Subscribe & download the Blush app!\n\nMore romantic stories await on Blush 💕\n\n#blushapp #romance #shorts #blushstories'
    };

    const cta = ctas[platform] || ctas.tiktok;

    // Check if already has CTA (more comprehensive check)
    const hasCTA = text.toLowerCase().includes('link in bio') ||
                   text.toLowerCase().includes('subscribe') ||
                   text.toLowerCase().includes('read more') ||
                   text.toLowerCase().includes('blush app') ||
                   text.toLowerCase().includes('download blush');

    if (hasCTA) {
      return text;
    }

    return text + cta;
  }
}

// Create singleton instance
const captionGenerationService = new CaptionGenerationService();

export default captionGenerationService;
