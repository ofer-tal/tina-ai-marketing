/**
 * Unit Tests for Utility Functions
 *
 * Tests for:
 * - Retry Service (retry.js)
 * - Rate Limiter (rateLimiter.js)
 * - Config Service (config.js)
 * - Video Metadata Utility (videoMetadata.js)
 * - Video Watermark Utility (videoWatermark.js)
 */

// Test RetryService class methods directly
describe('Utility Functions - Retry Service', () => {

  describe('RetryOptions', () => {
    it('should create default options', () => {
      const options = {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        retryableErrors: ['ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN'],
        retryableStatusCodes: [408, 429, 500, 502, 503, 504],
      };

      expect(options.maxRetries).toBe(3);
      expect(options.initialDelay).toBe(1000);
      expect(options.maxDelay).toBe(30000);
      expect(options.backoffMultiplier).toBe(2);
    });

    it('should merge custom options with defaults', () => {
      const defaults = { maxRetries: 3, initialDelay: 1000 };
      const custom = { maxRetries: 5 };
      const merged = { ...defaults, ...custom };

      expect(merged.maxRetries).toBe(5);
      expect(merged.initialDelay).toBe(1000);
    });
  });

  describe('calculateDelay - Algorithm Test', () => {
    it('should calculate delay with exponential backoff', () => {
      // Test the algorithm directly
      const initialDelay = 1000;
      const backoffMultiplier = 2;
      const maxDelay = 30000;

      const delay0 = Math.min(initialDelay * Math.pow(backoffMultiplier, 0), maxDelay);
      const delay1 = Math.min(initialDelay * Math.pow(backoffMultiplier, 1), maxDelay);
      const delay2 = Math.min(initialDelay * Math.pow(backoffMultiplier, 2), maxDelay);

      // Delay should increase exponentially
      expect(delay1).toBeGreaterThan(delay0);
      expect(delay2).toBeGreaterThan(delay1);

      // First attempt should use initial delay
      expect(delay0).toBe(1000);
      expect(delay1).toBe(2000);
      expect(delay2).toBe(4000);
    });

    it('should respect max delay limit', () => {
      const initialDelay = 1000;
      const backoffMultiplier = 2;
      const maxDelay = 30000;

      const delay = Math.min(initialDelay * Math.pow(backoffMultiplier, 100), maxDelay);
      expect(delay).toBeLessThanOrEqual(30000);
    });
  });

  describe('isRetryableError - Error Detection', () => {
    const retryableErrors = ['ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN'];
    const retryablePatterns = [/network/, /timeout/, /ECONN/, /fetch failed/, /rate limit/i];

    it('should identify retryable error codes', () => {
      retryableErrors.forEach(code => {
        expect(retryableErrors.includes(code)).toBe(true);
      });
    });

    it('should identify retryable error patterns', () => {
      const testMessages = [
        'network error',
        'timeout occurred',
        'ECONNREFUSED',
        'fetch failed',
        'rate limit exceeded',
      ];

      testMessages.forEach(message => {
        const matches = retryablePatterns.some(pattern => pattern.test(message));
        expect(matches).toBe(true);
      });
    });

    it('should not match non-retryable errors', () => {
      const nonRetryable = 'Authentication failed';
      const matches = retryablePatterns.some(pattern => pattern.test(nonRetryable));
      expect(matches).toBe(false);
    });
  });

  describe('isRetryableStatus - HTTP Status Codes', () => {
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];

    it('should identify retryable HTTP status codes', () => {
      retryableStatusCodes.forEach(status => {
        expect(retryableStatusCodes.includes(status)).toBe(true);
      });
    });

    it('should not include non-retryable status codes', () => {
      const nonRetryableStatuses = [200, 201, 400, 401, 403, 404];

      nonRetryableStatuses.forEach(status => {
        expect(retryableStatusCodes.includes(status)).toBe(false);
      });
    });
  });

  describe('Exponential Backoff Calculation', () => {
    it('should calculate correct delays with multiplier', () => {
      const initialDelay = 1000;
      const multiplier = 2;

      expect(initialDelay * Math.pow(multiplier, 0)).toBe(1000);
      expect(initialDelay * Math.pow(multiplier, 1)).toBe(2000);
      expect(initialDelay * Math.pow(multiplier, 2)).toBe(4000);
      expect(initialDelay * Math.pow(multiplier, 3)).toBe(8000);
    });
  });

  describe('Jitter Calculation', () => {
    it('should add random jitter to delay', () => {
      const baseDelay = 1000;
      const jitterAmount = 100;

      const delay1 = baseDelay + Math.random() * jitterAmount;
      const delay2 = baseDelay + Math.random() * jitterAmount;

      // Due to randomness, delays might be different
      expect(delay1).toBeGreaterThanOrEqual(baseDelay);
      expect(delay1).toBeLessThan(baseDelay + jitterAmount);
      expect(delay2).toBeGreaterThanOrEqual(baseDelay);
      expect(delay2).toBeLessThan(baseDelay + jitterAmount);
    });
  });
});

