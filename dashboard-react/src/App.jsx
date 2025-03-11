import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Theme
import { theme } from './utils/theme';

// Components
import Layout from './components/Layout';

// Contexts
import { FilterProvider } from './contexts/FilterContext';

// Pages
import Overview from './components/pages/Overview';
import Logs from './components/pages/Logs';
import Metrics from './components/pages/Metrics';
import Traces from './components/pages/Traces';
import Settings from './components/pages/Settings';

/**
 * Main application component
 */
function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <FilterProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<Overview />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/metrics" element={<Metrics />} />
            <Route path="/traces" element={<Traces />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </FilterProvider>
    </ThemeProvider>
  );
}

export default App; 