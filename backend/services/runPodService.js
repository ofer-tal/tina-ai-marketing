import winston from 'winston';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logger for RunPod service
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'runpod-video' },
  transports: [
    new winston.transports.File({ filename: 'logs/runpod-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/runpod.log' }),
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
 * RunPod Video Generation Service
 * Generates vertical video content using RunPod PixelWave/Flux endpoint
 *
 * RunPod Serverless API:
 * - Submit: POST to endpoint with input data
 * - Poll: GET request_id status until completed
 * - Result: Retrieve generated video URL
 *
 * Models supported:
 * - PixelWave: Video generation from text prompts
 * - Flux: Image generation (can be used for video frames)
 */
class RunPodService {
  constructor() {
    this.apiKey = process.env.RUNPOD_API_KEY;
    this.endpoint = process.env.RUNPOD_API_ENDPOINT;
    this.timeout = 600000; // 10 minutes for video generation (longer than Fal.ai)
    this.pollInterval = 5000; // Check status every 5 seconds
    this.storagePath = process.env.STORAGE_PATH || './storage';
    this.videosDir = path.join(this.storagePath, 'videos');

    if (!this.apiKey) {
      logger.warn('RUNPOD_API_KEY not configured - service will run in mock mode');
    }
    if (!this.endpoint) {
      logger.warn('RUNPOD_API_ENDPOINT not configured - service will run in mock mode');
    }

    this._ensureStorageDirectory();
  }

  /**
   * Ensure storage directory exists
   * @private
   */
  async _ensureStorageDirectory() {
    try {
      await fs.mkdir(this.videosDir, { recursive: true });
      logger.info('Storage directory ready', { videosDir: this.videosDir });
    } catch (error) {
      logger.error('Failed to create storage directory', { error: error.message });
    }
  }

  /**
   * Generate vertical video from story prompt
   *
   * @param {object} options - Video generation options
   * @param {string} options.prompt - Story prompt for video generation
   * @param {number} options.spiciness - Story spiciness level (0-3)
   * @param {string} options.category - Story category
   * @param {string} options.aspectRatio - Aspect ratio (default: "9:16" for vertical)
   * @param {number} options.duration - Video duration in seconds (default: 10)
   * @param {number} options.fps - Frames per second (default: 24)
   * @param {number} options.resolution - Resolution height (default: 1080)
   * @returns {Promise<object>} Generated video metadata
   */
  async generateVideo(options = {}) {
    const {
      prompt,
      spiciness = 0,
      category = '',
      aspectRatio = '9:16',
      duration = 10,
      fps = 24,
      resolution = 1080
    } = options;

    logger.info('Starting RunPod video generation', {
      prompt: prompt?.substring(0, 100),
      spiciness,
      category,
      aspectRatio,
      duration,
      fps,
      resolution
    });

    // Check if API is configured
    if (!this.apiKey || !this.endpoint || this.apiKey === '' || this.endpoint === '') {
      logger.warn('RunPod API not configured, returning mock response');
      return this._getMockVideoResponse(options);
    }

    try {
      // Step 1: Submit generation request to RunPod
      logger.info('Step 1: Submitting generation request to RunPod');
      const requestId = await this._submitGenerationRequest({
        prompt,
        spiciness,
        category,
        aspectRatio,
        duration,
        fps,
        resolution
      });

      // Step 2: Poll for completion
      logger.info('Step 2: Polling for generation completion', { requestId });
      const result = await this._pollForResult(requestId);

      // Step 3: Download and validate video
      logger.info('Step 3: Downloading and validating video');
      const videoMetadata = await this._downloadAndValidateVideo(result.output, {
        aspectRatio,
        duration
      });

      logger.info('RunPod video generation completed successfully', {
        videoPath: videoMetadata.path,
        duration: videoMetadata.duration,
        fileSize: videoMetadata.fileSize
      });

      return {
        success: true,
        video: videoMetadata,
        requestId,
        steps: [
          { step: 1, name: 'Submit request', status: 'completed', output: requestId },
          { step: 2, name: 'Poll for result', status: 'completed', output: result.status },
          { step: 3, name: 'Download and validation', status: 'completed', output: videoMetadata.path }
        ]
      };

    } catch (error) {
      logger.error('RunPod video generation failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Submit generation request to RunPod
   * @private
   */
  async _submitGenerationRequest(options) {
    const enhancedPrompt = this._enhancePromptForVideo(
      options.prompt,
      options.spiciness,
      options.category
    );

    logger.info('Submitting to RunPod endpoint', {
      endpoint: this.endpoint,
      prompt: enhancedPrompt.substring(0, 100)
    });

    try {
      // Calculate dimensions based on aspect ratio and resolution
      const dimensions = this._calculateDimensions(options.aspectRatio, options.resolution);

      const requestBody = {
        prompt: enhancedPrompt,
        width: dimensions.width,
        height: dimensions.height,
        num_frames: options.duration * options.fps,
        fps: options.fps,
        num_inference_steps: 25,
        guidance_scale: 7.5,
        seed: -1 // Random seed
      };

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: requestBody
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`RunPod request failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      if (!result.request_id) {
        throw new Error('No request_id returned from RunPod');
      }

      logger.info('Generation request submitted successfully', {
        requestId: result.request_id
      });

      return result.request_id;

    } catch (error) {
      logger.error('Failed to submit generation request', {
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to submit RunPod request: ${error.message}`);
    }
  }

  /**
   * Poll RunPod for generation result
   * @private
   */
  async _pollForResult(requestId) {
    const startTime = Date.now();
    let attempts = 0;

    logger.info('Starting poll for result', { requestId });

    while (true) {
      attempts++;
      const elapsed = Date.now() - startTime;

      // Check timeout
      if (elapsed > this.timeout) {
        throw new Error(`RunPod generation timeout after ${this.timeout}ms`);
      }

      try {
        const response = await fetch(`${this.endpoint}/status/${requestId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Status check failed: ${response.status}`);
        }

        const result = await response.json();

        // Check status
        if (result.status === 'COMPLETED') {
          logger.info('Generation completed successfully', {
            requestId,
            attempts,
            elapsed: `${Math.round(elapsed / 1000)}s`
          });
          return result;
        }

        if (result.status === 'FAILED') {
          logger.error('Generation failed on RunPod', {
            requestId,
            error: result.error
          });
          throw new Error(`RunPod generation failed: ${result.error || 'Unknown error'}`);
        }

        // Still in progress (IN_PROGRESS, IN_QUEUE, etc.)
        if (attempts % 10 === 0) {
          logger.info('Still polling...', {
            requestId,
            status: result.status,
            elapsed: `${Math.round(elapsed / 1000)}s`
          });
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, this.pollInterval));

      } catch (error) {
        logger.error('Error polling for result', {
          requestId,
          attempt: attempts,
          error: error.message
        });

        // Don't throw immediately, might be a temporary network issue
        if (attempts > 5) {
          throw error;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.pollInterval));
      }
    }
  }

  /**
   * Download and validate video from RunPod output
   * @private
   */
  async _downloadAndValidateVideo(output, options) {
    try {
      // RunPod typically returns video URL in output
      const videoUrl = output.video_url || output.url || output;

      if (!videoUrl) {
        throw new Error('No video URL in RunPod output');
      }

      logger.info('Downloading video', { videoUrl });

      // Download video
      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error(`Failed to download video: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `runpod_${timestamp}.mp4`;
      const filePath = path.join(this.videosDir, filename);

      // Save to disk
      await fs.writeFile(filePath, uint8Array);

      // Get file stats
      const stats = await fs.stat(filePath);

      logger.info('Video downloaded successfully', {
        filePath,
        fileSize: stats.size,
        sizeMB: (stats.size / (1024 * 1024)).toFixed(2)
      });

      return {
        path: filePath,
        filename,
        url: videoUrl,
        fileSize: stats.size,
        sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
        duration: options.duration,
        aspectRatio: options.aspectRatio,
        source: 'runpod'
      };

    } catch (error) {
      logger.error('Failed to download/validate video', {
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to download video: ${error.message}`);
    }
  }

  /**
   * Calculate dimensions based on aspect ratio and resolution
   * @private
   */
  _calculateDimensions(aspectRatio, resolution) {
    const ratioMap = {
      '9:16': { width: Math.round(resolution * 9 / 16), height: resolution },
      '16:9': { width: resolution, height: Math.round(resolution * 9 / 16) },
      '1:1': { width: resolution, height: resolution },
      '4:5': { width: Math.round(resolution * 4 / 5), height: resolution }
    };

    return ratioMap[aspectRatio] || ratioMap['9:16'];
  }

  /**
   * Enhance prompt based on spiciness and category
   * @private
   */
  _enhancePromptForVideo(prompt, spiciness, category) {
    let enhanced = prompt;

    // Add spiciness-based style
    const spicinessModifiers = {
      0: 'sweet romantic, soft lighting, dreamy atmosphere, gentle',
      1: 'sweet romantic, soft lighting, dreamy atmosphere, gentle',
      2: 'romantic and passionate, cinematic lighting, intimate',
      3: 'intense and dramatic, cinematic shadows, romantic tension'
    };

    const modifier = spicinessModifiers[spiciness] || spicinessModifiers[0];
    enhanced = `${modifier}, ${enhanced}`;

    // Add technical specifications for video generation
    enhanced = `${enhanced}, vertical video, 9:16 aspect ratio, high quality, detailed`;

    // Add category-specific enhancements
    if (category) {
      const categoryEnhancements = {
        'Contemporary': 'modern setting, realistic',
        'Historical': 'period accurate, historical costumes',
        'Fantasy': 'magical, ethereal effects',
        'Sci-Fi': 'futuristic, advanced technology'
      };

      const categoryMod = categoryEnhancements[category];
      if (categoryMod) {
        enhanced = `${enhanced}, ${categoryMod}`;
      }
    }

    return enhanced;
  }

  /**
   * Generate mock video response for testing
   * @private
   */
  _getMockVideoResponse(options) {
    logger.info('Returning mock video response');

    return {
      success: true,
      video: {
        path: 'mock_videos/mock_video.mp4',
        filename: 'mock_video.mp4',
        url: 'https://mock.runpod/video.mp4',
        fileSize: 2048000, // ~2MB
        sizeMB: '2.00',
        duration: options.duration || 10,
        aspectRatio: options.aspectRatio || '9:16',
        source: 'runpod-mock'
      },
      requestId: 'mock-request-id',
      steps: [
        { step: 1, name: 'Submit request', status: 'completed', output: 'mock-request-id' },
        { step: 2, name: 'Poll for result', status: 'completed', output: 'COMPLETED' },
        { step: 3, name: 'Download and validation', status: 'completed', output: 'mock_videos/mock_video.mp4' }
      ],
      mock: true
    };
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      service: 'runpod',
      configured: !!(this.apiKey && this.endpoint && this.apiKey !== '' && this.endpoint !== ''),
      endpoint: this.endpoint ? this.endpoint.replace(/\/\/[^@]+@/, '//***@') : null,
      timeout: this.timeout,
      pollInterval: this.pollInterval,
      storagePath: this.videosDir
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    if (!this.apiKey || !this.endpoint) {
      return {
        healthy: false,
        reason: 'API key or endpoint not configured'
      };
    }

    try {
      // Try to reach the endpoint (without submitting a job)
      const response = await fetch(this.endpoint.replace(/\/run\/.*$/, '/status'), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      // Even if 404, the endpoint is reachable
      return {
        healthy: response.ok || response.status === 404,
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
const runPodService = new RunPodService();

export default runPodService;
