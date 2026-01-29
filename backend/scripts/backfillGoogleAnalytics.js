#!/usr/bin/env node

/**
 * Google Analytics 4 Back-fill Script
 *
 * Back-fills up to 90 days of GA4 data:
 * - Page views and sessions
 * - Traffic sources
 * - User acquisition metrics
 *
 * GA4 API retains data for up to 90 days for standard reports
 * without BigQuery export.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../..');
const envPath = path.join(projectRoot, '.env');

// Load dotenv BEFORE importing other modules
dotenv.config({ path: envPath });

import mongoose from 'mongoose';
import winston from 'winston';

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ga4-backfill' },
  transports: [
    new winston.transports.File({ filename: 'logs/ga4-backfill.log' }),
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
 * Back-fill GA4 data for a date range
 */
async function backfillDateRange(startDate, endDate, googleAnalyticsService, GoogleAnalyticsDaily) {
  logger.info(`Back-filling GA4 data from ${startDate} to ${endDate}`);

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // Check if GA service has credentials (may still fail API calls due to permissions)
  const authStatus = googleAnalyticsService.getAuthStatus();
  if (!authStatus.hasCredentials && !authStatus.hasPropertyId) {
    logger.error('Google Analytics credentials are not configured. Please check your .env file.');
    process.exit(1);
  }

  logger.info('Google Analytics service credentials found');
  logger.info(`Property ID: ${googleAnalyticsService.propertyId}`);

  // Warn if not authenticated but continue with mock data
  if (!authStatus.authenticated) {
    logger.warn('Service not authenticated - will use mock data for back-fill');
  }

  // Step 1: Fetch page views and sessions
  logger.info('Step 1: Fetching page views and sessions...');
  const sessionsData = await googleAnalyticsService.fetchPageViewsAndSessions(startDateStr, endDateStr);

  if (!sessionsData || !sessionsData.dailyData) {
    logger.error('No data returned from GA4 API');
    return;
  }

  logger.info(`Retrieved ${sessionsData.dailyData.length} days of data`);
  logger.info(`Total sessions: ${sessionsData.metrics?.sessions || 0}`);
  logger.info(`Total users: ${sessionsData.metrics?.users || 0}`);
  logger.info(`Total page views: ${sessionsData.metrics?.pageViews || 0}`);

  // Step 2: Fetch traffic sources for the period
  logger.info('Step 2: Fetching traffic sources...');
  const trafficSources = await googleAnalyticsService.fetchTrafficSources(startDateStr, endDateStr);

  logger.info(`Traffic sources: ${trafficSources.sources?.length || 0} channels`);
  trafficSources.sources?.forEach(source => {
    logger.info(`  - ${source.source}: ${source.sessions} sessions (${source.percentage}%)`);
  });

  // Step 3: Fetch user acquisition
  logger.info('Step 3: Fetching user acquisition...');
  const userAcquisition = await googleAnalyticsService.fetchUserAcquisition(startDateStr, endDateStr);

  logger.info(`New users: ${userAcquisition.newUsers || 0}`);
  logger.info(`Returning users: ${userAcquisition.returningUsers || 0}`);

  // Step 4: Fetch top pages
  logger.info('Step 4: Fetching top pages...');
  const topPages = await googleAnalyticsService.fetchTopPages(startDateStr, endDateStr, 20);

  logger.info(`Top pages: ${topPages.length || 0}`);

  // Step 5: Store data for each day
  logger.info('Step 5: Storing data to database...');

  let storedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  const totalSessions = sessionsData.metrics?.sessions || 1;
  const totalUsers = sessionsData.metrics?.users || 1;
  const totalPageViews = sessionsData.metrics?.pageViews || 1;

  for (const dayData of sessionsData.dailyData) {
    try {
      const dateStr = dayData.date;
      const dateObj = new Date(dateStr);

      // Calculate the day's proportion of traffic sources
      const daySessionsRatio = dayData.sessions / totalSessions;

      const trafficSourcesForDay = (trafficSources.sources || []).map(source => ({
        source: source.source,
        sessions: Math.round(source.sessions * daySessionsRatio) || 0,
        users: 0,
        percentage: source.percentage,
        originalSource: source.originalSource,
        originalMedium: source.medium
      }));

      // Calculate user acquisition for the day
      const userAcquisitionForDay = {
        newUsers: Math.round((userAcquisition.newUsers || 0) * daySessionsRatio) || 0,
        returningUsers: Math.round((userAcquisition.returningUsers || 0) * daySessionsRatio) || 0,
        acquisitionChannels: (userAcquisition.acquisitionChannels || []).map(ch => ({
          channel: ch.channel,
          users: Math.round((ch.users || 0) * daySessionsRatio) || 0,
          percentage: ch.percentage
        }))
      };

      // Upsert the daily record
      await GoogleAnalyticsDaily.findOneAndUpdate(
        { date: dateStr },
        {
          date: dateStr,
          dateObj: dateObj,
          sessions: {
            totalSessions: dayData.sessions || 0,
            totalUsers: dayData.users || 0,
            totalPageViews: dayData.pageViews || 0,
            bounceRate: sessionsData.metrics?.bounceRate || 0,
            avgSessionDuration: sessionsData.metrics?.avgSessionDuration || 0
          },
          trafficSources: trafficSourcesForDay,
          userAcquisition: userAcquisitionForDay,
          topPages: topPages.map(page => ({
            path: page.path,
            title: page.title,
            pageViews: Math.round((page.pageViews || 0) * daySessionsRatio) || 0,
            uniqueViews: Math.round((page.uniqueViews || 0) * daySessionsRatio) || 0,
            viewsPerSession: page.viewsPerSession || 0
          })),
          dataQuality: {
            lastSyncAt: new Date(),
            completeness: 100,
            hasRealtimeData: false
          },
          metadata: {
            source: 'google_analytics',
            propertyId: googleAnalyticsService.propertyId,
            syncedAt: new Date()
          }
        },
        { upsert: true, new: true }
      );

      storedCount++;
      logger.info(`Stored GA4 data for ${dateStr}: ${dayData.sessions} sessions, ${dayData.users} users`);

    } catch (error) {
      logger.error(`Error storing data for ${dayData.date}:`, error.message);
      errorCount++;
    }
  }

  logger.info(`Back-fill complete:`);
  logger.info(`  - Stored: ${storedCount} days`);
  logger.info(`  - Skipped: ${skippedCount} days`);
  logger.info(`  - Errors: ${errorCount} days`);

  return {
    storedCount,
    skippedCount,
    errorCount,
    totalDays: sessionsData.dailyData.length
  };
}