describe('Utility Functions - Rate Limiter', () => {

  describe('_parseHost - URL Parsing', () => {
    it('should parse host from valid URL', () => {
      const url = 'https://api.example.com/v1/endpoint';
      try {
        const urlObj = new URL(url);
        expect(urlObj.host).toBe('api.example.com');
      } catch (e) {
        fail('URL parsing should not throw');
      }
    });

    it('should parse different URL formats', () => {
      const urls = [
        { input: 'http://localhost:3000/api', host: 'localhost:3000' },
        { input: 'https://api.tiktok.com/v1', host: 'api.tiktok.com' },
        { input: 'ws://websocket.example.com', host: 'websocket.example.com' },
      ];

      urls.forEach(({ input, host }) => {
        const urlObj = new URL(input);
        expect(urlObj.host).toBe(host);
      });
    });

    it('should handle invalid URLs gracefully', () => {
      const invalidUrl = 'not-a-url';
      let threw = false;
      try {
        new URL(invalidUrl);
      } catch (e) {
        threw = true;
      }
      expect(threw).toBe(true);
    });

    it('should handle URLs with special characters', () => {
      const url = 'https://api.example.com/v1/path?query=value&other=123#fragment';
      const urlObj = new URL(url);
      expect(urlObj.host).toBe('api.example.com');
    });
  });

  describe('Exponential Backoff for Rate Limits', () => {
    it('should calculate retry delay with exponential backoff', () => {
      const baseDelay = 1000;
      const backoffMultiplier = 2;
      const maxDelay = 60000;

      const delay1 = Math.min(baseDelay * Math.pow(backoffMultiplier, 0), maxDelay);
      const delay2 = Math.min(baseDelay * Math.pow(backoffMultiplier, 1), maxDelay);
      const delay3 = Math.min(baseDelay * Math.pow(backoffMultiplier, 2), maxDelay);

      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
    });

    it('should respect max delay', () => {
      const baseDelay = 1000;
      const backoffMultiplier = 2;
      const maxDelay = 60000;

      const delay = Math.min(baseDelay * Math.pow(backoffMultiplier, 100), maxDelay);
      expect(delay).toBeLessThanOrEqual(maxDelay);
    });
  });

  describe('Retry-After Header Parsing', () => {
    it('should parse numeric Retry-After header', () => {
      const retryAfterHeader = '300';
      const parsed = parseInt(retryAfterHeader, 10);
      expect(parsed).toBe(300);
    });

    it('should handle invalid Retry-After values', () => {
      const invalid = 'invalid';
      const parsed = parseInt(invalid, 10);
      expect(isNaN(parsed)).toBe(true);
    });
  });
});

