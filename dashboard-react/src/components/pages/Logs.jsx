import React, { useState, useEffect, useRef } from 'react';
import { useTheme, alpha } from '@mui/material/styles';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Pagination from '@mui/material/Pagination';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Badge from '@mui/material/Badge';
import Menu from '@mui/material/Menu';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';

// Icons
import FilterListIcon from '@mui/icons-material/FilterListOutlined';
import RefreshIcon from '@mui/icons-material/RefreshOutlined';
import PauseIcon from '@mui/icons-material/PauseOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrowOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import SearchIcon from '@mui/icons-material/SearchOutlined';
import ClearIcon from '@mui/icons-material/CloseOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVertOutlined';
import DownloadIcon from '@mui/icons-material/DownloadOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import NewReleasesOutlinedIcon from '@mui/icons-material/NewReleasesOutlined';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';

// Import the filter context hook
import { useFilters } from '../../contexts/FilterContext';
import useLogs from '../../hooks/useLogs';
import { formatTimestamp, getLogLevelClass } from '../../utils/helpers';
import { fetchServices } from '../../utils/api';

const LogIcon = ({ level, ...props }) => {
  switch(level) {
    case 'DEBUG':
      return <BugReportOutlinedIcon fontSize="small" {...props} />;
    case 'INFO':
      return <InfoOutlinedIcon fontSize="small" {...props} />;
    case 'WARNING':
      return <WarningAmberOutlinedIcon fontSize="small" {...props} />;
    case 'ERROR':
      return <ErrorOutlineIcon fontSize="small" {...props} />;
    case 'FATAL':
      return <NewReleasesOutlinedIcon fontSize="small" {...props} />;
    default:
      return <InfoOutlinedIcon fontSize="small" {...props} />;
  }
};

const LOG_LEVEL_COLORS = {
  DEBUG: {
    light: 'rgba(100, 116, 139, 0.08)',
    main: '#64748b',
    icon: '#475569',
  },
  INFO: {
    light: 'rgba(59, 130, 246, 0.08)',
    main: '#3b82f6',
    icon: '#2563eb',
  },
  WARNING: {
    light: 'rgba(245, 158, 11, 0.08)',
    main: '#f59e0b',
    icon: '#d97706',
  },
  ERROR: {
    light: 'rgba(239, 68, 68, 0.08)',
    main: '#ef4444',
    icon: '#dc2626',
  },
  FATAL: {
    light: 'rgba(190, 24, 93, 0.08)',
    main: '#be185d',
    icon: '#9d174d',
  },
};

// Update LogSelector to use filter context
const LogSelector = ({ value, onChange }) => {
  return (
    <FormControl size="small" sx={{ minWidth: 120, flex: { sm: '0 0 auto' } }}>
      <InputLabel id="log-level-label">Log Level</InputLabel>
      <Select
        labelId="log-level-label"
        id="log-level"
        name="logLevel"
        value={value}
        label="Log Level"
        onChange={onChange}
      >
        <MenuItem value="">All Levels</MenuItem>
        <MenuItem value="DEBUG">Debug</MenuItem>
        <MenuItem value="INFO">Info</MenuItem>
        <MenuItem value="WARNING">Warning</MenuItem>
        <MenuItem value="ERROR">Error</MenuItem>
        <MenuItem value="FATAL">Fatal</MenuItem>
      </Select>
    </FormControl>
  );
};

