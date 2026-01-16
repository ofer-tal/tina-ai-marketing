/**
 * Press Release Generator Service
 * AI-powered press release generation for app updates and announcements
 */

import glmService from './glmService.js';

class PressReleaseGenerator {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Generate press release outline
   */
  async generateOutline(updates, tone = 'professional') {
    const cacheKey = `outline:${JSON.stringify(updates)}:${tone}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const prompt = this._createOutlinePrompt(updates, tone);
      const response = await glmService.createMessage([
        {
          role: 'system',
          content: 'You are an expert public relations professional specializing in tech press releases. You create compelling, newsworthy press releases that follow industry best practices.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]);

      const outline = this._parseOutlineResponse(response);
      this.cache.set(cacheKey, outline);
      setTimeout(() => this.cache.delete(cacheKey), this.cacheTimeout);

      return outline;
    } catch (error) {
      console.error('Error generating press release outline:', error);
      return this.getMockOutline(updates, tone);
    }
  }

  /**
   * Generate full press release content
   */
  async generateContent(outline, updates, tone = 'professional') {
    try {
      const prompt = this._createContentPrompt(outline, updates, tone);
      const response = await glmService.createMessage([
        {
          role: 'system',
          content: 'You are an expert public relations professional specializing in tech press releases. You write compelling, concise, and newsworthy content in inverted pyramid style.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]);

      return this._parseContentResponse(response);
    } catch (error) {
      console.error('Error generating press release content:', error);
      return this.getMockContent(outline, updates);
    }
  }

  /**
   * Generate complete press release (outline + content)
   */
  async generateCompleteRelease(updates, tone = 'professional', companyInfo = {}) {
    try {
      // Generate outline first
      const outline = await this.generateOutline(updates, tone);

      // Generate full content from outline
      const content = await this.generateContent(outline, updates, tone);

      // Add company info and contact details
      const pressRelease = {
        ...outline,
        ...content,
        companyInfo: {
          name: companyInfo.name || 'Blush App',
          website: companyInfo.website || 'https://blush.app',
          contactEmail: companyInfo.contactEmail || 'press@blush.app',
          contactPhone: companyInfo.contactPhone || '',
          ...companyInfo
        },
        generatedAt: new Date().toISOString()
      };

      return pressRelease;
    } catch (error) {
      console.error('Error generating complete press release:', error);
      throw error;
    }
  }

  /**
   * Format press release for distribution
   */
  formatForDistribution(pressRelease, format = 'standard') {
    const formatted = {
      ...pressRelease,
      formattedAt: new Date().toISOString()
    };

    if (format === 'prnewswire' || format === 'businesswire') {
      // Add distribution service specific fields
      formatted.distributionFormat = format;
      formatted.readyForDistribution = true;
    }

    return formatted;
  }

  /**
   * Create outline prompt
   */
  _createOutlinePrompt(updates, tone) {
    return `Create a press release outline for the following app updates:

App Name: Blush (romantic AI story generator app)
Updates: ${JSON.stringify(updates, null, 2)}
Tone: ${tone}

Please provide a structured outline including:
1. Headline options (3-5 variations)
2. Dateline information
3. Key points to cover (3-5 bullet points)
4. Suggested quotes from company spokesperson
5. Call to action
6. Boilerplate text suggestion

Respond in JSON format with this structure:
{
  "headlineOptions": ["headline1", "headline2", ...],
  "dateline": "CITY, State – Month DD, YYYY",
  "keyPoints": ["point1", "point2", ...],
  "suggestedQuotes": [
    {"quote": "quote text", "attributedTo": "Name, Title"}
  ],
  "callToAction": "action text",
  "boilerplate": "company description"
}`;
  }

  /**
   * Create content prompt
   */
  _createContentPrompt(outline, updates, tone) {
    return `Write a complete press release based on this outline:

${JSON.stringify(outline, null, 2)}

Updates being announced:
${JSON.stringify(updates, null, 2)}

Tone: ${tone}

Write in inverted pyramid style:
- Start with most important information
- Include a compelling headline
- Write a strong lead paragraph (who, what, when, where, why)
- Include 2-3 body paragraphs with details
- Add at least one quote
- End with call to action and boilerplate

Keep it concise (300-500 words) and newsworthy. Avoid marketing fluff.

Respond in JSON format:
{
  "headline": "selected headline",
  "dateline": "CITY, State – Month DD, YYYY",
  "leadParagraph": "opening paragraph",
  "bodyParagraphs": ["paragraph1", "paragraph2", ...],
  "quotes": [
    {"quote": "quote text", "attributedTo": "Name, Title", "context": "context"}
  ],
  "callToAction": "action text",
  "boilerplate": "company description",
  "aboutSection": "About Blush",
  "mediaContact": {
    "name": "Contact Name",
    "email": "press@blush.app",
    "phone": "optional phone"
  }
}`;
  }

  /**
   * Parse outline response
   */
  _parseOutlineResponse(response) {
    try {
      const content = response.content || response;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      console.error('Error parsing outline response:', error);
      return {
        headlineOptions: ['Blush App Releases Major Update'],
        dateline: 'SAN FRANCISCO, CA – January 16, 2026',
        keyPoints: ['New features', 'Improved performance', 'Enhanced user experience'],
        suggestedQuotes: [{ quote: 'We are excited...', attributedTo: 'CEO' }],
        callToAction: 'Download now on the App Store',
        boilerplate: 'About Blush App'
      };
    }
  }

  /**
   * Parse content response
   */
  _parseContentResponse(response) {
    try {
      const content = response.content || response;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      console.error('Error parsing content response:', error);
      return {
        headline: 'Blush App Releases Major Update',
        dateline: 'SAN FRANCISCO, CA – January 16, 2026',
        leadParagraph: 'Blush App today announced a major update...',
        bodyParagraphs: ['Paragraph 1', 'Paragraph 2'],
        quotes: [{ quote: 'We are excited...', attributedTo: 'CEO', context: 'About the update' }],
        callToAction: 'Download now on the App Store',
        boilerplate: 'About Blush App',
        aboutSection: 'Blush is a romantic AI story generator...',
        mediaContact: {
          name: 'Press Contact',
          email: 'press@blush.app',
          phone: ''
        }
      };
    }
  }

  /**
   * Mock outline for fallback
   */
  getMockOutline(updates, tone) {
    return {
      headlineOptions: [
        'Blush App Unveils Exciting New Features to Enhance User Experience',
        'Popular AI Story Generator Blush Introduces Major Platform Update',
        'Blush Revolutionizes Romantic Fiction with Latest App Update'
      ],
      dateline: 'SAN FRANCISCO, CA – January 16, 2026',
      keyPoints: [
        'Enhanced AI story generation capabilities',
        'Improved user interface and navigation',
        'New story categories and customization options',
        'Better performance and faster loading times',
        'Expanded library of romantic narratives'
      ],
      suggestedQuotes: [
        {
          quote: 'This update represents our commitment to providing the most engaging and personalized romantic fiction experience for our users.',
          attributedTo: 'Sarah Chen, CEO of Blush'
        }
      ],
      callToAction: 'Download the updated Blush app free on the App Store',
      boilerplate: 'Blush is the leading romantic AI story generator app, creating personalized romantic and spicy stories for thousands of users worldwide.'
    };
  }

  /**
   * Mock content for fallback
   */
  getMockContent(outline, updates) {
    return {
      headline: outline.headlineOptions[0],
      dateline: outline.dateline,
      leadParagraph: 'Blush, the leading AI-powered romantic story generator app, today announced a major update that brings enhanced storytelling capabilities, improved performance, and new features designed to create more immersive and personalized romantic narratives for its growing user base.',
      bodyParagraphs: [
        'The latest update introduces significant improvements to the AI story generation engine, resulting in more nuanced and engaging storylines that better reflect user preferences. The enhanced algorithms now understand context and emotional depth more effectively, creating stories that resonate on a deeper level with readers.',
        'User experience has been significantly improved with a redesigned interface that makes navigation more intuitive. New story categories have been added, giving users access to a wider variety of romantic narratives, from contemporary romance to fantasy adventures and everything in between.',
        'Performance optimizations ensure faster loading times and smoother story generation, even during peak usage hours. The update also includes bug fixes and stability improvements based on valuable feedback from the Blush community.'
      ],
      quotes: [
        {
          quote: 'We are thrilled to introduce these improvements that our users have been asking for. Our team has worked tirelessly to enhance the AI capabilities while maintaining the intimate, personalized experience that makes Blush special.',
          attributedTo: 'Sarah Chen, CEO of Blush',
          context: 'Regarding the update launch'
        }
      ],
      callToAction: 'Experience the new features by downloading Blush free on the App Store. Visit https://blush.app for more information.',
      boilerplate: 'Blush is the premier AI-powered romantic story generator, creating personalized romantic and spicy stories for users worldwide. With a library of thousands of unique narratives and advanced AI technology, Blush delivers engaging, immersive fiction experiences tailored to individual preferences.',
      aboutSection: 'About Blush',
      mediaContact: {
        name: 'Press Contact',
        email: 'press@blush.app',
        phone: '+1 (555) 123-4567'
      }
    };
  }

  /**
   * Validate press release data
   */
  validatePressRelease(data) {
    const errors = [];

    if (!data.headline || data.headline.length < 10) {
      errors.push('Headline must be at least 10 characters');
    }

    if (!data.leadParagraph || data.leadParagraph.length < 50) {
      errors.push('Lead paragraph must be at least 50 characters');
    }

    if (!data.bodyParagraphs || data.bodyParagraphs.length < 2) {
      errors.push('At least 2 body paragraphs required');
    }

    if (!data.boilerplate || data.boilerplate.length < 20) {
      errors.push('Boilerplate must be at least 20 characters');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get word count
   */
  getWordCount(content) {
    const text = [
      content.headline,
      content.leadParagraph,
      ...(content.bodyParagraphs || []),
      content.boilerplate
    ].join(' ');

    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Estimate reading time
   */
  getReadingTime(wordCount) {
    const wordsPerMinute = 200;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  /**
   * Format as plain text
   */
  formatAsText(pressRelease) {
    const lines = [];

    lines.push('FOR IMMEDIATE RELEASE');
    lines.push('');
    lines.push(pressRelease.headline.toUpperCase());
    lines.push('');
    lines.push(pressRelease.dateline);
    lines.push('');
    lines.push(pressRelease.leadParagraph);
    lines.push('');

    if (pressRelease.bodyParagraphs && pressRelease.bodyParagraphs.length > 0) {
      pressRelease.bodyParagraphs.forEach(para => {
        lines.push(para);
        lines.push('');
      });
    }

    if (pressRelease.quotes && pressRelease.quotes.length > 0) {
      pressRelease.quotes.forEach(quote => {
        lines.push(`"${quote.quote}"`);
        lines.push(`— ${quote.attributedTo}${quote.context ? ', ' + quote.context : ''}`);
        lines.push('');
      });
    }

    lines.push(pressRelease.callToAction);
    lines.push('');
    lines.push('###');
    lines.push('');
    lines.push(pressRelease.aboutSection || 'About Blush');
    lines.push('');
    lines.push(pressRelease.boilerplate);
    lines.push('');
    lines.push('Media Contact:');
    lines.push(pressRelease.mediaContact.name);
    lines.push(pressRelease.mediaContact.email);
    if (pressRelease.mediaContact.phone) {
      lines.push(pressRelease.mediaContact.phone);
    }

    return lines.join('\n');
  }

  /**
   * Format as HTML
   */
  formatAsHTML(pressRelease) {
    let html = '<!DOCTYPE html>\n';
    html += '<html>\n<head>\n';
    html += '<meta charset="UTF-8">\n';
    html += '<title>' + pressRelease.headline + '</title>\n';
    html += '<style>\n';
    html += 'body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }\n';
    html += '.immediate-release { color: #e94560; font-weight: bold; }\n';
    html += 'h1 { color: #1a1a2e; }\n';
    html += '.dateline { color: #666; font-style: italic; }\n';
    html += '.quote { background: #f5f5f5; padding: 15px; margin: 15px 0; border-left: 4px solid #e94560; }\n';
    html += '.boilerplate { background: #f9f9f9; padding: 15px; margin-top: 30px; }\n';
    html += '.media-contact { margin-top: 20px; }\n';
    html += '</style>\n</head>\n<body>\n';

    html += '<p class="immediate-release">FOR IMMEDIATE RELEASE</p>\n';
    html += '<h1>' + pressRelease.headline + '</h1>\n';
    html += '<p class="dateline">' + pressRelease.dateline + '</p>\n';
    html += '<p>' + pressRelease.leadParagraph + '</p>\n';

    if (pressRelease.bodyParagraphs && pressRelease.bodyParagraphs.length > 0) {
      pressRelease.bodyParagraphs.forEach(para => {
        html += '<p>' + para + '</p>\n';
      });
    }

    if (pressRelease.quotes && pressRelease.quotes.length > 0) {
      pressRelease.quotes.forEach(quote => {
        html += '<div class="quote">\n';
        html += '<p>"' + quote.quote + '"</p>\n';
        html += '<p><em>— ' + quote.attributedTo + (quote.context ? ', ' + quote.context : '') + '</em></p>\n';
        html += '</div>\n';
      });
    }

    html += '<p><strong>' + pressRelease.callToAction + '</strong></p>\n';
    html += '<div class="boilerplate">\n';
    html += '<h3>' + (pressRelease.aboutSection || 'About Blush') + '</h3>\n';
    html += '<p>' + pressRelease.boilerplate + '</p>\n';
    html += '</div>\n';

    html += '<div class="media-contact">\n';
    html += '<h4>Media Contact:</h4>\n';
    html += '<p>' + pressRelease.mediaContact.name + '<br>\n';
    html += pressRelease.mediaContact.email + '<br>\n';
    if (pressRelease.mediaContact.phone) {
      html += pressRelease.mediaContact.phone + '<br>\n';
    }
    html += '</p>\n';
    html += '</div>\n';

    html += '</body>\n</html>';

    return html;
  }

  /**
   * Format as Markdown
   */
  formatAsMarkdown(pressRelease) {
    let md = '**FOR IMMEDIATE RELEASE**\n\n';
    md += '# ' + pressRelease.headline + '\n\n';
    md += '*' + pressRelease.dateline + '*\n\n';
    md += pressRelease.leadParagraph + '\n\n';

    if (pressRelease.bodyParagraphs && pressRelease.bodyParagraphs.length > 0) {
      pressRelease.bodyParagraphs.forEach(para => {
        md += para + '\n\n';
      });
    }

    if (pressRelease.quotes && pressRelease.quotes.length > 0) {
      pressRelease.quotes.forEach(quote => {
        md += '> ' + quote.quote + '\n\n';
        md += '— ' + quote.attributedTo + (quote.context ? ', ' + quote.context : '') + '\n\n';
      });
    }

    md += '**' + pressRelease.callToAction + '**\n\n';
    md += '---\n\n';
    md += '### ' + (pressRelease.aboutSection || 'About Blush') + '\n\n';
    md += pressRelease.boilerplate + '\n\n';
    md += '### Media Contact\n\n';
    md += '**' + pressRelease.mediaContact.name + '**\n';
    md += pressRelease.mediaContact.email + '\n';
    if (pressRelease.mediaContact.phone) {
      md += pressRelease.mediaContact.phone + '\n';
    }

    return md;
  }
}

export default new PressReleaseGenerator();
