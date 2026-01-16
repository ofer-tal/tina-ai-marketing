/**
 * MarketingMediumArticle Model
 * Medium articles for content marketing
 */

import mongoose from 'mongoose';

const mediumArticleSchema = new mongoose.Schema({
  // Content
  title: {
    type: String,
    required: true,
    trim: true
  },
  subtitle: {
    type: String,
    trim: true
  },
  content: {
    type: String,
    required: true
  },

  // Metadata
  metadata: {
    topic: String,
    targetAudience: String,
    tone: String,
    keywords: [String]
  },

  // Tags (Medium allows max 5)
  tags: [{
    type: String,
    trim: true
  }],

  // Call to action
  callToAction: {
    type: String
  },

  // SEO data
  seo: {
    title: String,
    subtitle: String,
    tags: [String],
    readingTime: Number,
    wordCount: Number,
    publishFormat: {
      type: String,
      default: 'markdown'
    },
    estimatedClaps: {
      min: Number,
      avg: Number,
      max: Number,
      factors: [String]
    },
    featuredImage: {
      description: String,
      suggestedKeywords: String,
      recommendedSize: String,
      format: String
    }
  },

  // Word count
  wordCount: {
    type: Number,
    default: 0
  },

  // Estimated reading time (minutes)
  estimatedReadingTime: {
    type: Number,
    default: 0
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'review', 'ready', 'published'],
    default: 'draft'
  },

  // Publishing dates
  publishedAt: {
    type: Date
  },

  // Medium-specific data
  mediumUrl: {
    type: String
  },
  mediumId: {
    type: String
  },
  clapCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  commentCount: {
    type: Number,
    default: 0
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'marketing_medium_articles'
});

// Update timestamp on save
mediumArticleSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for searches
mediumArticleSchema.index({ title: 'text', content: 'text', 'metadata.keywords': 'text' });
mediumArticleSchema.index({ status: 1, createdAt: -1 });
mediumArticleSchema.index({ tags: 1 });

const MarketingMediumArticle = mongoose.model('MarketingMediumArticle', mediumArticleSchema);

export default MarketingMediumArticle;
