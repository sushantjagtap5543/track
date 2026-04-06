import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Box,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import CheckIcon from '@mui/icons-material/Check';
import StarIcon from '@mui/icons-material/Star';
import HistoryIcon from '@mui/icons-material/History';
import { makeStyles } from 'tss-react/mui';
import { sessionActions } from '../store';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { PLANS } from '../common/util/plans';
import { calculateNextBillingDate, createBillingLog } from '../common/util/billing';
import SettingsMenu from './components/SettingsMenu';
import PageLayout from '../common/components/PageLayout';

const useStyles = makeStyles()((theme) => ({
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    transition: 'transform 0.2s',
    '&:hover': {
      transform: 'translateY(-5px)',
    },
  },
  popular: {
    border: `2px solid ${theme.palette.primary.main}`,
  },
  popularBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: theme.palette.primary.main,
    color: 'white',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
  },
}));

const SubscriptionPage = () => {
  const { classes } = useStyles();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.session.user);
  const currentPlanId = user.attributes.plan || 'basic';

  const devices = useSelector((state) => Object.values(state.devices.items));
  const compliantCount = devices.filter((d) => d.attributes.ais140).length;
  const totalDevices = devices.length;
  const complianceRate = totalDevices > 0 ? Math.round((compliantCount / totalDevices) * 100) : 100;

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSelectPlan = (plan) => {
    if (plan.id !== currentPlanId) {
      setSelectedPlan(plan);
    }
  };

  const handleConfirmPayment = async () => {
    setLoading(true);
    try {
      // Simulate Payment Delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const nextDate = calculateNextBillingDate(new Date(user.attributes.nextBillingDate || new Date()), selectedPlan.id);
      const billingHistory = createBillingLog(user, selectedPlan.id, 'RAZORPAY_SIM', selectedPlan.price);

      const updatedUser = {
        ...user,
        attributes: {
          ...user.attributes,
          plan: selectedPlan.id,
          nextBillingDate: nextDate.toISOString(),
          billingHistory,
        },
        disabled: false,
      };

      const response = await fetchOrThrow(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser),
      });

      dispatch(sessionActions.updateUser(await response.json()));
      setSuccess(true);
      setSelectedPlan(null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'userBilling']}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom align="center" sx={{ mb: 2, fontWeight: 700 }}>
          Manage Your GeoSurePath Fleet Tier
        </Typography>

        {user.attributes?.nextBillingDate && (
          <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
            <Chip
              icon={<HistoryIcon />}
              label={`Active Subscription until: ${new Date(user.attributes.nextBillingDate).toLocaleDateString()}`}
              color={new Date(user.attributes.nextBillingDate) > new Date() ? 'success' : 'error'}
              variant="outlined"
              sx={{ fontWeight: 700, borderRadius: '12px', px: 2, py: 2.5 }}
            />
          </Box>
        )}

        {/* Compliance Ledger Card */}
        <Card
          sx={{
            mb: 6,
            borderRadius: '24px',
            background:
              'linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Grid container spacing={4} alignItems="center">
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <WorkspacePremiumIcon color="primary" sx={{ fontSize: 40 }} />
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff' }}>
                    FLEET COMPLIANCE LEDGER
                  </Typography>
                </Box>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)', mb: 3 }}>
                  Official AIS140 Regulatory Status for your active fleet.
                </Typography>
                <Box sx={{ display: 'flex', gap: 4 }}>
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 900, color: '#4caf50' }}>
                      {compliantCount}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}
                    >
                      COMPLIANT DEVICES
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="h3"
                      sx={{
                        fontWeight: 900,
                        color: totalDevices > compliantCount ? '#ff9800' : '#4caf50',
                      }}
                    >
                      {totalDevices - compliantCount}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}
                    >
                      ACTION REQUIRED
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={6} sx={{ textAlign: 'center' }}>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <CircularProgress
                    variant="determinate"
                    value={complianceRate}
                    size={140}
                    thickness={6}
                    sx={{ color: complianceRate > 80 ? '#4caf50' : '#ff9800' }}
                  />
                  <Box
                    sx={{
                      top: 0,
                      left: 0,
                      bottom: 0,
                      right: 0,
                      position: 'absolute',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography
                      variant="h4"
                      component="div"
                      sx={{ fontWeight: 900, color: '#fff' }}
                    >
                      {complianceRate}%
                    </Typography>
                  </Box>
                </Box>
                <Typography
                  variant="subtitle2"
                  sx={{ mt: 2, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}
                >
                  Total AIS140 Compliance Rating
                </Typography>
                {complianceRate < 100 && (
                  <Alert
                    severity="warning"
                    variant="outlined"
                    sx={{
                      mt: 2,
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 152, 0, 0.3)',
                      color: '#ffb74d',
                    }}
                  >
                    Certification Gap Detected. Upgrade non-compliant units to maintain fleet
                    integrity.
                  </Alert>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Typography
          variant="h5"
          gutterBottom
          align="center"
          sx={{ mb: 4, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}
        >
          UPGRADE INFRASTRUCTURE TIER
        </Typography>
        <Grid container spacing={3} justifyContent="center">
          {PLANS.map((plan) => (
            <Grid item xs={12} sm={6} md={4} key={plan.id}>
              <Card className={`${classes.card} ${plan.popular ? classes.popular : ''}`}>
                {plan.popular && (
                  <div className={classes.popularBadge}>
                    <StarIcon fontSize="inherit" /> POPULAR
                  </div>
                )}
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h5" color="primary" gutterBottom sx={{ fontWeight: 700 }}>
                    {plan.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      ₹{plan.price}
                    </Typography>
                    <Typography variant="subtitle2" color="textSecondary" sx={{ ml: 1 }}>
                      {plan.id === 'basic'
                        ? '/ month'
                        : plan.id === 'premium'
                          ? '/ 6 months'
                          : '/ year'}
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{ color: 'rgba(255,255,255,0.5)', mb: 2, display: 'block' }}
                  >
                    Incl. GST, Server, Cloud Storage & Maintenance
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <List dense>
                    {plan.features.map((feature, i) => (
                      <ListItem key={i} disableGutters>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <CheckIcon color="success" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={feature} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    fullWidth
                    variant={
                      plan.id === currentPlanId
                        ? 'outlined'
                        : plan.popular
                          ? 'contained'
                          : 'outlined'
                    }
                    color={plan.id === currentPlanId ? 'inherit' : 'primary'}
                    disabled={plan.id === currentPlanId}
                    onClick={() => handleSelectPlan(plan)}
                  >
                    {plan.id === currentPlanId ? 'Active Plan' : 'Select Plan'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Client Billing History Section */}
        <Typography
          variant="h5"
          align="center"
          sx={{ mt: 8, mb: 4, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}
        >
          TRANSACTION & BILLING HISTORY
        </Typography>
        <Card sx={{ 
          maxWidth: '800px', 
          mx: 'auto', 
          borderRadius: '24px',
          background: 'rgba(30, 41, 59, 0.4)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <List sx={{ p: 0 }}>
            {JSON.parse(user.attributes.billingHistory || '[]').map((log, index, array) => (
              <ListItem key={index} divider={index < array.length - 1} sx={{ py: 2, px: 4 }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: '#fff' }}>{log.planName}</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 900, color: '#10b981' }}>
                        ₹{log.amount}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>{log.method}</Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                        {new Date(log.date).toLocaleString()}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
            {(!user.attributes.billingHistory || JSON.parse(user.attributes.billingHistory).length === 0) && (
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <HistoryIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.1)', mb: 2 }} />
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                  No billing records found. Your subscription history will appear here.
                </Typography>
              </Box>
            )}
          </List>
        </Card>
      </Box>

      {/* Payment Dialog */}
      <Dialog open={!!selectedPlan} onClose={() => setSelectedPlan(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm Plan Upgrade</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            You are about to switch to the <strong>{selectedPlan?.name}</strong> plan.
          </Typography>
          <Typography variant="body2" color="textSecondary">
            This will update your features immediately. Your next billing cycle will reflect the new
            amount of ₹{selectedPlan?.price}{' '}
            {selectedPlan?.id === 'basic'
              ? '/mo'
              : selectedPlan?.id === 'premium'
                ? '/6-mo'
                : '/yr'}
            . Prices are all-inclusive of taxes and infrastructure costs.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelectedPlan(null)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmPayment}
            variant="contained"
            disabled={loading}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {loading ? 'Processing...' : 'Confirm & Pay'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={success} onClose={() => setSuccess(false)}>
        <DialogTitle>Success!</DialogTitle>
        <DialogContent>
          <Typography>
            Your plan has been updated successfully. Welcome to the elite GeoSurePath tier!
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuccess(false)} variant="contained">
            Great!
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
};

export default SubscriptionPage;
