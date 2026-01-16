import express from "express";
import dailyBriefingJob from "../jobs/dailyBriefing.js";
import databaseService from "../services/database.js";

const router = express.Router();

/**
 * Daily Briefing API Routes
 *
 * Provides endpoints for:
 * - Starting/stopping the daily briefing scheduler
 * - Manually triggering briefing generation
 * - Getting scheduler status
 * - Retrieving recent briefings
 */

// POST /api/briefing/schedule/start - Start the daily briefing scheduler
router.post("/schedule/start", async (req, res) => {
  try {
    const options = {
      scheduleTime: req.body.scheduleTime,
      timezone: req.body.timezone,
      runImmediately: req.body.runImmediately
    };

    dailyBriefingJob.start(options);

    res.json({
      success: true,
      message: "Daily briefing scheduler started successfully",
      data: {
        jobName: dailyBriefingJob.jobName,
        isScheduled: dailyBriefingJob.isScheduled,
        options
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/briefing/schedule/stop - Stop the daily briefing scheduler
router.post("/schedule/stop", async (req, res) => {
  try {
    dailyBriefingJob.stop();

    res.json({
      success: true,
      message: "Daily briefing scheduler stopped successfully",
      data: {
        jobName: dailyBriefingJob.jobName,
        isScheduled: dailyBriefingJob.isScheduled
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/briefing/schedule/trigger - Manually trigger briefing generation
router.post("/schedule/trigger", async (req, res) => {
  try {
    const result = await dailyBriefingJob.trigger();

    res.json({
      success: true,
      message: "Daily briefing generation triggered successfully",
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/briefing/schedule/status - Get scheduler status
router.get("/schedule/status", async (req, res) => {
  try {
    const status = dailyBriefingJob.getStatus();

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/briefing/recent - Get recent briefings
router.get("/recent", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 7;
    const skip = parseInt(req.query.skip) || 0;

    if (!databaseService.isConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database not connected"
      });
    }

    // Query briefings from marketing_strategy collection
    const Strategy = databaseService.getConnection().model('Strategy', new databaseService.getConnection().Schema({
      type: String,
      title: String,
      content: String,
      reasoning: String,
      dataReferences: [Object],
      status: String,
      createdAt: Date,
      updatedAt: Date
    }, { collection: 'marketing_strategy' }));

    const briefings = await Strategy.find({
      type: 'daily_briefing'
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

    const total = await Strategy.countDocuments({
      type: 'daily_briefing'
    });

    res.json({
      success: true,
      data: {
        briefings,
        pagination: {
          total,
          limit,
          skip,
          hasMore: skip + limit < total
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/briefing/:id - Get a specific briefing
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!databaseService.isConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database not connected"
      });
    }

    const Strategy = databaseService.getConnection().model('Strategy', new databaseService.getConnection().Schema({
      type: String,
      title: String,
      content: String,
      reasoning: String,
      dataReferences: [Object],
      status: String,
      createdAt: Date,
      updatedAt: Date
    }, { collection: 'marketing_strategy' }));

    const briefing = await Strategy.findById(id);

    if (!briefing) {
      return res.status(404).json({
        success: false,
        error: "Briefing not found"
      });
    }

    res.json({
      success: true,
      data: briefing
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/briefing/latest - Get the latest briefing
router.get("/latest", async (req, res) => {
  try {
    if (!databaseService.isConnected()) {
      return res.status(503).json({
        success: false,
        error: "Database not connected"
      });
    }

    const Strategy = databaseService.getConnection().model('Strategy', new databaseService.getConnection().Schema({
      type: String,
      title: String,
      content: String,
      reasoning: String,
      dataReferences: [Object],
      status: String,
      createdAt: Date,
      updatedAt: Date
    }, { collection: 'marketing_strategy' }));

    const briefing = await Strategy.findOne({
      type: 'daily_briefing'
    })
    .sort({ createdAt: -1 })
    .lean();

    if (!briefing) {
      return res.status(404).json({
        success: false,
        error: "No briefings found"
      });
    }

    res.json({
      success: true,
      data: briefing
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
