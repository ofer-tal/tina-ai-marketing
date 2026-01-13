/**
 * Audio Extraction API Routes
 *
 * Endpoints for extracting audio excerpts from story chapters
 * for use in video backgrounds.
 */

import express from 'express';
import audioExtractionService from '../services/audioExtractionService.js';
import Story from '../models/Story.js';
import { getLogger } from '../utils/logger.js';

const router = express.Router();
const logger = getLogger('api', 'audio');

/**
 * POST /api/audio/extract
 * Extract audio excerpt from story chapter
 *
 * Request body:
 * - storyId: Story ID (required if chapter not provided)
 * - chapterNumber: Chapter number (default: 1)
 * - audioPath: Direct path to audio file (optional, overrides story/chapter)
 * - duration: Excerpt duration in seconds (15-30, default: 20)
 * - position: Segment position - 'beginning', 'middle', 'end', 'random' (default: 'beginning')
 * - outputFormat: Output format - 'mp3', 'wav', 'm4a' (default: 'mp3')
 */
router.post('/extract', async (req, res) => {
  try {
    const {
      storyId,
      chapterNumber = 1,
      audioPath,
      duration = 20,
      position = 'beginning',
      outputFormat = 'mp3'
    } = req.body;

    // Validate duration
    if (duration < 15 || duration > 30) {
      return res.status(400).json({
        error: 'Duration must be between 15 and 30 seconds'
      });
    }

    // Validate position
    const validPositions = ['beginning', 'middle', 'end', 'random'];
    if (!validPositions.includes(position)) {
      return res.status(400).json({
        error: `Position must be one of: ${validPositions.join(', ')}`
      });
    }

    // Validate output format
    const validFormats = ['mp3', 'wav', 'm4a'];
    if (!validFormats.includes(outputFormat)) {
      return res.status(400).json({
        error: `Output format must be one of: ${validFormats.join(', ')}`
      });
    }

    let sourceAudioPath = audioPath;

    // If audioPath not provided, get from story chapter
    if (!sourceAudioPath) {
      if (!storyId) {
        return res.status(400).json({
          error: 'Either audioPath or storyId is required'
        });
      }

      // Find story
      const story = await Story.findById(storyId);
      if (!story) {
        return res.status(404).json({
          error: 'Story not found'
        });
      }

      // Get chapter
      const chapter = story.chapters.find(ch => ch.chapterNumber === chapterNumber);
      if (!chapter) {
        return res.status(404).json({
          error: `Chapter ${chapterNumber} not found`
        });
      }

      // Check if chapter has audio
      if (!chapter.audioPath) {
        // Return text excerpt for TTS as fallback
        logger.info('No audio found for chapter, returning text excerpt', {
          storyId,
          chapterNumber
        });

        const textExcerpt = audioExtractionService.extractTextExcerpt(chapter, 200);

        return res.json({
          success: true,
          method: 'text-excerpt',
          text: textExcerpt.text,
          length: textExcerpt.length,
          message: 'Chapter has no audio file. Use text for TTS generation.'
        });
      }

      sourceAudioPath = chapter.audioPath;
    }

    // Extract audio excerpt
    const result = await audioExtractionService.extractExcerpt({
      audioPath: sourceAudioPath,
      duration,
      position,
      outputFormat,
      storyId,
      chapterNumber
    });

    logger.info('Audio excerpt extracted successfully', {
      storyId,
      chapterNumber,
      excerptPath: result.excerptPath,
      duration: result.duration
    });

    res.json(result);

  } catch (error) {
    logger.error('Failed to extract audio excerpt', {
      error: error.message,
      storyId: req.body.storyId,
      chapterNumber: req.body.chapterNumber
    });

    res.status(500).json({
      error: 'Failed to extract audio excerpt',
      message: error.message
    });
  }
});

/**
 * POST /api/audio/extract-text
 * Extract text excerpt from chapter for TTS
 *
 * Request body:
 * - storyId: Story ID (required)
 * - chapterNumber: Chapter number (default: 1)
 * - targetLength: Target character length (default: 200)
 */
router.post('/extract-text', async (req, res) => {
  try {
    const {
      storyId,
      chapterNumber = 1,
      targetLength = 200
    } = req.body;

    if (!storyId) {
      return res.status(400).json({
        error: 'storyId is required'
      });
    }

    // Find story
    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        error: 'Story not found'
      });
    }

    // Get chapter
    const chapter = story.chapters.find(ch => ch.chapterNumber === chapterNumber);
    if (!chapter) {
      return res.status(404).json({
        error: `Chapter ${chapterNumber} not found`
      });
    }

    // Extract text excerpt
    const result = audioExtractionService.extractTextExcerpt(chapter, targetLength);

    logger.info('Text excerpt extracted', {
      storyId,
      chapterNumber,
      length: result.length
    });

    res.json(result);

  } catch (error) {
    logger.error('Failed to extract text excerpt', {
      error: error.message,
      storyId: req.body.storyId
    });

    res.status(500).json({
      error: 'Failed to extract text excerpt',
      message: error.message
    });
  }
});

/**
 * GET /api/audio/health
 * Check FFmpeg availability
 */
router.get('/health', async (req, res) => {
  try {
    const health = await audioExtractionService.healthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({
      error: 'Health check failed',
      message: error.message
    });
  }
});

/**
 * GET /api/audio/status
 * Get audio extraction service status
 */
router.get('/status', async (req, res) => {
  try {
    const health = await audioExtractionService.healthCheck();

    res.json({
      service: 'audio-extraction',
      status: health.healthy ? 'available' : 'unavailable',
      ffmpeg: {
        available: health.healthy,
        version: health.version
      },
      supportedFormats: ['mp3', 'wav', 'm4a', 'aac'],
      excerptDurations: {
        min: 15,
        max: 30,
        default: 20
      },
      positions: ['beginning', 'middle', 'end', 'random']
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get service status',
      message: error.message
    });
  }
});

/**
 * DELETE /api/audio/cleanup
 * Clean up old audio excerpts
 *
 * Query params:
 * - daysOld: Delete excerpts older than this many days (default: 7)
 */
router.delete('/cleanup', async (req, res) => {
  try {
    const daysOld = parseInt(req.query.daysOld) || 7;

    if (daysOld < 1) {
      return res.status(400).json({
        error: 'daysOld must be at least 1'
      });
    }

    const result = await audioExtractionService.cleanupOldExcerpts(daysOld);

    logger.info('Audio cleanup completed', {
      daysOld,
      deletedCount: result.deletedCount
    });

    res.json({
      success: true,
      deletedCount: result.deletedCount,
      daysOld
    });

  } catch (error) {
    logger.error('Failed to cleanup audio excerpts', {
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to cleanup audio excerpts',
      message: error.message
    });
  }
});

export default router;
