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
import BuildCircleIcon from '@mui/icons-material/BuildCircle'; // ✅ New icon
import LanIcon from '@mui/icons-material/Lan'; // ✅ New icon

import { useNavigate } from 'react-router-dom';
import { useAdministrator } from '../common/util/permissions';

const InvoiceDialog = ({ open, onClose, invoice }) => {
  if (!invoice) return null;
  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: '24px', background: '#ffffff', color: '#1e293b', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' } }}>
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
  const token = localStorage.getItem('saas_token'); // ✅ FIXED: Hoisted to top of component

  // --- STATE LIFTED TO TOP ---
  const [tab, setTab] = useState(parseInt(localStorage.getItem('billing_tab_index') || '0', 10));
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [onboardData, setOnboardData] = useState({ name: '', email: '', password: '', role: 'CLIENT' });
  const [onboarding, setOnboarding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnboardDialog, setShowOnboardDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [newRole, setNewRole] = useState('CLIENT');
  const [provisionText, setProvisionText] = useState('');
  const [provisioning, setProvisioning] = useState(false);
  const [systemStats, setSystemStats] = useState(null);
  const [adminSettings, setAdminSettings] = useState({ 
    razorpayId: '', 
    paymentLink: '',
    onboardingEmailEnabled: true 
  });
  const [showProvisionDialog, setShowProvisionDialog] = useState(false);

  const [plans, setPlans] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ planId: '', status: '', expiresAt: '' });
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null); // ✅ NEW STATE
  const [aiInsights, setAiInsights] = useState(null); // ✅ AI INSIGHTS STATE
  const [aiLoading, setAiLoading] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 Minutes
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [mySessions, setMySessions] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [payments, setPayments] = useState([]); // ✅ NEW: Global Payments
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginMode, setLoginMode] = useState(0); 
  
  // ✅ NEW: Service Management State
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState({ name: '', description: '', price: 0, category: 'GENERAL' });
  const [selectedUserForService, setSelectedUserForService] = useState(null);
  const [showUserProvisionDialog, setShowUserProvisionDialog] = useState(false);
  const [userServices, setUserServices] = useState([]);
  
  // ✅ NEW: Plan Management State
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({ name: '', description: '', pricePerDevice: 0, billingCycle: 'MONTHLY' });

  // --- SOVEREIGN DATA SYNC HELPER ---
  const fetchData = () => {
    fetchMyBill();
    if (admin) {
        fetchAnalyticsAndLedger();
        fetchFullSystemStatus();
        fetchAdminSettings();
    }
  };
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

  async function fetchAllPayments() {
    try {
      setPaymentsLoading(true);
      const token = localStorage.getItem('saas_token');
      const res = await fetch('/api/admin/payments', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setPayments(await res.json());
    } catch (error) {
      console.error('Payments Fetch Error:', error);
    } finally {
      setPaymentsLoading(false);
    }
  }

  const fetchServices = async () => {
    try {
      setServicesLoading(true);
      const token = localStorage.getItem('saas_token');
      const res = await fetch('/api/admin/services', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setServices(await res.json());
    } catch (err) {
      console.error('Services Fetch Error:', err);
    } finally {
      setServicesLoading(false);
    }
  };

  const fetchUserServices = async (userId) => {
    try {
      const token = localStorage.getItem('saas_token');
      const res = await fetch(`/api/admin/users/${userId}/services`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setUserServices(await res.json());
    } catch (err) {
      console.error('User Services Fetch Error:', err);
    }
  };

  const handleSaveService = async () => {
    try {
      const token = localStorage.getItem('saas_token');
      const method = editingService ? 'PUT' : 'POST';
      const res = await fetch('/api/admin/services', {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editingService ? { ...serviceForm, id: editingService.id } : serviceForm),
      });
      if (res.ok) {
        showFeedback(`Service ${editingService ? 'updated' : 'created'} successfully`);
        setShowServiceDialog(false);
        fetchServices();
      }
    } catch (err) {
      showFeedback('Failed to save service', 'error');
    }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      const token = localStorage.getItem('saas_token');
      const res = await fetch(`/api/admin/services/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showFeedback('Service deleted');
        fetchServices();
      }
    } catch (err) {
      showFeedback('Failed to delete service', 'error');
    }
  };

  const handleProvisionUserService = async (serviceId, amountOverride) => {
    try {
      const token = localStorage.getItem('saas_token');
      const res = await fetch('/api/admin/provision-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: selectedUserForService.id, serviceId, amountOverride }),
      });
      if (res.ok) {
        showFeedback('Service provisioned to user');
        fetchUserServices(selectedUserForService.id);
        fetchAnalyticsAndLedger();
      }
    } catch (err) {
      showFeedback('Provisioning failed', 'error');
    }
  };

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
            // Trigger welcome email
            try {
              await fetch('/api/auth/welcome-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ email: onboardData.email }),
              });
            } catch (e) {
              console.warn('Welcome email failed', e);
            }
            setSuccess('User added successfully. A welcome email has been sent.');
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
        if (data?.plans?.length > 0 && !selectedPlan) {
            setSelectedPlan(data.plans[0].id);
        }
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

  const fetchAIInsights = async () => {
    try {
      setAiLoading(true);
      const token = localStorage.getItem('saas_token');
      const res = await fetch('/api/billing/admin/ai-insights', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAiInsights(data);
      }
    } catch (err) {
      console.error('AI Insights Sync Failed');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    if (tab === 9) {
        fetchSecurityData();
    }

    if (admin) {
      fetchAnalyticsAndLedger(); // ✅ FIXED NAME
      fetchFullSystemStatus();   // ✅ FIXED NAME
      fetchAdminSettings();     // ✅ FIXED NAME
      fetchSecurityData();
      fetchAIInsights();         // ✅ AI INITIALIZED
      fetchAllPayments();        // ✅ PAYMENTS INITIALIZED
      fetchServices();           // ✅ SERVICES INITIALIZED
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
  }, [admin, tab]);

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

  async function handleDemoPay() {
    if (settling) return;
    setSettling(true);
    try {
      const token = localStorage.getItem('saas_token');
      const res = await fetch('/api/billing/demo-settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
            planId: selectedPlan || (bill?.plans?.[0]?.id), 
            amount: totalFleetAmount 
        }),
      });
      if (res.ok) {
        showFeedback('Sovereign Demo Settlement Complete');
        fetchData();
      } else {
        const d = await res.json();
        showFeedback(d.error || 'Payment failed. Please try again.', 'error');
      }
    } catch (err) {
      showFeedback('Network error. Please try again.', 'error');
    } finally {
      setSettling(false);
    }
  }

  async function handleUpdateAdminSettings() {
    try {
      const token = localStorage.getItem('saas_token');
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...adminSettings, paymentLink: adminSettings.paymentLink }),
      });
      if (res.ok) {
        showFeedback('Settings updated successfully');
      } else {
        showFeedback('Failed to update settings', 'error');
      }
    } catch (err) {
      showFeedback('Network error. Please try again.', 'error');
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
        showFeedback('User status updated successfully');
        setEditingUser(null);
        fetchAnalyticsAndLedger();
      } else {
        showFeedback('Manual Update Failed', 'error');
      }
    } catch (err) {
      showFeedback('Network error. Please try again.', 'error');
    }
  }

  async function handleSettleForUser(targetId, planId, total) {
    if (!targetId || !planId) return;
    setSettling(true);
    try {
      const token = localStorage.getItem('saas_token');
      const res = await fetch('/api/billing/admin/settle-cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: targetId, planId, total }),
      });
      if (res.ok) {
        showFeedback('Payment processed successfully.');
        fetchAnalyticsAndLedger();
      } else {
        showFeedback('Payment failed. Please try again.', 'error');
      }
    } catch (err) {
      showFeedback('Network error. Please try again.', 'error');
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
            showFeedback(`Viewing as ${data.user.email}`, 'info');
            setTimeout(() => window.location.href = '/', 1000);
        } else {
            showFeedback(data.error, 'error');
        }
    } catch (e) {
        showFeedback('Failed to switch user.', 'error');
    }
  };

  const handleOpenEditPlan = (plan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      description: plan.description,
      pricePerDevice: plan.pricePerDevice,
      billingCycle: plan.billingCycle
    });
  };

  const handleUpdatePlan = async () => {
    if (!editingPlan) return;
    try {
      const token = localStorage.getItem('saas_token');
      const res = await fetch('/api/admin/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: editingPlan.id, ...planForm }),
      });
      if (res.ok) {
        showFeedback('Billing plan updated successfully');
        setEditingPlan(null);
        fetchData(); // Refresh plans
      } else {
        const errorData = await res.json();
        showFeedback(errorData.error || 'Failed to update plan', 'error');
      }
    } catch (err) {
      showFeedback('Network error. Please try again', 'error');
    }
  };

  async function handleAdjustExpiry(targetId, email) {
    const days = prompt(`Manual Expiry Update for ${email}: Enter number of days to extend:`, '30');
    if (!days) return;
    try {
      const token = localStorage.getItem('saas_token');
      const res = await fetch('/api/admin/adjust-expiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: targetId, days: parseInt(days, 10) }),
      });
      if (res.ok) {
        showFeedback('Expiry updated successfully');
        fetchAnalyticsAndLedger();
      } else {
        showFeedback('Failed to update expiry', 'error');
      }
    } catch (err) {
      showFeedback('Network error. Please try again.', 'error');
    }
  }

  async function handleRazorpay() {
    const amountToPay = totalFleetAmount;
    if (!bill?.userEmail || !amountToPay || amountToPay <= 0) {
      showFeedback('Invalid billing amount or user data.', 'error');
      return;
    }
    
    setSettling(true);
    try {
      const supported = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
      if (!supported) throw new Error('Payment service unavailable.');

      const token = localStorage.getItem('saas_token');
      const orderRes = await fetch('/api/billing/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: amountToPay, planId: selectedPlan }),
      });

      if (!orderRes.ok) {
        const errData = await orderRes.json();
        throw new Error(errData.error || 'Failed to create payment order.');
      }
      const order = await orderRes.json();

      const options = {
        key: order.key || adminSettings.razorpayId || 'rzp_test_xxxx',
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'GeoSurePath',
        description: `${currentPlan?.name || 'Fleet'} Subscription Plan`,
        order_id: order.orderId,
        handler: async (response) => {
          const verifyRes = await fetch('/api/billing/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ ...response, amount: amountToPay }),
          });
          if (verifyRes.ok) {
            showFeedback('Payment successful. Subscription activated!');
            fetchData();
          } else {
            const vErr = await verifyRes.json();
            showFeedback(vErr.error || 'Verification failed. Contact support.', 'error');
          }
        },
        prefill: { email: bill.userEmail, name: bill.userName || '' },
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

  // SAFE CALCS
  const currentPlan = bill?.plans?.find((p) => p.id === selectedPlan) || bill?.plans?.[0];
  const deviceCount = bill?.devices?.length || 0;
  const planCost = (currentPlan?.price || 0) * deviceCount;
  const totalFleetAmount = planCost + (bill?.totalDue || 0);

  const filteredLedger = Array.isArray(ledger)
    ? ledger.filter((u) => u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

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
          Loading your account...
        </Typography>
      </Box>
    );


  if (!token) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0f172a' }}>
        <CircularProgress size={40} sx={{ color: '#3b82f6' }} />
        <Typography sx={{ ml: 2, color: 'white', fontWeight: 700 }}>
          Verifying Billing Session...
        </Typography>
      </Box>
    );
  }
  return (
    <Box sx={{ minHeight: '100vh', background: '#f8fafc', color: '#1e293b', py: 4 }}>
    <Container maxWidth="xl" sx={{ position: 'relative' }}>
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
            Back to Map
        </Button>
        <Button
            variant="outlined"
            onClick={handleLogout}
            disabled={settling}
            startIcon={settling ? <CircularProgress size={16} color="inherit" /> : <CancelIcon />}
            sx={{
                borderRadius: '12px',
                fontWeight: 900,
                color: 'rgba(239, 68, 68, 0.6)',
                borderColor: 'rgba(239, 68, 68, 0.2)',
                '&:hover': { color: '#ef4444', borderColor: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.05)' }
            }}
        >
            {settling ? 'Logging out...' : 'Logout'}
        </Button>
      </Box>
      {/* --- Primary Tabs --- */}
      {admin && (
        <Paper
          sx={{
            mb: 4,
            borderRadius: '24px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
          }}
        >
          <Tabs
            value={tab}
            onChange={(e, v) => setTab(v)}
            variant="fullWidth"
            sx={{
              '& .MuiTabs-indicator': { height: 4, borderRadius: '4px', bgcolor: '#3b82f6' },
              '& .MuiTab-root': {
                fontWeight: 900,
                fontSize: '1rem',
                py: 3,
                color: '#64748b',
              },
              '& .Mui-selected': { color: '#3b82f6 !important' },
            }}
          >
            <Tab icon={<AssessmentIcon />} label="Analytics" />
            <Tab icon={<GroupIcon />} label="All Users" />
            <Tab icon={<ReceiptLongIcon />} label="Audit Logs" />
            <Tab icon={<ReceiptIcon />} label="Payments" />
            <Tab icon={<StorageIcon />} label="System Logs" />
            <Tab icon={<SettingsIcon />} label="Settings" />
            <Tab icon={<MonitorHeartIcon />} label="System Health" />
            <Tab icon={<VpnKeyIcon />} label="API Keys" />
            <Tab icon={<StarsIcon />} label="Billing Plans" />
            <Tab icon={<SecurityIcon />} label="Security" />
            <Tab icon={<BuildCircleIcon />} label="Services" />
          </Tabs>
        </Paper>
      )}

      {/* --- TAB 0: ANALYTICS HUB (SAAFE) --- */}
      {admin && tab === 0 && (
        <Box>
          <Grid container spacing={3} sx={{ mb: 6 }}>
            <Grid item xs={12} md={2}>
              <Card sx={{ borderRadius: '24px', background: '#ffffff', border: '1px solid #3b82f6', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.1)' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="caption" sx={{ color: '#3b82f6', fontWeight: 900 }}>TOTAL REVENUE</Typography>
                  <Typography variant="h4" fontWeight={900} sx={{ color: '#0f172a' }}>₹{analytics?.totalRevenue || 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={2}>
              <Card sx={{ borderRadius: '24px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>PROJECTED (30D)</Typography>
                  <Typography variant="h4" fontWeight={900} sx={{ color: '#3b82f6' }}>₹{analytics?.projectedRevenue || 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={2}>
              <Card sx={{ borderRadius: '24px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>ACTIVE USERS</Typography>
                  <Typography variant="h4" fontWeight={900} sx={{ color: '#1e293b' }}>{analytics?.totalClients || 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={2}>
              <Card sx={{ borderRadius: '24px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 900 }}>ACTIVE DEVICES</Typography>
                  <Typography variant="h4" fontWeight={900} sx={{ color: '#10b981' }}>{analytics?.activeVehicles || 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={2}>
              <Card sx={{ borderRadius: '24px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 900 }}>INACTIVE DEVICES</Typography>
                  <Typography variant="h4" fontWeight={900} sx={{ color: '#ef4444' }}>{analytics?.inactiveVehicles || 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={2}>
              <Card sx={{ borderRadius: '24px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>FLEET SIZE</Typography>
                  <Typography variant="h4" fontWeight={900} sx={{ color: '#1e293b' }}>{analytics?.totalVehicles || 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Paper sx={{ p: 4, borderRadius: '24px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={900} sx={{ color: '#000000' }}>AI GUARDIAN: FINANCIAL INTELLIGENCE</Typography>
                <Chip 
                  label={aiInsights?.guardianStatus || 'SYNCING...'} 
                  color="success" 
                  size="small" 
                  sx={{ fontWeight: 900, borderRadius: '8px' }} 
                />
            </Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Box sx={{ p: 3, borderRadius: '20px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 900 }}>REVENUE PROJECTION (AI)</Typography>
                  <Typography variant="h4" fontWeight={900} sx={{ color: '#000000', mt: 1 }}>₹{aiInsights?.revenueProjection || '0.00'}</Typography>
                  <Typography variant="caption" sx={{ color: '#22c55e', fontWeight: 700 }}>+15% Estimated Growth</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ p: 3, borderRadius: '20px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 900 }}>CHURN RISK ANALYSIS</Typography>
                  <Typography variant="h4" fontWeight={900} sx={{ color: aiInsights?.churnRisk === 'LOW' ? '#22c55e' : '#ef4444', mt: 1 }}>{aiInsights?.churnRisk || 'STABLE'}</Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>Based on usage patterns</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ p: 3, borderRadius: '20px', background: '#000000', border: '1px solid #334155', color: '#ffffff' }}>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 900 }}>GUARDIAN MAINTENANCE</Typography>
                  <Typography variant="h5" fontWeight={900} sx={{ color: '#facc15', mt: 1 }}>{aiInsights?.maintenanceStats?.dbOptimization || 'Scanning...'}</Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>Database Integrity: SECURE</Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ p: 2, background: '#f1f5f9', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <Typography variant="caption" sx={{ fontWeight: 900, color: '#475569', mb: 1, display: 'block' }}>STRATEGIC RECOMMENDATIONS</Typography>
                  {aiInsights?.recommendations?.map((rec, i) => (
                    <Typography key={i} variant="body2" sx={{ color: '#000000', fontWeight: 700, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                      • {rec}
                    </Typography>
                  ))}
                </Box>
              </Grid>
            </Grid>
          </Paper>

          <Paper sx={{ p: 4, borderRadius: '24px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={900} sx={{ color: '#000000' }}>CLIENT STATUS OVERVIEW</Typography>
                <Button 
                    variant="contained" 
                    startIcon={<PersonAddIcon />}
                    onClick={() => setShowOnboardDialog(true)}
                    sx={{ borderRadius: '12px', fontWeight: 900, bgcolor: '#000000', color: '#fff', '&:hover': { bgcolor: '#1e293b' } }}
                >
                    ONBOARD NEW CLIENT
                </Button>
            </Box>
            <Grid container spacing={2}>
              {['PAID', 'GRACE', 'EXPIRED', 'PENDING'].map((status) => (
                <Grid item xs={6} md={3} key={status}>
                  <Box sx={{ p: 2, borderRadius: '16px', background: '#ffffff', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                    <Typography variant="caption" sx={{ color: '#000000', fontWeight: 900 }}>{status} CLIENTS</Typography>
                    <Typography variant="h4" fontWeight={900} sx={{ color: status === 'PAID' ? '#22c55e' : status === 'GRACE' ? '#f59e0b' : '#ef4444' }}>
                      {analytics?.distribution?.[status] || 0}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>

          <Paper sx={{ p: 4, borderRadius: '24px', background: '#000000', border: '1px solid #334155', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', mb: 4 }}>
            <Typography variant="h6" fontWeight={900} sx={{ mb: 3, color: '#ffffff' }}>PLAN POPULARITY (PREMIUM METRICS)</Typography>
            <Grid container spacing={2}>
              {Object.entries(analytics?.planDistribution || {}).map(([pId, count]) => (
                <Grid item xs={6} md={3} key={pId}>
                  <Box sx={{ p: 2, borderRadius: '16px', background: '#1e293b', textAlign: 'center', border: '1px solid #334155' }}>
                    <Typography variant="caption" sx={{ color: '#3b82f6', fontWeight: 900 }}>{pId.toUpperCase()}</Typography>
                    <Typography variant="h4" fontWeight={900} sx={{ color: '#ffffff' }}>{count} USERS</Typography>
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
                    Loading statistics...
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Box>
      )}

      {/* --- TAB 1: GLOBAL USER LEDGER --- */}
      {admin && tab === 1 && (
        <Paper
          sx={{
            p: 4,
            borderRadius: '24px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
          }}
        >
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}
          >
            <Typography variant="h5" fontWeight={900} sx={{ color: '#000000' }}>
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
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#3b82f6' }} />
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
                    background: '#f8fafc',
                    '& th': {
                      borderBottom: '2px solid #e2e8f0',
                      color: '#0f172a',
                      fontWeight: 900,
                      py: 2
                    },
                  }}
                >
                  <TableCell>User Email</TableCell>
                  <TableCell>Devices</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Days Unpaid</TableCell>
                  <TableCell align="right">Amount (₹)</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLedger.map((u) => (
                  <TableRow key={u.id} sx={{ '&:hover': { background: '#f8fafc' } }}>
                    <TableCell sx={{ fontWeight: 800, borderBottom: '1px solid #f1f5f9' }}>
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
                              ? '#f0fdf4'
                              : u.status === 'GRACE'
                                ? '#fffbeb'
                                : '#fef2f2',
                          color:
                            u.status === 'PAID'
                              ? '#10b981'
                              : u.status === 'GRACE'
                                ? '#f59e0b'
                                : '#ef4444',
                          border: `1px solid ${u.status === 'PAID' ? '#dcfce7' : u.status === 'GRACE' ? '#fef3c7' : '#fee2e2'}`
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
                            SETTLE NOW
                          </Button>
                        <Tooltip title="Refresh Status">
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
                        <Tooltip title="View as User">
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
                          EXTEND DEADLINE
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
                          <Button
                            variant="outlined"
                            color="primary"
                            onClick={() => {
                              setSelectedUserForService(u);
                              fetchUserServices(u.id);
                              setShowUserProvisionDialog(true);
                            }}
                            sx={{ borderRadius: '8px', fontWeight: 900, fontSize: '0.7rem' }}
                          >
                            SERVICES
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
      {admin && tab === 2 && (
        <Paper
          sx={{
            p: 4,
            borderRadius: '24px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
          }}
        >
          <Typography variant="h5" fontWeight={900} sx={{ mb: 4, color: '#1e293b' }}>
            Audit Logs
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ background: '#f8fafc', '& th': { fontWeight: 900, color: '#0f172a', py: 2 } }}>
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
                    <TableCell sx={{ color: '#64748b', fontWeight: 600 }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.action}
                        size="small"
                        sx={{
                          fontWeight: 900,
                          bgcolor: '#eff6ff',
                          color: '#3b82f6',
                          border: '1px solid #dbeafe'
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#0f172a' }}>{log.user?.email || 'System'}</TableCell>
                    <TableCell sx={{ color: '#475569', fontWeight: 600 }}>{log.details}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* --- TAB 3: GLOBAL PAYMENT REGISTRY (ADMIN) --- */}
      {admin && tab === 3 && (
        <Paper
          sx={{
            p: 4,
            borderRadius: '24px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Typography variant="h5" fontWeight={900} sx={{ color: '#000000', display: 'flex', alignItems: 'center', gap: 2 }}>
                <ReceiptIcon sx={{ fontSize: 32, color: '#10b981' }} />
                GLOBAL SETTLEMENT REGISTRY
            </Typography>
            <Button 
                variant="outlined" 
                startIcon={<RefreshIcon />} 
                onClick={fetchAllPayments}
                sx={{ borderRadius: '12px', fontWeight: 900, borderColor: '#e2e8f0', color: '#64748b' }}
                disabled={paymentsLoading}
            >
                Refresh Data
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ background: '#f8fafc', '& th': { fontWeight: 900, color: '#0f172a', py: 2 } }}>
                  <TableCell>TIMESTAMP</TableCell>
                  <TableCell>CLIENT EMAIL</TableCell>
                  <TableCell>METHOD</TableCell>
                  <TableCell>TRANSACTION ID</TableCell>
                  <TableCell align="right">AMOUNT (₹)</TableCell>
                  <TableCell align="center">STATUS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.map((p, idx) => (
                  <TableRow key={idx} sx={{ '&:hover': { background: '#f8fafc' } }}>
                    <TableCell sx={{ color: '#64748b', fontWeight: 600 }}>
                      {new Date(p.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#0f172a' }}>{p.user?.email || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={p.paymentMethod || 'RAZORPAY'} 
                        size="small" 
                        sx={{ fontWeight: 900, bgcolor: '#f0f9ff', color: '#0369a1', border: '1px solid #e0f2fe' }} 
                      />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: '#64748b', fontWeight: 700, fontSize: '0.8rem' }}>
                        {p.transactionId || p.razorpayPaymentId || 'N/A'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900, color: '#000000' }}>
                      ₹{p.amount}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={p.status}
                        size="small"
                        sx={{
                          fontWeight: 900,
                          bgcolor: p.status === 'CAPTURED' ? '#f0fdf4' : '#fef2f2',
                          color: p.status === 'CAPTURED' ? '#10b981' : '#ef4444',
                          border: `1px solid ${p.status === 'CAPTURED' ? '#dcfce7' : '#fee2e2'}`
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {payments.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 5, color: '#94a3b8', fontWeight: 600 }}>
                            No platform-wide settlements discovered in ledger.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* --- TAB 0: FLEET SETTLEMENT (User view) --- */}
      {(!admin && tab === 0) && (
        <Box>
                   <Paper
                sx={{
                    p: 4,
                    mb: 4,
                    borderRadius: '24px',
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: 'center',
                    gap: 4,
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                }}
            >
                <Box sx={{ 
                    width: 80, height: 80, borderRadius: '20px', 
                    bgcolor: (bill?.status === 'PAID' || bill?.status === 'ACTIVE') ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <VerifiedUserIcon sx={{ fontSize: 40, color: (bill?.status === 'PAID' || bill?.status === 'ACTIVE') ? '#22c55e' : '#ef4444' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" fontWeight={900} sx={{ color: '#1e293b', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                        {(bill?.status === 'PAID' || bill?.status === 'ACTIVE') ? 'Shield Active' : 'Shield Inactive'}
                        {(bill?.status === 'PAID' || bill?.status === 'ACTIVE') && (
                            <Chip 
                                label={Math.max(0, Math.ceil((new Date(bill.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))) + " DAYS LEFT"} 
                                size="small" 
                                sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 900, fontSize: '0.65rem' }} 
                            />
                        )}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
                        {(bill?.status === 'PAID' || bill?.status === 'ACTIVE')
                            ? `Continuous protection guaranteed until ${new Date(bill?.expiresAt).toLocaleDateString()}`
                            : 'Your assets are currently unprotected. Activate a plan to restore Sentry monitoring.'}
                    </Typography>
                </Box>
                <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' }, bgcolor: '#e2e8f0' }} />
                <Box sx={{ textAlign: 'center', minWidth: 100 }}>
                    <Typography variant="caption" display="block" sx={{ color: '#94a3b8', fontWeight: 900, letterSpacing: 1 }}>
                        ASSETS
                    </Typography>
                    <Typography variant="h4" fontWeight={900} sx={{ color: '#0f172a' }}>
                        {deviceCount}
                    </Typography>
                </Box>
            </Paper>

            <Paper
                elevation={0}
                sx={{
                    p: 4,
                    borderRadius: '24px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                }}
            >
                <Typography
                    variant="h4"
                    sx={{
                    fontWeight: 900,
                    mb: 4,
                    color: '#0f172a',
                    letterSpacing: '-1px'
                    }}
                >
                    Subscription Plans
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
                            background: selectedPlan === plan.id ? '#eff6ff' : '#ffffff',
                            borderColor: selectedPlan === plan.id ? '#3b82f6' : '#e2e8f0',
                            boxShadow: selectedPlan === plan.id ? '0 10px 15px -3px rgba(59,130,246,0.1)' : 'none',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.1, 1)',
                            '&:hover': { transform: 'translateY(-5px)', borderColor: '#3b82f6' },
                        }}
                        >
                        <CardContent sx={{ p: 4, textAlign: 'center' }}>
                            <Typography variant="h6" fontWeight={900} sx={{ color: '#64748b', mb: 1 }}>
                            {plan.name}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0.5 }}>
                                <Typography variant="h3" fontWeight={900} sx={{ color: '#0f172a' }}>
                                ₹{plan.price}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800 }}>/UNIT</Typography>
                            </Box>
                            <Divider sx={{ my: 3, borderColor: '#f1f5f9' }} />
                            <Box sx={{ textAlign: 'left' }}>
                            <Typography variant="caption" display="block" sx={{ color: '#64748b', fontWeight: 700, mb: 1 }}>
                                ● Real-time Sentry Protection
                            </Typography>
                            <Typography variant="caption" display="block" sx={{ color: '#64748b', fontWeight: 700, mb: 1 }}>
                                ● {deviceCount} Managed Assets
                            </Typography>
                            <Typography variant="caption" display="block" sx={{ color: '#64748b', fontWeight: 700 }}>
                                ● Comprehensive Audit History
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
                        background: '#f8fafc',
                        mb: 5,
                        border: '1px solid #e2e8f0',
                    }}
                >
                    <Typography variant="h6" fontWeight={900} sx={{ mb: 3, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ReceiptLongIcon color="primary" /> Order Summary
                    </Typography>
                    
                    <TableContainer component={Box} sx={{ mb: 3 }}>
                        <Table size="small">
                            <TableBody>
                                <TableRow>
                                    <TableCell sx={{ border: 'none', py: 1, color: '#64748b', fontWeight: 700 }}>
                                        {currentPlan?.name} Subscription ({deviceCount} Units)
                                    </TableCell>
                                    <TableCell align="right" sx={{ border: 'none', py: 1, fontWeight: 900, color: '#1e293b' }}>
                                        ₹{((currentPlan?.price || 0) * deviceCount).toFixed(2)}
                                    </TableCell>
                                </TableRow>
                                {bill?.totalDue > 0 && (
                                    <TableRow>
                                        <TableCell sx={{ border: 'none', py: 1, color: '#ef4444', fontWeight: 700 }}>
                                            Accrued Debt / Outstanding Dues
                                        </TableCell>
                                        <TableCell align="right" sx={{ border: 'none', py: 1, fontWeight: 900, color: '#ef4444' }}>
                                            ₹{bill.totalDue.toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                )}
                                <TableRow>
                                    <TableCell colSpan={2} sx={{ py: 1 }}>
                                        <Divider sx={{ my: 1, borderColor: '#e2e8f0' }} />
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={{ border: 'none', py: 1 }}>
                                        <Typography variant="h5" fontWeight={900} color="primary.main">
                                            Amount Payable
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>
                                            Inclusive of 18% GST (Protected by AI-Guardian)
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right" sx={{ border: 'none', py: 1 }}>
                                        <Typography variant="h4" fontWeight={900} color="primary.main">
                                            ₹{totalFleetAmount.toFixed(2)}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <Button
                            variant="contained"
                            size="large"
                            disabled={settling}
                            onClick={
                                (!adminSettings.razorpayId && (!analytics?.config?.paymentLink || analytics?.config?.paymentLink === '#'))
                                    ? handleDemoPay
                                    : adminSettings.razorpayId
                                    ? handleRazorpay
                                    : () => window.open(analytics.config.paymentLink, '_blank')
                            }
                            sx={{ 
                                borderRadius: '16px', px: 6, py: 2, fontWeight: 900, fontSize: '1.2rem',
                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                boxShadow: '0 10px 15px -3px rgba(59,130,246,0.3)',
                                '&:hover': { transform: 'translateY(-2px)', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }
                            }}
                        >
                            {settling ? <CircularProgress size={24} sx={{ color: 'white' }} /> : (bill?.status === 'PAID' || bill?.status === 'ACTIVE') ? 'RENEW SUBSCRIPTION' : 'ACTIVATE PROTECTON'}
                        </Button>
                    </Box>
                </Paper>

                <Typography
                    variant="h5"
                    sx={{ mb: 3, fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 2 }}
                >
                    <VerifiedIcon color="primary" /> Professional Invoice Registry
                </Typography>
                <TableContainer component={Paper} sx={{ borderRadius: '24px', border: '1px solid #e2e8f0', background: '#ffffff', boxShadow: 'none' }}>
                    <Table>
                    <TableHead sx={{ background: '#f8fafc' }}>
                        <TableRow>
                        <TableCell sx={{ fontWeight: 900, color: '#1e293b' }}>INVOICE NO.</TableCell>
                        <TableCell sx={{ fontWeight: 900, color: '#1e293b' }}>DATE</TableCell>
                        <TableCell sx={{ fontWeight: 900, color: '#1e293b' }}>PLAN</TableCell>
                        <TableCell sx={{ fontWeight: 900, color: '#1e293b' }}>UNITS</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 900, color: '#1e293b' }}>AMOUNT (INR)</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900, color: '#1e293b' }}>STATUS</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900, color: '#1e293b' }}>ACTION</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {bill?.history?.length > 0 ? (
                        bill.history.map((entry, idx) => (
                            <TableRow
                            key={idx}
                            sx={{ '&:hover': { background: '#f8fafc' } }}
                            >
                            <TableCell sx={{ fontWeight: 900, color: '#3b82f6' }}>
                                {entry.invoiceId}
                            </TableCell>
                            <TableCell sx={{ color: '#64748b', fontWeight: 600 }}>
                                {new Date(entry.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 800, color: '#1e293b' }}>
                                {(entry.planId || 'MONTHLY').toUpperCase()}
                            </TableCell>
                            <TableCell sx={{ color: '#64748b', fontWeight: 600 }}>{entry.deviceCount || 1} Units</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 900, color: '#0f172a' }}>
                                ₹{entry.price}
                            </TableCell>
                            <TableCell align="center">
                                <Chip
                                label="PAID"
                                size="small"
                                sx={{
                                    fontWeight: 900,
                                    bgcolor: '#f0fdf4',
                                    color: '#22c55e',
                                    border: '1px solid #dcfce7'
                                }}
                                />
                            </TableCell>
                            <TableCell align="center">
                                <IconButton
                                onClick={() => setSelectedInvoice(entry)}
                                sx={{ color: '#3b82f6', '&:hover': { background: '#eff6ff' } }}
                                size="small"
                                >
                                <ReceiptIcon fontSize="small" />
                                </IconButton>
                            </TableCell>
                            </TableRow>
                        ))
                        ) : (
                        <TableRow>
                            <TableCell colSpan={7} sx={{ textAlign: 'center', color: '#94a3b8', py: 5, fontWeight: 600 }}>
                            No previous settlements discovered in your ledger.
                            </TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
      )}

      {/* --- TAB 4: DATABASE & LOGS --- */}
      {admin && tab === 4 && (
        <Paper
          sx={{
            p: 4,
            borderRadius: '24px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
          }}
        >
          <Typography variant="h5" fontWeight={900} sx={{ mb: 4, color: '#000000' }}>
            SOVEREIGN AUDIT LEDGER (SECURE DB LOGS)
          </Typography>
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ background: '#f8fafc', fontWeight: 900, color: '#1e293b' }}>TIMESTAMP</TableCell>
                  <TableCell sx={{ background: '#f8fafc', fontWeight: 900, color: '#1e293b' }}>ADMIN ID</TableCell>
                  <TableCell sx={{ background: '#f8fafc', fontWeight: 900, color: '#1e293b' }}>ACTION</TableCell>
                  <TableCell sx={{ background: '#f8fafc', fontWeight: 900, color: '#1e293b' }}>AFFECTED CLIENT</TableCell>
                  <TableCell sx={{ background: '#f8fafc', fontWeight: 900, color: '#1e293b' }}>DETAILS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {auditLogs.length > 0 ? (
                  auditLogs.map((log) => (
                    <TableRow
                      key={log.id}
                      onClick={() => setSelectedAuditLog(log)}
                      sx={{ cursor: 'pointer', '&:hover': { background: '#f1f5f9' } }}
                    >
                      <TableCell sx={{ color: '#64748b', fontWeight: 600, fontSize: '0.85rem' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', color: '#64748b', fontWeight: 700, fontSize: '0.75rem' }}>
                        {log.adminId}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.action}
                          size="small"
                          sx={{
                            fontWeight: 900,
                            bgcolor: '#f0fdf4',
                            color: '#10b981',
                            border: '1px solid #dcfce7'
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#000000' }}>
                        {log.user?.email || log.userId}
                      </TableCell>
                      <TableCell sx={{ color: '#475569', fontWeight: 600, fontSize: '0.85rem' }}>
                        {log.details}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ color: '#94a3b8', py: 5 }}>
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
      {admin && tab === 5 && (
        <Paper
          sx={{
            p: 4,
            borderRadius: '24px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
          }}
        >
          <Typography variant="h5" fontWeight={900} sx={{ mb: 4, color: '#0f172a' }}>
            SYSTEM PLATFORM CONFIGURATION
          </Typography>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  p: 4,
                  borderRadius: '24px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}
              >
                <Typography variant="h6" fontWeight={800} sx={{ color: '#000000', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PaymentIcon sx={{ color: '#3b82f6' }} /> Razorpay Connectivity
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
                    Configure the platform's primary fiscal gateway. All keys are encrypted at rest.
                </Typography>
                <TextField
                  fullWidth
                  label="Razorpay Key ID"
                  value={adminSettings.razorpayId}
                  onChange={(e) => setAdminSettings({ ...adminSettings, razorpayId: e.target.value })}
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px' }, '& label': { color: '#64748b', fontWeight: 700 }, '& input': { color: '#000000', fontWeight: 900 } }}
                />
                <TextField
                  fullWidth
                  label="Razorpay Secret"
                  type="password"
                  value={adminSettings.razorpaySecret}
                  onChange={(e) => setAdminSettings({ ...adminSettings, razorpaySecret: e.target.value })}
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px' }, '& label': { color: '#64748b', fontWeight: 700 }, '& input': { color: '#000000', fontWeight: 900 } }}
                />
                <Typography variant="h6" fontWeight={800} sx={{ color: '#000000', mt: 4, mb: 1 }}>
                  Sovereign Payment Gateway Link
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
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
                      background: '#ffffff',
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
                  onClick={handleUpdateAdminSettings}
                  sx={{ borderRadius: '12px', fontWeight: 900, px: 4 }}
                >
                  Save Settings
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* --- TAB 6: SYSTEM STATUS --- */}
      {admin && tab === 6 && (
        <Paper
          sx={{
            p: 4,
            borderRadius: '24px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
          }}
        >
          <Typography variant="h5" fontWeight={900} sx={{ mb: 4, color: '#1e293b' }}>
            System Health
          </Typography>
          <Grid container spacing={4}>
            {[
              { label: 'API Status', value: systemStats?.status || 'Active', color: '#10b981' },
              { label: 'Database (Postgres)', value: systemStats?.db || 'Connected', color: '#10b981' },
              { label: 'Traccar Core', value: systemStats?.traccar || 'Running', color: '#10b981' },
              { label: 'CPU Load', value: `${systemStats?.cpu?.[0]?.toFixed(2) || '0.00'}`, color: '#3b82f6' },
              { label: 'Memory Usage', value: `${systemStats?.memory?.free} / ${systemStats?.memory?.total}`, color: '#3b82f6' },
              { label: 'System Uptime', value: `${(systemStats?.uptime / 3600).toFixed(1)} Hours`, color: '#f59e0b' },
            ].map((stat, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Box
                  sx={{
                    p: 3,
                    borderRadius: '20px',
                    bgcolor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#000000', fontWeight: 900 }}>
                    {stat.label.toUpperCase()}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: stat.color, mt: 1 }}>
                    {stat.value}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* --- TAB 7: SECRETS MANAGER --- */}
      {admin && tab === 7 && (
        <Paper
          sx={{
            p: 4,
            borderRadius: '24px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
          }}
        >
          <Typography variant="h5" fontWeight={900} sx={{ mb: 4, color: '#1e293b' }}>
            API Keys & External Services
          </Typography>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 2, color: '#0f172a' }}>Payment Gateway (Razorpay)</Typography>
              <TextField
                fullWidth
                label="Razorpay Key ID"
                value={adminSettings.razorpayId}
                onChange={(e) => setAdminSettings({ ...adminSettings, razorpayId: e.target.value })}
                sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
              <TextField
                fullWidth
                label="Razorpay Secret Key"
                type="password"
                value={adminSettings.razorpaySecret}
                onChange={(e) => setAdminSettings({ ...adminSettings, razorpaySecret: e.target.value })}
                sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
               <TextField
                fullWidth
                label="Razorpay Webhook Secret"
                type="password"
                value={adminSettings.razorpayWebhookSecret}
                onChange={(e) => setAdminSettings({ ...adminSettings, razorpayWebhookSecret: e.target.value })}
                sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 2, color: '#0f172a' }}>Platform Infrastructure</Typography>
              <TextField
                fullWidth
                label="Firebase Server Key"
                value={adminSettings.firebaseConfig}
                onChange={(e) => setAdminSettings({ ...adminSettings, firebaseConfig: e.target.value })}
                sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
              <TextField
                fullWidth
                label="AI Engine (OpenRouter) Key"
                value={adminSettings.openrouterKey}
                onChange={(e) => setAdminSettings({ ...adminSettings, openrouterKey: e.target.value })}
                sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
              <TextField
                fullWidth
                label="Support Contact Email"
                value={adminSettings.supportEmail}
                onChange={(e) => setAdminSettings({ ...adminSettings, supportEmail: e.target.value })}
                sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 4, textAlign: 'right' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<SaveIcon />}
              onClick={handleUpdateAdminSettings}
              sx={{ borderRadius: '16px', fontWeight: 900, px: 6, py: 1.5 }}
            >
              Save Configuration
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
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            color: '#1e293b',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)'
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, fontSize: '1.5rem', color: '#0f172a' }}>
          Manage User: {editingUser?.email}
        </DialogTitle>
        <DialogContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: '#64748b' }}>Subscription Plan</InputLabel>
              <Select
                value={editForm.planId}
                label="Subscription Plan"
                onChange={(e) => setEditForm({ ...editForm, planId: e.target.value })}
                sx={{ borderRadius: '12px', bgcolor: '#f8fafc', color: '#1e293b' }}
              >
                {bill?.plans?.map(p => (
                  <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel sx={{ color: '#64748b' }}>Activation Status</InputLabel>
              <Select
                value={editForm.isActive ? 'ACTIVE' : 'EXPIRED'}
                label="Activation Status"
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'ACTIVE' })}
                sx={{ borderRadius: '12px', bgcolor: '#f8fafc', color: '#1e293b' }}
              >
                <MenuItem value="ACTIVE">ACTIVE (Full Service)</MenuItem>
                <MenuItem value="EXPIRED">EXPIRED (Suspended)</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel sx={{ color: '#64748b' }}>System Role</InputLabel>
              <Select
                value={editForm.role}
                label="System Role"
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                sx={{ borderRadius: '12px', bgcolor: '#f8fafc', color: '#1e293b' }}
              >
                <MenuItem value="CLIENT">CLIENT</MenuItem>
                <MenuItem value="MANAGER">MANAGER</MenuItem>
                <MenuItem value="ADMIN">ADMIN (Full Access)</MenuItem>
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
                '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#f8fafc' },
                '& input': { color: '#1e293b' }
              }}
            />
            <Typography variant="caption" sx={{ opacity: 0.5 }}>
              * Updates will sync to the Traccar tracking engine immediately.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 4 }}>
            <Button onClick={() => setEditingUser(null)} sx={{ color: '#64748b', fontWeight: 900 }}>CANCEL</Button>
            <Button 
                variant="contained" 
                onClick={handleManualUserUpdate}
                sx={{ borderRadius: '12px', px: 4, fontWeight: 900, bgcolor: '#0f172a', '&:hover': { bgcolor: '#000' } }}
            >
                Save Changes
            </Button>
        </DialogActions>
      </Dialog>

      <InvoiceDialog
        open={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
      />

      {/* --- TAB 8: PLAN MANAGEMENT --- */}
      {admin && tab === 8 && (
        <Paper sx={{ p: 4, borderRadius: '24px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, alignItems: 'center' }}>
            <Typography variant="h5" fontWeight={900} sx={{ color: '#0f172a' }}>Billing Plans</Typography>
            <Button variant="contained" startIcon={<StarsIcon />} sx={{ borderRadius: '12px', fontWeight: 900, bgcolor: '#0f172a' }}>
              New Plan
            </Button>
          </Box>
          <Grid container spacing={3}>
            {plans.map((plan) => (
              <Grid item xs={12} md={4} key={plan.id}>
                <Card sx={{ 
                    borderRadius: '24px', 
                    background: '#ffffff', 
                    border: '1px solid #e2e8f0', 
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'translateY(-4px)' }
                }}>
                  <CardContent sx={{ p: 4 }}>
                    <Typography variant="h5" fontWeight={900} sx={{ color: '#0f172a', mb: 1 }}>{plan.name}</Typography>
                    <Typography variant="body2" sx={{ color: '#64748b', mb: 3, height: 40, overflow: 'hidden' }}>{plan.description}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 4 }}>
                       <Typography variant="h3" fontWeight={900} sx={{ color: '#3b82f6' }}>₹{plan.pricePerDevice}</Typography>
                       <Typography variant="caption" sx={{ color: '#94a3b8', ml: 1 }}>/ UNIT ({plan.billingCycle})</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button 
                        fullWidth 
                        variant="outlined" 
                        onClick={() => handleOpenEditPlan(plan)}
                        sx={{ borderRadius: '12px', fontWeight: 900, color: '#475569', borderColor: '#e2e8f0' }}
                      >
                        EDIT PLAN
                      </Button>
                      <IconButton color="error" sx={{ border: '1px solid #fee2e2', borderRadius: '12px', bgcolor: '#fef2f2' }}>
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

      {/* --- EDIT PLAN DIALOG --- */}
      <Dialog 
        open={Boolean(editingPlan)} 
        onClose={() => setEditingPlan(null)}
        PaperProps={{ sx: { borderRadius: '25px', background: '#ffffff', color: '#1e293b', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' } }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: '#0f172a' }}>Edit Billing Plan</DialogTitle>
        <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
                <TextField 
                    fullWidth label="Plan Name" 
                    value={planForm.name} 
                    onChange={e => setPlanForm({...planForm, name: e.target.value})}
                    sx={{ input: { color: '#0f172a' }, label: { color: '#64748b' } }}
                />
                <TextField 
                    fullWidth label="Description" 
                    multiline rows={2}
                    value={planForm.description} 
                    onChange={e => setPlanForm({...planForm, description: e.target.value})}
                    sx={{ textarea: { color: '#0f172a' }, label: { color: '#64748b' } }}
                />
                <TextField 
                    fullWidth label="Price Per Device (₹)" 
                    type="number"
                    value={planForm.pricePerDevice} 
                    onChange={e => setPlanForm({...planForm, pricePerDevice: parseFloat(e.target.value)})}
                    sx={{ input: { color: '#0f172a' }, label: { color: '#64748b' } }}
                />
                <FormControl fullWidth>
                    <InputLabel sx={{ color: '#64748b' }}>Billing Cycle</InputLabel>
                    <Select
                        value={planForm.billingCycle}
                        onChange={e => setPlanForm({...planForm, billingCycle: e.target.value})}
                        sx={{ color: '#0f172a', '.MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0' } }}
                    >
                        <MenuItem value="MONTHLY">MONTHLY</MenuItem>
                        <MenuItem value="YEARLY">YEARLY</MenuItem>
                        <MenuItem value="QUARTERLY">QUARTERLY (Custom)</MenuItem>
                    </Select>
                </FormControl>
            </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setEditingPlan(null)} sx={{ color: '#64748b', fontWeight: 700 }}>CANCEL</Button>
            <Button variant="contained" onClick={handleUpdatePlan} sx={{ fontWeight: 900, borderRadius: '12px', bgcolor: '#0f172a', '&:hover': { bgcolor: '#000' } }}>Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* --- TAB 9: SECURITY & GOVERNANCE --- */}
      {admin && tab === 9 && (
        <Paper
          sx={{
            p: 4,
            borderRadius: '24px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Typography variant="h5" fontWeight={900} sx={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: 2 }}>
                <SecurityIcon sx={{ fontSize: 32, color: '#3b82f6' }} />
                Security & Access Control
            </Typography>
            <Button 
                variant="outlined" 
                startIcon={<RefreshIcon />} 
                onClick={fetchSecurityData}
                sx={{ borderRadius: '12px', fontWeight: 900, borderColor: '#e2e8f0', color: '#64748b' }}
                disabled={securityLoading}
            >
                Refresh
            </Button>
          </Box>
          
          <Grid container spacing={4}>
            <Grid item xs={12} md={7}>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: '#1e293b' }}>
                    <DnsIcon color="primary" sx={{ fontSize: 20 }} /> Active Sessions
                </Typography>
                <TableContainer component={Paper} sx={{ bgcolor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ background: '#f8fafc', '& th': { fontWeight: 900, color: '#0f172a', py: 2 } }}>
                                <TableCell>Device</TableCell>
                                <TableCell>IP Address</TableCell>
                                <TableCell>Login Time</TableCell>
                                <TableCell align="right">Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {mySessions.map((session) => (
                                <TableRow key={session.id} sx={{ '&:hover': { background: '#f1f5f9' } }}>
                                    <TableCell sx={{ fontWeight: 900, color: '#000000' }}>{session.device}</TableCell>
                                    <TableCell sx={{ color: '#64748b', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.8rem' }}>{session.ip}</TableCell>
                                    <TableCell sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.8rem' }}>{new Date(session.createdAt).toLocaleString()}</TableCell>
                                    <TableCell align="right">
                                        <Button 
                                            size="small" 
                                            variant="contained"
                                            color="error"
                                            onClick={() => handleRevokeSession(session.id)}
                                            sx={{ fontWeight: 900, borderRadius: '8px' }}
                                        >
                                            RETAIN
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {mySessions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 4, color: '#94a3b8' }}>No other active sessions discovered.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Paper sx={{ p: 3, mt: 3, borderRadius: '20px', background: '#f0f9ff', border: '1px solid #e0f2fe' }}>
                    <Typography variant="subtitle2" sx={{ color: '#0369a1', fontWeight: 900, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <VpnLockIcon sx={{ fontSize: 18 }} /> Security Policy
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#075985', opacity: 0.8 }}>
                        Inactivity timeout is currently enforced at <strong>15 Minutes</strong>. All administrative viewing events are cryptographically signed and logged for compliance auditing.
                    </Typography>
                </Paper>
            </Grid>
            
            <Grid item xs={12} md={5}>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: '#1e293b' }}>
                    <HistoryIcon color="secondary" sx={{ fontSize: 20 }} /> Login History
                </Typography>
                <Box sx={{ background: '#f8fafc', p: 2, borderRadius: '16px', border: '1px solid #e2e8f0', maxHeight: 450, overflowY: 'auto' }}>
                    {loginHistory.map((entry, idx) => (
                        <Box key={idx} sx={{ display: 'flex', alignItems: 'center', p: 2, mb: 1.5, background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: `6px solid ${entry.success ? '#10b981' : '#ef4444'}` }}>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" fontWeight={900} sx={{ color: '#0f172a' }}>{entry.success ? 'Successful Login' : 'Failed Access Attempt'}</Typography>
                                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>{new Date(entry.createdAt).toLocaleString()} • {entry.ipAddress}</Typography>
                            </Box>
                            <Chip label={entry.success ? 'SECURE' : 'VULN'} size="small" sx={{ fontWeight: 900, bgcolor: entry.success ? '#ecfdf5' : '#fef2f2', color: entry.success ? '#10b981' : '#ef4444', height: 24 }} />
                        </Box>
                    ))}
                    {loginHistory.length === 0 && (
                        <Typography variant="body2" sx={{ textAlign: 'center', py: 4, color: '#94a3b8' }}>Access ledger is empty.</Typography>
                    )}
                </Box>
            </Grid>
          </Grid>
        </Paper>
      )}


      {/* --- TAB 10: SERVICE MANAGEMENT (NEW) --- */}
      {admin && tab === 10 && (
        <Paper sx={{ p: 4, borderRadius: '24px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, alignItems: 'center' }}>
            <Typography variant="h5" fontWeight={900} sx={{ color: '#0f172a' }}>Platform Services</Typography>
            <Button 
                variant="contained" 
                startIcon={<BuildCircleIcon />} 
                onClick={() => { setEditingService(null); setServiceForm({ name: '', description: '', price: 0, category: 'GENERAL' }); setShowServiceDialog(true); }}
                sx={{ borderRadius: '12px', fontWeight: 900, bgcolor: '#0f172a' }}
            >
              New Service
            </Button>
          </Box>
          <Grid container spacing={3}>
            {services.map((service) => (
              <Grid item xs={12} md={4} key={service.id}>
                <Card sx={{ 
                    borderRadius: '24px', 
                    background: '#ffffff', 
                    border: '1px solid #e2e8f0', 
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'translateY(-4px)' }
                }}>
                  <CardContent sx={{ p: 4 }}>
                    <Typography variant="h5" fontWeight={900} sx={{ color: '#0f172a', mb: 1 }}>{service.name}</Typography>
                    <Chip label={service.category} size="small" sx={{ mb: 2, fontWeight: 800, bgcolor: '#eff6ff', color: '#3b82f6' }} />
                    <Typography variant="body2" sx={{ color: '#64748b', mb: 3, height: 40, overflow: 'hidden' }}>{service.description}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 4 }}>
                       <Typography variant="h4" fontWeight={900} sx={{ color: '#10b981' }}>₹{service.price}</Typography>
                       <Typography variant="caption" sx={{ color: '#94a3b8', ml: 1 }}>One-time / Recurring</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button 
                        fullWidth 
                        variant="outlined" 
                        onClick={() => { setEditingService(service); setServiceForm(service); setShowServiceDialog(true); }}
                        sx={{ borderRadius: '12px', fontWeight: 900, color: '#475569', borderColor: '#e2e8f0' }}
                      >
                        EDIT
                      </Button>
                      <IconButton color="error" onClick={() => handleDeleteService(service.id)} sx={{ border: '1px solid #fee2e2', borderRadius: '12px', bgcolor: '#fef2f2' }}>
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

      {/* --- SERVICE DIALOG --- */}
      <Dialog open={showServiceDialog} onClose={() => setShowServiceDialog(false)} PaperProps={{ sx: { borderRadius: '25px', background: '#ffffff', border: '1px solid #e2e8f0' } }}>
        <DialogTitle sx={{ fontWeight: 900 }}>{editingService ? 'Edit' : 'New'} Service</DialogTitle>
        <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1, minWidth: 400 }}>
                <TextField fullWidth label="Service Name" value={serviceForm.name} onChange={e => setServiceForm({...serviceForm, name: e.target.value})} />
                <TextField fullWidth label="Description" multiline rows={2} value={serviceForm.description} onChange={e => setServiceForm({...serviceForm, description: e.target.value})} />
                <TextField fullWidth label="Price (₹)" type="number" value={serviceForm.price} onChange={e => setServiceForm({...serviceForm, price: parseFloat(e.target.value)})} />
                <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select value={serviceForm.category} onChange={e => setServiceForm({...serviceForm, category: e.target.value})}>
                        <MenuItem value="PLAN">PLAN</MenuItem>
                        <MenuItem value="MAINTENANCE">MAINTENANCE</MenuItem>
                        <MenuItem value="INFRASTRUCTURE">INFRASTRUCTURE</MenuItem>
                        <MenuItem value="GST">GST</MenuItem>
                        <MenuItem value="GENERAL">GENERAL</MenuItem>
                    </Select>
                </FormControl>
            </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setShowServiceDialog(false)}>CANCEL</Button>
            <Button variant="contained" onClick={handleSaveService} sx={{ fontWeight: 900, borderRadius: '12px' }}>Save Service</Button>
        </DialogActions>
      </Dialog>

      {/* --- USER SERVICE PROVISION DIALOG --- */}
      <Dialog open={showUserProvisionDialog} onClose={() => setShowUserProvisionDialog(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '25px' } }}>
        <DialogTitle sx={{ fontWeight: 900 }}>Provision Services: {selectedUserForService?.email}</DialogTitle>
        <DialogContent>
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Available Services</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {services.map(s => (
                            <Paper key={s.id} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                <Box>
                                    <Typography fontWeight={700}>{s.name}</Typography>
                                    <Typography variant="caption" sx={{ color: '#64748b' }}>₹{s.price} - {s.category}</Typography>
                                </Box>
                                <Button size="small" variant="contained" onClick={() => handleProvisionUserService(s.id)} sx={{ borderRadius: '8px' }}>Assign</Button>
                            </Paper>
                        ))}
                    </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Active User Services</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {userServices.map(us => (
                            <Paper key={us.id} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '12px' }}>
                                <Box>
                                    <Typography fontWeight={700}>{us.service?.name}</Typography>
                                    <Typography variant="caption" sx={{ color: '#166534' }}>Amount: ₹{us.amount}</Typography>
                                </Box>
                                <IconButton color="error" size="small" onClick={async () => {
                                    if (window.confirm('Deprovision this service?')) {
                                        const token = localStorage.getItem('saas_token');
                                        await fetch('/api/admin/deprovision-service', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                            body: JSON.stringify({ userServiceId: us.id })
                                        });
                                        fetchUserServices(selectedUserForService.id);
                                    }
                                }}>
                                    <DeleteIcon />
                                </IconButton>
                            </Paper>
                        ))}
                    </Box>
                </Grid>
            </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setShowUserProvisionDialog(false)}>CLOSE</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={!!success} autoHideDuration={6000} onClose={() => setSuccess(null)}>
        <Alert severity="success" sx={{ borderRadius: '12px', fontWeight: 800 }}>{success}</Alert>
      </Snackbar>
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert severity="error" sx={{ borderRadius: '12px', fontWeight: 800 }}>{error}</Alert>
      </Snackbar>

      {/* --- ONBOARDING DIALOG --- */}
      <Dialog 
        open={showOnboardDialog} 
        onClose={() => setShowOnboardDialog(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '25px', background: '#ffffff', color: '#1e293b', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' } }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: '#0f172a' }}>Add New User</DialogTitle>
        <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
                <TextField 
                    fullWidth label="Full Name" 
                    value={onboardData.name} 
                    onChange={e => setOnboardData({...onboardData, name: e.target.value})}
                    sx={{ input: { color: '#0f172a' }, label: { color: '#64748b' } }}
                />
                <TextField 
                    fullWidth label="Email Address" 
                    value={onboardData.email} 
                    onChange={e => setOnboardData({...onboardData, email: e.target.value})}
                    sx={{ input: { color: '#0f172a' }, label: { color: '#64748b' } }}
                />
                <TextField 
                    fullWidth label="Temporary Password" 
                    type="password"
                    value={onboardData.password} 
                    onChange={e => setOnboardData({...onboardData, password: e.target.value})}
                    sx={{ input: { color: '#0f172a' }, label: { color: '#64748b' } }}
                />
            </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setShowOnboardDialog(false)} sx={{ color: '#64748b', fontWeight: 700 }}>CANCEL</Button>
            <Button variant="contained" onClick={handleOnboardClient} sx={{ fontWeight: 900, borderRadius: '12px', bgcolor: '#0f172a', '&:hover': { bgcolor: '#000' } }}>Add User</Button>
        </DialogActions>
      </Dialog>

      {/* --- ROLE MANAGEMENT DIALOG --- */}
      <Dialog 
        open={showRoleDialog} 
        onClose={() => setShowRoleDialog(false)}
        PaperProps={{ sx: { borderRadius: '25px', background: '#ffffff', color: '#1e293b', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' } }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: '#0f172a' }}>Update User Role</DialogTitle>
        <DialogContent>
            <Typography variant="body2" sx={{ mb: 3, opacity: 0.7 }}>
                Change role for <strong>{targetUser?.email}</strong>.
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
        PaperProps={{ sx: { borderRadius: '25px', background: '#ffffff', color: '#1e293b', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' } }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: '#0f172a' }}>Add Multiple Devices</DialogTitle>
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
                    {provisioning ? 'Adding...' : 'Add Devices'}
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
        PaperProps={{ sx: { borderRadius: '25px', background: '#ffffff', color: '#1e293b', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' } }}
      >
        <DialogTitle sx={{ fontWeight: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#0f172a' }}>
            Log Details
            <Chip label={selectedAuditLog?.action} size="small" sx={{ fontWeight: 900, bgcolor: '#f1f5f9', color: '#475569' }} />
        </DialogTitle>
        <DialogContent>
            <Box sx={{ p: 2, background: '#f8fafc', borderRadius: '16px', mb: 3, border: '1px solid #f1f5f9' }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>TIMESTAMP</Typography>
                <Typography variant="body1" fontWeight={700} sx={{ color: '#1e293b' }}>{selectedAuditLog && new Date(selectedAuditLog.createdAt).toLocaleString()}</Typography>
                
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 2 }}>PERFORMED BY (ADMIN)</Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace', color: '#475569' }}>{selectedAuditLog?.adminId || 'SYSTEM'}</Typography>
                
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 2 }}>AFFECTED CLIENT</Typography>
                <Typography variant="body1" fontWeight={700} sx={{ color: '#1e293b' }}>{selectedAuditLog?.user?.email || selectedAuditLog?.userId || 'N/A'}</Typography>
            </Box>
            
            <Typography variant="caption" sx={{ opacity: 0.5, display: 'block', mb: 1 }}>Details</Typography>
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
    </Box>
  );
};

export default BillingPage;
