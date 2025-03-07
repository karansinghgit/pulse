import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import DashboardIcon from '@mui/icons-material/Dashboard';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the current path without the leading slash
  const currentPath = location.pathname.substring(1) || 'overview';
  
  const handleTabChange = (event, newValue) => {
    navigate(`/${newValue}`);
  };
  
  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
        <DashboardIcon sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Pulse Dashboard
        </Typography>
        <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
          <Tabs 
            value={currentPath} 
            onChange={handleTabChange} 
            indicatorColor="primary"
            textColor="primary"
            centered
          >
            <Tab label="Overview" value="overview" />
            <Tab label="Logs" value="logs" />
            <Tab label="Metrics" value="metrics" />
            <Tab label="Traces" value="traces" />
            <Tab label="Settings" value="settings" />
          </Tabs>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 