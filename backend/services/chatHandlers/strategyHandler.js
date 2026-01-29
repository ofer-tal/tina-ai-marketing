import glmService from '../glmService.js';
import { getSystemPrompt } from '../tinaPersonality.js';
import { getLogger } from '../../utils/logger.js';

const logger = getLogger('strategy-handler', 'strategy-handler');

/**
 * Strategy Recommendation Handler
 *
 * Generates detailed strategic recommendations with reasoning
 * Focuses on honest assessment, specific recommendations, and actionable next steps
 */

/**
 * Handle strategy recommendation requests
 *
 * @param {object} dataContext - Current metrics and context
 * @param {string} userQuery - The user's question
 * @param {object} options - Additional options
 * @returns {Promise<object>} Strategy response
 */
export async function handleStrategyRequest(dataContext, userQuery, options = {}) {
  try {
    logger.info('Handling strategy request', {
      queryLength: userQuery.length,
      hasContext: !!dataContext
    });

    const prompt = buildStrategyPrompt(dataContext, userQuery);

    const response = await glmService.createMessage({
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      system: getSystemPrompt(),
      maxTokens: 4096,
      temperature: 0.8  // Slightly higher for creativity
    });

    const content = response.content[0]?.text || '';

    logger.info('Strategy response generated', {
      contentLength: content.length,
      tokensUsed: response.usage?.totalTokens || 0
    });

    return {
      type: 'strategy',
      content,
      metadata: {
        tokensUsed: response.usage?.totalTokens || 0,
        model: response.model
      }
    };
  } catch (error) {
    logger.error('Error handling strategy request', {
      error: error.message
    });
    throw error;
  }
}

/**
 * Build strategy analysis prompt
 */
function buildStrategyPrompt(dataContext, userQuery) {
  const contextSection = buildDataContextSection(dataContext);

  return `As Tina, analyze this marketing situation and provide strategic recommendations.

${contextSection}

**USER QUERY:**
${userQuery}

**Provide your response with these sections:**

1. **Your Honest Assessment** (don't sugarcoat problems)
2. **3-5 Specific Recommendations** with RATIONALE for each
3. **Expected Impact** for each recommendation (use numbers when possible)
4. **Potential Risks** and how to mitigate them
5. **What We Need to Build/Fix** (if anything is missing - be insistent!)
6. **Next Steps** - specific action items

Remember:
- Be direct and honest
- Use data to back up your claims
- When you see problems, say so clearly
- Always offer better alternatives
- If we need to build something, insist on it`;
}

/**
 * Build data context section for prompt
 */
function buildDataContextSection(dataContext) {
  if (!dataContext || Object.keys(dataContext).length === 0) {
    return '**CURRENT METRICS:** No data available';
  }

  const sections = [];

  if (dataContext.revenue) {
    const { mrr = 0, subscribers = 0, trend = 'unknown', arpu = 0 } = dataContext.revenue;
    sections.push(`**REVENUE:**
- MRR: $${mrr}
- Subscribers: ${subscribers}
- ARPU: $${arpu.toFixed(2)}
- Trend: ${trend}`);
  }

  if (dataContext.content) {
    const { topCategories = [], avgEngagement = 0, recentPosts = [] } = dataContext.content;
    sections.push(`**CONTENT PERFORMANCE:**
- Avg Engagement: ${(avgEngagement * 100).toFixed(1)}%
- Top Categories: ${topCategories.slice(0, 3).join(', ') || 'N/A'}
- Recent Posts: ${recentPosts.length} analyzed`);
  }

  if (dataContext.spend !== undefined || dataContext.budgetUtilization !== undefined) {
    sections.push(`**BUDGET/SPEND:**
- Ad Spend: $${dataContext.spend || 0}
- Budget Utilization: ${dataContext.budgetUtilization || 0}%`);
  }

  if (dataContext.keywords && dataContext.keywords.length > 0) {
    const topKeywords = dataContext.keywords.slice(0, 5);
    sections.push(`**ASO KEYWORDS:**
${topKeywords.map(k => `- ${k.keyword}: #${k.ranking} (${k.change >= 0 ? '+' : ''}${k.change})`).join('\n')}`);
  }

  return `**CURRENT METRICS:**

${sections.join('\n\n')}`;
}

/**
 * Handle growth strategy specific requests
 */
export async function handleGrowthStrategyRequest(dataContext, options = {}) {
  const growthPrompt = `As Tina, provide a comprehensive growth strategy analysis.

We need to grow from $${dataContext.revenue?.mrr || 400} MRR to $10,000 MRR in 6 months.

Analyze:
1. **Current Growth Trajectory** - What's our actual growth rate?
2. **Growth Bottlenecks** - What's holding us back?
3. **Highest-Leverage Opportunities** - Where should we focus?
4. **Organic vs Paid** - Honest assessment of what works
5. **Guerrilla Tactics We're Missing** - Low-cost, high-impact ideas
6. **What We Need to Build** - Infrastructure for growth

Be specific. Use numbers. Be honest about what's not working.`;

  return await handleStrategyRequest(dataContext, growthPrompt, options);
}

/**
 * Handle pivot/strategy change requests
 */
export async function handlePivotRequest(dataContext, currentStrategy, proposedDirection, options = {}) {
  const pivotPrompt = `As Tina, evaluate a potential strategic pivot.

**CURRENT STRATEGY:**
${currentStrategy}

**PROPOSED NEW DIRECTION:**
${proposedDirection}

Analyze:
1. **Is this pivot necessary?** (Be honest - maybe we just need to execute better)
2. **What's working now** that we should keep?
3. **What's not working** that justifies the pivot?
4. **Risks of pivoting** vs risks of staying course
5. **If we pivot:** Execution plan and expected timeline
6. **What we need** to make the pivot successful

Remember: Pivots are expensive. Make sure it's the right move.`;

  return await handleStrategyRequest(dataContext, pivotPrompt, options);
}

export default {
  handleStrategyRequest,
  handleGrowthStrategyRequest,
  handlePivotRequest
};
