/**
 * Tina ID Generator Utility
 *
 * Generates human-readable IDs for Tina's strategic memory entities.
 * Format: {prefix}_{timestamp}_{random}
 *
 * Examples:
 * - strategy_1738456789_a3b2
 * - goal_1738456789_c4d1
 * - experiment_1738456789_e5f6
 */

/**
 * Generate a human-readable ID for Tina entities
 *
 * @param {string} prefix - The entity type prefix (e.g., 'strategy', 'goal', 'experiment')
 * @returns {string} A human-readable ID in format: {prefix}_{timestamp}_{random}
 */
export function generateTinaId(prefix) {
  const timestamp = Math.floor(Date.now() / 1000);
  const random = Math.random().toString(36).substring(2, 6);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Generate a strategy ID
 *
 * @returns {string} A strategy ID
 */
export function generateStrategyId() {
  return generateTinaId('strategy');
}

/**
 * Generate a goal ID
 *
 * @returns {string} A goal ID
 */
export function generateGoalId() {
  return generateTinaId('goal');
}

/**
 * Generate an experiment ID
 *
 * @returns {string} An experiment ID
 */
export function generateExperimentId() {
  return generateTinaId('experiment');
}

/**
 * Generate a learning ID
 *
 * @returns {string} A learning ID
 */
export function generateLearningId() {
  return generateTinaId('learning');
}

/**
 * Generate an observation ID
 *
 * @returns {string} An observation ID
 */
export function generateObservationId() {
  return generateTinaId('observation');
}

/**
 * Generate a thought log ID
 *
 * @returns {string} A thought log ID
 */
export function generateThoughtLogId() {
  return generateTinaId('thought');
}

/**
 * Generate a plan ID
 *
 * @returns {string} A plan ID
 */
export function generatePlanId() {
  return generateTinaId('plan');
}

/**
 * Generate a reflection ID
 *
 * @returns {string} A reflection ID
 */
export function generateReflectionId() {
  return generateTinaId('reflection');
}

/**
 * Extract timestamp from a Tina ID
 *
 * @param {string} tinaId - A Tina ID string
 * @returns {number|null} The Unix timestamp extracted from the ID, or null if invalid
 */
export function extractTimestamp(tinaId) {
  const parts = tinaId.split('_');
  if (parts.length >= 2) {
    const timestamp = parseInt(parts[parts.length - 2], 10);
    if (!isNaN(timestamp)) {
      return timestamp;
    }
  }
  return null;
}

/**
 * Extract prefix from a Tina ID
 *
 * @param {string} tinaId - A Tina ID string
 * @returns {string|null} The prefix extracted from the ID, or null if invalid
 */
export function extractPrefix(tinaId) {
  const parts = tinaId.split('_');
  if (parts.length >= 3) {
    return parts[0];
  }
  return null;
}

export default {
  generateTinaId,
  generateStrategyId,
  generateGoalId,
  generateExperimentId,
  generateLearningId,
  generateObservationId,
  generateThoughtLogId,
  generatePlanId,
  generateReflectionId,
  extractTimestamp,
  extractPrefix
};
