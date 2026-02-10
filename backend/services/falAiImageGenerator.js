/**
 * Fal.ai FLUX.2 Image Generator Service
 *
 * Generates images using fal.ai's FLUX.2 model (full version, not turbo).
 * This is the default image generator for better consistency and anatomy.
 *
 * Features:
 * - 9:16 aspect ratio for vertical videos
 * - Safety checker DISABLED for erotic content
 * - Story-based prompt generation
 */

import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { getLogger } from '../utils/logger.js';

// Load .env file
dotenv.config();

const FAL_AI_API_KEY = process.env.FAL_AI_API_KEY;

const logger = getLogger('services', 'fal-ai-image-generator');

// Debug: Check if API key is loaded
if (!FAL_AI_API_KEY) {
  logger.warn('FAL_AI_API_KEY not found in environment variables');
} else {
  logger.info('FAL_AI_API_KEY loaded', {
    exists: true,
    length: FAL_AI_API_KEY.length,
    prefix: FAL_AI_API_KEY.substring(0, 8)
  });
}

// Default generation parameters for FLUX.2 (full version)
const DEFAULT_GENERATION_PARAMS = {
  guidance_scale: 2.5,
  output_format: 'png',
  enable_safety_checker: false,  // DISABLED for erotic content
};

// Aspect ratio dimensions (9:16 for vertical videos)
const ASPECT_RATIOS = {
  '9:16': { width: 1024, height: 1792 },   // ~0.57 ratio, fits within 512-2048 limit
  '16:9': { width: 1792, height: 1024 },
  '1:1': { width: 1024, height: 1024 },
  '4:3': { width: 1024, height: 768 },
  '3:4': { width: 768, height: 1024 },
};

/**
 * Initialize fal.ai client dynamically
 * fal-ai/client is optional - we can also use raw HTTP
 */
let falClient = null;
let isConfigured = false;

async function getClient() {
  if (falClient && isConfigured) return falClient;

  if (!FAL_AI_API_KEY) {
    throw new Error('FAL_AI_API_KEY not set in environment');
  }

  try {
    // Dynamic import to avoid issues if package not installed
    const falModule = await import('@fal-ai/client');
    const fal = falModule.fal;

    // Configure with API key BEFORE any operations
    // The config method sets credentials globally for the fal module
    fal.config({
      credentials: FAL_AI_API_KEY
    });

    // Log masked key for debugging
    const maskedKey = FAL_AI_API_KEY.substring(0, 8) + '...' + FAL_AI_API_KEY.substring(FAL_AI_API_KEY.length - 4);
    logger.info('fal.ai client configured', { maskedKey });

    falClient = fal;
    isConfigured = true;
    return falClient;
  } catch (error) {
    logger.error('Failed to load fal-ai/client', { error: error.message });
    throw new Error('fal-ai/client package not installed. Run: npm install @fal-ai/client');
  }
}

/**
 * Generate image using FLUX.2 (full version) via fal.ai
 *
 * @param {string} prompt - The prompt to generate an image from
 * @param {Object} options - Generation options
 * @returns {Promise<{buffer: Buffer, contentType: string, url?: string}>}
 */
async function generateFlux2Image(
  prompt,
  guidance_scale = DEFAULT_GENERATION_PARAMS.guidance_scale,
  width = ASPECT_RATIOS['9:16'].width,
  height = ASPECT_RATIOS['9:16'].height,
  output_format = DEFAULT_GENERATION_PARAMS.output_format,
  enable_safety_checker = DEFAULT_GENERATION_PARAMS.enable_safety_checker
) {
  // Log the FULL prompt for debugging
  logger.info('=== GENERATING FLUX.2 IMAGE ===', {
    model: 'fal-ai/flux-2 (FULL VERSION, NOT TURBO)',
    promptLength: prompt.length,
    fullPrompt: prompt,  // FULL PROMPT - not truncated
    guidance_scale,
    width,
    height,
    output_format,
    enable_safety_checker
  });

  const startTime = Date.now();

  try {
    const fal = await getClient();

    // Call fal.ai FLUX.2 API (full version, NOT turbo, NOT schnell)
    // Using ONLY fal-ai/flux-2 for best quality and anatomy
    const result = await fal.subscribe('fal-ai/flux-2', {
      input: {
        prompt,
        image_size: {
          width,
          height
        },
        guidance_scale,
        output_format,
        enable_safety_checker,
        num_images: 1
      },
      logs: false
    });

    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.info('fal.ai FLUX.2 (full) completed', { elapsedSeconds });

    if (!result.data?.images?.[0]?.url) {
      throw new Error('Invalid response from fal.ai: missing image URL');
    }

    const imageUrl = result.data.images[0].url;
    const hasNsfwConcepts = result.data.has_nsfw_concepts?.[0] || false;

    logger.info('Generated image', {
      url: imageUrl,
      hasNsfwConcepts,
      width: result.data.images[0].width,
      height: result.data.images[0].height
    });

    // Download the image to get a buffer
    const imageBuffer = await downloadImage(imageUrl);

    return {
      buffer: imageBuffer,
      contentType: `image/${output_format}`,
      url: imageUrl,
      hasNsfwConcepts
    };
  } catch (error) {
    logger.error('Error generating FLUX.2 (full) image', { error: error.message });
    throw error;
  }
}

