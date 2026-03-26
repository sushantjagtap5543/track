import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, Paper, Grid, Button, 
  Chip, CircularProgress, Alert, Divider, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, Tab, TextField, InputAdornment, IconButton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import VerifiedIcon from '@mui/icons-material/Verified';
import TimelineIcon from '@mui/icons-material/Timeline';
import ReceiptIcon from '@mui/icons-material/Receipt';
import HistoryIcon from '@mui/icons-material/History';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import GroupIcon from '@mui/icons-material/Group';
import WarningIcon from '@mui/icons-material/Warning';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import StorageIcon from '@mui/icons-material/Storage';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import SettingsIcon from '@mui/icons-material/Settings';
import LinkIcon from '@mui/icons-material/Link';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useAdministrator } from '../common/util/permissions';

const BillingPage = () => {
    const t = useTranslation();
    const admin = useAdministrator();
    const [tabIndex, setTabIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [bill, setBill] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [ledger, setLedger] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [settling, setSettling] = useState(false);
    const [gatewayLink, setGatewayLink] = useState('');
    const [selectedPlan, setSelectedPlan] = useState('monthly');
    const [error, setError] = useState(null);

    const fetchAnalyticsAndLedger = async () => {
        try {
            const token = localStorage.getItem('saas_token');
            const [aRes, lRes] = await Promise.all([
                fetch('/api/billing/admin-analytics', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/billing/admin/ledger', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            const aData = await aRes.json();
            const lData = await lRes.json();
            setAnalytics(aData);
            setLedger(lData);
            setGatewayLink(aData.config?.paymentLink || '');
        } catch (err) { console.error("Admin data error:", err); }
    };

    const fetchMyBill = async () => {
        try {
            const token = localStorage.getItem('saas_token');
            if (!token) throw new Error("Please login to view billing");
            const billRes = await fetch('/api/billing/my-bill', { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await billRes.json();
            setBill(data);
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    useEffect(() => { 
        fetchMyBill();
        if (admin) fetchAnalyticsAndLedger();
    }, [admin]);

    const handleUpdateGateway = async () => {
        try {
            const token = localStorage.getItem('saas_token');
            const res = await fetch('/api/billing/admin/config-gateway', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ paymentLink: gatewayLink })
            });
            if (res.ok) alert("Global Payment Link Updated Successfully");
        } catch (err) { alert(err.message); }
    };

    const handleSettleForUser = async (targetId, planId, total) => {
        if (!window.confirm(`Settle ₹${total} for this user?`)) return;
        setSettling(true);
        try {
            const token = localStorage.getItem('saas_token');
            const res = await fetch('/api/billing/admin/settle-cash', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ targetUserId: targetId, planId, amount: total })
            });
            if (res.ok) { alert("Settle Success"); fetchAnalyticsAndLedger(); }
        } catch (err) { alert(err.message); } finally { setSettling(false); }
    };

    const currentPlan = bill?.plans?.find(p => p.id === selectedPlan);
    const planCost = (currentPlan?.price || 0) * (bill?.devices?.length || 0);
    const totalFleetAmount = planCost + (bill?.totalDue || 0);

    const filteredLedger = ledger.filter(u => u.email.toLowerCase().includes(searchQuery.toLowerCase()));

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}><CircularProgress /></Box>;

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 10 }}>
            {/* --- PRIMARY SOVEREIGN TABS --- */}
            {admin && (
                <Paper sx={{ mb: 4, borderRadius: '24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Tabs 
                        value={tabIndex} 
                        onChange={(e, v) => setTabIndex(v)}
                        variant="fullWidth"
                        sx={{ 
                            '& .MuiTabs-indicator': { height: 4, borderRadius: '4px' },
                            '& .MuiTab-root': { fontWeight: 900, fontSize: '1rem', py: 3 }
                        }}
                    >
                        <Tab icon={<AssessmentIcon />} label="PLATFORM ANALYTICS" />
                        <Tab icon={<GroupIcon />} label="USER LEDGER" />
                        <Tab icon={<ReceiptIcon />} label="FLEET SETTLEMENT" />
                        <Tab icon={<SettingsIcon />} label="COMMAND SETTINGS" />
                    </Tabs>
                </Paper>
            )}

            {/* --- TAB 0: ANALYTICS HUB --- */}
            {admin && tabIndex === 0 && analytics && (
                <Box>
                    <Grid container spacing={3} sx={{ mb: 6 }}>
                        <Grid item xs={12} md={3}>
                            <Card sx={{ borderRadius: '24px', background: 'linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(29,78,216,0.1) 100%)', border: '1px solid #3b82f6' }}>
                                <CardContent sx={{ p: 4 }}>
                                    <Typography variant="caption" sx={{ color: '#3b82f6', fontWeight: 900 }}>SOVEREIGN REVENUE</Typography>
                                    <Typography variant="h3" fontWeight={900}>₹{analytics.summary.totalRevenue}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Card sx={{ borderRadius: '24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <CardContent sx={{ p: 4 }}>
                                    <Typography variant="caption" sx={{ opacity: 0.6 }}>ACTIVE PLATFORM USERS</Typography>
                                    <Typography variant="h3" fontWeight={900}>{analytics.summary.totalUsers}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Card sx={{ borderRadius: '24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <CardContent sx={{ p: 4 }}>
                                    <Typography variant="caption" sx={{ opacity: 0.6 }}>FLEET SATURATION</Typography>
                                    <Typography variant="h3" fontWeight={900}>{analytics.summary.totalDevices}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Card sx={{ borderRadius: '24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <CardContent sx={{ p: 4 }}>
                                    <Typography variant="caption" sx={{ opacity: 0.6 }}>CHURN RISK</Typography>
                                    <Typography variant="h3" fontWeight={900} color="success.main">2.5%</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                    
                    <Paper sx={{ p: 4, borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <Typography variant="h5" fontWeight={900} sx={{ mb: 4 }}>REVENUE VELOCITY (MONTHLY)</Typography>
                        <Grid container spacing={2}>
                            {Object.entries(analytics.monthlyBreakdown).map(([month, val]) => (
                                <Grid item xs={6} md={3} key={month}>
                                     <Box sx={{ p: 3, borderRadius: '16px', background: 'rgba(255,255,255,0.05)', textAlign: 'center' }}>
                                         <Typography variant="caption" sx={{ opacity: 0.6 }}>{month}</Typography>
                                         <Typography variant="h5" fontWeight={900}>₹{val}</Typography>
                                     </Box>
                                </Grid>
                            ))}
                        </Grid>
                    </Paper>
                </Box>
            )}

            {/* --- TAB 1: GLOBAL USER LEDGER --- */}
            {admin && tabIndex === 1 && (
                <Paper sx={{ p: 4, borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                        <Typography variant="h5" fontWeight={900}>GLOBAL USER AUDIT LEDGER</Typography>
                        <TextField 
                            placeholder="Search Client Email..."
                            size="small"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            sx={{ width: 400, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
                        />
                    </Box>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ '& th': { borderBottom: '2px solid rgba(255,255,255,0.1)', color: 'text.secondary', fontWeight: 900 } }}>
                                    <TableCell>CLIENT IDENTITY</TableCell>
                                    <TableCell>FLEET SIZE</TableCell>
                                    <TableCell>SENTRY STATUS</TableCell>
                                    <TableCell align="right">PENDING DEBT (INR)</TableCell>
                                    <TableCell align="center">COMMANDS</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredLedger.map((u) => (
                                    <TableRow key={u.id}>
                                        <TableCell sx={{ fontWeight: 800 }}>{u.email}</TableCell>
                                        <TableCell sx={{ opacity: 0.8 }}>{u.fleetSize} Vehicles</TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={u.status} 
                                                size="small" 
                                                color={u.status === 'PAID' ? 'success' : (u.status === 'GRACE' ? 'warning' : 'error')}
                                                sx={{ fontWeight: 900, width: 90 }}
                                            />
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 900 }}>₹{u.totalDue}</TableCell>
                                        <TableCell align="center">
                                            <Button 
                                                variant="contained" 
                                                color="primary" 
                                                size="small" 
                                                onClick={() => handleSettleForUser(u.id, 'monthly', u.totalDue)}
                                                sx={{ borderRadius: '8px', fontWeight: 900 }}
                                                disabled={u.totalDue === 0}
                                            >
                                                FORCE SETTLE
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* --- TAB 2: FLEET SETTLEMENT (Shared/Client View) --- */}
            {(tabIndex === 2 || !admin) && (
                <Paper elevation={3} sx={{ p: 4, borderRadius: '24px', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Typography variant="h4" sx={{ fontWeight: 900, mb: 4, background: 'linear-gradient(90deg, #60a5fa 0%, #3b82f6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                         My Fleet Protection Settlement
                    </Typography>

                    <Grid container spacing={3} sx={{ mb: 6 }}>
                        {bill?.plans?.map((plan) => (
                            <Grid item xs={12} md={4} key={plan.id}>
                                <Card 
                                    onClick={() => setSelectedPlan(plan.id)}
                                    sx={{ 
                                        cursor: 'pointer', borderRadius: '24px', border: '2px solid',
                                        background: selectedPlan === plan.id ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                                        borderColor: selectedPlan === plan.id ? 'primary.main' : 'rgba(255,255,255,0.1)',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.1, 1)', '&:hover': { transform: 'translateY(-5px)' }
                                    }}
                                >
                                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                                        <Typography variant="h6" fontWeight={800}>{plan.name}</Typography>
                                        <Typography variant="h3" fontWeight={900} sx={{ my: 1 }}>₹{plan.price}</Typography>
                                        <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
                                        <Box sx={{ textAlign: 'left', opacity: 0.7 }}>
                                            <Typography variant="caption" display="block">● Incl. GST (18%)</Typography>
                                            <Typography variant="caption" display="block">● Incl. AWS Infrastructure & Service</Typography>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>

                    <Paper sx={{ p: 4, borderRadius: '24px', background: 'rgba(59, 130, 246, 0.1)', mb: 5, border: '1px solid #3b82f6' }}>
                        <Typography variant="h6" fontWeight={900} sx={{ mb: 2 }}>FINAL TOTAL (Incl. Debt & Tax): ₹{totalFleetAmount.toFixed(2)}</Typography>
                        <Typography variant="body2" sx={{ opacity: 0.7, mb: 3 }}>This settlement covers your accrued debt of ₹{bill?.totalDue || 0} and provisioning for 1 unit of {selectedPlan.toUpperCase()} coverage.</Typography>
                        <Button 
                            variant="contained" 
                            size="large" 
                            fullWidth 
                            disabled={totalFleetAmount === 0}
                            onClick={() => window.open(analytics?.config?.paymentLink || '#', '_blank')}
                            sx={{ borderRadius: '16px', py: 2, fontWeight: 900, fontSize: '1.2rem' }}
                        >
                            PROCEED TO SECURE PAYMENT
                        </Button>
                    </Paper>

                    <Typography variant="h5" sx={{ mb: 3, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <VerifiedIcon color="primary" /> Professional Invoice Registry
                    </Typography>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ '& th': { borderBottom: '2px solid rgba(255,255,255,0.1)', color: 'text.secondary', fontWeight: 800 } }}>
                                    <TableCell>INVOICE NO.</TableCell>
                                    <TableCell>DATE</TableCell>
                                    <TableCell>PLAN</TableCell>
                                    <TableCell align="right">AMOUNT (INR)</TableCell>
                                    <TableCell align="center">STATUS</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {bill?.history?.map((entry, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell sx={{ fontWeight: 800, color: 'primary.light' }}>{entry.invoiceId}</TableCell>
                                        <TableCell sx={{ opacity: 0.7 }}>{new Date(entry.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>{entry.planId.toUpperCase()}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 900 }}>₹{entry.amount}</TableCell>
                                        <TableCell align="center"><Chip label="PAID" size="small" color="success" sx={{ fontWeight: 800 }} /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* --- TAB 3: COMMAND SETTINGS (Admin Only) --- */}
            {admin && tabIndex === 3 && (
                <Paper sx={{ p: 4, borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Typography variant="h5" fontWeight={900} sx={{ mb: 4 }}>GLOBAL COMMAND SETTINGS</Typography>
                    <Grid container spacing={4}>
                         <Grid item xs={12} md={6}>
                             <Box sx={{ p: 4, borderRadius: '24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                 <Typography variant="h6" fontWeight={800} gutterBottom>Active Payment Gateway Link</Typography>
                                 <Typography variant="body2" sx={{ opacity: 0.6, mb: 3 }}>The link below will be triggered when users click "Proceed to Pay". Supports Razorpay, Stripe, or Custom Links.</Typography>
                                 <TextField 
                                    fullWidth 
                                    value={gatewayLink}
                                    onChange={(e) => setGatewayLink(e.target.value)}
                                    placeholder="https://rzp.io/l/..."
                                    sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                                    InputProps={{ startAdornment: (<InputAdornment position="start"><LinkIcon color="primary" /></InputAdornment>) }}
                                 />
                                 <Button variant="contained" onClick={handleUpdateGateway} sx={{ borderRadius: '12px', fontWeight: 900 }}>SAVE GLOBAL CONFIGURATION</Button>
                             </Box>
                         </Grid>
                    </Grid>
                </Paper>
            )}
        </Container>
    );
};

export default BillingPage;
