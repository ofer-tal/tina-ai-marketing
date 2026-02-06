import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('storage', 'storage-service');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Storage Service for managing local filesystem storage
 * Handles saving, retrieving, and deleting generated content
 */
class StorageService {
  constructor() {
    // Base storage directory - go up two levels from backend/services/ to project root, then storage/
    // __dirname = backend/services/, so ../../storage = project root storage/
    this.baseDir = path.join(__dirname, '../../storage');

    // Storage subdirectories
    this.directories = {
      images: path.join(this.baseDir, 'images'),
      videos: path.join(this.baseDir, 'videos'),
      audio: path.join(this.baseDir, 'audio'),
      temp: path.join(this.baseDir, 'temp'),
      thumbnails: path.join(this.baseDir, 'thumbnails'),
      avatars: path.join(this.baseDir, 'images', 'avatars'),
      tier2Videos: path.join(this.baseDir, 'videos', 'tier2', 'final'),
    };

    // File size limits (in bytes)
    this.limits = {
      image: 10 * 1024 * 1024, // 10MB
      video: 500 * 1024 * 1024, // 500MB
      audio: 50 * 1024 * 1024, // 50MB
    };
  }

  /**
   * Initialize storage directories
   * Ensures all required directories exist
   */
  async initialize() {
    try {
      for (const [name, dirPath] of Object.entries(this.directories)) {
        await fs.mkdir(dirPath, { recursive: true });
      }

      logger.info('Storage directories initialized', {
        directories: Object.keys(this.directories),
        baseDir: this.baseDir,
      });

      return { success: true, directories: this.directories };
    } catch (error) {
      logger.error('Failed to initialize storage directories', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate unique filename
   * @param {string} originalName - Original filename
   * @param {string} prefix - Optional prefix for the filename
   * @returns {string} Unique filename
   */
  generateFilename(originalName, prefix = '') {
    const ext = path.extname(originalName);
    const basename = path.basename(originalName, ext);
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    const safeBasename = basename.replace(/[^a-zA-Z0-9]/g, '-');

    const parts = [prefix, safeBasename, timestamp, random].filter(Boolean);
    return `${parts.join('-')}${ext}`;
  }

  /**
   * Get file type from extension
   * @param {string} filename - Filename to check
   * @returns {string} File type: 'image', 'video', 'audio', or 'temp'
   */
  getFileType(filename) {
    const ext = path.extname(filename).toLowerCase();

    const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
    const videoExts = ['.mp4', '.mov', '.avi', '.webm', '.mkv'];
    const audioExts = ['.mp3', '.m4a', '.wav', '.ogg', '.aac'];

    if (imageExts.includes(ext)) return 'image';
    if (videoExts.includes(ext)) return 'video';
    if (audioExts.includes(ext)) return 'audio';

    return 'temp';
  }

  /**
   * Get storage directory for file type
   * @param {string} fileType - Type of file ('image', 'video', 'audio', 'temp')
   * @returns {string} Full path to storage directory
   */
  getDirectory(fileType) {
    const dir = this.directories[fileType] || this.directories.temp;
    return dir;
  }

  /**
   * Save file to storage
   * @param {Buffer|string} content - File content
   * @param {string} filename - Filename to save
   * @param {string} fileType - Type of file ('image', 'video', 'audio', 'temp')
   * @returns {Promise<Object>} File info object
   */
  async saveFile(content, filename, fileType = null) {
    try {
      // Determine file type if not provided
      const type = fileType || this.getFileType(filename);

      // Get target directory
      const targetDir = this.getDirectory(type);

      // Generate unique filename if not unique
      const finalFilename = filename;
      const filePath = path.join(targetDir, finalFilename);

      // Check file size
      const size = Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content);
      const maxSize = this.limits[type] || this.limits.image;

      if (size > maxSize) {
        throw new Error(
          `File size (${size} bytes) exceeds maximum (${maxSize} bytes) for ${type}`
        );
      }

      // Write file
      await fs.writeFile(filePath, content, 'binary');

      // Get file stats
      const stats = await fs.stat(filePath);

      logger.info('File saved to storage', {
        filename: finalFilename,
        type,
        path: filePath,
        size: stats.size,
      });

      return {
        success: true,
        filename: finalFilename,
        path: filePath,
        relativePath: path.relative(this.baseDir, filePath),
        type,
        size: stats.size,
        created: stats.birthtime,
      };
    } catch (error) {
      logger.error('Failed to save file to storage', {
        filename,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Save file from buffer with auto-generated filename
   * @param {Buffer} buffer - File content buffer
   * @param {string} extension - File extension (e.g., '.png')
   * @param {string} type - File type ('image', 'video', 'audio', 'temp')
   * @param {string} prefix - Optional filename prefix
   * @returns {Promise<Object>} File info object
   */
  async saveBuffer(buffer, extension, type, prefix = '') {
    const filename = this.generateFilename(`file${extension}`, prefix);
    return this.saveFile(buffer, filename, type);
  }

  /**
   * Read file from storage
   * @param {string} relativePath - Relative path from storage base
   * @returns {Promise<Buffer>} File content
   */
  async readFile(relativePath) {
    try {
      const fullPath = path.join(this.baseDir, relativePath);
      const content = await fs.readFile(fullPath);

      logger.debug('File read from storage', {
        path: relativePath,
        size: content.length,
      });

      return content;
    } catch (error) {
      logger.error('Failed to read file from storage', {
        path: relativePath,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Delete file from storage
   * @param {string} relativePath - Relative path from storage base
   * @returns {Promise<Object>} Deletion result
   */
  async deleteFile(relativePath) {
    try {
      const fullPath = path.join(this.baseDir, relativePath);

      // Check if file exists
      try {
        await fs.access(fullPath);
      } catch {
        logger.warn('File not found for deletion', { path: relativePath });
        return { success: true, deleted: false, message: 'File not found' };
      }

      // Delete file
      await fs.unlink(fullPath);

      logger.info('File deleted from storage', {
        path: relativePath,
        fullPath,
      });

      return {
        success: true,
        deleted: true,
        path: relativePath,
      };
    } catch (error) {
      logger.error('Failed to delete file from storage', {
        path: relativePath,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Move file from temp to permanent storage
   * @param {string} tempPath - Relative path in temp directory
   * @param {string} targetType - Target file type ('image', 'video', 'audio')
   * @returns {Promise<Object>} New file info
   */
  async moveFromTemp(tempPath, targetType) {
    try {
      const sourcePath = path.join(this.directories.temp, tempPath);
      const targetDir = this.getDirectory(targetType);
      const filename = path.basename(tempPath);
      const targetPath = path.join(targetDir, filename);

      // Move file
      await fs.rename(sourcePath, targetPath);

      logger.info('File moved from temp', {
        from: tempPath,
        to: path.relative(this.baseDir, targetPath),
      });

      return {
        success: true,
        filename,
        path: targetPath,
        relativePath: path.relative(this.baseDir, targetPath),
        type: targetType,
      };
    } catch (error) {
      logger.error('Failed to move file from temp', {
        tempPath,
        targetType,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * List files in a directory
   * @param {string} type - Directory type ('image', 'video', 'audio', 'temp')
   * @returns {Promise<Array>} List of file info objects
   */
  async listFiles(type) {
    try {
      const dir = this.getDirectory(type);
      const entries = await fs.readdir(dir, { withFileTypes: true });

      const files = [];
      for (const entry of entries) {
        if (entry.isFile()) {
          const filePath = path.join(dir, entry.name);
          const stats = await fs.stat(filePath);

          files.push({
            name: entry.name,
            path: path.relative(this.baseDir, filePath),
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
          });
        }
      }

      return files.sort((a, b) => b.created - a.created);
    } catch (error) {
      logger.error('Failed to list files', {
        type,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>} Storage stats
   */
  async getStats() {
    try {
      const stats = {};

      for (const [type, dir] of Object.entries(this.directories)) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const files = entries.filter((e) => e.isFile());

        let totalSize = 0;
        for (const file of files) {
          const filePath = path.join(dir, file.name);
          const fileStats = await fs.stat(filePath);
          totalSize += fileStats.size;
        }

        stats[type] = {
          count: files.length,
          totalSize,
          totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        };
      }

      return stats;
    } catch (error) {
      logger.error('Failed to get storage stats', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Clean up orphaned files
   * Compares files in storage with database records and deletes orphans
   * @param {Array} validPaths - Array of valid file paths from database
   * @returns {Promise<Object>} Cleanup results
   */
  async cleanupOrphans(validPaths) {
    try {
      const validSet = new Set(validPaths);
      const deleted = [];

      for (const [type, dir] of Object.entries(this.directories)) {
        if (type === 'temp') continue; // Skip temp directory

        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isFile()) {
            const relativePath = path.relative(this.baseDir, path.join(dir, entry.name));

            // Check if file exists in database
            if (!validSet.has(relativePath)) {
              await fs.unlink(path.join(dir, entry.name));
              deleted.push({
                path: relativePath,
                type,
              });

              logger.info('Deleted orphaned file', {
                path: relativePath,
                type,
              });
            }
          }
        }
      }

      logger.info('Orphan cleanup completed', {
        totalDeleted: deleted.length,
      });

      return {
        success: true,
        deleted,
        count: deleted.length,
      };
    } catch (error) {
      logger.error('Failed to cleanup orphans', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Clear temp directory
   * @returns {Promise<Object>} Clear results
   */
  async clearTemp() {
    try {
      const entries = await fs.readdir(this.directories.temp, { withFileTypes: true });
      const deleted = [];

      for (const entry of entries) {
        if (entry.isFile()) {
          const filePath = path.join(this.directories.temp, entry.name);
          await fs.unlink(filePath);
          deleted.push(entry.name);
        }
      }

      logger.info('Temp directory cleared', {
        count: deleted.length,
      });

      return {
        success: true,
        deleted,
        count: deleted.length,
      };
    } catch (error) {
      logger.error('Failed to clear temp directory', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get storage service status
   * @returns {Promise<Object>} Service status
   */
  async getStatus() {
    try {
      const stats = await this.getStats();

      // Check if directories are accessible
      const directoriesAccessible = {};
      for (const [name, dir] of Object.entries(this.directories)) {
        try {
          await fs.access(dir);
          directoriesAccessible[name] = true;
        } catch {
          directoriesAccessible[name] = false;
        }
      }

      return {
        initialized: true,
        baseDir: this.baseDir,
        directories: Object.keys(this.directories),
        directoriesAccessible,
        stats,
      };
    } catch (error) {
      return {
        initialized: false,
        error: error.message,
      };
    }
  }
}

// Export singleton instance
const storageService = new StorageService();

export default storageService;
