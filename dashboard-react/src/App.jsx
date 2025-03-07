import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';

// Components
import Header from './components/Header';
import Footer from './components/Footer';

// Pages
import Overview from './components/pages/Overview';
import Logs from './components/pages/Logs';
import Metrics from './components/pages/Metrics';
import Traces from './components/pages/Traces';
import Settings from './components/pages/Settings';

// Create theme with minimal elements
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#000000',
      light: '#333333',
      dark: '#000000',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#6D28D9',
      light: '#8B5CF6',
      dark: '#5B21B6',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#FFFFFF',
      paper: '#FFFFFF',
      subtle: '#FAFAFA',
      muted: '#F5F5F5',
    },
    text: {
      primary: '#171717',
      secondary: '#525252',
      muted: '#737373',
    },
    error: {
      main: '#DC2626',
      light: '#FEE2E2',
      dark: '#B91C1C',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#D97706',
      light: '#FEF3C7',
      dark: '#B45309',
      contrastText: '#FFFFFF',
    },
    info: {
      main: '#0284C7',
      light: '#E0F2FE',
      dark: '#0369A1',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#059669',
      light: '#D1FAE5',
      dark: '#047857',
      contrastText: '#FFFFFF',
    },
    divider: 'rgba(0, 0, 0, 0.08)',
    action: {
      hover: 'rgba(0, 0, 0, 0.04)',
      selected: 'rgba(0, 0, 0, 0.08)',
      disabled: 'rgba(0, 0, 0, 0.26)',
      disabledBackground: 'rgba(0, 0, 0, 0.04)',
    },
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightSemibold: 600,
    fontWeightBold: 700,
    h1: {
      fontWeight: 600,
      fontSize: '2rem',
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
      letterSpacing: '-0.01em',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.125rem',
      lineHeight: 1.4,
      letterSpacing: '-0.01em',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1rem',
      lineHeight: 1.5,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
      fontSize: '0.875rem',
      lineHeight: 1.5,
      letterSpacing: '-0.01em',
    },
    subtitle1: {
      fontSize: '1rem',
      lineHeight: 1.5,
      letterSpacing: '-0.01em',
      fontWeight: 500,
    },
    subtitle2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      letterSpacing: '-0.01em',
      fontWeight: 500,
    },
    body1: {
      fontSize: '0.9375rem',
      lineHeight: 1.5,
      letterSpacing: '-0.01em',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      letterSpacing: '-0.01em',
    },
    button: {
      fontWeight: 500,
      fontSize: '0.875rem',
      letterSpacing: '-0.01em',
      textTransform: 'none',
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
      letterSpacing: '-0.01em',
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 600,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    },
  },
  shape: {
    borderRadius: 4,
  },
  shadows: [
    'none',
    '0 1px 2px rgba(0, 0, 0, 0.05)',
    '0 1px 3px rgba(0, 0, 0, 0.1)',
    '0 2px 4px rgba(0, 0, 0, 0.1)',
    '0 4px 6px rgba(0, 0, 0, 0.1)',
    '0 6px 8px rgba(0, 0, 0, 0.1)',
    '0 8px 10px rgba(0, 0, 0, 0.1)',
    '0 12px 16px rgba(0, 0, 0, 0.1)',
    '0 16px 24px rgba(0, 0, 0, 0.1)',
    '0 20px 32px rgba(0, 0, 0, 0.1)',
    // ... rest remain default
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          boxSizing: 'border-box',
          margin: 0,
          padding: 0,
        },
        html: {
          MozOsxFontSmoothing: 'grayscale',
          WebkitFontSmoothing: 'antialiased',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100%',
          width: '100%',
        },
        body: {
          display: 'flex',
          flex: '1 1 auto',
          flexDirection: 'column',
          minHeight: '100%',
          width: '100%',
        },
        '#root': {
          display: 'flex',
          flex: '1 1 auto',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: 'none',
          border: '1px solid',
          borderColor: 'rgba(0, 0, 0, 0.08)',
          '&[href]': {
            textDecoration: 'none',
          },
        },
        rounded: {
          borderRadius: 4,
        },
        outlined: {
          borderColor: 'rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          boxShadow: 'none',
          borderBottom: '1px solid',
          borderColor: 'rgba(0, 0, 0, 0.08)',
          color: '#171717',
        },
        colorPrimary: {
          backgroundColor: '#FFFFFF',
          color: '#171717',
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: '56px',
          '@media (min-width:600px)': {
            minHeight: '64px',
          },
        },
      },
    },
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: 'none',
            boxShadow: '0 0 0 2px rgba(0, 0, 0, 0.2)',
          },
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 4,
          padding: '0.5rem 1rem',
          boxShadow: 'none',
          transition: 'background-color 0.2s ease, border-color 0.2s ease',
          '&:focus': {
            boxShadow: 'none',
            outline: 'none',
          },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: '0 0 0 2px rgba(0, 0, 0, 0.2)',
          },
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
          '&:active': {
            boxShadow: 'none',
          },
        },
        containedPrimary: {
          backgroundColor: '#000000',
          color: '#FFFFFF',
          '&:hover': {
            backgroundColor: '#333333',
          },
        },
        containedSecondary: {
          backgroundColor: '#6D28D9',
          color: '#FFFFFF',
          '&:hover': {
            backgroundColor: '#5B21B6',
          },
        },
        outlined: {
          borderWidth: 1,
          padding: '0.5rem 1rem',
          '&:hover': {
            borderWidth: 1,
          },
        },
        outlinedPrimary: {
          borderColor: 'rgba(0, 0, 0, 0.2)',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
            borderColor: '#000000',
          },
        },
        text: {
          padding: '0.5rem 0.75rem',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
        },
        textPrimary: {
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
        },
        sizeSmall: {
          padding: '0.25rem 0.5rem',
          fontSize: '0.75rem',
        },
        sizeLarge: {
          padding: '0.75rem 1.5rem',
          fontSize: '0.9375rem',
        },
      },
    },
    MuiIconButton: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 4,
          padding: 8,
          transition: 'background-color 0.2s ease',
          '&:focus': {
            boxShadow: 'none',
            outline: 'none',
          },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: '0 0 0 2px rgba(0, 0, 0, 0.2)',
          },
        },
        sizeSmall: {
          padding: 4,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          boxShadow: 'none',
          backgroundImage: 'none',
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'rgba(0, 0, 0, 0.08)',
          transition: 'box-shadow 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: '16px 16px 8px',
        },
        title: {
          fontSize: '1rem',
          fontWeight: 600,
        },
        subheader: {
          fontSize: '0.875rem',
          color: '#525252',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '16px',
          '&:last-child': {
            paddingBottom: '16px',
          },
        },
      },
    },
    MuiCardActions: {
      styleOverrides: {
        root: {
          padding: '8px 16px 16px',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          fontWeight: 500,
          height: 24,
          fontSize: '0.75rem',
          background: 'transparent',
          border: '1px solid',
          borderColor: 'rgba(0, 0, 0, 0.16)',
          '&.MuiChip-colorPrimary': {
            backgroundColor: '#F5F5F5',
            color: '#171717',
            borderColor: 'rgba(0, 0, 0, 0.08)',
          },
          '&.MuiChip-colorSecondary': {
            backgroundColor: '#F5F0FF',
            color: '#5B21B6',
            borderColor: '#E9D5FF',
          },
          '&.MuiChip-colorSuccess': {
            backgroundColor: '#ECFDF5',
            color: '#047857',
            borderColor: '#A7F3D0',
          },
          '&.MuiChip-colorError': {
            backgroundColor: '#FEF2F2',
            color: '#B91C1C',
            borderColor: '#FECACA',
          },
          '&.MuiChip-colorWarning': {
            backgroundColor: '#FFFBEB',
            color: '#B45309',
            borderColor: '#FDE68A',
          },
          '&.MuiChip-colorInfo': {
            backgroundColor: '#F0F9FF',
            color: '#0369A1',
            borderColor: '#BAE6FD',
          },
        },
        label: {
          padding: '0 8px',
        },
        deleteIcon: {
          fontSize: '1rem',
          height: '1rem',
          width: '1rem',
          margin: '0 4px 0 -4px',
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          boxShadow: 'none',
          border: '1px solid',
          borderColor: 'rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#FAFAFA',
          '.MuiTableCell-root': {
            borderBottom: '1px solid',
            borderColor: 'rgba(0, 0, 0, 0.08)',
          },
        },
      },
    },
    MuiTableBody: {
      styleOverrides: {
        root: {
          '.MuiTableCell-root': {
            borderBottom: '1px solid',
            borderColor: 'rgba(0, 0, 0, 0.08)',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid',
          borderColor: 'rgba(0, 0, 0, 0.08)',
          padding: '12px 16px',
          fontSize: '0.875rem',
          color: '#171717',
        },
        head: {
          fontWeight: 600,
          backgroundColor: '#FAFAFA',
          color: '#171717',
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:last-child .MuiTableCell-root': {
            borderBottom: 0,
          },
          '&:hover': {
            backgroundColor: '#FAFAFA',
          },
        },
      },
    },
    MuiTablePagination: {
      styleOverrides: {
        root: {
          borderTop: '1px solid',
          borderColor: 'rgba(0, 0, 0, 0.08)',
        },
        selectLabel: {
          fontSize: '0.875rem',
          color: '#525252',
        },
        select: {
          fontSize: '0.875rem',
        },
        displayedRows: {
          fontSize: '0.875rem',
          color: '#525252',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          overflow: 'hidden',
          backgroundColor: '#F5F5F5',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          border: '1px solid',
          padding: '8px 16px',
          alignItems: 'center',
        },
        standardSuccess: {
          backgroundColor: '#ECFDF5',
          borderColor: '#A7F3D0',
          '& .MuiAlert-icon': {
            color: '#047857',
          },
        },
        standardError: {
          backgroundColor: '#FEF2F2',
          borderColor: '#FECACA',
          '& .MuiAlert-icon': {
            color: '#B91C1C',
          },
        },
        standardWarning: {
          backgroundColor: '#FFFBEB',
          borderColor: '#FDE68A',
          '& .MuiAlert-icon': {
            color: '#B45309',
          },
        },
        standardInfo: {
          backgroundColor: '#F0F9FF',
          borderColor: '#BAE6FD',
          '& .MuiAlert-icon': {
            color: '#0369A1',
          },
        },
        message: {
          fontSize: '0.875rem',
          padding: '4px 0',
        },
        icon: {
          fontSize: '1.125rem',
          opacity: 1,
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          fontWeight: 600,
        },
        rounded: {
          borderRadius: 4,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          borderRadius: 4,
          padding: '6px 12px',
          fontSize: '0.75rem',
          fontWeight: 500,
          lineHeight: 1.5,
          letterSpacing: '-0.01em',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        },
        arrow: {
          color: 'rgba(0, 0, 0, 0.9)',
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
      },
    },
    MuiModal: {
      styleOverrides: {
        root: {
          '.MuiBox-root, .MuiPaper-root': {
            borderRadius: 4,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
          }
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          padding: '8px 16px',
          minHeight: 'auto',
        },
      },
    },
    MuiListItem: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          paddingTop: 8,
          paddingBottom: 8,
          transition: 'background-color 0.2s ease',
          '&:focus': {
            outline: 'none',
          },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: '0 0 0 2px rgba(0, 0, 0, 0.2)',
            borderRadius: 4,
          },
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontSize: '0.875rem',
          fontWeight: 500,
        },
        secondary: {
          fontSize: '0.75rem',
          marginTop: 2,
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: 36,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(0, 0, 0, 0.16)',
          },
          '&:hover:not(.Mui-error) .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(0, 0, 0, 0.32)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#000000',
            borderWidth: 1,
          },
        },
        input: {
          padding: '10px 12px',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          fontWeight: 500,
          transform: 'translate(12px, 12px) scale(1)',
          '&.Mui-focused, &.MuiFormLabel-filled': {
            transform: 'translate(12px, -9px) scale(0.75)',
          },
        },
      },
    },
    MuiTab: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          fontWeight: 500,
          minWidth: 'auto',
          minHeight: 48,
          padding: '12px 16px',
          textTransform: 'none',
          transition: 'color 0.2s ease, background-color 0.2s ease',
          '&:focus': {
            outline: 'none',
          },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: '0 0 0 2px rgba(0, 0, 0, 0.2)',
            borderRadius: 4,
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 48,
          '& .MuiTabs-indicator': {
            height: 2,
            backgroundColor: '#000000',
          },
        },
        indicator: {
          height: 2,
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          width: 36,
          height: 20,
          padding: 0,
          '& .MuiSwitch-switchBase': {
            padding: 2,
            '&.Mui-checked': {
              transform: 'translateX(16px)',
              '& + .MuiSwitch-track': {
                opacity: 1,
                backgroundColor: '#000000',
              },
            },
          },
          '& .MuiSwitch-thumb': {
            width: 16,
            height: 16,
          },
          '& .MuiSwitch-track': {
            borderRadius: 10,
            opacity: 1,
            backgroundColor: '#E0E0E0',
          },
        },
      },
    },
  },
});

