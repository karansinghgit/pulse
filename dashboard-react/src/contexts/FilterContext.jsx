import React, { createContext, useContext, useState } from 'react';

// Create the filter context
const FilterContext = createContext();

/**
 * Provider component that wraps the app and makes filter state available to any child component
 */
export function FilterProvider({ children }) {
  const [filters, setFilters] = useState({
    service: '',
    timeRange: '1h',
    logLevel: '',
    logSearch: '',
  });

  // Update filters with new values
  const updateFilters = (newFilters) => {
    setFilters(prevFilters => ({ ...prevFilters, ...newFilters }));
  };

  // Reset filters to defaults
  const resetFilters = () => {
    setFilters({
      service: '',
      timeRange: '1h',
      logLevel: '',
      logSearch: '',
    });
  };

  // Context value
  const value = {
    filters,
    updateFilters,
    resetFilters,
  };

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
}

/**
 * Custom hook to access the filter context
 */
export function useFilters() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
} 