import mongoose from 'mongoose';

/**
 * Blog Post Schema
 * Stores blog posts with scheduling and status tracking for content calendar
 */

const blogPostSchema = new mongoose.Schema({
  // Basic post information
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    sparse: true
  },

  // Content
  content: {
    type: String,
    required: true
  },
  excerpt: {
    type: String,
    trim: true
  },
  metaDescription: {
    type: String,
    trim: true
  },

  // SEO
  keywords: [{
    type: String,
    trim: true
  }],
  focusKeyword: {
    type: String,
    trim: true
  },

  // Categorization
  category: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],

  // Featured image
  featuredImage: {
    type: String,
    trim: true
  },

  // Author
  author: {
    type: String,
    default: 'Blush Marketing'
  },

  // Status and workflow
  status: {
    type: String,
    enum: ['draft', 'review', 'scheduled', 'published', 'archived'],
    default: 'draft',
    required: true
  },

  // Scheduling
  scheduledPublishAt: {
    type: Date
  },
  publishedAt: {
    type: Date
  },

  // Content type
  contentType: {
    type: String,
    enum: ['blog_post', 'article', 'tutorial', 'case_study', 'announcement'],
    default: 'blog_post'
  },

  // Target audience
  targetAudience: {
    type: String,
    enum: ['general', 'beginners', 'professionals', 'experts'],
    default: 'general'
  },

  // Tone
  tone: {
    type: String,
    enum: ['professional', 'casual', 'friendly', 'formal'],
    default: 'professional'
  },

  // Word count
  wordCount: {
    type: Number
  },

  // Estimated read time (minutes)
  readTime: {
    type: Number
  },

  // SEO score
  seoScore: {
    type: Number,
    min: 0,
    max: 100
  },

  // Publishing details
  publishedUrl: {
    type: String,
    trim: true
  },
  platform: {
    type: String,
    enum: ['wordpress', 'medium', 'ghost', 'custom', 'internal'],
    default: 'internal'
  },

  // Engagement metrics (after publishing)
  views: {
    type: Number,
    default: 0
  },
  shares: {
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

  // Internal tracking
  createdBy: {
    type: String,
    default: 'AI'
  },
  updatedBy: {
    type: String,
    default: 'AI'
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
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
  rejectionReason: {
    type: String,
    trim: true
  },

  // Notes
  notes: [{
    content: String,
    author: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
});

// Indexes for calendar queries
blogPostSchema.index({ scheduledPublishAt: 1, status: 1 });
blogPostSchema.index({ publishedAt: -1 });
blogPostSchema.index({ status: 1 });
blogPostSchema.index({ createdAt: -1 });
blogPostSchema.index({ category: 1 });

// Pre-save middleware to update timestamps
blogPostSchema.pre('save', function(next) {
  this.updatedAt = new Date();

  // Calculate read time if content exists
  if (this.content && !this.readTime) {
    const wordsPerMinute = 200;
    const wordCount = this.content.split(/\s+/).length;
    this.wordCount = wordCount;
    this.readTime = Math.ceil(wordCount / wordsPerMinute);
  }

  // Generate slug from title
  if (this.title && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  next();
});

// Virtual for formatted date
blogPostSchema.virtual('formattedScheduledDate').get(function() {
  if (!this.scheduledPublishAt) return null;
  return this.scheduledPublishAt.toISOString().split('T')[0];
});

// Virtual for publication status
blogPostSchema.virtual('isPublished').get(function() {
  return this.status === 'published' && this.publishedAt;
});

// Virtual for is scheduled
blogPostSchema.virtual('isScheduled').get(function() {
  return this.status === 'scheduled' && this.scheduledPublishAt && this.scheduledPublishAt > new Date();
});

// Ensure virtuals are included in JSON
blogPostSchema.set('toJSON', { virtuals: true });
blogPostSchema.set('toObject', { virtuals: true });

const BlogPost = mongoose.model('BlogPost', blogPostSchema);

export default BlogPost;
