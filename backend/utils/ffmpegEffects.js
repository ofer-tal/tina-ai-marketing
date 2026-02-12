/**
 * FFmpeg Effects Builders
 *
 * Pre-built FFmpeg filter strings for common video effects
 * used in Tier 1 enhanced static video generation.
 */

/**
 * Class containing static methods for building FFmpeg filter strings
 */
class FfmpegEffects {
  /**
   * Ken Burns effect - Slow zoom in/out
   * Uses the zoompan filter to create smooth zoom motion
   *
   * @param {number} duration - Video duration in seconds
   * @param {number} zoomAmount - Total zoom amount (default: 1.15 = 15% zoom)
   * @param {string} direction - 'in', 'out', or 'inout' (zoom direction)
   * @returns {string} FFmpeg zoompan filter string
   */
  static kenBurnsFilter(duration = 10, zoomAmount = 1.15, direction = 'inout') {
    // Validate inputs
    if (duration <= 0) {
      throw new Error('Duration must be greater than 0');
    }
    if (zoomAmount < 1) {
      throw new Error('Zoom amount must be >= 1');
    }

    // Calculate total frames (assuming 25fps output)
    const fps = 25;
    const totalFrames = Math.round(duration * fps);

    let zoomExpression;
    switch (direction.toLowerCase()) {
      case 'in':
        // Smooth zoom in from 1.0 to zoomAmount
        zoomExpression = `1+(${zoomAmount - 1}*on/${totalFrames})`;
        break;
      case 'out':
        // Smooth zoom out from zoomAmount to 1.0
        zoomExpression = `${zoomAmount}-(${zoomAmount - 1}*on/${totalFrames})`;
        break;
      case 'inout':
      default:
        // Zoom in then out using sine wave for smooth motion
        // sin goes from 0 to 1 to 0 over PI
        zoomExpression = `1+(${zoomAmount - 1}*sin(on/${totalFrames}*PI))`;
        break;
    }

    // d=1 means output 1 frame per input frame (the loop filter provides infinite input)
    // The actual duration is controlled by -frames:v or -t in the main FFmpeg command
    // s=1080x1920 explicitly sets output size
    // fps sets output frame rate
    return `zoompan=z=${zoomExpression}:d=1:x=iw/2-iw/zoom/2:y=ih/2-ih/zoom/2:s=1080x1920:fps=${fps}`;
  }

  /**
   * Pan effect - Subtle horizontal or vertical movement
   *
   * @param {number} duration - Video duration in seconds
   * @param {string} direction - 'left', 'right', 'up', 'down', or 'diagonal'
   * @param {number} panAmount - Amount to pan as percentage (0.1 = 10%)
   * @returns {string} FFmpeg crop filter string
   */
  static panFilter(duration = 10, direction = 'right', panAmount = 0.1) {
    const maxPan = Math.min(panAmount, 0.5); // Cap at 50%

    let xExpression = '0';
    let yExpression = '0';

    switch (direction.toLowerCase()) {
      case 'left':
        xExpression = `(iw-iw/1.1)*(t/${duration})`;
        break;
      case 'right':
        xExpression = `(iw-iw/1.1)*(1-t/${duration})`;
        break;
      case 'up':
        yExpression = `(ih-ih/1.1)*(t/${duration})`;
        break;
      case 'down':
        yExpression = `(ih-ih/1.1)*(1-t/${duration})`;
        break;
      case 'diagonal':
        xExpression = `(iw-iw/1.1)*(t/${duration})`;
        yExpression = `(ih-ih/1.1)*(1-t/${duration})`;
        break;
    }

    // Crop slightly larger than input, then pan across
    const cropWidth = Math.floor(1920 * 1.1);
    const cropHeight = Math.floor(1080 * 1.1);

    return `crop=${cropWidth}:${cropHeight}:${xExpression}:${yExpression}`;
  }

