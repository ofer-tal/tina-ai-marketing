/**
 * Validation Middleware
 *
 * Provides comprehensive input validation for API endpoints
 * without external dependencies.
 */

import winston from 'winston';

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'validation-middleware' },
  transports: [
    new winston.transports.File({ filename: 'logs/validation-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/validation.log' }),
  ],
});

/**
 * Sanitize string input
 */
export function sanitizeString(input, options = {}) {
  if (typeof input !== 'string') {
    return input;
  }

  let sanitized = input.trim();

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Control characters (except newlines and tabs)
  if (options.removeControlChars !== false) {
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  // Normalize whitespace
  if (options.normalizeWhitespace) {
    sanitized = sanitized.replace(/\s+/g, ' ');
  }

  // Trim to max length
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  return sanitized;
}

/**
 * Sanitize number input
 */
export function sanitizeNumber(input, options = {}) {
  if (typeof input === 'number') {
    if (options.min !== undefined && input < options.min) {
      return options.min;
    }
    if (options.max !== undefined && input > options.max) {
      return options.max;
    }
    return input;
  }

  if (typeof input === 'string') {
    const parsed = parseFloat(input);
    if (isNaN(parsed)) {
      return options.default || 0;
    }
    return sanitizeNumber(parsed, options);
  }

  return options.default || 0;
}

/**
 * Sanitize array input
 */
export function sanitizeArray(input, options = {}) {
  if (!Array.isArray(input)) {
    if (input === undefined || input === null) {
      return [];
    }
    return [input];
  }

  let sanitized = input;

  // Trim to max items
  if (options.maxItems && sanitized.length > options.maxItems) {
    sanitized = sanitized.slice(0, options.maxItems);
  }

  // Sanitize each item
  if (options.itemSanitizer) {
    sanitized = sanitized.map(options.itemSanitizer);
  }

  // Remove duplicates
  if (options.unique) {
    sanitized = [...new Set(sanitized)];
  }

  return sanitized;
}

/**
 * Sanitize object input
 */
export function sanitizeObject(input, options = {}) {
  if (typeof input !== 'object' || input === null) {
    return {};
  }

  let sanitized = { ...input };

  // Remove unknown keys
  if (options.allowedKeys) {
    Object.keys(sanitized).forEach(key => {
      if (!options.allowedKeys.includes(key)) {
        delete sanitized[key];
      }
    });
  }

  // Sanitize string values
  if (options.sanitizeStrings !== false) {
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string') {
        sanitized[key] = sanitizeString(sanitized[key]);
      }
    });
  }

  return sanitized;
}

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(errors) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.errors = errors;
    this.statusCode = 400;
  }
}

/**
 * Schema validator builder
 */
export function createSchema(schema) {
  return (data) => {
    const errors = [];

    Object.keys(schema).forEach(field => {
      const rules = schema[field];
      const value = data[field];

      // Required check
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field,
          message: rules.errorMessage || `${field} is required`,
          code: 'REQUIRED'
        });
        return;
      }

      // Skip further validation if field is optional and not provided
      if (!rules.required && (value === undefined || value === null)) {
        return;
      }

      // Type validation
      if (rules.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== rules.type) {
          errors.push({
            field,
            message: rules.errorMessage || `${field} must be a ${rules.type}`,
            code: 'INVALID_TYPE'
          });
          return;
        }
      }

      // String validations
      if (rules.type === 'string' && typeof value === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
          errors.push({
            field,
            message: rules.errorMessage || `${field} must be at least ${rules.minLength} characters`,
            code: 'TOO_SHORT'
          });
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push({
            field,
            message: rules.errorMessage || `${field} must be at most ${rules.maxLength} characters`,
            code: 'TOO_LONG'
          });
        }
        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push({
            field,
            message: rules.errorMessage || `${field} format is invalid`,
            code: 'INVALID_FORMAT'
          });
        }
        if (rules.enum && !rules.enum.includes(value)) {
          errors.push({
            field,
            message: rules.errorMessage || `${field} must be one of: ${rules.enum.join(', ')}`,
            code: 'INVALID_VALUE'
          });
        }
      }

      // Number validations
      if (rules.type === 'number' && typeof value === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push({
            field,
            message: rules.errorMessage || `${field} must be at least ${rules.min}`,
            code: 'TOO_SMALL'
          });
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push({
            field,
            message: rules.errorMessage || `${field} must be at most ${rules.max}`,
            code: 'TOO_LARGE'
          });
        }
      }

      // Array validations
      if (rules.type === 'array' && Array.isArray(value)) {
        if (rules.minItems && value.length < rules.minItems) {
          errors.push({
            field,
            message: rules.errorMessage || `${field} must have at least ${rules.minItems} items`,
            code: 'TOO_FEW_ITEMS'
          });
        }
        if (rules.maxItems && value.length > rules.maxItems) {
          errors.push({
            field,
            message: rules.errorMessage || `${field} must have at most ${rules.maxItems} items`,
            code: 'TOO_MANY_ITEMS'
          });
        }
      }

      // Custom validator
      if (rules.custom && typeof rules.custom === 'function') {
        const customError = rules.custom(value, data);
        if (customError) {
          errors.push({
            field,
            message: customError,
            code: 'CUSTOM_VALIDATION'
          });
        }
      }
    });

    return errors.length > 0 ? errors : null;
  };
}

