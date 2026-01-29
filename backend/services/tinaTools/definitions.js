/**
 * Tool Definitions for Tina's Function Calling
 *
 * Defines all available tools that Tina can use to perform actions in the system.
 * Tools are categorized by whether they require user approval before execution.
 */

/**
 * Tier 1: Requires Approval (Sensitive Operations)
 * These tools modify system state and MUST be approved by the user before execution.
 */
export const APPROVAL_REQUIRED_TOOLS = [
  {
    name: 'update_posting_schedule',
    description: 'Change the content posting frequency or schedule for social media platforms',
    requiresApproval: true,
    parameters: {
      type: 'object',
      properties: {
        frequency: {
          type: 'number',
          description: 'Posts per day (1-10)',
          minimum: 1,
          maximum: 10
        },
        platforms: {
          type: 'array',
          items: { type: 'string' },
          description: 'Platforms to apply the schedule to: tiktok, instagram, youtube',
          uniqueItems: true
        }
      },
      required: ['frequency']
    },
    exampleUsage: {
      frequency: 4,
      platforms: ['tiktok', 'instagram']
    },
    expectedImpact: 'Increases content output to 4x daily, expected to boost reach by 40-60% based on current engagement rates'
  },
  {
    name: 'update_content_generation_prompt',
    description: 'Modify the AI prompt used for generating content to improve quality or test new approaches',
    requiresApproval: true,
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Content category to modify (e.g., "romance", "spicy", "teaser")',
          enum: ['romance', 'spicy', 'teaser', 'comedy', 'drama', 'all']
        },
        promptAddition: {
          type: 'string',
          description: 'Text to add to the generation prompt',
          maxLength: 500
        }
      },
      required: ['category', 'promptAddition']
    },
    exampleUsage: {
      category: 'romance',
      promptAddition: 'Focus on emotional connection and slow-burn tension. Avoid explicit content, emphasize chemistry.'
    },
    expectedImpact: 'Improves content quality for romance category, potentially increasing engagement by 20-30%'
  },
  {
    name: 'update_campaign_budget',
    description: 'Change the daily budget for an Apple Search Ads campaign',
    requiresApproval: true,
    parameters: {
      type: 'object',
      properties: {
        campaignId: {
          type: 'string',
          description: 'Campaign ID from Apple Search Ads'
        },
        dailyBudget: {
          type: 'number',
          description: 'New daily budget amount in USD',
          minimum: 1
        },
        reasoning: {
          type: 'string',
          description: 'Why this change is needed',
          maxLength: 500
        }
      },
      required: ['campaignId', 'dailyBudget', 'reasoning']
    },
    exampleUsage: {
      campaignId: '1234567890',
      dailyBudget: 50,
      reasoning: 'Current campaign showing 3.2x ROAS. Increasing budget to scale successful keywords.'
    },
    expectedImpact: 'Scales successful campaign from $30/day to $50/day, expected additional 150-200 installs/day'
  },
  {
    name: 'pause_campaign',
    description: 'Pause an active advertising campaign immediately',
    requiresApproval: true,
    parameters: {
      type: 'object',
      properties: {
        campaignId: {
          type: 'string',
          description: 'Campaign ID from Apple Search Ads'
        },
        reason: {
          type: 'string',
          description: 'Reason for pausing',
          maxLength: 500
        }
      },
      required: ['campaignId', 'reason']
    },
    exampleUsage: {
      campaignId: '1234567890',
      reason: 'Campaign CPA exceeded $8.00 threshold. Pausing to prevent waste while we optimize keywords.'
    },
    expectedImpact: 'Stops bleed on underperforming campaign, saving approximately $180/day'
  },
  {
    name: 'approve_pending_posts',
    description: 'Bulk approve pending marketing posts for automatic posting',
    requiresApproval: true,
    parameters: {
      type: 'object',
      properties: {
        count: {
          type: 'number',
          description: 'Number of posts to approve (1-50)',
          minimum: 1,
          maximum: 50
        },
        criteria: {
          type: 'string',
          description: 'Selection criteria: "highest_engagement_predicted", "newest", "all_platforms", or specific category',
          enum: ['highest_engagement_predicted', 'newest', 'all_platforms', 'romance', 'spicy', 'teaser', 'comedy', 'drama']
        },
        platforms: {
          type: 'array',
          items: { type: 'string' },
          description: 'Platforms to approve for (if not using all_platforms criteria)',
          uniqueItems: true
        }
      },
      required: ['count']
    },
    exampleUsage: {
      count: 10,
      criteria: 'highest_engagement_predicted',
      platforms: ['tiktok']
    },
    expectedImpact: 'Approves 10 high-potential posts for TikTok, ensuring consistent content flow for next 2-3 days'
  },
  {
    name: 'update_hashtag_strategy',
    description: 'Update the hashtag strategy for content posting',
    requiresApproval: true,
    parameters: {
      type: 'object',
      properties: {
        strategy: {
          type: 'string',
          description: 'Hashtag strategy to use',
          enum: ['conservative', 'moderate', 'aggressive', 'custom']
        },
        customHashtags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Custom hashtags if strategy is "custom"',
          uniqueItems: true
        },
        category: {
          type: 'string',
          description: 'Content category to apply strategy to'
        }
      },
      required: ['strategy']
    },
    exampleUsage: {
      strategy: 'aggressive',
      category: 'romance'
    },
    expectedImpact: 'Increases hashtag count from 5 to 10 for romance content, potentially increasing discoverability by 25%'
  },
  {
    name: 'create_content_experiment',
    description: 'Create an A/B test or content experiment to validate a hypothesis',
    requiresApproval: true,
    parameters: {
      type: 'object',
      properties: {
        experimentName: {
          type: 'string',
          description: 'Name of the experiment',
          maxLength: 100
        },
        hypothesis: {
          type: 'string',
          description: 'What we are testing',
          maxLength: 500
        },
        variants: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' }
            }
          },
          description: 'Experiment variants (A, B, etc.)',
          minItems: 2,
          maxItems: 4
        },
        successMetric: {
          type: 'string',
          description: 'How we measure success',
          enum: ['engagement_rate', 'views', 'shares', 'saves', 'clicks', 'conversions']
        },
        duration: {
          type: 'number',
          description: 'Duration in days',
          minimum: 1,
          maximum: 30
        }
      },
      required: ['experimentName', 'hypothesis', 'variants', 'successMetric']
    },
    exampleUsage: {
      experimentName: 'Hook Format Test',
      hypothesis: 'Question hooks outperform statement hooks for romance content',
      variants: [
        { name: 'Question Hook', description: 'Start with a provocative question' },
        { name: 'Statement Hook', description: 'Start with a bold statement' }
      ],
      successMetric: 'engagement_rate',
      duration: 7
    },
    expectedImpact: 'Validates hypothesis with real data, informs future content strategy'
  }
];

