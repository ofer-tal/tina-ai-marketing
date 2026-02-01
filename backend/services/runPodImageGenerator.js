/**
 * RunPod Image Generator Service
 *
 * Wrapper for PixelWave/Flux image generation via RunPod serverless.
 * Based on sample code in docs/sample_code/image-generator.js
 *
 * Features:
 * - 9:16 aspect ratio for vertical videos
 * - Spiciness-aware prompting with NO NUDITY safeguards
 * - Story-based prompt generation
 */

import dotenv from 'dotenv';
import { default as runpodSdk } from 'runpod-sdk';
import asyncRetry from 'async-retry';
import fs from 'fs/promises';
import path from 'path';
import { getLogger } from '../utils/logger.js';

dotenv.config();

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_ENDPOINT_ID_PIXELWAVE = process.env.RUNPOD_ENDPOINT_ID_PIXELWAVE;

const logger = getLogger('services', 'runpod-image-generator');

// Initialize RunPod
const runpod = RUNPOD_API_KEY ? runpodSdk(RUNPOD_API_KEY) : null;
const endpoint = runpod && RUNPOD_ENDPOINT_ID_PIXELWAVE ? runpod.endpoint(RUNPOD_ENDPOINT_ID_PIXELWAVE) : null;

// Default XTTS parameters (from production)
const DEFAULT_GENERATION_PARAMS = {
  CFG: 3.5,
  steps: 15,
  width: 1024,
  height: 1792, // 9:16 aspect ratio for vertical videos
};

/**
 * Get PixelWave ComfyUI workflow
 */
function getPixelWaveComfyWorkflow(prompt, steps, width, height, CFG) {
  return {
    5: {
      inputs: {
        width: ['70', 0],
        height: ['71', 0],
        batch_size: 1,
      },
      class_type: 'EmptyLatentImage',
      _meta: { title: 'Empty Latent Image' },
    },
    6: {
      inputs: {
        text: ['28', 0],
        clip: ['11', 0],
      },
      class_type: 'CLIPTextEncode',
      _meta: { title: 'CLIP Text Encode (Prompt)' },
    },
    8: {
      inputs: {
        samples: ['13', 0],
        vae: ['10', 0],
      },
      class_type: 'VAEDecode',
      _meta: { title: 'VAE Decode' },
    },
    9: {
      inputs: {
        filename_prefix: 'MarkuryFLUX',
        images: ['8', 0],
      },
      class_type: 'SaveImage',
      _meta: { title: 'Save Image' },
    },
    10: {
      inputs: {
        vae_name: 'ae.safetensors',
      },
      class_type: 'VAELoader',
      _meta: { title: 'Load VAE' },
    },
    11: {
      inputs: {
        clip_name1: 't5xxl_fp8_e4m3fn.safetensors',
        clip_name2: 'clip_l.safetensors',
        type: 'flux',
      },
      class_type: 'DualCLIPLoader',
      _meta: { title: 'DualCLIPLoader' },
    },
    12: {
      inputs: {
        unet_name: 'pixelwave_flux1_dev_bf16_03.safetensors',
        weight_dtype: 'fp8_e4m3fn',
      },
      class_type: 'UNETLoader',
      _meta: { title: 'Load Diffusion Model' },
    },
    13: {
      inputs: {
        noise: ['25', 0],
        guider: ['22', 0],
        sampler: ['16', 0],
        sigmas: ['17', 0],
        latent_image: ['5', 0],
      },
      class_type: 'SamplerCustomAdvanced',
      _meta: { title: 'SamplerCustomAdvanced' },
    },
    16: {
      inputs: {
        sampler_name: 'dpmpp_2m',
      },
      class_type: 'KSamplerSelect',
      _meta: { title: 'KSamplerSelect' },
    },
    17: {
      inputs: {
        scheduler: 'sgm_uniform',
        steps: steps,
        denoise: 1,
        model: ['61', 0],
      },
      class_type: 'BasicScheduler',
      _meta: { title: 'BasicScheduler' },
    },
    22: {
      inputs: {
        model: ['61', 0],
        conditioning: ['60', 0],
      },
      class_type: 'BasicGuider',
      _meta: { title: 'BasicGuider' },
    },
    25: {
      inputs: {
        noise_seed: Math.floor(Math.random() * 1000000000000000),
      },
      class_type: 'RandomNoise',
      _meta: { title: 'RandomNoise' },
    },
    28: {
      inputs: {
        string: prompt,
      },
      class_type: 'String Literal',
      _meta: { title: 'String Literal' },
    },
    60: {
      inputs: {
        guidance: CFG,
        conditioning: ['6', 0],
      },
      class_type: 'FluxGuidance',
      _meta: { title: 'FluxGuidance' },
    },
    61: {
      inputs: {
        max_shift: 1.15,
        base_shift: 0.5,
        width: ['70', 0],
        height: ['71', 0],
        model: ['12', 0],
      },
      class_type: 'ModelSamplingFlux',
      _meta: { title: 'ModelSamplingFlux' },
    },
    70: {
      inputs: {
        int: width,
      },
      class_type: 'Int Literal',
      _meta: { title: 'Width' },
    },
    71: {
      inputs: {
        int: height,
      },
      class_type: 'Int Literal',
      _meta: { title: 'Height' },
    },
    72: {
      inputs: {
        lora_name: '0615-1500.safetensors',
        strength_model: 1,
      },
      class_type: 'LoraLoaderModelOnly',
      _meta: { title: 'LoraLoaderModelOnly' },
    },
  };
}

