/**
 * Medium Article Generator Service
 * AI-powered Medium article creation with Medium-specific formatting
 */

const mediumArticleGenerator = {
  cache: new Map(),
  cacheTimeout: 5 * 60 * 1000, // 5 minutes

  /**
   * Generate a Medium article outline
   */
  async generateOutline(config) {
    const { topic, targetAudience, tone, keywords } = config;

    const prompt = `You are a Medium article writer. Create a detailed outline for a Medium article.

Topic: ${topic}
Target Audience: ${targetAudience}
Tone: ${tone}
Keywords: ${keywords.join(', ')}

Medium articles should:
- Have compelling, click-worthy titles
- Use storytelling and personal anecdotes
- Include data-driven insights
- Be scannable with short paragraphs
- Use subheadings effectively
- End with actionable takeaways
- Be 800-1500 words typically

Create a JSON response with:
{
  "titleOptions": ["3-5 catchy title options"],
  "subtitle": "A compelling subtitle/description",
  "outline": [
    {
      "section": "Section title",
      "points": ["key point 1", "key point 2"],
      "estimatedWords": 200
    }
  ],
  "callToAction": "Engaging CTA for comments/claps",
  "tags": ["relevant", "Medium", "tags"],
  "estimatedReadingTime": 5
}`;

    try {
      // Import glmService dynamically to avoid circular dependencies
      const glmService = await import('../services/glmService.js');
      const response = await glmService.default.createMessage({
        messages: [
          { role: 'user', content: prompt }
        ],
        maxTokens: 2048,
        temperature: 0.7
      });
      const outline = this.parseJsonResponse(response.content[0].text);

      // Cache the outline
      const cacheKey = `outline-${JSON.stringify(config)}`;
      this.cache.set(cacheKey, { data: outline, timestamp: Date.now() });

      return outline;
    } catch (error) {
      console.error('Error generating Medium outline:', error);

      // Return mock outline on rate limit or error
      if (error.message.includes('Rate limited') || error.message.includes('429')) {
        console.log('API rate limited, returning mock outline');
        return this.getMockOutline(config);
      }

      throw new Error('Failed to generate Medium article outline');
    }
  },

  /**
   * Generate mock outline for testing/rate limit fallback
   */
  getMockOutline(config) {
    const { topic, targetAudience, tone, keywords } = config;

    return {
      titleOptions: [
        `The Ultimate Guide to ${topic}`,
        `How ${topic} is Changing the Game`,
        `Everything You Need to Know About ${topic}`,
        `${topic}: A Comprehensive Overview`,
        `Why ${topic} Matters More Than Ever`
      ],
      subtitle: `An in-depth exploration of ${topic} for ${targetAudience}. Learn key insights, strategies, and practical tips.`,
      outline: [
        {
          section: "Introduction: Hook Your Readers",
          points: [
            "Start with a compelling story or statistic",
            "Introduce the main problem or opportunity",
            "Set expectations for what readers will learn"
          ],
          estimatedWords: 150
        },
        {
          section: "Understanding the Basics",
          points: [
            "Define key concepts and terminology",
            "Provide context and background",
            "Explain why this topic matters now"
          ],
          estimatedWords: 200
        },
        {
          section: "Key Strategies and Approaches",
          points: [
            "Strategy 1: Practical implementation",
            "Strategy 2: Best practices",
            "Strategy 3: Common pitfalls to avoid"
          ],
          estimatedWords: 300
        },
        {
          section: "Real-World Examples",
          points: [
            "Case study 1: Success story",
            "Case study 2: Lessons learned",
            "Actionable insights you can apply"
          ],
          estimatedWords: 250
        },
        {
          section: "Taking Action: Next Steps",
          points: [
            "Immediate actions readers can take",
            "Resources for further learning",
            "How to measure success"
          ],
          estimatedWords: 200
        },
        {
          section: "Conclusion and Key Takeaways",
          points: [
            "Summarize main points",
            "Provide final encouragement",
            "Call to action for engagement"
          ],
          estimatedWords: 100
        }
      ],
      callToAction: "If you found this article helpful, please clap and follow for more insights on " + keywords[0] + ". Share your thoughts in the comments below!",
      tags: [...keywords.slice(0, 3), topic.split(' ')[0], 'Insights'],
      estimatedReadingTime: 6
    };
  },

  /**
   * Generate full Medium article content from outline
   */
  async generateContent(outline, config) {
    const { topic, tone, targetAudience } = config;

    const prompt = `You are a Medium writer. Write a full Medium article based on this outline.

Topic: ${topic}
Tone: ${tone}
Target Audience: ${targetAudience}

Outline:
${JSON.stringify(outline, null, 2)}

Medium writing style:
- Start with a compelling hook (story, stat, or question)
- Use short paragraphs (2-3 sentences max)
- Include bullet points for readability
- Use bold text for emphasis
- Add images suggestions [IMAGE: description]
- Include relevant data and examples
- Make it conversational but authoritative
- End with strong insights and CTA
- Use formatting: ### for subheadings, **bold**, *italic*

Write the article in markdown format. Target 1000-1200 words.`;

    try {
      const glmService = await import('../services/glmService.js');
      const response = await glmService.default.createMessage({
        messages: [
          { role: 'user', content: prompt }
        ],
        maxTokens: 4096,
        temperature: 0.8
      });
      const content = this.parseMarkdownResponse(response.content[0].text);

      return content;
    } catch (error) {
      console.error('Error generating Medium content:', error);

      // Return mock content on rate limit or error
      if (error.message.includes('Rate limited') || error.message.includes('429')) {
        console.log('API rate limited, returning mock content');
        return this.getMockContent(outline, config);
      }

      throw new Error('Failed to generate Medium article content');
    }
  },

  /**
   * Generate mock content for testing/rate limit fallback
   */
  getMockContent(outline, config) {
    const { topic, targetAudience } = config;

    let content = `# ${outline.titleOptions[0]}

${outline.subtitle}

---

## Introduction: Hook Your Readers

Did you know that **${topic}** is transforming how ${targetAudience} work and live? In today's fast-paced world, understanding this topic isn't just optional—it's essential.

*Here's what you'll learn:*
- The fundamentals of ${topic}
- Practical strategies you can implement today
- Real-world examples from industry leaders
- Actionable next steps to get started

Let's dive in.

## Understanding the Basics

**What is ${topic} exactly?**

At its core, ${topic} represents a fundamental shift in how we approach problems. It's not just about technology—it's about mindset, strategy, and execution.

> "The key to success is understanding that ${topic} is a journey, not a destination."

[IMAGE: Professional illustration showing the concept of ${topic} in a modern business setting]

### Why This Matters Now

The timing couldn't be better. Here's why:

1. **Market Demand**: Interest in ${topic} has grown 300% in the past year
2. **Competitive Advantage**: Early adopters are seeing significant results
3. **Accessibility**: Tools and resources are more available than ever

## Key Strategies and Approaches

### Strategy 1: Start Small, Think Big

The biggest mistake? Trying to do everything at once. Instead:

* Break down your approach into manageable steps
* Focus on quick wins that build momentum
- Measure what matters and iterate quickly

### Strategy 2: Leverage Existing Tools

You don't need to reinvent the wheel. Successful practitioners of ${topic} use:

- Automation tools to scale efforts
- Analytics to track progress
- Community resources to learn from others

[IMAGE: Dashboard showing analytics and metrics related to ${topic}]

### Strategy 3: Avoid Common Pitfalls

Watch out for these traps:

❌ **Jumping without planning** – Create a strategy first
❌ **Ignoring data** – Let metrics guide decisions
❌ **Going it alone** – Build a support network

## Real-World Examples

### Case Study 1: Success Story

*Company X* implemented ${topic} strategies and saw:

- **150% increase** in engagement
- **40% reduction** in costs
- **3x improvement** in customer satisfaction

The key? They started with a clear goal and measured everything.

### Case Study 2: Lessons Learned

*Organization Y* faced challenges but learned valuable lessons:

> "Our initial approach was too broad. By focusing on specific use cases, we saw much better results."

Their advice? **Start narrow, then expand.**

## Taking Action: Next Steps

### Immediate Actions (This Week)

1. **Assess your current situation** – Where are the opportunities?
2. **Identify quick wins** – What can you implement immediately?
3. **Set up tracking** – How will you measure success?

### Resources for Further Learning

- Online courses and tutorials
- Community forums and groups
- Industry publications and research

### How to Measure Success

Track these key metrics:

- Engagement rates
- Conversion improvements
- Cost savings
- Time efficiency gains

[IMAGE: Infographic showing key performance indicators for ${topic}]

## Conclusion and Key Takeaways

We've covered a lot of ground. Let's recap:

✅ **${topic}** is essential for modern success
✅ Start with a clear strategy and measurable goals
✅ Learn from others' experiences
✅ Take action—even small steps count

**The best time to start was yesterday. The second best time is now.**

---

${outline.callToAction}

---

*What's your experience with ${topic}? Share your thoughts in the comments below!*

**Liked this article?**
- 👏 Clap to show your appreciation
- ❤️ Follow for more insights
- 🔄 Share with your network
`;

    return content;
  },

  /**
   * Generate complete Medium article (outline + content in one step)
   */
  async generateCompleteArticle(config) {
    try {
      // Generate outline
      const outline = await this.generateOutline(config);

      // Generate content from outline
      const content = await this.generateContent(outline, config);

      // Combine into complete article
      const article = {
        title: outline.titleOptions[0],
        subtitle: outline.subtitle,
        content,
        tags: outline.tags,
        callToAction: outline.callToAction,
        estimatedReadingTime: outline.estimatedReadingTime,
        wordCount: this.countWords(content),
        status: 'draft',
        createdAt: new Date(),
        metadata: {
          topic: config.topic,
          targetAudience: config.targetAudience,
          tone: config.tone,
          keywords: config.keywords
        }
      };

      return article;
    } catch (error) {
      console.error('Error generating complete Medium article:', error);
      throw error;
    }
  },

  /**
   * Format content specifically for Medium
   */
  formatForMedium(content) {
    // Medium-specific formatting rules
    let formatted = content;

    // Ensure proper heading hierarchy
    formatted = formatted.replace(/^# /gm, ''); // Remove h1 (title is separate)
    formatted = formatted.replace(/^## /gm, '## '); // Keep h2 as main sections
    formatted = formatted.replace(/^### /gm, '### '); // Keep h3 as subsections

    // Format bullet points
    formatted = formatted.replace(/^\* /gm, '* ');
    formatted = formatted.replace(/^• /gm, '* ');

    // Ensure proper paragraph breaks
    formatted = formatted.replace(/\n\n\n+/g, '\n\n');

    // Add image placeholder formatting
    formatted = formatted.replace(/\[IMAGE:([^\]]+)\]/g, (match, desc) => {
      return `![${desc}](https://via.placeholder.com/800x450?text=${encodeURIComponent(desc)})`;
    });

    // Format bold and italic
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '**$1**');
    formatted = formatted.replace(/\*(.+?)\*/g, '*$1*');

    return formatted;
  },

  /**
   * Optimize for Medium's SEO
   */
  generateMediumSEO(article) {
    const wordCount = this.countWords(article.content);
    const readingTime = Math.ceil(wordCount / 265); // Medium's calculation

    return {
      title: article.title,
      subtitle: article.subtitle || this.generateSubtitle(article.content),
      tags: article.tags.slice(0, 5), // Medium allows max 5 tags
      readingTime,
      wordCount,
      publishFormat: 'markdown',
      estimatedClaps: this.estimateClaps(article),
      featuredImage: this.suggestFeaturedImage(article)
    };
  },

  /**
   * Generate subtitle from content
   */
  generateSubtitle(content) {
    // Extract first sentence or create from key themes
    const firstParagraph = content.split('\n\n')[0].replace(/^#+\s*/, '').substring(0, 150);
    return firstParagraph.length > 140
      ? firstParagraph.substring(0, 140) + '...'
      : firstParagraph;
  },

  /**
   * Suggest featured image
   */
  suggestFeaturedImage(article) {
    return {
      description: `Featured image for article: ${article.title}`,
      suggestedKeywords: article.tags.slice(0, 3).join(', '),
      recommendedSize: '1600x840 (Medium recommended)',
      format: 'JPG or PNG'
    };
  },

  /**
   * Estimate potential claps (engagement metric)
   */
  estimateClaps(article) {
    // Basic estimation based on content quality indicators
    let score = 50; // Base score

    const content = article.content.toLowerCase();

    // Positive indicators
    if (content.includes('data') || content.includes('research')) score += 20;
    if (content.includes('story') || content.includes('experience')) score += 15;
    if (content.includes('step') || content.includes('guide')) score += 10;
    if (article.tags.length > 0) score += 10;

    return {
      min: Math.floor(score * 0.5),
      avg: score,
      max: Math.floor(score * 2),
      factors: ['quality', 'relevance', 'timing', 'distribution']
    };
  },

  /**
   * Count words in content
   */
  countWords(content) {
    return content.trim().split(/\s+/).length;
  },

  /**
   * Parse JSON response from AI
   */
  parseJsonResponse(response) {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      console.error('Error parsing JSON response:', error);
      throw error;
    }
  },

  /**
   * Parse markdown content
   */
  parseMarkdownResponse(response) {
    // Remove JSON wrapper if present
    let content = response;

    // Try to extract markdown from JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        content = parsed.content || parsed.article || parsed.markdown || response;
      } catch (e) {
        // Keep original content if JSON parse fails
      }
    }

    // Remove code blocks if present
    content = content.replace(/```markdown\n?/g, '');
    content = content.replace(/```\n?/g, '');

    return content.trim();
  },

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    return { success: true, message: 'Medium article generator cache cleared' };
  },

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
};

export default mediumArticleGenerator;
