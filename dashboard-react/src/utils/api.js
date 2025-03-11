/**
 * API Client for interacting with the Pulse backend
 */

// Base URL for API requests - we're using the proxy defined in vite.config.js
const API_BASE = '';  // Empty base means same-origin requests

// WebSocket base URL - determine dynamically
// In development, this might need to target the actual backend server directly
const WS_BASE_URL = (() => {
  // In production or when hosted on the same domain as the backend
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  
  // If running in development with vite, use the vite dev server host
  // which will proxy our WebSocket to the backend
  const host = window.location.host;
  
  return `${protocol}//${host}`;
})();

// WebSocket client state
let websocket = null;
let websocketReconnectTimer = null;
let websocketHeartbeatTimer = null;
let websocketCallbacks = {
  onMessage: () => {},
  onOpen: () => {},
  onClose: () => {},
  onError: () => {}
};

// Add a debug mode flag at the top
const DEBUG_MODE = false;

// Critical log events that should be logged even in non-debug mode
const CRITICAL_LOG_EVENTS = [
  'Error',
  'Failed',
  'Exception',
  'WebSocket connection closed'
];

const logDebug = (...args) => {
  // Always log critical errors
  const message = args.join(' ');
  const isCritical = CRITICAL_LOG_EVENTS.some(event => message.includes(event));
  
  if (DEBUG_MODE || isCritical) {
    console.log(...args);
  }
};

// Add a heartbeat mechanism to keep the connection alive
const startHeartbeat = () => {
  if (websocketHeartbeatTimer) {
    clearInterval(websocketHeartbeatTimer);
  }
  
  let missedHeartbeats = 0;
  const MISSED_HEARTBEAT_THRESHOLD = 2;
  
  // Send a ping every 20 seconds to keep the connection alive
  websocketHeartbeatTimer = setInterval(() => {
    if (websocket) {
      // Check if connection is in a good state
      if (websocket.readyState === WebSocket.OPEN) {
        try {
          // Reset missed heartbeats counter when we successfully send
          missedHeartbeats = 0;
          
          // Send a ping message with timestamp to measure latency
          const pingTime = Date.now();
          websocket.send(JSON.stringify({ 
            type: 'ping',
            timestamp: pingTime
          }));
          
          // We're not expecting responses to these pings, but
          // if we see excessive latency in future messages we can detect it
        } catch (err) {
          // Connection may have problems if send fails
          missedHeartbeats++;
          
          if (missedHeartbeats >= MISSED_HEARTBEAT_THRESHOLD) {
            logDebug('Multiple heartbeat failures detected, connection appears unhealthy');
            // Reset counter
            missedHeartbeats = 0;
            
            // Close and reconnect with a small delay to avoid immediate reconnect
            closeLogStream();
            setTimeout(() => {
              reconnectWebSocket();
            }, 1000);
          }
        }
      } else if (websocket.readyState === WebSocket.CONNECTING) {
        // If still connecting for too long, it may be stuck
        missedHeartbeats++;
        
        if (missedHeartbeats >= MISSED_HEARTBEAT_THRESHOLD) {
          logDebug('Connection appears stuck in connecting state');
          // Reset counter 
          missedHeartbeats = 0;
          
          // Close and force a new connection
          closeLogStream();
          setTimeout(() => {
            reconnectWebSocket();
          }, 2000);
        }
      } else if (websocket.readyState === WebSocket.CLOSED || websocket.readyState === WebSocket.CLOSING) {
        // Connection is already closed or closing
        logDebug('Heartbeat detected closed connection');
        clearInterval(websocketHeartbeatTimer);
        websocketHeartbeatTimer = null;
        
        // Only reconnect if not intentionally closed
        if (!isIntentionalClose) {
          setTimeout(() => {
            reconnectWebSocket();
          }, 2000);
        }
      }
    }
  }, 20000); // Every 20 seconds
};

