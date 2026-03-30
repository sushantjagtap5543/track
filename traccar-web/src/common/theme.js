// src/common/theme.js
import { createTheme } from '@mui/material/styles';

/**
 * Generates a MUI theme based on server settings, dark mode preference, and text direction.
 *
 * @param {object} server - Server configuration from Redux state.
 * @param {boolean} darkMode - Whether dark mode is enabled.
 * @param {('ltr'|'rtl')} direction - Text direction for localization.
 * @returns {object} MUI theme instance.
 */
export default function theme(server, darkMode, direction) {
  const primaryMain = '#3b82f6'; // blue-500
  const secondaryMain = '#10b981'; // green-500
  const backgroundDefault = darkMode ? '#0f172a' : '#f3f4f6'; // dark slate or light gray
  const textPrimary = darkMode ? '#ffffff' : '#1f2937'; // white or dark gray

  return createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: { main: primaryMain },
      secondary: { main: secondaryMain },
      background: { default: backgroundDefault },
      text: { primary: textPrimary },
    },
    shape: { borderRadius: 12 },
    direction,
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            textTransform: 'none',
          },
        },
      },
      MuiTextField: {
        defaultProps: { variant: 'filled' },
        styleOverrides: {
          root: {
            backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            '& .MuiFilledInput-root': {
              borderRadius: 12,
            },
          },
        },
      },
    },
  });
}
