import { defaultTheme } from 'react-admin'

export const ecomTheme = {
  ...defaultTheme,
  palette: {
    primary:    { main: '#5B21B6', light: '#7C3AED', dark: '#3B0764', contrastText: '#fff' },
    secondary:  { main: '#F97316', contrastText: '#fff' },
    success:    { main: '#10B981' },
    warning:    { main: '#F59E0B' },
    error:      { main: '#EF4444' },
    info:       { main: '#3B82F6' },
    background: { default: '#F1F5F9', paper: '#FFFFFF' },
    text:       { primary: '#1E293B', secondary: '#64748B' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    h6: { fontWeight: 700 },
  },
  components: {
    ...defaultTheme.components,
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #5B21B6 0%, #7C3AED 100%)',
          boxShadow: '0 4px 20px rgba(91,33,182,0.3)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, textTransform: 'none', fontWeight: 600 },
        containedPrimary: {
          background: 'linear-gradient(135deg, #5B21B6, #7C3AED)',
          '&:hover': { background: 'linear-gradient(135deg, #4C1D95, #6D28D9)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.08)', border: '1px solid #E2E8F0' },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { '&:hover': { backgroundColor: '#F8F5FF !important' } },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600, fontSize: '0.75rem' } },
    },
    RaMenuItemLink: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 8px',
          '&.RaMenuItemLink-active': {
            background: 'linear-gradient(135deg, #EDE9FE, #DDD6FE)',
            color: '#5B21B6',
            fontWeight: 700,
          },
        },
      },
    },
  },
}
