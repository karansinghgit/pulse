import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Badge from '@mui/material/Badge';
import Tooltip from '@mui/material/Tooltip';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import RouteOutlinedIcon from '@mui/icons-material/RouteOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Get the current path without the leading slash
  const currentPath = location.pathname.substring(1) || 'overview';
  
  const handleNavigation = (path) => {
    navigate(`/${path}`);
    if (mobileOpen) setMobileOpen(false);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const navItems = [
    { icon: <DashboardOutlinedIcon />, label: "Overview", value: "overview" },
    { icon: <ArticleOutlinedIcon />, label: "Logs", value: "logs" },
    { icon: <InsightsOutlinedIcon />, label: "Metrics", value: "metrics" },
    { icon: <RouteOutlinedIcon />, label: "Traces", value: "traces" },
    { icon: <SettingsOutlinedIcon />, label: "Settings", value: "settings" }
  ];

  const drawer = (
    <Box sx={{ width: 250 }}>
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        alignItems: 'center',
        height: 64,
      }}>
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            fontWeight: 600, 
            letterSpacing: '-0.01em'
          }}
        >
          Pulse
        </Typography>
      </Box>
      <Divider />
      <List sx={{ p: 1 }}>
        {navItems.map((item) => (
          <ListItem 
            button 
            key={item.value} 
            onClick={() => handleNavigation(item.value)}
            selected={currentPath === item.value}
            sx={{
              borderRadius: 0,
              mb: 0.5,
              height: 44,
              pl: 2,
              '&.Mui-selected': {
                bgcolor: 'action.selected',
                '&:hover': {
                  bgcolor: 'action.selected',
                },
              },
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
            disableRipple
          >
            <ListItemIcon 
              sx={{ 
                color: currentPath === item.value ? 'primary.main' : 'text.secondary',
                minWidth: 36
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
  );
  
  return (
    <>
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ 
          justifyContent: 'space-between', 
          height: { xs: 56, md: 64 },
          px: { xs: 2, md: 3 }
        }}>
          {isMobile && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={handleDrawerToggle}
              size="small"
              disableRipple
            >
              <MenuOutlinedIcon />
            </IconButton>
          )}
          
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center'
          }}>
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                fontWeight: 600, 
                letterSpacing: '-0.01em'
              }}
            >
              Pulse
            </Typography>
          </Box>
          
          {!isMobile && (
            <Box sx={{ 
              flex: 1, 
              display: 'flex', 
              justifyContent: 'center',
              ml: 4
            }}>
              {navItems.map((item) => (
                <Button
                  key={item.value}
                  startIcon={item.icon}
                  onClick={() => handleNavigation(item.value)}
                  color={currentPath === item.value ? "primary" : "inherit"}
                  variant="text"
                  disableRipple
                  sx={{
                    mx: 1,
                    py: 1,
                    fontWeight: currentPath === item.value ? 600 : 500,
                    borderRadius: 0,
                    borderBottom: currentPath === item.value ? '2px solid' : 'none',
                    borderColor: 'primary.main',
                    '&:hover': {
                      backgroundColor: 'transparent',
                      opacity: 0.8,
                    },
                    '&:focus': {
                      outline: 'none',
                      backgroundColor: 'transparent',
                    },
                    '&:focus-visible': {
                      outline: 'none',
                      boxShadow: 'none',
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    }
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          )}
          
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: 1
          }}>
            <Tooltip title="Notifications">
              <IconButton 
                color="inherit" 
                size="small"
                disableRipple
              >
                <Badge 
                  badgeContent={3} 
                  color="secondary"
                  sx={{
                    '& .MuiBadge-badge': {
                      top: 3,
                      right: 3,
                      border: '2px solid',
                      borderColor: 'background.paper',
                      padding: '0 4px',
                    }
                  }}
                >
                  <NotificationsNoneOutlinedIcon fontSize="small" />
                </Badge>
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>
      
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: 250, boxSizing: 'border-box' },
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
};

export default Header; 