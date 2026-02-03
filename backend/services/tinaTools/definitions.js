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
  },
  /**
   * Strategy Tools - Approval Required
   */
  {
    name: 'create_strategy',
    description: 'Create a new strategic initiative. Use this for significant marketing efforts that deserve tracking and measurement. Strategies can be broad (parent) or specific (child/tactics).',
    requiresApproval: true,
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Strategy name',
          maxLength: 200
        },
        description: {
          type: 'string',
          description: 'Detailed description of the strategy',
          maxLength: 1000
        },
        hypothesis: {
          type: 'string',
          description: 'What we believe will happen and why',
          maxLength: 500
        },
        successMetric: {
          type: 'string',
          description: 'How we measure success (e.g., "followers", "engagement_rate", "revenue")'
        },
        targetValue: {
          description: 'Target value for the success metric'
        },
        currentBaseline: {
          description: 'Current baseline value',
          default: 0
        },
        level: {
          type: 'string',
          description: 'Strategy level: broad (parent) or specific (child/tactic)',
          enum: ['broad', 'specific'],
          default: 'broad'
        },
        parentStrategyId: {
          type: 'string',
          description: 'Parent strategy ID if this is a child/tactic'
        },
        timeframe: {
          type: 'object',
          description: 'Time period for this strategy',
          properties: {
            start: { type: 'string', description: 'Start date (ISO format)' },
            end: { type: 'string', description: 'End date (ISO format)' }
          }
        },
        category: {
          type: 'string',
          description: 'Strategy category for grouping',
          enum: ['growth', 'engagement', 'brand', 'revenue', 'content', 'ads', 'general'],
          default: 'general'
        },
        priority: {
          type: 'number',
          description: 'Priority level (1-10)',
          minimum: 1,
          maximum: 10,
          default: 5
        },
        relatedGoalIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Related goal IDs'
        }
      },
      required: ['name', 'hypothesis', 'successMetric', 'targetValue']
    },
    exampleUsage: {
      name: 'Instagram Reels Growth Push',
      hypothesis: 'Posting 3 Reels daily with trending audio will increase follower count by 20% in 30 days',
      successMetric: 'followers',
      targetValue: 10000,
      currentBaseline: 8000,
      level: 'broad',
      category: 'growth',
      priority: 8
    },
    expectedImpact: 'Creates a trackable strategic initiative with clear success metrics and progress tracking'
  },
  {
    name: 'update_strategy',
    description: 'Update an existing strategy\'s status, values, or parameters. Use to mark progress, change status, or adjust targets.',
    requiresApproval: true,
    parameters: {
      type: 'object',
      properties: {
        strategyId: {
          type: 'string',
          description: 'Strategy ID to update'
        },
        currentValue: {
          description: 'New current value for progress tracking'
        },
        status: {
          type: 'string',
          description: 'New status',
          enum: ['draft', 'active', 'paused', 'completed', 'cancelled']
        },
        notes: {
          type: 'string',
          description: 'Notes about this update',
          maxLength: 500
        }
      },
      required: ['strategyId']
    },
    exampleUsage: {
      strategyId: 'strategy_1234567890_abcd',
      currentValue: 9200,
      notes: 'Good progress, trending toward target'
    },
    expectedImpact: 'Updates strategy progress and tracking'
  },
  {
    name: 'complete_strategy',
    description: 'Mark a strategy as completed with final outcomes and learnings. Use when a strategic initiative has concluded.',
    requiresApproval: true,
    parameters: {
      type: 'object',
      properties: {
        strategyId: {
          type: 'string',
          description: 'Strategy ID to complete'
        },
        outcomes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              metric: { type: 'string' },
              expectedValue: {},
              actualValue: {},
              notes: { type: 'string' }
            }
          },
          description: 'Final outcomes comparing expected vs actual'
        },
        notes: {
          type: 'string',
          description: 'Summary of what was learned',
          maxLength: 1000
        }
      },
      required: ['strategyId']
    },
    exampleUsage: {
      strategyId: 'strategy_1234567890_abcd',
      outcomes: [
        { metric: 'followers', expectedValue: 10000, actualValue: 10500, notes: 'Exceeded target by 5%' }
      ],
      notes: 'Strategy successful. The focus on Reels drove significant growth.'
    },
    expectedImpact: 'Marks strategy complete with documented outcomes for future reference'
  },
  {
    name: 'pause_strategy',
    description: 'Pause an active strategy temporarily. Use when a strategy needs to be put on hold.',
    requiresApproval: true,
    parameters: {
      type: 'object',
      properties: {
        strategyId: {
          type: 'string',
          description: 'Strategy ID to pause'
        },
        reason: {
          type: 'string',
          description: 'Why the strategy is being paused',
          maxLength: 500
        }
      },
      required: ['strategyId']
    },
    exampleUsage: {
      strategyId: 'strategy_1234567890_abcd',
      reason: 'Pausing due to budget reallocation'
    },
    expectedImpact: 'Pauses the strategy while preserving all data for potential resumption'
  },
  {
    name: 'resume_strategy',
    description: 'Resume a paused strategy. Use when restarting a previously paused initiative.',
    requiresApproval: true,
    parameters: {
      type: 'object',
      properties: {
        strategyId: {
          type: 'string',
          description: 'Strategy ID to resume'
        }
      },
      required: ['strategyId']
    },
    exampleUsage: {
      strategyId: 'strategy_1234567890_abcd'
    },
    expectedImpact: 'Resumes a paused strategy'
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
    name: 'get_music',
    description: 'Get available background music tracks for video generation. Returns all available music tracks with their details. Use this to see what music can be selected when creating posts.',
    requiresApproval: false,
    parameters: {
      type: 'object',
      properties: {
        style: {
          type: 'string',
          description: 'Filter by music style (optional)',
          enum: ['romantic', 'dramatic', 'energetic', 'calm', 'mysterious', 'happy', 'melancholic', 'ambient', 'all'],
          default: 'all'
        }
      }
    },
    exampleUsage: {
      style: 'romantic'
    }
  },
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
    description: `Create a new marketing post from a story with optional video generation.

VIDEO GENERATION IS ASYNCHRONOUS: When generateVideo=true, the function returns immediately after launching generation. The post status will be 'generating' and you can check progress later.

IMPORTANT SCHEDULING INFO:
- Current date will be provided in the system context
- When user says "tomorrow morning", schedule for ~9am the next day
- When user says "tomorrow afternoon", schedule for ~3pm the next day
- When user says "tomorrow evening", schedule for ~8pm the next day
- AVOID scheduling at: 2am, 3am, 4am, 5am, 6am, 11pm, 12am (these are not optimal posting times)
- Good posting hours: 8am-11am (morning), 2pm-5pm (afternoon), 7pm-10pm (evening)
- Always use ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ (e.g., 2026-02-02T09:00:00.000Z)

Creates draft posts that can be edited, generated, and approved later.`,
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
        musicId: {
          type: 'string',
          description: 'Background music track ID (optional - leave empty for narration only). Use get_music to see available tracks.'
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
          description: 'Generate video immediately (default: true, runs ASYNCHRONOUSLY - returns immediately)',
          default: true
        },
        scheduleFor: {
          type: 'string',
          description: 'ISO date string to schedule the post (e.g., 2026-02-02T15:30:00.000Z). You can schedule at ANY specific time - down to the minute. Time must be at least 5 minutes in the future. If not provided, uses the next optimal posting slot (within standard posting windows: 8-11am, 2-5pm, or 7-10pm).'
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
        musicId: {
          type: 'string',
          description: 'Background music track ID (optional - leave empty for narration only)'
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
      cta: 'Read more on Blush 🔥'
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
  },
  /**
   * Strategy Memory Tools - Read Only (No Approval Required)
   */
  {
    name: 'get_strategies',
    description: 'Get all marketing strategies with optional filters. Returns strategies including their status, progress, and relationships. Use this to understand current strategic initiatives.',
    requiresApproval: false,
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by strategy status',
          enum: ['draft', 'active', 'paused', 'completed', 'cancelled', 'failed', 'all'],
          default: 'all'
        },
        level: {
          type: 'string',
          description: 'Filter by strategy level',
          enum: ['broad', 'specific', 'all'],
          default: 'all'
        },
        category: {
          type: 'string',
          description: 'Filter by category (optional)'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of strategies to return',
          minimum: 1,
          maximum: 100,
          default: 50
        }
      }
    },
    exampleUsage: {
      status: 'active',
      limit: 20
    }
  },
  {
    name: 'get_strategy_details',
    description: 'Get full details of a specific strategy including progress, status history, related goals, and child strategies.',
    requiresApproval: false,
    parameters: {
      type: 'object',
      properties: {
        strategyId: {
          type: 'string',
          description: 'Strategy ID (either MongoDB _id or strategyId)'
        }
      },
      required: ['strategyId']
    },
    exampleUsage: {
      strategyId: 'strategy_1234567890_abcd'
    }
  },
  {
    name: 'get_strategy_history',
    description: 'Get past strategies and their outcomes. Use this to learn from previous strategic initiatives before creating new ones.',
    requiresApproval: false,
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by completion status',
          enum: ['completed', 'cancelled', 'failed', 'all'],
          default: 'completed'
        },
        days: {
          type: 'number',
          description: 'Number of days to look back',
          minimum: 1,
          maximum: 365,
          default: 90
        },
        category: {
          type: 'string',
          description: 'Filter by category (optional)'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of strategies to return',
          minimum: 1,
          maximum: 100,
          default: 50
        }
      }
    },
    exampleUsage: {
      days: 30,
      limit: 20
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

  // Strategy Tools - Approval required
  CREATE_STRATEGY: 'create_strategy',
  UPDATE_STRATEGY: 'update_strategy',
  COMPLETE_STRATEGY: 'complete_strategy',
  PAUSE_STRATEGY: 'pause_strategy',
  RESUME_STRATEGY: 'resume_strategy',

  // Post Management - Read Only (no approval)
  GET_MUSIC: 'get_music',
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
  GET_TRAFFIC_SOURCES: 'get_traffic_sources',

  // Memory & Context Tools
  GET_RECENT_ACTIVITY: 'get_recent_activity',

  // Strategy Memory Tools - Read Only
  GET_STRATEGIES: 'get_strategies',
  GET_STRATEGY_DETAILS: 'get_strategy_details',
  GET_STRATEGY_HISTORY: 'get_strategy_history'
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
  } else if (toolName === 'get_strategies') {
    description = `Get marketing strategies`;
    if (parameters.status && parameters.status !== 'all') description += ` (${parameters.status})`;
  } else if (toolName === 'get_strategy_details') {
    description = `Get strategy details`;
  } else if (toolName === 'get_strategy_history') {
    description = `Get strategy history (last ${parameters.days || 90} days)`;
  } else if (toolName === 'create_strategy') {
    description = `Create strategy: ${parameters.name || 'New Strategy'}`;
  } else if (toolName === 'update_strategy') {
    description = `Update strategy`;
    if (parameters.status) description += ` to ${parameters.status}`;
  } else if (toolName === 'complete_strategy') {
    description = `Complete strategy with outcomes`;
  } else if (toolName === 'pause_strategy') {
    description = `Pause strategy`;
  } else if (toolName === 'resume_strategy') {
    description = `Resume strategy`;
  } else if (toolName === 'get_stories') {
    description = `Get available common library stories`;
    if (parameters.limit) description += ` (limit: ${parameters.limit})`;
  } else if (toolName === 'get_music') {
    description = `Get available background music tracks`;
    if (parameters.style && parameters.style !== 'all') description += ` (style: ${parameters.style})`;
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