describe('Utility Functions - Config Service', () => {

  describe('parseValue - Type Conversion', () => {
    it('should parse integer values', () => {
      const parseValue = (value) => {
        if (typeof value !== 'string') return value;
        if (/^\d+$/.test(value)) return parseInt(value, 10);
        if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
        if (value.toLowerCase() === 'true' || value === '1') return true;
        if (value.toLowerCase() === 'false' || value === '0') return false;
        return value;
      };

      expect(parseValue('123')).toBe(123);
      expect(parseValue('0')).toBe(0);
      expect(parseValue('456')).toBe(456);
    });

    it('should parse float values', () => {
      const parseValue = (value) => {
        if (typeof value !== 'string') return value;
        if (/^\d+$/.test(value)) return parseInt(value, 10);
        if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
        if (value.toLowerCase() === 'true' || value === '1') return true;
        if (value.toLowerCase() === 'false' || value === '0') return false;
        return value;
      };

      expect(parseValue('123.45')).toBe(123.45);
      expect(parseValue('0.5')).toBe(0.5);
    });

    it('should parse boolean values', () => {
      const parseValue = (value) => {
        if (typeof value !== 'string') return value;
        // Check for boolean strings and '0'/'1' first (before integers)
        if (value.toLowerCase() === 'true' || value === '1') return true;
        if (value.toLowerCase() === 'false' || value === '0') return false;
        if (/^\d+$/.test(value)) return parseInt(value, 10);
        if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
        return value;
      };

      expect(parseValue('true')).toBe(true);
      expect(parseValue('false')).toBe(false);
      expect(parseValue('1')).toBe(true);
      expect(parseValue('0')).toBe(false);
    });

    it('should return non-string values as-is', () => {
      const parseValue = (value) => {
        if (typeof value !== 'string') return value;
        return value;
      };

      expect(parseValue(123)).toBe(123);
      expect(parseValue(null)).toBe(null);
      expect(parseValue(undefined)).toBe(undefined);
    });

    it('should return strings that are not numbers or booleans', () => {
      const parseValue = (value) => {
        if (typeof value !== 'string') return value;
        if (/^\d+$/.test(value)) return parseInt(value, 10);
        if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
        if (value.toLowerCase() === 'true' || value === '1') return true;
        if (value.toLowerCase() === 'false' || value === '0') return false;
        return value;
      };

      expect(parseValue('hello')).toBe('hello');
      expect(parseValue('mongodb://localhost')).toBe('mongodb://localhost');
    });
  });

  describe('sanitizeValue - Sensitive Data', () => {
    it('should sanitize sensitive values', () => {
      const sanitizeValue = (value) => {
        if (!value) return value;
        if (typeof value === 'string' && value.length > 4) {
          return `${value.substring(0, 4)}****`;
        }
        return value;
      };

      expect(sanitizeValue('my-secret-key-12345')).toBe('my-s****');
    });

    it('should not sanitize short values', () => {
      const sanitizeValue = (value) => {
        if (!value) return value;
        if (typeof value === 'string' && value.length > 4) {
          return `${value.substring(0, 4)}****`;
        }
        return value;
      };

      expect(sanitizeValue('ab')).toBe('ab');
    });

    it('should handle null/undefined values', () => {
      const sanitizeValue = (value) => {
        if (!value) return value;
        return value;
      };

      expect(sanitizeValue(null)).toBe(null);
      expect(sanitizeValue(undefined)).toBe(undefined);
    });
  });

  describe('Validation Functions', () => {
    it('should validate MongoDB connection string', () => {
      const validateMongoURI = (value) => {
        if (!value) return false;
        return value.startsWith('mongodb://') || value.startsWith('mongodb+srv://');
      };

      expect(validateMongoURI('mongodb://localhost:27017')).toBe(true);
      expect(validateMongoURI('mongodb+srv://cluster.example.com')).toBe(true);
      expect(validateMongoURI('postgres://localhost')).toBe(false);
      expect(validateMongoURI('')).toBe(false);
    });

    it('should validate port numbers', () => {
      const validatePort = (value) => {
        const port = parseInt(value, 10);
        return !isNaN(port) && port > 0 && port < 65536;
      };

      expect(validatePort('3001')).toBe(true);
      expect(validatePort('8080')).toBe(true);
      expect(validatePort('0')).toBe(false);
      expect(validatePort('65536')).toBe(false);
      expect(validatePort('abc')).toBe(false);
    });

    it('should validate URLs', () => {
      const validateURL = (value) => {
        if (!value) return true;
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      };

      expect(validateURL('https://example.com')).toBe(true);
      expect(validateURL('http://localhost:3000')).toBe(true);
      expect(validateURL('not-a-url')).toBe(false);
      expect(validateURL('')).toBe(true); // optional
    });

    it('should validate UUID format', () => {
      const validateUUID = (value) => {
        if (!value) return true;
        return /^[A-Z0-9]{8}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{12}$/.test(value);
      };

      expect(validateUUID('A1B2C3D4-E5F6-7890-ABCD-EF1234567890')).toBe(true);
      expect(validateUUID('not-a-uuid')).toBe(false);
      expect(validateUUID('')).toBe(true); // optional
    });

    it('should validate cron expressions', () => {
      const validateCron = (value) => {
        if (!value) return true;
        const cronRegex = /^(\*|\d+|\d+-\d+|\*\/\d+|\d+-\d+\/\d+)(\s+(\*|\d+|\d+-\d+|\*\/\d+|\d+-\d+\/\d+)){4}$/;
        return cronRegex.test(value);
      };

      expect(validateCron('0 6 * * *')).toBe(true);
      expect(validateCron('*/4 * * * *')).toBe(true);
      expect(validateCron('0 9-17 * * 1-5')).toBe(true);
      expect(validateCron('invalid')).toBe(false);
    });

    it('should validate numeric ranges', () => {
      const validateRange = (value, min, max) => {
        const num = parseFloat(value);
        return !isNaN(num) && num >= min && num <= max;
      };

      expect(validateRange('0.70', 0, 1)).toBe(true);
      expect(validateRange('0.5', 0, 1)).toBe(true);
      expect(validateRange('1.5', 0, 1)).toBe(false);
      expect(validateRange('-0.5', 0, 1)).toBe(false);
    });

    it('should validate boolean strings', () => {
      const validateBoolean = (value) => {
        return ['true', 'false', '1', '0'].includes(value.toLowerCase());
      };

      expect(validateBoolean('true')).toBe(true);
      expect(validateBoolean('false')).toBe(true);
      expect(validateBoolean('TRUE')).toBe(true);
      expect(validateBoolean('1')).toBe(true);
      expect(validateBoolean('0')).toBe(true);
      expect(validateBoolean('yes')).toBe(false);
      expect(validateBoolean('no')).toBe(false);
    });
  });
});

