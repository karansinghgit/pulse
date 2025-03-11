import React from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { useFilters } from '../../contexts/FilterContext';

const Traces = () => {
  const { filters } = useFilters();
  
  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" component="h2" gutterBottom>
        Traces
      </Typography>
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1">
          Traces functionality will be implemented in a future update.
        </Typography>
      </Box>
    </Paper>
  );
};

export default Traces; 