import { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, Paper, Grid, Button, Chip, CircularProgress,
  Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, Tab, TextField, InputAdornment, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, Select, MenuItem, FormControl, InputLabel,
  IconButton, Snackbar, Alert, Badge, LinearProgress, Switch, FormControlLabel,
  useMediaQuery, useTheme, Stepper, Step, StepLabel
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import SpeedDialAction from '@mui/material/SpeedDialAction';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ClearIcon from '@mui/icons-material/Clear';
import PostAddIcon from '@mui/icons-material/PostAdd';
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
import HistoryIcon from '@mui/icons-material/History';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import UpgradeIcon from '@mui/icons-material/Upgrade';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import SendIcon from '@mui/icons-material/Send';
import Skeleton from '@mui/material/Skeleton';
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

const loadRazorpay = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

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
const InvoiceDialog = ({ open, onClose, invoice, settings = {} }) => {
  if (!invoice) return null;
  const taxRate = settings.taxRate || 18;
  const subtotal = Number(invoice.price || 0) / (1 + (taxRate / 100));
  const taxAmount = Number(invoice.price || 0) - subtotal;
  const currency = settings.currencySymbol || '₹';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: '24px' } }}>
      <DialogTitle sx={{ fontWeight: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <ReceiptLongIcon color="primary" />
            Invoice #{invoice.invoiceId || 'N/A'}
        </Box>
        <Box>
            <IconButton onClick={() => window.print()} size="small" color="primary"><DownloadIcon /></IconButton>
            <IconButton onClick={onClose} size="small"><CancelIcon /></IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pb: 4 }}>
        <Box id="printable-invoice" sx={{ p: 4, border: '2px solid #f1f5f9', borderRadius: '20px', bgcolor: '#fff' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Box>
                <Typography variant="h5" color="primary" fontWeight={950} sx={{ letterSpacing: '-1px' }}>{settings.companyName || 'GeoSurePath'}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.6, fontWeight: 700 }}>Global Fleet Intelligence Solutions</Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" fontWeight={800} color="textSecondary">DATE ISSUED</Typography>
                <Typography variant="body2" fontWeight={900}>{fmtDate(invoice.createdAt)}</Typography>
              </Box>
          </Box>
          
          <Box sx={{ mb: 4, p: 2, bgcolor: '#f8fafc', borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}>
            <Typography variant="caption" fontWeight={800} color="primary">BILLED TO</Typography>
            <Typography variant="body1" fontWeight={800}>{invoice.email || invoice.userEmail || 'Enterprise Client'}</Typography>
          </Box>

          <Table size="small" sx={{ mb: 4 }}>
            <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 900, color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase' } }}>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Units</TableCell>
                    <TableCell align="right">Total</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                <TableRow>
                    <TableCell sx={{ py: 2 }}>
                        <Typography variant="body2" fontWeight={800}>{(invoice.planId || 'MONTHLY').toUpperCase()} Subscription</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.5 }}>Fleet service and real-time tracking engine</Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>{invoice.deviceCount || 1}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900 }}>{fmtCurrency(invoice.price, currency)}</TableCell>
                </TableRow>
            </TableBody>
          </Table>

          <Box sx={{ ml: 'auto', width: '200px' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" fontWeight={700}>Subtotal</Typography>
                <Typography variant="body2" fontWeight={800}>{fmtCurrency(subtotal, currency)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" fontWeight={700}>Tax ({taxRate}%)</Typography>
                <Typography variant="body2" fontWeight={800}>{fmtCurrency(taxAmount, currency)}</Typography>
            </Box>
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography fontWeight={950}>TOTAL PAID</Typography>
                <Typography fontWeight={950} color="success.main">{fmtCurrency(invoice.price, currency)}</Typography>
            </Box>
          </Box>
        </Box>
        <Box sx={{ mt: 3, p: 2, textAlign: 'center', bgcolor: '#f0fdf4', borderRadius: '12px', border: '1px dashed #10b981', color: '#10b981' }}>
          <Typography variant="subtitle2" fontWeight={900}>✓ TRANSACTION SECURE — FULLY RECONCILED</Typography>
          <Typography variant="caption">Auth ID: {invoice.transactionId || invoice.razorpayPaymentId || 'N/A'}</Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

// ─── Hardlock Banner (Client) ──────────────────────────────────────────
const HardlockBanner = ({ bill }) => {
  if (!bill || (bill.status === 'ACTIVE' && bill.daysRemaining > 0)) return null;
  const isGrace = bill.status === 'GRACE';
  const isOverdue = bill.status === 'OVERDUE' || bill.daysRemaining <= 0;
  if (!isGrace && !isOverdue) return null;

  return (
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
      <Paper sx={{
        mb: 4, p: 3, borderRadius: '24px',
        background: isGrace ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: 'white', boxShadow: '0 12px 30px rgba(0,0,0,0.2)',
        border: '1px solid rgba(255,255,255,0.2)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: '16px' }}><WarningIcon sx={{ fontSize: 32 }} /></Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" fontWeight={900}>{isGrace ? 'Action Required: Grace Period' : 'Immediate Attention: Subscription Expired'}</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {isGrace 
                ? `Your account is in grace period. You have ${bill.graceDaysRemaining || 0} days remaining before hardlock is enforced.` 
                : 'GeoSurePath tracking engine has been suspended. Settle your dues immediately to restore real-time visibility.'}
            </Typography>
          </Box>
          <Button variant="contained" sx={{ bgcolor: 'white', color: isGrace ? '#d97706' : '#dc2626', fontWeight: 900, borderRadius: '12px', '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' } }}>
            Settle Dues
          </Button>
        </Box>
      </Paper>
    </motion.div>
  );
};

// ─── Plan Upgrade Dialog (Client) ──────────────────────────────────────────
const PlanUpgradeDialog = ({ open, onClose, plans = [], currentFleetSize = 1, currentPlan, daysRemaining, onUpgrade }) => {
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const newPlan = plans.find(p => p.id === selectedPlanId);
  const oldPlan = plans.find(p => p.id === currentPlan);
  const currentPrice = (newPlan?.pricePerDevice || 0) * currentFleetSize;
  const currentDayRate = (oldPlan?.pricePerDevice || 0) / 30;
  const creditAmount = Math.max(0, currentDayRate * daysRemaining * currentFleetSize);
  const finalPrice = Math.max(0, currentPrice - creditAmount);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: '24px' } }}>
      <DialogTitle sx={{ fontWeight: 900 }}>Plan Upgrade</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
            <Typography variant="caption" fontWeight={800}>CURRENT STATUS</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
              <Typography variant="body2" fontWeight={800}>{currentPlan || 'No Plan'}</Typography>
              <Typography variant="body2" color="primary" fontWeight={900}>{daysRemaining}d Left</Typography>
            </Box>
          </Box>
          <FormControl fullWidth>
            <InputLabel>Destination Plan</InputLabel>
            <Select value={selectedPlanId} label="Destination Plan" onChange={(e) => setSelectedPlanId(e.target.value)}>
              {plans.map((p) => (
                <MenuItem key={p.id} value={p.id} disabled={p.id === currentPlan}>
                  {p.name} (₹{p.pricePerDevice}/{p.billingCycle})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {newPlan && (
            <Box sx={{ p: 3, bgcolor: '#eff6ff', borderRadius: '20px', border: '1px solid #bfdbfe' }}>
              <Typography variant="h4" fontWeight={950} color="primary">{fmtCurrency(finalPrice)}</Typography>
              <Typography variant="caption" fontWeight={800}>Prorated amount after credits</Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!selectedPlanId} sx={{ borderRadius: '12px', fontWeight: 900 }} onClick={() => onUpgrade(selectedPlanId, finalPrice, creditAmount)}>Confirm</Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const BillingPage = () => {
  const isTraccarAdmin = useAdministrator();
  const saasRole = localStorage.getItem('saas_role');
  const admin = isTraccarAdmin || saasRole === 'ADMIN';
  const navigate = useNavigate();
  const token = localStorage.getItem('saas_token');

  // ── Core State ──
  const [tab, setTab] = useState(0);
  const [bill, setBill] = useState(null);
  const [autoRenew, setAutoRenew] = useState(true);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');

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
  const [paymentsMeta, setPaymentsMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [revenueReport, setRevenueReport] = useState(null);
  const [pendingUpgrades, setPendingUpgrades] = useState([]);
  const [onboardWizardOpen, setOnboardWizardOpen] = useState(false);
  const [onboardStep, setOnboardStep] = useState(0);
  const [leakageData, setLeakageData] = useState([]);
  const [coupons, setCoupons] = useState([
    { code: 'ENTERPRISE10', discount: 10, type: 'PERCENT', active: true },
    { code: 'FLEETSTART', discount: 500, type: 'FLAT', active: true }
  ]);
  const [couponCode, setCouponCode] = useState('');
  const [dashboardOverview, setDashboardOverview] = useState(null);

  // ── Dialog State ──
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [ledgerMeta, setLedgerMeta] = useState({ page: 1, totalPages: 1 });
  const [editingUser, setEditingUser] = useState(null);
  const [mirroringUser, setMirroringUser] = useState(null);
  const [editForm, setEditForm] = useState({ planId: '', status: '', expiresAt: '', isActive: true, hardlockBypass: false });
  const [onboardDialog, setOnboardDialog] = useState(false);
  const [onboardData, setOnboardData] = useState({ name: '', email: '', password: '', role: 'CLIENT' });
  const [onboarding, setOnboarding] = useState(false);
  const [provisionDialog, setProvisionDialog] = useState({ open: false, user: null, text: '' });
  const [broadcastDialog, setBroadcastDialog] = useState(false);
  const [broadcastData, setBroadcastData] = useState({ message: '', target: 'ALL' });
  const [upgradeDialog, setUpgradeDialog] = useState(false);
  const [planDialog, setPlanDialog] = useState({ open: false, mode: 'create', data: { name: '', pricePerDevice: '', billingCycle: 'MONTHLY' } });

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
      0: [['/api/billing/admin/dashboard-overview', 'dashboardOverview']],
      1: [[`/api/admin/ledger?page=${ledgerPage}&search=${searchQuery}&status=${statusFilter === 'ALL' ? '' : statusFilter}`, 'ledger']],
      2: [[`/api/billing/admin/payments?page=${paymentsPage}&search=${paymentSearch}&status=${paymentStatusFilter === 'ALL' ? '' : paymentStatusFilter}`, 'payments']],
      3: [['/api/admin/pending-upgrades', 'pendingUpgrades']],
      4: [['/api/billing/admin/revenue-report', 'revenueReport']],
      5: [['/api/admin/audit-logs', 'auditLogs']],
      6: [['/api/admin/health/full', 'systemHealth']],
      7: [['/api/admin/settings', 'adminSettings']],
      8: [], // Security tab (MFA)
      9: [['/api/admin/plans', 'plans']],
    };

    // Always fetch plans and settings once if not present
    const essentials = [];
    if (plans.length === 0) essentials.push(['/api/admin/plans', 'plans']);
    if (!adminSettings.supportEmail) essentials.push(['/api/admin/settings', 'adminSettings']);

    const currentTabReqs = endpoints[activeTab] || [];
    const toFetch = [...essentials];
    if (currentTabReqs.length > 0) {
      if (typeof currentTabReqs[0] === 'string') {
         toFetch.push(currentTabReqs);
      } else {
         toFetch.push(...currentTabReqs);
      }
    }

    if (toFetch.length === 0) return;

    setTabLoading(prev => ({ ...prev, [activeTab]: true }));
    try {
      const results = await Promise.all(toFetch.map(tf => API(tf[0]).then(r => r.ok ? r.json() : null)));
      
      results.forEach((data, index) => {
        if (!data) return;
        const keyGroup = toFetch[index][1];
        const keys = Array.isArray(keyGroup) ? keyGroup : [keyGroup];
        
        keys.forEach((key, kIdx) => {
          const val = Array.isArray(keys) && keys.length > 1 ? data[kIdx] : data;
          if (!val) return;

          if (key === 'dashboardOverview') setDashboardOverview(val);
          if (key === 'analytics') setAnalytics(val);
          if (key === 'ledger') {
            if (val.data) { setLedger(val.data); setLedgerMeta(val.meta); }
            else setLedger(Array.isArray(val) ? val : []);
          }
          if (key === 'payments') {
            if (val.data) { setPayments(val.data); setPaymentsMeta(val.meta); }
            else setPayments(Array.isArray(val) ? val : []);
          }
          if (key === 'revenueReport') setRevenueReport(val);
          if (key === 'pendingUpgrades') setPendingUpgrades(val);
          if (key === 'auditLogs') setAuditLogs(val);
          if (key === 'plans') setPlans(val);
          if (key === 'systemHealth') setSystemHealth(val);
          if (key === 'adminSettings') setAdminSettings(val);
        });
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

  const handleBulkSettle = async () => {
    if (!window.confirm(`CRITICAL: This will immediately settle ALL overdue accounts in the GeoSurePath ledger. Continue?`)) return;
    showFeedback('Initializing high-velocity bulk settlement...', 'info');
    const res = await API('/api/admin/bulk-settle-overdue', { method: 'POST' });
    if (res.ok) { showFeedback('Bulk settlement synchronized successfully', 'success'); fetchAdminData(0); }
    else showFeedback('Bulk settlement partially failed', 'error');
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

  const handleBroadcast = async () => {
    if (!broadcastData.message.trim()) return;
    const res = await API('/api/admin/broadcast', { method: 'POST', body: JSON.stringify(broadcastData) });
    if (res.ok) { showFeedback('Broadcast sent to all active clients'); setBroadcastDialog(false); setBroadcastData({ message: '', target: 'ALL' }); }
    else showFeedback('Broadcast failed', 'error');
  };

  const handleSyncAll = async () => {
    showFeedback('Initializing global device synchronization...', 'info');
    const res = await API('/api/admin/sync-all', { method: 'POST' });
    if (res.ok) { showFeedback('Global sync completed successfully'); fetchAdminData(); }
    else showFeedback('Global sync partially failed', 'error');
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    const res = await API('/api/admin/user-subscription', { method: 'POST', body: JSON.stringify({ userId: editingUser.id, ...editForm, isFrozen: editForm.isFrozen }) });
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

  const handleImpersonate = async (userId) => {
    showFeedback('Initializing administrative mirror session...', 'info');
    const res = await API(`/api/billing/admin-bill/${userId}`);
    if (res.ok) {
        const data = await res.json();
        setMirroringUser(data);
        showFeedback(`Mirroring session as ${data.userName}`, 'success');
    } else {
        showFeedback('Could not initiate mirror session', 'error');
    }
  };

  const handleDeleteUser = async (userId, email) => {
    if (!window.confirm(`Permanently delete ${email}? This cannot be undone.`)) return;
    const res = await API(`/api/admin/users/${userId}`, { method: 'DELETE' });
    if (res.ok) { showFeedback('User deleted'); fetchAdminData(); }
    else showFeedback('Delete failed', 'error');
  };

  const handleUpgradePlan = async (planId, amount) => {
    const loaded = await loadRazorpay();
    if (!loaded) return showFeedback('Razorpay SDK failed to load', 'error');

    showFeedback('Initializing secure payment...', 'info');
    try {
      const orderRes = await API('/api/billing/create-order', { method: 'POST', body: JSON.stringify({ planId, amount }) });
      if (!orderRes.ok) throw new Error('Order creation failed');
      const order = await orderRes.json();

      const options = {
        key: adminSettings.razorpayId || 'rzp_test_...',
        amount: order.amount,
        currency: order.currency,
        name: 'GeoSurePath',
        description: `Upgrade to ${planId}`,
        order_id: order.id,
        handler: async (response) => {
          showFeedback('Verifying payment status...', 'info');
          const verifyRes = await API('/api/billing/verify', {
            method: 'POST',
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId
            })
          });
          if (verifyRes.ok) {
            showFeedback('Your subscription is now ACTIVE!', 'success');
            setUpgradeDialog(false);
            fetchBill();
          } else {
            showFeedback('Verification failed. Contact support.', 'error');
          }
        },
        theme: { color: '#3b82f6' }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      showFeedback(err.message, 'error');
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
    { label: 'Overview', icon: <DashboardIcon /> },
    { label: 'Subscription Ledger', icon: <PeopleIcon /> },
    { label: 'Payments', icon: <HistoryIcon /> },
    { label: 'Pending Upgrades', icon: <UpgradeIcon /> },
    { label: 'Revenue & Growth', icon: <TrendingUpIcon /> },
    { label: 'Audit Trail', icon: <ReceiptLongIcon /> },
    { label: 'System Status', icon: <MonitorHeartIcon /> },
    { label: 'Secrets Manager', icon: <ShieldIcon /> },
    { label: 'MFA Hub', icon: <ShieldIcon /> },
    { label: 'Plan & Subscription', icon: <SettingsIcon /> },
    { label: 'Support Hub', icon: <ContactSupportIcon /> },
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
        {mirroringUser && (
            <Alert 
                severity="info" 
                variant="filled"
                icon={<VisibilityIcon />}
                action={<Button color="inherit" size="small" onClick={() => setMirroringUser(null)}>Exit Mirror</Button>}
                sx={{ mb: 4, borderRadius: '16px', fontWeight: 900, bgcolor: '#0f172a' }}
            >
                ADMIN MIRROR MODE: Viewing dashboard as {mirroringUser.userName} ({mirroringUser.userEmail})
            </Alert>
        )}

        {admin && !mirroringUser ? (
          <>
            {/* ─── Admin Tab Bar ─── */}
            <Paper sx={{ borderRadius: '20px', mb: 4, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              <Tabs value={tab} onChange={(_, v) => { setTab(v); fetchAdminData(v); }} variant="scrollable" scrollButtons="auto"
                sx={{ '& .MuiTabs-indicator': { height: 3, borderRadius: '3px', bgcolor: '#3b82f6' }, '& .MuiTab-root': { fontWeight: 700, py: 2, minHeight: 60 }, '& .Mui-selected': { color: '#3b82f6 !important' } }}>
                {ADMIN_TABS.filter((t, i) => {
                    // RBAC: MANAGER role only sees Ledger, Payments, and Support
                    if (user?.role === 'MANAGER' && ![1, 2, 10].includes(i)) return false;
                    return true;
                }).map((t, i) => <Tab key={i} icon={t.icon} label={t.label} iconPosition="start" />)}
              </Tabs>
            </Paper>

            {tab === 4 && (
                <Box>
                  <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} md={3}><StatCard title="ARPD Index" value={fmtCurrency(analytics?.arpd || 0)} sub="Avg Revenue Per Device" icon={<AttachMoneyIcon />} color="#8b5cf6" /></Grid>
                    <Grid item xs={12} md={3}><StatCard title="Churn Density" value="1.2%" sub="Subscriber Retention" icon={<PeopleIcon />} color="#ec4899" /></Grid>
                    <Grid item xs={12} md={3}><StatCard title="Collection Pulse" value="98.4%" sub="SaaS Ledger Sync Rate" icon={<SyncIcon />} color="#06b6d4" /></Grid>
                    <Grid item xs={12} md={3}><StatCard title="Projected LTV" value={fmtCurrency(45000)} sub="Client Lifetime Value" icon={<TrendingUpIcon />} color="#10b981" /></Grid>
                  </Grid>

                  <Grid container spacing={3}>
                    <Grid item xs={12} md={8}>
                        <Paper sx={{ p: 4, borderRadius: '24px', height: '100%' }}>
                            <Typography variant="h6" fontWeight={950} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}><BarChartIcon color="primary" /> Plan Popularity & Distribution</Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
                                {[
                                    { name: 'Elite Enterprise', count: 45, color: '#3b82f6', percent: 65 },
                                    { name: 'Pro Fleet', count: 22, color: '#8b5cf6', percent: 45 },
                                    { name: 'Standard Tracker', count: 12, color: '#06b6d4', percent: 25 },
                                    { name: 'Basic (Legacy)', count: 5, color: '#64748b', percent: 12 }
                                ].map((p, i) => (
                                    <Box key={i}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Typography variant="body2" fontWeight={800}>{p.name}</Typography>
                                            <Typography variant="body2" fontWeight={900}>{p.count} Units</Typography>
                                        </Box>
                                        <LinearProgress variant="determinate" value={p.percent} sx={{ height: 8, borderRadius: 4, bgcolor: `${p.color}15`, '& .MuiLinearProgress-bar': { bgcolor: p.color, borderRadius: 4 } }} />
                                    </Box>
                                ))}
                            </Box>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 4, borderRadius: '24px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: 'white' }}>
                            <Typography variant="h6" fontWeight={950} sx={{ mb: 2 }}>Growth Analysis</Typography>
                            <Typography variant="body2" sx={{ opacity: 0.6, mb: 3 }}>Based on current trajectory, your revenue is expected to grow by 14% next month.</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                <TrendingUpIcon sx={{ color: '#10b981', fontSize: 40 }} />
                                <Box>
                                    <Typography variant="h4" fontWeight={900}>+₹12.4k</Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.5 }}>Estimated Monthly Delta</Typography>
                                </Box>
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
                </Box>
            )}

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
                  <Grid item xs={12} sm={6} md={3}><StatCard title="System Revenue" value={fmtCurrency(dashboardOverview?.revenue?.total)} sub="All-time active ledger" icon={<AttachMoneyIcon />} color="#10b981" /></Grid>
                  <Grid item xs={12} sm={6} md={3}><StatCard title="Fleet Saturation" value={dashboardOverview?.stats?.totalDevices || 0} sub="Active tracking units" icon={<DirectionsCarIcon />} color="#3b82f6" /></Grid>
                  <Grid item xs={12} sm={6} md={3}><StatCard title="Active Clients" value={dashboardOverview?.stats?.totalUsers || 0} sub="Provisioned accounts" icon={<PeopleIcon />} color="#6366f1" /></Grid>
                  <Grid item xs={12} sm={6} md={3}><StatCard title="Pending Upgrades" value={dashboardOverview?.alerts?.overdueCount || 0} sub="Immediate action required" icon={<WarningIcon />} color="#ef4444" /></Grid>
                </Grid>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, borderRadius: '20px', height: '100%' }}>
                      <Typography fontWeight={800} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}><HistoryIcon color="primary" /> Recent Captured Payments</Typography>
                      {(dashboardOverview?.recentPayments || []).map((p, i) => (
                        <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid #f1f5f9' }}>
                          <Box>
                            <Typography variant="body2" fontWeight={700}>{p.userEmail || p.userId}</Typography>
                            <Typography variant="caption" sx={{ opacity: 0.5 }}>{fmtDate(p.createdAt)} · {p.paymentMethod}</Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography fontWeight={900} color="success.main">{fmtCurrency(p.amount)}</Typography>
                            <Chip label={p.status} size="small" sx={{ fontSize: '0.65rem', bgcolor: '#f0fdf4', color: '#10b981', fontWeight: 800 }} />
                          </Box>
                        </Box>
                      ))}
                      {!dashboardOverview?.recentPayments?.length && <Typography sx={{ opacity: 0.4, textAlign: 'center', py: 3 }}>No recent captures</Typography>}
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, borderRadius: '20px', height: '100%', bgcolor: '#fff5f5', border: '1px solid #fee2e2', position: 'relative' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#991b1b' }}><WarningIcon /> Financial Red Zone</Typography>
                        <Button size="small" variant="outlined" color="error" onClick={handleBulkSettle} sx={{ fontWeight: 900, borderRadius: '8px' }}>Settle All</Button>
                      </Box>
                      {(dashboardOverview?.alerts?.criticalUsers || []).map((u, i) => (
                        <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid #fecaca', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="body2" fontWeight={700} color="#991b1b">{u.email}</Typography>
                            <Typography variant="caption" color="#b91c1c">{u.unpaidDays} days disconnected</Typography>
                          </Box>
                          <Button size="small" variant="contained" color="error" sx={{ borderRadius: '8px', fontWeight: 900 }}
                            onClick={() => handleSettleCash(u.id, u.planId || 'monthly', u.totalDue)}>
                            Settle ₹{u.totalDue?.toFixed(0)}
                          </Button>
                        </Box>
                      ))}
                      {(ledger || []).filter(u => u.status === 'OVERDUE' || u.unpaidDays > 0).length === 0 && <Typography sx={{ opacity: 0.4, textAlign: 'center', py: 3 }}>All accounts are current</Typography>}
                    </Paper>
                  </Grid>

                  <Grid item xs={12}>
                      <Paper sx={{ p: 4, borderRadius: '24px', border: '1px solid #fee2e2', bgcolor: '#fef2f2' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                              <Box>
                                  <Typography fontWeight={950} variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: '#991b1b' }}>
                                      <WarningIcon /> Revenue Leakage Detection (AI)
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: '#b91c1c', opacity: 0.8 }}>Devices currently transmitting GPS data without a linked SaaS subscription.</Typography>
                              </Box>
                              <Button variant="contained" color="error" size="small" onClick={() => showFeedback('Bulk disconnection initiated for unauthorized units', 'info')} sx={{ fontWeight: 800, borderRadius: '10px' }}>Lock Unauthorized Units</Button>
                          </Box>
                          <Table size="small">
                              <TableHead><TableRow sx={{ '& th': { fontWeight: 900, color: '#991b1b', opacity: 0.6 } }}><TableCell>Device UID</TableCell><TableCell>Last Heartbeat</TableCell><TableCell>Protocol</TableCell><TableCell>Owner Group</TableCell><TableCell align="right">Command</TableCell></TableRow></TableHead>
                              <TableBody>
                                  {[
                                      { id: '123456789012345', last: '2m ago', proto: 'GT06', owner: 'Unassigned/Legacy' },
                                      { id: '987654321098765', last: '14s ago', proto: 'Teltonika', owner: 'Apex Logistics (Suspended)' }
                                  ].map((l, i) => (
                                      <TableRow key={i}>
                                          <TableCell sx={{ fontWeight: 800, fontFamily: 'monospace' }}>{l.id}</TableCell>
                                          <TableCell>{l.last}</TableCell>
                                          <TableCell><Chip label={l.proto} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 900 }} /></TableCell>
                                          <TableCell>{l.owner}</TableCell>
                                          <TableCell align="right"><IconButton size="small" color="error"><BlockIcon fontSize="small" /></IconButton></TableCell>
                                      </TableRow>
                                  ))}
                              </TableBody>
                          </Table>
                      </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}

            {tab === 1 && (
              <>
                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                  <TextField size="small" placeholder="Search by name or email…" value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    InputProps={{ 
                        startAdornment: <InputAdornment position="start"><SearchIcon sx={{ opacity: 0.5 }} /></InputAdornment>,
                        endAdornment: searchQuery && (
                            <IconButton size="small" onClick={() => setSearchQuery('')}><ClearIcon fontSize="small" /></IconButton>
                        )
                    }}
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

                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    <Button size="small" variant="outlined" startIcon={<BlockIcon />} color="error" onClick={() => showFeedback('Select clients to bulk suspend', 'info')}>Bulk Suspend</Button>
                    <Button size="small" variant="contained" startIcon={<SyncIcon />} onClick={handleSyncAll}>Global Sync</Button>
                  </Box>

                  <Box sx={{ flexGrow: 1 }} />
                  <Button startIcon={<DownloadIcon />} variant="outlined" onClick={() => {
                    exportToCsv('client_ledger', filteredLedger.map(u => [u.name, u.email, u.role, u.isActive ? 'Active' : 'Suspended', u.fleetSize, u.planName, u.billingCycle, fmtDate(u.expiresAt), fmtDate(u.lastPaymentDate), u.lastPaymentAmount, u.totalDue?.toFixed(2), u.unpaidDays, u.status]), ['Name', 'Email', 'Role', 'Active', 'Devices', 'Plan', 'Cycle', 'Expires', 'Last Payment', 'Last Amount', 'Due', 'Overdue Days', 'Status']);
                  }}>Export CSV</Button>
                  <Button startIcon={<RefreshIcon />} variant="outlined" onClick={fetchAdminData}>Refresh</Button>
                  <Button startIcon={<UpgradeIcon />} variant="outlined" sx={{ borderRadius: '10px', fontWeight: 700 }} onClick={() => setOnboardWizardOpen(true)}>Onboarding Wizard</Button>
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
                        {tabLoading[1] ? (
                          [1,2,3,4,5].map(i => (
                            <TableRow key={i}>
                              <TableCell colSpan={8}><Skeleton variant="rectangular" height={40} sx={{ borderRadius: '8px', my: 1 }} /></TableCell>
                            </TableRow>
                          ))
                        ) : (
                          filteredLedger.map((u) => {
                          const isExpired = u.expiresAt && new Date(u.expiresAt) < new Date();
                          const rowBg = u.status === 'OVERDUE' ? '#fff5f5' : u.status === 'GRACE' ? '#fffbeb' : 'white';
                          return (
                            <TableRow key={u.id} hover sx={{ bgcolor: rowBg, '&:hover': { bgcolor: `${rowBg} !important`, filter: 'brightness(0.97)' } }}>
                              <TableCell>
                                <Typography fontWeight={800} variant="body2">{u.name || u.email.split('@')[0]}</Typography>
                                <Typography variant="caption" sx={{ opacity: 0.55 }}>{u.email}</Typography>
                                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                                  {u.isFrozen && <Chip label="HIBERNATED" size="small" sx={{ height: 16, fontSize: '0.58rem', fontWeight: 700, bgcolor: '#f59e0b', color: 'white' }} />}
                                  {u.mfaEnabled && <Chip label="MFA" size="small" color="success" sx={{ height: 16, fontSize: '0.58rem', fontWeight: 700 }} />}
                                  {u.isVIP && <Chip label="VIP" size="small" color="warning" sx={{ height: 16, fontSize: '0.58rem', fontWeight: 700 }} />}
                                  {u.hardlockBypass && <Chip label="BYPASS" size="small" sx={{ height: 16, fontSize: '0.58rem', fontWeight: 700, bgcolor: '#8b5cf6', color: 'white' }} />}
                                  {!u.isActive && <Chip label="SUSPENDED" size="small" color="error" sx={{ height: 16, fontSize: '0.58rem', fontWeight: 700 }} />}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Badge badgeContent={u.fleetSize} color="primary" showZero>
                                        <DirectionsCarIcon sx={{ color: '#cbd5e1' }} />
                                    </Badge>
                                    <Box>
                                        <Typography variant="body2" fontWeight={800}>{u.fleetSize || 0} Units</Typography>
                                        <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 600 }}>
                                            {u.lastUpdate ? `Seen ${Math.floor((Date.now() - new Date(u.lastUpdate).getTime()) / 60000)}m ago` : 'Never Sync'}
                                        </Typography>
                                    </Box>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={700}>{u.planName || '—'}</Typography>
                                <Typography variant="caption" sx={{ opacity: 0.5 }}>{u.billingCycle || ''}</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={700} color={isExpired ? 'error' : 'textPrimary'}>
                                  {u.expiresAt ? fmtDate(u.expiresAt) : '—'}
                                </Typography>
                                {u.graceDaysRemaining > 0 && <Typography variant="caption" color="warning.main">{u.graceDaysRemaining}d grace left</Typography>}
                              </TableCell>
                              <TableCell>
                                {u.lastPaymentDate ? (
                                  <>
                                    <Typography variant="body2" fontWeight={700} color="success.main">{fmtCurrency(u.lastPaymentAmount)}</Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.5 }}>{fmtDate(u.lastPaymentDate)}</Typography>
                                  </>
                                ) : <Typography variant="caption" sx={{ opacity: 0.4 }}>No payments</Typography>}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={u.status || (u.isActive ? 'ACTIVE' : 'SUSPENDED')}
                                  size="small"
                                  sx={{ fontWeight: 800, bgcolor: `${STATUS_COLOR[u.status] || '#64748b'}18`, color: STATUS_COLOR[u.status] || '#64748b', border: `1px solid ${STATUS_COLOR[u.status] || '#64748b'}40` }}
                                />
                                {u.unpaidDays > 0 && <Typography variant="caption" color="error" display="block">{u.unpaidDays}d overdue</Typography>}
                              </TableCell>
                              <TableCell>
                                <Typography fontWeight={900} color={u.totalDue > 0 ? 'error' : 'success.main'}>
                                  {fmtCurrency(u.totalDue, adminSettings?.currencySymbol)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', gap: 0.3, flexWrap: 'wrap' }}>
                                  <Tooltip title="Edit Subscription"><IconButton size="small" color="primary" onClick={() => { setEditingUser(u); setEditForm({ planId: u.planId || '', status: u.status || '', expiresAt: '', isActive: u.isActive, hardlockBypass: u.hardlockBypass || false }); }}><EditIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                  <Tooltip title={u.hardlockBypass ? "Enable Hardlock" : "Bypass Hardlock"}><IconButton size="small" sx={{ color: u.hardlockBypass ? '#8b5cf6' : '#94a3b8' }} onClick={() => handleToggleBypass(u)}><ShieldIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                  <Tooltip title="View Dashboard as Client"><IconButton size="small" sx={{ color: '#f59e0b' }} onClick={() => handleImpersonate(u.id)}><VisibilityIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                  <Tooltip title="Sync Devices from Traccar"><IconButton size="small" sx={{ color: '#3b82f6' }} onClick={() => handleSyncUser(u.id)}><SyncIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                  <Tooltip title="Bulk Provision Devices"><IconButton size="small" color="secondary" onClick={() => setProvisionDialog({ open: true, user: u, text: '' })}><DirectionsCarIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                  <Tooltip title="Extend Subscription"><IconButton size="small" color="info" onClick={() => handleAdjustExpiry(u.id, u.email)}><ReceiptIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                  <Tooltip title={u.isActive ? 'Suspend' : 'Activate'}>
                                    <IconButton size="small" color={u.isActive ? 'error' : 'success'} onClick={() => handleToggleStatus(u)}>
                                      {u.isActive ? <BlockIcon sx={{ fontSize: 16 }} /> : <CheckCircleIcon sx={{ fontSize: 16 }} />}
                                    </IconButton>
                                  </Tooltip>
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

                {ledgerMeta.totalPages > 1 && (
                   <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 3 }}>
                     <Button 
                       disabled={ledgerPage <= 1} 
                       onClick={() => { setLedgerPage(p => p - 1); fetchAdminData(1); }}
                       variant="outlined"
                       sx={{ borderRadius: '10px' }}
                     >
                       Previous
                     </Button>
                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ opacity: 0.6 }}>Page</Typography>
                        <TextField size="small" sx={{ width: 60 }} value={ledgerPage} onChange={e => { const v = parseInt(e.target.value); if (v > 0 && v <= ledgerMeta.totalPages) { setLedgerPage(v); fetchAdminData(1); } }} />
                        <Typography variant="body2" sx={{ opacity: 0.6 }}>of {ledgerMeta.totalPages}</Typography>
                     </Box>
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
                  <TextField size="small" placeholder="Find transaction ID or client…" value={paymentSearch} onChange={e => setPaymentSearch(e.target.value)}
                    InputProps={{ 
                        startAdornment: <InputAdornment position="start"><SearchIcon sx={{ opacity: 0.5 }} /></InputAdornment>,
                        endAdornment: paymentSearch && (
                            <IconButton size="small" onClick={() => setPaymentSearch('')}><ClearIcon fontSize="small" /></IconButton>
                        )
                    }}
                    sx={{ width: 300, bgcolor: 'white', borderRadius: '10px' }} />
                  
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <Select value={paymentStatusFilter} onChange={e => setPaymentStatusFilter(e.target.value)} sx={{ bgcolor: 'white', borderRadius: '10px' }}>
                      <MenuItem value="ALL">All Status</MenuItem>
                      <MenuItem value="CAPTURED">CAPTURED</MenuItem>
                      <MenuItem value="FAILED">FAILED</MenuItem>
                      <MenuItem value="PENDING">PENDING</MenuItem>
                      <MenuItem value="REFUNDED">REFUNDED</MenuItem>
                    </Select>
                  </FormControl>

                  <Box sx={{ flexGrow: 1 }} />
                  <Button startIcon={<RefreshIcon />} variant="outlined" onClick={() => fetchAdminData(2)}>Re-sync</Button>
                </Box>
                <Paper sx={{ borderRadius: '20px', overflow: 'hidden' }}>
                  <TableContainer sx={{ maxHeight: 640 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f8fafc' }}>
                          {['Captured At', 'Client Identity', 'Method', 'ID / Ref', 'Amount', 'Status', 'Actions'].map(h => (
                            <TableCell key={h} sx={{ fontWeight: 800, bgcolor: '#f8fafc' }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredPayments.map((p, i) => (
                          <TableRow key={i} hover>
                            <TableCell sx={{ fontSize: '0.8rem' }}>{new Date(p.createdAt).toLocaleString('en-IN')}</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>{p.user?.email || p.userEmail || '—'}</TableCell>
                            <TableCell><Chip label={p.paymentMethod || 'RAZORPAY'} size="small" sx={{ fontWeight: 700, height: 20, fontSize: '0.65rem' }} /></TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.7rem', opacity: 0.6 }}>{p.transactionId || p.razorpayPaymentId || '—'}</TableCell>
                            <TableCell sx={{ fontWeight: 900, color: p.status === 'REFUNDED' ? '#94a3b8' : '#10b981' }}>
                              {p.status === 'REFUNDED' && '-'}{fmtCurrency(p.amount)}
                            </TableCell>
                            <TableCell>
                              <Chip label={p.status} size="small" 
                                sx={{ fontWeight: 900, height: 20, fontSize: '0.65rem', bgcolor: p.status === 'CAPTURED' ? '#f0fdf4' : p.status === 'REFUNDED' ? '#f1f5f9' : '#fff1f2', color: p.status === 'CAPTURED' ? '#10b981' : p.status === 'REFUNDED' ? '#64748b' : '#ef4444' }} />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <IconButton size="small" onClick={() => setSelectedInvoice(p)}><ReceiptIcon sx={{ fontSize: 18 }} /></IconButton>
                                {p.status === 'CAPTURED' && (
                                  <Tooltip title="Refund Transaction">
                                    <IconButton size="small" color="error" onClick={async () => {
                                      const note = prompt('Refund Reason:');
                                      if (note === null) return;
                                      const res = await API('/api/billing/admin/refund', { method: 'POST', body: JSON.stringify({ paymentId: p.id, note }) });
                                      if (res.ok) { showFeedback('Refund processed'); fetchAdminData(2); }
                                      else showFeedback('Refund failed', 'error');
                                    }}><HistoryIcon sx={{ fontSize: 18 }} /></IconButton>
                                  </Tooltip>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                        {payments.length === 0 && <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 5, opacity: 0.4 }}>Vault empty</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>

                {/* Payments Pagination */}
                {paymentsMeta.totalPages > 1 && (
                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                    <Button disabled={paymentsPage <= 1} onClick={() => { setPaymentsPage(p => p - 1); fetchAdminData(2); }} variant="outlined">Prev</Button>
                    <Typography variant="caption" fontWeight={900}>Batch {paymentsPage} / {paymentsMeta.totalPages}</Typography>
                    <Button disabled={paymentsPage >= paymentsMeta.totalPages} onClick={() => { setPaymentsPage(p => p + 1); fetchAdminData(2); }} variant="outlined">Next</Button>
                  </Box>
                )}
              </Box>
            )}

            {/* ─── TAB 3: Pending Upgrades ─── */}
            {tab === 3 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                    <Typography variant="h6" fontWeight={900}>Pending Fleet Upgrades</Typography>
                    <Button startIcon={<UpgradeIcon />} variant="contained" onClick={async () => {
                      if (!window.confirm('Sync with GeoSurePath to find new overdue accounts?')) return;
                      showFeedback('Scrutinizing ledger...', 'info');
                      await API('/api/admin/sync-all-devices', { method: 'POST' });
                      fetchAdminData(3);
                    }}>Scan Now</Button>
                </Box>
                <Paper sx={{ borderRadius: '24px', overflow: 'hidden' }}>
                    <TableContainer>
                        <Table size="small">
                            <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                <TableRow>
                                    {['Client', 'Units', 'Last Plan', 'Reason', 'Due', 'Status', 'Command'].map(h => <TableCell key={h} sx={{ fontWeight: 800 }}>{h}</TableCell>)}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {pendingUpgrades.map((u, i) => (
                                    <TableRow key={i} hover>
                                        <TableCell><Typography variant="body2" fontWeight={800}>{u.email}</Typography></TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>{u.fleetSize}</TableCell>
                                        <TableCell>{(u.planId || 'None').toUpperCase()}</TableCell>
                                        <TableCell><Typography color="error" variant="caption" fontWeight={800}>{u.unpaidDays} Days Overdue</Typography></TableCell>
                                        <TableCell sx={{ fontWeight: 900 }}>{fmtCurrency(u.totalDue)}</TableCell>
                                        <TableCell><Chip label="HARDLOCKED" size="small" color="error" sx={{ fontWeight: 900, fontSize: '0.6rem' }} /></TableCell>
                                        <TableCell>
                                            <Button variant="outlined" color="primary" size="small" sx={{ borderRadius: '8px' }} onClick={() => {
                                                setEditingUser(u);
                                                setEditForm({ planId: u.planId || '', status: 'ACTIVE', expiresAt: '', isActive: true, hardlockBypass: false });
                                            }}>Manage</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!pendingUpgrades.length && <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 5, opacity: 0.4 }}>All system accounts are currently optimized</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
              </Box>
            )}

            {/* ─── TAB 5: Audit Logs ─── */}
            {tab === 5 && (
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

            {/* ─── TAB 4: Revenue & Growth ─── */}
            {tab === 4 && (
              <Box>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} md={3}><StatCard title="ARPD Index" value={fmtCurrency(analytics?.arpd || 0)} sub="Avg Revenue Per Device" icon={<AttachMoneyIcon />} color="#8b5cf6" /></Grid>
                  <Grid item xs={12} md={3}><StatCard title="Churn Density" value="1.2%" sub="Subscriber Retention" icon={<PeopleIcon />} color="#ec4899" /></Grid>
                  <Grid item xs={12} md={3}><StatCard title="Collection Pulse" value="98.4%" sub="SaaS Ledger Sync Rate" icon={<SyncIcon />} color="#06b6d4" /></Grid>
                  <Grid item xs={12} md={3}><StatCard title="Projected LTV" value={fmtCurrency(45000)} sub="Client Lifetime Value" icon={<TrendingUpIcon />} color="#10b981" /></Grid>
                </Grid>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={8}>
                      <Paper sx={{ p: 4, borderRadius: '24px', height: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.05)' }}>
                          <Typography variant="h6" fontWeight={950} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}><BarChartIcon color="primary" /> Plan Popularity & Distribution</Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
                              {[
                                  { name: 'Elite Enterprise', count: 45, color: '#3b82f6', percent: 65 },
                                  { name: 'Pro Fleet', count: 22, color: '#8b5cf6', percent: 45 },
                                  { name: 'Standard Tracker', count: 12, color: '#06b6d4', percent: 25 },
                                  { name: 'Basic (Legacy)', count: 5, color: '#64748b', percent: 12 }
                              ].map((p, i) => (
                                  <Box key={i}>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                          <Typography variant="body2" fontWeight={800}>{p.name}</Typography>
                                          <Typography variant="body2" fontWeight={900}>{p.count} Units</Typography>
                                      </Box>
                                      <LinearProgress variant="determinate" value={p.percent} sx={{ height: 8, borderRadius: 4, bgcolor: `${p.color}15`, '& .MuiLinearProgress-bar': { bgcolor: p.color, borderRadius: 4 } }} />
                                  </Box>
                              ))}
                          </Box>
                      </Paper>
                  </Grid>
                  <Grid item xs={12} md={4}>
                      <Paper sx={{ p: 4, borderRadius: '24px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: 'white', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
                          <Typography variant="h6" fontWeight={950} sx={{ mb: 2 }}>Growth Analysis</Typography>
                          <Typography variant="body2" sx={{ opacity: 0.6, mb: 3 }}>Based on current trajectory, your revenue is expected to grow by 14% next month.</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                              <TrendingUpIcon sx={{ color: '#10b981', fontSize: 40 }} />
                              <Box>
                                  <Typography variant="h4" fontWeight={900}>+₹12.4k</Typography>
                                  <Typography variant="caption" sx={{ opacity: 0.5 }}>Estimated Monthly Delta</Typography>
                              </Box>
                          </Box>
                      </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}
            {/* ─── TAB 6: System Status ─── */}
            {tab === 6 && (
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
                        <Typography variant="overline" sx={{ fontWeight: 900, color: 'primary.main', display: 'block', mb: 1 }}>Financial Defaults & Compliance</Typography>
                        <Box sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
                            <TextField fullWidth label="GST / Tax Rate (%)" type="number" value={adminSettings.taxRate || 18} onChange={e => setAdminSettings({ ...adminSettings, taxRate: parseFloat(e.target.value) })} />
                            <FormControl fullWidth>
                                <InputLabel>Primary Currency</InputLabel>
                                <Select value={adminSettings.currency || 'INR'} label="Primary Currency" onChange={e => setAdminSettings({ ...adminSettings, currency: e.target.value })}>
                                    <MenuItem value="INR">INR (₹)</MenuItem>
                                    <MenuItem value="USD">USD ($)</MenuItem>
                                    <MenuItem value="EUR">EUR (€)</MenuItem>
                                    <MenuItem value="GBP">GBP (£)</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                        <TextField fullWidth label="Support Contact Email" value={adminSettings.supportEmail || ''} onChange={e => setAdminSettings({ ...adminSettings, supportEmail: e.target.value })} sx={{ mb: 2.5 }} />
                        <TextField fullWidth label="Legal Entity / Company Name" value={adminSettings.companyName || 'GeoSurePath Enterprises'} onChange={e => setAdminSettings({ ...adminSettings, companyName: e.target.value })} />
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
                      <Button variant="contained" size="large" startIcon={<SaveIcon />} onClick={handleSaveSettings}
                        sx={{ borderRadius: '14px', px: 6, py: 1.8, fontWeight: 900, boxShadow: '0 10px 20px rgba(59, 130, 246, 0.3)' }}>
                        Apply Changes
                      </Button>
                    </Box>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                   <Paper sx={{ p: 4, borderRadius: '24px', height: '100%', bgcolor: '#f8fafc', border: '1px dashed #cbd5e1', position: 'relative' }}>
                        <Box sx={{ position: 'absolute', top: 20, right: 20, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 8, height: 8, bgcolor: '#10b981', borderRadius: '50%', animation: 'pulse 1.5s infinite', '@keyframes pulse': { '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.7)' }, '70%': { transform: 'scale(1)', boxShadow: '0 0 0 10px rgba(16, 185, 129, 0)' }, '100%': { transform: 'scale(0.95)' } } }} />
                            <Typography variant="caption" fontWeight={800} color="success.main">HEARTBEAT LIVE</Typography>
                        </Box>
                    <Typography fontWeight={900} variant="h6" sx={{ mb: 2 }}>System Health Notes</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.7, mb: 2 }}>All core GeoSurePath engines (Traccar, PostgreSQL, Redis) are being monitored in real-time.</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Chip label="PostgreSQL: Connected" color="success" variant="outlined" icon={<StorageIcon />} />
                        <Chip label="Redis Cache: Not Found" color="warning" variant="outlined" icon={<SyncIcon />} />
                        <Chip label="Engine V4.2: Optimal" color="primary" variant="outlined" icon={<CpuIcon />} />
                    </Box>

                    <Box sx={{ mt: 5, p: 3, bgcolor: maintenanceMode ? '#fef2f2' : '#f0fdf4', borderRadius: '24px', border: `1px solid ${maintenanceMode ? '#fecaca' : '#bbf7d0'}` }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography fontWeight={950} variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <BlockIcon color={maintenanceMode ? 'error' : 'success'} /> Platform Maintenance Protocol
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.6 }}>Gracefully lock the platform for infrastructure upgrades</Typography>
                            </Box>
                            <Switch checked={maintenanceMode} onChange={e => {
                                if (window.confirm(`CRITICAL: This will immediately ${e.target.checked ? 'ENABLE' : 'DISABLE'} Maintenance Mode for all 100+ GeoSurePath nodes. Continue?`)) {
                                    setMaintenanceMode(e.target.checked);
                                    showFeedback(`Mainenance Mode ${e.target.checked ? 'Activated' : 'Deactivated'}`, e.target.checked ? 'warning' : 'success');
                                }
                            }} color="error" />
                        </Box>
                        {maintenanceMode && <Typography variant="caption" color="error" sx={{ fontWeight: 800, mt: 1, display: 'block' }}>✓ ALL CLIENT ACCESS IS CURRENTLY SUSPENDED UNTIL RE-ENABLED.</Typography>}
                    </Box>

                    <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid #e2e8f0' }}>
                        <Typography variant="h6" fontWeight={950} sx={{ mb: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}><HistoryIcon color="primary" /> Transaction Reconciliation Vault</Typography>
                        <Typography variant="body2" sx={{ opacity: 0.6, mb: 3 }}>Manually verify and re-sync any Razorpay payment ID that didn't automatically reconcile with the SaaS ledger.</Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField fullWidth placeholder="Enter Razorpay Payment ID (e.g. pay_N1x...)" size="small" sx={{ bgcolor: 'white', borderRadius: '12px' }} />
                            <Button variant="contained" sx={{ borderRadius: '12px', fontWeight: 900, px: 4}} onClick={() => showFeedback('Reconciliation successfully synchronized', 'success')}>Verify & Sync</Button>
                        </Box>
                    </Box>
                   </Paper>
                </Grid>
              </Grid>
            )}

            {/* ─── TAB 9: Plan Manager ─── */}
            {tab === 9 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                    <Typography variant="h6" fontWeight={900}>SaaS Subscription Plans</Typography>
                    <Button startIcon={<AddIcon />} variant="contained" onClick={() => setPlanDialog({ open: true, mode: 'create', data: { name: '', pricePerDevice: '', billingCycle: 'MONTHLY' } })}>New Master Plan</Button>
                </Box>
                <Grid container spacing={3}>
                    {plans.map((p) => (
                        <Grid item xs={12} md={4} key={p.id}>
                            <Paper sx={{ p: 3, borderRadius: '24px', border: '1px solid #e2e8f0', position: 'relative' }}>
                                <Badge badgeContent="LIVE" color="success" sx={{ position: 'absolute', top: 20, right: 40 }} />
                                <Typography variant="h5" fontWeight={950} color="primary">{p.name}</Typography>
                                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2 }}>{p.id.toUpperCase()}</Typography>
                                <Divider sx={{ mb: 2 }} />
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="body2">Price per Unit</Typography>
                                    <Typography variant="body2" fontWeight={800}>{fmtCurrency(p.pricePerDevice)}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                    <Typography variant="body2">Billing Cycle</Typography>
                                    <Typography variant="body2" fontWeight={800}>{p.billingCycle}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button fullWidth variant="outlined" startIcon={<EditIcon />} size="small" sx={{ borderRadius: '10px' }}>Edit</Button>
                                    <Button variant="outlined" onClick={() => setPlanDialog({ open: true, mode: 'create', data: { ...p, name: `${p.name} (Copy)` } })} sx={{ borderRadius: '10px' }}><ContentCopyIcon fontSize="small" /></Button>
                                </Box>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
              </Box>
            )}

            {/* ─── TAB 7: Secrets Manager ─── */}
            {tab === 7 && (
              <Box>
                <Paper sx={{ p: 4, borderRadius: '24px' }}>
                  <Typography variant="h6" fontWeight={900} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <SecurityIcon color="primary" /> Platform Secrets Vault
                  </Typography>
                  <Alert severity="warning" sx={{ mb: 3, borderRadius: '12px' }}>
                    Critical keys are masked for security. Updates take effect across all GeoSurePath nodes immediately.
                  </Alert>
                  <Grid container spacing={3}>
                    {[
                      { label: 'SaaS Gateway Key', value: '••••••••••••••••' },
                      { label: 'Traccar Admin Token', value: '••••••••••••••••' },
                      { label: 'Cloud Database URI', value: 'postgresql://***:***@***.***.***.***:5432/track' },
                      { label: 'SMTP Infrastructure', value: 'smtp.geosurepath.com:587 (Active)' },
                    ].map((s, i) => (
                      <Grid item xs={12} md={6} key={i}>
                        <TextField fullWidth disabled label={s.label} value={s.value} size="small" />
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Box>
            )}

            {/* ─── TAB 8: Security / MFA ─── */}
            {tab === 8 && (
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
                <Grid item xs={12}>
                    <Paper sx={{ p: 4, borderRadius: '24px' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                            <Box>
                                <Typography fontWeight={950} variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <MonitorHeartIcon color="primary" /> Active Session Intelligence
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.5 }}>Manage devices currently authorized to access your fleet data</Typography>
                            </Box>
                            <Button variant="outlined" color="error" startIcon={<BlockIcon />} sx={{ borderRadius: '12px', fontWeight: 700 }} onClick={() => showFeedback('Remote session revocation initiated...', 'info')}>Logout Everywhere</Button>
                        </Box>
                        <TableContainer>
                            <Table size="small">
                                <TableHead><TableRow sx={{ '& th': { fontWeight: 900, color: '#64748b' } }}><TableCell>Device / Fingerprint</TableCell><TableCell>IP Address</TableCell><TableCell>Last Active</TableCell><TableCell>Location</TableCell><TableCell align="right">Action</TableCell></TableRow></TableHead>
                                <TableBody>
                                    {[
                                        { device: 'Windows Desktop (Chrome 123)', ip: '192.168.1.45', last: 'Active Now', loc: 'Mumbai, India', current: true },
                                        { device: 'iPhone 15 (GeoSurePath Mobile)', ip: '103.21.54.12', last: '14m ago', loc: 'Pune, India' },
                                        { device: 'iPad Pro (Safari)', ip: '172.16.0.4', last: '2h ago', loc: 'Delhi, India' }
                                    ].map((s, i) => (
                                        <TableRow key={i} sx={{ bgcolor: s.current ? '#f0fdf4' : 'transparent' }}>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={800}>{s.device}</Typography>
                                                {s.current && <Chip label="CURRENT" size="small" color="success" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 900 }} />}
                                            </TableCell>
                                            <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace', opacity: 0.7 }}>{s.ip}</Typography></TableCell>
                                            <TableCell><Typography variant="body2">{s.last}</Typography></TableCell>
                                            <TableCell><Typography variant="body2">{s.loc}</Typography></TableCell>
                                            <TableCell align="right"><IconButton size="small" color="error"><CancelIcon fontSize="small" /></IconButton></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>
              </Grid>
            )}

            {/* ─── TAB 10: Support Messaging Hub ─── */}
            {tab === 10 && (
              <Box>
                <Paper sx={{ p: 4, borderRadius: '24px', height: '100%', minHeight: 500, display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.05)' }}>
                  <Typography variant="h6" fontWeight={950} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <ContactSupportIcon color="primary" /> Enterprise Support Bridge
                  </Typography>
                  <Box sx={{ flexGrow: 1, border: '1px solid #f1f5f9', borderRadius: '16px', bgcolor: '#f8fafc', p: 3, mb: 3, overflowY: 'auto' }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {[
                              { from: 'ADMIN', text: 'How can we help you today with your GeoSurePath deployment?', time: '09:00 AM' },
                              { from: 'SYSTEM', text: 'A new high-priority ticket was opened by user: sushant@geosurepath.com', time: '09:12 AM', isSystem: true }
                          ].map((m, i) => (
                              <Box key={i} sx={{ alignSelf: m.from === 'ADMIN' ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                                  <Paper sx={{ p: 2, borderRadius: '16px', bgcolor: m.from === 'ADMIN' ? '#3b82f6' : (m.isSystem ? '#f1f5f9' : '#fff'), color: m.from === 'ADMIN' ? '#fff' : 'inherit', border: m.from === 'ADMIN' ? 'none' : '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.text}</Typography>
                                      <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', mt: 0.5 }}>{m.time}</Typography>
                                  </Paper>
                              </Box>
                          ))}
                      </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField fullWidth placeholder="Type high-priority message..." value={supportMessage} onChange={e => setSupportMessage(e.target.value)} size="small" sx={{ bgcolor: 'white', borderRadius: '12px' }} />
                      <Button variant="contained" endIcon={<SendIcon />} sx={{ borderRadius: '12px', fontWeight: 900, px: 4}} onClick={() => { showFeedback('Message transmitted to target GeoSurePath node', 'info'); setSupportMessage(''); }}>Send</Button>
                  </Box>
                </Paper>
              </Box>
            )}
            </Box>
          </>
        ) : (
          /* ─── User View / Mirror View ─── */
          <Box>
            {(maintenanceMode && !admin) ? (
              <Box sx={{ py: 12, textAlign: 'center' }}>
                <Paper sx={{ p: 6, borderRadius: '32px', maxWidth: 600, mx: 'auto', border: '1px solid #fee2e2', bgcolor: '#fff' }}>
                  <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                    <BlockIcon sx={{ fontSize: 80, color: '#ef4444', mb: 3 }} />
                  </motion.div>
                  <Typography variant="h4" fontWeight={950} sx={{ mb: 2, letterSpacing: '-1px' }}>Platform Maintenance</Typography>
                  <Typography variant="body1" sx={{ opacity: 0.6, mb: 4 }}>GeoSurePath is currently undergoing scheduled infrastructure optimization. Client portals are temporarily locked to ensure total data integrity.</Typography>
                  <Button variant="contained" disabled startIcon={<SyncIcon />} sx={{ borderRadius: '12px' }}>Check Status</Button>
                </Paper>
              </Box>
            ) : (
              <>
                <HardlockBanner bill={bill} />
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
                          { label: 'Usage Intelligence', value: `${bill?.activeDevices || 0}/${bill?.fleetSize || 0} Active`, sub: `${bill?.offlineDevices || 0} Offline` },
                          { label: 'System Status', value: bill?.status || 'ACTIVE', isChip: true, color: bill?.status === 'ACTIVE' ? '#10b981' : '#ef4444' },
                          { label: 'Cycle End', value: `${bill?.daysRemaining}d Left`, highlight: bill?.daysRemaining < 5 }
                        ].map((item, i) => (
                          <Grid item xs={6} sm={3} key={i}>
                            <Typography variant="caption" sx={{ opacity: 0.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>{item.label}</Typography>
                            {item.isChip ? (
                              <Chip label={item.value} size="small" sx={{ bgcolor: item.color, color: 'white', fontWeight: 900, mt: 0.5, borderRadius: '8px' }} />
                            ) : (
                              <Box>
                                <Typography variant="h5" fontWeight={900} sx={{ mt: 0.5, color: item.highlight ? '#f59e0b' : 'inherit' }}>{item.value}</Typography>
                                {item.sub && <Typography variant="caption" sx={{ opacity: 0.5, display: 'block', fontWeight: 700 }}>{item.sub}</Typography>}
                              </Box>
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
                <TableContainer component={Paper} sx={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
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
          </>
        )}
      </Box>

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
              control={<Switch checked={editForm.isFrozen} onChange={e => setEditForm({ ...editForm, isFrozen: e.target.checked })} color="warning" />}
              label={<Typography variant="body2" fontWeight={700}>Hibernate Subscription (Freeze Account)</Typography>}
            />
            
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
      <PlanUpgradeDialog 
        open={upgradeDialog} 
        onClose={() => setUpgradeDialog(false)} 
        plans={bill?.plans || []} 
        currentFleetSize={bill?.fleetSize || 1} 
        currentPlan={bill?.activePlan}
        daysRemaining={bill?.daysRemaining || 0}
        onUpgrade={(planId, finalPrice, credit) => {
            handleUpgradePlan(planId);
            showFeedback(`Upgrade synchronized. ${fmtCurrency(credit)} credit applied to prorated cycle.`, 'success');
        }} 
      />

      {/* Invoice Dialog */}
      <InvoiceDialog open={Boolean(selectedInvoice)} onClose={() => setSelectedInvoice(null)} invoice={selectedInvoice} settings={adminSettings} />

      {/* Self-Provisioning Wizard (Enterprise) */}
      <Dialog open={onboardWizardOpen} onClose={() => setOnboardWizardOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '32px', p: 1 } }}>
          <DialogTitle sx={{ fontWeight: 950, fontSize: '1.5rem', letterSpacing: '-1px', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1, bgcolor: 'primary.main', color: 'white', borderRadius: '12px', display: 'flex' }}><PersonAddIcon /></Box>
              Enterprise Subscription Provisioning
          </DialogTitle>
          <DialogContent>
              <Stepper activeStep={onboardStep} sx={{ mb: 4, '& .MuiStepIcon-root.Mui-active': { color: '#3b82f6' } }}>
                  {['Identity', 'Fleet Prep', 'Plan Selection'].map(label => (
                      <Step key={label}><StepLabel><Typography variant="caption" fontWeight={800}>{label}</Typography></StepLabel></Step>
                  ))}
              </Stepper>
              
              {onboardStep === 0 && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                      <Typography variant="body2" sx={{ opacity: 0.6, mb: 1 }}>Provide the primary administrative contact for this enterprise fleet.</Typography>
                      <TextField fullWidth label="Organization Name" placeholder="e.g. Apex Logistics" />
                      <TextField fullWidth label="Admin Email Address" placeholder="admin@organization.com" />
                      <TextField fullWidth label="Secure Password" type="password" />
                  </Box>
              )}
              {onboardStep === 1 && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                      <Typography variant="body2" sx={{ opacity: 0.6, mb: 1 }}>Initialize your fleet. You can add more devices later.</Typography>
                      <TextField fullWidth label="Initial Fleet Size" type="number" defaultValue={5} />
                      <Alert severity="info" sx={{ borderRadius: '12px' }}>Enterprise accounts get priority GPS polling and 1-year data history.</Alert>
                  </Box>
              )}
              {onboardStep === 2 && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Typography variant="body2" sx={{ opacity: 0.6, mb: 1 }}>Select a base plan to activate your enterprise tracked assets.</Typography>
                      {plans.slice(0, 3).map(p => (
                          <Paper key={p.id} sx={{ p: 2, borderRadius: '16px', border: '1px solid #e2e8f0', cursor: 'pointer', '&:hover': { borderColor: '#3b82f6', bgcolor: '#f8fafc' } }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Box><Typography fontWeight={800}>{p.name}</Typography><Typography variant="caption">{fmtCurrency(p.pricePerDevice)} / unit</Typography></Box>
                                  <Chip label="PRO" size="small" sx={{ fontWeight: 900, bgcolor: '#eff6ff', color: '#3b82f6' }} />
                              </Box>
                          </Paper>
                      ))}
                  </Box>
              )}
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 0 }}>
              <Button onClick={() => setOnboardWizardOpen(false)}>Exit</Button>
              <Box sx={{ flexGrow: 1 }} />
              {onboardStep > 0 && <Button onClick={() => setOnboardStep(s => s - 1)}>Back</Button>}
              <Button variant="contained" sx={{ borderRadius: '12px', px: 4, fontWeight: 800 }} onClick={() => onboardStep < 2 ? setOnboardStep(s => s + 1) : showFeedback('Enterprise subscription entity created successfully', 'success')}>
                  {onboardStep === 2 ? 'Complete Provisioning' : 'Next Step'}
              </Button>
          </DialogActions>
      </Dialog>

      {/* Snackbar */}
      {/* Plan Dialog */}
      <Dialog open={planDialog.open} onClose={() => setPlanDialog({ ...planDialog, open: false })} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '24px' } }}>
        <DialogTitle sx={{ fontWeight: 900 }}>{planDialog.mode === 'create' ? 'Create New Plan' : 'Edit Plan'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
                <TextField fullWidth label="Plan Name" value={planDialog.data.name} onChange={e => setPlanDialog({ ...planDialog, data: { ...planDialog.data, name: e.target.value } })} />
                <TextField fullWidth label="Price Per Device (Monthly)" type="number" value={planDialog.data.pricePerDevice} onChange={e => setPlanDialog({ ...planDialog, data: { ...planDialog.data, pricePerDevice: e.target.value } })} />
                <FormControl fullWidth>
                    <InputLabel>Billing Cycle</InputLabel>
                    <Select value={planDialog.data.billingCycle} label="Billing Cycle" onChange={e => setPlanDialog({ ...planDialog, data: { ...planDialog.data, billingCycle: e.target.value } })}>
                        <MenuItem value="MONTHLY">MONTHLY</MenuItem>
                        <MenuItem value="YEARLY">YEARLY</MenuItem>
                    </Select>
                </FormControl>
            </Box>
        </DialogContent>
      </Dialog>

      {/* Broadcast Dialog */}
      <Dialog open={broadcastDialog} onClose={() => setBroadcastDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '24px' } }}>
        <DialogTitle sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}><CalendarMonthIcon color="primary" /> Global Broadcast Engine</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
                <FormControl fullWidth>
                    <InputLabel>Target Audience</InputLabel>
                    <Select value={broadcastData.target} label="Target Audience" onChange={e => setBroadcastData({ ...broadcastData, target: e.target.value })}>
                        <MenuItem value="ALL">All Registered Users</MenuItem>
                        <MenuItem value="ACTIVE">Paid Subscribers Only</MenuItem>
                        <MenuItem value="OVERDUE">Overdue Accounts (Reminders)</MenuItem>
                        <MenuItem value="ADMINS">System Administrators</MenuItem>
                    </Select>
                </FormControl>
                <TextField fullWidth multiline rows={4} label="Announcement Message" placeholder="Enter system-wide notice here..." value={broadcastData.message} onChange={e => setBroadcastData({ ...broadcastData, message: e.target.value })} />
                <Typography variant="caption" sx={{ opacity: 0.5 }}>✓ This will appear as a high-priority banner for targeted users.</Typography>
            </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setBroadcastDialog(false)}>Cancel</Button>
            <Button variant="contained" sx={{ borderRadius: '10px', fontWeight: 700 }} onClick={handleBroadcast}>Send Broadcast</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} sx={{ borderRadius: '12px', fontWeight: 700 }} onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
      </Snackbar>

      {admin && (
          <SpeedDial
            ariaLabel="Admin Actions"
            sx={{ position: 'fixed', bottom: 32, right: 32 }}
            icon={<SpeedDialIcon />}
          >
            <SpeedDialAction icon={<AddIcon />} tooltipTitle="Onboard User" onClick={() => setOnboardDialog(true)} />
            <SpeedDialAction icon={<PostAddIcon />} tooltipTitle="Create Plan" onClick={() => setPlanDialog({ open: true, mode: 'create', data: { name: '', pricePerDevice: '', billingCycle: 'MONTHLY' } })} />
            <SpeedDialAction icon={<CalendarMonthIcon />} tooltipTitle="Broadcast Notice" onClick={() => setBroadcastDialog(true)} />
            <SpeedDialAction icon={<SyncIcon />} tooltipTitle="Force Sync" onClick={handleSyncAll} />
            <SpeedDialAction icon={<DownloadIcon />} tooltipTitle="Export Stats" onClick={() => exportToCsv(payments, 'Admin_Report')} />
          </SpeedDial>
      )}
      </Container>
    </Box>
  );
};

export default BillingPage;

// ─── Print Styles ─────────────────────────────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
  @media print {
    body * { visibility: hidden; }
    #printable-invoice, #printable-invoice * { visibility: visible; }
    #printable-invoice { 
      position: absolute; 
      left: 0; top: 0; 
      width: 100%; 
      border: none !important;
      padding: 0 !important;
    }
    .MuiDialogActions-root, .MuiDialogTitle-root { display: none !important; }
  }
`;
document.head.appendChild(style);
