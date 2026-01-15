import mongoose from 'mongoose';

/**
 * AppUser Model - Read-only access to the main app's users collection
 * This model provides read-only access to the users collection from the main app database
 */
const appUserSchema = new mongoose.Schema({
  // Read-only schema - matches the main app's users collection structure
  _id: mongoose.Schema.Types.ObjectId,
  email: String,
  subscriptionStatus: String,
  subscriptionType: String,
  createdAt: Date,
  lastActiveAt: Date,
  // Add other fields as needed based on actual app schema
}, {
  collection: 'users',
  timestamps: false, // Use existing timestamps from app
  read: true, // Read-only access
  write: false // Prevent writes
});

// Prevent write operations
appUserSchema.pre('save', function(next) {
  next(new Error('Read-only model: Cannot save to app collections'));
});

appUserSchema.pre('remove', function(next) {
  next(new Error('Read-only model: Cannot delete from app collections'));
});

const AppUser = mongoose.model('AppUser', appUserSchema);

export default AppUser;
