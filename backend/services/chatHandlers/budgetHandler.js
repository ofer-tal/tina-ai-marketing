import glmService from '../glmService.js';
import { getSystemPrompt } from '../tinaPersonality.js';
import { getLogger } from '../../utils/logger.js';

const logger = getLogger('budget-handler', 'budget-handler');

/**
 * Budget Proposal Handler
 *
 * Generates budget change proposals with approval workflow
 * Focuses on ROI analysis and honest spend efficiency assessment
 */

/**
 * Handle budget change proposal requests
 *
 * @param {object} dataContext - Current metrics and context
 * @param {object} proposalDetails - The proposed budget change
 * @returns {Promise<object>} Budget proposal response
 */
export async function handleBudgetRequest(dataContext, proposalDetails) {
  try {
    logger.info('Handling budget request', {
      type: proposalDetails.type,
      currentBudget: proposalDetails.currentBudget,
      proposedBudget: proposalDetails.proposedBudget
    });

    const { type, currentBudget, proposedBudget, rationale, timeframe = 'monthly' } = proposalDetails;

    // Generate structured proposal
    const proposal = {
      type: 'budget_change',
      subtype: type || 'adjustment',
      current: { budget: currentBudget, timeframe },
      proposed: { budget: proposedBudget, timeframe },
      change: calculateBudgetChange(currentBudget, proposedBudget),
      status: 'awaiting_approval',
      reasoning: '',  // Will be AI-generated
      expectedImpact: {},  // Will be AI-calculated
      risks: [],  // Will be AI-identified
      alternatives: []  // Will be AI-suggested
    };

    // Use GLM to generate proposal reasoning
    const reasoningPrompt = buildBudgetProposalPrompt(dataContext, proposal);

    const response = await glmService.createMessage({
      messages: [
        {
          role: 'user',
          content: reasoningPrompt
        }
      ],
      system: getSystemPrompt(),
      maxTokens: 2048,
      temperature: 0.7
    });

    const content = response.content[0]?.text || '';

    // Parse AI response into structured proposal
    const parsed = parseBudgetProposalResponse(content);

    proposal.reasoning = parsed.reasoning;
    proposal.expectedImpact = parsed.expectedImpact;
    proposal.risks = parsed.risks;
    proposal.alternatives = parsed.alternatives;

    logger.info('Budget proposal generated', {
      proposalType: proposal.type,
      changeAmount: proposal.change.amount,
      changePercent: proposal.change.percent
    });

    return {
      type: 'budget_proposal',
      content: proposal.reasoning,
      proposal,
      metadata: {
        tokensUsed: response.usage?.totalTokens || 0,
        model: response.model
      }
    };
  } catch (error) {
    logger.error('Error handling budget request', {
      error: error.message
    });
    throw error;
  }
}

/**
 * Handle ROI analysis requests
 */
export async function handleROIAnalysisRequest(dataContext, options = {}) {
  try {
    logger.info('Handling ROI analysis request');

    const prompt = buildROIAnalysisPrompt(dataContext);

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
      type: 'roi_analysis',
      content,
      metadata: {
        tokensUsed: response.usage?.totalTokens || 0
      }
    };
  } catch (error) {
    logger.error('Error handling ROI analysis', {
      error: error.message
    });
    throw error;
  }
}

/**
 * Handle budget optimization requests
 */
export async function handleBudgetOptimizationRequest(dataContext, options = {}) {
  try {
    logger.info('Handling budget optimization request');

    const prompt = `As Tina, perform a ruthless budget optimization analysis.

${buildDataContextSection(dataContext)}

**Your task:**
1. Identify every dollar being wasted
2. Find the highest-ROI reallocation opportunities
3. Be honest about what's not working
4. Propose specific budget cuts and reallocations
5. Calculate the expected impact

Remember: Organic content beats paid ads 10:1 when done right. Be ruthless about cutting low-performing spend.`;

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

    return {
      type: 'budget_optimization',
      content: response.content[0]?.text || ''
    };
  } catch (error) {
    logger.error('Error handling budget optimization', {
      error: error.message
    });
    throw error;
  }
}

/**
 * Calculate budget change
 */
function calculateBudgetChange(current, proposed) {
  const change = proposed - current;
  const percent = current > 0 ? (change / current) * 100 : 0;

  return {
    amount: change,
    percent: Math.round(percent * 10) / 10,
    direction: change > 0 ? 'increase' : change < 0 ? 'decrease' : 'no_change'
  };
}

