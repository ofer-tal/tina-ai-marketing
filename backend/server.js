import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import databaseService from "./services/database.js";
import configService, { configSchema } from "./services/config.js";
import settingsRouter from "./api/settings.js";
import storageRouter from "./api/storage.js";
import dashboardRouter from "./api/dashboard.js";
import chatRouter from "./api/chat.js";
import todosRouter from "./api/todos.js";
import contentRouter from "./api/content.js";
import videoRouter from "./api/video.js";
import imageRouter from "./api/image.js";
import audioRouter from "./api/audio.js";
import hooksRouter from "./api/hooks.js";
import blacklistRouter from "./api/blacklist.js";
import tiktokRouter from "./api/tiktok.js";
import instagramRouter from "./api/instagram.js";
import youtubeRouter from "./api/youtube.js";
import rateLimitsRouter from "./api/rateLimits.js";
import platformOptimizationRouter from "./api/platform-optimization.js";
import tiktokAudioRouter from "./api/tiktok-audio.js";
import audioOverlayRouter from "./api/audio-overlay.js";
import metricsRouter from "./api/metrics.js";
import appstoreRouter from "./api/appstore.js";
import asoRouter from "./api/aso.js";
import conversionMetricsRouter from "./api/conversionMetrics.js";
import reportsRouter from "./api/reports.js";
import experimentsRouter from "./api/experiments.js";
import searchAdsRouter from "./api/searchAds.js";
import revenueRouter from "./api/revenue.js";
import dashboardTestRouter from "./api/dashboard-test.js";
import testDbAccessRouter from "./api/testDbAccess.js";
import googleAnalyticsRouter from "./api/googleAnalytics.js";
import glmRouter from "./api/glm.js";
import cacheRouter from "./api/cache.js";
import briefingRouter from "./api/briefing.js";
import dataCleanupRouter from "./api/dataCleanup.js";
import apiHealthRouter from "./api/apiHealth.js";
import postRetryRouter from "./api/postRetry.js";
import storyRefreshRouter from "./api/storyRefresh.js";
import revenueSyncRouter from "./api/revenueSync.js";
import keywordRankingCheckRouter from "./api/keywordRankingCheck.js";
import abTestDurationMonitorRouter from "./api/abTestDurationMonitor.js";
import logRotationRouter from "./api/logRotation.js";
import channelPerformanceRouter from "./api/channel-performance.js";
import contentEngagementAnalysisRouter from "./api/contentEngagementAnalysis.js";
import optimalPostingTimeRouter from "./api/optimalPostingTime.js";
import storyCategoryAnalysisRouter from "./api/storyCategoryAnalysis.js";
import hashtagEffectivenessAnalysisRouter from "./api/hashtagEffectivenessAnalysis.js";
import videoStyleAnalysisRouter from "./api/videoStyleAnalysis.js";
import cohortAnalysisRouter from "./api/cohortAnalysis.js";
import attributionRouter from "./api/attribution.js";
import predictiveAnalyticsRouter from "./api/predictiveAnalytics.js";
import anomalyDetectionRouter from "./api/anomalyDetection.js";
import abTestStatisticsRouter from "./api/abTestStatistics.js";
import roiOptimizationRouter from "./api/roiOptimization.js";
import churnPredictionRouter from "./api/churnPrediction.js";
import ltvModelingRouter from "./api/ltvModeling.js";
import blogPostsRouter from "./api/blogPosts.js";
import mediumArticlesRouter from "./api/mediumArticles.js";
import pressReleasesRouter from "./api/pressReleases.js";
import seoContentSuggestionsRouter from "./api/seoContentSuggestions.js";
import contentCalendarRouter from "./api/contentCalendar.js";
import websiteTrafficRouter from "./api/websiteTraffic.js";
import contentPerformanceRouter from "./api/contentPerformance.js";
import storageService from "./services/storage.js";
import postingSchedulerJob from "./jobs/postingScheduler.js";
import batchGenerationScheduler from "./jobs/batchGenerationScheduler.js";
import metricsAggregatorJob from "./jobs/metricsAggregator.js";
import weeklyASOAnalysis from "./jobs/weeklyASOAnalysis.js";
import budgetThresholdChecker from "./jobs/budgetThresholdChecker.js";
import dailyBriefingJob from "./jobs/dailyBriefing.js";
import campaignReviewScheduler from "./jobs/campaignReviewScheduler.js";
import dataCleanupJob from "./jobs/dataCleanup.js";
import apiHealthMonitorJob from "./jobs/apiHealthMonitor.js";
import postRetryJob from "./jobs/postRetryJob.js";
import storyRefreshJob from "./jobs/storyRefreshJob.js";
import revenueSyncJob from "./jobs/revenueSyncJob.js";
import keywordRankingCheckJob from "./jobs/keywordRankingCheckJob.js";
import abTestDurationMonitorJob from "./jobs/abTestDurationMonitor.js";
import logRotationJob from "./jobs/logRotationJob.js";

