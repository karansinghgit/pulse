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
    if (contentType && contentType.includes('application/json')) {
      // Try to parse error JSON if available
      try {
        const errorData = await response.json();
        throw new Error(errorData.message || `${response.status} ${response.statusText}`);
      } catch (e) {
        // If JSON parsing fails, use status text
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
    } else {
      // Not a JSON response
      const text = await response.text();
      console.error('Non-JSON response:', text.substring(0, 500) + (text.length > 500 ? '...' : ''));
      throw new Error(`API returned non-JSON response (${response.status})`);
    }
  }
  
  try {
    // For successful responses, parse JSON
    const data = await response.json();
    console.log('Parsed API response:', data);
    return data;
  } catch (error) {
    console.error('Error parsing JSON response:', error);
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
        params.append(paramKey, value.toString());
      }
    });
    
    const url = `${API_BASE}/api/logs?${params.toString()}`;
    console.log(`Fetching logs with URL: ${url}`);
    const response = await fetch(url);
    
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