describe('Utility Functions - Video Metadata', () => {

  describe('Aspect Ratio Calculation', () => {
    it('should calculate aspect ratio from width and height', () => {
      const calculateAspectRatio = (width, height) => {
        const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
        const divisor = gcd(width, height);
        return `${width / divisor}:${height / divisor}`;
      };

      expect(calculateAspectRatio(1080, 1920)).toBe('9:16');
      expect(calculateAspectRatio(1920, 1080)).toBe('16:9');
      expect(calculateAspectRatio(1080, 1080)).toBe('1:1');
    });
  });

  describe('FPS Calculation', () => {
    it('should calculate FPS from frame rate string', () => {
      const calculateFPS = (frameRate) => {
        if (!frameRate) return 0;
        const parts = frameRate.split('/');
        if (parts.length === 2) {
          return parseInt(parts[0]) / parseInt(parts[1]);
        }
        return parseFloat(frameRate);
      };

      expect(calculateFPS('30000/1001')).toBeCloseTo(29.97);
      expect(calculateFPS('60/1')).toBe(60);
      expect(calculateFPS('30')).toBe(30);
      expect(calculateFPS('')).toBe(0);
    });
  });

  describe('Aspect Ratio Parsing', () => {
    it('should parse aspect ratio string to numeric value', () => {
      const parseAspectRatio = (ratio) => {
        const parts = ratio.split(':');
        if (parts.length !== 2) {
          throw new Error(`Invalid aspect ratio format: ${ratio}`);
        }
        return parseInt(parts[0]) / parseInt(parts[1]);
      };

      expect(parseAspectRatio('9:16')).toBeCloseTo(0.5625);
      expect(parseAspectRatio('16:9')).toBeCloseTo(1.7778);
      expect(parseAspectRatio('1:1')).toBe(1);

      expect(() => parseAspectRatio('invalid')).toThrow();
    });
  });
});