dotenv.config();

// Validate environment variables on startup
console.log("Validating environment configuration...");
const configValidation = configService.validate();

// Print configuration report in development
if (process.env.NODE_ENV !== "production") {
  configService.printReport();
}

// Exit if critical configuration is missing
if (!configValidation.valid) {
  const criticalErrors = configValidation.errors.filter(e => e.severity === "critical");
  if (criticalErrors.length > 0) {
    console.error("\n❌ Critical configuration errors detected. Server cannot start.");
    process.exit(1);
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = configService.get('PORT', 3001);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));

app.get("/api/health", async (req, res) => {
  try {
    const dbStatus = databaseService.getStatus();

    // Check external API configuration status
    const externalApis = {
      appStoreConnect: {
        configured: !!(process.env.APP_STORE_CONNECT_KEY_ID &&
                       process.env.APP_STORE_CONNECT_ISSUER_ID &&
                       process.env.APP_STORE_CONNECT_PRIVATE_KEY_PATH),
        keyIdConfigured: !!process.env.APP_STORE_CONNECT_KEY_ID,
      },
      appleSearchAds: {
        configured: !!(process.env.APPLE_SEARCH_ADS_CLIENT_ID &&
                       process.env.APPLE_SEARCH_ADS_CLIENT_SECRET &&
                       process.env.APPLE_SEARCH_ADS_ORGANIZATION_ID),
        clientIdConfigured: !!process.env.APPLE_SEARCH_ADS_CLIENT_ID,
      },
      tiktok: {
        configured: !!(process.env.TIKTOK_APP_KEY &&
                       process.env.TIKTOK_APP_SECRET),
        appKeyConfigured: !!process.env.TIKTOK_APP_KEY,
      },
      instagram: {
        configured: !!(process.env.INSTAGRAM_APP_ID &&
                       process.env.INSTAGRAM_APP_SECRET),
        appIdConfigured: !!process.env.INSTAGRAM_APP_ID,
      },
      youtube: {
        configured: !!(process.env.YOUTUBE_API_KEY &&
                       process.env.YOUTUBE_CLIENT_ID &&
                       process.env.YOUTUBE_CLIENT_SECRET),
        apiKeyConfigured: !!process.env.YOUTUBE_API_KEY,
        clientIdConfigured: !!process.env.YOUTUBE_CLIENT_ID,
      },
      googleAnalytics: {
        configured: !!(process.env.GOOGLE_ANALYTICS_VIEW_ID || process.env.GOOGLE_ANALYTICS_PROPERTY_ID),
        viewIdConfigured: !!process.env.GOOGLE_ANALYTICS_VIEW_ID,
        propertyIdConfigured: !!process.env.GOOGLE_ANALYTICS_PROPERTY_ID,
      },
      ai: {
        falAi: !!process.env.FAL_AI_API_KEY,
        runpod: !!process.env.RUNPOD_API_KEY,
        glm47: !!process.env.GLM47_API_KEY,
        configured: !!(process.env.FAL_AI_API_KEY ||
                      process.env.RUNPOD_API_KEY ||
                      process.env.GLM47_API_KEY),
      }
    };

    // Calculate overall external API status
    const externalApiStatus = {
      total: 8,
      configured: Object.values(externalApis).filter(api => api.configured).length,
      apis: externalApis
    };

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      uptimeHuman: formatUptime(process.uptime()),
      environment: process.env.NODE_ENV || "development",
      version: "1.0.0",
      database: {
        connected: dbStatus.isConnected,
        readyState: dbStatus.readyState,
        name: dbStatus.name,
        host: dbStatus.host
      },
      externalApis: externalApiStatus
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// Helper function to format uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

app.get("/api/database/test", async (req, res) => {
  try {
    await databaseService.testConnection();
    await databaseService.testReadAccess();
    res.json({
      status: "success",
      message: "Database connection and access test passed",
      database: databaseService.getStatus()
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Database test failed", error: error.message });
  }
});

// Settings API routes
app.use("/api/settings", settingsRouter);
app.use("/api/storage", storageRouter);
// Serve storage directory statically for generated content access
app.use("/storage", express.static(path.join(__dirname, "../storage")));
app.use("/api/dashboard", dashboardRouter);
app.use("/api/chat", chatRouter);
app.use("/api/todos", todosRouter);
app.use("/api/content", contentRouter);
app.use("/api/video", videoRouter);
app.use("/api/image", imageRouter);
app.use("/api/audio", audioRouter);
app.use("/api/hooks", hooksRouter);
app.use("/api/blacklist", blacklistRouter);
app.use("/api/tiktok", tiktokRouter);
app.use("/api/instagram", instagramRouter);
app.use("/api/youtube", youtubeRouter);
app.use("/api/rate-limits", rateLimitsRouter);
app.use("/api/platform-optimization", platformOptimizationRouter);
app.use("/api/tiktok-audio", tiktokAudioRouter);
app.use("/api/audio-overlay", audioOverlayRouter);
app.use("/api/metrics", metricsRouter);
app.use("/api/appstore", appstoreRouter);
app.use("/api/aso", asoRouter);
app.use("/api/conversion", conversionMetricsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/experiments", experimentsRouter);
app.use("/api/searchAds", searchAdsRouter);
app.use("/api/revenue", revenueRouter);
app.use("/api/dashboard/test", dashboardTestRouter);
app.use("/api/test-db-access", testDbAccessRouter);
app.use("/api/googleAnalytics", googleAnalyticsRouter);
app.use("/api/glm", glmRouter);
app.use("/api/cache", cacheRouter);
app.use("/api/briefing", briefingRouter);
app.use("/api/data-cleanup", dataCleanupRouter);
app.use("/api/api-health", apiHealthRouter);
app.use("/api/post-retry", postRetryRouter);
app.use("/api/story-refresh", storyRefreshRouter);
app.use("/api/revenue-sync", revenueSyncRouter);
app.use("/api/keyword-ranking-check", keywordRankingCheckRouter);
app.use("/api/ab-test-monitor", abTestDurationMonitorRouter);
app.use("/api/log-rotation", logRotationRouter);
app.use("/api/channel-performance", channelPerformanceRouter);
app.use("/api/content-engagement", contentEngagementAnalysisRouter);
app.use("/api/posting-time", optimalPostingTimeRouter);
app.use("/api/story-category-analysis", storyCategoryAnalysisRouter);
app.use("/api/hashtag-effectiveness", hashtagEffectivenessAnalysisRouter);
app.use("/api/video-style-analysis", videoStyleAnalysisRouter);
app.use("/api/cohort-analysis", cohortAnalysisRouter);
app.use("/api/attribution", attributionRouter);
app.use("/api/predictive-analytics", predictiveAnalyticsRouter);
app.use("/api/anomaly-detection", anomalyDetectionRouter);
app.use("/api/ab-test-statistics", abTestStatisticsRouter);
app.use("/api/roi-optimization", roiOptimizationRouter);
app.use("/api/churn-prediction", churnPredictionRouter);
app.use("/api/ltv-modeling", ltvModelingRouter);
app.use("/api/blog-posts", blogPostsRouter);
app.use("/api/medium-articles", mediumArticlesRouter);
app.use("/api/press-releases", pressReleasesRouter);
app.use("/api/seo-suggestions", seoContentSuggestionsRouter);
app.use("/api/content-calendar", contentCalendarRouter);
app.use("/api/website-traffic", websiteTrafficRouter);
app.use("/api/content-performance", contentPerformanceRouter);

app.get("/api/config/status", (req, res) => {
  try {
    const validation = configService.validate();
    const config = configService.getAll();

    // Remove sensitive values from response
    const sanitizedConfig = {};
    for (const [key, value] of Object.entries(config)) {
      const sensitiveKeys = ['SECRET', 'KEY', 'PASSWORD', 'TOKEN', 'PRIVATE_KEY', 'CREDENTIALS'];
      const isSensitive = sensitiveKeys.some(sensitiveKey => key.includes(sensitiveKey));

      if (isSensitive && value) {
        sanitizedConfig[key] = '****';
      } else {
        sanitizedConfig[key] = value;
      }
    }

    res.json({
      status: validation.valid ? "ok" : "warning",
      timestamp: new Date().toISOString(),
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
      config: sanitizedConfig,
      summary: {
        totalVariables: Object.keys(configSchema).length,
        configuredVariables: Object.keys(config).length,
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length
      }
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.get("/api", (req, res) => {
  res.json({
    name: "Blush Marketing Operations Center API",
    version: "1.0.0",
    status: "running",
    database: databaseService.getStatus()
  });
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
  });
}

app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({ error: { message: err.message || "Internal server error", status: err.status || 500 } });
});

app.use((req, res) => {
  res.status(404).json({ error: { message: "Route not found", status: 404 } });
});

let server = null;

async function startServer() {
  // Start Express server and save reference
  server = app.listen(PORT, () => {
    console.log("Blush Marketing Operations Center API Server running on port " + PORT);
  });

  // Try to connect to MongoDB (non-blocking in development)
  try {
    console.log("Connecting to MongoDB...");
    await databaseService.connect();
    console.log("MongoDB connection established");

    // Start the posting scheduler job after MongoDB connects
    postingSchedulerJob.start();
    console.log("Posting scheduler job started");

    // Start the batch generation scheduler
    batchGenerationScheduler.start();
    console.log("Batch generation scheduler started");

    // Start the metrics aggregation scheduler
    metricsAggregatorJob.start();
    console.log("Metrics aggregation scheduler started");

    // Start the weekly ASO analysis scheduler
    weeklyASOAnalysis.start();
    console.log("Weekly ASO analysis scheduler started");

    // Start the budget threshold checker
    budgetThresholdChecker.start();
    console.log("Budget threshold checker started");

    // Start the daily briefing generator
    dailyBriefingJob.start();
    console.log("Daily briefing generator started");

    // Start the campaign review scheduler
    campaignReviewScheduler.start();
    console.log("Campaign review scheduler started");

    // Start the data cleanup job
    dataCleanupJob.start();
    console.log("Data cleanup job started");

    // Start the API health monitor
    apiHealthMonitorJob.start();
    console.log("API health monitor started");

    // Start the post retry job
    postRetryJob.start();
    console.log("Post retry job started");

    // Start the story database refresh job
    storyRefreshJob.start();
    console.log("Story database refresh job started");

    // Start the revenue sync job
    revenueSyncJob.start();
    console.log("Revenue sync job started");

    // Start the keyword ranking check job
    keywordRankingCheckJob.start();
    console.log("Keyword ranking check job started");

    // Start the A/B test duration monitor job
    abTestDurationMonitorJob.start();
    console.log("A/B test duration monitor job started");

    // Start the log rotation job
    logRotationJob.start();
    console.log("Log rotation job started");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error.message);
    if (process.env.NODE_ENV === "production") {
      console.error("In production mode, MongoDB is required. Exiting...");
      process.exit(1);
    } else {
      console.warn("Running in development mode without MongoDB connection. Some features may not work.");
    }
  }
}

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  const shutdownTimeout = 30000; // 30 seconds max
  const startTime = Date.now();

  try {
    // Step 1: Stop accepting new requests
    console.log('  [1/5] Stopping new requests...');
    if (server) {
      await new Promise((resolve) => {
        server.close(() => {
          console.log('  ✓ Server stopped accepting new connections');
          resolve();
        });
      });
    }

    // Step 2: Wait for in-flight requests (give them time to complete)
    console.log('  [2/5] Waiting for in-flight requests...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('  ✓ In-flight requests completed');

    // Step 3: Close database connections
    console.log('  [3/5] Closing database connections...');
    await databaseService.disconnect();
    console.log('  ✓ Database disconnected');

    // Stop scheduler jobs
    console.log('  Stopping scheduler jobs...');
    postingSchedulerJob.stop();
    batchGenerationScheduler.stop();
    metricsAggregatorJob.stop();
    weeklyASOAnalysis.stop();
    budgetThresholdChecker.stop();
    dailyBriefingJob.stop();
    campaignReviewScheduler.stop();
    dataCleanupJob.stop();
    apiHealthMonitorJob.stop();
    postRetryJob.stop();
    storyRefreshJob.stop();
    revenueSyncJob.stop();
    keywordRankingCheckJob.stop();
    abTestDurationMonitorJob.stop();
    logRotationJob.stop();
    console.log('  ✓ Scheduler jobs stopped');

    // Step 4: Cleanup resources (storage temp files, etc.)
    console.log('  [4/5] Running cleanup tasks...');
    try {
      // Cleanup any temp files if needed
      await storageService.cleanupTemp();
      console.log('  ✓ Cleanup tasks completed');
    } catch (error) {
      console.warn('  ⚠ Some cleanup tasks failed:', error.message);
    }

    // Step 5: Exit
    const duration = Date.now() - startTime;
    console.log(`  [5/5] Shutdown complete in ${duration}ms`);
    console.log('Goodbye! 👋');

    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }

  // Force exit after timeout
  setTimeout(() => {
    console.error(`Shutdown timeout (${shutdownTimeout}ms). Forcing exit.`);
    process.exit(1);
  }, shutdownTimeout);
};

// Listen for shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("unhandledRejection");
});

startServer();

export default app;

// Trigger reload
