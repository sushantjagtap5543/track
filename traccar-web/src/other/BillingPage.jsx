import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, Paper, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, Button, 
  Chip, CircularProgress, Alert, Divider
} from '@mui/material';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import HistoryIcon from '@mui/icons-material/History';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { useTranslation } from '../common/components/LocalizationProvider';

const BillingPage = () => {
    const t = useTranslation();
    const [loading, setLoading] = useState(true);
    const [bill, setBill] = useState(null);
    const [error, setError] = useState(null);

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

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Paper elevation={3} sx={{ p: 4, borderRadius: '16px', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.light' }}>
                        Subscription & Billing
                    </Typography>
                    <ReceiptIcon color="primary" fontSize="large" />
                </Box>

                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                <Box sx={{ mb: 4, p: 3, borderRadius: '12px', background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', color: 'white' }}>
                   <Typography variant="subtitle1">Total Balance Due</Typography>
                   <Typography variant="h2" sx={{ fontWeight: 900 }}>₹{bill?.totalDue || 0}</Typography>
                   <Typography variant="caption">Next automated billing on: {bill?.nextBillingDate ? new Date(bill.nextBillingDate).toLocaleDateString() : 'N/A'}</Typography>
                </Box>

                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HistoryIcon fontSize="small" /> Device Breakdown
                </Typography>

                <TableContainer component={Paper} sx={{ background: 'transparent', boxShadow: 'none' }}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ '& th': { borderBottom: '2px solid rgba(255,255,255,0.1)', color: 'text.secondary', fontWeight: 700 } }}>
                                <TableCell>Vehicle / IMEI</TableCell>
                                <TableCell align="right">Reg. Date</TableCell>
                                <TableCell align="right">Days Unpaid</TableCell>
                                <TableCell align="right">Amount</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {bill?.devices?.map((dev, i) => (
                                <TableRow key={i} sx={{ '& td': { borderBottom: '1px solid rgba(255,255,255,0.05)' } }}>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{dev.name}</Typography>
                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{dev.imei}</Typography>
                                    </TableCell>
                                    <TableCell align="right">{new Date(dev.registrationDate).toLocaleDateString()}</TableCell>
                                    <TableCell align="right">{dev.unpaidDays}</TableCell>
                                    <TableCell align="right">₹{dev.amount}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                    <Button 
                        variant="contained" 
                        size="large" 
                        startIcon={<CreditCardIcon />}
                        sx={{ 
                            borderRadius: '30px', 
                            px: 6, 
                            py: 1.5, 
                            fontWeight: 800,
                            textTransform: 'none',
                            fontSize: '1.1rem',
                            boxShadow: '0 10px 20px rgba(59, 130, 246, 0.4)'
                        }}
                    >
                        Secure Payment (Pay All)
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default BillingPage;
