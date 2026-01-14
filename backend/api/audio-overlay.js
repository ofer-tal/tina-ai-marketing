/**
 * Audio Overlay API Routes
 *
 * Endpoints for overlaying audio tracks onto videos.
 */

import express from 'express';
import audioOverlayService from '../services/audioOverlayService.js';
import { getLogger } from '../utils/logger.js';

const router = express.Router();
const logger = getLogger('api', 'audio-overlay');

/**
 * POST /api/audio-overlay/add
 * Add audio track to video
 *
 * Request body:
 * - videoPath: Path to input video file (required)
 * - audioPath: Path to audio file to add (required)
 * - outputPath: Path for output video (optional, auto-generated if not provided)
 * - mode: Overlay mode - 'replace', 'mix', 'add' (default: 'replace')
 * - volume: Audio volume 0.0-1.0 (default: 1.0)
 * - fadeIn: Fade in duration in seconds (default: 0)
 * - fadeOut: Fade out duration in seconds (default: 0)
 * - audioStart: Audio start time in seconds (default: 0)
 * - loopAudio: Loop audio if shorter than video (default: false)
 */
router.post('/add', async (req, res) => {
  try {
    const {
      videoPath,
      audioPath,
      outputPath,
      mode = 'replace',
      volume = 1.0,
      fadeIn = 0,
      fadeOut = 0,
      audioStart = 0,
      loopAudio = false
    } = req.body;

    // Validate required fields
    if (!videoPath) {
      return res.status(400).json({
        success: false,
        error: 'videoPath is required'
      });
    }

    if (!audioPath) {
      return res.status(400).json({
        success: false,
        error: 'audioPath is required'
      });
    }

    // Validate volume
    if (volume < 0 || volume > 1) {
      return res.status(400).json({
        success: false,
        error: 'volume must be between 0 and 1'
      });
    }

    // Validate mode
    const validModes = ['replace', 'mix', 'add'];
    if (!validModes.includes(mode)) {
      return res.status(400).json({
        success: false,
        error: `mode must be one of: ${validModes.join(', ')}`
      });
    }

    logger.info('Audio overlay requested', {
      videoPath,
      audioPath,
      mode,
      volume
    });

    const result = await audioOverlayService.addAudioToVideo({
      videoPath,
      audioPath,
      outputPath,
      mode,
      volume,
      fadeIn,
      fadeOut,
      audioStart,
      loopAudio
    });

    if (!result.success) {
      return res.status(500).json(result);
    }

    logger.info('Audio overlay completed', {
      outputPath: result.outputPath,
      videoDuration: result.videoDuration
    });

    res.json(result);
  } catch (error) {
    logger.error('Failed to add audio overlay', {
      error: error.message,
      body: req.body
    });

    res.status(500).json({
      success: false,
      error: 'Failed to add audio overlay',
      message: error.message
    });
  }
});

/**
 * POST /api/audio-overlay/verify-sync
 * Verify audio synchronization in video
 *
 * Request body:
 * - videoPath: Path to video file to verify
 */
router.post('/verify-sync', async (req, res) => {
  try {
    const { videoPath } = req.body;

    if (!videoPath) {
      return res.status(400).json({
        success: false,
        error: 'videoPath is required'
      });
    }

    logger.info('Audio sync verification requested', { videoPath });

    const result = await audioOverlayService.verifyAudioSync(videoPath);

    res.json(result);
  } catch (error) {
    logger.error('Failed to verify audio sync', {
      error: error.message,
      videoPath: req.body.videoPath
    });

    res.status(500).json({
      success: false,
      error: 'Failed to verify audio sync',
      message: error.message
    });
  }
});

/**
 * POST /api/audio-overlay/replace-audio
 * Replace audio in video (convenience endpoint)
 *
 * Request body:
 * - videoPath: Path to input video (required)
 * - audioPath: Path to new audio file (required)
 * - outputPath: Path for output video (optional)
 * - volume: Audio volume 0.0-1.0 (default: 1.0)
 */
router.post('/replace-audio', async (req, res) => {
  try {
    const {
      videoPath,
      audioPath,
      outputPath,
      volume = 1.0
    } = req.body;

    if (!videoPath || !audioPath) {
      return res.status(400).json({
        success: false,
        error: 'videoPath and audioPath are required'
      });
    }

    logger.info('Audio replacement requested', { videoPath, audioPath });

    const result = await audioOverlayService.addAudioToVideo({
      videoPath,
      audioPath,
      outputPath,
      mode: 'replace',
      volume
    });

    res.json(result);
  } catch (error) {
    logger.error('Failed to replace audio', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to replace audio',
      message: error.message
    });
  }
});

/**
 * POST /api/audio-overlay/mix-audio
 * Mix new audio with existing video audio (convenience endpoint)
 *
 * Request body:
 * - videoPath: Path to input video (required)
 * - audioPath: Path to audio file to mix (required)
 * - outputPath: Path for output video (optional)
 * - volume: New audio volume 0.0-1.0 (default: 0.5)
 */
router.post('/mix-audio', async (req, res) => {
  try {
    const {
      videoPath,
      audioPath,
      outputPath,
      volume = 0.5
    } = req.body;

    if (!videoPath || !audioPath) {
      return res.status(400).json({
        success: false,
        error: 'videoPath and audioPath are required'
      });
    }

    logger.info('Audio mixing requested', { videoPath, audioPath, volume });

    const result = await audioOverlayService.addAudioToVideo({
      videoPath,
      audioPath,
      outputPath,
      mode: 'mix',
      volume
    });

    res.json(result);
  } catch (error) {
    logger.error('Failed to mix audio', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to mix audio',
      message: error.message
    });
  }
});

/**
 * POST /api/audio-overlay/cleanup
 * Clean up temporary files
 */
router.post('/cleanup', async (req, res) => {
  try {
    logger.info('Cleanup requested');

    await audioOverlayService.cleanup();

    res.json({
      success: true,
      message: 'Temporary files cleaned up'
    });
  } catch (error) {
    logger.error('Failed to cleanup', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to cleanup',
      message: error.message
    });
  }
});

/**
 * GET /api/audio-overlay/health
 * Check service health and FFmpeg/FFprobe availability
 */
router.get('/health', async (req, res) => {
  try {
    const health = await audioOverlayService.healthCheck();

    res.json(health);
  } catch (error) {
    res.status(500).json({
      healthy: false,
      error: error.message
    });
  }
});

export default router;
