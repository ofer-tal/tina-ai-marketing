/**
 * Category Styles Module
 *
 * Defines visual and prompt styles for each Blush story category.
 * Includes gradient colors with contrasting foreground colors for text slides.
 *
 * Used in multi-slide video generation to create category-appropriate visuals.
 */

import { getLogger } from '../../utils/logger.js';

const logger = getLogger('services', 'category-styles');

// Official Blush story categories (12 total)
export const BLUSH_CATEGORIES = [
  'BDSM',
  'Big & Beautiful',
  'Contemporary',
  'Fantasy',
  'Fetish',
  'Historical',
  'LGBTQ+',
  'Paranormal',
  'Romantic',
  'Science Fiction',
  'Taboo',
  'Thriller'
];

// Style configuration for each story category
// Includes prompt modifiers for AI image generation and gradient colors for text slides
export const CATEGORY_STYLES = {
  romantic: {
    promptModifiers: ['soft cinematic lighting', 'warm golden hour tones', 'dreamy atmosphere', 'elegant composition'],
    mood: 'dreamy, elegant, romantic',
    imageStyle: 'photorealistic with soft focus',
    gradientStart: '#e94560',
    gradientEnd: '#1a1a2e',
    foregroundColor: '#ffffff'  // white contrasts well with dark end
  },
  contemporary: {
    promptModifiers: ['clean modern aesthetic', 'natural lighting', 'relatable atmosphere', 'authentic mood'],
    mood: 'accessible, realistic, modern',
    imageStyle: 'modern lifestyle photography',
    gradientStart: '#4a90e2',
    gradientEnd: '#1a2a3a',
    foregroundColor: '#ffffff'
  },
  fantasy: {
    promptModifiers: ['ethereal glow', 'magical atmosphere', 'soft mystical lighting', 'enchanted vibes'],
    mood: 'mystical, enchanting, otherworldly',
    imageStyle: 'fantasy art with photorealistic elements',
    gradientStart: '#7b2cbf',
    gradientEnd: '#0a0a1a',
    foregroundColor: '#ffffff'
  },
  historical: {
    promptModifiers: ['period-accurate details', 'vintage warm tones', 'nostalgic atmosphere', 'classic composition'],
    mood: 'nostalgic, timeless, romantic',
    imageStyle: 'period drama with vintage film look',
    gradientStart: '#c9a96e',
    gradientEnd: '#2a1a0a',
    foregroundColor: '#1a1a1a'  // dark text on light gold background
  },
  paranormal: {
    promptModifiers: ['moody shadows', 'mysterious atmosphere', 'subtle glow effects', 'suspenseful mood'],
    mood: 'mysterious, suspenseful, intriguing',
    imageStyle: 'dark cinematic with mystical elements',
    gradientStart: '#6b4c9a',
    gradientEnd: '#0a0515',
    foregroundColor: '#ffffff'
  },
  lgbtq: {
    promptModifiers: ['warm inclusive lighting', 'authentic representation', 'soft rainbow accents', 'love-centered'],
    mood: 'love, acceptance, authentic',
    imageStyle: 'warm contemporary with subtle pride accents',
    gradientStart: '#ff6b9d',
    gradientEnd: '#1a1a2e',
    foregroundColor: '#ffffff'
  },
  science_fiction: {  // Note: key uses underscore for "Science Fiction"
    promptModifiers: ['futuristic lighting', 'neon accents', 'sleek composition', 'innovative mood'],
    mood: 'otherworldly, innovative, futuristic',
    imageStyle: 'sci-fi cinematic with digital enhancement',
    gradientStart: '#00d4ff',
    gradientEnd: '#0a0a1a',
    foregroundColor: '#1a1a1a'  // dark text for bright cyan start
  },
  thriller: {
    promptModifiers: ['high contrast lighting', 'dramatic shadows', 'tension-filled atmosphere', 'intense mood'],
    mood: 'suspenseful, intense, thrilling',
    imageStyle: 'thriller cinematic with dark tones',
    gradientStart: '#8b0000',
    gradientEnd: '#0a0505',
    foregroundColor: '#ffffff'
  },
  bdsm: {
    promptModifiers: ['dramatic chiaroscuro lighting', 'rich textures', 'intense atmosphere', 'power dynamics'],
    mood: 'intense, passionate, powerful',
    imageStyle: 'cinematic with high contrast and rich tones',
    gradientStart: '#8b0000',
    gradientEnd: '#1a0a1a',
    foregroundColor: '#ffffff'
  },
  big_and_beautiful: {  // Note: key uses underscore for "Big & Beautiful"
    promptModifiers: ['warm soft lighting', 'body-positive composition', 'confident atmosphere', 'sensual mood'],
    mood: 'confident, sensual, beautiful',
    imageStyle: 'warm glamour photography',
    gradientStart: '#e94560',
    gradientEnd: '#1a1a2e',
    foregroundColor: '#ffffff'
  },
  fetish: {
    promptModifiers: ['moody intimate lighting', 'tasteful suggestion', 'intriguing atmosphere', 'alluring mood'],
    mood: 'intriguing, alluring, mysterious',
    imageStyle: 'artistic with soft focus and rich shadows',
    gradientStart: '#6b4c9a',
    gradientEnd: '#0a0505',
    foregroundColor: '#ffffff'
  },
  taboo: {
    promptModifiers: ['high contrast forbidden vibes', 'transgressive atmosphere', 'exciting tension'],
    mood: 'transgressive, exciting, forbidden',
    imageStyle: 'dramatic cinematic with bold lighting',
    gradientStart: '#e94560',
    gradientEnd: '#0f0f1a',
    foregroundColor: '#ffffff'
  },
  default: {
    promptModifiers: ['engaging composition', 'pleasing lighting', 'attractive mood'],
    mood: 'engaging, attractive',
    imageStyle: 'photorealistic with artistic enhancement',
    gradientStart: '#e94560',
    gradientEnd: '#1a1a2e',
    foregroundColor: '#ffffff'
  }
};

