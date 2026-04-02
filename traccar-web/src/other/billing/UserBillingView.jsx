import React from 'react';
import {
  Typography, Box, Paper, Grid, Button, Chip, Divider, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Alert
} from '@mui/material';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ReceiptIcon from '@mui/icons-material/Receipt';
import SecurityIcon from '@mui/icons-material/Security';
import { motion } from 'framer-motion';
import MfaSetup from '../../billing/MfaSetup';

const UserBillingView = (props) => {
  const { 
    maintenanceMode, admin, bill, adminSettings, fmtCurrency, fmtDate, 
    showFeedback, setUpgradeDialog, setSelectedInvoice, isMobile, 
    handleLogout, HardlockBanner, lastSync 
  } = props;

  return (
    <Box>
      {(maintenanceMode && !admin) ? (
        <Box sx={{ py: 12, textAlign: 'center' }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <Paper sx={{ p: 6, borderRadius: '32px', display: 'inline-block', maxWidth: 500, border: '1px solid #fee2e2', bgcolor: '#fff5f5' }}>
              <SecurityIcon sx={{ fontSize: 80, color: '#ef4444', mb: 3 }} />
              <Typography variant="h4" fontWeight={900} gutterBottom>Maintenance Protocol</Typography>
              <Typography sx={{ opacity: 0.6, mb: 4 }}>The GeoSurePath Platinum interface is currently undergoing infrastructure synchronization. Please standby.</Typography>
              <Button variant="outlined" color="error" onClick={handleLogout}>Logout Platform</Button>
            </Paper>
          </motion.div>
        </Box>
      ) : (
        <Box>
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
                <MfaSetup onEnabled={() => {}} />
                
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
    </Box>
  );
};

export default UserBillingView;