# Tina Tool-Use System Documentation

## Configuration

**Required Environment Variables:**

```bash
# Z.AI GLM API (get API key from https://z.ai/manage-apikey/apikey-list)
GLM47_API_KEY=your_api_key_here
GLM47_API_ENDPOINT=https://api.z.ai/api/paas/v4
```

**Important Notes:**
- Use Z.AI's native OpenAI-compatible endpoint, NOT the Anthropic-compatible endpoint
- The correct model name is `glm-4.7` (not `glm-4-plus`)
- System messages are included in the messages array, not as a separate parameter

---

## Overview

The Tina Tool-Use System enables Tina (AI Marketing Executive) to suggest and execute system actions through the chat interface with mandatory user approval for sensitive operations. This implements a "man-in-the-loop" approval workflow where Tina can propose actions, discuss them with the user, and then execute them upon approval.

### Key Features

- **Function Calling**: Tina can call tools to perform actions in the system
- **Approval Workflow**: Sensitive operations require explicit user approval before execution
- **Audit Trail**: All tool proposals and executions are logged in the database
- **Read-Only Tools**: Informational tools that can execute without approval (future: man-on-the-loop)
- **UI Integration**: Tool proposals appear as interactive cards in the chat interface

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              User Interface                                 │
│                     (Chat Page with Tool Proposal Cards)                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Frontend                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  Chat.jsx                                                           │ │
│  │  - toolProposals state                                              │ │
│  │  - handleApproveTool()                                             │ │
│  │  - handleRejectTool()                                              │ │
│  │  - handleDiscussTool()                                             │ │
│  │  - ToolProposalCard component                                       │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ REST API
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Backend API                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  chat.js (routes)                                                    │ │
│  │  - POST /api/chat/message        (main chat endpoint)               │ │
│  │  - POST /api/chat/tools/approve   (approve & execute)              │ │
│  │  - POST /api/chat/tools/reject    (reject proposal)                │ │
│  │  - GET  /api/chat/tools/pending   (list pending)                  │ │
│  │  - GET  /api/chat/tools/history   (audit trail)                   │ │
│  │  - GET  /api/chat/tools/list      (available tools)                │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
│   GLM Service           │ │   tinaTools Module      │ │   ToolProposal Model    │
│   (glmService.js)       │ │                         │ │   (ToolProposal.js)     │
│                         │ │ ┌─────────────────────┐ │ │                         │
│ - createMessage()       │ │ │ definitions.js       │ │ │ - toolName              │
│ - with tools parameter  │ │ │ - Tool schemas       │ │ │ - toolParameters        │
│ - Returns toolCall      │ │ │ - Validation         │ │ │ - reasoning             │
│                         │ │ └─────────────────────┘ │ │ - status (pending/etc)   │
└─────────────────────────┘ │ ┌─────────────────────┐ │ │ - executionResult       │
                            │ │ proposalHandler.js   │ │ │ - audit timestamps     │
                            │ │ - Creates proposals  │ │ │                         │
                            │ │ - Extracts reasoning │ │ └─────────────────────────┘
                            │ └─────────────────────┘ │
                            │ ┌─────────────────────┐ │
                            │ │ executor.js          │ │
                            │ │ - Executes tools     │ │
                            │ │ - Returns results    │ │
                            │ └─────────────────────┘ │
                            │ ┌─────────────────────┐ │
                            │ │ index.js             │ │
                            │ │ - Main exports       │ │
                            │ └─────────────────────┘ │
                            └─────────────────────────┘
```

---

## Flow Diagram

```
User Message → Chat API → GLM Service (with tools) → Tina Response
                                                          │
                                                          ▼
                                            ┌─────────────────────────┐
                                            │ Tool Call Detected?    │
                                            └─────────────────────────┘
                                                     │
                                    ┌────────────────┴────────────────┐
                                    │                                 │
                                    ▼ No                              ▼ Yes
                            ┌───────────────┐              ┌──────────────────┐
                            │ Return Text   │              │ Create Proposal │
                            │ Response      │              │ in Database     │
                            └───────────────┘              └────────┬─────────┘
                                                                 │
                                                                 ▼
                                                          ┌──────────────────┐
                                                          │ Return Response  │
                                                          │ + toolProposal   │
                                                          │ metadata to UI   │
                                                          └────────┬─────────┘
                                                                   │
                                                    ┌──────────────────┴──────────┐
                                                    │                             │
                                                    ▼ UI                          ▼ UI
                                            ┌─────────────────┐         ┌─────────────────┐
                                            │ User Clicks     │         │ User Clicks     │
                                            │ Approve         │         │ Reject          │
                                            └────────┬────────┘         └─────────────────┘
                                                     │
                                                     ▼
                                          ┌──────────────────────────┐
                                          │ POST /tools/approve      │
                                          │ - Mark proposal approved │
                                          │ - Execute tool           │
                                          │ - Return result          │
                                          └──────────────────────────┘
