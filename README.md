# 🌸 Blush Marketing Operations Center

An AI-powered marketing automation platform for "blush" iPhone app - a romantic/spicy AI story generator.

## Overview

The Blush Marketing Operations Center acts as an autonomous AI Marketing Executive that proactively manages:

- **Social Media Content Generation**: Automated video, image, and caption generation for TikTok, Instagram Reels, and YouTube Shorts
- **ASO Optimization**: App Store keyword tracking, ranking analysis, and optimization recommendations
- **Paid Ad Management**: Apple Search Ads campaign monitoring, budget controls, and ROI tracking
- **AI Strategy**: Conversational AI agent for strategic decision-making and marketing recommendations
- **Analytics & Reporting**: Comprehensive dashboards for MRR, user growth, engagement, and channel performance

**Goal**: Grow app from $300-500/month MRR to $10,000/month in 6 months through data-driven marketing automation.

## Tech Stack

### Frontend
- **React 18** with JSX
- **Vite** for fast development with hot reload
- **Styled Components** for dark theme UI
- **Recharts** for data visualization
- **React Router** for navigation

### Backend
- **Node.js 22+** with Express (ES modules)
- **MongoDB Atlas** for data persistence
- **PM2** for process management (persistent across sessions)
- **node-cron** for background job scheduling
- **Winston** for logging with rotation

### AI/ML Integration
- **GLM4.7** via Z.AI API for strategy and content
- **Fal.ai** for video generation
- **RunPod** (PixelWave/Flux) for image generation

### External APIs
- App Store Connect API
- Apple Search Ads API (JWT/OAuth)
- TikTok API (sandbox)
- Instagram Graph API
- YouTube Data API v3
- Google Analytics API
- Google Analytics 4 API

## Project Structure

```
blush-marketing/
├── backend/
│   ├── api/                  # REST API endpoints
│   ├── models/               # MongoDB models (Mongoose schemas)
│   ├── services/             # Business logic & external API clients
│   │   ├── tinaTools/      # Tina AI tool system
│   │   └── tieredVideoGenerator/  # Video generation pipeline
│   ├── jobs/                # Background jobs (node-cron)
│   ├── utils/               # Helper functions
│   │   └── gracefulShutdown.js  # Job tracking & shutdown coordinator
│   └── server.js            # Express server entry point
├── frontend/
│   └── src/
│       ├── components/         # React components
│       ├── pages/              # Page components
│       ├── hooks/              # Custom React hooks
│       └── App.jsx            # React entry point
├── ecosystem/                 # PM2 ecosystem configurations
│   ├── ecosystem.development.cjs  # Dev mode (backend + frontend)
│   └── ecosystem.production.cjs     # Prod mode (backend + frontend)
├── scripts/
│   ├── pm2/                # PM2 management scripts
│   │   ├── start.sh         # Start services
│   │   ├── stop.sh          # Stop services
│   │   ├── restart.sh       # Restart with confirmation
│   │   ├── logs.sh          # Log viewer
│   │   ├── status.sh        # Service status
│   │   └── dev-reload.sh    # Manual reload trigger
│   └── systemd/             # Systemd service files
├── storage/                   # Local file storage
│   ├── videos/
│   ├── images/
│   └── audio/
├── logs/                     # Application logs (Winston + PM2)
├── docs/                     # Project documentation
├── prompts/                  # AI prompts and specs
├── package.json
└── README.md
```

## Quick Start

### Prerequisites

- **Node.js 22+** (or 24+)
- **npm 10+**
- **MongoDB Atlas** account (existing database)
- **PM2** (installed globally: `npm install -g pm2`)

### API Keys Required

Configure in `.env` file or through Settings UI after starting:

- App Store Connect (Key ID, Issuer ID, Private Key)
- Apple Search Ads (Client ID, Team ID, Private Key, Org ID)
- TikTok (App Key, App Secret)
- Instagram (App ID, App Secret)
- Google OAuth (Client ID, Client Secret) - for GA, YouTube, etc.
- Google Analytics (Service Account credentials)
- Fal.ai API Key
- RunPod API Key
- GLM4.7 API Key

### Installation

1. **Clone repository**:
```bash
git clone <repository-url>
cd blush-marketing
npm install
```

2. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. **Start services**:

