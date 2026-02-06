import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import AIAvatar from '../models/AIAvatar.js';
import storageService from '../services/storage.js';
import ffmpegWrapper from '../utils/ffmpegWrapper.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('api', 'ai-avatars');
const router = express.Router();

// Configure multer for avatar image uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max for avatar images
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
});

/**
 * GET /api/ai-avatars
 * Get all AI avatars with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    const { gender, style, active } = req.query;

    logger.info('Fetching AI avatars', { gender, style, active });

    const query = {};

    if (gender) {
      query.gender = gender;
    }
    if (style) {
      query.style = style;
    }
    if (active !== undefined) {
      query.isActive = active === 'true';
    }

    const avatars = await AIAvatar.find(query).sort({ usageCount: -1, createdAt: -1 });

    res.json({
      success: true,
      data: {
        count: avatars.length,
        avatars: avatars.map(avatar => ({
          id: avatar._id,
          name: avatar.name,
          description: avatar.description,
          imagePath: avatar.imagePath,
          imageUrl: avatar.imagePath ? `/storage/${getRelativeStoragePath(avatar.imagePath)}` : null,
          heygenAvatarId: avatar.heygenAvatarId,
          heygenVoiceId: avatar.heygenVoiceId,
          gender: avatar.gender,
          style: avatar.style,
          isActive: avatar.isActive,
          usageCount: avatar.usageCount,
          lastUsedAt: avatar.lastUsedAt,
          createdAt: avatar.createdAt,
          updatedAt: avatar.updatedAt
        }))
      }
    });

  } catch (error) {
    logger.error('Get AI avatars API error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ai-avatars/active
 * Get only active AI avatars
 */
