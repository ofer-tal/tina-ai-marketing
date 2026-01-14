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
  approvedBy: {
    type: String,
    default: 'Founder'
  },
  rejectedAt: {
    type: Date
  },
  rejectedBy: {
    type: String,
    default: 'Founder'
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  rejectionCategory: {
    type: String,
    enum: ['content_quality', 'tone_mismatch', 'inappropriate', 'cta_missing', 'engagement_weak', 'brand_voice', 'timing', 'technical', 'other'],
    trim: true
  },
  feedback: {
    type: String,
    trim: true
  },
  hook: {
    type: String,
    trim: true
  },

  // Approval history tracking
  approvalHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    action: {
      type: String,
      enum: ['approved', 'rejected', 'regenerated', 'edited']
    },
    userId: {
      type: String,
      default: 'Founder'
    },
    details: {
      reason: String,
      feedback: String,
      previousCaption: String,
      previousHashtags: [String]
    }
  }],

  // Regeneration tracking
  regenerationCount: {
    type: Number,
    default: 0
  },
  regenerationHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    feedback: String,
    previousCaption: String,
    previousHashtags: [String],
    previousHook: String
  }],
  lastRegeneratedAt: {
    type: Date
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

  // Platform-specific data
  tiktokVideoId: {
    type: String,
    trim: true
  },
  tiktokShareUrl: {
    type: String,
    trim: true
  },
  instagramMediaId: {
    type: String,
    trim: true
  },
  instagramPermalink: {
    type: String,
    trim: true
  },
  youtubeVideoId: {
    type: String,
    trim: true
  },
  youtubeUrl: {
    type: String,
    trim: true
  },

  // Metrics tracking
  metricsLastFetchedAt: {
    type: Date
  },
  metricsHistory: [{
    fetchedAt: {
      type: Date,
      default: Date.now
    },
    views: Number,
    likes: Number,
    comments: Number,
    shares: Number,
    engagementRate: Number
  }],

  // Upload progress tracking
  uploadProgress: {
    status: {
      type: String,
      enum: ['idle', 'initializing', 'uploading', 'publishing', 'completed', 'failed'],
      default: 'idle'
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    stage: {
      type: String,
      trim: true
    },
    publishId: {
      type: String,
      trim: true
    },
    startedAt: {
      type: Date
    },
    completedAt: {
      type: Date
    },
    errorMessage: {
      type: String,
      trim: true
    }
  },

  // Error tracking for failed posts
  error: {
    type: String,
    trim: true
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
marketingPostSchema.methods.markAsApproved = function(userId = 'Founder') {
  this.status = 'approved';
  this.approvedAt = new Date();
  this.approvedBy = userId;

  // Track in approval history
  this.approvalHistory = this.approvalHistory || [];
  this.approvalHistory.push({
    timestamp: new Date(),
    action: 'approved',
    userId: userId
  });

  return this.save();
};

// Helper function to categorize rejection reasons
function categorizeRejectionReason(reason) {
  if (!reason) return 'other';

  const lowerReason = reason.toLowerCase();

  // Content quality issues
  if (lowerReason.includes('boring') || lowerReason.includes('dull') || lowerReason.includes('uninteresting') ||
      lowerReason.includes('weak') || lowerReason.includes('poor quality') || lowerReason.includes('generic')) {
    return 'content_quality';
  }

  // Tone mismatch
  if (lowerReason.includes('too sexy') || lowerReason.includes('too hot') || lowerReason.includes('too spicy') ||
      lowerReason.includes('not sexy enough') || lowerReason.includes('not enough passion') ||
      lowerReason.includes('too formal') || lowerReason.includes('too casual') ||
      lowerReason.includes('tone') || lowerReason.includes('voice')) {
    return 'tone_mismatch';
  }

  // Inappropriate content
  if (lowerReason.includes('offensive') || lowerReason.includes('inappropriate') || lowerReason.includes('too explicit') ||
      lowerReason.includes('violates guidelines') || lowerReason.includes('against policy')) {
    return 'inappropriate';
  }

  // CTA missing or weak
  if (lowerReason.includes('no cta') || lowerReason.includes('missing cta') || lowerReason.includes('call to action') ||
      lowerReason.includes('no link') || lowerReason.includes('no download')) {
    return 'cta_missing';
  }

  // Engagement issues
  if (lowerReason.includes('won\'t engage') || lowerReason.includes('low engagement') || lowerReason.includes('boring caption') ||
      lowerReason.includes('not catchy') || lowerReason.includes('attention-grabbing')) {
    return 'engagement_weak';
  }

  // Brand voice issues
  if (lowerReason.includes('not on brand') || lowerReason.includes('brand voice') || lowerReason.includes('doesn\'t sound like us') ||
      lowerReason.includes('inconsistent')) {
    return 'brand_voice';
  }

  // Timing issues
  if (lowerReason.includes('bad timing') || lowerReason.includes('wrong time') || lowerReason.includes('schedule')) {
    return 'timing';
  }

  // Technical issues
  if (lowerReason.includes('video') || lowerReason.includes('image') || lowerReason.includes('format') ||
      lowerReason.includes('quality issue') || lowerReason.includes('technical')) {
    return 'technical';
  }

  return 'other';
}

// Method to mark as rejected
marketingPostSchema.methods.markAsRejected = function(reason, feedback = null, userId = 'Founder') {
  this.status = 'rejected';
  this.rejectedAt = new Date();
  this.rejectedBy = userId;
  this.rejectionReason = reason;
  this.rejectionCategory = categorizeRejectionReason(reason);
  if (feedback) {
    this.feedback = feedback;
  }

  // Track in approval history
  this.approvalHistory = this.approvalHistory || [];
  this.approvalHistory.push({
    timestamp: new Date(),
    action: 'rejected',
    userId: userId,
    details: {
      reason: reason,
      feedback: feedback,
      category: this.rejectionCategory
    }
  });

  return this.save();
};

// Method to regenerate content with feedback
marketingPostSchema.methods.regenerateWithFeedback = function(feedback, userId = 'Founder') {
  // Store previous values in history
  this.regenerationHistory = this.regenerationHistory || [];
  this.regenerationHistory.push({
    timestamp: new Date(),
    feedback: feedback,
    previousCaption: this.caption,
    previousHashtags: this.hashtags,
    previousHook: this.hook
  });

  // Track in approval history
  this.approvalHistory = this.approvalHistory || [];
  this.approvalHistory.push({
    timestamp: new Date(),
    action: 'regenerated',
    userId: userId,
    details: {
      feedback: feedback,
      previousCaption: this.caption,
      previousHashtags: [...this.hashtags]
    }
  });

  // Update regeneration tracking
  this.regenerationCount = (this.regenerationCount || 0) + 1;
  this.lastRegeneratedAt = new Date();

  // Reset status to draft for new generation
  this.status = 'draft';
  this.feedback = feedback;

  // Clear rejection fields
  this.rejectedAt = undefined;
  this.rejectionReason = undefined;

  return this.save();
};

// Method to mark as posted
marketingPostSchema.methods.markAsPosted = function() {
  this.status = 'posted';
  this.postedAt = new Date();
  return this.save();
};

// Method to update upload progress
marketingPostSchema.methods.updateUploadProgress = function(status, progress = 0, stage = null, publishId = null, errorMessage = null) {
  this.uploadProgress = this.uploadProgress || {};
  this.uploadProgress.status = status;
  this.uploadProgress.progress = progress;

  if (stage) {
    this.uploadProgress.stage = stage;
  }
  if (publishId) {
    this.uploadProgress.publishId = publishId;
  }
  if (errorMessage) {
    this.uploadProgress.errorMessage = errorMessage;
  }

  // Set timestamps
  if (status === 'initializing' && !this.uploadProgress.startedAt) {
    this.uploadProgress.startedAt = new Date();
  }
  if (status === 'completed' || status === 'failed') {
    this.uploadProgress.completedAt = new Date();
  }

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
