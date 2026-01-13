import mongoose from 'mongoose';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'story-model' },
  transports: [
    new winston.transports.File({ filename: 'logs/story-model.log' }),
  ],
});

// Story schema - mirrors the stories collection in the main app database
// This model is for READ-ONLY access to the existing stories collection
const storySchema = new mongoose.Schema({
  // User ID (null = system story, can be used for marketing)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    index: true
  },

  // Story metadata
  title: {
    type: String,
    required: true
  },

  description: {
    type: String,
    default: ''
  },

  // Story category
  category: {
    type: String,
    required: true,
    enum: ['Paranormal', 'Historical', 'Billionaire', 'LGBTQ+', 'Contemporary', 'Fantasy', 'Other'],
    index: true
  },

  // Spiciness level (0-3, where 3 is most explicit)
  spiciness: {
    type: Number,
    required: true,
    min: 0,
    max: 3,
    index: true
  },

  // Status of the story
  status: {
    type: String,
    required: true,
    enum: ['draft', 'ready', 'published', 'archived'],
    default: 'draft',
    index: true
  },

  // Story content
  chapters: [{
    chapterNumber: {
      type: Number,
      required: true
    },
    title: String,
    content: String,
    audioPath: String, // Path to audio excerpt if available
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Cover art prompt
  coverPrompt: {
    type: String,
    default: ''
  },

  // Generated cover art path
  coverPath: {
    type: String,
    default: ''
  },

  // Tags for the story
  tags: [String],

  // Statistics
  views: {
    type: Number,
    default: 0
  },

  likes: {
    type: Number,
    default: 0
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },

  // Published date
  publishedAt: {
    type: Date,
    default: null
  }
}, {
  collection: 'stories', // Connect to the existing stories collection
  timestamps: true
});

// Create indexes for efficient querying
storySchema.index({ userId: 1, status: 1 });
storySchema.index({ status: 1, category: 1 });
storySchema.index({ status: 1, spiciness: 1 });
storySchema.index({ createdAt: -1 });

// Static method to find stories suitable for marketing content generation
storySchema.statics.findForMarketing = async function(options = {}) {
  const {
    excludeCategories = ['LGBTQ+'],
    preferredSpiciness = [1, 2], // Prefer mildly spicy stories
    limit = 10
  } = options;

  const query = {
    userId: null, // Only system stories (no user-generated content)
    status: 'ready' // Only ready stories
  };

  // Exclude certain categories
  if (excludeCategories.length > 0) {
    query.category = { $nin: excludeCategories };
  }

  // Prefer certain spiciness levels, but allow others if needed
  const results = await this.find(query)
    .sort({ spiciness: 1, createdAt: -1 }) // Prefer lower spiciness, newer stories
    .limit(limit * 2) // Get more than needed, then filter
    .lean();

  // Prioritize preferred spiciness levels
  const preferred = results.filter(s => preferredSpiciness.includes(s.spiciness));
  const others = results.filter(s => !preferredSpiciness.includes(s.spiciness));

  return [...preferred, ...others].slice(0, limit);
};

// Static method to check if story is blacklisted
storySchema.statics.isBlacklisted = async function(storyId) {
  const blacklist = mongoose.model('StoryBlacklist');
  const entry = await blacklist.findOne({
    storyId: storyId,
    isActive: true
  });
  return !!entry;
};

const Story = mongoose.model('Story', storySchema);

export default Story;
