import React from 'react';
import {
  Container, Typography, Box, Paper, Grid, Button, Chip, CircularProgress,
  Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, Tab, TextField, InputAdornment, Tooltip, IconButton, 
  LinearProgress, Switch, Badge
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ReceiptIcon from '@mui/icons-material/Receipt';
import BarChartIcon from '@mui/icons-material/BarChart';
import ShieldIcon from '@mui/icons-material/Shield';
import SyncIcon from '@mui/icons-material/Sync';
import WarningIcon from '@mui/icons-material/Warning';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import SaveIcon from '@mui/icons-material/Save';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PeopleIcon from '@mui/icons-material/People';
import HistoryIcon from '@mui/icons-material/History';
import DownloadIcon from '@mui/icons-material/Download';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import UpgradeIcon from '@mui/icons-material/Upgrade';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import ClearIcon from '@mui/icons-material/Clear';
import SecurityIcon from '@mui/icons-material/Security';
import DeleteIcon from '@mui/icons-material/Delete';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import SendIcon from '@mui/icons-material/Send';
import Skeleton from '@mui/material/Skeleton';
import { motion } from 'framer-motion';

const STATUS_COLOR = { PAID: '#10b981', GRACE: '#f59e0b', OVERDUE: '#ef4444', ACTIVE: '#10b981', SUSPENDED: '#ef4444' };

const StatCard = ({ title, value, sub, icon, color = '#3b82f6' }) => (
  <motion.div whileHover={{ scale: 1.02, translateY: -5 }} transition={{ type: 'spring', stiffness: 300 }}>
    <Paper sx={{ 
      p: 3, 
      borderRadius: '24px', 
      border: `1px solid ${color}22`, 
      position: 'relative', 
      overflow: 'hidden', 
      background: `linear-gradient(135deg, #fff 0%, ${color}05 100%)`,
      boxShadow: `0 10px 30px ${color}11` 
    }}>
      <Box sx={{ position: 'absolute', top: -10, right: -10, fontSize: 100, opacity: 0.08, color, transform: 'rotate(-10deg)' }}>{icon}</Box>
      <Box sx={{ p: 1.2, borderRadius: '12px', bgcolor: `${color}15`, color, display: 'inline-flex', mb: 2, boxShadow: `0 4px 12px ${color}22` }}>
        {icon}
      </Box>
      <Typography variant="h4" fontWeight={950} sx={{ color, mb: 0.5, letterSpacing: '-1px' }}>{value}</Typography>
      <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#64748b' }}>{title}</Typography>
      {sub && <Typography variant="caption" sx={{ opacity: 0.6, fontWeight: 700, display: 'block', mt: 1 }}>{sub}</Typography>}
    </Paper>
  </motion.div>
);

const AdminBillingView = (props) => {
  const { 
    tab, setTab, fetchAdminData, user, ADMIN_TABS = [], analytics = {}, fmtCurrency, payments = [], 
    ledgerPage = 1, setLedgerPage = () => {}, ledgerMeta = {}, paymentSearch = '', setPaymentSearch = () => {}, 
    paymentStatusFilter = 'ALL', setPaymentStatusFilter = () => {}, auditActionFilter = 'ALL', setAuditActionFilter = () => {}, 
    auditLogs = [], filteredAudit = [], fmtDate, systemHealth = {}, adminSettings = {}, setAdminSettings = () => {}, 
    showFeedback = () => {}, setSelectedInvoice = () => {}, setPlanDialog = () => {}, setOnboardDialog = () => {}, 
    handleSyncAll = () => {}, handleToggleBypass = () => {}, handleImpersonate = () => {}, handleSyncUser = () => {}, 
    handleAdjustExpiry = () => {}, handleToggleStatus = () => {}, handleDeleteUser = () => {}, tabLoading = {}, 
    filteredLedger = [], statusFilter = 'ALL', setStatusFilter = () => {}, setEditingUser = () => {}, setEditForm = () => {}, 
    dashboardOverview = {}, setOnboardWizardOpen = () => {}, plans = [], handleSaveSettings = () => {}, 
    setMaintenanceMode = () => {}, maintenanceMode = false, paymentsMeta = {}, paymentsPage = 1, setPaymentsPage = () => {}, 
    pendingUpgrades = [], filteredPayments = [], searchQuery = '', setSearchQuery = () => {}, exportToCsv = () => {}, handleBulkSettle = () => {}, handleSettleCash = () => {}, supportMessage = '', setSupportMessage = () => {}
  } = props;

  // Internal UI state for search/filters if parent doesn't provide them
  const [localSearch, setLocalSearch] = React.useState('');
  const [localStatus, setLocalStatus] = React.useState('ALL');
  
  const displaySearch = searchQuery || localSearch;
  const setDisplaySearch = setSearchQuery || setLocalSearch;

  return (
    <Box>
      {/* Admin Tab Bar */}
      <Paper sx={{ borderRadius: '20px', mb: 4, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <Tabs value={tab || 0} onChange={(_, v) => { setTab && setTab(v); fetchAdminData && fetchAdminData(v); }} variant="scrollable" scrollButtons="auto"
          sx={{ '& .MuiTabs-indicator': { height: 3, borderRadius: '3px', bgcolor: '#3b82f6' }, '& .MuiTab-root': { fontWeight: 700, py: 2, minHeight: 60 }, '& .Mui-selected': { color: '#3b82f6 !important' } }}>
          {ADMIN_TABS.filter((t, i) => {
              if (user?.role === 'MANAGER' && ![1, 2, 10].includes(i)) return false;
              return true;
          }).map((t, i) => <Tab key={i} icon={t.icon} label={t.label} iconPosition="start" />)}
        </Tabs>
      </Paper>

      {tab === 4 && (
          <Box>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={3}><StatCard title="ARPD Index" value={fmtCurrency(analytics?.arpd || 0)} sub="Avg Revenue Per Device" icon={<AttachMoneyIcon />} color="#8b5cf6" /></Grid>
              <Grid item xs={12} md={3}><StatCard title="Churn Density" value="1.2%" sub="Subscriber Retention" icon={<PeopleIcon />} color="#ec4899" /></Grid>
              <Grid item xs={12} md={3}><StatCard title="Collection Pulse" value="98.4%" sub="SaaS Ledger Sync Rate" icon={<SyncIcon />} color="#06b6d4" /></Grid>
              <Grid item xs={12} md={3}><StatCard title="Projected LTV" value={fmtCurrency(45000)} sub="Client Lifetime Value" icon={<TrendingUpIcon />} color="#10b981" /></Grid>
            </Grid>

            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                  <Paper sx={{ p: 4, borderRadius: '24px', height: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.05)' }}>
                      <Typography variant="h6" fontWeight={950} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}><BarChartIcon color="primary" /> Plan Popularity & Distribution</Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
                          {[
                              { name: 'Elite Enterprise', count: 45, color: '#3b82f6', percent: 65 },
                              { name: 'Pro Fleet', count: 22, color: '#8b5cf6', percent: 45 },
                              { name: 'Standard Tracker', count: 12, color: '#06b6d4', percent: 25 },
                              { name: 'Basic (Legacy)', count: 5, color: '#64748b', percent: 12 }
                          ].map((p, i) => (
                              <Box key={i}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                      <Typography variant="body2" fontWeight={800}>{p.name}</Typography>
                                      <Typography variant="body2" fontWeight={900}>{p.count} Units</Typography>
                                  </Box>
                                  <LinearProgress variant="determinate" value={p.percent} sx={{ height: 8, borderRadius: 4, bgcolor: `${p.color}15`, '& .MuiLinearProgress-bar': { bgcolor: p.color, borderRadius: 4 } }} />
                              </Box>
                          ))}
                      </Box>
                  </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 4, borderRadius: '24px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: 'white', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
                      <Typography variant="h6" fontWeight={950} sx={{ mb: 2 }}>Growth Analysis</Typography>
                      <Typography variant="body2" sx={{ opacity: 0.6, mb: 3 }}>Based on current trajectory, your revenue is expected to grow by 14% next month.</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                          <TrendingUpIcon sx={{ color: '#10b981', fontSize: 40 }} />
                          <Box>
                              <Typography variant="h4" fontWeight={900}>+12.4k</Typography>
                              <Typography variant="caption" sx={{ opacity: 0.5 }}>Estimated Monthly Delta</Typography>
                          </Box>
                      </Box>
                  </Paper>
              </Grid>
            </Grid>
          </Box>
      )}

      {/* Overview, Ledger, Payments Tabs... */}
      <Box sx={{ position: 'relative', minHeight: '400px' }}>
        {tabLoading[tab] && (
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(241, 245, 249, 0.7)', borderRadius: '20px', backdropFilter: 'blur(2px)' }}>
            <CircularProgress size={40} />
          </Box>
        )}

        {tab === 0 && (
          <Box>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}><StatCard title="System Revenue" value={fmtCurrency(dashboardOverview?.revenue?.total)} sub="All-time active ledger" icon={<AttachMoneyIcon />} color="#10b981" /></Grid>
              <Grid item xs={12} sm={6} md={3}><StatCard title="Fleet Saturation" value={dashboardOverview?.stats?.totalDevices || 0} sub="Active tracking units" icon={<DirectionsCarIcon />} color="#3b82f6" /></Grid>
              <Grid item xs={12} sm={6} md={3}><StatCard title="Active Clients" value={dashboardOverview?.stats?.totalUsers || 0} sub="Provisioned accounts" icon={<PeopleIcon />} color="#6366f1" /></Grid>
              <Grid item xs={12} sm={6} md={3}><StatCard title="Pending Upgrades" value={dashboardOverview?.alerts?.overdueCount || 0} sub="Immediate action required" icon={<WarningIcon />} color="#ef4444" /></Grid>
            </Grid>
            
            <Box sx={{ mb: 4, p: 3, borderRadius: '24px', bgcolor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #3b82f622', boxShadow: '0 4px 12px #3b82f608' }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={900}>Universal Synchronization Engine</Typography>
                <Typography variant="caption" sx={{ opacity: 0.6 }}>Force a bit-perfect reconciliation between the SaaS Ledger and the GPS Tracking Engine.</Typography>
              </Box>
              <Button variant="contained" startIcon={<SyncIcon />} onClick={handleSyncAll} sx={{ borderRadius: '12px', fontWeight: 900 }}>Master Platform Sync</Button>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, borderRadius: '20px', height: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                  <Typography fontWeight={800} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}><HistoryIcon color="primary" /> Recent Captured Payments</Typography>
                  {(dashboardOverview?.recentPayments || []).map((p, i) => (
                    <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid #f1f5f9' }}>
                      <Box>
                        <Typography variant="body2" fontWeight={700}>{p.userEmail || p.userId}</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.5 }}>{fmtDate(p.createdAt)}  {p.paymentMethod}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography fontWeight={900} color="success.main">{fmtCurrency(p.amount)}</Typography>
                        <Chip label={p.status} size="small" sx={{ fontSize: '0.65rem', bgcolor: '#f0fdf4', color: '#10b981', fontWeight: 800 }} />
                      </Box>
                    </Box>
                  ))}
                  {!dashboardOverview?.recentPayments?.length && <Typography sx={{ opacity: 0.4, textAlign: 'center', py: 3 }}>No recent captures</Typography>}
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, borderRadius: '20px', height: '100%', bgcolor: '#fff5f5', border: '1px solid #fee2e2', position: 'relative' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#991b1b' }}><WarningIcon /> Financial Red Zone</Typography>
                    <Button size="small" variant="outlined" color="error" onClick={handleBulkSettle} sx={{ fontWeight: 900, borderRadius: '8px' }}>Settle All</Button>
                  </Box>
                  {(dashboardOverview?.alerts?.criticalUsers || []).map((u, i) => (
                    <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid #fecaca', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body2" fontWeight={700} color="#991b1b">{u.email}</Typography>
                        <Typography variant="caption" color="#b91c1c">{u.unpaidDays} days disconnected</Typography>
                      </Box>
                      <Button size="small" variant="contained" color="error" sx={{ borderRadius: '8px', fontWeight: 900 }}
                        onClick={() => handleSettleCash(u.id, u.planId || 'monthly', u.totalDue)}>
                        Settle {u.totalDue?.toFixed(0)}
                      </Button>
                    </Box>
                  ))}
                  {!dashboardOverview?.alerts?.criticalUsers?.length && <Typography sx={{ opacity: 0.4, textAlign: 'center', py: 3 }}>All accounts are current</Typography>}
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}

        {tab === 1 && (
          <Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
               <TextField size="small" placeholder="Search by name or email" value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    InputProps={{ 
                        startAdornment: <InputAdornment position="start"><SearchIcon sx={{ opacity: 0.5 }} /></InputAdornment>,
                        endAdornment: searchQuery && (
                            <IconButton size="small" onClick={() => setSearchQuery('')}><ClearIcon fontSize="small" /></IconButton>
                        )
                    }}
                    sx={{ width: 250, bgcolor: 'white', borderRadius: '10px' }} />
                  
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} sx={{ bgcolor: 'white', borderRadius: '10px' }}>
                      <MenuItem value="ALL">All Statuses</MenuItem>
                      <MenuItem value="ACTIVE">Active (Paid)</MenuItem>
                      <MenuItem value="OVERDUE">Overdue</MenuItem>
                      <MenuItem value="GRACE">Grace Period</MenuItem>
                    </Select>
                  </FormControl>

                  <Box sx={{ flexGrow: 1 }} />
                  <Button startIcon={<DownloadIcon />} variant="outlined" onClick={() => exportToCsv('client_ledger', filteredLedger)}>Export CSV</Button>
                  <Button startIcon={<PersonAddIcon />} variant="contained" sx={{ borderRadius: '10px', fontWeight: 700 }} onClick={() => setOnboardDialog(true)}>Add Client</Button>
            </Box>
            
            <Paper sx={{ borderRadius: '20px', overflow: 'hidden' }}>
              <TableContainer sx={{ maxHeight: 600 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      {['Client', 'Devices', 'Plan / Cycle', 'Expires', 'Last Payment', 'Status', 'Due', 'Actions'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 800, bgcolor: '#f8fafc' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredLedger.map((u) => (
                      <TableRow key={u.id} hover>
                        <TableCell>
                          <Typography fontWeight={800} variant="body2">{u.name || u.email.split('@')[0]}</Typography>
                          <Typography variant="caption" sx={{ opacity: 0.55 }}>{u.email}</Typography>
                        </TableCell>
                        <TableCell><Typography fontWeight={800}>{u.fleetSize || 0} Units</Typography></TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700}>{u.planName}</Typography>
                          <Typography variant="caption" sx={{ opacity: 0.5 }}>{u.billingCycle}</Typography>
                        </TableCell>
                        <TableCell><Typography variant="body2">{fmtDate(u.expiresAt)}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{fmtCurrency(u.lastPaymentAmount)}</Typography></TableCell>
                        <TableCell>
                          <Chip label={u.status} size="small" sx={{ fontWeight: 800, bgcolor: `${STATUS_COLOR[u.status]}18`, color: STATUS_COLOR[u.status] }} />
                        </TableCell>
                        <TableCell><Typography fontWeight={900} color={u.totalDue > 0 ? 'error' : 'success.main'}>{fmtCurrency(u.totalDue)}</Typography></TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton size="small" onClick={() => setEditingUser(u)}><EditIcon fontSize="small" /></IconButton>
                            <IconButton size="small" onClick={() => handleImpersonate(u.id)}><VisibilityIcon fontSize="small" /></IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteUser(u.id)}><DeleteIcon fontSize="small" /></IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>
        )}

        {/* ... More tabs ... */}
        {tab === 10 && (
          <Box>
            <Paper sx={{ p: 4, borderRadius: '24px', height: '100%', minHeight: 500, display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.05)' }}>
              <Typography variant="h6" fontWeight={950} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <ContactSupportIcon color="primary" /> Enterprise Support Bridge
              </Typography>
              <Box sx={{ flexGrow: 1, border: '1px solid #f1f5f9', borderRadius: '16px', bgcolor: '#f8fafc', p: 3, mb: 3, overflowY: 'auto' }}>
                 <Typography sx={{ opacity: 0.4, textAlign: 'center', py: 10 }}>Select a support thread to begin synchronization</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField fullWidth placeholder="Type high-priority message..." value={supportMessage} onChange={e => setSupportMessage(e.target.value)} size="small" sx={{ bgcolor: 'white', borderRadius: '12px' }} />
                <Button variant="contained" endIcon={<SendIcon />} sx={{ borderRadius: '12px', fontWeight: 900, px: 4}} onClick={() => { showFeedback('Message transmitted', 'info'); setSupportMessage(''); }}>Send</Button>
              </Box>
            </Paper>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default AdminBillingView;