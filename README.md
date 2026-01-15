# 🌸 Blush Marketing Operations Center

An AI-powered marketing automation platform for the "blush" iPhone app - a romantic/spicy AI story generator.

## Overview

The Blush Marketing Operations Center acts as an autonomous AI Marketing Executive that proactively manages:

- **Social Media Content Generation**: Automated video, image, and caption generation for TikTok, Instagram Reels, and YouTube Shorts
- **ASO Optimization**: App Store keyword tracking, ranking analysis, and optimization recommendations
- **Paid Ad Management**: Apple Search Ads campaign monitoring, budget controls, and ROI tracking
- **AI Strategy**: Conversational AI agent for strategic decision-making and marketing recommendations
- **Analytics & Reporting**: Comprehensive dashboards for MRR, user growth, engagement, and channel performance

**Goal**: Grow the app from $300-500/month MRR to $10,000/month in 6 months through data-driven marketing automation.

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **Styled Components** for dark theme UI
- **Recharts** for data visualization
- **React Router** for navigation

### Backend
- **Node.js 22+** with Express
- **MongoDB Atlas** for data persistence
- **node-cron** for background job scheduling
- **Winston** for logging

### AI/ML Integration
- **GLM4.7** via Anthropic-compatible API for strategy and content
- **Fal.ai** for video generation
- **RunPod** (PixelWave/Flux) for image generation

### External APIs
- App Store Connect API
- Apple Search Ads API
- TikTok API (sandbox)
- Google Analytics API

## Project Structure

```
blush-marketing/
├── backend/
│   ├── api/           # REST API endpoints
│   ├── models/        # MongoDB models
│   ├── services/      # Business logic & external API clients
│   ├── jobs/          # Background jobs (node-cron)
│   ├── utils/         # Helper functions
│   └── server.js      # Express server entry point
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API client services
│   │   └── App.jsx        # React entry point
│   └── index.html
├── storage/            # Local file storage
│   ├── videos/
│   ├── images/
│   └── audio/
├── logs/              # Application logs
├── prompts/           # AI prompts and specs
├── init.sh            # Environment setup script
├── package.json
└── README.md
```

## Quick Start

### Prerequisites

- **Node.js 22+**
- **Python 3.9+** (for AI/ML microservice)
- **MongoDB Atlas** account (existing database)
- **API keys** for:
  - App Store Connect
  - Apple Search Ads
  - TikTok
  - Google Analytics
  - Fal.ai
  - RunPod
  - GLM4.7

### Installation

1. **Clone and setup**:
```bash
cd C:\Projects\blush-marketing
chmod +x init.sh
./init.sh
```

2. **Configure environment**:
Edit `.env` file and add your API keys, or configure them through the Settings UI after starting.

3. **Start development server**:
```bash
npm run dev
```

4. **Access the application**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## First-Time Setup

1. **Open Settings** → Configure all API keys
2. **Test connections** → Verify each API integration works
3. **Set budget limits** → Configure monthly marketing budget
4. **Generate initial content** → Run content generation from Dashboard
5. **Review and approve** → Approve content in Todos/Content Library

## Database Collections

The system uses MongoDB with the following collections:

- `marketing_posts` - Generated social media content
- `marketing_strategy` - AI strategic decisions and recommendations
- `marketing_tasks` - Todo items and action items
- `marketing_revenue` - Revenue and financial metrics
- `marketing_ad_campaigns` - Paid ad campaign data
- `marketing_aso_keywords` - App Store keyword tracking
- `marketing_aso_experiments` - A/B test data
- `story_blacklist` - Stories excluded from content generation
- `analytics_metrics_timeseries` - Time-series metrics

## Key Features

### 🤖 AI Chat & Strategy
- Conversational AI interface (GLM4.7)
- Full historical data access for context
- Strategic recommendations based on performance
- Budget change proposals (awaiting approval)
- Daily briefings and campaign reviews

### 📝 Content Generation Pipeline
- Story selection from database (filtered by criteria)
- Video generation (Fal.ai, RunPod)
- Image generation for cover art
- Audio excerpt extraction
- Caption and hashtag generation
- Brand watermark overlay
- Content moderation checks

### 📋 Content Approval Workflow
- Todo sidebar with pending approvals
- Content review interface
- Approve/reject with feedback
- Story blacklisting
- Batch approval queue
- Status tracking (draft → ready → approved → posted)

### 📱 Social Media Integration
- TikTok API integration (sandbox)
- Instagram Reels (Phase 2)
- YouTube Shorts (Phase 2)
- Automatic posting at scheduled times
- Manual posting workflow with export
- Performance metrics retrieval

