/**
 * GLM-based Image Prompt Generator
 *
 * Uses Z.AI's GLM-4.7 model to generate PG-13, content-safe image prompts
 * for romance story scenes. Handles mature story context appropriately.
 */

import { getLogger } from '../../utils/logger.js';

const logger = getLogger('services', 'glm-prompt-generator');

/**
 * Generate PG-13 image prompts using GLM
 *
 * @param {Object} story - Story object with title, description, category, spiciness
 * @param {number} slideNumber - Current slide number (1-indexed)
 * @param {number} totalSlides - Total number of slides
 * @param {string} fullStoryText - Full story text for context
 * @returns {Promise<string>} Generated PG-13 image prompt
 */
export default async function generateGLMPrompt(story, slideNumber, totalSlides, fullStoryText) {
  const glmService = (await import('../glmService.js')).default;

  // Basic story info
  const storyTitle = story?.title || story?.name || 'Romantic Story';
  const category = story?.category || 'Romantic';
  const spiciness = story?.spiciness || 1;

  // Extract story context - send AS-IS to GLM (no sanitization needed)
  // GLM will handle mature content appropriately
  let storyContext = '';
  if (fullStoryText && fullStoryText.length > 500) {
    // Skip first 500 chars, start from middle to get story essence
    const startIdx = Math.min(500, Math.floor(fullStoryText.length / 4));
    const chunkSize = 2000;
    storyContext = fullStoryText.substring(startIdx, startIdx + chunkSize);
  }

  // Simple GLM prompt - ask for 3 PG-13 scene descriptions
  const systemPrompt = 'You are an expert at creating image generation prompts for romance stories.\n\n' +
    'Generate exactly 3 unique PG-13 prompts, each illustrating a different moment from the story.\n\n' +
    'Each prompt should be:\n' +
    '- Cinematic photographic style\n' +
    '- Detailed visual descriptions (lighting, mood, camera angle, composition)\n' +
    '- Adult characters (no ages, no minors mentioned)\n' +
    '- Fully clothed\n' +
    '- Focus on emotion, atmosphere, and romantic tension\n' +
    '- NO text, letters, or writing visible in the image\n\n' +
    'Return ONLY a raw JSON array: ["prompt 1", "prompt 2", "prompt 3"]';

  const userPrompt = 'Story Title: ' + storyTitle + '\n' +
    'Category: ' + category + '\n' +
    'Spiciness: ' + spiciness + '/3\n\n' +
    'Story Context:\n' + storyContext.substring(0, 1500) + '\n\n' +
    'Generate 3 PG-13 prompts for scenes from this story.\n\n' +
    'Each prompt should be:\n' +
    '1. Illustrate a different romantic scene (opening, middle, climax)\n' +
    '2. Be content-safe and pass AI image generation content filters\n' +
    '3. Focus on atmosphere, emotion, and romantic tension\n' +
    '4. Specify adult characters only (no ages, no minors)\n' +
    '5. Include: camera angle, lighting, composition, character description, setting, mood\n' +
    '6. Be detailed and evocative without being explicit\n\n' +
    'Return ONLY a raw JSON array: ["prompt 1", "prompt 2", "prompt 3"]';

  try {
    logger.info('Calling GLM for prompt generation', {
      storyId: story?._id,
      slideNumber,
      category
    });

    const response = await glmService.createMessage({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      maxTokens: 8192,  // Plenty of tokens for 3 detailed image prompts - no truncation
      temperature: 0.8
    });

    // LOG THE FULL RAW GLM RESPONSE
    logger.info('=== RAW GLM RESPONSE ===', {
      rawResponse: JSON.stringify(response, null, 2),
      responseType: typeof response,
      hasContent: !!response?.content,
      contentType: Array.isArray(response?.content) ? 'array' : typeof response?.content,
      contentKeys: response ? Object.keys(response) : 'no response',
      allKeys: response ? JSON.stringify(Object.keys(response)) : 'none'
    });

    // Extract text from GLM response
    let promptsText = '';
    if (Array.isArray(response?.content)) {
      const textContent = response.content.find(c => c?.type === 'text');
      promptsText = textContent?.text || '';
      logger.info('GLM response structure', {
        hasContentArray: !!response?.content,
        textLength: promptsText.length,
        textContentKeys: textContent ? Object.keys(textContent) : 'none',
        textContent: textContent ? JSON.stringify(textContent) : 'not found'
      });
    } else if (typeof response?.content === 'string') {
      promptsText = response.content;
    } else if (response?.choices?.[0]?.message?.content) {
      const content = response.choices[0].message.content;
      promptsText = Array.isArray(content) ? content[0]?.text || '' : content;
    }

    // Check for empty response
    if (!promptsText || promptsText.length === 0) {
      logger.error('GLM returned empty response');
      throw new Error('GLM returned empty response');
    }

    // Remove markdown code blocks
    promptsText = promptsText.replace(/```(?:json)?\n?/gi, '').replace(/```\n?/gi, '').trim();

    // Parse JSON
    let prompts = [];
    try {
      const jsonMatch = promptsText.match(/\[.*\]/s);
      if (jsonMatch) {
        prompts = JSON.parse(jsonMatch[0]);
        logger.info('Parsed GLM prompts', {
          count: prompts.length,
          prompts: prompts.map((p, i) => '[' + i + ']: ' + p.substring(0, 60) + ']').join(', ')
        });
      } else {
        // Fallback: split by newlines
        prompts = promptsText.split('\n').map(l => l.trim()).filter(l => l.length > 30);
        logger.info('No JSON, split by newlines', {
          count: prompts.length
        });
      }
    } catch (parseError) {
      logger.warn('Failed to parse JSON, using line split', {
        error: parseError.message
      });
      prompts = promptsText.split('\n').map(l => l.trim()).filter(l => l.length > 30);
    }

    // Validate prompts
    if (!Array.isArray(prompts) || prompts.length === 0) {
      logger.error('No valid prompts found');
      throw new Error('No valid prompts from GLM');
    }

    // Select prompt by slide number
    const promptIndex = (slideNumber - 1) % prompts.length;
    const selectedPrompt = prompts[promptIndex];

    if (!selectedPrompt || selectedPrompt.length < 30) {
      logger.error('Invalid prompt selected', {
        promptIndex,
        promptLength: selectedPrompt?.length || 0
      });
      throw new Error('Invalid GLM prompt');
    }

    logger.info('Selected GLM prompt', {
      slideNumber,
      promptIndex,
      length: selectedPrompt.length,
      preview: selectedPrompt.substring(0, 100)
    });

    // Build final prompt with directives
    const finalPrompt = [
      'STRICTLY NO TEXT anywhere in image.',
      'No letters, numbers, words, typography, books, signs, screens.',
      'Correct human anatomy: exactly 2 arms, 2 legs, 5 fingers per hand.',
      'No missing limbs, no extra limbs, no floating body parts.',
      selectedPrompt
    ].join('. ');

    return finalPrompt;

  } catch (error) {
    logger.error('GLM prompt generation FAILED - NO FALLBACK', {
      error: error.message,
      stack: error.stack,
      storyId: story?._id,
      slideNumber
    });

    // NO FALLBACK - fail hard as requested
    throw error;
  }
}
