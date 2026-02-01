/**
 * Text Overlay Renderer Service
 *
 * Renders text onto images using Puppeteer (headless Chrome).
 * Full emoji support with no native compilation required.
 *
 * Benefits:
 * - Full emoji support (🔥✨💕) via Chrome's rendering
 * - No native compilation (pure npm package)
 * - Works on Windows now, Linux in Docker later
 * - Chrome auto-downloads for correct platform
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('services', 'text-overlay-renderer');

// Storage paths
const STORAGE_TEMP = path.join(process.cwd(), 'storage', 'temp');

// Browser instance (reused across calls for performance)
let browserInstance = null;
let browserLaunchPromise = null;

/**
 * Get or create browser instance
 * Lazy initialization on first use
 */
async function getBrowser() {
  if (browserInstance) {
    return browserInstance;
  }

  if (browserLaunchPromise) {
    return await browserLaunchPromise;
  }

  browserLaunchPromise = (async () => {
    logger.info('Launching Puppeteer browser...');
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Helps with Docker
        '--disable-gpu'
      ]
    });
    logger.info('Puppeteer browser launched successfully');
    browserInstance = browser;
    return browser;
  })();

  return browserLaunchPromise;
}

/**
 * Close browser instance (call on shutdown)
 */
export async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
    browserLaunchPromise = null;
    logger.info('Puppeteer browser closed');
  }
}

/**
 * Text overlay configuration
 */
const TEXT_CONFIG = {
  // Font sizes for different slide types
  hook: { fontSize: 70, maxWidthPct: 90, maxLines: 4 },
  narrative: { fontSize: 48, maxWidthPct: 92, maxLines: 999 },
  cta: { fontSize: 56, maxWidthPct: 88, maxLines: 2 },

  // Colors
  textColor: '#FFFFFF',
  shadowColor: 'rgba(0, 0, 0, 0.7)',

  // Layout
  marginPercent: 0.04,
  lineHeight: 1.3
};

/**
 * Create HTML for text rendering with background image
 */
