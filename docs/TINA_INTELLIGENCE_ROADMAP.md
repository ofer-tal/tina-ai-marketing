# Tina Intelligence Enhancement Roadmap

**Document Version:** 1.1
**Created:** 2026-02-02
**Last Updated:** 2026-02-02
**Status:** Planning
**Owner:** Blush Marketing Team

---

## Quick Reference

**Looking for something specific? Jump to:**

| Topic | Section |
|-------|---------|
| What are we building? | [Executive Summary](#executive-summary) |
| System architecture | [Architecture Overview](#architecture-overview) |
| All data models | [Data Model Specifications](#data-model-specifications) |
| All API endpoints | [API Endpoints](#api-endpoints) |
| All Tina tools | [Tina's Tools](#tinas-tools-function-calling) |
| All UI pages | [UI Pages](#ui-pages) |
| Scheduled jobs | [Scheduled Jobs](#scheduled-jobs) |
| Proactivity rules | [Proactivity Rules](#proactivity-rules) |
| **Phase implementation specs** | [Phase Specifications](#phase-specifications) |
| Error handling | [Error Handling & Edge Cases](#error-handling--edge-cases) |
| Security | [Security & Authorization](#security--authorization) |
| Testing | [Testing Strategy](#testing-strategy) |
| Configuration | [Configuration & Environment Variables](#configuration--environment-variables) |
| State transitions | [State Transition Validation](#state-transition-validation) |
| Rollback plans | [Rollback Plans](#rollback-plans) |
| Phase tracking | [Phase Tracking](#phase-tracking) |

---

## Executive Summary

This document outlines the complete plan to transform Tina from a reactive AI assistant into a proactive, strategic AI marketing executive. The enhancement is organized into 8 phases, each building on the previous phases.

**Current State:** Tina is a reactive chat assistant with tool execution capabilities, conversation memory, and daily briefing generation.

**Target State:** Tina is a proactive executive who:
- Remembers and learns from past strategies and outcomes
- Sets and tracks measurable goals
- Proactively reaches out when opportunities or issues arise
- Runs and learns from experiments
- Maintains rolling multi-horizon plans
- Recognizes patterns and adjusts tactics accordingly

---

## Architecture Overview

### System Diagram

```
┌───────────────────────────────────────────────────────────────────┐
│                              TINA (LLM)                            │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────────┐ │
│  │   Personality │  │     Tools     │  │   Proactive Logic     │ │
│  │   + Prompts   │  │    (30+)      │  │  (monitoring rules)   │ │
│  └───────────────┘  └───────────────┘  └───────────┬───────────┘ │
└─────────────────────┬───────────────────────────────┬─────────────┘
                      │                               │
        ┌─────────────┴─────────────┐  ┌─────────────┴─────────┐
        │                           │  │                       │
        ▼                           ▼  ▼                       ▼
  ┌─────────────┐         ┌──────────────────┐       ┌─────────────┐
  │    Tool     │         │   Scheduled      │       │    Thought   │
  │  Executor   │         │   Monitoring     │       │     Log     │
  └──────┬──────┘         │      Job         │       └─────────────┘
         │                └────────┬─────────┘
         │                         │
         └───────────┬─────────────┴───────────┐
                     │                         │
                     ▼                         ▼
           ┌─────────────────┐       ┌─────────────────┐
           │   MongoDB       │       │   React UI      │
           │                 │       │                 │
           │ • Strategies    │       │ /tina           │
           │ • Goals         │       │ /tina/inbox     │
           │ • Experiments   │       │ /tina/strategies│
           │ • Learnings     │       │ /tina/goals     │
           │ • Observations  │       │ /tina/experiments│
           │ • Plans         │       │ /tina/learnings │
           │ • ThoughtLog    │       │ /tina/plans     │
           └─────────────────┘       │ /tina/reflections│
                                      └─────────────────┘
```

### Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Data Storage | MongoDB | Already in use, supports queries, relations, aggregations |
| API | Express.js | Consistent with existing backend |
| Frontend | React + styled-components | Consistent with existing UI |
| Scheduled Jobs | node-cron via SchedulerService | Existing infrastructure |
| AI/LLM | Z.AI GLM-4.7 | Already integrated |

### Data Flow

1. **User → Tina:** Chat message triggers tool use or strategy discussion
2. **Tina → Tools:** Read-only tools fetch data, action tools modify state
3. **Tools → MongoDB:** All persistent data stored in collections
4. **Monitoring Job:** Periodically checks metrics, creates Observations
5. **Observations → UI:** Tina's proactive messages surface in inbox
6. **User → UI:** Review, acknowledge, or act on observations

---

## Data Model Specifications

### Collection Naming Convention

All new collections use the `marketing_` prefix to distinguish from production app data.

### Core Models

#### 1. MarketingStrategy

**Purpose:** Track strategic initiatives at both broad and specific levels.

```javascript
{
  _id: ObjectId,
  strategyId: string,  // Human-readable ID

  // Hierarchy
  parentStrategyId: ObjectId | null,  // For child strategies
  level: "broad" | "specific",

  // Identity
  name: string,  // e.g., "Q1 Instagram Growth Push"
  description: string,

  // Strategic framework
  hypothesis: string,  // What we believe will happen
  timeframe: {
    start: Date,
    end: Date,
    duration: number  // Calculated in days
  },

  // Success criteria
  successMetric: string,  // Metric name from analytics
  targetValue: number,
  currentBaseline: number,
  currentValue: number,  // Updated periodically

  // Child strategies (only for broad strategies)
  childStrategyIds: [ObjectId],

  // Status tracking
  status: "draft" | "active" | "paused" | "completed" | "abandoned",
  statusHistory: [{
    status: string,
    changedAt: Date,
    changedBy: string,  // "tina" or "founder"
    reason: string
  }],

  // Outcomes (filled when completed)
  outcomes: {
    actualValue: number,
    targetAchieved: boolean,
    percentAchieved: number,
    keyLearnings: [string],
    recommendation: string,
    nextSteps: string
  },

  // Related entities
  relatedGoalIds: [ObjectId],
  relatedExperimentIds: [ObjectId],
  relatedLearningIds: [ObjectId],

  // Metadata
  createdBy: string,  // "tina" or "founder"
  createdAt: Date,
  updatedAt: Date,
  archivedAt: Date | null
}

// Indexes
// - { status: 1, createdAt: -1 }
// - { parentStrategyId: 1 }
// - { relatedGoalIds: 1 }
// - { level: 1, status: 1 }
```

#### 2. MarketingGoal

**Purpose:** Track long-term marketing objectives with progress measurement.

```javascript
{
  _id: ObjectId,
  goalId: string,  // Human-readable ID

  // Identity
  name: string,
  description: string,

  // Goal type and target
  type: "mrr" | "growth_rate" | "engagement" | "content_output" | "followers" | "custom",
  customMetric: string,  // For type="custom"

  // Target values
  targetValue: number,
  currentValue: number,
  startValue: number,  // Baseline when goal was created

  // Timeframe
  startDate: Date,
  targetDate: Date,
  checkInFrequency: "daily" | "weekly" | "monthly",

  // Progress tracking
  status: "on_track" | "at_risk" | "behind" | "achieved" | "abandoned",
  progressPercent: number,  // Calculated: (current - start) / (target - start)
  trajectory: "ahead" | "on_track" | "behind",  // Based on time remaining

  // Milestones
  milestones: [{
    name: string,
    targetValue: number,
    targetDate: Date,
    achieved: boolean,
    achievedAt: Date | null
  }],

  // What we're doing to achieve this
  linkedStrategyIds: [ObjectId],
  linkedExperimentIds: [ObjectId],

  // Alerts
  alerts: [{
    severity: "info" | "warning" | "critical",
    message: string,
    triggeredAt: Date,
    acknowledged: boolean
  }],

  // Outcome
  achievedAt: Date | null,
  abandonedAt: Date | null,
  abandonedReason: string,

  // Metadata
  createdBy: string,
  createdAt: Date,
  updatedAt: Date
}

// Indexes
// - { status: 1, targetDate: 1 }
// - { type: 1 }
// - { linkedStrategyIds: 1 }
```

#### 3. MarketingExperiment

**Purpose:** Track A/B tests and controlled experiments.

```javascript
{
  _id: ObjectId,
  experimentId: string,

  // Identity
  name: string,
  description: string,

  // Hypothesis
  hypothesis: string,  // What we're testing
  successMetric: string,  // How we measure success

  // Variants
  variants: [{
    variantId: string,
    name: string,  // e.g., "Control", "Variant A"
    description: string,
    parameters: {},  // Variable parameters for this variant
    metrics: {
      impressions: number,
      conversions: number,
      engagement: number,
      customMetrics: {}
    }
  }],

  // Experiment settings
  duration: number,  // Planned duration in days
  startDate: Date,
  endDate: Date,
  actualEndDate: Date,

  // Status
  status: "draft" | "running" | "paused" | "completed" | "abandoned",

  // Sample size and power
  minSampleSize: number,
  currentSampleSize: number,
  statisticalPower: number,  // 0-1

  // Results (filled when complete)
  results: {
    winner: string,  // variantId
    confidence: number,  // Statistical confidence 0-1
    significance: number,  // p-value
    lift: number,  // Percentage lift of winner over baseline
    conclusion: string,
    recommendation: string
  },

  // Related entities
  relatedGoalIds: [ObjectId],
  relatedStrategyIds: [ObjectId],

  // Metadata
  createdBy: string,
  createdAt: Date,
  updatedAt: Date
}

// Indexes
// - { status: 1, endDate: -1 }
// - { relatedStrategyIds: 1 }
```

#### 4. TinaLearning

**Purpose:** Store patterns and insights Tina has discovered.

```javascript
{
  _id: ObjectId,
  learningId: string,

  // Learning content
  category: "content" | "timing" | "audience" | "platform" | "creative" | "custom",
  pattern: string,  // Human-readable description
  patternType: "correlation" | "causation" | "observation",

  // Confidence
  confidence: number,  // 0-1
  strength: "weak" | "moderate" | "strong",
  validationCount: number,  // How many times this has been observed

  // Evidence
  evidence: [{
    date: Date,
    metric: string,
    value: number,
    context: string,
    source: string  // "experiment", "observation", "analysis"
  }],

  // Related data
  supportingExperimentIds: [ObjectId],
  contradictingExperimentIds: [ObjectId],
  relatedStrategyIds: [ObjectId],

  // Validation
  lastValidatedAt: Date,
  nextReviewAt: Date,
  isValid: boolean,

  // Actionability
  isActionable: boolean,
  suggestedActions: [string],

  // Metadata
  discoveredBy: string,  // "tina" or "manual"
  createdAt: Date,
  updatedAt: Date
}

// Indexes
// - { category: 1, confidence: -1 }
// - { isValid: 1, strength: -1 }
// - { nextReviewAt: 1 }
```

#### 5. TinaObservation

**Purpose:** Tina's "outbox" - proactive messages to the user.

```javascript
{
  _id: ObjectId,
  observationId: string,

  // Classification
  urgency: "critical" | "high" | "medium" | "low",
  category: "goal_alert" | "strategy_pivot" | "opportunity" | "anomaly" |
            "experiment_result" | "pattern_detected" | "weekly_reflection" |
            "milestone_reached" | "risk_identified",

  // Content
  title: string,  // One-line summary
  summary: string,  // Brief explanation (1-2 sentences)
  details: {
    what: string,  // What happened
    why: string,   // Tina's analysis
    data: {
      metric: string,
      before: number,
      after: number,
      delta: number,
      deltaPercent: number,
      timeframe: string
    },
    suggestedActions: [{
      toolName: string,
      parameters: {},
      rationale: string,
      priority: "high" | "medium" | "low",
      estimatedImpact: string
    }]
  },

  // Related entities
  relatedGoalId: ObjectId | null,
  relatedStrategyId: ObjectId | null,
  relatedExperimentId: ObjectId | null,
  relatedLearningId: ObjectId | null,

  // Workflow
  status: "pending" | "acknowledged" | "acted_upon" | "dismissed",
  acknowledgedAt: Date | null,
  actedUponAt: Date | null,
  actionTaken: string,  // Description of what was done

  // Auto-execution
  autoExecutable: boolean,  // Can Tina execute suggested actions automatically?
  autoExecuted: boolean,
  autoExecutedAt: Date | null,
  autoExecutionResult: {},

  // Metadata
  createdAt: Date,
  expiresAt: Date | null  // Observations can expire
}

// Indexes
// - { status: 1, urgency: -1, createdAt: -1 }
// - { relatedGoalId: 1 }
// - { relatedStrategyId: 1 }
// - { expiresAt: 1 }
```

#### 6. TinaThoughtLog

**Purpose:** Tina's persistent scratchpad - thoughts that should outlive her context window.

```javascript
{
  _id: ObjectId,

  // Context
  thoughtType: "strategy_created" | "pattern_noticed" | "decision_rationale" |
                "outcome_observed" | "hypothesis_formed" | "insight" |
                "question_for_founder" | "self_reflection",
  timestamp: Date,

  // Related entities
  conversationId: ObjectId | null,  // Link to ChatConversation
  strategyId: ObjectId | null,
  goalId: ObjectId | null,
  experimentId: ObjectId | null,

  // Content
  thought: string,  // The actual thought/insight
  confidence: number,  // 0-1

  // Supporting data
  dataPoints: [{
    metric: string,
    value: number,
    source: string,
    timestamp: Date
  }],

  // Does this trigger action?
  triggersAction: boolean,
  triggeredAction: {
    toolName: string,
    executedAt: Date
  } | null,

  // Validation
  validated: boolean,
  validatedAt: Date,
  validationOutcome: "confirmed" | "rejected" | "inconclusive",

  // Metadata
  createdBy: string,  // "tina" or "manual"
  createdAt: Date
}

// Indexes
// - { thoughtType: 1, timestamp: -1 }
// - { strategyId: 1 }
// - { conversationId: 1 }
```

#### 7. MarketingPlan

**Purpose:** Rolling multi-horizon plans (week, month, quarter).

```javascript
{
  _id: ObjectId,
  planId: string,

  // Plan scope
  horizon: "week" | "month" | "quarter",
  period: {
    start: Date,
    end: Date
  },

  // Focus areas
  focusAreas: [{
    area: string,  // e.g., "Instagram growth", "Content quality"
    priority: "high" | "medium" | "low",
    rationale: string,
    relatedGoalId: ObjectId
  }],

  // Scheduled actions
  scheduledActions: [{
    week: number,  // 1-4 for month, 1-12 for quarter
    action: string,
    toolName: string,
    parameters: {},
    reason: string,
    status: "pending" | "in_progress" | "completed" | "skipped",
    completedAt: Date
  }],

  // Dependencies
  dependencies: [{
    action: string,
    dependsOn: string,
    reason: string
  }],

  // Status
  status: "draft" | "active" | "completed",
  progress: number,  // 0-100

  // Outcome
  actualOutcome: string,
  lessonsLearned: [string],

  // Related
  relatedStrategyIds: [ObjectId],
  relatedGoalIds: [ObjectId],

  // Metadata
  createdBy: string,
  createdAt: Date,
  updatedAt: Date
}

// Indexes
// - { horizon: 1, status: 1, "period.start": -1 }
// - { relatedGoalIds: 1 }
```

#### 8. TinaReflection

**Purpose:** Weekly self-reviews Tina generates.

```javascript
{
  _id: ObjectId,
  reflectionId: string,

  // Period
  weekOf: Date,  // Monday of that week
  weekNumber: number,  // 1-52
  year: number,

  // Sections (structured markdown)
  sections: {
    summary: string,  // Executive summary
    tried: [string],  // What Tina tried
    worked: [string],  // What worked
    didntWork: [string],  // What didn't work
    learnings: [string],  // Key learnings
    goalsStatus: [{ goalId, goalName, status, progress }],
    nextWeekPlan: [string],  // Plans for next week
    questionsForFounder: [string]
  },

  // Metrics summary
  metrics: {
    period: "week",
    startDate: Date,
    endDate: Date,
    highlights: {
      bestMetric: string,
      worstMetric: string,
      surprises: [string]
    }
  },

  // Related entities
  relatedStrategyIds: [ObjectId],
  relatedExperimentIds: [ObjectId],

  // Status
  status: "draft" | "generated" | "reviewed" | "archived",

  // Metadata
  generatedAt: Date,
  reviewedAt: Date | null
}

// Indexes
// - { weekOf: -1 }
// - { year: 1, weekNumber: 1 }
```

---

## API Endpoints

### Strategy Endpoints

```
POST   /api/tina/strategies
GET    /api/tina/strategies
GET    /api/tina/strategies/:id
PUT    /api/tina/strategies/:id
DELETE /api/tina/strategies/:id
POST   /api/tina/strategies/:id/complete
POST   /api/tina/strategies/:id/pause
POST   /api/tina/strategies/:id/resume
GET    /api/tina/strategies/:id/children
GET    /api/tina/strategies/:id/performance
```

### Goal Endpoints

```
POST   /api/tina/goals
GET    /api/tina/goals
GET    /api/tina/goals/:id
PUT    /api/tina/goals/:id
DELETE /api/tina/goals/:id
POST   /api/tina/goals/:id/update-progress
GET    /api/tina/goals/:id/history
POST   /api/tina/goals/:id/acknowledge-alert
```

### Experiment Endpoints

```
POST   /api/tina/experiments
GET    /api/tina/experiments
GET    /api/tina/experiments/:id
PUT    /api/tina/experiments/:id
DELETE /api/tina/experiments/:id
POST   /api/tina/experiments/:id/start
POST   /api/tina/experiments/:id/complete
POST   /api/tina/experiments/:id/analyze
GET    /api/tina/experiments/:id/results
```

### Observation/Inbox Endpoints

```
GET    /api/tina/observations
GET    /api/tina/observations/:id
POST   /api/tina/observations/:id/acknowledge
POST   /api/tina/observations/:id/dismiss
POST   /api/tina/observations/:id/execute-action
GET    /api/tina/inbox              # Alias for pending observations
POST   /api/tina/inbox/bulk-ack     # Acknowledge multiple
```

### Learning Endpoints

```
GET    /api/tina/learnings
GET    /api/tina/learnings/:id
POST   /api/tina/learnings/:id/validate
POST   /api/tina/learnings/:id/invalidate
GET    /api/tina/learnings/category/:category
```

### Plan Endpoints

```
POST   /api/tina/plans
GET    /api/tina/plans
GET    /api/tina/plans/current      # Current active plan by horizon
GET    /api/tina/plans/:id
PUT    /api/tina/plans/:id
POST   /api/tina/plans/:id/action/:actionId/complete
```

### Reflection Endpoints

```
GET    /api/tina/reflections
GET    /api/tina/reflections/current  # Current week
GET    /api/tina/reflections/:id
POST   /api/tina/reflections/:id/regenerate
```

### Thought Log Endpoints

```
GET    /api/tina/thoughts
GET    /api/tina/thoughts/recent
GET    /api/tina/thoughts/strategy/:strategyId
POST   /api/tina/thoughts            # Manual thought entry
```

---

## Tina's Tools (Function Calling)

### Strategy Tools (Approval Required)

```javascript
create_strategy({
  name: string,
  description: string,
  level: "broad" | "specific",
  parentStrategyId: string | null,
  hypothesis: string,
  timeframe: { start: string, end: string },
  successMetric: string,
  targetValue: number,
  currentBaseline: number,
  relatedGoalIds: string[]
})

update_strategy({
  strategyId: string,
  updates: {
    status?: string,
    currentValue?: number,
    notes?: string,
    adjustedTarget?: number
  }
})

complete_strategy({
  strategyId: string,
  outcomes: {
    actualValue: number,
    keyLearnings: string[],
    recommendation: string
  }
})

pause_strategy({
  strategyId: string,
  reason: string
})

resume_strategy({
  strategyId: string,
  reason: string
})
```

### Goal Tools (Approval Required)

```javascript
create_goal({
  name: string,
  type: string,
  targetValue: number,
  targetDate: string,
  description: string
})

update_goal({
  goalId: string,
  updates: {
    targetValue?: number,
    targetDate?: string,
    status?: string
  }
})

link_strategy_to_goal({
  goalId: string,
  strategyId: string
})

create_goal_milestone({
  goalId: string,
  name: string,
  targetValue: number,
  targetDate: string
})
```

### Experiment Tools (Approval Required)

```javascript
create_experiment({
  name: string,
  hypothesis: string,
  successMetric: string,
  variants: [{
    name: string,
    description: string,
    parameters: {}
  }],
  duration: number,  // days
  relatedStrategyIds: string[]
})

start_experiment({
  experimentId: string
})

complete_experiment({
  experimentId: string
})

analyze_experiment({
  experimentId: string
})
```

### Read-Only Informational Tools

```javascript
get_strategies({
  status?: string,
  level?: string,
  limit?: number
})

get_strategy_details({
  strategyId: string
})

get_goals({
  status?: string
})

get_goal_progress({
  goalId: string
})

get_experiments({
  status?: string
})

get_learnings({
  category?: string,
  minConfidence?: number
})

get_current_plan({
  horizon: "week" | "month" | "quarter"
})

get_tina_mind()  // Returns Tina's current thinking/state
```

---

## UI Pages

### Page Hierarchy

```
/tina
├── /dashboard         → Overview of everything
├── /inbox            → Tina's messages to you
├── /strategies       → All strategies (with filters)
│   └── /:id          → Strategy detail
├── /goals            → All goals (with progress bars)
│   └── /:id          → Goal detail with history
├── /experiments      → All experiments
│   └── /:id          → Experiment detail and results
├── /learnings        → Discovered patterns
├── /plans            → Current and historical plans
│   └── /:id          → Plan detail
└── /reflections      → Weekly self-reviews
    └── /:id          → Full reflection
```

### Page Specifications

#### /tina/dashboard

**Purpose:** Executive overview of Tina's strategic state.

**Components:**
- Goal status summary (progress bars, at-risk flags)
- Active strategies count by status
- Pending inbox items count by urgency
- Recent observations (top 5)
- Current week plan preview
- Quick stats (experiments running, learnings validated)

#### /tina/inbox

**Purpose:** View and act on Tina's proactive messages.

**Components:**
- Filter by urgency (critical/high/medium/low)
- Filter by status (pending/acknowledged/acted_upon)
- Group by category
- Each observation card:
  - Title, summary, urgency badge
  - Data visualization (before/after metrics)
  - Suggested actions with accept buttons
  - Acknowledge/Dismiss buttons
- Bulk acknowledge for low urgency items

#### /tina/strategies

**Purpose:** View all strategies, their hierarchy, and status.

**Components:**
- Tree view for parent/child relationships
- Filter by status, level, date range
- Table columns: Name, Level, Status, Progress, Time Remaining, Actions
- Drill down to strategy detail

#### /tina/strategies/:id

**Purpose:** Detailed view of a single strategy.

**Components:**
- Strategy header (name, status, dates)
- Hypothesis and description
- Progress visualization (current vs target)
- Child strategies (if any)
- Related goals
- Timeline of status changes
- Related observations
- Related thought logs
- Action buttons (pause/resume/complete)

#### /tina/goals

**Purpose:** Track all marketing goals.

**Components:**
- Goal cards with progress bars
- Status indicators (on_track/at_risk/behind)
- Time remaining visualization
- Trajectory indicator (ahead/on_track/behind)
- Linked strategies
- Alerts section
- Milestones checklist

#### /tina/experiments

**Purpose:** Track A/B tests and experiments.

**Components:**
- Filter by status
- Cards showing:
  - Hypothesis
  - Variants (A/B/C)
  - Duration and dates
  - Current metrics for each variant
  - Status
- For completed experiments: Winner announcement with confidence

#### /tina/learnings

**Purpose:** View patterns Tina has discovered.

**Components:**
- Filter by category
- Filter by confidence/strength
- Cards showing:
  - Pattern description
  - Confidence meter
  - Evidence count
  - Related strategies/experiments
  - Validation status
  - Suggested actions

---

## Scheduled Jobs

### TinaMonitoringJob

**Frequency:** Every 6 hours

**Purpose:** Continuously monitor metrics and proactively flag issues/opportunities.

**Checks:**
1. **Goal Health:** Compare goal progress vs expected trajectory
2. **Strategy Performance:** Check if strategies are moving metrics
3. **Anomalies:** Detect sudden drops or spikes
4. **Experiment Status:** Flag completed experiments needing analysis
5. **Pattern Detection:** Identify new correlations

**Output:** Creates TinaObservation records

### TinaReflectionJob

**Frequency:** Weekly (Sunday evening, configured)

**Purpose:** Generate weekly self-review reflecting on what was tried and what worked.

**Process:**
1. Fetch all actions taken this week (from ToolProposal, ThoughtLog)
2. Fetch metrics for the week
3. Fetch goal progress changes
4. Fetch strategy updates
5. Generate structured reflection via LLM
6. Store as TinaReflection
7. Create observation to notify user

**Output:** TinaReflection record + TinaObservation

### TinaGoalProgressJob

**Frequency:** Daily (morning)

**Purpose:** Update goal progress from latest metrics.

**Process:**
1. Fetch all active goals
2. For each goal, fetch current metric value
3. Update goal currentValue
4. Recalculate status (on_track/at_risk/behind)
5. Create observations for goals that changed to at_risk

### TinaExperimentAnalysisJob

**Frequency:** Hourly

**Purpose:** Auto-analyze completed experiments.

**Process:**
1. Find experiments past endDate with status="running"
2. Perform statistical analysis
3. Determine winner with confidence
4. Update experiment results
5. Create observation with findings

### TinaLearningValidationJob

**Frequency:** Weekly

**Purpose:** Re-validate existing learnings with new data.

**Process:**
1. Find learnings due for review (nextReviewAt passed)
2. Check if pattern still holds with recent data
3. Update confidence, validation count
4. Invalidate if pattern no longer holds
5. Create observation if major learning invalidated

---

## Proactivity Rules

### When Tina Creates Observations

| Rule | Trigger | Urgency | Action |
|------|---------|---------|--------|
| Goal Behind Trajectory | Goal progress < 80% of expected | High | Suggest course correction |
| Sudden Metric Drop | Any metric drops > 25% in 24h | Critical | Immediate analysis |
| Sudden Metric Spike | Any metric rises > 50% in 24h | High | Propose doubling down |
| Strategy Stagnant | Strategy active 7+ days with no positive movement | Medium | Suggest pivot or abandon |
| Strategy Overperforming | Strategy at 2x expected progress | Medium | Propose scaling up |
| Experiment Complete | End date reached | Medium | Auto-analyze, recommend |
| New Pattern Detected | Pattern observed 3+ times | Low | Create learning, suggest testing |
| Milestone Reached | Goal milestone achieved | Low | Celebrate, suggest next steps |
| Risk Identified | Conflicting strategies, resource constraints | Medium | Flag for review |

### Proactivity Levels

| Level | Threshold | Tina Behavior |
|-------|-----------|---------------|
| Silent | No urgent issues | Background monitoring only |
| Informational | Low urgency observations | Inbox, no notification |
| Reactive | Medium urgency | Inbox, subtle badge |
| Interruptive | High/Critical urgency | Inbox, prominent notification, possible alert |

---

## Phase Specifications

### Phase 0: Foundation

**Goal:** Create data models and infrastructure.

**Deliverables:**
- All 8 Mongoose models created
- Model unit tests
- Database indexes verified
- Model relationships tested
- Documentation updated with any changes

**Models Created:**
1. MarketingStrategy
2. MarketingGoal
3. MarketingExperiment
4. TinaLearning
5. TinaObservation
6. TinaThoughtLog
7. MarketingPlan
8. TinaReflection

**Success Criteria:**
- All models save and retrieve correctly
- Indexes are created and performant
- Unit tests pass with >80% coverage
- No circular dependency issues

**Estimated Effort:** 2-3 days

---

### Phase 1: Strategy Memory

**Goal:** Enable Tina to create, track, and learn from strategies.

**Deliverables:**
- Strategy CRUD API endpoints
- Strategy tools for Tina (create, update, complete, pause, resume)
- get_strategy_history tool
- Integration with existing tool proposal system
- Basic strategy UI page

**New Tools:**
- `create_strategy` (approval required)
- `update_strategy` (approval required)
- `complete_strategy` (approval required)
- `pause_strategy` (approval required)
- `resume_strategy` (approval required)
- `get_strategies` (read-only)
- `get_strategy_history` (read-only)

**API Endpoints:**
- POST /api/tina/strategies
- GET /api/tina/strategies
- GET /api/tina/strategies/:id
- PUT /api/tina/strategies/:id
- POST /api/tina/strategies/:id/complete
- POST /api/tina/strategies/:id/pause
- POST /api/tina/strategies/:id/resume

**UI Pages:**
- /tina/strategies (list with filters)
- /tina/strategies/:id (detail view)

**Tina Prompt Updates:**
Add to tinaPersonality.js:
```
**Strategic Thinking Process:**

Before proposing any significant action:

1. CHECK: Have we tried something similar recently?
   - Call get_strategy_history(days: 30, category: X)
   - Reference past outcomes in your reasoning

2. PLAN: Is this a one-off action or part of a larger strategy?
   - If it's part of something bigger, create or link to a strategy
   - Use create_strategy() for new strategic initiatives

3. TRACK: After executing, log outcomes
   - Update strategy progress with results
   - Complete strategies when finished with learnings
```

**Success Criteria:**
- Tina can create strategies via tool use
- Strategies are visible in UI
- Strategy history is queryable
- Past strategies inform new recommendations

**Estimated Effort:** 3-4 days

---

### Phase 2: Goal Tracking

**Goal:** Enable shared goal setting with progress tracking.

**Deliverables:**
- Goal CRUD API endpoints
- Goal tools for Tina
- Goal progress tracking job
- Goal UI page with progress visualization
- Goal alerts system

**New Tools:**
- `create_goal` (approval required)
- `update_goal` (approval required)
- `link_strategy_to_goal` (approval required)
- `get_goals` (read-only)
- `get_goal_progress` (read-only)

**API Endpoints:**
- POST /api/tina/goals
- GET /api/tina/goals
- GET /api/tina/goals/:id
- PUT /api/tina/goals/:id
- POST /api/tina/goals/:id/update-progress
- POST /api/tina/goals/:id/acknowledge-alert

**Scheduled Jobs:**
- TinaGoalProgressJob (daily morning)

**UI Pages:**
- /tina/goals (with progress bars, status indicators)

**Tina Prompt Updates:**
Add goal context to system prompt:
```
**Current Goals:**
- [Goal name]: [current]/[target] ([status])

When making recommendations, always reference which goal(s) your action supports.
```

**Success Criteria:**
- Goals are trackable with visual progress
- Tina references goals in her reasoning
- Goal alerts fire when behind trajectory
- Goals can be linked to strategies

**Estimated Effort:** 2-3 days

---

### Phase 3: Proactive Monitoring

**Goal:** Tina actively monitors and reaches out proactively.

**Deliverables:**
- TinaMonitoringJob implementation
- TinaObservation model usage
- Proactivity rules engine
- Tina's Inbox UI
- Notification system

**Scheduled Jobs:**
- TinaMonitoringJob (every 6 hours)

**UI Pages:**
- /tina/inbox (priority - this is the main interface)

**Proactivity Rules:**
- Goal trajectory checking
- Anomaly detection (>25% change)
- Strategy stagnation detection
- Experiment completion flagging

**Success Criteria:**
- Tina creates observations when issues/opportunities arise
- Inbox shows pending observations
- Critical observations are clearly marked
- User can acknowledge/dismiss/act on observations

**Estimated Effort:** 4-5 days

---

### Phase 4: Observability UI

**Goal:** Full visibility into Tina's thinking and actions.

**Deliverables:**
- All /tina/* UI pages
- Tina dashboard
- Strategy detail pages
- Goal detail pages
- Learning browser
- Thought log viewer

**UI Pages:**
- /tina (dashboard)
- /tina/strategies (already exists from Phase 1, enhanced)
- /tina/strategies/:id (enhanced)
- /tina/goals (already exists from Phase 2, enhanced)
- /tina/goals/:id (new detail view)
- /tina/learnings (new)
- /tina/thoughts (new)

**Components:**
- Goal progress visualization (progress bars, trajectory indicators)
- Strategy performance charts
- Timeline views for strategy history
- Learning cards with confidence meters
- Thought log with filters

**Success Criteria:**
- User can explore all of Tina's strategic state via UI
- No need for database queries to understand Tina's thinking
- Clear visual indicators for status and health

**Estimated Effort:** 3-4 days

---

### Phase 5: Experiment Lifecycle

**Goal:** Full experiment management with automatic analysis.

**Deliverables:**
- Experiment CRUD API
- Experiment tools for Tina
- Experiment analysis logic
- Experiment UI pages
- Auto-analysis on completion

**New Tools:**
- `create_experiment` (approval required)
- `start_experiment` (approval required)
- `complete_experiment` (approval required)
- `analyze_experiment` (read-only, auto-called)
- `get_experiments` (read-only)

**API Endpoints:**
- POST /api/tina/experiments
- GET /api/tina/experiments
- GET /api/tina/experiments/:id
- POST /api/tina/experiments/:id/start
- POST /api/tina/experiments/:id/complete
- POST /api/tina/experiments/:id/analyze

**Scheduled Jobs:**
- TinaExperimentAnalysisJob (hourly)

**UI Pages:**
- /tina/experiments
- /tina/experiments/:id

**Analysis Logic:**
- Statistical significance calculation
- Winner determination
- Lift calculation
- Recommendation generation

**Success Criteria:**
- Tina can create and run experiments
- Experiments auto-analyze on completion
- Results drive strategic decisions
- Winning variants are clearly identified

**Estimated Effort:** 3-4 days

---

### Phase 6: Pattern Recognition

**Goal:** Tina discovers and validates patterns automatically.

**Deliverables:**
- Pattern detection engine
- TinaLearning model usage
- Learning validation job
- Learning tools for Tina
- Learning UI

**New Tools:**
- `get_learnings` (read-only)
- `validate_learning` (approval required)
- `invalidate_learning` (approval required)

**Detection Engine:**
- Correlation detection (metric A moves with metric B)
- Time-based patterns (certain times perform better)
- Content patterns (certain content types outperform)
- Platform patterns (performance by platform)

**Scheduled Jobs:**
- TinaLearningValidationJob (weekly)

**UI Pages:**
- /tina/learnings (already exists from Phase 4, enhanced)

**Success Criteria:**
- Tina discovers patterns and stores as learnings
- Learnings are validated against new data
- Learnings inform future recommendations
- User can review all learnings with confidence levels

**Estimated Effort:** 5-6 days

---

### Phase 7: Multi-Horizon Planning

**Goal:** Tina maintains rolling plans for week/month/quarter.

**Deliverables:**
- Plan CRUD API
- Plan tools for Tina
- Plan UI pages
- Plan execution tracking

**New Tools:**
- `create_plan` (approval required)
- `update_plan` (approval required)
- `get_current_plan` (read-only)
- `complete_plan_action` (approval required)

**API Endpoints:**
- POST /api/tina/plans
- GET /api/tina/plans
- GET /api/tina/plans/current
- GET /api/tina/plans/:id
- PUT /api/tina/plans/:id
- POST /api/tina/plans/:id/action/:actionId/complete

**UI Pages:**
- /tina/plans
- /tina/plans/:id

**Plan Structure:**
- Weekly: Tactical actions, immediate priorities
- Monthly: Strategic initiatives, experiments to run
- Quarterly: High-level goals, major campaigns

**Success Criteria:**
- Tina creates and updates plans
- Plans track completion of scheduled actions
- Plans are visible in UI
- Plans inform daily operations

**Estimated Effort:** 2-3 days

---

### Phase 8: Weekly Reflections

**Goal:** Tina generates structured weekly reviews.

**Deliverables:**
- TinaReflectionJob implementation
- Reflection generation logic
- Reflection UI
- Reflection notification

**Scheduled Jobs:**
- TinaReflectionJob (weekly, Sunday evening)

**UI Pages:**
- /tina/reflections
- /tina/reflections/:id

**Reflection Sections:**
- Executive Summary
- What I Tried
- What Worked
- What Didn't Work
- Key Learnings
- Goals Status
- Next Week's Plan
- Questions for Founder

**Success Criteria:**
- Weekly reflections are generated automatically
- Reflections are comprehensive and actionable
- Reflections drive weekly planning
- Founder receives notification when ready

**Estimated Effort:** 2-3 days

---

## Dependencies Between Phases

```
Phase 0 (Foundation)
    │
    ├──► Phase 1 (Strategy Memory)
    │       │
    │       ├──► Phase 2 (Goal Tracking)
    │       │       │
    │       │       ├──► Phase 3 (Proactive Monitoring) ──┐
    │       │       │       │                           │
    │       │       │       ├──► Phase 4 (Observability UI)│
    │       │       │       │                           │
    │       │       │       └──► Phase 5 (Experiments)    │
    │       │       │               │                   │
    │       │       │               └──► Phase 6 (Patterns)│
    │       │       │                       │           │
    │       │       │                       ├──► Phase 7 (Planning)
    │       │       │                       │       │
    │       │       │                       │       └──► Phase 8 (Reflections)
    │       │       │                       │
    │       └───────┴───────────────────────┴───────────┘
    │
    └──► All phases depend on Phase 0
```

**Minimum Viable Tina:** Phases 0, 1, 2, 3
- Foundation models
- Can create and track strategies
- Can set and track goals
- Proactive outreach enabled

**Full Strategic Executive:** All 8 phases

---

## Success Metrics

### Phase Completion Criteria

Each phase is complete when:
1. All deliverables are implemented
2. UI pages are functional
3. Tina's tools are working
4. Tests pass with >80% coverage
5. Documentation is updated

### Overall Success Metrics

| Metric | Current | Target | How Measured |
|--------|---------|--------|--------------|
| Tina's Strategic Memory | None | 30+ days | Strategies retained and referenced |
| Proactivity Score | Reactive | 100% | Issues flagged before user asks |
| Goal Tracking | Manual | Automated | All goals tracked with progress |
| Experiment Cycle | None | 2/week | Experiments run and analyzed |
| Learning Rate | Zero | Positive | Learnings accumulate over time |

---

## Open Questions / Decisions Needed

1. **Proactivity Threshold:** At what urgency level should Tina send push notifications vs just inbox items?
   - [ ] Decision needed: High/Critical = notification, Medium/Low = inbox only?

2. **Auto-Execution:** Should Tina be able to auto-execute certain actions without approval?
   - [ ] Decision needed: Define which actions are safe to auto-execute

3. **Strategy Granularity:** How detailed should specific strategies get?
   - [ ] Decision needed: Define boundaries between broad and specific

4. **Data Retention:** How long should we keep observations, thought logs, reflections?
   - [ ] Decision needed: Retention policy for each collection

5. **Learning Confidence Threshold:** At what confidence should Tina act on learnings?
   - [ ] Decision needed: Minimum confidence for automated action

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-02 | Initial document creation |
| 1.1 | 2026-02-02 | Added comprehensive sections: Error Handling, Security, Testing, Configuration, State Transitions, Rollback Plans, Prompt Evolution, Notifications, Observations, Defaults, Response Formats, Quick Reference, Phase Tracking |

---

## Document Maintenance

This document should be updated when:
- A phase is completed (mark as done, note any deviations)
- Architecture decisions change
- New models/tools are added
- Dependencies change between phases

**Review cadence:** Before starting each new phase

---

## Error Handling & Edge Cases

### Tool Execution Failures

When a Tina tool fails:

1. **Read-only tools fail:**
   - Log the error with context
   - Return error message to Tina in tool result
   - Tina incorporates error into response
   - Create thought log entry: "Tool X failed, reason: Y"

2. **Action tools fail (after approval):**
   - Mark ToolProposal as failed
   - Create observation for user: "Action failed: [reason]"
   - Tina suggests alternative approaches
   - Store previousState for rollback if applicable

3. **LLM timeout/failure:**
   - Return cached last-known state for get_strategies, get_goals
   - Queue action tools for retry
   - Create observation: "Tina temporarily unavailable"

### Edge Cases & Resolution

| Edge Case | Resolution |
|-----------|------------|
| Orphaned child strategy (parent deleted) | Child becomes top-level, parentStrategyId set to null |
| Goal with deleted linked strategy | Remove strategyId from linkedStrategyIds array |
| Observation referencing deleted entity | Set relatedXId to null, add note to details |
| Experiment with no winner (inconclusive) | Set results.winner to "inconclusive", recommendation: "extend experiment" |
| Duplicate learning detected | Merge into existing learning, combine evidence, update confidence |
| Job runs while previous instance still running | Skip execution, log warning, track skipped runs |
| Metric data missing for goal progress | Mark goal status as "unknown_data", create observation |
| Strategy past endDate with status="active" | Auto-pause, create observation: "Strategy expired, please complete or abandon" |
| User tries to delete active strategy | Block deletion, require pause/complete first |
| Concurrent updates to same entity | Use MongoDB versioning, last write wins with optimistic locking |

### State Transition Validation

Each entity has valid state transitions:

**MarketingStrategy:**
```
draft → active
draft → abandoned
active → paused
active → completed
active → abandoned
paused → active
paused → abandoned
paused → completed
completed → (no further transitions)
abandoned → (no further transitions)
```

**MarketingGoal:**
```
on_track → at_risk
on_track → behind
on_track → achieved
on_track → abandoned
at_risk → on_track
at_risk → behind
at_risk → abandoned
behind → on_track
behind → at_risk
behind → abandoned
achieved → (terminal)
abandoned → (terminal)
```

**MarketingExperiment:**
```
draft → running
draft → abandoned
running → paused
running → completed
running → abandoned
paused → running
paused → abandoned
completed → (terminal)
abandoned → (terminal)
```

**TinaObservation:**
```
pending → acknowledged
pending → acted_upon
pending → dismissed
acknowledged → acted_upon
acknowledged → dismissed
acted_upon → (terminal)
dismissed → (terminal)
```

Invalid transitions should throw errors with explanation.

---

## Security & Authorization

### Access Control

| Role | Capabilities |
|------|--------------|
| **Founder** | Full access: create, read, update, delete all entities; approve/reject proposals |
| **Tina (AI)** | Can create strategies/experiments/learnings/observations/thoughts; read-only access to user data |
| **Viewer** (future) | Read-only access to all /tina pages |

### Approval Gates

These actions ALWAYS require founder approval:
- create_strategy
- update_strategy (status changes)
- complete_strategy
- pause_strategy
- create_goal
- update_goal
- create_experiment
- start_experiment
- complete_experiment
- invalidate_learning

These actions Tina can do WITHOUT approval:
- get_strategies, get_goals, get_experiments, get_learnings
- Create observations (her outbox)
- Create thought logs
- Update strategy currentValue (progress tracking)
- Update experiment variant metrics
- Validate learnings

### Audit Trail

Every write operation must log:
- Who initiated (founder or tina)
- What changed (before/after values for key fields)
- When (timestamp)
- Why (reason for the change)

Stored in audit log collection: `marketing_audit_trail`

---

## Testing Strategy

### Unit Testing

Each model must have unit tests covering:
- Schema validation (required fields, enums, ranges)
- Instance methods (approve, complete, pause, etc.)
- Static methods (getPending, getActive, etc.)
- Index functionality
- Relationships (parent/child, linked entities)

Coverage target: >80%

### Integration Testing

Each API endpoint must have tests covering:
- Happy path (successful operation)
- Validation errors (missing required, invalid values)
- Authorization (where applicable)
- Edge cases (orphaned records, concurrent updates)
- State transition validation

### Test Data Fixtures

Create seed data for testing:
- 3 sample strategies (broad + 2 children)
- 2 sample goals (one on track, one at risk)
- 1 sample experiment (running)
- 5 sample observations (mixed urgencies)
- 3 sample learnings (different categories)
- 1 sample reflection

Located at: `backend/tests/fixtures/tinaTestData.js`

### End-to-End Testing

Critical user flows:
1. Tina creates strategy → user approves → strategy appears in UI
2. Goal goes off track → monitoring job detects → observation created → user sees in inbox
3. Experiment completes → analysis job runs → winner declared → user notified
4. Weekly reflection generates → notification → user reviews → feedback recorded

---

## Data Validation Rules

### Field-Level Validation

| Entity | Field | Validation |
|--------|-------|------------|
| All | IDs | Must match pattern: `[a-z0-9_]+` |
| MarketingStrategy | timeframe.end | Must be > timeframe.start |
| MarketingStrategy | targetValue | Must be > 0 |
| MarketingGoal | targetValue | Must be > currentValue |
| MarketingGoal | targetDate | Must be > startDate |
| MarketingGoal | progressPercent | 0-100, calculated field |
| MarketingExperiment | variants | Must have ≥2 variants |
| MarketingExperiment | duration | Must be ≥3 days |
| TinaLearning | confidence | 0-1 |
| TinaObservation | urgency | One of: critical, high, medium, low |
| TinaObservation | expiresAt | If set, must be > createdAt |

### Business Logic Validation

1. **Strategy-Goal Linking:** A strategy can only link to goals with overlapping timeframes
2. **Experiment Completion:** Can only complete if running for ≥50% of planned duration
3. **Learning Validation:** Can only validate if confidence > 0.7
4. **Observation Action:** Can only execute suggested action if related entity exists and is active
5. **Plan Creation:** Can only create one active plan per horizon at a time

---

## Configuration & Environment Variables

### New Environment Variables

```bash
# Tina Proactivity Settings
TINA_MONITORING_ENABLED=true
TINA_MONITORING_INTERVAL_HOURS=6
TINA_REFLECTION_DAY=sunday
TINA_REFLECTION_HOUR=20
TINA_REFLECTION_TIMEZONE=UTC

# Tina Thresholds
TINA_GOAL_TRAJECTORY_WARNING_THRESHOLD=0.8
TINA_ANOMALY_DETECTION_DROP_PERCENT=25
TINA_ANOMALY_DETECTION_SPIKE_PERCENT=50
TINA_STRATEGY_STAGNANT_DAYS=7
TINA_LEARNING_MIN_CONFIDENCE=0.7
TINA_LEARNING_VALIDATION_INTERVAL_DAYS=7

# Tina Data Retention
TINA_OBSERVATION_RETENTION_DAYS=90
TINA_THOUGHT_LOG_RETENTION_DAYS=365
TINA_REFLECTION_RETENTION_MONTHS=24

# Tina Notifications
TINA_NOTIFICATION_ENABLED=true
TINA_NOTIFICATION_CRITICAL_ONLY=false
TINA_NOTIFICATION_EMAIL=founder@example.com
```

### Feature Flags

| Flag | Purpose | Default |
|------|---------|---------|
| TINA_PROACTIVITY_ENABLED | Enable monitoring job | true (after Phase 3) |
| TINA_EXPERIMENTS_ENABLED | Enable experiment tools | true (after Phase 5) |
| TINA_PATTERNS_ENABLED | Enable pattern detection | true (after Phase 6) |
| TINA_REFLECTIONS_ENABLED | Enable weekly reflections | true (after Phase 8) |
| TINA_AUTO_EXECUTE_READ_ONLY | Allow Tina to auto-execute read-only tools | true |

---

## ID Generation Strategy

### Human-Readable IDs

Format: `{prefix}_{timestamp}_{random}`

| Entity | Prefix | Example |
|--------|--------|---------|
| MarketingStrategy | strat | strat_1706912400_a3f2 |
| MarketingGoal | goal | goal_1706912400_b7c1 |
| MarketingExperiment | expr | expr_1706912400_d9e4 |
| TinaLearning | learn | learn_1706912400_f1a5 |
| TinaObservation | obs | obs_1706912400_e2b8 |
| TinaThoughtLog | thought | thought_1706912400_c3d6 |
| MarketingPlan | plan | plan_1706912400_a4f7 |
| TinaReflection | refl | refl_1706912400_b5e9 |

Helper function: `generateTinaId(prefix)` in `backend/utils/tinaIdGenerator.js`

---

## Scheduled Job Specifications

### Cron Expressions

| Job | Cron Expression | Timezone | Description |
|-----|----------------|----------|-------------|
| TinaMonitoringJob | `0 */6 * * *` | UTC | Every 6 hours (00:00, 06:00, 12:00, 18:00) |
| TinaGoalProgressJob | `0 7 * * *` | UTC | Daily at 7am UTC |
| TinaExperimentAnalysisJob | `0 * * * *` | UTC | Every hour |
| TinaLearningValidationJob | `0 8 * * 0` | UTC | Weekly Sunday 8am UTC |
| TinaReflectionJob | `0 20 * * 0` | UTC | Weekly Sunday 8pm UTC |

### Job Error Handling

| Error Type | Handling |
|------------|----------|
| Database connection failed | Retry 3x with exponential backoff, then alert |
| LLM API timeout | Use cached/reflection template, mark as "fallback" |
| Data fetch failed | Skip that check, continue with others, log partial results |
| Job crashed | Log full stack trace, create critical observation, retry next scheduled run |

### Job Monitoring

Track for each job:
- Last successful run timestamp
- Last failure timestamp and error
- Consecutive failure count
- Average execution time
- Next scheduled run

Endpoint: `GET /api/tina/jobs/status`

---

## Caching Strategy

### Cacheable Data

| Data | TTL | Cache Key | Invalidation |
|------|-----|-----------|--------------|
| Current goals | 5 minutes | `tina:goals:current` | On goal update |
| Active strategies | 5 minutes | `tina:strategies:active` | On strategy update |
| Tina's mind state | 2 minutes | `tina:mind` | On any entity change |
| Pending observations | 1 minute | `tina:observations:pending` | On observation change |
| Current plan | 10 minutes | `tina:plan:{horizon}` | On plan update |
| Validated learnings | 30 minutes | `tina:learnings:validated` | On learning validation |

### Cache Implementation

Use in-memory caching (Node Map) for simplicity:
```javascript
// backend/services/tinaCache.js
class TinaCache {
  get(key, ttl)
  set(key, value, ttl)
  invalidate(pattern)
  clear()
}
```

Redis recommended if multiple server instances needed.

---

## Performance Considerations

### Index Strategy

Ensure these indexes exist:

```javascript
// MarketingStrategy
{ status: 1, createdAt: -1 }
{ parentStrategyId: 1 }
{ relatedGoalIds: 1 }
{ level: 1, status: 1 }
{ timeframe.end: 1 }  // For finding expiring strategies

// MarketingGoal
{ status: 1, targetDate: 1 }
{ type: 1 }
{ linkedStrategyIds: 1 }
{ startDate: 1, targetDate: 1 }

// MarketingExperiment
{ status: 1, endDate: -1 }
{ relatedStrategyIds: 1 }

// TinaLearning
{ category: 1, confidence: -1 }
{ isValid: 1, strength: -1 }
{ nextReviewAt: 1 }

// TinaObservation
{ status: 1, urgency: -1, createdAt: -1 }
{ relatedGoalId: 1 }
{ relatedStrategyId: 1 }
{ expiresAt: 1 }
{ category: 1 }

// TinaThoughtLog
{ thoughtType: 1, timestamp: -1 }
{ strategyId: 1 }
{ conversationId: 1 }

// MarketingPlan
{ horizon: 1, status: 1, "period.start": -1 }
{ relatedGoalIds: 1 }

// TinaReflection
{ weekOf: -1 }
{ year: 1, weekNumber: 1 }
```

### Query Optimization Patterns

```javascript
// BAD: Fetch all then filter in JS
const allStrategies = await Strategy.find({});
const active = allStrategies.filter(s => s.status === 'active');

// GOOD: Query with filter
const activeStrategies = await Strategy.find({ status: 'active' });

// BAD: N+1 query for child strategies
for (const parent of parents) {
  parent.children = await Strategy.find({ parentStrategyId: parent._id });
}

// GOOD: Aggregate or populate
const strategiesWithChildren = await Strategy.aggregate([
  { $match: { level: 'broad' } },
  { $lookup: {
      from: 'marketing_strategies',
      localField: '_id',
      foreignField: 'parentStrategyId',
      as: 'children'
  }}
]);
```

---

## Cascade Deletion Rules

| Entity Deleted | Impact |
|----------------|--------|
| **MarketingStrategy** | Child strategies become top-level (parentStrategyId = null); linked goals remove strategyId; observations set relatedStrategyId = null |
| **MarketingGoal** | Linked strategies remove goalId from relatedGoalIds; observations set relatedGoalId = null |
| **MarketingExperiment** | Linked strategies remove experimentId; observations set relatedExperimentId = null |
| **TinaLearning** | No cascade (learnings are independent) |
| **TinaObservation** | No cascade (observations are independent) |
| **TinaThoughtLog** | No cascade (thoughts are historical records) |
| **MarketingPlan** | No cascade (plans are snapshots) |
| **TinaReflection** | No cascade (reflections are historical) |

**Soft Delete:** Use `archivedAt` timestamp instead of true deletion for strategies, goals, experiments. Hard delete only for observations and thoughts.

---

## Rollback Plans

If a phase needs to be rolled back:

| Phase | Rollback Strategy |
|-------|------------------|
| 0 | Drop collections, restore from pre-phase backup |
| 1 | Disable strategy tools, keep data (read-only) |
| 2 | Disable goal tools, stop progress job, keep data |
| 3 | Stop monitoring job, existing observations remain readable |
| 4 | Hide UI routes, data remains accessible via API |
| 5 | Stop experiment analysis job, existing results preserved |
| 6 | Stop pattern detection, existing learnings preserved |
| 7 | Stop plan tools, existing plans preserved |
| 8 | Stop reflection job, existing reflections preserved |

**Backup Required:** Before Phase 0, create MongoDB backup of all `marketing_*` collections.

---

## Tina's Prompt Evolution by Phase

### Phase 0 (Baseline)

No prompt changes. Foundation models only.

### Phase 1 (Strategy Memory)

Add to system prompt:
```
**Strategic Thinking Process:**

Before proposing any significant action:

1. CHECK: Have we tried something similar recently?
   - Call get_strategy_history(days: 30, category: X)
   - Reference past outcomes in your reasoning

2. PLAN: Is this a one-off action or part of a larger strategy?
   - If it's part of something bigger, create or link to a strategy
   - Use create_strategy() for new strategic initiatives

3. TRACK: After executing, log outcomes
   - Update strategy progress with results
   - Complete strategies when finished with learnings
```

### Phase 2 (Goal Tracking)

Add to system prompt:
```
**Current Goals:**
[Injected dynamically: goal names, current/target, status]

When making recommendations, always reference which goal(s) your action supports.
```

### Phase 3 (Proactive Monitoring)

Add to system prompt:
```
**Proactive Monitoring:**

I actively monitor our metrics and will reach out when:
- Goals are behind trajectory
- Strategies are stagnant or overperforming
- Anomalies are detected (sudden drops/spikes)
- Experiments complete and need analysis

Check your inbox regularly for my observations.
```

### Phase 5 (Experiments)

Add to system prompt:
```
**Experimental Mindset:**

I believe in testing assumptions. When we disagree on strategy:
1. Propose an experiment to test the hypothesis
2. Define clear success metrics
3. Run for sufficient duration
4. Let data guide the decision

Don't guess - experiment.
```

### Phase 6 (Pattern Recognition)

Add to system prompt:
```
**Learnings I've Discovered:**
[Injected dynamically: validated learnings with confidence]

I continuously discover patterns from our data. High-confidence learnings
(>0.8) should inform my recommendations. I will re-validate learnings weekly.
```

### Phase 8 (Reflections)

Add to system prompt:
```
**Weekly Reflections:**

Every Sunday evening, I generate a comprehensive weekly review reflecting on:
- What I tried this week
- What worked and what didn't
- Key learnings and insights
- Goals status and next week's plan

These reflections help me improve and provide you with digestible updates.
```

---

## Notification System

### Notification Channels

| Channel | Trigger | Content |
|---------|---------|---------|
| **Inbox Badge** | Any pending observation | Count of pending observations |
| **In-App Alert** | Critical/High urgency | Full observation with suggested actions |
| **Email** (optional) | Critical urgency only | Observation summary + link to inbox |

### Notification Content

```javascript
{
  notificationId: string,
  type: "observation" | "reflection" | "milestone",
  urgency: "critical" | "high" | "medium" | "low",
  title: string,
  message: string,
  actionUrl: string,  // e.g., "/tina/inbox"
  createdAt: Date,
  read: boolean,
  readAt: Date | null
}
```

### Notification Preferences

User-configurable (future enhancement):
- Email notifications: on/off
- Push notifications: on/off
- Minimum urgency for notifications: critical|high|medium|low|all

---

## Observation Expiration Rules

| Category | Default TTL | Rationale |
|----------|-------------|-----------|
| goal_alert | 7 days | Goals are reviewed weekly, stale after that |
| strategy_pivot | 14 days | Strategy review cycle |
| opportunity | 30 days | Opportunities may remain relevant longer |
| anomaly | 3 days | Anomalies are time-sensitive |
| experiment_result | 14 days | Results need timely action |
| pattern_detected | 30 days | Patterns persist |
| weekly_reflection | Never | Reflections are historical records |
| milestone_reached | 7 days | Acknowledgment expected within week |
| risk_identified | 14 days | Risks need attention |

Observations auto-expire after TTL; they're archived (not deleted).

---

## Default Values

| Entity | Field | Default |
|--------|-------|---------|
| MarketingStrategy | status | "draft" |
| MarketingStrategy | level | "specific" |
| MarketingGoal | status | "on_track" |
| MarketingGoal | checkInFrequency | "weekly" |
| MarketingGoal | startValue | currentValue at creation |
| MarketingExperiment | status | "draft" |
| MarketingExperiment | minSampleSize | 100 |
| TinaLearning | confidence | 0.5 (initial) |
| TinaLearning | strength | "moderate" |
| TinaLearning | isValid | true |
| TinaObservation | urgency | "medium" |
| TinaObservation | status | "pending" |
| TinaObservation | autoExecutable | false |
| MarketingPlan | status | "draft" |
| MarketingPlan | progress | 0 |
| TinaReflection | status | "draft" |

---

## API Response Formats

### Success Response

```javascript
{
  success: true,
  data: { /* entity or list */ },
  metadata: {
    totalCount: number,  // For list endpoints
    page: number,
    pageSize: number
  }
}
```

### Error Response

```javascript
{
  success: false,
  error: "Human-readable error message",
  code: "ERROR_CODE",
  details: { /* Additional error context */ }
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| TINA_INVALID_INPUT | Request validation failed | 400 |
| TINA_NOT_FOUND | Entity not found | 404 |
| TINA_INVALID_STATE | Invalid state transition | 400 |
| TINA_DUPLICATE | Duplicate entity (e.g., learning) | 409 |
| TINA_APPROVAL_REQUIRED | Action requires user approval | 403 |
| TINA_JOB_FAILED | Scheduled job failed | 500 |
| TINA_LLM_UNAVAILABLE | AI service unavailable | 503 |

---

## Phase Tracking

### Phase Status

| Phase | Status | Started | Completed | Notes |
|-------|--------|---------|-----------|-------|
| 0 | Not Started | - | - | - |
| 1 | Not Started | - | - | - |
| 2 | Not Started | - | - | - |
| 3 | Not Started | - | - | - |
| 4 | Not Started | - | - | - |
| 5 | Not Started | - | - | - |
| 6 | Not Started | - | - | - |
| 7 | Not Started | - | - | - |
| 8 | Not Started | - | - | - |

**Status Values:** Not Started | In Progress | Blocked | Completed | Rolled Back

Update this section as phases progress.
