/**
 * App Store Notification Model
 *
 * Stores notifications received from App Store Connect webhooks
 * Tracks all notification types including:
 * - Subscription events (renewals, expirations, failures)
 * - Refunds
 * - App status updates
 * - Version review status
 * - Financial reports
 * - Sales reports
 */

import mongoose from 'mongoose';

const appStoreNotificationSchema = new mongoose.Schema({
  // Unique identifier for this notification
  messageId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Notification type from Apple
  notificationType: {
    type: String,
    required: true,
    enum: [
      'SUBSCRIPTION_EXTENDED',
      'SUBSCRIPTION_RENEWED',
      'SUBSCRIPTION_EXPIRED',
      'SUBSCRIPTION_DID_RENEW',
      'SUBSCRIPTION_DID_FAIL_TO_RENEW',
      'CONSUMPTION_REQUEST',
      'REFUND_DECLINED',
      'REFUND_SUCCEEDED',
      'APP_STATUS_UPDATE',
      'APP_STORE_VERSION_OK_TO_SUBMIT',
      'APP_STORE_VERSION_OK_TO_SUBMIT_FOR_TESTFLIGHT',
      'APP_STORE_VERSION_IN_REVIEW',
      'APP_STORE_VERSION_READY_FOR_RELEASE',
      'APP_STORE_VERSION_RELEASED',
      'APP_STORE_VERSION_REJECTED',
      'TESTFLIGHT_BUILD_OK_TO_TEST',
      'TESTFLIGHT_BUILD_EXPIRED',
      'PRICE_AND_AVAILABILITY',
      'PRICE_CHANGE',
      'FINANCIAL_REPORT',
      'SALES_REPORT'
    ]
  },

  // Raw payload from Apple (signed JWT)
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  // When the notification was received
  receivedAt: {
    type: Date,
    required: true,
    default: Date.now
  },

  // Processing status
  processed: {
    type: Boolean,
    default: false
  },

  // When processing completed
  processedAt: {
    type: Date
  },

  // Processing result (success/failure/error)
  processingResult: {
    type: String,
    enum: ['success', 'failed', 'pending']
  },

  // Error message if processing failed
  processingError: {
    type: String
  },

  // Extracted data from payload (for easier querying)
  extractedData: {
    // Subscription notifications
    bundleId: String,
    environment: String,
    appAppleId: Number,

    // Subscription-specific
    subscriptionStatus: String,
    expiresDate: Date,
    offerType: String,
    productId: String,

    // App version notifications
    appVersion: String,
    platform: String,
    versionState: String,

    // Report notifications
    reportType: String,
    reportDate: Date,
    reportSubType: String
  },

  // Related database records
  relatedRecords: {
    // Link to marketing_revenue if this is a subscription/refund notification
    revenueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MarketingRevenue'
    },

    // Link to marketing_tasks if action needed
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MarketingTask'
    }
  },

  // Metadata
  metadata: {
    // Apple notification timestamp
    appleTimestamp: Date,

    // Processing duration in milliseconds
    processingDuration: Number,

    // Whether this was a duplicate
    duplicate: {
      type: Boolean,
      default: false
    },

    // IP address that sent the webhook
    sourceIp: String,

    // User agent
    userAgent: String
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
appStoreNotificationSchema.index({ receivedAt: -1 });
appStoreNotificationSchema.index({ notificationType: 1, receivedAt: -1 });
appStoreNotificationSchema.index({ processed: 1, receivedAt: -1 });
appStoreNotificationSchema.index({ 'extractedData.subscriptionStatus': 1 });
appStoreNotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // Auto-delete after 90 days

/**
 * Static method to find duplicate notifications
 */
appStoreNotificationSchema.statics.findDuplicate = function(messageId) {
  return this.findOne({ messageId });
};

/**
 * Static method to get recent notifications by type
 */
appStoreNotificationSchema.statics.getRecentByType = function(notificationType, limit = 10) {
  return this.find({ notificationType })
    .sort({ receivedAt: -1 })
    .limit(limit);
};

/**
 * Static method to get unprocessed notifications
 */
appStoreNotificationSchema.statics.getUnprocessed = function() {
  return this.find({ processed: false })
    .sort({ receivedAt: 1 });
};

/**
 * Static method to get notification statistics
 */
appStoreNotificationSchema.statics.getStatistics = function() {
  const now = new Date();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  return Promise.all([
    this.countDocuments({}),
    this.countDocuments({ receivedAt: { $gte: dayAgo } }),
    this.countDocuments({ receivedAt: { $gte: weekAgo } }),
    this.countDocuments({ processed: false }),
    this.countDocuments({ processingResult: 'failed' })
  ]).then(([total, last24h, lastWeek, unprocessed, failed]) => ({
    total,
    last24h,
    lastWeek,
    unprocessed,
    failed,
    processed: total - unprocessed
  }));
};

/**
 * Instance method to mark as processed
 */
appStoreNotificationSchema.methods.markProcessed = function(result = 'success', error = null) {
  this.processed = true;
  this.processedAt = new Date();
  this.processingResult = result;
  if (error) {
    this.processingError = error;
  }
  if (this.receivedAt) {
    this.metadata = this.metadata || {};
    this.metadata.processingDuration = Date.now() - this.receivedAt.getTime();
  }
  return this.save();
};

const AppStoreNotification = mongoose.model('AppStoreNotification', appStoreNotificationSchema);

export default AppStoreNotification;
