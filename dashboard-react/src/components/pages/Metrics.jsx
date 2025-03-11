import React, { useState, useEffect, useRef } from 'react';
import { useTheme, alpha } from '@mui/material/styles';
import { useFilters } from '../../contexts/FilterContext';
import useMetrics from '../../hooks/useMetrics';
import TimeSeriesChart from '../charts/TimeSeriesChart';
import MetricStats from '../charts/MetricStats';

import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Chip,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Popover,
  IconButton,
  Link
} from '@mui/material';

// Icons
import RefreshIcon from '@mui/icons-material/RefreshOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TimerIcon from '@mui/icons-material/TimerOutlined';
import MemoryIcon from '@mui/icons-material/MemoryOutlined';
import StorageIcon from '@mui/icons-material/StorageOutlined';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheckOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import DnsIcon from '@mui/icons-material/Dns';
import SpeedIcon from '@mui/icons-material/Speed';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

/**
 * Metric category definitions with naming convention documentation
 */
const METRIC_CATEGORIES = {
  performance: {
    name: 'Performance',
    icon: <SpeedIcon />,
    color: 'primary.main',
    patterns: ['latency', 'duration', 'time', 'throughput', 'rps', 'requests', 'qps', 'concurrency'],
    description: 'Metrics related to system performance including response times, request rates, and throughput.',
    examples: ['http_request_duration', 'api_latency', 'requests_per_second', 'throughput']
  },
  errors: {
    name: 'Errors',
    icon: <ErrorOutlineIcon />,
    color: 'error.main',
    patterns: ['error', 'fail', 'exception', 'fault', '4xx', '5xx', 'retry', 'timeout', 'reject'],
    description: 'Metrics tracking error rates, failures, exceptions, and retry attempts.',
    examples: ['error_count', 'exception_rate', 'failed_requests', 'timeout_errors']
  },
  resources: {
    name: 'Resources',
    icon: <MemoryIcon />,
    color: 'success.main',
    patterns: ['cpu', 'memory', 'heap', 'ram', 'disk', 'storage', 'io', 'network', 'bandwidth'],
    description: 'System resource utilization metrics including CPU, memory, disk, and network usage.',
    examples: ['cpu_usage', 'memory_used', 'disk_io', 'network_traffic']
  },
  dependencies: {
    name: 'Dependencies',
    icon: <DnsIcon />,
    color: 'warning.main',
    patterns: ['database', 'db', 'sql', 'query', 'api', 'http', 'external', 'broker', 'queue', 'kafka'],
    description: 'Metrics for external dependencies like databases, APIs, and message brokers.',
    examples: ['database_query_time', 'api_response_time', 'queue_length', 'connection_pool_usage']
  },
  business: {
    name: 'Business',
    icon: <TrendingUpIcon />,
    color: 'info.main',
    patterns: ['transaction', 'order', 'user', 'customer', 'checkout', 'revenue', 'business'],
    description: 'Business-related metrics tracking transactions, users, orders, and other domain-specific KPIs.',
    examples: ['order_count', 'active_users', 'checkout_completion_rate', 'transaction_value']
  },
  slos: {
    name: 'SLOs/SLIs',
    icon: <CheckCircleOutlineIcon />,
    color: 'secondary.main',
    patterns: ['sli', 'slo', 'availability', 'uptime', 'compliance', 'budget', 'objective'],
    description: 'Service Level Objectives and Indicators tracking availability, reliability, and compliance.',
    examples: ['service_availability', 'error_budget', 'slo_compliance', 'uptime_percentage']
  },
  other: {
    name: 'Other',
    icon: <AssessmentIcon />,
    color: 'text.secondary',
    patterns: [],
    description: 'Metrics that don\'t fit into the predefined categories.',
    examples: ['custom_metric', 'misc_counter']
  }
};

/**
 * Metrics dashboard page
 */