function createTextHTML(options) {
  const {
    width = 1080,
    height = 1920,
    text = '',
    fontSize = 48,
    textColor = '#FFFFFF',
    backgroundColor = 'transparent',
    backgroundImage = null, // data URL or null
    position = 'center', // 'top', 'center', 'bottom'
    textAlign = 'center',
    maxLines = 3
  } = options;

  // Calculate styles based on position
  let alignItems = 'center';
  let justifyContent = 'center';
  let paddingTop = '0';
  let paddingBottom = '0';
  let paddingLeft = '4%';
  let paddingRight = '4%';

  if (position === 'top') {
    justifyContent = 'flex-start';
    paddingTop = '4%';
    paddingBottom = '0';
  } else if (position === 'bottom') {
    justifyContent = 'flex-end';
    paddingTop = '0';
    paddingBottom = '4%';
  } else {
    // center
    paddingTop = '4%';
    paddingBottom = '4%';
  }

  // Build background style
  let bgStyle = backgroundColor;
  if (backgroundImage) {
    bgStyle = `url(${backgroundImage}) center/cover no-repeat`;
  }

  // Text styling with shadow for better visibility
  const textShadow = '2px 2px 8px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 0, 0, 0.5)';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          width: ${width}px;
          height: ${height}px;
          overflow: hidden;
        }
        .container {
          width: 100%;
          height: 100%;
          background: ${bgStyle};
          display: flex;
          flex-direction: column;
          align-items: ${alignItems};
          justify-content: ${justifyContent};
          padding: ${paddingTop} ${paddingRight} ${paddingBottom} ${paddingLeft};
        }
        .text {
          font-family: 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', 'Arial', sans-serif;
          font-size: ${fontSize}px;
          color: ${textColor};
          text-align: ${textAlign};
          line-height: ${TEXT_CONFIG.lineHeight};
          text-shadow: ${textShadow};
          word-wrap: break-word;
          overflow-wrap: break-word;
          max-width: 100%;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="text">${text}</div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Render text overlay onto an image using Puppeteer
 *
 * @param {Object} options - Rendering options
 * @param {string} options.imagePath - Path to source image
 * @param {string} options.text - Text to render (supports emojis!)
 * @param {number} options.fontSize - Font size in pixels
 * @param {string} options.position - 'top', 'center', or 'bottom'
 * @param {string} options.textAlign - 'left', 'center', or 'right'
 * @param {number} options.maxLines - Maximum number of lines
 * @param {string} options.outputPath - Output path (optional, generates if not provided)
 * @returns {Promise<string>} Path to rendered image
 */
export async function renderTextOverlay(options) {
  const {
    imagePath,
    text = '',
    fontSize = 48,
    position = 'bottom',
    textAlign = 'center',
    maxLines = 3,
    outputPath = null
  } = options;

  if (!text || text.trim() === '') {
    logger.debug('No text provided, returning original image');
    return imagePath;
  }

  const timestamp = Date.now();
  const finalOutputPath = outputPath || path.join(
    STORAGE_TEMP,
    `text_overlay_${timestamp}.png`
  );

  try {
    // Read the source image and convert to data URL
    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const imageExt = path.extname(imagePath).toLowerCase();
    const mimeType = imageExt === '.png' ? 'image/png' : 'image/jpeg';

    // Get image dimensions
    const { imageWidth, imageHeight } = await getImageDimensions(imagePath);

    const browser = await getBrowser();
    const page = await browser.newPage();

    // Set viewport to match image dimensions
    await page.setViewport({ width: imageWidth, height: imageHeight, deviceScaleFactor: 1 });

    // Create HTML with background image and text
    const html = createTextHTML({
      width: imageWidth,
      height: imageHeight,
      text: escapeHtml(text),
      fontSize,
      textColor: TEXT_CONFIG.textColor,
      backgroundImage: `data:${mimeType};base64,${base64Image}`,
      position,
      textAlign,
      maxLines
    });

    await page.setContent(html);

    // Take screenshot
    await page.screenshot({
      path: finalOutputPath,
      type: 'png'
    });

    await page.close();

    logger.info('Text overlay rendered', {
      inputPath: imagePath,
      outputPath: finalOutputPath,
      textLength: text.length,
      fontSize,
      position
    });

    return finalOutputPath;

  } catch (error) {
    logger.error('Failed to render text overlay', {
      error: error.message,
      imagePath,
      text: text.substring(0, 50)
    });
    throw error;
  }
}

/**
 * Get image dimensions
 * For now, we assume standard 9:16 format since we generate the images
 * In production, could add Sharp if native compilation is available
 */
async function getImageDimensions(imagePath) {
  // Try to get actual dimensions if Sharp is available
  try {
    const sharpModule = await import('sharp').catch(() => null);
    if (sharpModule) {
      const { default: sharpDefault } = sharpModule;
      const metadata = await sharpDefault(imagePath).metadata();
      logger.debug('Got image dimensions from Sharp', {
        path: imagePath,
        width: metadata.width,
        height: metadata.height
      });
      return { imageWidth: metadata.width, imageHeight: metadata.height };
    }
  } catch (error) {
    logger.debug('Sharp not available, using default dimensions', { error: error.message });
  }

  // Fallback to standard 9:16 format
  return { imageWidth: 1080, imageHeight: 1920 };
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Render text overlay with configuration for a specific slide type
 *
 * @param {Object} options - Options
 * @param {string} options.imagePath - Path to source image
 * @param {string} options.text - Text to render
 * @param {string} options.slideType - 'hook', 'narrative', or 'cta'
 * @param {string} options.position - Override position (optional)
 * @returns {Promise<string>} Path to rendered image
 */
export async function renderSlideText(options) {
  const {
    imagePath,
    text,
    slideType = 'narrative',
    position = null
  } = options;

  // Get config for slide type
  const config = TEXT_CONFIG[slideType] || TEXT_CONFIG.narrative;

  // Determine position based on slide type if not overridden
  let finalPosition = position;
  if (!finalPosition) {
    finalPosition = 'center'; // All text centered now
  }

  return await renderTextOverlay({
    imagePath,
    text,
    fontSize: config.fontSize,
    position: finalPosition,
    textAlign: 'center',
    maxLines: config.maxLines
  });
}

/**
 * Create a gradient slide with text using Puppeteer
 *
 * @param {Object} options - Options
 * @param {string} options.text - Text to render
 * @param {string} options.gradientStart - Start color (hex)
 * @param {string} options.gradientEnd - End color (hex)
 * @param {string} options.foregroundColor - Text color (hex)
 * @param {number} options.width - Canvas width (default: 1080)
 * @param {number} options.height - Canvas height (default: 1920)
 * @param {string} options.outputPath - Output path (optional)
 * @returns {Promise<string>} Path to rendered gradient slide
 */
export async function createGradientSlide(options) {
  const {
    text = '',
    gradientStart = '#e94560',
    gradientEnd = '#1a1a2e',
    foregroundColor = '#ffffff',
    width = 1080,
    height = 1920,
    outputPath = null
  } = options;

  const timestamp = Date.now();
  const finalOutputPath = outputPath || path.join(
    STORAGE_TEMP,
    `gradient_slide_${timestamp}.png`
  );

  try {
    const browser = await getBrowser();
    const page = await browser.newPage();

    // Set viewport to match dimensions
    await page.setViewport({ width, height, deviceScaleFactor: 1 });

    // Create HTML with gradient background and text
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            width: ${width}px;
            height: ${height}px;
            overflow: hidden;
          }
          .container {
            width: 100%;
            height: 100%;
            background: linear-gradient(180deg, ${gradientStart} 0%, ${gradientEnd} 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px;
          }
          .text {
            font-family: 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', 'Arial', sans-serif;
            font-size: 64px;
            color: ${foregroundColor};
            text-align: center;
            line-height: 1.3;
            text-shadow: 2px 2px 10px rgba(0, 0, 0, 0.5);
            word-wrap: break-word;
            overflow-wrap: break-word;
            max-width: 90%;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="text">${escapeHtml(text)}</div>
        </div>
      </body>
      </html>
    `;

    await page.setContent(html);

    // Take screenshot
    await page.screenshot({
      path: finalOutputPath,
      type: 'png'
    });

    await page.close();

    logger.info('Gradient slide created', {
      path: finalOutputPath,
      hasText: !!text
    });

    return finalOutputPath;

  } catch (error) {
    logger.error('Failed to create gradient slide', {
      error: error.message
    });
    throw error;
  }
}

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    await closeBrowser();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await closeBrowser();
  });
}

export default {
  renderTextOverlay,
  renderSlideText,
  createGradientSlide,
  closeBrowser
};
