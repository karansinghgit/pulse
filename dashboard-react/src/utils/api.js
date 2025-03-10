/**
 * API Client for interacting with the Pulse backend
 */

// Base URL for API requests - we're using the proxy defined in vite.config.js
const API_BASE = '';  // Empty base means same-origin requests

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
    console.log('Parsed API response:', data);
    return data;
  } catch (error) {
    console.error('Error parsing JSON response:', error);
    const text = await response.text();
    console.error('Response body (failed JSON parsing):', text.substring(0, 1000) + (text.length > 1000 ? '...' : ''));
    throw new Error('Invalid JSON response from server');
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
        console.log(`Converting parameter: ${key} → ${paramKey}`);
        
        // Convert boolean values to strings
        const paramValue = typeof value === 'boolean' ? value.toString() : value.toString();
        
        // For offset and limit, ensure they are valid numbers
        if ((key === 'offset' || key === 'limit') && paramValue) {
          // Force parse as integer and ensure it's a non-negative number
          const numValue = parseInt(paramValue, 10);
          if (!isNaN(numValue) && numValue >= 0) {
            // Ensure offset is sent as an integer string
            params.append(paramKey, numValue.toString());
            console.log(`Setting ${paramKey}=${numValue.toString()}`);
          }
        } else {
          params.append(paramKey, paramValue);
        }
      }
    });
    
    const url = `${API_BASE}/api/logs?${params.toString()}`;
    console.log(`Fetching logs with URL: ${url}`);
    
    // Add an improved retry mechanism for better reliability
    let attempts = 0;
    const maxAttempts = 3; // Increase max attempts
    let lastError = null;
    
    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`Attempt ${attempts}/${maxAttempts} to fetch logs`);
        
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