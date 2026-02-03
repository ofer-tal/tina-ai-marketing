/**
 * Music API Routes
 *
 * Endpoints for managing AI-generated background music tracks:
 * - POST /api/music/generate - Generate a new music track
 * - GET /api/music/list - List all available music tracks
 * - GET /api/music/:id - Get details of a specific track
 * - DELETE /api/music/:id - Delete a music track
 */

import express from 'express';
import { getLogger } from '../utils/logger.js';
import Music from '../models/Music.js';
import falAiMusicService from '../services/falAiMusicService.js';

const router = express.Router();
const logger = getLogger('api', 'music');

/**
 * POST /api/music/generate
 * Generate a new music track
 *
 * Body: { name: string, prompt: string, style: string }
 */
router.post('/generate', async (req, res) => {
  const { name, prompt, style } = req.body;

  // Validate required fields
  if (!name || !name.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Name is required'
    });
  }

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Prompt is required'
    });
  }

  if (!style || !falAiMusicService.STYLE_PROMPTS[style]) {
    return res.status(400).json({
      success: false,
      error: `Invalid style. Must be one of: ${Object.keys(falAiMusicService.STYLE_PROMPTS).join(', ')}`
    });
  }

  if (!falAiMusicService.isConfigured()) {
    return res.status(500).json({
      success: false,
      error: 'FAL_AI_API_KEY not configured'
    });
  }

  try {
    // Create music record with generating status
    const music = new Music({
      name: name.trim(),
      prompt: prompt.trim(),
      style,
      status: 'generating'
    });
    await music.save();

    logger.info('Music generation started', { musicId: music._id, name, style });

    // Generate in background
    setImmediate(async () => {
      try {
        const result = await falAiMusicService.generateInstrumentalMusic(
          prompt.trim(),
          style
        );

        if (result.success) {
          // Get actual duration
          const duration = await falAiMusicService.getAudioDuration(result.path);

          music.audioPath = result.url;
          music.duration = duration || result.duration;
          music.status = 'available';
          await music.save();

          logger.info('Music generation complete', {
            musicId: music._id,
            path: result.path,
            duration
          });
        } else {
          music.status = 'failed';
          music.error = result.error;
          await music.save();

          logger.error('Music generation failed', {
            musicId: music._id,
            error: result.error
          });
        }
      } catch (error) {
        music.status = 'failed';
        music.error = error.message;
        await music.save();

        logger.error('Music generation error', {
          musicId: music._id,
          error: error.message,
          stack: error.stack
        });
      }
    });

    res.json({
      success: true,
      data: {
        musicId: music._id.toString(),
        status: 'generating',
        message: 'Music generation started. Check back shortly.'
      }
    });
  } catch (error) {
    logger.error('Failed to start music generation', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/music/list
 * List all available music tracks
 *
 * Query params:
 * - style: Filter by style (optional)
 * - status: Filter by status (default: 'available')
 * - limit: Max number of tracks (default: 100)
 */
router.get('/list', async (req, res) => {
  try {
    const { style, status = 'available', limit = '100' } = req.query;

    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    if (style && style !== 'all') {
      query.style = style;
    }

    const tracks = await Music.find(query)
      .sort({ timesUsed: -1, createdAt: -1 })
      .limit(Math.min(parseInt(limit), 500));

    logger.info('Music tracks retrieved', { count: tracks.length, style, status });

    res.json({
      success: true,
      data: {
        tracks: tracks.map(t => ({
          id: t._id.toString(),
          name: t.name,
          style: t.style,
          prompt: t.prompt,
          audioPath: t.audioPath,
          duration: t.duration,
          status: t.status,
          timesUsed: t.timesUsed,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt
        }))
      }
    });
  } catch (error) {
    logger.error('Failed to list music tracks', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/music/:id
 * Get details of a specific music track
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const music = await Music.findById(id);
    if (!music) {
      return res.status(404).json({
        success: false,
        error: 'Music track not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: music._id.toString(),
        name: music.name,
        style: music.style,
        prompt: music.prompt,
        audioPath: music.audioPath,
        duration: music.duration,
        status: music.status,
        timesUsed: music.timesUsed,
        error: music.error,
        createdAt: music.createdAt,
        updatedAt: music.updatedAt
      }
    });
  } catch (error) {
    logger.error('Failed to get music track', {
      musicId: req.params.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/music/:id
 * Delete a music track
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const music = await Music.findById(id);
    if (!music) {
      return res.status(404).json({
        success: false,
        error: 'Music track not found'
      });
    }

    // Delete audio file from disk
    if (music.audioPath) {
      await falAiMusicService.deleteMusicFile(music.audioPath);
    }

    await Music.deleteOne({ _id: id });

    logger.info('Music track deleted', { musicId: id, name: music.name });

    res.json({
      success: true,
      message: 'Music track deleted'
    });
  } catch (error) {
    logger.error('Failed to delete music track', {
      musicId: req.params.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/music/styles
 * Get available music styles
 */
router.get('/meta/styles', (_req, res) => {
  res.json({
    success: true,
    data: {
      styles: Object.keys(falAiMusicService.STYLE_PROMPTS).map(key => ({
        id: key,
        name: key.charAt(0).toUpperCase() + key.slice(1),
        description: falAiMusicService.STYLE_PROMPTS[key]
      }))
    }
  });
});

export default router;