  /**
   * Text overlay filter with animation
   *
   * @param {string} text - Text to display
   * @param {Object} options - Text options
   * @returns {string} FFmpeg drawtext filter string
   */
  static textOverlayFilter(text, options = {}) {
    const {
      fontSize = 48,
      fontColor = 'white',
      fontFamily = 'Arial',
      position = 'bottom', // 'top', 'bottom', 'center'
      x = '(w-text_w)/2', // Center horizontally by default
      y = 'h-text_h-50', // Bottom with padding
      shadowColor = 'black',
      shadowX = 2,
      shadowY = 2,
      borderWidth = 2,
      borderColor = 'black',
      fadeInDuration = 0.5,
      fadeOutDuration = 0.5,
      startTime = 0.5,
      endTime = null // If null, use video duration - fadeOutDuration
    } = options;

    // Escape the text for FFmpeg
    // Only escape single quotes and square brackets - colons don't need escaping
    const escapedText = text.replace(/'/g, "'\\''")
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]');

    // Calculate Y position based on position setting
    let yExpr = y;
    if (position === 'top') {
      yExpr = '50';
    } else if (position === 'center') {
      yExpr = '(h-text_h)/2';
    }

    // Build alpha expression for fade in/out
    let alphaExpression = "'1'";
    if (fadeInDuration > 0 || fadeOutDuration > 0) {
      const fadeInExpr = fadeInDuration > 0
        ? `if(lt(t,${startTime}),0,if(lt(t,${startTime + fadeInDuration}),(t-${startTime})/${fadeInDuration},1))`
        : '1';
      const fadeOutExpr = fadeOutDuration > 0 && endTime
        ? `if(lt(t,${endTime - fadeOutDuration}),1,if(lt(t,${endTime}),(${endTime}-t)/${fadeOutDuration},0))`
        : '1';

      if (fadeInDuration > 0 && fadeOutDuration > 0 && endTime) {
        alphaExpression = `'${fadeInExpr}*${fadeOutExpr}'`;
      } else if (fadeInDuration > 0) {
        alphaExpression = `'${fadeInExpr}'`;
      } else if (fadeOutDuration > 0 && endTime) {
        alphaExpression = `'${fadeOutExpr}'`;
      }
    }

    // Build drawtext filter
    const params = [
      `text='${escapedText}'`,
      `fontsize=${fontSize}`,
      `fontcolor=${fontColor}`,
      `fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf`,
      `x=${x}`,
      `y=${yExpr}`,
      `shadowcolor=${shadowColor}`,
      `shadowx=${shadowX}`,
      `shadowy=${shadowY}`,
      `borderw=${borderWidth}`,
      `bordercolor=${borderColor}`,
      `alpha=${alphaExpression}`
    ];

    return `drawtext=${params.join(':')}`;
  }

  /**
   * Vignette effect - Darkened edges for focus
   * Uses the vignette filter with proper parameters for edge darkening
   *
   * @param {number} strength - Vignette strength (0-1, default: 0.5)
   * @param {string} modeType - 'circular' or 'oval' (not used, always circular)
   * @returns {string} FFmpeg vignette filter string
   */
  static vignetteFilter(strength = 0.5, modeType = 'circular') {
    // Validate strength - keep it subtle for better blending
    const s = Math.max(0.05, Math.min(0.3, strength));

    // Use named parameters for vignette filter
    // angle=PI/2 gives full circular coverage
    // aspect controls the strength (lower = more subtle)
    // x0 and y0 default to center (w/2, h/2) - no need to specify
    return `vignette=angle=PI/2:aspect=${s}`;
  }

  /**
   * Fade in/out filter
   *
   * @param {number} fadeInDuration - Fade in duration in seconds
   * @param {number} fadeOutDuration - Fade out duration in seconds
   * @param {number} totalDuration - Total video duration for fade out timing
   * @returns {string} FFmpeg fade filter string
   */
  static fadeInOutFilter(fadeInDuration = 0.5, fadeOutDuration = 0.5, totalDuration = 10) {
    const filters = [];

    if (fadeInDuration > 0) {
      filters.push(`fade=t=in:st=0:d=${fadeInDuration}`);
    }

    if (fadeOutDuration > 0 && totalDuration > fadeOutDuration) {
      filters.push(`fade=t=out:st=${totalDuration - fadeOutDuration}:d=${fadeOutDuration}`);
    }

    return filters.join(',');
  }

