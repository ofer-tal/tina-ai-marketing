/**
 * Audio Extraction Service
 *
 * Extracts audio excerpts from story chapters for video background music.
 * Uses FFmpeg to trim audio files to 15-30 second engaging segments.
 *
 * Features:
 * - Smart segment selection (beginning, middle, end, random)
 * - FFmpeg-based audio trimming
 * - Audio quality verification
 * - Format conversion (MP3, WAV, M4A)
 * - Fallback to TTS generation if no audio exists
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { getLogger } from '../utils/logger.js';

const execAsync = promisify(exec);
const logger = getLogger('services', 'audio-extraction');

// Storage directory for audio excerpts
const AUDIO_EXCERPTS_DIR = path.join(process.cwd(), 'storage', 'audio-excerpts');

// Audio excerpt durations (in seconds)
const MIN_DURATION = 15;
const MAX_DURATION = 30;
const DEFAULT_DURATION = 20;

// Supported audio formats
const SUPPORTED_FORMATS = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'];

/**
 * Audio Extraction Service Class
 */
class AudioExtractionService {
  constructor() {
    this.storageDir = AUDIO_EXCERPTS_DIR;
    this.initializeStorage();
  }

  /**
   * Initialize storage directory
   */
  async initializeStorage() {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      logger.info('Storage directory ready', {
        audioExcerptsDir: this.storageDir,
        service: 'audio-extraction',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to create storage directory', {
        error: error.message,
        service: 'audio-extraction'
      });
      throw error;
    }
  }

  /**
   * Extract audio excerpt from story chapter
   * @param {Object} options - Extraction options
   * @param {string} options.audioPath - Path to source audio file
   * @param {number} options.duration - Desired excerpt duration in seconds (15-30)
   * @param {string} options.position - Segment position: 'beginning', 'middle', 'end', 'random'
   * @param {string} options.outputFormat - Output format: 'mp3', 'wav', 'm4a'
   * @param {string} options.storyId - Story ID for filename
   * @param {number} options.chapterNumber - Chapter number for filename
   * @returns {Promise<Object>} Extracted audio info
   */
  async extractExcerpt({
    audioPath,
    duration = DEFAULT_DURATION,
    position = 'beginning',
    outputFormat = 'mp3',
    storyId,
    chapterNumber
  }) {
    try {
      logger.info('Starting audio excerpt extraction', {
        audioPath,
        duration,
        position,
        outputFormat
      });

      // Validate inputs
      this.validateInputs({ audioPath, duration, position, outputFormat });

      // Check if source audio file exists
      const sourceExists = await this.audioFileExists(audioPath);
      if (!sourceExists) {
        throw new Error(`Source audio file not found: ${audioPath}`);
      }

      // Get audio duration
      const audioDuration = await this.getAudioDuration(audioPath);
      logger.info('Source audio duration', { audioDuration, sourcePath: audioPath });

      // Calculate start time based on position
      const startTime = this.calculateStartTime(audioDuration, duration, position);

      // Generate output filename
      const outputFilename = this.generateFilename(storyId, chapterNumber, outputFormat);
      const outputPath = path.join(this.storageDir, outputFilename);

      // Extract audio using FFmpeg
      await this.extractWithFFmpeg({
        inputPath: audioPath,
        outputPath,
        startTime,
        duration,
        outputFormat
      });

      // Verify output file
      const outputExists = await this.audioFileExists(outputPath);
      if (!outputExists) {
        throw new Error('Failed to create audio excerpt');
      }

      // Get excerpt duration for verification
      const excerptDuration = await this.getAudioDuration(outputPath);

      // Get file size
      const stats = await fs.stat(outputPath);
      const fileSizeKB = Math.round(stats.size / 1024);

      logger.info('Audio excerpt extracted successfully', {
        outputPath,
        excerptDuration,
        fileSizeKB,
        sourcePath: audioPath
      });

      return {
        success: true,
        excerptPath: outputPath,
        excerptFilename: outputFilename,
        excerptUrl: `/storage/audio-excerpts/${outputFilename}`,
        duration: excerptDuration,
        fileSize: fileSizeKB,
        startTime,
        format: outputFormat,
        sourcePath: audioPath,
        sourceDuration: audioDuration
      };

    } catch (error) {
      logger.error('Failed to extract audio excerpt', {
        error: error.message,
        audioPath,
        duration,
        position
      });
      throw error;
    }
  }

  /**
   * Extract excerpt from full chapter content (no audio file exists)
   * This is a fallback that generates a text excerpt for TTS
   * @param {Object} chapter - Chapter object with content
   * @param {number} targetLength - Target character length (~150-300 for 15-30s)
   * @returns {Object} Text excerpt for TTS
   */
  extractTextExcerpt(chapter, targetLength = 200) {
    try {
      const content = chapter.content || '';

      if (content.length === 0) {
        throw new Error('Chapter has no content');
      }

      // If content is short enough, use it all
      if (content.length <= targetLength) {
        return {
          success: true,
          text: content,
          length: content.length,
          method: 'full'
        };
      }

      // Find engaging segment (look for dialogue or dramatic moments)
      const engaging = this.findEngagingSegment(content, targetLength);

      logger.info('Text excerpt extracted', {
        chapterNumber: chapter.chapterNumber,
        length: engaging.length,
        method: 'segment'
      });

      return {
        success: true,
        text: engaging,
        length: engaging.length,
        method: 'segment'
      };

    } catch (error) {
      logger.error('Failed to extract text excerpt', {
        error: error.message,
        chapterNumber: chapter.chapterNumber
      });
      throw error;
    }
  }

  /**
   * Validate extraction inputs
   */
  validateInputs({ audioPath, duration, position, outputFormat }) {
    if (!audioPath || typeof audioPath !== 'string') {
      throw new Error('audioPath is required and must be a string');
    }

    if (duration < MIN_DURATION || duration > MAX_DURATION) {
      throw new Error(`duration must be between ${MIN_DURATION} and ${MAX_DURATION} seconds`);
    }

    const validPositions = ['beginning', 'middle', 'end', 'random'];
    if (!validPositions.includes(position)) {
      throw new Error(`position must be one of: ${validPositions.join(', ')}`);
    }

    const validFormats = ['mp3', 'wav', 'm4a'];
    if (!validFormats.includes(outputFormat)) {
      throw new Error(`outputFormat must be one of: ${validFormats.join(', ')}`);
    }
  }

  /**
   * Check if audio file exists
   */
  async audioFileExists(filePath) {
    try {
      // Handle both relative and absolute paths
      const fullPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(process.cwd(), filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get audio file duration using FFprobe
   */
  async getAudioDuration(filePath) {
    try {
      const fullPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(process.cwd(), filePath);

      const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${fullPath}"`;
      const { stdout } = await execAsync(command);

      const duration = parseFloat(stdout.trim());
      if (isNaN(duration)) {
        throw new Error('Invalid duration returned from ffprobe');
      }

      return Math.round(duration * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      logger.error('Failed to get audio duration', {
        error: error.message,
        filePath
      });
      throw new Error(`Could not determine audio duration: ${error.message}`);
    }
  }

  /**
   * Calculate start time for extraction based on position
   */
  calculateStartTime(audioDuration, excerptDuration, position) {
    const latestStart = Math.max(0, audioDuration - excerptDuration);

    switch (position) {
      case 'beginning':
        return 0;
      case 'end':
        return Math.max(0, audioDuration - excerptDuration);
      case 'middle':
        return Math.max(0, (audioDuration - excerptDuration) / 2);
      case 'random':
        return Math.random() * latestStart;
      default:
        return 0;
    }
  }

  /**
   * Generate filename for audio excerpt
   */
  generateFilename(storyId, chapterNumber, format) {
    const timestamp = Date.now();
    const sanitizedStoryId = storyId ? storyId.replace(/[^a-zA-Z0-9]/g, '_') : 'unknown';
    const chapter = chapterNumber || 1;
    return `excerpt_${sanitizedStoryId}_ch${chapter}_${timestamp}.${format}`;
  }

  /**
   * Extract audio using FFmpeg
   */
  async extractWithFFmpeg({ inputPath, outputPath, startTime, duration, outputFormat }) {
    try {
      const fullPath = path.isAbsolute(inputPath)
        ? inputPath
        : path.join(process.cwd(), inputPath);

      // Build FFmpeg command
      // -ss: start time
      // -t: duration
      // -acodec libmp3lame: encode to MP3
      // -b:a 128k: audio bitrate
      // -ac 2: stereo channels
      // -ar 44100: sample rate
      const codec = outputFormat === 'mp3' ? 'libmp3lame' : 'pcm_s16le';
      const bitrate = outputFormat === 'mp3' ? '128k' : '192k';

      const command = [
        'ffmpeg',
        `-ss ${startTime}`,
        `-t ${duration}`,
        `-i "${fullPath}"`,
        `-acodec ${codec}`,
        `-b:a ${bitrate}`,
        `-ac 2`,
        `-ar 44100`,
        `-y`, // Overwrite output file
        `"${outputPath}"`
      ].join(' ');

      logger.info('Running FFmpeg extraction', {
        startTime,
        duration,
        outputFormat
      });

      const { stdout, stderr } = await execAsync(command);

      // FFmpeg logs to stderr, check for errors
      if (stderr.includes('Error') || stderr.includes('Invalid')) {
        throw new Error(`FFmpeg error: ${stderr}`);
      }

      logger.info('FFmpeg extraction completed');

    } catch (error) {
      logger.error('FFmpeg extraction failed', {
        error: error.message,
        inputPath,
        outputPath
      });
      throw new Error(`Audio extraction failed: ${error.message}`);
    }
  }

  /**
   * Find engaging segment in text
   * Looks for dialogue, dramatic moments, or hooks
   */
  findEngagingSegment(content, targetLength) {
    // Look for dialogue (quotes)
    const dialogueMatch = content.match(/"[^"]{20,}/g);
    if (dialogueMatch && dialogueMatch.length > 0) {
      // Find longest dialogue segment that fits
      const suitable = dialogueMatch.find(d => d.length >= targetLength * 0.5);
      if (suitable) {
        return this.expandAroundMatch(content, suitable, targetLength);
      }
    }

    // Look for engaging words (emotional, action words)
    const engagingWords = ['whispered', 'gasped', 'heart', 'suddenly', 'desire', 'touch', 'passion'];
    for (const word of engagingWords) {
      const index = content.toLowerCase().indexOf(word);
      if (index !== -1) {
        const start = Math.max(0, index - targetLength / 2);
        const end = Math.min(content.length, index + word.length + targetLength / 2);
        const segment = content.substring(start, end).trim();
        if (segment.length >= targetLength * 0.7) {
          return segment;
        }
      }
    }

    // Fallback: take the first targetLength characters
    return content.substring(0, targetLength).trim();
  }

  /**
   * Expand text around a match to reach target length
   */
  expandAroundMatch(content, match, targetLength) {
    const matchIndex = content.indexOf(match);
    const matchLength = match.length;

    // Start from the match and expand outward
    let start = matchIndex;
    let end = matchIndex + matchLength;

    // Expand to beginning
    while (start > 0 && (end - start) < targetLength) {
      start--;
      // Don't break words
      if (content[start] === ' ' && (targetLength - (end - start)) < 20) {
        break;
      }
    }

    // Expand to end
    while (end < content.length && (end - start) < targetLength) {
      end++;
    }

    return content.substring(start, end).trim();
  }

  /**
   * Health check for FFmpeg
   */
  async healthCheck() {
    try {
      const { stdout } = await execAsync('ffmpeg -version');
      const versionMatch = stdout.match(/ffmpeg version ([\d.]+)/);

      return {
        healthy: true,
        version: versionMatch ? versionMatch[1] : 'unknown',
        message: 'FFmpeg is available for audio extraction'
      };
    } catch (error) {
      return {
        healthy: false,
        version: null,
        message: `FFmpeg not available: ${error.message}`
      };
    }
  }

  /**
   * Clean up old excerpts
   */
  async cleanupOldExcerpts(daysOld = 7) {
    try {
      const files = await fs.readdir(this.storageDir);
      const now = Date.now();
      const maxAge = daysOld * 24 * 60 * 60 * 1000;
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.storageDir, file);
        const stats = await fs.stat(filePath);
        const age = now - stats.mtime.getTime();

        if (age > maxAge) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      logger.info('Cleaned up old audio excerpts', {
        deletedCount,
        daysOld
      });

      return { deletedCount };
    } catch (error) {
      logger.error('Failed to cleanup old excerpts', {
        error: error.message
      });
      throw error;
    }
  }
}

// Create and export singleton instance
const audioExtractionService = new AudioExtractionService();

export default audioExtractionService;
