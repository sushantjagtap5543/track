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
    fontWeight: 700,
    fontSize: '3.5rem',
    lineHeight: 1.2,
    marginBottom: theme.spacing(2),
    textShadow: '0 4px 12px rgba(0,0,0,0.5)',
    [theme.breakpoints.down('md')]: {
      fontSize: '2.5rem',
    },
  },
  subTagline: {
    color: '#ffffff',
    fontSize: '1.25rem',
    opacity: 1,
    maxWidth: '500px',
    lineHeight: 1.6,
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
  formWrapper: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(4),
  },
  paper: {
    padding: theme.spacing(5),
    width: '100%',
    maxWidth: '480px',
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(25px) saturate(200%)',
    WebkitBackdropFilter: 'blur(25px) saturate(200%)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: theme.spacing(3),
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
    '& .MuiTextField-root': {
      '& .MuiOutlinedInput-root': {
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: theme.spacing(1.5),
        color: '#ffffff',
        fontSize: '1.1rem',
        '& fieldset': {
          borderColor: 'rgba(255, 255, 255, 0.5)',
        },
        '&:hover fieldset': {
          borderColor: 'rgba(255, 255, 255, 0.8)',
        },
        '&.Mui-focused fieldset': {
          borderColor: theme.palette.primary.light,
          borderWidth: '2px',
        },
      },
      '& .MuiInputLabel-root': {
        color: '#ffffff',
        fontSize: '1.1rem',
        fontWeight: 600,
        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        '&.Mui-focused': {
          color: theme.palette.primary.light,
        },
      },
      '& .MuiInputBase-input': {
        color: '#ffffff',
        fontSize: '1.1rem',
        textTransform: 'none',
        '&::placeholder': {
          textTransform: 'none',
        },
      },
    },
  },
}));

const LoginLayout = ({ children }) => {
  const { classes } = useStyles();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box component="main" className={classes.root}>
      <motion.div
        className={classes.content}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className={classes.sidebar}>
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <LogoImage color="#fff" width={isMobile ? 120 : 180} />
            <Typography className={classes.tagline}>
              Precision Tracking
              <br />
              For Your Fleet
            </Typography>
            <Typography className={classes.subTagline}>
              Experience the next generation of GPS intelligence. Premium SaaS solutions for vehicle
              monitoring, security, and real-time alerts.
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