  /**
   * Extend image to match audio duration
   * Loops the image to match the target duration
   *
   * @param {number} targetDuration - Target duration in seconds
   * @returns {string} FFmpeg loop filter string
   */
  static extendToDurationFilter(targetDuration) {
    // Loop the image and trim to exact duration
    return `loop=loop=-1:size=1:start=0,trim=0:${targetDuration}`;
  }

  /**
   * Combine multiple filters for Tier 1 enhanced static video
   *
   * @param {Object} options - All effect options
   * @returns {string} Combined FFmpeg video filter string
   */
  static buildTier1VideoFilters(options = {}) {
    const {
      duration = 10,
      kenBurns = true,
      pan = false,
      textOverlay = null,
      vignette = true,
      fadeIn = true,
      fadeOut = true,
      vignetteStrength = 0.3,
      zoomAmount = 1.15,
      zoomDirection = 'inout'
    } = options;

    const filters = [];

    // Start with loop/extend filter to match duration
    filters.push(`loop=loop=-1:size=1:start=0`);

    // Add Ken Burns zoom effect
    if (kenBurns) {
      filters.push(this.kenBurnsFilter(duration, zoomAmount, zoomDirection));
    }

    // Add pan effect (alternative to Ken Burns)
    if (pan && !kenBurns) {
      filters.push(this.panFilter(duration));
    }

    // Add vignette
    if (vignette) {
      filters.push(this.vignetteFilter(vignetteStrength));
    }

    // Add fade in/out
    if (fadeIn || fadeOut) {
      const fadeInDur = fadeIn ? 0.5 : 0;
      const fadeOutDur = fadeOut ? 0.5 : 0;
      filters.push(this.fadeInOutFilter(fadeInDur, fadeOutDur, duration));
    }

    // Add text overlay (added separately as drawtext is complex)
    // This should be appended to the main filter chain

    return filters.join(',');
  }

  /**
   * Build complete filter chain for Tier 1 video with text overlay
   *
   * @param {Object} options - All options including text
   * @returns {string} Complete FFmpeg filter chain
   */
  static buildCompleteTier1FilterChain(options = {}) {
    const {
      duration = 10,
      text = null,
      textOptions = {},
      ...effectOptions
    } = options;

    const videoFilters = this.buildTier1VideoFilters({
      duration,
      ...effectOptions
    });

    if (text) {
      const textFilter = this.textOverlayFilter(text, {
        endTime: duration,
        ...textOptions
      });
      return `${videoFilters},${textFilter}`;
    }

    return videoFilters;
  }

  /**
   * Normalize audio filter
   * Ensures consistent audio levels
   *
   * @param {number} targetLevel - Target level in dB (default: -16)
   * @returns {string} FFmpeg audio normalization filter
   */
  static normalizeAudioFilter(targetLevel = -16) {
    return `loudnorm=I=${targetLevel}:TP=-1.5:LRA=11`;
  }

  /**
   * Mix narration with background music
   *
   * @param {number} musicVolume - Music volume level (0.0 to 1.0)
   * @param {number} narrationVolume - Narration volume level (0.0 to 1.0)
   * @param {number} duration - Total duration in seconds
   * @returns {string} FFmpeg amix filter string
   */
  static mixAudioFilter(musicVolume = 0.2, narrationVolume = 1.0, duration = 10) {
    return `[0:a]volume=${narrationVolume}[narration];[1:a]volume=${musicVolume},afade=t=out:st=${duration - 1}:d=1[music];[narration][music]amix=inputs=2:duration=1:dropout_transition=2`;
  }
}

export default FfmpegEffects;