// Update the Logs component to use FilterContext
const Logs = () => {
  const theme = useTheme();
  const { filters, updateFilters } = useFilters();
  
  // Add ref for stable streaming indicator
  const streamingIndicatorTimeout = useRef(null);
  const [showStreamingIndicator, setShowStreamingIndicator] = useState(false);
  
  // Local view state
  const [viewMode, setViewMode] = useState('all');
  
  // Services state
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  
  // Search input state
  const [searchInput, setSearchInput] = useState(filters.logSearch || '');
  
  const {
    logs,
    loading,
    error,
    paused,
    streaming,
    pagination,
    clearLogs,
    togglePause,
    changePage,
    changePageSize,
    refresh
  } = useLogs(filters);

  // Fetch available services on component mount
  useEffect(() => {
    const getServices = async () => {
      try {
        setServicesLoading(true);
        const result = await fetchServices();
        
        if (Array.isArray(result)) {
          setServices(result);
        } else if (result && Array.isArray(result.services)) {
          setServices(result.services);
        } else {
          console.warn('Unexpected services response format:', result);
          setServices([]);
        }
      } catch (err) {
        console.error('Error fetching services:', err);
        setServices([]);
      } finally {
        setServicesLoading(false);
      }
    };
    
    getServices();
  }, []);

  // Update streaming indicator with debounce
  useEffect(() => {
    if (streamingIndicatorTimeout.current) {
      clearTimeout(streamingIndicatorTimeout.current);
    }
    
    if (streaming && !paused && pagination.currentPage === 1) {
      streamingIndicatorTimeout.current = setTimeout(() => {
        setShowStreamingIndicator(true);
      }, 2000);
    } else {
      setShowStreamingIndicator(false);
    }
    
    return () => {
      if (streamingIndicatorTimeout.current) {
        clearTimeout(streamingIndicatorTimeout.current);
      }
    };
  }, [streaming, paused, pagination.currentPage]);

  const handlePageChange = (event, value) => {
    changePage(value);
  };

  const handlePageSizeChange = (event) => {
    const newSize = parseInt(event.target.value, 10);
    changePageSize(newSize);
  };
  
  // Update filter change handler to use the context's updateFilters
  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    updateFilters({ [name]: value });
  };
  
  // Update search handler to use the context's updateFilters
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateFilters({ logSearch: searchInput });
  };
  
  // Update clear search to use the context's updateFilters
  const handleClearSearch = () => {
    setSearchInput('');
    updateFilters({ logSearch: '' });
  };
  
  // Filter logs for visualization
  const filteredLogs = logs;
  
  // Summary counts
  const logCounts = {
    all: logs.length,
    debug: logs.filter(log => log.level === 'DEBUG').length,
    info: logs.filter(log => log.level === 'INFO').length,
    warning: logs.filter(log => log.level === 'WARNING').length,
    error: logs.filter(log => log.level === 'ERROR').length,
    fatal: logs.filter(log => log.level === 'FATAL').length,
  };

  return (
    <Stack spacing={3}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: { xs: 'flex-start', sm: 'center' },
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        gap: 2,
        my: 1
      }}>
        <Box>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 600,
              mb: 0.5
            }}
          >
            Log Explorer
          </Typography>
          <Typography
            variant="body2" 
            color="text.secondary"
          >
            Live streaming logs from all services
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={1} alignItems="center">
          {showStreamingIndicator && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              color: 'success.main',
              fontSize: '0.75rem',
              fontWeight: 500,
              minWidth: '80px',
              transition: 'opacity 0.3s ease-in-out',
              opacity: 1
            }}>
              <Box 
                sx={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%', 
                  bgcolor: 'success.main', 
                  mr: 1,
                  animation: 'pulse 2s infinite ease-in-out',
                  '@keyframes pulse': {
                    '0%': {
                      opacity: 0.5,
                      transform: 'scale(0.8)'
                    },
                    '50%': {
                      opacity: 1,
                      transform: 'scale(1)'
                    },
                    '100%': {
                      opacity: 0.5,
                      transform: 'scale(0.8)'
                    }
                  }
                }}
              />
              Streaming
            </Box>
          )}
          
          {paused && pagination.currentPage === 1 && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              color: 'warning.main',
              fontSize: '0.75rem',
              fontWeight: 500,
              minWidth: '210px',
              transition: 'opacity 0.3s ease-in-out',
              opacity: 1
            }}>
              <PauseIcon fontSize="small" sx={{ mr: 0.5 }} />
              Paused (click resume to stream)
            </Box>
          )}
          
          {pagination.currentPage > 1 && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              color: 'warning.main',
              fontSize: '0.75rem',
              fontWeight: 500,
              minWidth: '210px',
            }}>
              <PauseIcon fontSize="small" sx={{ mr: 0.5 }} />
              Paused (page {pagination.currentPage})
            </Box>
          )}
          
          <Tooltip title={paused ? "Resume live updates" : "Pause live updates"}>
            <IconButton 
              size="small"
              onClick={togglePause}
              color={paused ? "primary" : "default"}
              disabled={pagination.currentPage > 1}
              sx={{ 
                borderRadius: 1,
                ...(pagination.currentPage === 1 && !paused ? {
                  bgcolor: 'rgba(0, 128, 0, 0.1)',
                } : {}),
                ...(pagination.currentPage > 1 ? {
                  opacity: 0.5,
                  cursor: 'not-allowed'
                } : {})
              }}
            >
              {paused ? <PlayArrowIcon fontSize="small" /> : <PauseIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Refresh logs">
            <IconButton
              onClick={refresh}
              disabled={loading}
              size="small"
              color="primary"
              sx={{ 
                border: '1px solid',
                borderColor: 'primary.main',
                borderRadius: 1,
              }}
            >
              {loading ? (
                <CircularProgress size={16} thickness={2} />
              ) : (
                <RefreshIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
      
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          icon={<ErrorOutlineIcon fontSize="inherit" />}
          action={
            <Button color="error" size="small" variant="text" onClick={refresh}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      
      <Card 
        elevation={0} 
        sx={{ 
          borderRadius: 1,
          overflow: 'visible',
        }}
      >
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2,
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          position: 'sticky',
          top: { xs: 56, md: 64 }, // Match header height
          zIndex: 10,
        }}>
          <FormControl size="small" sx={{ minWidth: 120, flex: { sm: '0 0 auto' } }}>
            <InputLabel id="time-range-label">Time Range</InputLabel>
            <Select
              labelId="time-range-label"
              id="time-range"
              name="timeRange"
              value={filters.timeRange}
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
          
          <FormControl size="small" sx={{ minWidth: 120, flex: { sm: '0 0 auto' } }}>
            <InputLabel id="service-label">Service</InputLabel>
            <Select
              labelId="service-label"
              id="service"
              name="service"
              value={filters.service}
              label="Service"
              onChange={handleFilterChange}
              disabled={servicesLoading}
            >
              <MenuItem value="">All Services</MenuItem>
              {servicesLoading ? (
                <MenuItem disabled>Loading...</MenuItem>
              ) : services.length > 0 ? (
                services.map(service => (
                  <MenuItem key={service.id || service.name || service} value={service.id || service.name || service}>
                    {service.name || service.id || service}
                  </MenuItem>
                ))
              ) : (
                <MenuItem disabled>No services</MenuItem>
              )}
            </Select>
          </FormControl>
          
          <LogSelector value={filters.logLevel} onChange={handleFilterChange} />
          
          <FormControl sx={{ flexGrow: 1 }} size="small" variant="outlined">
            <OutlinedInput
              placeholder="Search logs..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(e)}
              startAdornment={
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              }
              endAdornment={
                searchInput && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      aria-label="clear search"
                      onClick={handleClearSearch}
                      edge="end"
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }
            />
          </FormControl>
        </Box>
        
        {logs.length > 0 && (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'background.paper',
            position: 'sticky',
            top: { xs: 128, md: 136 }, // Position below filters
            zIndex: 9,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: '0.75rem' }}
              >
                Showing {((pagination.currentPage - 1) * pagination.pageSize) + 1} - {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)} of {pagination.totalItems}
              </Typography>
              
              {showStreamingIndicator && (
                <Chip
                  label="Live"
                  size="small"
                  color="success"
                  sx={{ 
                    ml: 1,
                    height: 20,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    transition: 'opacity 0.3s ease-in-out',
                    opacity: 1
                  }}
                />
              )}
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ mr: 1, fontSize: '0.75rem' }}
                >
                  Rows:
                </Typography>
                <Select
                  value={pagination.pageSize}
                  onChange={handlePageSizeChange}
                  size="small"
                  sx={{ 
                    height: 28,
                    fontSize: '0.75rem',
                    '& .MuiSelect-select': {
                      padding: '4px 8px',
                      paddingRight: '24px',
                    },
                  }}
                >
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                </Select>
              </Box>
              
              <Pagination 
                count={pagination.totalPages} 
                page={pagination.currentPage}
                onChange={handlePageChange}
                color="primary"
                size="small"
                siblingCount={1}
                boundaryCount={1}
                disabled={loading}
                sx={{
                  '& .MuiPaginationItem-root': {
                    minWidth: 28,
                    height: 28,
                  }
                }}
              />
            </Box>
          </Box>
        )}
        
        <TableContainer sx={{ 
          height: 'calc(100vh - 180px)',
          overflow: 'auto',
          mb: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: alpha(theme.palette.primary.main, 0.2),
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          }
        }}>
          <Table size="small" stickyHeader sx={{ 
            tableLayout: 'fixed',
            '& .MuiTableCell-root': {
              py: 1.2, // Slightly taller rows for easier reading and scrolling
              verticalAlign: 'top',
            },
          }}>
            <TableHead sx={{ 
              position: 'sticky',
              top: 0,
              zIndex: 8,
              backgroundColor: 'background.paper',
              borderBottom: '2px solid',
              borderColor: 'divider'
            }}>
              <TableRow>
                <TableCell width="15%" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>TIME</TableCell>
                <TableCell width="8%" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>LEVEL</TableCell>
                <TableCell width="15%" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>SERVICE</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>MESSAGE</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                    <CircularProgress size={24} thickness={4} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      Loading logs...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                    <Box sx={{ opacity: 0.5 }}>
                      <SearchIcon sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
                      <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
                        No logs found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Try adjusting your search or filter criteria
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log, index) => {
                  const levelColor = LOG_LEVEL_COLORS[log.level] || LOG_LEVEL_COLORS.INFO;
                  
                  // Extract tags from message (example format: "[tag1][tag2] Actual message")
                  const tagRegex = /\[([^\]]+)\]/g;
                  const tags = [];
                  let cleanMessage = log.message;
                  let match;
                  
                  while ((match = tagRegex.exec(log.message)) !== null) {
                    tags.push(match[1]);
                    cleanMessage = cleanMessage.replace(match[0], '');
                  }
                  
                  cleanMessage = cleanMessage.trim();
                  
                  return (
                    <TableRow 
                      key={log.id || index}
                      className={`staggered-item ${getLogLevelClass(log.level)}`}
                      hover
                      sx={{
                        '&:hover': {
                          '& .log-actions': {
                            opacity: 1,
                          }
                        }
                      }}
                    >
                      <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                        {formatTimestamp(log.timestamp)}
                      </TableCell>
                      
                      <TableCell>
                        <Tooltip title={log.level} placement="top">
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: levelColor.light,
                              width: 28,
                              height: 24,
                              borderRadius: 0.5,
                              color: levelColor.icon,
                            }}
                          >
                            <LogIcon level={log.level} sx={{ fontSize: 16 }} />
                          </Box>
                        </Tooltip>
                      </TableCell>
                      
                      <TableCell sx={{ fontSize: '0.75rem' }}>
                        <Chip
                          label={log.service}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.75rem',
                            backgroundColor: alpha(theme.palette.primary.main, 0.08),
                            fontWeight: 500,
                          }}
                        />
                      </TableCell>
                      
                      <TableCell 
                        sx={{ 
                          fontSize: '0.75rem', 
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          position: 'relative',
                          pr: 6,
                        }}
                      >
                        {tags.length > 0 && (
                          <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5, flexWrap: 'wrap' }}>
                            {tags.map((tag, i) => (
                              <Chip
                                key={i}
                                label={tag}
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: '0.65rem',
                                  backgroundColor: alpha(theme.palette.secondary.main, 0.08),
                                  fontWeight: 500,
                                }}
                              />
                            ))}
                          </Box>
                        )}
                        {cleanMessage}
                        <Box 
                          className="log-actions"
                          sx={{
                            position: 'absolute',
                            right: 8,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            display: 'flex',
                            opacity: 0,
                            transition: 'opacity 0.2s',
                          }}
                        >
                          <Tooltip title="Copy log text">
                            <IconButton 
                              size="small" 
                              sx={{ p: 0.5 }}
                              onClick={() => {
                                navigator.clipboard.writeText(cleanMessage);
                              }}
                            >
                              <ContentCopyIcon fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {filteredLogs.length > 0 && pagination.totalPages > 1 && (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            borderTop: '1px solid',
            borderColor: 'divider',
            p: 2,
            backgroundColor: 'background.paper'
          }}>
            <Pagination 
              count={pagination.totalPages} 
              page={pagination.currentPage}
              onChange={handlePageChange}
              color="primary"
              size="small"
              showFirstButton
              showLastButton
              disabled={loading}
            />
          </Box>
        )}
      </Card>
    </Stack>
  );
};

export default Logs; 