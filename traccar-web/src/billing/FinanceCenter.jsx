import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip, IconButton,
  Tooltip, CircularProgress, Grid, Divider, Alert, Tabs, Tab,
  FormControlLabel, Switch,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Save as SaveIcon,
  Percent as PercentIcon,
  Receipt as InvoiceIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  Payment as PaymentIcon,
  Link as LinkIcon,
  Email as EmailIcon,
  VpnKey as KeyIcon,
} from '@mui/icons-material';
import { exportToCsv } from '../common/util/export';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—';
const fmtCurrency = (n) => `₹${Number(n || 0).toFixed(2)}`;

const FinanceCenter = ({ payments = [], settings, onUpdateSettings, onDownloadInvoice }) => {
  const [subTab, setSubTab] = useState(0);
  const [taxRate, setTaxRate] = useState(String(settings?.taxRate ?? 18));
  const [razorpayId, setRazorpayId] = useState(settings?.razorpayId || '');
  const [razorpaySecret, setRazorpaySecret] = useState('');
  const [paymentLink, setPaymentLink] = useState(settings?.paymentLink || '');
  const [supportEmail, setSupportEmail] = useState(settings?.supportEmail || '');
  const [welcomeEmailEnabled, setWelcomeEmailEnabled] = useState(settings?.onboardingEmailEnabled ?? true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setTaxRate(String(settings.taxRate ?? 18));
      setRazorpayId(settings.razorpayId || '');
      setPaymentLink(settings.paymentLink || '');
      setSupportEmail(settings.supportEmail || '');
      setWelcomeEmailEnabled(settings.onboardingEmailEnabled ?? true);
    }
  }, [settings]);

  const handleSave = async () => {
    setIsUpdating(true);
    setSaved(false);
    await onUpdateSettings({
      taxRate: parseFloat(taxRate),
      razorpayId,
      ...(razorpaySecret && { razorpaySecret }),
      paymentLink,
      supportEmail,
      onboardingEmailEnabled: welcomeEmailEnabled,
    });
    setSaved(true);
    setIsUpdating(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleExport = () => {
    const headers = ['ID', 'User', 'Amount', 'Status', 'Method', 'Tx ID', 'Date'];
    const rows = payments.map(p => [
      p.id, p.user?.email || '—', p.amount, p.status,
      p.paymentMethod || 'RAZORPAY', p.transactionId || p.razorpayPaymentId || '—',
      fmtDate(p.createdAt),
    ]);
    exportToCsv('payment_history', rows, headers);
  };

  // Summary Stats
  const totalCollected = payments.filter(p => p.status === 'CAPTURED').reduce((s, p) => s + Number(p.amount), 0);
  const pending = payments.filter(p => p.status !== 'CAPTURED').reduce((s, p) => s + Number(p.amount), 0);

  return (
    <Box>
      <Tabs value={subTab} onChange={(_, v) => setSubTab(v)} sx={{ mb: 3, '& .MuiTab-root': { fontWeight: 700 } }}>
        <Tab label="Payment History" icon={<HistoryIcon />} iconPosition="start" />
        <Tab label="Finance Settings" icon={<SettingsIcon />} iconPosition="start" />
      </Tabs>

      {/* ── Payment History ── */}
      {subTab === 0 && (
        <Box>
          {/* Summary */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {[
              { label: 'Total Collected', value: fmtCurrency(totalCollected), color: '#10b981' },
              { label: 'Pending / Failed', value: fmtCurrency(pending), color: '#ef4444' },
              { label: 'Transactions', value: payments.length, color: '#3b82f6' },
            ].map((s, i) => (
              <Grid item xs={12} sm={4} key={i}>
                <Paper sx={{ p: 2.5, borderRadius: '16px', border: `1px solid ${s.color}22`, textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight={900} sx={{ color: s.color }}>{s.value}</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.6, fontWeight: 600 }}>{s.label}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button startIcon={<DownloadIcon />} variant="outlined" size="small" onClick={handleExport}>Export CSV</Button>
          </Box>

          <TableContainer component={Paper} sx={{ borderRadius: '16px', maxHeight: 500, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  {['Date', 'Client', 'Method', 'Tx ID', 'Amount', 'Status', ''].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 800, bgcolor: '#f8fafc' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.map((p, i) => (
                  <TableRow key={i} hover>
                    <TableCell sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{fmtDate(p.createdAt)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>{p.user?.name || p.user?.email || '—'}</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.5 }}>{p.user?.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={p.paymentMethod || 'RAZORPAY'} size="small" sx={{ bgcolor: '#eff6ff', color: '#3b82f6', fontWeight: 700, fontSize: '0.65rem' }} />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.72rem', opacity: 0.7 }}>{(p.transactionId || p.razorpayPaymentId || '—').slice(0, 18)}</TableCell>
                    <TableCell sx={{ fontWeight: 900, color: '#10b981' }}>{fmtCurrency(p.amount)}</TableCell>
                    <TableCell>
                      <Chip label={p.status} size="small" color={p.status === 'CAPTURED' ? 'success' : 'default'} sx={{ fontSize: '0.65rem' }} />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Invoice">
                        <IconButton size="small" onClick={() => onDownloadInvoice(p)}>
                          <InvoiceIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {payments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 5, opacity: 0.4 }}>No payment records</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ── Finance Settings ── */}
      {subTab === 1 && (
        <Grid container spacing={3}>
          {/* Tax & Billing */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
                <PercentIcon color="primary" />
                <Typography fontWeight={800}>Tax & Billing Rules</Typography>
              </Box>

              <TextField
                fullWidth
                label="GST Rate (%)"
                type="number"
                value={taxRate}
                onChange={e => setTaxRate(e.target.value)}
                inputProps={{ min: 0, max: 100, step: 0.1 }}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Payment Gateway Link"
                value={paymentLink}
                onChange={e => setPaymentLink(e.target.value)}
                placeholder="https://rzp.io/l/..."
                InputProps={{ startAdornment: <LinkIcon sx={{ mr: 1, opacity: 0.4, fontSize: '1.1rem' }} /> }}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Support Email"
                value={supportEmail}
                onChange={e => setSupportEmail(e.target.value)}
                InputProps={{ startAdornment: <EmailIcon sx={{ mr: 1, opacity: 0.4, fontSize: '1.1rem' }} /> }}
                sx={{ mb: 3 }}
              />
              <FormControlLabel
                control={<Switch checked={welcomeEmailEnabled} onChange={e => setWelcomeEmailEnabled(e.target.checked)} color="primary" />}
                label={<Typography variant="body2" fontWeight={600}>Send welcome email on new user signup</Typography>}
                sx={{ mb: 2 }}
              />
            </Paper>
          </Grid>

          {/* Razorpay Keys */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
                <PaymentIcon color="primary" />
                <Typography fontWeight={800}>Razorpay Gateway</Typography>
              </Box>

              <TextField
                fullWidth
                label="Razorpay Key ID"
                value={razorpayId}
                onChange={e => setRazorpayId(e.target.value)}
                placeholder="rzp_live_..."
                InputProps={{ startAdornment: <KeyIcon sx={{ mr: 1, opacity: 0.4, fontSize: '1.1rem' }} /> }}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Razorpay Secret (leave blank to keep existing)"
                type="password"
                value={razorpaySecret}
                onChange={e => setRazorpaySecret(e.target.value)}
                InputProps={{ startAdornment: <KeyIcon sx={{ mr: 1, opacity: 0.4, fontSize: '1.1rem' }} /> }}
                sx={{ mb: 2 }}
              />

              <Alert severity="info" sx={{ borderRadius: '10px', fontSize: '0.8rem', mb: 3 }}>
                Keys are encrypted at rest. Only the Key ID is visible after saving.
              </Alert>
            </Paper>
          </Grid>

          {/* Save */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button
                variant="contained"
                startIcon={isUpdating ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                onClick={handleSave}
                disabled={isUpdating}
                sx={{ borderRadius: '12px', fontWeight: 700, px: 4, py: 1.5 }}
              >
                {isUpdating ? 'Saving…' : 'Save Configuration'}
              </Button>
              {saved && <Alert severity="success" sx={{ py: 0.5, borderRadius: '10px' }}>Configuration saved!</Alert>}
            </Box>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default FinanceCenter;
