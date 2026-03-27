import { useState } from 'react';
import {
  Button,
  TextField,
  Typography,
  Snackbar,
  IconButton,
  Link,
  CircularProgress,
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
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '2.2rem',
    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
  },
  subText: {
    color: '#ffffff',
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
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
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
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const handleSubmit = useCatch(async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      if (!token) {
        await fetchOrThrow('/api/password/reset', {
          method: 'POST',
          body: new URLSearchParams(`email=${encodeURIComponent(email)}`),
        });
      } else {
        await fetchOrThrow('/api/password/update', {
          method: 'POST',
          body: new URLSearchParams(
            `token=${encodeURIComponent(token)}&password=${encodeURIComponent(password)}`,
          ),
        });
      }
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
          <Typography className={classes.title}>{t('loginReset')}</Typography>
          <Typography className={classes.subText}>
            {!token
              ? 'Enter your email to receive a password reset link'
              : 'Enter your new password to secure your account'}
          </Typography>
        </div>

        {!token ? (
          <TextField
            required
            fullWidth
            type="email"
            label={t('userEmail')}
            name="email"
            value={email}
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
          />
        ) : (
          <TextField
            required
            fullWidth
            label={t('userPassword')}
            name="password"
            value={password}
            type="password"
            autoComplete="new-password"
            onChange={(event) => setPassword(event.target.value)}
          />
        )}
        <Button
          variant="contained"
          color="primary"
          className={classes.resetButton}
          type="submit"
          disabled={loading || (!/(.+)@(.+)\.(.{2,})/.test(email) && !password)}
          fullWidth
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {loading ? 'Processing...' : t('loginReset')}
        </Button>

        <div className={classes.footer}>
          <Typography variant="body1" sx={{ color: '#ffffff', fontSize: '1rem', fontWeight: 500 }}>
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
        onClose={() => navigate('/login')}
        autoHideDuration={snackBarDurationShortMs}
        message={!token ? t('loginResetSuccess') : t('loginUpdateSuccess')}
      />
    </LoginLayout>
  );
};

export default ResetPasswordPage;