```

---

## File Structure

### Backend Files

```
backend/
├── models/
│   └── ToolProposal.js              # Database model for tool proposals
│
├── services/
│   ├── glmService.js               # MODIFIED: Added tools/tool_choice support
│   ├── tinaPersonality.js          # MODIFIED: Added tool use instructions
│   └── tinaTools/                   # NEW: Tool system module
│       ├── definitions.js          # Tool schema definitions
│       ├── proposalHandler.js      # Creates proposals from tool calls
│       ├── executor.js             # Executes approved tools
│       └── index.js                # Module exports
│
└── api/
    └── chat.js                      # MODIFIED: Added tool approval endpoints
```

### Frontend Files

```
frontend/src/pages/
└── Chat.jsx                          # MODIFIED: Tool proposal UI
```

---

## File Details

### `backend/models/ToolProposal.js`

Defines the MongoDB schema for tool execution proposals.

**Key Fields:**
- `toolName`: Name of the tool being called
- `toolParameters`: Parameters passed to the tool
- `reasoning`: Tina's explanation of why she wants to do this
- `status`: Workflow status (`pending_approval`, `approved`, `rejected`, `executed`, `failed`)
- `requiresApproval`: Whether this action needs user approval
- `conversationId`: Link to the chat conversation
- `executedAt`, `executionResult`, `executionError`: Execution tracking

**Methods:**
- `approve(user)` - Mark as approved
- `reject(reason, user)` - Mark as rejected
- `markExecuted(result)` - Mark as executed with result
- `markFailed(error)` - Mark as failed

---

### `backend/services/tinaTools/definitions.js`

Defines all available tools with their parameters and validation.

**Two Tool Categories:**

1. **APPROVAL_REQUIRED_TOOLS** - Require user approval:
   - `update_posting_schedule` - Change posting frequency
   - `update_content_generation_prompt` - Modify AI prompts
   - `update_campaign_budget` - Adjust ad campaign budgets
   - `pause_campaign` - Pause an ad campaign
   - `approve_pending_posts` - Bulk approve posts
   - `update_hashtag_strategy` - Change hashtag approach
   - `create_content_experiment` - Create A/B tests

2. **READ_ONLY_TOOLS** - Informational (no approval needed):

   **Original Tools:**
   - `get_campaign_performance` - Fetch campaign metrics
   - `get_content_analytics` - Get content stats
   - `get_budget_status` - Check budget utilization
   - `get_aso_keyword_status` - Get keyword rankings
   - `get_revenue_summary` - Get revenue metrics
   - `get_pending_posts` - List pending posts

   **Phase 1: High-Value Data Access Tools:**
   - `get_conversion_metrics` - Free-to-paid, trial-to-paid conversion rates with tier breakdown
   - `get_acquisition_metrics` - CPI, CAC, organic vs paid breakdown by channel
   - `get_ltv_by_channel` - Lifetime value analysis per acquisition channel
   - `get_campaign_roi` - Detailed ROAS and profitability by campaign
   - `get_spend_by_channel` - Spending breakdown with efficiency metrics
   - `get_roi_by_channel` - ROI comparison across marketing channels

   **Phase 2: User Behavior & Retention:**
   - `get_retention_metrics` - Day 1, 7, 30 retention cohort analysis
   - `get_user_activity_metrics` - DAU/WAU/MAU, stickiness, session analytics
   - `get_subscription_tier_performance` - Monthly vs annual vs lifetime breakdown

   **Phase 3: Content & ASO Enhancements:**
   - `get_keyword_performance` - ASA keyword-level performance with rankings
   - `get_app_store_performance` - Impressions, conversion rate from App Store Connect
   - `get_optimal_posting_times` - Best posting times by platform/category
   - `get_traffic_sources` - Web and app traffic source breakdown

**Key Exports:**
- `getAllToolsForAPI()` - Returns tools formatted for Z.AI GLM API (OpenAI-style)
- `getToolDefinition(toolName)` - Get a specific tool's definition
- `isApprovalRequired(toolName)` - Check if tool needs approval
- `validateToolParameters(toolName, parameters)` - Validate parameters against schema

**Tool Format for Z.AI API:**
```javascript
{
  type: "function",
  function: {
    name: "tool_name",
    description: "Human-readable description",
    parameters: {
      type: "object",
      properties: {
        paramName: { type: "string", description: "..." }
      },
      required: ["paramName"]
    }
  }
}
```

---

### `backend/services/tinaTools/proposalHandler.js`

Handles the creation of proposals from tool calls.

**Key Function:**
```javascript
await handleToolCallProposal(toolCall, messages, conversationId, dataContext)
```

**Process:**
1. Extracts tool call details (name, parameters)
2. Gets tool definition and checks if approval is required
3. Extracts reasoning from conversation context
4. Creates `ToolProposal` record in database
5. Returns proposal object for UI display

---

### `backend/services/tinaTools/executor.js`

Executes approved tools.

**Key Function:**
```javascript
await executeTool(proposal)
```

**Tool Implementations:**

Each tool has a corresponding implementation function:

```javascript
async function updatePostingSchedule({ frequency, platforms })
async function updateContentPrompt({ category, promptAddition })
async function updateCampaignBudget({ campaignId, dailyBudget, reasoning })
async function pauseCampaign({ campaignId, reason })
async function approvePendingPosts({ count, criteria, platforms })
async function updateHashtagStrategy({ strategy, category, customHashtags })
async function createContentExperiment({ experimentName, hypothesis, variants, ... })

