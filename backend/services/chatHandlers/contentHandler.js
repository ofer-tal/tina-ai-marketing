import glmService from '../glmService.js';
import { getSystemPrompt } from '../tinaPersonality.js';
import { getLogger } from '../../utils/logger.js';

const logger = getLogger('content-handler', 'content-handler');

/**
 * Content Strategy Handler
 *
 * Generates content strategies and calendar suggestions
 * Analyzes content performance and provides recommendations
 */

/**
 * Handle content strategy requests
 *
 * @param {object} dataContext - Current metrics and context
 * @param {string} userQuery - The user's question
 * @returns {Promise<object>} Content strategy response
 */
export async function handleContentRequest(dataContext, userQuery, options = {}) {
  try {
    logger.info('Handling content strategy request', {
      queryLength: userQuery.length,
      hasContentData: !!dataContext.content
    });

    const prompt = buildContentStrategyPrompt(dataContext, userQuery);

    const response = await glmService.createMessage({
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      system: getSystemPrompt(),
      maxTokens: 3072,
      temperature: 0.8  // Higher for creative content ideas
    });

    const content = response.content[0]?.text || '';

    logger.info('Content strategy response generated', {
      contentLength: content.length
    });

    return {
      type: 'content_strategy',
      content,
      metadata: {
        tokensUsed: response.usage?.totalTokens || 0
      }
    };
  } catch (error) {
    logger.error('Error handling content request', {
      error: error.message
    });
    throw error;
  }
}

/**
 * Handle content calendar generation
 */
export async function handleContentCalendarRequest(dataContext, options = {}) {
  try {
    const {
      timeframe = 'week',
      postsPerDay = 2,
      platforms = ['tiktok', 'instagram'],
      focusCategories = []
    } = options;

    logger.info('Generating content calendar', {
      timeframe,
      postsPerDay,
      platforms
    });

    const prompt = buildContentCalendarPrompt(dataContext, {
      timeframe,
      postsPerDay,
      platforms,
      focusCategories
    });

    const response = await glmService.createMessage({
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      system: getSystemPrompt(),
      maxTokens: 4096,
      temperature: 0.9  // High for creative variety
    });

    const content = response.content[0]?.text || '';

    return {
      type: 'content_calendar',
      content,
      calendar: parseContentCalendar(content)
    };
  } catch (error) {
    logger.error('Error generating content calendar', {
      error: error.message
    });
    throw error;
  }
}

/**
 * Handle content performance analysis
 */
export async function handleContentAnalysisRequest(dataContext, options = {}) {
  try {
    logger.info('Analyzing content performance');

    const prompt = buildContentAnalysisPrompt(dataContext);

    const response = await glmService.createMessage({
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      system: getSystemPrompt(),
      maxTokens: 2048,
      temperature: 0.7
    });

    const content = response.content[0]?.text || '';

    return {
      type: 'content_analysis',
      content
    };
  } catch (error) {
    logger.error('Error analyzing content', {
      error: error.message
    });
    throw error;
  }
}

/**
 * Handle viral content brainstorming
 */
export async function handleViralBrainstormRequest(dataContext, topic, options = {}) {
  try {
    logger.info('Brainstorming viral content', { topic });

    const prompt = `As Tina, brainstorm viral content ideas for the Blush app.

**TARGET AUDIENCE:**
- 90%+ female
- 85% straight
- Ages 18-45
- Interested in romantic fiction

**TOPIC/FOCUS:** ${topic || 'Open - any romantic theme'}

${buildContentDataContext(dataContext)}

**Generate 10 viral content ideas:**
For each idea, provide:
1. **Hook** - The opening line/visual (must stop the scroll)
2. **Story Concept** - What happens in the video
3. **Spiciness Level** - 1 (mild) to 3 (spicy)
4. **Platform** - TikTok, IG Reels, or YouTube Shorts
5. **Viral Factor** - Why this will go viral
6. **Call-to-Action** - How to convert viewers to app users

Think like a viral content creator. What makes people stop, watch, and share?`;

    const response = await glmService.createMessage({
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      system: getSystemPrompt(),
      maxTokens: 4096,
      temperature: 1.0  // Maximum creativity
    });

    const content = response.content[0]?.text || '';

    return {
      type: 'viral_brainstorm',
      content,
      ideas: parseViralIdeas(content)
    };
  } catch (error) {
    logger.error('Error brainstorming viral content', {
      error: error.message
    });
    throw error;
  }
}

/**
 * Build content strategy prompt
 */
function buildContentStrategyPrompt(dataContext, userQuery) {
  return `As Tina, provide a comprehensive content strategy.

${buildFullDataContext(dataContext)}

**USER QUERY:**
${userQuery}

**Your analysis should include:**
1. **What's Working** - Our best performing content types
2. **What's Not** - Content that's underperforming
3. **Content Mix** - Optimal balance of categories/spiciness levels
4. **Platform Strategy** - How to approach each platform differently
5. **Posting Strategy** - Frequency, timing, and cadence
6. **Series Opportunities** - Content that can be serialized
7. **Next 7 Days** - Specific content to create this week

Be specific. Use the data. Don't just give generic advice.`;
}

