/**
 * Error Message Service
 * Maps technical errors to user-friendly error messages with action suggestions
 */

class ErrorMessageService {
  constructor() {
    // Error message mappings organized by error type
    this.errorMappings = {
      // Database Errors
      'MongoNetworkError': {
        userMessage: 'Unable to connect to the database',
        action: 'Please check your internet connection',
        supportLink: null
      },
      'MongoTimeoutError': {
        userMessage: 'Database request timed out',
        action: 'Please try again. If the problem persists, contact support',
        supportLink: 'https://github.com/your-repo/issues'
      },
      'MongoServerError': {
        userMessage: 'Database error occurred',
        action: 'Please try again. If the problem persists, contact support',
        supportLink: 'https://github.com/your-repo/issues'
      },

      // Authentication/Authorization Errors
      'AuthenticationError': {
        userMessage: 'Authentication failed',
        action: 'Please check your API credentials in Settings',
        supportLink: null
      },
      'UnauthorizedError': {
        userMessage: 'You are not authorized to perform this action',
        action: 'Please check your permissions and try again',
        supportLink: null
      },

      // API Errors
      'ENOTFOUND': {
        userMessage: 'Unable to reach the external service',
        action: 'Please check your internet connection and try again',
        supportLink: null
      },
      'ETIMEDOUT': {
        userMessage: 'External service request timed out',
        action: 'The service may be slow. Please try again',
        supportLink: null
      },
      'ECONNREFUSED': {
        userMessage: 'Connection refused by external service',
        action: 'The service may be temporarily unavailable. Please try again later',
        supportLink: null
      },
      'ECONNRESET': {
        userMessage: 'Connection was reset',
        action: 'Please try again. If the problem persists, contact support',
        supportLink: 'https://github.com/your-repo/issues'
      },

      // Rate Limiting Errors
      'RateLimitError': {
        userMessage: 'Too many requests',
        action: 'Please wait a moment and try again',
        supportLink: null
      },
      '429': {
        userMessage: 'Request limit exceeded',
        action: 'Please wait a few minutes before trying again',
        supportLink: null
      },

      // Validation Errors
      'ValidationError': {
        userMessage: 'Invalid data provided',
        action: 'Please check your input and try again',
        supportLink: null
      },
      'CastError': {
        userMessage: 'Invalid data format',
        action: 'Please ensure all fields have the correct format',
        supportLink: null
      },

      // File/Storage Errors
      'ENOENT': {
        userMessage: 'File not found',
        action: 'The requested file does not exist or has been moved',
        supportLink: null
      },
      'EACCES': {
        userMessage: 'Permission denied',
        action: 'Please check file permissions and try again',
        supportLink: null
      },
      'ENOSPC': {
        userMessage: 'Insufficient disk space',
        action: 'Please free up disk space and try again',
        supportLink: null
      },

      // Content Generation Errors
      'ContentGenerationError': {
        userMessage: 'Failed to generate content',
        action: 'Please try again. If the problem persists, check your AI service credentials',
        supportLink: null
      },
      'VideoGenerationError': {
        userMessage: 'Failed to generate video',
        action: 'Please check your Fal.ai or RunPod credentials in Settings',
        supportLink: null
      },
      'ImageGenerationError': {
        userMessage: 'Failed to generate image',
        action: 'Please check your RunPod credentials in Settings',
        supportLink: null
      },
      'AudioExtractionError': {
        userMessage: 'Failed to extract audio',
        action: 'Please ensure the story has audio content available',
        supportLink: null
      },

      // Social Media Errors
      'TikTokPostError': {
        userMessage: 'Failed to post to TikTok',
        action: 'Please check your TikTok credentials and try re-authorizing',
        supportLink: null
      },
      'InstagramPostError': {
        userMessage: 'Failed to post to Instagram',
        action: 'Please check your Instagram credentials and try re-authorizing',
        supportLink: null
      },
      'YouTubePostError': {
        userMessage: 'Failed to post to YouTube',
        action: 'Please check your YouTube credentials and try re-authorizing',
        supportLink: null
      },

      // App Store Errors
      'AppStoreConnectError': {
        userMessage: 'Failed to connect to App Store Connect',
        action: 'Please check your App Store Connect credentials in Settings',
        supportLink: 'https://developer.apple.com/help/account/'
      },
      'AppleSearchAdsError': {
        userMessage: 'Failed to connect to Apple Search Ads',
        action: 'Please check your Apple Search Ads credentials in Settings',
        supportLink: 'https://searchads.t.apple.com/help'
      },

      // Budget Errors
      'BudgetExceededError': {
        userMessage: 'Budget limit exceeded',
        action: 'Please increase your budget limit or reduce spending',
        supportLink: null
      },
      'BudgetGuardError': {
        userMessage: 'Budget guard triggered',
        action: 'Campaigns have been paused to prevent overspending',
        supportLink: null
      },

      // AI Service Errors
      'GLMAPIError': {
        userMessage: 'AI service error occurred',
        action: 'Please check your GLM4.7 API credentials in Settings',
        supportLink: null
      },
      'FalAIError': {
        userMessage: 'Video generation service error',
        action: 'Please check your Fal.ai API credentials in Settings',
        supportLink: 'https://fal.ai/docs'
      },
      'RunPodError': {
        userMessage: 'Image generation service error',
        action: 'Please check your RunPod API credentials in Settings',
        supportLink: 'https://docs.runpod.io'
      },

      // Generic Errors
      'Error': {
        userMessage: 'An unexpected error occurred',
        action: 'Please try again. If the problem persists, contact support',
        supportLink: 'https://github.com/your-repo/issues'
      }
    };

    // HTTP status code mappings
    this.statusMessages = {
      400: {
        userMessage: 'Invalid request',
        action: 'Please check your input and try again',
        supportLink: null
      },
      401: {
        userMessage: 'Authentication required',
        action: 'Please log in and try again',
        supportLink: null
      },
      403: {
        userMessage: 'Access denied',
        action: 'You do not have permission to perform this action',
        supportLink: null
      },
      404: {
        userMessage: 'Resource not found',
        action: 'The requested resource does not exist',
        supportLink: null
      },
      409: {
        userMessage: 'Conflict detected',
        action: 'This action conflicts with existing data. Please refresh and try again',
        supportLink: null
      },
      422: {
        userMessage: 'Invalid data format',
        action: 'Please check your input and ensure all fields are correctly formatted',
        supportLink: null
      },
      429: {
        userMessage: 'Too many requests',
        action: 'Please wait a moment and try again',
        supportLink: null
      },
      500: {
        userMessage: 'Server error occurred',
        action: 'Please try again. If the problem persists, contact support',
        supportLink: 'https://github.com/your-repo/issues'
      },
      502: {
        userMessage: 'Service temporarily unavailable',
        action: 'Please try again in a few moments',
        supportLink: null
      },
      503: {
        userMessage: 'Service unavailable',
        action: 'The service is temporarily unavailable. Please try again later',
        supportLink: null
      },
      504: {
        userMessage: 'Request timeout',
        action: 'The request took too long to process. Please try again',
        supportLink: null
      }
    };
  }

