/**
 * Image Generator - RunPod PixelWave Integration
 *
 * Generates images using Flux-dev/PixelWave via RunPod serverless
 * Matches Blush app's visual style
 */

import dotenv from "dotenv";
import { default as runpodSdk } from "runpod-sdk";
import fs from "fs";
import path from "path";

dotenv.config();

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_ENDPOINT_ID_PIXELWAVE = process.env.RUNPOD_ENDPOINT_ID_PIXELWAVE;

// Initialize RunPod
const runpod = runpodSdk(RUNPOD_API_KEY);
const endpoint = runpod.endpoint(RUNPOD_ENDPOINT_ID_PIXELWAVE);

/**
 * Get PixelWave ComfyUI workflow
 */
function getPixelWaveComfyWorkflow(prompt, steps, width, height, CFG) {
  return {
    5: {
      inputs: {
        width: ["70", 0],
        height: ["71", 0],
        batch_size: 1,
      },
      class_type: "EmptyLatentImage",
      _meta: { title: "Empty Latent Image" },
    },
    6: {
      inputs: {
        text: ["28", 0],
        clip: ["11", 0],
      },
      class_type: "CLIPTextEncode",
      _meta: { title: "CLIP Text Encode (Prompt)" },
    },
    8: {
      inputs: {
        samples: ["13", 0],
        vae: ["10", 0],
      },
      class_type: "VAEDecode",
      _meta: { title: "VAE Decode" },
    },
    9: {
      inputs: {
        filename_prefix: "MarkuryFLUX",
        images: ["8", 0],
      },
      class_type: "SaveImage",
      _meta: { title: "Save Image" },
    },
    10: {
      inputs: {
        vae_name: "ae.safetensors",
      },
      class_type: "VAELoader",
      _meta: { title: "Load VAE" },
    },
    11: {
      inputs: {
        clip_name1: "t5xxl_fp8_e4m3fn.safetensors",
        clip_name2: "clip_l.safetensors",
        type: "flux",
      },
      class_type: "DualCLIPLoader",
      _meta: { title: "DualCLIPLoader" },
    },
    12: {
      inputs: {
        unet_name: "pixelwave_flux1_dev_bf16_03.safetensors",
        weight_dtype: "fp8_e4m3fn",
      },
      class_type: "UNETLoader",
      _meta: { title: "Load Diffusion Model" },
    },
    13: {
      inputs: {
        noise: ["25", 0],
        guider: ["22", 0],
        sampler: ["16", 0],
        sigmas: ["17", 0],
        latent_image: ["5", 0],
      },
      class_type: "SamplerCustomAdvanced",
      _meta: { title: "SamplerCustomAdvanced" },
    },
    16: {
      inputs: {
        sampler_name: "dpmpp_2m",
      },
      class_type: "KSamplerSelect",
      _meta: { title: "KSamplerSelect" },
    },
    17: {
      inputs: {
        scheduler: "sgm_uniform",
        steps: steps,
        denoise: 1,
        model: ["61", 0],
      },
      class_type: "BasicScheduler",
      _meta: { title: "BasicScheduler" },
    },
    22: {
      inputs: {
        model: ["61", 0],
        conditioning: ["60", 0],
      },
      class_type: "BasicGuider",
      _meta: { title: "BasicGuider" },
    },
    25: {
      inputs: {
        noise_seed: Math.floor(Math.random() * 1000000000000000),
      },
      class_type: "RandomNoise",
      _meta: { title: "RandomNoise" },
    },
    28: {
      inputs: {
        string: prompt,
      },
      class_type: "String Literal",
      _meta: { title: "String Literal" },
    },
    60: {
      inputs: {
        guidance: CFG,
        conditioning: ["6", 0],
      },
      class_type: "FluxGuidance",
      _meta: { title: "FluxGuidance" },
    },
    61: {
      inputs: {
        max_shift: 1.15,
        base_shift: 0.5,
        width: ["70", 0],
        height: ["71", 0],
        model: ["12", 0],
      },
      class_type: "ModelSamplingFlux",
      _meta: { title: "ModelSamplingFlux" },
    },
    70: {
      inputs: {
        int: width,
      },
      class_type: "Int Literal",
      _meta: { title: "Width" },
    },
    71: {
      inputs: {
        int: height,
      },
      class_type: "Int Literal",
      _meta: { title: "Height" },
    },
    72: {
      inputs: {
        lora_name: "0615-1500.safetensors",
        strength_model: 1,
      },
      class_type: "LoraLoaderModelOnly",
      _meta: { title: "LoraLoaderModelOnly" },
    },
  };
}

