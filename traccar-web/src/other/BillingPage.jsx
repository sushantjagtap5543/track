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
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import StorageIcon from '@mui/icons-material/Storage';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
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
            const billRes = await fetch('/api/billing/my-bill', { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await billRes.json();
            setBill(data);
            if (admin) {
                const analyticsRes = await fetch('/api/billing/admin-analytics', { headers: { 'Authorization': `Bearer ${token}` } });
                const aData = await analyticsRes.json();
                setAnalytics(aData);
            }
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    useEffect(() => { fetchAllData(); }, [admin]);

    const handleCashSettlement = async () => {
        if (!window.confirm("Confirm Professional Cash Settlement? Sequence ID will be logged.")) return;
        setSettling(true);
        try {
            const token = localStorage.getItem('saas_token');
            const plan = bill.plans.find(p => p.id === selectedPlan);
            const response = await fetch('/api/billing/admin/settle-cash', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ 
                    targetUserId: bill.userId, 
                    planId: selectedPlan, 
                    amount: totalFleetAmount 
                })
            });
            if (response.ok) { alert("Settlement Success. Invoice Generated."); fetchAllData(); }
            else { throw new Error("Failed to settle"); }
        } catch (err) { alert(err.message); } finally { setSettling(false); }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}><CircularProgress /></Box>;

    const currentPlan = bill?.plans?.find(p => p.id === selectedPlan);
    const planCost = (currentPlan?.price || 0) * (bill?.devices?.length || 0);
    const totalFleetAmount = planCost + (bill?.totalDue || 0);
    
    const fleetBreakdown = {
        basic: (currentPlan?.breakdown?.basic || 0) * (bill?.devices?.length || 0),
        server: (currentPlan?.breakdown?.server || 0) * (bill?.devices?.length || 0),
        cloud: (currentPlan?.breakdown?.cloud || 0) * (bill?.devices?.length || 0),
        gst: (currentPlan?.breakdown?.gst || 0) * (bill?.devices?.length || 0) + ((bill?.totalDue || 0) * 0.18), // Rough GST on debt as well
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 10 }}>
            {/* --- ADMIN ANALYTICS --- */}
            {admin && analytics && (
                <Grid container spacing={3} sx={{ mb: 6 }}>
                    <Grid item xs={12} md={4}>
                         <Paper sx={{ p: 4, borderRadius: '24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                             <Typography variant="caption" sx={{ opacity: 0.6 }}>TOTAL REVENUE</Typography>
                             <Typography variant="h3" fontWeight={900}>₹{analytics.summary.totalRevenue}</Typography>
                         </Paper>
                    </Grid>
                    <Grid item xs={12} md={4}>
                         <Paper sx={{ p: 4, borderRadius: '24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                             <Typography variant="caption" sx={{ opacity: 0.6 }}>ACTIVE DEVICES</Typography>
                             <Typography variant="h3" fontWeight={900}>{analytics.summary.totalDevices}</Typography>
                         </Paper>
                    </Grid>
                    <Grid item xs={12} md={4}>
                         <Paper sx={{ p: 4, borderRadius: '24px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6' }}>
                             <Typography variant="caption" sx={{ color: '#3b82f6' }}>CHURN STABILITY</Typography>
                             <Typography variant="h3" fontWeight={900} sx={{ color: '#3b82f6' }}>HIGH</Typography>
                         </Paper>
                    </Grid>
                </Grid>
            )}

            <Paper elevation={3} sx={{ p: 4, borderRadius: '24px', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                    <Typography variant="h3" sx={{ fontWeight: 900, background: 'linear-gradient(90deg, #60a5fa 0%, #3b82f6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Professional Settlement
                    </Typography>
                    {admin && <Button variant="outlined" color="warning" onClick={handleCashSettlement} disabled={settling} sx={{ borderRadius: '12px', fontWeight: 900 }}>ADMIN CASH SETTLE</Button>}
                </Box>

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
                                        <Typography variant="caption" display="block">● Incl. Cloud & Server Infrastructure</Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>

                {/* --- PRO BREAKDOWN --- */}
                <Paper sx={{ p: 4, borderRadius: '24px', background: 'rgba(255,255,255,0.03)', mb: 5 }}>
                    <Typography variant="h6" fontWeight={800} sx={{ mb: 3 }}>FEE & TAX BREAKDOWN (INCLUSIVE)</Typography>
                    <Grid container spacing={4}>
                        <Grid item xs={6} md={3}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <VerifiedUserIcon color="primary" fontSize="small" />
                                <Box>
                                    <Typography variant="caption" display="block" sx={{ opacity: 0.5 }}>BASIC ACCESS</Typography>
                                    <Typography fontWeight={900}>₹{fleetBreakdown.basic.toFixed(2)}</Typography>
                                </Box>
                            </Box>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <StorageIcon color="secondary" fontSize="small" />
                                <Box>
                                    <Typography variant="caption" display="block" sx={{ opacity: 0.5 }}>SERVER CHARGE</Typography>
                                    <Typography fontWeight={900}>₹{fleetBreakdown.server.toFixed(2)}</Typography>
                                </Box>
                            </Box>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <CloudQueueIcon sx={{ color: '#06b6d4' }} fontSize="small" />
                                <Box>
                                    <Typography variant="caption" display="block" sx={{ opacity: 0.5 }}>CLOUD INFRA</Typography>
                                    <Typography fontWeight={900}>₹{fleetBreakdown.cloud.toFixed(2)}</Typography>
                                </Box>
                            </Box>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <ReceiptIcon color="success" fontSize="small" />
                                <Box>
                                    <Typography variant="caption" display="block" sx={{ opacity: 0.5 }}>GST (18%)</Typography>
                                    <Typography fontWeight={900}>₹{fleetBreakdown.gst.toFixed(2)}</Typography>
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                    <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <Typography variant="h4" fontWeight={900}>TOTAL COMMITMENT: ₹{totalFleetAmount.toFixed(2)}</Typography>
                         <Button variant="contained" size="large" sx={{ borderRadius: '16px', px: 5, fontWeight: 900 }}>PROCEED TO PAY</Button>
                    </Box>
                </Paper>

                {/* --- PROFESSIONAL INVOICE HISTORY --- */}
                <Box>
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
                </Box>
            </Paper>
        </Container>
    );
};

export default BillingPage;
