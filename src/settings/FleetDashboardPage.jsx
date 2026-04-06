import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableRow,
  TableCell,
  TableHead,
  TableBody,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  TableContainer,
  InputAdornment,
  TextField,
  Button,
  Dialog,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';
import SearchIcon from '@mui/icons-material/Search';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import EditIcon from '@mui/icons-material/Edit';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import CampaignIcon from '@mui/icons-material/Campaign';
import { useCatch, useEffectAsync } from '../reactHelper';
import { formatTime } from '../common/util/formatter';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { PLANS } from '../common/util/plans';
import { calculateNextBillingDate, createBillingLog } from '../common/util/billing';
import { sessionActions } from '../store';

const FleetDashboardPage = () => {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [timestamp, setTimestamp] = useState(Date.now());
  const [announcement, setAnnouncement] = useState('');

  const server = useSelector((state) => state.session.server);
  const currentUser = useSelector((state) => state.session.user);
  const devices = useSelector((state) => Object.values(state.devices.items));
  const activeCount = devices.filter((d) => d.status === 'online').length;
  const expiredCount = items.filter((u) => {
    if (u.disabled) return true;
    if (u.attributes?.nextBillingDate) {
      return new Date() >= new Date(u.attributes.nextBillingDate);
    }
    return false;
  }).length;
  const compliantCount = devices.filter((d) => d.attributes.ais140).length;

  const [cashPaymentOpen, setCashPaymentOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [cashPlan, setCashPlan] = useState('basic');
  const [cashSaving, setCashSaving] = useState(false);

  useEffectAsync(async () => {
    try {
      const response = await fetchOrThrow('/api/users');
      const users = await response.json();
      setItems(users);
      setAnnouncement(server.attributes.systemAnnouncement || '');
    } finally {
      // Logic for cleanup if needed
    }
  }, [timestamp]);

  const handleRecordCashPayment = useCatch(async () => {
    setCashSaving(true);
    const plan = PLANS.find((p) => p.id === cashPlan);
    const currentExpiry = selectedUser.attributes?.nextBillingDate
      ? new Date(selectedUser.attributes.nextBillingDate)
      : new Date();
    const nextDate = calculateNextBillingDate(currentExpiry, cashPlan);
    const billingHistory = createBillingLog(selectedUser, cashPlan, 'CASH_ADMIN', plan.price);

    const updatedUser = {
      ...selectedUser,
      attributes: {
        ...(selectedUser.attributes || {}),
        plan: cashPlan,
        nextBillingDate: nextDate.toISOString(),
        billingHistory,
      },
      disabled: false,
    };

    await fetchOrThrow(`/api/users/${selectedUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedUser),
    });

    setTimestamp(Date.now());
    setCashPaymentOpen(false);
    setCashSaving(false);
    setSelectedUser(null);
  });

  const handleBroadcast = useCatch(async () => {
    const updatedServer = {
        ...server,
        attributes: { ...server.attributes, systemAnnouncement: announcement }
    };
    await fetchOrThrow(`/api/server`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedServer),
    });
    dispatch(sessionActions.updateServer(updatedServer));
  });

  const getStatusChip = (user) => {
    if (user.disabled)
      return (
        <Chip
          icon={<WarningIcon />}
          label="RESTRICTED"
          color="error"
          size="small"
          sx={{ fontWeight: 800 }}
        />
      );

    if (user.attributes?.nextBillingDate) {
      const expiry = new Date(user.attributes.nextBillingDate);
      if (new Date() >= expiry) {
        return (
          <Chip
            icon={<EventBusyIcon />}
            label="EXPIRED"
            color="warning"
            size="small"
            sx={{ fontWeight: 800 }}
          />
        );
      }
      return (
        <Chip
          icon={<CheckCircleIcon />}
          label="ACTIVE"
          color="success"
          size="small"
          sx={{ fontWeight: 800 }}
        />
      );
    }

    return <Chip label="TRIAL / UNSET" variant="outlined" size="small" />;
  };

  const filteredItems = items.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchKeyword.toLowerCase()),
  );

  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'Fleet Management']}>
      <Box sx={{ p: 4 }}>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-1px' }}>
            FLEET BILLING OVERSIGHT
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: 'none',
              }}
            >
              <Box sx={{ p: 1, bgcolor: '#dcfce7', borderRadius: '12px' }}>
                <CheckCircleIcon sx={{ color: '#16a34a' }} />
              </Box>
              <Box>
                <Typography variant="caption" color="textSecondary">
                  ACTIVE
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {activeCount}
                </Typography>
              </Box>
            </Paper>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: 'none',
              }}
            >
              <Box sx={{ p: 1, bgcolor: '#fee2e2', borderRadius: '12px' }}>
                <WarningIcon sx={{ color: '#dc2626' }} />
              </Box>
              <Box>
                <Typography variant="caption" color="textSecondary">
                  EXPIRED
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {expiredCount}
                </Typography>
              </Box>
            </Paper>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: 'none',
              }}
            >
              <Box sx={{ p: 1, bgcolor: '#e0f2fe', borderRadius: '12px' }}>
                <VerifiedUserIcon sx={{ color: '#0284c7' }} />
              </Box>
              <Box>
                <Typography variant="caption" color="textSecondary">
                  AIS140
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {compliantCount}
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Box>

        <Box sx={{ mb: 4, display: 'flex', gap: 2 }}>
          <TextField
            placeholder="Search fleet by name or email..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            sx={{ flexGrow: 1, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <TableContainer
          component={Paper}
          sx={{
            borderRadius: '20px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
            overflow: 'hidden',
          }}
        >
          <Table>
            <TableHead sx={{ bgcolor: 'rgba(59, 130, 246, 0.05)' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>CLIENT NAME</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>EMAIL IDENTITY</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>INFRA TIER</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>EXPIRATION STATUS</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow
                  key={item.id}
                  hover
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                  <TableCell>{item.email}</TableCell>
                  <TableCell
                    sx={{ textTransform: 'uppercase', fontWeight: 800, color: 'primary.main' }}
                  >
                    {item.attributes.plan || 'BASIC'}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {getStatusChip(item)}
                      <Typography variant="caption" sx={{ opacity: 0.6, fontWeight: 700 }}>
                        {item.attributes.nextBillingDate
                          ? formatTime(item.attributes.nextBillingDate, 'date')
                          : 'N/A'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Record Cash Payment">
                        <IconButton
                          color="success"
                          onClick={() => {
                            setSelectedUser(item);
                            setCashPlan(item.attributes.plan || 'basic');
                            setCashPaymentOpen(true);
                          }}
                        >
                          <PaymentIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Full Profile">
                        <IconButton
                          color="primary"
                          onClick={() => navigate(`/settings/user/${item.id}`)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Global Announcement Management */}
        <Paper sx={{ mt: 6, p: 4, borderRadius: '24px', background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <CampaignIcon sx={{ color: '#8b5cf6', fontSize: 32 }} />
                <Typography variant="h5" sx={{ fontWeight: 800 }}>GLOBAL SYSTEM ANNOUNCEMENT</Typography>
            </Box>
            <Typography variant="body2" sx={{ mb: 3, opacity: 0.7 }}>
                Broadcast a message to your entire fleet management interface. This will appear as a banner for all users to see immediately.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField 
                    fullWidth 
                    variant="outlined" 
                    placeholder="Enter announcement message (e.g., Scheduled Maintenance at 10 PM IST...)"
                    value={announcement}
                    onChange={(e) => setAnnouncement(e.target.value)}
                    sx={{ bgcolor: '#fff', borderRadius: '12px' }}
                />
                <Button 
                    variant="contained" 
                    onClick={handleBroadcast}
                    sx={{ px: 4, borderRadius: '12px', bgcolor: '#8b5cf6', '&:hover': { bgcolor: '#7c3aed' } }}
                >
                    BROADCAST
                </Button>
                <Button 
                    variant="outlined" 
                    color="error"
                    onClick={() => {
                        setAnnouncement('');
                        // Trigger immediate clear
                    }}
                    sx={{ borderRadius: '12px' }}
                >
                    CLEAR
                </Button>
            </Box>
        </Paper>
      </Box>

      {/* Manual Payment Dialog */}
      <Dialog
        open={cashPaymentOpen}
        onClose={() => setCashPaymentOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '24px', p: 1 } }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 900 }}>
            MANUAL RECONCILIATION
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, opacity: 0.7 }}>
            Record a cash or bank transfer payment for <strong>{selectedUser?.name}</strong>. This
            will automatically update their next billing date and restore access.
          </Typography>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Selected Subscription Plan</InputLabel>
            <Select
              value={cashPlan}
              label="Selected Subscription Plan"
              onChange={(e) => setCashPlan(e.target.value)}
              sx={{ borderRadius: '12px' }}
            >
              {PLANS.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name} (₹{p.price})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => setCashPaymentOpen(false)}
                sx={{ borderRadius: '12px', py: 1.5 }}
              >
                Cancel
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                fullWidth
                variant="contained"
                color="success"
                onClick={handleRecordCashPayment}
                disabled={cashSaving}
                sx={{ borderRadius: '12px', py: 1.5, fontWeight: 800 }}
              >
                {cashSaving ? 'Processing...' : 'Confirm Cash'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Dialog>
    </PageLayout>
  );
};

export default FleetDashboardPage;
