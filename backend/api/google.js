/**
 * Google API Routes
 *
 * Provides endpoints for Google Sheets integration:
 * - Authorization URL generation
 * - Connection status
 * - Sheet enumeration
 * - Test connection
 */

import express from 'express';
import googleSheetsService from '../services/googleSheetsService.js';
import s3VideoUploader from '../services/s3VideoUploader.js';

const router = express.Router();

/**
 * GET /api/google/authorize-url
 * Get the Google OAuth authorization URL
 */
router.get('/authorize-url', (req, res) => {
  try {
    const url = googleSheetsService.getAuthorizationUrl();

    res.json({
      success: true,
      data: {
        authorizationUrl: url,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/google/connection-status
 * Get the current Google Sheets connection status
 */
router.get('/connection-status', async (req, res) => {
  try {
    const status = await googleSheetsService.getConnectionStatus();

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/google/test-connection
 * Test the Google Sheets API connection
 */
router.get('/test-connection', async (req, res) => {
  try {
    const result = await googleSheetsService.testConnection();

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/google/sheets
 * Get list of all sheets/tabs in the spreadsheet
 */
router.get('/sheets', async (req, res) => {
  try {
    const result = await googleSheetsService.getSheets();

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/google/spreadsheet
 * Get spreadsheet metadata
 */
router.get('/spreadsheet', async (req, res) => {
  try {
    const result = await googleSheetsService.getSpreadsheet();

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/google/read/:sheetName
 * Read data from a sheet
 */
router.get('/read/:sheetName', async (req, res) => {
  try {
    const { sheetName } = req.params;
    const range = req.query.range || 'A1:Z1000';

    const result = await googleSheetsService.readSheet(sheetName, range);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/google/append/:sheetName
 * Append a row to a sheet
 * Body: { values: string[] }
 */
router.post('/append/:sheetName', async (req, res) => {
  try {
    const { sheetName } = req.params;
    const { values } = req.body;

    if (!Array.isArray(values)) {
      return res.status(400).json({
        success: false,
        error: 'values must be an array',
      });
    }

    const result = await googleSheetsService.appendRow(sheetName, values);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/google/health
 * Health check endpoint for both Google Sheets and S3
 */
router.get('/health', (req, res) => {
  res.json({
    googleSheets: googleSheetsService.healthCheck(),
    s3Uploader: s3VideoUploader.healthCheck(),
  });
});

/**
 * GET /api/google/s3-status
 * Get S3 uploader status
 */
router.get('/s3-status', (req, res) => {
  try {
    const status = s3VideoUploader.getStatus();

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/google/test-s3
 * Test S3 connection
 */
router.get('/test-s3', async (req, res) => {
  try {
    const result = await s3VideoUploader.testConnection();

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
