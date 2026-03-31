import { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, Paper, Grid, Button, Chip, CircularProgress,
  Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, Tab, TextField, InputAdornment, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, Select, MenuItem, FormControl, InputLabel,
  IconButton, Snackbar, Alert, Badge, LinearProgress, Switch, FormControlLabel,
  useMediaQuery, useTheme
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import LinkIcon from '@mui/icons-material/Link';
import CancelIcon from '@mui/icons-material/Cancel';
import SecurityIcon from '@mui/icons-material/Security';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import PeopleIcon from '@mui/icons-material/People';
import { Payment as PaymentIcon } from '@mui/icons-material';
import SettingsIcon from '@mui/icons-material/Settings';
import BarChartIcon from '@mui/icons-material/BarChart';
import ShieldIcon from '@mui/icons-material/Shield';
import SyncIcon from '@mui/icons-material/Sync';
import WarningIcon from '@mui/icons-material/Warning';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import SaveIcon from '@mui/icons-material/Save';
import CpuIcon from '@mui/icons-material/Computer';
import MemoryIcon from '@mui/icons-material/Memory';
import UptimeIcon from '@mui/icons-material/AccessTime';
import StorageIcon from '@mui/icons-material/Storage';
import { motion } from 'framer-motion';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useNavigate } from 'react-router-dom';
import { useAdministrator } from '../common/util/permissions';
import { exportToCsv } from '../common/util/export';
import MfaSetup from '../billing/MfaSetup';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const API = (path, opts = {}) => {
  const token = localStorage.getItem('saas_token');
  return fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts.headers } });
};
const fmtCurrency = (n, symbol = '₹') => `${symbol}${Number(n || 0).toFixed(2)}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—';
const STATUS_COLOR = { PAID: '#10b981', GRACE: '#f59e0b', OVERDUE: '#ef4444', ACTIVE: '#10b981', SUSPENDED: '#ef4444' };

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, sub, icon, color = '#3b82f6' }) => (
  <motion.div whileHover={{ scale: 1.02, translateY: -5 }} transition={{ type: 'spring', stiffness: 300 }}>
    <Paper sx={{ 
      p: 3, 
      borderRadius: '24px', 
      border: `1px solid ${color}22`, 
      position: 'relative', 
      overflow: 'hidden', 
      background: `linear-gradient(135deg, #fff 0%, ${color}05 100%)`,
      boxShadow: `0 10px 30px ${color}11` 
    }}>
      <Box sx={{ position: 'absolute', top: -10, right: -10, fontSize: 100, opacity: 0.08, color, transform: 'rotate(-10deg)' }}>{icon}</Box>
      <Box sx={{ p: 1.2, borderRadius: '12px', bgcolor: `${color}15`, color, display: 'inline-flex', mb: 2, boxShadow: `0 4px 12px ${color}22` }}>
        {icon}
      </Box>
      <Typography variant="h4" fontWeight={950} sx={{ color, mb: 0.5, letterSpacing: '-1px' }}>{value}</Typography>
      <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#64748b' }}>{title}</Typography>
      {sub && <Typography variant="caption" sx={{ opacity: 0.6, fontWeight: 600 }}>{sub}</Typography>}
    </Paper>
  </motion.div>
);

// ─── Invoice Dialog ───────────────────────────────────────────────────────────
const InvoiceDialog = ({ open, onClose, invoice }) => {
  if (!invoice) return null;
  const subtotal = Number(invoice.price || 0) / 1.18;
  const gst = Number(invoice.price || 0) - subtotal;
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: '24px' } }}>
      <DialogTitle sx={{ fontWeight: 900, display: 'flex', justifyContent: 'space-between' }}>
        Invoice #{invoice.invoiceId || 'N/A'}
        <IconButton onClick={() => window.print()} size="small"><DownloadIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ p: 3, border: '1px solid #e2e8f0', borderRadius: '16px' }}>
          <Typography variant="h5" color="primary" fontWeight={900}>GeoSurePath</Typography>
          <Typography variant="caption" sx={{ opacity: 0.5 }}>Global Fleet Intelligence</Typography>
          <Divider sx={{ my: 2 }} />
          <Typography fontWeight={700}>Billed to: {invoice.email || invoice.userEmail || '—'}</Typography>
          <Typography variant="caption">Plan: {(invoice.planId || 'monthly').toUpperCase()} · {invoice.deviceCount || 1} Units</Typography>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">Subtotal</Typography>
            <Typography variant="body2">{fmtCurrency(subtotal)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">GST (18%)</Typography>
            <Typography variant="body2">{fmtCurrency(gst)}</Typography>
          </Box>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography fontWeight={900}>Total Paid</Typography>
            <Typography fontWeight={900} color="success.main">{fmtCurrency(invoice.price)}</Typography>
          </Box>
        </Box>
        <Box sx={{ mt: 2, p: 1, textAlign: 'center', bgcolor: '#f0fdf4', borderRadius: '8px', color: '#10b981', fontWeight: 900 }}>
          ✓ PAID — {fmtDate(invoice.createdAt)}
        </Box>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
};

