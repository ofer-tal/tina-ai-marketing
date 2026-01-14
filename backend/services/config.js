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

// Load environment variables from .env file
dotenv.config();

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

  // Apple Search Ads API
  APPLE_SEARCH_ADS_CLIENT_ID: {
    required: false,
    description: 'Apple Search Ads OAuth Client ID',
    validate: (value) => !value || value.length > 0,
    errorMessage: 'Must not be empty if provided'
  },

  APPLE_SEARCH_ADS_CLIENT_SECRET: {
    required: false,
    description: 'Apple Search Ads OAuth Client Secret',
    validate: (value) => !value || value.length > 0,
    errorMessage: 'Must not be empty if provided'
  },

  APPLE_SEARCH_ADS_ORGANIZATION_ID: {
    required: false,
    description: 'Apple Search Ads Organization ID',
    validate: (value) => !value || value.length > 0,
    errorMessage: 'Must not be empty if provided'
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

  // Google Analytics API
  GOOGLE_ANALYTICS_VIEW_ID: {
    required: false,
    description: 'Google Analytics View ID',
    validate: (value) => !value || /^\d+$/.test(value),
    errorMessage: 'Must be a numeric View ID'
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