/**
 * Tier 2: Read-Only (Informational - No Approval Needed)
 * These tools only fetch information and can be executed immediately.
 * In future "man-on-the-loop" mode, these would execute automatically but notify user.
 */
export const READ_ONLY_TOOLS = [
  {
    name: 'get_campaign_performance',
    description: 'Get performance metrics for Apple Search Ads campaigns',
    requiresApproval: false,
    parameters: {
      type: 'object',
      properties: {
        timeframe: {
          type: 'string',
          description: 'Time period for data',
          enum: ['7d', '30d', '90d', 'today', 'yesterday', 'this_week', 'this_month']
        },
        campaignId: {
          type: 'string',
          description: 'Specific campaign ID (optional, omit for all campaigns)'
        }
      }
    },
    exampleUsage: {
      timeframe: '7d'
    }
  },
  {
    name: 'get_content_analytics',
    description: 'Get detailed content performance analytics and insights',
    requiresApproval: false,
    parameters: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Number of days to analyze',
          minimum: 1,
          maximum: 90
        },
        platform: {
          type: 'string',
          description: 'Filter by platform (optional)',
          enum: ['tiktok', 'instagram', 'youtube', 'all']
        },
        category: {
          type: 'string',
          description: 'Filter by content category (optional)'
        }
      }
    },
    exampleUsage: {
      days: 7,
      platform: 'tiktok'
    }
  },
  {
    name: 'get_budget_status',
    description: 'Get current budget utilization, remaining budget, and spending trends',
    requiresApproval: false,
    parameters: {
      type: 'object',
      properties: {}
    },
    exampleUsage: {}
  },
  {
    name: 'get_aso_keyword_status',
    description: 'Get current App Store Optimization keyword rankings and opportunities',
    requiresApproval: false,
    parameters: {
      type: 'object',
      properties: {
        topN: {
          type: 'number',
          description: 'Number of top keywords to return',
          minimum: 5,
          maximum: 50
        }
      }
    },
    exampleUsage: {
      topN: 20
    }
  },
  {
    name: 'get_revenue_summary',
    description: 'Get current revenue metrics including MRR, subscribers, ARPU, and trends',
    requiresApproval: false,
    parameters: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Number of days of trend data to include',
          minimum: 7,
          maximum: 90
        }
      }
    },
    exampleUsage: {
      days: 30
    }
  },
  {
    name: 'get_pending_posts',
    description: 'Get list of posts awaiting approval with their details',
    requiresApproval: false,
    parameters: {
      type: 'object',
      properties: {
        platform: {
          type: 'string',
          description: 'Filter by platform (optional)',
          enum: ['tiktok', 'instagram', 'youtube', 'all']
        },
        limit: {
          type: 'number',
          description: 'Maximum number of posts to return',
          minimum: 1,
          maximum: 100
        }
      }
    },
    exampleUsage: {
      limit: 20
    }
  },
  {
    name: 'get_conversion_metrics',
    description: 'Get user conversion metrics including free-to-paid and trial-to-paid conversion rates',
    requiresApproval: false,
    parameters: {
      type: 'object',
      properties: {
        timeframe: {
          type: 'string',
          description: 'Time period for data',
          enum: ['7d', '30d', '90d', 'this_month', 'last_month']
        }
      }
    },
    exampleUsage: {
      timeframe: '30d'
    }
  },
  {
    name: 'get_acquisition_metrics',
    description: 'Get user acquisition metrics including CPI, CAC, and organic vs paid breakdown',
    requiresApproval: false,
    parameters: {
      type: 'object',
      properties: {
        timeframe: {
          type: 'string',
          description: 'Time period for data',
          enum: ['7d', '30d', '90d', 'this_month', 'last_month']
        },
        channel: {
          type: 'string',
          description: 'Filter by specific channel (optional)',
          enum: ['organic', 'apple_search_ads', 'tiktok', 'instagram', 'google_ads', 'all']
        }
      }
    },
    exampleUsage: {
      timeframe: '30d'
    }
  },
  {
    name: 'get_ltv_by_channel',
    description: 'Get lifetime value (LTV) analysis by acquisition channel',
    requiresApproval: false,
    parameters: {
      type: 'object',
      properties: {
        timeframe: {
          type: 'string',
          description: 'Time period for data',
          enum: ['30d', '90d', 'this_month', 'last_month']
        }
      }
    },
    exampleUsage: {
      timeframe: '90d'
    }
  },
  {
    name: 'get_campaign_roi',
    description: 'Get detailed ROAS and profitability metrics for advertising campaigns',
    requiresApproval: false,
    parameters: {
      type: 'object',
      properties: {
        timeframe: {
          type: 'string',
          description: 'Time period for data',
          enum: ['7d', '30d', '90d', 'this_month']
        },
        campaignId: {
          type: 'string',
          description: 'Specific campaign ID (optional, omit for all campaigns)'
        }
      }
    },
    exampleUsage: {
      timeframe: '30d'
    }
  },
  {
    name: 'get_spend_by_channel',
    description: 'Get detailed spending breakdown with efficiency metrics by marketing channel',
    requiresApproval: false,
    parameters: {
      type: 'object',
      properties: {
        timeframe: {
          type: 'string',
          description: 'Time period for data',
          enum: ['7d', '30d', '90d', 'this_month', 'last_month']
        }
      }
    },
    exampleUsage: {
      timeframe: '30d'
    }
  },
  {
    name: 'get_roi_by_channel',
    description: 'Get ROI analysis comparing marketing channel performance',
    requiresApproval: false,
    parameters: {
      type: 'object',
      properties: {
        timeframe: {
          type: 'string',
          description: 'Time period for data',
          enum: ['7d', '30d', '90d', 'this_month', 'last_month']
        }
      }
    },
    exampleUsage: {
      timeframe: '30d'
    }
  },
  {
    name: 'get_retention_metrics',
    description: 'Get detailed retention cohort analysis (Day 1, 7, 30 retention rates)',
    requiresApproval: false,
    parameters: {
      type: 'object',
      properties: {
        timeframe: {
          type: 'string',
          description: 'Time period for cohort analysis',
          enum: ['7d', '30d', '90d']
        }
      }
    },
    exampleUsage: {
      timeframe: '30d'
    }
  },
  {
    name: 'get_user_activity_metrics',
    description: 'Get user activity metrics including DAU, WAU, MAU and session analytics',
    requiresApproval: false,
    parameters: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Number of days to analyze',
          minimum: 7,
          maximum: 90,
          default: 30
        }
      }
    },
    exampleUsage: {
      days: 30
    }
  },
  {
    name: 'get_subscription_tier_performance',
    description: 'Get detailed performance breakdown by subscription tier (monthly vs annual vs lifetime)',
    requiresApproval: false,
    parameters: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Number of days to analyze',
          minimum: 7,
          maximum: 90,
          default: 30
        }
      }
    },
    exampleUsage: {
      days: 30
    }
  },
  {
    name: 'get_keyword_performance',
    description: 'Get Apple Search Ads keyword-level performance metrics',
    requiresApproval: false,
    parameters: {
      type: 'object',
      properties: {
        timeframe: {
          type: 'string',
          description: 'Time period for data',
          enum: ['7d', '30d', 'this_month']
        },
        topN: {
          type: 'number',
          description: 'Number of top keywords to return',
          minimum: 5,
          maximum: 100,
          default: 20
        }
      }
    },
    exampleUsage: {
      timeframe: '30d',
      topN: 20
    }
  },
  {
    name: 'get_app_store_performance',
    description: 'Get App Store Connect metrics including impressions and conversion rate',
    requiresApproval: false,
    parameters: {
      type: 'object',
      properties: {
        timeframe: {
          type: 'string',
          description: 'Time period for data',
          enum: ['7d', '30d', 'this_month']
        }
      }
    },
    exampleUsage: {
      timeframe: '30d'
    }
  },
  {
    name: 'get_optimal_posting_times',
    description: 'Get best posting times analysis based on engagement metrics by platform and category',
    requiresApproval: false,
    parameters: {
      type: 'object',
      properties: {
        platform: {
          type: 'string',
          description: 'Filter by platform',
          enum: ['tiktok', 'instagram', 'youtube', 'all'],
          default: 'all'
        },
        category: {
          type: 'string',
          description: 'Filter by content category (optional)'
        }
      }
    },
    exampleUsage: {
      platform: 'tiktok'
    }
  },
  {
    name: 'get_traffic_sources',
    description: 'Get traffic source breakdown from web and app analytics',
    requiresApproval: false,
    parameters: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Number of days to analyze',
          minimum: 7,
          maximum: 90,
          default: 30
        }
      }
    },
    exampleUsage: {
      days: 30
    }
  }
];