// ─── Plan Upgrade Dialog (Client) ──────────────────────────────────────────
const PlanUpgradeDialog = ({ open, onClose, plans = [], currentFleetSize = 1, onUpgrade }) => {
  const [selectedPlan, setSelectedPlan] = useState('');
  const plan = plans.find(p => p.id === selectedPlan);
  const total = (plan?.pricePerDevice || 0) * currentFleetSize;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: '24px' } }}>
      <DialogTitle sx={{ fontWeight: 900 }}>Upgrade Subscription</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>Select New Plan</InputLabel>
            <Select value={selectedPlan} label="Select New Plan" onChange={e => setSelectedPlan(e.target.value)}>
              {plans.map(p => (
                <MenuItem key={p.id} value={p.id}>{p.name} (₹{p.pricePerDevice}/{p.billingCycle})</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {plan && (
            <Box sx={{ p: 3, bgcolor: '#f0f9ff', borderRadius: '20px', border: '1px solid #bae6fd' }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#0369a1', display: 'block', mb: 1 }}>PAYABLE AMOUNT</Typography>
              <Typography variant="h4" fontWeight={900} color="primary">{fmtCurrency(total)}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.6, mt: 0.5 }}>Covers {currentFleetSize} device(s) for the next {plan.days} days</Typography>
              <Divider sx={{ my: 2, borderColor: '#bae6fd' }} />
              <Typography variant="caption" display="block">✓ High-priority support</Typography>
              <Typography variant="caption" display="block">✓ Advanced history storage</Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!selectedPlan} onClick={() => onUpgrade(selectedPlan, total)} sx={{ borderRadius: '12px', fontWeight: 700, px: 3 }}>
          Proceed to Payment
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
// Dynamic Razorpay Script Loader
const loadRazorpay = () => new Promise((resolve) => {
  if (window.Razorpay) return resolve(true);
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

const BillingPage = () => {
  const isTraccarAdmin = useAdministrator();
  const saasRole = localStorage.getItem('saas_role');
  const admin = isTraccarAdmin || saasRole === 'ADMIN';
  const navigate = useNavigate();
  const token = localStorage.getItem('saas_token');

  // ── Core State ──
  const [tab, setTab] = useState(0);
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // ── Admin State ──
  const [analytics, setAnalytics] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [payments, setPayments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [plans, setPlans] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [adminSettings, setAdminSettings] = useState({ taxRate: 18, razorpayId: '', paymentLink: '', supportEmail: '', announcement: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [ledgerMeta, setLedgerMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [ledgerPage, setLedgerPage] = useState(1);

  // ── Dialog State ──
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ planId: '', status: '', expiresAt: '', isActive: true, hardlockBypass: false });
  const [onboardDialog, setOnboardDialog] = useState(false);
  const [onboardData, setOnboardData] = useState({ name: '', email: '', password: '', role: 'CLIENT' });
  const [onboarding, setOnboarding] = useState(false);
  const [provisionDialog, setProvisionDialog] = useState({ open: false, user: null, text: '' });
  const [upgradeDialog, setUpgradeDialog] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [lastSync, setLastSync] = useState(new Date());
  const [tabLoading, setTabLoading] = useState({});

  const showFeedback = useCallback((message, severity = 'success') => setSnackbar({ open: true, message, severity }), []);

  // ── Data Fetchers ──
  const fetchBill = useCallback(async () => {
    if (!token) return;
    try {
      const res = await API('/api/billing/my-bill');
      if (res.ok) setBill(await res.json());
      else {
        console.error('[fetchBill] Failed:', res.status);
        showFeedback('Could not load billing data. Please try again.', 'error');
      }
    } catch (err) {
      console.error('[fetchBill] Error:', err);
      showFeedback('Connection error while fetching bill.', 'error');
    }
  }, [token, showFeedback]);

  const fetchAdminData = useCallback(async (forcedTab = null) => {
    if (!admin || !token) return;
    const activeTab = forcedTab !== null ? forcedTab : tab;

    const endpoints = {
      0: ['/api/admin/stats', '/api/admin/payments', 'analytics', 'payments'], // Dashboard overview uses stats + recent payments
      1: [`/api/admin/ledger?page=${ledgerPage}&search=${searchQuery}&status=${statusFilter === 'ALL' ? '' : statusFilter}`, 'ledger'],
      2: ['/api/admin/payments', 'payments'],
      3: ['/api/admin/audit-logs', 'auditLogs'],
      4: ['/api/admin/health/full', 'systemHealth'],
      5: ['/api/admin/settings', 'adminSettings'],
      6: [], // Security tab (MFA) is handled by MfaSetup component
    };

    // Always fetch plans and settings once if not present
    const essentials = [];
    if (plans.length === 0) essentials.push(['/api/admin/plans', 'plans']);
    if (!adminSettings.supportEmail) essentials.push(['/api/admin/settings', 'adminSettings']);

    const currentTabReqs = endpoints[activeTab] || [];
    const toFetch = [...essentials];
    if (currentTabReqs.length > 0) {
      if (typeof currentTabReqs[0] === 'string' && currentTabReqs.length === 2) {
         toFetch.push(currentTabReqs);
      } else {
         // Handle composite reqs like tab 0
         for(let i=0; i<currentTabReqs.length; i+=2) {
            toFetch.push([currentTabReqs[i], currentTabReqs[i+1]]);
         }
      }
    }

    if (toFetch.length === 0) return;

    setTabLoading(prev => ({ ...prev, [activeTab]: true }));
    try {
      const results = await Promise.all(toFetch.map(tf => API(tf[0]).then(r => r.ok ? r.json() : null)));
      
      results.forEach((data, index) => {
        if (!data) return;
        const key = toFetch[index][1];
        if (key === 'analytics') setAnalytics(data);
        if (key === 'ledger') {
          // Handle both old array format and new paginated object format
          if (data.data) {
             setLedger(data.data);
             setLedgerMeta(data.meta);
          } else {
             setLedger(Array.isArray(data) ? data : []);
          }
        }
        if (key === 'auditLogs') setAuditLogs(data);
        if (key === 'payments') setPayments(data);
        if (key === 'plans') setPlans(data);
        if (key === 'systemHealth') setSystemHealth(data);
        if (key === 'adminSettings') setAdminSettings(data);
      });
    } finally {
      setTabLoading(prev => ({ ...prev, [activeTab]: false }));
      setLastSync(new Date());
    }
  }, [admin, token, tab, plans.length, adminSettings.supportEmail]);
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      setLoading(true);
      try {
        // On initial load, only fetch the current user's bill and the dashboard essentials (tab 0)
        await Promise.all([fetchBill(), fetchAdminData(0)]);
      } catch (err) {
        console.error('[BillingPage] Init failed:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    init();

    // SMART RE-FETCH for Search/Status
    const delayDebounceFn = setTimeout(() => {
        if (admin && tab === 1) fetchAdminData(1);
    }, 500);

    return () => {
      isMounted = false;
      clearInterval(interval);
      clearTimeout(delayDebounceFn);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchBill, fetchAdminData, admin, searchQuery, statusFilter, ledgerPage]); 

  // ── Admin Actions ──
  const handleImpersonate = async (userId) => {
    const res = await API('/api/admin/impersonate', { method: 'POST', body: JSON.stringify({ userId }) });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('saas_token', data.accessToken);
      localStorage.setItem('saas_user', JSON.stringify(data.user));
      localStorage.setItem('saas_role', data.user.role);
      showFeedback(`Viewing as ${data.user.email}`, 'info');
      setTimeout(() => window.location.href = '/', 1200);
    } else showFeedback(data.error || 'Failed', 'error');
  };

  const handleToggleStatus = async (u) => {
    const res = await API('/api/admin/client-status', { method: 'POST', body: JSON.stringify({ clientId: u.id, isActive: !u.isActive }) });
    if (res.ok) { showFeedback(`User ${u.isActive ? 'suspended' : 'activated'}`); fetchAdminData(); }
    else showFeedback('Status update failed', 'error');
  };

  const handleSettleCash = async (userId, planId, total) => {
    setSettling(true);
    const res = await API('/api/billing/admin/settle-cash', { method: 'POST', body: JSON.stringify({ userId, planId, total }) });
    if (res.ok) { showFeedback('Payment settled successfully'); fetchAdminData(); }
    else showFeedback('Settlement failed', 'error');
    setSettling(false);
  };

  const handleAdjustExpiry = async (userId, email) => {
    const days = prompt(`Extend subscription for ${email}.\nEnter number of days:`, '30');
    if (!days || isNaN(days)) return;
    const res = await API('/api/admin/adjust-expiry', { method: 'POST', body: JSON.stringify({ userId, days: parseInt(days, 10) }) });
    if (res.ok) { showFeedback('Expiry updated'); fetchAdminData(); }
    else showFeedback('Update failed', 'error');
  };

  const handleOnboard = async () => {
    setOnboarding(true);
    const res = await API('/api/admin/users', { method: 'POST', body: JSON.stringify(onboardData) });
    const data = await res.json();
    if (res.ok) {
      showFeedback('User created successfully');
      setOnboardDialog(false);
      setOnboardData({ name: '', email: '', password: '', role: 'CLIENT' });
      fetchAdminData();
    } else showFeedback(data.error || 'Failed to create user', 'error');
    setOnboarding(false);
  };

  const handleBulkProvision = async () => {
    const { user, text } = provisionDialog;
    if (!user || !text.trim()) return;
    const devices = text.split('\n').filter(l => l.includes(',')).map(l => {
      const [name, uniqueId] = l.split(',');
      return { name: name.trim(), uniqueId: uniqueId.trim() };
    });
    const res = await API('/api/admin/users/bulk-devices', { method: 'POST', body: JSON.stringify({ userId: user.id, devices }) });
    const data = await res.json();
    if (res.ok) { showFeedback(`Provisioned ${data.results?.filter(r => r.status === 'success').length || devices.length} devices`); setProvisionDialog({ open: false, user: null, text: '' }); }
    else showFeedback('Provisioning failed', 'error');
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    const res = await API('/api/admin/user-subscription', { method: 'POST', body: JSON.stringify({ userId: editingUser.id, ...editForm }) });
    if (res.ok) { 
      // Also sync bypass separately if it changed
      if (editForm.hardlockBypass !== editingUser.hardlockBypass) {
        await API('/api/admin/users/hardlock-bypass', { method: 'POST', body: JSON.stringify({ userId: editingUser.id, bypass: editForm.hardlockBypass }) });
      }
      showFeedback('User updated'); 
      setEditingUser(null); 
      fetchAdminData(); 
    }
    else showFeedback('Update failed', 'error');
  };

  const handleToggleBypass = async (u) => {
    const newBypass = !u.hardlockBypass;
    const res = await API('/api/admin/users/hardlock-bypass', { method: 'POST', body: JSON.stringify({ userId: u.id, bypass: newBypass }) });
    if (res.ok) { showFeedback(`Hardlock bypass ${newBypass ? 'enabled' : 'disabled'}`); fetchAdminData(); }
    else showFeedback('Update failed', 'error');
  };

  const handleSaveSettings = async () => {
    const res = await API('/api/admin/settings', { method: 'POST', body: JSON.stringify(adminSettings) });
    if (res.ok) showFeedback('Settings saved');
    else showFeedback('Save failed', 'error');
  };

  const handleSyncUser = async (userId) => {
    const res = await API(`/api/admin/sync-devices/${userId}`, { method: 'POST' });
    if (res.ok) { showFeedback('Devices synced'); fetchAdminData(); }
    else showFeedback('Sync failed', 'error');
  };

  const handleDeleteUser = async (userId, email) => {
    if (!window.confirm(`Permanently delete ${email}? This cannot be undone.`)) return;
    const res = await API(`/api/admin/users/${userId}`, { method: 'DELETE' });
    if (res.ok) { showFeedback('User deleted'); fetchAdminData(); }
    else showFeedback('Delete failed', 'error');
  };

  const handleUpgradePlan = async (planId, amount) => {
    // Demo bypass for now as per dashboard logic
    showFeedback('Processing payment...', 'info');
    const res = await API('/api/billing/demo-settle', { method: 'POST', body: JSON.stringify({ planId, amount }) });
    if (res.ok) {
        showFeedback('Subscription upgraded successfully!');
        setUpgradeDialog(false);
        fetchBill();
    } else {
        showFeedback('Payment failed. Please try again.', 'error');
    }
  };

  const handleLogout = () => { localStorage.clear(); navigate('/login'); };

  const filteredLedger = ledger || [];

  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');

  const filteredPayments = (payments || []).filter(p => {
    const matchesSearch = (p.user?.email || '').toLowerCase().includes(paymentSearch.toLowerCase()) ||
                         (p.transactionId || '').toLowerCase().includes(paymentSearch.toLowerCase());
    const matchesStatus = paymentStatusFilter === 'ALL' || p.status === paymentStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredAudit = (auditLogs || []).filter(l => {
    const matchesAction = auditActionFilter === 'ALL' || l.action === auditActionFilter;
    return matchesAction;
  });

  // ── Admin Tabs ──
  const ADMIN_TABS = [
    { label: 'Overview', icon: <BarChartIcon /> },
    { label: 'Users', icon: <PeopleIcon /> },
    { label: 'Payments', icon: <PaymentIcon /> },
    { label: 'Audit Logs', icon: <ReceiptIcon /> },
    { label: 'System', icon: <MonitorHeartIcon /> },
    { label: 'Security', icon: <ShieldIcon /> },
  ];

  if (loading) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 2, bgcolor: '#0f172a' }}>
      <CircularProgress size={56} sx={{ color: '#3b82f6' }} />
      <Typography variant="h6" sx={{ color: 'white', opacity: 0.6, fontWeight: 700 }}>Loading Dashboard…</Typography>
    </Box>
  );

  return (
    <Box sx={{ bgcolor: '#f1f5f9', minHeight: '100vh' }}>
      {/* ─── Top Nav ─── */}
      <Box sx={{ bgcolor: '#0f172a', color: 'white', px: 4, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ p: 1, borderRadius: '10px', bgcolor: '#3b82f6' }}><DirectionsCarIcon /></Box>
          <Box>
            <Typography variant="h6" fontWeight={900}>GeoSurePath</Typography>
            <Typography variant="caption" sx={{ opacity: 0.5 }}>{admin ? 'Admin Dashboard' : 'Billing Portal'}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box sx={{ textAlign: 'right', display: { xs: 'none', md: 'block' } }}>
            <Typography variant="overline" sx={{ opacity: 0.5, lineHeight: 1, display: 'block' }}>Live Dashboard Sync</Typography>
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#3b82f6' }}>
              Last updated: {lastSync.toLocaleTimeString()}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button startIcon={<LinkIcon />} onClick={() => navigate('/')} sx={{ color: 'white', opacity: 0.7 }}>Map</Button>
            <Button startIcon={<CancelIcon />} onClick={handleLogout} color="error" variant="outlined" sx={{ borderRadius: '10px' }}>Logout</Button>
          </Box>
        </Box>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {admin ? (
          <>
            {/* ─── Admin Tab Bar ─── */}
            <Paper sx={{ borderRadius: '20px', mb: 4, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              <Tabs value={tab} onChange={(_, v) => { setTab(v); fetchAdminData(v); }} variant="scrollable" scrollButtons="auto"
                sx={{ '& .MuiTabs-indicator': { height: 3, borderRadius: '3px', bgcolor: '#3b82f6' }, '& .MuiTab-root': { fontWeight: 700, py: 2, minHeight: 60 }, '& .Mui-selected': { color: '#3b82f6 !important' } }}>
                {ADMIN_TABS.map((t, i) => <Tab key={i} icon={t.icon} label={t.label} iconPosition="start" />)}
              </Tabs>
            </Paper>

            <Box sx={{ position: 'relative', minHeight: '400px' }}>
              {tabLoading[tab] && (
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(241, 245, 249, 0.7)', borderRadius: '20px', backdropFilter: 'blur(2px)' }}>
                  <CircularProgress size={40} />
                </Box>
              )}

            {/* ─── TAB 0: Overview ─── */}
            {tab === 0 && (
              <Box>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} sm={6} md={3}><StatCard title="Total Revenue" value={fmtCurrency(analytics?.totalRevenue)} sub="All time collected" icon={<TrendingUpIcon />} color="#10b981" /></Grid>
                  <Grid item xs={12} sm={6} md={3}><StatCard title="Projected MRR" value={fmtCurrency(analytics?.projectedRevenue)} sub="This billing cycle" icon={<BarChartIcon />} color="#3b82f6" /></Grid>
                  <Grid item xs={12} sm={6} md={3}><StatCard title="Active Clients" value={analytics?.totalClients || 0} sub="Registered accounts" icon={<PeopleIcon />} color="#6366f1" /></Grid>
                  <Grid item xs={12} sm={6} md={3}><StatCard title="Overdue Accounts" value={analytics?.overdueUsers || 0} sub="Require attention" icon={<WarningIcon />} color="#ef4444" /></Grid>
                </Grid>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, borderRadius: '20px', height: '100%' }}>
                      <Typography fontWeight={800} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}><PaymentIcon color="primary" /> Recent Payments</Typography>
                      {payments.slice(0, 5).map((p, i) => (
                        <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid #f1f5f9' }}>
                          <Box>
                            <Typography variant="body2" fontWeight={700}>{p.user?.name || p.user?.email || '—'}</Typography>
                            <Typography variant="caption" sx={{ opacity: 0.5 }}>{fmtDate(p.createdAt)}</Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography fontWeight={900} color="success.main">{fmtCurrency(p.amount)}</Typography>
                            <Chip label={p.status} size="small" color={p.status === 'CAPTURED' ? 'success' : 'default'} sx={{ fontSize: '0.65rem' }} />
                          </Box>
                        </Box>
                      ))}
                      {payments.length === 0 && <Typography sx={{ opacity: 0.4, textAlign: 'center', py: 3 }}>No payments yet</Typography>}
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, borderRadius: '20px', height: '100%' }}>
                      <Typography fontWeight={800} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}><WarningIcon color="error" /> Overdue Accounts</Typography>
                      {(ledger || []).filter(u => u.status === 'OVERDUE' || u.unpaidDays > 0).slice(0, 5).map((u, i) => (
                        <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="body2" fontWeight={700}>{u.email}</Typography>
                            <Typography variant="caption" color="error">{u.unpaidDays} days overdue</Typography>
                          </Box>
                          <Button size="small" variant="contained" color="error" sx={{ borderRadius: '8px', fontWeight: 700 }}
                            onClick={() => handleSettleCash(u.id, u.planId || 'monthly', u.totalDue)} disabled={settling}>
                            Settle ₹{u.totalDue?.toFixed(0)}
                          </Button>
                        </Box>
                      ))}
                      {(ledger || []).filter(u => u.status === 'OVERDUE' || u.unpaidDays > 0).length === 0 && <Typography sx={{ opacity: 0.4, textAlign: 'center', py: 3 }}>All accounts are current</Typography>}
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* ─── TAB 1: Users ─── */}
            {tab === 1 && (
              <>
                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                  <TextField size="small" placeholder="Search by name or email…" value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ opacity: 0.5 }} /></InputAdornment> }}
                    sx={{ width: 250, bgcolor: 'white', borderRadius: '10px' }} />
                  
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} sx={{ bgcolor: 'white', borderRadius: '10px' }}>
                      <MenuItem value="ALL">All Statuses</MenuItem>
                      <MenuItem value="ACTIVE">Active (Paid)</MenuItem>
                      <MenuItem value="OVERDUE">Overdue</MenuItem>
                      <MenuItem value="GRACE">Grace Period</MenuItem>
                      <MenuItem value="BYPASSED">Locked/Bypassed</MenuItem>
                      <MenuItem value="SUSPENDED">Suspended</MenuItem>
                    </Select>
                  </FormControl>

                  <Chip label={`${filteredLedger.length} clients`} sx={{ fontWeight: 700 }} />
                    <Button startIcon={<SyncIcon />} variant="outlined" color="info" onClick={async () => {
                      if (!window.confirm('Sync all devices for all clients? This may take a minute.')) return;
                      showFeedback('Global sync started...', 'info');
                      const res = await API('/api/admin/sync-all-devices', { method: 'POST' });
                      if (res.ok) { showFeedback('Global sync complete'); fetchAdminData(); }
                      else showFeedback('Global sync failed', 'error');
                    }}>Sync All</Button>
                    <Button startIcon={<DownloadIcon />} variant="outlined" onClick={() => {
                      exportToCsv('client_ledger', filteredLedger.map(u => [u.name, u.email, u.role, u.isActive ? 'Active' : 'Suspended', u.fleetSize, u.planName, u.billingCycle, fmtDate(u.expiresAt), fmtDate(u.lastPaymentDate), u.lastPaymentAmount, u.totalDue?.toFixed(2), u.unpaidDays, u.status]), ['Name', 'Email', 'Role', 'Active', 'Devices', 'Plan', 'Cycle', 'Expires', 'Last Payment', 'Last Amount', 'Due', 'Overdue Days', 'Status']);
                    }}>Export CSV</Button>
                    <Button startIcon={<RefreshIcon />} variant="outlined" onClick={fetchAdminData}>Refresh</Button>
                    <Button startIcon={<PersonAddIcon />} variant="contained" sx={{ borderRadius: '10px', fontWeight: 700 }} onClick={() => setOnboardDialog(true)}>Add Client</Button>
                </Box>
                <Paper sx={{ borderRadius: '20px', overflow: 'hidden' }}>
                  <TableContainer sx={{ maxHeight: 640 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f8fafc' }}>
                          {['Client', 'Devices', 'Plan / Cycle', 'Expires', 'Last Payment', 'Status', 'Due', 'Actions'].map(h => (
                            <TableCell key={h} sx={{ fontWeight: 800, color: '#0f172a', bgcolor: '#f8fafc', whiteSpace: 'nowrap' }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredLedger.map((u) => {
                          const isExpired = u.expiresAt && new Date(u.expiresAt) < new Date();
                          const rowBg = u.status === 'OVERDUE' ? '#fff5f5' : u.status === 'GRACE' ? '#fffbeb' : 'white';
                          return (
                            <TableRow key={u.id} hover sx={{ bgcolor: rowBg, '&:hover': { bgcolor: `${rowBg} !important`, filter: 'brightness(0.97)' } }}>
                              {/* Client Column */}
                              <TableCell>
                                <Typography fontWeight={800} variant="body2">{u.name || u.email.split('@')[0]}</Typography>
                                <Typography variant="caption" sx={{ opacity: 0.55 }}>{u.email}</Typography>
                                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                                  {u.mfaEnabled && <Chip label="MFA" size="small" color="success" sx={{ height: 16, fontSize: '0.58rem', fontWeight: 700 }} />}
                                  {u.isVIP && <Chip label="VIP" size="small" color="warning" sx={{ height: 16, fontSize: '0.58rem', fontWeight: 700 }} />}
                                  {u.hardlockBypass && <Chip label="BYPASS" size="small" sx={{ height: 16, fontSize: '0.58rem', fontWeight: 700, bgcolor: '#8b5cf6', color: 'white' }} />}
                                  {!u.isActive && <Chip label="SUSPENDED" size="small" color="error" sx={{ height: 16, fontSize: '0.58rem', fontWeight: 700 }} />}
                                </Box>
                                </Box>
                              </TableCell>
                              {/* Devices */}
                              <TableCell>
                                <Typography fontWeight={900} color="primary">{u.fleetSize}</Typography>
                                <Typography variant="caption" sx={{ opacity: 0.5 }}>units</Typography>
                              </TableCell>
                              {/* Plan */}
                              <TableCell>
                                <Typography variant="body2" fontWeight={700}>{u.planName || '—'}</Typography>
                                <Typography variant="caption" sx={{ opacity: 0.5 }}>{u.billingCycle || ''}</Typography>
                              </TableCell>
                              {/* Expires */}
                              <TableCell>
                                <Typography variant="body2" fontWeight={700} color={isExpired ? 'error' : 'textPrimary'}>
                                  {u.expiresAt ? fmtDate(u.expiresAt) : '—'}
                                </Typography>
                                {u.graceDaysRemaining > 0 && <Typography variant="caption" color="warning.main">{u.graceDaysRemaining}d grace left</Typography>}
                              </TableCell>
                              {/* Last Payment */}
                              <TableCell>
                                {u.lastPaymentDate ? (
                                  <>
                                    <Typography variant="body2" fontWeight={700} color="success.main">{fmtCurrency(u.lastPaymentAmount)}</Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.5 }}>{fmtDate(u.lastPaymentDate)}</Typography>
                                  </>
                                ) : <Typography variant="caption" sx={{ opacity: 0.4 }}>No payments</Typography>}
                              </TableCell>
                              {/* Status */}
                              <TableCell>
                                <Chip
                                  label={u.status || (u.isActive ? 'ACTIVE' : 'SUSPENDED')}
                                  size="small"
                                  sx={{ fontWeight: 800, bgcolor: `${STATUS_COLOR[u.status] || '#64748b'}18`, color: STATUS_COLOR[u.status] || '#64748b', border: `1px solid ${STATUS_COLOR[u.status] || '#64748b'}40` }}
                                />
                                {u.unpaidDays > 0 && <Typography variant="caption" color="error" display="block">{u.unpaidDays}d overdue</Typography>}
                              </TableCell>
                              {/* Due Amount */}
                              <TableCell>
                                <Typography fontWeight={900} color={u.totalDue > 0 ? 'error' : 'success.main'}>
                                  {fmtCurrency(u.totalDue, adminSettings?.currencySymbol)}
                                </Typography>
                              </TableCell>
                              {/* Actions */}
                              <TableCell>
                                <Box sx={{ display: 'flex', gap: 0.3, flexWrap: 'wrap' }}>
                                  <Tooltip title="Edit Subscription"><IconButton size="small" color="primary" onClick={() => { setEditingUser(u); setEditForm({ planId: u.planId || '', status: u.status || '', expiresAt: '', isActive: u.isActive, hardlockBypass: u.hardlockBypass || false }); }}><EditIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                  <Tooltip title={u.hardlockBypass ? "Enable Hardlock" : "Bypass Hardlock"}><IconButton size="small" sx={{ color: u.hardlockBypass ? '#8b5cf6' : '#94a3b8' }} onClick={() => handleToggleBypass(u)}><ShieldIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                  <Tooltip title="View Dashboard as Client"><IconButton size="small" sx={{ color: '#f59e0b' }} onClick={() => handleImpersonate(u.id)}><VisibilityIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                  <Tooltip title="Sync Devices from Traccar"><IconButton size="small" sx={{ color: '#3b82f6' }} onClick={() => handleSyncUser(u.id)}><SyncIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                  <Tooltip title="Bulk Provision Devices"><IconButton size="small" color="secondary" onClick={() => setProvisionDialog({ open: true, user: u, text: '' })}><DirectionsCarIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                  <Tooltip title="Extend Subscription"><IconButton size="small" color="info" onClick={() => handleAdjustExpiry(u.id, u.email)}><ReceiptIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                  <Tooltip title="Sync Critical Events (Ignition/Overspeed)"><IconButton size="small" sx={{ color: '#ef4444' }} onClick={async () => {
                                      showFeedback('Syncing engine events...', 'info');
                                      const res = await API(`/api/admin/users/${u.id}/sync-events`, { method: 'POST' });
                                      if (res.ok) { let d = await res.json(); showFeedback(d.message); }
                                   }}><WarningIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                  <Tooltip title={u.isActive ? 'Suspend Account' : 'Activate Account'}>
                                    <IconButton size="small" color={u.isActive ? 'error' : 'success'} onClick={() => handleToggleStatus(u)}>
                                      {u.isActive ? <BlockIcon sx={{ fontSize: 16 }} /> : <CheckCircleIcon sx={{ fontSize: 16 }} />}
                                    </IconButton>
                                  </Tooltip>
                                  {u.totalDue > 0 && (
                                    <Tooltip title={`Record cash payment of ${fmtCurrency(u.totalDue)}`}>
                                      <Button size="small" variant="contained" color="success" sx={{ borderRadius: '6px', fontSize: '0.65rem', px: 1, minWidth: 0 }} onClick={() => handleSettleCash(u.id, u.planId || 'monthly', u.totalDue)} disabled={settling}>
                                        Settle
                                      </Button>
                                    </Tooltip>
                                  )}
                                  <Tooltip title="Delete Client"><IconButton size="small" color="error" onClick={() => handleDeleteUser(u.id, u.email)}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {filteredLedger.length === 0 && (
                          <TableRow><TableCell colSpan={8} sx={{ textAlign: 'center', py: 5, opacity: 0.4 }}>No clients found</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>

                {/* Pagination Controls */}
                {ledgerMeta.totalPages > 1 && (
                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                    <Button 
                      disabled={ledgerPage <= 1} 
                      onClick={() => { setLedgerPage(p => p - 1); fetchAdminData(1); }}
                      variant="outlined"
                      sx={{ borderRadius: '10px' }}
                    >
                      Previous
                    </Button>
                    <Typography variant="body2" fontWeight={700}>
                      Page {ledgerPage} of {ledgerMeta.totalPages}
                    </Typography>
                    <Button 
                      disabled={ledgerPage >= ledgerMeta.totalPages} 
                      onClick={() => { setLedgerPage(p => p + 1); fetchAdminData(1); }}
                      variant="outlined"
                      sx={{ borderRadius: '10px' }}
                    >
                      Next
                    </Button>
                  </Box>
                )}
              </>
            )}

            {/* ─── TAB 2: Payments ─── */}
            {tab === 2 && (
              <Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                  <TextField size="small" placeholder="Search payments…" value={paymentSearch} onChange={e => setPaymentSearch(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ opacity: 0.5 }} /></InputAdornment> }}
                    sx={{ width: 250, bgcolor: 'white', borderRadius: '10px' }} />
                  
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <Select value={paymentStatusFilter} onChange={e => setPaymentStatusFilter(e.target.value)} sx={{ bgcolor: 'white', borderRadius: '10px' }}>
                      <MenuItem value="ALL">All Statuses</MenuItem>
                      <MenuItem value="CAPTURED">Captured</MenuItem>
                      <MenuItem value="FAILED">Failed</MenuItem>
                      <MenuItem value="PENDING">Pending</MenuItem>
                      <MenuItem value="REFUNDED">Refunded</MenuItem>
                    </Select>
                  </FormControl>

                  <Box sx={{ flexGrow: 1 }} />
                  
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button startIcon={<DownloadIcon />} variant="outlined" onClick={() => exportToCsv('payments', filteredPayments.map(p => [p.id, p.user?.email, p.amount, p.status, p.paymentMethod, fmtDate(p.createdAt)]), ['ID', 'User', 'Amount', 'Status', 'Method', 'Date'])}>Export CSV</Button>
                    <Button startIcon={<RefreshIcon />} variant="outlined" onClick={fetchAdminData}>Refresh</Button>
                  </Box>
                </Box>
                <Paper sx={{ borderRadius: '20px', overflow: 'hidden' }}>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f8fafc' }}>
                          {['Date', 'Client', 'Method', 'Transaction ID', 'Amount', 'Status', 'Invoice'].map(h => (
                            <TableCell key={h} sx={{ fontWeight: 800 }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredPayments.map((p, i) => (
                          <TableRow key={i} hover>
                            <TableCell sx={{ fontSize: '0.8rem' }}>{fmtDate(p.createdAt)}</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>{p.user?.email || '—'}</TableCell>
                            <TableCell><Chip label={p.paymentMethod || 'RAZORPAY'} size="small" /></TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{p.transactionId || p.razorpayPaymentId || '—'}</TableCell>
                            <TableCell sx={{ fontWeight: 900, color: '#10b981' }}>{fmtCurrency(p.amount)}</TableCell>
                            <TableCell><Chip label={p.status} size="small" color={p.status === 'CAPTURED' ? 'success' : 'default'} /></TableCell>
                            <TableCell><IconButton size="small" onClick={() => setSelectedInvoice(p)}><ReceiptIcon /></IconButton></TableCell>
                          </TableRow>
                        ))}
                        {payments.length === 0 && <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 5, opacity: 0.4 }}>No payments recorded</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Box>
            )}

            {/* ─── TAB 3: Audit Logs ─── */}
            {tab === 3 && (
              <Paper sx={{ borderRadius: '20px', overflow: 'hidden' }}>
                <Box sx={{ p: 3, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                  <Typography fontWeight={800} variant="h6" sx={{ mr: 2 }}>Audit Trail</Typography>
                  
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <Select value={auditActionFilter} onChange={e => setAuditActionFilter(e.target.value)} sx={{ bgcolor: '#f8fafc', borderRadius: '10px' }}>
                      <MenuItem value="ALL">All Actions</MenuItem>
                      {[...new Set(auditLogs.map(l => l.action))].map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                    </Select>
                  </FormControl>

                  <Box sx={{ flexGrow: 1 }} />
                  
                  <Button startIcon={<DeleteIcon />} variant="outlined" color="error" size="small" onClick={async () => {
                    if (!window.confirm('CRITICAL: Are you sure you want to wipe all audit logs? This action is irreversible.')) return;
                    const res = await API('/api/admin/audit/clear', { method: 'POST' });
                    if (res.ok) { showFeedback('Audit trail cleared'); fetchAdminData(); }
                  }}>Clear All</Button>
                  <Button startIcon={<DownloadIcon />} variant="outlined" size="small" onClick={() => exportToCsv('audit_logs', filteredAudit.map(l => [fmtDate(l.createdAt), l.action, l.user?.email, l.adminId, l.details]), ['Date', 'Action', 'User', 'Admin', 'Details'])}>Export CSV</Button>
                </Box>
                <TableContainer sx={{ maxHeight: 600 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        {['Timestamp', 'Action', 'Affected User', 'Admin', 'Details'].map(h => (
                          <TableCell key={h} sx={{ fontWeight: 800, bgcolor: '#f8fafc' }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredAudit.map((log) => (
                        <TableRow key={log.id} hover>
                          <TableCell sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleString('en-IN')}</TableCell>
                          <TableCell><Chip label={log.action} size="small" sx={{ bgcolor: '#eff6ff', color: '#3b82f6', fontWeight: 700, fontSize: '0.65rem' }} /></TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{log.userPreferredName || log.user?.email || log.userId || 'SYSTEM'}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', opacity: 0.6 }}>{log.adminId || '—'}</TableCell>
                          <TableCell sx={{ fontSize: '0.8rem', maxWidth: 400 }}>{log.details}</TableCell>
                        </TableRow>
                      ))}
                      {auditLogs.length === 0 && <TableRow><TableCell colSpan={5} sx={{ textAlign: 'center', py: 5, opacity: 0.4 }}>No audit records found.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}

            {/* ─── TAB 4: System & Configuration ─── */}
            {tab === 4 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6" fontWeight={900} sx={{ mb: 2, color: '#1e293b' }}>Hardware Intelligence</Typography>
                  <Grid container spacing={2}>
                    {[
                      { label: 'Database', value: systemHealth?.db || 'Connected', color: '#10b981', icon: <StorageIcon /> },
                      { label: 'Traccar Engine', value: systemHealth?.traccar || 'Running', color: '#3b82f6', icon: <DirectionsCarIcon /> },
                      { label: 'CPU Load', value: `${(systemHealth?.cpuLoad?.[0] || 0.12).toFixed(2)}%`, color: '#6366f1', icon: <CpuIcon /> },
                      { label: 'Memory', value: systemHealth?.memory?.free || '7.4 GB Free', color: '#8b5cf6', icon: <MemoryIcon /> },
                      { label: 'System Uptime', value: systemHealth?.uptime || 'Active', color: '#f59e0b', icon: <UptimeIcon /> },
                    ].map((s, i) => (
                      <Grid item xs={12} sm={6} md={2.4} key={i}>
                        <Paper sx={{ p: 2, borderRadius: '16px', display: 'flex', alignItems: 'center', gap: 2, border: `1px solid ${s.color}22` }}>
                          <Box sx={{ p: 1, borderRadius: '10px', bgcolor: `${s.color}15`, color: s.color }}>{s.icon}</Box>
                          <Box>
                            <Typography variant="caption" sx={{ opacity: 0.5, fontWeight: 700 }}>{s.label}</Typography>
                            <Typography variant="body2" fontWeight={900}>{s.value}</Typography>
                          </Box>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>

                <Grid item xs={12} md={8}>
                  <Paper sx={{ p: 4, borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                    <Typography fontWeight={950} variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <SettingsIcon color="primary" /> Platform Engine Configuration
                    </Typography>
                    
                    <Grid container spacing={4}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="overline" sx={{ fontWeight: 900, color: 'primary.main', display: 'block', mb: 1 }}>Payment Gateway</Typography>
                        <TextField fullWidth label="Razorpay Key ID" value={adminSettings.razorpayId || ''} onChange={e => setAdminSettings({ ...adminSettings, razorpayId: e.target.value })} sx={{ mb: 2.5 }} variant="outlined" />
                        <TextField fullWidth label="Razorpay Secret" type="password" value={adminSettings.razorpaySecret || ''} onChange={e => setAdminSettings({ ...adminSettings, razorpaySecret: e.target.value })} sx={{ mb: 2.5 }} />
                        <TextField fullWidth label="Manual Payment Link" value={adminSettings.paymentLink || ''} onChange={e => setAdminSettings({ ...adminSettings, paymentLink: e.target.value })} />
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Typography variant="overline" sx={{ fontWeight: 900, color: 'primary.main', display: 'block', mb: 1 }}>Financial Defaults</Typography>
                        <TextField fullWidth label="GST / Tax Rate (%)" type="number" value={adminSettings.taxRate || 18} onChange={e => setAdminSettings({ ...adminSettings, taxRate: e.target.value })} sx={{ mb: 2.5 }} />
                        <TextField fullWidth label="Support Contact Email" value={adminSettings.supportEmail || ''} onChange={e => setAdminSettings({ ...adminSettings, supportEmail: e.target.value })} />
                      </Grid>

                      <Grid item xs={12}>
                        <Typography variant="overline" sx={{ fontWeight: 900, color: 'primary.main', display: 'block', mb: 1 }}>Global Announcements</Typography>
                        <TextField fullWidth multiline rows={4} label="System-wide Notice (HTML Supported)" 
                          placeholder="e.g. <b>Alert:</b> Server maintenance scheduled for 10 PM IST."
                          value={adminSettings.announcement || ''} 
                          onChange={e => setAdminSettings({ ...adminSettings, announcement: e.target.value })} />
                      </Grid>
                    </Grid>

                    <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button variant="contained" size="large" startIcon={<SaveIcon />} onClick={handleUpdateSettings}
                        sx={{ borderRadius: '14px', px: 6, py: 1.8, fontWeight: 900, boxShadow: '0 10px 20px rgba(59, 130, 246, 0.3)' }}>
                        Apply Changes
                      </Button>
                    </Box>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                   <Paper sx={{ p: 4, borderRadius: '24px', height: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Typography fontWeight={900} variant="h6">Active Plans</Typography>
                      <Button size="small" startIcon={<AddIcon />} variant="contained" sx={{ borderRadius: '8px' }} onClick={() => setPlanDialog({ open: true, mode: 'create', data: { name: '', pricePerDevice: '', billingCycle: 'MONTHLY' } })}>New Plan</Button>
                    </Box>
                     {plans.map((p) => (
                       <Box key={p.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 2, borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
                         <Box>
                           <Typography fontWeight={800} variant="body2">{p.name}</Typography>
                           <Typography variant="caption" sx={{ opacity: 0.5 }}>₹{p.pricePerDevice} · {p.billingCycle}</Typography>
                         </Box>
                         <Chip label="LIVE" color="success" size="small" sx={{ fontWeight: 900, fontSize: '0.6rem' }} />
                       </Box>
                     ))}
                   </Paper>
                </Grid>
              </Grid>
            )}

            {/* ─── TAB 5: Security / MFA ─── */}
            {tab === 5 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}><MfaSetup onEnabled={fetchAdminData} /></Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 4, borderRadius: '24px', height: '100%' }}>
                    <Typography fontWeight={950} variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <ShieldIcon color="primary" /> Enterprise Security Policy
                    </Typography>
                    {[
                      { label: 'Force Account Lockout (5 attempts)', enabled: true },
                      { label: 'Intelligent Session Expiry (15m)', enabled: true },
                      { label: 'Strict Admin MFA Enforcement', enabled: false },
                      { label: 'Real-time Audit Ledger Recording', enabled: true },
                    ].map((item, i) => (
                      <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2.5, borderBottom: '1px solid #f1f5f9' }}>
                        <Typography variant="body2" fontWeight={700} color="#475569">{item.label}</Typography>
                        <Switch defaultChecked={item.enabled} color="primary" />
                      </Box>
                    ))}
                    <Box sx={{ mt: 4, p: 2, bgcolor: '#fff7ed', borderRadius: '12px', border: '1px solid #ffedd5' }}>
                      <Typography variant="caption" color="#9a3412" fontWeight={800}>SECURITY ADVISORY</Typography>
                      <Typography variant="body2" sx={{ color: '#c2410c', mt: 0.5, lineHeight: 1.4 }}>
                        Administrative sessions are inherently high-risk. Ensure MFA is enabled for all admin accounts to prevent unauthorized platform access.
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            )}
            </Box>
          </>
        ) : (
          /* ─── User View ─── */
          <Box>
            {adminSettings.announcement && (
              <Alert severity="info" sx={{ mb: 3, borderRadius: '16px', border: '1px solid #3b82f640', bgcolor: '#eff6ff', '& .MuiAlert-message': { fontWeight: 600 } }}>
                <span dangerouslySetInnerHTML={{ __html: adminSettings.announcement }} />
              </Alert>
            )}
            <Grid container spacing={4}>
              <Grid item xs={12} md={8}>
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }}>
                  <Paper sx={{ 
                    p: 4, 
                    borderRadius: '32px', 
                    mb: 4, 
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)', 
                    backdropFilter: 'blur(20px)',
                    color: 'white', 
                    position: 'relative', 
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
                  }}>
                      <Box sx={{ position: 'absolute', top: -30, right: -30, opacity: 0.15, fontSize: 160, transform: 'rotate(-15deg)' }}><DirectionsCarIcon fontSize="inherit" /></Box>
                      <Typography variant="h5" fontWeight={900} sx={{ letterSpacing: '-0.5px' }}>Subscription Intelligence</Typography>
                      <Divider sx={{ my: 2.5, borderColor: 'rgba(255,255,255,0.1)' }} />
                      
                      <Grid container spacing={3}>
                        {[
                          { label: 'Current Plan', value: bill?.activePlan || 'Standard', isChip: true, color: '#3b82f6' },
                          { label: 'Fleet Units', value: bill?.fleetSize || 0 },
                          { label: 'System Status', value: bill?.status || 'ACTIVE', isChip: true, color: bill?.status === 'ACTIVE' ? '#10b981' : '#ef4444' },
                          { label: 'Time Remaining', value: `${bill?.daysRemaining}d`, highlight: bill?.daysRemaining < 5 }
                        ].map((item, i) => (
                          <Grid item xs={6} sm={3} key={i}>
                            <Typography variant="caption" sx={{ opacity: 0.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>{item.label}</Typography>
                            {item.isChip ? (
                              <Chip label={item.value} size="small" sx={{ bgcolor: item.color, color: 'white', fontWeight: 900, mt: 0.5, borderRadius: '8px' }} />
                            ) : (
                              <Typography variant="h5" fontWeight={900} sx={{ mt: 0.5, color: item.highlight ? '#f59e0b' : 'inherit' }}>{item.value}</Typography>
                            )}
                          </Grid>
                        ))}
                      </Grid>

                        <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
                          <Button 
                             variant="contained" 
                             fullWidth={isMobile}
                             sx={{ 
                               bgcolor: '#3b82f6', 
                               '&:hover': { bgcolor: '#2563eb', transform: 'translateY(-2px)' }, 
                               fontWeight: 800, 
                               borderRadius: '14px',
                               px: 4,
                               py: 1.5,
                               boxShadow: '0 10px 20px rgba(59, 130, 246, 0.3)',
                               transition: 'all 0.3s'
                             }} 
                             onClick={() => showFeedback('Redirecting to secure gateway...', 'info')}
                           >
                             Renew Subscription
                           </Button>
                          <Button 
                             variant="outlined" 
                             fullWidth={isMobile}
                             sx={{ 
                               borderColor: 'rgba(255,255,255,0.2)', 
                               color: 'white', 
                               '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.05)' }, 
                               fontWeight: 800, 
                               borderRadius: '14px',
                               px: 4,
                               transition: 'all 0.3s'
                             }}
                             onClick={() => setUpgradeDialog(true)}
                           >
                             Upgrade Plan
                           </Button>
                        </Box>
                  </Paper>
                </motion.div>

                <Typography variant="h6" fontWeight={900} sx={{ mb: 2.5, display: 'flex', alignItems: 'center', gap: 1.5, color: '#1e293b' }}>
                  <ReceiptLongIcon color="primary" /> Transaction Archives
                </Typography>
                <Paper sx={{ borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                    <TableContainer>
                        <Table>
                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                            <TableRow>
                            {['Invoice #', 'Date', 'Plan', 'Amount', 'Status', 'Action'].map(h => (
                              <TableCell key={h} sx={{ fontWeight: 800, color: '#475569', py: 2.5 }}>{h}</TableCell>
                            ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {(bill?.history || []).map((inv, i) => (
                            <TableRow key={i} hover>
                                <TableCell sx={{ fontWeight: 700, color: '#3b82f6' }}>{inv.invoiceId}</TableCell>
                                <TableCell>{fmtDate(inv.createdAt)}</TableCell>
                                <TableCell>{(inv.planId || 'MONTHLY').toUpperCase()}</TableCell>
                                <TableCell sx={{ fontWeight: 900 }}>{fmtCurrency(inv.price)}</TableCell>
                                <TableCell><Chip label="PAID" color="success" size="small" sx={{ fontWeight: 700 }} /></TableCell>
                                <TableCell><IconButton onClick={() => setSelectedInvoice(inv)}><ReceiptIcon /></IconButton></TableCell>
                            </TableRow>
                            ))}
                            {(!bill?.history?.length) && <TableRow><TableCell colSpan={6} sx={{ textAlign: 'center', py: 5, opacity: 0.4 }}>No invoices found in registry.</TableCell></TableRow>}
                        </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <MfaSetup onEnabled={() => fetchAdminData()} />
                    
                    <Paper sx={{ p: 3, borderRadius: '20px' }}>
                        <Typography fontWeight={800} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}><SecurityIcon color="primary" /> Help & Support</Typography>
                        <Typography variant="body2" sx={{ opacity: 0.6, mb: 2 }}>Need assistance with your fleet or billing? Our team is here to help.</Typography>
                        <Button fullWidth variant="outlined" sx={{ borderRadius: '10px', fontWeight: 700 }} href={`mailto:${adminSettings.supportEmail || 'support@geosurepath.com'}`}>Contact Support</Button>
                    </Paper>

                    <Paper sx={{ p: 3, borderRadius: '20px', bgcolor: '#f8fafc', border: '1px dashed #cbd5e1' }}>
                        <Typography variant="caption" fontWeight={800} color="textSecondary" sx={{ display: 'block', mb: 1 }}>ACCOUNT SECURITY</Typography>
                        <Typography variant="body2" fontWeight={600}>Verified Account</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.5 }}>Your identity is confirmed and your fleet data is encrypted.</Typography>
                    </Paper>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}
      </Container>

      {/* ─── Dialogs ─── */}
      {/* Edit User Dialog */}
      <Dialog open={Boolean(editingUser)} onClose={() => setEditingUser(null)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: '24px' } }}>
        <DialogTitle sx={{ fontWeight: 900 }}>Manage: {editingUser?.email}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Activation Status</InputLabel>
              <Select value={editForm.isActive ? 'ACTIVE' : 'SUSPENDED'} label="Activation Status" onChange={e => setEditForm({ ...editForm, isActive: e.target.value === 'ACTIVE' })}>
                <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                <MenuItem value="SUSPENDED">SUSPENDED</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Subscription Plan</InputLabel>
              <Select value={editForm.planId} label="Subscription Plan" onChange={e => setEditForm({ ...editForm, planId: e.target.value })}>
                {plans.map(p => (
                    <MenuItem key={p.id} value={p.id}>{p.name} (₹{p.pricePerDevice}/{p.billingCycle})</MenuItem>
                ))}
              </Select>
            </FormControl>
            {editForm.planId && (
                <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b' }}>CALCULATED PAYABLE AMOUNT</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                        <Typography variant="h6" fontWeight={900} color="primary">
                            {fmtCurrency((plans.find(p => p.id === editForm.planId)?.pricePerDevice || 0) * (editingUser?.fleetSize || 1))}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.5 }}>for {editingUser?.fleetSize || 1} units</Typography>
                    </Box>
                </Box>
            )}
            <TextField fullWidth label="New Expiry Date" type="date" value={editForm.expiresAt} onChange={e => setEditForm({ ...editForm, expiresAt: e.target.value })} InputLabelProps={{ shrink: true }} />
            
            <FormControlLabel
              control={<Switch checked={editForm.hardlockBypass} onChange={e => setEditForm({ ...editForm, hardlockBypass: e.target.checked })} color="secondary" />}
              label={<Typography variant="body2" fontWeight={700}>Administrative Hardlock Bypass (VIP Override)</Typography>}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setEditingUser(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveUser} sx={{ borderRadius: '10px', fontWeight: 700 }}>Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* Onboard Dialog */}
      <Dialog open={onboardDialog} onClose={() => setOnboardDialog(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '24px' } }}>
        <DialogTitle sx={{ fontWeight: 900 }}>Add New User</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <TextField fullWidth label="Full Name" value={onboardData.name} onChange={e => setOnboardData({ ...onboardData, name: e.target.value })} />
            <TextField fullWidth label="Email Address" value={onboardData.email} onChange={e => setOnboardData({ ...onboardData, email: e.target.value })} />
            <TextField fullWidth label="Temp Password" type="password" value={onboardData.password} onChange={e => setOnboardData({ ...onboardData, password: e.target.value })} />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select value={onboardData.role} label="Role" onChange={e => setOnboardData({ ...onboardData, role: e.target.value })}>
                <MenuItem value="CLIENT">CLIENT</MenuItem>
                <MenuItem value="MANAGER">MANAGER</MenuItem>
                <MenuItem value="ADMIN">ADMIN</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOnboardDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleOnboard} disabled={onboarding} sx={{ borderRadius: '10px', fontWeight: 700 }}>
            {onboarding ? <CircularProgress size={20} color="inherit" /> : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Provision Dialog */}
      <Dialog open={provisionDialog.open} onClose={() => setProvisionDialog({ open: false, user: null, text: '' })} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '24px' } }}>
        <DialogTitle sx={{ fontWeight: 900 }}>Provision Devices for {provisionDialog.user?.email}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, opacity: 0.7 }}>One device per line: <code>Device Name, Unique ID</code></Typography>
          <TextField fullWidth multiline rows={6} placeholder="Car 1, 1234567890&#10;Truck A, 9876543210" value={provisionDialog.text} onChange={e => setProvisionDialog({ ...provisionDialog, text: e.target.value })} variant="filled" sx={{ fontFamily: 'monospace' }} />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setProvisionDialog({ open: false, user: null, text: '' })}>Cancel</Button>
          <Button variant="contained" onClick={handleBulkProvision} sx={{ borderRadius: '10px', fontWeight: 700 }}>Provision Devices</Button>
        </DialogActions>
      </Dialog>

      {/* Upgrade Plan Dialog */}
      <PlanUpgradeDialog open={upgradeDialog} onClose={() => setUpgradeDialog(false)} plans={bill?.plans || []} currentFleetSize={bill?.fleetSize || 1} onUpgrade={handleUpgradePlan} />

      {/* Invoice Dialog */}
      <InvoiceDialog open={Boolean(selectedInvoice)} onClose={() => setSelectedInvoice(null)} invoice={selectedInvoice} />

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} sx={{ borderRadius: '12px', fontWeight: 700 }} onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default BillingPage;
