/**
 * Anomaly Detection API Routes
 *
 * Provides endpoints for detecting and monitoring anomalies in performance metrics.
 */

import express from "express";
import anomalyDetectionService from "../services/anomalyDetectionService.js";

const router = express.Router();

/**
 * GET /api/anomaly-detection/baseline
 * Calculate baseline metrics for a specific metric
 */
router.get("/baseline", async (req, res) => {
  try {
    const { metric = 'revenue', period = 30, aggregation = 'daily' } = req.query;

    const baseline = await anomalyDetectionService.calculateBaselineMetrics(
      metric,
      parseInt(period),
      aggregation
    );

    res.json({
      success: true,
      data: baseline
    });

  } catch (error) {
    console.error("Error calculating baseline:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/anomaly-detection/monitor
 * Monitor current metrics against baseline
 */
router.get("/monitor", async (req, res) => {
  try {
    const { metrics, period = 30 } = req.query;

    const metricsArray = metrics ? metrics.split(',') : ['revenue', 'views', 'engagement_rate'];

    const monitoring = await anomalyDetectionService.monitorMetrics(
      metricsArray,
      parseInt(period)
    );

    res.json({
      success: true,
      data: monitoring
    });

  } catch (error) {
    console.error("Error monitoring metrics:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/anomaly-detection/detect
 * Detect anomalies using specified method
 */
router.post("/detect", async (req, res) => {
  try {
    const { metric, period = 30, method = 'zscore', threshold = 2 } = req.body;

    if (!metric) {
      return res.status(400).json({
        success: false,
        error: "Metric is required"
      });
    }

    const anomalies = await anomalyDetectionService.detectAnomalies(
      metric,
      parseInt(period),
      method,
      parseFloat(threshold)
    );

    res.json({
      success: true,
      data: anomalies
    });

  } catch (error) {
    console.error("Error detecting anomalies:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/anomaly-detection/detect
 * Detect anomalies (GET method for convenience)
 */
router.get("/detect", async (req, res) => {
  try {
    const { metric, period = 30, method = 'zscore', threshold = 2 } = req.query;

    if (!metric) {
      return res.status(400).json({
        success: false,
        error: "Metric is required"
      });
    }

    const anomalies = await anomalyDetectionService.detectAnomalies(
      metric,
      parseInt(period),
      method,
      parseFloat(threshold)
    );

    res.json({
      success: true,
      data: anomalies
    });

  } catch (error) {
    console.error("Error detecting anomalies:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/anomaly-detection/alerts
 * Generate alerts from anomaly results
 */
router.post("/alerts", async (req, res) => {
  try {
    const { anomalyResults, alertThreshold = 'medium' } = req.body;

    if (!anomalyResults || !Array.isArray(anomalyResults)) {
      return res.status(400).json({
        success: false,
        error: "anomalyResults array is required"
      });
    }

    const alerts = await anomalyDetectionService.generateAlerts(
      anomalyResults,
      alertThreshold
    );

    res.json({
      success: true,
      data: alerts
    });

  } catch (error) {
    console.error("Error generating alerts:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/anomaly-detection/context/:metric
 * Get context for anomaly investigation
 */
router.get("/context/:metric", async (req, res) => {
  try {
    const { metric } = req.params;
    const { timestamp, period = 7 } = req.query;

    if (!timestamp) {
      return res.status(400).json({
        success: false,
        error: "timestamp is required"
      });
    }

    const anomalyTimestamp = new Date(timestamp);

    if (isNaN(anomalyTimestamp.getTime())) {
      return res.status(400).json({
        success: false,
        error: "Invalid timestamp format"
      });
    }

    const context = await anomalyDetectionService.getAnomalyContext(
      metric,
      anomalyTimestamp,
      parseInt(period)
    );

    res.json({
      success: true,
      data: context
    });

  } catch (error) {
    console.error("Error getting anomaly context:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/anomaly-detection/report
 * Get comprehensive anomaly report
 */
router.get("/report", async (req, res) => {
  try {
    const { metrics, period = 30 } = req.query;

    const metricsArray = metrics ? metrics.split(',') : ['revenue', 'views', 'engagement_rate'];

    const report = await anomalyDetectionService.getAnomalyReport(
      metricsArray,
      parseInt(period)
    );

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error("Error generating anomaly report:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/anomaly-detection/summary
 * Get quick summary of anomalies
 */
router.get("/summary", async (req, res) => {
  try {
    const { period = 30 } = req.query;

    const report = await anomalyDetectionService.getAnomalyReport(
      ['revenue', 'views', 'engagement_rate'],
      parseInt(period)
    );

    const summary = {
      period: report.period,
      totalAnomalies: report.summary.totalAnomalies,
      criticalCount: report.summary.criticalCount,
      highCount: report.summary.highCount,
      mediumCount: report.summary.mediumCount,
      lowCount: report.summary.lowCount || 0,
      metricsAnalyzed: report.metrics.length,
      unacknowledgedCritical: report.alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length,
      generatedAt: report.generatedAt
    };

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error("Error getting anomaly summary:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/anomaly-detection/metrics
 * Get list of available metrics
 */
router.get("/metrics", async (req, res) => {
  try {
    const metrics = [
      { name: 'revenue', displayName: 'Revenue', description: 'Total revenue' },
      { name: 'views', displayName: 'Views', description: 'Content views' },
      { name: 'engagement_rate', displayName: 'Engagement Rate', description: 'Engagement percentage' },
      { name: 'conversions', displayName: 'Conversions', description: 'Number of conversions' },
      { name: 'ctr', displayName: 'Click-Through Rate', description: 'CTR percentage' },
      { name: 'spend', displayName: 'Ad Spend', description: 'Advertising spend' }
    ];

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error("Error getting metrics:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/anomaly-detection/methods
 * Get list of detection methods
 */
router.get("/methods", async (req, res) => {
  try {
    const methods = [
      { name: 'zscore', displayName: 'Z-Score', description: 'Standard deviation-based detection' },
      { name: 'iqr', displayName: 'IQR (Interquartile Range)', description: 'Percentile-based detection' },
      { name: 'isolation', displayName: 'Modified Z-Score', description: 'Median Absolute Deviation' },
      { name: 'movingaverage', displayName: 'Moving Average', description: 'Rolling window comparison' }
    ];

    res.json({
      success: true,
      data: methods
    });

  } catch (error) {
    console.error("Error getting methods:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/anomaly-detection/cache/clear
 * Clear the cache
 */
router.post("/cache/clear", async (req, res) => {
  try {
    anomalyDetectionService.clearCache();

    res.json({
      success: true,
      message: "Cache cleared successfully"
    });

  } catch (error) {
    console.error("Error clearing cache:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
