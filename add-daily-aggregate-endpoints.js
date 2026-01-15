// Add these lines to backend/api/revenue.js

// 1. Add this import at the top with other imports:
import DailyRevenueAggregate from '../models/DailyRevenueAggregate.js';

// 2. Add these endpoints before the "export default router;" line:

/**
 * POST /api/revenue/daily/aggregate
 * Manually trigger daily aggregation for a specific date
 * Body params:
 * - date: Date string in YYYY-MM-DD format (optional, defaults to yesterday)
 */
router.post('/daily/aggregate', async (req, res) => {
  try {
    const { date } = req.body;

    // Default to yesterday if no date provided
    const targetDate = date
      ? new Date(date)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);

    console.log('Aggregating revenue for date:', targetDate);

    const aggregate = await DailyRevenueAggregate.aggregateForDate(targetDate);

    if (!aggregate) {
      return res.json({
        success: true,
        message: 'No transactions found for this date',
        data: null
      });
    }

    res.json({
      success: true,
      message: 'Daily aggregation completed successfully',
      data: aggregate
    });
  } catch (error) {
    console.error('Error aggregating daily revenue:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/revenue/daily/aggregates
 * Get daily aggregates for a date range
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
router.get('/daily/aggregates', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const aggregates = await DailyRevenueAggregate.getForDateRange(start, end);

    res.json({
      success: true,
      data: aggregates
    });
  } catch (error) {
    console.error('Error fetching daily aggregates:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

/**
 * GET /api/revenue/daily/aggregate/:date
 * Get daily aggregate for a specific date
 * Path params:
 * - date: Date string in YYYY-MM-DD format
 */
router.get('/daily/aggregate/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const targetDate = new Date(date);

    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    const aggregate = await DailyRevenueAggregate.getForDate(targetDate);

    if (!aggregate) {
      return res.status(404).json({
        success: false,
        error: 'No aggregate found for this date'
      });
    }

    res.json({
      success: true,
      data: aggregate
    });
  } catch (error) {
    console.error('Error fetching daily aggregate:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/revenue/daily/:date/transactions
 * Get individual transactions for a specific day (drill-down)
 * Path params:
 * - date: Date string in YYYY-MM-DD format
 */
router.get('/daily/:date/transactions', async (req, res) => {
  try {
    const { date } = req.params;
    const targetDate = new Date(date);

    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    const transactions = await DailyRevenueAggregate.getTransactionsForDate(targetDate);

    res.json({
      success: true,
      data: transactions,
      count: transactions.length
    });
  } catch (error) {
    console.error('Error fetching daily transactions:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

/**
 * GET /api/revenue/daily/aggregates/channels
 * Get daily aggregates with channel breakdown
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
router.get('/daily/aggregates/channels', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const aggregates = await DailyRevenueAggregate.getDailyWithChannelBreakdown(start, end);

    res.json({
      success: true,
      data: aggregates
    });
  } catch (error) {
    console.error('Error fetching daily aggregates with channel breakdown:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});