// Cleanup heartbeat mechanism
const stopHeartbeat = () => {
  if (websocketHeartbeatTimer) {
    clearInterval(websocketHeartbeatTimer);
    websocketHeartbeatTimer = null;
  }
};

// Add connection state tracking
let isIntentionalClose = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10; // Increased max attempts
const BASE_RECONNECT_DELAY = 2000; // Start with 2 seconds
let lastReconnectTime = 0;
const RECONNECT_COOLDOWN = 5000; // Minimum time between reconnects

// Flag to enable mock data in development (set to false to use real API)
const USE_MOCK_DATA = false;

/**
 * Handles API errors and formats them consistently
 * @param {Response} response - Fetch Response object
 * @returns {Promise} Resolved with JSON data or rejected with error
 */
const handleResponse = async (response) => {
  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    
    // Log detailed information about the failed response
    console.error(`API Response Error: ${response.status} ${response.statusText}`);
    console.error(`URL: ${response.url}`);
    console.error(`Content-Type: ${contentType}`);
    
    if (contentType && contentType.includes('application/json')) {
      // Try to parse error JSON if available
      try {
        const errorData = await response.json();
        console.error('Error response JSON:', errorData);
        throw new Error(errorData.message || `${response.status} ${response.statusText}`);
      } catch (e) {
        console.error('Failed to parse error JSON:', e);
        // If JSON parsing fails, try to get the text
        try {
          const text = await response.text();
          console.error('Error response body:', text.substring(0, 1000) + (text.length > 1000 ? '...' : ''));
          throw new Error(`API Error: ${response.status} ${response.statusText} - ${text.substring(0, 100)}`);
        } catch (textError) {
          // If even text extraction fails
          throw new Error(`API Error: ${response.status} ${response.statusText} (unable to read response body)`);
        }
      }
    } else {
      // Not a JSON response
      try {
        const text = await response.text();
        console.error('Non-JSON error response:', text.substring(0, 1000) + (text.length > 1000 ? '...' : ''));
        throw new Error(`API returned non-JSON response (${response.status}): ${text.substring(0, 100)}`);
      } catch (textError) {
        // If text extraction fails
        throw new Error(`API returned non-JSON response (${response.status}) - failed to read response body`);
      }
    }
  }
  
  try {
    // For successful responses, parse JSON
    const data = await response.json();
    logDebug('Parsed API response:', data);
    return data;
  } catch (error) {
    console.error('Error parsing JSON response:', error);
    const text = await response.text();
    console.error('Response body (failed JSON parsing):', text.substring(0, 1000) + (text.length > 1000 ? '...[truncated]' : ''));
    throw new Error(`Failed to parse JSON response: ${error.message}`);
  }
};

/**
 * Fetch logs with pagination and filters
 * @param {Object} options - Query options
 * @param {number} options.limit - Max number of logs to return
 * @param {number} options.offset - Pagination offset
 * @param {string} options.service - Filter by service
 * @param {string} options.level - Filter by log level
 * @param {string} options.search - Search term
 * @param {string} options.since - ISO timestamp for start time
 * @param {string} options.until - ISO timestamp for end time
 * @param {string} options.orderBy - Field to order by
 * @param {boolean} options.orderDesc - Sort descending if true
 * @returns {Promise} Promise resolving to logs data
 */
