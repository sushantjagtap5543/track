import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, Paper, Grid, Button, 
  Chip, CircularProgress, Alert, Divider, Card, CardContent
} from '@mui/material';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import VerifiedIcon from '@mui/icons-material/Verified';
import TimelineIcon from '@mui/icons-material/Timeline';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { useTranslation } from '../common/components/LocalizationProvider';

const BillingPage = () => {
    const t = useTranslation();
    const [loading, setLoading] = useState(true);
    const [bill, setBill] = useState(null);
    const [error, setError] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState('monthly');

    useEffect(() => {
        const fetchBill = async () => {
            try {
                const token = localStorage.getItem('saas_token');
                if (!token) throw new Error("Please login to view billing");
                const response = await fetch('/api/billing/my-bill', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error("Failed to load billing details");
                const data = await response.json();
                setBill(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchBill();
    }, []);

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}><CircularProgress /></Box>;

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 10 }}>
            {/* --- Header Section --- */}
            <Paper elevation={3} sx={{ p: 4, borderRadius: '24px', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h3" sx={{ fontWeight: 900, background: 'linear-gradient(90deg, #60a5fa 0%, #3b82f6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Subscription Shield
                    </Typography>
                    <ReceiptIcon color="primary" fontSize="large" sx={{ opacity: 0.5 }} />
                </Box>

                {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>{error}</Alert>}

                {/* --- Plan Selection Area --- */}
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, opacity: 0.7 }}>SELECT YOUR PROTECTION FREQUENCY:</Typography>
                
                <Grid container spacing={3} sx={{ mb: 5 }}>
                    {bill?.plans?.map((plan) => (
                        <Grid item xs={12} md={4} key={plan.id}>
                            <Card 
                                onClick={() => setSelectedPlan(plan.id)}
                                sx={{ 
                                    cursor: 'pointer',
                                    borderRadius: '20px',
                                    border: '2px solid',
                                    borderColor: selectedPlan === plan.id ? 'primary.main' : 'rgba(255,255,255,0.05)',
                                    background: selectedPlan === plan.id ? 'rgba(59, 130, 246, 0.05)' : 'rgba(255,255,255,0.01)',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    '&:hover': { transform: 'scale(1.02)' }
                                }}
                            >
                                <CardContent sx={{ p: 4, textAlign: 'center' }}>
                                    {plan.discount > 0 && (
                                        <Chip label={`SAVE ${plan.discount}%`} size="small" color="success" sx={{ mb: 2, fontWeight: 800 }} />
                                    )}
                                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 800 }}>{plan.name}</Typography>
                                    <Typography variant="h4" sx={{ mb: 2, fontWeight: 900 }}>₹{plan.price}</Typography>
                                    
                                    <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.05)' }} />
                                    
                                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 1 }}>
                                        <TimelineIcon color="primary" sx={{ fontSize: 18 }} />
                                        <Typography variant="body2" sx={{ opacity: 0.8 }}>Just **₹{plan.costPerDay}/day**</Typography>
                                    </Box>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Plan covers 1 device for **{plan.days} days**</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>

                {/* --- Total Fleet Summary --- */}
                <Box sx={{ 
                    p: 4, 
                    borderRadius: '20px', 
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', 
                    color: 'white',
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 20px 40px rgba(59, 130, 246, 0.3)'
                }}>
                   <Box>
                        <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>TOTAL FLEET COMMITMENT ({bill?.devices?.length} DEVICES)</Typography>
                        <Typography variant="h2" sx={{ fontWeight: 900 }}>
                            ₹{((bill?.plans?.find(p => p.id === selectedPlan)?.price || 0) * (bill?.devices?.length || 0)).toFixed(2)}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.7 }}>Inclusive of all day-wise accruals and administrative registration dates.</Typography>
                   </Box>
                   <Button 
                        variant="contained" 
                        size="large" 
                        startIcon={<CreditCardIcon />}
                        sx={{ 
                            mt: { xs: 3, md: 0 },
                            backgroundColor: 'white',
                            color: 'primary.main',
                            borderRadius: '50px', 
                            px: 6, 
                            py: 2, 
                            fontWeight: 900,
                            '&:hover': { background: '#f8fafc', color: '#1d4ed8' }
                        }}
                    >
                        PAY & SECURE FLEET
                    </Button>
                </Box>

                {/* --- Device Breakdown --- */}
                <Box sx={{ mt: 6 }}>
                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 800, opacity: 0.9, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <VerifiedIcon color="success" /> Current IMEIs in Protection
                    </Typography>
                    <Grid container spacing={2}>
                        {bill?.devices?.map((dev, i) => (
                            <Grid item xs={12} key={i}>
                                <Box sx={{ 
                                    p: 2, 
                                    borderRadius: '12px', 
                                    background: 'rgba(255,255,255,0.03)', 
                                    display: 'flex', 
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    <Box>
                                        <Typography sx={{ fontWeight: 700 }}>{dev.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">{dev.imei}</Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>Registered</Typography>
                                        <Typography variant="caption" color="text.secondary">{new Date(dev.registrationDate).toLocaleDateString()}</Typography>
                                    </Box>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            </Paper>
        </Container>
    );
};

export default BillingPage;
