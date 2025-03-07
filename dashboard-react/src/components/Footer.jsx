import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';

const Footer = () => {
  return (
    <Box 
      component="footer" 
      sx={{ 
        py: 2, 
        textAlign: 'center',
        borderTop: '1px solid #eaeaea',
        mt: 'auto'
      }}
    >
      <Typography variant="body2" color="text.secondary">
        Pulse Dashboard v0.1.0 | {' '}
        <Link 
          href="https://github.com/karansingh/pulse" 
          target="_blank" 
          rel="noopener noreferrer"
          color="primary"
        >
          GitHub
        </Link>
      </Typography>
    </Box>
  );
};

export default Footer; 