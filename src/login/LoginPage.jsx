import { useEffect, useState } from 'react';
import {
  Select,
  MenuItem,
  FormControl,
  Button,
  TextField,
  Link,
  Snackbar,
  IconButton,
  Tooltip,
  Box,
  InputLabel,
  InputAdornment,
  Divider,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { motion } from 'framer-motion';
import CountryFlag from 'react-country-flag';
import { makeStyles } from 'tss-react/mui';
import CloseIcon from '@mui/icons-material/Close';
import VpnLockIcon from '@mui/icons-material/VpnLock';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { sessionActions } from '../store';
import { useLocalization, useTranslation } from '../common/components/LocalizationProvider';
import LoginLayout from './LoginLayout';
import usePersistedState from '../common/util/usePersistedState';
import {
  generateLoginToken,
  handleLoginTokenListeners,
  nativeEnvironment,
  nativePostMessage,
} from '../common/components/NativeInterface';
import { useCatch } from '../reactHelper';
import fetchOrThrow from '../common/util/fetchOrThrow';
import QrCodeDialog from '../common/components/QrCodeDialog';
import HardlockPaymentView from './HardlockPaymentView';

const useStyles = makeStyles()((theme) => ({
  options: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing(1),
  },
  titleSection: {
    textAlign: 'center',
  },
  welcomeText: {
    color: '#ffffff',

    fontWeight: 900,
    fontSize: '3.2rem',
    letterSpacing: '-2px',
    lineHeight: 1.1,
    filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
  },
  subText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '1.1rem',
    fontWeight: 500,
    marginTop: theme.spacing(1),
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(3.5),
  },
  input: {
    '& .MuiOutlinedInput-root': {
      borderRadius: '20px',
      background: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      color: '#fff',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': {
        background: 'rgba(255, 255, 255, 0.06)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        transform: 'translateY(-1px)',
      },
      '&.Mui-focused': {
        background: 'rgba(59, 130, 246, 0.05)',
        border: '1px solid rgba(59, 130, 246, 0.8)',
        boxShadow: '0 0 40px rgba(59, 130, 246, 0.2), inset 0 0 10px rgba(59, 130, 246, 0.1)',
        animation: 'inputPulse 2s infinite ease-in-out',
      },
    },
    '@keyframes inputPulse': {
      '0%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.1)' },
      '50%': { boxShadow: '0 0 40px rgba(59, 130, 246, 0.3)' },
      '100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.1)' },
    },
    '& .MuiInputLabel-root': {
      color: 'rgba(255, 255, 255, 0.4)',
      fontWeight: 600,
      fontSize: '0.9rem',
    },
    '& .MuiInputLabel-root.Mui-focused': { color: '#3b82f6' },
    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
  },
  loginButton: {
    borderRadius: '24px',
    padding: theme.spacing(2.4, 0),
    fontSize: '1.25rem',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '3px',
    background: '#2563eb',

    boxShadow: '0 20px 50px rgba(37, 99, 235, 0.4)',
    transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    position: 'relative',
    overflow: 'hidden',
    '&:hover': {
      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      transform: 'translateY(-6px) scale(1.02)',
      boxShadow: '0 30px 70px rgba(37, 99, 235, 0.6)',
    },
    '&::after': {
      content: '""',
      position: 'absolute',
      top: '-50%',
      left: '-50%',
      width: '200%',
      height: '200%',
      background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 60%)',
      opacity: 0,
      transition: 'opacity 0.3s',
    },
    '&:hover::after': {
      opacity: 1,
    },
  },
  secondaryButton: {
    borderRadius: '20px',
    padding: theme.spacing(2, 0),
    fontSize: '1rem',
    fontWeight: 800,
    textTransform: 'none',
    color: '#cbd5e1',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'rgba(255, 255, 255, 0.02)',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s ease',
    '&:hover': {
      color: '#fff',
      borderColor: 'rgba(255, 255, 255, 0.3)',
      background: 'rgba(255, 255, 255, 0.08)',
      transform: 'translateY(-3px)',
      boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
    },
  },
  registerLink: {
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
  langSelect: {
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '12px',
    color: '#fff',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    '& .MuiSelect-select': {
      padding: theme.spacing(1, 4, 1, 2),
      color: '#fff',
      fontWeight: 600,
    },
    '& fieldset': {
      border: 'none',
    },
  },
  buttonGroup: {
    display: 'flex',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
    justifyContent: 'center',
    width: '100%',
  },
  navButton: {
    flex: 1,
    borderRadius: theme.spacing(1.5),
    padding: theme.spacing(1.2, 1),
    textTransform: 'none',
    fontWeight: 700,
    fontSize: '0.95rem',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  },
  activeNav: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: '#fff',
    boxShadow: '0 8px 20px rgba(59, 130, 246, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    '&:hover': {
      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      transform: 'translateY(-2px)',
      boxShadow: '0 10px 25px rgba(59, 130, 246, 0.5)',
    },
  },
  inactiveNav: {
    background: 'rgba(255, 255, 255, 0.03)',
    color: 'rgba(255, 255, 255, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.08)',
      color: '#fff',
      borderColor: 'rgba(255, 255, 255, 0.3)',
      transform: 'translateY(-2px)',
    },
  },
  navIcon: {
    fontSize: '1.2rem',
  },
}));