export const fetchLogs = async (options = {}) => {
  try {
    const params = new URLSearchParams();
    
    // Add each option to query params if defined
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // Convert camelCase to snake_case for API
        const paramKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        logDebug(`Converting parameter: ${key} → ${paramKey}`);
        
        // Convert boolean values to strings
        const paramValue = typeof value === 'boolean' ? value.toString() : value.toString();
        
        // For offset and limit, ensure they are valid numbers
        if ((key === 'offset' || key === 'limit') && paramValue) {
          // Force parse as integer and ensure it's a non-negative number
          const numValue = parseInt(paramValue, 10);
          if (!isNaN(numValue) && numValue >= 0) {
            // Ensure offset is sent as an integer string
            params.append(paramKey, numValue.toString());
            logDebug(`Setting ${paramKey}=${numValue.toString()}`);
          }
        } else {
          params.append(paramKey, paramValue);
        }
      }
    });
    
    const url = `${API_BASE}/api/logs?${params.toString()}`;
    logDebug(`Fetching logs with URL: ${url}`);
    
    // Add an improved retry mechanism for better reliability
    let attempts = 0;
    const maxAttempts = 3; // Increase max attempts
    let lastError = null;
    
    while (attempts < maxAttempts) {
      try {
        attempts++;
        logDebug(`Attempt ${attempts}/${maxAttempts} to fetch logs`);
        
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json'
          },
          // Add cache control to prevent browser caching
          cache: 'no-cache',
        });
        
        const result = await handleResponse(response);
        
        // Handle different response formats for backward compatibility
        if (Array.isArray(result)) {
          // If the API returns an array directly, wrap it in a logs object
          return { 
            logs: result,
            pagination: {
              total_items: result.length,
              total_pages: Math.ceil(result.length / (options.limit || 50)),
              page_size: options.limit || 50,
              offset: options.offset || 0
            }
          };
        } else if (result && Array.isArray(result.logs)) {
          // If API returns object with logs array but no pagination
          if (!result.pagination) {
            result.pagination = {
              total_items: result.logs.length,
              total_pages: Math.ceil(result.logs.length / (options.limit || 50)),
              page_size: options.limit || 50,
              offset: options.offset || 0
            };
          }
          return result;
        } else if (result && !result.logs) {
          // If API returns an object that's not properly formatted
          console.warn('API returned unexpected format:', result);
          return {
            logs: Array.isArray(result) ? result : [],
            pagination: {
              total_items: Array.isArray(result) ? result.length : 0,
              total_pages: 1,
              page_size: options.limit || 50,
              offset: options.offset || 0
            }
          };
        }
        
        return result;
      } catch (err) {
        lastError = err;
        
        // Remove the automatic fallback to first page when pagination fails
        // This allows the error to be properly handled instead of silently changing pages
        
        if (attempts === maxAttempts) {
          throw lastError; // Re-throw after all attempts
        }
        
        console.warn(`Attempt ${attempts}/${maxAttempts} failed, retrying in ${attempts * 500}ms...`, err);
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, attempts * 500));
      }
    }
  } catch (error) {
    console.error('Error in fetchLogs:', error);
    throw error;
  }
};

/**
 * Fetch services list
 * @returns {Promise} Promise resolving to services data
 */
export const fetchServices = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/services`);
    return handleResponse(response);
  } catch (error) {
    console.error('Error in fetchServices:', error);
    throw error;
  }
};

/**
 * Fetch metrics with filters
 * @param {Object} options - Query options
 * @returns {Promise} Promise resolving to metrics data
 */
export const fetchMetrics = async (options = {}) => {
  // Real API call
  try {
    const params = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        const paramKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        params.append(paramKey, value.toString());
      }
    });
    
    const response = await fetch(`${API_BASE}/api/metrics?${params.toString()}`);
    return handleResponse(response);
  } catch (error) {
    console.error('Error in fetchMetrics:', error);
    throw error;
  }
};

/**
 * Fetch traces with filters
 * @param {Object} options - Query options
 * @returns {Promise} Promise resolving to traces data
 */
export const fetchTraces = async (options = {}) => {
  try {
    const params = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        const paramKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        params.append(paramKey, value.toString());
      }
    });
    
    const response = await fetch(`${API_BASE}/api/traces?${params.toString()}`);
    return handleResponse(response);
  } catch (error) {
    console.error('Error in fetchTraces:', error);
    throw error;
  }
};

/**
 * Fetch a specific trace by ID
 * @param {string} traceId - Trace ID
 * @returns {Promise} Promise resolving to trace data
 */
export const fetchTraceById = async (traceId) => {
  try {
    const response = await fetch(`${API_BASE}/api/traces/${traceId}`);
    return handleResponse(response);
  } catch (error) {
    console.error('Error in fetchTraceById:', error);
    throw error;
  }
};

/**
 * Fetch dashboard stats
 * @returns {Promise} Promise resolving to stats data
 */
export const fetchStats = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/stats`);
    return handleResponse(response);
  } catch (error) {
    console.error('Error in fetchStats:', error);
    throw error;
  }
};

