import express from 'express';
import weeklyASOReportService from '../services/weeklyASOReportService.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/reports/aso/weekly
 * Get the latest weekly ASO report
 */
router.get('/aso/weekly', async (req, res) => {
  try {
    const report = await weeklyASOReportService.getLatestReport();

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'No weekly reports found'
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Error fetching latest weekly ASO report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weekly report',
      error: error.message
    });
  }
});

/**
 * GET /api/reports/aso/weekly/:year/:week
 * Get a specific weekly ASO report by year and week number
 */
router.get('/aso/weekly/:year/:week', async (req, res) => {
  try {
    const { year, week } = req.params;

    const report = await weeklyASOReportService.getWeeklyReport(parseInt(year), parseInt(week));

    if (!report) {
      return res.status(404).json({
        success: false,
        message: `No report found for week ${week} of ${year}`
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Error fetching weekly ASO report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weekly report',
      error: error.message
    });
  }
});

/**
 * GET /api/reports/aso/weekly/range
 * Get weekly ASO reports for a date range
 */
router.get('/aso/weekly/range', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate query parameters are required'
      });
    }

    const reports = await weeklyASOReportService.getReportsInRange(
      new Date(startDate),
      new Date(endDate)
    );

    res.json({
      success: true,
      data: reports,
      count: reports.length
    });
  } catch (error) {
    logger.error('Error fetching weekly reports in range:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weekly reports',
      error: error.message
    });
  }
});

/**
 * POST /api/reports/aso/weekly/generate
 * Generate a new weekly ASO report
 */
router.post('/aso/weekly/generate', async (req, res) => {
  try {
    const { weekStart } = req.body;

    const report = await weeklyASOReportService.generateWeeklyReport(
      weekStart ? new Date(weekStart) : null
    );

    res.json({
      success: true,
      message: 'Weekly ASO report generated successfully',
      data: report
    });
  } catch (error) {
    logger.error('Error generating weekly ASO report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate weekly report',
      error: error.message
    });
  }
});

/**
 * POST /api/reports/aso/weekly/:reportId/send
 * Mark a weekly report as sent via chat
 */
router.post('/aso/weekly/:reportId/send', async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await weeklyASOReportService.markAsSent(reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      message: 'Report marked as sent',
      data: report
    });
  } catch (error) {
    logger.error('Error marking report as sent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark report as sent',
      error: error.message
    });
  }
});

/**
 * GET /api/reports/aso/weekly/summary
 * Get a text summary of the latest report for chat notifications
 */
router.get('/aso/weekly/summary', async (req, res) => {
  try {
    const report = await weeklyASOReportService.getLatestReport();

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'No weekly reports found'
      });
    }

    const summary = weeklyASOReportService.getReportSummary(report);

    res.json({
      success: true,
      data: {
        report,
        summary
      }
    });
  } catch (error) {
    logger.error('Error fetching weekly report summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report summary',
      error: error.message
    });
  }
});

/**
 * GET /api/reports/aso/weekly/list
 * List all weekly reports (paginated)
 */
router.get('/aso/weekly/list', async (req, res) => {
  try {
    const { limit = 10, skip = 0 } = req.query;

    const WeeklyASOReport = (await import('../models/WeeklyASOReport.js')).default;

    const reports = await WeeklyASOReport.find()
      .sort({ weekStart: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('weekStart weekEnd year weekNumber overallScore keywordRankings generatedAt sentViaChat');

    const total = await WeeklyASOReport.countDocuments();

    res.json({
      success: true,
      data: reports,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: (parseInt(skip) + parseInt(limit)) < total
      }
    });
  } catch (error) {
    logger.error('Error listing weekly reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list reports',
      error: error.message
    });
  }
});

export default router;
