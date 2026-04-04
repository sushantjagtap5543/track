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
    background: 'linear-gradient(to right, #ffffff, #94a3b8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
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
  loginButton: {
    borderRadius: '20px',
    padding: theme.spacing(2.2, 0),
    fontSize: '1.2rem',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '2px',
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    boxShadow: '0 15px 40px rgba(37, 99, 235, 0.5)',
    transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    '&:hover': {
      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      transform: 'translateY(-5px) scale(1.03)',
      boxShadow: '0 25px 55px rgba(37, 99, 235, 0.7)',
    },
  },
  secondaryButton: {
    borderRadius: '16px',
    padding: theme.spacing(1.8, 0),
    fontSize: '1rem',
    fontWeight: 800,
    textTransform: 'none',
    color: '#fff',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s ease',
    '&:hover': {
      borderColor: '#3b82f6',
      background: 'rgba(59, 130, 246, 0.12)',
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 24px rgba(59, 130, 246, 0.2)',
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
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
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
        try {
          const traccarRes = await fetch('/api/session');
          if (traccarRes.ok) {
            const user = await traccarRes.json();
            dispatch(sessionActions.updateUser(user));
            userFetched = true;
          }
        } catch (sessionError) {
          console.error('Traccar session sync failed:', sessionError);
        }

        if (userFetched) {
          try {
            const billingRes = await fetch('/api/billing/my-bill');
            if (billingRes.ok) {
              const billingData = await billingRes.ok ? await billingRes.json() : null;
              if (billingData && billingData.unpaidDebt > 0) {
                setBill(billingData);
                setIsHardlocked(true);
                setLoading(false);
                return;
              }
            }
          } catch (e) {
            console.error('Billing sync failed:', e);
          }

          generateLoginToken();
          const defaultTarget = target || '/';
          const finalTarget = window.sessionStorage.getItem('postLogin') || defaultTarget;
          window.sessionStorage.removeItem('postLogin');
          window.location.href = finalTarget;
        } else {
          setErrorText('Platform synchronization failed. Please try again.');
          setFailed(true);
        }
      } else {
        const data = await response.json().catch(() => ({}));
        setErrorText(data.error || 'Invalid username or password');
        setFailed(true);
        setPassword('');
      }
    } catch (e) {
      setSnackbar({ open: true, message: e.message || 'Access Protocol Failed', severity: 'error' });
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
    
    setSnackbar({ open: true, message: `Redirecting to secure ${provider} gateway...`, severity: 'info' });
    setTimeout(() => {
        setSnackbar({ open: true, message: `${provider} authentication is being provisioned for your enterprise tier.`, severity: 'warning' });
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
        severity: 'success' 
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

      <motion.div 
        className={classes.titleSection}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Typography className={classes.welcomeText} sx={{ fontSize: '3rem', mb: 1 }}>{t('loginTitle') || 'GeoSurePath Enterprise'}</Typography>
        <Typography className={classes.subText} sx={{ fontSize: '1.2rem', opacity: 0.8, letterSpacing: '0.5px' }}>
          {t('loginSubtext') || 'World Class GPS Tracking & Fleet Intelligence'}
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
        <form className={classes.container} onSubmit={(e) => handleLogin(e)}>
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
            <TextField
              required
              fullWidth
              error={failed}
              label={t('userEmail')}
              name="email"
              value={email}
              autoComplete="email"
              autoFocus={!email}
              onChange={(e) => setEmail(e.target.value)}
              className={classes.input}
            />
          </motion.div>

          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
            <TextField
              required
              fullWidth
              error={failed}
              label={t('loginPassword')}
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
            {password && (
              <Box sx={{ mt: 1, mb: 1, px: 2 }}>
                  <Box sx={{ display: 'flex', gap: 0.5, height: 4 }}>
                      {[1, 2, 3, 4].map((i) => (
                          <Box key={i} sx={{ flex: 1, bgcolor: i <= (password.length / 3) ? (password.length >= 8 ? '#10b981' : '#f59e0b') : 'rgba(255,255,255,0.1)', borderRadius: 2 }} />
                      ))}
                  </Box>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', display: 'block', mt: 0.5 }}>
                      {password.length < 8 ? 'Weak Security Profile' : 'Enterprise Strength Verified'}
                  </Typography>
              </Box>
            )}
          </motion.div>

          {codeEnabled && (
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.6 }}>
              <TextField
                required
                fullWidth
                error={failed}
                label={t('loginTotpCode')}
                name="code"
                value={code}
                type="number"
                onChange={(e) => setCode(e.target.value)}
                className={classes.input}
              />
            </motion.div>
          )}

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.65 }}>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              className={classes.loginButton}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : t('loginLogin')}
            </Button>
          </motion.div>

          {mfaRequired && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }}>
              <Box sx={{ mt: 2, p: 3, background: 'rgba(59, 130, 246, 0.1)', backdropFilter: 'blur(10px)', borderRadius: '24px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                <Typography variant="subtitle2" sx={{ color: '#fff', mb: 2, fontWeight: 800, textAlign: 'center' }}>
                  Two-Factor Authentication Required
                </Typography>
                <TextField
                  fullWidth
                  label="6-Digit Verification Code"
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
                  sx={{ height: 56, borderRadius: '16px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', fontWeight: 800, boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)' }}
                >
                  {mfaLoading ? <CircularProgress size={24} color="inherit" /> : 'Verify & Continue'}
                </Button>
              </Box>
            </motion.div>
          )}

          {/* Billing button removed as per user request to simplify login flow */}

          {registrationEnabled && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }} style={{ textAlign: 'center', marginTop: '16px' }}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{t('loginNoAccount') || 'Need an account?'} <Box component="span" sx={{ color: '#3b82f6', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }} onClick={() => navigate('/register')}>{t('loginRegister')}</Box></Typography>
            </motion.div>
          )}
          
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} style={{ textAlign: 'center', marginTop: '8px' }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
              {t('loginPasswordReset') || 'Forgot Password?'} <Box component="span" sx={{ color: '#64748b', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }} onClick={() => navigate('/reset-password')}>Reset securely</Box>
            </Typography>
          </motion.div>
      </form>
      )}

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
          sx={{ width: '100%', borderRadius: '12px', fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
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
