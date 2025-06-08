import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import App from './App';
import './index.css';

const theme = createTheme({
  typography: {
    fontFamily: '"Roboto", sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.5px'
    },
    h2: {
      fontWeight: 600,
      letterSpacing: '-0.25px'
    },
    h3: {
      fontWeight: 600,
      letterSpacing: '0px'
    },
    h4: {
      fontWeight: 500,
      letterSpacing: '0.25px'
    },
    h5: {
      fontWeight: 500,
      letterSpacing: '0px'
    },
    h6: {
      fontWeight: 500,
      letterSpacing: '0.15px'
    },
    subtitle1: {
      fontWeight: 400,
      letterSpacing: '0.15px'
    },
    subtitle2: {
      fontWeight: 500,
      letterSpacing: '0.1px'
    },
    body1: {
      fontWeight: 400,
      letterSpacing: '0.5px'
    },
    body2: {
      fontWeight: 400,
      letterSpacing: '0.25px'
    },
    button: {
      fontWeight: 500,
      letterSpacing: '0.75px',
      textTransform: 'none'
    }
  },
  palette: {
    mode: 'dark',
    primary: {
      main: '#00ff87',
    },
    secondary: {
      main: '#60efff',
    },
    background: {
      default: '#1e1e1e',
      paper: '#2d2d2d',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          fontFamily: '"Roboto", sans-serif',
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          fontFamily: '"Roboto", sans-serif',
        },
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
