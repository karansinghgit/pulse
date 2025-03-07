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
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

import useLogs from '../../hooks/useLogs';
import { formatTimestamp, formatTags, getLogLevelClass } from '../../utils/helpers';

const Logs = () => {
  // Filter state
  const [filters, setFilters] = useState({
    service: '',
    logLevel: '',
    logSearch: '',
    timeRange: '1h'
  });
  
  // Search input state
  const [searchInput, setSearchInput] = useState('');
  
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

  const handlePageChange = (event, value) => {
    console.log(`Page changed in component to ${value}`);
    changePage(value);
  };

  const handlePageSizeChange = (event) => {
    const newSize = parseInt(event.target.value, 10);
    console.log(`Page size changed in component to ${newSize}`);
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
    <>
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2">
            Logs
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Refresh logs">
              {loading ? (
                <span>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<RefreshIcon />}
                    disabled
                  >
                    Refresh
                  </Button>
                </span>
              ) : (
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<RefreshIcon />}
                  onClick={refresh}
                >
                  Refresh
                </Button>
              )}
            </Tooltip>
            <Button
              variant="outlined"
              color={paused ? 'primary' : 'warning'}
              startIcon={paused ? <PlayArrowIcon /> : <PauseIcon />}
              onClick={togglePause}
            >
              {paused ? 'Resume' : 'Pause'}
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={clearLogs}
            >
              Clear
            </Button>
          </Box>
        </Box>
        
        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="log-level-label">Log Level</InputLabel>
            <Select
              labelId="log-level-label"
              id="log-level"
              name="logLevel"
              value={filters.logLevel}
              label="Log Level"
              onChange={handleFilterChange}
            >
              <MenuItem value="">All Levels</MenuItem>
              <MenuItem value="DEBUG">Debug</MenuItem>
              <MenuItem value="INFO">Info</MenuItem>
              <MenuItem value="WARNING">Warning</MenuItem>
              <MenuItem value="ERROR">Error</MenuItem>
              <MenuItem value="FATAL">Fatal</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="service-label">Service</InputLabel>
            <Select
              labelId="service-label"
              id="service"
              name="service"
              value={filters.service}
              label="Service"
              onChange={handleFilterChange}
            >
              <MenuItem value="">All Services</MenuItem>
              <MenuItem value="test-service">test-service</MenuItem>
              <MenuItem value="backend">backend</MenuItem>
              <MenuItem value="frontend">frontend</MenuItem>
              <MenuItem value="api">api</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
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
          
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center' }}>
            <TextField
              id="search"
              name="search"
              size="small"
              label="Search"
              variant="outlined"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              InputProps={{
                endAdornment: searchInput ? (
                  <IconButton size="small" onClick={handleClearSearch}>
                    <ClearIcon />
                  </IconButton>
                ) : null
              }}
            />
            <IconButton type="submit" size="small">
              <SearchIcon />
            </IconButton>
          </form>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Level</TableCell>
                <TableCell>Service</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>Tags</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <CircularProgress size={24} sx={{ my: 2 }} />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No logs found matching the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log, index) => (
                  <TableRow key={log.id || `log-${log.timestamp}-${index}`} hover>
                    <TableCell>{formatTimestamp(log.timestamp)}</TableCell>
                    <TableCell>
                      <span className={getLogLevelClass(log.level)}>
                        {log.level}
                      </span>
                    </TableCell>
                    <TableCell>{log.service}</TableCell>
                    <TableCell>{log.message}</TableCell>
                    <TableCell>
                      {log.tags && typeof log.tags === 'object' && Object.entries(log.tags).map(([key, value]) => (
                        <Chip
                          key={key}
                          label={`${key}=${value}`}
                          size="small"
                          variant="outlined"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                      {log.trace_id && (
                        <Chip
                          key="trace_id"
                          label={`trace_id=${log.trace_id}`}
                          size="small"
                          variant="outlined"
                          color="secondary"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="page-size-label">Per Page</InputLabel>
            <Select
              labelId="page-size-label"
              id="page-size"
              value={pagination.pageSize}
              label="Per Page"
              onChange={handlePageSizeChange}
              disabled={loading || pagination.totalItems === 0}
            >
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ mr: 2 }}>
              {pagination.totalItems > 0 ? (
                <>
                  Showing {Math.min(pagination.totalItems, 1 + (pagination.currentPage - 1) * pagination.pageSize)}-
                  {Math.min(pagination.totalItems, pagination.currentPage * pagination.pageSize)} of {pagination.totalItems} logs
                </>
              ) : (
                'No logs found'
              )}
            </Typography>
            <Pagination
              count={pagination.totalPages}
              page={pagination.currentPage}
              onChange={handlePageChange}
              color="primary"
              showFirstButton
              showLastButton
              disabled={loading || pagination.totalItems === 0}
            />
          </Box>
        </Box>
      </Paper>
    </>
  );
};

export default Logs; 