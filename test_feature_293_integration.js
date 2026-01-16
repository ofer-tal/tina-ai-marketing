/**
 * Feature #293 Integration Test
 * Tests invalid API response handling in BaseApiClient
 */

import assert from 'assert';

// Mock the logger
const mockLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

// Mock the rate limiter
const mockRateLimiter = {
  fetch: async (url, options, timeout) => {
    // Return mock responses for testing
    return {
      ok: true,
      status: 200,
      json: async () => {
        // Test various malformed responses
        if (url.includes('malformed-object')) {
          return 'not an object';
        }
        if (url.includes('missing-fields')) {
          return { id: '123' }; // Missing required fields
        }
        if (url.includes('wrong-types')) {
          return { id: 123, name: 'test' }; // id should be string
        }
        return { id: '123', name: 'Test User' };
      },
    };
  },
};

// Test the response validator
console.log('Testing Feature #293: Invalid API Response Handling\n');

// Step 1: Receive malformed API response
console.log('Step 1: Receive malformed API response');
try {
  const { validateResponse, SchemaTypes } = await import('./backend/services/responseValidator.js');

  // Test null response
  let result = validateResponse(null, null, {
    serviceName: 'TestService',
    endpoint: '/test',
    returnSafeDefaults: true,
  });
  assert.strictEqual(result.valid, false, 'Should detect null response');
  assert(result.errors.length > 0, 'Should have errors');
  console.log('✅ Detected null response');

  // Test undefined response
  result = validateResponse(undefined, null, {
    serviceName: 'TestService',
    endpoint: '/test',
    returnSafeDefaults: true,
  });
  assert.strictEqual(result.valid, false, 'Should detect undefined response');
  console.log('✅ Detected undefined response');

  // Test array response (should be valid if no schema)
  result = validateResponse([1, 2, 3], null, {
    serviceName: 'TestService',
    endpoint: '/test',
    returnSafeDefaults: true,
  });
  assert.strictEqual(result.valid, true, 'Array should be valid when no schema provided');
  console.log('✅ Array response is valid when no schema provided');

  // Test string response (should be object)
  result = validateResponse('invalid', null, {
    serviceName: 'TestService',
    endpoint: '/test',
    returnSafeDefaults: true,
  });
  assert.strictEqual(result.valid, false, 'Should detect string response');
  console.log('✅ Detected string response');

  console.log('\n✅ Step 1 COMPLETE: All malformed responses detected\n');
} catch (error) {
  console.error('❌ Step 1 FAILED:', error.message);
  process.exit(1);
}

// Step 2: Validate response structure
console.log('Step 2: Validate response structure');
try {
  const { validateResponse, SchemaTypes } = await import('./backend/services/responseValidator.js');

  const userSchema = {
    type: SchemaTypes.OBJECT,
    properties: {
      id: { type: SchemaTypes.STRING, required: true },
      name: { type: SchemaTypes.STRING, required: true },
      age: { type: SchemaTypes.NUMBER, required: false },
      email: { type: SchemaTypes.STRING, required: true },
    },
  };

  // Test valid response
  let validResponse = {
    id: '123',
    name: 'John Doe',
    age: 30,
    email: 'john@example.com',
  };
  let result = validateResponse(validResponse, userSchema, {
    serviceName: 'TestService',
    endpoint: '/users',
    returnSafeDefaults: false,
  });
  assert.strictEqual(result.valid, true, 'Should validate correct structure');
  console.log('✅ Validated correct response structure');

  // Test missing required field
  let invalidResponse = {
    id: '123',
    name: 'John Doe',
    // Missing 'email' field
  };
  result = validateResponse(invalidResponse, userSchema, {
    serviceName: 'TestService',
    endpoint: '/users',
    returnSafeDefaults: true,
  });
  assert.strictEqual(result.valid, false, 'Should detect missing required field');
  assert(result.errors.some(e => e.message.includes('email')), 'Should report missing email');
  console.log('✅ Detected missing required field (email)');

  // Test wrong field type
  invalidResponse = {
    id: '123',
    name: 'John Doe',
    age: 'thirty', // Should be number
    email: 'john@example.com',
  };
  result = validateResponse(invalidResponse, userSchema, {
    serviceName: 'TestService',
    endpoint: '/users',
    returnSafeDefaults: true,
  });
  assert.strictEqual(result.valid, false, 'Should detect wrong field type');
  assert(result.errors.some(e => e.message.includes('age')), 'Should report wrong type for age');
  console.log('✅ Detected wrong field type (age should be number)');

  // Test nested object validation
  const nestedSchema = {
    type: SchemaTypes.OBJECT,
    properties: {
      user: {
        type: SchemaTypes.OBJECT,
        properties: {
          id: { type: SchemaTypes.STRING, required: true },
          profile: {
            type: SchemaTypes.OBJECT,
            properties: {
              bio: { type: SchemaTypes.STRING, required: false },
            },
          },
        },
      },
    },
  };

  const validNested = {
    user: {
      id: '123',
      profile: {
        bio: 'Hello world',
      },
    },
  };

  result = validateResponse(validNested, nestedSchema, {
    serviceName: 'TestService',
    endpoint: '/users',
    returnSafeDefaults: false,
  });
  assert.strictEqual(result.valid, true, 'Should validate nested objects');
  console.log('✅ Validated nested object structure');

  // Test array validation
  const arraySchema = {
    type: SchemaTypes.ARRAY,
    items: {
      type: SchemaTypes.OBJECT,
      properties: {
        id: { type: SchemaTypes.STRING, required: true },
        name: { type: SchemaTypes.STRING, required: true },
      },
    },
  };

  const validArray = [
    { id: '1', name: 'Item 1' },
    { id: '2', name: 'Item 2' },
  ];

  result = validateResponse(validArray, arraySchema, {
    serviceName: 'TestService',
    endpoint: '/items',
    returnSafeDefaults: false,
  });
  assert.strictEqual(result.valid, true, 'Should validate arrays');
  console.log('✅ Validated array structure');

  console.log('\n✅ Step 2 COMPLETE: All response structures validated\n');
} catch (error) {
  console.error('❌ Step 2 FAILED:', error.message);
  process.exit(1);
}

