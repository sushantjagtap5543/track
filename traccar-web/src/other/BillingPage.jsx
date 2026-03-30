import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Snackbar,
  Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VerifiedIcon from '@mui/icons-material/Verified';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ReceiptIcon from '@mui/icons-material/Receipt';
import GroupIcon from '@mui/icons-material/Group';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import StorageIcon from '@mui/icons-material/Storage';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import SettingsIcon from '@mui/icons-material/Settings';
import LinkIcon from '@mui/icons-material/Link';
import StarsIcon from '@mui/icons-material/Stars'; // ✅ New icon
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'; // ✅ New icon
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import VpnLockIcon from '@mui/icons-material/VpnLock';

import { useNavigate } from 'react-router-dom';
import { useAdministrator } from '../common/util/permissions';

const InvoiceDialog = ({ open, onClose, invoice }) => {
  if (!invoice) return null;
  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: '24px', background: '#0f172a', color: 'white' } }}>
      <DialogTitle sx={{ fontWeight: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        INVOICE PREVIEW
        <Box>
          <Button onClick={handlePrint} startIcon={<ReceiptLongIcon />} variant="outlined" sx={{ mr: 1, borderRadius: '8px', color: '#3b82f6', borderColor: '#3b82f6' }}>
            PRINT / PDF
          </Button>
          <IconButton onClick={onClose} sx={{ color: 'white' }}><CancelIcon /></IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 4 }}>
        <Box id="invoice-content">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#3b82f6' }}>GeoSurePath</Typography>
              <Typography variant="caption" sx={{ opacity: 0.6 }}>Global Fleet Intelligence</Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Invoice #{invoice.invoiceId}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.6 }}>{new Date(invoice.createdAt).toLocaleDateString()}</Typography>
            </Box>
          </Box>

          <Paper sx={{ p: 2, mb: 4, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
            <Typography variant="caption" sx={{ fontWeight: 900, opacity: 0.5, mb: 1, display: 'block' }}>BILLED TO</Typography>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>{invoice.email || 'Client'}</Typography>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>{invoice.userEmail || ''}</Typography>
          </Paper>

          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { borderBottom: '2px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontWeight: 900 } }}>
                <TableCell>DESCRIPTION</TableCell>
                <TableCell align="right">AMOUNT</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell sx={{ color: 'white', py: 2 }}>Fleet Subscription - {invoice.planId?.toUpperCase()} ({invoice.deviceCount} Units)</TableCell>
                <TableCell align="right" sx={{ color: 'white', fontWeight: 700 }}>₹{invoice.price}</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 4 }}>
              <Typography variant="body2" sx={{ opacity: 0.6 }}>Subtotal</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>₹{(invoice.price / 1.18).toFixed(2)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 4 }}>
              <Typography variant="body2" sx={{ opacity: 0.6 }}>GST (18%)</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>₹{(invoice.price - (invoice.price / 1.18)).toFixed(2)}</Typography>
            </Box>
            <Divider sx={{ width: '200px', my: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
            <Box sx={{ display: 'flex', gap: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>Total Paid</Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#4ade80' }}>₹{invoice.price}</Typography>
            </Box>
          </Box>

          <Box sx={{ mt: 4, textAlign: 'center', p: 1, bgcolor: 'rgba(74,222,128,0.1)', borderRadius: '8px', color: '#4ade80', fontWeight: 900, fontSize: '0.8rem' }}>
            STATUS: ✓ PAID SECURELY
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

const loadScript = (src) => new Promise((resolve) => {
  const script = document.createElement('script');
  script.src = src;
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

const BillingPage = () => {
  const traccarAdmin = useAdministrator();
  const [saasRole, setSaasRole] = useState(() => {
    const role = localStorage.getItem('saas_role');
    if (role) return role;
    try {
      const saasUser = JSON.parse(localStorage.getItem('saas_user'));
      return saasUser?.role;
    } catch (e) {
      return null;
    }
  });
  const admin = traccarAdmin || saasRole === 'ADMIN';
  const navigate = useNavigate();
  const [tabIndex, setTabIndex] = useState(0);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [loading, setLoading] = useState(true);
  const [bill, setBill] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [settling, setSettling] = useState(false);
  const [gatewayLink, setGatewayLink] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  // eslint-disable-next-line no-unused-vars
  const [error, setError] = useState(null);
  const [systemStats, setSystemStats] = useState(null);
  const [adminSettings, setAdminSettings] = useState({
    paymentLink: '',
    razorpayId: '',
    razorpaySecret: '',
    razorpayWebhookSecret: '',
    firebaseConfig: '',
    openrouterKey: '',
    supportEmail: '',
  });
  const [plans, setPlans] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ planId: '', status: '', expiresAt: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const showFeedback = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchAnalyticsAndLedger = async () => {
    try {
      const token = localStorage.getItem('saas_token');
      if (!token) return;
      const [aRes, lRes, logRes, pRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/billing/admin/ledger', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/audit-logs', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/plans', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (aRes.ok) {
        const aData = await aRes.json();
        setAnalytics(aData);
      }
      if (lRes.ok) {
        const lData = await lRes.json();
        setLedger(Array.isArray(lData) ? lData : []);
      }
      if (logRes.ok) {
        const logData = await logRes.json();
        setAuditLogs(Array.isArray(logData) ? logData : []);
      }
      if (pRes.ok) {
        setPlans(await pRes.json());
      }
    } catch (err) {
      console.error('Admin Analytics Error:', err);
    }
  };

  const fetchFullSystemStatus = async () => {
    try {
      const token = localStorage.getItem('saas_token');
      const res = await fetch('/api/admin/health/full', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setSystemStats(await res.json());
    } catch (err) {
      console.error('System Status Error:', err);
    }
  };

  const fetchAdminSettings = async () => {
    try {
      const token = localStorage.getItem('saas_token');
      const res = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAdminSettings(await res.json());
    } catch (err) {
      console.error('Admin Settings Error:', err);
    }
  };

  const fetchMyBill = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('saas_token');
      if (!token) {
        setLoading(false);
        return;
      }
      const billRes = await fetch('/api/billing/my-bill', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (billRes.ok) {
        const data = await billRes.json();
        setBill(data);
        if (data?.plans?.length > 0) setSelectedPlan(data.plans[0].id);
      } else {
        const errData = await billRes.json().catch(() => ({}));
        setError(errData.error || 'Failed to fetch billing cycle data.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyBill();

    if (admin) {
      fetchAnalyticsAndLedger();
      fetchFullSystemStatus();
      fetchAdminSettings();
    }
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, [admin]);

  const handleUpdateGateway = async () => {
    try {
      const token = localStorage.getItem('saas_token');
      const res = await fetch('/api/billing/admin/config-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ paymentLink: gatewayLink }),
      });
      if (res.ok) {
        showFeedback('Sovereign Gateway Updated Successfully');
      } else {
        const data = await res.json().catch(() => ({}));
        showFeedback(data.error || 'Failed to update gateway', 'error');
      }
    } catch (err) {
      showFeedback(err.message, 'error');
    }
  };

  const handleUpdateSovereignSettings = async () => {
    try {
      const token = localStorage.getItem('saas_token');
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(adminSettings),
      });
      if (res.ok) {
        showFeedback('Sovereign Configuration Saved Successfully.');
        fetchAdminSettings();
      } else {
        const data = await res.json().catch(() => ({}));
        showFeedback(data.error || 'Failed to save configuration', 'error');
      }
    } catch (err) {
      showFeedback(err.message, 'error');
    }
  };

  const handleManualUserUpdate = async () => {
    if (!editingUser) return;
    setSettling(true);
    try {
      const token = localStorage.getItem('saas_token');
      const res = await fetch('/api/admin/user-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: editingUser.id, ...editForm }),
      });
      if (res.ok) {
        showFeedback('User Management sync applied.');
        setEditingUser(null);
        fetchAnalyticsAndLedger();
      } else {
        const data = await res.json().catch(() => ({}));
        showFeedback(data.error || 'User update failed', 'error');
      }
    } catch (err) {
      showFeedback(err.message, 'error');
    } finally {
      setSettling(false);
    }
  };

  const handleSettleForUser = async (targetId, planId, total) => {
    if (!window.confirm(`Force Settle ₹${total} for this user?`)) return;
    setSettling(true);
    try {
      const token = localStorage.getItem('saas_token');
      const res = await fetch('/api/billing/admin/settle-cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetUserId: targetId, planId, amount: total }),
      });
      if (res.ok) {
        showFeedback('Sovereign Settle Applied.');
        fetchAnalyticsAndLedger();
      } else {
        const data = await res.json().catch(() => ({}));
        showFeedback(data.error || 'Settle failed', 'error');
      }
    } catch (err) {
      showFeedback(err.message, 'error');
    } finally {
      setSettling(false);
    }
  };

  const handleAdjustExpiry = async (targetId, email) => {
    const days = window.prompt(
      `Extend Grace Period for ${email}?\nEnter number of days (e.g. 15):`,
    );
    if (!days || isNaN(days) || parseInt(days) < 1) return;

    setSettling(true);
    try {
      const token = localStorage.getItem('saas_token');
      const res = await fetch('/api/admin/adjust-expiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: targetId, extensionDays: parseInt(days) }),
      });
      if (res.ok) {
        showFeedback(`VIP Expiry Extended by ${days} days.`);
        fetchAnalyticsAndLedger();
      } else {
        const errData = await res.json().catch(() => ({}));
        showFeedback(errData.error || 'Operation failed', 'error');
      }
    } catch (err) {
      showFeedback(err.message, 'error');
    } finally {
      setSettling(false);
    }
  };

  const handleRazorpay = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('saas_token');
      // 1. Create Order on Backend
      const orderRes = await fetch('/api/billing/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          planId: selectedPlan,
          amount: totalFleetAmount,
        }),
      });

      if (!orderRes.ok) throw new Error('Order creation failed on server');
      const orderData = await orderRes.json();

      // 2. Load Razorpay Script if needed
      if (!window.Razorpay) {
        const loaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
        if (!loaded) throw new Error('Razorpay SDK failed to load. Check your connection.');
      }

      // 3. Initialize Razorpay Modal
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'GeoSurePath Professional',
        description: `Plan: ${currentPlan?.name}`,
        image: '/apple-touch-icon-180x180.png',
        order_id: orderData.orderId,
        handler: async (response) => {
          showFeedback('Payment Successful! Activating your subscription...');
          setTimeout(fetchMyBill, 3000);
        },
        prefill: {
          email: bill?.userEmail || '',
        },
        theme: {
          color: '#3b82f6',
        },
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.on('payment.failed', function (response) {
        showFeedback(`Payment Failed: ${response.error.description}`, 'error');
      });
      rzp1.open();
    } catch (err) {
      showFeedback(`Razorpay Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoPay = async () => {
    if (!window.confirm('Simulate successful payment for this plan? (Demo Mode)')) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('saas_token');
      const res = await fetch('/api/billing/demo-settle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          planId: selectedPlan,
          amount: totalFleetAmount,
        }),
      });
      if (res.ok) {
        showFeedback('Payment Simulated Successfully! Subscription Activated.');
        fetchMyBill();
      } else {
        const errData = await res.json().catch(() => ({}));
        showFeedback(errData.error || 'Demo Payment Failed', 'error');
      }
    } catch (err) {
      showFeedback(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- SOVEREIGN SAFE CALCS ---
  const currentPlan = bill?.plans?.find((p) => p.id === selectedPlan) || bill?.plans?.[0];
  const deviceCount = bill?.devices?.length || 0;
  const planCost = (currentPlan?.price || 0) * deviceCount;
  const totalFleetAmount = planCost + (bill?.totalDue || 0);

  const filteredLedger = Array.isArray(ledger)
    ? ledger.filter((u) => u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [loginMode, setLoginMode] = useState(0); // 0: Client, 1: Admin

  const handleBillingLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('saas_token', data.accessToken);
        localStorage.setItem('saas_role', data.user.role);
        localStorage.setItem('saas_user', JSON.stringify(data.user));
        setSaasRole(data.user.role); // ✅ Fix: Update state to trigger re-render
        fetchMyBill();
        if (data.user.role === 'ADMIN') {
          fetchAnalyticsAndLedger();
          fetchFullSystemStatus();
          fetchAdminSettings();
        }
      } else {
        const err = await response.json().catch(() => ({}));
        setAuthError(err.error || 'Authentication sequence failed. Verify credentials.');
        console.error('[BillingLogin] Server error:', err);
      }
    } catch (err) {
      setAuthError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          p: 10,
          bgcolor: '#0f172a',
          height: '100vh',
          alignItems: 'center',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <CircularProgress size={60} thickness={4} sx={{ color: '#3b82f6' }} />
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 900, opacity: 0.6 }}>
          INITIALIZING SOVEREIGN LEDGER...
        </Typography>
      </Box>
    );

  const token = localStorage.getItem('saas_token');
  if (!token) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
        }}
      >
        <Paper
          elevation={24}
          sx={{
            p: 5,
            width: '100%',
            maxWidth: 480,
            borderRadius: '40px',
            background: 'rgba(30, 41, 59, 0.7)',
            backdropFilter: 'blur(30px)',
            border: '1px solid rgba(255,255,255,0.1)',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative Gradient Glow */}
          <Box
            sx={{
              position: 'absolute',
              top: '-10%',
              left: '-10%',
              width: '40%',
              height: '40%',
              background: loginMode === 1 ? 'rgba(57, 130, 246, 0.2)' : 'rgba(74, 222, 128, 0.1)',
              filter: 'blur(60px)',
              borderRadius: '50%',
              zIndex: 0,
            }}
          />

          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Tabs
              value={loginMode}
              onChange={(e, v) => setLoginMode(v)}
              variant="fullWidth"
              sx={{
                mb: 4,
                '& .MuiTabs-indicator': { height: 3, borderRadius: '4px', bgcolor: loginMode === 1 ? '#3b82f6' : '#10b981' },
                '& .MuiTab-root': { color: 'rgba(255,255,255,0.4)', fontWeight: 800, py: 2 },
                '& .Mui-selected': { color: '#fff !important' },
              }}
            >
              <Tab icon={<ReceiptLongIcon />} label="CLIENT BILLING" />
              <Tab icon={<VpnLockIcon />} label="ENTERPRISE ADMIN" />
            </Tabs>

            {loginMode === 0 ? (
              <>
                <ReceiptLongIcon sx={{ fontSize: 60, color: '#10b981', mb: 1, filter: 'drop-shadow(0 0 10px rgba(16,185,129,0.3))' }} />
                <Typography variant="h4" fontWeight={900} color="white" gutterBottom sx={{ letterSpacing: '-1px' }}>
                  Billing Center
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 4 }}>
                  Access invoices, settle debts, and manage fleet subscriptions.
                </Typography>
              </>
            ) : (
              <>
                <VpnLockIcon sx={{ fontSize: 70, color: '#3b82f6', mb: 2, filter: 'drop-shadow(0 0 15px rgba(59,130,246,0.5))' }} />
                <Typography variant="h3" fontWeight={900} color="white" gutterBottom sx={{ letterSpacing: '-2px', textTransform: 'uppercase' }}>
                  Sovereign Hub
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 4, fontStyle: 'italic' }}>
                  "Precision Intelligence for Enterprise Fleet Controllers"
                </Typography>
              </>
            )}

            <form onSubmit={handleBillingLogin}>
              <TextField
                fullWidth
                label="Registered Identity"
                variant="outlined"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    borderRadius: '20px',
                    background: 'rgba(255,255,255,0.03)',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                  },
                  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)', fontWeight: 600 },
                }}
              />
              <TextField
                fullWidth
                label="Secure Access Key"
                type="password"
                variant="outlined"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    borderRadius: '20px',
                    background: 'rgba(255,255,255,0.03)',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                  },
                  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)', fontWeight: 600 },
                }}
              />
              {authError && (
                <Typography color="error" variant="caption" sx={{ mb: 2, display: 'block', fontWeight: 800 }}>
                  CREDENTIAL VALIDATION FAILED. PLEASE RETRY.
                </Typography>
              )}
              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                sx={{
                  py: 2.5,
                  borderRadius: '20px',
                  fontWeight: 900,
                  fontSize: '1rem',
                  background: loginMode === 1 
                    ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' 
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: loginMode === 1 
                    ? '0 10px 30px rgba(59,130,246,0.4)' 
                    : '0 10px 30px rgba(16,185,129,0.3)',
                  '&:hover': { 
                    transform: 'translateY(-2px)',
                    boxShadow: loginMode === 1 
                      ? '0 15px 35px rgba(59,130,246,0.5)' 
                      : '0 15px 35px rgba(16,185,129,0.4)' 
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                {loginMode === 0 ? 'ENTER BILLING PORTAL' : 'INITIALIZE SOVEREIGN ACCESS'}
              </Button>
            </form>

            <Box sx={{ mt: 4 }}>
              <Button
                onClick={() => navigate('/login')}
                variant="text"
                sx={{ color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'none', '&:hover': { color: '#fff' } }}
              >
                Return to Global Fleet Intelligence
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 10 }}>
      {/* --- PRIMARY SOVEREIGN TABS --- */}
      {admin && (
        <Paper
          sx={{
            mb: 4,
            borderRadius: '24px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Tabs
            value={tabIndex}
            onChange={(e, v) => setTabIndex(v)}
            variant="fullWidth"
            sx={{
              '& .MuiTabs-indicator': { height: 4, borderRadius: '4px' },
              '& .MuiTab-root': {
                fontWeight: 900,
                fontSize: '1rem',
                py: 3,
                color: 'rgba(255,255,255,0.5)',
              },
              '& .Mui-selected': { color: '#3b82f6 !important' },
            }}
          >
            <Tab icon={<AssessmentIcon />} label="PLATFORM ANALYTICS" />
            <Tab icon={<GroupIcon />} label="USER LEDGER" />
            <Tab icon={<ReceiptLongIcon />} label="AUDIT LOGS" />
            <Tab icon={<ReceiptIcon />} label="FLEET SETTLEMENT" />
            <Tab icon={<StorageIcon />} label="DATABASE & LOGS" />
            <Tab icon={<SettingsIcon />} label="COMMAND SETTINGS" />
            <Tab icon={<MonitorHeartIcon />} label="SYSTEM STATUS" />
            <Tab icon={<VpnKeyIcon />} label="SECRETS MANAGER" />
            <Tab icon={<StarsIcon />} label="PLAN MANAGEMENT" />
          </Tabs>
        </Paper>
      )}

      {/* --- TAB 0: ANALYTICS HUB (SAAFE) --- */}
      {admin && tabIndex === 0 && (
        <Box>
          <Grid container spacing={3} sx={{ mb: 6 }}>
            <Grid item xs={12} md={2.4}>
              <Card sx={{ borderRadius: '24px', background: 'linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(29,78,216,0.1) 100%)', border: '1px solid #3b82f6' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="caption" sx={{ color: '#3b82f6', fontWeight: 900 }}>TOTAL REVENUE</Typography>
                  <Typography variant="h4" fontWeight={900}>₹{analytics?.totalRevenue || 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={2.4}>
              <Card sx={{ borderRadius: '24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="caption" sx={{ opacity: 0.6 }}>PROJECTED (30D)</Typography>
                  <Typography variant="h4" fontWeight={900} color="primary.light">₹{analytics?.projectedRevenue || 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={2.4}>
              <Card sx={{ borderRadius: '24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="caption" sx={{ opacity: 0.6 }}>ACTIVE USERS</Typography>
                  <Typography variant="h4" fontWeight={900}>{analytics?.totalClients || 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={2.4}>
              <Card sx={{ borderRadius: '24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="caption" sx={{ opacity: 0.6 }}>FLEET SIZE</Typography>
                  <Typography variant="h4" fontWeight={900}>{analytics?.totalVehicles || 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={2.4}>
              <Card sx={{ borderRadius: '24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="caption" sx={{ opacity: 0.6 }}>CHURN RISK</Typography>
                  <Typography variant="h4" fontWeight={900} color="success.main">{analytics?.churnRate || 2.5}%</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Paper sx={{ p: 4, borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', mb: 4 }}>
            <Typography variant="h6" fontWeight={900} sx={{ mb: 3 }}>SOVEREIGN STATUS DISTRIBUTION</Typography>
            <Grid container spacing={2}>
              {['PAID', 'GRACE', 'EXPIRED', 'PENDING'].map((status) => (
                <Grid item xs={6} md={3} key={status}>
                  <Box sx={{ p: 2, borderRadius: '16px', background: 'rgba(255,255,255,0.03)', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <Typography variant="caption" sx={{ opacity: 0.5, fontWeight: 900 }}>{status} CLIENTS</Typography>
                    <Typography variant="h4" fontWeight={900} color={status === 'PAID' ? 'success.main' : status === 'GRACE' ? 'warning.main' : 'error.main'}>
                      {analytics?.distribution?.[status] || 0}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>

          <Paper
            sx={{
              p: 4,
              borderRadius: '24px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <Typography variant="h5" fontWeight={900} sx={{ mb: 4 }}>
              REVENUE VELOCITY (MONTHLY)
            </Typography>
            <Grid container spacing={2}>
              {analytics?.monthlyBreakdown ? (
                Object.entries(analytics.monthlyBreakdown).map(([month, val]) => (
                  <Grid item xs={6} md={3} key={month}>
                    <Box
                      sx={{
                        p: 3,
                        borderRadius: '16px',
                        background: 'rgba(255,255,255,0.05)',
                        textAlign: 'center',
                      }}
                    >
                      <Typography variant="caption" sx={{ opacity: 0.6 }}>
                        {month}
                      </Typography>
                      <Typography variant="h5" fontWeight={900}>
                        ₹{val}
                      </Typography>
                    </Box>
                  </Grid>
                ))
              ) : (
                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ opacity: 0.5 }}>
                    Synchronizing Time-Series Data...
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Box>
      )}

      {/* --- TAB 1: GLOBAL USER LEDGER --- */}
      {admin && tabIndex === 1 && (
        <Paper
          sx={{
            p: 4,
            borderRadius: '24px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}
          >
            <Typography variant="h5" fontWeight={900}>
              GLOBAL USER AUDIT LEDGER
            </Typography>
            <TextField
              placeholder="Find Enterprise Client..."
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{
                width: 400,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.03)',
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="primary" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    '& th': {
                      borderBottom: '2px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.5)',
                      fontWeight: 900,
                    },
                  }}
                >
                  <TableCell>CLIENT IDENTITY</TableCell>
                  <TableCell>FLEET SIZE</TableCell>
                  <TableCell>SENTRY STATUS</TableCell>
                  <TableCell align="center">UNPAID DAYS</TableCell>
                  <TableCell align="right">PENDING DEBT (INR)</TableCell>
                  <TableCell align="center">COMMANDS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLedger.map((u) => (
                  <TableRow key={u.id} sx={{ '&:hover': { background: 'rgba(255,255,255,0.02)' } }}>
                    <TableCell sx={{ fontWeight: 800 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {u.email}
                        {u.isVIP && (
                          <Tooltip title="VIP Account (Grace Extension Active)">
                            <StarsIcon sx={{ color: '#facc15', fontSize: '1.2rem' }} />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ opacity: 0.8 }}>{u.fleetSize} Units</TableCell>
                    <TableCell>
                      <Chip
                        label={u.status}
                        size="small"
                        sx={{
                          fontWeight: 900,
                          width: 90,
                          bgcolor:
                            u.status === 'PAID'
                              ? 'rgba(74,222,128,0.2)'
                              : u.status === 'GRACE'
                                ? 'rgba(250,204,21,0.2)'
                                : 'rgba(248,113,113,0.2)',
                          color:
                            u.status === 'PAID'
                              ? '#4ade80'
                              : u.status === 'GRACE'
                                ? '#facc15'
                                : '#f87171',
                        }}
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ opacity: 0.8 }}>
                      {u.unpaidDays > 0 ? (
                        <Typography color="error" variant="body2" sx={{ fontWeight: 700 }}>
                          {u.unpaidDays} DAYS
                        </Typography>
                      ) : (
                        <Typography color="success.main" variant="body2">
                          CLEAN
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900 }}>
                      ₹{u.totalDue?.toFixed(2)}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Button
                          variant="contained"
                          onClick={() => handleSettleForUser(u.id, 'monthly', u.totalDue)}
                          sx={{ borderRadius: '8px', fontWeight: 900, fontSize: '0.7rem' }}
                          disabled={u.totalDue <= 0 || settling}
                        >
                          FORCE SETTLE
                        </Button>
                        <Button
                          variant="outlined"
                          color="warning"
                          onClick={() => handleAdjustExpiry(u.id, u.email)}
                          sx={{ borderRadius: '8px', fontWeight: 900, fontSize: '0.7rem' }}
                          disabled={settling}
                        >
                          EXTEND GRACE
                        </Button>
                        <Button
                          variant="contained"
                          color="secondary"
                          onClick={() => {
                            setEditingUser(u);
                            setEditForm({ planId: u.planId || 'monthly', status: u.status, expiresAt: '' });
                          }}
                          sx={{ borderRadius: '8px', fontWeight: 900, fontSize: '0.7rem' }}
                          disabled={settling}
                        >
                          <EditIcon sx={{ fontSize: '1rem', mr: 0.5 }} /> MANAGE
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* --- TAB 2: AUDIT LOGS --- */}
      {admin && tabIndex === 2 && (
        <Paper
          sx={{
            p: 4,
            borderRadius: '24px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Typography variant="h5" fontWeight={900} sx={{ mb: 4 }}>
            SOVEREIGN AUDIT TRAIL
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 900, color: 'rgba(255,255,255,0.5)' } }}>
                  <TableCell>TIMESTAMP</TableCell>
                  <TableCell>ACTION</TableCell>
                  <TableCell>USER</TableCell>
                  <TableCell>DETAILS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow
                    key={log.id}
                    sx={{ '&:hover': { background: 'rgba(255,255,255,0.02)' } }}
                  >
                    <TableCell sx={{ opacity: 0.7 }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.action}
                        size="small"
                        sx={{
                          fontWeight: 800,
                          background: 'rgba(59,130,246,0.1)',
                          color: '#60a5fa',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{log.user?.email || 'System'}</TableCell>
                    <TableCell sx={{ opacity: 0.8 }}>{log.details}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* --- TAB 3: FLEET SETTLEMENT (User view or Admin view) --- */}
      {(admin && tabIndex === 3) || (!admin && tabIndex === 0) ? (
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: '24px',
            background: 'rgba(255,255,255,0.01)',
            backdropFilter: 'blur(30px)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: 900,
              mb: 4,
              background: 'linear-gradient(90deg, #60a5fa 0%, #3b82f6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            My Fleet Protection Settlement
          </Typography>

          <Grid container spacing={3} sx={{ mb: 6 }}>
            {bill?.plans?.map((plan) => (
              <Grid item xs={12} md={4} key={plan.id}>
                <Card
                  onClick={() => setSelectedPlan(plan.id)}
                  sx={{
                    cursor: 'pointer',
                    borderRadius: '24px',
                    border: '2px solid',
                    background:
                      selectedPlan === plan.id ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                    borderColor: selectedPlan === plan.id ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.1, 1)',
                    '&:hover': { transform: 'translateY(-5px)' },
                  }}
                >
                  <CardContent sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h6" fontWeight={800} sx={{ opacity: 0.7 }}>
                      {plan.name}
                    </Typography>
                    <Typography variant="h3" fontWeight={900} sx={{ my: 1 }}>
                      ₹{plan.price}
                    </Typography>
                    <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.05)' }} />
                    <Box sx={{ textAlign: 'left', opacity: 0.5 }}>
                      <Typography variant="caption" display="block">
                        ● Incl. GST (18%)
                      </Typography>
                      <Typography variant="caption" display="block">
                        ● Provisioning for {deviceCount} Units
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Paper
            sx={{
              p: 4,
              borderRadius: '24px',
              background: 'rgba(255,255,255,0.03)',
              mb: 5,
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <Typography variant="h6" fontWeight={800} sx={{ mb: 3 }}>
              FEE & TAX BREAKDOWN (INCLUSIVE)
            </Typography>
            <Grid container spacing={4}>
              <Grid item xs={6} md={3}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <VerifiedUserIcon color="primary" fontSize="small" />
                  <Box>
                    <Typography variant="caption" display="block" sx={{ opacity: 0.5 }}>
                      BASIC ACCESS
                    </Typography>
                    <Typography fontWeight={900}>
                      ₹{((currentPlan?.breakdown?.basic || 0) * deviceCount).toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <StorageIcon color="secondary" fontSize="small" />
                  <Box>
                    <Typography variant="caption" display="block" sx={{ opacity: 0.5 }}>
                      SERVER CHARGE
                    </Typography>
                    <Typography fontWeight={900}>
                      ₹{((currentPlan?.breakdown?.server || 0) * deviceCount).toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <CloudQueueIcon sx={{ color: '#06b6d4' }} fontSize="small" />
                  <Box>
                    <Typography variant="caption" display="block" sx={{ opacity: 0.5 }}>
                      CLOUD INFRA
                    </Typography>
                    <Typography fontWeight={900}>
                      ₹{((currentPlan?.breakdown?.cloud || 0) * deviceCount).toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <ReceiptIcon color="success" fontSize="small" />
                  <Box>
                    <Typography variant="caption" display="block" sx={{ opacity: 0.5 }}>
                      GST (18%)
                    </Typography>
                    <Typography fontWeight={900}>
                      ₹
                      {(
                        (currentPlan?.breakdown?.gst || 0) * deviceCount +
                        (bill?.totalDue || 0) * 0.18
                      ).toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.05)' }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h4" fontWeight={900} color="primary.main">
                  TOTAL: ₹{totalFleetAmount.toFixed(2)}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.5 }}>
                  Includes accrued debt of ₹{bill?.totalDue || 0}
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="large"
                onClick={
                  !analytics?.config?.paymentLink || analytics?.config?.paymentLink === '#'
                    ? handleDemoPay
                    : () => window.open(analytics.config.paymentLink, '_blank')
                }
                sx={{ borderRadius: '16px', px: 6, py: 2, fontWeight: 900, fontSize: '1.1rem' }}
              >
                {!analytics?.config?.paymentLink || analytics?.config?.paymentLink === '#'
                  ? 'ACTIVATE VIA DEMO PAY'
                  : 'PROCEED TO SECURE PAYMENT'}
              </Button>
            </Box>
          </Paper>

          <Typography
            variant="h5"
            sx={{ mb: 3, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 2 }}
          >
            <VerifiedIcon color="primary" /> Professional Invoice Registry
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    '& th': {
                      borderBottom: '2px solid rgba(255,255,255,0.05)',
                      color: 'rgba(255,255,255,0.5)',
                      fontWeight: 800,
                    },
                  }}
                >
                  <TableCell>INVOICE NO.</TableCell>
                  <TableCell>DATE</TableCell>
                  <TableCell>PLAN</TableCell>
                  <TableCell>UNITS</TableCell>
                  <TableCell align="right">AMOUNT (INR)</TableCell>
                  <TableCell align="center">STATUS</TableCell>
                  <TableCell align="center">ACTION</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bill?.history?.length > 0 ? (
                  bill.history.map((entry, idx) => (
                    <TableRow
                      key={idx}
                      sx={{ '&:hover': { background: 'rgba(255,255,255,0.02)' } }}
                    >
                      <TableCell sx={{ fontWeight: 800, color: 'primary.light' }}>
                        {entry.invoiceId}
                      </TableCell>
                      <TableCell sx={{ opacity: 0.5 }}>
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, opacity: 0.8 }}>
                        {(entry.planId || 'MONTHLY').toUpperCase()}
                      </TableCell>
                      <TableCell sx={{ opacity: 0.7 }}>{entry.deviceCount || 1} Units</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 900 }}>
                        ₹{entry.price}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label="PAID"
                          size="small"
                          sx={{
                            fontWeight: 800,
                            bgcolor: 'rgba(74,222,128,0.1)',
                            color: '#4ade80',
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          onClick={() => setSelectedInvoice(entry)}
                          sx={{ color: '#3b82f6', '&:hover': { background: 'rgba(59,130,246,0.1)' } }}
                          size="small"
                        >
                          <ReceiptIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ textAlign: 'center', opacity: 0.5, py: 5 }}>
                      No previous settlements discovered.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : null}

      {/* --- TAB 4: DATABASE & LOGS --- */}
      {admin && tabIndex === 4 && (
        <Paper
          sx={{
            p: 4,
            borderRadius: '24px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <Typography variant="h5" fontWeight={900} sx={{ mb: 4 }}>
            SOVEREIGN AUDIT LEDGER (SECURE DB LOGS)
          </Typography>
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow
                  sx={{
                    '& th': { bgcolor: '#0f172a', fontWeight: 900, color: 'rgba(255,255,255,0.5)' },
                  }}
                >
                  <TableCell>TIMESTAMP</TableCell>
                  <TableCell>ADMIN ID</TableCell>
                  <TableCell>ACTION</TableCell>
                  <TableCell>AFFECTED CLIENT</TableCell>
                  <TableCell>DETAILS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {auditLogs.length > 0 ? (
                  auditLogs.map((log) => (
                    <TableRow
                      key={log.id}
                      sx={{ '&:hover': { background: 'rgba(255,255,255,0.05)' } }}
                    >
                      <TableCell sx={{ opacity: 0.6, fontSize: '0.8rem' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', opacity: 0.5, fontSize: '0.7rem' }}>
                        {log.adminId}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.action}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            bgcolor: 'rgba(59,130,246,0.2)',
                            color: '#3b82f6',
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>
                        {log.user?.email || log.userId}
                      </TableCell>
                      <TableCell sx={{ opacity: 0.8, fontSize: '0.85rem' }}>
                        {log.details}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ opacity: 0.5, py: 5 }}>
                      No audit logs discovered in database.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
      {/* --- TAB 5: COMMAND SETTINGS --- */}
      {admin && tabIndex === 5 && (
        <Paper
          sx={{
            p: 4,
            borderRadius: '24px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <Typography variant="h5" fontWeight={900} sx={{ mb: 4 }}>
            GLOBAL COMMAND SETTINGS
          </Typography>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  p: 4,
                  borderRadius: '24px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <Typography variant="h6" fontWeight={800} gutterBottom>
                  Sovereign Payment Gateway Link
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.5, mb: 3 }}>
                  The active link triggered by "Proceed to Pay". Updates are reflected across all
                  B2B enterprise hubs immediately.
                </Typography>
                <TextField
                  fullWidth
                  value={adminSettings.paymentLink}
                  onChange={(e) => setAdminSettings({ ...adminSettings, paymentLink: e.target.value })}
                  placeholder="https://rzp.io/l/..."
                  sx={{
                    mb: 3,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.03)',
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LinkIcon color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleUpdateSovereignSettings}
                  sx={{ borderRadius: '12px', fontWeight: 900, px: 4 }}
                >
                  SAVE GLOBAL CONFIGURATION
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* --- TAB 6: SYSTEM STATUS --- */}
      {admin && tabIndex === 6 && (
        <Paper
          sx={{
            p: 4,
            borderRadius: '24px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <Typography variant="h5" fontWeight={900} sx={{ mb: 4 }}>
            REAL-TIME PLATFORM HEALTH
          </Typography>
          <Grid container spacing={4}>
            {[
              { label: 'SaaS API Engine', value: systemStats?.status || 'Active', color: '#4ade80' },
              { label: 'Database (Postgres)', value: systemStats?.db || 'Connected', color: '#4ade80' },
              { label: 'Traccar Core', value: systemStats?.traccar || 'Running', color: '#4ade80' },
              { label: 'CPU Load', value: `${systemStats?.cpu?.[0]?.toFixed(2) || '0.00'}`, color: '#60a5fa' },
              { label: 'Memory Usage', value: `${systemStats?.memory?.free} / ${systemStats?.memory?.total}`, color: '#60a5fa' },
              { label: 'System Uptime', value: `${(systemStats?.uptime / 3600).toFixed(1)} Hours`, color: '#facc15' },
            ].map((stat, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Box
                  sx={{
                    p: 3,
                    borderRadius: '16px',
                    bgcolor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="caption" sx={{ opacity: 0.5, fontWeight: 900 }}>
                    {stat.label.toUpperCase()}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: stat.color, mt: 1 }}>
                    {stat.value}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* --- TAB 7: SECRETS MANAGER --- */}
      {admin && tabIndex === 7 && (
        <Paper
          sx={{
            p: 4,
            borderRadius: '24px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <Typography variant="h5" fontWeight={900} sx={{ mb: 4 }}>
            SOVEREIGN SECRETS & API COMMAND
          </Typography>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Payment Gateway (Razorpay)</Typography>
              <TextField
                fullWidth
                label="Razorpay Key ID"
                value={adminSettings.razorpayId}
                onChange={(e) => setAdminSettings({ ...adminSettings, razorpayId: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Razorpay Secret Key"
                type="password"
                value={adminSettings.razorpaySecret}
                onChange={(e) => setAdminSettings({ ...adminSettings, razorpaySecret: e.target.value })}
                sx={{ mb: 2 }}
              />
               <TextField
                fullWidth
                label="Razorpay Webhook Secret"
                type="password"
                value={adminSettings.razorpayWebhookSecret}
                onChange={(e) => setAdminSettings({ ...adminSettings, razorpayWebhookSecret: e.target.value })}
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Platform Infrastructure</Typography>
              <TextField
                fullWidth
                label="Firebase Server Key"
                value={adminSettings.firebaseConfig}
                onChange={(e) => setAdminSettings({ ...adminSettings, firebaseConfig: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="AI Engine (OpenRouter) Key"
                value={adminSettings.openrouterKey}
                onChange={(e) => setAdminSettings({ ...adminSettings, openrouterKey: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Support Contact Email"
                value={adminSettings.supportEmail}
                onChange={(e) => setAdminSettings({ ...adminSettings, supportEmail: e.target.value })}
                sx={{ mb: 2 }}
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 4, textAlign: 'right' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<SaveIcon />}
              onClick={handleUpdateSovereignSettings}
              sx={{ borderRadius: '12px', fontWeight: 900, px: 6 }}
            >
              SAVE SOVEREIGN CONFIGURATION
            </Button>
          </Box>
        </Paper>
      )}

      {/* --- MANUAL MANAGEMENT DIALOG --- */}
      <Dialog
        open={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: '24px',
            background: '#0f172a',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, fontSize: '1.5rem' }}>
          MANAGE CLIENT: {editingUser?.email}
        </DialogTitle>
        <DialogContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Subscription Plan</InputLabel>
              <Select
                value={editForm.planId}
                label="Subscription Plan"
                onChange={(e) => setEditForm({ ...editForm, planId: e.target.value })}
                sx={{ borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.03)', color: 'white' }}
              >
                {bill?.plans?.map(p => (
                  <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Activation Status</InputLabel>
              <Select
                value={editForm.status}
                label="Activation Status"
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                sx={{ borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.03)', color: 'white' }}
              >
                <MenuItem value="ACTIVE">ACTIVE (Full Service)</MenuItem>
                <MenuItem value="EXPIRED">EXPIRED (Suspended)</MenuItem>
                <MenuItem value="CANCELLED">CANCELLED</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="New Expiration Date"
              type="date"
              value={editForm.expiresAt}
              onChange={(e) => setEditForm({ ...editForm, expiresAt: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.03)' },
                '& input': { color: 'white' }
              }}
            />
            <Typography variant="caption" sx={{ opacity: 0.5 }}>
              * Updates will sync to the Traccar tracking engine immediately.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 4 }}>
          <Button onClick={() => setEditingUser(null)} color="inherit" sx={{ fontWeight: 900 }}>
            CANCEL
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleManualUserUpdate}
            disabled={settling}
            sx={{ borderRadius: '12px', fontWeight: 900, px: 4 }}
          >
            {settling ? <CircularProgress size={24} /> : 'APPLY MANAGEMENT SYNC'}
          </Button>
        </DialogActions>
      </Dialog>

      <InvoiceDialog
        open={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
      />

      {/* --- TAB 8: PLAN MANAGEMENT --- */}
      {admin && tabIndex === 8 && (
        <Paper sx={{ p: 4, borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, alignItems: 'center' }}>
            <Typography variant="h5" fontWeight={900}>BILLING PLAN ARCHITECTURE</Typography>
            <Button variant="contained" startIcon={<StarsIcon />} sx={{ borderRadius: '12px', fontWeight: 900 }}>
              NEW SOVEREIGN PLAN
            </Button>
          </Box>
          <Grid container spacing={3}>
            {plans.map((plan) => (
              <Grid item xs={12} md={4} key={plan.id}>
                <Card sx={{ borderRadius: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', height: '100%' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="h6" fontWeight={900}>{plan.name}</Typography>
                      <Chip label={plan.billingCycle} size="small" sx={{ fontWeight: 900, bgcolor: 'rgba(59,130,246,0.1)', color: '#3b82f6' }} />
                    </Box>
                    <Typography variant="body2" sx={{ opacity: 0.6, mb: 3, height: 40, overflow: 'hidden' }}>{plan.description}</Typography>
                    <Box sx={{ mb: 3 }}>
                       <Typography variant="h3" fontWeight={900} sx={{ display: 'inline' }}>₹{plan.pricePerDevice}</Typography>
                       <Typography variant="caption" sx={{ opacity: 0.5, ml: 1 }}>/ UNIT</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button fullWidth variant="outlined" sx={{ borderRadius: '10px', fontWeight: 900 }}>EDIT</Button>
                      <IconButton color="error" sx={{ border: '1px solid rgba(248,113,113,0.2)', borderRadius: '10px' }}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%', borderRadius: '12px', fontWeight: 700 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default BillingPage;
