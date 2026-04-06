import { Box, Typography } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { motion } from 'framer-motion';

const useStyles = makeStyles()((theme) => ({
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(2),
    userSelect: 'none',
    marginBottom: theme.spacing(4),
  },
  logoWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    width: '56px',
    height: '56px',
    filter: 'drop-shadow(0 0 15px rgba(59, 130, 246, 0.5))',
  },
  glow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)',
    filter: 'blur(10px)',
    zIndex: -1,
  },
  textContainer: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1,
  },
  brandName: {
    fontWeight: 900,
    fontSize: '2.4rem',
    letterSpacing: '-1.5px',
    background: 'linear-gradient(to right, #ffffff 0%, #94a3b8 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  brandSlogan: {
    fontSize: '0.75rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '3px',
    background: 'linear-gradient(to right, #3b82f6, #10b981)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginTop: '4px',
  },
}));

const LogoImage = () => {
  const { classes } = useStyles();

  return (
    <Box className={classes.root}>
      <motion.div
        className={classes.logoWrapper}
        animate={{
          scale: [1, 1.05, 1],
          rotate: [0, 2, -2, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div className={classes.glow} />
        <img src="/logo.svg" alt="Logo" className={classes.logoIcon} />
      </motion.div>
      <div className={classes.textContainer}>
        <Typography variant="h1" className={classes.brandName}>
          GeoSurePath
        </Typography>
        <Typography className={classes.brandSlogan}>Elite Fleet Intelligence</Typography>
      </div>
    </Box>
  );
};

export default LogoImage;
