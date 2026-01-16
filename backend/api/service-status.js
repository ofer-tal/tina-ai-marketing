import express from "express";
import serviceDegradationHandler from "../services/serviceDegradationHandler.js";

const router = express.Router();

/**
 * Service Status API
 *
 * Provides information about external service availability
 * and degradation status for the frontend to display notifications
 */

// GET /api/service-status - Get current service status
router.get("/", (req, res) => {
  try {
    const status = serviceDegradationHandler.getServiceStatuses();

    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/service-status/notification - Get user-facing notification
router.get("/notification", (req, res) => {
  try {
    const notification = serviceDegradationHandler.getUserNotification();

    res.json({
      success: true,
      notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/service-status/level - Get current degradation level
router.get("/level", (req, res) => {
  try {
    const level = serviceDegradationHandler.getDegradationLevel();

    res.json({
      success: true,
      level,
      message: `System is operating in ${level} mode`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
