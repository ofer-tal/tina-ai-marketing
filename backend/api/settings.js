import express from "express";
import configService from "../services/config.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// GET /api/settings - Get all settings (with sensitive values masked)
router.get("/", (req, res) => {
  try {
    const config = configService.getAll();

    // Mask sensitive values
    const sanitizedConfig = {};
    for (const [key, value] of Object.entries(config)) {
      const sensitiveKeys = ['SECRET', 'KEY', 'PASSWORD', 'TOKEN', 'PRIVATE_KEY', 'CREDENTIALS'];
      const isSensitive = sensitiveKeys.some(sensitiveKey => key.includes(sensitiveKey));

      if (isSensitive && value && typeof value === 'string') {
        // Show only last 4 characters
        if (value.length > 4) {
          sanitizedConfig[key] = '*'.repeat(value.length - 4) + value.slice(-4);
        } else {
          sanitizedConfig[key] = '****';
        }
      } else {
        sanitizedConfig[key] = value;
      }
    }

    res.json({
      success: true,
      settings: sanitizedConfig
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/settings/:key - Update a single setting
router.put("/:key", async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined || value === null) {
      return res.status(400).json({
        success: false,
        error: "Value is required"
      });
    }

    // Check if this key exists in our schema
    if (!configService.has(key)) {
      return res.status(400).json({
        success: false,
        error: `Unknown setting: ${key}`
      });
    }

    // Validate the value
    const schema = configService.getSchema();
    const settingSchema = schema[key];

    // Type validation
    if (settingSchema.type === "number" && isNaN(Number(value))) {
      return res.status(400).json({
        success: false,
        error: `Setting ${key} must be a number`
      });
    }

    if (settingSchema.type === "boolean" && typeof value !== "boolean") {
      return res.status(400).json({
        success: false,
        error: `Setting ${key} must be a boolean`
      });
    }

    // Update the .env file
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';

    try {
      envContent = await fs.readFile(envPath, 'utf-8');
    } catch (error) {
      // File doesn't exist, create it
      envContent = '';
    }

    // Convert value to string
    let stringValue = value;
    if (typeof value === "boolean") {
      stringValue = value ? "true" : "false";
    } else if (typeof value === "number") {
      stringValue = value.toString();
    } else {
      stringValue = value.toString();
    }

    // Check if key already exists in .env
    const lines = envContent.split('\n');
    let keyFound = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith(`${key}=`)) {
        lines[i] = `${key}=${stringValue}`;
        keyFound = true;
        break;
      }
    }

    // If key not found, add it
    if (!keyFound) {
      lines.push(`${key}=${stringValue}`);
    }

    // Write back to .env
    await fs.writeFile(envPath, lines.join('\n'), 'utf-8');

    // Update the environment variable in the current process
    process.env[key] = stringValue;

    // Return the masked value
    const sensitiveKeys = ['SECRET', 'KEY', 'PASSWORD', 'TOKEN', 'PRIVATE_KEY', 'CREDENTIALS'];
    const isSensitive = sensitiveKeys.some(sensitiveKey => key.includes(sensitiveKey));

    const responseValue = (isSensitive && stringValue && stringValue.length > 4)
      ? '*'.repeat(stringValue.length - 4) + stringValue.slice(-4)
      : stringValue;

    res.json({
      success: true,
      key,
      value: responseValue,
      message: `Setting ${key} updated successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/settings/schema - Get the settings schema
router.get("/schema", (req, res) => {
  try {
    const schema = configService.getSchema();

    // Group settings by category
    const grouped = {
      server: {},
      database: {},
      appstore: {},
      searchads: {},
      tiktok: {},
      analytics: {},
      ai: {},
      budget: {},
      content: {},
      platform: {},
      storage: {},
      features: {},
      logging: {}
    };

    for (const [key, config] of Object.entries(schema)) {
      if (key.startsWith('MONGODB')) {
        grouped.database[key] = config;
      } else if (key.includes('APP_STORE_CONNECT')) {
        grouped.appstore[key] = config;
      } else if (key.includes('SEARCH_ADS')) {
        grouped.searchads[key] = config;
      } else if (key.includes('TIKTOK') && (key.includes('APP_KEY') || key.includes('APP_SECRET') || key.includes('REDIRECT_URI'))) {
        grouped.tiktok[key] = config;
      } else if (key.includes('TIKTOK') && (key.includes('MAX_') || key.includes('DURATION') || key.includes('QUALITY') || key.includes('AUDIO_LIBRARY'))) {
        grouped.platform[key] = config;
      } else if (key.includes('INSTAGRAM') || key.includes('YOUTUBE')) {
        if (key.includes('MAX_') || key.includes('DURATION') || key.includes('QUALITY')) {
          grouped.platform[key] = config;
        } else if (key.includes('APP_KEY') || key.includes('APP_SECRET') || key.includes('CLIENT_ID') || key.includes('CLIENT_SECRET') || key.includes('REDIRECT_URI') || key.includes('API_KEY')) {
          grouped.server[key] = config;
        } else {
          grouped.platform[key] = config;
        }
      } else if (key.includes('GA') || key.includes('ANALYTICS')) {
        grouped.analytics[key] = config;
      } else if (key.includes('FAL') || key.includes('RUNPOD') || key.includes('GLM')) {
        grouped.ai[key] = config;
      } else if (key.includes('BUDGET')) {
        grouped.budget[key] = config;
      } else if (key.includes('SPICINESS') || key.includes('CONTENT_STYLE') || key.includes('HASHTAG_STRATEGY') || key.includes('HASHTAG_COUNT') || key.includes('INCLUDE_CALL') || key.includes('AVOID_EXPLICIT') || key.includes('CONTENT') || key.includes('POSTING') || key.includes('MAX_CONTENT')) {
        grouped.content[key] = config;
      } else if (key.includes('STORAGE') || key.includes('FILE')) {
        grouped.storage[key] = config;
      } else if (key.includes('ENABLE_') || key.includes('AUDIO_OVERLAY')) {
        grouped.features[key] = config;
      } else if (key.includes('LOG')) {
        grouped.logging[key] = config;
      } else {
        grouped.server[key] = config;
      }
    }

    res.json({
      success: true,
      schema: grouped
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