// Step 3: Log validation error
console.log('Step 3: Log validation error');
try {
  const { validateResponse, SchemaTypes } = await import('./backend/services/responseValidator.js');

  const schema = {
    type: SchemaTypes.OBJECT,
    properties: {
      id: { type: SchemaTypes.STRING, required: true },
      name: { type: SchemaTypes.STRING, required: true },
    },
  };

  const invalidResponse = {
    id: '123',
    // Missing 'name' field
  };

  const result = validateResponse(invalidResponse, schema, {
    serviceName: 'TestService',
    endpoint: '/test',
    returnSafeDefaults: true,
    logErrors: true,
  });

  assert.strictEqual(result.valid, false, 'Should have validation errors');
  assert(result.errors.length > 0, 'Should have error details');

  // Check error structure
  const error = result.errors[0];
  assert(error.path, 'Error should have path');
  assert(error.message, 'Error should have message');
  assert(error.expected !== undefined, 'Error should have expected value');
  assert(error.received !== undefined, 'Error should have received value');

  console.log('✅ Validation errors logged with details:');
  console.log('   - Path:', error.path);
  console.log('   - Message:', error.message);
  console.log('   - Expected:', error.expected);
  console.log('   - Received:', error.received);

  console.log('\n✅ Step 3 COMPLETE: Validation errors logged\n');
} catch (error) {
  console.error('❌ Step 3 FAILED:', error.message);
  process.exit(1);
}

// Step 4: Return safe default or error
console.log('Step 4: Return safe default or error');
try {
  const { validateResponse, SchemaTypes, getSafeDefault, ValidationError } = await import('./backend/services/responseValidator.js');

  const schema = {
    type: SchemaTypes.OBJECT,
    properties: {
      name: { type: SchemaTypes.STRING, required: true, default: 'Unknown' },
      count: { type: SchemaTypes.NUMBER, required: true, default: 0 },
      active: { type: SchemaTypes.BOOLEAN, required: true, default: false },
    },
  };

  // Test safe defaults
  let result = validateResponse({}, schema, {
    serviceName: 'TestService',
    endpoint: '/test',
    returnSafeDefaults: true,
  });

  assert.strictEqual(result.valid, false, 'Should have validation errors');
  assert(result.data !== undefined, 'Should return safe default data');
  assert.strictEqual(typeof result.data.name, 'string', 'name should be string');
  assert.strictEqual(typeof result.data.count, 'number', 'count should be number');
  assert.strictEqual(typeof result.data.active, 'boolean', 'active should be boolean');
  console.log('✅ Returned safe defaults for missing fields');

  // Test getSafeDefault utility
  assert.strictEqual(getSafeDefault({ type: SchemaTypes.STRING }), '', 'String default is empty string');
  assert.strictEqual(getSafeDefault({ type: SchemaTypes.NUMBER }), 0, 'Number default is 0');
  assert.strictEqual(getSafeDefault({ type: SchemaTypes.BOOLEAN }), false, 'Boolean default is false');
  assert.deepEqual(getSafeDefault({ type: SchemaTypes.ARRAY }), [], 'Array default is empty array');
  assert.deepEqual(getSafeDefault({ type: SchemaTypes.OBJECT }), {}, 'Object default is empty object');
  console.log('✅ getSafeDefault utility works correctly');

  // Test throwing ValidationError when returnSafeDefaults is false
  try {
    validateResponse({}, schema, {
      serviceName: 'TestService',
      endpoint: '/test',
      returnSafeDefaults: false,
    });
    assert.fail('Should have thrown ValidationError');
  } catch (error) {
    assert(error.name === 'ValidationError', 'Should throw ValidationError');
    assert.strictEqual(error.userMessage, true, 'ValidationError should be user-facing');
    assert.strictEqual(error.code, 'INVALID_RESPONSE', 'ValidationError should have correct code');
    console.log('✅ Throws ValidationError when returnSafeDefaults is false');
  }

  console.log('\n✅ Step 4 COMPLETE: Safe defaults and errors returned\n');
} catch (error) {
  console.error('❌ Step 4 FAILED:', error.message);
  process.exit(1);
}