const Metrics = () => {
  const theme = useTheme();
  const { filters, updateFilters } = useFilters();
  const {
    metrics,
    loading,
    error,
    lastUpdated,
    refresh,
    getTimeSeriesData,
    getMetricNames,
    getServices,
    getMetricTypes
  } = useMetrics(filters);
  
  // Local state
  const [selectedService, setSelectedService] = useState('');
  const [timeRange, setTimeRange] = useState(filters.timeRange || '1h');
  const [expandedCategories, setExpandedCategories] = useState(['performance', 'errors', 'resources']);
  const [categoryInfoAnchor, setCategoryInfoAnchor] = useState(null);
  const [activeCategoryInfo, setActiveCategoryInfo] = useState(null);
  
  // Reference to the metrics guide section
  const metricsGuideRef = useRef(null);
  
  // Get list of services
  const services = getServices();
  
  // Effect to select initial service when data loads
  useEffect(() => {
    if (services.length > 0 && !selectedService) {
      // Select first service by default
      setSelectedService(services[0] || '');
    }
  }, [services, selectedService]);
  
  // Handle time range change
  const handleTimeRangeChange = (event) => {
    const newRange = event.target.value;
    setTimeRange(newRange);
    updateFilters({ timeRange: newRange });
    // Refresh metrics data with the new time range
    refresh();
  };
  
  // Handle service change
  const handleServiceChange = (event) => {
    setSelectedService(event.target.value);
  };
  
  // Handle accordion expansion
  const handleAccordionChange = (category) => (event, isExpanded) => {
    if (isExpanded) {
      setExpandedCategories(prev => [...prev, category]);
    } else {
      setExpandedCategories(prev => prev.filter(cat => cat !== category));
    }
  };

  // Handle category info popover
  const handleCategoryInfoOpen = (event, category) => {
    setCategoryInfoAnchor(event.currentTarget);
    setActiveCategoryInfo(category);
  };

  const handleCategoryInfoClose = () => {
    setCategoryInfoAnchor(null);
    setActiveCategoryInfo(null);
  };
  
  // Prepare chart colors for different metrics
  const getChartColor = (index) => {
    const colors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.success.main,
      theme.palette.warning.main,
      theme.palette.info.main,
      theme.palette.error.main
    ];
    return colors[index % colors.length];
  };

  // Error state
  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          Error loading metrics: {error}
        </Alert>

        {/* Always display metrics guide even when there's an error */}
        <Paper sx={{ p: 3, mt: 3 }} ref={metricsGuideRef}>
          <Typography variant="h6" gutterBottom>
            Metrics Naming Guide
          </Typography>
          <Typography variant="body2" paragraph>
            To ensure your metrics are correctly categorized in Pulse, follow these naming conventions:
          </Typography>
          
          <Grid container spacing={3}>
            {Object.entries(METRIC_CATEGORIES).map(([category, details]) => {
              if (category === 'other') return null; // Skip the "Other" category
              
              return (
                <Grid item xs={12} sm={6} md={4} key={category}>
                  <Box sx={{ p: 2, borderLeft: 2, borderColor: details.color, mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ mr: 1, color: details.color }}>
                        {details.icon}
                      </Box>
                      {details.name}
                    </Typography>
                    
                    <Typography variant="body2" paragraph fontSize="0.875rem">
                      {details.description}
                    </Typography>
                    
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      Include one of these terms in your metric names:
                    </Typography>
                    
                    <Box sx={{ mb: 1 }}>
                      {details.patterns.slice(0, 5).map(pattern => (
                        <Chip 
                          key={pattern} 
                          label={pattern} 
                          size="small" 
                          sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }} 
                        />
                      ))}
                      {details.patterns.length > 5 && (
                        <Chip 
                          label={`+${details.patterns.length - 5} more`} 
                          size="small"
                          variant="outlined"
                          sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }} 
                        />
                      )}
                    </Box>
                    
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      Examples:
                    </Typography>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      {details.examples.join(', ')}
                    </Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Paper>
      </Box>
    );
  }

  // No service selected state
  if (!selectedService && services.length > 0) {
    return (
      <Box>
        <Alert severity="info" sx={{ mb: 2 }}>
          Please select a service to view metrics.
        </Alert>
        
        {/* Always display metrics guide even when no service is selected */}
        <Paper sx={{ p: 3, mt: 3 }} ref={metricsGuideRef}>
          <Typography variant="h6" gutterBottom>
            Metrics Naming Guide
          </Typography>
          <Typography variant="body2" paragraph>
            To ensure your metrics are correctly categorized in Pulse, follow these naming conventions:
          </Typography>
          
          <Grid container spacing={3}>
            {Object.entries(METRIC_CATEGORIES).map(([category, details]) => {
              if (category === 'other') return null; // Skip the "Other" category
              
              return (
                <Grid item xs={12} sm={6} md={4} key={category}>
                  <Box sx={{ p: 2, borderLeft: 2, borderColor: details.color, mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ mr: 1, color: details.color }}>
                        {details.icon}
                      </Box>
                      {details.name}
                    </Typography>
                    
                    <Typography variant="body2" paragraph fontSize="0.875rem">
                      {details.description}
                    </Typography>
                    
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      Include one of these terms in your metric names:
                    </Typography>
                    
                    <Box sx={{ mb: 1 }}>
                      {details.patterns.slice(0, 5).map(pattern => (
                        <Chip 
                          key={pattern} 
                          label={pattern} 
                          size="small" 
                          sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }} 
                        />
                      ))}
                      {details.patterns.length > 5 && (
                        <Chip 
                          label={`+${details.patterns.length - 5} more`} 
                          size="small"
                          variant="outlined"
                          sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }} 
                        />
                      )}
                    </Box>
                    
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      Examples:
                    </Typography>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      {details.examples.join(', ')}
                    </Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Paper>
      </Box>
    );
  }
  
  // Get icon for a metric based on its name
  const getMetricIcon = (metricName) => {
    const category = determineMetricCategory(metricName);
    return METRIC_CATEGORIES[category].icon;
  };

  // Determine which category a metric belongs to
  const determineMetricCategory = (metricName) => {
    const lowerName = metricName.toLowerCase();
    
    for (const [category, details] of Object.entries(METRIC_CATEGORIES)) {
      if (category === 'other') continue; // Skip the "other" category
      
      // Check if the metric name matches any patterns for this category
      if (details.patterns.some(pattern => lowerName.includes(pattern))) {
        return category;
      }
    }
    
    // Default to "other" if no match
    return 'other';
  };

  // Filter metrics by service
  const getServiceMetrics = (serviceName) => {
    if (!metrics || !metrics.length || !serviceName) return [];
    
    // Get unique metric names for the selected service
    const metricNameSet = new Set();
    
    metrics.forEach(metric => {
      if (metric.service === serviceName && metric.name) {
        metricNameSet.add(metric.name);
      }
    });
    
    return Array.from(metricNameSet);
  };

  // Get metric data for the selected service
  const filteredMetricNames = getServiceMetrics(selectedService);
  
  // Group metrics by category
  const metricsByCategory = () => {
    const categories = {};
    
    // Initialize categories
    Object.keys(METRIC_CATEGORIES).forEach(cat => {
      categories[cat] = [];
    });
    
    // Group metrics by category
    filteredMetricNames.forEach(metricName => {
      const category = determineMetricCategory(metricName);
      categories[category].push(metricName);
    });
    
    return categories;
  };
  
  const categorizedMetrics = metricsByCategory();
  
  // Calculate time range in minutes for fetching data
  const getTimeRangeInMinutes = () => {
    switch (timeRange) {
      case '15m': return 15;
      case '1h': return 60;
      case '3h': return 180;
      case '6h': return 360;
      case '12h': return 720;
      case '24h': return 1440;
      case '7d': return 10080;
      default: return 60;
    }
  };
  
  // Get summary statistics for each category
  const getCategorySummary = (category) => {
    const metrics = categorizedMetrics[category] || [];
    if (metrics.length === 0) return null;
    
    const timeRangeMinutes = getTimeRangeInMinutes();
    
    // Get total error count, average latency, etc. depending on category
    if (category === 'errors') {
      // Sum up error counts
      let totalErrors = 0;
      metrics.forEach(metricName => {
        const data = getTimeSeriesData(metricName, timeRangeMinutes);
        data.forEach(point => {
          totalErrors += point.value;
        });
      });
      
      return {
        value: totalErrors,
        label: 'Total Errors'
      };
    }
    
    if (category === 'performance') {
      // Get average latency/response time
      let avgLatency = 0;
      let count = 0;
      
      metrics.forEach(metricName => {
        if (metricName.toLowerCase().includes('latency') || 
            metricName.toLowerCase().includes('duration') || 
            metricName.toLowerCase().includes('time')) {
          const data = getTimeSeriesData(metricName, timeRangeMinutes);
          data.forEach(point => {
            avgLatency += point.value;
            count++;
          });
        }
      });
      
      return {
        value: count > 0 ? (avgLatency / count).toFixed(2) : 0,
        label: 'Avg Latency'
      };
    }
    
    // Default summary
    return {
      value: metrics.length,
      label: 'Metrics'
    };
  };

  // Handle scrolling to metrics guide
  const scrollToGuide = () => {
    if (metricsGuideRef.current) {
      metricsGuideRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box 
        sx={{ 
          mb: 3, 
          display: 'flex', 
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2
        }}
      >
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Metrics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor system and application performance
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="time-range-label">Time Range</InputLabel>
            <Select
              labelId="time-range-label"
              id="time-range"
              value={timeRange}
              onChange={handleTimeRangeChange}
              label="Time Range"
            >
              <MenuItem value="15m">Last 15 minutes</MenuItem>
              <MenuItem value="1h">Last hour</MenuItem>
              <MenuItem value="3h">Last 3 hours</MenuItem>
              <MenuItem value="6h">Last 6 hours</MenuItem>
              <MenuItem value="12h">Last 12 hours</MenuItem>
              <MenuItem value="24h">Last 24 hours</MenuItem>
              <MenuItem value="7d">Last 7 days</MenuItem>
            </Select>
          </FormControl>
          
          {/* Service selector */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="service-label">Service</InputLabel>
            <Select
              labelId="service-label"
              id="service-select"
              value={selectedService}
              onChange={handleServiceChange}
              label="Service"
            >
              {services.map(service => (
                <MenuItem key={service} value={service}>{service}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={refresh}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>
      
      {/* Category Information Popover */}
      <Popover
        open={Boolean(categoryInfoAnchor)}
        anchorEl={categoryInfoAnchor}
        onClose={handleCategoryInfoClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        {activeCategoryInfo && (
          <Box sx={{ p: 3, maxWidth: 400 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ mr: 1, color: METRIC_CATEGORIES[activeCategoryInfo].color }}>
                {METRIC_CATEGORIES[activeCategoryInfo].icon}
              </Box>
              {METRIC_CATEGORIES[activeCategoryInfo].name} Metrics
            </Typography>
            
            <Typography variant="body2" paragraph>
              {METRIC_CATEGORIES[activeCategoryInfo].description}
            </Typography>
            
            <Typography variant="subtitle2" gutterBottom>
              Naming Patterns
            </Typography>
            <Box sx={{ mb: 2 }}>
              {METRIC_CATEGORIES[activeCategoryInfo].patterns.map(pattern => (
                <Chip 
                  key={pattern} 
                  label={pattern} 
                  size="small" 
                  sx={{ mr: 0.5, mb: 0.5 }} 
                />
              ))}
            </Box>
            
            <Typography variant="subtitle2" gutterBottom>
              Example Metric Names
            </Typography>
            <Box sx={{ mb: 1 }}>
              {METRIC_CATEGORIES[activeCategoryInfo].examples.map(example => (
                <Chip 
                  key={example}
                  label={example}
                  size="small"
                  variant="outlined"
                  sx={{ mr: 0.5, mb: 0.5 }}
                />
              ))}
            </Box>
            
            <Typography variant="caption" color="text.secondary">
              Note: Metrics are automatically categorized based on their names
            </Typography>
          </Box>
        )}
      </Popover>
      
      {/* Dashboard content */}
      <>
        {/* Loading state */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}
        
        {/* Service summary */}
        {selectedService && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Service: {selectedService}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {filteredMetricNames.length} metrics available
                  {lastUpdated && ` • Last updated: ${new Date(lastUpdated).toLocaleString()}`}
                </Typography>
              </Box>
              
              <Box>
                <Tooltip title="Scroll to Metrics Naming Guide">
                  <Button 
                    size="small"
                    variant="outlined"
                    color="info"
                    onClick={scrollToGuide}
                    startIcon={<HelpOutlineIcon />}
                  >
                    Metrics Guide
                  </Button>
                </Tooltip>
              </Box>
            </Box>
            
            {filteredMetricNames.length === 0 && !loading && (
              <Alert severity="info" sx={{ mt: 2 }}>
                No metrics found for service "{selectedService}"
              </Alert>
            )}
          </Paper>
        )}
        
        {/* Metrics charts by category */}
        {!loading && filteredMetricNames.length > 0 && (
          <Stack spacing={2}>
            {Object.entries(METRIC_CATEGORIES).map(([category, details]) => {
              const metrics = categorizedMetrics[category] || [];
              if (metrics.length === 0) return null;
              
              const isExpanded = expandedCategories.includes(category);
              
              return (
                <Accordion 
                  key={category} 
                  expanded={isExpanded}
                  onChange={handleAccordionChange(category)}
                  sx={{
                    '&:before': {
                      display: 'none',
                    }
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ 
                      bgcolor: alpha(theme.palette[details.color.split('.')[0]][details.color.split('.')[1]], 0.05),
                      borderLeft: 3,
                      borderColor: details.color
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ 
                          mr: 1.5, 
                          color: details.color,
                          display: 'flex'
                        }}>
                          {details.icon}
                        </Box>
                        <Typography variant="subtitle1" component="div" fontWeight="500">
                          {details.name} 
                          <Typography component="span" variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
                            ({metrics.length} metrics)
                          </Typography>
                        </Typography>
                      </Box>
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCategoryInfoOpen(e, category);
                        }}
                      >
                        <HelpOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={3}>
                      {metrics.map((metricName, index) => (
                        <Grid item xs={12} md={6} key={metricName}>
                          <Box sx={{ mb: 2 }}>
                            <MetricStats
                              title={metricName}
                              data={getTimeSeriesData(metricName, getTimeRangeInMinutes())}
                              loading={loading}
                            />
                          </Box>
                          <TimeSeriesChart
                            title={metricName}
                            data={getTimeSeriesData(metricName, getTimeRangeInMinutes())}
                            loading={loading}
                            config={{
                              lineColor: getChartColor(index),
                              height: 300,
                            }}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Stack>
        )}
      </>
      
      {/* Metrics guide for users at the bottom */}
      <Paper sx={{ p: 3, mt: 3 }} ref={metricsGuideRef}>
        <Typography variant="h6" gutterBottom>
          Metrics Naming Guide
        </Typography>
        <Typography variant="body2" paragraph>
          To ensure your metrics are correctly categorized in Pulse, follow these naming conventions:
        </Typography>
        
        <Grid container spacing={3}>
          {Object.entries(METRIC_CATEGORIES).map(([category, details]) => {
            if (category === 'other') return null; // Skip the "Other" category
            
            return (
              <Grid item xs={12} sm={6} md={4} key={category}>
                <Box sx={{ p: 2, borderLeft: 2, borderColor: details.color, mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ mr: 1, color: details.color }}>
                      {details.icon}
                    </Box>
                    {details.name}
                  </Typography>
                  
                  <Typography variant="body2" paragraph fontSize="0.875rem">
                    {details.description}
                  </Typography>
                  
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    Include one of these terms in your metric names:
                  </Typography>
                  
                  <Box sx={{ mb: 1 }}>
                    {details.patterns.slice(0, 5).map(pattern => (
                      <Chip 
                        key={pattern} 
                        label={pattern} 
                        size="small" 
                        sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }} 
                      />
                    ))}
                    {details.patterns.length > 5 && (
                      <Chip 
                        label={`+${details.patterns.length - 5} more`} 
                        size="small"
                        variant="outlined"
                        sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }} 
                      />
                    )}
                  </Box>
                  
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    Examples:
                  </Typography>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                    {details.examples.join(', ')}
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Paper>
    </Box>
  );
};

export default Metrics; 