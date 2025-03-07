import React, { useState } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import SaveIcon from '@mui/icons-material/Save';

const Settings = () => {
  const [settings, setSettings] = useState({
    serverUrl: window.location.origin,
    refreshRate: 1,
    maxItems: 1000,
    theme: 'light',
  });
  
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  
  const handleChange = (event) => {
    const { name, value } = event.target;
    setSettings({
      ...settings,
      [name]: value,
    });
  };
  
  const handleSliderChange = (name) => (event, newValue) => {
    setSettings({
      ...settings,
      [name]: newValue,
    });
  };
  
  const handleSave = () => {
    // In a real app, this would save to localStorage or an API
    localStorage.setItem('pulseSettings', JSON.stringify(settings));
    
    setSnackbar({
      open: true,
      message: 'Settings saved successfully!',
      severity: 'success',
    });
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false,
    });
  };
  
  return (
    <>
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Dashboard Settings
        </Typography>
        
        <Box component="form" sx={{ mt: 3 }}>
          <TextField
            fullWidth
            margin="normal"
            id="server-url"
            name="serverUrl"
            label="Server URL"
            value={settings.serverUrl}
            onChange={handleChange}
            helperText="The URL of your Pulse server"
          />
          
          <Typography id="refresh-rate-slider" gutterBottom sx={{ mt: 2 }}>
            Refresh Rate: {settings.refreshRate} second{settings.refreshRate !== 1 ? 's' : ''}
          </Typography>
          <Slider
            value={settings.refreshRate}
            onChange={handleSliderChange('refreshRate')}
            aria-labelledby="refresh-rate-slider"
            valueLabelDisplay="auto"
            step={1}
            marks
            min={1}
            max={60}
            sx={{ mt: 1, mb: 3 }}
          />
          
          <Typography id="max-items-slider" gutterBottom>
            Maximum Items to Display: {settings.maxItems}
          </Typography>
          <Slider
            value={settings.maxItems}
            onChange={handleSliderChange('maxItems')}
            aria-labelledby="max-items-slider"
            valueLabelDisplay="auto"
            step={100}
            marks
            min={100}
            max={5000}
            sx={{ mt: 1, mb: 3 }}
          />
          
          <FormControl fullWidth margin="normal">
            <InputLabel id="theme-select-label">Theme</InputLabel>
            <Select
              labelId="theme-select-label"
              id="theme"
              name="theme"
              value={settings.theme}
              label="Theme"
              onChange={handleChange}
            >
              <MenuItem value="light">Light</MenuItem>
              <MenuItem value="dark">Dark</MenuItem>
              <MenuItem value="system">System Default</MenuItem>
            </Select>
          </FormControl>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSave}
            >
              Save Settings
            </Button>
          </Box>
        </Box>
      </Paper>
      
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default Settings; 