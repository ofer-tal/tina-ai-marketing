/**
 * FFmpeg Wrapper Utility
 *
 * Abstracts FFmpeg execution to support both WSL and native modes.
 * Windows users with WSL can use WSL's FFmpeg, while Linux/Docker users
 * can use native FFmpeg.
 *
 * Environment Variable: FFMPEG_MODE=wsl (default) or FFMPEG_MODE=native
 */

import { exec, spawn, spawnSync, execSync } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { getLogger } from './logger.js';

const execAsync = promisify(exec);
const logger = getLogger('utils', 'ffmpeg-wrapper');

const FFMPEG_MODE = process.env.FFMPEG_MODE || 'wsl';

class FfmpegWrapper {
  constructor() {
    this.mode = FFMPEG_MODE;
    this.wslAvailable = false;
    this.nativeAvailable = false;
    this.isWSL = this._isWSL();
    logger.info('FFmpeg Wrapper initialized', { mode: this.mode, isWSL: this.isWSL });
  }

  /**
   * Check if running in WSL mode
   * @private
   */
  _isWSL() {
    return this.mode.toLowerCase() === 'wsl' || process.platform === 'win32';
  }

  /**
   * Check if WSL is available on the system
   * @private
   */
  async _checkWSLAvailable() {
    if (this.wslAvailable !== false) {
      return this.wslAvailable;
    }
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      await execAsync('wsl --version', { timeout: 5000 });
      this.wslAvailable = true;
      return true;
    } catch {
      this.wslAvailable = false;
      return false;
    }
  }

  /**
   * Check if native FFmpeg is available
   * @private
   */
  async _checkNativeAvailable() {
    if (this.nativeAvailable !== false) {
      return this.nativeAvailable;
    }
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      await execAsync('ffmpeg -version', { timeout: 5000 });
      this.nativeAvailable = true;
      return true;
    } catch {
      this.nativeAvailable = false;
      return false;
    }
  }

  /**
   * Convert Windows path to WSL path
   * @private
   */
  _toWSLPath(windowsPath) {
    if (typeof windowsPath !== 'string') {
      return windowsPath;
    }

    // Check if it's already a WSL path
    if (windowsPath.startsWith('/mnt/')) {
      return windowsPath;
    }

    // Convert C:\path\to\file to /mnt/c/path/to/file
    const match = windowsPath.match(/^([A-Z]):\\(.+)$/);
    if (match) {
      const drive = match[1].toLowerCase();
      const filePath = match[2].replace(/\\/g, '/');
      return `/mnt/${drive}/${filePath}`;
    }

    return windowsPath;
  }

  /**
   * Convert WSL path to Windows path
   * @private
   */
  _toWindowsPath(wslPath) {
    if (typeof wslPath !== 'string') {
      return wslPath;
    }

    const match = wslPath.match(/^\/mnt\/([a-z])\/(.+)$/);
    if (match) {
      const drive = match[1].toUpperCase();
      const filePath = match[2].replace(/\//g, '\\');
      return `${drive}:\\${filePath}`;
    }

    return wslPath;
  }

  /**
   * Build FFmpeg command based on mode
   * @private
   */
  _buildCommandArgs(args) {
    if (this.isWSL) {
      // WSL mode: prepend wsl and convert paths
      // Return as array to avoid shell escaping issues
      const wslArgs = args.map(arg => {
        // Only convert input/output file paths (not flags)
        if (arg.startsWith('-') || arg.startsWith('=')) {
          return arg;
        }
        // Check if it looks like a file path
        if (arg.includes(':') || arg.includes('/') || arg.includes('\\')) {
          return this._toWSLPath(arg);
        }
        return arg;
      });
      return ['wsl', 'ffmpeg', ...wslArgs];
    }
    // Native mode - return as array
    return ['ffmpeg', ...args];
  }

  /**
   * Build FFmpeg command as string (for logging only)
   * @private
   */
  _buildCommandString(args) {
    return this._buildCommandArgs(args).join(' ');
  }

  /**
   * Build FFprobe command based on mode
   * @private
   */
  _buildFfprobeCommand(args) {
    if (this.isWSL) {
      const wslArgs = args.map(arg => {
        if (arg.startsWith('-') || arg.startsWith('=')) {
          return arg;
        }
        if (arg.includes(':') || arg.includes('/') || arg.includes('\\')) {
          return this._toWSLPath(arg);
        }
        return arg;
      });
      return ['wsl', 'ffprobe', ...wslArgs].join(' ');
    }
    return ['ffprobe', ...args].join(' ');
  }

  /**
   * Execute FFmpeg command
   * @param {Array<string>|string} args - FFmpeg arguments or full command string
   * @param {Object} options - Execution options
   * @returns {Promise<{stdout: string, stderr: string}>}
   */
  async execute(args, options = {}) {
    try {
      let commandArgs;
      let commandString;

      if (typeof args === 'string') {
        // If string input, convert to args array for WSL mode
        commandArgs = this.isWSL ? ['wsl', ...args.split(' ')] : args.split(' ');
        commandString = commandArgs.join(' ');
      } else {
        // Array input - build proper args array
        commandArgs = this._buildCommandArgs(args);
        commandString = this._buildCommandString(args);
      }

      logger.debug('Executing FFmpeg', { command: commandString });

      // Use spawn for better argument handling (avoids shell parsing issues)
      if (this.isWSL) {
        const result = await this._executeSpawn(commandArgs, options);
        return result;
      } else {
        // Native mode - use spawn as well for consistency
        const result = await this._executeSpawn(commandArgs, options);
        return result;
      }
    } catch (error) {
      logger.error('FFmpeg execution failed', {
        error: error.message,
        stderr: error.stderr || error.message
      });
      throw new Error(`FFmpeg failed: ${error.message}`);
    }
  }

  /**
   * Execute command using spawn (better for complex arguments)
   * @private
   */
  async _executeSpawn(args, options = {}) {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      // For WSL, use spawn directly: wsl.exe --exec ffmpeg [args...]
      // The --exec flag runs the command directly without shell interpretation
      if (args[0] === 'wsl' || args[0] === 'wsl.exe') {
        // args[0]='wsl', args[1]='ffmpeg', rest are ffmpeg args
        // Use --exec to avoid bash -c interpretation
        const wslArgs = ['--exec', ...args.slice(1)];
        const proc = spawn('wsl.exe', wslArgs, {
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: options.timeout || 300000, // 5 minutes for video encoding
          windowsHide: true
        });

        proc.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        proc.stderr.on('data', (data) => {
          const chunk = data.toString();
          stderr += chunk;
          // Log FFmpeg progress in real-time (helps debug long-running operations)
          if (chunk.includes('frame=') || chunk.includes('time=')) {
            logger.debug('FFmpeg progress', { output: chunk.trim().substring(0, 100) });
          }
        });

        proc.on('error', (err) => {
          reject(new Error(`FFmpeg spawn failed: ${err.message}`));
        });

        proc.on('timeout', () => {
          timedOut = true;
          proc.kill();
          reject(new Error(`FFmpeg timeout after ${(options.timeout || 300000)/1000}s`));
        });

        proc.on('close', (code) => {
          if (timedOut) return; // Already rejected
          if (code === 0) {
            // Log FFmpeg completion stats from stderr
            const match = stderr.match(/frame=\s*(\d+).*time=\s*(\S+)/);
            if (match) {
              logger.info('FFmpeg completed', { frames: match[1], duration: match[2] });
            }
            resolve({ stdout, stderr });
          } else if (code === null) {
            reject(new Error(`FFmpeg terminated unexpectedly (killed): ${stderr.substring(stderr.length - 500)}`));
          } else {
            reject(new Error(`FFmpeg exited with code ${code}: ${stderr.substring(stderr.length - 500)}`));
          }
        });
        return;
      }

      // Native mode
      const proc = spawn(args[0], args.slice(1), {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: options.timeout || 300000 // 5 minutes for video encoding
      });

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        // Log FFmpeg progress in real-time (helps debug long-running operations)
        if (chunk.includes('frame=') || chunk.includes('time=')) {
          logger.debug('FFmpeg progress', { output: chunk.trim().substring(0, 100) });
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`FFmpeg spawn failed: ${err.message}`));
      });

      proc.on('timeout', () => {
        timedOut = true;
        proc.kill();
        reject(new Error(`FFmpeg timeout after ${(options.timeout || 300000)/1000}s`));
      });

      proc.on('close', (code) => {
        if (timedOut) return; // Already rejected
        if (code === 0) {
          // Log FFmpeg completion stats from stderr
          const match = stderr.match(/frame=\s*(\d+).*time=\s*(\S+)/);
          if (match) {
            logger.info('FFmpeg completed', { frames: match[1], duration: match[2] });
          }
          resolve({ stdout, stderr });
        } else if (code === null) {
          reject(new Error(`FFmpeg terminated unexpectedly (killed): ${stderr.substring(stderr.length - 500)}`));
        } else {
          reject(new Error(`FFmpeg exited with code ${code}: ${stderr.substring(stderr.length - 500)}`));
        }
      });
    });
  }

  /**
   * Execute via script file in WSL (avoids all escaping issues)
   * @private
   */
  async _executeViaScript(args, options = {}) {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      // Build the script command (skip 'wsl' prefix)
      const wslArgs = args[0] === 'wsl' || args[0] === 'wsl.exe'
        ? args.slice(1)
        : args;

      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substr(2, 9);
      const scriptPath = `/tmp/ffmpeg_${timestamp}_${randomStr}.sh`;

      // Build bash script - simple ffmpeg execution
      // Properly escape each argument for the shell script
      const escapedArgs = wslArgs.map(arg => {
        // Wrap in single quotes and escape any embedded single quotes
        return "'" + arg.replace(/'/g, "'\\''") + "'";
      }).join(' ');

      const scriptContent = `#!/bin/bash
set -e
ffmpeg ${escapedArgs}
`;

      logger.debug('Creating WSL script', { scriptPath, args: wslArgs.slice(0, 3).join(' ') + '...' });

      try {
        // Write script to WSL /tmp using echo with heredoc
        const heredocCmd = `cat > ${scriptPath} << 'EOFSCRIPT'
${scriptContent}
EOFSCRIPT`;

        execSync(`wsl.exe -e bash -c "${heredocCmd}"`, {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 10000,
          windowsHide: true
        });

        // Execute the script
        const result = execSync(`wsl.exe -e bash ${scriptPath}`, {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: options.timeout || 300000, // 5 minutes for video encoding
          windowsHide: true
        });

        stdout = result.stdout || '';
        stderr = result.stderr || '';

        // Clean up the script
        execSync(`wsl.exe -e rm -f ${scriptPath}`, { timeout: 5000 });

        resolve({ stdout, stderr });
      } catch (error) {
        // Try to clean up on error
        try {
          execSync(`wsl.exe -e rm -f ${scriptPath}`, { timeout: 5000 });
        } catch {}
        reject(error);
      }
    });
  }

  /**
   * Execute FFprobe command
   * @param {Array<string>|string} args - FFprobe arguments or full command string
   * @param {Object} options - Execution options
   * @returns {Promise<{stdout: string, stderr: string}>}
   */
  async executeFfprobe(args, options = {}) {
    try {
      const command = typeof args === 'string'
        ? (this.isWSL ? `wsl ${args}` : args)
        : this._buildFfprobeCommand(args);

      logger.debug('Executing FFprobe', { command });

      const { stdout, stderr } = await execAsync(command, {
        timeout: options.timeout || 30000,
        maxBuffer: options.maxBuffer || 10 * 1024 * 1024
      });

      return { stdout, stderr };
    } catch (error) {
      logger.error('FFprobe execution failed', {
        error: error.message,
        stderr: error.stderr
      });
      throw new Error(`FFprobe failed: ${error.message}`);
    }
  }

  /**
   * Get video duration using FFprobe
   * @param {string} videoPath - Path to video file
   * @returns {Promise<number>} Duration in seconds
   */
  async getVideoDuration(videoPath) {
    const { stdout } = await this.executeFfprobe([
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      this._convertPathForPlatform(videoPath)
    ]);

    const metadata = JSON.parse(stdout);
    return parseFloat(metadata.format.duration);
  }

  /**
   * Get audio duration using FFprobe
   * @param {string} audioPath - Path to audio file
   * @returns {Promise<number>} Duration in seconds
   */
  async getAudioDuration(audioPath) {
    const { stdout } = await this.executeFfprobe([
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      this._convertPathForPlatform(audioPath)
    ]);

    const metadata = JSON.parse(stdout);
    return parseFloat(metadata.format.duration);
  }

  /**
   * Get video dimensions using FFprobe
   * @param {string} videoPath - Path to video file
   * @returns {Promise<{width: number, height: number}>}
   */
  async getVideoDimensions(videoPath) {
    const { stdout } = await this.executeFfprobe([
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_streams',
      this._convertPathForPlatform(videoPath)
    ]);

    const metadata = JSON.parse(stdout);
    const videoStream = metadata.streams.find(s => s.codec_type === 'video');

    return {
      width: parseInt(videoStream.width),
      height: parseInt(videoStream.height)
    };
  }

  /**
   * Convert path for current platform
   * @private
   */
  _convertPathForPlatform(filePath) {
    if (this.isWSL) {
      return this._toWSLPath(filePath);
    }
    return filePath;
  }

  /**
   * Health check - verify FFmpeg is available
   * @returns {Promise<{healthy: boolean, version: string, mode: string, wslAvailable: boolean, nativeAvailable: boolean}>}
   */
  async healthCheck() {
    // Check WSL availability
    const wslAvailable = await this._checkWSLAvailable();
    const nativeAvailable = await this._checkNativeAvailable();

    // If WSL mode but WSL not available, try to warn
    if (this.isWSL && !wslAvailable && !nativeAvailable) {
      logger.warn('WSL mode configured but WSL is not available', {
        mode: this.mode,
        wslAvailable,
        nativeAvailable
      });
      return {
        healthy: false,
        error: 'WSL is not available. Either install WSL or set FFMPEG_MODE=native in .env',
        mode: this.mode,
        wslAvailable,
        nativeAvailable,
        suggestion: 'Install WSL2 or set FFMPEG_MODE=native if FFmpeg is installed natively on Windows'
      };
    }

    // If native mode but FFmpeg not available
    if (!this.isWSL && !nativeAvailable) {
      return {
        healthy: false,
        error: 'FFmpeg is not installed natively on Windows',
        mode: this.mode,
        wslAvailable,
        nativeAvailable,
        suggestion: 'Install FFmpeg or set FFMPEG_MODE=wsl if WSL is available'
      };
    }

    // Try to get FFmpeg version
    try {
      const { stdout } = await this.execute(['-version']);
      const versionMatch = stdout.match(/ffmpeg version ([\d.]+)/);

      return {
        healthy: true,
        version: versionMatch ? versionMatch[1] : 'unknown',
        mode: this.mode,
        wslAvailable,
        nativeAvailable
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        mode: this.mode,
        wslAvailable,
        nativeAvailable,
        suggestion: this.isWSL && !wslAvailable
          ? 'WSL is not available. Install WSL2 or set FFMPEG_MODE=native'
          : 'FFmpeg not found. Install FFmpeg on your system'
      };
    }
  }

  /**
   * Extract a thumbnail from a video
   *
   * @param {string} videoPath - Path to the video file
   * @param {string} thumbnailPath - Output path for the thumbnail
   * @param {Object} options - Thumbnail options
   * @param {number} options.timestamp - Time position to extract (default: 1 second)
   * @param {number} options.width - Thumbnail width (default: 320)
   * @param {number} options.height - Thumbnail height (default: calculated to maintain aspect ratio)
   * @returns {Promise<string>} Path to the generated thumbnail
   */
  async extractThumbnail(videoPath, thumbnailPath, options = {}) {
    const {
      timestamp = 1, // Extract frame at 1 second (avoid black frames at start)
      width = 320,
      height = -1 // -1 means maintain aspect ratio
    } = options;

    const args = [
      '-i', videoPath,
      '-ss', String(timestamp),
      '-vframes', '1',
      '-vf', `scale=${width}:${height}`,
      '-y', // Overwrite output file
      thumbnailPath
    ];

    await this.execute(args);
    logger.info('Thumbnail extracted', {
      videoPath,
      thumbnailPath,
      timestamp
    });

    return thumbnailPath;
  }
}

// Singleton instance
const ffmpegWrapper = new FfmpegWrapper();

export default ffmpegWrapper;
