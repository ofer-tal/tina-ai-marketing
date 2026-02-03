/**
 * Music Track Model
 *
 * Stores AI-generated background music tracks for video production.
 * Tracks are generated via fal.ai minimax-music v2 API.
 */

import mongoose from 'mongoose';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('models', 'music');

const musicSchema = new mongoose.Schema({
  // Track metadata
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },

  // Generation parameters
  prompt: {
    type: String,
    required: true,
    maxlength: 500
  },

  style: {
    type: String,
    required: true,
    enum: ['romantic', 'dramatic', 'energetic', 'calm', 'mysterious', 'happy', 'melancholic', 'ambient']
  },

  // Audio file path (relative to storage/)
  audioPath: {
    type: String,
    required: false,
    validate: {
      validator: function(v) {
        // audioPath is required when status is 'available'
        if (this.status === 'available') {
          return v && v.length > 0;
        }
        return true;
      },
      message: 'audioPath is required when status is available'
    }
  },

  // Duration in seconds
  duration: {
    type: Number,
    min: 0
  },

  // Generation status
  status: {
    type: String,
    enum: ['generating', 'available', 'failed', 'archived'],
    default: 'generating',
    index: true
  },

  // Error message if generation failed
  error: {
    type: String
  },

  // Usage count
  timesUsed: {
    type: Number,
    default: 0
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'marketing_music',
  timestamps: true
});

// Indexes for efficient queries
musicSchema.index({ status: 1, createdAt: -1 });
musicSchema.index({ style: 1, status: 1 });
musicSchema.index({ timesUsed: -1 });

/**
 * Find available music tracks by style
 */
musicSchema.statics.findByStyle = function(style) {
  const query = { status: 'available' };
  if (style && style !== 'all') {
    query.style = style;
  }
  return this.find(query).sort({ timesUsed: -1, createdAt: -1 });
};

/**
 * Increment usage count for a track
 */
musicSchema.methods.incrementUsage = function() {
  this.timesUsed = (this.timesUsed || 0) + 1;
  return this.save();
};

const Music = mongoose.model('Music', musicSchema);

logger.info('Music model initialized');

export default Music;
