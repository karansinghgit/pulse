import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import IconButton from '@mui/material/IconButton';
import GitHubIcon from '@mui/icons-material/GitHub';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <Box 
      component="footer" 
      sx={{ 
        py: 2, 
        backgroundColor: '#ffffff',
        borderTop: '1px solid',
        borderColor: 'divider',
        mt: 'auto',
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: 'center',
        px: { xs: 2, sm: 3 },
        gap: { xs: 1.5, sm: 0 },
      }}
    >
      <Typography 
        variant="body2" 
        color="text.secondary" 
        sx={{ fontSize: '0.75rem' }}
      >
        Pulse Dashboard v1.0.0
      </Typography>
      
      <Typography 
        variant="body2" 
        color="text.secondary" 
        sx={{ fontSize: '0.75rem' }}
      >
        © {currentYear} Pulse
      </Typography>
      
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <IconButton
          component={Link}
          href="https://github.com/karansingh/pulse"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
          size="small"
          sx={{
            color: 'text.secondary',
            p: 0.5,
          }}
        >
          <GitHubIcon sx={{ fontSize: 18 }} />
        </IconButton>
        
        <IconButton
          component={Link}
          href="https://twitter.com/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Twitter"
          size="small"
          sx={{
            color: 'text.secondary',
            p: 0.5,
          }}
        >
          <TwitterIcon sx={{ fontSize: 18 }} />
        </IconButton>
        
        <IconButton
          component={Link}
          href="https://linkedin.com/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn"
          size="small"
          sx={{
            color: 'text.secondary',
            p: 0.5,
          }}
        >
          <LinkedInIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
    </Box>
  );
};

export default Footer; 