import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, responsiveFontSizes } from '@mui/material/styles';
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

// Create the base theme
const createAppTheme = () => {
  // Define a sophisticated color system
  const systemColors = {
    gray: {
      50: '#FAFAFA',
      100: '#F4F4F5',
      200: '#E4E4E7',
      300: '#D4D4D8',
      400: '#A1A1AA',
      500: '#71717A',
      600: '#52525B',
      700: '#3F3F46',
      800: '#27272A',
      900: '#18181B',
    },
    blue: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      200: '#BFDBFE',
      300: '#93C5FD',
      400: '#60A5FA',
      500: '#3B82F6',
      600: '#2563EB',
      700: '#1D4ED8',
      800: '#1E40AF',
      900: '#1E3A8A',
    },
    purple: {
      50: '#FAF5FF',
      100: '#F3E8FF',
      200: '#E9D5FF',
      300: '#D8B4FE',
      400: '#C084FC',
      500: '#A855F7',
      600: '#9333EA',
      700: '#7E22CE',
      800: '#6B21A8',
      900: '#581C87',
    },
  };

  // Base theme configuration
  const baseTheme = createTheme({
    palette: {
      mode: 'light',
      common: {
        black: systemColors.gray[900],
        white: '#FFFFFF',
      },
      primary: {
        light: systemColors.blue[400],
        main: systemColors.blue[500],
        dark: systemColors.blue[600],
        contrastText: '#FFFFFF',
      },
      secondary: {
        light: systemColors.purple[400],
        main: systemColors.purple[500],
        dark: systemColors.purple[600],
        contrastText: '#FFFFFF',
      },
      error: {
        light: '#EF4444',
        main: '#DC2626',
        dark: '#B91C1C',
        contrastText: '#FFFFFF',
      },
      warning: {
        light: '#F59E0B',
        main: '#D97706',
        dark: '#B45309',
        contrastText: '#FFFFFF',
      },
      info: {
        light: '#06B6D4',
        main: '#0891B2',
        dark: '#0E7490',
        contrastText: '#FFFFFF',
      },
      success: {
        light: '#10B981',
        main: '#059669',
        dark: '#047857',
        contrastText: '#FFFFFF',
      },
      text: {
        primary: systemColors.gray[900],
        secondary: systemColors.gray[600],
        disabled: systemColors.gray[400],
      },
      divider: systemColors.gray[200],
      background: {
        paper: '#FFFFFF',
        default: systemColors.gray[50],
      },
      action: {
        active: systemColors.gray[900],
        hover: 'rgba(0, 0, 0, 0.04)',
        selected: 'rgba(59, 130, 246, 0.08)',
        disabled: 'rgba(0, 0, 0, 0.26)',
        disabledBackground: 'rgba(0, 0, 0, 0.04)',
      },
    },
    shape: {
      borderRadius: 4,
    },
    // Sophisticated typographic system
    typography: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
      fontWeightLight: 300,
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightSemiBold: 600,
      fontWeightBold: 700,
      h1: {
        fontWeight: 600,
        fontSize: '2.5rem',
        letterSpacing: '-0.025em',
        lineHeight: 1.2,
      },
      h2: {
        fontWeight: 600,
        fontSize: '2rem',
        letterSpacing: '-0.025em',
        lineHeight: 1.3,
      },
      h3: {
        fontWeight: 600,
        fontSize: '1.5rem',
        letterSpacing: '-0.02em',
        lineHeight: 1.4,
      },
      h4: {
        fontWeight: 600,
        fontSize: '1.25rem',
        letterSpacing: '-0.015em',
        lineHeight: 1.4,
      },
      h5: {
        fontWeight: 600,
        fontSize: '1.125rem',
        letterSpacing: '-0.01em',
        lineHeight: 1.5,
      },
      h6: {
        fontWeight: 600,
        fontSize: '1rem',
        letterSpacing: '-0.005em',
        lineHeight: 1.5,
      },
      subtitle1: {
        fontSize: '1rem',
        fontWeight: 500,
        letterSpacing: 0,
        lineHeight: 1.5,
      },
      subtitle2: {
        fontSize: '0.875rem',
        fontWeight: 500,
        letterSpacing: 0,
        lineHeight: 1.5,
      },
      body1: {
        fontSize: '1rem',
        letterSpacing: 0,
        lineHeight: 1.5,
      },
      body2: {
        fontSize: '0.875rem',
        letterSpacing: 0,
        lineHeight: 1.5,
      },
      button: {
        fontWeight: 500,
        fontSize: '0.875rem',
        letterSpacing: 0,
        textTransform: 'none',
      },
      caption: {
        fontSize: '0.75rem',
        letterSpacing: 0,
        lineHeight: 1.5,
      },
      overline: {
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.025em',
        lineHeight: 1.5,
        textTransform: 'uppercase',
      },
    },
    shadows: [
      'none',
      '0 1px 2px rgba(0, 0, 0, 0.04)',
      '0 1px 3px rgba(0, 0, 0, 0.08)',
      '0 2px 4px rgba(0, 0, 0, 0.08)',
      '0 4px 6px rgba(0, 0, 0, 0.08)',
      '0 8px 8px rgba(0, 0, 0, 0.08)',
      '0 12px 10px rgba(0, 0, 0, 0.08)',
      '0 16px 12px rgba(0, 0, 0, 0.08)',
      '0 20px 14px rgba(0, 0, 0, 0.08)',
      '0 24px 16px rgba(0, 0, 0, 0.08)',
      '0 28px 18px rgba(0, 0, 0, 0.08)',
      '0 32px 20px rgba(0, 0, 0, 0.08)',
      '0 36px 22px rgba(0, 0, 0, 0.08)',
      '0 40px 24px rgba(0, 0, 0, 0.08)',
      '0 44px 26px rgba(0, 0, 0, 0.08)',
      '0 48px 28px rgba(0, 0, 0, 0.08)',
      '0 52px 30px rgba(0, 0, 0, 0.08)',
      '0 56px 32px rgba(0, 0, 0, 0.08)',
      '0 60px 34px rgba(0, 0, 0, 0.08)',
      '0 64px 36px rgba(0, 0, 0, 0.08)',
      '0 68px 38px rgba(0, 0, 0, 0.08)',
      '0 72px 40px rgba(0, 0, 0, 0.08)',
      '0 76px 42px rgba(0, 0, 0, 0.08)',
      '0 80px 44px rgba(0, 0, 0, 0.08)',
    ],
    spacing: 8,
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
          '::-webkit-scrollbar': {
            width: '6px',
            height: '6px',
          },
          '::-webkit-scrollbar-track': {
            background: systemColors.gray[100],
          },
          '::-webkit-scrollbar-thumb': {
            background: systemColors.gray[300],
            borderRadius: '3px',
          },
          '::-webkit-scrollbar-thumb:hover': {
            background: systemColors.gray[400],
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
              boxShadow: `0 0 0 2px ${systemColors.blue[200]}`,
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
            transition: 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease',
            '&:focus': {
              boxShadow: 'none',
              outline: 'none',
            },
            '&:focus-visible': {
              outline: 'none',
              boxShadow: `0 0 0 2px ${systemColors.blue[200]}`,
            },
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
            '&:active': {
              boxShadow: 'none',
              transform: 'translateY(1px)',
            },
          },
          containedPrimary: {
            backgroundColor: systemColors.blue[500],
            '&:hover': {
              backgroundColor: systemColors.blue[600],
            },
          },
          containedSecondary: {
            backgroundColor: systemColors.purple[500],
            '&:hover': {
              backgroundColor: systemColors.purple[600],
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
            borderColor: systemColors.gray[300],
            color: systemColors.gray[900],
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.03)',
              borderColor: systemColors.gray[400],
            },
          },
          text: {
            padding: '0.5rem 0.75rem',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.03)',
            },
          },
          textPrimary: {
            '&:hover': {
              backgroundColor: 'rgba(59, 130, 246, 0.05)',
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
            borderRadius: 6,
            padding: 8,
            transition: 'background-color 0.2s ease, color 0.2s ease',
            '&:focus': {
              boxShadow: 'none',
              outline: 'none',
            },
            '&:focus-visible': {
              outline: 'none',
              boxShadow: `0 0 0 2px ${systemColors.blue[200]}`,
            },
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
          },
          colorPrimary: {
            '&:hover': {
              backgroundColor: 'rgba(59, 130, 246, 0.08)',
            },
          },
          sizeSmall: {
            padding: 6,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            boxShadow: 'none',
            backgroundImage: 'none',
            overflow: 'hidden',
            border: `1px solid ${systemColors.gray[200]}`,
            transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
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
            color: systemColors.gray[500],
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
            border: `1px solid ${systemColors.gray[200]}`,
            '&.MuiChip-colorPrimary': {
              backgroundColor: systemColors.blue[50],
              color: systemColors.blue[700],
              borderColor: systemColors.blue[200],
            },
            '&.MuiChip-colorSecondary': {
              backgroundColor: systemColors.purple[50],
              color: systemColors.purple[700],
              borderColor: systemColors.purple[200],
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
              backgroundColor: '#ECFEFF',
              color: '#0E7490',
              borderColor: '#BFF8FD',
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
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: systemColors.gray[200],
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            boxShadow: 'none',
            border: `1px solid ${systemColors.gray[200]}`,
            '&[href]': {
              textDecoration: 'none',
            },
          },
          rounded: {
            borderRadius: 8,
          },
          outlined: {
            borderColor: systemColors.gray[200],
          },
        },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            boxShadow: 'none',
            border: `1px solid ${systemColors.gray[200]}`,
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            backgroundColor: systemColors.gray[50],
            '.MuiTableCell-root': {
              borderBottom: `1px solid ${systemColors.gray[200]}`,
            },
          },
        },
      },
      MuiTableBody: {
        styleOverrides: {
          root: {
            '.MuiTableCell-root': {
              borderBottom: `1px solid ${systemColors.gray[200]}`,
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${systemColors.gray[200]}`,
            padding: '12px 16px',
            fontSize: '0.875rem',
            color: systemColors.gray[900],
          },
          head: {
            fontWeight: 600,
            backgroundColor: systemColors.gray[50],
            color: systemColors.gray[900],
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
              backgroundColor: systemColors.gray[50],
            },
          },
        },
      },
      MuiTablePagination: {
        styleOverrides: {
          root: {
            borderTop: `1px solid ${systemColors.gray[200]}`,
          },
          selectLabel: {
            fontSize: '0.875rem',
            color: systemColors.gray[500],
          },
          select: {
            fontSize: '0.875rem',
          },
          displayedRows: {
            fontSize: '0.875rem',
            color: systemColors.gray[500],
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            overflow: 'hidden',
            backgroundColor: systemColors.gray[100],
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: '#FFFFFF',
            boxShadow: 'none',
            borderBottom: `1px solid ${systemColors.gray[200]}`,
            color: systemColors.gray[900],
          },
          colorPrimary: {
            backgroundColor: '#FFFFFF',
            color: systemColors.gray[900],
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
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            border: `1px solid`,
            padding: '8px 16px',
            alignItems: 'center',
          },
          standardSuccess: {
            backgroundColor: '#F0FDF4',
            borderColor: '#BBF7D0',
            '& .MuiAlert-icon': {
              color: '#059669',
            },
          },
          standardError: {
            backgroundColor: '#FEF2F2',
            borderColor: '#FECACA',
            '& .MuiAlert-icon': {
              color: '#DC2626',
            },
          },
          standardWarning: {
            backgroundColor: '#FFFBEB',
            borderColor: '#FDE68A',
            '& .MuiAlert-icon': {
              color: '#D97706',
            },
          },
          standardInfo: {
            backgroundColor: '#F0F7FF',
            borderColor: '#BFDBFE',
            '& .MuiAlert-icon': {
              color: '#2563EB',
            },
          },
          message: {
            fontSize: '0.875rem',
            padding: '4px 0',
          },
          icon: {
            fontSize: '1.125rem',
            opacity: 1,
            padding: '4px 0',
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
            borderRadius: 6,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            borderRadius: 4,
            padding: '6px 10px',
            fontSize: '0.75rem',
            fontWeight: 500,
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.15)',
          },
          arrow: {
            color: 'rgba(0, 0, 0, 0.75)',
          },
        },
      },
      MuiBackdrop: {
        styleOverrides: {
          root: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
          },
        },
      },
      MuiModal: {
        styleOverrides: {
          root: {
            '.MuiBox-root, .MuiPaper-root': {
              borderRadius: 8,
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
            }
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
            borderRadius: 6,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: systemColors.gray[300],
              transition: 'border-color 0.2s ease',
            },
            '&:hover:not(.Mui-error) .MuiOutlinedInput-notchedOutline': {
              borderColor: systemColors.gray[400],
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: systemColors.blue[500],
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
      MuiFormHelperText: {
        styleOverrides: {
          root: {
            fontSize: '0.75rem',
            marginTop: 4,
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
              boxShadow: `0 0 0 2px ${systemColors.blue[200]}`,
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          select: {
            paddingTop: 12,
            paddingBottom: 12,
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
            padding: '12px 16px',
            textTransform: 'none',
            transition: 'color 0.2s ease, border-color 0.2s ease',
            '&:focus': {
              outline: 'none',
            },
            '&:focus-visible': {
              outline: 'none',
              boxShadow: `0 0 0 2px ${systemColors.blue[200]}`,
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
              borderRadius: 1,
            },
          },
          indicator: {
            height: 2,
            borderRadius: 1,
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
                  backgroundColor: systemColors.blue[500],
                },
              },
            },
            '& .MuiSwitch-thumb': {
              width: 16,
              height: 16,
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            },
            '& .MuiSwitch-track': {
              borderRadius: 10,
              opacity: 1,
              backgroundColor: systemColors.gray[300],
            },
          },
        },
      },
    },
  });

  // Apply responsive font sizes
  return responsiveFontSizes(baseTheme);
};

// Create the theme
const theme = createAppTheme();

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