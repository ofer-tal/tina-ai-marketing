import mongoose from 'mongoose';

/**
 * Strategy Model
 * Stores strategic recommendations, insights, and alerts for marketing operations
 */
const strategySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['insight', 'alert', 'recommendation', 'optimization', 'experiment', 'analysis'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'dismissed'],
    default: 'pending'
  },
  content: {
    type: String,
    required: true
  },
  metadata: {
    source: String,
    testId: String,
    testName: String,
    testType: String,
    winner: String,
    confidence: Number,
    lift: Number,
    // Additional metadata can be added as needed
    additionalData: mongoose.Schema.Types.Mixed
  },
  assignedTo: {
    type: String,
    default: 'system' // 'system', 'user', or specific user ID
  },
  dueDate: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  dismissedAt: {
    type: Date,
    default: null
  },
  dismissalReason: {
    type: String,
    default: null
  },
  tags: [{
    type: String
  }],
  relatedStrategies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Strategy'
  }],
  attachments: [{
    name: String,
    url: String,
    type: String
  }],
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient queries
strategySchema.index({ type: 1, status: 1, createdAt: -1 });
strategySchema.index({ priority: 1, status: 1 });
strategySchema.index({ 'metadata.testId': 1 });
strategySchema.index({ createdAt: -1 });

/**
 * Mark strategy as completed
 */
strategySchema.methods.markCompleted = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  this.updatedAt = new Date();
  return this.save();
};

/**
 * Mark strategy as dismissed
 */
strategySchema.methods.markDismissed = function(reason) {
  this.status = 'dismissed';
  this.dismissedAt = new Date();
  this.dismissalReason = reason || 'No reason provided';
  this.updatedAt = new Date();
  return this.save();
};

/**
 * Mark strategy as in progress
 */
strategySchema.methods.markInProgress = function() {
  this.status = 'in_progress';
  this.updatedAt = new Date();
  return this.save();
};

// Update the updatedAt timestamp before saving
strategySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Strategy', strategySchema);
