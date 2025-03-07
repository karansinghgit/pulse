import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';

// Components
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';

// Pages
import Overview from './components/pages/Overview';
import Logs from './components/pages/Logs';
import Metrics from './components/pages/Metrics';
import Traces from './components/pages/Traces';
import Settings from './components/pages/Settings';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#3498db',
    },
    secondary: {
      main: '#2c3e50',
    },
    background: {
      default: '#f5f7fa',
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
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <Box sx={{ display: 'flex', flex: 1, p: 2 }}>
          <Sidebar filters={filters} onFilterChange={handleFilterChange} />
          <Box component="main" sx={{ flex: 1, ml: 2 }}>
            <Routes>
              <Route path="/" element={<Navigate to="/overview" replace />} />
              <Route path="/overview" element={<Overview />} />
              <Route path="/logs" element={<Logs filters={filters} />} />
              <Route path="/metrics" element={<Metrics filters={filters} />} />
              <Route path="/traces" element={<Traces filters={filters} />} />
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