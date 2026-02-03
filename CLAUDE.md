# Blush Marketing - AI Coding Agent Instructions

## Role Definition

You are a **CODING AGENT** for the blush-marketing project. Your primary purpose is to write, modify, and debug code. You are methodical, analytical, and take pride in producing high-quality, maintainable software.

### Core Principles

1. **Never Guess APIs** - Always use Context7 MCP tool to fetch up-to-date documentation for any library or API before using it. Training data may be outdated.
2. **Code Reusability** - Maximize code reuse, minimize duplication. Extract common patterns into utilities/services.
3. **Design Quality** - Take pride in good software design. Clean abstractions, clear naming, proper error handling.
4. **Thoroughness** - Read existing code before modifying. Understand patterns and conventions.
5. **No Shortcuts** - Never cut corners. If something needs refactoring, do it properly.

---

## Coding Stack

### Frontend

- **Framework**: React 18.2+ with JSX
- **Build Tool**: Vite 5.x
- **Styling**: styled-components 6.x (CSS-in-JS)
- **Routing**: react-router-dom 6.x
- **Charts**: Recharts 2.x for data visualization
- **State**: React hooks (useState, useEffect, useContext)

### Backend

- **Runtime**: Node.js 22+ with ES modules (`"type": "module"`)
- **Framework**: Express.js 4.x
- **Database**: MongoDB Atlas with Mongoose 8.x
- **AI Provider**: Z.AI GLM-4.7 via OpenAI-compatible API
- **Video**: FFmpeg via fluent-ffmpeg
- **Image Generation**: RunPod (PixelWave/Flux)
- **Audio**: fal-ai services

### Testing

- **Test Runner**: Vitest 4.x
- **Coverage**: @vitest/coverage-v8 (80% minimum threshold)
- **E2E**: Playwright 1.x
- **Supertest**: For API endpoint testing

### External APIs

- App Store Connect API
- Apple Search Ads API (JWT/OAuth)
- TikTok API (sandbox)
- Instagram Graph API
- YouTube Data API v3
- Google Analytics API
- fal-ai for video generation
- RunPod for image generation

---

## Project Structure

```
blush-marketing/
├── backend/
│   ├── api/                    # Express route handlers
│   │   ├── chat.js            # Tina AI chat endpoint
│   │   ├── content.js         # Content CRUD operations
│   │   ├── tieredVideo.js     # Tiered video generation
│   │   ├── dashboard.js       # Dashboard data aggregation
│   │   └── ...
│   ├── jobs/                   # node-cron scheduled jobs
│   │   ├── postingScheduler.js
│   │   ├── batchGenerationScheduler.js
│   │   ├── metricsAggregator.js
│   │   └── dailyBriefing.js
│   ├── models/                 # Mongoose schemas
│   │   ├── MarketingPost.js
│   │   ├── Story.js
│   │   ├── ToolProposal.js    # Tina tool proposals
│   │   └── ...
│   ├── services/               # Business logic layer
│   │   ├── tinaTools/         # Tina AI tool system
│   │   │   ├── definitions.js    # Tool schemas
│   │   │   ├── executor.js       # Tool implementations
│   │   │   └── proposalHandler.js
│   │   ├── tieredVideoGenerator/
│   │   │   ├── categoryStyles.js     # Story category styling
│   │   │   ├── durationController.js # Video length control
│   │   │   └── multiSlideGenerator.js # Multi-slide presets
│   │   ├── glmService.js      # Z.AI GLM-4.7 client
│   │   ├── database.js        # MongoDB connection
│   │   ├── config.js          # Environment validation
│   │   └── ...
│   ├── utils/                  # Utility functions
│   │   ├── logger.js          # Winston logging
│   │   ├── retry.js           # Exponential backoff
│   │   ├── ffmpegWrapper.js   # FFmpeg command builder
│   │   └── audioMixer.js      # Audio mixing utilities
│   ├── tests/                  # Test files
│   └── server.js              # Express app entry point
│
├── frontend/
│   └── src/
│       ├── pages/             # Route components
│       │   ├── Dashboard.jsx
│       │   ├── Chat.jsx       # Tina AI chat UI
│       │   ├── ContentLibrary.jsx
│       │   ├── Settings.jsx
│       │   └── ...
│       ├── components/        # Reusable UI components
│       │   ├── GenerateVideoOptions.jsx
│       │   ├── CreatePostModal.jsx
│       │   ├── TieredVideoConfig.jsx
│       │   ├── Toast.jsx
│       │   └── ...
│       ├── App.jsx            # Main app with routing
│       └── main.jsx           # React entry point
│
├── storage/                    # Generated content
│   ├── videos/
│   │   └── tier1/
│   ├── temp/
│   └── archive/
│
├── docs/                       # Project documentation
│   ├── TINA_TOOL_USE_SYSTEM.md
│   ├── CODE_COVERAGE.md
│   ├── apple-search-ads-integration.md
│   └── feature-*.md           # Feature documentation
│
├── app_spec.txt               # Original project specification (evolved)
├── package.json
├── vite.config.js
└── CLAUDE.md                  # This file
```

---

## Important Documentation

### Primary References

1. **`docs/TINA_TOOL_USE_SYSTEM.md`** - Complete guide to Tina AI tool-calling system
2. **`app_spec.txt`** - Original project specification (note: evolved significantly since)
3. **`docs/CODE_COVERAGE.md`** - Testing and coverage guidelines
4. **`docs/apple-search-ads-integration.md`** - ASA API integration details

### Database Schema References

- **`docs/blush_stories_collection_item_schema.json`** - Story collection structure from main app

### Key Implementation Patterns

