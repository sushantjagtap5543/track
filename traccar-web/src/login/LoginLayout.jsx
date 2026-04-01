import { Box, Paper, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { makeStyles } from 'tss-react/mui';
import BackgroundImage from '../resources/images/login-bg.png';
import { motion } from 'framer-motion';
import LogoImage from './LogoImage';

const useStyles = makeStyles()((theme) => ({
  root: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    backgroundImage: `url(${BackgroundImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(3px)',
      zIndex: 1,
    },
  },
  content: {
    display: 'flex',
    width: '100%',
    maxWidth: '1200px',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing(4),
    position: 'relative',
    zIndex: 2,
    [theme.breakpoints.down('md')]: {
      flexDirection: 'column',
      justifyContent: 'center',
      padding: theme.spacing(2),
    },
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    flex: 1,
    paddingRight: theme.spacing(4),
    [theme.breakpoints.down('md')]: {
      paddingRight: 0,
      paddingBottom: theme.spacing(4),
      alignItems: 'center',
      textAlign: 'center',
    },
  },
  tagline: {
    color: '#fff',
    fontWeight: 900,
    fontSize: '4rem',
    lineHeight: 1.1,
    marginBottom: theme.spacing(2),
    letterSpacing: '-2px',
    textShadow: '0 8px 32px rgba(0,0,0,0.5)',
    [theme.breakpoints.down('md')]: {
      fontSize: '2.8rem',
    },
  },
  subTagline: {
    color: '#ffffff',
    fontSize: '1.4rem',
    fontWeight: 500,
    maxWidth: '550px',
    lineHeight: 1.5,
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
    borderLeft: `4px solid ${theme.palette.primary.main}`,
    paddingLeft: theme.spacing(3),
  },
  formWrapper: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(4),
  },
  paper: {
    padding: theme.spacing(6),
    width: '100%',
    maxWidth: '520px',
    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)',
    backdropFilter: 'blur(40px) saturate(180%)',
    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '40px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(3),
    position: 'relative',
    overflow: 'hidden',
    '&::after': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '1px',
      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
    },
  },
}));

const LoginLayout = ({ children }) => {
  const { classes } = useStyles();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box component="main" className={classes.root} sx={{ overflow: 'hidden' }}>
      {/*  Premium Glass Blobs  */}
      <Box sx={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.7 }}>
        <Box sx={{
          position: 'absolute', top: '10%', left: '15%', width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)',
          filter: 'blur(80px)', animation: 'blob1 20s infinite alternate linear',
          '@keyframes blob1': { '0%': { transform: 'translate(0, 0) scale(1)' }, '100%': { transform: 'translate(100px, 50px) scale(1.2)' } }
        }} />
        <Box sx={{
          position: 'absolute', bottom: '15%', right: '20%', width: '450px', height: '450px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)',
          filter: 'blur(100px)', animation: 'blob2 25s infinite alternate-reverse linear',
          '@keyframes blob2': { '0%': { transform: 'translate(0, 0)' }, '100%': { transform: 'translate(-120px, -80px)' } }
        }} />
        <Box sx={{
          position: 'absolute', top: '40%', right: '10%', width: '300px', height: '300px',
          background: 'radial-gradient(circle, rgba(236, 72, 153, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)', animation: 'blob3 15s infinite alternate linear',
          '@keyframes blob3': { '0%': { transform: 'translate(0, 0)' }, '100%': { transform: 'translate(40px, 150px)' } }
        }} />
      </Box>

      <motion.div
        className={classes.content}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className={classes.sidebar}>
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 1, type: 'spring', damping: 20 }}
          >
            <LogoImage color="#fff" width={isMobile ? 120 : 200} />
            <Typography className={classes.tagline}>
              GeoSurePath
              <br />
              Global Tracking
            </Typography>
            <Typography className={classes.subTagline}>
              Smart Logistics & Real-Time Fleet Monitoring. Powered by GeoSurePath Advanced Tracking Infrastructure.
            </Typography>
          </motion.div>
        </div>

        <div className={classes.formWrapper}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            style={{ width: '100%', maxWidth: '480px' }}
          >
            <Paper className={classes.paper} elevation={0}>
              {children}
            </Paper>
          </motion.div>
        </div>
      </motion.div>
    </Box>
  );
};

export default LoginLayout;
