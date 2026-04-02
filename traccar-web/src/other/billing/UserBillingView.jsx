import React from 'react';
import {
  Typography, Box, Paper, Grid, Button, Chip, Divider, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Alert, LinearProgress, Tooltip
} from '@mui/material';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ReceiptIcon from '@mui/icons-material/Receipt';
import SecurityIcon from '@mui/icons-material/Security';
import SyncIcon from '@mui/icons-material/Sync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import ShieldIcon from '@mui/icons-material/Shield';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ChartTooltip } from 'recharts';
import MfaSetup from '../../billing/MfaSetup';

const UsageGauge = ({ active, total }) => {
  const data = [
    { name: 'Active', value: active, color: '#3b82f6' },
    { name: 'Remaining', value: Math.max(0, total - active), color: 'rgba(255,255,255,0.1)' }
  ];
  return (
    <Box sx={{ height: 140, width: '100%', position: 'relative' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="100%"
            startAngle={180}
            endAngle={0}
            innerRadius={60}
            outerRadius={80}
            paddingAngle={0}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <Box sx={{ position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center' }}>
        <Typography variant="h5" fontWeight={900} sx={{ color: 'white' }}>{active}</Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 800 }}>OF {total} UNITS</Typography>
      </Box>
    </Box>
  );
};

const UserBillingView = (props) => {
  const { 
    maintenanceMode = false, admin = false, bill = {}, adminSettings = {}, fmtCurrency = (n) => n, fmtDate = (d) => d, 
    showFeedback = () => {}, setUpgradeDialog = () => {}, setSelectedInvoice = () => {}, isMobile = false, 
    handleLogout = () => {}, HardlockBanner = () => null, lastSync 
  } = props;

  return (
    <Box>
      {(maintenanceMode && !admin) ? (
        <Box sx={{ py: 12, textAlign: 'center' }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <Paper sx={{ p: 6, borderRadius: '32px', display: 'inline-block', maxWidth: 500, border: '1px solid #fee2e2', bgcolor: '#fff5f5' }}>
              <SecurityIcon sx={{ fontSize: 80, color: '#ef4444', mb: 3 }} />
              <Typography variant="h4" fontWeight={900} gutterBottom>Maintenance Protocol</Typography>
              <Typography sx={{ opacity: 0.6, mb: 4 }}>The Track Elite Platinum interface is currently undergoing infrastructure synchronization. Please standby.</Typography>
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
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                  color: 'white',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 25px 60px rgba(0,0,0,0.4)'
                }}>
                  <Box sx={{ position: 'absolute', top: -40, right: -40, opacity: 0.05, fontSize: 240, transform: 'rotate(-15deg)' }}><DirectionsCarIcon fontSize="inherit" /></Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, position: 'relative' }}>
                    <Box>
                      <Typography variant="h5" fontWeight={950} sx={{ letterSpacing: '-1px', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <ShieldIcon sx={{ color: '#3b82f6' }} /> Platinum Subscription
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <CloudDoneIcon sx={{ fontSize: 14 }} /> System Synchronized: <Box component="span" sx={{ color: '#10b981' }}>{lastSync || 'Just now'}</Box>
                      </Typography>
                    </Box>
                    <Chip 
                      label={bill?.status || 'ACTIVE'} 
                      sx={{ 
                        fontWeight: 950, 
                        bgcolor: bill?.status === 'ACTIVE' ? '#10b98122' : '#ef444422', 
                        color: bill?.status === 'ACTIVE' ? '#10b981' : '#ef4444',
                        border: `1px solid ${bill?.status === 'ACTIVE' ? '#10b98144' : '#ef444444'}`
                      }} 
                    />
                  </Box>

                  <Grid container spacing={4} alignItems="center">
                    <Grid item xs={12} sm={4}>
                      <UsageGauge active={bill?.activeDevices || 0} total={bill?.fleetSize || 0} />
                    </Grid>
                    <Grid item xs={12} sm={8}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2.5, mb: 4 }}>
                        <Box>
                          <Typography variant="caption" sx={{ opacity: 0.4, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px' }}>Current Plan</Typography>
                          <Typography variant="h6" fontWeight={900}>{bill?.activePlan || 'Standard'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ opacity: 0.4, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px' }}>Time Remaining</Typography>
                          <Typography variant="h6" fontWeight={900} sx={{ color: bill?.daysRemaining < 7 ? '#f59e0b' : 'white' }}>{bill?.daysRemaining} Days</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ opacity: 0.4, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px' }}>Region Status</Typography>
                          <Typography variant="h6" fontWeight={900} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CheckCircleIcon sx={{ fontSize: 18, color: '#10b981' }} /> Optimized
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ opacity: 0.4, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px' }}>Next Billing</Typography>
                          <Typography variant="h6" fontWeight={900}>{fmtCurrency((bill?.activeDevices || 1) * (adminSettings?.unitPrice || 200))}</Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                          variant="contained"
                          sx={{
                            bgcolor: '#3b82f6',
                            '&:hover': { bgcolor: '#2563eb' },
                            fontWeight: 900,
                            borderRadius: '16px',
                            px: 4, py: 1.5,
                            flexGrow: 1,
                            boxShadow: '0 8px 16px rgba(59,130,246,0.3)'
                          }}
                          onClick={() => showFeedback('Initializing secure checkout...', 'info')}
                        >
                          Renew Now
                        </Button>
                        <Button
                          variant="outlined"
                          sx={{
                            borderColor: 'rgba(255,255,255,0.2)',
                            color: 'white',
                            '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.05)' },
                            fontWeight: 900,
                            borderRadius: '16px',
                            px: 3,
                            transition: 'all 0.3s'
                          }}
                          onClick={() => setUpgradeDialog(true)}
                        >
                          Modify Plan
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </motion.div>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={950} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: '#1e293b' }}>
                  <ReceiptLongIcon color="primary" /> Payment Ledger
                </Typography>
                <Chip icon={<SyncIcon />} label="Auto-Sync Enabled" size="small" variant="outlined" sx={{ fontWeight: 800, borderRadius: '8px' }} />
              </Box>

              <TableContainer component={Paper} sx={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 10px 40px rgba(0,0,0,0.03)' }}>
                <Table>
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      {['Invoicing ID', 'Processed Date', 'Plan Description', 'Amount', 'Status', 'PDF'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 800, color: '#475569', py: 2.5 }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(bill?.history || []).map((inv, i) => (
                      <TableRow key={i} hover>
                        <TableCell sx={{ fontWeight: 800, color: '#3b82f6' }}>{inv.invoiceId}</TableCell>
                        <TableCell sx={{ fontWeight: 700, opacity: 0.8 }}>{fmtDate(inv.createdAt)}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{(inv.planId || 'MONTHLY').toUpperCase()}</TableCell>
                        <TableCell sx={{ fontWeight: 950 }}>{fmtCurrency(inv.price)}</TableCell>
                        <TableCell>
                          <Chip 
                            icon={<CheckCircleIcon style={{ fontSize: 14 }} />} 
                            label="CAPTURED" 
                            size="small" 
                            sx={{ fontWeight: 800, bgcolor: '#dcfce7', color: '#15803d', border: 'none' }} 
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Download Invoice">
                            <IconButton onClick={() => setSelectedInvoice(inv)} sx={{ bgcolor: '#f1f5f9' }}>
                              <ReceiptIcon fontSize="small" color="primary" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!bill?.history?.length) && <TableRow><TableCell colSpan={6} sx={{ textAlign: 'center', py: 8, opacity: 0.4, fontWeight: 700 }}>No encrypted archives found.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <MfaSetup onEnabled={() => {}} />
                
                <Paper sx={{ p: 4, borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 8px 30px rgba(0,0,0,0.02)' }}>
                  <Typography fontWeight={950} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1.5, color: '#1e293b' }}>
                    <SecurityIcon color="primary" /> Help Protocol
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.6, mb: 3, fontWeight: 600, lineHeight: 1.6 }}>Our technical elite is available 24/7 to resolve fleet discrepancies or billing synchronization issues.</Typography>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    sx={{ 
                      borderRadius: '16px', 
                      fontWeight: 900, 
                      py: 1.5, 
                      borderColor: '#3b82f644',
                      '&:hover': { borderColor: '#3b82f6', bgcolor: '#f0f9ff' }
                    }} 
                    href={`mailto:${adminSettings.supportEmail || 'support@geosurepath.com'}`}
                  >
                    Initiate Support Ticket
                  </Button>
                </Paper>

                <Paper sx={{ p: 4, borderRadius: '24px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}>
                  <Typography variant="caption" fontWeight={950} sx={{ opacity: 0.7, display: 'block', mb: 1, letterSpacing: '2px' }}>AIS140 COMPLIANCE</Typography>
                  <Typography variant="h6" fontWeight={900} sx={{ mb: 1 }}>Government Ready</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8, fontSize: '0.8rem', fontWeight: 600 }}>Your fleet is compliant with the latest Ministry of Road Transport directives. Live forwarding enabled.</Typography>
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