/**
 * Get all tools formatted for Z.AI GLM API function calling
 * Uses OpenAI-compatible format: { type: "function", function: { name, description, parameters } }
 */
export function getAllToolsForAPI() {
  const allTools = [...APPROVAL_REQUIRED_TOOLS, ...READ_ONLY_TOOLS];

  return allTools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: tool.parameters.properties || {},
        required: tool.parameters.required || []
      }
    }
  }));
}

/**
 * Get tool definition by name
 */
export function getToolDefinition(toolName) {
  const allTools = [...APPROVAL_REQUIRED_TOOLS, ...READ_ONLY_TOOLS];
  return allTools.find(t => t.name === toolName);
}

/**
 * Check if a tool requires user approval
 */
export function isApprovalRequired(toolName) {
  const tool = getToolDefinition(toolName);
  return tool?.requiresApproval !== false;
}

/**
 * Get all approval-required tools
 */
export function getApprovalRequiredTools() {
  return APPROVAL_REQUIRED_TOOLS;
}

/**
 * Get all read-only tools
 */
export function getReadOnlyTools() {
  return READ_ONLY_TOOLS;
}

/**
 * Get tool names for quick reference
 */
export const TOOL_NAMES = {
  // Approval required
  UPDATE_POSTING_SCHEDULE: 'update_posting_schedule',
  UPDATE_CONTENT_PROMPT: 'update_content_generation_prompt',
  UPDATE_CAMPAIGN_BUDGET: 'update_campaign_budget',
  PAUSE_CAMPAIGN: 'pause_campaign',
  APPROVE_PENDING_POSTS: 'approve_pending_posts',
  UPDATE_HASHTAG_STRATEGY: 'update_hashtag_strategy',
  CREATE_CONTENT_EXPERIMENT: 'create_content_experiment',

  // Read only - existing
  GET_CAMPAIGN_PERFORMANCE: 'get_campaign_performance',
  GET_CONTENT_ANALYTICS: 'get_content_analytics',
  GET_BUDGET_STATUS: 'get_budget_status',
  GET_ASO_KEYWORD_STATUS: 'get_aso_keyword_status',
  GET_REVENUE_SUMMARY: 'get_revenue_summary',
  GET_PENDING_POSTS: 'get_pending_posts',

  // Read only - new Phase 1: High-Value Tools
  GET_CONVERSION_METRICS: 'get_conversion_metrics',
  GET_ACQUISITION_METRICS: 'get_acquisition_metrics',
  GET_LTV_BY_CHANNEL: 'get_ltv_by_channel',
  GET_CAMPAIGN_ROI: 'get_campaign_roi',
  GET_SPEND_BY_CHANNEL: 'get_spend_by_channel',
  GET_ROI_BY_CHANNEL: 'get_roi_by_channel',

  // Read only - Phase 2: User Behavior & Retention
  GET_RETENTION_METRICS: 'get_retention_metrics',
  GET_USER_ACTIVITY_METRICS: 'get_user_activity_metrics',
  GET_SUBSCRIPTION_TIER_PERFORMANCE: 'get_subscription_tier_performance',

  // Read only - Phase 3: Content & ASO Enhancements
  GET_KEYWORD_PERFORMANCE: 'get_keyword_performance',
  GET_APP_STORE_PERFORMANCE: 'get_app_store_performance',
  GET_OPTIMAL_POSTING_TIMES: 'get_optimal_posting_times',
  GET_TRAFFIC_SOURCES: 'get_traffic_sources'
};

