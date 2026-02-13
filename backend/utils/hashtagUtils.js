/**
 * Hashtag Utilities
 *
 * Centralized utilities for normalizing and formatting hashtags
 * across the application to ensure consistency.
 *
 * Convention:
 * - Storage: Hashtags stored in database WITHOUT "#" prefix
 * - Posting: Hashtags formatted WITH "#" prefix when posting to platforms
 * - Display: Hashtags formatted WITH "#" prefix for UI display
 *
 * Benefits:
 * - Cleaner database storage (pure text, e.g., "romance" not "#romance")
 * - Easier querying and filtering
 * - Single source of truth for hashtag formatting
 * - No risk of double "##" or missing "#" on platforms
 */

/**
 * Normalize hashtag for storage in database (strips "#" prefix)
 * @param {string|string[]} hashtagOrArray - Single hashtag or array of hashtags
 * @returns {string[]} Array of hashtags without "#" prefix
 */
export function normalizeHashtagsForStorage(hashtagOrArray) {
  const tags = Array.isArray(hashtagOrArray) ? hashtagOrArray : [hashtagOrArray];

  return tags
    .map(tag => tag?.trim().replace(/^#+/, '')) // Strip leading #
    .filter(tag => tag && typeof tag === 'string' && tag.length > 0); // Remove empty/invalid
}

/**
 * Format hashtags for posting to social platforms (ensures "#" prefix)
 * @param {string[]} hashtags - Array of hashtags without "#"
 * @returns {string[]} Array of hashtags with "#" prefix
 */
export function formatHashtagsForPosting(hashtags) {
  if (!Array.isArray(hashtags)) return [];

  return hashtags
    .map(tag => {
      const trimmed = tag?.trim();
      if (!trimmed || typeof trimmed !== 'string') return '';
      // Only add "#" if not already present (handles legacy data)
      return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    })
    .filter(tag => tag.length > 0);
}

/**
 * Format hashtags for display in UI (with "#" prefix)
 * @param {string[]} hashtags - Array of hashtags without "#"
 * @returns {string[]} Array of display-ready hashtags
 */
export function formatHashtagsForDisplay(hashtags) {
  return formatHashtagsForPosting(hashtags);
}
