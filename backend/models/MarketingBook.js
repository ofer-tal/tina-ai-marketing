import mongoose from 'mongoose';

/**
 * Marketing Book Schema
 * Stores book data for BookTok/Bookstagram trend analysis and content optimization
 */

const marketingBookSchema = new mongoose.Schema({
  // Basic book information
  title: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  author: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  series: {
    name: String,
    position: Number
  },

  // Tropes and categorization
  tropes: [{
    type: String,
    trim: true,
    index: true
  }],
  spiceLevel: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
    index: true,
    // 0 = sweet/clean, 1 = mild, 2 = moderate, 3 = spicy, 4 = very spicy, 5 = explicit
  },

  // Popularity and trend scores
  popularityScore: {
    type: Number,
    default: 0,
    min: 0
    // Calculated based on overall mentions, engagement, etc.
  },
  currentTrendScore: {
    type: Number,
    default: 0,
    min: 0,
    index: true
    // Recent velocity score - how trending is this right now
  },

  // Hashtag associations
  hashtagAssociations: [{
    hashtag: String,
    platform: {
      type: String,
      enum: ['tiktok', 'instagram', 'youtube_shorts', 'all']
    },
    frequency: Number
  }],

  // Community sentiment
  communitySentiment: {
    overall: {
      type: String,
      enum: ['positive', 'neutral', 'negative', 'mixed', 'polarizing'],
      default: 'neutral'
    },
    positiveKeywords: [String],
    negativeKeywords: [String],
    lastAnalyzed: Date
  },

  // External IDs
  goodreadsId: {
    type: String,
    trim: true,
    index: true
  },
  amazonId: {
    type: String,
    trim: true
  },

  // Media
  coverImageUrl: {
    type: String,
    trim: true
  },

  // Publication info
  publishedDate: {
    type: Date,
    index: true
  },

  // Genre/subgenre
  genre: {
    type: String,
    trim: true,
    enum: ['romance', 'fantasy_romance', 'contemporary_romance', 'historical_romance', 'paranormal_romance', 'romantic_suspense', 'erotica', 'other']
  },
  subgenre: [String],

  // Content characteristics
  contentWarnings: [String],
  themes: [String],

  // Performance tracking
  performanceHistory: [{
    date: {
      type: Date,
      default: Date.now
    },
    mentionCount: Number,
    avgEngagementRate: Number,
    trendVelocity: Number,
    platformBreakdown: {
      tiktok: { mentionCount: Number, avgEngagementRate: Number },
      instagram: { mentionCount: Number, avgEngagementRate: Number },
      youtube_shorts: { mentionCount: Number, avgEngagementRate: Number }
    }
  }],

  // Content angles that work for this book
  provenAngles: [{
    angle: String,
    usageCount: Number,
    avgEngagementRate: Number,
    examples: [String]
  }],

  // Related books
  alsoKnownAs: [String], // Alternate titles
  similarBooks: [{
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MarketingBook'
    },
    similarityScore: Number,
    reason: String
  }],

  // Metadata
  firstDiscoveredAt: {
    type: Date,
    default: Date.now
  },
  lastMentionedAt: {
    type: Date,
    default: Date.now
  },
  lastTrendUpdate: {
    type: Date,
    default: Date.now
  },
  active: {
    type: Boolean,
    default: true,
    index: true
  },
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
marketingBookSchema.index({ title: 1, author: 1 }, { unique: true }); // Unique combination
marketingBookSchema.index({ tropes: 1, currentTrendScore: -1 }); // Find trending by trope
marketingBookSchema.index({ spiceLevel: 1, currentTrendScore: -1 }); // Find trending by spice level
marketingBookSchema.index({ genre: 1, currentTrendScore: -1 });
marketingBookSchema.index({ active: 1, currentTrendScore: -1 });
marketingBookSchema.index({ lastMentionedAt: -1 });

// Update the updatedAt timestamp before saving
marketingBookSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to find or create a book
marketingBookSchema.statics.findOrCreate = function(bookData) {
  return this.findOne({ title: bookData.title, author: bookData.author })
    .then(book => {
      if (book) {
        // Update existing book with new data
        Object.assign(book, bookData);
        return book.save();
      }
      // Create new book
      return this.create(bookData);
    });
};

// Static method to get trending books
marketingBookSchema.statics.getTrendingBooks = function(limit = 20, filters = {}) {
  const query = { active: true };

  if (filters.genre) query.genre = filters.genre;
  if (filters.spiceLevel !== undefined) query.spiceLevel = filters.spiceLevel;
  if (filters.trope) query.tropes = filters.trope;
  if (filters.minTrendScore) query.currentTrendScore = { $gte: filters.minTrendScore };

  return this.find(query)
    .sort({ currentTrendScore: -1, lastMentionedAt: -1 })
    .limit(limit)
    .lean();
};

// Static method to search books by query
marketingBookSchema.statics.searchBooks = function(searchTerm, limit = 20) {
  return this.find({
    active: true,
    $or: [
      { title: { $regex: searchTerm, $options: 'i' } },
      { author: { $regex: searchTerm, $options: 'i' } },
      { series: { $regex: searchTerm, $options: 'i' } },
      { tropes: { $regex: searchTerm, $options: 'i' } }
    ]
  })
    .sort({ currentTrendScore: -1 })
    .limit(limit)
    .lean();
};

// Static method to get books by trope
marketingBookSchema.statics.getBooksByTrope = function(trope, options = {}) {
  const {
    spiceLevel,
    limit = 20,
    sortBy = 'currentTrendScore'
  } = options;

  const query = {
    active: true,
    tropes: trope
  };

  if (spiceLevel !== undefined) {
    query.spiceLevel = spiceLevel;
  }

  const sort = {};
  sort[sortBy] = -1;

  return this.find(query)
    .sort(sort)
    .limit(limit)
    .lean();
};

// Instance method to update trend score
marketingBookSchema.methods.updateTrendScore = function(newScore) {
  this.currentTrendScore = newScore;
  this.lastTrendUpdate = new Date();
  this.lastMentionedAt = new Date();

  // Add to performance history
  this.performanceHistory = this.performanceHistory || [];
  this.performanceHistory.push({
    date: new Date(),
    mentionCount: this.performanceHistory.length > 0 ?
      this.performanceHistory[this.performanceHistory.length - 1].mentionCount + 1 : 1,
    trendVelocity: newScore
  });

  // Keep only last 90 days of history
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  this.performanceHistory = this.performanceHistory.filter(h => h.date >= ninetyDaysAgo);

  return this.save();
};

// Instance method to add proven angle
marketingBookSchema.methods.addProvenAngle = function(angle, engagementRate) {
  this.provenAngles = this.provenAngles || [];

  const existingAngle = this.provenAngles.find(a => a.angle === angle);

  if (existingAngle) {
    existingAngle.usageCount++;
    // Update average engagement rate
    existingAngle.avgEngagementRate =
      (existingAngle.avgEngagementRate * (existingAngle.usageCount - 1) + engagementRate) /
      existingAngle.usageCount;
  } else {
    this.provenAngles.push({
      angle,
      usageCount: 1,
      avgEngagementRate: engagementRate,
      examples: []
    });
  }

  return this.save();
};

const MarketingBook = mongoose.model('MarketingBook', marketingBookSchema, 'marketing_books');

export default MarketingBook;