/**
 * Create a WebSocket connection for log streaming
 * @param {Object} options - WebSocket connection options
 * @param {Function} options.onMessage - Callback for messages
 * @param {Function} options.onOpen - Callback for connection open
 * @param {Function} options.onClose - Callback for connection close
 * @param {Function} options.onError - Callback for errors
 * @param {Object} filters - Filters to apply to the log stream
 * @returns {WebSocket} The WebSocket instance
 */
export const createLogStream = (options = {}, filters = {}) => {
  // Reset reconnection attempts if this is a new intentional connection
  reconnectAttempts = 0;
  isIntentionalClose = false;

  // Store callbacks
  websocketCallbacks = {
    onMessage: options.onMessage || websocketCallbacks.onMessage,
    onOpen: options.onOpen || websocketCallbacks.onOpen,
    onClose: options.onClose || websocketCallbacks.onClose,
    onError: options.onError || websocketCallbacks.onError
  };

  // Close existing connection if any
  if (websocket) {
    websocket.close();
  }
  
  // Clear any reconnect timers
  if (websocketReconnectTimer) {
    clearTimeout(websocketReconnectTimer);
    websocketReconnectTimer = null;
  }
  
  // Construct WebSocket URL with filters
  const params = new URLSearchParams();
  
  // Add filters to URL params
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      // Convert camelCase to snake_case for API
      const paramKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      const paramValue = typeof value === 'boolean' ? value.toString() : value.toString();
      params.append(paramKey, paramValue);
    }
  });
  
  // Ensure we have at least a time range filter to avoid server issues
  if (!params.has('time_range')) {
    params.append('time_range', '1h');
  }
  
  // Use the WS_BASE_URL constant for more reliable connections
  const wsUrl = `${WS_BASE_URL}/ws/logs?${params.toString()}`;
  
  logDebug(`Connecting to logs stream at ${wsUrl}`);
  
  try {
    // Create new WebSocket connection
    websocket = new WebSocket(wsUrl);
    
    // Set up error handler
    websocket.onerror = (error) => {
      // Only log if it's a critical error
      if (error && error.message && CRITICAL_LOG_EVENTS.some(event => error.message.includes(event))) {
        console.error('WebSocket error:', error);
      }
      websocketCallbacks.onError(error);
    };
    
    // Set up close handler
    websocket.onclose = (event) => {
      // Only log non-normal closures
      if (event.code !== 1000 && event.code !== 1001) {
        logDebug(`WebSocket connection closed (code: ${event.code})`);
      }
      
      if (typeof websocketCallbacks.onClose === 'function') {
        websocketCallbacks.onClose(event);
      }
      
      // Try to reconnect if the connection was closed abnormally and not intentionally
      if (!isIntentionalClose && event.code !== 1000 && event.code !== 1001) {
        reconnectWebSocket();
      }
    };
    
    // Set up open handler
    websocket.onopen = () => {
      logDebug('WebSocket connection established successfully');
      
      // Start the heartbeat
      startHeartbeat();
      
      if (typeof websocketCallbacks.onOpen === 'function') {
        websocketCallbacks.onOpen();
      }
    };
    
    // Set up message handler with more robust parsing
    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        logDebug('WebSocket message received:', data.type, 
          data.type === 'logs' ? `(${data.logs?.length || 0} logs)` : '');
        
        if (data.type === 'logs' && (!data.logs || data.logs.length === 0)) {
          logDebug('Received empty logs array - ignoring');
          return;
        }
        
        if (typeof websocketCallbacks.onMessage === 'function') {
          websocketCallbacks.onMessage(data);
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        
        if (typeof websocketCallbacks.onError === 'function') {
          websocketCallbacks.onError(error);
        }
      }
    };
  } catch (err) {
    // Only log critical errors
    if (CRITICAL_LOG_EVENTS.some(event => err.message.includes(event))) {
      console.error('Error creating WebSocket:', err);
    }
    websocketCallbacks.onError(err);
    reconnectWebSocket();
  }
  
  return {
    close: closeLogStream
  };
};

