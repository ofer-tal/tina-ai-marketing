import winston from 'winston';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimiterService from './rateLimiter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logger for image generation service
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'image-generation' },
  transports: [
    new winston.transports.File({ filename: 'logs/image-generation-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/image-generation.log' }),
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
 * Image Generation Service
 * Generates cover images using RunPod Flux model or other image generation APIs
 *
 * For this implementation, we support:
 * - RunPod Serverless API with Flux model
 * - Mock mode for testing without API credentials
 * - Vertical images (1080x1920) for cover art
 * - Horizontal images (1920x1080) for thumbnails
 * - Square images (1080x1080) for social media
 */
class ImageGenerationService {
  constructor() {
    this.apiKey = process.env.RUNPOD_API_KEY;
    this.endpoint = process.env.RUNPOD_IMAGE_ENDPOINT || process.env.RUNPOD_API_ENDPOINT;
    this.timeout = 300000; // 5 minutes for image generation
    this.pollInterval = 3000; // Check status every 3 seconds
    this.storagePath = process.env.STORAGE_PATH || './storage';
    this.imagesDir = path.join(this.storagePath, 'images');

    // Target dimensions for cover art (9:16 aspect ratio)
    this.coverWidth = 1080;
    this.coverHeight = 1920;

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
      await fs.mkdir(this.imagesDir, { recursive: true });
      logger.info('Storage directory ready', { imagesDir: this.imagesDir });
    } catch (error) {
      logger.error('Failed to create storage directory', { error: error.message });
    }
  }

  /**
   * Generate cover art image from story prompt
   *
   * @param {object} options - Image generation options
   * @param {string} options.prompt - Cover art prompt from story
   * @param {number} options.spiciness - Story spiciness level (0-3)
   * @param {string} options.category - Story category
   * @param {string} options.aspectRatio - Aspect ratio (default: "9:16" for cover art)
   * @param {number} options.width - Image width (default: 1080)
   * @param {number} options.height - Image height (default: 1920)
   * @returns {Promise<object>} Generated image metadata
   */
  async generateCoverArt(options = {}) {
    const {
      prompt,
      spiciness = 0,
      category = '',
      aspectRatio = '9:16',
      width = this.coverWidth,
      height = this.coverHeight
    } = options;

    logger.info('Cover art generation requested', {
      prompt: prompt?.substring(0, 50),
      spiciness,
      category,
      aspectRatio,
      width,
      height
    });

    // Check if running in mock mode
    if (!this.apiKey || !this.endpoint) {
      logger.warn('Running in mock mode - no API credentials');
      return this._generateMockImage({ prompt, spiciness, category, width, height });
    }

    try {
      // Enhance prompt based on spiciness and category
      const enhancedPrompt = this._enhancePrompt(prompt, spiciness, category);

      // Submit generation request to RunPod
      const requestId = await this._submitRequest(enhancedPrompt, width, height);

      // Poll for completion
      const result = await this._pollForResult(requestId);

      // Download and validate image
      const imageData = await this._downloadAndValidateImage(result.output, { width, height });

      logger.info('Cover art generated successfully', {
        requestId,
        imagePath: imageData.path,
        width: imageData.width,
        height: imageData.height
      });

      return {
        success: true,
        mock: false,
        requestId,
        ...imageData,
        prompt: enhancedPrompt,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Cover art generation failed', {
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to generate cover art: ${error.message}`);
    }
  }

  /**
   * Enhance prompt based on spiciness and category
   * @private
   */
  _enhancePrompt(prompt, spiciness, category) {
    let enhanced = prompt;

    // Add spiciness-specific modifiers
    const spicinessModifiers = {
      0: 'sweet romantic, soft lighting, wholesome, family-friendly',
      1: 'sweet romantic, soft lighting, dreamy atmosphere',
      2: 'romantic and passionate, cinematic lighting',
      3: 'intense and dramatic, cinematic shadows, suggestive'
    };

    const modifier = spicinessModifiers[spiciness] || spicinessModifiers[0];
    enhanced += `, ${modifier}`;

    // Add category-specific enhancements
    const categoryEnhancements = {
      'Contemporary': 'modern setting, contemporary romance',
      'Historical': 'period accurate costume, historical setting',
      'Fantasy': 'magical elements, fantasy atmosphere',
      'Paranormal': 'mysterious atmosphere, supernatural elements',
      'Billionaire': 'luxury setting, elegant atmosphere'
    };

    if (category && categoryEnhancements[category]) {
      enhanced += `, ${categoryEnhancements[category]}`;
    }

    // Add technical specifications
    enhanced += ', high quality, detailed, professional photography style';

    return enhanced;
  }

  /**
   * Submit image generation request to RunPod
   * @private
   */
  async _submitRequest(prompt, width, height) {
    logger.info('Submitting image generation request', {
      prompt: prompt.substring(0, 100),
      width,
      height
    });

    const requestBody = {
      prompt: prompt,
      width: width,
      height: height,
      num_images: 1,
      num_inference_steps: 25,
      guidance_scale: 7.5,
      // Flux-specific parameters
      aspect_ratio: width === height ? '1:1' : width < height ? '9:16' : '16:9'
    };

    try {
      // Use rate limiter for API calls
      const response = await rateLimiterService.fetch(this.endpoint, {
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

      logger.info('Image generation request submitted successfully', {
        requestId: result.request_id
      });

      return result.request_id;

    } catch (error) {
      logger.error('Failed to submit image generation request', {
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

    logger.info('Starting poll for image generation result', { requestId });

    while (true) {
      attempts++;
      const elapsed = Date.now() - startTime;

      // Check timeout
      if (elapsed > this.timeout) {
        throw new Error(`RunPod image generation timeout after ${this.timeout}ms`);
      }

      try {
        // Check status with rate limiting
        const response = await rateLimiterService.fetch(`${this.endpoint}/status/${requestId}`, {
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
          logger.info('Image generation completed successfully', {
            requestId,
            attempts,
            elapsed: `${Math.round(elapsed / 1000)}s`
          });
          return result;
        }

        if (result.status === 'FAILED') {
          logger.error('Image generation failed on RunPod', {
            requestId,
            error: result.error
          });
          throw new Error(`RunPod generation failed: ${result.error || 'Unknown error'}`);
        }

        // Still in progress (IN_PROGRESS, IN_QUEUE, etc.)
        if (attempts % 5 === 0) {
          logger.info('Still polling for image...', {
            requestId,
            status: result.status,
            elapsed: `${Math.round(elapsed / 1000)}s`
          });
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, this.pollInterval));

      } catch (error) {
        logger.error('Error polling for image result', {
          requestId,
          attempt: attempts,
          error: error.message
        });

        // Don't throw immediately, might be a temporary network issue
        if (attempts > 3) {
          throw error;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.pollInterval));
      }
    }
  }

  /**
   * Download and validate image from RunPod output
   * @private
   */
  async _downloadAndValidateImage(output, options) {
    try {
      // RunPod typically returns image URL in output
      const imageUrl = output.image_url || output.url || (Array.isArray(output) ? output[0] : output);

      if (!imageUrl) {
        throw new Error('No image URL in RunPod output');
      }

      logger.info('Downloading image', { imageUrl });

      // Download image with rate limiting
      const response = await rateLimiterService.fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `cover_${timestamp}.png`;
      const filePath = path.join(this.imagesDir, filename);

      // Save to disk
      await fs.writeFile(filePath, uint8Array);

      logger.info('Image saved successfully', {
        filename,
        size: `${(uint8Array.length / 1024).toFixed(2)} KB`
      });

      // Validate image dimensions (basic check - we'd need sharp package for real validation)
      // For now, we'll just verify the file was created
      const stats = await fs.stat(filePath);
      if (stats.size === 0) {
        throw new Error('Downloaded image is empty');
      }

      return {
        path: filePath,
        filename,
        url: `/api/images/${filename}`,
        size: stats.size,
        width: options.width,
        height: options.height,
        format: 'png'
      };

    } catch (error) {
      logger.error('Failed to download/validate image', {
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to download image: ${error.message}`);
    }
  }

  /**
   * Generate mock image for testing
   * @private
   */
  async _generateMockImage(options) {
    logger.info('Generating mock image', options);

    const { prompt, spiciness, category, width, height } = options;

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create a simple placeholder image metadata
    const timestamp = Date.now();
    const filename = `mock_cover_${timestamp}.png`;
    const filePath = path.join(this.imagesDir, filename);

    // Create a minimal PNG (1x1 transparent pixel)
    const minimalPng = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk start
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
      0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, // IDAT chunk
      0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, // IEND chunk
      0xAE, 0x42, 0x60, 0x82
    ]);

    await fs.writeFile(filePath, minimalPng);

    logger.info('Mock image created', {
      filename,
      path: filePath
    });

    return {
      success: true,
      mock: true,
      path: filePath,
      filename,
      url: `/api/images/${filename}`,
      size: minimalPng.length,
      width,
      height,
      format: 'png',
      prompt,
      generatedAt: new Date().toISOString(),
      note: 'This is a mock image - configure RUNPOD_API_KEY for real generation'
    };
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      service: 'image-generation',
      configured: !!(this.apiKey && this.endpoint),
      endpoint: this.endpoint ? '***configured***' : 'not configured',
      storagePath: this.imagesDir,
      mockMode: !(this.apiKey && this.endpoint)
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    if (!this.apiKey || !this.endpoint) {
      return {
        healthy: false,
        reason: 'API credentials not configured'
      };
    }

    try {
      // Try to reach the endpoint with rate limiting (won't actually generate, just check connectivity)
      const response = await rateLimiterService.fetch(this.endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

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
const imageGenerationService = new ImageGenerationService();

export default imageGenerationService;