/**
 * Mapping key for normalizing category names to style keys
 */
const CATEGORY_KEY_MAP = {
  'romantic': 'romantic',
  'romance': 'romantic',
  'contemporary': 'contemporary',
  'fantasy': 'fantasy',
  'historical': 'historical',
  'paranormal': 'paranormal',
  'lgbtq': 'lgbtq',
  'lgbtq+': 'lgbtq',
  'science_fiction': 'science_fiction',
  'scifi': 'science_fiction',
  'sci-fi': 'science_fiction',
  'science fiction': 'science_fiction',
  'thriller': 'thriller',
  'bdsm': 'bdsm',
  'big_beautiful': 'big_and_beautiful',
  'big and beautiful': 'big_and_beautiful',
  'big & beautiful': 'big_and_beautiful',
  'fetish': 'fetish',
  'taboo': 'taboo'
};

/**
 * Get style configuration for a story category
 * Handles special cases: "Science Fiction" -> science_fiction, "Big & Beautiful" -> big_and_beautiful
 *
 * @param {string} category - Story category name
 * @returns {Object} Category style configuration
 */
export function getCategoryStyle(category) {
  if (!category) {
    logger.debug('No category provided, using default style');
    return CATEGORY_STYLES.default;
  }

  // Normalize category name: lowercase, replace spaces/special chars with underscores
  const normalized = category.toLowerCase().replace(/[^a-z]/g, '_');

  const styleKey = CATEGORY_KEY_MAP[normalized] || normalized;
  const style = CATEGORY_STYLES[styleKey];

  if (!style) {
    logger.warn('Unknown category, using default style', { category, normalized, styleKey });
    return CATEGORY_STYLES.default;
  }

  logger.debug('Retrieved category style', { category, styleKey });
  return style;
}

/**
 * Download text content from a URL
 * @param {string} url - URL to fetch
 * @returns {Promise<string>} Text content
 */
