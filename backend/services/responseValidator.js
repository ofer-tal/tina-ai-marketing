/**
 * Response Validator
 *
 * Validates API responses to ensure they match expected structure.
 * Handles malformed responses, missing fields, and invalid data types.
 * Provides safe defaults and detailed error logging.
 */

import { getLogger } from '../utils/logger.js';

const logger = getLogger('services', 'response-validator');

/**
 * Validation error class
 */
class ValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ValidationError';
    this.code = 'INVALID_RESPONSE';
    this.details = details;
    this.userMessage = true; // Flag for frontend to display to user
  }
}

/**
 * Response schema types
 */
const SchemaTypes = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  ARRAY: 'array',
  OBJECT: 'object',
  NULL: 'null',
  ANY: 'any',
};

/**
 * Validate a value against a schema type
 */
function validateType(value, type, fieldName = 'field') {
  if (type === SchemaTypes.ANY) {
    return { valid: true };
  }

  if (value === null || value === undefined) {
    // Allow null/undefined for nullable fields
    return { valid: true };
  }

  const actualType = Array.isArray(value) ? 'array' : typeof value;

  if (actualType !== type) {
    return {
      valid: false,
      error: `Field "${fieldName}" expected ${type} but got ${actualType}`,
      expected: type,
      actual: actualType,
      received: value,
    };
  }

  return { valid: true };
}

/**
 * Validate response against a schema
 */
