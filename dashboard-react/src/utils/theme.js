import { createTheme, responsiveFontSizes } from '@mui/material/styles';

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

// Create the base theme
const createAppTheme = () => {
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
    },
    // Enhanced component styles
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '*': {
            boxSizing: 'border-box',
          },
          html: {
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            height: '100%',
            width: '100%',
          },
          body: {
            height: '100%',
            width: '100%',
            scrollBehavior: 'smooth',
          },
          '#root': {
            height: '100%',
            width: '100%',
          },
          a: {
            textDecoration: 'none',
            color: 'inherit',
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
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: systemColors.gray[400],
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderWidth: 1,
              borderColor: systemColors.blue[500],
            },
          },
          notchedOutline: {
            borderColor: systemColors.gray[300],
            transition: 'border-color 0.2s ease',
          },
          input: {
            padding: '10px 12px',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderRadius: 6,
            boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.06), 0px 1px 3px rgba(0, 0, 0, 0.1)'
          },
        },
      },
    },
  });

  return responsiveFontSizes(baseTheme);
};

// Export theme
export const theme = createAppTheme(); 