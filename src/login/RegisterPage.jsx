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
  Box,
  Alert,
  Fade,
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
import { motion } from 'framer-motion';

const useStyles = makeStyles()((theme) => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2.5),
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
  },
  title: {
    color: '#fff',
    fontWeight: 900,
    fontSize: '2.5rem',
    letterSpacing: '-1.5px',
    lineHeight: 1.1,
    textShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  subText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '1rem',
    fontWeight: 500,
    textAlign: 'center',
    marginTop: theme.spacing(1),
  },
  backButton: {
    position: 'absolute',
    top: theme.spacing(2),
    left: theme.spacing(2),
    color: 'rgba(255, 255, 255, 0.5)',
    zIndex: 10,
    '&:hover': {
      color: theme.palette.primary.main,
      background: 'rgba(255, 255, 255, 0.1)',
      transform: 'translateX(-4px)',
    },
  },
  input: {
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
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
    '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.9rem' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#3b82f6' },
    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
  },
  registerButton: {
    borderRadius: '14px',
    padding: theme.spacing(1.8, 0),
    fontSize: '1.05rem',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    boxShadow: '0 8px 25px rgba(59, 130, 246, 0.3)',
    transition: 'all 0.3s ease',
    marginTop: theme.spacing(1),
    '&:hover': {
      background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
      transform: 'translateY(-2px)',
      boxShadow: '0 12px 35px rgba(59, 130, 246, 0.4)',
    },
  },
  footer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: theme.spacing(1),
  },
  loginLink: {
    color: theme.palette.primary.light,
    fontWeight: 800,
    fontSize: '0.95rem',
    textDecoration: 'none',
    cursor: 'pointer',
    '&:hover': {
      textDecoration: 'underline',
      color: '#fff',
    },
  },
}));

const RegisterPage = () => {
  const { classes } = useStyles();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const t = useTranslation();

  const server = useSelector((state) => state.session.server);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [errorText, setErrorText] = useState('');

  const isFormValid = () => {
    return (
      name.trim() &&
      email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) &&
      password.length >= 8 &&
      password === confirmPassword &&
      acceptedTerms
    );
  };

  const handleSubmit = useCatch(async (event) => {
    event.preventDefault();
    if (!isFormValid()) return;

    setLoading(true);
    setErrorText('');
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setSnackbarSeverity('success');
        setErrorText('Registration Successful!');
        setSnackbarOpen(true);
        setTimeout(() => {
          dispatch(sessionActions.updateServer({ ...server, newServer: false }));
          navigate('/login', { state: { registered: true, email } });
        }, 1500);
      } else {
        setErrorText(data.error || 'Registration failed. Please try again.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (e) {
      setErrorText('Connection error. Please try again.');
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

      <Box
        component={motion.form}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={classes.container}
        onSubmit={handleSubmit}
      >
        <div className={classes.header}>
          <Typography className={classes.title} sx={{ fontSize: '2.5rem', fontWeight: 800 }}>
            SIGN UP
          </Typography>
          <Typography className={classes.subText} sx={{ opacity: 0.6 }}>
            Create a new account
          </Typography>
        </div>

        {errorText && snackbarSeverity === 'error' && (
          <Alert severity="error" sx={{ mb: 1, borderRadius: '8px' }}>
            {errorText}
          </Alert>
        )}

        <TextField
          required
          fullWidth
          label="Full Name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={classes.input}
        />
        <TextField
          required
          fullWidth
          type="email"
          label="Email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={classes.input}
        />
        <TextField
          fullWidth
          label="Phone (Optional)"
          name="phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className={classes.input}
        />
        <TextField
          required
          fullWidth
          label="Password"
          name="password"
          value={password}
          type="password"
          autoComplete="new-password"
          onChange={(event) => setPassword(event.target.value)}
          className={classes.input}
          helperText="At least 8 characters"
          FormHelperTextProps={{ sx: { color: 'rgba(255,255,255,0.4)' } }}
        />
        <TextField
          required
          fullWidth
          label="Verify Password"
          name="confirmPassword"
          value={confirmPassword}
          type="password"
          error={!!confirmPassword && password !== confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className={classes.input}
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              sx={{ color: 'rgba(255,255,255,0.4)', '&.Mui-checked': { color: '#3b82f6' } }}
            />
          }
          label={
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              I agree to the{' '}
              <Link
                href="/terms.html"
                target="_blank"
                sx={{ color: 'primary.light', textDecoration: 'none' }}
              >
                Terms and Conditions
              </Link>
            </Typography>
          }
        />

        <Button
          variant="contained"
          fullWidth
          type="submit"
          disabled={loading || !isFormValid()}
          className={classes.registerButton}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'CREATE ACCOUNT'}
        </Button>

        <div className={classes.footer}>
          <Typography variant="body2" sx={{ color: '#fff' }}>
            Already have an account?{' '}
            <Link
              className={classes.loginLink}
              onClick={() => navigate('/login')}
              component="button"
              type="button"
            >
              Login here
            </Link>
          </Typography>
        </div>
      </Box>

      <Snackbar
        open={snackbarOpen}
        onClose={() => setSnackbarOpen(false)}
        autoHideDuration={snackBarDurationShortMs}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {errorText || 'Success'}
        </Alert>
      </Snackbar>
    </LoginLayout>
  );
};

export default RegisterPage;
