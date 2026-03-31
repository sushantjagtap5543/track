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
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import GppBadIcon from '@mui/icons-material/GppBad';
import LockPersonIcon from '@mui/icons-material/LockPerson';
import PaymentIcon from '@mui/icons-material/Payment';
import { motion } from 'framer-motion';
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
    fontWeight: 900,
    fontSize: '2.8rem',
    letterSpacing: '-1.5px',
    lineHeight: 1.1,
    textShadow: '0 4px 12px rgba(0,0,0,0.3)',
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
    borderRadius: '18px',
    padding: theme.spacing(2, 0),
    fontSize: '1.15rem',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    boxShadow: '0 12px 35px rgba(59, 130, 246, 0.45)',
    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    '&:hover': {
      background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
      transform: 'translateY(-4px) scale(1.02)',
      boxShadow: '0 18px 45px rgba(59, 130, 246, 0.6)',
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
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s ease',
    '&:hover': {
      borderColor: '#fff',
      background: 'rgba(255, 255, 255, 0.08)',
      transform: 'translateY(-2px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
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

// ─── Hardlock Payment View ───────────────────────────────────────────────
const HardlockPaymentView = ({ onLogout, onSuccess }) => {
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [paying, setPaying] = useState(false);
  const [viewingDevices, setViewingDevices] = useState(false);

  useEffect(() => {
    fetch('/api/billing/my-bill')
      .then(r => r.json())
      .then(data => { 
        setBill(data); 
        setSelectedPlan(data.activePlan !== 'NONE' ? data.activePlan : (data.plans?.[0]?.id || ''));
        setLoading(false); 
      })
      .catch(() => setLoading(false));
  }, []);

  const handlePay = async () => {
    setPaying(true);
    const plan = bill.plans.find(p => p.id === selectedPlan);
    const totalPayable = (bill.orderSummary?.grandTotal || (bill.unpaidDebt + ((plan?.price || 0) * (bill.fleetSize || 1))));
    
    const res = await fetch('/api/billing/demo-settle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: selectedPlan, amount: totalPayable })
    });

    if (res.ok) {
        onSuccess();
    } else {
        alert('Payment settlement failed. Please contact support.');
    }
    setPaying(false);
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress sx={{ color: '#fff' }} /></Box>;

  const activePlan = bill?.plans?.find(p => p.id === selectedPlan);
  const summary = bill?.orderSummary;
  const lastPayment = bill?.history?.[0];

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Box sx={{ p: { xs: 2, md: 4 }, background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(30px)', borderRadius: '40px', border: '1px solid rgba(239, 68, 68, 0.2)', boxShadow: '0 30px 60px rgba(0,0,0,0.6)', maxWidth: '700px', margin: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
        
        {/* Global Announcement Banner inside Hardlock */}
        {announcement && (
          <Box sx={{ 
            mb: 3, p: 2, 
            borderRadius: '20px', 
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.05) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            display: 'flex', gap: 1.5, alignItems: 'center'
          }}>
            <Box sx={{ p: 1, borderRadius: '50%', bgcolor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}><MonitorHeartIcon sx={{ fontSize: 18 }} /></Box>
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#93c5fd', lineHeight: 1.3 }} dangerouslySetInnerHTML={{ __html: announcement }} />
          </Box>
        )}

        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box sx={{ display: 'inline-flex', p: 1.5, borderRadius: '50%', bgcolor: 'rgba(239, 68, 68, 0.1)', mb: 1.5 }}>
            <GppBadIcon sx={{ fontSize: 40, color: '#ef4444' }} />
          </Box>
          <Typography variant="h5" sx={{ color: '#fff', fontWeight: 900, mb: 0.5, letterSpacing: '-0.5px' }}>Access Protocol Suspended</Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
            Subscription expired beyond the grace period. Please settle dues to restore service.
          </Typography>
        </Box>

        {/* Dynamic Vehicle Specification Table */}
        <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 800 }}>Vehicle Specifications</Typography>
                <Button size="small" onClick={() => setViewingDevices(!viewingDevices)} sx={{ color: '#3b82f6', textTransform: 'none', fontWeight: 700 }}>
                    {viewingDevices ? 'Hide Details' : 'View All Vehicles'}
                </Button>
            </Box>
            
            {viewingDevices && (
                <TableContainer component={Paper} sx={{ bgcolor: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', maxHeight: '200px' }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow sx={{ '& th': { bgcolor: '#1e293b', color: 'rgba(255,255,255,0.6)', fontWeight: 800, borderBottom: '1px solid rgba(255,255,255,0.1)' } }}>
                                <TableCell>Vehicle Name</TableCell>
                                <TableCell>IMEI / Unique ID</TableCell>
                                <TableCell align="right">Unpaid Days</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {bill?.devices?.map((dev, idx) => (
                                <TableRow key={idx} sx={{ '& td': { color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)' } }}>
                                    <TableCell sx={{ fontWeight: 600 }}>{dev.name}</TableCell>
                                    <TableCell sx={{ opacity: 0.7, fontFamily: 'monospace' }}>{dev.imei}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 800, color: '#ef4444' }}>{dev.unpaidDays} d</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>

        {/* Last Payment Hint */}
        {lastPayment && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: '16px', mb: 3, border: '1px dashed rgba(255,255,255,0.1)' }}>
            <ReceiptLongIcon sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.1rem' }} />
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
              Last payment of <b>₹{lastPayment.price}</b> processed on <b>{new Date(lastPayment.createdAt).toLocaleDateString()}</b> ({lastPayment.invoiceId})
            </Typography>
          </Box>
        )}

        {/* Billing Ledger with orderSummary integration */}
        <Box sx={{ p: 2.5, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: '24px', mb: 3 }}>
           <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>BILLING LEDGER</Typography>
                <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 800 }}>INR (Tax Inclusive)</Typography>
           </Box>
           
           <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
             <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>Outstanding Debt ({summary?.debt?.unpaidDays || bill?.unpaidDebtDays} days)</Typography>
             <Typography variant="body2" sx={{ color: '#fff', fontWeight: 700 }}>₹{summary?.debt?.total || bill?.unpaidDebt}</Typography>
           </Box>

           <Box sx={{ mb: 2.5 }}>
             <FormControl fullWidth size="small" sx={{ 
               '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '0.85rem' },
               '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' },
               '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.5)' }
             }}>
                <InputLabel>Renew Subscription Plan</InputLabel>
                <Select value={selectedPlan} label="Renew Subscription Plan" onChange={e => setSelectedPlan(e.target.value)}>
                  {bill?.plans?.map(p => (
                    <MenuItem key={p.id} value={p.id}>{p.name} (₹{p.price}/{p.billingCycle})</MenuItem>
                  ))}
                </Select>
             </FormControl>
           </Box>

           <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', mb: 2 }} />

           <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
             <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>Plan Base Price ({bill?.fleetSize} Units)</Typography>
             <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>₹{summary?.subscription?.base || (activePlan?.price * bill?.fleetSize)}</Typography>
           </Box>

           {summary?.subscription?.tax > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>GST / Charges</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>₹{summary.subscription.tax}</Typography>
            </Box>
           )}

           <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, pt: 1.5, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
             <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: '1.2rem' }}>Grand Total</Typography>
             <Typography sx={{ color: '#10b981', fontWeight: 900, fontSize: '1.4rem' }}>₹{summary?.grandTotal || totalPayable}</Typography>
           </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button fullWidth onClick={onLogout} sx={{ py: 1, borderRadius: '16px', color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'none' }}>Exit to Login</Button>
          <Button 
            fullWidth 
            variant="contained" 
            disabled={!selectedPlan || paying} 
            onClick={handlePay} 
            startIcon={paying ? <CircularProgress size={20} color="inherit" /> : <PaymentIcon />} 
            sx={{ py: 1.5, borderRadius: '16px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)' }}
          >
            {paying ? 'Verifying...' : 'Pay & Unlock Now'}
          </Button>
        </Box>

        <Typography variant="caption" sx={{ display: 'block', mt: 2.5, color: 'rgba(255,255,255,0.3)', textAlign: 'center', fontStyle: 'italic' }}>
          * Hardlock is strictly enforced by administration. Immediate reactivation guaranteed upon successful payment settlement.
        </Typography>
      </Box>
    </motion.div>
  );
};

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
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [hardlocked, setHardlocked] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });

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
        if (saasData.user?.role) {
          localStorage.setItem('saas_role', saasData.user.role);
        }

        if (saasData.isHardlocked) {
            setHardlocked(true);
            setLoading(false);
            return;
        }

        const traccarRes = await fetch('/api/session');
        if (traccarRes.ok) {
          const user = await traccarRes.json();
          dispatch(sessionActions.updateUser(user));
        }

        generateLoginToken();
        const defaultTarget = target || (saasData.user?.role === 'ADMIN' ? '/billing' : '/');
        const finalTarget = window.sessionStorage.getItem('postLogin') || defaultTarget;
        window.sessionStorage.removeItem('postLogin');
        navigate(finalTarget, { replace: true });
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
        if (saasData.user?.role) {
          localStorage.setItem('saas_role', saasData.user.role);
        }

        if (saasData.isHardlocked) {
            setHardlocked(true);
            setMfaLoading(false);
            return;
        }

        const traccarRes = await fetch('/api/session');
        if (traccarRes.ok) {
          const user = await traccarRes.json();
          dispatch(sessionActions.updateUser(user));
        }

        navigate(saasData.user?.role === 'ADMIN' ? '/billing' : '/', { replace: true });
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

      {hardlocked ? (
        <HardlockPaymentView 
          onLogout={() => {
            setHardlocked(false);
            localStorage.clear();
          }}
          onSuccess={() => {
            setHardlocked(false);
            navigate('/', { replace: true });
          }}
        />
      ) : (
        <>
          <motion.div 
            className={classes.titleSection}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Typography className={classes.welcomeText}>Welcome to GeoSurePath</Typography>
            <Typography className={classes.subText}>
              Sign in to access your tracking portal
            </Typography>
          </motion.div>

          <form className={classes.container} onSubmit={(e) => handleLogin(e)}>
              <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
                <TextField
                  required
                  fullWidth
                  error={failed}
                  label="Email Address"
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
                  label={t('userPassword')}
                  name="password"
                  value={password}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  autoFocus={!!email}
                  onChange={(e) => setPassword(e.target.value)}
                  className={classes.input}
                  slotProps={{
                    input: {
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
                    },
                  }}
                />
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
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In to Dashboard'}
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

              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.75 }}>
                <Button
                  onClick={() => navigate('/register')}
                  type="button"
                  variant="outlined"
                  fullWidth
                  disabled={loading}
                  className={classes.secondaryButton}
                  startIcon={<ReceiptLongIcon />}
                >
                  Pay Subscription / Billing portal
                </Button>
              </motion.div>

              {registrationEnabled && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }} style={{ textAlign: 'center', marginTop: '16px' }}>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                        New to GeoSurePath? <Box component="span" sx={{ color: '#3b82f6', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }} onClick={() => navigate('/register')}>Create an Account</Box>
                    </Typography>
                </motion.div>
              )}
              
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} style={{ textAlign: 'center', marginTop: '8px' }}>
                <Link
                    onClick={() => navigate('/reset-password')}
                    sx={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', '&:hover': { color: '#fff' } }}
                    component="button"
                  >
                    Forgot Password? Reset securely
                  </Link>
              </motion.div>
          </form>
        </>
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
