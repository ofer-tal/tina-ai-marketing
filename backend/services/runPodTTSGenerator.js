/**
 * RunPod TTS Generator Service
 *
 * Wrapper for XTTS v2 text-to-speech via RunPod serverless.
 * Based on sample code in docs/sample_code/tts-generator.js
 *
 * Features:
 * - Multiple voice options (female_1-3, male_1-3)
 * - Language detection from story
 * - Duration tracking for video sync
 */

import dotenv from 'dotenv';
import { default as runpodSdk } from 'runpod-sdk';
import asyncRetry from 'async-retry';
import fs from 'fs/promises';
import path from 'path';
import { getLogger } from '../utils/logger.js';

dotenv.config();

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_ENDPOINT_ID_XTTSV2 = process.env.RUNPOD_ENDPOINT_ID_XTTSV2;

const logger = getLogger('services', 'runpod-tts-generator');

// Default XTTS parameters (from production)
const XTTS_PARAMS = {
  temperature: 0.6,
  repetition_penalty: 30.0,
  top_k: 46,
  top_p: 0.8,
};

// Voice display names for logging
const VOICE_DISPLAY_NAMES = {
  female_1: 'Rosamund Pike',
  female_2: 'Jennifer Ikeda',
  female_3: 'Mela Lee',
  male_1: 'Sebastian York',
  male_2: 'Ray Porter',
  male_3: 'Brian Nishii'
};

/**
 * Map UI voice choice to XTTS voice parameters
 */
function UIVoiceToXTTSVoiceParams(voice, languageCode = 'en') {
  const xttsLanguageCode =
    languageCode.substring(0, 2) === 'zh'
      ? languageCode.toLowerCase()
      : languageCode.substring(0, 2).toLowerCase();

  switch (voice.toLowerCase()) {
    case 'female_3':
      return {
        languageCode: xttsLanguageCode,
        voiceUrl: 'https://content.countingsheep.v6v.one/assets/voices/female_ML1.wav', // Mela Lee
        speed: 1.0,
        pitch: 1,
        volume: null,
      };
    case 'male_3':
      return {
        languageCode: xttsLanguageCode,
        voiceUrl: 'https://content.countingsheep.v6v.one/assets/voices/male_BN1.wav', // Brian Nishii
        speed: 1.0,
        pitch: 1,
        volume: null,
      };
    case 'female_2':
      return {
        languageCode: xttsLanguageCode,
        voiceUrl: 'https://content.countingsheep.v6v.one/assets/voices/female_JI2.wav', // Jennifer Ikeda
        speed: 1.0,
        pitch: 1,
        volume: null,
      };
    case 'male_2':
      return {
        languageCode: xttsLanguageCode,
        voiceUrl: 'https://content.countingsheep.v6v.one/assets/voices/male_RP.wav', // Ray Porter
        speed: 1.0,
        pitch: 1,
        volume: null,
      };
    case 'female_1':
      return {
        languageCode: xttsLanguageCode,
        voiceUrl: 'https://content.countingsheep.v6v.one/assets/voices/female_RP4.wav', // Rosamund Pike
        speed: 1.0,
        pitch: 1,
        volume: null,
      };
    case 'male_1':
    default:
      return {
        languageCode: xttsLanguageCode,
        voiceUrl: 'https://content.countingsheep.v6v.one/assets/voices/male_SY1.wav', // Sebastian York
        speed: 1.0,
        pitch: 1,
        volume: null,
      };
  }
}

/**
 * Initialize RunPod
 */
const runpod = RUNPOD_API_KEY ? runpodSdk(RUNPOD_API_KEY) : null;

/**
 * Generate speech from text using XTTS v2
 */
async function generateSpeech(text, voice = 'female_1', languageCode = 'en') {
  logger.info('Generating speech', {
    voice,
    language: languageCode,
    textLength: text.length,
    textPreview: text.substring(0, 100)
  });

  if (!runpod || !RUNPOD_ENDPOINT_ID_XTTSV2) {
    throw new Error('RunPod not configured: Missing API key or endpoint ID');
  }

  const endpoint = runpod.endpoint(RUNPOD_ENDPOINT_ID_XTTSV2);
  const voiceParams = UIVoiceToXTTSVoiceParams(voice, languageCode);

  const runPayload = {
    input: {
      language: voiceParams.languageCode,
      voice: {
        speaker_0: voiceParams.voiceUrl,
      },
      text: [['speaker_0', text]],
      gpt_cond_len: 12,
      max_ref_len: 10,
      speed: voiceParams.speed,
      enhance_audio: true,
      ...XTTS_PARAMS,
    },
    policy: {
      executionTimeout: 45000,
    },
  };

  const startTime = Date.now();

  try {
    const result = await asyncRetry(
      async (bail) => {
        const res = await endpoint.runSync(runPayload);

        if (res?.status !== 'COMPLETED') {
          logger.warn('TTS request did not complete', { status: res?.status });
          throw new Error(`TTS request did not complete successfully. status: ${res?.status}`);
        }

        if (!res?.output?.audio) {
          logger.warn('TTS request did not return audio', { output: res?.output });
          throw new Error('TTS request did not return any audio.');
        }

        return res;
      },
      {
        retries: 3,
        minTimeout: 2000,
        onRetry: (error) => {
          logger.warn('TTS retry', { error: error.message });
        },
      },
    );

    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.info('RunPod result received', { elapsedSeconds });

    const dataBase64 = result.output.audio;
    const buffer = Buffer.from(dataBase64, 'base64');

    logger.info('Generated audio', {
      size: `${(buffer.length / 1024).toFixed(0)}KB`,
      voice: VOICE_DISPLAY_NAMES[voice] || voice
    });

    return buffer;
  } catch (error) {
    logger.error('Error generating speech', { error: error.message });
    throw error;
  }
}

