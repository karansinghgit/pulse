import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchLogs, createLogStream, closeLogStream } from '../utils/api';
// Remove mock data import
// import { generateMockLogs } from '../utils/helpers';

// Add debug mode flag
const DEBUG_MODE = false;

// Critical log events that should be logged even in non-debug mode
const CRITICAL_LOG_EVENTS = [
  'Error',
  'Failed',
  'Exception'
];

const logDebug = (...args) => {
  // Only log in debug mode or for critical errors
  const message = args.join(' ');
  const isCritical = message.includes('Error') || message.includes('Failed');
  if (DEBUG_MODE || isCritical) {
    console.log('[Logs]', ...args);
  }
};

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
  const [streaming, setStreaming] = useState(false);
  
  // Add refs for stable streaming state management
  const stableStreamingRef = useRef(false);
  const streamingStateTimeout = useRef(null);
  const streamingUpdateCount = useRef(0);
  
  // Refs to hold the latest state values inside callbacks
  const filtersRef = useRef(filters);
  const pausedRef = useRef(paused);
  const logsRef = useRef(logs);
  
  // Update refs when state changes
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);
  
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  
  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Function to fetch logs from the API
  const fetchLogsData = useCallback(async (isInitialLoad = false) => {
    // Skip if streaming is active and this isn't the initial load
    if (streaming && !isInitialLoad && !paused) return;
    
    try {
      if (isInitialLoad) setLoading(true);
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
      
      logDebug(`Fetching logs for page ${currentPage}, pageSize ${pageSize}`);
      
      // Calculate offset based on current page and page size
      // Make sure offset is an integer and >= 0
      const offset = Math.max(0, (currentPage - 1) * pageSize);
      
      // Prepare query options - explicitly set all filter values
      const options = {
        limit: pageSize,
        // Convert offset to a string to avoid issues with large integers
        offset: String(offset),
        orderBy: 'timestamp',
        orderDesc: true,
        // Only include filters if they have values
        service: filters.service || undefined,
        level: filters.logLevel || undefined,
        search: filters.logSearch || undefined,
        since: since ? since.toISOString() : undefined
      };
      
      logDebug('API request options:', options);
      
      // Fetch logs using API client
      const data = await fetchLogs(options);
      logDebug('API response data:', data);
      
      // Process API response
      if (data && data.logs) {
        // Use the logs from the API response
        setLogs(data.logs);
        
        // Extract pagination information from response
        if (data.pagination) {
          setTotalItems(data.pagination.total_items || 0);
          setTotalPages(Math.max(1, data.pagination.total_pages || 1));
          
          // Update current page if it's out of bounds
          if (currentPage > data.pagination.total_pages && data.pagination.total_pages > 0) {
            setCurrentPage(1);
          }
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
        logDebug('Unexpected API response format:', data);
        setLogs([]);
        setTotalItems(0);
        setTotalPages(1);
      }
      
      // After initial load, try to initiate streaming if not paused
      if (isInitialLoad && !paused && currentPage === 1) {
        logDebug('Initial load complete and not paused, starting streaming');
        initLogStreaming();
      } else if (isInitialLoad) {
        logDebug('Initial load complete but not starting streaming:', 
          paused ? 'paused' : '', 
          currentPage !== 1 ? 'not on first page' : '');
      }
    } catch (err) {
      logDebug('Error fetching logs:', err);
      setError(`Failed to fetch logs: ${err.message}`);
      setLogs([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, pageSize, paused, streaming]);
  
  // Initialize WebSocket log streaming
  const initLogStreaming = useCallback(() => {
    if (currentPage !== 1 || pausedRef.current) {
      logDebug('Not starting streaming: currentPage =', currentPage, 'paused =', pausedRef.current);
      setStreaming(false);
      return;
    }
    
    logDebug('Initializing log streaming...');
    closeLogStream();

    let logBuffer = [];
    let updateTimeout = null;
    let lastUpdate = Date.now();
    let isConnecting = false;
    let reconnectTimeout = null;
    let errorTimeout = null;
    let errorShown = false;
    let consecutiveErrors = 0;
    let lastErrorTime = 0;
    let streamingStateChangeTimeout = null;
    
    setTimeout(() => {
      if (isConnecting) return;
      isConnecting = true;

      createLogStream({
        onMessage: (data) => {
          // Reset error counters on successful message
          consecutiveErrors = 0;
          lastErrorTime = 0;
          
          if (pausedRef.current || currentPage !== 1) {
            return;
          }
          
          // Update streaming state if receiving messages
          if (!stableStreamingRef.current) {
            updateStreamingState(true);
          }
          
          // Clear error state and any pending error timeouts
          if (errorShown) {
            setError(null);
            errorShown = false;
          }
          if (errorTimeout) {
            clearTimeout(errorTimeout);
            errorTimeout = null;
          }
          
          // Handle heartbeat messages
          if (data && (data.type === 'ping' || data.type === 'pong')) {
            // Just a heartbeat - connection is alive
            return;
          }
          
          // Process message data
          if (data && data.type === 'log') {
            const processedLog = {...data};
            if (!processedLog.tags) {
              processedLog.tags = {};
            }
            if (!processedLog.id) {
              processedLog.id = `generated-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
            }
            if (!logsRef.current.some(log => log.id === processedLog.id)) {
              logBuffer.push(processedLog);
              scheduleUpdate();
            }
          } else if (data && data.type === 'logs' && Array.isArray(data.payload)) {
            if (data.payload.length === 0) return;
            
            const newLogs = data.payload.map(log => ({
              ...log,
              tags: log.tags || {},
              id: log.id || `generated-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
            }));
            
            const uniqueNewLogs = newLogs.filter(newLog => 
              !logsRef.current.some(existingLog => existingLog.id === newLog.id)
            );
            
            if (uniqueNewLogs.length > 0) {
              logBuffer = [...logBuffer, ...uniqueNewLogs];
              scheduleUpdate();
            }
          }
          
          // Only update streaming state if it changed and has been stable for a while
          if (!streaming) {
            // Use a much longer debounce to avoid flickering UI
            clearTimeout(streamingStateChangeTimeout);
            streamingStateChangeTimeout = setTimeout(() => {
              setStreaming(true);
            }, 1000);
          }
        },
        onOpen: () => {
          logDebug('Log streaming started');
          isConnecting = false;
          
          // Use the new streaming state management
          updateStreamingState(true);
          
          setError(null);
          errorShown = false;
          consecutiveErrors = 0;
          lastErrorTime = 0;
          
          if (errorTimeout) {
            clearTimeout(errorTimeout);
            errorTimeout = null;
          }
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
          }
          
          fetchLogsData(true);
        },
        onClose: () => {
          logDebug('Log streaming stopped');
          isConnecting = false;
          
          // Use the new streaming state management
          updateStreamingState(false);
          
          if (updateTimeout) {
            clearTimeout(updateTimeout);
            updateTimeout = null;
          }

          if (currentPage === 1 && !pausedRef.current) {
            if (reconnectTimeout) {
              clearTimeout(reconnectTimeout);
            }
            
            // Exponential backoff for reconnection attempts
            const jitter = Math.random() * 1000;
            const backoffDelay = Math.min(2000 * Math.pow(1.5, consecutiveErrors), 15000) + jitter;
            
            reconnectTimeout = setTimeout(() => {
              if (currentPage === 1 && !pausedRef.current) {
                initLogStreaming();
              }
            }, backoffDelay);
          }
        },
        onError: (err) => {
          isConnecting = false;
          
          const now = Date.now();
          
          if (now - lastErrorTime > 10000) {
            consecutiveErrors = 0;
          }
          
          consecutiveErrors++;
          lastErrorTime = now;
          
          if (consecutiveErrors >= 5 && !errorShown) {
            if (errorTimeout) {
              clearTimeout(errorTimeout);
            }
            
            errorTimeout = setTimeout(() => {
              if (consecutiveErrors >= 5) {
                logDebug('Persistent connection issues detected');
                setError('Connection issues detected. Attempting to restore connection...');
                errorShown = true;
                
                // Use the new streaming state management
                updateStreamingState(false);
              }
            }, 5000);
          }
          
          if (updateTimeout) {
            clearTimeout(updateTimeout);
            updateTimeout = null;
          }
        }
      }, filtersRef.current);
    }, 500);

    // Improved update scheduling with more aggressive batching
    const scheduleUpdate = () => {
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      
      const now = Date.now();
      
      // Always collect more logs before updating UI
      // Only update if we have a significant batch or it's been a while
      if ((now - lastUpdate > 2000 && logBuffer.length > 0) || logBuffer.length > 25) {
        applyUpdate();
        return;
      }
      
      // Otherwise use a longer debounce to reduce UI updates
      updateTimeout = setTimeout(() => {
        if (logBuffer.length > 0) {
          applyUpdate();
        }
      }, 800); // Much longer debounce to reduce UI updates
    };
    
    // Function to apply the batched updates
    const applyUpdate = () => {
      if (logBuffer.length > 0) {
        setLogs(prevLogs => {
          const newLogs = [...logBuffer, ...prevLogs];
          
          const uniqueLogs = newLogs.filter((log, index, self) => 
            index === self.findIndex(l => l.id === log.id)
          );
          
          uniqueLogs.sort((a, b) => {
            const timestampA = new Date(a.timestamp || 0).getTime();
            const timestampB = new Date(b.timestamp || 0).getTime();
            return timestampB - timestampA;
          });
          
          const memoryLimit = pageSize * 3;
          if (uniqueLogs.length > memoryLimit) {
            uniqueLogs.length = memoryLimit;
          }
          
          return uniqueLogs;
        });
        
        logBuffer.length = 0;
        lastUpdate = Date.now();
      }
    };
    
    return () => {
      // Clean up all timeouts
      if (updateTimeout) clearTimeout(updateTimeout);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (errorTimeout) clearTimeout(errorTimeout);
    };
  }, [currentPage, pageSize, closeLogStream, createLogStream, fetchLogsData]);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);
  
  // Initial load and handle stream connection
  useEffect(() => {
    // Initial data load
    fetchLogsData(true);
    
    // Test WebSocket connectivity (without actually starting streaming)
    const testConnection = async () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        
        // Use the same parameters as the real connection would use
        const params = new URLSearchParams();
        
        // Add time_range parameter at minimum to avoid server issues
        params.append('time_range', filtersRef.current.timeRange || '1h');
        
        // Add service filter if available
        if (filtersRef.current.service) {
          params.append('service', filtersRef.current.service);
        }
        
        const testUrl = `${protocol}//${host}/ws/logs?${params.toString()}`;
        
        const testSocket = new WebSocket(testUrl);
        
        testSocket.onopen = () => {
          // Only log essential information
          logDebug('WebSocket connected - starting log streaming');
          // Now we know WebSocket works, initialize the real streaming if needed
          if (currentPage === 1 && !pausedRef.current) {
            initLogStreaming();
          }
          testSocket.close(1000, 'Test complete');
        };
        
        testSocket.onerror = (error) => {
          logDebug('WebSocket connection failed');
          setError('Unable to establish WebSocket connection. Real-time updates will not work.');
          
          // Still fetch logs using regular HTTP
          fetchLogsData();
        };
      } catch (error) {
        logDebug('Error setting up WebSocket test:', error.message);
        setError('Error setting up WebSocket connection: ' + error.message);
      }
    };
    
    // Run the test
    testConnection();
    
    return () => {
      // Clean up WebSocket connection when component unmounts
      closeLogStream();
    };
  }, [fetchLogsData]);
  
  // Handle page changes - disable streaming for non-first pages
  useEffect(() => {
    if (currentPage !== 1) {
      // Close streaming and do regular fetch for non-first pages
      logDebug('Not on first page, closing stream and fetching data');
      closeLogStream();
      setStreaming(false);
      setPaused(true); // Explicitly pause when not on page 1
      fetchLogsData();
    } else if (!paused) {
      // For first page, use streaming if not paused
      logDebug('On first page and not paused, starting streaming');
      // Ensure we close any existing stream before starting a new one
      closeLogStream();
      setPaused(false); // Ensure pause is explicitly off when returning to page 1
      // Small delay to ensure any previous connection is fully closed
      setTimeout(() => {
        initLogStreaming();
      }, 100);
    } else {
      logDebug('On first page but paused, not starting streaming');
      // Ensure streaming is disabled when paused
      closeLogStream();
      setStreaming(false);
    }
  }, [currentPage, paused, fetchLogsData, initLogStreaming, closeLogStream]);
  
  // Clear all logs
  const clearLogs = useCallback(() => {
    logDebug('Clearing logs');
    setLogs([]);
    setTotalItems(0);
    setTotalPages(1);
  }, []);
  
  // Toggle pause state
  const togglePause = useCallback(() => {
    setPaused(prev => {
      const newPaused = !prev;
      logDebug(`${newPaused ? 'Pausing' : 'Resuming'} log streaming`);
      
      if (!newPaused && currentPage === 1) {
        // If unpausing and on first page, restart streaming
        logDebug('Starting streaming on page 1');
        
        // Close any existing stream first
        closeLogStream();
        
        // Fetch initial data and then start streaming
        fetchLogsData(true).then(() => {
          // Wait a bit longer before starting the stream to ensure clean state
          setTimeout(() => {
            if (!pausedRef.current && currentPage === 1) {
              logDebug('Initializing new log stream after unpause');
              initLogStreaming();
            }
          }, 1000);
        });
      } else if (newPaused) {
        // If pausing, close the stream
        logDebug('Explicitly closing stream on pause');
        closeLogStream();
        setStreaming(false);
      }
      
      return newPaused;
    });
  }, [currentPage, initLogStreaming, closeLogStream, fetchLogsData]);
  
  // Change page
  const changePage = useCallback((page) => {
    logDebug(`Changing to page ${page}`);
    if (page >= 1 && page <= totalPages) {
      // If moving away from page 1, ensure streaming is stopped
      if (page !== 1) {
        logDebug('Moving away from page 1, stopping streaming');
        closeLogStream();
        setStreaming(false);
        setPaused(true);
      } else if (currentPage !== 1) {
        // Coming back to page 1
        logDebug('Returning to page 1');
        // Close any existing streams when returning to page 1
        closeLogStream();
        setStreaming(false);
        // We need to reset the paused state when returning to page 1
        // This will allow resuming to work correctly
        setPaused(true);
      }
      
      setCurrentPage(page);
      
      // Always fetch new data when changing pages
      fetchLogsData();
    } else {
      logDebug(`Invalid page number: ${page}. Must be between 1 and ${totalPages}`);
    }
  }, [totalPages, currentPage, closeLogStream, fetchLogsData]);
  
  // Change page size
  const changePageSize = useCallback((size) => {
    logDebug(`Changing page size to ${size}`);
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);
  
  // Manual refresh function
  const refresh = useCallback(() => {
    logDebug('Manual refresh triggered');
    fetchLogsData(true);
  }, [fetchLogsData]);
  
  // Add function to update streaming state with stability checks
  const updateStreamingState = useCallback((newState) => {
    if (streamingStateTimeout.current) {
      clearTimeout(streamingStateTimeout.current);
    }
    
    if (newState === stableStreamingRef.current) {
      // If the state isn't changing, just ensure UI matches stable state
      setStreaming(newState);
      return;
    }
    
    if (newState) {
      // When turning streaming on, increment update count
      streamingUpdateCount.current++;
      
      // Wait for state to be stable before updating UI
      streamingStateTimeout.current = setTimeout(() => {
        if (streamingUpdateCount.current >= 3) {
          stableStreamingRef.current = true;
          setStreaming(true);
        }
        streamingUpdateCount.current = 0;
      }, 2000); // Longer delay for stability
    } else {
      // When turning streaming off, reset immediately
      streamingUpdateCount.current = 0;
      stableStreamingRef.current = false;
      setStreaming(false);
    }
  }, []);
  
  // Update cleanup in useEffect
  useEffect(() => {
    if (streamingStateTimeout.current) {
      clearTimeout(streamingStateTimeout.current);
    }
    return () => {
      if (streamingStateTimeout.current) {
        clearTimeout(streamingStateTimeout.current);
      }
    };
  }, []);
  
  return {
    logs,
    loading,
    error,
    paused,
    streaming,
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