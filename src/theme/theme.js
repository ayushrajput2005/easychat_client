import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1a1a2e',
      light: '#2d2d44',
      dark: '#0d0d1a',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#6c63ff',
      light: '#9d95ff',
      dark: '#4a44cc',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f5f5f7',
      paper: '#ffffff',
    },
    text: {
      primary: '#1a1a2e',
      secondary: '#6b7280',
    },
    divider: '#e5e7eb',
    error: {
      main: '#ef4444',
    },
    success: {
      main: '#22c55e',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.01em' },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 500 },
    body1: { lineHeight: 1.6 },
    body2: { lineHeight: 1.5 },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        html, body, #root { height: 100%; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 2px; }
      `,
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 50,
          padding: '10px 24px',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: '#f9fafb',
            '& fieldset': { borderColor: '#e5e7eb' },
            '&:hover fieldset': { borderColor: '#9ca3af' },
            '&.Mui-focused fieldset': { borderColor: '#6c63ff', borderWidth: 2 },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: '0px 4px 16px rgba(108, 99, 255, 0.35)',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
  },
});

export default theme;
