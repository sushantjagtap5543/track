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
  InputAdornment,
  Typography,
  CircularProgress,
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CountryFlag from 'react-country-flag';
import { makeStyles } from 'tss-react/mui';
import CloseIcon from '@mui/icons-material/Close';
import VpnLockIcon from '@mui/icons-material/VpnLock';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
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
import QrCodeDialog from '../common/components/QrCodeDialog';
import fetchOrThrow from '../common/util/fetchOrThrow';

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
    color: '#fff',
    fontWeight: 600,
    fontSize: '2rem',
  },
  subText: {
    color: '#ffffff',
    fontSize: '1.05rem',
    fontWeight: 500,
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
  },
  extraContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  loginButton: {
    borderRadius: theme.spacing(1.5),
    padding: theme.spacing(1.5, 0),
    fontSize: '1rem',
    fontWeight: 600,
    textTransform: 'none',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
  },
  registerLink: {
    color: theme.palette.primary.light,
    fontWeight: 700,
    fontSize: '1rem',
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  langSelect: {
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: theme.spacing(1),
    color: '#fff',
    '& .MuiSelect-select': {
      padding: theme.spacing(1, 4, 1, 2),
      color: '#fff',
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

  // Registration enabled for all time as requested
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
  const announcement = useSelector((state) => state.session.server.announcement);

  const handlePasswordLogin = async (event) => {
    event.preventDefault();
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

        // ✅ FIX: Persist SaaS tokens for BillingPage and other SaaS features
        if (saasData.accessToken) {
          localStorage.setItem('saas_token', saasData.accessToken);
        }
        if (saasData.user?.role) {
          localStorage.setItem('saas_role', saasData.user.role);
        }

        // --- Traccar Session Logic ---
        // Backend /api/auth/login already handles Traccar session creation.
        // We just need to fetch the Traccar user object to update Redux.
        const traccarRes = await fetch('/api/session');
        if (traccarRes.ok) {
          const user = await traccarRes.json();
          dispatch(sessionActions.updateUser(user));
        }

        generateLoginToken();
        const target = window.sessionStorage.getItem('postLogin') || '/';
        window.sessionStorage.removeItem('postLogin');
        navigate(target, { replace: true });
      } else {
        const data = await response.json().catch(() => ({}));
        setErrorText(data.error || 'Invalid username or password');
        setFailed(true);
        setPassword('');
      }
    } catch (e) {
      setErrorText(e.message || 'Login failed. Please try again.');
      setFailed(true);
      setPassword('');
    } finally {
      setLoading(false);
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

  useEffect(() => nativePostMessage('authentication'), []);

  useEffect(() => {
    const listener = (token) => handleTokenLogin(token);
    handleLoginTokenListeners.add(listener);
    return () => handleLoginTokenListeners.delete(listener);
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, []);

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

      <div className={classes.titleSection}>
        <Typography className={classes.welcomeText}>{t('loginLogin')}</Typography>
        <Typography className={classes.subText}>
          Enter your credentials to access your dashboard
        </Typography>
      </div>

      <form className={classes.container} onSubmit={handlePasswordLogin}>
        {!openIdForced && (
          <>
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
              helperText={failed && errorText}
            />
            <TextField
              required
              fullWidth
              error={failed}
              label={t('userPassword')}
              name="password"
              value={password}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              autoFocus={!!email}
              onChange={(e) => setPassword(e.target.value)}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                        sx={{ color: 'rgba(255, 255, 255, 0.5)' }}
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            {codeEnabled && (
              <TextField
                required
                fullWidth
                error={failed}
                label={t('loginTotpCode')}
                name="code"
                value={code}
                type="number"
                onChange={(e) => setCode(e.target.value)}
              />
            )}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              className={classes.loginButton}
              disabled={loading}
              fullWidth
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {loading ? 'Authenticating...' : t('loginLogin')}
            </Button>
          </>
        )}

        {openIdEnabled && (
          <Button
            onClick={() => handleOpenIdLogin()}
            variant="outlined"
            color="primary"
            fullWidth
            className={classes.loginButton}
          >
            {t('loginOpenId')}
          </Button>
        )}

        {!openIdForced && (
          <div className={classes.extraContainer}>
            <Button
              onClick={() => navigate('/billing')}
              variant="outlined"
              color="primary"
              fullWidth
              sx={{
                mb: 2,
                borderRadius: '12px',
                fontWeight: 900,
                borderColor: 'rgba(255,255,255,0.3)',
                color: '#fff',
                '&:hover': {
                  borderColor: '#fff',
                  background: 'rgba(255,255,255,0.05)',
                },
              }}
            >
              PAY SUBSCRIPTION BILL
            </Button>
            {registrationEnabled && (
              <Typography
                variant="body1"
                sx={{ color: '#ffffff', fontSize: '1rem', fontWeight: 500 }}
              >
                Don&apos;t have an account?{' '}
                <Link
                  className={classes.registerLink}
                  onClick={() => navigate('/register')}
                  component="button"
                >
                  {t('loginRegister')}
                </Link>
              </Typography>
            )}
            <Link
              onClick={() => navigate('/reset-password')}
              sx={{
                color: 'rgba(255, 255, 255, 0.95)',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'none',
                '&:hover': { color: '#fff', textDecoration: 'underline' },
              }}
              component="button"
            >
              {t('loginReset')}
            </Link>
          </div>
        )}
      </form>

      <QrCodeDialog open={showQr} onClose={() => setShowQr(false)} />

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