/**
 * Generate speech and save to file
 */
async function generateAndSaveSpeech(
  text,
  outputPath,
  voice = 'female_1',
  languageCode = 'en',
) {
  try {
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    // Generate speech
    const buffer = await generateSpeech(text, voice, languageCode);

    // Save to file
    await fs.writeFile(outputPath, buffer);
    logger.info('Saved speech', { outputPath });

    return {
      path: outputPath,
      size: buffer.length
    };
  } catch (error) {
    logger.error('Error generating/saving speech', { error: error.message });
    throw error;
  }
}

/**
 * Extract voice from story parameters
 */
function extractVoiceFromStory(story) {
  // Check for voice in parameters
  if (story?.parameters) {
    const voice =
      story.parameters.voice ||
      story.parameters.voiceChoice ||
      story.parameters.voice_id ||
      story.parameters.voiceId;

    if (voice) {
      return voice;
    }
  }

  // Default voice based on target audience (90% female)
  // Use female_1 (Rosamund Pike) as default - elegant, romantic
  return 'female_1';
}

/**
 * Extract language code from story
 */
function extractLanguageFromStory(story) {
  if (story?.parameters) {
    const lang =
      story.parameters.language ||
      story.parameters.languageCode ||
      story.parameters.lang;

    if (lang) {
      return lang;
    }
  }

  // Default to English
  return 'en';
}

/**
 * Estimate audio duration from text
 * Approximate: 150 words per minute for normal speech
 */
function estimateDuration(text) {
  const wordCount = text.split(/\s+/).length;
  const minutes = wordCount / 150;
  return Math.max(3, Math.ceil(minutes * 60)); // Min 3 seconds
}

/**
 * Get actual audio duration from buffer (requires ffprobe)
 * For now, returns estimated duration
 */
async function getAudioDuration(buffer) {
  // In production, this would use ffprobe to get actual duration
  // For now, estimate based on buffer size (rough approximation)
  // WAV: ~176KB per second at 44.1kHz 16-bit stereo
  const estimatedSeconds = buffer.length / (176 * 1024);
  return Math.max(3, estimatedSeconds);
}

/**
 * Generate speech for story content
 */
async function generateForStory(story, text, options = {}) {
  const {
    voice = null,
    languageCode = null,
    outputPath = null
  } = options;

  const selectedVoice = voice || extractVoiceFromStory(story);
  const selectedLanguage = languageCode || extractLanguageFromStory(story);

  // Generate output path if not provided
  const finalOutputPath = outputPath || path.join(
    process.cwd(),
    'storage',
    'audio',
    'narration',
    `${Date.now()}_${story?._id || 'story'}.wav`
  );

  const result = await generateAndSaveSpeech(
    text,
    finalOutputPath,
    selectedVoice,
    selectedLanguage
  );

  // Get duration
  const duration = await getAudioDuration(
    await fs.readFile(finalOutputPath)
  );

  logger.info('Generated speech for story', {
    storyId: story?._id,
    voice: VOICE_DISPLAY_NAMES[selectedVoice] || selectedVoice,
    duration: `${duration.toFixed(1)}s`
  });

  return {
    ...result,
    duration,
    voice: selectedVoice,
    language: selectedLanguage,
    metadata: {
      voiceDisplay: VOICE_DISPLAY_NAMES[selectedVoice] || selectedVoice,
      estimatedDuration: estimateDuration(text)
    }
  };
}

/**
 * Build narration text from hook and caption
 */
function buildNarrationText(hook, caption, maxLength = 300) {
  let text = '';

  if (hook) {
    text += hook;
  }

  if (caption) {
    // Trim caption to avoid overly long narration
    const trimmedCaption = caption.length > maxLength
      ? caption.substring(0, maxLength) + '...'
      : caption;
    text += (text ? ' ' : '') + trimmedCaption;
  }

  // Fallback if empty
  if (!text.trim()) {
    text = 'Discover your next romantic story on Blush.';
  }

  return text.trim();
}

/**
 * Get available voices
 */
function getAvailableVoices() {
  return Object.entries(VOICE_DISPLAY_NAMES).map(([id, name]) => ({
    id,
    name,
    gender: id.startsWith('female_') ? 'female' : 'male'
  }));
}

/**
 * Health check
 */
async function healthCheck() {
  return {
    healthy: !!runpod && !!RUNPOD_ENDPOINT_ID_XTTSV2,
    hasApiKey: !!RUNPOD_API_KEY,
    hasEndpointId: !!RUNPOD_ENDPOINT_ID_XTTSV2,
    availableVoices: getAvailableVoices().length
  };
}

export {
  generateSpeech,
  generateAndSaveSpeech,
  generateForStory,
  UIVoiceToXTTSVoiceParams,
  extractVoiceFromStory,
  extractLanguageFromStory,
  buildNarrationText,
  estimateDuration,
  getAudioDuration,
  getAvailableVoices,
  healthCheck,
  VOICE_DISPLAY_NAMES
};

export default {
  generateSpeech,
  generateAndSaveSpeech,
  generateForStory,
  UIVoiceToXTTSVoiceParams,
  extractVoiceFromStory,
  extractLanguageFromStory,
  buildNarrationText,
  estimateDuration,
  getAudioDuration,
  getAvailableVoices,
  healthCheck
};