router.get('/active', async (req, res) => {
  try {
    const { gender, style } = req.query;

    logger.info('Fetching active AI avatars', { gender, style });

    const avatars = await AIAvatar.getFiltered({ gender, style });

    res.json({
      success: true,
      data: {
        count: avatars.length,
        avatars: avatars.map(avatar => ({
          id: avatar._id,
          name: avatar.name,
          description: avatar.description,
          imagePath: avatar.imagePath,
          imageUrl: avatar.imagePath ? `/storage/${getRelativeStoragePath(avatar.imagePath)}` : null,
          heygenAvatarId: avatar.heygenAvatarId,
          heygenVoiceId: avatar.heygenVoiceId,
          gender: avatar.gender,
          style: avatar.style,
          usageCount: avatar.usageCount
        }))
      }
    });

  } catch (error) {
    logger.error('Get active AI avatars API error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/ai-avatars/:id
 * Get a single AI avatar by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('Fetching AI avatar', { id });

    const avatar = await AIAvatar.findById(id);

    if (!avatar) {
      return res.status(404).json({
        success: false,
        error: 'AI avatar not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: avatar._id,
        name: avatar.name,
        description: avatar.description,
        imagePath: avatar.imagePath,
        imageUrl: avatar.imagePath ? `/storage/${getRelativeStoragePath(avatar.imagePath)}` : null,
        heygenAvatarId: avatar.heygenAvatarId,
        heygenVoiceId: avatar.heygenVoiceId,
        gender: avatar.gender,
        style: avatar.style,
        isActive: avatar.isActive,
        usageCount: avatar.usageCount,
        lastUsedAt: avatar.lastUsedAt,
        createdAt: avatar.createdAt,
        updatedAt: avatar.updatedAt
      }
    });

  } catch (error) {
    logger.error('Get AI avatar API error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/ai-avatars
 * Create a new AI avatar
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, heygenAvatarId, heygenVoiceId, gender, style } = req.body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'name is required'
      });
    }

    // Validate gender
    const validGenders = ['male', 'female', 'neutral'];
    const selectedGender = gender || 'neutral';
    if (!validGenders.includes(selectedGender)) {
      return res.status(400).json({
        success: false,
        error: `gender must be one of: ${validGenders.join(', ')}`
      });
    }

    // Validate style
    const validStyles = ['professional', 'casual', 'playful', 'elegant', 'friendly', 'authoritative'];
    const selectedStyle = style || 'professional';
    if (!validStyles.includes(selectedStyle)) {
      return res.status(400).json({
        success: false,
        error: `style must be one of: ${validStyles.join(', ')}`
      });
    }

    logger.info('Creating AI avatar', { name, gender: selectedGender, style: selectedStyle });

    // Check if avatar with same name already exists
    const existingAvatar = await AIAvatar.findOne({ name: name.trim() });
    if (existingAvatar) {
      return res.status(400).json({
        success: false,
        error: 'An avatar with this name already exists'
      });
    }

    // Create new avatar
    const avatar = new AIAvatar({
      name: name.trim(),
      description: description?.trim() || '',
      heygenAvatarId: heygenAvatarId?.trim() || null,
      heygenVoiceId: heygenVoiceId?.trim() || null,
      gender: selectedGender,
      style: selectedStyle,
      isActive: true
    });

    await avatar.save();

    logger.info('AI avatar created', { id: avatar._id, name: avatar.name });

    res.status(201).json({
      success: true,
      data: {
        id: avatar._id,
        name: avatar.name,
        description: avatar.description,
        imagePath: avatar.imagePath,
        imageUrl: null,
        heygenAvatarId: avatar.heygenAvatarId,
        heygenVoiceId: avatar.heygenVoiceId,
        gender: avatar.gender,
        style: avatar.style,
        isActive: avatar.isActive,
        createdAt: avatar.createdAt
      }
    });

  } catch (error) {
    logger.error('Create AI avatar API error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/ai-avatars/:id
 * Update an AI avatar
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, heygenAvatarId, heygenVoiceId, gender, style, isActive } = req.body;

    logger.info('Updating AI avatar', { id, updates: req.body });

    const avatar = await AIAvatar.findById(id);

    if (!avatar) {
      return res.status(404).json({
        success: false,
        error: 'AI avatar not found'
      });
    }

    // Update fields
    if (name !== undefined) {
      // Check if new name conflicts with existing avatar
      const existingAvatar = await AIAvatar.findOne({ name: name.trim(), _id: { $ne: id } });
      if (existingAvatar) {
        return res.status(400).json({
          success: false,
          error: 'An avatar with this name already exists'
        });
      }
      avatar.name = name.trim();
    }

    if (description !== undefined) {
      avatar.description = description.trim();
    }

    if (heygenAvatarId !== undefined) {
      avatar.heygenAvatarId = heygenAvatarId?.trim() || null;
    }

    if (heygenVoiceId !== undefined) {
      avatar.heygenVoiceId = heygenVoiceId?.trim() || null;
    }

    if (gender !== undefined) {
      const validGenders = ['male', 'female', 'neutral'];
      if (!validGenders.includes(gender)) {
        return res.status(400).json({
          success: false,
          error: `gender must be one of: ${validGenders.join(', ')}`
        });
      }
      avatar.gender = gender;
    }

    if (style !== undefined) {
      const validStyles = ['professional', 'casual', 'playful', 'elegant', 'friendly', 'authoritative'];
      if (!validStyles.includes(style)) {
        return res.status(400).json({
          success: false,
          error: `style must be one of: ${validStyles.join(', ')}`
        });
      }
      avatar.style = style;
    }

    if (isActive !== undefined) {
      avatar.isActive = isActive;
    }

    await avatar.save();

    logger.info('AI avatar updated', { id: avatar._id, name: avatar.name });

    res.json({
      success: true,
      data: {
        id: avatar._id,
        name: avatar.name,
        description: avatar.description,
        imagePath: avatar.imagePath,
        imageUrl: avatar.imagePath ? `/storage/${getRelativeStoragePath(avatar.imagePath)}` : null,
        heygenAvatarId: avatar.heygenAvatarId,
        heygenVoiceId: avatar.heygenVoiceId,
        gender: avatar.gender,
        style: avatar.style,
        isActive: avatar.isActive,
        usageCount: avatar.usageCount,
        lastUsedAt: avatar.lastUsedAt,
        updatedAt: avatar.updatedAt
      }
    });

  } catch (error) {
    logger.error('Update AI avatar API error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/ai-avatars/:id
 * Delete an AI avatar
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('Deleting AI avatar', { id });

    const avatar = await AIAvatar.findById(id);

    if (!avatar) {
      return res.status(404).json({
        success: false,
        error: 'AI avatar not found'
      });
    }

    // Check if avatar is being used
    if (avatar.usageCount > 0) {
      logger.warn('Deleting AI avatar with usage', {
        id,
        name: avatar.name,
        usageCount: avatar.usageCount
      });
    }

    await AIAvatar.findByIdAndDelete(id);

    logger.info('AI avatar deleted', { id, name: avatar.name });

    res.json({
      success: true,
      message: 'AI avatar deleted successfully',
      data: { id }
    });

  } catch (error) {
    logger.error('Delete AI avatar API error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/ai-avatars/:id/image
 * Upload an image for an AI avatar
 */
router.post('/:id/image', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    logger.info('Uploading image for AI avatar', { id, filename: req.file.originalname });

    const avatar = await AIAvatar.findById(id);

    if (!avatar) {
      return res.status(404).json({
        success: false,
        error: 'AI avatar not found'
      });
    }

    // Ensure avatars directory exists
    const avatarsDir = storageService.directories.avatars;
    await fs.mkdir(avatarsDir, { recursive: true });

    // Generate filename
    const filename = `avatar-${avatar._id}-${Date.now()}.png`;

    // Save image directly to avatars directory
    const imagePath = path.join(avatarsDir, filename);
    await fs.writeFile(imagePath, req.file.buffer, 'binary');

    logger.info('Avatar image uploaded', {
      id: avatar._id,
      filename,
      imagePath
    });

    // Update avatar with image path
    avatar.imagePath = imagePath;
    await avatar.save();

    res.json({
      success: true,
      data: {
        id: avatar._id,
        name: avatar.name,
        imagePath: avatar.imagePath,
        imageUrl: `/storage/${getRelativeStoragePath(avatar.imagePath)}`
      }
    });

  } catch (error) {
    logger.error('Upload avatar image API error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/ai-avatars/:id/deactivate
 * Deactivate an AI avatar
 */
router.post('/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('Deactivating AI avatar', { id });

    const avatar = await AIAvatar.findById(id);

    if (!avatar) {
      return res.status(404).json({
        success: false,
        error: 'AI avatar not found'
      });
    }

    await avatar.deactivate();

    logger.info('AI avatar deactivated', { id, name: avatar.name });

    res.json({
      success: true,
      data: {
        id: avatar._id,
        isActive: avatar.isActive
      }
    });

  } catch (error) {
    logger.error('Deactivate AI avatar API error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/ai-avatars/:id/activate
 * Activate an AI avatar
 */
router.post('/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('Activating AI avatar', { id });

    const avatar = await AIAvatar.findById(id);

    if (!avatar) {
      return res.status(404).json({
        success: false,
        error: 'AI avatar not found'
      });
    }

    await avatar.activate();

    logger.info('AI avatar activated', { id, name: avatar.name });

    res.json({
      success: true,
      data: {
        id: avatar._id,
        isActive: avatar.isActive
      }
    });

  } catch (error) {
    logger.error('Activate AI avatar API error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Helper function to get relative storage path from absolute path
 * @param {string} absolutePath - Absolute file path
 * @returns {string} Relative path from storage directory
 */
function getRelativeStoragePath(absolutePath) {
  if (!absolutePath) return null;

  // Normalize path separators
  const normalizedPath = absolutePath.replace(/\\/g, '/');

  // Match the storage directory
  const storageMatch = normalizedPath.match(/\/?mnt\/[cC]\/Projects\/blush-marketing\/storage\/(.+)/) ||
                      normalizedPath.match(/[A-Z]:\/Projects\/blush-marketing\/storage\/(.+)/) ||
                      normalizedPath.match(/\/storage\/(.+)/);

  if (storageMatch) {
    return storageMatch[1];
  }

  return null;
}

export default router;
