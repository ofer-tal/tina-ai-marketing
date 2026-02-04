import winston from 'winston';
import rateLimiterService from './rateLimiter.js';

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
 * GLM4.7 client using Z.AI's native OpenAI-compatible API
 *
 * Endpoint: https://api.z.ai/api/paas/v4/chat/completions
 *
 * Supported features:
 * - Chat completions with system messages
 * - Streaming responses
 * - Context window management
 * - Error handling and retries
 * - Message history management
 * - Function calling (tools)
 */
class GLMService {
  constructor() {
    this.apiKey = process.env.GLM47_API_KEY;
    this.endpoint = process.env.GLM47_API_ENDPOINT || 'https://api.z.ai/api/paas/v4';
    this.model = 'glm-4.7'; // GLM4.7 model - supports function calling
    this.timeout = 600000; // 10 minute timeout (GLM can take longer with complex tool)
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
   * Create a chat completion
   *
   * @param {object} options - Chat completion options
   * @param {Array} options.messages - Array of message objects with role and content
   * @param {string} options.system - Optional system message (will be prepended to messages)
   * @param {number} options.maxTokens - Maximum tokens to generate (default: 4096)
   * @param {number} options.temperature - Sampling temperature (default: 0.7)
   * @param {number} options.topP - Top-p sampling (default: 0.9)
   * @param {boolean} options.stream - Whether to stream responses (default: false)
   * @param {Array} options.tools - Optional tools array for function calling
   * @returns {Promise<object>} Chat completion response
   */
  async createMessage(options = {}) {
    const {
      messages = [],
      system,
      maxTokens = 4096,
      temperature = 0.7,
      topP = 0.9,
      stream = false,
      tools = null
    } = options;

    logger.info('GLM4.7 createMessage requested', {
      messageCount: messages.length,
      hasSystem: !!system,
      maxTokens,
      temperature,
      stream,
      hasTools: !!tools && tools.length > 0,
      toolCount: tools?.length || 0
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

    // Build messages array
    // NOTE: For Z.AI GLM-4.7 coding endpoint, system prompt goes in 'system' parameter
    // NOT in the messages array. Messages array should only contain user/assistant/tool messages.
    // CRITICAL: Only include OpenAI-compatible fields (role, content, name, tool_calls, tool_call_id)
    // Strip out any custom fields like timestamp, metadata, etc.
    const apiMessages = messages.map(m => {
      // Only keep OpenAI-compatible fields
      const cleanMessage = {
        role: m.role,
        content: m.content
      };

      // Add tool_calls if present (for assistant messages)
      if (m.tool_calls) {
        cleanMessage.tool_calls = m.tool_calls;
      }

      // Add tool_call_id for tool role messages
      if (m.tool_call_id) {
        cleanMessage.tool_call_id = m.tool_call_id;
      }

      // Add name for tool role messages (optional, but some implementations use it)
      if (m.name && m.role === 'tool') {
        cleanMessage.name = m.name;
      }

      return cleanMessage;
    });

    // Build request body in Z.AI format (OpenAI-compatible)
    const requestBody = {
      model: this.model,
      messages: apiMessages,
      max_tokens: maxTokens,
      temperature: temperature,
      top_p: topP,
      stream: stream
    };

    // Add tools if provided (function calling support)
    // Note: GLM doesn't support tool_choice parameter like OpenAI
    // The model automatically decides whether to use tools
    if (tools && tools.length > 0) {
      requestBody.tools = tools;
      // Don't send tool_choice - GLM will auto-determine whether to use tools
    }

    // Log the request for debugging (without sensitive data)
    logger.info('GLM4.7 API request', {
      url: `${this.endpoint}/chat/completions`,
      model: requestBody.model,
      messageCount: requestBody.messages?.length,
      hasTools: !!requestBody.tools,
      toolCount: requestBody.tools?.length || 0,
      temperature: requestBody.temperature,
      // Log detailed message structure to debug format issues
      messagesPreview: requestBody.messages?.map((m, idx) => {
        const preview = {
          index: idx,
          role: m.role,
          hasContent: !!m.content,
          contentType: typeof m.content,
          contentIsArray: Array.isArray(m.content),
          hasToolCalls: !!m.tool_calls,
          toolCallsCount: m.tool_calls?.length || 0
        };
        // For tool role, log key fields
        if (m.role === 'tool') {
          preview.tool_call_id = m.tool_call_id;
          preview.name = m.name;
          preview.contentLength = m.content?.length || 0;
        }
        // For assistant with tool_calls, log tool names
        if (m.role === 'assistant' && m.tool_calls) {
          preview.toolNames = m.tool_calls.map(tc => tc.function?.name);
        }
        return preview;
      })
    });

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

    // Build messages array
    const apiMessages = [];
    if (system) {
      apiMessages.push({ role: 'system', content: system });
    }
    apiMessages.push(...messages);

    // Build request body
    const requestBody = {
      model: this.model,
      messages: apiMessages,
      max_tokens: maxTokens,
      temperature: temperature,
      top_p: topP,
      stream: true
    };

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
   * Make API request to Z.AI GLM4.7
   * @private
   */
  async _makeRequest(requestBody) {
    const url = `${this.endpoint}/chat/completions`;

    logger.info('GLM4.7 Full request body for debugging', {
      url,
      requestBody: JSON.stringify({
        model: requestBody.model,
        messageCount: requestBody.messages?.length,
        hasTools: !!requestBody.tools,
        toolCount: requestBody.tools?.length || 0,
        toolsSample: requestBody.tools ? requestBody.tools.slice(0, 1) : null
      }, null, 2)
    });

    // Log the actual messages array structure for debugging 400 errors
    logger.info('GLM4.7 Messages structure', {
      messagesArray: JSON.stringify(requestBody.messages?.map((m, i) => {
        const msgInfo = {
          index: i,
          role: m.role
        };
        if (m.role === 'tool') {
          msgInfo.tool_call_id = m.tool_call_id;
          msgInfo.name = m.name;
          msgInfo.contentLength = m.content?.length || 0;
          msgInfo.contentPreview = m.content?.substring(0, 100);
        } else if (m.role === 'assistant') {
          if (m.tool_calls) {
            msgInfo.tool_calls = m.tool_calls.map(tc => ({
              id: tc.id,
              type: tc.type,
              name: tc.function?.name
            }));
          }
          msgInfo.contentType = typeof m.content;
          msgInfo.contentIsArray = Array.isArray(m.content);
          msgInfo.contentValue = m.content;
        } else {
          msgInfo.contentLength = m.content?.length || 0;
          msgInfo.contentPreview = m.content?.substring(0, 100);
        }
        return msgInfo;
      }), null, 2)
    });

    try {
      const requestBodyJson = JSON.stringify(requestBody);
      logger.info('GLM4.7 Request JSON preview (first 3000 chars)', {
        preview: requestBodyJson.substring(0, 3000) + (requestBodyJson.length > 3000 ? '...' : '')
      });

      // Use rate limiter for all GLM API requests
      const response = await rateLimiterService.fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: requestBodyJson,
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GLM4.7 API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      logger.info('GLM4.7 API request successful', {
        responseId: data.id,
        finishReason: data.choices?.[0]?.finish_reason
      });

      // Check if response contains tool calls
      const choice = data.choices?.[0];
      const message = choice?.message;

      if (message?.tool_calls && message.tool_calls.length > 0) {
        // Return tool_use response for function calling
        // Include ALL tool calls for parallel execution
        const toolCalls = message.tool_calls.map(tc => ({
          id: tc.id,
          name: tc.function.name,
          parameters: JSON.parse(tc.function.arguments || '{}')
        }));

        return {
          id: data.id || `glm-${Date.now()}`,
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: message.content || ''
            }
          ],
          model: data.model || this.model,
          stopReason: 'tool_calls',
          usage: {
            inputTokens: data.usage?.prompt_tokens || 0,
            outputTokens: data.usage?.completion_tokens || 0,
            totalTokens: data.usage?.total_tokens || 0
          },
          // Convenience property - first tool call (for backward compatibility)
          toolCall: toolCalls[0],
          // All tool calls for parallel execution
          toolCalls: toolCalls,
          rawToolCalls: message.tool_calls
        };
      }

      // Return in Anthropic-compatible format for consistency with rest of codebase
      return {
        id: data.id || `glm-${Date.now()}`,
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: message?.content || ''
          }
        ],
        model: data.model || this.model,
        stopReason: choice?.finish_reason || 'stop',
        stopSequence: null,
        usage: {
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
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
    const url = `${this.endpoint}/chat/completions`;

    logger.debug('Making GLM4.7 streaming request', {
      url,
      model: requestBody.model
    });

    try {
      // Use rate limiter for all GLM API requests
      const response = await rateLimiterService.fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
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
              if (parsed.choices?.[0]?.delta?.content) {
                const text = parsed.choices[0].delta.content;
                fullContent += text;

                // Call callback with chunk
                onChunk({
                  type: 'text',
                  text: text
                });
              }

              // Capture message ID
              if (parsed.id) {
                messageId = parsed.id;
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
          text: `[MOCK RESPONSE] I received your message: "${userMessage.substring(0, 100)}${userMessage.length > 100 ? '...' : ''}"\n\nThis is a mock response because GLM4.7 API key is not configured. To use the actual GLM4.7 API:\n\n1. Set GLM47_API_KEY in your environment\n2. Set GLM47_API_ENDPOINT to https://api.z.ai/api/paas/v4\n3. Restart the server\n\nThe GLM4.7 service is ready to use once configured.`
        }
      ],
      model: 'glm-4.7',
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
      model: 'glm-4.7',
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
