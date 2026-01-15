import mongoose from 'mongoose';

/**
 * AppStoreTransaction Model - Read-only access to the main app's appstore-transactions collection
 * This model provides read-only access to the appstore transactions from the main app database
 */
const appStoreTransactionSchema = new mongoose.Schema({
  // Read-only schema - matches the main app's appstore-transactions collection structure
  _id: mongoose.Schema.Types.ObjectId,
  transactionId: String,
  originalTransactionId: String,
  productId: String,
  userId: mongoose.Schema.Types.ObjectId,
  quantity: Number,
  purchaseDate: Date,
  expiresDate: Date,
  status: String,
  // Add other fields as needed based on actual app schema
}, {
  collection: 'appstore-transactions',
  timestamps: false, // Use existing timestamps from app
  read: true, // Read-only access
  write: false // Prevent writes
});

// Prevent write operations
appStoreTransactionSchema.pre('save', function(next) {
  next(new Error('Read-only model: Cannot save to app collections'));
});

appStoreTransactionSchema.pre('remove', function(next) {
  next(new Error('Read-only model: Cannot delete from app collections'));
});

const AppStoreTransaction = mongoose.model('AppStoreTransaction', appStoreTransactionSchema);

export default AppStoreTransaction;