// Read-only tools
async function getCampaignPerformance({ timeframe, campaignId })
async function getContentAnalytics({ days, platform, category })
async function getBudgetStatus()
async function getASOKeywordStatus({ topN })
async function getRevenueSummary({ days })
async function getPendingPosts({ platform, limit })
```

**New Read-Only Tool Implementations (Phase 1-3):**

```javascript
// Phase 1: High-Value Tools
async function getConversionMetrics({ timeframe })
async function getAcquisitionMetrics({ timeframe, channel })
async function getLTVByChannel({ timeframe })
async function getCampaignROI({ timeframe, campaignId })
async function getSpendByChannel({ timeframe })
async function getROIByChannel({ timeframe })

// Phase 2: User Behavior & Retention
async function getRetentionMetrics({ timeframe })
async function getUserActivityMetrics({ days })
async function getSubscriptionTierPerformance({ days })

// Phase 3: Content & ASO Enhancements
async function getKeywordPerformance({ timeframe, topN })
async function getAppStorePerformance({ timeframe })
async function getOptimalPostingTimes({ platform, category })
async function getTrafficSources({ days })
```

---

## Data Access Tools Reference

### Phase 1: High-Value Tools

#### `get_conversion_metrics`

Fetches user conversion metrics including free-to-paid and trial-to-paid conversion rates.

**Parameters:**
- `timeframe` (optional): `"7d"` | `"30d"` | `"90d"` | `"this_month"` | `"last_month"` (default: `"30d"`)

**Returns:**
```javascript
{
  timeframe: string,
  period: { start: ISODate, end: ISODate },
  conversionRates: {
    freeToPaid: number,      // Percentage of free users converting to paid
    trialToPaid: number      // Percentage of trial users converting to paid
  },
  userCounts: {
    totalFreeUsers: number,
    totalTrialUsers: number,
    totalPaidUsers: number
  },
  tierBreakdown: {
    trial: number,
    monthly: number,
    annual: number,
    lifetime: number
  },
  insights: string[]         // Actionable recommendations
}
```

**Data Sources:**
- `marketing_retention_metrics` - Conversion rates from lifecycle metrics
- `marketing_daily_revenue_aggregates` - Subscriber tier breakdown

---

#### `get_acquisition_metrics`

Fetches user acquisition metrics including CPI, CAC, and organic vs paid breakdown.

**Parameters:**
- `timeframe` (optional): `"7d"` | `"30d"` | `"90d"` | `"this_month"` | `"last_month"` (default: `"30d"`)
- `channel` (optional): `"organic"` | `"apple_search_ads"` | `"tiktok"` | `"instagram"` | `"google_ads"` | `"all"`

**Returns:**
```javascript
{
  timeframe: string,
  period: { start: ISODate, end: ISODate },
  summary: {
    totalNewUsers: number,
    totalSpend: number,
    averageCAC: number,        // Cost per acquisition
    organicPercentage: number,
    paidPercentage: number
  },
  channelBreakdown: [{
    channel: string,
    newUsers: number,
    revenue: number,
    estimatedSpend: number,
    cac: number                // Channel-specific CAC
  }]
}
```

**Data Sources:**
- `marketing_daily_revenue_aggregates.byChannel` - Channel revenue and customer data
- `marketing_daily_spends` - Ad spend data

---

#### `get_ltv_by_channel`

Calculates lifetime value (LTV) by acquisition channel.

**Parameters:**
- `timeframe` (optional): `"30d"` | `"90d"` | `"this_month"` | `"last_month"` (default: `"90d"`)

**Returns:**
```javascript
{
  timeframe: string,
  period: { start: ISODate, end: ISODate },
  channelLTV: [{
    channel: string,
    ltv: number,               // Lifetime value per customer
    totalRevenue: number,
    newCustomers: number,
    avgTransactionValue: number,
    avgRetentionDay7: number,
    avgRetentionDay30: number
  }],
  insights: string[]
}
```

**Data Sources:**
- `marketing_daily_revenue_aggregates.byChannel` - Revenue by channel
- `marketing_retention_metrics` - Retention by channel

---

#### `get_campaign_roi`

Fetches detailed ROAS and profitability metrics for advertising campaigns.

**Parameters:**
- `timeframe` (optional): `"7d"` | `"30d"` | `"90d"` | `"this_month"` (default: `"30d"`)
- `campaignId` (optional): Specific campaign ID to filter

**Returns:**
```javascript
{
  timeframe: string,
  period: { start: ISODate, end: ISODate },
  totalSpend: number,
  campaigns: [{
    campaignId: string,
    campaignName: string,
    revenue: number,
    estimatedSpend: number,
    newCustomers: number,
    roas: number,              // Return on ad spend
    roi: number,               // ROI percentage
    cac: number
  }],
  insights: string[]
}
```

**Data Sources:**
- `marketing_daily_revenue_aggregates.byCampaign` - Campaign revenue data
- `marketing_daily_spends` - Spend data

---

#### `get_spend_by_channel`

Fetches detailed spending breakdown with efficiency metrics by marketing channel.

**Parameters:**
- `timeframe` (optional): `"7d"` | `"30d"` | `"90d"` | `"this_month"` | `"last_month"` (default: `"30d"`)

**Returns:**
```javascript
{
  timeframe: string,
  period: { start: ISODate, end: ISODate },
  summary: {
    totalSpend: number,
    avgDailySpend: number,
    totalRevenue: number,
    overallROAS: number
  },
  channelBreakdown: [{
    channel: string,
    estimatedSpend: number,
    revenue: number,
    roas: number,
    newCustomers: number,
    cac: number,
    spendPercentage: number
  }]
}
```

---

#### `get_roi_by_channel`

Compares ROI performance across marketing channels.

**Parameters:**
- `timeframe` (optional): `"7d"` | `"30d"` | `"90d"` | `"this_month"` | `"last_month"` (default: `"30d"`)

**Returns:**
```javascript
{
  timeframe: string,
  period: { start: ISODate, end: ISODate },
  channelROI: [{
    channel: string,
    revenue: number,
    estimatedSpend: number,
    profit: number,
    roas: number,
    roi: number,               // ROI percentage
    newCustomers: number
  }],
  bestChannel: object,         // Highest ROI channel
  insights: string[]
}
```

---

### Phase 2: User Behavior & Retention

#### `get_retention_metrics`

Fetches detailed retention cohort analysis (Day 1, 7, 30 retention rates).

**Parameters:**
- `timeframe` (optional): `"7d"` | `"30d"` | `"90d"` (default: `"30d"`)

**Returns:**
```javascript
{
  timeframe: string,
  period: { start: ISODate, end: ISODate },
  averageRetention: {
    day1: number,              // % users returning day 1
    day7: number,              // % users returning day 7
    day30: number,             // % users returning day 30
    rollingDay7: number,
    rollingDay30: number
  },
  recentCohorts: [{
    cohortDate: string,
    cohortSize: number,
    day1: number,
    day7: number,
    day30: number
  }],
  retentionByChannel: [{
    channel: string,
    cohortSize: number,
    avgRetentionDay1: number,
    avgRetentionDay7: number,
    avgRetentionDay30: number
  }],
  insights: string[]
}
```

**Data Sources:**
- `marketing_retention_metrics` - Full retention cohort data

---

#### `get_user_activity_metrics`

Fetches user activity metrics including DAU, WAU, MAU and session analytics.

**Parameters:**
- `days` (optional): Number of days to analyze, 7-90 (default: `30`)

**Returns:**
```javascript
{
  period: {
    days: number,
    start: ISODate,
    end: ISODate
  },
  appMetrics: {
    avgDAU: number,            // Daily Active Users
    avgWAU: number,            // Weekly Active Users
    avgMAU: number,            // Monthly Active Users
    stickinessRatio: number,   // DAU/MAU percentage
    maxDAU: number,
    minDAU: number
  },
  webMetrics: {
    totalSessions: number,
    totalUsers: number,
    avgDailySessions: number
  },
  insights: string[]
}
```

**Data Sources:**
- `marketing_retention_metrics.activeUsers` - DAU/WAU/MAU data
- `marketing_google_analytics_daily` - Web traffic data

---

#### `get_subscription_tier_performance`

Fetches detailed performance breakdown by subscription tier (monthly vs annual vs lifetime).

**Parameters:**
- `days` (optional): Number of days to analyze, 7-90 (default: `30`)

**Returns:**
```javascript
{
  period: {
    days: number,
    start: ISODate,
    end: ISODate
  },
  currentSubscribers: {
    total: number,
    byTier: {
      trial: number,
      monthly: number,
      annual: number,
      lifetime: number
    },
    tierPercentages: {
      trial: number,
      monthly: number,
      annual: number,
      lifetime: number
    }
  },
  periodRevenue: {
    total: number,
    byTier: {
      trial: number,
      monthly: number,
      annual: number,
      lifetime: number
    }
  },
  mrrContribution: {
    total: number,
    byTier: {
      trial: 0,
      monthly: number,
      annual: number,
      lifetime: 0
    }
  },
  insights: string[]
}
```

**Data Sources:**
- `marketing_daily_revenue_aggregates` - Subscriber and revenue by tier

---

### Phase 3: Content & ASO Enhancements

#### `get_keyword_performance`

Fetches Apple Search Ads keyword-level performance metrics.

**Parameters:**
- `timeframe` (optional): `"7d"` | `"30d"` | `"this_month"` (default: `"30d"`)
- `topN` (optional): Number of keywords to return, 5-100 (default: `20`)

**Returns:**
```javascript
{
  timeframe: string,
  period: { start: ISODate, end: ISODate },
  summary: {
    totalKeywords: number,
    top10Count: number,
    improvingCount: number,
    decliningCount: number
  },
  keywordMetrics: [{
    keyword: string,
    currentRanking: number,
    avgRanking: number,
    searchVolume: number,
    opportunityScore: number,
    rankingTrend: "up" | "down" | "stable",
    competitionLevel: string
  }],
  insights: string[]
}
```

**Data Sources:**
- `marketing_aso_keywords` - Keyword rankings and opportunity scores
- Apple Search Ads API (via service) - Actual keyword performance

---

#### `get_app_store_performance`

Fetches App Store Connect metrics including impressions and conversion rate.

**Parameters:**
- `timeframe` (optional): `"7d"` | `"30d"` | `"this_month"` (default: `"30d"`)

**Returns:**
```javascript
{
  timeframe: string,
  period: { start: ISODate, end: ISODate },
  metrics: {
    impressions: number,
    productPageViews: number,
    downloads: number,
    conversionRate: number     // View-to-download percentage
  },
  asoMetrics: {
    avgOverallScore: number,
    dataPoints: number
  },
  insights: string[]
}
```

**Data Sources:**
- App Store Connect API (via appStoreConnectService) - Impressions, page views, downloads
- `marketing_aso_scores` - ASO optimization scores

---

#### `get_optimal_posting_times`

Analyzes best posting times based on engagement metrics by platform and category.

**Parameters:**
- `platform` (optional): `"tiktok"` | `"instagram"` | `"youtube"` | `"all"` (default: `"all"`)
- `category` (optional): Content category filter

**Returns:**
```javascript
{
  platform: string,
  category: string,
  analyzedPosts: number,
  bestHours: [{
    hour: number,               // 0-23
    timeRange: string,          // "14:00 - 15:00"
    avgEngagementRate: number,
    totalViews: number
  }],
  bestDays: [{
    day: string,               // "Monday", "Tuesday", etc.
    avgEngagementRate: number,
    totalViews: number
  }],
  insights: string[]
}
```

**Data Sources:**
- `marketing_posts` - Posted content with engagement metrics

---

#### `get_traffic_sources`

Fetches traffic source breakdown from web and app analytics.

**Parameters:**
- `days` (optional): Number of days to analyze, 7-90 (default: `30`)

**Returns:**
```javascript
{
  period: {
    days: number,
    start: ISODate,
    end: ISODate
  },
  webTraffic: {
    totalSessions: number,
    totalUsers: number,
    totalPageViews: number,
    sources: [{
      source: string,           // "organic", "social", "direct", etc.
      sessions: number,
      users: number,
      percentage: number
    }]
  },
  appAcquisition: {
    channels: [{
      channel: string,          // "organic", "apple_search_ads", etc.
      newCustomers: number,
      percentage: number
    }]
  },
  insights: string[]
}
```

**Data Sources:**
- `marketing_google_analytics_daily` - Web traffic sources
- `marketing_daily_revenue_aggregates.byChannel` - App acquisition channels

---

### Data Availability Matrix

| Tool | Data Source | Status | Notes |
|------|-------------|--------|-------|
| `get_conversion_metrics` | `marketing_retention_metrics` | ✅ Available | Uses lifecycle conversion rates |
| `get_acquisition_metrics` | `marketing_daily_revenue_aggregates` | ✅ Available | Channel breakdown populated |
| `get_ltv_by_channel` | `marketing_daily_revenue_aggregates` | ✅ Available | LTV calculated from revenue/customers |
| `get_campaign_roi` | `marketing_daily_revenue_aggregates` | ⚠️ Partial | Campaign data may be incomplete |
| `get_spend_by_channel` | `marketing_daily_spends` | ✅ Available | Daily spend tracking |
| `get_roi_by_channel` | Combined sources | ✅ Available | Derived from revenue + spend |
| `get_retention_metrics` | `marketing_retention_metrics` | ✅ Available | Full cohort analysis |
| `get_user_activity_metrics` | `marketing_retention_metrics` | ✅ Available | DAU/WAU/MAU from Firebase/ASC |
| `get_subscription_tier_performance` | `marketing_daily_revenue_aggregates` | ✅ Available | Subscriber counts by tier |
| `get_keyword_performance` | `marketing_aso_keywords` | ✅ Available | Keyword rankings with history |
| `get_app_store_performance` | App Store Connect API | ⚠️ Partial | Requires API configuration |
| `get_optimal_posting_times` | `marketing_posts` | ✅ Available | Analyzes posted content |
| `get_traffic_sources` | `marketing_google_analytics_daily` | ✅ Available | Web + app traffic sources |

**Legend:**
- ✅ Available - Data source exists and is populated
- ⚠️ Partial - Data exists but may be incomplete
- ❌ Not Available - Collection exists but data not populated

---

### `backend/services/tinaTools/index.js`

Main export module for the tinaTools package.

**Exports:**
- All tool definitions
- Proposal handler functions
- Executor functions
- Convenience functions like `getAllTools()`, `getToolMetadata()`

---

### `backend/services/glmService.js`

**Uses Z.AI's Native OpenAI-Compatible API**

The GLM service connects to Z.AI's GLM-4.7 model using their native OpenAI-compatible endpoint.

**Configuration:**
- **Endpoint**: `https://api.z.ai/api/paas/v4/chat/completions`
- **Model**: `glm-4.7` (supports function calling)
- **Format**: OpenAI-style (not Anthropic)

