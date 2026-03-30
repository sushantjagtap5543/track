import { grey, green, indigo } from '@mui/material/colors';

const validatedColor = (color) => (/^#([0-9A-Fa-f]{3}){1,2}$/.test(color) ? color : null);

export default (server, darkMode) => ({
  mode: 'dark', // Force dark mode for premium look
  background: {
    default: grey[900],
    paper: grey[800],
  },
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.7)',
    disabled: 'rgba(255, 255, 255, 0.5)',
  },
  primary: {
    main:
      validatedColor(server?.attributes?.colorPrimary) || '#3b82f6',
  },
  secondary: {
    main:
      validatedColor(server?.attributes?.colorSecondary) || '#10b981',
  },
  neutral: {
    main: grey[500],
  },
  geometry: {
    main: '#3bb2d0',
  },
  alwaysDark: {
    main: grey[900],
  },
});