**Option A: Development (with file watching)**
```bash
npm run dev              # Both frontend and backend with hot reload
```

**Option B: Production Mode (PM2 - recommended for servers)**
```bash
# Start in stable mode (no file watch, crash-only restarts)
npm run pm2:start:dev

# Start in hot-reload mode (3s delay, may interrupt long jobs)
npm run pm2:start:dev-watch

# Start in production mode
npm run pm2:start:prod
```

4. **Access application**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001 (HTTPS with self-signed cert)

## First-Time Setup

1. **Open Settings** → Configure all API keys
2. **Test connections** → Verify each API integration works
3. **Set budget limits** → Configure monthly marketing budget
4. **Generate initial content** → Run content generation from Dashboard
5. **Review and approve** → Approve content in Todos/Content Library

## PM2 Process Management

The application uses **PM2** for persistent process management on Linux servers.

### Key Benefits

- ✅ **Persistent processes** - Services survive SSH session closures
- ✅ **Automatic restart** - Restarts on crashes (not file edits by default)
- ✅ **Graceful shutdown** - 60-second timeout for long-running jobs to complete
- ✅ **Log streaming** - Real-time logs via `npm run pm2:logs:follow`

### Available Commands

```bash
# Service Management
npm run pm2:start          # Interactive start (prompts for mode)
npm run pm2:start:dev      # Stable development (no watch) - RECOMMENDED
npm run pm2:start:dev-watch # Hot reload mode (file changes trigger restart)
npm run pm2:start:prod     # Production mode
npm run pm2:stop           # Stop services gracefully
npm run pm2:restart        # Restart with confirmation prompt
npm run pm2:reload         # Zero-downtime reload

# Log Management
npm run pm2:logs           # View last 100 lines of all logs
npm run pm2:logs:err       # Error logs only
npm run pm2:logs:out       # Output logs only
npm run pm2:logs:follow    # ⭐ Stream logs in real-time

# Monitoring
npm run pm2:status         # Show service status and resource usage
npm run pm2:monitor        # Interactive monitoring dashboard
```

### Development Modes

| Mode | File Watch | Auto-Restart | Use Case |
|-------|-----------|--------------|-----------|
| **Stable Dev** | OFF | Crash only | Working on API/jobs, fixing bugs |
| **Hot Reload Dev** | ON (3s delay) | File changes | Frontend/UI work, CSS tweaks |
| **Production** | OFF | Crash only | Live deployment |

### Safety Features

- **Job drain mode** - Stops accepting new jobs during shutdown
- **Active job tracking** - Waits up to 60s for jobs to complete
- **Restart confirmation** - Prompts before restarting if jobs are running
- **Extended timeout** - 60s graceful shutdown (vs 30s default)

### Auto-Start on Boot (Optional)

To enable automatic startup on server boot:

```bash
sudo cp scripts/systemd/blush-marketing.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable blush-marketing.service
sudo systemctl start blush-marketing.service
```

## Database Collections

The system uses MongoDB with the following collections:

- `marketing_posts` - Generated social media content
- `marketing_stories` - Story collection from main app (read-only)
- `marketing_strategy` - AI strategic decisions and recommendations
- `marketing_tasks` - Todo items and action items
- `marketing_revenue` - Revenue and financial metrics
- `marketing_ad_campaigns` - Paid ad campaign data
- `marketing_aso_keywords` - App Store keyword tracking
- `marketing_aso_experiments` - A/B test data
- `story_blacklist` - Stories excluded from content generation
- `analytics_metrics_timeseries` - Time-series metrics
- `marketing_tiktok_posts` - TikTok post tracking
- `marketing_instagram_posts` - Instagram post tracking
- `scheduled_job_executions` - Job execution tracking

**Note**: Only collections prefixed with `marketing_` are writable. All others are read-only.

## Key Features

### 🤖 AI Chat & Strategy
- Conversational AI interface (GLM4.7)
- Full historical data access for context
- Tool-calling system for data retrieval and actions
- Strategic recommendations based on performance
- Budget change proposals (awaiting approval)
- Daily briefings and campaign reviews

### 📝 Content Generation Pipeline
- Story selection from database (filtered by criteria)
- **Tiered video generation**:
  - Tier 1: Simple stock footage with captions
  - Tier 2: AI-generated images with motion
  - Tier 3: AI avatars with dynamic backgrounds
