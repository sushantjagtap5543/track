import { useEffect, useRef } from 'react';
import { Box, Paper, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { makeStyles } from 'tss-react/mui';
import { motion } from 'framer-motion';
import LogoImage from './LogoImage';

const useStyles = makeStyles()((theme) => ({
  root: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#020617',
    backgroundImage: 'url(/traccar_login_bg.png)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    display: 'flex',
    width: '100%',
    height: '100%',
    position: 'relative',
    zIndex: 10,
    [theme.breakpoints.down('md')]: {
      flexDirection: 'column',
      overflowY: 'auto',
    },
  },
  visualSide: {
    flex: 1.4,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: theme.spacing(8),
    position: 'relative',
    background: 'rgba(15, 23, 42, 0.2)',
    borderRight: '1px solid rgba(255, 255, 255, 0.05)',
    [theme.breakpoints.down('md')]: {
      display: 'none',
    },
  },
  formSide: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(4),
    background: 'rgba(2, 6, 23, 0.01)',
    backdropFilter: 'none',
    boxShadow: 'none',
    [theme.breakpoints.down('md')]: {
      flex: 'none',
      width: '100%',
      minHeight: '100%',
      backdropFilter: 'blur(30px)',
    },
  },
  tagline: {
    color: '#fff',
    fontWeight: 900,
    fontSize: '5.5rem',
    lineHeight: 0.95,
    marginBottom: theme.spacing(4),
    letterSpacing: '-5px',
    background: 'linear-gradient(to bottom, #fff 40%, rgba(59, 130, 246, 0.6) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    filter: 'drop-shadow(0 0 20px rgba(59, 130, 246, 0.3))',
  },
  subTagline: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '1.4rem',
    fontWeight: 500,
    maxWidth: '600px',
    lineHeight: 1.5,
    borderLeft: '3px solid #3b82f6',
    paddingLeft: theme.spacing(5),
    letterSpacing: '0.8px',
  },
  paper: {
    padding: theme.spacing(8),
    width: '100%',
    maxWidth: '580px',
    background: 'transparent',
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(4),
    position: 'relative',
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
    opacity: 0.8,
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
        transition={{ duration: 1 }}
      >
        <div className={classes.visualSide}>
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 1.2, type: 'spring', damping: 20 }}
          >
            <LogoImage color="#fff" width={250} />

            
            <Typography className={classes.tagline} sx={{ fontSize: '3.5rem', letterSpacing: '-2px', mb: 1 }}>
              WELCOME
              <br />
              TO GEOSURE
            </Typography>
            <Typography variant="h5" sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 300, mb: 6, letterSpacing: '1px' }}>
                Simple. Secure. Sovereign.
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, opacity: 0.8 }}>
                {[
                    'Real-time Satellite Tracking',
                    'Biometric Security Protocols',
                    'Advanced Fleet Analytics'
                ].map((text, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 10px #3b82f6' }} />
                        <Typography sx={{ color: '#fff', fontSize: '1rem', fontWeight: 500, letterSpacing: '0.5px' }}>
                            {text}
                        </Typography>
                    </Box>
                ))}
            </Box>
          </motion.div>
        </div>

        <div className={classes.formSide}>
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 1, type: 'spring', stiffness: 80 }}
            style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
          >
            <Box className={classes.paper}>
              {children}
            </Box>
          </motion.div>
        </div>
      </motion.div>
    </Box>
  );
};

export default LoginLayout;
