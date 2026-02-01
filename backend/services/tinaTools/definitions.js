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
  /**
   * Post Management Tools - No Approval Required
   */
  {
    name: 'get_stories',
    description: 'Get available common library stories for post creation. Only returns ready stories (userId: null, status: "ready") that can be used for marketing content.',
    requiresApproval: false,
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by story category (optional): Paranormal, Historical, Billionaire, Contemporary, Fantasy, Other',
          enum: ['Paranormal', 'Historical', 'Billionaire', 'LGBTQ+', 'Contemporary', 'Fantasy', 'Other']
        },
        spiciness: {
          type: 'number',
          description: 'Filter by maximum spiciness level (0-3, optional)',
          minimum: 0,
          maximum: 3
        },
        search: {
          type: 'string',
          description: 'Search keyword to find stories by name or description (optional). Searches both title and description fields.'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of stories to return',
          minimum: 1,
          maximum: 50,
          default: 20
        }
      }
    },
    exampleUsage: {
      search: 'billionaire',
      limit: 10
    }
  },
  {
    name: 'create_post',
    description: 'Create a new marketing post from a story with optional video generation. Creates draft posts that can be edited, generated, and approved later.',
    requiresApproval: false,
    parameters: {
      type: 'object',
      properties: {
        storyId: {
          type: 'string',
          description: 'Story ID to base the post on (must be a ready common library story)'
        },
        platforms: {
          type: 'array',
          items: { type: 'string' },
          description: 'Target platforms: can specify multiple (tiktok, instagram, youtube_shorts)',
          uniqueItems: true
        },
        caption: {
          type: 'string',
          description: 'Post caption text (optional - auto-generated if not provided)'
        },
        hook: {
          type: 'string',
          description: 'Hook text for opening (optional - auto-generated if not provided)'
        },
        hashtags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Hashtags for the post (optional - auto-generated if not provided)'
        },
        contentType: {
          type: 'string',
          description: 'Content type to create',
          enum: ['video', 'image', 'carousel'],
          default: 'video'
        },
        contentTier: {
          type: 'string',
          description: 'Video generation tier',
          enum: ['tier_1', 'tier_2', 'tier_3'],
          default: 'tier_1'
        },
        // Tier 1 specific parameters
        preset: {
          type: 'string',
          description: 'Slide composition preset (for tier_1 videos)',
          enum: ['triple_visual', 'hook_first'],
          default: 'triple_visual'
        },
        cta: {
          type: 'string',
          description: 'Call-to-action text for final slide (supports emojis). Default: "Read more on Blush 🔥"',
          default: 'Read more on Blush 🔥'
        },
        includeMusic: {
          type: 'boolean',
          description: 'Include background music in video',
          default: true
        },
        effects: {
          type: 'object',
          description: 'Video effects configuration',
          properties: {
            kenBurns: { type: 'boolean', default: true },
            pan: { type: 'boolean', default: false },
            textOverlay: { type: 'boolean', default: true },
            vignette: { type: 'boolean', default: true },
            fadeIn: { type: 'boolean', default: true },
            fadeOut: { type: 'boolean', default: true }
          }
        },
        voice: {
          type: 'string',
          description: 'Voice selection for narration',
          enum: ['female_1', 'female_2', 'female_3', 'male_1', 'male_2', 'male_3'],
          default: 'female_1'
        },
        generateVideo: {
          type: 'boolean',
          description: 'Generate video immediately (default: true)',
          default: true
        },
        scheduleFor: {
          type: 'string',
          description: 'ISO date string to schedule the post (optional - auto-scheduled if not provided)'
        }
      },
      required: ['storyId', 'platforms']
    },
    exampleUsage: {
      storyId: '507f1f77bcf86cd799439011',
      platforms: ['tiktok', 'instagram'],
      preset: 'triple_visual',
      voice: 'female_1',
      cta: 'Download now on Blush 🔥',
      generateVideo: true
    },
    expectedImpact: 'Creates a new marketing post with generated video. Post is marked as draft and requires approval before publishing.'
  },
  {
    name: 'edit_post',
    description: 'Edit an existing post\'s parameters. Note: Editing approved or scheduled posts resets status to pending, requiring re-approval.',
    requiresApproval: false,
    parameters: {
      type: 'object',
      properties: {
        postId: {
          type: 'string',
          description: 'Post ID to edit'
        },
        caption: {
          type: 'string',
          description: 'New caption text'
        },
        hook: {
          type: 'string',
          description: 'New hook text'
        },
        hashtags: {
          type: 'array',
          items: { type: 'string' },
          description: 'New hashtags'
        },
        voice: {
          type: 'string',
          description: 'New voice selection (for regeneration)',
          enum: ['female_1', 'female_2', 'female_3', 'male_1', 'male_2', 'male_3']
        },
        contentTier: {
          type: 'string',
          description: 'New content tier (for regeneration)',
          enum: ['tier_1', 'tier_2', 'tier_3']
        }
      },
      required: ['postId']
    },
    exampleUsage: {
      postId: '507f1f77bcf86cd799439011',
      caption: 'Updated caption text'
    },
    expectedImpact: 'Updates post parameters. Approved/scheduled posts will require re-approval.'
  },
  {
    name: 'generate_post_video',
    description: 'Generate video for an existing post using the Tier 1 video generation system with multi-slide presets. Skips if video already exists unless forceRegenerate is true.',
    requiresApproval: false,
    parameters: {
      type: 'object',
      properties: {
        postId: {
          type: 'string',
          description: 'Post ID to generate video for'
        },
        preset: {
          type: 'string',
          description: 'Slide composition preset',
          enum: ['triple_visual', 'hook_first'],
          default: 'triple_visual'
        },
        voice: {
          type: 'string',
          description: 'Voice selection (uses post default if not specified)',
          enum: ['female_1', 'female_2', 'female_3', 'male_1', 'male_2', 'male_3']
        },
        cta: {
          type: 'string',
          description: 'Call-to-action text for final slide (supports emojis). Default: "Read more on Blush 🔥"',
          default: 'Read more on Blush 🔥'
        },
        includeMusic: {
          type: 'boolean',
          description: 'Include background music',
          default: true
        },
        effects: {
          type: 'object',
          description: 'Effect configuration',
          properties: {
            kenBurns: { type: 'boolean' },
            pan: { type: 'boolean' },
            textOverlay: { type: 'boolean' },
            vignette: { type: 'boolean' },
            fadeIn: { type: 'boolean' },
            fadeOut: { type: 'boolean' }
          }
        },
        forceRegenerate: {
          type: 'boolean',
          description: 'Force regeneration even if video exists',
          default: false
        }
      },
      required: ['postId']
    },
    exampleUsage: {
      postId: '507f1f77bcf86cd799439011',
      preset: 'hook_first',
      voice: 'female_1',
      cta: 'Read more on Blush 🔥',
      includeMusic: true
    },
    expectedImpact: 'Generates or regenerates video content for the post'
  },
  {
    name: 'regenerate_post_video',
    description: 'Regenerate video with new parameters based on feedback. Tracks regeneration count to prevent infinite loops. Supports multi-slide presets.',
    requiresApproval: false,
    parameters: {
      type: 'object',
      properties: {
        postId: {
          type: 'string',
          description: 'Post ID to regenerate video for'
        },
        preset: {
          type: 'string',
          description: 'Slide composition preset',
          enum: ['triple_visual', 'hook_first']
        },
        feedback: {
          type: 'string',
          description: 'What to change in the regeneration (e.g., "slower zoom", "different voice")'
        },
        voice: {
          type: 'string',
          description: 'New voice selection',
          enum: ['female_1', 'female_2', 'female_3', 'male_1', 'male_2', 'male_3']
        },
        hook: {
          type: 'string',
          description: 'New hook text'
        },
        caption: {
          type: 'string',
          description: 'New caption text'
        },
        cta: {
          type: 'string',
          description: 'New call-to-action text for final slide (supports emojis). Default: "Read more on Blush 🔥"'
        },
        effects: {
          type: 'object',
          description: 'New effect settings',
          properties: {
            kenBurns: { type: 'boolean' },
            pan: { type: 'boolean' },
            textOverlay: { type: 'boolean' },
            vignette: { type: 'boolean' },
            fadeIn: { type: 'boolean' },
            fadeOut: { type: 'boolean' }
          }
        }
      },
      required: ['postId']
    },
    exampleUsage: {
      postId: '507f1f77bcf86cd799439011',
      preset: 'triple_visual',
      feedback: 'Make the zoom effect slower and more subtle',
      cta: 'Read more on Blush 🔥'
    },
    expectedImpact: 'Regenerates video with adjusted parameters based on feedback'
  },
  {
    name: 'schedule_post',
    description: 'Schedule one or more approved posts for specific dates/times. Posts must be in approved status to be scheduled.',
    requiresApproval: false,
    parameters: {
      type: 'object',
      properties: {
        postIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of post IDs to schedule'
        },
        scheduledAt: {
          type: 'string',
          description: 'ISO date string for when to post (applies to all posts)'
        }
      },
      required: ['postIds', 'scheduledAt']
    },
    exampleUsage: {
      postIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
      scheduledAt: '2025-02-01T14:00:00Z'
    },
    expectedImpact: 'Schedules approved posts for automatic publishing at the specified time'
  },
  /**
   * Analytics Tools - Read Only
   */
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
    name: 'get_posting_schedule',
    description: 'Get current content posting schedule configuration including frequency and platforms',
    requiresApproval: false,
    parameters: {
      type: 'object',
      properties: {}
    },
    exampleUsage: {}
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
  },
  /**
   * Memory & Context Tools - Read Only
   */
  {
    name: 'get_recent_activity',
    description: 'Get your recent activity history - tool calls you made, posts you created, videos you generated, and decisions you made. Use this when you need to recall what you did recently.',
    requiresApproval: false,
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of recent actions to show',
          minimum: 5,
          maximum: 50,
          default: 20
        },
        activityType: {
          type: 'string',
          description: 'Filter by activity type (optional)',
          enum: ['all', 'posts_created', 'videos_generated', 'tools_called', 'all']
        }
      }
    },
    exampleUsage: {
      limit: 20,
      activityType: 'all'
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

  // Post Management - Read Only (no approval)
  GET_STORIES: 'get_stories',
  CREATE_POST: 'create_post',
  EDIT_POST: 'edit_post',
  GENERATE_POST_VIDEO: 'generate_post_video',
  REGENERATE_POST_VIDEO: 'regenerate_post_video',
  SCHEDULE_POST: 'schedule_post',

  // Read only - existing
  GET_CAMPAIGN_PERFORMANCE: 'get_campaign_performance',
  GET_CONTENT_ANALYTICS: 'get_content_analytics',
  GET_BUDGET_STATUS: 'get_budget_status',
  GET_ASO_KEYWORD_STATUS: 'get_aso_keyword_status',
  GET_REVENUE_SUMMARY: 'get_revenue_summary',
  GET_PENDING_POSTS: 'get_pending_posts',
  GET_POSTING_SCHEDULE: 'get_posting_schedule',

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
  } else if (toolName === 'get_posting_schedule') {
    description = `Get current posting schedule configuration`;
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
  } else if (toolName === 'get_stories') {
    description = `Get available common library stories`;
    if (parameters.limit) description += ` (limit: ${parameters.limit})`;
  } else if (toolName === 'create_post') {
    description = `Create new marketing post from story`;
    if (parameters.platforms) description += ` for ${parameters.platforms.join(', ')}`;
    if (parameters.generateVideo) description += ' with video';
  } else if (toolName === 'edit_post') {
    description = `Edit post parameters`;
  } else if (toolName === 'generate_post_video') {
    description = `Generate video for post`;
  } else if (toolName === 'regenerate_post_video') {
    description = `Regenerate video with feedback`;
    if (parameters.feedback) description += `: "${parameters.feedback.substring(0, 30)}..."`;
  } else if (toolName === 'schedule_post') {
    description = `Schedule ${parameters.postIds?.length || 0} post(s)`;
    if (parameters.scheduledAt) description += ` for ${new Date(parameters.scheduledAt).toLocaleDateString()}`;
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