- Image generation for cover art (RunPod PixelWave/Flux)
- Audio excerpt extraction from story text
- Caption and hashtag generation (AI)
- Brand watermark overlay
- Content moderation checks
- **Multi-slide video support** (triple_visual, hook_first presets)
- **Duration-controlled TTS** (15-30 second target)

### 📋 Content Approval Workflow
- Todo sidebar with pending approvals
- Content review interface
- Approve/reject with feedback
- Story blacklisting
- Batch approval queue
- Status tracking (draft → ready → approved → posted)
- **Tina AI tool proposals** for action items

### 📱 Social Media Integration
- **TikTok** API integration (sandbox)
- **Instagram Reels** API integration
- **YouTube Shorts** API integration
- Automatic posting at scheduled times (node-cron)
- Manual posting workflow with export
- Performance metrics retrieval
- **Post retry mechanism** for failed uploads

### 📊 ASO & App Store Optimization
- Keyword ranking tracking (daily checks)
- Competitiveness analysis
- Opportunity suggestions
- Ranking history visualization
- App metadata management
- Screenshot analysis
- A/B testing framework
- Weekly ASO analysis reports

### 💰 Paid Ads Management
- Apple Search Ads integration (JWT/OAuth)
- Campaign monitoring
- Budget tracking with alerts (70%, 90%)
- Auto-pause at budget limit
- ROI calculation
- Bid adjustment suggestions
- Campaign review workflow

### 📈 Dashboards & Analytics
- Tactical dashboard (24h, 7d metrics)
- Strategic dashboard (trends over time)
- MRR and user growth tracking
- Channel performance comparison
- Budget utilization
- Real-time alerts
- Content engagement analysis
- Attribution modeling
- Cohort analysis
- Churn prediction

## Background Jobs

The system runs automated jobs via node-cron:

| Job | Schedule | Description |
|------|-----------|-------------|
| Daily content batch generation | 6 AM | Generate content for next 2 days |
| Scheduled posting | Every 4 hours | Post approved content |
| Daily metrics aggregation | 1 AM UTC | Aggregate platform metrics |
| Budget threshold checking | Hourly | Check spend vs limits |
| Keyword ranking check | 3 AM UTC | Track ASO keyword positions |
| Revenue sync | 2 AM UTC | Sync from App Store Analytics |
| A/B test duration monitor | 4 AM UTC | Check experiment completion |
| Weekly ASO analysis | Mondays 9 AM UTC | Generate optimization reports |
| Campaign review | Fridays 3 PM UTC | Review ad performance |
| Daily briefing generation | 8 AM UTC | AI strategic briefings |
| Data cleanup | Sundays 2 AM UTC | Remove old temp files |
| API health monitoring | Every 30 min | Check external API status |
| Post retry | Hourly | Retry failed posts |
| Story refresh | Every 2 hours | Sync stories from main app |
| Log rotation | Sundays 3 AM UTC | Compress and archive logs |

## Development

### Running Tests

```bash
npm test                  # Run all unit tests
npm run test:watch        # Watch mode
npm run test:coverage      # Coverage report (80% minimum threshold)
npm run test:api          # API endpoint tests
npm run test:regression   # Full regression suite
npm run test:performance   # Performance tests
npm run test:load         # Load testing
```

### Linting & Formatting
```bash
npm run lint            # Check code style
npm run lint:fix        # Auto-fix issues
npm run format          # Format with Prettier
```

### Database Operations
```bash
npm run db:seed         # Seed database with test data
npm run db:migrate      # Run migrations
```

## Configuration

### Environment Variables

Key settings in `.env`:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/blush-marketing

# Server
PORT=3001
NODE_ENV=development

# Budget (USD)
MONTHLY_BUDGET_LIMIT=1000
BUDGET_WARNING_THRESHOLD=0.70
BUDGET_CRITICAL_THRESHOLD=0.90

# Scheduling
BATCH_GENERATION_TIME=06:00
POSTING_SCHEDULE=0 */4 * * *
METRICS_AGGREGATION_TIME=01:00

# PM2 Process Manager
PM2_WATCH_DELAY=3000          # Delay before restart on file change
PM2_RESTART_DELAY=4000         # Delay between crash restarts
SAFE_RESTART=true              # Enable safety checks before restart

