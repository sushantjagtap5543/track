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
    color: theme.palette.text.primary,
    fontWeight: 700,
    fontSize: '2.2rem',
    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
  },
  subText: {
    color: theme.palette.text.primary,
    fontSize: '1.05rem',
    fontWeight: 500,
    textAlign: 'center',
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
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
  resetButton: {
    borderRadius: theme.spacing(1.5),
    padding: theme.spacing(1.5, 0),
    fontSize: '1rem',
    fontWeight: 600,
    textTransform: 'none',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
    '&:hover': {
      background: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)',
    },
  },
  footer: {
    display: 'flex',
    justifyContent: 'center',
  },
  loginLink: {
    color: theme.palette.primary.main,
    fontWeight: 600,
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
        await fetchOrThrow('/api/password/reset', {
          method: 'POST',
          body: new URLSearchParams(`email=${encodeURIComponent(email)}`),
        });
        setSnackbarMessage('Password reset email sent. Please check your inbox.');
        setSnackbarSeverity('success');
      } else {
        await fetchOrThrow('/api/password/update', {
          method: 'POST',
          body: new URLSearchParams(
            `token=${encodeURIComponent(token)}&password=${encodeURIComponent(password)}`,
          ),
        });
        setSnackbarMessage('Password updated successfully. You can now log in.');
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
      <IconButton className={classes.backButton} onClick={() => navigate('/login')}>
        <BackIcon />
      </IconButton>

      <form className={classes.container} onSubmit={handleSubmit}>
        <div className={classes.header}>
          <Typography className={classes.title}>
            {!token ? 'Forgot Password?' : 'Set New Password'}
          </Typography>
          <Typography className={classes.subText}>
            {!token
              ? 'Enter your email and we will send you a reset link'
              : 'Enter and confirm your new password below'}
          </Typography>
        </div>

        {passwordError && (
          <Alert severity="error" sx={{ borderRadius: '12px', fontWeight: 600 }}>
            {passwordError}
          </Alert>
        )}

        {!token ? (
          <TextField
            required
            fullWidth
            type="email"
            label="Your Email"
            name="email"
            value={email}
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
          />
        ) : (
          <>
            <TextField
              required
              fullWidth
              label="New Password"
              name="password"
              value={password}
              type="password"
              autoComplete="new-password"
              onChange={(event) => setPassword(event.target.value)}
            />
            <TextField
              required
              fullWidth
              label="Confirm New Password"
              name="confirmPassword"
              value={confirmPassword}
              type="password"
              autoComplete="new-password"
              error={!!confirmPassword && password !== confirmPassword}
              helperText={confirmPassword && password !== confirmPassword ? 'Passwords do not match' : ''}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </>
        )}
        <Button
          variant="contained"
          color="primary"
          className={classes.resetButton}
          type="submit"
          disabled={loading || (!!token && (!password || password !== confirmPassword))}
          fullWidth
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {loading ? 'Please wait...' : (!token ? 'Send Reset Link' : 'Update Password')}
        </Button>

        <div className={classes.footer}>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem', fontWeight: 500 }}>
            Remembered your password?{' '}
            <Link
              className={classes.loginLink}
              onClick={() => navigate('/login')}
              sx={{
                color: theme.palette.primary.light,
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Back to Login
            </Link>
          </Typography>
        </div>
      </form>
      <Snackbar
        open={snackbarOpen}
        onClose={() => { setSnackbarOpen(false); if (snackbarSeverity === 'success') navigate('/login'); }}
        autoHideDuration={4000}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} variant="filled" sx={{ width: '100%', borderRadius: '12px', fontWeight: 700 }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </LoginLayout>
  );
};

export default ResetPasswordPage;