async function downloadText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch text: ${response.statusText}`);
  }
  return await response.text();
}

/**
 * Fetch full story text for image prompt generation
 * @param {Object} story - Story object with fullStory.textUrl
 * @returns {Promise<string>} Full story text or empty string if not available
 */
async function fetchStoryTextForPrompt(story) {
  try {
    const textUrl = story?.fullStory?.textUrl;
    if (!textUrl) {
      logger.debug('No fullStory.textUrl available for image prompt');
      return '';
    }
    const fullText = await downloadText(textUrl);
    // Return first 2000 characters - enough for context without overwhelming the prompt
    return fullText.substring(0, 2000) || '';
  } catch (error) {
    logger.warn('Failed to fetch story text for image prompt', { error: error.message });
    return '';
  }
}

/**
 * Extract key story elements from text
 * Looks for character names, setting details, and plot elements
 * @param {string} text - Story text
 * @returns {string} Key story elements for image prompt
 */
function extractStoryElements(text) {
  if (!text || text.length < 50) return '';

  // Take first 500 characters for context - usually contains setup, characters, setting
  const introText = text.substring(0, 500);

  // Clean up: remove chapter headers, excessive whitespace
  const cleaned = introText
    .replace(/chapter\s+\d+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}

/**
 * Generate an AI image prompt based on story, category style, and slide context
 *
 * @param {Object} story - Story object with title, description, category, spiciness
 * @param {number} slideNumber - Current slide number (1-indexed)
 * @param {number} totalSlides - Total number of slides
 * @param {string} fullStoryText - Optional full story text for richer prompts
 * @returns {Promise<string>|string} Generated image prompt for AI image generation
 */
export async function generateImagePrompt(story, slideNumber, totalSlides, fullStoryText = null) {
  const categoryStyle = getCategoryStyle(story?.category);

  // Base prompt from story
  const storyTitle = story?.title || story?.name || 'Romantic Scene';
  const storyDescription = story?.description || '';
  const spiciness = story?.spiciness || 1;

  // Use provided full story text or extract from description
  let storyContext = '';
  if (fullStoryText && fullStoryText.length > 50) {
    // Use full story text - extract relevant portion based on slide number
    const chunkSize = 300;
    const startIdx = Math.min((slideNumber - 1) * chunkSize, fullStoryText.length - chunkSize);
    storyContext = fullStoryText.substring(startIdx, startIdx + chunkSize);
  } else if (storyDescription && storyDescription.length > 20) {
    // Fallback to description
    storyContext = storyDescription;
  }

  // Variety options - different for each slide to ensure uniqueness
  const cameraAngles = [
    'Close-up shot focusing on facial expressions and emotions',
    'Medium shot showing characters from waist up',
    'Full body shot with environment visible',
    'Over-the-shoulder perspective from one character',
    'Low angle shot making characters appear empowered',
    'High angle intimate perspective',
    'Side profile capturing intimate moment',
    'Two-shot showing both faces in frame'
  ];

  const lightingStyles = [
    'Soft golden hour lighting with warm tones',
    'Moody ambient lighting with deep shadows',
    'Diffused natural window lighting',
    'Candlelit warm flickering illumination',
    'Moonlit cool blue ambient light',
    'Dramatic side lighting creating depth',
    'Soft dawn light with pink and orange hues',
    'Rim lighting outlining figures against dark background'
  ];

  const compositionStyles = [
    'Intimate close composition',
    'Wide environmental shot establishing setting',
    'Centered symmetrical composition',
    'Rule of thirds with off-center subjects',
    'Dutch angle for dramatic tension',
    'Depth of field with blurred background',
    'Silhouette against bright background',
    'Reflection in mirror or water'
  ];

  const focalPoints = [
    'Focus on intense eye contact between characters',
    'Focus on gentle touch of hands',
    'Focus on intimate embrace',
    'Focus on one character\'s emotional expression',
    'Focus on romantic environment and atmosphere',
    'Focus on subtle gesture and body language',
    'Focus on anticipation before contact',
    'Focus on tender afterglow moment'
  ];

  // Use slide number to pick consistent but different options
  // This ensures same slide always has same style, but different slides are unique
  const angleIndex = (slideNumber * 3) % cameraAngles.length;
  const lightingIndex = (slideNumber * 5) % lightingStyles.length;
  const compositionIndex = (slideNumber * 7) % compositionStyles.length;
  const focalIndex = (slideNumber * 2) % focalPoints.length;

  // Determine slide context
  let slideContext = '';
  if (slideNumber === 1) {
    slideContext = 'Focus on atmospheric opening, establishing mood, introducing characters.';
  } else if (slideNumber === totalSlides) {
    slideContext = 'Focus on emotional conclusion, intimate moment, romantic resolution.';
  } else {
    slideContext = 'Focus on story action, character connection, romantic tension.';
  }

  // CRITICAL: Anti-text directives at the BEGINNING of prompt
  // AI models pay more attention to early tokens, so put no-text instructions first
  const antiTextDirectives = [
    'STRICTLY NO TEXT anywhere in image.',
    'No letters, numbers, words, or typography.',
    'No books, papers, signs, screens, or devices with text.',
    'No watermarks, logos, or captions.',
    'Clean background with no writing visible.',
    'Characters posed naturally without text overlays.',
    'Pure visual scene with no readable text elements.'
  ];

  // CRITICAL: Anatomy directives to prevent extra limbs/fingers
  // Place right after anti-text for maximum attention
  const anatomyDirectives = [
    'Correct human anatomy: exactly 2 arms, 2 legs per person.',
    'Exactly 5 fingers on each hand, no extra fingers.',
    'Exactly 5 toes on each foot, no extra toes.',
    'No missing limbs, no extra limbs attached anywhere.',
    'No morphing or partial limbs, no floating body parts.',
    'Hands and feet clearly defined with natural proportions.',
    'No duplicated body parts, no conjoined twins effect.',
    'Clean silhouettes, bodies should not merge with background.',
    'Natural pose, limbs should bend in anatomically correct ways.'
  ];

  // Determine couple type based on story category
  // Default to heterosexual for 85% of audience, LGBTQ+ only for that specific category
  const isLGBTQ = story?.category?.toLowerCase() === 'lgbtq+' ||
                   story?.category?.toLowerCase() === 'lgbtq';
  const coupleType = isLGBTQ
    ? 'Same-sex LGBTQ+ couple'  // Let story context dictate gay vs lesbian
    : 'Heterosexual couple, man and woman together';

  // Build prompt with category style and VARIETY
  const promptParts = [
    // START with anti-text directives (most important!)
    ...antiTextDirectives,

    // THEN anatomy directives (second most important!)
    ...anatomyDirectives,

    // Then the main scene description
    `Cinematic photo of a ${story?.category || 'romance'} story scene.`,

    // EXPLICITLY specify couple type to avoid same-sex bias
    `Couple: ${coupleType}.`,

    // Add variety based on slide number
    `Shot: ${cameraAngles[angleIndex]}.`,
    `Lighting: ${lightingStyles[lightingIndex]}.`,
    `Composition: ${compositionStyles[compositionIndex]}.`,

    // Story context - ask AI to imagine a scene based on story description
    // This uses the full story text if available, otherwise falls back to description
    storyContext
      ? `Imagine a romantic scene illustrating this story: "${storyContext.substring(0, 300)}${storyContext.length > 300 ? '...' : ''}"`
      : `Story title: "${storyTitle}"`,

    // Style and mood
    `Style: ${categoryStyle.promptModifiers.join(', ')}.`,
    `Mood: ${categoryStyle.mood}.`,

    // Focal point for this specific slide
    focalPoints[focalIndex],

    slideContext,

    // Add spiciness-appropriate modifiers
    spiciness >= 2 ? 'Passionate and sensual atmosphere.' : 'Sweet and romantic atmosphere.',

    // Safety and quality modifiers
    'Tastefully dressed characters appropriate to story setting.',
    'No nudity, genitals and nipples always covered.',

    // Reiterate NO TEXT at the end too
    'No text, letters, or writing visible anywhere.',

    // Quality modifiers
    'Photorealistic picture quality, detailed composition.',
    'Professional photography style.'
  ];

  const prompt = promptParts.join(' ');

  // Log the FULL prompt for debugging - use info level to ensure it's always visible
  logger.info('=== GENERATED IMAGE PROMPT ===', {
    storyId: story?._id,
    storyTitle: story?.title || story?.name,
    slideNumber,
    totalSlides,
    category: story?.category,
    angleIndex,
    lightingIndex,
    promptLength: prompt.length,
    // FULL PROMPT - not truncated
    fullPrompt: prompt
  });

  return prompt;
}

/**
 * Get gradient colors for a category (for text slides)
 *
 * @param {string} category - Story category name
 * @returns {Object} Object with gradientStart, gradientEnd, and foregroundColor
 */
export function getCategoryGradient(category) {
  const style = getCategoryStyle(category);
  return {
    gradientStart: style.gradientStart,
    gradientEnd: style.gradientEnd,
    foregroundColor: style.foregroundColor
  };
}

/**
 * Validate if a category is a recognized Blush category
 *
 * @param {string} category - Category name to validate
 * @returns {boolean} True if category is recognized
 */
export function isValidCategory(category) {
  if (!category) return false;

  const normalized = category.toLowerCase().replace(/[^a-z]/g, '_');
  return CATEGORY_KEY_MAP[normalized] !== undefined ||
         CATEGORY_STYLES[normalized] !== undefined;
}

/**
 * Get all available category names
 *
 * @returns {string[]} Array of valid category names
 */
export function getAllCategories() {
  return [...BLUSH_CATEGORIES];
}

export default {
  BLUSH_CATEGORIES,
  CATEGORY_STYLES,
  getCategoryStyle,
  generateImagePrompt,
  getCategoryGradient,
  isValidCategory,
  getAllCategories
};