/**
 * Enhance prompt with style and safety guards
 * CRITICAL: PixelWave is uncensored - must add explicit negative prompting
 * IMPORTANT: Keep images erotic and sexy, but NO EXPLICIT NUDITY (genitalia, nipples must be covered)
 *
 * Clothing should be story-appropriate! Don't force lingerie/underwear in historical settings.
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
 * Generate PixelWave image
 */
async function generatePixelWaveImage(
  prompt,
  CFG = DEFAULT_GENERATION_PARAMS.CFG,
  steps = DEFAULT_GENERATION_PARAMS.steps,
  width = DEFAULT_GENERATION_PARAMS.width,
  height = DEFAULT_GENERATION_PARAMS.height,
) {
  logger.info('Generating PixelWave image', {
    prompt: prompt.substring(0, 100),
    CFG,
    steps,
    width,
    height
  });

  const runPayload = {
    input: {
      workflow: getPixelWaveComfyWorkflow(prompt, steps, width, height, CFG),
    },
  };

  const startTime = Date.now();

  try {
    // Manual retry loop
    let lastError;
    let result;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        result = await endpoint.runSync(runPayload);
        break;
      } catch (error) {
        lastError = error;
        logger.warn('RunPod attempt failed', {
          attempt,
          error: error.message
        });

        // Don't retry on authentication errors
        if (error.message.includes('401') || error.message.includes('403')) {
          throw error;
        }

        // Wait before retry
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    if (!result) {
      throw lastError;
    }

    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.info('RunPod completed', { elapsedSeconds });

    if (result.status !== 'COMPLETED') {
      throw new Error(`Generate image request failed with status: ${result.status}`);
    }

    const imageDataBase64 = result.output.message;
    const buffer = Buffer.from(imageDataBase64, 'base64');

    logger.info('Generated image', {
      size: `${(buffer.length / 1024).toFixed(0)}KB`
    });

    return {
      buffer,
      contentType: 'image/png',
    };
  } catch (error) {
    logger.error('Error generating image', { error: error.message });
    throw error;
  }
}

/**
 * Generate image and save to file
 */
