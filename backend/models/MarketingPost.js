import mongoose from 'mongoose';

/**
 * Marketing Post Schema
 * Stores generated social media content for different platforms
 */

const marketingPostSchema = new mongoose.Schema({
  // Basic post information
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },

  // Platform and content type
  platform: {
    type: String,
    enum: ['tiktok', 'instagram', 'youtube_shorts'],
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'ready', 'approved', 'scheduled', 'posted', 'failed', 'rejected'],
    default: 'draft',
    required: true
  },
  contentType: {
    type: String,
    enum: ['video', 'image', 'carousel'],
    default: 'video'
  },

  // Content assets
  videoPath: {
    type: String,
    trim: true
  },
  imagePath: {
    type: String,
    trim: true
  },

  // Text content
  caption: {
    type: String,
    required: true
  },
  hashtags: [{
    type: String,
    trim: true
  }],

  // Scheduling
  scheduledAt: {
    type: Date,
    required: true
  },
  postedAt: {
    type: Date
  },

  // Associated story
  storyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story',
    required: true
  },
  storyName: {
    type: String,
    required: true
  },
  storyCategory: {
    type: String,
    required: true
  },
  storySpiciness: {
    type: Number,
    min: 0,
    max: 3,
    required: true
  },

  // Generated timestamp
  generatedAt: {
    type: Date,
    default: Date.now
  },

  // Approval workflow
  approvedAt: {
    type: Date
  },
  rejectedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true
  },

  // Performance metrics (populated after posting)
  performanceMetrics: {
    views: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    comments: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    engagementRate: {
      type: Number,
      default: 0
    }
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
marketingPostSchema.index({ platform: 1, status: 1 });
marketingPostSchema.index({ scheduledAt: 1 });
marketingPostSchema.index({ storyId: 1 });
marketingPostSchema.index({ status: 1, scheduledAt: 1 });
marketingPostSchema.index({ createdAt: -1 });

// Update the updatedAt timestamp before saving
marketingPostSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for checking if post is ready for posting
marketingPostSchema.virtual('isReadyToPost').get(function() {
  return this.status === 'approved' || this.status === 'scheduled';
});

// Virtual for time until scheduled
marketingPostSchema.virtual('timeUntilScheduled').get(function() {
  if (!this.scheduledAt) return null;
  return this.scheduledAt.getTime() - Date.now();
});

// Method to mark as approved
marketingPostSchema.methods.markAsApproved = function() {
  this.status = 'approved';
  this.approvedAt = new Date();
  return this.save();
};

// Method to mark as rejected
marketingPostSchema.methods.markAsRejected = function(reason) {
  this.status = 'rejected';
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  return this.save();
};

// Method to mark as posted
marketingPostSchema.methods.markAsPosted = function() {
  this.status = 'posted';
  this.postedAt = new Date();
  return this.save();
};

// Method to schedule for posting
marketingPostSchema.methods.scheduleFor = function(date) {
  this.status = 'scheduled';
  this.scheduledAt = date;
  return this.save();
};

// Static method to get posts scheduled within a date range
marketingPostSchema.statics.getScheduledInRange = function(startDate, endDate) {
  return this.find({
    status: { $in: ['draft', 'ready', 'scheduled'] },
    scheduledAt: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ scheduledAt: 1 });
};

// Static method to get posts by platform and status
marketingPostSchema.statics.getByPlatformAndStatus = function(platform, status) {
  return this.find({
    platform,
    status
  }).sort({ scheduledAt: -1 });
};

// Static method to get upcoming posts (next 7 days)
marketingPostSchema.statics.getUpcoming = function(days = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + days);

  return this.find({
    status: { $in: ['draft', 'ready', 'scheduled', 'approved'] },
    scheduledAt: {
      $gte: new Date(),
      $lte: cutoffDate
    }
  }).sort({ scheduledAt: 1 })
    .populate('storyId', 'title coverPath spiciness category');
};

const MarketingPost = mongoose.model('MarketingPost', marketingPostSchema);

export default MarketingPost;