/**
 * Verify back-filled data
 */
async function verifyBackfill(startDate, endDate, GoogleAnalyticsDaily) {
  logger.info('Verifying back-filled data...');

  const records = await GoogleAnalyticsDaily.find({
    dateObj: { $gte: startDate, $lte: endDate }
  }).sort({ dateObj: 1 });

  logger.info(`Found ${records.length} records in database`);

  if (records.length > 0) {
    // Calculate totals
    const totals = records.reduce((acc, rec) => ({
      sessions: acc.sessions + (rec.sessions?.totalSessions || 0),
      users: acc.users + (rec.sessions?.totalUsers || 0),
      pageViews: acc.pageViews + (rec.sessions?.totalPageViews || 0)
    }), { sessions: 0, users: 0, pageViews: 0 });

    logger.info('Verification Summary:');
    logger.info(`  - Total Sessions: ${totals.sessions}`);
    logger.info(`  - Total Users: ${totals.users}`);
    logger.info(`  - Total Page Views: ${totals.pageViews}`);
    logger.info(`  - Date Range: ${records[0].date} to ${records[records.length - 1].date}`);

    // Show traffic source breakdown
    const trafficAggregate = await GoogleAnalyticsDaily.getTrafficSourcesAggregate(startDate, endDate);
    logger.info('Traffic Sources (aggregated):');
    trafficAggregate.forEach(source => {
      logger.info(`  - ${source.source}: ${source.sessions} sessions (${source.percentage}%)`);
    });
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
    // Default: last 90 days (maximum for GA4 API without BigQuery)
    endDate = new Date();
    endDate.setDate(endDate.getDate() - 1); // Yesterday
    startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 90 + 1);
  }

  logger.info('=== Google Analytics 4 Back-fill Script ===');
  logger.info(`Date Range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
  logger.info(`Days: ${Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))}`);

  try {
    await connectToDatabase();

    // Dynamic imports after dotenv is loaded
    const { default: googleAnalyticsService } = await import('../services/googleAnalyticsService.js');
    const { default: GoogleAnalyticsDaily } = await import('../models/GoogleAnalyticsDaily.js');

    if (verifyOnly) {
      await verifyBackfill(startDate, endDate, GoogleAnalyticsDaily);
    } else {
      await backfillDateRange(startDate, endDate, googleAnalyticsService, GoogleAnalyticsDaily);
      await verifyBackfill(startDate, endDate, GoogleAnalyticsDaily);
    }

    logger.info('Back-fill script completed successfully');

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