/**
 * Build budget proposal prompt
 */
function buildBudgetProposalPrompt(dataContext, proposal) {
  const { current, proposed, change, rationale } = proposal;

  return `As Tina, you're proposing this budget change. Explain your reasoning aggressively and honestly.

**CURRENT SITUATION:**
${buildDataContextSection(dataContext)}

**BUDGET CHANGE BEING PROPOSED:**
- Current: $${current.budget}/${current.timeframe}
- Proposed: $${proposed.budget}/${proposed.timeframe}
- Change: ${change.direction === 'increase' ? '+' : ''}$${change.amount} (${change.percent > 0 ? '+' : ''}${change.percent}%)

**USER'S RATIONALE:**
${rationale || 'No rationale provided'}

**Your task:**
1. **Is this the RIGHT move?** Be honest - if it's a bad idea, say so
2. **Your reasoning** - specific numbers and logic
3. **Expected impact** - what will this achieve?
4. **Risks** - what could go wrong?
5. **Alternatives** - are there better options?

Remember: Be ruthless about budget efficiency. Organic > Paid. If this spend doesn't make sense, say so clearly.`;
}

/**
 * Build ROI analysis prompt
 */
function buildROIAnalysisPrompt(dataContext) {
  return `As Tina, perform a comprehensive ROI analysis.

${buildDataContextSection(dataContext)}

**Your task:**
1. **Current ROI Assessment** - by channel/campaign
2. **Organic vs Paid** - honest comparison
3. **Winners** - what's working? Scale it.
4. **Losers** - what's wasting money? Cut it.
5. **Optimization Plan** - specific actions to improve ROI

Use actual numbers. Be ruthless. Every dollar should work hard.`;
}

/**
 * Build data context section
 */
function buildDataContextSection(dataContext) {
  if (!dataContext || Object.keys(dataContext).length === 0) {
    return '**CURRENT METRICS:** No data available';
  }

  const sections = [];

  if (dataContext.revenue) {
    sections.push(`**REVENUE:** $${dataContext.revenue.mrr} MRR (${dataContext.revenue.subscribers} subscribers)`);
  }

  if (dataContext.spend !== undefined) {
    sections.push(`**CURRENT SPEND:** $${dataContext.spend}/month`);
  }

  if (dataContext.budgetUtilization !== undefined) {
    sections.push(`**BUDGET UTILIZATION:** ${dataContext.budgetUtilization.toFixed(1)}%`);
  }

  if (dataContext.campaigns && dataContext.campaigns.length > 0) {
    sections.push(`**ACTIVE CAMPAIGNS:**\n${dataContext.campaigns.map(c =>
      `- ${c.name}: $${c.spend} spent, ${c.roi}% ROI`
    ).join('\n')}`);
  }

  return sections.length > 0 ? sections.join('\n') : '**CURRENT METRICS:** No data available';
}

/**
 * Parse budget proposal response
 */
function parseBudgetProposalResponse(content) {
  const result = {
    reasoning: content,
    expectedImpact: {},
    risks: [],
    alternatives: []
  };

  // Try to extract structured sections
  const expectedImpactMatch = content.match(/\*\*Expected Impact\*\*:\s*([\s\S]*?)(?=\n\n|\n\*\*|$)/i);
  if (expectedImpactMatch) {
    result.expectedImpact = { description: expectedImpactMatch[1].trim() };
  }

  const risksMatch = content.match(/\*\*Risks\*\*:\s*([\s\S]*?)(?=\n\n|\n\*\*|$)/i);
  if (risksMatch) {
    result.risks = risksMatch[1].split('\n')
      .map(line => line.replace(/^[-•*]\s*/, '').trim())
      .filter(line => line.length > 0);
  }

  const alternativesMatch = content.match(/\*\*Alternatives\*\*:\s*([\s\S]*?)(?=\n\n|\n\*\*|$)/i);
  if (alternativesMatch) {
    result.alternatives = alternativesMatch[1].split('\n')
      .map(line => line.replace(/^[-•*]\s*/, '').trim())
      .filter(line => line.length > 0);
  }

  return result;
}

export default {
  handleBudgetRequest,
  handleROIAnalysisRequest,
  handleBudgetOptimizationRequest
};
