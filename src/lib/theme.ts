import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1565c0' },
    secondary: { main: '#ff6f00' },
    background: { default: '#f5f7fa' }
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif'
  }
});