**Key Modifications:**
- System messages are prepended to the messages array (not separate parameter)
- Added `tools` parameter in OpenAI format: `{ type: "function", function: { name, description, parameters } }`
- Added `tool_choice` parameter: `'auto'` or `'required'`
- Parses `tool_calls` from OpenAI-style response: `choices[0].message.tool_calls`
- Returns `toolCall` convenience property when AI uses a tool

**Request Format:**
```javascript
{
  model: "glm-4.7",
  messages: [
    { role: "system", content: "..." },
    { role: "user", content: "..." }
  ],
  tools: [
    {
      type: "function",
      function: {
        name: "tool_name",
        description: "...",
        parameters: { type: "object", properties: {...}, required: [...] }
      }
    }
  ],
  tool_choice: "auto"
}
```

**Response Format:**
```javascript
{
  id: "...",
  choices: [{
    message: {
      role: "assistant",
      content: "...",
      tool_calls: [{
        id: "...",
        function: {
          name: "tool_name",
          arguments: "{\"param\":\"value\"}"
        }
      }]
    }
  }],
  usage: { prompt_tokens, completion_tokens, total_tokens }
}
```

---

### `backend/api/chat.js`

**New Endpoints:**

```javascript
POST /api/chat/tools/approve
  Body: { proposalId: string }
  Response: { success, toolName, result, executedAt }

POST /api/chat/tools/reject
  Body: { proposalId: string, reason: string }
  Response: { success, toolName, rejectionReason }

GET /api/chat/tools/pending?limit=20
  Response: { success, proposals: [...] }

GET /api/chat/tools/history?limit=50
  Response: { success, proposals: [...] }

GET /api/chat/tools/list
  Response: { success, tools: { approvalRequired: [...], readOnly: [...] } }
```

