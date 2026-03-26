import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, Paper, Grid, Button, 
  Chip, CircularProgress, Alert, Divider, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import VerifiedIcon from '@mui/icons-material/Verified';
import TimelineIcon from '@mui/icons-material/Timeline';
import ReceiptIcon from '@mui/icons-material/Receipt';
import HistoryIcon from '@mui/icons-material/History';
import PaymentsIcon from '@mui/icons-material/Payments';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import GroupIcon from '@mui/icons-material/Group';
import WarningIcon from '@mui/icons-material/Warning';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useAdministrator } from '../common/util/permissions';

const BillingPage = () => {
    const t = useTranslation();
    const admin = useAdministrator();
    const [loading, setLoading] = useState(true);
    const [settling, setSettling] = useState(false);
    const [bill, setBill] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [error, setError] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState('monthly');

    const fetchAllData = async () => {
        try {
            const token = localStorage.getItem('saas_token');
            if (!token) throw new Error("Please login to view billing");
            
            // 1. Fetch User Bill
            const billResponse = await fetch('/api/billing/my-bill', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const billData = await billResponse.json();
            setBill(billData);

            // 2. Fetch Admin Analytics If Applicable
            if (admin) {
                const analyticsResponse = await fetch('/api/billing/admin-analytics', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const analyticsData = await analyticsResponse.json();
                setAnalytics(analyticsData);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, [admin]);

    const handleCashSettlement = async () => {
        if (!window.confirm("Confirm Cash Payment Received? Current fleet expiry dates will be synchronized to today.")) return;
        setSettling(true);
        try {
            const token = localStorage.getItem('saas_token');
            const plan = bill.plans.find(p => p.id === selectedPlan);
            const response = await fetch('/api/billing/admin/settle-cash', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    targetUserId: bill.userId,
                    planId: selectedPlan,
                    amount: plan.price * bill.devices.length
                })
            });
            if (response.ok) {
                alert("Cash payment settled. Fleet auto-synchronized successfully.");
                fetchAllData();
            } else {
                const err = await response.json();
                throw new Error(err.error || "Failed to settle cash");
            }
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setSettling(false);
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}><CircularProgress /></Box>;

    const currentPlan = bill?.plans?.find(p => p.id === selectedPlan);
    const totalFleetAmount = (currentPlan?.price || 0) * (bill?.devices?.length || 0);

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 10 }}>
            {/* --- ADMIN SOVEREIGN ANALYTICS HUB --- */}
            {admin && analytics && (
                <Box sx={{ mb: 6 }}>
                    <Typography variant="h4" sx={{ fontWeight: 900, mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <AssessmentIcon color="primary" fontSize="large" /> 
                        Financial Control Tower
                    </Typography>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={4}>
                            <Paper sx={{ p: 4, borderRadius: '24px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                    <AccountBalanceWalletIcon sx={{ color: '#3b82f6' }} />
                                    <Chip label="LAST MONTH REVENUE" size="small" sx={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontWeight: 800 }} />
                                </Box>
                                <Typography variant="h3" fontWeight={900}>₹{analytics.summary.latestRevenue}</Typography>
                                <Typography variant="body2" sx={{ opacity: 0.6, mt: 1 }}>Period: {analytics.summary.latestMonth}</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Paper sx={{ p: 4, borderRadius: '24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                    <TrendingUpIcon color="success" />
                                    <Chip label="APPROX. COLLECTION" size="small" variant="outlined" sx={{ color: '#22c55e', borderColor: '#22c55e' }} />
                                </Box>
                                <Typography variant="h3" fontWeight={900}>₹{analytics.summary.approxCollection}</Typography>
                                <Typography variant="body2" sx={{ opacity: 0.6, mt: 1 }}>Pending Capacity: ₹{analytics.summary.pendingValue}</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Paper sx={{ p: 4, borderRadius: '24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                    <ShowChartIcon color="warning" />
                                    <Chip label="CHURN RATE" size="small" variant="outlined" sx={{ color: '#f59e0b', borderColor: '#f59e0b' }} />
                                </Box>
                                <Typography variant="h3" fontWeight={900}>{analytics.summary.churnRate}%</Typography>
                                <Typography variant="body2" sx={{ opacity: 0.6, mt: 1 }}>Risk Level: STABLE</Typography>
                            </Paper>
                        </Grid>
                    </Grid>
                </Box>
            )}

            {/* --- CLIENT SETTLEMENT / ADMIN CONTROL AREA --- */}
            <Paper elevation={3} sx={{ p: 4, borderRadius: '24px', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                    <Typography variant="h4" sx={{ fontWeight: 900, background: 'linear-gradient(90deg, #60a5fa 0%, #3b82f6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Fleet Settlement Center
                    </Typography>
                    {admin && (
                         <Button 
                            variant="contained" 
                            color="warning" 
                            startIcon={<PaymentsIcon />}
                            onClick={handleCashSettlement}
                            sx={{ borderRadius: '12px', fontWeight: 900, boxShadow: '0 10px 20px rgba(245, 158, 11, 0.2)' }}
                         >
                            FORCE CASH SETTLE (SYNC EXPIRY)
                         </Button>
                    )}
                </Box>

                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                {/* --- Plan Selection --- */}
                <Typography variant="subtitle1" fontWeight={800} sx={{ opacity: 0.6, mb: 2 }}>SELECT PROVISIONING CYCLE:</Typography>
                <Grid container spacing={3} sx={{ mb: 5 }}>
                    {bill?.plans?.map((plan) => (
                        <Grid item xs={12} md={4} key={plan.id}>
                            <Card 
                                onClick={() => setSelectedPlan(plan.id)}
                                sx={{ 
                                    cursor: 'pointer',
                                    borderRadius: '20px',
                                    border: '2px solid',
                                    background: selectedPlan === plan.id ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                                    borderColor: selectedPlan === plan.id ? 'primary.main' : 'rgba(255,255,255,0.05)',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    '&:hover': { transform: 'translateY(-5px)', borderColor: 'primary.light' }
                                }}
                            >
                                <CardContent sx={{ p: 4, textAlign: 'center' }}>
                                    {plan.discount > 0 && <Chip label={`-${plan.discount}%`} size="small" color="success" sx={{ mb: 2, fontWeight: 900 }} />}
                                    <Typography variant="h6" fontWeight={800}>{plan.name}</Typography>
                                    <Typography variant="h4" fontWeight={900} sx={{ my: 1 }}>₹{plan.price}</Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.5 }}>₹{plan.costPerDay}/day per device</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>

                {/* --- Payment Action --- */}
                <Box sx={{ 
                    p: 4, borderRadius: '24px', 
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                    color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    boxShadow: '0 20px 40px rgba(37, 99, 235, 0.3)'
                }}>
                    <Box>
                        <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>TOTAL SETTLEMENT ({bill?.devices?.length} DEVICES)</Typography>
                        <Typography variant="h2" fontWeight={900}>₹{totalFleetAmount.toFixed(2)}</Typography>
                    </Box>
                    <Button 
                        variant="contained" size="large" disableElevation
                        sx={{ background: 'white', color: 'primary.main', fontWeight: 900, borderRadius: '16px', px: 5, py: 2 }}
                    >
                        PAY SUBSCRIPTION
                    </Button>
                </Box>

                {/* --- Device History Table --- */}
                <Box sx={{ mt: 6 }}>
                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <HistoryIcon color="primary" /> Historical Device Ledger
                    </Typography>
                    <TableContainer component={Paper} sx={{ background: 'transparent', boxShadow: 'none' }}>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ '& th': { borderBottom: '2px solid rgba(255,255,255,0.1)', color: 'text.secondary', fontWeight: 800 } }}>
                                    <TableCell>IDENTITY (NAME/IMEI)</TableCell>
                                    <TableCell align="center">PREV. PAYMENT</TableCell>
                                    <TableCell align="right">PENDING DAYS</TableCell>
                                    <TableCell align="right">ACCRUED AMT.</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {bill?.devices?.map((dev, i) => (
                                    <TableRow key={i} sx={{ '& td': { borderBottom: '1px solid rgba(255,255,255,0.05)', py: 2 } }}>
                                        <TableCell>
                                            <Typography fontWeight={800}>{dev.name}</Typography>
                                            <Typography variant="caption" sx={{ opacity: 0.5 }}>{dev.imei}</Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2">{new Date(dev.previousBillingDate).toLocaleDateString()}</Typography>
                                            <Chip label="LAST SYNC" size="small" sx={{ fontSize: '0.6rem', height: '16px', mt: 0.5 }} />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography fontWeight={800} color={dev.unpaidDays > 10 ? "error" : "success"}>{dev.unpaidDays} Days</Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography fontWeight={900}>₹{dev.amount}</Typography>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            </Paper>
        </Container>
    );
};

export default BillingPage;