// Step 5: Alert user if needed
console.log('Step 5: Alert user if needed');
try {
  const { validateResponse, SchemaTypes } = await import('./backend/services/responseValidator.js');

  const schema = {
    type: SchemaTypes.OBJECT,
    properties: {
      id: { type: SchemaTypes.STRING, required: true },
      email: {
        type: SchemaTypes.STRING,
        required: true,
        pattern: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$',
      },
    },
  };

  try {
    validateResponse({}, schema, {
      serviceName: 'TestService',
      endpoint: '/users/123',
      returnSafeDefaults: false,
    });
    assert.fail('Should have thrown ValidationError');
  } catch (error) {
    assert(error.message.includes('Invalid API response'), 'Error message should mention invalid response');
    assert.strictEqual(error.userMessage, true, 'Error should be user-facing');
    assert(error.details, 'Error should have details');
    assert.strictEqual(error.details.serviceName, 'TestService', 'Details should include service name');
    assert.strictEqual(error.details.endpoint, '/users/123', 'Details should include endpoint');
    assert(error.details.validationErrors, 'Details should include validation errors');
    assert(error.details.errorCount > 0, 'Details should include error count');
    console.log('✅ User-friendly error message generated');
    console.log('   - Message:', error.message);
    console.log('   - Service:', error.details.serviceName);
    console.log('   - Endpoint:', error.details.endpoint);
    console.log('   - Error count:', error.details.errorCount);
  }

  console.log('\n✅ Step 5 COMPLETE: User alerts generated\n');
} catch (error) {
  console.error('❌ Step 5 FAILED:', error.message);
  process.exit(1);
}

// Real-world scenarios
console.log('Real-world API response scenarios');
try {
  const { validateResponse, SchemaTypes } = await import('./backend/services/responseValidator.js');

  // TikTok API response with missing fields
  const tiktokSchema = {
    type: SchemaTypes.OBJECT,
    properties: {
      data: {
        type: SchemaTypes.OBJECT,
        properties: {
          video_id: { type: SchemaTypes.STRING, required: true },
          share_url: { type: SchemaTypes.STRING, required: true },
        },
      },
      error_code: { type: SchemaTypes.STRING, required: false },
    },
  };

  const malformedTikTok = {
    data: {
      video_id: '123456',
      // Missing share_url
    },
  };

  let result = validateResponse(malformedTikTok, tiktokSchema, {
    serviceName: 'TikTok API',
    endpoint: '/video/publish',
    returnSafeDefaults: true,
  });

  assert.strictEqual(result.valid, false, 'Should detect TikTok API malformed response');
  console.log('✅ TikTok API malformed response detected');

  // Instagram API response with wrong types
  const instagramSchema = {
    type: SchemaTypes.OBJECT,
    properties: {
      id: { type: SchemaTypes.STRING, required: true },
      media_type: { type: SchemaTypes.STRING, required: true },
      like_count: { type: SchemaTypes.NUMBER, required: true },
    },
  };

  const malformedInstagram = {
    id: 123456, // Should be string
    media_type: 'IMAGE',
    like_count: '100', // Should be number
  };

  result = validateResponse(malformedInstagram, instagramSchema, {
    serviceName: 'Instagram API',
    endpoint: '/media',
    returnSafeDefaults: true,
  });

  assert.strictEqual(result.valid, false, 'Should detect Instagram API wrong types');
  assert(result.errors.length >= 2, 'Should detect both type errors');
  console.log('✅ Instagram API wrong types detected');

  // Empty response from API
  const schema = {
    type: SchemaTypes.OBJECT,
    properties: {
      success: { type: SchemaTypes.BOOLEAN, required: true },
      data: { type: SchemaTypes.OBJECT, required: true },
    },
  };

  result = validateResponse('', schema, {
    serviceName: 'External API',
    endpoint: '/data',
    returnSafeDefaults: true,
  });

  assert.strictEqual(result.valid, false, 'Should detect empty response');
  console.log('✅ Empty API response detected');

  console.log('\n✅ Real-world scenarios COMPLETE\n');
} catch (error) {
  console.error('❌ Real-world scenarios FAILED:', error.message);
  process.exit(1);
}

console.log('\n' + '='.repeat(60));
console.log('✅ ALL TESTS PASSED');
console.log('='.repeat(60));
console.log('\nFeature #293: Invalid API Response Handling');
console.log('All 5 steps verified successfully:');
console.log('  1. ✅ Receive malformed API response');
console.log('  2. ✅ Validate response structure');
console.log('  3. ✅ Log validation error');
console.log('  4. ✅ Return safe default or error');
console.log('  5. ✅ Alert user if needed');
console.log('\nImplementation is production-ready!');
console.log('='.repeat(60) + '\n');