async function generateAndSaveImage(prompt, outputPath, options = {}) {
  const {
    CFG = DEFAULT_GENERATION_PARAMS.CFG,
    steps = DEFAULT_GENERATION_PARAMS.steps,
    width = DEFAULT_GENERATION_PARAMS.width,
    height = DEFAULT_GENERATION_PARAMS.height,
  } = options;

  try {
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    // Generate image
    const { buffer } = await generatePixelWaveImage(
      prompt,
      CFG,
      steps,
      width,
      height,
    );

    // Save to file
    await fs.writeFile(outputPath, buffer);
    logger.info('Saved image', { outputPath });

    return {
      path: outputPath,
      size: buffer.length
    };
  } catch (error) {
    logger.error('Error generating/saving image', { error: error.message });
    throw error;
  }
}

/**
 * Generate scene prompts from story description
 */
function generateScenePrompt(storyDescription, storyTitle, storyCategory, spiciness = 1) {
  // First check the category field (most reliable)
  const isLGBTQ = storyCategory?.toLowerCase() === 'lgbtq+' ||
                   storyCategory?.toLowerCase() === 'lgbtq';

  // Fallback to keyword detection if category doesn't indicate LGBTQ+
  let isLGBTQByKeywords = false;
  if (!isLGBTQ) {
    const description = (storyDescription || '').toLowerCase();
    const titleLower = (storyTitle || '').toLowerCase();
    const lgbtqKeywords = [
      'lesbian', 'gay', 'queer', 'lgbt', 'lgbtq', 'wlw', 'sapphic',
      'two women', 'female couple', 'women loving women'
    ];
    isLGBTQByKeywords = lgbtqKeywords.some(
      keyword => description.includes(keyword) || titleLower.includes(keyword)
    );
  }

  // Determine couple type - default to heterosexual for 85% of audience
  const coupleDescription = (isLGBTQ || isLGBTQByKeywords)
    ? 'Same-sex LGBTQ+ couple'  // Let story context dictate gay vs lesbian
    : 'Heterosexual couple, man and woman together';

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

  // Build the prompt with EXPLICIT couple type specification first
  let prompt = storyDescription || storyTitle || 'romantic scene';
  prompt += `, ${coupleDescription}`;  // Put couple type early for stronger influence
  prompt += `, ${visualStyle.style}, ${visualStyle.colors}`;
  prompt += ', cinematic composition, atmospheric mood';
  prompt += ', female gaze perspective, elegant and sensual';

  return enhancePrompt(prompt, spiciness);
}

/**
 * Generate image for a story
 */
async function generateForStory(story, options = {}) {
  const {
    outputPath = null,
    spiciness = story?.spiciness || 1,
    aspectRatio = '9:16',
    prompt: providedPrompt = null,  // Allow caller to provide custom prompt
  } = options;

  // Determine dimensions based on aspect ratio
  const dimensions = {
    '9:16': { width: 1024, height: 1792 },
    '16:9': { width: 1920, height: 1080 },
    '1:1': { width: 1024, height: 1024 },
  };
  const { width, height } = dimensions[aspectRatio] || dimensions['9:16'];

  // Use provided prompt or generate from story
  const prompt = providedPrompt || generateScenePrompt(
    story?.description || '',
    story?.title || '',
    story?.category || '',  // Pass category for proper couple type detection
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
      height
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
    throw new Error('Invalid image format: not a PNG');
  }

  return true;
}

/**
 * Health check
 */
async function healthCheck() {
  return {
    healthy: !!endpoint,
    hasApiKey: !!RUNPOD_API_KEY,
    hasEndpointId: !!RUNPOD_ENDPOINT_ID_PIXELWAVE
  };
}

export {
  generatePixelWaveImage,
  generateAndSaveImage,
  generateForStory,
  generateScenePrompt,
  enhancePrompt,
  validateImage,
  healthCheck,
  getPixelWaveComfyWorkflow,
  DEFAULT_GENERATION_PARAMS
};

export default {
  generatePixelWaveImage,
  generateAndSaveImage,
  generateForStory,
  generateScenePrompt,
  enhancePrompt,
  validateImage,
  healthCheck
};
