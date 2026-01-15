import mongoose from 'mongoose';

/**
 * AppStory Model - Read-only access to the main app's stories collection
 * This model provides read-only access to the stories collection from the main app database
 */
const appStorySchema = new mongoose.Schema({
  // Read-only schema - matches the main app's stories collection structure
  _id: mongoose.Schema.Types.ObjectId,
  title: String,
  content: String,
  tags: [String],
  category: String,
  createdAt: Date,
  updatedAt: Date,
  // Add other fields as needed based on actual app schema
}, {
  collection: 'stories',
  timestamps: false, // Use existing timestamps from app
  read: true, // Read-only access
  write: false // Prevent writes
});

// Prevent write operations
appStorySchema.pre('save', function(next) {
  next(new Error('Read-only model: Cannot save to app collections'));
});

appStorySchema.pre('remove', function(next) {
  next(new Error('Read-only model: Cannot delete from app collections'));
});

const AppStory = mongoose.model('AppStory', appStorySchema);

export default AppStory;