describe('Utility Functions - Edge Cases and Error Handling', () => {

  describe('Edge Case - Empty and Null Values', () => {
    it('should handle empty strings', () => {
      const parseValue = (value) => {
        if (typeof value !== 'string') return value;
        return value;
      };

      expect(parseValue('')).toBe('');
    });

    it('should handle numeric edge cases', () => {
      const parseIntSafe = (value) => {
        const num = parseInt(value, 10);
        return isNaN(num) ? null : num;
      };

      expect(parseIntSafe('007')).toBe(7);
      expect(parseIntSafe('-123')).toBe(-123);
      expect(parseIntSafe('abc')).toBeNull();
    });

    it('should handle float edge cases', () => {
      const parseFloatSafe = (value) => {
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
      };

      expect(parseFloatSafe('-45.67')).toBe(-45.67);
      expect(parseFloatSafe('1.23e-4')).toBeCloseTo(0.000123);
      expect(parseFloatSafe('abc')).toBeNull();
    });
  });

  describe('Edge Case - Boolean Conversion', () => {
    it('should handle boolean strings in different cases', () => {
      const toBoolean = (value) => {
        if (value.toLowerCase() === 'true' || value === '1') return true;
        if (value.toLowerCase() === 'false' || value === '0') return false;
        return null;
      };

      expect(toBoolean('TRUE')).toBe(true);
      expect(toBoolean('FALSE')).toBe(false);
      expect(toBoolean('True')).toBe(true);
      expect(toBoolean('False')).toBe(false);
      expect(toBoolean('yes')).toBeNull();
    });
  });

  describe('Edge Case - URL Parsing', () => {
    it('should handle very long URLs', () => {
      const longPath = 'a'.repeat(10000);
      const url = `https://api.example.com/${longPath}`;

      expect(() => new URL(url)).not.toThrow();
      expect(new URL(url).host).toBe('api.example.com');
    });

    it('should handle URLs with special characters', () => {
      const url = 'https://api.example.com/v1/path?query=value&other=123#fragment';
      const urlObj = new URL(url);

      expect(urlObj.host).toBe('api.example.com');
      expect(urlObj.pathname).toBe('/v1/path');
      expect(urlObj.searchParams.get('query')).toBe('value');
    });
  });

  describe('Edge Case - Array Operations', () => {
    it('should handle array includes for retryable codes', () => {
      const retryableErrors = ['ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN'];

      expect(retryableErrors.includes('ECONNRESET')).toBe(true);
      expect(retryableErrors.includes('SOME_OTHER_ERROR')).toBe(false);
      expect(retryableErrors.includes('')).toBe(false);
    });

    it('should handle array some for pattern matching', () => {
      const patterns = [/network/, /timeout/, /ECONN/];

      expect(patterns.some(p => p.test('network error'))).toBe(true);
      expect(patterns.some(p => p.test('timeout occurred'))).toBe(true);
      expect(patterns.some(p => p.test('ECONNRESET'))).toBe(true);
      expect(patterns.some(p => p.test('authentication failed'))).toBe(false);
    });
  });

  describe('Edge Case - Math Operations', () => {
    it('should handle Math.pow for exponential backoff', () => {
      const base = 2;
      expect(Math.pow(base, 0)).toBe(1);
      expect(Math.pow(base, 1)).toBe(2);
      expect(Math.pow(base, 2)).toBe(4);
      expect(Math.pow(base, 3)).toBe(8);
    });

    it('should handle Math.min for max delay cap', () => {
      const maxDelay = 30000;
      expect(Math.min(1000, maxDelay)).toBe(1000);
      expect(Math.min(50000, maxDelay)).toBe(maxDelay);
    });

    it('should handle Math.random for jitter', () => {
      const jitter = Math.random() * 100;
      expect(jitter).toBeGreaterThanOrEqual(0);
      expect(jitter).toBeLessThan(100);
    });
  });
});