/**
 * Generate PixelWave cover image
 * @param {string} prompt - Image generation prompt
 * @param {number} CFG - Classifier Free Guidance scale (default: 3.5)
 * @param {number} steps - Generation steps (default: 15)
 * @param {number} width - Image width (default: 1024)
 * @param {number} height - Image height (default: 1024)
 * @returns {Promise<{buffer: Buffer, contentType: string}>}
 */
async function generatePixelWaveImage(
  prompt,
  CFG = 3.5,
  steps = 15,
  width = 1024,
  height = 1024,
) {
  console.log(`\n🎨 Generating PixelWave image...`);
  console.log(`   Prompt: ${prompt.substring(0, 100)}...`);

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
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        console.log(`   ⚠️  RunPod attempt ${attempt} failed:`, error.message);

        // Don't retry on authentication errors
        if (error.message.includes("401") || error.message.includes("403")) {
          throw error;
        }

        // Wait before retry (except on last attempt)
        if (attempt < 3) {
          console.log(`   🔄 Retrying in 2s...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }

    if (!result) {
      throw lastError;
    }

    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   ✅ RunPod completed in ${elapsedSeconds}s`);

    if (result.status !== "COMPLETED") {
      throw new Error(
        `Generate image request failed with status: ${result.status}`,
      );
    }

    const imageDataBase64 = result.output.message;
    const buffer = Buffer.from(imageDataBase64, "base64");

    console.log(
      `   ✅ Generated image: ${(buffer.length / 1024).toFixed(0)}KB`,
    );

    return {
      buffer,
      contentType: "image/png",
    };
  } catch (error) {
    console.error(`   ❌ Error generating image:`, error.message);
    throw error;
  }
}

/**
 * Generate image and save to file
 * @param {string} prompt - Image generation prompt
 * @param {string} outputPath - Where to save the image
 * @param {Object} options - Generation options
 */
async function generateAndSaveImage(prompt, outputPath, options = {}) {
  const { CFG = 3.5, steps = 15, width = 1024, height = 1024 } = options;

  try {
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Generate image
    const { buffer } = await generatePixelWaveImage(
      prompt,
      CFG,
      steps,
      width,
      height,
    );

    // Save to file
    fs.writeFileSync(outputPath, buffer);
    console.log(`   💾 Saved to: ${outputPath}`);

    return outputPath;
  } catch (error) {
    console.error(`   ❌ Error generating/saving image:`, error.message);
    throw error;
  }
}

/**
 * Generate story scene images based on story content
 * @param {Object} story - Story object from database
 * @param {number} numScenes - Number of scene images to generate
 * @returns {Promise<Array<string>>} - Array of image file paths
 */
async function generateStorySceneImages(story, numScenes = 3) {
  console.log(`\n🎬 Generating ${numScenes} scene images for: ${story.name}`);

  const imagePaths = [];

  // Create output directory
  const timestamp = new Date().toISOString().split("T")[0];
  const outputDir = path.join(
    process.cwd(),
    "data",
    "generated-images",
    timestamp,
  );
  fs.mkdirSync(outputDir, { recursive: true });

  // Extract scene descriptions from story if available
  // For now, we'll generate prompts from story description
  const basePrompt = story.description || story.name || "romantic scene";

  // Generate different scenes with varied prompts
  const scenePrompts = generateScenePrompts(basePrompt, story.name, numScenes);

  for (let i = 0; i < numScenes; i++) {
    const filename = `${story._id || story.name.replace(/\s+/g, "_")}_scene_${i + 1}.png`;
    const outputPath = path.join(outputDir, filename);

    try {
      console.log(`\n📸 Scene ${i + 1}/${numScenes}:`);
      await generateAndSaveImage(scenePrompts[i], outputPath, {
        CFG: 3.5,
        steps: 15,
        width: 1024,
        height: 1024,
      });

      imagePaths.push(outputPath);
    } catch (error) {
      console.error(`   ❌ Failed to generate scene ${i + 1}:`, error.message);
      // Continue with next scene
    }
  }

  console.log(`\n✅ Generated ${imagePaths.length}/${numScenes} scene images`);

  return imagePaths;
}

