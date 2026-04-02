import { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, CircularProgress, Button, Alert
} from '@mui/material';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import LinkIcon from '@mui/icons-material/Link';
import CancelIcon from '@mui/icons-material/Cancel';
import { useNavigate } from 'react-router-dom';
import { useAdministrator } from '../common/util/permissions';
import { exportToCsv } from '../common/util/export';
import { useDispatch, useSelector } from 'react-redux';
import { sessionActions } from '../store';
import {
  BarChart as BarChartIcon,
  Timeline as TimelineIcon,
  Payment as PaymentIcon,
  Dns as DnsIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  Announcement as AnnouncementIcon,
  HelpCenter as HelpCenterIcon,
  BugReport as BugReportIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';

import AdminBillingView from './billing/AdminBillingView';
import UserBillingView from './billing/UserBillingView';

//  Constants for Sovereign Admin 
const ADMIN_TABS = [
  { label: 'Overview', icon: <TimelineIcon /> },
  { label: 'Client Ledger', icon: <DescriptionIcon /> },
  { label: 'Finance Center', icon: <PaymentIcon /> },
  { label: 'Admin Logs', icon: <SecurityIcon /> },
  { label: 'Growth Analytics', icon: <BarChartIcon /> },
  { label: 'Infrastructure', icon: <DnsIcon /> },
  { label: 'Announcements', icon: <AnnouncementIcon /> },
  { label: 'Help Bridge', icon: <HelpCenterIcon /> },
  { label: 'SaaS Config', icon: <SettingsIcon /> },
  { label: 'Debug Vault', icon: <BugReportIcon /> }
];

//  Helpers 
const API = (path, opts = {}) => {
  const token = localStorage.getItem('saas_token');
  return fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts.headers } });
};
const fmtCurrency = (n, symbol = '') => `${symbol}${Number(n || 0).toFixed(2)}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '';

const BillingPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const admin = useAdministrator();
  const user = useSelector((state) => state.session.user);

  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [lastSync, setLastSync] = useState(new Date());
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [mirroringUser, setMirroringUser] = useState(null);

  const [upgradeDialog, setUpgradeDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [ledger, setLedger] = useState([]);
  const [payments, setPayments] = useState([]);
  const [dashboardOverview, setDashboardOverview] = useState(null);
  const [adminSettings, setAdminSettings] = useState({
    razorpayId: '',
    razorpaySecret: '',
    taxRate: 18,
    currency: 'INR',
    supportEmail: 'support@geosurepath.com',
    companyName: 'GeoSurePath Platinum',
    announcement: ''
  });

  const fetchAdminData = useCallback(async (targetTab = tab) => {
    try {
        if (targetTab === 0) {
            const res = await API('/api/admin/overview');
            if (res.ok) setDashboardOverview(await res.json());
        } else if (targetTab === 1) {
            const res = await API('/api/admin/ledger');
            if (res.ok) setLedger((await res.json()).users);
        } else if (targetTab === 2) {
            const res = await API('/api/admin/payments');
            if (res.ok) setPayments((await res.json()).payments);
        }
    } catch (e) {
        console.error('Sync error', e);
    } finally {
        setLastSync(new Date());
    }
  }, [tab]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const billRes = await API('/api/billing/status');
        if (billRes.ok) setBill(await billRes.json());
        if (admin) fetchAdminData(0);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [admin, fetchAdminData]);

  const handleLogout = () => {
    dispatch(sessionActions.updateUser(null));
    navigate('/login');
  };

  if (loading) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 2, bgcolor: '#0f172a' }}>
      <CircularProgress size={56} sx={{ color: '#3b82f6' }} />
      <Typography variant="h6" sx={{ color: 'white', opacity: 0.6, fontWeight: 700 }}>Loading Dashboard</Typography>
    </Box>
  );

  return (
    <Box sx={{ bgcolor: '#f1f5f9', minHeight: '100vh' }}>
      <Box sx={{ bgcolor: '#0f172a', color: 'white', px: 4, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ p: 1, borderRadius: '10px', bgcolor: '#3b82f6' }}><DirectionsCarIcon /></Box>
          <Box>
            <Typography variant="h6" fontWeight={900}>GeoSurePath</Typography>
            <Typography variant="caption" sx={{ opacity: 0.5 }}>{admin ? 'Admin Dashboard' : 'Billing Portal'}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button startIcon={<LinkIcon />} onClick={() => navigate('/')} sx={{ color: 'white', opacity: 0.7 }}>Map</Button>
          <Button startIcon={<CancelIcon />} onClick={handleLogout} color="error" variant="outlined" sx={{ borderRadius: '10px' }}>Logout</Button>
        </Box>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {mirroringUser && (
            <Alert severity="info" variant="filled" action={<Button color="inherit" size="small" onClick={() => setMirroringUser(null)}>Exit</Button>} sx={{ mb: 4, borderRadius: '16px' }}>
                Mirroring: {mirroringUser.userEmail}
            </Alert>
        )}

        {admin && !mirroringUser ? (
          <AdminBillingView 
            {...{
              tab, setTab, fetchAdminData, user, ADMIN_TABS, analytics: {}, fmtCurrency, fmtDate,
              payments, ledgerPage: 1, setLedgerPage: () => {}, ledgerMeta: {}, paymentSearch: '',
              setPaymentSearch: () => {}, auditLogs: [], filteredAudit: [], systemHealth: {},
              adminSettings, setAdminSettings, showFeedback: (m) => alert(m), 
              setSelectedInvoice: (i) => setSelectedInvoice(i), setPlanDialog: (p) => {},
              setOnboardDialog: (o) => {}, handleSyncAll: () => {}, handleLogout, lastSync, 
              exportToCsv, filteredLedger: ledger, tabLoading: {}
            }} 
          />
        ) : (
          <UserBillingView 
            {...{
              maintenanceMode, admin, bill, adminSettings, fmtCurrency, fmtDate, 
              showFeedback: (m) => alert(m), isMobile: false, handleLogout, 
              setUpgradeDialog, setSelectedInvoice,
              HardlockBanner: ({bill}) => bill?.hardlock ? <Alert severity="error" sx={{ mb: 3, borderRadius: '16px' }}>HARDLOCKED: Account requires immediate reconciliation.</Alert> : null, lastSync 
            }} 
          />
        )}
      </Container>
    </Box>
  );
};

export default BillingPage;
