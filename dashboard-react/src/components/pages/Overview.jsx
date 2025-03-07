import React from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';

const Overview = () => {
  return (
    <>
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Dashboard Overview
        </Typography>
        <Typography variant="body1" paragraph>
          Welcome to the Pulse Dashboard. This dashboard provides real-time monitoring and visualization of your application's logs, metrics, and traces.
        </Typography>
        
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="h3" gutterBottom>
                  Logs
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  View and filter application logs in real-time. Search for specific events or errors.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="h3" gutterBottom>
                  Metrics
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Monitor application performance metrics. Track resource usage and response times.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="h3" gutterBottom>
                  Traces
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Analyze request traces across your distributed system. Identify bottlenecks and errors.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
      
      <Box sx={{ textAlign: 'center', color: 'text.secondary', mt: 4 }}>
        <Typography variant="body2">
          Select a tab above to view detailed information.
        </Typography>
      </Box>
    </>
  );
};

export default Overview; 