**Modifications to existing endpoint:**
```javascript
POST /api/chat/message
  Response now includes:
  {
    success: true,
    response: {
      content: string,
      toolProposal: {  // NEW: Present when Tina calls a tool
        id: string,
        toolName: string,
        parameters: object,
        requiresApproval: boolean,
        reasoning: string,
        actionDisplay: object
      }
    }
  }
```

---

### `backend/services/tinaPersonality.js`

**Added to TINA_SYSTEM_PROMPT:**

```
**Tool Use:**
You have access to tools that can perform actions in this system.
When you want to make a change, use the appropriate tool.
IMPORTANT: ALWAYS explain your thinking BEFORE using a tool.
Be specific about WHY you want to do this and WHAT the expected impact will be.

**Available Tools:**
[List of all tools with descriptions]

**Your Process:**
1. Analyze the situation using available data
2. Explain your assessment honestly
3. Propose an action if it will help
4. Use the appropriate tool to initiate the change
5. Wait for user approval before execution
```

---

### `frontend/src/pages/Chat.jsx`

**New State:**
```javascript
const [toolProposals, setToolProposals] = useState({});
```

**New Handlers:**
```javascript
handleApproveTool(messageId)    // Approve and execute a tool proposal
handleRejectTool(messageId)     // Reject a tool proposal with reason
handleDiscussTool(messageId)    // Pre-fill input for discussion
formatToolName(toolName)        // Format tool name for display
```

