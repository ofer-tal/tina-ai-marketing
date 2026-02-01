/**
 * Audio Mixer Utility
 *
 * Handles audio mixing operations including:
 * - Mixing narration with background music
 * - Volume adjustment
 * - Audio concatenation
 * - Duration detection
 */

import ffmpegWrapper from './ffmpegWrapper.js';
import { getLogger } from './logger.js';
import fs from 'fs/promises';
import path from 'path';

const logger = getLogger('utils', 'audio-mixer');

class AudioMixer {
  constructor(config = {}) {
    this.outputDir = config.outputDir || process.env.AUDIO_MIXER_OUTPUT_DIR || './storage/temp';
    this.enabled = process.env.ENABLE_AUDIO_MIXING !== 'false';
  }

  /**
   * Initialize output directories
   */
  async initialize() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      logger.info('Audio Mixer initialized', {
        outputDir: this.outputDir,
        enabled: this.enabled
      });
    } catch (error) {
      logger.error('Failed to initialize Audio Mixer', {
        error: error.message
      });
    }
  }

  /**
   * Mix narration with background music
   *
   * @param {string} narrationPath - Path to narration audio file
   * @param {string} musicPath - Path to background music file (optional)
   * @param {Object} options - Mixing options
   * @returns {Promise<{success: boolean, outputPath: string, duration: number}|{success: boolean, error: string}>}
   */
  async mixNarrationWithMusic(narrationPath, musicPath = null, options = {}) {
    const {
      outputPath = null,
      narrationVolume = 1.0,
      musicVolume = 0.15,
      fadeInDuration = 0.3,
      fadeOutDuration = 0.5,
      normalize = true
    } = options;

    try {
      logger.info('Mixing narration with music', {
        narrationPath,
        hasMusic: !!musicPath,
        options
      });

      // Validate narration exists
      await fs.access(narrationPath);

      // Get narration duration
      const narrationDuration = await ffmpegWrapper.getAudioDuration(narrationPath);

      // If no music, just normalize and return narration
      if (!musicPath) {
        const finalOutputPath = outputPath || path.join(
          this.outputDir,
          `narration-${Date.now()}.wav`
        );

        if (normalize) {
          await this._normalizeAudio(narrationPath, finalOutputPath);
        } else {
          await fs.copyFile(narrationPath, finalOutputPath);
        }

        return {
          success: true,
          outputPath: finalOutputPath,
          duration: narrationDuration
        };
      }

      // Validate music exists
      await fs.access(musicPath);

      // Generate output path if not provided
      const finalOutputPath = outputPath || path.join(
        this.outputDir,
        `mixed-${Date.now()}.wav`
      );

      // Build FFmpeg command for mixing
      const filterComplex = this._buildMixFilter({
        narrationDuration,
        narrationVolume,
        musicVolume,
        fadeInDuration,
        fadeOutDuration,
        normalize
      });

      const command = [
        '-y',
        '-i', narrationPath,
        '-i', musicPath,
        '-filter_complex', filterComplex,
        '-c:a', 'pcm_s16le', // Use PCM for better quality
        '-ar', '48000', // 48kHz is more standard for video
        '-ac', '2', // Stereo
        '-t', narrationDuration.toString(), // Trim to narration duration
        finalOutputPath
      ];

      await ffmpegWrapper.execute(command);

      logger.info('Audio mixed successfully', {
        outputPath: finalOutputPath,
        duration: narrationDuration
      });

      return {
        success: true,
        outputPath: finalOutputPath,
        duration: narrationDuration
      };
    } catch (error) {
      logger.error('Failed to mix audio', {
        error: error.message,
        narrationPath,
        musicPath
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Build FFmpeg filter complex for audio mixing
   * IMPORTANT: amix filter can change sample rate, so we must add aformat AFTER mixing
   * Using 48kHz instead of 44.1kHz as it's more standard for video
   * @private
   */
  _buildMixFilter(options) {
    const {
      narrationDuration,
      narrationVolume = 1.0,
      musicVolume = 0.15,
      fadeInDuration = 0.3,
      fadeOutDuration = 0.5,
      normalize = true
    } = options;

    let filter = '';

    // Normalize narration if requested
    if (normalize) {
      filter += '[0:a]aformat=sample_fmts=s16:sample_rates=48000:channel_layouts=stereo,loudnorm=I=-16:TP=-1.5:LRA=11[a0];';
    } else {
      filter += '[0:a]aformat=sample_fmts=s16:sample_rates=48000:channel_layouts=stereo,volume=' + narrationVolume + '[a0];';
    }

    // Process music: lower volume, loop, fade in/out
    const musicFadeIn = fadeInDuration > 0
      ? `afade=t=in:st=0:d=${fadeInDuration}`
      : '';
    const musicFadeOut = fadeOutDuration > 0
      ? `afade=t=out:st=${narrationDuration - fadeOutDuration}:d=${fadeOutDuration}`
      : '';

    let musicFilter = `[1:a]aformat=sample_fmts=s16:sample_rates=48000:channel_layouts=stereo,volume=${musicVolume}`;
    if (musicFadeIn) musicFilter += `,${musicFadeIn}`;
    if (musicFadeOut) musicFilter += `,${musicFadeOut}`;
    musicFilter += ',aloop=loop=-1:size=2e+09'; // Loop music

    filter += `${musicFilter}[a1];`;

    // Mix both audio tracks, then resample to ensure correct output sample rate
    // CRITICAL: amix can output unexpected sample rates, so aformat MUST come after amix
    filter += '[a0][a1]amix=inputs=2:duration=first:dropout_transition=2,aresample=48000,aformat=sample_fmts=s16:sample_rates=48000:channel_layouts=stereo';

    return filter;
  }

  /**
   * Adjust volume of an audio file
   *
   * @param {string} inputPath - Input audio path
   * @param {string} outputPath - Output audio path
   * @param {number} volumeLevel - Volume level (0.0 to 2.0, 1.0 = no change)
   * @returns {Promise<boolean>}
   */
  async adjustVolume(inputPath, outputPath, volumeLevel = 1.0) {
    try {
      await fs.access(inputPath);

      const command = [
        '-y',
        '-i', inputPath,
        '-filter_complex', `[0:a]volume=${volumeLevel}[aout]`,
        '-map', '[aout]',
        '-c:a', 'pcm_s16le',
        outputPath
      ];

      await ffmpegWrapper.execute(command);

      logger.info('Volume adjusted', {
        inputPath,
        outputPath,
        volumeLevel
      });

      return true;
    } catch (error) {
      logger.error('Failed to adjust volume', {
        error: error.message,
        inputPath
      });
      return false;
    }
  }

  /**
   * Concatenate multiple audio files
   *
   * @param {Array<string>} files - Array of audio file paths
   * @param {string} outputPath - Output file path
   * @returns {Promise<boolean>}
   */
  async concatenateAudio(files, outputPath) {
    try {
      if (files.length === 0) {
        throw new Error('No files provided for concatenation');
      }

      if (files.length === 1) {
        // Just copy if only one file
        await fs.copyFile(files[0], outputPath);
        return true;
      }

      // Create concat filter
      const filterParts = files.map((_, i) => `[${i}:a]`).join('') + `concat=n=${files.length}:v=0:a=1[out]`;

      const command = [
        '-y',
        ...files.flatMap(f => ['-i', f]),
        '-filter_complex', filterParts,
        '-map', '[out]',
        '-c:a', 'pcm_s16le',
        outputPath
      ];

      await ffmpegWrapper.execute(command);

      logger.info('Audio concatenated', {
        fileCount: files.length,
        outputPath
      });

      return true;
    } catch (error) {
      logger.error('Failed to concatenate audio', {
        error: error.message,
        fileCount: files.length
      });
      return false;
    }
  }

  /**
   * Get audio duration
   *
   * @param {string} audioPath - Path to audio file
   * @returns {Promise<number>} Duration in seconds
   */
  async getAudioDuration(audioPath) {
    return ffmpegWrapper.getAudioDuration(audioPath);
  }

  /**
   * Normalize audio to standard level and resample to 48kHz
   * Input may be any sample rate (XTTS outputs ~24kHz), we normalize to 48kHz
   * Using 48kHz instead of 44.1kHz as it's more standard for video
   * @private
   */
  async _normalizeAudio(inputPath, outputPath) {
    const command = [
      '-y',
      '-i', inputPath,
      '-filter_complex', '[0:a]aformat=sample_fmts=s16:sample_rates=48000:channel_layouts=stereo,loudnorm=I=-16:TP=-1.5:LRA=11[aout]',
      '-map', '[aout]',
      '-c:a', 'pcm_s16le',
      '-ar', '48000',
      '-ac', '2',
      outputPath
    ];

    await ffmpegWrapper.execute(command);
  }

  /**
   * Extract a segment from audio file
   *
   * @param {string} inputPath - Input audio path
   * @param {string} outputPath - Output audio path
   * @param {number} startTime - Start time in seconds
   * @param {number} duration - Duration in seconds
   * @returns {Promise<boolean>}
   */
  async extractSegment(inputPath, outputPath, startTime, duration) {
    try {
      const command = [
        '-y',
        '-ss', startTime.toString(),
        '-i', inputPath,
        '-t', duration.toString(),
        '-c:a', 'pcm_s16le',
        outputPath
      ];

      await ffmpegWrapper.execute(command);

      logger.info('Audio segment extracted', {
        inputPath,
        outputPath,
        startTime,
        duration
      });

      return true;
    } catch (error) {
      logger.error('Failed to extract audio segment', {
        error: error.message,
        inputPath
      });
      return false;
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanup(olderThanHours = 24) {
    try {
      const files = await fs.readdir(this.outputDir);
      const now = Date.now();
      const maxAge = olderThanHours * 60 * 60 * 1000;

      let cleanedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.outputDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtimeMs < now - maxAge) {
          await fs.unlink(filePath);
          cleanedCount++;
        }
      }

      logger.info('Audio mixer cleanup completed', {
        cleanedCount,
        olderThanHours
      });

      return cleanedCount;
    } catch (error) {
      logger.error('Failed to cleanup audio mixer temp files', {
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    const ffmpegHealth = await ffmpegWrapper.healthCheck();

    return {
      healthy: ffmpegHealth.healthy,
      outputDir: this.outputDir,
      enabled: this.enabled
    };
  }
}

// Create singleton instance
const audioMixer = new AudioMixer();
audioMixer.initialize();

export default audioMixer;
