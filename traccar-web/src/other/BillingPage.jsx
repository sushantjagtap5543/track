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
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import SecurityIcon from '@mui/icons-material/Security';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import DnsIcon from '@mui/icons-material/Dns';
import HistoryIcon from '@mui/icons-material/History';
import RefreshIcon from '@mui/icons-material/Refresh';

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
  const [tabIndex, setTabIndex] = useState(() => {
    const saved = localStorage.getItem('billing_tab_index');
    return saved ? parseInt(saved, 10) : 0;
  });
  useEffect(() => {
    localStorage.setItem('billing_tab_index', tabIndex);
  }, [tabIndex]);
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
  const [success, setSuccess] = useState(null);

  // --- NEW: ONBOARDING STATE ---
  const [showOnboardDialog, setShowOnboardDialog] = useState(false);
  const [onboardData, setOnboardData] = useState({ name: '', email: '', password: '', role: 'CLIENT' });
  const [onboarding, setOnboarding] = useState(false);

  // --- NEW: ROLE & DEVICE PROVISIONING STATE ---
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [newRole, setNewRole] = useState('CLIENT');
  
  const [showProvisionDialog, setShowProvisionDialog] = useState(false);
  const [provisionText, setProvisionText] = useState(''); // "Name,UniqueId\nName2,UniqueId2"
  const [provisioning, setProvisioning] = useState(false);
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
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 Minutes
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  function showFeedback(message, severity = 'success') {
    setSnackbar({ open: true, message, severity });
  }

  async function handleLogout() {
    setSettling(true);
    localStorage.removeItem('saas_token');
    localStorage.removeItem('saas_role');
    localStorage.removeItem('saas_user');
    localStorage.removeItem('billing_tab_index');
    setSaasRole(null); 
    try {
        await fetch('/api/session', { method: 'DELETE' });
    } catch (e) {}
    setSettling(false);
    navigate('/login');
  }

  const [mySessions, setMySessions] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);
  const [securityLoading, setSecurityLoading] = useState(false);

  // --- SOVEREIGN RE-ORDERED HELPERS (HOISTED) ---

  async function fetchAnalyticsAndLedger() {
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
  }

  async function fetchSecurityData() {
    try {
      setSecurityLoading(true);
      const token = localStorage.getItem('saas_token');
      const [sRes, hRes] = await Promise.all([
        fetch('/api/auth/sessions', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/auth/login-history', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (sRes.ok) setMySessions(await sRes.json());
      if (hRes.ok) setLoginHistory(await hRes.json());
    } catch (error) {
      console.error('Security Fetch Error:', error);
    } finally {
      setSecurityLoading(false);
    }
  }

  async function handleRevokeSession(sessionId) {
    try {
      const token = localStorage.getItem('saas_token');
      const res = await fetch('/api/auth/revoke-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        showFeedback('Sovereign Session Revoked');
        fetchSecurityData();
      }
    } catch (error) {
      showFeedback('Revocation Failed', 'error');
    }
  }

  async function fetchFullSystemStatus() {
    try {
      const token = localStorage.getItem('saas_token');
      const res = await fetch('/api/admin/health/full', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setSystemStats(await res.json());
    } catch (err) {
      console.error('System Status Error:', err);
    }
  }

  async function fetchAdminSettings() {
    try {
      const token = localStorage.getItem('saas_token');
      const res = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAdminSettings(await res.json());
    } catch (err) {
      console.error('Admin Settings Error:', err);
    }
  }

  async function handleOnboardClient(e) {
    if (e) e.preventDefault();
    setOnboarding(true);
    setSuccess(null);
    setError(null);
    try {
        const token = localStorage.getItem('saas_token');
        const res = await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}` 
            },
            body: JSON.stringify(onboardData)
        });
        const data = await res.json();
        if (res.ok) {
            setSuccess('Client onboarded successfully. Welcome email queued.');
            setShowOnboardDialog(false);
            setOnboardData({ name: '', email: '', password: '', role: 'CLIENT' });
            fetchFullSystemStatus(); 
        } else {
            setError(data.error || 'Onboarding failed.');
        }
    } catch (err) {
        setError('Network error during onboarding.');
    } finally {
        setOnboarding(false);
    }
  }

  async function handleUpdateRole() {
    if (!targetUser) return;
    try {
        const token = localStorage.getItem('saas_token');
        const res = await fetch('/api/admin/users/role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ userId: targetUser.id, role: newRole })
        });
        if (res.ok) {
            setSuccess(`User role updated to ${newRole}`);
            setShowRoleDialog(false);
            fetchFullSystemStatus();
        } else {
            setError('Failed to update role.');
        }
    } catch (err) {
        setError('Network error updating role.');
    }
  }

  async function handleBulkProvision() {
    if (!targetUser || !provisionText) return;
    setProvisioning(true);
    try {
        const devices = provisionText.split('\n').filter(l => l.includes(',')).map(l => {
            const [name, uniqueId] = l.split(',');
            return { name: name.trim(), uniqueId: uniqueId.trim() };
        });

        const token = localStorage.getItem('saas_token');
        const res = await fetch('/api/admin/users/bulk-devices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ userId: targetUser.id, devices })
        });
        const data = await res.json();
        if (res.ok) {
            setSuccess(`Successfully provisioned ${data.results.filter(r => r.status === 'success').length} devices.`);
            setShowProvisionDialog(false);
            setProvisionText('');
        } else {
            setError(data.error || 'Provisioning failed.');
        }
    } catch (err) {
        setError('Network error during provisioning.');
    } finally {
        setProvisioning(false);
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
    
    if (tabIndex === 9) {
        fetchSecurityData();
    }

    if (!admin && !token) {
      // ✅ NEW: Automatic Sync Attempt for already logged-in users
      fetch('/api/auth/sync')
        .then((res) => res.json())
        .then((data) => {
          if (data.token) {
            localStorage.setItem('saas_token', data.token);
            localStorage.setItem('saas_role', data.user.role);
            localStorage.setItem('saas_user', JSON.stringify(data.user));
            window.location.reload(); // Refresh to load data
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, [admin, tabIndex]);

  // ✅ NEW: Session Heartbeat (Check token every 2 minutes)
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
        fetch('/api/auth/sync', {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => {
            if (res.status === 401 || res.status === 403) {
                console.warn('[BillingPage] Session expired or invalid');
                handleLogout(); // De-auth immediately
            }
        })
        .catch(() => {});
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [token]);

  async function handleDemoPay() {
    if (settling) return;
    setSettling(true);
    try {
      const token = localStorage.getItem('saas_token');
      const res = await fetch('/api/billing/settle-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planId: 'monthly' }),
      });
      if (res.ok) {
        showFeedback('Sovereign Demo Settlement Complete');
        fetchData();
      } else {
        const d = await res.json();
        showFeedback(d.error || 'Demo Protocol Interrupted', 'error');
      }
    } catch (err) {
      showFeedback('Network Disruption during Demo Settlement', 'error');
    } finally {
      setSettling(false);
    }
  }

  async function handleUpdateGateway() {
    try {
      const token = localStorage.getItem('saas_token');
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...adminSettings, paymentLink: adminSettings.paymentLink }),
      });
      if (res.ok) {
        showFeedback('Gateway Optimized');
      } else {
        showFeedback('Optimization Failed', 'error');
      }
    } catch (err) {
      showFeedback('Gateway Access Error', 'error');
    }
  }

  async function handleManualUserUpdate() {
    if (!editingUser) return;
    try {
      const token = localStorage.getItem('saas_token');
      const res = await fetch('/api/admin/user-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: editingUser.id, ...editForm }),
      });
      if (res.ok) {
        showFeedback('User Status Refined');
        setEditingUser(null);
        fetchAnalyticsAndLedger();
      } else {
        showFeedback('Manual Update Failed', 'error');
      }
    } catch (err) {
      showFeedback('System Access Error', 'error');
    }
  }

  async function handleSettleForUser(targetId, planId, total) {
    if (!targetId || !planId) return;
    setSettling(true);
    try {
      const token = localStorage.getItem('saas_token');
      const res = await fetch('/api/billing/settle-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: targetId, planId, total }),
      });
      if (res.ok) {
        showFeedback('Manual Ledger Settlement Complete');
        fetchAnalyticsAndLedger();
      } else {
        showFeedback('Settlement Protocol Interrupted', 'error');
      }
    } catch (err) {
      showFeedback('Network Disruption during Settlement', 'error');
    } finally {
      setSettling(false);
    }
  }

  const handleGhostUser = async (userId) => {
    try {
        const response = await fetch('/api/admin/impersonate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('saas_token')}` },
            body: JSON.stringify({ userId })
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('saas_token', data.accessToken);
            localStorage.setItem('saas_user', JSON.stringify(data.user));
            localStorage.setItem('saas_role', data.user.role);
            showFeedback(`GHOSTING ACTIVE: Now viewing as ${data.user.email}`, 'info');
            setTimeout(() => window.location.href = '/', 1000);
        } else {
            showFeedback(data.error, 'error');
        }
    } catch (e) {
        showFeedback('Impersonation engine failure.', 'error');
    }
  };

  async function handleAdjustExpiry(targetId, email) {
    const days = prompt(`Strategic Expiry Override for ${email}: Enter number of days to extend:`, '30');
    if (!days) return;
    try {
      const token = localStorage.getItem('saas_token');
      const res = await fetch('/api/admin/adjust-expiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: targetId, days: parseInt(days, 10) }),
      });
      if (res.ok) {
        showFeedback('User Expiry recalibrated successfully');
        fetchAnalyticsAndLedger();
      } else {
        showFeedback('Override Denied', 'error');
      }
    } catch (err) {
      showFeedback('Network Disruption during recalibration', 'error');
    }
  }

  async function handleRazorpay() {
    if (!bill?.user?.email || !bill?.amount) return;
    setSettling(true);
    try {
      const supported = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
      if (!supported) throw new Error('Payment Engine unavailable');

      const token = localStorage.getItem('saas_token');
      const orderRes = await fetch('/api/billing/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: bill.amount }),
      });

      if (!orderRes.ok) throw new Error('Order Synchronization Failed');
      const order = await orderRes.json();

      const options = {
        key: adminSettings.razorpayId || 'rzp_test_xxxx',
        amount: order.amount,
        currency: 'INR',
        name: 'GeoSurePath',
        description: 'Monthly Strategic Protection Fee',
        order_id: order.id,
        handler: async (response) => {
          const verifyRes = await fetch('/api/billing/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ ...response, amount: order.amount }),
          });
          if (verifyRes.ok) {
            showFeedback('Payment Synchronized - Access Restored');
            fetchData();
          } else {
            showFeedback('Verification Failed - Contact Strategy Support', 'error');
          }
        },
        prefill: { email: bill.user.email, name: bill.user.name },
        theme: { color: '#3b82f6' },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      showFeedback(err.message, 'error');
    } finally {
      setSettling(false);
    }
  }

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

  async function handleBillingLogin(e) {
    if (e) e.preventDefault();
    if (!loginEmail || !loginPassword) {
      showFeedback('Incomplete Intel: Both credentials required', 'warning');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      if (response.ok) {
        const saasData = await response.json();
        if (saasData.accessToken) {
          localStorage.setItem('saas_token', saasData.accessToken);
        }
        if (saasData.user?.role) {
          localStorage.setItem('saas_role', saasData.user.role);
          setSaasRole(saasData.user.role);
        }
        showFeedback('Authentication Synchronized - Accessing Ledger');
        fetchData();
      } else {
        const d = await response.json();
        showFeedback(d.error || 'Unauthorized Intel Access', 'error');
      }
    } catch (e) {
      showFeedback('Authentication System Offline', 'error');
    } finally {
      setLoading(false);
    }
  }

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

  // --- SOVEREIGN INACTIVITY GUARD ---
  useEffect(() => {
    if (!admin) return;
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    const updateActivity = () => setLastActivity(Date.now());
    
    activityEvents.forEach(e => window.addEventListener(e, updateActivity));
    
    const interval = setInterval(() => {
        if (Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
            handleLogout();
            showFeedback('Session terminated due to inactivity. Security protocol enforced.', 'warning');
        }
    }, 60000); // Check every minute

    return () => {
        activityEvents.forEach(e => window.removeEventListener(e, updateActivity));
        clearInterval(interval);
    };
  }, [admin, lastActivity]);

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
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 4, fontStyle: 'italic' }}>
                  Manage invoices and fleet subscriptions.
                </Typography>
              </>
            ) : (
              <>
                <VpnLockIcon sx={{ fontSize: 70, color: '#3b82f6', mb: 2, filter: 'drop-shadow(0 0 15px rgba(59,130,246,0.5))' }} />
                <Typography variant="h3" fontWeight={900} color="white" gutterBottom sx={{ letterSpacing: '-2px', textTransform: 'uppercase' }}>
                  Sovereign Hub
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 4, fontStyle: 'italic' }}>
                  Dashboard for Enterprise Fleet Controllers
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
    <Container maxWidth="xl" sx={{ mt: 4, mb: 10, position: 'relative' }}>
      <Box sx={{ position: 'absolute', top: -10, right: 0, zIndex: 1000, display: 'flex', gap: 2 }}>
        <Button
            variant="outlined"
            onClick={() => navigate('/')}
            startIcon={<LinkIcon />}
            sx={{
                borderRadius: '12px',
                fontWeight: 900,
                color: 'rgba(59,130,246,0.6)',
                borderColor: 'rgba(59,130,246,0.2)',
                '&:hover': { color: '#3b82f6', borderColor: '#3b82f6', bgcolor: 'rgba(59,130,246,0.05)' }
            }}
        >
            RETURN TO MAP
        </Button>
        <Button
            variant="outlined"
            onClick={handleLogout}
            disabled={settling}
            startIcon={settling ? <CircularProgress size={16} color="inherit" /> : <CancelIcon />}
            sx={{
                borderRadius: '12px',
                fontWeight: 900,
                color: 'rgba(255,255,255,0.4)',
                borderColor: 'rgba(255,255,255,0.1)',
                '&:hover': { color: '#f87171', borderColor: '#f87171', bgcolor: 'rgba(248,113,113,0.05)' }
            }}
        >
            {settling ? 'DE-AUTHENTICATING...' : 'LOGOUT PORTAL'}
        </Button>
      </Box>
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
            <Tab icon={<SecurityIcon />} label="SECURITY & GOVERNANCE" />
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={900}>SOVEREIGN STATUS DISTRIBUTION</Typography>
                <Button 
                    variant="contained" 
                    startIcon={<PersonAddIcon />}
                    onClick={() => setShowOnboardDialog(true)}
                    sx={{ borderRadius: '12px', fontWeight: 800, bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}
                >
                    ONBOARD NEW CLIENT
                </Button>
            </Box>
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

          <Paper sx={{ p: 4, borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', mb: 4 }}>
            <Typography variant="h6" fontWeight={900} sx={{ mb: 3 }}>SOVEREIGN PLAN PENETRATION</Typography>
            <Grid container spacing={2}>
              {Object.entries(analytics?.planDistribution || {}).map(([pId, count]) => (
                <Grid item xs={6} md={3} key={pId}>
                  <Box sx={{ p: 2, borderRadius: '16px', background: 'rgba(59,130,246,0.05)', textAlign: 'center', border: '1px solid rgba(59,130,246,0.1)' }}>
                    <Typography variant="caption" sx={{ color: '#3b82f6', fontWeight: 900 }}>{pId.toUpperCase()}</Typography>
                    <Typography variant="h4" fontWeight={900} color="white">{count} USERS</Typography>
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
                        <Tooltip title="Update Role">
                            <IconButton 
                                size="small" 
                                color="primary" 
                                onClick={() => { setTargetUser(u); setNewRole(u.role); setShowRoleDialog(true); }}
                                sx={{ borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
                            >
                                <AdminPanelSettingsIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Bulk Provision Devices">
                            <IconButton 
                                size="small" 
                                color="secondary" 
                                onClick={() => { setTargetUser(u); setShowProvisionDialog(true); }}
                                sx={{ borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
                            >
                                <DirectionsCarIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        <Tooltip title="Ghost (Impersonate for Support)">
                            <IconButton 
                                size="small" 
                                color="info" 
                                onClick={() => handleGhostUser(u.id)}
                                sx={{ borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
                            >
                                <VisibilityIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
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
                    onClick={() => setSelectedAuditLog(log)}
                    sx={{ cursor: 'pointer', '&:hover': { background: 'rgba(255,255,255,0.02)' } }}
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
                      onClick={() => setSelectedAuditLog(log)}
                      sx={{ cursor: 'pointer', '&:hover': { background: 'rgba(255,255,255,0.05)' } }}
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

      {/* --- TAB 9: SECURITY & SESSIONS --- */}
      {admin && tabIndex === 9 && (
        <Paper
          sx={{
            p: 4,
            borderRadius: '24px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Typography variant="h5" fontWeight={900}>
                SOVEREIGN SECURITY & ACCESS HUB
            </Typography>
            <Button 
                variant="outlined" 
                startIcon={<RefreshIcon />} 
                onClick={fetchSecurityData}
                sx={{ borderRadius: '12px', fontWeight: 900 }}
                disabled={securityLoading}
            >
                REFRESH AUDIT
            </Button>
          </Box>
          
          <Grid container spacing={4}>
            <Grid item xs={12} md={7}>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DnsIcon color="primary" /> ACTIVE SOVEREIGN SESSIONS
                </Typography>
                <TableContainer sx={{ background: 'rgba(0,0,0,0.2)', borderRadius: '16px' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ '& th': { fontWeight: 900, opacity: 0.5 } }}>
                                <TableCell>AUTHORIZED DEVICE</TableCell>
                                <TableCell>IP / SOURCE</TableCell>
                                <TableCell>CREATED</TableCell>
                                <TableCell align="right">ACTION</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {mySessions.map((session) => (
                                <TableRow key={session.id}>
                                    <TableCell sx={{ fontWeight: 700 }}>{session.device}</TableCell>
                                    <TableCell sx={{ opacity: 0.7, fontFamily: 'monospace' }}>{session.ip}</TableCell>
                                    <TableCell sx={{ opacity: 0.7 }}>{new Date(session.createdAt).toLocaleString()}</TableCell>
                                    <TableCell align="right">
                                        <Button 
                                            size="small" 
                                            color="error"
                                            onClick={() => handleRevokeSession(session.id)}
                                            sx={{ fontWeight: 900, borderRadius: '8px' }}
                                        >
                                            TERMINATE
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {mySessions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 4, opacity: 0.5 }}>No other active sessions discovered.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Grid>
            
            <Grid item xs={12} md={5}>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HistoryIcon color="secondary" /> ACCESS LEDGER
                </Typography>
                <Box sx={{ background: 'rgba(255,255,255,0.02)', p: 2, borderRadius: '16px', maxHeight: 400, overflowY: 'auto' }}>
                    {loginHistory.map((entry, idx) => (
                        <Box key={idx} sx={{ display: 'flex', alignItems: 'center', p: 2, mb: 1, background: 'rgba(255,255,255,0.03)', borderRadius: '12px', borderLeft: `4px solid ${entry.success ? '#4ade80' : '#f87171'}` }}>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" fontWeight={700}>{entry.success ? 'Successful Login' : 'Failed Access Attempt'}</Typography>
                                <Typography variant="caption" sx={{ opacity: 0.5, display: 'block' }}>{new Date(entry.createdAt).toLocaleString()} • {entry.ipAddress}</Typography>
                            </Box>
                            <Chip label={entry.success ? 'SECURE' : 'VULNERABILITY'} size="small" sx={{ fontWeight: 900, bgcolor: entry.success ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', color: entry.success ? '#4ade80' : '#f87171' }} />
                        </Box>
                    ))}
                    {loginHistory.length === 0 && (
                        <Typography variant="body2" sx={{ textAlign: 'center', py: 4, opacity: 0.5 }}>Access ledger is empty.</Typography>
                    )}
                </Box>
            </Grid>
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
      {/* --- ONBOARDING DIALOG --- */}
      <Dialog 
        open={showOnboardDialog} 
        onClose={() => !onboarding && setShowOnboardDialog(false)}
        PaperProps={{
            sx: {
                borderRadius: '30px',
                background: '#1e293b',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.1)',
                p: 2,
                maxWidth: 450
            }
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, fontSize: '1.5rem', textAlign: 'center' }}>
            MANUAL ONBOARDING
        </DialogTitle>
        <DialogContent>
            <Typography variant="body2" sx={{ opacity: 0.6, mb: 3, textAlign: 'center' }}>
                Create a new client account. They will receive a welcome email with these credentials.
            </Typography>
            <Box component="form" onSubmit={handleOnboardClient} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField
                    fullWidth
                    label="Full Name"
                    variant="filled"
                    required
                    value={onboardData.name}
                    onChange={(e) => setOnboardData({ ...onboardData, name: e.target.value })}
                    sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: '12px', '& .MuiFilledInput-root': { borderRadius: '12px' } }}
                    InputLabelProps={{ style: { color: 'rgba(255,255,255,0.5)' } }}
                    inputProps={{ style: { color: 'white' } }}
                />
                <TextField
                    fullWidth
                    label="Email Address"
                    type="email"
                    variant="filled"
                    required
                    value={onboardData.email}
                    onChange={(e) => setOnboardData({ ...onboardData, email: e.target.value })}
                    sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: '12px', '& .MuiFilledInput-root': { borderRadius: '12px' } }}
                    InputLabelProps={{ style: { color: 'rgba(255,255,255,0.5)' } }}
                    inputProps={{ style: { color: 'white' } }}
                />
                <TextField
                    fullWidth
                    label="Default Password"
                    type="text"
                    variant="filled"
                    required
                    value={onboardData.password}
                    onChange={(e) => setOnboardData({ ...onboardData, password: e.target.value })}
                    sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: '12px', '& .MuiFilledInput-root': { borderRadius: '12px' } }}
                    InputLabelProps={{ style: { color: 'rgba(255,255,255,0.5)' } }}
                    inputProps={{ style: { color: 'white' } }}
                />
                
                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                    <Button 
                        fullWidth 
                        variant="outlined" 
                        onClick={() => setShowOnboardDialog(false)}
                        disabled={onboarding}
                        sx={{ borderRadius: '15px', color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}
                    >
                        CANCEL
                    </Button>
                    <Button 
                        fullWidth 
                        variant="contained" 
                        type="submit"
                        disabled={onboarding}
                        startIcon={onboarding ? <CircularProgress size={20} color="inherit" /> : <PersonAddIcon />}
                        sx={{ borderRadius: '15px', fontWeight: 900, bgcolor: '#3b82f6' }}
                    >
                        {onboarding ? 'ONBOARDING...' : 'CONFIRM'}
                    </Button>
                </Box>
            </Box>
        </DialogContent>
      </Dialog>

      {/* --- TAB 9: SECURITY & GOVERNANCE --- */}
      {admin && tabIndex === 9 && (
        <Box>
            <Typography variant="h4" fontWeight={900} sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                <SecurityIcon sx={{ fontSize: 40, color: '#3b82f6' }} />
                SECURITY & GOVERNANCE
            </Typography>
            
            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 4, borderRadius: '25px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>SESSION POLICIES</Typography>
                        <Divider sx={{ mb: 3, opacity: 0.1 }} />
                        
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle2" sx={{ opacity: 0.6 }}>INACTIVITY TIMEOUT</Typography>
                            <Typography variant="h5" fontWeight={900}>15 MINUTES</Typography>
                            <Typography variant="caption" sx={{ color: 'success.main' }}>● ACTIVE (ENFORCED)</Typography>
                        </Box>
                        
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle2" sx={{ opacity: 0.6 }}>MULTI-FACTOR AUTH (MFA)</Typography>
                            <Chip label="UNDER DEVELOPMENT" size="small" color="warning" sx={{ fontWeight: 900, mt: 1 }} />
                        </Box>
                        
                        <Button variant="outlined" fullWidth sx={{ borderRadius: '12px', borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}>
                            REDEFINE POLICIES
                        </Button>
                    </Paper>
                </Grid>
                
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 4, borderRadius: '25px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <Typography variant="h6" fontWeight={900} sx={{ mb: 2 }}>SOVEREIGN AUDIT DEPTH</Typography>
                        <Typography variant="body2" sx={{ opacity: 0.6, mb: 3 }}>
                            All administrative sessions are now recorded with high-fidelity structured logs. Ghosting events require mandatory support reasoning.
                        </Typography>
                        
                        <Alert severity="info" sx={{ borderRadius: '15px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: 'white' }}>
                            <strong>Pro-Tip:</strong> Click on any audit entry in the "Audit Logs" tab to view the detailed JSON payload of the event.
                        </Alert>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
      )}

      {/* --- SNACKBARS --- */}
      <Snackbar open={!!success} autoHideDuration={6000} onClose={() => setSuccess(null)}>
        <Alert severity="success" sx={{ borderRadius: '12px', fontWeight: 800 }}>{success}</Alert>
      </Snackbar>
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert severity="error" sx={{ borderRadius: '12px', fontWeight: 800 }}>{error}</Alert>
      </Snackbar>

      {/* --- ROLE MANAGEMENT DIALOG --- */}
      <Dialog 
        open={showRoleDialog} 
        onClose={() => setShowRoleDialog(false)}
        PaperProps={{ sx: { borderRadius: '25px', background: '#0f172a', color: 'white', border: '1px solid rgba(255,255,255,0.1)' } }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>UPDATE USER ROLE</DialogTitle>
        <DialogContent>
            <Typography variant="body2" sx={{ mb: 3, opacity: 0.7 }}>
                Elevate or demote <strong>{targetUser?.email}</strong>.
            </Typography>
            <Select
                fullWidth
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                sx={{ color: 'white', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}
            >
                <MenuItem value="CLIENT">CLIENT</MenuItem>
                <MenuItem value="MANAGER">MANAGER</MenuItem>
                <MenuItem value="ADMIN">ADMIN</MenuItem>
            </Select>
            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button fullWidth variant="outlined" onClick={() => setShowRoleDialog(false)} sx={{ borderRadius: '12px', color: 'white' }}>CANCEL</Button>
                <Button fullWidth variant="contained" onClick={handleUpdateRole} sx={{ borderRadius: '12px', fontWeight: 900, bgcolor: '#3b82f6' }}>UPDATE</Button>
            </Box>
        </DialogContent>
      </Dialog>

      {/* --- BULK PROVISIONING DIALOG --- */}
      <Dialog 
        open={showProvisionDialog} 
        onClose={() => !provisioning && setShowProvisionDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '25px', background: '#0f172a', color: 'white', border: '1px solid rgba(255,255,255,0.1)' } }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>BULK DEVICE PROVISIONING</DialogTitle>
        <DialogContent>
            <Typography variant="body2" sx={{ mb: 2, opacity: 0.7 }}>
                Enter devices for <strong>{targetUser?.email}</strong> (one per line).
                Format: <code>Device Name, Unique ID</code>
            </Typography>
            <TextField
                fullWidth
                multiline
                rows={6}
                variant="filled"
                placeholder="Car 1, 1234567890&#10;Truck A, 9876543210"
                value={provisionText}
                onChange={(e) => setProvisionText(e.target.value)}
                sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: '12px', mb: 2 }}
                InputProps={{ style: { color: 'white', fontFamily: 'monospace' } }}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
                <Button fullWidth variant="outlined" onClick={() => setShowProvisionDialog(false)} disabled={provisioning} sx={{ borderRadius: '12px', color: 'white' }}>CANCEL</Button>
                <Button 
                    fullWidth 
                    variant="contained" 
                    onClick={handleBulkProvision}
                    disabled={provisioning}
                    startIcon={provisioning && <CircularProgress size={20} color="inherit" />}
                    sx={{ borderRadius: '12px', fontWeight: 900, bgcolor: '#3b82f6' }}
                >
                    {provisioning ? 'PROVISIONING...' : 'START IMPORT'}
                </Button>
            </Box>
        </DialogContent>
      </Dialog>
      {/* --- AUDIT LOG DETAIL DIALOG --- */}
      <Dialog 
        open={Boolean(selectedAuditLog)} 
        onClose={() => setSelectedAuditLog(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: '25px', background: '#0f172a', color: 'white', border: '1px solid rgba(255,255,255,0.1)' } }}
      >
        <DialogTitle sx={{ fontWeight: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            AUDIT EVENT DETAILS
            <Chip label={selectedAuditLog?.action} size="small" color="primary" sx={{ fontWeight: 900 }} />
        </DialogTitle>
        <DialogContent>
            <Box sx={{ p: 2, background: 'rgba(255,255,255,0.03)', borderRadius: '16px', mb: 3 }}>
                <Typography variant="caption" sx={{ opacity: 0.5, display: 'block' }}>TIMESTAMP</Typography>
                <Typography variant="body1" fontWeight={700}>{selectedAuditLog && new Date(selectedAuditLog.createdAt).toLocaleString()}</Typography>
                
                <Typography variant="caption" sx={{ opacity: 0.5, display: 'block', mt: 2 }}>PERFORMED BY (ADMIN)</Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>{selectedAuditLog?.adminId || 'SYSTEM'}</Typography>
                
                <Typography variant="caption" sx={{ opacity: 0.5, display: 'block', mt: 2 }}>AFFECTED CLIENT</Typography>
                <Typography variant="body1" fontWeight={700}>{selectedAuditLog?.user?.email || selectedAuditLog?.userId || 'N/A'}</Typography>
            </Box>
            
            <Typography variant="caption" sx={{ opacity: 0.5, display: 'block', mb: 1 }}>STRUCTURED EVENT DATA</Typography>
            <Paper sx={{ p: 2, background: 'black', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', maxHeight: 300, overflow: 'auto' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#4ade80', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                    {(() => {
                        try {
                            const parsed = JSON.parse(selectedAuditLog?.details);
                            return JSON.stringify(parsed, null, 4);
                        } catch (e) {
                            return selectedAuditLog?.details;
                        }
                    })()}
                </pre>
            </Paper>
            
            <Box sx={{ mt: 3, textAlign: 'right' }}>
                <Button onClick={() => setSelectedAuditLog(null)} sx={{ color: 'white', fontWeight: 900 }}>CLOSE</Button>
            </Box>
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default BillingPage;