**New Components:**
- `ToolProposalCard` - Main card container
- `ToolProposalHeader` - Shows tool name and status
- `ToolProposalDetails` - Shows action description
- `ToolProposalReasoning` - Shows Tina's reasoning
- `ToolProposalActions` - Action buttons
- `ToolProposalButton` - Button with variants (approve/reject/discuss)
- `ToolProposalStatus` - Status badge

**Message Rendering:**
Tool proposals are rendered as cards attached to assistant messages, showing:
- Tool name (formatted)
- Action description
- Tina's reasoning
- Approve / Reject / Discuss First buttons
- Status indicator

---

## How to Add a New Tool

### Step 1: Define the Tool

Add to `backend/services/tinaTools/definitions.js`:

```javascript
// For approval-required tools, add to APPROVAL_REQUIRED_TOOLS:
{
  name: 'your_tool_name',
  description: 'What this tool does',
  requiresApproval: true,
  parameters: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'Description of param1'
      },
      param2: {
        type: 'number',
        description: 'Description of param2',
        minimum: 1
      }
    },
    required: ['param1']
  },
  exampleUsage: {
    param1: 'example value',
    param2: 42
  },
  expectedImpact: 'What this tool will achieve'
}

// For read-only tools, add to READ_ONLY_TOOLS with same structure
// but requiresApproval: false
```

