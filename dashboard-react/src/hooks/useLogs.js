import { useState, useEffect, useCallback } from 'react';
import { fetchLogs } from '../utils/api';
// Remove mock data import
// import { generateMockLogs } from '../utils/helpers';

/**
 * Custom hook for managing logs
 * @param {Object} filters - Filters to apply to logs
 * @returns {Object} Logs state and functions
 */
const useLogs = (filters = {}) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paused, setPaused] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Function to fetch logs from the API
  const fetchLogsData = useCallback(async () => {
    if (paused) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Convert time range to date
      let since;
      if (filters.timeRange) {
        const now = new Date();
        
        switch (filters.timeRange) {
          case '5m':
            since = new Date(now.getTime() - 5 * 60 * 1000);
            break;
          case '15m':
            since = new Date(now.getTime() - 15 * 60 * 1000);
            break;
          case '1h':
            since = new Date(now.getTime() - 60 * 60 * 1000);
            break;
          case '3h':
            since = new Date(now.getTime() - 3 * 60 * 60 * 1000);
            break;
          case '6h':
            since = new Date(now.getTime() - 6 * 60 * 60 * 1000);
            break;
          case '12h':
            since = new Date(now.getTime() - 12 * 60 * 60 * 1000);
            break;
          case '1d':
            since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '7d':
            since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          default:
            since = new Date(now.getTime() - 60 * 60 * 1000); // Default to 1 hour
        }
      }
      
      console.log(`Fetching logs for page ${currentPage}, pageSize ${pageSize}`);
      
      // Calculate offset based on current page and page size
      const offset = (currentPage - 1) * pageSize;
      
      // Prepare query options
      const options = {
        limit: pageSize,
        offset: offset,
        orderBy: 'timestamp',
        orderDesc: true,
        service: filters.service || undefined,
        level: filters.logLevel || undefined,
        search: filters.logSearch || undefined,
        since: since ? since.toISOString() : undefined
      };
      
      // Fetch logs using API client
      const data = await fetchLogs(options);
      console.log('API response data:', data);
      
      // Process API response
      if (data && data.logs) {
        // Use the logs from the API response
        setLogs(data.logs);
        
        // Extract pagination information from response
        if (data.pagination) {
          setTotalItems(data.pagination.total_items || 0);
          setTotalPages(Math.max(1, data.pagination.total_pages || 1));
        } else {
          // Fallback if pagination info not provided
          setTotalItems(data.logs.length);
          setTotalPages(Math.max(1, Math.ceil(data.logs.length / pageSize)));
        }
      } else if (data && Array.isArray(data)) {
        // Handle case where API returns just an array of logs (backward compatibility)
        setLogs(data);
        setTotalItems(data.length);
        setTotalPages(Math.max(1, Math.ceil(data.length / pageSize)));
      } else {
        // Unexpected or empty response
        console.warn('Unexpected API response format:', data);
        setLogs([]);
        setTotalItems(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError(`Failed to fetch logs: ${err.message}`);
      setLogs([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, pageSize, paused]);
  
  // Fetch logs when filters, page or pageSize changes
  useEffect(() => {
    console.log(`Page changed to ${currentPage}, fetching logs...`);
    fetchLogsData();
    
    // Only set up auto-refresh if not paused
    let refreshInterval;
    if (!paused) {
      refreshInterval = setInterval(() => {
        console.log('Auto-refreshing logs...');
        fetchLogsData();
      }, 30000); // Increase refresh interval to 30 seconds to prevent frequent refreshes
    }
    
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [fetchLogsData, currentPage, pageSize, filters, paused]);
  
  // Clear all logs
  const clearLogs = useCallback(() => {
    console.log('Clearing logs');
    setLogs([]);
    setTotalItems(0);
    setTotalPages(1);
  }, []);
  
  // Toggle pause state
  const togglePause = useCallback(() => {
    console.log('Toggling pause state');
    setPaused(prev => !prev);
  }, []);
  
  // Change page
  const changePage = useCallback((page) => {
    console.log(`Changing to page ${page}`);
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);
  
  // Change page size
  const changePageSize = useCallback((size) => {
    console.log(`Changing page size to ${size}`);
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);
  
  // Manual refresh function
  const refresh = useCallback(() => {
    console.log('Manual refresh triggered');
    fetchLogsData();
  }, [fetchLogsData]);
  
  return {
    logs,
    loading,
    error,
    paused,
    pagination: {
      currentPage,
      pageSize,
      totalPages,
      totalItems,
    },
    clearLogs,
    togglePause,
    changePage,
    changePageSize,
    refresh,
  };
};

export default useLogs; 