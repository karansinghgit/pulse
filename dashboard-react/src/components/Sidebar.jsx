import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';

const Sidebar = ({ filters, onFilterChange }) => {
  const location = useLocation();
  const [localFilters, setLocalFilters] = useState(filters);
  const currentPath = location.pathname.substring(1);

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setLocalFilters({
      ...localFilters,
      [name]: value
    });
  };

  const handleApplyFilters = () => {
    onFilterChange(localFilters);
  };

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        width: 280, 
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}
    >
      <Typography variant="h6" component="h2" gutterBottom>
        Filters
      </Typography>
      
      <Divider />
      
      {/* Common Filters */}
      <FormControl fullWidth size="small">
        <InputLabel id="service-filter-label">Service</InputLabel>
        <Select
          labelId="service-filter-label"
          id="service-filter"
          name="service"
          value={localFilters.service}
          label="Service"
          onChange={handleFilterChange}
        >
          <MenuItem value="">All Services</MenuItem>
          <MenuItem value="api">API</MenuItem>
          <MenuItem value="auth">Auth</MenuItem>
          <MenuItem value="database">Database</MenuItem>
          <MenuItem value="frontend">Frontend</MenuItem>
        </Select>
      </FormControl>
      
      <FormControl fullWidth size="small">
        <InputLabel id="time-range-label">Time Range</InputLabel>
        <Select
          labelId="time-range-label"
          id="time-range"
          name="timeRange"
          value={localFilters.timeRange}
          label="Time Range"
          onChange={handleFilterChange}
        >
          <MenuItem value="5m">Last 5 minutes</MenuItem>
          <MenuItem value="15m">Last 15 minutes</MenuItem>
          <MenuItem value="1h">Last 1 hour</MenuItem>
          <MenuItem value="3h">Last 3 hours</MenuItem>
          <MenuItem value="6h">Last 6 hours</MenuItem>
          <MenuItem value="12h">Last 12 hours</MenuItem>
          <MenuItem value="1d">Last 24 hours</MenuItem>
          <MenuItem value="7d">Last 7 days</MenuItem>
        </Select>
      </FormControl>
      
      {/* Logs-specific filters */}
      {currentPath === 'logs' && (
        <>
          <Divider />
          <Typography variant="subtitle2">Log Filters</Typography>
          
          <FormControl fullWidth size="small">
            <InputLabel id="log-level-label">Log Level</InputLabel>
            <Select
              labelId="log-level-label"
              id="log-level"
              name="logLevel"
              value={localFilters.logLevel}
              label="Log Level"
              onChange={handleFilterChange}
            >
              <MenuItem value="">All Levels</MenuItem>
              <MenuItem value="DEBUG">DEBUG</MenuItem>
              <MenuItem value="INFO">INFO</MenuItem>
              <MenuItem value="WARNING">WARNING</MenuItem>
              <MenuItem value="ERROR">ERROR</MenuItem>
              <MenuItem value="FATAL">FATAL</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            id="log-search"
            name="logSearch"
            label="Search Logs"
            variant="outlined"
            size="small"
            value={localFilters.logSearch}
            onChange={handleFilterChange}
            fullWidth
          />
        </>
      )}
      
      {/* Metrics-specific filters */}
      {currentPath === 'metrics' && (
        <>
          <Divider />
          <Typography variant="subtitle2">Metric Filters</Typography>
          
          <FormControl fullWidth size="small">
            <InputLabel id="metric-name-label">Metric Name</InputLabel>
            <Select
              labelId="metric-name-label"
              id="metric-name"
              name="metricName"
              value={localFilters.metricName || ''}
              label="Metric Name"
              onChange={handleFilterChange}
            >
              <MenuItem value="">All Metrics</MenuItem>
              <MenuItem value="cpu_usage">CPU Usage</MenuItem>
              <MenuItem value="memory_usage">Memory Usage</MenuItem>
              <MenuItem value="request_count">Request Count</MenuItem>
              <MenuItem value="response_time">Response Time</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl fullWidth size="small">
            <InputLabel id="metric-type-label">Metric Type</InputLabel>
            <Select
              labelId="metric-type-label"
              id="metric-type"
              name="metricType"
              value={localFilters.metricType || ''}
              label="Metric Type"
              onChange={handleFilterChange}
            >
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value="counter">Counter</MenuItem>
              <MenuItem value="gauge">Gauge</MenuItem>
              <MenuItem value="histogram">Histogram</MenuItem>
            </Select>
          </FormControl>
        </>
      )}
      
      {/* Traces-specific filters */}
      {currentPath === 'traces' && (
        <>
          <Divider />
          <Typography variant="subtitle2">Trace Filters</Typography>
          
          <FormControl fullWidth size="small">
            <InputLabel id="trace-status-label">Status</InputLabel>
            <Select
              labelId="trace-status-label"
              id="trace-status"
              name="traceStatus"
              value={localFilters.traceStatus || ''}
              label="Status"
              onChange={handleFilterChange}
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="OK">OK</MenuItem>
              <MenuItem value="ERROR">ERROR</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            id="min-duration"
            name="minDuration"
            label="Min Duration (ms)"
            variant="outlined"
            size="small"
            type="number"
            value={localFilters.minDuration || ''}
            onChange={handleFilterChange}
            fullWidth
          />
        </>
      )}
      
      <Box sx={{ mt: 'auto', pt: 2 }}>
        <Button 
          variant="contained" 
          color="primary" 
          fullWidth
          onClick={handleApplyFilters}
        >
          Apply Filters
        </Button>
      </Box>
    </Paper>
  );
};

export default Sidebar; 