function App() {
  const [filters, setFilters] = useState({
    service: '',
    timeRange: '1h',
    logLevel: '',
    logSearch: '',
  });

  const handleFilterChange = (newFilters) => {
    setFilters({ ...filters, ...newFilters });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh',
        background: '#FFFFFF',
        position: 'relative',
      }}>
        <Header />
        <Box sx={{ 
          display: 'flex', 
          flex: 1, 
          p: { xs: 2, sm: 3, md: 3 }, 
          position: 'relative',
          zIndex: 1,
        }}>
          <Box 
            component="main" 
            sx={{ 
              flex: 1, 
              maxWidth: '1680px', 
              mx: 'auto', 
              width: '100%',
              position: 'relative',
              zIndex: 2,
            }}
          >
            <Routes>
              <Route path="/" element={<Navigate to="/overview" replace />} />
              <Route path="/overview" element={<Overview />} />
              <Route path="/logs" element={<Logs filters={filters} onFilterChange={handleFilterChange} />} />
              <Route path="/metrics" element={<Metrics filters={filters} onFilterChange={handleFilterChange} />} />
              <Route path="/traces" element={<Traces filters={filters} onFilterChange={handleFilterChange} />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Box>
        </Box>
        <Footer />
      </Box>
    </ThemeProvider>
  );
}

export default App; 