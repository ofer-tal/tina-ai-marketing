/**
 * Duration Controller Module
 *
 * Controls video length by adjusting extracted text length to hit target duration.
 * Iteratively adjusts text length until TTS duration is within acceptable range.
 *
 * Target: 15-30 seconds for optimal social media engagement
 */

import { getLogger } from '../../utils/logger.js';
import * as runPodTTSGenerator from '../runPodTTSGenerator.js';
import fs from 'fs/promises';
import path from 'path';

const logger = getLogger('services', 'duration-controller');

// Duration constraints (in seconds)
export const MIN_DURATION = 15;
export const MAX_DURATION = 30;
export const TARGET_DURATION = 22;

// Text length bounds (in characters)
export const MIN_TEXT_LENGTH = 100;
export const MAX_TEXT_LENGTH = 600;

// Maximum adjustment iterations
export const MAX_ATTEMPTS = 3;

// Starting text length for first attempt
export const INITIAL_TEXT_LENGTH = 300;

/**
 * Fetch story scene text with duration control
 * Iteratively adjusts text length until narration duration is in range
 *
 * @param {Object} story - Story object from database
 * @param {Function} fetchStoryScene - Function to fetch scene text
 * @param {Object} options - Options
 * @returns {Promise<Object>} Result with text, duration, and metadata
 */
export async function extractTextForDuration(
  story,
  fetchStoryScene,
  options = {}
) {
  const {
    minDuration = MIN_DURATION,
    maxDuration = MAX_DURATION,
    targetDuration = TARGET_DURATION,
    maxAttempts = MAX_ATTEMPTS,
    initialLength = INITIAL_TEXT_LENGTH,
    minTextLength = MIN_TEXT_LENGTH,
    maxTextLength = MAX_TEXT_LENGTH,
    voice = 'female_1'
  } = options;

  let attempt = 0;
  let textLength = initialLength;
  let currentText = '';
  let actualDuration = 0;
  let ttsResult = null;

  logger.info('Starting duration-controlled text extraction', {
    storyId: story?._id,
    targetDuration,
    minDuration,
    maxDuration,
    initialLength
  });

  while (attempt < maxAttempts) {
    attempt++;

    // Extract text with current length target
    try {
      currentText = await fetchStoryScene(story, textLength);

      if (!currentText || currentText.length < 50) {
        logger.warn('Extracted text too short, using fallback');
        currentText = story?.description?.substring(0, textLength) || 'A romantic story unfolds...';
      }

      // Create temp path for TTS
      const tempDir = path.join(process.cwd(), 'storage', 'temp', 'narration');
      await fs.mkdir(tempDir, { recursive: true });
      const tempPath = path.join(tempDir, `duration_check_${Date.now()}_attempt${attempt}.wav`);

      // Generate TTS to check duration
      ttsResult = await runPodTTSGenerator.generateForStory(story, currentText, {
        voice,
        outputPath: tempPath
      });

      actualDuration = ttsResult.duration;

      logger.info('Duration check attempt', {
        attempt,
        textLength,
        actualDuration: actualDuration.toFixed(1),
        targetRange: `${minDuration}-${maxDuration}s`
      });

      // Check if in range
      if (actualDuration >= minDuration && actualDuration <= maxDuration) {
        logger.info('Duration within target range', {
          duration: actualDuration.toFixed(1),
          attempts: attempt
        });

        // Clean up temp file
        try {
          await fs.unlink(tempPath);
        } catch {
          // Ignore cleanup errors
        }

        return {
          text: currentText,
          duration: actualDuration,
          attempts: attempt,
          success: true,
          inRange: true
        };
      }

      // Adjust text length for next attempt
      const ratio = targetDuration / actualDuration;
      const newLength = Math.round(textLength * ratio);

      // Clamp text length to reasonable bounds
      textLength = Math.max(minTextLength, Math.min(maxTextLength, newLength));

      logger.info('Adjusting text length', {
        attempt,
        oldLength: currentText.length,
        newLength: textLength,
        ratio: ratio.toFixed(2),
        actualDuration: actualDuration.toFixed(1)
      });

      // Clean up temp file for next attempt
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }

    } catch (error) {
      logger.error('Error during duration check attempt', {
        attempt,
        error: error.message
      });

      // If this is the last attempt, continue with what we have
      if (attempt >= maxAttempts) {
        break;
      }

      // Adjust text length for retry
      textLength = Math.round(textLength * 0.8); // Reduce length on error
      textLength = Math.max(minTextLength, textLength);
    }
  }

  // Best effort after max attempts
  const finalDuration = ttsResult?.duration || estimateDurationFromText(currentText);

  logger.warn('Max attempts reached, returning best effort', {
    finalDuration: finalDuration.toFixed(1),
    targetRange: `${minDuration}-${maxDuration}s`,
    attempts: attempt,
    textLength: currentText.length
  });

  return {
    text: currentText,
    duration: finalDuration,
    attempts: maxAttempts,
    success: true,
    inRange: finalDuration >= minDuration && finalDuration <= maxDuration
  };
}

/**
 * Estimate duration from text length
 * Approximate: 150 words per minute, ~5 characters per word
 *
 * @param {string} text - Text to estimate
 * @returns {number} Estimated duration in seconds
 */
export function estimateDurationFromText(text) {
  if (!text) return 15;

  const wordCount = text.split(/\s+/).length;
  const wordsPerMinute = 150;
  const minutes = wordCount / wordsPerMinute;
  const seconds = minutes * 60;

  // Clamp to reasonable range
  return Math.max(10, Math.min(45, seconds));
}

/**
 * Check if a duration is within acceptable range
 *
 * @param {number} duration - Duration in seconds
 * @param {Object} options - Options with min/max duration
 * @returns {boolean} True if duration is in range
 */
export function isDurationInRange(duration, options = {}) {
  const {
    minDuration = MIN_DURATION,
    maxDuration = MAX_DURATION
  } = options;

  return duration >= minDuration && duration <= maxDuration;
}

/**
 * Get recommended text length for target duration
 *
 * @param {number} targetSeconds - Target duration in seconds
 * @returns {number} Recommended text length in characters
 */
export function getRecommendedTextLength(targetSeconds = TARGET_DURATION) {
  // Assume ~5 characters per word, 150 words per minute
  const wordsPerSecond = 150 / 60;
  const targetWords = targetSeconds * wordsPerSecond;
  const targetChars = targetWords * 5;

  return Math.round(targetChars);
}

export default {
  MIN_DURATION,
  MAX_DURATION,
  TARGET_DURATION,
  MIN_TEXT_LENGTH,
  MAX_TEXT_LENGTH,
  MAX_ATTEMPTS,
  INITIAL_TEXT_LENGTH,
  extractTextForDuration,
  estimateDurationFromText,
  isDurationInRange,
  getRecommendedTextLength
};
