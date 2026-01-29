/**
 * Configuration Validation Service
 *
 * Validates and manages environment variables for the Blush Marketing application.
 * Ensures all required environment variables are present and valid.
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file in project root (parent of backend/)
const projectRoot = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(projectRoot, '.env') });

/**
 * Configuration validation schema
 * Defines required and optional environment variables
 */
const configSchema = {
  // MongoDB Configuration
  MONGODB_URI: {
    required: true,
    description: 'MongoDB Atlas connection string',
    validate: (value) => {
      if (!value) return false;
      // Check if it's a valid MongoDB connection string
      return value.startsWith('mongodb://') || value.startsWith('mongodb+srv://');
    },
    errorMessage: 'Must be a valid MongoDB connection string (mongodb:// or mongodb+srv://)'
  },

  // Server Configuration
  PORT: {
    required: false,
    default: '3001',
    description: 'Backend server port',
    validate: (value) => {
      const port = parseInt(value, 10);
      return !isNaN(port) && port > 0 && port < 65536;
    },
    errorMessage: 'Must be a valid port number (1-65535)'
  },

  NODE_ENV: {
    required: false,
    default: 'development',
    description: 'Node environment (development, production, test)',
    validate: (value) => ['development', 'production', 'test'].includes(value),
    errorMessage: 'Must be one of: development, production, test'
  },

  // App Store Connect API
  APP_STORE_CONNECT_KEY_ID: {
    required: false,
    description: 'App Store Connect API Key ID',
    validate: (value) => !value || value.length > 0,
    errorMessage: 'Must not be empty if provided'
  },

  APP_STORE_CONNECT_ISSUER_ID: {
    required: false,
    description: 'App Store Connect Issuer ID',
    validate: (value) => !value || /^[A-Z0-9]{8}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{12}$/.test(value),
    errorMessage: 'Must be a valid UUID format'
  },

  APP_STORE_CONNECT_PRIVATE_KEY_PATH: {
    required: false,
    description: 'Path to App Store Connect private key file',
    validate: (value) => {
      if (!value) return true;
      const filePath = path.resolve(value);
      return fs.existsSync(filePath);
    },
    errorMessage: 'File must exist at the specified path'
  },

  // Apple Search Ads API - JWT Authentication
  // Documentation: https://developer.apple.com/documentation/apple_ads/implementing-oauth-for-the-apple-search-ads-api
  SEARCH_ADS_CLIENT_ID: {
    required: false,
    description: 'Apple Search Ads Client ID (format: SEARCHADS.xxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
    validate: (value) => !value || /^SEARCHADS\.[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value),
    errorMessage: 'Must be in format: SEARCHADS.xxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
  },

  SEARCH_ADS_TEAM_ID: {
    required: false,
    description: 'Apple Search Ads Team ID (format: SEARCHADS.xxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx OR numeric organization ID)',
    validate: (value) => !value || /^SEARCHADS\.[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value) || /^\d+$/.test(value),
    errorMessage: 'Must be in format: SEARCHADS.xxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx OR a numeric organization ID'
  },

  SEARCH_ADS_KEY_ID: {
    required: false,
    description: 'Apple Search Ads Key ID (from the certificate/private key)',
    validate: (value) => !value || /^[a-f0-9-]{36}$/i.test(value) || /^[A-Z0-9]{10}$/i.test(value),
    errorMessage: 'Must be a valid Key ID (UUID or 10-character alphanumeric)'
  },

  SEARCH_ADS_PRIVATE_KEY_PATH: {
    required: false,
    description: 'Path to Apple Search Ads private key file (PEM format)',
    validate: (value) => {
      if (!value) return true;
      const filePath = path.resolve(value);
      return fs.existsSync(filePath);
    },
    errorMessage: 'PEM file must exist at the specified path'
  },

  SEARCH_ADS_ORGANIZATION_ID: {
    required: false,
    description: 'Apple Search Ads Organization ID (for API requests)',
    validate: (value) => !value || /^\d+$/.test(value),
    errorMessage: 'Must be a numeric Organization ID'
  },

  SEARCH_ADS_ENVIRONMENT: {
    required: false,
    default: 'sandbox',
    description: 'Apple Search Ads Environment (sandbox or production)',
    validate: (value) => !value || ['sandbox', 'production'].includes(value),
    errorMessage: 'Must be either "sandbox" or "production"'
  },

  // TikTok API
  TIKTOK_APP_KEY: {
    required: false,
    description: 'TikTok API App Key',
    validate: (value) => !value || value.length > 0,
    errorMessage: 'Must not be empty if provided'
  },

  TIKTOK_APP_SECRET: {
    required: false,
    description: 'TikTok API App Secret',
    validate: (value) => !value || value.length > 0,
    errorMessage: 'Must not be empty if provided'
  },

  TIKTOK_REDIRECT_URI: {
    required: false,
    description: 'TikTok OAuth Redirect URI',
    validate: (value) => {
      if (!value) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    errorMessage: 'Must be a valid URL'
  },

  // Instagram Graph API
  INSTAGRAM_APP_ID: {
    required: false,
    description: 'Instagram Graph API App ID',
    validate: (value) => !value || value.length > 0,
    errorMessage: 'Must not be empty if provided'
  },

  INSTAGRAM_APP_SECRET: {
    required: false,
    description: 'Instagram Graph API App Secret',
    validate: (value) => !value || value.length > 0,
    errorMessage: 'Must not be empty if provided'
  },

  INSTAGRAM_REDIRECT_URI: {
    required: false,
    description: 'Instagram OAuth Redirect URI',
    validate: (value) => {
      if (!value) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    errorMessage: 'Must be a valid URL'
  },

  // YouTube Data API v3
  YOUTUBE_API_KEY: {
    required: false,
    description: 'YouTube Data API v3 API Key',
    validate: (value) => !value || value.length > 0,
    errorMessage: 'Must not be empty if provided'
  },

  YOUTUBE_CLIENT_ID: {
    required: false,
    description: 'YouTube OAuth Client ID',
    validate: (value) => !value || value.length > 0,
    errorMessage: 'Must not be empty if provided'
  },

  YOUTUBE_CLIENT_SECRET: {
    required: false,
    description: 'YouTube OAuth Client Secret',
    validate: (value) => !value || value.length > 0,
    errorMessage: 'Must not be empty if provided'
  },

  YOUTUBE_REDIRECT_URI: {
    required: false,
    description: 'YouTube OAuth Redirect URI',
    validate: (value) => {
      if (!value) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    errorMessage: 'Must be a valid URL'
  },

  // Google Analytics API
  GOOGLE_ANALYTICS_VIEW_ID: {
    required: false,
    description: 'Google Analytics View ID (Universal Analytics)',
    validate: (value) => !value || /^\d+$/.test(value),
    errorMessage: 'Must be a numeric View ID'
  },

  GOOGLE_ANALYTICS_PROPERTY_ID: {
    required: false,
    description: 'Google Analytics 4 Property ID',
    validate: (value) => !value || /^\d+$/.test(value),
    errorMessage: 'Must be a numeric Property ID'
  },

  GOOGLE_ANALYTICS_CREDENTIALS: {
    required: false,
    description: 'Google Analytics service account credentials (JSON path or base64)',
    validate: (value) => !value || value.length > 0,
    errorMessage: 'Must not be empty if provided'
  },

  // Fal.ai API (Video Generation)
  FAL_AI_API_KEY: {
    required: false,
    description: 'Fal.ai API Key for video generation',
    validate: (value) => !value || value.length > 0,
    errorMessage: 'Must not be empty if provided'
  },

  // RunPod API (Image Generation)
  RUNPOD_API_KEY: {
    required: false,
    description: 'RunPod API Key for image generation',
    validate: (value) => !value || value.length > 0,
    errorMessage: 'Must not be empty if provided'
  },

  RUNPOD_API_ENDPOINT: {
    required: false,
    description: 'RunPod API Endpoint URL',
    validate: (value) => {
      if (!value) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    errorMessage: 'Must be a valid URL'
  },

  // GLM4.7 AI API (Strategy & Chat)
  GLM47_API_KEY: {
    required: false,
    description: 'GLM4.7 API Key',
    validate: (value) => !value || value.length > 0,
    errorMessage: 'Must not be empty if provided'
  },

  GLM47_API_ENDPOINT: {
    required: false,
    description: 'GLM4.7 API Endpoint URL',
    validate: (value) => {
      if (!value) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    errorMessage: 'Must be a valid URL'
  },

  // Budget Settings
  MONTHLY_BUDGET_LIMIT: {
    required: false,
    default: '1000',
    description: 'Monthly ad spend budget limit in USD',
    validate: (value) => {
      const budget = parseFloat(value);
      return !isNaN(budget) && budget > 0;
    },
    errorMessage: 'Must be a positive number'
  },

  BUDGET_WARNING_THRESHOLD: {
    required: false,
    default: '0.70',
    description: 'Budget warning threshold (0-1)',
    validate: (value) => {
      const threshold = parseFloat(value);
      return !isNaN(threshold) && threshold >= 0 && threshold <= 1;
    },
    errorMessage: 'Must be a number between 0 and 1'
  },

  BUDGET_CRITICAL_THRESHOLD: {
    required: false,
    default: '0.90',
    description: 'Budget critical threshold (0-1)',
    validate: (value) => {
      const threshold = parseFloat(value);
      return !isNaN(threshold) && threshold >= 0 && threshold <= 1;
    },
    errorMessage: 'Must be a number between 0 and 1'
  },

  // Content Generation Settings
  CONTENT_GENERATION_SCHEDULE: {
    required: false,
    default: '0 6 * * *',
    description: 'Cron schedule for content generation',
    validate: (value) => {
      if (!value) return true;
      // Basic cron validation (5 parts separated by spaces)
      // Supports: *, numbers, ranges (1-5), steps (*/4 or 1-5/2)
      const cronRegex = /^(\*|\d+|\d+-\d+|\*\/\d+|\d+-\d+\/\d+)(\s+(\*|\d+|\d+-\d+|\*\/\d+|\d+-\d+\/\d+)){4}$/;
      return cronRegex.test(value);
    },
    errorMessage: 'Must be a valid cron expression'
  },

  POSTING_SCHEDULE: {
    required: false,
    default: '0 */4 * * *',
    description: 'Cron schedule for social media posting',
    validate: (value) => {
      if (!value) return true;
      // Basic cron validation (5 parts separated by spaces)
      // Supports: *, numbers, ranges (1-5), steps (*/4 or 1-5/2)
      const cronRegex = /^(\*|\d+|\d+-\d+|\*\/\d+|\d+-\d+\/\d+)(\s+(\*|\d+|\d+-\d+|\*\/\d+|\d+-\d+\/\d+)){4}$/;
      return cronRegex.test(value);
    },
    errorMessage: 'Must be a valid cron expression'
  },

  MAX_CONTENT_BATCH_SIZE: {
    required: false,
    default: '5',
    description: 'Maximum number of content items to generate in one batch',
    validate: (value) => {
      const size = parseInt(value, 10);
      return !isNaN(size) && size > 0 && size <= 100;
    },
    errorMessage: 'Must be a number between 1 and 100'
  },

  // Content Generation Preferences
  PREFERRED_SPICINESS_MIN: {
    required: false,
    default: '1',
    description: 'Minimum preferred spiciness level for content (1-5)',
    validate: (value) => {
      const level = parseInt(value, 10);
      return !isNaN(level) && level >= 1 && level <= 5;
    },
    errorMessage: 'Must be a number between 1 and 5'
  },

  PREFERRED_SPICINESS_MAX: {
    required: false,
    default: '2',
    description: 'Maximum preferred spiciness level for content (1-5)',
    validate: (value) => {
      const level = parseInt(value, 10);
      return !isNaN(level) && level >= 1 && level <= 5;
    },
    errorMessage: 'Must be a number between 1 and 5'
  },

  CONTENT_STYLE_TONE: {
    required: false,
    default: 'romantic',
    description: 'Preferred content tone',
    validate: (value) => {
      const validTones = ['romantic', 'sexy', 'empowering', 'playful', 'intense', 'balanced'];
      return !value || validTones.includes(value);
    },
    errorMessage: 'Must be one of: romantic, sexy, empowering, playful, intense, balanced'
  },

  CONTENT_STYLE_VOICE: {
    required: false,
    default: 'sex-positive',
    description: 'Brand voice for content',
    validate: (value) => {
      const validVoices = ['sex-positive', 'romantic', 'empowering', 'provocative', 'subtle', 'bold'];
      return !value || validVoices.includes(value);
    },
    errorMessage: 'Must be one of: sex-positive, romantic, empowering, provocative, subtle, bold'
  },

  HASHTAG_STRATEGY_TYPE: {
    required: false,
    default: 'balanced',
    description: 'Hashtag strategy approach',
    validate: (value) => {
      const validStrategies = ['conservative', 'balanced', 'aggressive', 'trending', 'niche'];
      return !value || validStrategies.includes(value);
    },
    errorMessage: 'Must be one of: conservative, balanced, aggressive, trending, niche'
  },

  HASHTAG_COUNT_PREFERENCE: {
    required: false,
    default: 'medium',
    description: 'Preferred number of hashtags per post',
    validate: (value) => {
      const validCounts = ['minimal', 'medium', 'maximum'];
      return !value || validCounts.includes(value);
    },
    errorMessage: 'Must be one of: minimal, medium, maximum'
  },

  INCLUDE_CALL_TO_ACTION: {
    required: false,
    default: 'true',
    description: 'Include call-to-action in generated content',
    validate: (value) => {
      return !value || ['true', 'false'].includes(value.toLowerCase());
    },
    errorMessage: 'Must be either true or false'
  },

  AVOID_EXPLICIT_CONTENT: {
    required: false,
    default: 'false',
    description: 'Avoid overly explicit content in generation',
    validate: (value) => {
      return !value || ['true', 'false'].includes(value.toLowerCase());
    },
    errorMessage: 'Must be either true or false'
  },

  // Storage Settings
  STORAGE_PATH: {
    required: false,
    default: './storage',
    description: 'Path to storage directory for generated content',
    validate: (value) => {
      if (!value) return true;
      const storagePath = path.resolve(value);
      return fs.existsSync(storagePath) || fs.mkdirSync(storagePath, { recursive: true });
    },
    errorMessage: 'Must be a valid directory path'
  },

  MAX_FILE_SIZE_MB: {
    required: false,
    default: '100',
    description: 'Maximum file size for uploads in MB',
    validate: (value) => {
      const size = parseInt(value, 10);
      return !isNaN(size) && size > 0;
    },
    errorMessage: 'Must be a positive number'
  },

  // Feature Flags
  ENABLE_TIKTOK_POSTING: {
    required: false,
    default: 'true',
    description: 'Enable TikTok posting functionality',
    validate: (value) => ['true', 'false', '1', '0'].includes(value.toLowerCase()),
    errorMessage: 'Must be true or false'
  },

  ENABLE_INSTAGRAM_POSTING: {
    required: false,
    default: 'false',
    description: 'Enable Instagram posting functionality',
    validate: (value) => ['true', 'false', '1', '0'].includes(value.toLowerCase()),
    errorMessage: 'Must be true or false'
  },

  ENABLE_YOUTUBE_POSTING: {
    required: false,
    default: 'false',
    description: 'Enable YouTube posting functionality',
    validate: (value) => ['true', 'false', '1', '0'].includes(value.toLowerCase()),
    errorMessage: 'Must be true or false'
  },

  ENABLE_TIKTOK_AUDIO: {
    required: false,
    default: 'true',
    description: 'Enable TikTok trending audio functionality',
    validate: (value) => ['true', 'false', '1', '0'].includes(value.toLowerCase()),
    errorMessage: 'Must be true or false'
  },

  ENABLE_AUDIO_OVERLAY: {
    required: false,
    default: 'true',
    description: 'Enable audio overlay functionality',
    validate: (value) => ['true', 'false', '1', '0'].includes(value.toLowerCase()),
    errorMessage: 'Must be true or false'
  },

  TIKTOK_AUDIO_LIBRARY_PATH: {
    required: false,
    default: './audio-library/tiktok',
    description: 'Path to TikTok audio library',
    validate: (value) => value.length > 0,
    errorMessage: 'Must be a valid path'
  },

  AUDIO_OVERLAY_OUTPUT_DIR: {
    required: false,
    default: './output/audio-overlay',
    description: 'Path for audio overlay output',
    validate: (value) => value.length > 0,
    errorMessage: 'Must be a valid path'
  },

  // Logging
  LOG_LEVEL: {
    required: false,
    default: 'info',
    description: 'Logging level (error, warn, info, debug)',
    validate: (value) => ['error', 'warn', 'info', 'debug'].includes(value),
    errorMessage: 'Must be one of: error, warn, info, debug'
  },

  LOG_FILE_PATH: {
    required: false,
    default: './logs',
    description: 'Path to log files directory',
    validate: (value) => {
      if (!value) return true;
      const logPath = path.resolve(value);
      return fs.existsSync(logPath) || fs.mkdirSync(logPath, { recursive: true });
    },
    errorMessage: 'Must be a valid directory path'
  },

  // Notification Preferences
  ENABLE_BUDGET_ALERTS: {
    required: false,
    default: 'true',
    description: 'Enable budget threshold alerts',
    validate: (value) => ['true', 'false'].includes(value.toLowerCase()),
    errorMessage: 'Must be either true or false'
  },

  ENABLE_CONTENT_APPROVAL_NOTIFICATIONS: {
    required: false,
    default: 'true',
    description: 'Enable notifications when content awaits approval',
    validate: (value) => ['true', 'false'].includes(value.toLowerCase()),
    errorMessage: 'Must be either true or false'
  },

  ENABLE_POST_SUCCESS_NOTIFICATIONS: {
    required: false,
    default: 'true',
    description: 'Enable notifications when posts are published successfully',
    validate: (value) => ['true', 'false'].includes(value.toLowerCase()),
    errorMessage: 'Must be either true or false'
  },

  ENABLE_POST_FAILURE_NOTIFICATIONS: {
    required: false,
    default: 'true',
    description: 'Enable notifications when posts fail to publish',
    validate: (value) => ['true', 'false'].includes(value.toLowerCase()),
    errorMessage: 'Must be either true or false'
  },

  ENABLE_AI_STRATEGY_NOTIFICATIONS: {
    required: false,
    default: 'true',
    description: 'Enable notifications for AI strategy recommendations',
    validate: (value) => ['true', 'false'].includes(value.toLowerCase()),
    errorMessage: 'Must be either true or false'
  },

  ENABLE_DAILY_BRIEFING: {
    required: false,
    default: 'true',
    description: 'Enable daily briefing notifications',
    validate: (value) => ['true', 'false'].includes(value.toLowerCase()),
    errorMessage: 'Must be either true or false'
  },

  ENABLE_WEEKLY_REPORTS: {
    required: false,
    default: 'true',
    description: 'Enable weekly performance reports',
    validate: (value) => ['true', 'false'].includes(value.toLowerCase()),
    errorMessage: 'Must be either true or false'
  },

  NOTIFICATION_METHOD_IN_APP: {
    required: false,
    default: 'true',
    description: 'Show notifications in the app',
    validate: (value) => ['true', 'false'].includes(value.toLowerCase()),
    errorMessage: 'Must be either true or false'
  },

  NOTIFICATION_METHOD_EMAIL: {
    required: false,
    default: 'false',
    description: 'Send notifications via email',
    validate: (value) => ['true', 'false'].includes(value.toLowerCase()),
    errorMessage: 'Must be either true or false'
  },

  NOTIFICATION_EMAIL_ADDRESS: {
    required: false,
    description: 'Email address for notifications',
    validate: (value) => {
      if (!value) return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    errorMessage: 'Must be a valid email address'
  },

  QUIET_HOURS_ENABLED: {
    required: false,
    default: 'false',
    description: 'Enable quiet hours (no non-critical notifications)',
    validate: (value) => ['true', 'false'].includes(value.toLowerCase()),
    errorMessage: 'Must be either true or false'
  },

  QUIET_HOURS_START: {
    required: false,
    default: '22:00',
    description: 'Quiet hours start time (HH:MM format)',
    validate: (value) => {
      if (!value) return true;
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      return timeRegex.test(value);
    },
    errorMessage: 'Must be in HH:MM format (24-hour)'
  },

  QUIET_HOURS_END: {
    required: false,
    default: '08:00',
    description: 'Quiet hours end time (HH:MM format)',
    validate: (value) => {
      if (!value) return true;
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      return timeRegex.test(value);
    },
    errorMessage: 'Must be in HH:MM format (24-hour)'
  },

  QUIET_HOURS_TIMEZONE: {
    required: false,
    default: 'UTC',
    description: 'Timezone for quiet hours',
    validate: (value) => {
      if (!value) return true;
      try {
        Intl.DateTimeFormat().resolvedOptions().timeZone;
        return true;
      } catch {
        return false;
      }
    },
    errorMessage: 'Must be a valid timezone'
  },

  // Platform-Specific Settings
  TIKTOK_MAX_CAPTION_LENGTH: {
    required: false,
    default: '150',
    description: 'Maximum caption length for TikTok posts',
    validate: (value) => {
      const length = parseInt(value, 10);
      return !isNaN(length) && length > 0 && length <= 2200;
    },
    errorMessage: 'Must be a number between 1 and 2200'
  },

  TIKTOK_MAX_HASHTAGS: {
    required: false,
    default: '5',
    description: 'Maximum number of hashtags for TikTok posts',
    validate: (value) => {
      const count = parseInt(value, 10);
      return !isNaN(count) && count >= 0 && count <= 10;
    },
    errorMessage: 'Must be a number between 0 and 10'
  },

  TIKTOK_VIDEO_DURATION_MIN: {
    required: false,
    default: '15',
    description: 'Minimum video duration for TikTok (seconds)',
    validate: (value) => {
      const duration = parseInt(value, 10);
      return !isNaN(duration) && duration >= 3 && duration <= 600;
    },
    errorMessage: 'Must be a number between 3 and 600'
  },

  TIKTOK_VIDEO_DURATION_MAX: {
    required: false,
    default: '60',
    description: 'Maximum video duration for TikTok (seconds)',
    validate: (value) => {
      const duration = parseInt(value, 10);
      return !isNaN(duration) && duration >= 3 && duration <= 600;
    },
    errorMessage: 'Must be a number between 3 and 600'
  },

  INSTAGRAM_MAX_CAPTION_LENGTH: {
    required: false,
    default: '2200',
    description: 'Maximum caption length for Instagram posts',
    validate: (value) => {
      const length = parseInt(value, 10);
      return !isNaN(length) && length > 0 && length <= 2200;
    },
    errorMessage: 'Must be a number between 1 and 2200'
  },

  INSTAGRAM_MAX_HASHTAGS: {
    required: false,
    default: '30',
    description: 'Maximum number of hashtags for Instagram posts',
    validate: (value) => {
      const count = parseInt(value, 10);
      return !isNaN(count) && count >= 0 && count <= 30;
    },
    errorMessage: 'Must be a number between 0 and 30'
  },

  INSTAGRAM_REEL_DURATION_MIN: {
    required: false,
    default: '15',
    description: 'Minimum Reel duration for Instagram (seconds)',
    validate: (value) => {
      const duration = parseInt(value, 10);
      return !isNaN(duration) && duration >= 3 && duration <= 600;
    },
    errorMessage: 'Must be a number between 3 and 600'
  },

  INSTAGRAM_REEL_DURATION_MAX: {
    required: false,
    default: '90',
    description: 'Maximum Reel duration for Instagram (seconds)',
    validate: (value) => {
      const duration = parseInt(value, 10);
      return !isNaN(duration) && duration >= 3 && duration <= 600;
    },
    errorMessage: 'Must be a number between 3 and 600'
  },

  YOUTUBE_MAX_CAPTION_LENGTH: {
    required: false,
    default: '5000',
    description: 'Maximum caption length for YouTube Shorts',
    validate: (value) => {
      const length = parseInt(value, 10);
      return !isNaN(length) && length > 0 && length <= 5000;
    },
    errorMessage: 'Must be a number between 1 and 5000'
  },

  YOUTUBE_MAX_HASHTAGS: {
    required: false,
    default: '15',
    description: 'Maximum number of hashtags for YouTube Shorts',
    validate: (value) => {
      const count = parseInt(value, 10);
      return !isNaN(count) && count >= 0 && count <= 15;
    },
    errorMessage: 'Must be a number between 0 and 15'
  },

  YOUTUBE_SHORTS_DURATION_MIN: {
    required: false,
    default: '15',
    description: 'Minimum duration for YouTube Shorts (seconds)',
    validate: (value) => {
      const duration = parseInt(value, 10);
      return !isNaN(duration) && duration >= 15 && duration <= 600;
    },
    errorMessage: 'Must be a number between 15 and 600'
  },

  YOUTUBE_SHORTS_DURATION_MAX: {
    required: false,
    default: '60',
    description: 'Maximum duration for YouTube Shorts (seconds)',
    validate: (value) => {
      const duration = parseInt(value, 10);
      return !isNaN(duration) && duration >= 15 && duration <= 600;
    },
    errorMessage: 'Must be a number between 15 and 600'
  },

  YOUTUBE_VIDEO_QUALITY: {
    required: false,
    default: '1080p',
    description: 'Video quality for YouTube Shorts (720p, 1080p, 1440p)',
    validate: (value) => ['720p', '1080p', '1440p'].includes(value),
    errorMessage: 'Must be one of: 720p, 1080p, 1440p'
  },

  // Data Retention Settings
  DATA_RETENTION_POSTS_DAYS: {
    required: false,
    default: '365',
    description: 'Number of days to retain posted content (posts) before archival',
    validate: (value) => {
      const days = parseInt(value, 10);
      return !isNaN(days) && days >= 7 && days <= 3650;
    },
    errorMessage: 'Must be a number between 7 and 3650 days'
  },

  DATA_RETENTION_METRICS_DAYS: {
    required: false,
    default: '90',
    description: 'Number of days to retain detailed metrics before aggregation',
    validate: (value) => {
      const days = parseInt(value, 10);
      return !isNaN(days) && days >= 30 && days <= 365;
    },
    errorMessage: 'Must be a number between 30 and 365 days'
  },

  DATA_RETENTION_LOGS_DAYS: {
    required: false,
    default: '30',
    description: 'Number of days to retain log files',
    validate: (value) => {
      const days = parseInt(value, 10);
      return !isNaN(days) && days >= 7 && days <= 180;
    },
    errorMessage: 'Must be a number between 7 and 180 days'
  },

  DATA_RETENTION_TASKS_DAYS: {
    required: false,
    default: '180',
    description: 'Number of days to retain completed tasks before cleanup',
    validate: (value) => {
      const days = parseInt(value, 10);
      return !isNaN(days) && days >= 30 && days <= 730;
    },
    errorMessage: 'Must be a number between 30 and 730 days'
  },

  DATA_RETENTION_CHAT_HISTORY_DAYS: {
    required: false,
    default: '365',
    description: 'Number of days to retain AI chat history',
    validate: (value) => {
      const days = parseInt(value, 10);
      return !isNaN(days) && days >= 30 && days <= 3650;
    },
    errorMessage: 'Must be a number between 30 and 3650 days'
  },

  DATA_RETENSION_FAILED_POSTS_DAYS: {
    required: false,
    default: '30',
    description: 'Number of days to retain failed post attempts',
    validate: (value) => {
      const days = parseInt(value, 10);
      return !isNaN(days) && days >= 7 && days <= 180;
    },
    errorMessage: 'Must be a number between 7 and 180 days'
  },

  DATA_CLEANUP_ENABLED: {
    required: false,
    default: 'true',
    description: 'Enable automatic data cleanup based on retention policies',
    validate: (value) => ['true', 'false'].includes(value),
    errorMessage: 'Must be either true or false'
  },

  DATA_CLEANUP_SCHEDULE: {
    required: false,
    default: '00 02 * * 0',
    description: 'Cron schedule for automatic data cleanup (default: Sunday 2 AM UTC)',
    validate: (value) => {
      // Basic cron validation: 5 parts separated by spaces
      const cronPattern = /^(\*|\d+|\d+-\d+|\d+\/\d+)\s+(\*|\d+|\d+-\d+|\d+\/\d+)\s+(\*|\d+|\d+-\d+|\d+\/\d+)\s+(\*|\d+|\d+-\d+|\d+\/\d+)\s+(\*|\d+|\d+-\d+|\d+\/\d+)$/;
      return cronPattern.test(value);
    },
    errorMessage: 'Must be a valid cron expression (5 parts)'
  },

  DATA_ARCHIVE_ENABLED: {
    required: false,
    default: 'false',
    description: 'Archive old data instead of permanent deletion',
    validate: (value) => ['true', 'false'].includes(value),
    errorMessage: 'Must be either true or false'
  },

  DATA_ARCHIVE_PATH: {
    required: false,
    default: './storage/archive',
    description: 'Path to archive directory for old data',
    validate: (value) => {
      // Basic path validation
      return typeof value === 'string' && value.length > 0 && value.length <= 500;
    },
    errorMessage: 'Must be a valid path (max 500 characters)'
  },

  DATA_ARCHIVE_COMPRESSION: {
    required: false,
    default: 'true',
    description: 'Compress archived data to save disk space',
    validate: (value) => ['true', 'false'].includes(value),
    errorMessage: 'Must be either true or false'
  },

  DATA_RETENTION_DELETE_BLACKLISTED_STORIES: {
    required: false,
    default: 'false',
    description: 'Automatically delete content from blacklisted stories',
    validate: (value) => ['true', 'false'].includes(value),
    errorMessage: 'Must be either true or false'
  },

  DATA_RETENTION_KEEP_PERFORMANT_CONTENT: {
    required: false,
    default: 'true',
    description: 'Never delete content with high performance (top 10%)',
    validate: (value) => ['true', 'false'].includes(value),
    errorMessage: 'Must be either true or false'
  },

  DATA_RETENTION_MIN_STORAGE_GB: {
    required: false,
    default: '10',
    description: 'Minimum free disk space (GB) before cleanup is triggered',
    validate: (value) => {
      const gb = parseInt(value, 10);
      return !isNaN(gb) && gb >= 1 && gb <= 1000;
    },
    errorMessage: 'Must be a number between 1 and 1000 GB'
  },
};

class ConfigService {
  constructor() {
    this.config = {};
    this.errors = [];
    this.warnings = [];
    this.validated = false;
  }

  /**
   * Validate all environment variables
   */
  validate() {
    this.errors = [];
    this.warnings = [];
    this.config = {};

    // Get the project root directory
    const projectRoot = path.resolve(__dirname, '../..');
    const envPath = path.join(projectRoot, '.env');

    // Check if .env file exists
    if (!fs.existsSync(envPath)) {
      this.errors.push({
        key: '.env',
        message: '.env file not found at project root',
        severity: 'critical'
      });
      return { valid: false, errors: this.errors, warnings: this.warnings };
    }

    // Validate each configuration variable
    for (const [key, schema] of Object.entries(configSchema)) {
      const value = process.env[key];

      // Check if required variable is missing
      if (schema.required && !value) {
        this.errors.push({
          key,
          message: `${key} is required: ${schema.description}`,
          severity: 'error',
          description: schema.description
        });
        continue;
      }

      // Use default value if available and variable is missing
      const configValue = value || schema.default;

      // Skip validation if variable is optional and not provided
      if (!value && !schema.required && !schema.default) {
        continue;
      }

      // Validate the value
      if (configValue && schema.validate && !schema.validate(configValue)) {
        this.errors.push({
          key,
          message: `${key}: ${schema.errorMessage}`,
          severity: schema.required ? 'error' : 'warning',
          description: schema.description,
          currentValue: this.sanitizeValue(configValue)
        });
        continue;
      }

      // Store validated value
      this.config[key] = this.parseValue(configValue);

      // Warn if optional variable is not set
      if (!value && !schema.required && schema.description) {
        this.warnings.push({
          key,
          message: `${key} not set (optional): ${schema.description}`,
          description: schema.description
        });
      }
    }

    this.validated = true;

    return {
      valid: this.errors.filter(e => e.severity === 'error' || e.severity === 'critical').length === 0,
      errors: this.errors,
      warnings: this.warnings,
      config: this.config
    };
  }

  /**
   * Parse value to appropriate type
   */
  parseValue(value) {
    if (typeof value !== 'string') return value;

    // Parse numbers
    if (/^\d+$/.test(value)) {
      return parseInt(value, 10);
    }
    if (/^\d+\.\d+$/.test(value)) {
      return parseFloat(value);
    }

    // Parse booleans
    if (value.toLowerCase() === 'true' || value === '1') return true;
    if (value.toLowerCase() === 'false' || value === '0') return false;

    return value;
  }

  /**
   * Sanitize sensitive values for logging
   */
  sanitizeValue(value) {
    if (!value) return value;

    const sensitiveKeys = [
      'SECRET', 'KEY', 'PASSWORD', 'TOKEN', 'PRIVATE_KEY',
      'CREDENTIALS', 'API_KEY'
    ];

    const isSensitive = sensitiveKeys.some(key =>
      this.errors.some(error => error.key?.includes(key))
    );

    if (isSensitive && typeof value === 'string' && value.length > 0) {
      return `${value.substring(0, 4)}****`;
    }

    return value;
  }

  /**
   * Get configuration value
   */
  get(key, defaultValue = null) {
    if (!this.validated) {
      this.validate();
    }

    return this.config[key] !== undefined ? this.config[key] : defaultValue;
  }

  /**
   * Get all configuration
   */
  getAll() {
    if (!this.validated) {
      this.validate();
    }

    return this.config;
  }

  /**
   * Check if all required variables are set
   */
  isConfigured() {
    if (!this.validated) {
      this.validate();
    }

    return this.errors.filter(e => e.severity === 'error' || e.severity === 'critical').length === 0;
  }

  /**
   * Get the configuration schema
   */
  getSchema() {
    return configSchema;
  }

  /**
   * Check if a key exists in the schema
   */
  has(key) {
    return key in configSchema;
  }

  /**
   * Print configuration report to console
   */
  printReport() {
    const validation = this.validate();

    console.log('\n=== Configuration Validation Report ===\n');

    if (validation.valid) {
      console.log('✅ All required configuration variables are valid\n');
    } else {
      console.log('❌ Configuration errors detected\n');
    }

    if (this.errors.length > 0) {
      console.log('Errors:');
      this.errors.forEach(error => {
        const icon = error.severity === 'critical' ? '🔴' : '❌';
        console.log(`  ${icon} ${error.key}: ${error.message}`);
        if (error.description) {
          console.log(`     Description: ${error.description}`);
        }
      });
      console.log('');
    }

    if (this.warnings.length > 0) {
      console.log('Warnings (optional configuration not set):');
      this.warnings.slice(0, 5).forEach(warning => {
        console.log(`  ⚠️  ${warning.message}`);
      });
      if (this.warnings.length > 5) {
        console.log(`  ... and ${this.warnings.length - 5} more warnings`);
      }
      console.log('');
    }

    console.log('Configuration Summary:');
    console.log(`  Total variables checked: ${Object.keys(configSchema).length}`);
    console.log(`  Variables set: ${Object.keys(this.config).length}`);
    console.log(`  Warnings: ${this.warnings.length}`);
    console.log(`  Errors: ${this.errors.length}`);
    console.log('\n========================================\n');
  }
}

// Create and export singleton instance
const configService = new ConfigService();

export default configService;
export { configSchema, ConfigService };