### Step 2: Implement the Tool

Add to `backend/services/tinaTools/executor.js`:

```javascript
async function yourToolName({ param1, param2 }) {
  // Your implementation here

  // Example: Update a setting
  await someUpdateFunction(param1);

  // Example: Fetch data
  const result = await someFetchFunction(param2);

  return {
    message: 'Human-readable success message',
    // Any other relevant data
    param1Updated: param1,
    result: result
  };
}
```

Then add to the `executeTool` switch statement:

```javascript
case 'your_tool_name':
  result = await yourToolName(toolParameters);
  break;
```

And add to the exports:

```javascript
export default {
  // ... existing exports
  yourToolName,
};
```

### Step 3: Update Tina's Prompt (Optional)

Add to `backend/services/tinaPersonality.js` in the **Available Tools** section:

```
- your_tool_name: Brief description of what it does
```

### Step 4: Test

1. Restart backend
2. In chat, ask Tina something that would trigger the tool
3. Verify proposal card appears
4. Test approve/reject/discuss buttons

---

## Tool Definition Schema

```javascript
{
  name: string,              // Unique tool identifier (snake_case)
  description: string,       // Human-readable description
  requiresApproval: boolean, // Whether user must approve before execution

  parameters: {
    type: 'object',
    properties: {
      paramName: {
        type: 'string' | 'number' | 'array' | 'boolean',
        description: string,
        enum?: array,           // For enums
        minimum?: number,       // For numbers
        maximum?: number,       // For numbers
        minLength?: number,     // For strings
        maxLength?: number,     // For strings
        items?: { type: '...' } // For arrays
      }
    },
    required: string[]        // Required parameter names
  },

  exampleUsage: object,        // Example parameters
  expectedImpact: string       // What outcome to expect
}
```

---

## Database Schema

### ToolProposal Collection

```javascript
{
  _id: ObjectId,

  // Tool identification
  toolName: String,
  toolParameters: Object,
  reasoning: String,
  proposedBy: String,          // 'tina'

  // Workflow
  status: String,             // 'pending_approval' | 'approved' | 'rejected' | 'executed' | 'failed'
  requiresApproval: Boolean,

  // Context
  conversationId: ObjectId,
  messageId: String,
  userId: String,             // 'founder' for single-user system

  // Approval tracking
  approvedAt: Date,
  approvedBy: String,

  // Rejection tracking
  rejectedAt: Date,
  rejectionReason: String,

  // Execution tracking
  executedAt: Date,
  executionResult: Object,
  executionError: String,
  executionDuration: Number,  // milliseconds

  // Audit
  ipAddress: String,
  userAgent: String,

  // State tracking
  previousState: Object,
  expectedImpact: String,
  actualImpact: String,

  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ status: 1, createdAt: -1 }` - For pending queries
- `{ conversationId: 1, createdAt: -1 }` - For conversation history
- `{ toolName: 1, status: 1 }` - For tool-specific queries
- `{ userId: 1, status: 1 }` - For user queries

---

## API Response Examples

### Tool Proposal Response

When Tina calls a tool:

```json
{
  "success": true,
  "response": {
    "role": "assistant",
    "content": "I recommend we increase our posting frequency to drive more engagement...",
    "timestamp": "2026-01-28T12:00:00.000Z",
    "toolProposal": {
      "id": "67890abcdef12345",
      "toolName": "update_posting_schedule",
      "parameters": {
        "frequency": 4,
        "platforms": ["tiktok", "instagram"]
      },
      "requiresApproval": true,
      "reasoning": "Increasing posting frequency to 4x/day based on current engagement trends...",
      "actionDisplay": {
        "description": "Change posting frequency to 4x/day",
        "exampleImpact": "Increases content output to 4x daily, expected to boost reach by 40-60%"
      }
    }
  },
  "conversationId": "1234567890"
}
```

### Approval Response

```json
{
  "success": true,
  "proposalId": "67890abcdef12345",
  "toolName": "update_posting_schedule",
  "result": {
    "message": "Posting schedule updated to 4x/day",
    "platforms": ["tiktok", "instagram"],
    "newFrequency": 4
  },
  "executedAt": "2026-01-28T12:01:00.000Z",
  "message": "Tool \"update_posting_schedule\" executed successfully"
}
```

### Rejection Response

```json
{
  "success": true,
  "message": "Tool proposal rejected",
  "proposalId": "67890abcdef12345",
  "toolName": "update_posting_schedule",
  "rejectionReason": "User wants to discuss this more first"
}
```

---

## Frontend State Management

### State Structure

```javascript
{
  toolProposals: {
    [messageId]: {
      id: string,
      toolName: string,
      parameters: object,
      requiresApproval: boolean,
      reasoning: string,
      actionDisplay: {
        description: string,
        exampleImpact: string
      },
      status: 'pending' | 'executed' | 'rejected',
      executedAt: string,
      rejectionReason: string,
      result: object
    }
  },
  processingProposal: string | null  // messageId of currently processing proposal
}
```

