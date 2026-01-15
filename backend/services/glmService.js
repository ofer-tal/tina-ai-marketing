import winston from 'winston';

// Create logger for GLM service
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'glm47' },
  transports: [
    new winston.transports.File({ filename: 'logs/glm47-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/glm47.log' }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

/**
 * GLM4.7 API Service
 * GLM4.7 client with Anthropic-compatible API format
 *
 * This service provides an Anthropic-compatible interface to the GLM4.7 API
 * using the endpoint: https://api.z.ai/api/anthropic
 *
 * Supported features:
 * - Chat completions with system messages
 * - Streaming responses
 * - Context window management
 * - Error handling and retries
 * - Message history management
 */
class GLMService {
  constructor() {
    this.apiKey = process.env.GLM47_API_KEY;
    this.endpoint = process.env.GLM47_API_ENDPOINT || 'https://api.z.ai/api/anthropic';
    this.model = 'glm-4-plus'; // GLM4.7 model
    this.timeout = 60000; // 60 second timeout
    this.maxRetries = 3;
    this.retryDelay = 1000; // Initial retry delay in ms

    if (!this.apiKey) {
      logger.warn('GLM47_API_KEY not configured - service will return mock responses');
    }
  }

  /**
   * Check if service is properly configured
   * @returns {boolean} True if API key is configured
   */
  isConfigured() {
    return !!this.apiKey && this.apiKey !== '';
  }

  /**
   * Get service status
   * @returns {object} Service status
   */
  getStatus() {
    return {
      service: 'glm47',
      configured: this.isConfigured(),
      endpoint: this.endpoint,
      model: this.model,
      timeout: this.timeout
    };
  }

  /**
   * Health check
   * @returns {Promise<object>} Health check result
   */
  async healthCheck() {
    if (!this.apiKey) {
      return {
        healthy: false,
        reason: 'API key not configured'
      };
    }

    try {
      // Try a simple API call to check connectivity
      const response = await this.createMessage({
        messages: [
          { role: 'user', content: 'health check' }
        ],
        maxTokens: 10
      });

      return {
        healthy: true,
        model: this.model
      };
    } catch (error) {
      return {
        healthy: false,
        reason: error.message
      };
    }
  }

  /**
   * Create a chat completion (Anthropic-compatible format)
   *
   * @param {object} options - Chat completion options
   * @param {Array} options.messages - Array of message objects with role and content
   * @param {string} options.system - Optional system message
   * @param {number} options.maxTokens - Maximum tokens to generate (default: 4096)
   * @param {number} options.temperature - Sampling temperature (default: 0.7)
   * @param {number} options.topP - Top-p sampling (default: 0.9)
   * @param {boolean} options.stream - Whether to stream responses (default: false)
   * @returns {Promise<object>} Chat completion response
   */
  async createMessage(options = {}) {
    const {
      messages = [],
      system,
      maxTokens = 4096,
      temperature = 0.7,
      topP = 0.9,
      stream = false
    } = options;

    logger.info('GLM4.7 createMessage requested', {
      messageCount: messages.length,
      hasSystem: !!system,
      maxTokens,
      temperature,
      stream
    });

    // Validate messages
    if (!messages || messages.length === 0) {
      throw new Error('Messages array is required');
    }

    // Check if API key is configured
    if (!this.isConfigured()) {
      logger.warn('GLM47 not configured, returning mock response');
      return this._getMockResponse(messages[messages.length - 1]?.content || '');
    }

    // Build request body in Anthropic format
    const requestBody = {
      model: this.model,
      messages: messages,
      max_tokens: maxTokens,
      temperature: temperature,
      top_p: topP,
      stream: stream
    };

    // Add system message if provided
    if (system) {
      requestBody.system = system;
    }

    // Make API call with retry logic
    let lastError;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this._makeRequest(requestBody);
        return response;
      } catch (error) {
        lastError = error;
        logger.warn('GLM4.7 API call failed, retrying', {
          attempt: attempt + 1,
          maxRetries: this.maxRetries,
          error: error.message
        });

        // Wait before retry (exponential backoff)
        if (attempt < this.maxRetries - 1) {
          await new Promise(resolve =>
            setTimeout(resolve, this.retryDelay * Math.pow(2, attempt))
          );
        }
      }
    }

    // All retries failed
    logger.error('GLM4.7 API call failed after all retries', {
      error: lastError.message,
      stack: lastError.stack
    });

    throw new Error(`GLM4.7 API failed after ${this.maxRetries} retries: ${lastError.message}`);
  }

  /**
   * Create a streaming chat completion
   *
   * @param {object} options - Chat completion options
   * @param {Array} options.messages - Array of message objects
   * @param {string} options.system - Optional system message
   * @param {number} options.maxTokens - Maximum tokens to generate
   * @param {function} options.onChunk - Callback for each chunk (chunk) => {}
   * @returns {Promise<object>} Final completion response
   */
  async createMessageStream(options = {}, onChunk) {
    const {
      messages = [],
      system,
      maxTokens = 4096,
      temperature = 0.7,
      topP = 0.9
    } = options;

    logger.info('GLM4.7 createMessageStream requested', {
      messageCount: messages.length,
      hasSystem: !!system,
      maxTokens
    });

    // Validate messages
    if (!messages || messages.length === 0) {
      throw new Error('Messages array is required');
    }

    // Validate callback
    if (typeof onChunk !== 'function') {
      throw new Error('onChunk callback is required for streaming');
    }

    // Check if API key is configured
    if (!this.isConfigured()) {
      logger.warn('GLM47 not configured, returning mock stream');
      return this._getMockStreamResponse(messages[messages.length - 1]?.content || '', onChunk);
    }

    // Build request body
    const requestBody = {
      model: this.model,
      messages: messages,
      max_tokens: maxTokens,
      temperature: temperature,
      top_p: topP,
      stream: true
    };

    // Add system message if provided
    if (system) {
      requestBody.system = system;
    }

    try {
      // Make streaming request
      const response = await this._makeStreamRequest(requestBody, onChunk);
      return response;
    } catch (error) {
      logger.error('GLM4.7 streaming failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Make API request to GLM4.7
   * @private
   */
  async _makeRequest(requestBody) {
    const url = `${this.endpoint}/v1/messages`;

    logger.debug('Making GLM4.7 API request', {
      url,
      model: requestBody.model,
      messageCount: requestBody.messages?.length
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GLM4.7 API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      logger.info('GLM4.7 API request successful', {
        responseId: data.id,
        finishReason: data.stop_reason
      });

      // Return in Anthropic format
      return {
        id: data.id || `glm-${Date.now()}`,
        type: 'message',
        role: 'assistant',
        content: data.content || [
          {
            type: 'text',
            text: data.message?.content || data.text || ''
          }
        ],
        model: data.model || this.model,
        stopReason: data.stop_reason || data.finish_reason || 'stop',
        stopSequence: data.stop_sequence || null,
        usage: {
          inputTokens: data.usage?.input_tokens || data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.output_tokens || data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0
        }
      };

    } catch (error) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        throw new Error(`GLM4.7 API timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Make streaming API request to GLM4.7
   * @private
   */
  async _makeStreamRequest(requestBody, onChunk) {
    const url = `${this.endpoint}/v1/messages`;

    logger.debug('Making GLM4.7 streaming request', {
      url,
      model: requestBody.model
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GLM4.7 streaming error: ${response.status} - ${errorText}`);
      }

      // Process streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let messageId = `glm-${Date.now()}`;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              break;
            }

            try {
              const parsed = JSON.parse(data);

              // Extract content from delta
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                const text = parsed.delta.text;
                fullContent += text;

                // Call callback with chunk
                onChunk({
                  type: 'text',
                  text: text
                });
              }

              // Capture message ID
              if (parsed.message) {
                messageId = parsed.message.id;
              }

            } catch (parseError) {
              logger.warn('Failed to parse streaming chunk', {
                error: parseError.message,
                data: data.substring(0, 100)
              });
            }
          }
        }
      }

      logger.info('GLM4.7 streaming completed', {
        messageId,
        contentLength: fullContent.length
      });

      // Return final response
      return {
        id: messageId,
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: fullContent
          }
        ],
        model: this.model,
        stopReason: 'stop',
        usage: {
          inputTokens: 0, // Not available in streaming
          outputTokens: fullContent.length / 4, // Rough estimate
          totalTokens: 0
        }
      };

    } catch (error) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        throw new Error(`GLM4.7 streaming timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Generate mock response for testing (when API not configured)
   * @private
   */
  _getMockResponse(userMessage) {
    logger.info('Returning mock GLM4.7 response');

    return {
      id: `mock-${Date.now()}`,
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: `[MOCK RESPONSE] I received your message: "${userMessage.substring(0, 100)}${userMessage.length > 100 ? '...' : ''}"\n\nThis is a mock response because GLM4.7 API key is not configured. To use the actual GLM4.7 API:\n\n1. Set GLM47_API_KEY in your environment\n2. Set GLM47_API_ENDPOINT to https://api.z.ai/api/anthropic\n3. Restart the server\n\nThe GLM4.7 service is ready to use once configured.`
        }
      ],
      model: 'glm-4-plus',
      stopReason: 'stop',
      usage: {
        inputTokens: userMessage.length / 4,
        outputTokens: 50,
        totalTokens: (userMessage.length / 4) + 50
      },
      mock: true
    };
  }

  /**
   * Generate mock streaming response for testing
   * @private
   */
  async _getMockStreamResponse(userMessage, onChunk) {
    logger.info('Returning mock GLM4.7 stream');

    const mockText = `[MOCK STREAM] I received your message: "${userMessage.substring(0, 50)}..."\n\nThis is a mock streaming response. Configure GLM47_API_KEY to use the actual API.`;

    // Simulate streaming by sending chunks
    const words = mockText.split(' ');
    for (const word of words) {
      await new Promise(resolve => setTimeout(resolve, 50));
      onChunk({
        type: 'text',
        text: word + ' '
      });
    }

    return {
      id: `mock-stream-${Date.now()}`,
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: mockText
        }
      ],
      model: 'glm-4-plus',
      stopReason: 'stop',
      usage: {
        inputTokens: userMessage.length / 4,
        outputTokens: mockText.length / 4,
        totalTokens: (userMessage.length + mockText.length) / 4
      },
      mock: true
    };
  }
}

// Create singleton instance
const glmService = new GLMService();

export default glmService;
