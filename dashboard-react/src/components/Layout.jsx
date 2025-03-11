import React from 'react';
import Box from '@mui/material/Box';
import Header from './Header';
import Footer from './Footer';

/**
 * Layout component that wraps the main content with Header and Footer
 */
const Layout = ({ children }) => {
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh',
      background: '#FFFFFF',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <Header />
      <Box sx={{ 
        display: 'flex', 
        flex: 1, 
        p: { xs: 2, sm: 3, md: 3 }, 
        position: 'relative',
        zIndex: 1,
        maxWidth: '1920px', 
        mx: 'auto',
        width: '100%',
        pb: 8,
      }}>
        <Box 
          component="main" 
          sx={{ 
            flex: 1,
            width: '100%',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {children}
        </Box>
      </Box>
      <Footer />
    </Box>
  );
};

export default Layout; 