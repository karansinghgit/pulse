import React, { useMemo } from 'react';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

/**
 * MetricStats component for displaying metric summary statistics
 * @param {Object} props - Component props
 * @param {Array} props.data - Metric data points
 * @param {String} props.title - Component title
 * @param {Boolean} props.loading - Loading state
 */
const MetricStats = ({ data = [], title = 'Metric Statistics', loading = false }) => {
  const theme = useTheme();

  // Calculate statistics from data
  const stats = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        count: 0,
        min: 0,
        max: 0,
        avg: 0,
        current: 0,
        prev: 0,
        trend: 'flat'
      };
    }

    const values = data.map(point => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const avg = sum / values.length;
    
    // Sort by timestamp to get latest values
    const sortedData = [...data].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    const current = sortedData[0]?.value || 0;
    const prev = sortedData[1]?.value || current;
    
    // Determine trend
    let trend = 'flat';
    if (current > prev) {
      trend = 'up';
    } else if (current < prev) {
      trend = 'down';
    }

    return {
      count: data.length,
      min: min,
      max: max,
      avg: avg,
      current: current,
      prev: prev,
      trend: trend
    };
  }, [data]);

  // Get trend icon based on trend direction
  const TrendIcon = () => {
    switch (stats.trend) {
      case 'up':
        return <TrendingUpIcon sx={{ color: theme.palette.success.main }} />;
      case 'down':
        return <TrendingDownIcon sx={{ color: theme.palette.error.main }} />;
      default:
        return <TrendingFlatIcon sx={{ color: theme.palette.text.secondary }} />;
    }
  };

  // Format a number with 2 decimal places or as an integer if it's a whole number
  const formatNumber = (num) => {
    if (Number.isInteger(num)) {
      return num.toString();
    }
    return num.toFixed(2);
  };

  // Loading state
  if (loading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map((item) => (
            <Grid item xs={6} sm={3} key={item}>
              <Skeleton variant="rectangular" height={60} animation="wave" />
            </Grid>
          ))}
        </Grid>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>{title}</Typography>
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              Current Value
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h5" component="div" fontWeight="medium">
                {formatNumber(stats.current)}
              </Typography>
              <Box sx={{ ml: 1 }}>
                <TrendIcon />
              </Box>
            </Box>
          </Stack>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              Average
            </Typography>
            <Typography variant="h5" component="div" fontWeight="medium">
              {formatNumber(stats.avg)}
            </Typography>
          </Stack>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              Minimum
            </Typography>
            <Typography variant="h5" component="div" fontWeight="medium">
              {formatNumber(stats.min)}
            </Typography>
          </Stack>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              Maximum
            </Typography>
            <Typography variant="h5" component="div" fontWeight="medium">
              {formatNumber(stats.max)}
            </Typography>
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default MetricStats; 