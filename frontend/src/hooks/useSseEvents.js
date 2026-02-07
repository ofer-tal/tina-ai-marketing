/**
 * SSE (Server-Sent Events) Hook
 *
 * Manages SSE connection lifecycle for real-time updates.
 * Handles connection states, auto-reconnect, and event parsing.
 *
 * @typedef {import('react').RefObject<SSEConnectionState>} SSEConnectionStateRef
 *
 * Usage:
 * ```jsx
 * const { isConnected, events, error } = useSseEvents({
 *   onPostCreated: (post) => { ... },
 *   onPostUpdated: (post) => { ... },
 *   onPostDeleted: (postId) => { ... },
 *   onPostStatusChanged: (data) => { ... },
 *   onPostProgress: (data) => { ... },
 *   onResumed: () => { ... }  // Called when reconnecting after tab was hidden
 * });
 * ```
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// Connection states
export const SSE_STATE = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error',
  CLOSED: 'closed'
};

/**
 * @typedef {typeof SSE_STATE[keyof typeof SSE_STATE]} SSEConnectionState
 */

/**
 * Default options
 */
const DEFAULT_OPTIONS = {
  // SSE endpoint URL
  url: '/api/events',

  // Reconnection settings
  reconnect: true,
  reconnectInterval: 1000, // Initial reconnect delay (ms)
  maxReconnectInterval: 30000, // Max reconnect delay (ms)
  reconnectDecay: 1.5, // Exponential backoff multiplier

  // Connection timeout
  connectionTimeout: 10000, // 10 seconds

  // Pause when tab is hidden
  pauseOnHidden: true,

  // Optional user ID for user-specific events
  userId: null
};

/**
 * SSE hook for real-time updates
 * @param {Object} options - Hook options
 * @param {Function} [options.onPostCreated] - Called when post created
 * @param {Function} [options.onPostUpdated] - Called when post updated
 * @param {Function} [options.onPostDeleted] - Called when post deleted
 * @param {Function} [options.onPostStatusChanged] - Called when status changed
 * @param {Function} [options.onPostProgress] - Called when progress updates
 * @param {Function} [options.onPostMetricsUpdated] - Called when metrics updated
 * @param {Function} [options.onConnected] - Called when connection established
 * @param {Function} [options.onError] - Called when connection error occurs
 * @param {Function} [options.onClosed] - Called when connection closed
 * @param {Function} [options.onResumed] - Called when connection resumes after being paused (tab hidden)
 * @param {string} [options.url] - SSE endpoint URL
 * @param {boolean} [options.reconnect] - Enable auto-reconnect
 * @param {number} [options.reconnectInterval] - Initial reconnect interval
 * @param {number} [options.maxReconnectInterval] - Max reconnect interval
 * @param {number} [options.reconnectDecay] - Reconnect backoff multiplier
 * @param {boolean} [options.pauseOnHidden] - Pause when tab hidden
 * @param {string} [options.userId] - Optional user ID
 * @returns {Object} Hook state
 */