### 📊 ASO & App Store Optimization
- Keyword ranking tracking
- Competitiveness analysis
- Opportunity suggestions
- Ranking history visualization
- App metadata management
- Screenshot analysis
- A/B testing framework

### 💰 Paid Ads Management
- Apple Search Ads integration
- Campaign monitoring
- Budget tracking with alerts (70%, 90%)
- Auto-pause at budget limit
- ROI calculation
- Bid adjustment suggestions

### 📈 Dashboards & Analytics
- Tactical dashboard (24h, 7d metrics)
- Strategic dashboard (trends over time)
- MRR and user growth tracking
- Channel performance comparison
- Budget utilization
- Real-time alerts

## Background Jobs

The system runs automated jobs via node-cron:

- **Daily content generation** (6 AM)
- **Scheduled posting** (every 15 minutes)
- **Daily metrics aggregation** (midnight)
- **Budget checking** (hourly)
- **Keyword ranking check** (daily)
- **Revenue sync** (daily)
- **Daily briefing generation** (morning)
- **Data cleanup** (weekly)

## Development

### Running Tests

**Local Testing:**
```bash
npm test              # Run all unit tests (Jest)
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
npm run test:api      # Integration tests (Vitest)
npm run test:regression # Regression suite
```

**CI/CD Automated Testing:**

All tests run automatically on every push and PR via GitHub Actions:

- ✅ Unit Tests (Jest)
- ✅ Integration Tests (Vitest)
- ✅ End-to-End Tests
- ✅ Performance Tests
- ✅ Regression Tests (30+ tests)
- ✅ Security Scanning (npm audit, TruffleHog, CodeQL)
- ✅ Code Quality (ESLint, Prettier)

**CI/CD Documentation:**
- [Full CI/CD Documentation](.github/workflows/CI_CD_DOCUMENTATION.md)
- [Quick Start Guide](.github/workflows/QUICK_START.md)
- [Workflows README](.github/workflows/README.md)

**View Results:**
- Check PR comments for automated test results
- GitHub Actions tab for detailed logs
- Test artifacts stored for 30 days

### Linting & Formatting
```bash
npm run lint          # Check code
npm run lint:fix      # Fix issues
npm run format        # Format code
```

### Database Operations
```bash
npm run db:seed       # Seed database with test data
npm run db:migrate    # Run migrations
```

## Configuration

### Environment Variables

See `.env.example` for all available configuration options.

Key settings:
- `MONGODB_URI` - MongoDB connection string
- `PORT` - Backend server port (default: 3001)
- `MONTHLY_BUDGET_LIMIT` - Marketing budget cap
- `BUDGET_WARNING_THRESHOLD` - Alert at 70%
- `BUDGET_CRITICAL_THRESHOLD` - Auto-pause at 90%

### Settings UI

Configure all settings through the web UI at `/settings`:
- API key management
- Budget configuration
- Posting schedule
- Content generation preferences
- Notification preferences

## Deployment

### Current: Local Development
The system is designed for local execution with Docker support.

### Future: Cloud Migration (Phase 2)
- AWS Lambda for serverless functions
- S3 for media storage
- CloudWatch for logging
- Route 53 for DNS

## Troubleshooting

### Common Issues

**MongoDB connection fails**
- Verify `MONGODB_URI` is correct
- Check MongoDB Atlas whitelist includes your IP
- Ensure network allows outbound connections

**Content generation fails**
- Verify Fal.ai/RunPod API keys are valid
- Check API quotas and rate limits
- Review error logs in `logs/` directory

**Social media posting fails**
- Verify API credentials are correct
- Check sandbox vs production environment
- Ensure content meets platform specifications

**Background jobs not running**
- Verify node-cron is configured
- Check server logs for errors
- Ensure server process is running

## Support & Documentation

- **API Documentation**: Available at `/api-docs` when server is running
- **Feature Specs**: See `prompts/app_spec.txt`
- **Agent Instructions**: See `prompts/initializer_prompt.md`

## License

Proprietary - All rights reserved

## Roadmap

### Phase 1 (Current)
- ✅ Core infrastructure
- ✅ TikTok integration (sandbox)
- ✅ ASO tracking
- ✅ Apple Search Ads monitoring
- ✅ AI chat and strategy

### Phase 2 (Q1 2025)
- 🔄 Instagram Reels integration
- 🔄 YouTube Shorts integration
- 🔄 Automated ASO A/B testing
- 🔄 Press release generation
- 🔄 Advanced analytics

### Phase 3 (Q2 2025)
- ⏳ Cloud migration to AWS
- ⏳ S3 media storage
- ⏳ Lambda functions
- ⏳ Multi-user support
- ⏳ White-label capabilities

---

**Built with ❤️ for the blush app**
