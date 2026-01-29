/**
 * Scheduled Job Execution Model
 *
 * Tracks execution history and status of scheduled jobs
 * - Last run time
 * - Next scheduled run time (calculated from cron)
 * - Success/failure status
 * - Execution duration
 * - Error messages
 *
 * Used for:
 * - Job execution history tracking
 * - Missed job detection on startup
 * - Job health monitoring
 */

import mongoose from 'mongoose';

const scheduledJobExecutionSchema = new mongoose.Schema({
  // Job identifier
  jobName: {
    type: String,
    required: true,
    index: true
  },

  // Cron expression for the job
  cronExpression: {
    type: String,
    required: true
  },

  // Execution tracking
  lastRunAt: {
    type: Date,
    default: null
  },

  lastRunStatus: {
    type: String,
    enum: ['success', 'failed', 'running', 'pending'],
    default: 'pending'
  },

  lastRunDuration: {
    type: Number, // in milliseconds
    default: null
  },

  lastRunError: {
    type: String,
    default: null
  },

  // Next scheduled run
  nextRunAt: {
    type: Date,
    default: null
  },

  // Statistics
  totalRuns: {
    type: Number,
    default: 0
  },

  successfulRuns: {
    type: Number,
    default: 0
  },

  failedRuns: {
    type: Number,
    default: 0
  },

  consecutiveFailures: {
    type: Number,
    default: 0
  },

  // Missed job tracking
  lastCheckedAt: {
    type: Date,
    default: null
  },

  missedRuns: {
    type: Number,
    default: 0
  },

  // Job metadata
  isActive: {
    type: Boolean,
    default: true
  },

  timezone: {
    type: String,
    default: 'UTC'
  },

  // Additional data for specific jobs
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  collection: 'scheduled_job_executions'
});

// Index for finding jobs that need to run
scheduledJobExecutionSchema.index({ jobName: 1, isActive: 1 });
scheduledJobExecutionSchema.index({ nextRunAt: 1, isActive: 1 });
scheduledJobExecutionSchema.index({ lastRunAt: 1 });

// Static method to get or create job execution record
scheduledJobExecutionSchema.statics.getOrCreate = async function(jobName, cronExpression, options = {}) {
  let record = await this.findOne({ jobName });

  if (!record) {
    record = await this.create({
      jobName,
      cronExpression,
      timezone: options.timezone || 'UTC',
      nextRunAt: null, // Will be calculated when job starts
      metadata: options.metadata || {}
    });
  }

  return record;
};

// Static method to find missed jobs
scheduledJobExecutionSchema.statics.findMissedJobs = async function() {
  const now = new Date();

  // Find jobs where:
  // 1. They are active
  // 2. Next run time is in the past
  // 3. Either never ran, or last run was before the scheduled time
  const missedJobs = await this.find({
    isActive: true,
    nextRunAt: { $lt: now },
    $or: [
      { lastRunAt: null },
      { lastRunAt: { $lt: mongoose.Types.Date } } // lastRun before nextRunAt
    ]
  }).sort({ nextRunAt: 1 });

  return missedJobs;
};

// Static method to get job health summary
scheduledJobExecutionSchema.statics.getHealthSummary = async function() {
  const jobs = await this.find({ isActive: true });

  return jobs.map(job => {
    const failureRate = job.totalRuns > 0
      ? (job.failedRuns / job.totalRuns) * 100
      : 0;

    let health = 'healthy';
    if (job.consecutiveFailures >= 3) {
      health = 'critical';
    } else if (job.consecutiveFailures >= 1 || failureRate > 25) {
      health = 'warning';
    }

    // Check if job is overdue
    const isOverdue = job.nextRunAt && job.nextRunAt < new Date();

    return {
      jobName: job.jobName,
      health,
      isOverdue,
      lastRunAt: job.lastRunAt,
      nextRunAt: job.nextRunAt,
      lastRunStatus: job.lastRunStatus,
      consecutiveFailures: job.consecutiveFailures,
      failureRate: Math.round(failureRate * 10) / 10
    };
  });
};

// Instance method to record job start
scheduledJobExecutionSchema.methods.recordStart = async function() {
  this.lastRunAt = new Date();
  this.lastRunStatus = 'running';
  return this.save();
};

// Instance method to record job success
scheduledJobExecutionSchema.methods.recordSuccess = async function(duration) {
  this.lastRunStatus = 'success';
  this.lastRunDuration = duration;
  this.lastRunError = null;
  this.totalRuns++;
  this.successfulRuns++;
  this.consecutiveFailures = 0;
  return this.save();
};

// Instance method to record job failure
scheduledJobExecutionSchema.methods.recordFailure = async function(error) {
  this.lastRunStatus = 'failed';
  this.lastRunError = typeof error === 'string' ? error : error?.message || String(error);
  this.totalRuns++;
  this.failedRuns++;
  this.consecutiveFailures++;
  return this.save();
};

// Instance method to update next run time
scheduledJobExecutionSchema.methods.updateNextRun = async function(nextRunDate) {
  this.nextRunAt = nextRunDate;
  this.lastCheckedAt = new Date();
  return this.save();
};

// Instance method to mark as missed run
scheduledJobExecutionSchema.methods.recordMissedRun = async function() {
  this.missedRuns++;
  return this.save();
};

const ScheduledJobExecution = mongoose.model('ScheduledJobExecution', scheduledJobExecutionSchema);

export default ScheduledJobExecution;
