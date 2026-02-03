/**
 * fal.ai MiniMax Music Generation Service
 *
 * Generates instrumental background music using fal.ai minimax-music v2 API.
 * Music is generated as MP3 files with configurable style and mood.
 */

import fs from 'fs/promises';
import path from 'path';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('services', 'fal-ai-music');

const FAL_AI_API_KEY = process.env.FAL_AI_API_KEY;
const MUSIC_OUTPUT_DIR = path.join(process.cwd(), 'storage', 'audio', 'music');

// Music style descriptions for prompt enhancement
const STYLE_PROMPTS = {
  romantic: 'romantic, emotional, gentle, tender, loving, soft piano or strings',
  dramatic: 'dramatic, cinematic, intense, powerful, orchestral, epic',
  energetic: 'energetic, upbeat, lively, driving, rhythmic, motivational',
  calm: 'calm, peaceful, relaxing, ambient, meditative, gentle',
  mysterious: 'mysterious, enigmatic, atmospheric, intriguing, subtle',
  happy: 'happy, cheerful, bright, optimistic, joyful, positive',
  melancholic: 'melancholic, reflective, somber, bittersweet, nostalgic',
  ambient: 'ambient, atmospheric, textural, background, minimal'
};

/**
 * Get the fal.ai client (lazy import)
 */
async function getClient() {
  const falModule = await import('@fal-ai/client');
  const fal = falModule.fal;
  fal.config({ credentials: FAL_AI_API_KEY });
  return fal;
}

/**
 * Check if the service is configured
 */
function isConfigured() {
  return !!FAL_AI_API_KEY;
}

/**
 * Generate instrumental music track using MiniMax Music v2
 *
 * @param {string} prompt - Music style/mood description (10-300 chars)
 * @param {string} style - Style category for prompt enhancement
 * @returns {Promise<{success: boolean, path?: string, url?: string, filename?: string, duration?: number, error?: string}>}
 */
async function generateInstrumentalMusic(prompt, style = 'ambient') {
  if (!isConfigured()) {
    return {
      success: false,
      error: 'FAL_AI_API_KEY not configured'
    };
  }

  try {
    const fal = await getClient();

    // Style enhancement for better results
    const styleEnhancement = STYLE_PROMPTS[style] || STYLE_PROMPTS.ambient;

    // Prioritize user's prompt in the 300 char limit, add style at the end if space allows
    const basePrompt = prompt.trim();
    let finalPrompt = basePrompt;

    // Add strong instrumental instructions at the end
    const styleSuffix = `. ${styleEnhancement} instrumental background music. No vocals, no singer, no words, no lyrics. Pure instrumental only.`;
    if (basePrompt.length + styleSuffix.length <= 300) {
      finalPrompt = basePrompt + styleSuffix;
    } else if (basePrompt.length < 300) {
      finalPrompt = basePrompt.substring(0, 300 - styleSuffix.length) + styleSuffix;
    } else {
      finalPrompt = basePrompt.substring(0, 300);
    }

    logger.info('Generating music with fal.ai minimax-music v2', {
      userPrompt: basePrompt,
      finalPrompt: finalPrompt.substring(0, 100),
      style
    });

    // MiniMax Music v2 requires both prompt and lyrics_prompt (min 10 chars)
    // Use only instrumental structural tags - no verse/chorus which triggers lyrics
    // No [Intro] since our videos are short and we want to get to the good part faster
    const instrumentalLyrics = '[Inst][Buildup][Interlude][Outro]';

    logger.info('Sending music generation request', {
      promptLength: finalPrompt.length,
      promptPreview: finalPrompt.substring(0, 100)
    });

    const result = await fal.subscribe('fal-ai/minimax-music/v2', {
      input: {
        prompt: finalPrompt,
        lyrics_prompt: instrumentalLyrics,
        audio_setting: {
          format: 'mp3',
          sample_rate: 44100,  // Number, not string
          bitrate: 256000      // Number, not string
        }
      },
      logs: true,
      onQueueUpdate: (update) => {
        logger.debug('Queue update', { status: update.status });
      }
    });

    // Log full response structure for debugging
    logger.info('Fal.ai response received', {
      resultType: typeof result,
      resultKeys: Object.keys(result || {}),
      fullResult: JSON.stringify(result, null, 2)
    });

    // Check response structure - might be nested
    const audio = result?.audio || result?.data?.audio || result?.result?.audio;
    if (!audio || !audio.url) {
      throw new Error(`Invalid response from fal.ai music generation. Result structure: ${JSON.stringify(result)}`);
    }

    // Download and save the audio file
    const audioUrl = audio.url;
    const filename = `music_${Date.now()}.mp3`;
    const outputPath = path.join(MUSIC_OUTPUT_DIR, filename);

    // Ensure output directory exists
    await fs.mkdir(MUSIC_OUTPUT_DIR, { recursive: true });

    // Download the file
    logger.info('Downloading generated music file', { url: audioUrl });
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    await fs.writeFile(outputPath, Buffer.from(buffer));

    logger.info('Music file saved', { path: outputPath, size: buffer.byteLength });

    return {
      success: true,
      path: outputPath,
      url: `/storage/audio/music/${filename}`,
      filename,
      // Duration is typically 10-30 seconds for minimax-music
      duration: 30 // Will be updated when we can get actual duration
    };
  } catch (error) {
    logger.error('Music generation failed', {
      error: error.message,
      errorName: error.name,
      errorDetails: error.details || error.response?.data || error.body,
      stack: error.stack
    });

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get duration of an audio file using ffprobe
 *
 * @param {string} audioPath - Path to audio file
 * @returns {Promise<number>} Duration in seconds
 */
async function getAudioDuration(audioPath) {
  try {
    const ffmpegWrapper = await import('../utils/ffmpegWrapper.js');
    return await ffmpegWrapper.default.getAudioDuration(audioPath);
  } catch (error) {
    logger.warn('Failed to get audio duration', { error: error.message });
    return 0;
  }
}

/**
 * Delete a music file from disk
 *
 * @param {string} audioPath - Path to audio file
 * @returns {Promise<boolean>}
 */
async function deleteMusicFile(audioPath) {
  try {
    // Handle both absolute paths and relative URLs
    let filePath = audioPath;
    if (audioPath.startsWith('/storage/')) {
      filePath = path.join(process.cwd(), audioPath);
    }

    await fs.unlink(filePath);
    logger.info('Music file deleted', { path: filePath });
    return true;
  } catch (error) {
    logger.warn('Failed to delete music file', {
      path: audioPath,
      error: error.message
    });
    return false;
  }
}

export default {
  isConfigured,
  generateInstrumentalMusic,
  getAudioDuration,
  deleteMusicFile,
  STYLE_PROMPTS
};
