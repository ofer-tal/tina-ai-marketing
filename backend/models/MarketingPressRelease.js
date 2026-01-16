/**
 * Marketing Press Release Model
 */

import mongoose from 'mongoose';

const pressReleaseSchema = new mongoose.Schema({
  headline: {
    type: String,
    required: true,
    trim: true
  },
  dateline: {
    type: String,
    required: true
  },
  leadParagraph: {
    type: String,
    required: true
  },
  bodyParagraphs: [{
    type: String,
    required: true
  }],
  quotes: [{
    quote: {
      type: String,
      required: true
    },
    attributedTo: {
      type: String,
      required: true
    },
    context: {
      type: String
    }
  }],
  callToAction: {
    type: String,
    required: true
  },
  boilerplate: {
    type: String,
    required: true
  },
  aboutSection: {
    type: String
  },
  mediaContact: {
    name: String,
    email: String,
    phone: String
  },
  companyInfo: {
    name: String,
    website: String,
    contactEmail: String,
    contactPhone: String
  },
  updates: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  tone: {
    type: String,
    enum: ['professional', 'casual', 'exciting', 'urgent'],
    default: 'professional'
  },
  wordCount: {
    type: Number,
    default: 0
  },
  readingTime: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['draft', 'ready', 'distributed', 'cancelled'],
    default: 'draft'
  },
  readyForDistribution: {
    type: Boolean,
    default: false
  },
  distributedAt: {
    type: Date
  },
  distributionChannels: [{
    type: String,
    enum: ['prnewswire', 'businesswire', 'email', 'direct', 'social']
  }],
  generatedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
pressReleaseSchema.index({ status: 1, createdAt: -1 });
pressReleaseSchema.index({ updatedAt: -1 });

// Update timestamp on save
pressReleaseSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('MarketingPressRelease', pressReleaseSchema, 'marketing_press_releases');
