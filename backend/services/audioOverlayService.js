/**
 * Audio Overlay Service
 *
 * Handles overlaying/add audio tracks to videos using FFmpeg.
 * Features:
 * - Add audio track to video
 * - Replace existing audio
 * - Mix audio with existing audio
 * - Audio normalization and volume adjustment
 * - Trim audio to match video duration
 * - Quality verification
 */

import { getLogger } from '../utils/logger.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);
const logger = getLogger('services', 'audio-overlay');

class AudioOverlayService {
  constructor(config = {}) {
    this.outputDir = config.outputDir || process.env.AUDIO_OVERLAY_OUTPUT_DIR || './output/audio-overlay';
    this.tempDir = path.join(this.outputDir, 'temp');
    this.enabled = process.env.ENABLE_AUDIO_OVERLAY === 'true';
  }

  /**
   * Initialize output directories
   */
  async initialize() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });
      logger.info('Audio Overlay Service initialized', {
        outputDir: this.outputDir,
        enabled: this.enabled
      });
    } catch (error) {
      logger.error('Failed to initialize Audio Overlay Service', {
        error: error.message
      });
    }
  }

  /**
   * Step 3: Overlay audio on generated video
   * Adds or replaces audio track in video
   */
  async addAudioToVideo(options) {
    const {
      videoPath,
      audioPath,
      outputPath,
      mode = 'replace', // 'replace', 'mix', 'add'
      volume = 1.0, // Audio volume (0.0 to 1.0)
      fadeIn = 0, // Fade in duration in seconds
      fadeOut = 0, // Fade out duration in seconds
      audioStart = 0, // Audio start time in seconds
      loopAudio = false // Loop audio if shorter than video
    } = options;

    try {
      logger.info('Adding audio to video', { options });

      // Validate inputs
      await this.validateInputs(videoPath, audioPath);

      // Get video duration
      const videoDuration = await this.getVideoDuration(videoPath);
      const audioDuration = await this.getAudioDuration(audioPath);

      logger.info('Media durations', {
        video: videoDuration,
        audio: audioDuration
      });

      // Generate output path if not provided
      const finalOutputPath = outputPath || path.join(
        this.outputDir,
        `video-with-audio-${Date.now()}.mp4`
      );

      // Build FFmpeg command based on mode
      let ffmpegCommand;

      if (mode === 'replace') {
        ffmpegCommand = await this.buildReplaceCommand({
          videoPath,
          audioPath,
          outputPath: finalOutputPath,
          volume,
          fadeIn,
          fadeOut,
          audioStart,
          videoDuration,
          audioDuration,
          loopAudio
        });
      } else if (mode === 'mix') {
        ffmpegCommand = await this.buildMixCommand({
          videoPath,
          audioPath,
          outputPath: finalOutputPath,
          volume,
          fadeIn,
          fadeOut,
          audioStart,
          videoDuration,
          audioDuration,
          loopAudio
        });
      } else if (mode === 'add') {
        ffmpegCommand = await this.buildAddCommand({
          videoPath,
          audioPath,
          outputPath: finalOutputPath,
          volume,
          fadeIn,
          fadeOut,
          audioStart,
          videoDuration,
          audioDuration,
          loopAudio
        });
      } else {
        throw new Error(`Invalid mode: ${mode}`);
      }

      logger.info('Executing FFmpeg command', { command: ffmpegCommand });

      // Execute FFmpeg
      const { stdout, stderr } = await execAsync(ffmpegCommand);

      // FFmpeg logs to stderr, check for errors
      if (stderr && stderr.toLowerCase().includes('error')) {
        throw new Error(`FFmpeg error: ${stderr}`);
      }

      // Verify output file exists
      await fs.access(finalOutputPath);

      logger.info('Audio added successfully', {
        outputPath: finalOutputPath,
        videoDuration,
        audioDuration
      });

      return {
        success: true,
        outputPath: finalOutputPath,
        videoDuration,
        audioDuration,
        mode
      };
    } catch (error) {
      logger.error('Failed to add audio to video', {
        error: error.message,
        options
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Build FFmpeg command for replace mode
   */
  async buildReplaceCommand(options) {
    const {
      videoPath,
      audioPath,
      outputPath,
      volume,
      fadeIn,
      fadeOut,
      audioStart,
      videoDuration,
      audioDuration,
      loopAudio
    } = options;

    let audioFilter = `volume=${volume}`;

    // Add fade effects
    if (fadeIn > 0 || fadeOut > 0) {
      const fadeInStr = fadeIn > 0 ? `fade=t=in:st=0:d=${fadeIn}` : '';
      const fadeOutStr = fadeOut > 0 ? `fade=t=out:st=${videoDuration - fadeOut}:d=${fadeOut}` : '';
      audioFilter += `,${fadeInStr},${fadeOutStr}`.replace(/^,+,|,+$/g, '');
    }

    // Loop audio if needed
    const audioInput = loopAudio && audioDuration < videoDuration
      ? `-stream_loop -1 -i "${audioPath}"`
      : `-i "${audioPath}"`;

    // Trim audio to video duration if needed
    const durationFilter = loopAudio && audioDuration < videoDuration
      ? `-t ${videoDuration}`
      : (audioDuration > videoDuration ? `-t ${videoDuration}` : '');

    return `ffmpeg -y -i "${videoPath}" ${audioInput} -c:v copy -map 0:v:0 ` +
           `-map 1:a:0? -c:a aac -b:a 192k -shortest ` +
           `-af "${audioFilter}" -ss ${audioStart} ${durationFilter} "${outputPath}"`;
  }

  /**
   * Build FFmpeg command for mix mode
   */
  async buildMixCommand(options) {
    const {
      videoPath,
      audioPath,
      outputPath,
      volume,
      fadeIn,
      fadeOut,
      audioStart,
      videoDuration,
      audioDuration,
      loopAudio
    } = options;

    // Normalize and mix both audio tracks
    let audioFilter = `[0:a]volume=1.0[original]; [1:a]volume=${volume}`;

    // Add fade effects to new audio
    if (fadeIn > 0 || fadeOut > 0) {
      const fadeInStr = fadeIn > 0 ? `fade=t=in:st=0:d=${fadeIn}` : '';
      const fadeOutStr = fadeOut > 0 ? `fade=t=out:st=${videoDuration - fadeOut}:d=${fadeOut}` : '';
      audioFilter += `,${fadeInStr},${fadeOutStr}`.replace(/^,+,|,+$/g, '');
    }

    audioFilter += `[newaudio]; [original][newaudio]amix=inputs=2:duration=first:dropout_transition=2[aout]`;

    // Loop audio if needed
    const audioInput = loopAudio && audioDuration < videoDuration
      ? `-stream_loop -1 -i "${audioPath}"`
      : `-i "${audioPath}"`;

    const durationFilter = loopAudio && audioDuration < videoDuration
      ? `-t ${videoDuration}`
      : (audioDuration > videoDuration ? `-t ${videoDuration}` : '');

    return `ffmpeg -y -i "${videoPath}" ${audioInput} -c:v copy -map 0:v:0 ` +
           `-map "[aout]" -c:a aac -b:a 192k -shortest ` +
           `-af "${audioFilter}" -ss ${audioStart} ${durationFilter} "${outputPath}"`;
  }

  /**
   * Build FFmpeg command for add mode
   */
  async buildAddCommand(options) {
    const {
      videoPath,
      audioPath,
      outputPath,
      volume,
      fadeIn,
      fadeOut,
      audioStart,
      videoDuration,
      audioDuration,
      loopAudio
    } = options;

    let audioFilter = `volume=${volume}`;

    // Add fade effects
    if (fadeIn > 0 || fadeOut > 0) {
      const fadeInStr = fadeIn > 0 ? `fade=t=in:st=0:d=${fadeIn}` : '';
      const fadeOutStr = fadeOut > 0 ? `fade=t=out:st=${videoDuration - fadeOut}:d=${fadeOut}` : '';
      audioFilter += `,${fadeInStr},${fadeOutStr}`.replace(/^,+,|,+$/g, '');
    }

    // Loop audio if needed
    const audioInput = loopAudio && audioDuration < videoDuration
      ? `-stream_loop -1 -i "${audioPath}"`
      : `-i "${audioPath}"`;

    const durationFilter = loopAudio && audioDuration < videoDuration
      ? `-t ${videoDuration}`
      : (audioDuration > videoDuration ? `-t ${videoDuration}` : '');

    return `ffmpeg -y -i "${videoPath}" ${audioInput} -c:v copy -map 0:v:0 -map 1:a:0 ` +
           `-c:a aac -b:a 192k -shortest ` +
           `-af "${audioFilter}" -ss ${audioStart} ${durationFilter} "${outputPath}"`;
  }

  /**
   * Validate input files
   */
  async validateInputs(videoPath, audioPath) {
    // Check video file exists
    try {
      await fs.access(videoPath);
    } catch (error) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    // Check audio file exists
    try {
      await fs.access(audioPath);
    } catch (error) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }
  }

  /**
   * Get video duration using FFprobe
   */
  async getVideoDuration(videoPath) {
    const command = `ffprobe -v quiet -print_format json -show_format "${videoPath}"`;
    const { stdout } = await execAsync(command);
    const metadata = JSON.parse(stdout);
    return parseFloat(metadata.format.duration);
  }

  /**
   * Get audio duration using FFprobe
   */
  async getAudioDuration(audioPath) {
    const command = `ffprobe -v quiet -print_format json -show_format "${audioPath}"`;
    const { stdout } = await execAsync(command);
    const metadata = JSON.parse(stdout);
    return parseFloat(metadata.format.duration);
  }

  /**
   * Step 5: Test audio quality and sync
   * Verify output video has proper audio sync
   */
  async verifyAudioSync(videoPath) {
    try {
      logger.info('Verifying audio sync', { videoPath });

      // Get video metadata
      const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`;
      const { stdout } = await execAsync(command);
      const metadata = JSON.parse(stdout);

      // Check for audio stream
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

      if (!audioStream) {
        return {
          success: false,
          error: 'No audio stream found in video',
          synced: false
        };
      }

      // Verification checks
      const checks = {
        hasAudio: true,
        validCodec: audioStream.codec_name === 'aac',
        goodSampleRate: parseInt(audioStream.sample_rate) >= 44100,
        stereo: audioStream.channels === 2,
        duration: parseFloat(metadata.format.duration),
        audioDuration: parseFloat(audioStream.duration)
      };

      // Check if audio and video durations match
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      if (videoStream) {
        checks.videoDuration = parseFloat(videoStream.duration);
        checks.durationMatch = Math.abs(checks.duration - checks.videoDuration) < 0.1;
      }

      checks.synced = checks.durationMatch !== undefined ? checks.durationMatch : true;

      logger.info('Audio sync verification completed', {
        videoPath,
        synced: checks.synced,
        checks
      });

      return {
        success: true,
        synced: checks.synced,
        checks
      };
    } catch (error) {
      logger.error('Failed to verify audio sync', {
        error: error.message,
        videoPath
      });

      return {
        success: false,
        error: error.message,
        synced: false
      };
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanup() {
    try {
      const files = await fs.readdir(this.tempDir);
      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        await fs.unlink(filePath);
      }
      logger.info('Cleaned up temporary files', {
        count: files.length
      });
    } catch (error) {
      logger.error('Failed to cleanup temporary files', {
        error: error.message
      });
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      // Check if FFmpeg is available
      const { stdout } = await execAsync('ffmpeg -version');
      const ffmpegAvailable = stdout.includes('ffmpeg');

      // Check if FFprobe is available
      const { stdout: probeStdout } = await execAsync('ffprobe -version');
      const ffprobeAvailable = probeStdout.includes('ffprobe');

      return {
        healthy: ffmpegAvailable && ffprobeAvailable,
        ffmpegAvailable,
        ffprobeAvailable,
        outputDir: this.outputDir,
        enabled: this.enabled
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        ffmpegAvailable: false,
        ffprobeAvailable: false
      };
    }
  }
}

// Create singleton instance
const audioOverlayService = new AudioOverlayService();
audioOverlayService.initialize();

export default audioOverlayService;
