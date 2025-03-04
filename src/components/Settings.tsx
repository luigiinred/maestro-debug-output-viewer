import React from 'react';
import {
  Box,
  Typography,
  Switch,
  Divider,
  Button,
  Container,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  useMediaQuery,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

export const Settings: React.FC = () => {
  const { mode, toggleTheme, setThemeMode } = useTheme();
  const navigate = useNavigate();
  const isSmallScreen = useMediaQuery('(max-width:600px)');

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 3,
          width: '100%',
          overflow: 'auto'
        }}
      >
        <Container maxWidth="md">
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
            <IconButton 
              onClick={handleGoBack} 
              sx={{ mr: 2 }}
              aria-label="go back"
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" component="h1">
              Settings
            </Typography>
          </Box>

          <Card sx={{ mb: 4 }}>
            <CardHeader title="Appearance" />
            <Divider />
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {mode === 'dark' ? <DarkModeIcon sx={{ mr: 1 }} /> : <LightModeIcon sx={{ mr: 1 }} />}
                  <Typography variant="body1">
                    Dark Mode
                  </Typography>
                </Box>
                <Switch
                  checked={mode === 'dark'}
                  onChange={toggleTheme}
                  inputProps={{ 'aria-label': 'toggle dark mode' }}
                />
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: isSmallScreen ? 'column' : 'row', gap: 2, mt: 3 }}>
                <Button 
                  variant={mode === 'light' ? 'contained' : 'outlined'} 
                  onClick={() => setThemeMode('light')}
                  startIcon={<LightModeIcon />}
                  fullWidth={isSmallScreen}
                >
                  Light
                </Button>
                <Button 
                  variant={mode === 'dark' ? 'contained' : 'outlined'} 
                  onClick={() => setThemeMode('dark')}
                  startIcon={<DarkModeIcon />}
                  fullWidth={isSmallScreen}
                >
                  Dark
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={() => {
                    localStorage.removeItem('themeMode');
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    setThemeMode(prefersDark ? 'dark' : 'light');
                  }}
                  fullWidth={isSmallScreen}
                >
                  Use System Setting
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
            Maestro Test Viewer Settings
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}; 