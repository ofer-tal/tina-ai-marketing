import express from 'express';
import revenueAttributionService from '../services/revenueAttributionService.js';
import MarketingRevenue from '../models/MarketingRevenue.js';
import DailyRevenueAggregate from '../models/DailyRevenueAggregate.js';
import WeeklyRevenueAggregate from '../models/WeeklyRevenueAggregate.js';
import MonthlyRevenueAggregate from '../models/MonthlyRevenueAggregate.js';

const router = express.Router();

/**
 * GET /api/revenue/attribution
 * Get attributed revenue data
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 * - channel: optional channel filter
 * - campaignId: optional campaign filter
 */
router.get('/attribution', async (req, res) => {
  try {
    const { startDate, endDate, channel, campaignId } = req.query;

    // Default to last 30 days if not provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const filters = {};
    if (channel) filters.channel = channel;
    if (campaignId) filters.campaignId = campaignId;

    const data = await revenueAttributionService.getAttributedRevenue(start, end, filters);

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error fetching attributed revenue:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: revenueAttributionService.getMockAttributedRevenue(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        new Date()
      )
    });
  }
});

/**
 * GET /api/revenue/attribution/campaigns
 * Get revenue attributed to each campaign
 */
router.get('/attribution/campaigns', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const revenueByCampaign = await MarketingRevenue.getRevenueByCampaign(start, end);

    res.json({
      success: true,
      data: revenueByCampaign
    });
  } catch (error) {
    console.error('Error fetching revenue by campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: revenueAttributionService.getMockAttributedRevenue().byCampaign
    });
  }
});

/**
 * GET /api/revenue/attribution/channels
 * Get revenue attributed to each channel
 */
router.get('/attribution/channels', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const revenueByChannel = await MarketingRevenue.getRevenueByChannel(start, end);

    res.json({
      success: true,
      data: revenueByChannel
    });
  } catch (error) {
    console.error('Error fetching revenue by channel:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: revenueAttributionService.getMockAttributedRevenue().byChannel
    });
  }
});

/**
 * GET /api/revenue/attribution/daily
 * Get daily revenue trend
 */
router.get('/attribution/daily', async (req, res) => {
  try {
    const { startDate, endDate, channel } = req.query;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const dailyRevenue = await MarketingRevenue.getDailyRevenue(start, end, channel);

    res.json({
      success: true,
      data: dailyRevenue
    });
  } catch (error) {
    console.error('Error fetching daily revenue:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: revenueAttributionService.getMockAttributedRevenue().dailyTrend
    });
  }
});

/**
 * GET /api/revenue/attribution/campaign/:campaignId/roi
 * Get ROI for a specific campaign
 */
router.get('/attribution/campaign/:campaignId/roi', async (req, res) => {
  try {
    const { campaignId } = req.params;

    const roiData = await revenueAttributionService.getCampaignROI(campaignId);

    res.json({
      success: true,
      data: roiData
    });
  } catch (error) {
    console.error('Error fetching campaign ROI:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: {
        campaignId: req.params.campaignId,
        attributedRevenue: 0,
        conversions: 0,
        spend: 0,
        roi: 0,
        roas: 0
      }
    });
  }
});

/**
 * POST /api/revenue/attribution/run
 * Run the attribution pipeline manually
 */
router.post('/attribution/run', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const result = await revenueAttributionService.runAttributionPipeline(start, end);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error running attribution pipeline:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/revenue/summary
 * Get revenue summary statistics
 */
router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const totalRevenue = await MarketingRevenue.getTotalRevenue(start, end);

    res.json({
      success: true,
      data: totalRevenue
    });
  } catch (error) {
    console.error('Error fetching revenue summary:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: { grossRevenue: 0, appleFees: 0, netRevenue: 0, transactionCount: 0 }
    });
  }
});

/**
 * GET /api/revenue/monthly/:year/:month
 * Get net revenue for a specific month
 */
