/**
 * TTS Generator - XTTS v2 Integration
 *
 * Generates speech using XTTS v2 via RunPod serverless
 * Matches Blush app's voice narration style
 */

import dotenv from "dotenv";
import { default as runpodSdk } from "runpod-sdk";
import asyncRetry from "async-retry";
import fs from "fs";
import path from "path";

dotenv.config();

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_ENDPOINT_ID_XTTSV2 = process.env.RUNPOD_ENDPOINT_ID_XTTSV2;

// Default XTTS parameters (from production)
const XTTS_PARAMS = {
  temperature: 0.6,
  repetition_penalty: 30.0,
  top_k: 46,
  top_p: 0.8,
};

/**
 * Map UI voice choice to XTTS voice parameters
 * @param {string} voice - Voice choice from UI (female_1, male_1, etc.)
 * @param {string} languageCode - Language code (en, es, etc.)
 * @returns {Object} XTTS voice parameters
 */
function UIVoiceToXTTSVoiceParams(voice, languageCode = "en") {
  const xttsLanguageCode =
    languageCode.substring(0, 2) === "zh"
      ? languageCode.toLowerCase()
      : languageCode.substring(0, 2).toLowerCase();

  switch (voice.toLowerCase()) {
    case "female_3":
      return {
        languageCode: xttsLanguageCode,
        voiceUrl:
          "https://content.countingsheep.v6v.one/assets/voices/female_ML1.wav", // Mela Lee
        speed: 1.0,
        pitch: 1,
        volume: null,
      };
    case "male_3":
      return {
        languageCode: xttsLanguageCode,
        voiceUrl:
          "https://content.countingsheep.v6v.one/assets/voices/male_BN1.wav", // Brian Nishii
        speed: 1.0,
        pitch: 1,
        volume: null,
      };
    case "female_2":
      return {
        languageCode: xttsLanguageCode,
        voiceUrl:
          "https://content.countingsheep.v6v.one/assets/voices/female_JI2.wav", // Jennifer Ikeda
        speed: 1.0,
        pitch: 1,
        volume: null,
      };
    case "male_2":
      return {
        languageCode: xttsLanguageCode,
        voiceUrl:
          "https://content.countingsheep.v6v.one/assets/voices/male_RP.wav", // Ray Porter
        speed: 1.0,
        pitch: 1,
        volume: null,
      };
    case "female_1":
      return {
        languageCode: xttsLanguageCode,
        voiceUrl:
          "https://content.countingsheep.v6v.one/assets/voices/female_RP4.wav", // Rosamund Pike
        speed: 1.0,
        pitch: 1,
        volume: null,
      };
    case "male_1":
    default:
      return {
        languageCode: xttsLanguageCode,
        voiceUrl:
          "https://content.countingsheep.v6v.one/assets/voices/male_SY1.wav", // Sebastian York
        speed: 1.0,
        pitch: 1,
        volume: null,
      };
  }
}

/**
 * Generate speech from text using XTTS v2
 * @param {string} text - Text to convert to speech
 * @param {string} voice - Voice choice (female_1, male_1, etc.)
 * @param {string} languageCode - Language code (default: 'en')
 * @returns {Promise<Buffer>} Audio buffer
 */