function validateSchema(data, schema, path = 'root') {
  const errors = [];

  // Check if data is null or undefined
  if (data === null || data === undefined) {
    if (schema.required) {
      errors.push({
        path,
        message: `${path} is required but got ${data}`,
        expected: 'non-null value',
        received: data,
      });
    }
    return { valid: errors.length === 0, errors };
  }

  // Validate type
  if (schema.type) {
    const typeValidation = validateType(data, schema.type, path);
    if (!typeValidation.valid) {
      errors.push({
        path,
        message: typeValidation.error,
        expected: typeValidation.expected,
        received: typeValidation.actual,
        value: typeValidation.received,
      });
      return { valid: false, errors };
    }
  }

  // Validate object properties
  if (schema.type === SchemaTypes.OBJECT && schema.properties && typeof data === 'object') {
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      const propPath = path ? `${path}.${propName}` : propName;
      const propValue = data[propName];

      // Check required fields
      if (propSchema.required && (propValue === undefined || propValue === null)) {
        errors.push({
          path: propPath,
          message: `Required field "${propPath}" is missing`,
          expected: 'present',
          received: 'undefined',
        });
        continue;
      }

      // Recursively validate nested properties
      if (propValue !== undefined && propValue !== null) {
        const propValidation = validateSchema(propValue, propSchema, propPath);
        errors.push(...propValidation.errors);
      }
    }

    // Check for unexpected fields (if strict mode)
    if (schema.strict) {
      const allowedFields = new Set(Object.keys(schema.properties || {}));
      const actualFields = new Set(Object.keys(data));
      const unexpectedFields = [...actualFields].filter(f => !allowedFields.has(f));

      for (const field of unexpectedFields) {
        errors.push({
          path: `${path}.${field}`,
          message: `Unexpected field "${field}" in strict mode`,
          expected: 'undefined',
          received: 'present',
        });
      }
    }
  }

  // Validate array items
  if (schema.type === SchemaTypes.ARRAY && schema.items && Array.isArray(data)) {
    data.forEach((item, index) => {
      const itemPath = `${path}[${index}]`;
      const itemValidation = validateSchema(item, schema.items, itemPath);
      errors.push(...itemValidation.errors);
    });
  }

  // Validate string constraints
  if (schema.type === SchemaTypes.STRING && typeof data === 'string') {
    if (schema.minLength !== undefined && data.length < schema.minLength) {
      errors.push({
        path,
        message: `String "${path}" is too short (min ${schema.minLength} chars)`,
        expected: `>= ${schema.minLength}`,
        received: data.length,
      });
    }
    if (schema.maxLength !== undefined && data.length > schema.maxLength) {
      errors.push({
        path,
        message: `String "${path}" is too long (max ${schema.maxLength} chars)`,
        expected: `<= ${schema.maxLength}`,
        received: data.length,
      });
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(data)) {
      errors.push({
        path,
        message: `String "${path}" does not match pattern ${schema.pattern}`,
        expected: schema.pattern,
        received: data,
      });
    }
  }

  // Validate number constraints
  if (schema.type === SchemaTypes.NUMBER && typeof data === 'number') {
    if (schema.min !== undefined && data < schema.min) {
      errors.push({
        path,
        message: `Number "${path}" is too small (min ${schema.min})`,
        expected: `>= ${schema.min}`,
        received: data,
      });
    }
    if (schema.max !== undefined && data > schema.max) {
      errors.push({
        path,
        message: `Number "${path}" is too large (max ${schema.max})`,
        expected: `<= ${schema.max}`,
        received: data,
      });
    }
  }

  // Custom validator function
  if (schema.validator && typeof schema.validator === 'function') {
    const customResult = schema.validator(data, path);
    if (customResult !== true) {
      errors.push({
        path,
        message: typeof customResult === 'string' ? customResult : 'Custom validation failed',
        expected: 'validation passed',
        received: 'validation failed',
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get safe default value for a schema
 */
function getSafeDefault(schema) {
  if (schema.default !== undefined) {
    return schema.default;
  }

  switch (schema.type) {
    case SchemaTypes.STRING:
      return '';
    case SchemaTypes.NUMBER:
      return 0;
    case SchemaTypes.BOOLEAN:
      return false;
    case SchemaTypes.ARRAY:
      return [];
    case SchemaTypes.OBJECT:
      // If object has properties, generate defaults for each
      if (schema.properties) {
        const obj = {};
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          obj[propName] = getSafeDefault(propSchema);
        }
        return obj;
      }
      return {};
    default:
      return null;
  }
}

/**
 * Validate API response with schema
 */
function validateResponse(response, schema, options = {}) {
  const {
    serviceName = 'API',
    endpoint = 'unknown',
    returnSafeDefaults = true,
    logErrors = true,
  } = options;

  // Check if response exists
  if (!response) {
    const error = {
      message: 'Empty or null response received',
      serviceName,
      endpoint,
      received: response,
    };

    if (logErrors) {
      logger.error('Invalid API response: Empty response', error);
    }

    if (returnSafeDefaults) {
      return {
        valid: false,
        data: schema ? getSafeDefault(schema) : { success: false, error: 'Empty response' },
        errors: [error],
      };
    }

    throw new ValidationError('Invalid API response: Empty response', error);
  }

  // Check if response is valid JSON/object
  // Allow arrays if schema specifies array type
  const isArrayResponse = Array.isArray(response);
  const isObjectResponse = typeof response === 'object' && !isArrayResponse;

  if (!isObjectResponse && !isArrayResponse) {
    const error = {
      message: 'Response is not a valid object or array',
      serviceName,
      endpoint,
      received: response,
    };

    if (logErrors) {
      logger.error('Invalid API response: Not an object or array', error);
    }

    if (returnSafeDefaults) {
      return {
        valid: false,
        data: schema ? getSafeDefault(schema) : { success: false, error: 'Invalid response' },
        errors: [error],
      };
    }

    throw new ValidationError('Invalid API response: Not a valid object or array', error);
  }

  // Validate against schema if provided
  if (schema) {
    const validation = validateSchema(response, schema);

    if (!validation.valid) {
      const errorDetails = {
        serviceName,
        endpoint,
        validationErrors: validation.errors,
        errorCount: validation.errors.length,
      };

      if (logErrors) {
        logger.error('Invalid API response: Schema validation failed', {
          ...errorDetails,
          received: response,
        });
      }

      if (returnSafeDefaults) {
        return {
          valid: false,
          data: getSafeDefault(schema),
          errors: validation.errors,
          sanitized: true,
        };
      }

      throw new ValidationError(
        `Invalid API response: ${validation.errors.length} validation error(s)`,
        errorDetails
      );
    }

    return {
      valid: true,
      data: response,
      errors: [],
    };
  }

  // No schema provided, just check if it's a valid object
  return {
    valid: true,
    data: response,
    errors: [],
  };
}

/**
 * Sanitize response by removing invalid fields
 */
function sanitizeResponse(response, schema) {
  if (!response || !schema || typeof response !== 'object') {
    return response;
  }

  const sanitized = {};

  for (const [fieldName, fieldSchema] of Object.entries(schema.properties || {})) {
    const value = response[fieldName];

    if (value === undefined || value === null) {
      if (fieldSchema.required) {
        sanitized[fieldName] = getSafeDefault(fieldSchema);
      }
      continue;
    }

    // Type validation and coercion
    const typeValidation = validateType(value, fieldSchema.type, fieldName);

    if (!typeValidation.valid) {
      logger.warn(`Field "${fieldName}" has invalid type, using safe default`, {
        expected: typeValidation.expected,
        actual: typeValidation.actual,
      });
      sanitized[fieldName] = getSafeDefault(fieldSchema);
      continue;
    }

    // Recursively sanitize nested objects
    if (fieldSchema.type === SchemaTypes.OBJECT && fieldSchema.properties) {
      sanitized[fieldName] = sanitizeResponse(value, fieldSchema);
    } else if (fieldSchema.type === SchemaTypes.ARRAY && fieldSchema.items) {
      if (Array.isArray(value)) {
        sanitized[fieldName] = value.map(item =>
          fieldSchema.items.type === SchemaTypes.OBJECT
            ? sanitizeResponse(item, fieldSchema.items)
            : item
        );
      } else {
        sanitized[fieldName] = getSafeDefault(fieldSchema);
      }
    } else {
      sanitized[fieldName] = value;
    }
  }

  return sanitized;
}

/**
 * Create a validation error response for API
 */
function createValidationErrorResponse(errors, requestDetails = {}) {
  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'API response validation failed',
      details: errors,
      request: requestDetails,
    },
  };
}

export {
  validateResponse,
  sanitizeResponse,
  validateSchema,
  getSafeDefault,
  createValidationErrorResponse,
  ValidationError,
  SchemaTypes,
};