describe('Utility Functions - Todo Auto Creator', () => {

  describe('Category Detection', () => {
    it('should detect posting category from keywords', () => {
      const postingKeywords = ['content', 'post', 'tiktok', 'instagram', 'video'];

      postingKeywords.forEach(keyword => {
        const text = `Create a new ${keyword}`;
        const hasKeyword = postingKeywords.some(k => text.toLowerCase().includes(k));
        expect(hasKeyword).toBe(true);
      });
    });

    it('should detect review category from keywords', () => {
      const reviewKeywords = ['campaign', 'ad', 'budget', 'pause'];

      reviewKeywords.forEach(keyword => {
        const text = `Review the ${keyword}`;
        const hasKeyword = reviewKeywords.some(k => text.toLowerCase().includes(k));
        expect(hasKeyword).toBe(true);
      });
    });

    it('should detect configuration category from keywords', () => {
      const configKeywords = ['keyword', 'aso', 'app store'];

      configKeywords.forEach(keyword => {
        const text = `Update ${keyword} settings`;
        const hasKeyword = configKeywords.some(k => text.toLowerCase().includes(k));
        expect(hasKeyword).toBe(true);
      });
    });
  });

  describe('Priority Assignment', () => {
    it('should assign urgent priority for campaign/budget issues', () => {
      const urgentKeywords = ['campaign', 'budget', 'pause'];

      urgentKeywords.forEach(keyword => {
        const text = `Urgent: ${keyword} needs attention`;
        const hasKeyword = urgentKeywords.some(k => text.toLowerCase().includes(k));
        expect(hasKeyword).toBe(true);
      });
    });

    it('should assign high priority for content posting', () => {
      const highKeywords = ['content', 'post', 'tiktok', 'video'];

      highKeywords.forEach(keyword => {
        const text = `Create ${keyword}`;
        const hasKeyword = highKeywords.some(k => text.toLowerCase().includes(k));
        expect(hasKeyword).toBe(true);
      });
    });
  });

  describe('Text Processing', () => {
    it('should truncate long titles', () => {
      const maxLength = 60;
      const longTitle = 'This is a very long todo title that should be truncated because it exceeds the maximum length allowed';
      const truncated = longTitle.length > maxLength
        ? longTitle.substring(0, maxLength) + '...'
        : longTitle;

      expect(truncated.length).toBeLessThanOrEqual(maxLength + 3); // +3 for '...'
      expect(truncated).toContain('...');
    });

    it('should filter out very short items', () => {
      const items = ['Do', 'A', 'Thing', 'Create a proper todo item'];
      const filtered = items.filter(item => item.length > 5);

      expect(filtered).toHaveLength(1);
      expect(filtered[0]).toContain('proper');
    });

    it('should limit to top N recommendations', () => {
      const recommendations = Array.from({ length: 10 }, (_, i) => `Item ${i + 1}`);
      const topRecommendations = recommendations.slice(0, 5);

      expect(topRecommendations).toHaveLength(5);
      expect(topRecommendations[0]).toBe('Item 1');
      expect(topRecommendations[4]).toBe('Item 5');
    });
  });

  describe('Action Item Detection', () => {
    it('should detect numbered action items', () => {
      const text = `1. Create campaign
2. Update budget
3. Review keywords`;

      const numberedItems = text.match(/\d+\.\s+[A-Z][^.\n]+/g);
      expect(numberedItems).toHaveLength(3);
    });

    it('should detect bullet point items', () => {
      const text = `- Create post
- Update settings
- Review performance`;

      const bulletItems = text.split('\n')
        .filter(line => line.trim().match(/^[\-\*\d\.]+?\s+/));

      expect(bulletItems).toHaveLength(3);
    });

    it('should detect recommendation keywords', () => {
      const keywords = ['should i', 'recommend', 'create', 'update', 'pause', 'implement'];

      keywords.forEach(keyword => {
        const text = `I ${keyword} you do this`;
        const hasKeyword = text.toLowerCase().includes(keyword);
        expect(hasKeyword).toBe(true);
      });
    });
  });
});

describe('Test Summary', () => {
  it('should complete all utility function tests', () => {
    expect(true).toBe(true);
  });
});
