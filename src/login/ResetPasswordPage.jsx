import { useState } from 'react';
import {
  Button,
  TextField,
  Typography,
  Snackbar,
  Alert,
  IconButton,
  Link,
  CircularProgress,
  InputAdornment,
  Box,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useTheme } from '@mui/material/styles';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoginLayout from './LoginLayout';
import { useTranslation } from '../common/components/LocalizationProvider';
import { snackBarDurationShortMs } from '../common/util/duration';
import { useCatch } from '../reactHelper';
import BackIcon from '@mui/icons-material/ArrowBack';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { motion } from 'framer-motion';

const useStyles = makeStyles()((theme) => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontWeight: 900,
    fontSize: '2.4rem',
    letterSpacing: '-1px',
    textShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  subText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '1.05rem',
    fontWeight: 500,
    textAlign: 'center',
    marginBottom: theme.spacing(2),
  },
  backButton: {
    position: 'absolute',
    top: theme.spacing(2),
    left: theme.spacing(2),
    color: 'rgba(255, 255, 255, 0.5)',
    '&:hover': {
      color: '#fff',
      background: 'rgba(255, 255, 255, 0.1)',
    },
  },
  input: {
    '& .MuiOutlinedInput-root': {
      borderRadius: '16px',
      background: 'rgba(255, 255, 255, 0.04)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      color: '#fff',
      transition: 'all 0.3s ease',
      '&:hover': {
        background: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      },
      '&.Mui-focused': {
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.5)',
        boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.15)',
      },
    },
    '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.5)' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#3b82f6' },
    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
  },
  resetButton: {
    borderRadius: '18px',
    padding: theme.spacing(2, 0),
    fontSize: '1.1rem',
    fontWeight: 900,
    textTransform: 'none',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    boxShadow: '0 12px 35px rgba(59, 130, 246, 0.45)',
    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    '&:hover': {
      background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
      transform: 'translateY(-4px)',
      boxShadow: '0 18px 45px rgba(59, 130, 246, 0.6)',
    },
  },
  loginLink: {
    color: '#3b82f6',
    fontWeight: 800,
    textDecoration: 'none',
    cursor: 'pointer',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
}));

const ResetPasswordPage = () => {
  const { classes } = useStyles();
  const theme = useTheme();
  const navigate = useNavigate();
  const t = useTranslation();

  const [searchParams] = useSearchParams();
  const token = searchParams.get('passwordReset');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  const handleSubmit = useCatch(async (event) => {
    event.preventDefault();
    setPasswordError('');
    if (token && password !== confirmPassword) {
      setPasswordError('Passwords do not match. Please try again.');
      return;
    }
    setLoading(true);
    try {
      if (!token) {
        await fetchOrThrow('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        setSnackbarMessage('Recovery credentials dispatched. Please check your enterprise inbox.');
        setSnackbarSeverity('success');
      } else {
        await fetchOrThrow('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, newPassword: password }),
        });
        setSnackbarMessage(
          'Identity security protocol updated successfully. You may now re-enter the platform.',
        );
        setSnackbarSeverity('success');
      }
      setSnackbarOpen(true);
    } catch (e) {
      setSnackbarMessage(e.message || 'Something went wrong. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  });

  return (
    <LoginLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <IconButton
          className={classes.backButton}
          onClick={() => navigate('/login')}
          sx={{
            position: 'absolute',
            top: 20,
            left: 20,
            color: 'rgba(255,255,255,0.5)',
            '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
          }}
        >
          <BackIcon />
        </IconButton>
      </motion.div>

      <form className={classes.container} onSubmit={handleSubmit}>
        <motion.div
          className={classes.header}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Typography className={classes.title}>
            {!token ? t('loginReset') || 'Recovery' : t('userPassword') || 'New Security'}
          </Typography>
          <Typography className={classes.subText}>
            {!token
              ? t('resetSubtext') || 'Securely reset your fleet dashboard access'
              : t('resetConfirmSubtext') || 'Establish your new encrypted credentials'}
          </Typography>
        </motion.div>

        {passwordError && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <Alert
              severity="error"
              sx={{
                borderRadius: '16px',
                fontWeight: 600,
                bgcolor: 'rgba(244, 67, 54, 0.1)',
                color: '#f44336',
              }}
            >
              {passwordError}
            </Alert>
          </motion.div>
        )}

        {!token ? (
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <TextField
              required
              fullWidth
              type="email"
              label={t('userEmail')}
              name="email"
              value={email}
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              className={classes.input}
            />
          </motion.div>
        ) : (
          <>
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <TextField
                required
                fullWidth
                label="New Secure Password"
                name="password"
                value={password}
                type="password"
                autoComplete="new-password"
                onChange={(event) => setPassword(event.target.value)}
                className={classes.input}
                sx={{ mb: 2 }}
              />
            </motion.div>
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <TextField
                required
                fullWidth
                label="Confirm Identity"
                name="confirmPassword"
                value={confirmPassword}
                type="password"
                autoComplete="new-password"
                error={!!confirmPassword && password !== confirmPassword}
                helperText={
                  confirmPassword && password !== confirmPassword ? 'Passwords do not match' : ''
                }
                onChange={(event) => setConfirmPassword(event.target.value)}
                className={classes.input}
              />
            </motion.div>
          </>
        )}

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            variant="contained"
            className={classes.resetButton}
            type="submit"
            disabled={loading || (!!token && (!password || password !== confirmPassword))}
            fullWidth
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : !token ? (
              'Request Reset'
            ) : (
              'Update Security'
            )}
          </Button>
        </motion.div>

        <motion.div
          className={classes.footer}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{ textAlign: 'center', marginTop: '16px' }}
        >
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
            Know your credentials?{' '}
            <Box
              component="span"
              sx={{
                color: '#3b82f6',
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' },
              }}
              onClick={() => navigate('/login')}
            >
              Sign In
            </Box>
          </Typography>
        </motion.div>
      </form>
      <Snackbar
        open={snackbarOpen}
        onClose={() => {
          setSnackbarOpen(false);
          if (snackbarSeverity === 'success') navigate('/login');
        }}
        autoHideDuration={4000}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: '100%', borderRadius: '12px', fontWeight: 700 }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </LoginLayout>
  );
};

export default ResetPasswordPage;
