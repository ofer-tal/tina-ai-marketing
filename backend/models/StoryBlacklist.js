import mongoose from 'mongoose';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'story-blacklist-model' },
  transports: [
    new winston.transports.File({ filename: 'logs/story-blacklist-model.log' }),
  ],
});

// Story Blacklist schema
// Stories that should not be used for marketing content
const storyBlacklistSchema = new mongoose.Schema({
  // Reference to the story in the stories collection
  storyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },

  // Story metadata for quick reference
  storyName: {
    type: String,
    required: true
  },

  // Reason for blacklisting
  reason: {
    type: String,
    required: true
  },

  // When it was blacklisted
  blacklistedAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Who blacklisted it (user or AI)
  blacklistedBy: {
    type: String,
    enum: ['user', 'ai'],
    default: 'user'
  },

  // Story category for filtering
  category: {
    type: String,
    required: true
  },

  // Story spiciness level
  spiciness: {
    type: Number,
    required: true,
    min: 0,
    max: 3
  },

  // Active status (can be reactivated)
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  collection: 'story_blacklist',
  timestamps: true
});

// Create indexes for efficient querying
storyBlacklistSchema.index({ storyId: 1, isActive: 1 });
storyBlacklistSchema.index({ isActive: 1, blacklistedAt: -1 });
storyBlacklistSchema.index({ category: 1, isActive: 1 });

// Static method to add story to blacklist
storyBlacklistSchema.statics.addToBlacklist = async function(storyData) {
  const blacklist = await this.findOneAndUpdate(
    { storyId: storyData.storyId },
    {
      ...storyData,
      isActive: true,
      blacklistedAt: new Date()
    },
    { upsert: true, new: true }
  );

  logger.info('Story added to blacklist', {
    storyId: storyData.storyId,
    storyName: storyData.storyName,
    reason: storyData.reason
  });

  return blacklist;
};

// Static method to remove story from blacklist
storyBlacklistSchema.statics.removeFromBlacklist = async function(storyId) {
  const blacklist = await this.findOneAndUpdate(
    { storyId: storyId },
    { isActive: false },
    { new: true }
  );

  if (blacklist) {
    logger.info('Story removed from blacklist', {
      storyId: storyId,
      storyName: blacklist.storyName
    });
  }

  return blacklist;
};

// Static method to get all active blacklisted story IDs
storyBlacklistSchema.statics.getActiveBlacklistedIds = async function() {
  const entries = await this.find({ isActive: true }).select('storyId').lean();
  return entries.map(e => e.storyId);
};

const StoryBlacklist = mongoose.model('StoryBlacklist', storyBlacklistSchema);

export default StoryBlacklist;