/**
 * Reconnects the WebSocket after a delay with exponential backoff
 */
const reconnectWebSocket = () => {
  // Don't reconnect if it was intentionally closed
  if (isIntentionalClose) {
    return;
  }

  if (websocketReconnectTimer) {
    clearTimeout(websocketReconnectTimer);
  }

  // Add rate limiting to prevent connection thrashing
  const now = Date.now();
  if (now - lastReconnectTime < RECONNECT_COOLDOWN) {
    logDebug('Throttling reconnection attempts - too frequent');
    
    // Wait for cooldown before attempting again
    websocketReconnectTimer = setTimeout(() => {
      reconnectWebSocket();
    }, RECONNECT_COOLDOWN);
    
    return;
  }

  // If we've exceeded max attempts, stop trying
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.warn('Max reconnection attempts reached, giving up');
    return;
  }

  // Calculate delay with exponential backoff and jitter
  const jitter = Math.floor(Math.random() * 1000); // Random jitter up to 1 second
  const delay = Math.min(
    BASE_RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts) + jitter,
    30000 // Cap at 30 seconds
  );
  
  logDebug(`Scheduling reconnect attempt ${reconnectAttempts + 1} in ${delay}ms`);
  
  websocketReconnectTimer = setTimeout(() => {
    // Store current callbacks
    const callbacks = { ...websocketCallbacks };
    
    // Close any existing connection
    closeLogStream();
    
    // Record this reconnect attempt
    lastReconnectTime = Date.now();
    reconnectAttempts++;
    
    // Create a new connection with the same callbacks
    createLogStream(callbacks);
  }, delay);
};

/**
 * Closes the active log stream
 */
export const closeLogStream = () => {
  isIntentionalClose = true;
  
  if (websocketReconnectTimer) {
    clearTimeout(websocketReconnectTimer);
    websocketReconnectTimer = null;
  }
  
  // Stop the heartbeat
  stopHeartbeat();
  
  if (websocket) {
    // Prevent reconnect attempts when deliberately closing
    websocket.onclose = null;
    websocket.onerror = null;
    
    // Only close if not already closed
    if (websocket.readyState !== WebSocket.CLOSED && 
        websocket.readyState !== WebSocket.CLOSING) {
      // Clean close with status code 1000 (normal closure)
      websocket.close(1000, "Closed by client");
    }
    
    websocket = null;
  }
};

/**
 * Send message to the log stream
 * @param {Object} message - Message to send
 * @returns {boolean} Success status
 */
export const sendToLogStream = (message) => {
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    websocket.send(JSON.stringify(message));
    return true;
  }
  return false;
};

// Send an initial ping to verify connection is working
setTimeout(() => {
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    try {
      websocket.send(JSON.stringify({ type: 'ping' }));
      logDebug('Initial connection verification ping sent');
    } catch (e) {
      // Ignore errors on initial ping
    }
  }
}, 1000);

// Remove the metrics stream functionality 
export const createMetricsStream = () => {
  console.warn('Metrics streaming has been disabled in this version');
  return {
    close: () => {},
    setPaused: () => {}
  };
}; 