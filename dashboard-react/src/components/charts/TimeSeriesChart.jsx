import React, { useMemo } from 'react';
import { useTheme } from '@mui/material/styles';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import { format } from 'date-fns';

/**
 * TimeSeriesChart component for displaying time series metrics data
 * @param {Object} props - Component props
 * @param {Array} props.data - Time series data points
 * @param {String} props.title - Chart title
 * @param {Boolean} props.loading - Loading state
 * @param {Object} props.config - Chart configuration options
 */
const TimeSeriesChart = ({ 
  data = [], 
  title = 'Time Series Chart', 
  loading = false, 
  config = {}
}) => {
  const theme = useTheme();

  // Process data for chart display
  const chartData = useMemo(() => {
    if (!data || !data.length) return [];
    
    return data.map(point => ({
      timestamp: new Date(point.timestamp),
      value: point.value,
      formattedTime: format(new Date(point.timestamp), 'HH:mm:ss'),
      ...point.tags
    }));
  }, [data]);

  // Chart colors
  const chartColors = {
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    grid: theme.palette.divider,
    text: theme.palette.text.secondary,
  };

  // Chart configuration with defaults
  const chartConfig = {
    height: 300,
    yAxisLabel: 'Value',
    xAxisLabel: 'Time',
    lineColor: chartColors.primary,
    showGrid: true,
    showLegend: true,
    ...config
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Paper
          elevation={3}
          sx={{
            p: 1.5,
            borderRadius: 1,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            maxWidth: 240,
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            {payload[0].payload.formattedTime}
          </Typography>
          <Typography variant="body2" sx={{ color: chartColors.primary, fontWeight: 500 }}>
            {`${payload[0].name}: ${payload[0].value.toFixed(2)}`}
          </Typography>
          
          {/* Display tags if available */}
          {Object.entries(payload[0].payload)
            .filter(([key]) => key !== 'timestamp' && key !== 'value' && key !== 'formattedTime')
            .map(([key, value]) => (
              <Typography key={key} variant="caption" display="block" sx={{ color: 'text.secondary' }}>
                {`${key}: ${value}`}
              </Typography>
            ))}
        </Paper>
      );
    }
    return null;
  };

  // Empty state
  if (!loading && (!chartData || chartData.length === 0)) {
    return (
      <Paper sx={{ p: 2, height: chartConfig.height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.secondary" align="center">
          No data available for this metric
        </Typography>
      </Paper>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        <Skeleton variant="rectangular" height={chartConfig.height - 50} animation="wave" />
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>{title}</Typography>
      <Box sx={{ width: '100%', height: chartConfig.height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
          >
            {chartConfig.showGrid && (
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={chartColors.grid} 
                vertical={false} 
              />
            )}
            <XAxis 
              dataKey="formattedTime" 
              label={{ 
                value: chartConfig.xAxisLabel, 
                position: 'insideBottomRight', 
                offset: -10,
                fill: chartColors.text
              }}
              tick={{ fill: chartColors.text, fontSize: 12 }}
              stroke={chartColors.grid}
            />
            <YAxis 
              label={{ 
                value: chartConfig.yAxisLabel, 
                angle: -90, 
                position: 'insideLeft',
                fill: chartColors.text
              }}
              tick={{ fill: chartColors.text, fontSize: 12 }}
              stroke={chartColors.grid}
            />
            <Tooltip content={<CustomTooltip />} />
            {chartConfig.showLegend && <Legend />}
            <Line 
              type="monotone" 
              dataKey="value" 
              name={title}
              stroke={chartConfig.lineColor} 
              strokeWidth={2}
              dot={{ r: 2, fill: chartConfig.lineColor }}
              activeDot={{ r: 5 }}
              animationDuration={500}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default TimeSeriesChart; 