async function generateSpeech(text, voice = "female_1", languageCode = "en") {
  console.log(`\n🎙️ Generating speech...`);
  console.log(`   Voice: ${voice}`);
  console.log(`   Language: ${languageCode}`);
  console.log(`   Text: ${text.substring(0, 100)}...`);

  const runpod = runpodSdk(RUNPOD_API_KEY);
  const endpoint = runpod.endpoint(RUNPOD_ENDPOINT_ID_XTTSV2);

  const voiceParams = UIVoiceToXTTSVoiceParams(voice, languageCode);

  const runPayload = {
    input: {
      language: voiceParams.languageCode,
      voice: {
        speaker_0: voiceParams.voiceUrl,
      },
      text: [["speaker_0", text]],
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
    console.log("   📤 Sending to RunPod...");
    console.log("   📋 Payload:", JSON.stringify(runPayload, null, 2));

    const result = await asyncRetry(
      async (bail) => {
        const res = await endpoint.runSync(runPayload);

        // Debug: Log full response
        console.log("   📋 Raw response keys:", Object.keys(res));
        console.log(
          "   📋 Raw response:",
          JSON.stringify(res, null, 2).substring(0, 1000),
        );

        // Check if completed successfully
        if (res?.status !== "COMPLETED") {
          console.log(
            `   ⚠️  TTS request did not complete successfully (trigger retry). status: ${res?.status}`,
          );
          throw new Error(
            `TTS request did not complete successfully. status: ${res?.status}`,
          );
        }

        if (!res?.output?.audio) {
          console.log(
            "   ⚠️  TTS request did not return any audio (trigger retry). output:",
            res?.output,
          );
          throw new Error(
            "TTS request did not return any audio. output:" + res?.output,
          );
        }

        return res;
      },
      {
        retries: 3,
        minTimeout: 2000,
        onRetry: (error) => {
          console.log(`   🔄 endpoint.runSync attempt failed:`, error);
        },
      },
    );

    const endTime = Date.now();
    const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(1);
    console.log(`   ✅ RunPod result received. elapsed: ${elapsedSeconds}s`);
    console.log(`   📋 Result (without audio data):`, {
      ...result,
      output: result.output
        ? { audio: "[base64]", ...result.output }
        : undefined,
    });

    const dataBase64 = result.output.audio;
    const buffer = Buffer.from(dataBase64, "base64");

    console.log(
      `   ✅ Generated audio: ${(buffer.length / 1024).toFixed(0)}KB`,
    );

    // Note: Pitch and volume adjustments are skipped as they're set to defaults (1, null)
    // If needed in the future, implement _adjustAudioBufferPitchAndVolume here

    return buffer;
  } catch (error) {
    console.error(`   ❌ Error generating speech:`, error.message);
    throw error;
  }
}

/**
 * Generate speech and save to file
 * @param {string} text - Text to convert
 * @param {string} outputPath - Where to save the audio file
 * @param {string} voice - Voice choice
 * @param {string} languageCode - Language code
 * @returns {Promise<string>} Output file path
 */
async function generateAndSaveSpeech(
  text,
  outputPath,
  voice = "female_1",
  languageCode = "en",
) {
  try {
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Generate speech
    const buffer = await generateSpeech(text, voice, languageCode);

    // Save to file
    fs.writeFileSync(outputPath, buffer);
    console.log(`   💾 Saved to: ${outputPath}`);

    return outputPath;
  } catch (error) {
    console.error(`   ❌ Error generating/saving speech:`, error.message);
    throw error;
  }
}

/**
 * Extract voice from story parameters
 * @param {Object} story - Story object from database
 * @returns {string} Voice choice (female_1, male_1, etc.)
 */
function extractVoiceFromStory(story) {
  // Check for voice in parameters
  if (story.parameters) {
    // Try common field names
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
  return "female_1";
}

/**
 * Extract language code from story
 * @param {Object} story - Story object from database
 * @returns {string} Language code
 */
function extractLanguageFromStory(story) {
  if (story.parameters) {
    const lang =
      story.parameters.language ||
      story.parameters.languageCode ||
      story.parameters.lang;

    if (lang) {
      return lang;
    }
  }

  // Default to English
  return "en";
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] || "test";
  const text =
    process.argv[3] ||
    "This is a test of the text to speech system. It creates beautiful narration for romantic stories.";

  (async () => {
    try {
      if (command === "test") {
        console.log("🧪 Testing XTTS speech generation...\n");
        const outputPath = path.join(process.cwd(), "data", "test-audio.wav");
        await generateAndSaveSpeech(text, outputPath, "female_1");
        console.log("\n✅ Test complete!");
      } else if (command === "voice") {
        const voice = process.argv[4] || "female_1";
        console.log(`🧪 Testing voice: ${voice}\n`);
        const outputPath = path.join(
          process.cwd(),
          "data",
          `test-${voice}.wav`,
        );
        await generateAndSaveSpeech(text, outputPath, voice);
        console.log("\n✅ Test complete!");
      } else if (command === "voices") {
        console.log("\n🎙️ Available Voices:\n");
        const voices = [
          "female_1",
          "female_2",
          "female_3",
          "male_1",
          "male_2",
          "male_3",
        ];
        voices.forEach((v) => {
          const params = UIVoiceToXTTSVoiceParams(v);
          console.log(`   ${v}:`);
          console.log(`      Language: ${params.languageCode}`);
          console.log(`      Sample: ${params.voiceUrl.split("/").pop()}`);
        });
        console.log("");
      }
    } catch (error) {
      console.error("\n💥 Error:", error);
      process.exit(1);
    }
  })();
}

export {
  generateSpeech,
  generateAndSaveSpeech,
  UIVoiceToXTTSVoiceParams,
  extractVoiceFromStory,
  extractLanguageFromStory,
};