router.get('/monthly/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        error: 'Invalid year or month. Month must be between 1 and 12.'
      });
    }

    const monthlyRevenue = await MarketingRevenue.getMonthlyNetRevenue(yearNum, monthNum);

    res.json({
      success: true,
      data: monthlyRevenue[0] || {
        year: yearNum,
        month: monthNum,
        grossRevenue: 0,
        appleFees: 0,
        netRevenue: 0,
        transactionCount: 0,
        newCustomerCount: 0,
        returningCustomerCount: 0,
        subscriptionRevenue: 0,
        oneTimePurchaseRevenue: 0,
        averageRevenuePerTransaction: 0
      }
    });
  } catch (error) {
    console.error('Error fetching monthly net revenue:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: {
        year: parseInt(req.params.year),
        month: parseInt(req.params.month),
        grossRevenue: 0,
        appleFees: 0,
        netRevenue: 0,
        transactionCount: 0
      }
    });
  }
});

/**
 * GET /api/revenue/monthly/history
 * Get monthly net revenue history
 */
router.get('/monthly/history', async (req, res) => {
  try {
    const { months } = req.query;
    const monthsCount = months ? parseInt(months) : 12;

    const monthlyHistory = await MarketingRevenue.getMonthlyNetRevenueHistory(monthsCount);

    res.json({
      success: true,
      data: monthlyHistory
    });
  } catch (error) {
    console.error('Error fetching monthly revenue history:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

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

// ============================================================
// WEEKLY REVENUE AGGREGATION ENDPOINTS
// ============================================================

/**
 * POST /api/revenue/weekly/aggregate
 * Manually trigger weekly aggregation for a specific week
 * Body params:
 * - year: Year (optional, defaults to current year)
 * - weekNumber: Week number 1-53 (optional, defaults to current week)
 */
router.post('/weekly/aggregate', async (req, res) => {
  try {
    const { year, weekNumber } = req.body;

    // Default to current week if not provided
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetWeekNumber = weekNumber || getISOWeek(now).weekNumber;

    console.log(`Aggregating revenue for week ${targetWeekNumber} of ${targetYear}`);

    const aggregate = await WeeklyRevenueAggregate.aggregateForWeek(targetYear, targetWeekNumber);

    if (!aggregate) {
      return res.json({
        success: true,
        message: 'No transactions found for this week',
        data: null
      });
    }

    res.json({
      success: true,
      message: 'Weekly aggregation completed successfully',
      data: aggregate
    });
  } catch (error) {
    console.error('Error aggregating weekly revenue:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/revenue/weekly/aggregates
 * Get weekly aggregates for a date range
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
router.get('/weekly/aggregates', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000); // Default to 12 weeks

    const aggregates = await WeeklyRevenueAggregate.getForDateRange(start, end);

    res.json({
      success: true,
      data: aggregates
    });
  } catch (error) {
    console.error('Error fetching weekly aggregates:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

/**
 * GET /api/revenue/weekly/aggregate/:year/:weekNumber
 * Get weekly aggregate for a specific week
 * Path params:
 * - year: Year
 * - weekNumber: Week number (1-53)
 */
router.get('/weekly/aggregate/:year/:weekNumber', async (req, res) => {
  try {
    const { year, weekNumber } = req.params;

    const aggregate = await WeeklyRevenueAggregate.findOne({
      year: parseInt(year),
      weekNumber: parseInt(weekNumber)
    });

    if (!aggregate) {
      return res.status(404).json({
        success: false,
        error: 'No aggregate found for this week'
      });
    }

    res.json({
      success: true,
      data: aggregate
    });
  } catch (error) {
    console.error('Error fetching weekly aggregate:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/revenue/weekly/:year/:weekNumber/transactions
 * Get all transactions for a specific week (drill-down)
 * Path params:
 * - year: Year
 * - weekNumber: Week number (1-53)
 */
router.get('/weekly/:year/:weekNumber/transactions', async (req, res) => {
  try {
    const { year, weekNumber } = req.params;

    const weeklyAggregate = await WeeklyRevenueAggregate.findOne({
      year: parseInt(year),
      weekNumber: parseInt(weekNumber)
    });

    if (!weeklyAggregate) {
      return res.status(404).json({
        success: false,
        error: 'No aggregate found for this week'
      });
    }

    // Fetch transactions for this week
    const transactions = await MarketingRevenue.find({
      transactionDate: {
        $gte: weeklyAggregate.weekStart,
        $lte: weeklyAggregate.weekEnd
      }
    }).sort({ transactionDate: -1 });

    res.json({
      success: true,
      data: {
        weeklyAggregate,
        transactions,
        count: transactions.length
      }
    });
  } catch (error) {
    console.error('Error fetching weekly transactions:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: { transactions: [], count: 0 }
    });
  }
});

/**
 * Helper function to get ISO week number
 */
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), weekNumber: weekNo };
}

// ============================================================
// MONTHLY REVENUE AGGREGATION ENDPOINTS
// ============================================================

/**
 * POST /api/revenue/monthly/aggregate
 * Manually trigger monthly aggregation for a specific month
 * Body params:
 * - year: Year (optional, defaults to current year)
 * - month: Month number 1-12 (optional, defaults to current month)
 */
router.post('/monthly/aggregate', async (req, res) => {
  try {
    const { year, month } = req.body;

    // Default to current month if not provided
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month || now.getMonth() + 1;

    if (targetMonth < 1 || targetMonth > 12) {
      return res.status(400).json({
        success: false,
        error: 'Invalid month. Month must be between 1 and 12.'
      });
    }

    console.log(`Aggregating revenue for month ${targetMonth} of ${targetYear}`);

    const aggregate = await MonthlyRevenueAggregate.aggregateForMonth(targetYear, targetMonth);

    if (!aggregate) {
      return res.json({
        success: true,
        message: 'No transactions found for this month',
        data: null
      });
    }

    res.json({
      success: true,
      message: 'Monthly aggregation completed successfully',
      data: aggregate
    });
  } catch (error) {
    console.error('Error aggregating monthly revenue:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/revenue/monthly/aggregates
 * Get monthly aggregates for a date range
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
router.get('/monthly/aggregates', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000); // Default to ~12 months

    const aggregates = await MonthlyRevenueAggregate.getForDateRange(start, end);

    res.json({
      success: true,
      data: aggregates
    });
  } catch (error) {
    console.error('Error fetching monthly aggregates:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

/**
 * GET /api/revenue/monthly/aggregate/:year/:month
 * Get monthly aggregate for a specific month
 * Path params:
 * - year: Year
 * - month: Month number (1-12)
 */
router.get('/monthly/aggregate/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;

    const aggregate = await MonthlyRevenueAggregate.findOne({
      year: parseInt(year),
      month: parseInt(month)
    });

    if (!aggregate) {
      return res.status(404).json({
        success: false,
        error: 'No aggregate found for this month'
      });
    }

    res.json({
      success: true,
      data: aggregate
    });
  } catch (error) {
    console.error('Error fetching monthly aggregate:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/revenue/monthly/:year/:month/transactions
 * Get all transactions for a specific month (drill-down)
 * Path params:
 * - year: Year
 * - month: Month number (1-12)
 */
router.get('/monthly/:year/:month/transactions', async (req, res) => {
  try {
    const { year, month } = req.params;

    const monthlyAggregate = await MonthlyRevenueAggregate.findOne({
      year: parseInt(year),
      month: parseInt(month)
    });

    if (!monthlyAggregate) {
      return res.status(404).json({
        success: false,
        error: 'No aggregate found for this month'
      });
    }

    // Fetch transactions for this month
    const transactions = await MarketingRevenue.find({
      transactionDate: {
        $gte: monthlyAggregate.monthStart,
        $lte: monthlyAggregate.monthEnd
      }
    }).sort({ transactionDate: -1 });

    res.json({
      success: true,
      data: {
        monthlyAggregate,
        transactions,
        count: transactions.length
      }
    });
  } catch (error) {
    console.error('Error fetching monthly transactions:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: { transactions: [], count: 0 }
    });
  }
});

/**
 * GET /api/revenue/monthly/aggregates/recent
 * Get recent monthly aggregates
 * Query params:
 * - months: Number of months to retrieve (default: 12)
 */
router.get('/monthly/aggregates/recent', async (req, res) => {
  try {
    const { months } = req.query;
    const monthsCount = months ? parseInt(months) : 12;

    const aggregates = await MonthlyRevenueAggregate.getRecentMonths(monthsCount);

    res.json({
      success: true,
      data: aggregates
    });
  } catch (error) {
    console.error('Error fetching recent monthly aggregates:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

export default router;