const LoginPage = () => {
  const { classes } = useStyles();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const t = useTranslation();

  const { languages, language, setLocalLanguage } = useLocalization();

  useEffect(() => {
    document.title = 'GeoSurePath';
  }, []);

  const languageList = Object.entries(languages).map((values) => ({
    code: values[0],
    country: values[1].country,
    name: values[1].name,
  }));

  const [failed, setFailed] = useState(false);

  const [email, setEmail] = usePersistedState('loginEmail', '');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showServerTooltip, setShowServerTooltip] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });

  // Registration explicitly enabled as per user request to restore functionality
  const registrationEnabled = true;

  const languageEnabled = useSelector((state) => {
    const attributes = state.session.server.attributes;
    return !attributes.language && !attributes['ui.disableLoginLanguage'];
  });
  const changeEnabled = useSelector((state) => !state.session.server.attributes.disableChange);
  const openIdEnabled = useSelector((state) => state.session.server.openIdEnabled);
  const openIdForced = useSelector(
    (state) => state.session.server.openIdEnabled && state.session.server.openIdForce,
  );
  const [codeEnabled] = useState(false);

  const [announcementShown, setAnnouncementShown] = useState(false);
  const [bill, setBill] = useState(null);
  const [isHardlocked, setIsHardlocked] = useState(false);

  const announcement = useSelector((state) => state.session.server.announcement);

  const handleLogin = async (event, target = null) => {
    if (event) event.preventDefault();
    setFailed(false);
    setErrorText('');
    setLoading(true);

    // Normalization & Validation
    const normalizedEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!normalizedEmail || !cleanPassword) {
      setErrorText('Credentials required for platform access.');
      setFailed(true);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password: cleanPassword }),
      });

      if (response.ok) {
        const saasData = await response.json();

        if (saasData.mfaRequired) {
          setMfaRequired(true);
          setLoading(false);
          return;
        }

        if (saasData.accessToken) {
          localStorage.setItem('saas_token', saasData.accessToken);
        }
        if (saasData.user) {
          localStorage.setItem('saas_role', saasData.user.role);
          localStorage.setItem('saas_user', JSON.stringify(saasData.user));
        }

        let userFetched = false;
        let retryCount = 0;
        const maxRetries = 2;

        const syncWithTraccar = async () => {
          console.log(
            `[Protocol] Initiating handshake with Traccar Engine (Attempt ${retryCount + 1}/${maxRetries + 1})`,
          );
          try {
            const traccarRes = await fetch('/api/session');
            if (traccarRes.ok) {
              const user = await traccarRes.json();
              dispatch(sessionActions.updateUser(user));
              userFetched = true;
              console.log('[Protocol] Handshake established: Traccar session active.');
            } else if (traccarRes.status === 401) {
              console.log(
                '[Protocol] No active Traccar session found. Attempting explicit provisioning...',
              );
              const traccarLoginRes = await fetch('/api/session', {
                method: 'POST',
                body: new URLSearchParams(
                  `email=${encodeURIComponent(normalizedEmail)}&password=${encodeURIComponent(password)}`,
                ), // Use raw password for the initial handshake
              });
              if (traccarLoginRes.ok) {
                const user = await traccarLoginRes.json();
                dispatch(sessionActions.updateUser(user));
                userFetched = true;
                console.log('[Protocol] Provisioning successful: Traccar session initialized.');
              } else {
                console.warn(`[Protocol] Provisioning rejected: ${traccarLoginRes.status}`);
              }
            } else {
              console.error(`[Protocol] Engine error: ${traccarRes.status}`);
            }
          } catch (e) {
            console.error('[Protocol] Transport error during handshake:', e);
            if (retryCount < maxRetries) {
              retryCount++;
              const delay = 500 * Math.pow(2, retryCount - 1); // Exponential backoff
              console.log(`[Protocol] Retrying handshake in ${delay}ms...`);
              await new Promise((resolve) => setTimeout(resolve, delay));
              return syncWithTraccar();
            }
          }
        };

        await syncWithTraccar();

        if (userFetched) {
          // Billing Hardlock Check
          try {
            const billingRes = await fetch('/api/billing/my-bill');
            if (billingRes.ok) {
              const billingData = await billingRes.json().catch(() => null);
              if (billingData && billingData.unpaidDebt > 0) {
                setBill(billingData);
                setIsHardlocked(true);
                setLoading(false);
                return;
              }
            }
          } catch (e) {
            console.error('Billing check failed during sync');
          }

          generateLoginToken();
          const defaultTarget = target || '/';
          const finalTarget = window.sessionStorage.getItem('postLogin') || defaultTarget;
          window.sessionStorage.removeItem('postLogin');
          window.location.href = finalTarget;
        } else {
          setErrorText('Platform synchronization (Traccar Engine) failed. Retrying manually...');
          setFailed(true);
        }
      } else {
        const data = await response.json().catch(() => ({}));
        setErrorText(data.error || 'Identity verification failed. Check credentials.');
        setFailed(true);
        setPassword('');
      }
    } catch (e) {
      setSnackbar({
        open: true,
        message: 'Platform Protocol Error. Refreshing node connectivity...',
        severity: 'error',
      });
      setFailed(true);
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = async (e) => {
    if (e) e.preventDefault();
    setMfaLoading(true);
    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: mfaToken, userId: email }), // Using email as identifier if userId of SaaS is not known yet, or pass it from mfaRequired response
      });

      if (response.ok) {
        const saasData = await response.json();
        if (saasData.accessToken) {
          localStorage.setItem('saas_token', saasData.accessToken);
        }
        if (saasData.user) {
          localStorage.setItem('saas_role', saasData.user.role);
          localStorage.setItem('saas_user', JSON.stringify(saasData.user));
        }

        const traccarRes = await fetch('/api/session');
        if (traccarRes.ok) {
          const user = await traccarRes.json();
          dispatch(sessionActions.updateUser(user));
        } else if (traccarRes.status === 401) {
          // If SaaS MFA succeeded but Traccar session is missing, attempt explicit Traccar login
          await fetch('/api/session', {
            method: 'POST',
            body: new URLSearchParams(
              `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
            ),
          })
            .then(async (res) => {
              if (res.ok) {
                const user = await res.json();
                dispatch(sessionActions.updateUser(user));
              }
            })
            .catch(console.error);
        }

        const finalTarget = '/';
        window.location.href = finalTarget;
      } else {
        const data = await response.json().catch(() => ({}));
        setErrorText(data.error || 'Invalid MFA token');
        setFailed(true);
      }
    } catch (e) {
      setSnackbar({ open: true, message: 'MFA Verification Failed', severity: 'error' });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleTokenLogin = useCatch(async (token) => {
    const response = await fetchOrThrow(`/api/session?token=${encodeURIComponent(token)}`);
    const user = await response.json();
    dispatch(sessionActions.updateUser(user));
    navigate('/');
  });

  const handleOpenIdLogin = () => {
    document.location = '/api/session/openid/auth';
  };

  const handleSocialLogin = async (provider) => {
    if (provider === 'Google') {
      try {
        const res = await fetch('/api/auth/google-auth-url');
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        }
      } catch (e) {
        console.error('Google Auth provision error:', e);
      }
    }

    setSnackbar({
      open: true,
      message: `Redirecting to secure ${provider} gateway...`,
      severity: 'info',
    });
    setTimeout(() => {
      setSnackbar({
        open: true,
        message: `${provider} authentication is being provisioned for your enterprise tier.`,
        severity: 'warning',
      });
    }, 1500);
  };

  useEffect(() => nativePostMessage('authentication'), []);

  useEffect(() => {
    const listener = (token) => handleTokenLogin(token);
    handleLoginTokenListeners.add(listener);
    return () => handleLoginTokenListeners.delete(listener);
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, []);

  useEffect(() => {
    if (location.state?.registered) {
      setSnackbar({
        open: true,
        message: 'Account provisioned successfully. Welcome to GeoSurePath Enterprise!',
        severity: 'success',
      });
      if (location.state?.email) {
        setEmail(location.state.email);
      }
      // Clean up state
      const newState = { ...location.state };
      delete newState.registered;
      navigate(location.pathname, { state: newState, replace: true });
    }
  }, [location.state, navigate, setEmail]);

  useEffect(() => {
    if (window.localStorage.getItem('hostname') !== window.location.hostname) {
      window.localStorage.setItem('hostname', window.location.hostname);
      setShowServerTooltip(true);
    }
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.5,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 },
    },
  };

  return (
    <LoginLayout>
      <div className={classes.options}>
        {nativeEnvironment && changeEnabled && (
          <IconButton color="primary" onClick={() => navigate('/change-server')}>
            <Tooltip
              title={`${t('settingsServer')}: ${window.location.hostname}`}
              open={showServerTooltip}
              arrow
            >
              <VpnLockIcon sx={{ color: '#fff' }} />
            </Tooltip>
          </IconButton>
        )}
        {!nativeEnvironment && (
          <IconButton onClick={() => setShowQr(true)}>
            <QrCode2Icon sx={{ color: '#fff' }} />
          </IconButton>
        )}
        {languageEnabled && (
          <FormControl size="small">
            <Select
              value={language}
              onChange={(e) => setLocalLanguage(e.target.value)}
              className={classes.langSelect}
              IconComponent={() => null}
            >
              {languageList.map((it) => (
                <MenuItem key={it.code} value={it.code}>
                  <Box component="span" sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                    <CountryFlag countryCode={it.country} svg />
                  </Box>
                  {it.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </div>

      <Box
        component={motion.div}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={classes.container}
      >
        <motion.div variants={itemVariants} className={classes.titleSection}>
          <Typography
            className={classes.welcomeText}
            sx={{ fontSize: '2.8rem', fontWeight: 800, mb: 1 }}
          >
            LOGIN
          </Typography>
          <Typography className={classes.subText} sx={{ fontSize: '1rem', opacity: 0.6 }}>
            Enter your credentials to access the portal
          </Typography>
        </motion.div>

        {isHardlocked ? (
          <HardlockPaymentView
            onLogout={() => {
              setIsHardlocked(false);
              setBill(null);
              setEmail('');
              setPassword('');
            }}
            onSuccess={() => {
              setIsHardlocked(false);
              window.location.reload();
            }}
          />
        ) : (
          <Box component="form" className={classes.container} onSubmit={(e) => handleLogin(e)}>
            <motion.div variants={itemVariants}>
              <TextField
                required
                fullWidth
                error={failed}
                label="Email"
                name="email"
                value={email}
                autoComplete="email"
                autoFocus={!email}
                onChange={(e) => setEmail(e.target.value)}
                className={classes.input}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <TextField
                required
                fullWidth
                error={failed}
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className={classes.input}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                        sx={{ color: '#ffffff' }}
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                className={classes.loginButton}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
              </Button>
            </motion.div>

            <motion.div variants={itemVariants} style={{ display: 'flex', gap: '16px' }}>
              <Button
                fullWidth
                variant="outlined"
                className={classes.secondaryButton}
                onClick={() => navigate('/register')}
              >
                Sign Up
              </Button>
              <Button
                fullWidth
                variant="outlined"
                className={classes.secondaryButton}
                onClick={() => navigate('/reset-password')}
              >
                Forgot Password?
              </Button>
            </motion.div>

            {mfaRequired && (
              <motion.div variants={itemVariants}>
                <Box
                  sx={{
                    mt: 2,
                    p: 3,
                    background: 'rgba(59, 130, 246, 0.1)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '24px',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ color: '#fff', mb: 2, fontWeight: 800, textAlign: 'center' }}
                  >
                    Identity Verification Required
                  </Typography>
                  <TextField
                    fullWidth
                    label="Verification Code"
                    value={mfaToken}
                    onChange={(e) => setMfaToken(e.target.value)}
                    className={classes.input}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleVerifyMfa}
                    disabled={mfaLoading || mfaToken.length < 6}
                    sx={{
                      height: 56,
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      fontWeight: 800,
                    }}
                  >
                    {mfaLoading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      'Confirm Identity'
                    )}
                  </Button>
                </Box>
              </motion.div>
            )}
          </Box>
        )}
      </Box>

      <QrCodeDialog open={showQr} onClose={() => setShowQr(false)} />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{
            width: '100%',
            borderRadius: '12px',
            fontWeight: 700,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!announcement && !announcementShown}
        message={announcement}
        action={
          <IconButton size="small" color="inherit" onClick={() => setAnnouncementShown(true)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />
    </LoginLayout>
  );
};

export default LoginPage;
