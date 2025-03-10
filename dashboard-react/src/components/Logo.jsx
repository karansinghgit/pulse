import React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

// A sophisticated, minimal logo component
const Logo = ({ size = 32, variant = 'default', ...props }) => {
  const theme = useTheme();
  
  const primaryColor = theme.palette.primary.main;
  const secondaryColor = theme.palette.secondary.main;
  
  // Calculate inner elements size based on main size
  const innerSize = Math.floor(size * 0.6);
  const innerOffset = Math.floor((size - innerSize) / 2);
  
  return (
    <Box
      component="div"
      sx={{
        display: 'inline-flex',
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        ...props.sx
      }}
      {...props}
    >
      {variant === 'default' && (
        <>
          {/* Main circle */}
          <Box
            sx={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: '50%',
              border: `2px solid ${primaryColor}`,
              opacity: 0.9,
            }}
          />
          
          {/* Inner shape */}
          <Box
            sx={{
              position: 'absolute',
              top: innerOffset,
              left: innerOffset,
              width: innerSize,
              height: innerSize,
              borderRadius: '40%',
              backgroundColor: secondaryColor,
              opacity: 0.8,
              transform: 'rotate(45deg)',
            }}
          />
          
          {/* Accent dot */}
          <Box
            sx={{
              position: 'absolute',
              top: Math.floor(size * 0.25),
              right: Math.floor(size * 0.25),
              width: Math.floor(size * 0.15),
              height: Math.floor(size * 0.15),
              borderRadius: '50%',
              backgroundColor: primaryColor,
              zIndex: 1,
            }}
          />
        </>
      )}
      
      {variant === 'minimal' && (
        <>
          {/* Simple square */}
          <Box
            sx={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: Math.floor(size * 0.2),
              backgroundColor: primaryColor,
              opacity: 0.95,
            }}
          />
          
          {/* Inner line */}
          <Box
            sx={{
              position: 'absolute',
              top: Math.floor(size * 0.65),
              left: Math.floor(size * 0.25),
              width: Math.floor(size * 0.5),
              height: Math.floor(size * 0.1),
              backgroundColor: 'white',
            }}
          />
          
          {/* Accent */}
          <Box
            sx={{
              position: 'absolute',
              top: Math.floor(size * 0.25),
              left: Math.floor(size * 0.25),
              width: Math.floor(size * 0.1),
              height: Math.floor(size * 0.3),
              backgroundColor: 'white',
            }}
          />
          
          <Box
            sx={{
              position: 'absolute',
              top: Math.floor(size * 0.25),
              left: Math.floor(size * 0.45),
              width: Math.floor(size * 0.1),
              height: Math.floor(size * 0.3),
              backgroundColor: 'white',
            }}
          />
        </>
      )}
      
      {variant === 'text' && (
        <Box
          component="svg"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          sx={{
            width: size,
            height: size,
          }}
        >
          <path
            d="M16 2C8.268 2 2 8.268 2 16s6.268 14 14 14 14-6.268 14-14S23.732 2 16 2zm0 3c6.075 0 11 4.925 11 11s-4.925 11-11 11S5 22.075 5 16 9.925 5 16 5zm0 4a3 3 0 100 6 3 3 0 000-6zm-5 9a1 1 0 011-1h8a1 1 0 110 2h-8a1 1 0 01-1-1z"
            fill={primaryColor}
          />
        </Box>
      )}
    </Box>
  );
};

Logo.propTypes = {
  size: PropTypes.number,
  variant: PropTypes.oneOf(['default', 'minimal', 'text']),
  sx: PropTypes.object,
};

export default Logo; 