/**
 * Validate tool parameters against schema
 */
export function validateToolParameters(toolName, parameters) {
  const tool = getToolDefinition(toolName);
  if (!tool) {
    return { valid: false, error: `Unknown tool: ${toolName}` };
  }

  const { properties, required } = tool.parameters;
  const errors = [];

  // Check required parameters
  for (const param of required || []) {
    if (!(param in parameters)) {
      errors.push(`Missing required parameter: ${param}`);
    }
  }

  // Type validation (basic)
  for (const [key, value] of Object.entries(parameters)) {
    const schema = properties?.[key];
    if (!schema) continue;

    if (schema.type === 'number' && typeof value !== 'number') {
      errors.push(`Parameter ${key} must be a number`);
    }
    if (schema.type === 'array' && !Array.isArray(value)) {
      errors.push(`Parameter ${key} must be an array`);
    }
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`Parameter ${key} must be one of: ${schema.enum.join(', ')}`);
    }
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`Parameter ${key} must be at least ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`Parameter ${key} must be at most ${schema.maximum}`);
    }
  }

  return errors.length === 0
    ? { valid: true }
    : { valid: false, errors };
}

/**
 * Format tool call for display in chat UI
 */
export function formatToolCallForDisplay(toolName, parameters) {
  const tool = getToolDefinition(toolName);
  if (!tool) return { action: toolName, description: 'Unknown tool' };

  let description = tool.description;

  // Add parameter details for better context
  if (toolName === 'update_posting_schedule') {
    description = `Change posting frequency to ${parameters.frequency}x/day`;
    if (parameters.platforms) {
      description += ` for ${parameters.platforms.join(', ')}`;
    }
  } else if (toolName === 'update_campaign_budget') {
    description = `Update campaign budget to $${parameters.dailyBudget}/day`;
  } else if (toolName === 'pause_campaign') {
    description = `Pause campaign ${parameters.campaignId}`;
  } else if (toolName === 'approve_pending_posts') {
    description = `Approve ${parameters.count} pending posts`;
    if (parameters.criteria) {
      description += ` using criteria: ${parameters.criteria}`;
    }
  } else if (toolName === 'get_campaign_performance') {
    description = `Fetch campaign performance (${parameters.timeframe || '7d'})`;
  } else if (toolName === 'get_content_analytics') {
    description = `Analyze content performance (last ${parameters.days || 7} days)`;
  } else if (toolName === 'get_conversion_metrics') {
    description = `Get conversion metrics (${parameters.timeframe || '30d'})`;
  } else if (toolName === 'get_acquisition_metrics') {
    description = `Get acquisition metrics (${parameters.timeframe || '30d'})`;
  } else if (toolName === 'get_ltv_by_channel') {
    description = `Get LTV by channel (${parameters.timeframe || '90d'})`;
  } else if (toolName === 'get_campaign_roi') {
    description = `Get campaign ROI (${parameters.timeframe || '30d'})`;
  } else if (toolName === 'get_spend_by_channel') {
    description = `Get spend by channel (${parameters.timeframe || '30d'})`;
  } else if (toolName === 'get_roi_by_channel') {
    description = `Get ROI by channel (${parameters.timeframe || '30d'})`;
  } else if (toolName === 'get_retention_metrics') {
    description = `Get retention metrics (${parameters.timeframe || '30d'})`;
  } else if (toolName === 'get_user_activity_metrics') {
    description = `Get user activity metrics (last ${parameters.days || 30} days)`;
  } else if (toolName === 'get_subscription_tier_performance') {
    description = `Get subscription tier performance (last ${parameters.days || 30} days)`;
  } else if (toolName === 'get_keyword_performance') {
    description = `Get keyword performance (top ${parameters.topN || 20})`;
  } else if (toolName === 'get_app_store_performance') {
    description = `Get App Store performance (${parameters.timeframe || '30d'})`;
  } else if (toolName === 'get_optimal_posting_times') {
    description = `Get optimal posting times (${parameters.platform || 'all'})`;
  } else if (toolName === 'get_traffic_sources') {
    description = `Get traffic sources (last ${parameters.days || 30} days)`;
  }

  return {
    action: toolName,
    description,
    requiresApproval: tool.requiresApproval,
    exampleImpact: tool.expectedImpact
  };
}

export default {
  APPROVAL_REQUIRED_TOOLS,
  READ_ONLY_TOOLS,
  getAllToolsForAPI,
  getToolDefinition,
  isApprovalRequired,
  getApprovalRequiredTools,
  getReadOnlyTools,
  TOOL_NAMES,
  validateToolParameters,
  formatToolCallForDisplay
};