/**
 * Build content calendar prompt
 */
function buildContentCalendarPrompt(dataContext, options) {
  const { timeframe, postsPerDay, platforms, focusCategories } = options;

  return `As Tina, create a content calendar for the next ${timeframe}.

**PARAMETERS:**
- Timeframe: ${timeframe}
- Posts per day: ${postsPerDay}
- Platforms: ${platforms.join(', ')}
- Focus categories: ${focusCategories.length > 0 ? focusCategories.join(', ') : 'Based on performance data'}

${buildFullDataContext(dataContext)}

**Create a detailed calendar with:**
- Date and time for each post
- Platform
- Content concept/title
- Category
- Spiciness level
- Hook/Opening
- Brief description
- Call-to-action

Format as a readable schedule with specific dates and times.

Think about: Best posting times, platform-specific optimization, content variety, and building momentum through series.`;
}

/**
 * Build content analysis prompt
 */
function buildContentAnalysisPrompt(dataContext) {
  return `As Tina, perform a deep content performance analysis.

${buildFullDataContext(dataContext)}

**Analyze and provide:**
1. **Top Performing Themes** - What categories resonate with our audience?
2. **Spiciness Sweet Spot** - Which level drives the best engagement?
3. **Platform Comparison** - Where does our content perform best?
4. **Engagement Patterns** - What makes people stop and watch?
5. **Content Gaps** - What themes are we missing?
6. **Optimization Ideas** - Specific improvements to try

Be data-driven but also explain the psychological factors. Why do certain themes work?`;
}

/**
 * Build full data context for content handlers
 */
function buildFullDataContext(dataContext) {
  const sections = [];

  sections.push('**CURRENT CONTENT PERFORMANCE:**');

  if (dataContext.content) {
    const { topCategories = [], avgEngagement = 0, recentPosts = [] } = dataContext.content;

    if (topCategories.length > 0) {
      sections.push(`\nTop Categories:`);
      topCategories.forEach((cat, i) => {
        sections.push(`${i + 1}. ${cat.category || cat} - ${cat.avgEngagement ? cat.avgEngagement.toFixed(1) + '%' : ''} avg engagement`);
      });
    }

    if (avgEngagement > 0) {
      sections.push(`\nOverall Avg Engagement: ${(avgEngagement * 100).toFixed(1)}%`);
    }

    if (recentPosts && recentPosts.length > 0) {
      sections.push(`\nRecent Posts (${recentPosts.length}):`);
      recentPosts.slice(0, 5).forEach(post => {
        sections.push(`- "${post.title || post.category}" - ${post.views?.toLocaleString() || 0} views, ${post.engagementRate || 0}% engagement`);
      });
    }
  }

  if (dataContext.revenue) {
    sections.push(`\n**BUSINESS CONTEXT:**`);
    sections.push(`- MRR: $${dataContext.revenue.mrr}`);
    sections.push(`- Subscribers: ${dataContext.revenue.subscribers}`);
    sections.push(`- Goal: $10,000 MRR in 6 months`);
  }

  return sections.join('\n');
}

/**
 * Build content data context (simplified)
 */
function buildContentDataContext(dataContext) {
  if (!dataContext || !dataContext.content) {
    return '**No content data available**';
  }

  const { topCategories = [], avgEngagement = 0 } = dataContext.content;

  return `**CONTENT CONTEXT:**
- Top Categories: ${topCategories.slice(0, 3).map(c => c.category || c).join(', ')}
- Avg Engagement: ${(avgEngagement * 100).toFixed(1)}%`;
}

/**
 * Parse content calendar from AI response
 */
function parseContentCalendar(content) {
  // Extract calendar entries (basic parsing)
  const entries = [];
  const lines = content.split('\n');
  let currentDate = null;

  for (const line of lines) {
    // Look for date patterns
    const dateMatch = line.match(/(\d{1,2}\/\d{1,2})|(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i);
    if (dateMatch) {
      currentDate = dateMatch[0];
    }

    // Look for post entries
    if (line.includes('-') && (line.includes('TikTok') || line.includes('IG') || line.includes('Reel'))) {
      entries.push({
        date: currentDate,
        raw: line.trim()
      });
    }
  }

  return entries;
}

/**
 * Parse viral ideas from AI response
 */
function parseViralIdeas(content) {
  const ideas = [];
  const lines = content.split('\n');
  let currentIdea = null;

  for (const line of lines) {
    // Look for numbered ideas
    const ideaMatch = line.match(/^(\d+)[.)\s]+(.+)/);
    if (ideaMatch) {
      if (currentIdea) {
        ideas.push(currentIdea);
      }
      currentIdea = {
        number: parseInt(ideaMatch[1]),
        title: ideaMatch[2],
        details: []
      };
    } else if (currentIdea && line.trim()) {
      currentIdea.details.push(line.trim());
    }
  }

  if (currentIdea) {
    ideas.push(currentIdea);
  }

  return ideas;
}

export default {
  handleContentRequest,
  handleContentCalendarRequest,
  handleContentAnalysisRequest,
  handleViralBrainstormRequest
};
