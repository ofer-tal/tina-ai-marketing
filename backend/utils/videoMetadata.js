import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffprobe-installer/ffprobe';
import winston from 'winston';

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
  defaultMeta: { service: 'video-metadata' },
  transports: [
    new winston.transports.File({ filename: 'logs/video-metadata-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/video-metadata.log' }),
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
 * Video Metadata Utility
 * Extracts and validates video metadata using ffprobe
 */
class VideoMetadataUtil {
  /**
   * Extract video metadata from file
   *
   * @param {string} filePath - Path to video file
   * @returns {Promise<object>} Video metadata
   */
  async getMetadata(filePath) {
    return new Promise((resolve, reject) => {
      logger.info('Extracting video metadata', { filePath });

      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          logger.error('Failed to extract metadata', {
            error: err.message,
            filePath
          });
          return reject(new Error(`Failed to extract video metadata: ${err.message}`));
        }

        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');

        if (!videoStream) {
          logger.error('No video stream found', { filePath });
          return reject(new Error('No video stream found in file'));
        }

        const result = {
          width: videoStream.width,
          height: videoStream.height,
          duration: parseFloat(metadata.format.duration),
          aspectRatio: this._calculateAspectRatio(videoStream.width, videoStream.height),
          fps: this._calculateFPS(videoStream.r_frame_rate),
          codec: videoStream.codec_name,
          bitrate: parseInt(metadata.format.bit_rate) || 0,
          size: parseInt(metadata.format.size) || 0,
          format: metadata.format.format_name,
          raw: videoStream
        };

        logger.info('Video metadata extracted', {
          width: result.width,
          height: result.height,
          aspectRatio: result.aspectRatio,
          duration: result.duration,
          fps: result.fps
        });

        resolve(result);
      });
    });
  }

  /**
   * Validate video meets requirements
   *
   * @param {string} filePath - Path to video file
   * @param {object} requirements - Validation requirements
   * @returns {Promise<object>} Validation result
   */
  async validate(filePath, requirements = {}) {
    const {
      width = 1080,
      height = 1920,
      aspectRatio = '9:16',
      minDuration = 3,
      maxDuration = 60,
      minFps = 10,
      maxFps = 60
    } = requirements;

    logger.info('Validating video', { filePath, requirements });

    try {
      const metadata = await this.getMetadata(filePath);

      const validation = {
        valid: true,
        metadata,
        checks: {}
      };

      // Check width
      validation.checks.width = {
        required: width,
        actual: metadata.width,
        passed: metadata.width === width,
        tolerance: Math.abs(metadata.width - width) <= 10 // Allow small tolerance
      };

      // Check height
      validation.checks.height = {
        required: height,
        actual: metadata.height,
        passed: metadata.height === height,
        tolerance: Math.abs(metadata.height - height) <= 10 // Allow small tolerance
      };

      // Check aspect ratio
      const requiredRatio = this._parseAspectRatio(aspectRatio);
      const actualRatio = metadata.width / metadata.height;
      const ratioDifference = Math.abs(actualRatio - requiredRatio);

      validation.checks.aspectRatio = {
        required: aspectRatio,
        requiredNumeric: requiredRatio,
        actual: metadata.aspectRatio,
        actualNumeric: actualRatio,
        difference: ratioDifference,
        passed: ratioDifference < 0.02 // Allow 2% tolerance
      };

      // Check duration
      validation.checks.duration = {
        min: minDuration,
        max: maxDuration,
        actual: metadata.duration,
        passed: metadata.duration >= minDuration && metadata.duration <= maxDuration
      };

      // Check FPS
      validation.checks.fps = {
        min: minFps,
        max: maxFps,
        actual: metadata.fps,
        passed: metadata.fps >= minFps && metadata.fps <= maxFps
      };

      // Check for letterboxing (black bars)
      validation.checks.letterboxing = {
        hasLetterboxing: this._detectLetterboxing(metadata),
        passed: !this._detectLetterboxing(metadata)
      };

      // Overall validation
      validation.valid = Object.values(validation.checks).every(check =>
        check.passed || check.tolerance // Allow tolerance on dimensions
      );

      logger.info('Video validation completed', {
        valid: validation.valid,
        checks: Object.keys(validation.checks),
        failedChecks: Object.entries(validation.checks)
          .filter(([_, check]) => !check.passed && !check.tolerance)
          .map(([name, _]) => name)
      });

      return validation;

    } catch (error) {
      logger.error('Video validation failed', {
        error: error.message,
        stack: error.stack,
        filePath
      });

      return {
        valid: false,
        error: error.message,
        checks: {}
      };
    }
  }

  /**
   * Calculate aspect ratio from width and height
   *
   * @param {number} width - Video width
   * @param {number} height - Video height
   * @returns {string} Aspect ratio in "X:Y" format
   * @private
   */
  _calculateAspectRatio(width, height) {
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(width, height);
    return `${width / divisor}:${height / divisor}`;
  }

  /**
   * Parse aspect ratio string to numeric value
   *
   * @param {string} ratio - Aspect ratio string (e.g., "9:16")
   * @returns {number} Numeric aspect ratio
   * @private
   */
  _parseAspectRatio(ratio) {
    const parts = ratio.split(':');
    if (parts.length !== 2) {
      throw new Error(`Invalid aspect ratio format: ${ratio}`);
    }
    return parseInt(parts[0]) / parseInt(parts[1]);
  }

  /**
   * Calculate FPS from frame rate string
   *
   * @param {string} frameRate - Frame rate string (e.g., "30000/1001")
   * @returns {number} FPS value
   * @private
   */
  _calculateFPS(frameRate) {
    if (!frameRate) return 0;

    const parts = frameRate.split('/');
    if (parts.length === 2) {
      return parseInt(parts[0]) / parseInt(parts[1]);
    }
    return parseFloat(frameRate);
  }

  /**
   * Detect potential letterboxing in video
   * This is a basic heuristic - more sophisticated analysis would require frame analysis
   *
   * @param {object} metadata - Video metadata
   * @returns {boolean} True if letterboxing detected
   * @private
   */
  _detectLetterboxing(metadata) {
    // Basic check: if aspect ratio is close to 9:16 but with different dimensions,
    // there might be letterboxing
    const ratio = metadata.width / metadata.height;
    const expectedRatio = 9 / 16;
    const ratioDifference = Math.abs(ratio - expectedRatio);

    // If dimensions don't match 1080x1920 but ratio is close to 9:16,
    // there might be letterboxing
    if (ratioDifference < 0.02 &&
        (metadata.width !== 1080 || metadata.height !== 1920)) {
      return true;
    }

    return false;
  }

  /**
   * Get human-readable validation report
   *
   * @param {object} validation - Validation result
   * @returns {string} Human-readable report
   */
  getValidationReport(validation) {
    if (!validation.valid) {
      if (validation.error) {
        return `❌ Validation Error: ${validation.error}`;
      }

      let report = '❌ Video validation failed:\n\n';

      for (const [name, check] of Object.entries(validation.checks)) {
        if (!check.passed && !check.tolerance) {
          report += `  ❌ ${name}:\n`;

          if (check.required !== undefined) {
            report += `     Required: ${check.required}\n`;
            report += `     Actual: ${check.actual}\n`;
          } else if (check.min !== undefined) {
            report += `     Required range: ${check.min} - ${check.max}\n`;
            report += `     Actual: ${check.actual}\n`;
          } else if (name === 'aspectRatio') {
            report += `     Required: ${check.required} (${check.requiredNumeric.toFixed(3)})\n`;
            report += `     Actual: ${check.actual} (${check.actualNumeric.toFixed(3)})\n`;
            report += `     Difference: ${check.difference.toFixed(4)}\n`;
          } else if (name === 'letterboxing') {
            report += `     Letterboxing detected: ${check.hasLetterboxing}\n`;
          }
        }
      }

      return report;
    }

    return `✅ Video validation passed!\n\n` +
           `  Resolution: ${validation.metadata.width}x${validation.metadata.height}\n` +
           `  Aspect Ratio: ${validation.metadata.aspectRatio}\n` +
           `  Duration: ${validation.metadata.duration.toFixed(2)}s\n` +
           `  FPS: ${validation.metadata.fps.toFixed(2)}\n` +
           `  Codec: ${validation.metadata.codec}\n` +
           `  File Size: ${(validation.metadata.size / (1024 * 1024)).toFixed(2)} MB`;
  }
}

// Create singleton instance
const videoMetadataUtil = new VideoMetadataUtil();

export default videoMetadataUtil;
