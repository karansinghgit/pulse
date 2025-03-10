import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme, alpha } from '@mui/material/styles';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import RouteOutlinedIcon from '@mui/icons-material/RouteOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Logo from './Logo';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Get the current path without the leading slash
  const currentPath = location.pathname.substring(1) || 'overview';
  
  const handleNavigation = (path) => {
    navigate(`/${path}`);
    if (mobileOpen) setMobileOpen(false);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  
  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrolled]);

  const navItems = [
    { icon: <DashboardOutlinedIcon />, label: "Overview", value: "overview" },
    { icon: <ArticleOutlinedIcon />, label: "Logs", value: "logs" },
    { icon: <InsightsOutlinedIcon />, label: "Metrics", value: "metrics" },
    { icon: <RouteOutlinedIcon />, label: "Traces", value: "traces" },
    { icon: <SettingsOutlinedIcon />, label: "Settings", value: "settings" }
  ];

  const drawer = (
    <Box sx={{ width: 280 }}>
      <Box sx={{ 
        py: 2, 
        px: 3,
        display: 'flex', 
        alignItems: 'center',
        height: 64,
      }}>
        <Logo size={32} />
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            ml: 1.5,
            fontWeight: 600, 
            letterSpacing: '-0.01em'
          }}
        >
          Pulse
        </Typography>
      </Box>
      <Divider />
      <Box sx={{ py: 2 }}>
        <List sx={{ px: 2 }}>
          {navItems.map((item) => (
            <ListItem 
              button 
              key={item.value} 
              onClick={() => handleNavigation(item.value)}
              selected={currentPath === item.value}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                height: 44,
                pl: 2,
                transition: 'all 0.2s',
                '&.Mui-selected': {
                  backgroundColor: theme.palette.primary.main,
                  color: '#fff',
                  '& .MuiListItemIcon-root': {
                    color: '#fff',
                  },
                  '&:hover': {
                    backgroundColor: theme.palette.primary.dark,
                  },
                },
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                },
              }}
              className="interactive"
              disableRipple
            >
              <ListItemIcon 
                sx={{ 
                  color: currentPath === item.value ? 'inherit' : 'text.secondary',
                  minWidth: 36,
                  transition: 'color 0.2s',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.label} 
                primaryTypographyProps={{ 
                  fontWeight: currentPath === item.value ? 600 : 500,
                  fontSize: '0.875rem',
                }}
              />
            </ListItem>
          ))}
        </List>
      </Box>
    </Box>
  );
  
  return (
    <>
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={{
          backgroundColor: scrolled ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 1)',
          backdropFilter: scrolled ? 'blur(8px)' : 'none',
          borderBottom: '1px solid',
          borderColor: 'divider',
          transition: 'all 0.3s',
        }}
      >
        <Toolbar sx={{ 
          height: { xs: 56, md: 64 },
          px: { xs: 2, md: 3 },
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
          }}>
            {isMobile && (
              <IconButton
                edge="start"
                aria-label="menu"
                onClick={handleDrawerToggle}
                size="small"
                sx={{ mr: 1.5 }}
                disableRipple
              >
                <MenuOutlinedIcon />
              </IconButton>
            )}
            
            <Logo size={isSmallScreen ? 24 : 28} />
            
            {!isSmallScreen && (
              <Typography 
                variant="h6" 
                component="div" 
                sx={{ 
                  ml: 1.5,
                  fontWeight: 600, 
                  letterSpacing: '-0.01em'
                }}
              >
                Pulse
              </Typography>
            )}
          </Box>
          
          {!isMobile && (
            <Box component="nav" sx={{ display: 'flex', justifyContent: 'center' }}>
              <Box sx={{ 
                display: 'flex',
                borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.04),
                p: 0.5,
              }}>
                {navItems.map((item) => {
                  const isActive = currentPath === item.value;
                  return (
                    <Button
                      key={item.value}
                      startIcon={item.icon}
                      onClick={() => handleNavigation(item.value)}
                      disableRipple
                      className={isActive ? undefined : 'interactive'}
                      sx={{
                        mx: 0.5,
                        px: 2,
                        py: 1,
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? 'white' : 'text.primary',
                        backgroundColor: isActive ? 'primary.main' : 'transparent',
                        borderRadius: 1.5,
                        '&:hover': {
                          backgroundColor: isActive ? 'primary.dark' : alpha(theme.palette.primary.main, 0.08),
                        },
                        transition: 'all 0.2s',
                      }}
                    >
                      {item.label}
                    </Button>
                  );
                })}
              </Box>
            </Box>
          )}
          
          {/* Right side placeholder to balance the layout */}
          <Box sx={{ width: { xs: 'auto', md: '120px' } }} />
        </Toolbar>
      </AppBar>
      
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        PaperProps={{
          sx: {
            width: 280,
          }
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
};

export default Header; 