/**
 * Validation Utilities
 *
 * Common validation functions for form inputs and API responses
 */

/**
 * Validates required field
 * @param {any} value - Value to validate
 * @returns {object} - { isValid: boolean, error: string|null }
 */
export const validateRequired = (value) => {
  if (value === null || value === undefined || value === '') {
    return {
      isValid: false,
      error: 'This field is required'
    };
  }
  return { isValid: true, error: null };
};

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {object} - { isValid: boolean, error: string|null }
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address'
    };
  }
  return { isValid: true, error: null };
};

/**
 * Validates URL format
 * @param {string} url - URL to validate
 * @returns {object} - { isValid: boolean, error: string|null }
 */
export const validateUrl = (url) => {
  try {
    new URL(url);
    return { isValid: true, error: null };
  } catch {
    return {
      isValid: false,
      error: 'Please enter a valid URL (e.g., https://example.com)'
    };
  }
};

/**
 * Validates minimum length
 * @param {string} value - Value to validate
 * @param {number} minLength - Minimum required length
 * @returns {object} - { isValid: boolean, error: string|null }
 */
export const validateMinLength = (value, minLength) => {
  if (value && value.length < minLength) {
    return {
      isValid: false,
      error: `Minimum length is ${minLength} characters`
    };
  }
  return { isValid: true, error: null };
};

/**
 * Validates maximum length
 * @param {string} value - Value to validate
 * @param {number} maxLength - Maximum allowed length
 * @returns {object} - { isValid: boolean, error: string|null }
 */
export const validateMaxLength = (value, maxLength) => {
  if (value && value.length > maxLength) {
    return {
      isValid: false,
      error: `Maximum length is ${maxLength} characters`
    };
  }
  return { isValid: true, error: null };
};

/**
 * Validates numeric range
 * @param {number} value - Value to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {object} - { isValid: boolean, error: string|null }
 */
export const validateRange = (value, min, max) => {
  const numValue = parseFloat(value);
  if (isNaN(numValue)) {
    return {
      isValid: false,
      error: 'Please enter a valid number'
    };
  }
  if (numValue < min || numValue > max) {
    return {
      isValid: false,
      error: `Value must be between ${min} and ${max}`
    };
  }
  return { isValid: true, error: null };
};

/**
 * Validates API key format (basic check)
 * @param {string} apiKey - API key to validate
 * @returns {object} - { isValid: boolean, error: string|null }
 */
export const validateApiKey = (apiKey) => {
  if (!apiKey || apiKey.length < 10) {
    return {
      isValid: false,
      error: 'API key must be at least 10 characters long'
    };
  }
  return { isValid: true, error: null };
};

/**
 * Validates MongoDB connection string
 * @param {string} connectionString - Connection string to validate
 * @returns {object} - { isValid: boolean, error: string|null }
 */
export const validateMongoDbUri = (connectionString) => {
  if (!connectionString.startsWith('mongodb://') && !connectionString.startsWith('mongodb+srv://')) {
    return {
      isValid: false,
      error: 'Connection string must start with mongodb:// or mongodb+srv://'
    };
  }
  return { isValid: true, error: null };
};

/**
 * Runs multiple validators and returns first error or success
 * @param {any} value - Value to validate
 * @param {array} validators - Array of validator functions
 * @returns {object} - { isValid: boolean, error: string|null }
 */
export const validateAll = (value, validators) => {
  for (const validator of validators) {
    const result = validator(value);
    if (!result.isValid) {
      return result;
    }
  }
  return { isValid: true, error: null };
};

/**
 * Validates an entire form object
 * @param {object} formData - Form data to validate
 * @param {object} validationRules - Object mapping field names to validator functions
 * @returns {object} - { isValid: boolean, errors: object }
 */
export const validateForm = (formData, validationRules) => {
  const errors = {};
  let isValid = true;

  for (const [fieldName, validators] of Object.entries(validationRules)) {
    const value = formData[fieldName];
    const result = validateAll(value, validators);

    if (!result.isValid) {
      errors[fieldName] = result.error;
      isValid = false;
    }
  }

  return { isValid, errors };
};
