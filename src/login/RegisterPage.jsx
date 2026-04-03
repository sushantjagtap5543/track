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
  Fade
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
    gap: theme.spacing(3),
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
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
    fontSize: '1.05rem',
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
        }
    },
    '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.5)' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#3b82f6' },
    '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
  },
  registerButton: {
    borderRadius: '18px',
    padding: theme.spacing(2, 0),
    fontSize: '1.1rem',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    boxShadow: '0 12px 35px rgba(59, 130, 246, 0.45)',
    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    marginTop: theme.spacing(2),
    '&:hover': {
      background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
      transform: 'translateY(-4px) scale(1.01)',
      boxShadow: '0 18px 45px rgba(59, 130, 246, 0.6)',
    },
    '&:disabled': {
        background: 'rgba(255,255,255,0.05)',
        color: 'rgba(255,255,255,0.2)',
    }
  },
  footer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: theme.spacing(2),
  },
  loginLink: {
    color: theme.palette.primary.light,
    fontWeight: 800,
    fontSize: '1.05rem',
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
  const totpForce = useSelector((state) => state.session.server.attributes.totpForce);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');



  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [totpKey, setTotpKey] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [errorText, setErrorText] = useState('');

  // TOTP polling removed for registration flow stability (S99)

  const handleSubmit = useCatch(async (event) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setErrorText('Passwords do not match. Please verify your entries.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    
    // Basic phone validation (if present)
    if (phone && !/^\+?[1-9]\d{1,14}$/.test(phone)) {
        setErrorText('Invalid phone number format. Use something like +1234567890');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
    }

    setLoading(true);
    setErrorText('');
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setErrorText('Registration Successful! Redirecting to login...');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        setTimeout(() => {
            dispatch(sessionActions.updateServer({ ...server, newServer: false }));
            navigate('/login');
        }, 2000);
      } else {
        // Detailed error mapping
        console.log('[Register] Server Error Data:', data);
        const userFriendlyError = data.error || 'Registration failed. Please check your details.';
        setErrorText(userFriendlyError);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (e) {
      setErrorText(e.message || 'Network connection failed. Please try again.');
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

      <motion.form 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={classes.container} 
        onSubmit={handleSubmit}
      >
        <div className={classes.header}>
          <Typography className={classes.title}>{t('loginRegister')}</Typography>
          <Typography className={classes.subText}>
            Join Track Elite today and start tracking with precision
          </Typography>
        </div>

        {errorText && snackbarSeverity === 'error' && (
          <Fade in={!!errorText}>
            <Alert 
              severity="error" 
              sx={{ 
                mb: 2, 
                borderRadius: '12px', 
                bgcolor: 'rgba(211, 47, 47, 0.1)', 
                color: '#ff8a80',
                border: '1px solid rgba(211, 47, 47, 0.3)',
                fontWeight: 600
              }}
            >
              {errorText}
            </Alert>
          </Fade>
        )}

        <TextField
          required
          fullWidth
          label={t('sharedName')}
          name="name"
          value={name}
          autoComplete="name"
          onChange={(event) => setName(event.target.value)}
          className={classes.input}
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
          className={classes.input}
        />
        <TextField
          fullWidth
          label="Phone Number"
          name="phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className={classes.input}
        />

        <Box sx={{ mt: 1, mb: 1 }}>
          <Typography
            variant="caption"
            sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 800, ml: 1 }}
          >
            SECURE ACCOUNT SETUP
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            required
            fullWidth
            label={t('userPassword')}
            name="password"
            value={password}
            type="password"
            autoComplete="new-password"
            onChange={(event) => setPassword(event.target.value)}
            className={classes.input}
            helperText="Min. 8 chars"
            FormHelperTextProps={{ sx: { color: 'rgba(255,255,255,0.5)', fontWeight: 600 } }}
          />
          <TextField
            required
            fullWidth
            label="Confirm"
            name="confirmPassword"
            value={confirmPassword}
            type="password"
            autoComplete="new-password"
            error={!!confirmPassword && password !== confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className={classes.input}
          />
        </Box>



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
        <Button
          variant="contained"
          color="primary"
          className={classes.registerButton}
          type="submit"
          disabled={
            loading ||
            !acceptedTerms ||
            !name ||
            !email ||
            !password ||
            password !== confirmPassword
          }
          fullWidth
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {loading ? 'Finalizing Setup...' : 'Complete Registration'}
        </Button>

        <div className={classes.footer}>
          <Typography variant="body1" sx={{ color: '#ffffff', fontSize: '1rem', fontWeight: 500 }}>
            Already have an account?{' '}
            <Link
              className={classes.loginLink}
              onClick={() => navigate('/login')}
              component="button"
              type="button"
            >
              {t('loginLogin')}
            </Link>
          </Typography>
        </div>
      </motion.form>

      <Snackbar
        open={snackbarOpen}
        onClose={() => setSnackbarOpen(false)}
        autoHideDuration={4000}
      >
        <Alert 
            onClose={() => setSnackbarOpen(false)} 
            severity={snackbarSeverity} 
            variant="filled" 
            sx={{ width: '100%', borderRadius: '12px', fontWeight: 900 }}
        >
            {errorText || (snackbarSeverity === 'success' ? t('loginCreated') : 'An error occurred')}
        </Alert>
      </Snackbar>
    </LoginLayout>
  );
};

export default RegisterPage;
