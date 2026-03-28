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

import { useNavigate } from 'react-router-dom';
import { useAdministrator } from '../common/util/permissions';

const BillingPage = () => {
  const admin = useAdministrator();
  const navigate = useNavigate();
  const [tabIndex, setTabIndex] = useState(0);
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

  const fetchAnalyticsAndLedger = async () => {
    try {
      const token = localStorage.getItem('saas_token');
      if (!token) return;
      const [aRes, lRes, logRes] = await Promise.all([
        fetch('/api/billing/admin-analytics', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/billing/admin/ledger', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/audit-logs', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (aRes.ok) {
        const aData = await aRes.json();
        setAnalytics(aData);
        setGatewayLink(aData?.config?.paymentLink || '');
      }
      if (lRes.ok) {
        const lData = await lRes.json();
        setLedger(Array.isArray(lData) ? lData : []);
      }
      if (logRes.ok) {
        const logData = await logRes.json();
        setAuditLogs(Array.isArray(logData) ? logData : []);
      }
    } catch (err) {
      console.error('Admin Analytics Error:', err);
    }
  };

  const fetchMyBill = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('saas_token');
      if (!token) {
        navigate('/login');
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
        setError('Failed to fetch billing cycle data.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyBill();

    if (admin) fetchAnalyticsAndLedger();
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
      if (res.ok) alert('Sovereign Gateway Updated Successfully');
    } catch (err) {
      alert(err.message);
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
        alert('Sovereign Settle Applied.');
        fetchAnalyticsAndLedger();
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSettling(false);
    }
  };

  const handleAdjustExpiry = async (targetId, email) => {
    const days = window.prompt(`Extend Grace Period for ${email}?\nEnter number of days (e.g. 15):`);
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
        alert(`VIP Expiry Extended by ${days} days.`);
        fetchAnalyticsAndLedger();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Operation failed');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSettling(false);
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
            <Tab icon={<ReceiptIcon />} label="FLEET SETTLEMENT" />
            <Tab icon={<StorageIcon />} label="DATABASE & LOGS" />
            <Tab icon={<SettingsIcon />} label="COMMAND SETTINGS" />
          </Tabs>
        </Paper>
      )}

      {/* --- TAB 0: ANALYTICS HUB (SAAFE) --- */}
      {admin && tabIndex === 0 && (
        <Box>
          <Grid container spacing={3} sx={{ mb: 6 }}>
            <Grid item xs={12} md={3}>
              <Card
                sx={{
                  borderRadius: '24px',
                  background:
                    'linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(29,78,216,0.1) 100%)',
                  border: '1px solid #3b82f6',
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="caption" sx={{ color: '#3b82f6', fontWeight: 900 }}>
                    SOVEREIGN REVENUE
                  </Typography>
                  <Typography variant="h3" fontWeight={900}>
                    ₹{analytics?.summary?.totalRevenue || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card
                sx={{
                  borderRadius: '24px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="caption" sx={{ opacity: 0.6 }}>
                    ACTIVE USERS
                  </Typography>
                  <Typography variant="h3" fontWeight={900}>
                    {analytics?.summary?.totalUsers || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card
                sx={{
                  borderRadius: '24px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="caption" sx={{ opacity: 0.6 }}>
                    FLEET SATURATION
                  </Typography>
                  <Typography variant="h3" fontWeight={900}>
                    {analytics?.summary?.totalDevices || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card
                sx={{
                  borderRadius: '24px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="caption" sx={{ opacity: 0.6 }}>
                    CHURN RISK
                  </Typography>
                  <Typography variant="h3" fontWeight={900} color="success.main">
                    {analytics?.summary?.churnRate || 2.5}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

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
                  <TableCell align="right">PENDING DEBT (INR)</TableCell>
                  <TableCell align="center">COMMANDS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLedger.map((u) => (
                  <TableRow key={u.id} sx={{ '&:hover': { background: 'rgba(255,255,255,0.02)' } }}>
                    <TableCell sx={{ fontWeight: 800 }}>{u.email}</TableCell>
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
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* --- TAB 2: FLEET SETTLEMENT --- */}
      {(tabIndex === 2 || !admin) && (
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
                onClick={() => window.open(analytics?.config?.paymentLink || '#', '_blank')}
                sx={{ borderRadius: '16px', px: 6, py: 2, fontWeight: 900, fontSize: '1.1rem' }}
              >
                PROCEED TO SECURE PAYMENT
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
                      <TableCell sx={{ opacity: 0.7 }}>
                        {entry.deviceCount || 1} Units
                      </TableCell>
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
      )}

      {/* --- TAB 3: DATABASE & LOGS --- */}
      {admin && tabIndex === 3 && (
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
                <TableRow sx={{ '& th': { bgcolor: '#0f172a', fontWeight: 900, color: 'rgba(255,255,255,0.5)' } }}>
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
                    <TableRow key={log.id} sx={{ '&:hover': { background: 'rgba(255,255,255,0.05)' } }}>
                      <TableCell sx={{ opacity: 0.6, fontSize: '0.8rem' }}>{new Date(log.createdAt).toLocaleString()}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', opacity: 0.5, fontSize: '0.7rem' }}>{log.adminId}</TableCell>
                      <TableCell>
                        <Chip label={log.action} size="small" sx={{ fontWeight: 800, bgcolor: 'rgba(59,130,246,0.2)', color: '#3b82f6' }} />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{log.user?.email || log.userId}</TableCell>
                      <TableCell sx={{ opacity: 0.8, fontSize: '0.85rem' }}>{log.details}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ opacity: 0.5, py: 5 }}>No audit logs discovered in database.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* --- TAB 4: COMMAND SETTINGS --- */}
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
                  value={gatewayLink}
                  onChange={(e) => setGatewayLink(e.target.value)}
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
                  onClick={handleUpdateGateway}
                  sx={{ borderRadius: '12px', fontWeight: 900, px: 4 }}
                >
                  SAVE GLOBAL CONFIGURATION
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Container>
  );
};

export default BillingPage;
