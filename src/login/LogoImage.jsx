import { Box, Typography } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import SatelliteAltIcon from '@mui/icons-material/SatelliteAlt';

const useStyles = makeStyles()((theme) => ({
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    userSelect: 'none',
  },
  logoIcon: {
    fontSize: '2.5rem',
    background: 'linear-gradient(135deg, #2563eb 0%, #10b981 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
  },
  textContainer: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1,
  },
  brandName: {
    fontWeight: 800,
    fontSize: '1.8rem',
    letterSpacing: '-0.5px',
    background: 'linear-gradient(to right, #fff 0%, #cbd5e1 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  brandSlogan: {
    fontSize: '0.65rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '2px',
    color: theme.palette.primary.light,
    marginTop: '2px',
  },
}));

const LogoImage = () => {
  const { classes } = useStyles();

  return (
    <Box className={classes.root}>
      <img src="/traccar_logo.png" alt="Logo" className={classes.logoIcon} />
      <div className={classes.textContainer}>
        <Typography variant="h1" className={classes.brandName}>
          GeoSurePath
        </Typography>
        <Typography className={classes.brandSlogan}>SaaS Tracking Platform</Typography>
      </div>
    </Box>
  );
};

export default LogoImage;
