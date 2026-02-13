import mongoose from 'mongoose';

/**
 * Marketing Settings Model
 *
 * Stores dynamic marketing settings that need to persist across server restarts.
 * Settings are stored as key-value pairs with optional category grouping.
 */

const marketingSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  category: {
    type: String,
    default: 'general'
  },
  description: String,
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: String,
    default: 'system'
  }
}, {
  collection: 'marketing_settings',
  timestamps: true
});

// Indexes for efficient queries
marketingSettingsSchema.index({ key: 1, category: 1 });
marketingSettingsSchema.index({ category: 1, updatedAt: -1 });

/**
 * Static method to get a setting value by key
 * @param {string} key - The setting key
 * @param {*} defaultValue - Default value if key doesn't exist
 * @returns {Promise<*>} The setting value or defaultValue
 */
marketingSettingsSchema.statics.get = async function(key, defaultValue = null) {
  const setting = await this.findOne({ key });
  return setting ? setting.value : defaultValue;
};

/**
 * Static method to set a setting value by key
 * @param {string} key - The setting key
 * @param {*} value - The value to set
 * @param {object} options - Optional parameters
 * @param {string} options.category - Category for grouping settings
 * @param {string} options.description - Human-readable description
 * @param {string} options.updatedBy - Who made this change
 * @returns {Promise<object>} The updated or created setting document
 */
marketingSettingsSchema.statics.set = async function(key, value, options = {}) {
  const { category = 'general', description, updatedBy = 'system' } = options;

  const setting = await this.findOneAndUpdate(
    { key },
    {
      value,
      category,
      description,
      updatedBy,
      updatedAt: new Date()
    },
    { upsert: true, new: true }
  );

  return setting;
};

/**
 * Static method to get all settings in a category
 * @param {string} category - The category to fetch
 * @returns {Promise<Array>} Array of settings in the category
 */
marketingSettingsSchema.statics.getByCategory = async function(category) {
  return await this.find({ category }).sort({ key: 1 });
};

/**
 * Static method to delete a setting
 * @param {string} key - The setting key to delete
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
marketingSettingsSchema.statics.deleteSetting = async function(key) {
  const result = await this.deleteOne({ key });
  return result.deletedCount > 0;
};

const MarketingSettings = mongoose.model('MarketingSettings', marketingSettingsSchema);

export default MarketingSettings;