  /**
   * Get user-friendly error message from error object
   * @param {Error} error - The error object
   * @param {number} statusCode - HTTP status code (optional)
   * @returns {Object} User-friendly error response
   */
  getErrorMessage(error, statusCode = null) {
    // Determine error type
    const errorType = this.getErrorType(error);
    const errorCode = error.code || error.name || 'Error';

    // Try to get message by error code
    let errorMapping = this.errorMappings[errorCode];

    // If no specific mapping, try by error type
    if (!errorMapping && errorType) {
      errorMapping = this.errorMappings[errorType];
    }

    // If still no mapping, try by status code
    if (!errorMapping && statusCode) {
      errorMapping = this.statusMessages[statusCode];
    }

    // Use generic error as fallback
    if (!errorMapping) {
      errorMapping = this.errorMappings['Error'];
    }

    // Build response
    const response = {
      success: false,
      error: errorMapping.userMessage,
      action: errorMapping.action,
      technicalDetails: this.isDebugEnabled() ? error.message : undefined,
      timestamp: new Date().toISOString()
    };

    // Add support link if available
    if (errorMapping.supportLink) {
      response.supportLink = errorMapping.supportLink;
    }

    // Add request ID for debugging
    if (this.isDebugEnabled()) {
      response.requestId = this.generateRequestId();
      response.stack = error.stack;
    }

    return response;
  }

  /**
   * Determine error type from error object
   * @param {Error} error - The error object
   * @returns {string} Error type
   */
  getErrorType(error) {
    // Check if error has a specific type property
    if (error.type) {
      return error.type;
    }

    // Check error name
    if (error.name) {
      return error.name;
    }

    // Check error code
    if (error.code) {
      return error.code;
    }

    // Check error message patterns
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('connect')) {
      return 'NetworkError';
    }
    if (message.includes('timeout')) {
      return 'TimeoutError';
    }
    if (message.includes('authentication') || message.includes('unauthorized')) {
      return 'AuthenticationError';
    }
    if (message.includes('validation')) {
      return 'ValidationError';
    }
    if (message.includes('rate limit') || message.includes('too many')) {
      return 'RateLimitError';
    }
    if (message.includes('not found')) {
      return 'NotFoundError';
    }
    if (message.includes('permission') || message.includes('forbidden')) {
      return 'AuthorizationError';
    }

    return 'Error';
  }

  /**
   * Check if debug mode is enabled
   * @returns {boolean}
   */
  isDebugEnabled() {
    return process.env.NODE_ENV === 'development' || process.env.DEBUG_ERRORS === 'true';
  }

  /**
   * Generate a unique request ID
   * @returns {string}
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Express error handler middleware
   * @param {Error} err - Error object
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   * @param {Function} next - Express next function
   */
  errorHandlerMiddleware(err, req, res, next) {
    // Log the error for debugging
    console.error('Error occurred:', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    // Determine status code
    const statusCode = err.statusCode || err.status || 500;

    // Get user-friendly error message
    const errorResponse = this.getErrorMessage(err, statusCode);

    // Send response
    res.status(statusCode).json(errorResponse);
  }

  /**
   * Async error wrapper for route handlers
   * @param {Function} fn - Async route handler
   * @returns {Function} Wrapped route handler
   */
  asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(err => {
        this.errorHandlerMiddleware(err, req, res, next);
      });
    };
  }

  /**
   * Create a custom error with additional properties
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} type - Error type
   * @returns {Error}
   */
  createError(message, statusCode = 500, type = 'Error') {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.type = type;
    return error;
  }

  /**
   * Add custom error mapping
   * @param {string} errorCode - Error code
   * @param {Object} mapping - Error mapping
   */
  addErrorMapping(errorCode, mapping) {
    this.errorMappings[errorCode] = mapping;
  }

  /**
   * Remove error mapping
   * @param {string} errorCode - Error code
   */
  removeErrorMapping(errorCode) {
    delete this.errorMappings[errorCode];
  }

  /**
   * Get all error mappings (for debugging)
   * @returns {Object}
   */
  getAllErrorMappings() {
    return {
      errorMappings: this.errorMappings,
      statusMessages: this.statusMessages
    };
  }
}

// Create singleton instance
const errorMessageService = new ErrorMessageService();

export default errorMessageService;
