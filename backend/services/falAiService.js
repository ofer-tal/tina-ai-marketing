import winston from 'winston';
import videoMetadataUtil from '../utils/videoMetadata.js';

// Create logger for Fal.ai service
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'fal-ai-video' },
  transports: [
    new winston.transports.File({ filename: 'logs/fal-ai-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/fal-ai.log' }),
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
 * Fal.ai Video Generation Service
 * Generates vertical video content using Fal.ai API
 *
 * Supported models:
 * - fal-ai/flux-schnell: Fast image generation
 * - fal-ai/stable-video: Video generation from images
 */
class FalAiService {
  constructor() {
    this.apiKey = process.env.FAL_AI_API_KEY;
    this.baseUrl = 'https://queue.fal.run/fal-ai';
    this.timeout = 300000; // 5 minutes for video generation
    this.pollInterval = 2000; // Check status every 2 seconds

    if (!this.apiKey) {
      logger.warn('FAL_AI_API_KEY not configured - service will be mocked');
    }
  }

  /**
   * Generate vertical video from story prompt
   *
   * @param {object} options - Video generation options
   * @param {string} options.prompt - Story prompt for video generation
   * @param {number} options.spiciness - Story spiciness level (0-3)
   * @param {string} options.category - Story category
   * @param {number} options.aspectRatio - Aspect ratio (default: 9:16 for vertical)
   * @param {number} options.duration - Video duration in seconds (default: 15)
   * @returns {Promise<object>} Generated video metadata
   */
  async generateVideo(options = {}) {
    const {
      prompt,
      spiciness = 0,
      category = '',
      aspectRatio = '9:16',
      duration = 15
    } = options;

    logger.info('Starting video generation', {
      prompt: prompt?.substring(0, 100),
      spiciness,
      category,
      aspectRatio,
      duration
    });

    // Check if API key is configured
    if (!this.apiKey || this.apiKey === '') {
      logger.warn('Fal.ai API key not configured, returning mock response');
      return this._getMockVideoResponse(options);
    }

    try {
      // Step 1: Generate image from prompt first
      logger.info('Step 1: Generating image from prompt');
      const imageUrl = await this._generateImage(prompt, spiciness, category);

      // Step 2: Generate video from image
      logger.info('Step 2: Generating video from image');
      const videoUrl = await this._generateVideoFromImage(imageUrl, duration);

      // Step 3: Download and validate video
      logger.info('Step 3: Downloading and validating video');
      const videoMetadata = await this._downloadAndValidateVideo(videoUrl, {
        aspectRatio,
        duration
      });

      logger.info('Video generation completed successfully', {
        videoPath: videoMetadata.path,
        duration: videoMetadata.duration,
        aspectRatio: videoMetadata.aspectRatio,
        fileSize: videoMetadata.fileSize
      });

      return {
        success: true,
        video: videoMetadata,
        steps: [
          { step: 1, name: 'Image generation', status: 'completed', output: imageUrl },
          { step: 2, name: 'Video generation', status: 'completed', output: videoUrl },
          { step: 3, name: 'Download and validation', status: 'completed', output: videoMetadata.path }
        ]
      };

    } catch (error) {
      logger.error('Video generation failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Generate image from prompt using Flux model
   *
   * @param {string} prompt - Text prompt
   * @param {number} spiciness - Spiciness level for style adjustment
   * @param {string} category - Story category
   * @returns {Promise<string>} Image URL
   */
  async _generateImage(prompt, spiciness, category) {
    const enhancedPrompt = this._enhancePromptForVideo(prompt, spiciness, category);

    logger.info('Calling Fal.ai image generation', {
      prompt: enhancedPrompt.substring(0, 100)
    });

    try {
      // Using flux-schnell model for fast image generation
      const response = await fetch(`${this.baseUrl}/flux-schnell`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          image_size: 'portrait_1080_1920', // 9:16 aspect ratio, 1080x1920 resolution
          num_inference_steps: 4,
          num_images: 1,
          enable_safety_checker: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fal.ai image generation failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      if (!result.images || result.images.length === 0) {
        throw new Error('No images generated from Fal.ai');
      }

      const imageUrl = result.images[0].url;
      logger.info('Image generated successfully', { imageUrl });

      return imageUrl;

    } catch (error) {
      logger.error('Image generation failed', {
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to generate image: ${error.message}`);
    }
  }

  /**
   * Generate video from image using stable-video-diffusion
   *
   * @param {string} imageUrl - URL of the source image
   * @param {number} duration - Video duration in seconds
   * @returns {Promise<string>} Video URL
   */
  async _generateVideoFromImage(imageUrl, duration) {
    logger.info('Calling Fal.ai video generation', { imageUrl, duration });

    try {
      // Initiate video generation request
      const response = await fetch(`${this.baseUrl}/stable-video-diffusion-img2vid-xs`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image_url: imageUrl,
          motion_bucket_id: 127, // Medium motion
          cond_aug: 0.02,
          decoding_t: 7, // Number of frames
          output_video_format: 'mp4',
          video_ratio: '9:16' // Vertical video
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fal.ai video generation failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      const requestId = result.request_id;

      logger.info('Video generation request submitted', { requestId });

      // Poll for completion
      const videoUrl = await this._pollForResult(requestId);
      logger.info('Video generated successfully', { videoUrl });

      return videoUrl;

    } catch (error) {
      logger.error('Video generation failed', {
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to generate video: ${error.message}`);
    }
  }

  /**
   * Poll for video generation result
   *
   * @param {string} requestId - Request ID from initial submission
   * @returns {Promise<string>} Completed video URL
   */
  async _pollForResult(requestId) {
    const startTime = Date.now();
    const maxAttempts = Math.ceil(this.timeout / this.pollInterval);

    logger.info('Polling for video generation result', {
      requestId,
      maxAttempts,
      pollInterval: this.pollInterval
    });

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/stable-video-diffusion-img2vid-xs/requests/${requestId}/status`, {
          method: 'GET',
          headers: {
            'Authorization': `Key ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Status check failed: ${response.status}`);
        }

        const status = await response.json();

        logger.debug('Poll status', {
          attempt: attempt + 1,
          status: status.status
        });

        if (status.status === 'COMPLETED') {
          return status.video_url;
        } else if (status.status === 'FAILED') {
          throw new Error(`Video generation failed: ${status.error || 'Unknown error'}`);
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, this.pollInterval));

      } catch (error) {
        logger.error('Poll attempt failed', {
          attempt: attempt + 1,
          error: error.message
        });

        if (attempt === maxAttempts - 1) {
          throw error;
        }

        await new Promise(resolve => setTimeout(resolve, this.pollInterval));
      }
    }

    throw new Error('Video generation timed out');
  }

  /**
   * Download and validate generated video
   *
   * @param {string} videoUrl - URL of the generated video
   * @param {object} constraints - Validation constraints
   * @returns {Promise<object>} Video metadata
   */
  async _downloadAndValidateVideo(videoUrl, constraints = {}) {
    const { aspectRatio = '9:16', duration = 15 } = constraints;

    logger.info('Downloading video', { videoUrl });

    try {
      // Download video
      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error(`Failed to download video: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      const videoBuffer = Buffer.from(buffer);

      // Save to storage
      const fs = await import('fs/promises');
      const path = await import('path');

      const storagePath = process.env.STORAGE_PATH || './storage';
      const videosDir = path.join(storagePath, 'videos');

      await fs.mkdir(videosDir, { recursive: true });

      const filename = `video_${Date.now()}.mp4`;
      const filePath = path.join(videosDir, filename);

      await fs.writeFile(filePath, videoBuffer);

      logger.info('Video downloaded, validating metadata', { filePath });

      // Extract and validate video metadata using ffprobe
      const metadata = await videoMetadataUtil.getMetadata(filePath);

      // Validate against constraints
      const validation = await videoMetadataUtil.validate(filePath, {
        width: 1080,
        height: 1920,
        aspectRatio: aspectRatio,
        minDuration: Math.max(3, duration - 5),
        maxDuration: Math.min(60, duration + 5),
        minFps: 10,
        maxFps: 60
      });

      const result = {
        path: filePath,
        filename: filename,
        url: `/api/videos/${filename}`,
        fileSize: metadata.size,
        fileSizeMB: (metadata.size / (1024 * 1024)).toFixed(2),
        duration: metadata.duration,
        aspectRatio: metadata.aspectRatio,
        width: metadata.width,
        height: metadata.height,
        fps: metadata.fps,
        codec: metadata.codec,
        createdAt: new Date().toISOString(),
        validation: {
          passed: validation.valid,
          checks: validation.checks,
          report: videoMetadataUtil.getValidationReport(validation)
        }
      };

      // Log validation report
      if (validation.valid) {
        logger.info('✅ Video validation passed', {
          width: metadata.width,
          height: metadata.height,
          aspectRatio: metadata.aspectRatio,
          duration: metadata.duration
        });
      } else {
        logger.warn('⚠️ Video validation issues detected', {
          report: result.validation.report
        });
      }

      return result;

    } catch (error) {
      logger.error('Video download/validation failed', {
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to download video: ${error.message}`);
    }
  }

  /**
   * Enhance prompt for video generation based on spiciness and category
   *
   * @param {string} prompt - Original prompt
   * @param {number} spiciness - Spiciness level
   * @param {string} category - Story category
   * @returns {string} Enhanced prompt
   */
  _enhancePromptForVideo(prompt, spiciness, category) {
    let enhanced = prompt;

    // Add style based on spiciness
    if (spiciness <= 1) {
      enhanced += ', romantic, soft lighting, dreamy atmosphere, cinematic, 4K quality';
    } else if (spiciness === 2) {
      enhanced += ', romantic and passionate, cinematic lighting, high quality, detailed';
    } else if (spiciness === 3) {
      enhanced += ', intense and dramatic, cinematic shadows, high contrast, professional quality';
    }

    // Add vertical video orientation
    enhanced += ', vertical video, 9:16 aspect ratio, portrait orientation';

    // Add category-specific keywords
    if (category) {
      enhanced += `, ${category} romance`;
    }

    logger.debug('Prompt enhanced', {
      original: prompt,
      enhanced: enhanced,
      spiciness,
      category
    });

    return enhanced;
  }

  /**
   * Generate mock video response for testing (when API key not configured)
   *
   * @param {object} options - Video generation options
   * @returns {object} Mock video response
   */
  _getMockVideoResponse(options) {
    logger.info('Returning mock video response for testing');

    const aspectRatio = options.aspectRatio || '9:16';
    const duration = options.duration || 15;

    return {
      success: true,
      video: {
        path: 'mock_video_path.mp4',
        filename: 'mock_video.mp4',
        url: '/api/videos/mock_video.mp4',
        fileSize: 1024000,
        fileSizeMB: '1.00',
        duration: duration,
        aspectRatio: aspectRatio,
        width: 1080,
        height: 1920,
        fps: 24,
        codec: 'h264',
        createdAt: new Date().toISOString(),
        validation: {
          passed: true,
          checks: {
            width: { required: 1080, actual: 1080, passed: true },
            height: { required: 1920, actual: 1920, passed: true },
            aspectRatio: { required: '9:16', actual: '9:16', passed: true },
            duration: { min: 3, max: 60, actual: duration, passed: true },
            fps: { min: 10, max: 60, actual: 24, passed: true },
            letterboxing: { hasLetterboxing: false, passed: true }
          },
          report: '✅ Mock video validation passed!\n\n  Resolution: 1080x1920\n  Aspect Ratio: 9:16\n  Duration: 15.00s\n  FPS: 24.00'
        },
        mock: true
      },
      steps: [
        { step: 1, name: 'Image generation', status: 'mock' },
        { step: 2, name: 'Video generation', status: 'mock' },
        { step: 3, name: 'Download and validation', status: 'mock' }
      ],
      mock: true,
      message: 'Fal.ai API key not configured - returning mock response for testing'
    };
  }

  /**
   * Check if service is properly configured
   *
   * @returns {boolean} True if API key is configured
   */
  isConfigured() {
    return !!this.apiKey && this.apiKey !== '';
  }

  /**
   * Get service status
   *
   * @returns {object} Service status
   */
  getStatus() {
    return {
      service: 'fal-ai',
      configured: this.isConfigured(),
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      pollInterval: this.pollInterval
    };
  }

  /**
   * Health check
   *
   * @returns {Promise<object>} Health check result
   */
  async healthCheck() {
    if (!this.apiKey) {
      return {
        healthy: false,
        reason: 'API key not configured'
      };
    }

    try {
      // Try to reach the Fal.ai API (simple health check)
      const response = await fetch(`${this.baseUrl}/flux-schnell`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: 'health check',
          image_size: 'portrait_1080_1920',
          num_inference_steps: 1,
          num_images: 1,
          enable_safety_checker: true
        }),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      // If we get a response (even error), the service is reachable
      return {
        healthy: response.ok || response.status === 401 || response.status === 400,
        status: response.status
      };
    } catch (error) {
      return {
        healthy: false,
        reason: error.message
      };
    }
  }
}

// Create singleton instance
const falAiService = new FalAiService();

export default falAiService;
