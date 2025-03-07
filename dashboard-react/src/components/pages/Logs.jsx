import React, { useState, useEffect } from 'react';
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
import Pagination from '@mui/material/Pagination';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import PauseIcon from '@mui/icons-material/PauseOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrowOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import RefreshIcon from '@mui/icons-material/RefreshOutlined';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/SearchOutlined';
import ClearIcon from '@mui/icons-material/CloseOutlined';
import Divider from '@mui/material/Divider';

import useLogs from '../../hooks/useLogs';
import { formatTimestamp, formatTags, getLogLevelClass } from '../../utils/helpers';
import { fetchServices } from '../../utils/api';

const Logs = ({ filters: initialFilters = {}, onFilterChange }) => {
  // Filter state
  const [filters, setFilters] = useState({
    service: initialFilters.service || '',
    logLevel: initialFilters.logLevel || '',
    logSearch: initialFilters.logSearch || '',
    timeRange: initialFilters.timeRange || '1h'
  });
  
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
    pagination,
    clearLogs,
    togglePause,
    changePage,
    changePageSize,
    refresh
  } = useLogs(filters);

  // Update parent filters if provided
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange(filters);
    }
  }, [filters, onFilterChange]);

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

  const handlePageChange = (event, value) => {
    changePage(value);
  };

  const handlePageSizeChange = (event) => {
    const newSize = parseInt(event.target.value, 10);
    changePageSize(newSize);
  };
  
  // Handle filter changes
  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle search submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setFilters(prev => ({
      ...prev,
      logSearch: searchInput
    }));
  };
  
  // Clear search
  const handleClearSearch = () => {
    setSearchInput('');
    setFilters(prev => ({
      ...prev,
      logSearch: ''
    }));
  };

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: { xs: 2, sm: 3 }, 
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3 
      }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Logs Explorer
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title={paused ? "Resume auto-refresh" : "Pause auto-refresh"}>
            <IconButton 
              color={paused ? "primary" : "default"}
              onClick={togglePause}
              aria-label={paused ? "Resume" : "Pause"}
              size="small"
              sx={{ border: '1px solid', borderColor: 'divider' }}
            >
              {paused ? <PlayArrowIcon /> : <PauseIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear logs">
            <IconButton 
              onClick={clearLogs}
              aria-label="Clear logs"
              size="small"
              sx={{ border: '1px solid', borderColor: 'divider' }}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh logs">
            <IconButton
              onClick={refresh}
              disabled={loading}
              aria-label="Refresh logs"
              size="small"
              color="primary"
              sx={{ 
                border: '1px solid', 
                borderColor: 'primary.main',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)'
                }
              }}
            >
              {loading ? (
                <CircularProgress size={18} thickness={2} />
              ) : (
                <RefreshIcon />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}
      
      {/* Filters */}
      <Box sx={{ mb: 3 }}>
        <Box 
          sx={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 2, 
            alignItems: 'center',
            mb: 2
          }}
        >
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="log-level-label">Level</InputLabel>
            <Select
              labelId="log-level-label"
              id="log-level"
              name="logLevel"
              value={filters.logLevel}
              label="Level"
              onChange={handleFilterChange}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="DEBUG">Debug</MenuItem>
              <MenuItem value="INFO">Info</MenuItem>
              <MenuItem value="WARNING">Warning</MenuItem>
              <MenuItem value="ERROR">Error</MenuItem>
              <MenuItem value="FATAL">Fatal</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 130 }}>
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
              <MenuItem value="">All</MenuItem>
              {servicesLoading ? (
                <MenuItem disabled>Loading...</MenuItem>
              ) : services.length > 0 ? (
                services.map(service => (
                  <MenuItem key={service.id || service.name || service} value={service.id || service.name || service}>
                    {service.name || service.id || service}
                  </MenuItem>
                ))
              ) : (
                <MenuItem disabled>None</MenuItem>
              )}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="time-range-label">Time</InputLabel>
            <Select
              labelId="time-range-label"
              id="time-range"
              name="timeRange"
              value={filters.timeRange}
              label="Time"
              onChange={handleFilterChange}
            >
              <MenuItem value="5m">5 minutes</MenuItem>
              <MenuItem value="15m">15 minutes</MenuItem>
              <MenuItem value="1h">1 hour</MenuItem>
              <MenuItem value="3h">3 hours</MenuItem>
              <MenuItem value="6h">6 hours</MenuItem>
              <MenuItem value="12h">12 hours</MenuItem>
              <MenuItem value="1d">24 hours</MenuItem>
              <MenuItem value="7d">7 days</MenuItem>
            </Select>
          </FormControl>
        </Box>
        
        <Box component="form" onSubmit={handleSearchSubmit} sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Search logs..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            fullWidth
            variant="outlined"
            InputProps={{
              endAdornment: searchInput && (
                <IconButton
                  size="small"
                  aria-label="clear search"
                  onClick={handleClearSearch}
                  edge="end"
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              ),
            }}
          />
          <Button
            type="submit"
            variant="outlined"
            startIcon={<SearchIcon />}
            size="small"
            sx={{ minWidth: '90px' }}
          >
            Search
          </Button>
        </Box>
      </Box>

      {/* Table controls */}
      {logs.length > 0 && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 1,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              {((pagination.currentPage - 1) * pagination.pageSize) + 1}-{Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)} of {pagination.totalItems}
            </Typography>
            <FormControl size="small" variant="standard" sx={{ minWidth: 50 }}>
              <Select
                value={pagination.pageSize}
                onChange={handlePageSizeChange}
                disableUnderline
                sx={{ fontSize: '0.75rem' }}
              >
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={25}>25</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Pagination 
            count={pagination.totalPages} 
            page={pagination.currentPage}
            onChange={handlePageChange}
            color="primary"
            size="small"
            siblingCount={0}
            disabled={loading}
          />
        </Box>
      )}

      {/* Logs table */}
      <TableContainer sx={{ 
        maxHeight: 'calc(100vh - 350px)',
        border: '1px solid',
        borderColor: 'divider',
      }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell width="15%" sx={{ fontWeight: 600 }}>Time</TableCell>
              <TableCell width="10%" sx={{ fontWeight: 600 }}>Level</TableCell>
              <TableCell width="15%" sx={{ fontWeight: 600 }}>Service</TableCell>
              <TableCell width="45%" sx={{ fontWeight: 600 }}>Message</TableCell>
              <TableCell width="15%" sx={{ fontWeight: 600 }}>Tags</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && !logs.length ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={20} thickness={2} />
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                    Loading logs...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No logs found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow 
                  key={log.id} 
                  className={getLogLevelClass(log.level)}
                >
                  <TableCell sx={{ fontSize: '0.75rem' }}>{formatTimestamp(log.timestamp)}</TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: 'inline-block',
                        px: 1,
                        py: 0.25,
                        fontSize: '0.625rem',
                        fontWeight: 600,
                        letterSpacing: '0.025em',
                        borderRadius: '2px',
                        textTransform: 'uppercase',
                        backgroundColor: log.level === 'DEBUG' ? 'rgba(0, 0, 0, 0.05)' :
                                         log.level === 'INFO' ? 'rgba(3, 105, 161, 0.08)' :
                                         log.level === 'WARNING' ? 'rgba(217, 119, 6, 0.08)' :
                                         log.level === 'ERROR' ? 'rgba(220, 38, 38, 0.08)' :
                                         'rgba(185, 28, 28, 0.1)',
                        color: log.level === 'DEBUG' ? '#525252' :
                               log.level === 'INFO' ? '#0369A1' :
                               log.level === 'WARNING' ? '#B45309' :
                               log.level === 'ERROR' ? '#B91C1C' :
                               '#7F1D1D',
                      }}
                    >
                      {log.level}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>{log.service}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'ui-monospace, monospace' }}>{log.message}</TableCell>
                  <TableCell>
                    {log.tags && Object.keys(log.tags).length > 0 ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {Object.entries(log.tags).map(([key, value]) => (
                          <Chip
                            key={key}
                            label={`${key}: ${value}`}
                            size="small"
                            variant="outlined"
                            sx={{ 
                              height: 20, 
                              fontSize: '0.625rem',
                              '& .MuiChip-label': { px: 0.75 } 
                            }}
                          />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.disabled">
                        —
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Bottom pagination */}
      {logs.length > 0 && pagination.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
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
    </Paper>
  );
};

export default Logs; 