### Component Lifecycle

1. **Message received with `toolProposal`**
2. Store in `toolProposals` state
3. Render `ToolProposalCard` with action buttons
4. User clicks Approve → `handleApproveTool()` called
5. API call to `/api/chat/tools/approve`
6. On success: update status to 'executed', add confirmation message
7. User clicks Reject → `handleRejectTool()` called
8. API call to `/api/chat/tools/reject`
9. On success: update status to 'rejected', add acknowledgment message
10. User clicks Discuss First → `handleDiscussTool()` called
11. Pre-fill input with discussion starter

---

## Testing Guide

### 1. Test Read-Only Tool (No Approval)

```
User: "What's our current budget status?"
Expected: Tina should call get_budget_status tool
          Tool should execute immediately
          Response should show budget utilization
```

### 2. Test Approval-Required Tool

```
User: "Should we increase our posting frequency?"
Expected: Tina should analyze and suggest update_posting_schedule
          Tool proposal card should appear
          Should show: action description, reasoning, approve/reject/discuss buttons
```

### 3. Test Approval Flow

```
1. Click "Approve" on a tool proposal
Expected: Button shows "Executing..."
         API call to /tools/approve
         Status updates to "✓ Executed"
         Confirmation message appears
```

### 4. Test Rejection Flow

```
1. Click "Reject" on a tool proposal
Expected: Prompt for reason
         After entering reason, API call to /tools/reject
         Status updates to "✗ Rejected"
         Tina acknowledges the rejection
```

### 5. Test Discuss Flow

```
1. Click "Discuss First" on a tool proposal
Expected: Input field is pre-filled with discussion starter
         User can ask questions before deciding
```

---

## Troubleshooting

### API Errors (404, 422)

**Problem:** Getting 404 or 422 errors from GLM API

**Solutions:**
1. Check `GLM47_API_ENDPOINT` is set to `https://api.z.ai/api/paas/v4` (NOT `/api/anthropic`)
2. Verify model name is `glm-4.7` (NOT `glm-4-plus`)
3. Ensure system messages are in the messages array, not a separate parameter
4. Check tool format is OpenAI-style: `{ type: "function", function: {...} }`

**Correct Request Format:**
```javascript
{
  model: "glm-4.7",
  messages: [
    { role: "system", content: "..." },  // System in messages array
    { role: "user", content: "..." }
  ],
  tools: [...],
  tool_choice: "auto"
}
```

### Tool Not Appearing

1. Check if tool is defined in `definitions.js`
2. Verify tool is included in `getAllToolsForAPI()` output
3. Check GLM API response includes `tool_calls` in `choices[0].message`
4. Verify proposal handler is creating the proposal

### Approval Not Working

1. Check proposal ID is being passed correctly
2. Verify `/api/chat/tools/approve` endpoint exists
3. Check `ToolProposal.findById()` is finding the record
4. Verify `executeTool()` function handles the tool name

### Frontend Not Updating

1. Check `toolProposal` is in response metadata
2. Verify state update: `setToolProposals(prev => ...)`
3. Check message ID matches proposal key
4. Verify styled-components are properly defined

---

## Future Enhancements

### Man-on-the-Loop Mode

Read-only tools could execute immediately with a notification:

```javascript
const MAN_ON_LOOP_TOOLS = [
  'get_campaign_performance',
  'get_content_analytics',
  'get_budget_status'
];

// These would:
// 1. Execute immediately
// 2. Post notification: "Tina fetched campaign performance data"
// 3. Store in chat history for reference
```

### Tool Categories

Group tools by category for better organization:

```javascript
const TOOL_CATEGORIES = {
  content: ['update_posting_schedule', 'approve_pending_posts', ...],
  budget: ['update_campaign_budget', 'pause_campaign', ...],
  analytics: ['get_campaign_performance', 'get_content_analytics', ...]
};
```

### Tool Composition

Allow tools to call other tools:

```javascript
async function executeTool(proposal) {
  // Check if tool needs to execute sub-tools
  const subTools = getSubTools(proposal.toolName);
  for (const subTool of subTools) {
    await executeTool(subTool);
  }
  // ... main tool execution
}
```

### Batch Approval

Allow approving multiple proposals at once:

```javascript
POST /api/chat/tools/approve-batch
Body: { proposalIds: string[] }
```

---

## Related Files

- `CLAUDE.md` - Project instructions and role definition
- `backend/services/glmService.js` - GLM API client
- `backend/services/tinaPersonality.js` - Tina's personality system
- `frontend/src/pages/Chat.jsx` - Chat UI component

## External References

- [Z.AI HTTP API Documentation](https://docs.z.ai/guides/develop/http/introduction)
- [Z.AI Function Calling Guide](https://docs.z.ai/guides/capabilities/function-calling)
- [Z.AI API Keys](https://z.ai/manage-apikey/apikey-list)
