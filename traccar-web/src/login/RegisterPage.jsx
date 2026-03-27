import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Button,
  TextField,
  Typography,
  Snackbar,
  IconButton,
  Link,
  FormControlLabel,
  Checkbox,
  CircularProgress,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useNavigate } from 'react-router-dom';
import LoginLayout from './LoginLayout';
import { useTranslation } from '../common/components/LocalizationProvider';
import { snackBarDurationShortMs } from '../common/util/duration';
import { useCatch, useEffectAsync } from '../reactHelper';
import { sessionActions } from '../store';
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
    color: '#fff',
    fontWeight: 600,
    fontSize: '2rem',
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
  registerButton: {
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
    color: theme.palette.primary.light,
    fontWeight: 700,
    fontSize: '1rem',
    textDecoration: 'none',
    cursor: 'pointer',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
}));

const RegisterPage = () => {
  const { classes } = useStyles();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const t = useTranslation();

  const server = useSelector((state) => state.session.server);
  const totpForce = useSelector((state) => state.session.server.attributes.totpForce);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [totpKey, setTotpKey] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffectAsync(async () => {
    if (totpForce) {
      const response = await fetchOrThrow('/api/users/totp', { method: 'POST' });
      setTotpKey(await response.text());
    }
  }, [totpForce, setTotpKey]);

  const handleSubmit = useCatch(async (event) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match');
    }
    setLoading(true);
    try {
      await fetchOrThrow('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, totpKey }),
      });
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

      <div className={classes.container}>
        <div className={classes.header}>
          <Typography className={classes.title}>{t('loginRegister')}</Typography>
          <Typography className={classes.subText}>
            Join GeoSurePath today and start tracking with precision
          </Typography>
        </div>

        <TextField
          required
          fullWidth
          label={t('sharedName')}
          name="name"
          value={name}
          autoComplete="name"
          autoFocus
          onChange={(event) => setName(event.target.value)}
        />
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
        <TextField
          required
          fullWidth
          label="Confirm Password"
          name="confirmPassword"
          value={confirmPassword}
          type="password"
          autoComplete="new-password"
          error={!!confirmPassword && password !== confirmPassword}
          helperText={
            !!confirmPassword && password !== confirmPassword ? 'Passwords do not match' : ''
          }
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              sx={{ color: 'rgba(255,255,255,0.7)', '&.Mui-checked': { color: '#fff' } }}
            />
          }
          label={
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
              I agree to the{' '}
              <Link
                href="/terms.html"
                target="_blank"
                sx={{ color: 'primary.light', fontWeight: 700 }}
              >
                Terms and Conditions
              </Link>
            </Typography>
          }
        />
        {totpForce && (
          <TextField
            required
            fullWidth
            label={t('loginTotpKey')}
            name="totpKey"
            value={totpKey || ''}
            slotProps={{
              input: {
                readOnly: true,
              },
            }}
          />
        )}
        <Button
          variant="contained"
          color="primary"
          className={classes.registerButton}
          onClick={handleSubmit}
          type="submit"
          disabled={
            loading ||
            !acceptedTerms ||
            !name ||
            !password ||
            password !== confirmPassword ||
            !(server.newServer || /(.+)@(.+)\.(.{2,})/.test(email))
          }
          fullWidth
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {loading ? 'Registering...' : t('loginRegister')}
        </Button>

        <div className={classes.footer}>
          <Typography variant="body1" sx={{ color: '#ffffff', fontSize: '1rem', fontWeight: 500 }}>
            Already have an account?{' '}
            <Link
              className={classes.loginLink}
              onClick={() => navigate('/login')}
              component="button"
            >
              {t('loginLogin')}
            </Link>
          </Typography>
        </div>
      </div>

      <Snackbar
        open={snackbarOpen}
        onClose={() => {
          dispatch(sessionActions.updateServer({ ...server, newServer: false }));
          navigate('/login');
        }}
        autoHideDuration={snackBarDurationShortMs}
        message={t('loginCreated')}
      />
    </LoginLayout>
  );
};

export default RegisterPage;