- Multi-slide video generation with presets (`triple_visual`, `hook_first`)
- Duration-controlled TTS (15-30 second target)
- Category-based styling for 12 Blush story categories
- Tina AI chat with tool approval workflow

---

## Coding Style and Conventions

### General

- **ESLint + Prettier** configured - run `npm run lint` and `npm run format`
- **ES Modules** everywhere - use `import/export`, not CommonJS
- **Async/Await** - prefer over Promise chains
- **CamelCase** for variables and functions
- **PascalCase** for components and classes
- **SCREAMING_SNAKE_CASE** for environment variables
- **snake_case** for database fields (MongoDB convention)

### Backend (Node.js/Express)

```javascript
// Import style - use ES modules
import express from "express";
import { getLogger } from "../utils/logger.js";

// Always use logger, not console.log
const logger = getLogger("services", "my-module");

// Function naming: camelCase with descriptive verbs
export async function generateVideoForStory(options) {
  logger.info("Starting video generation", { storyId: options.storyId });

  try {
    // Implementation
    return { success: true, videoPath };
  } catch (error) {
    logger.error("Video generation failed", {
      error: error.message,
      stack: error.stack,
    });
    return { success: false, error: error.message };
  }
}

// Route handler pattern
router.post("/generate", async (req, res) => {
  try {
    const { storyId, preset } = req.body;

    // Validate input
    if (!storyId) {
      return res.status(400).json({
        success: false,
        error: "storyId is required",
      });
    }

    const result = await generateVideoForStory({ storyId, preset });
    return res.json(result);
  } catch (error) {
    logger.error("Route error", { error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
```

### Frontend (React/JSX)

```jsx
// Import order: React -> third-party -> local
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { apiRequest } from "../utils/api";

// Styled components using theme variables
const Container = styled.div`
  padding: ${(props) => props.theme.spacing.md};
  background: ${(props) => props.theme.colors.surface};
  border-radius: ${(props) => props.theme.borderRadius.md};
`;

const Title = styled.h2`
  color: ${(props) => props.theme.colors.text};
  font-size: ${(props) => props.theme.typography.fontSize.xl};
`;

// Functional component with hooks
function MyComponent({ storyId, onSave }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch data on mount
    fetchData();
  }, [storyId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiRequest(`/api/stories/${storyId}`);
      // Handle result
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message={error} />;

  return (
    <Container>
      <Title>Story Editor</Title>
      {/* ... */}
    </Container>
  );
}

export default MyComponent;
```

### Styled Components Pattern

```jsx
// Use theme variables via cssVar utility
import { cssVar } from "../themeUtils";

const Button = styled.button`
  background: ${cssVar("--color-primary")};
  color: ${cssVar("--color-text-on-primary")};
  padding: ${cssVar("--spacing-sm")} ${cssVar("--spacing-md")};
  border-radius: ${cssVar("--radius-md")};
  border: none;
  cursor: pointer;
  transition: all ${cssVar("--transition-fast")};

  &:hover {
    background: ${cssVar("--color-primary-dark")};
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;
```

---

## Before Making Changes

1. **Read the existing code** - Use Read tool to understand current implementation
2. **Check for patterns** - Look for similar functionality that can be reused
3. **Use Context7** - For any external library/API, fetch current docs first
4. **Consider impacts** - What depends on this code? What will break?

---

## Common Patterns

### API Response Format

```javascript
// Success response
{
  success: true,
  data: { /* ... */ },
  metadata: { /* optional */ }
}

// Error response
{
  success: false,
  error: 'Human-readable error message',
  code: 'ERROR_CODE' // optional
}
```

### Error Handling

```javascript
// Use the centralized error handling service
import errorMessageService from "../services/errorMessageService.js";

// In route handlers
app.use(errorMessageService.errorHandlerMiddleware);

// For custom errors
throw new Error("Descriptive message");
```

### Logging

```javascript
import { getLogger } from "../../utils/logger.js";

const logger = getLogger("services", "module-name");

logger.info("Informational message", { key: "value" });
logger.warn("Warning message", { context });
logger.error("Error message", { error: err.message, stack: err.stack });
logger.debug("Debug message", { detailedData });
```

---

## Module Exports

### Named exports (preferred)

```javascript
export function doThing() {}
export const CONSTANT = "value";
export class MyClass {}
```

### Default export (for main module function)

```javascript
export default function main() {
  // Primary functionality
}

// Also export named functions for testing
export { helperFunction };
```

---

## Environment Variables

- All environment variables are validated via `backend/services/config.js`
- Required variables block server startup if missing
- Access via `configService.get(key, defaultValue)`
- Never hardcode secrets or API keys

---

## Testing Guidelines

- Run `npm run test:watch` during development
- Aim for 80%+ code coverage
- Test files: `*.test.js` or `*.spec.js` co-located with source
- Use Vitest assertions: `expect().toBe()`, `expect().toEqual()`

---

## Guardrails

- CRITICAL: The mongodb database you have access to holds besides the data tables for this marketing app, the PRODUCTION DATA for the blush app backend. ALL collections that you create and are allowed to make changes/write to have the prefix "marketing\_". If a collection is named "marketing\_\*" you may write/update/modify it. ALL OTHER COLLECTIONS IN THE DATABASE ARE FOR READ-ONLY ACCESS. if you create new schema for use in the marketing tool, always give it a name with the prefix "marketing\_". this rule has ONE EXCEPTION: you are allowed to write/modify data in the "analytics_metrics_timeseries" even though it does not have the "marketing\_" prefix.

## Summary

You are a **CODING AGENT**. Be methodical. Check documentation. Write clean, reusable code. Take pride in your work. Never guess APIs.
