import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchMetrics } from '../utils/api';

// Debug mode flag
const DEBUG_MODE = false;

// Log helper function
const logDebug = (...args) => {
  if (DEBUG_MODE) {
    console.log('[Metrics]', ...args);
  }
};

/**
 * Custom hook for fetching and managing metrics data
 * @param {Object} filters - Filters to apply to metrics queries
 * @returns {Object} Metrics state and functions
 */
const useMetrics = (filters = {}) => {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Refs to hold the latest state values inside callbacks
  const filtersRef = useRef(filters);
  
  // Update refs when state changes
  useEffect(() => {
    filtersRef.current = filters;
    // Reload metrics when filters change to ensure we have the most up-to-date data
    loadMetrics();
  }, [filters]);

  /**
   * Load metrics data
   */
  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      logDebug('Loading metrics with filters:', filtersRef.current);
      
      const data = await fetchMetrics({
        service: filtersRef.current.service || '',
        timeRange: filtersRef.current.timeRange || '1h',
        limit: 1000,
      });
      
      if (Array.isArray(data)) {
        logDebug(`Loaded ${data.length} metrics`);
        setMetrics(data);
        setLastUpdated(new Date());
      } else {
        throw new Error('Invalid metrics data format');
      }
    } catch (err) {
      logDebug('Error loading metrics:', err);
      setError(err.message || 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Process metrics data to prepare time series format for charts
   * @param {string} metricName - Name of the metric to process
   * @param {number} minutes - Number of minutes to include in the time series
   * @returns {Array} Array of data points
   */
  const getTimeSeriesData = useCallback((metricName, minutes = 30) => {
    if (!metrics.length) return [];
    
    const now = new Date();
    const startTime = new Date(now.getTime() - minutes * 60 * 1000);
    
    // Filter metrics by name and time range
    const filteredMetrics = metrics.filter(metric => {
      const metricTime = new Date(metric.timestamp);
      return metric.name === metricName && metricTime >= startTime;
    });
    
    // Sort by timestamp
    const sortedMetrics = [...filteredMetrics].sort((a, b) => {
      return new Date(a.timestamp) - new Date(b.timestamp);
    });
    
    // Convert to time series format
    return sortedMetrics.map(metric => ({
      timestamp: new Date(metric.timestamp),
      value: metric.value,
      tags: metric.tags || {}
    }));
  }, [metrics]);

  /**
   * Get unique metric names from the metrics data
   * @returns {Array} Array of unique metric names
   */
  const getMetricNames = useCallback(() => {
    if (!metrics.length) return [];
    
    const names = new Set();
    metrics.forEach(metric => {
      names.add(metric.name);
    });
    
    return Array.from(names);
  }, [metrics]);

  /**
   * Get services from the metrics data
   * @returns {Array} Array of unique service names
   */
  const getServices = useCallback(() => {
    if (!metrics.length) return [];
    
    const services = new Set();
    metrics.forEach(metric => {
      if (metric.service) {
        services.add(metric.service);
      }
    });
    
    return Array.from(services);
  }, [metrics]);

  /**
   * Get metric types from the metrics data
   * @returns {Object} Object with metric types and counts
   */
  const getMetricTypes = useCallback(() => {
    if (!metrics.length) return {};
    
    const types = {};
    metrics.forEach(metric => {
      const type = metric.type || 'unknown';
      if (!types[type]) {
        types[type] = 0;
      }
      types[type]++;
    });
    
    return types;
  }, [metrics]);

  /**
   * Manually refresh metrics data
   */
  const refresh = useCallback(() => {
    loadMetrics();
  }, [loadMetrics]);

  return {
    metrics,
    loading,
    error,
    lastUpdated,
    refresh,
    getTimeSeriesData,
    getMetricNames,
    getServices,
    getMetricTypes
  };
};

export default useMetrics; 