/**
 * Generate scene prompts from story description
 * Optimized for TikTok/BookTok style with varied visual styles
 * IMPORTANT: Incorporates actual story details and ensures appropriate content
 */
function generateScenePrompts(baseDescription, title, numScenes) {
  // Extract key elements from the story description and title
  const description = (baseDescription || "").toLowerCase();
  const titleLower = (title || "").toLowerCase();

  // Detect LGBTQ+ themes (default to heterosexual unless explicitly LGBTQ+)
  const lgbtqKeywords = [
    "lesbian",
    "gay",
    "queer",
    "lgbt",
    "lgbtq",
    "wlw",
    "sapphic",
    "two women",
    "female couple",
    "women loving women",
  ];
  const isLGBTQ = lgbtqKeywords.some(
    (keyword) => description.includes(keyword) || titleLower.includes(keyword),
  );

  // Determine couple type based on story
  let coupleDescription;
  if (isLGBTQ) {
    coupleDescription = "lesbian couple, two women together";
  } else {
    // Default to heterosexual for 85% of audience
    coupleDescription = "heterosexual couple, man and woman together";
  }

  // Varied visual styles to prevent sameness - FOCUSED ON STYLIZED/ARTISTIC not photorealistic
  const visualStyles = [
    {
      style:
        "Watercolor painting style, soft flowing colors, artistic brushstrokes, dreamy and ethereal, not photorealistic, romantic illustration aesthetic",
      colors:
        "soft pastels with gentle color transitions, lavender and rose tones",
    },
    {
      style:
        "Digital art illustration style, clean vector art aesthetic, stylized characters, modern romantic art, artistic and stylized not realistic",
      colors: "vibrant but harmonious colors with clean gradients",
    },
    {
      style:
        "Impressionist oil painting, visible brushstrokes, Monet-inspired, artistic and textured, painterly style, soft and dreamy atmosphere",
      colors: "impressionist palette with soft blues, pinks, and warm golds",
    },
    {
      style:
        "Anime/manga illustration style, romantic aesthetic, stylized characters, artistic and expressive, clean illustration",
      colors: "soft anime palette with delicate pinks and purples",
    },
    {
      style:
        "Artistic sketch style, charcoal or pencil drawing aesthetic, rough and expressive, artistic texture, romantic mood illustration",
      colors: "grayscale with subtle rose gold accents",
    },
    {
      style:
        "Fantasy book cover art style, romantic digital illustration, artistic composition, painterly and dreamy, like romance novel cover art",
      colors: "rich romantic colors with deep purples, reds, and golds",
    },
    {
      style:
        "Stained glass art style, geometric shapes, vibrant colors between leading, artistic and stylized, decorative and ornamental",
      colors:
        "bold jewel tones with ruby red, sapphire blue, and emerald green",
    },
    {
      style:
        "Art nouveau style, flowing organic lines, decorative borders, Mucha-inspired illustration, elegant and artistic",
      colors: "muted earthy tones with gold accents and organic curves",
    },
    {
      style:
        "Soft pastel drawing, chalk pastel texture, gentle and dreamy, artistic smudges, romantic illustration aesthetic",
      colors: "soft pastels with peaches, mints, and lavender",
    },
    {
      style:
        "Cyberpunk digital art, neon lighting effects, futuristic aesthetic, glowing accents, dark atmospheric mood with vibrant neon highlights",
      colors:
        "deep blacks and blues with neon cyan, magenta, and electric purple highlights",
    },
    {
      style:
        "Gothic romance art style, dark moody atmosphere, dramatic shadows and highlights, Victorian aesthetic with mysterious ambiance",
      colors: "deep crimsons, blacks, and dark purples with dramatic contrast",
    },
    {
      style:
        "Film noir style, black and white photography aesthetic, dramatic chiaroscuro lighting, shadows and mystery, moody and intense",
      colors: "monochrome black and white with high contrast dramatic lighting",
    },
    {
      style:
        "Steampunk illustration style, brass and copper tones, mechanical elements, Victorian industrial aesthetic, detailed and textured",
      colors:
        "rich browns, copper, brass, and sepia tones with mechanical details",
    },
    {
      style:
        "Dark fantasy art style, intense and dramatic, bold contrasts, shadowy atmosphere with striking highlights, powerful and sensual",
      colors:
        "deep blacks, blood reds, and midnight blues with piercing highlights",
    },
    {
      style:
        "Surrealist art style, dreamlike and unsettling, twisted perspective, dramatic imagery, artistic and provocative",
      colors:
        "juxtaposed colors with deep shadows and bright unsettling highlights",
    },
    {
      style:
        "Comic book graphic novel style, bold lines and colors, dramatic angles, graphic illustration aesthetic, intense and dynamic",
      colors:
        "bold primary colors with strong black outlines and dramatic shading",
    },
  ];

  const prompts = [];

  for (let i = 0; i < numScenes; i++) {
    // Randomly select a visual style for each scene to ensure variety
    const styleIndex = Math.floor(Math.random() * visualStyles.length);
    const visualStyle = visualStyles[styleIndex];

    let prompt = "";

    if (i === 0) {
      // Scene 1: Establishing shot - use the full story description
      prompt = `${baseDescription}, `;
      prompt += `${visualStyle.style}, ${visualStyle.colors}, `;
      prompt += `romantic scene, ${coupleDescription}, `;
      prompt += `characters tastefully dressed, wearing elegant clothing, `;
      prompt += `cinematic composition, atmospheric mood, `;
      prompt += `female gaze perspective, elegant and sensual, `;
      prompt += `high quality, highly detailed, romantic aesthetic, artistic not photorealistic`;
    } else if (i === 1) {
      // Scene 2: Intimate close-up - incorporate story details
      prompt = `Intimate close-up romantic scene showing ${baseDescription.slice(0, 150)}, `;
      prompt += `${visualStyle.style}, ${visualStyle.colors}, `;
      prompt += `${coupleDescription}, `;
      prompt += `characters wearing sensual but appropriate clothing, `;
      prompt += `soft lighting on faces, romantic tension, `;
      prompt += `cinematic depth of field, passionate but tasteful, `;
      prompt += `BookTok aesthetic, high quality, detailed, artistic style`;
    } else if (i === 2) {
      // Scene 3: Emotional/dramatic moment - story-driven
      prompt = `Romantic passion scene depicting ${baseDescription.slice(0, 150)}, `;
      prompt += `${visualStyle.style}, dramatic emotional intensity, `;
      prompt += `${coupleDescription}, `;
      prompt += `tastefully dressed in romantic attire, `;
      prompt += `${visualStyle.colors}, longing and desire, `;
      prompt += `cinematic visual storytelling, sensual atmosphere, `;
      prompt += `high quality, detailed, romantic drama, artistic illustration`;
    } else {
      // Additional scenes with style variations
      prompt = `${baseDescription.slice(0, 120)}, `;
      prompt += `${visualStyle.style}, `;
      prompt += `${coupleDescription}, `;
      prompt += `tastefully and elegantly dressed, `;
      prompt += `${visualStyle.colors}, intimate and romantic, `;
      prompt += `beautiful composition, emotional mood, `;
      prompt += `high quality, detailed, sensual but tasteful, artistic not realistic`;
    }

    prompts.push(prompt);
  }

  return prompts.slice(0, numScenes);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] || "test";
  const prompt =
    process.argv[3] ||
    "Romantic scene, lovers embracing at sunset, cinematic lighting, high quality";

  (async () => {
    try {
      if (command === "test") {
        console.log("🧪 Testing PixelWave image generation...\n");
        const outputPath = path.join(process.cwd(), "data", "test-image.png");
        await generateAndSaveImage(prompt, outputPath);
        console.log("\n✅ Test complete!");
      } else if (command === "prompt") {
        console.log(`📝 Prompt: ${prompt}\n`);
        const outputPath = path.join(process.cwd(), "data", "custom-image.png");
        await generateAndSaveImage(prompt, outputPath);
        console.log("\n✅ Image generated!");
      }
    } catch (error) {
      console.error("\n💥 Error:", error);
      process.exit(1);
    }
  })();
}

export {
  generatePixelWaveImage,
  generateAndSaveImage,
  generateStorySceneImages,
  generateScenePrompts,
  getPixelWaveComfyWorkflow,
};
