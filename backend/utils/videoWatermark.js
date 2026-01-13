import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffprobe-installer/ffprobe';
import path from 'path';
import winston from 'winston';
import fs from 'fs/promises';

// Set ffprobe path
ffmpeg.setFfprobePath(ffmpegPath.path);

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'video-watermark' },
  transports: [
    new winston.transports.File({ filename: 'logs/video-watermark-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/video-watermark.log' }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

/**
 * Video Watermark Utility
 * Adds brand watermark overlay to videos using FFmpeg
 */
class VideoWatermarkUtil {
  constructor() {
    // Default watermark configuration
    this.config = {
      // Position: bottom-right corner with padding
      position: {
        x: 'main_w-overlay_w-20',  // 20px from right
        y: 'main_h-overlay_h-20',  // 20px from bottom
      },
      // Size: 10% of video width (aspect ratio preserved)
      size: 'iw*0.1',
      // Opacity: 60% (subtle but visible)
      opacity: 0.6,
      // Watermark asset path
      watermarkPath: path.join(process.cwd(), 'frontend', 'public', 'blush-icon.svg'),
    };
  }

  /**
   * Check if watermark asset exists
   *
   * @returns {Promise<boolean>}
   */
  async watermarkExists() {
    try {
      await fs.access(this.config.watermarkPath);
      return true;
    } catch (error) {
      logger.warn('Watermark asset not found', { path: this.config.watermarkPath });
      return false;
    }
  }

  /**
   * Add watermark to video
   *
   * @param {string} inputPath - Path to input video
   * @param {string} outputPath - Path to output watermarked video
   * @param {object} options - Watermark options
   * @returns {Promise<object>} Watermark result with metadata
   */
  async addWatermark(inputPath, outputPath, options = {}) {
    const startTime = Date.now();

    try {
      logger.info('Adding watermark to video', {
        input: inputPath,
        output: outputPath,
        options,
      });

      // Check if watermark exists
      const watermarkExists = await this.watermarkExists();
      if (!watermarkExists) {
        throw new Error('Watermark asset not found. Please ensure blush-icon.svg exists.');
      }

      // Merge options with defaults
      const config = {
        ...this.config,
        ...options,
      };

      // Create watermark filter
      const filterComplex = this.buildWatermarkFilter(config);

      // Apply watermark using FFmpeg
      await this.applyWatermark(inputPath, outputPath, filterComplex);

      const duration = Date.now() - startTime;

      logger.info('Watermark added successfully', {
        output: outputPath,
        duration: `${duration}ms`,
      });

      return {
        success: true,
        outputPath,
        watermarkPath: config.watermarkPath,
        position: config.position,
        opacity: config.opacity,
        processingTime: duration,
      };

    } catch (error) {
      logger.error('Failed to add watermark', {
        error: error.message,
        input: inputPath,
      });
      throw error;
    }
  }

  /**
   * Build FFmpeg filter complex for watermark overlay
   *
   * @param {object} config - Watermark configuration
   * @returns {string} FFmpeg filter complex string
   */
  buildWatermarkFilter(config) {
    // Scale watermark to size (10% of video width)
    const scaleFilter = `[1:v]scale=${config.size}:-1[watermark];`;

    // Set opacity (format=rgba allows alpha channel manipulation)
    const opacityFilter = `[watermark]format=rgba,colorchannelmixer=aa=${config.opacity}[watermark_alpha];`;

    // Overlay at position (bottom-right)
    const overlayFilter = `[0:v][watermark_alpha]overlay=${config.position.x}:${config.position.y}`;

    return scaleFilter + opacityFilter + overlayFilter;
  }

  /**
   * Apply watermark using FFmpeg
   *
   * @param {string} inputPath - Input video path
   * @param {string}出水Path - Output video path
   * @param {string} filterComplex - FFmpeg filter complex
   * @returns {Promise<void>}
   */
  async applyWatermark(inputPath, outputPath, filterComplex) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .complexFilter(filterComplex)
        .outputOptions([
          '-c:v', 'libx264',       // Re-encode with H.264
          '-preset', 'medium',     // Balance speed and compression
          '-crf', '23',           // Quality (18-28, lower = better)
          '-c:a', 'copy',         // Copy audio without re-encoding
          '-movflags', '+faststart', // Optimize for streaming
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          logger.debug('FFmpeg command', { command: commandLine });
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            logger.debug('Watermark progress', {
              percent: Math.round(progress.percent),
            });
          }
        })
        .on('end', () => {
          logger.info('Watermark processing complete');
          resolve();
        })
        .on('error', (err, stdout, stderr) => {
          logger.error('FFmpeg watermark error', {
            error: err.message,
            stderr,
          });
          reject(new Error(`FFmpeg watermark failed: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Create a text-based watermark (fallback if no image available)
   *
   * @param {string} inputPath - Input video path
   * @param {string} outputPath - Output video path
   * @param {string} text - Watermark text (default: "blush")
   * @param {object} options - Text watermark options
   * @returns {Promise<object>}
   */
  async addTextWatermark(
    inputPath,
    outputPath,
    text = 'blush',
    options = {}
  ) {
    const startTime = Date.now();

    try {
      logger.info('Adding text watermark to video', {
        input: inputPath,
        output: outputPath,
        text,
      });

      // Default text watermark config
      const config = {
        text,
        fontSize: 24,
        fontColor: 'white@0.6',  // White with 60% opacity
        position: {
          x: '(w-text_w-20)',
          y: '(h-text_h-20)',
        },
        shadow: {
          color: 'black@0.3',
          x: 1,
          y: 1,
        },
        ...options,
      };

      // Build drawtext filter
      const shadowFilter = config.shadow
        ? `shadowcolor=${config.shadow.color}:shadowx=${config.shadow.x}:shadowy=${config.shadow.y}:`
        : '';

      const drawtextFilter = `drawtext=text='${config.text}':fontsize=${config.fontSize}:fontcolor=${config.fontColor}:${shadowFilter}x=${config.position.x}:y=${config.position.y}`;

      // Apply text watermark
      await this.applyTextWatermark(inputPath, outputPath, drawtextFilter);

      const duration = Date.now() - startTime;

      logger.info('Text watermark added successfully', {
        output: outputPath,
        text: config.text,
        duration: `${duration}ms`,
      });

      return {
        success: true,
        outputPath,
        text: config.text,
        position: config.position,
        opacity: 0.6,
        processingTime: duration,
      };

    } catch (error) {
      logger.error('Failed to add text watermark', {
        error: error.message,
        input: inputPath,
      });
      throw error;
    }
  }

  /**
   * Apply text watermark using FFmpeg
   *
   * @param {string} inputPath - Input video path
   * @param {string} outputPath - Output video path
   * @param {string} drawtextFilter - FFmpeg drawtext filter
   * @returns {Promise<void>}
   */
  async applyTextWatermark(inputPath, outputPath, drawtextFilter) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoFilters(drawtextFilter)
        .outputOptions([
          '-c:v', 'libx264',
          '-preset', 'medium',
          '-crf', '23',
          '-c:a', 'copy',
          '-movflags', '+faststart',
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          logger.debug('FFmpeg command', { command: commandLine });
        })
        .on('end', () => {
          logger.info('Text watermark processing complete');
          resolve();
        })
        .on('error', (err, stdout, stderr) => {
          logger.error('FFmpeg text watermark error', {
            error: err.message,
            stderr,
          });
          reject(new Error(`FFmpeg text watermark failed: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Verify watermark was applied correctly
   *
   * @param {string} videoPath - Path to watermarked video
   * @returns {Promise<object>} Verification result
   */
  async verifyWatermark(videoPath) {
    try {
      logger.info('Verifying watermark', { videoPath });

      // Get video metadata
      const metadata = await this.getVideoMetadata(videoPath);

      // Basic checks (FFmpeg doesn't easily detect overlays without frame analysis)
      // We verify the video is valid and has expected dimensions
      const verification = {
        valid: true,
        videoPath,
        hasVideoStream: metadata.streams.some(s => s.codec_type === 'video'),
        duration: metadata.format.duration,
        width: metadata.streams.find(s => s.codec_type === 'video')?.width,
        height: metadata.streams.find(s => s.codec_type === 'video')?.height,
      };

      if (!verification.hasVideoStream) {
        verification.valid = false;
        verification.error = 'No video stream found';
      }

      logger.info('Watermark verification complete', verification);

      return verification;

    } catch (error) {
      logger.error('Watermark verification failed', {
        error: error.message,
        videoPath,
      });
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Get video metadata using ffprobe
   *
   * @param {string} videoPath - Path to video file
   * @returns {Promise<object>} Video metadata
   */
  async getVideoMetadata(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata);
        }
      });
    });
  }
}

// Export singleton instance
export default new VideoWatermarkUtil();