/**
 * Validation middleware factory
 */
export function validate(schema, options = {}) {
  const validator = createSchema(schema);

  return async (req, res, next) => {
    try {
      const dataToValidate = options.body ? req.body :
                            options.params ? req.params :
                            options.query ? req.query :
                            req.body;

      const errors = validator(dataToValidate);

      if (errors) {
        logger.warn('Validation failed', {
          method: req.method,
          path: req.path,
          errors,
          body: options.sanitize ? sanitizeObject(req.body) : req.body
        });

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          validationErrors: errors
        });
      }

      // Sanitize data if requested
      if (options.sanitize && req.body) {
        req.body = sanitizeObject(req.body, {
          allowedKeys: Object.keys(schema),
          sanitizeStrings: true
        });

        // Apply specific sanitizers
        Object.keys(req.body).forEach(key => {
          const rules = schema[key];
          if (rules.type === 'string' && typeof req.body[key] === 'string') {
            req.body[key] = sanitizeString(req.body[key], {
              maxLength: rules.maxLength,
              removeControlChars: true,
              normalizeWhitespace: rules.normalizeWhitespace
            });
          }
          if (rules.type === 'number') {
            req.body[key] = sanitizeNumber(req.body[key], {
              min: rules.min,
              max: rules.max,
              default: rules.default
            });
          }
          if (rules.type === 'array') {
            req.body[key] = sanitizeArray(req.body[key], {
              maxItems: rules.maxItems,
              unique: rules.unique
            });
          }
        });
      }

      next();
    } catch (error) {
      logger.error('Validation middleware error', {
        error: error.message,
        stack: error.stack,
        path: req.path
      });

      res.status(500).json({
        success: false,
        error: 'Validation error occurred'
      });
    }
  };
}

/**
 * Common validation schemas
 */
export const schemas = {
  // ID parameter validation
  id: {
    id: {
      type: 'string',
      required: true,
      pattern: /^[0-9a-fA-F]{24}$/,
      errorMessage: 'Invalid ID format'
    }
  },

  // Todo validation
  todo: {
    title: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 200,
      errorMessage: 'Title must be between 1 and 200 characters'
    },
    description: {
      type: 'string',
      required: false,
      maxLength: 2000
    },
    category: {
      type: 'string',
      required: false,
      enum: ['posting', 'configuration', 'review', 'development', 'analysis']
    },
    priority: {
      type: 'string',
      required: false,
      enum: ['low', 'medium', 'high', 'urgent']
    },
    status: {
      type: 'string',
      required: false,
      enum: ['pending', 'in_progress', 'completed', 'cancelled', 'snoozed']
    },
    scheduledAt: {
      type: 'string',
      required: false
    },
    dueAt: {
      type: 'string',
      required: false
    },
    estimatedTime: {
      type: 'number',
      required: false,
      min: 0,
      max: 480
    }
  },

  // Content post validation
  post: {
    title: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 200
    },
    description: {
      type: 'string',
      required: false,
      maxLength: 1000
    },
    platform: {
      type: 'string',
      required: true,
      enum: ['tiktok', 'instagram', 'youtube_shorts']
    },
    contentType: {
      type: 'string',
      required: false,
      enum: ['video', 'image', 'carousel']
    },
    caption: {
      type: 'string',
      required: false,
      maxLength: 2200
    },
    hashtags: {
      type: 'array',
      required: false,
      maxItems: 30
    },
    scheduledAt: {
      type: 'string',
      required: false
    }
  },

  // Settings validation
  settingUpdate: {
    key: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 100
    },
    value: {
      required: true
    }
  },

  // Campaign validation
  campaign: {
    campaignName: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 200
    },
    budget: {
      type: 'number',
      required: true,
      min: 1,
      max: 100000
    },
    budgetType: {
      type: 'string',
      required: true,
      enum: ['daily', 'total']
    },
    status: {
      type: 'string',
      required: false,
      enum: ['active', 'paused', 'completed', 'draft']
    }
  },

  // Keyword validation
  keyword: {
    keyword: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 100
    },
    competition: {
      type: 'string',
      required: false,
      enum: ['low', 'medium', 'high']
    },
    target: {
      type: 'boolean',
      required: false
    }
  },

  // Chat message validation
  chatMessage: {
    message: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 5000
    }
  },

  // Content approval validation
  contentApproval: {
    action: {
      type: 'string',
      required: true,
      enum: ['approve', 'reject']
    },
    reason: {
      type: 'string',
      required: false,
      maxLength: 500
    },
    feedback: {
      type: 'string',
      required: false,
      maxLength: 2000
    }
  }
};

export default {
  validate,
  sanitizeString,
  sanitizeNumber,
  sanitizeArray,
  sanitizeObject,
  createSchema,
  ValidationError,
  schemas
};
