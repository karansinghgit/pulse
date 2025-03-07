import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import { alpha, useTheme } from '@mui/material/styles';

// Icons
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import FeedIcon from '@mui/icons-material/Feed';
import TimelineIcon from '@mui/icons-material/Timeline';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import StorageIcon from '@mui/icons-material/Storage';
import CloudIcon from '@mui/icons-material/Cloud';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoIcon from '@mui/icons-material/Info';

// Sample data for visualization
const serviceStatus = [
  { name: 'API Service', status: 'healthy', uptime: '99.98%', load: 42 },
  { name: 'Authentication', status: 'healthy', uptime: '99.95%', load: 28 },
  { name: 'Database', status: 'warning', uptime: '99.87%', load: 78 },
  { name: 'Notification', status: 'healthy', uptime: '99.92%', load: 35 },
];

const recentAlerts = [
  { severity: 'warning', message: 'Database CPU usage exceeds 75%', time: '15 min ago' },
  { severity: 'error', message: 'API rate limit reached for endpoint /users', time: '1 hour ago' },
  { severity: 'info', message: 'System update scheduled for tonight at 2:00 AM UTC', time: '3 hours ago' },
];

const StatCard = ({ icon, title, value, change, color, description }) => {
  const theme = useTheme();
  const isPositive = change >= 0;
  
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box 
            sx={{ 
              color: theme.palette[color].main,
              mr: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {icon}
          </Box>
          <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>
        
        <Typography variant="h4" component="div" sx={{ fontWeight: 700, mb: 1, mt: 1 }}>
          {value}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Chip 
            size="small"
            label={`${isPositive ? '+' : ''}${change}%`}
            sx={{ 
              bgcolor: isPositive ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.error.main, 0.1),
              color: isPositive ? theme.palette.success.dark : theme.palette.error.dark,
              fontWeight: 500,
              mr: 1,
              height: 20,
              fontSize: '0.75rem'
            }}
          />
          <Typography variant="caption" color="text.secondary">
            vs. last week
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
};

const Overview = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());
  
  const handleRefresh = () => {
    setLastUpdated(new Date().toLocaleTimeString());
  };

  return (
    <Box>
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 2,
          flexWrap: { xs: 'wrap', md: 'nowrap' },
          gap: 1 
        }}
      >
        <Box>
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              fontWeight: 700, 
              color: theme.palette.text.primary,
              mb: 0.5
            }}
          >
            Dashboard Overview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Welcome back! Here's what's happening with your systems today.
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Last updated: {lastUpdated}
          </Typography>
          <IconButton 
            onClick={handleRefresh}
            size="small"
            sx={{ 
              color: theme.palette.primary.main,
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
      
      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            icon={<FeedIcon />}
            title="Log Events"
            value="24.5K"
            change={12}
            color="primary"
            description="Total log events in the last 24 hours"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            icon={<TimelineIcon />}
            title="Avg Response"
            value="85ms"
            change={-5}
            color="info"
            description="Average API response time"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            icon={<WarningIcon />}
            title="Errors"
            value="23"
            change={-15}
            color="error"
            description="Total error events detected"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            icon={<CloudIcon />}
            title="Uptime"
            value="99.8%"
            change={0.2}
            color="success"
            description="Overall system availability"
          />
        </Grid>
      </Grid>
      
      {/* Service Status and Alerts */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 0,
              height: '100%',
              border: '1px solid #f1f5f9'
            }}
          >
            <Box 
              sx={{ 
                bgcolor: '#f8fafc',
                py: 1.5,
                px: 2,
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <StorageIcon sx={{ color: 'primary.main', mr: 1, fontSize: '1.25rem' }} />
                <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
                  Services Status
                </Typography>
              </Box>
              <Chip 
                size="small" 
                color="primary" 
                variant="outlined" 
                label="Live" 
                sx={{ 
                  height: 20,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  '&::before': {
                    content: '""',
                    display: 'inline-block',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: 'success.main',
                    mr: 0.5
                  }
                }}
              />
            </Box>
            
            <Box sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                {serviceStatus.map((service, index) => (
                  <Box key={service.name}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {service.name}
                        </Typography>
                        {service.status === 'healthy' ? (
                          <CheckCircleIcon sx={{ ml: 0.5, color: 'success.main', fontSize: 14 }} />
                        ) : (
                          <WarningIcon sx={{ ml: 0.5, color: 'warning.main', fontSize: 14 }} />
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ fontWeight: 500 }}>
                        Uptime: {service.uptime}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ flexGrow: 1, mr: 1 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={service.load} 
                          sx={{ 
                            height: 6, 
                            borderRadius: 3,
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                            '& .MuiLinearProgress-bar': {
                              bgcolor: service.load > 70 
                                ? theme.palette.warning.main 
                                : service.load > 50 
                                  ? theme.palette.info.main 
                                  : theme.palette.success.main,
                              borderRadius: 3
                            }
                          }}
                        />
                      </Box>
                      <Typography 
                        variant="caption" 
                        color="text.secondary" 
                        sx={{ 
                          minWidth: 30, 
                          fontWeight: 600,
                          color: service.load > 70 
                            ? theme.palette.warning.main 
                            : service.load > 50 
                              ? theme.palette.info.main 
                              : theme.palette.success.main,
                        }}
                      >
                        {service.load}%
                      </Typography>
                    </Box>
                    
                    {index < serviceStatus.length - 1 && (
                      <Divider sx={{ mt: 1.5 }} />
                    )}
                  </Box>
                ))}
              </Stack>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 0,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid #f1f5f9'
            }}
          >
            <Box 
              sx={{ 
                bgcolor: '#f8fafc',
                py: 1.5,
                px: 2,
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <InfoIcon sx={{ color: 'error.main', mr: 1, fontSize: '1.25rem' }} />
                <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
                  Recent Alerts
                </Typography>
              </Box>
              <Chip 
                size="small"
                label={`${recentAlerts.length} new`}
                sx={{ 
                  fontWeight: 500,
                  height: 20,
                  fontSize: '0.75rem'
                }}
                color="error"
                variant="outlined"
              />
            </Box>
            
            <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Stack spacing={1.5} sx={{ mb: 2 }}>
                {recentAlerts.map((alert, index) => (
                  <Alert 
                    key={index}
                    severity={alert.severity}
                    variant="outlined"
                    sx={{ 
                      py: 0.5,
                      '& .MuiAlert-icon': {
                        fontSize: '1.25rem',
                        marginRight: 1,
                        padding: 0
                      },
                      '& .MuiAlert-message': {
                        padding: 0
                      }
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {alert.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {alert.time}
                      </Typography>
                    </Box>
                  </Alert>
                ))}
              </Stack>
              
              <Box sx={{ mt: 'auto', textAlign: 'center' }}>
                <Button 
                  variant="outlined" 
                  color="primary"
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                >
                  View all alerts
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Quick Access Cards */}
      <Typography 
        variant="h6" 
        sx={{ 
          fontWeight: 600, 
          mt: 3, 
          mb: 2,
          display: 'flex',
          alignItems: 'center'
        }}
      >
        Quick Access
        <Divider sx={{ flex: 1, ml: 2 }} />
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <Card 
            onClick={() => navigate('/logs')}
            sx={{ 
              cursor: 'pointer',
              height: '100%',
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <FeedIcon 
                sx={{ 
                  fontSize: 24, 
                  color: 'text.secondary', 
                  mb: 1,
                }}
              />
              <Typography variant="subtitle1" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                Logs
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                View and filter application logs in real-time. Search for specific events and errors.
              </Typography>
              <CardActions sx={{ p: 0 }}>
                <Button 
                  size="small" 
                  color="primary" 
                  endIcon={<ArrowForwardIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/logs');
                  }}
                >
                  View Logs
                </Button>
              </CardActions>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card 
            onClick={() => navigate('/metrics')}
            sx={{ 
              cursor: 'pointer',
              height: '100%',
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <TimelineIcon 
                sx={{ 
                  fontSize: 24, 
                  color: 'text.secondary', 
                  mb: 1,
                }}
              />
              <Typography variant="subtitle1" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                Metrics
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Monitor application performance metrics. Track resource usage and response times.
              </Typography>
              <CardActions sx={{ p: 0 }}>
                <Button 
                  size="small" 
                  color="primary" 
                  endIcon={<ArrowForwardIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/metrics');
                  }}
                >
                  View Metrics
                </Button>
              </CardActions>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card 
            onClick={() => navigate('/traces')}
            sx={{ 
              cursor: 'pointer',
              height: '100%',
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <FlightTakeoffIcon 
                sx={{ 
                  fontSize: 24, 
                  color: 'text.secondary', 
                  mb: 1,
                }}
              />
              <Typography variant="subtitle1" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                Traces
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Analyze request traces across your distributed system. Identify bottlenecks and errors.
              </Typography>
              <CardActions sx={{ p: 0 }}>
                <Button 
                  size="small" 
                  color="primary" 
                  endIcon={<ArrowForwardIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/traces');
                  }}
                >
                  View Traces
                </Button>
              </CardActions>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Overview; 