# FFmpeg
FFMPEG_MODE=native          # 'native' for Linux, 'wsl' for Windows+WSL
```

### Settings UI

Configure all settings through web UI at `/settings`:
- API key management (OAuth flow available)
- Budget configuration
- Posting schedules
- Content generation preferences
- Notification preferences
- Feature flags (TikTok, Instagram, YouTube posting)

## Troubleshooting

### Common Issues

**Services won't start**
```bash
# Check if PM2 is installed
pm2 --version

# Check Node version
node --version  # Should be 22+ or 24+

# Check logs
npm run pm2:logs:follow
```

**MongoDB connection fails**
- Verify `MONGODB_URI` is correct
- Check MongoDB Atlas whitelist includes your IP
- Ensure network allows outbound connections

**Content generation fails**
- Verify Fal.ai/RunPod API keys are valid
- Check API quotas and rate limits
- Review error logs: `npm run pm2:logs:err`

**Background jobs interrupted**
- Use stable dev mode: `npm run pm2:start:dev`
- Avoid watch mode during long-running jobs
- Check active jobs before restarting

**PM2 command not found via npm run**
- Scripts auto-detect nvm installation
- Ensure `node --version` works
- PM2 scripts find your Node version automatically

**systemd service fails with "protocol" error**
- **Issue**: PM2 can't write its PID file to `~/.pm2` directory
- **Cause**: The service uses a project-local `.pm2` directory to avoid permission issues
- **Solution**:
  1. Ensure `.pm2` directory exists: `mkdir -p .pm2`
  2. Ensure service file has project-local path in `ReadWritePaths`
  3. Reinstall service: `sudo cp scripts/systemd/blush-marketing.service /etc/systemd/system/`
  4. Restart: `sudo systemctl restart blush-marketing.service`
- **Note**: The current implementation uses project-local `.pm2` for systemd, but manual `pm2` commands use `~/.pm2`

**Multiple PM2 processes spawning (fork bomb)**
- **Issue**: systemd service repeatedly creates bash processes
- **Cause**: Lock file not being created or PM2 resurrect failing
- **Solution**:
  1. Clear lock: `rm -f /tmp/blush-marketing-pm2-lock`
  2. Stop service: `sudo systemctl stop blush-marketing.service`
  3. Check wrapper script: `cat scripts/systemd/pm2-resurrect.sh`
  4. Restart: `sudo systemctl start blush-marketing.service`

**PM2 service fails to start on boot**
- **Check PM2 is installed for correct Node version**:
  ```bash
  node --version  # Check which Node is active
  pm2 --version  # Should be 6.0.14
  # If mismatched, install PM2 for current Node:
  nvm use 24 && npm install -g pm2
  ```
- **Verify wrapper script** works manually:
  ```bash
  bash scripts/systemd/pm2-resurrect.sh
  pm2 list  # Should show processes
  ```

## Support & Documentation

- **API Documentation**: Available at `/api-docs` when server is running
- **Feature Specs**: See `docs/app_spec.txt`
- **Tina Tool System**: See `docs/TINA_TOOL_USE_SYSTEM.md`
- **Code Coverage**: See `docs/CODE_COVERAGE.md`
- **OAuth System**: See `docs/oauth-system.md`

## License

Proprietary - All rights reserved

## Roadmap

### Phase 1 (Complete ✅)
- ✅ Core infrastructure with PM2
- ✅ TikTok integration (sandbox)
- ✅ ASO tracking
- ✅ Apple Search Ads monitoring
- ✅ AI chat and strategy (Tina with tool-calling)
- ✅ Tiered video generation pipeline
- ✅ Graceful shutdown with job tracking

### Phase 2 (Q1 2025 - In Progress 🔄)
- 🔄 Instagram Reels integration
- 🔄 YouTube Shorts integration
- 🔄 Automated ASO A/B testing
- 🔄 Press release generation
- 🔄 Advanced analytics (churn, LTV, attribution)

### Phase 3 (Q2 2025 - Planned ⏳)
- ⏳ Multi-user support
- ⏳ White-label capabilities
- ⏳ Advanced reporting exports

---

**Built with ❤️ for the blush app**
