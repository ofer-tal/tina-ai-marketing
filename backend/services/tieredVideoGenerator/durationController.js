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
export const MAX_ATTEMPTS = 5; // Increased from 3 to 5 for more tries

// Starting text length for first attempt
export const INITIAL_TEXT_LENGTH = 300;

/**
 * Fetch story scene text with duration control
 * Iteratively adjusts text length until narration duration is in range
 *
 * @param {Object} story - Story object from database
 * @param {Function} fetchStoryScene - Function to fetch scene text
 * @param {Object} options - Options
 * @returns {Promise<Object>} Result with text, duration, ttsPath, and metadata
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
  let ttsPath = null;

  logger.info('Starting duration-controlled text extraction', {
    storyId: story?._id,
    targetDuration,
    minDuration,
    maxDuration,
    initialLength,
    maxAttempts
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
        targetRange: `${minDuration}-${maxDuration}s`,
        inRange: actualDuration >= minDuration && actualDuration <= maxDuration,
        likelyTruncated: ttsResult.likelyTruncated || false,
        truncationRatio: ttsResult.metadata?.truncationRatio
      });

      // If TTS likely truncated the text, log a warning and consider this attempt invalid
      if (ttsResult.likelyTruncated) {
        logger.warn('TTS generation appears to have truncated text - this duration measurement may be inaccurate', {
          attempt,
          actualDuration: actualDuration.toFixed(1),
          expectedDuration: ttsResult.metadata?.expectedFromWordCount?.toFixed(1),
          textLength: currentText.length
        });
        // Continue with this attempt but be aware duration may be wrong
      }

      // Check if in range
      if (actualDuration >= minDuration && actualDuration <= maxDuration) {
        logger.info('Duration within target range', {
          duration: actualDuration.toFixed(1),
          attempts: attempt
        });

        // Keep the final TTS file - don't clean it up
        ttsPath = tempPath;

        return {
          text: currentText,
          duration: actualDuration,
          ttsPath: tempPath, // Return the TTS file path for reuse
          attempts: attempt,
          success: true,
          inRange: true
        };
      }

      // NOTE: Keep the duration check files for troubleshooting
      // Previously we cleaned up temp TTS files here, but now we preserve them
      // try {
      //   await fs.unlink(tempPath);
      // } catch {
      //   // Ignore cleanup errors
      // }

      // Adjust text length for next attempt
      // Calculate the ratio needed to reach target duration
      let ratio;
      if (actualDuration < minDuration) {
        // Too short - need more text
        ratio = (targetDuration + 2) / actualDuration; // Add buffer
        logger.info('Duration too short, increasing text length', {
          actualDuration: actualDuration.toFixed(1),
          minDuration,
          ratio: ratio.toFixed(2)
        });
      } else {
        // Too long - need less text
        ratio = (targetDuration - 2) / actualDuration; // Add buffer
        logger.info('Duration too long, decreasing text length', {
          actualDuration: actualDuration.toFixed(1),
          maxDuration,
          ratio: ratio.toFixed(2)
        });
      }

      const newLength = Math.round(textLength * ratio);

      // Clamp text length to reasonable bounds
      textLength = Math.max(minTextLength, Math.min(maxTextLength, newLength));

      logger.info('Adjusting text length for next attempt', {
        attempt,
        oldLength: currentText.length,
        newLength: textLength,
        ratio: ratio.toFixed(2),
        actualDuration: actualDuration.toFixed(1)
      });

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
      textLength = Math.round(textLength * 1.2); // Increase length on error
      textLength = Math.min(maxTextLength, textLength);
    }
  }

  // Best effort after max attempts - use the last TTS generated
  const finalDuration = ttsResult?.duration || estimateDurationFromText(currentText);

  // Generate one final TTS file for use if we don't have one
  if (!ttsPath && currentText) {
    const tempDir = path.join(process.cwd(), 'storage', 'temp', 'narration');
    await fs.mkdir(tempDir, { recursive: true });
    ttsPath = path.join(tempDir, `duration_final_${Date.now()}.wav`);

    try {
      ttsResult = await runPodTTSGenerator.generateForStory(story, currentText, {
        voice,
        outputPath: ttsPath
      });
      actualDuration = ttsResult.duration;
    } catch (error) {
      logger.error('Failed to generate final TTS', { error: error.message });
      ttsPath = null;
    }
  }

  const inRange = actualDuration >= minDuration && actualDuration <= maxDuration;

  // Log the extracted text to verify it's complete
  const textStart = currentText.substring(0, 80);
  const textEnd = currentText.length > 80 ? currentText.substring(currentText.length - 80) : currentText;

  logger.info('Duration control complete', {
    finalDuration: finalDuration.toFixed(2),
    targetRange: `${minDuration}-${maxDuration}s`,
    inRange,
    attempts: attempt,
    textLength: currentText.length,
    ttsPath: ttsPath ? 'generated' : 'failed',
    textStart: textStart.replace(/\n/g, ' '),
    textEnd: textEnd.replace(/\n/g, ' ')
  });

  return {
    text: currentText,
    duration: actualDuration,
    ttsPath: ttsPath,
    attempts: maxAttempts,
    success: true,
    inRange
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