/**
 * Download image from URL to buffer
 */
async function downloadImage(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generate image and save to file
 */
async function generateAndSaveImage(prompt, outputPath, options = {}) {
  const {
    guidance_scale = DEFAULT_GENERATION_PARAMS.guidance_scale,
    width = ASPECT_RATIOS['9:16'].width,
    height = ASPECT_RATIOS['9:16'].height,
    output_format = DEFAULT_GENERATION_PARAMS.output_format,
    enable_safety_checker = DEFAULT_GENERATION_PARAMS.enable_safety_checker,
  } = options;

  try {
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    // Generate image
    const { buffer, url } = await generateFlux2Image(
      prompt,
      guidance_scale,
      width,
      height,
      output_format,
      enable_safety_checker
    );

    // Save to file
    await fs.writeFile(outputPath, buffer);
    logger.info('Saved image', { outputPath, url });

    return {
      path: outputPath,
      size: buffer.length,
      url
    };
  } catch (error) {
    logger.error('Error generating/saving image', { error: error.message });
    throw error;
  }
}

/**
 * Enhance prompt with style and safety modifiers
 * NOTE: For FLUX.2 (full), we keep it erotic but NOT explicit
 * Safety checker is DISABLED, so we must self-moderate
 *
 * IMPORTANT: Clothing should be story-appropriate! Don't force lingerie/underwear
 * in historical settings or contexts where it doesn't make sense.
 * The ONLY requirement is: genitals and nipples must be covered.
 */
function enhancePrompt(basePrompt, spiciness = 1) {
  let enhancedPrompt = basePrompt;

  // Add artistic style based on spiciness
  const stylePrefixes = {
    0: 'Elegant and romantic illustration, ',
    1: 'Romantic and sensual illustration, ',
    2: 'Passionate and romantic illustration, ',
    3: 'Steamy and romantic illustration, '
  };

  enhancedPrompt = (stylePrefixes[spiciness] || stylePrefixes[1]) + enhancedPrompt;

  // CRITICAL: Safety requirements - EROTIC BUT NOT EXPLICIT
  // Focus on what NOT to show, rather than prescribing specific clothing
  const safetyModifiers = [
    'no explicit nudity',
    'genitals and nipples always covered or obscured',
    'tasteful reveal, not explicit',
    'intimate but tasteful',
    'erotic atmosphere without crossing into pornography',
    'romantic and sexy, safe for social media',
    'clothing appropriate to story setting and context'
  ];

  // CRITICAL: Anatomy directives to prevent extra limbs/fingers
  const anatomyModifiers = [
    'correct human anatomy with exactly 2 arms and 2 legs per person',
    'exactly 5 fingers on each hand, no extra fingers',
    'exactly 5 toes on each foot, no extra toes',
    'no missing limbs, no extra limbs attached anywhere',
    'no morphing or partial limbs, no floating body parts',
    'hands and feet clearly defined with natural proportions',
    'natural pose, limbs bend in anatomically correct ways'
  ];

  // Add visual quality modifiers
  const qualityModifiers = [
    'high quality',
    'highly detailed',
    'beautiful composition',
    'professional artwork',
    'digital illustration',
    'artistic style'
  ];

  enhancedPrompt += ', ' + safetyModifiers.join(', ');
  enhancedPrompt += ', ' + anatomyModifiers.join(', ');
  enhancedPrompt += ', ' + qualityModifiers.join(', ');

  return enhancedPrompt;
}

/**
 * Generate scene prompts from story description
 * Same logic as PixelWave for consistency
 */
function generateScenePrompt(storyDescription, storyTitle, spiciness = 1) {
  const description = (storyDescription || '').toLowerCase();
  const titleLower = (storyTitle || '').toLowerCase();

  // Detect LGBTQ+ themes
  const lgbtqKeywords = [
    'lesbian', 'gay', 'queer', 'lgbt', 'lgbtq', 'wlw', 'sapphic',
    'two women', 'female couple', 'women loving women'
  ];
  const isLGBTQ = lgbtqKeywords.some(
    keyword => description.includes(keyword) || titleLower.includes(keyword)
  );

  // Determine couple type
  const coupleDescription = isLGBTQ
    ? 'lesbian couple, two women together'
    : 'heterosexual couple, man and woman together';

  // Visual style variations
  const visualStyles = [
    {
      style: 'Watercolor painting style, soft flowing colors, artistic brushstrokes, dreamy and ethereal, not photorealistic',
      colors: 'soft pastels with gentle color transitions, lavender and rose tones',
    },
    {
      style: 'Digital art illustration style, clean vector art aesthetic, stylized characters, modern romantic art',
      colors: 'vibrant but harmonious colors with clean gradients',
    },
    {
      style: 'Impressionist oil painting, visible brushstrokes, Monet-inspired, artistic and textured',
      colors: 'impressionist palette with soft blues, pinks, and warm golds',
    },
    {
      style: 'Fantasy book cover art style, romantic digital illustration, artistic composition',
      colors: 'rich romantic colors with deep purples, reds, and golds',
    }
  ];

  const visualStyle = visualStyles[Math.floor(Math.random() * visualStyles.length)];

  // Build the prompt
  let prompt = storyDescription || storyTitle || 'romantic scene';
  prompt += `, ${visualStyle.style}, ${visualStyle.colors}`;
  prompt += `, ${coupleDescription}`;
  prompt += ', cinematic composition, atmospheric mood';
  prompt += ', female gaze perspective, elegant and sensual';

  return enhancePrompt(prompt, spiciness);
}

/**
 * Generate image for a story
 * Compatible interface with runPodImageGenerator
 */
async function generateForStory(story, options = {}) {
  const {
    outputPath = null,
    spiciness = story?.spiciness || 1,
    aspectRatio = '9:16',
    prompt: providedPrompt = null,  // Allow caller to provide custom prompt
  } = options;

  // Determine dimensions based on aspect ratio
  const dimensions = ASPECT_RATIOS[aspectRatio] || ASPECT_RATIOS['9:16'];
  const { width, height } = dimensions;

  // Use provided prompt or generate from story
  const prompt = providedPrompt || generateScenePrompt(
    story?.description || '',
    story?.title || '',
    spiciness
  );

  // Generate output path if not provided
  const finalOutputPath = outputPath || path.join(
    process.cwd(),
    'storage',
    'images',
    'tier1',
    `${Date.now()}_${story?._id || 'story'}.png`
  );

  // Generate and save
  const result = await generateAndSaveImage(prompt, finalOutputPath, {
    width,
    height,
    ...options
  });

  logger.info('Generated image for story', {
    storyId: story?._id,
    outputPath: result.path
  });

  return {
    ...result,
    prompt,
    metadata: {
      spiciness,
      aspectRatio,
      width,
      height,
      model: 'flux-2',
      provider: 'fal.ai'
    }
  };
}

/**
 * Validate image buffer
 */
function validateImage(buffer) {
  if (!buffer || buffer.length === 0) {
    throw new Error('Invalid image buffer: empty or null');
  }

  // Check for PNG signature
  if (buffer.length < 8 || buffer[0] !== 0x89 || buffer[1] !== 0x50) {
    // Also check for JPEG signature
    if (buffer.length < 3 || buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
      throw new Error('Invalid image format: not PNG or JPEG');
    }
  }

  return true;
}

/**
 * Health check
 */
async function healthCheck() {
  return {
    healthy: !!FAL_AI_API_KEY,
    hasApiKey: !!FAL_AI_API_KEY,
    model: 'flux-2',
    provider: 'fal.ai'
  };
}

export {
  generateFlux2Image,
  generateAndSaveImage,
  generateForStory,
  generateScenePrompt,
  enhancePrompt,
  validateImage,
  healthCheck,
  DEFAULT_GENERATION_PARAMS,
  ASPECT_RATIOS
};

export default {
  generateFlux2Image,
  generateAndSaveImage,
  generateForStory,
  generateScenePrompt,
  enhancePrompt,
  validateImage,
  healthCheck
};