export function useSseEvents(options = {}) {
  const {
    onPostCreated,
    onPostUpdated,
    onPostDeleted,
    onPostStatusChanged,
    onPostProgress,
    onPostMetricsUpdated,
    onConnected,
    onError,
    onClosed,
    onResumed,
    url = DEFAULT_OPTIONS.url,
    reconnect = DEFAULT_OPTIONS.reconnect,
    reconnectInterval = DEFAULT_OPTIONS.reconnectInterval,
    maxReconnectInterval = DEFAULT_OPTIONS.maxReconnectInterval,
    reconnectDecay = DEFAULT_OPTIONS.reconnectDecay,
    pauseOnHidden = DEFAULT_OPTIONS.pauseOnHidden,
    userId = DEFAULT_OPTIONS.userId
  } = options;

  // Connection state
  const [connectionState, setConnectionState] = useState(SSE_STATE.DISCONNECTED);
  const [error, setError] = useState(null);

  // Refs for EventSource management
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const currentReconnectIntervalRef = useRef(reconnectInterval);
  const isPausedRef = useRef(false);
  const shouldReconnectRef = useRef(reconnect);

  // Ref for visibility change handler
  const visibilityHandlerRef = useRef(null);

  /**
   * Clean up connection
   */
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  /**
   * Handle connection error
   */
  const handleError = useCallback((err) => {
    setConnectionState(SSE_STATE.ERROR);
    setError(err?.message || 'Connection error');

    if (onError) {
      onError(err);
    }

    // Attempt reconnection if enabled and not paused
    if (shouldReconnectRef.current && !isPausedRef.current) {
      const delay = Math.min(
        currentReconnectIntervalRef.current,
        maxReconnectInterval
      );

      console.log(`[SSE] Reconnecting in ${delay}ms...`);

      reconnectTimeoutRef.current = setTimeout(() => {
        currentReconnectIntervalRef.current = Math.floor(
          currentReconnectIntervalRef.current * reconnectDecay
        );
        connect();
      }, delay);
    }
  }, [maxReconnectInterval, reconnectDecay, onError]);

  /**
   * Handle connection open
   */
  const handleOpen = useCallback(() => {
    setConnectionState(SSE_STATE.CONNECTED);
    setError(null);
    currentReconnectIntervalRef.current = reconnectInterval; // Reset reconnect delay

    console.log('[SSE] Connected');

    if (onConnected) {
      onConnected();
    }
  }, [reconnectInterval, onConnected]);

  /**
   * Handle connection event
   */
  const handleMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('[SSE] Message received:', event.type, data);

      switch (event.type) {
        case 'connected':
          // Initial connection confirmation
          console.log('[SSE] Connection confirmed:', data);
          break;

        case 'post.created':
          if (onPostCreated) {
            onPostCreated(data.post);
          }
          break;

        case 'post.updated':
          if (onPostUpdated) {
            onPostUpdated(data.post);
          }
          break;

        case 'post.deleted':
          if (onPostDeleted) {
            onPostDeleted(data.postId);
          }
          break;

        case 'post.status_changed':
          if (onPostStatusChanged) {
            onPostStatusChanged(data);
          }
          break;

        case 'post.progress':
          if (onPostProgress) {
            onPostProgress(data);
          }
          break;

        case 'post.metrics_updated':
          if (onPostMetricsUpdated) {
            onPostMetricsUpdated(data);
          }
          break;

        default:
          console.log('[SSE] Unknown event type:', event.type);
      }
    } catch (err) {
      console.error('[SSE] Failed to parse event data:', err);
    }
  }, [
    onPostCreated,
    onPostUpdated,
    onPostDeleted,
    onPostStatusChanged,
    onPostProgress,
    onPostMetricsUpdated
  ]);

  /**
   * Establish SSE connection
   */
  const connect = useCallback(() => {
    if (eventSourceRef.current || isPausedRef.current) {
      return;
    }

    setConnectionState(SSE_STATE.CONNECTING);
    setError(null);

    // Build URL with query parameters
    const urlObj = new URL(url, window.location.origin);
    if (userId) {
      urlObj.searchParams.append('userId', userId);
    }

    console.log('[SSE] Connecting to:', urlObj.toString());

    try {
      const eventSource = new EventSource(urlObj.toString());
      eventSourceRef.current = eventSource;

      // Set up event handlers
      eventSource.onopen = handleOpen;
      eventSource.onerror = handleError;

      // Register for specific event types
      eventSource.addEventListener('connected', handleMessage);
      eventSource.addEventListener('post.created', handleMessage);
      eventSource.addEventListener('post.updated', handleMessage);
      eventSource.addEventListener('post.deleted', handleMessage);
      eventSource.addEventListener('post.status_changed', handleMessage);
      eventSource.addEventListener('post.progress', handleMessage);
      eventSource.addEventListener('post.metrics_updated', handleMessage);

    } catch (err) {
      handleError(err);
    }
  }, [url, userId, handleOpen, handleError, handleMessage]);

  /**
   * Disconnect (manual)
   */
  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    cleanup();
    setConnectionState(SSE_STATE.CLOSED);

    if (onClosed) {
      onClosed();
    }
  }, [cleanup, onClosed]);

  /**
   * Reconnect (manual)
   */
  const reconnectConnection = useCallback(() => {
    cleanup();
    shouldReconnectRef.current = true;
    currentReconnectIntervalRef.current = reconnectInterval;
    connect();
  }, [cleanup, reconnectInterval, connect]);

  /**
   * Pause connection (when tab hidden)
   */
  const pause = useCallback(() => {
    if (!isPausedRef.current) {
      isPausedRef.current = true;
      cleanup();
      setConnectionState(SSE_STATE.DISCONNECTED);
      console.log('[SSE] Paused');
    }
  }, [cleanup]);

  /**
   * Resume connection (when tab visible)
   */
  const resume = useCallback(() => {
    if (isPausedRef.current) {
      isPausedRef.current = false;
      if (shouldReconnectRef.current) {
        connect();
      }
      console.log('[SSE] Resumed');

      // Notify component that connection was resumed (may need to refresh data)
      if (onResumed) {
        onResumed();
      }
    }
  }, [connect, onResumed]);

  // Set up visibility change handler
  useEffect(() => {
    if (!pauseOnHidden) {
      return;
    }

    visibilityHandlerRef.current = () => {
      if (document.hidden) {
        pause();
      } else {
        resume();
      }
    };

    document.addEventListener('visibilitychange', visibilityHandlerRef.current);

    return () => {
      if (visibilityHandlerRef.current) {
        document.removeEventListener('visibilitychange', visibilityHandlerRef.current);
      }
    };
  }, [pauseOnHidden, pause, resume]);

  // Initial connection
  useEffect(() => {
    if (shouldReconnectRef.current) {
      connect();
    }

    return () => {
      cleanup();
    };
  }, [connect, cleanup]);

  return {
    // Connection state
    isConnected: connectionState === SSE_STATE.CONNECTED,
    isConnecting: connectionState === SSE_STATE.CONNECTING,
    connectionState,
    error,

    // Manual controls
    disconnect,
    reconnect: reconnectConnection,
    pause,
    resume
  };
}

export default useSseEvents;
