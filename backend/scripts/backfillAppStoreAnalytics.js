#!/usr/bin/env node

/**
 * App Store Connect Analytics Back-fill Script
 *
 * Back-fills retention and analytics metrics from App Store Connect:
 * - Retention metrics (Day 1, 7, 30)
 * - Daily active devices
 * - Installs, sessions, crashes
 *
 * Note: ASC Analytics reports may take 24+ hours to become available
 * after creating a report request. This script will:
 * 1. Create an analytics report request if one doesn't exist
 * 2. Fetch available report instances
 * 3. Store metrics to RetentionMetrics collection
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../..');
const envPath = path.join(projectRoot, '.env');

// Load dotenv BEFORE importing other modules
import dotenv from 'dotenv';
dotenv.config({ path: envPath });

import mongoose from 'mongoose';
import winston from 'winston';

// Dynamic import after dotenv is loaded
const { default: appStoreConnectService } = await import('../services/appStoreConnectService.js');
const { default: RetentionMetrics } = await import('../models/RetentionMetrics.js');

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'asc-analytics-backfill' },
  transports: [
    new winston.transports.File({ filename: 'logs/asc-analytics-backfill.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

/**
 * Connect to MongoDB
 */
async function connectToDatabase() {
  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

/**
 * Ensure analytics report request exists
 */
async function ensureReportRequest(appId) {
  try {
    logger.info('Checking for existing analytics report requests...');

    const requests = await appStoreConnectService.getAnalyticsReportRequests(appId);

    if (requests.length === 0) {
      logger.info('No existing report requests, creating one...');
      const result = await appStoreConnectService.createAnalyticsReportRequest(appId, 'ONGOING');
      logger.info('Report request created', { reportRequestId: result.reportRequestId });
      logger.warn('Note: New analytics reports may take up to 24 hours to become available.');
      return null;
    }

    const ongoingRequest = requests.find(r => r.accessType === 'ONGOING') || requests[0];
    logger.info('Found existing report request', { requestId: ongoingRequest.id });
    return ongoingRequest.id;

  } catch (error) {
    logger.error('Failed to ensure report request:', error);
    return null;
  }
}

/**
 * Back-fill retention metrics from ASC Analytics
 */
async function backfillRetentionMetrics(appId, startDate, endDate) {
  logger.info(`Back-filling retention metrics from ${startDate} to ${endDate}`);

  try {
    // Ensure report request exists
    const reportRequestId = await ensureReportRequest(appId);

    if (!reportRequestId) {
      logger.warn('No report request available. Please wait 24 hours after creating a request.');
      return { success: false, message: 'No report request available' };
    }

    // Fetch analytics metrics
    logger.info('Fetching analytics metrics from ASC...');
    const analyticsData = await appStoreConnectService.fetchAppAnalyticsMetrics(
      appId,
      startDate,
      endDate
    );

    if (!analyticsData.success || !analyticsData.dailyMetrics || analyticsData.dailyMetrics.length === 0) {
      logger.warn('No analytics data available');
      logger.info('This is normal if the report request was just created.');
      logger.info('Please wait 24 hours for Apple to generate the reports.');
      return { success: false, message: 'No data available yet' };
    }

    logger.info(`Retrieved ${analyticsData.dailyMetrics.length} days of analytics data`);

    // Store daily metrics to RetentionMetrics collection
    let storedCount = 0;
    let errorCount = 0;

    for (const dailyMetric of analyticsData.dailyMetrics) {
      try {
        const cohortDate = dailyMetric.date;
        const cohortDateObj = new Date(cohortDate);

        // Calculate basic retention from this day's data
        const day1Retention = dailyMetric.installs > 0
          ? Math.min(100, (dailyMetric.activeDevices / dailyMetric.installs) * 100)
          : 0;

        await RetentionMetrics.findOneAndUpdate(
          { cohortDate },
          {
            cohortDate,
            cohortDateObj,
            cohortSize: dailyMetric.installs || 0,
            retention: {
              day1: parseFloat(day1Retention.toFixed(2)),
              day7: 0,
              day30: 0,
              rollingDay7: 0,
              rollingDay30: 0
            },
            sessions: {
              avgDuration: 180, // Default as not provided by ASC
              medianDuration: 150,
              avgSessionsPerUser: 1.5,
              totalSessions: dailyMetric.sessions || 0
            },
            activeUsers: {
              dau: dailyMetric.activeDevices || 0,
              wau: Math.round((dailyMetric.activeDevices || 0) * 2.5),
              mau: Math.round((dailyMetric.activeDevicesPast30Days || dailyMetric.activeDevices * 5) || 0),
              stickinessRatio: 0
            },
            lifecycle: {
              avgTimeToFirstPurchase: 86400, // 1 day
              avgTimeToSubscription: 43200, // 12 hours
              freeToPaidConversionRate: 5, // 5% default
              trialToPaidConversionRate: 25 // 25% default
            },
            dataSource: analyticsData.source === 'mock' ? 'mock' : 'app_store_connect',
            dataQuality: {
              lastSyncAt: new Date(),
              completeness: analyticsData.source === 'mock' ? 0 : 85,
              isEstimated: true
            }
          },
          { upsert: true, new: true }
        );

        storedCount++;
        logger.info(`Stored metrics for ${cohortDate}: ${dailyMetric.installs} installs, ${dailyMetric.activeDevices} active devices`);

      } catch (error) {
        logger.error(`Error storing data for ${dailyMetric.date}:`, error.message);
        errorCount++;
      }
    }

    // Calculate aggregate retention metrics
    logger.info('Calculating aggregate retention metrics...');
    const retentionData = await appStoreConnectService.calculateRetentionFromAnalytics(appId);

    if (retentionData && retentionData.retention) {
      logger.info('Aggregate Retention:', {
        day1: retentionData.retention.day1 + '%',
        day7: retentionData.retention.day7 + '%',
        day30: retentionData.retention.day30 + '%'
      });

      // Store the aggregate retention for the most recent day
      const mostRecentDay = analyticsData.dailyMetrics[analyticsData.dailyMetrics.length - 1]?.date;
      if (mostRecentDay) {
        await RetentionMetrics.findOneAndUpdate(
          { cohortDate: mostRecentDay },
          {
            $set: {
              retention: retentionData.retention,
              dataSource: retentionData.dataSource,
              'dataQuality.completeness': retentionData.dataQuality?.completeness || 85
            }
          }
        );
      }
    }

    logger.info(`Back-fill complete:`);
    logger.info(`  - Stored: ${storedCount} days`);
    logger.info(`  - Errors: ${errorCount}`);

    return {
      success: true,
      storedCount,
      errorCount,
      totalDays: analyticsData.dailyMetrics.length
    };

  } catch (error) {
    logger.error('Failed to back-fill retention metrics:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Verify back-filled data
 */
async function verifyBackfill(startDate, endDate) {
  logger.info('Verifying back-filled data...');

  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);

  const records = await RetentionMetrics.find({
    cohortDateObj: { $gte: startDateObj, $lte: endDateObj }
  }).sort({ cohortDateObj: 1 });

  logger.info(`Found ${records.length} records in database`);

  if (records.length > 0) {
    // Calculate totals
    const totals = records.reduce((acc, rec) => ({
      cohortSize: acc.cohortSize + (rec.cohortSize || 0),
      dau: acc.dau + (rec.activeUsers?.dau || 0),
      totalSessions: acc.totalSessions + (rec.sessions?.totalSessions || 0)
    }), { cohortSize: 0, dau: 0, totalSessions: 0 });

    // Calculate average retention
    const avgRetention = await RetentionMetrics.getAverageRetention(startDateObj, endDateObj);

    logger.info('Verification Summary:');
    logger.info(`  - Total Records: ${records.length}`);
    logger.info(`  - Total Installs (cohort size): ${totals.cohortSize}`);
    logger.info(`  - Total Sessions: ${totals.totalSessions}`);
    logger.info(`  - Date Range: ${records[0].cohortDate} to ${records[records.length - 1].cohortDate}`);

    if (avgRetention) {
      logger.info('Average Retention:');
      logger.info(`  - Day 1: ${avgRetention.day1}%`);
      logger.info(`  - Day 7: ${avgRetention.day7}%`);
      logger.info(`  - Day 30: ${avgRetention.day30}%`);
    }
  }

  return records.length;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse command line arguments
  const daysArg = args.find(arg => arg.startsWith('--days='));
  const startDateArg = args.find(arg => arg.startsWith('--start='));
  const endDateArg = args.find(arg => arg.startsWith('--end='));
  const verifyOnly = args.includes('--verify-only');
  const createRequest = args.includes('--create-request');

  let startDate, endDate;

  if (startDateArg && endDateArg) {
    startDate = new Date(startDateArg.split('=')[1]);
    endDate = new Date(endDateArg.split('=')[1]);
  } else if (daysArg) {
    const days = parseInt(daysArg.split('=')[1]);
    endDate = new Date();
    endDate.setDate(endDate.getDate() - 1); // Yesterday
    startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days + 1);
  } else {
    // Default: last 30 days
    endDate = new Date();
    endDate.setDate(endDate.getDate() - 1); // Yesterday
    startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 30 + 1);
  }

  const appId = process.env.APP_STORE_APP_ID;

  if (!appId) {
    logger.error('APP_STORE_APP_ID environment variable is not set');
    logger.error('Please set it in your .env file');
    process.exit(1);
  }

  logger.info('=== App Store Connect Analytics Back-fill Script ===');
  logger.info(`App ID: ${appId}`);
  logger.info(`Date Range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
  logger.info(`Days: ${Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))}`);

  try {
    await connectToDatabase();

    // Check if ASC service is configured
    if (!appStoreConnectService.isConfigured()) {
      logger.error('App Store Connect service is not configured');
      logger.error('Please check your credentials in .env file');
      process.exit(1);
    }

    logger.info('App Store Connect service is configured');

    // Create report request if requested
    if (createRequest) {
      logger.info('Creating analytics report request...');
      const result = await appStoreConnectService.createAnalyticsReportRequest(appId, 'ONGOING');
      logger.info('Report request created', { reportRequestId: result.reportRequestId });
      logger.warn('Note: Reports may take up to 24 hours to become available');
      logger.info('Run this script again tomorrow to fetch the data');
      process.exit(0);
    }

    if (verifyOnly) {
      await verifyBackfill(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);
    } else {
      const result = await backfillRetentionMetrics(appId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);

      if (result.success || result.message === 'No data available yet') {
        await verifyBackfill(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);
      }
    }

    logger.info('Back-fill script completed');

  } catch (error) {
    logger.error('Back-fill script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
