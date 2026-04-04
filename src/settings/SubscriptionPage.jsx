import React, { useState } from 'react';
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
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import StarIcon from '@mui/icons-material/Star';
import { makeStyles } from 'tss-react/mui';
import { useTranslation } from '../common/components/LocalizationProvider';
import { sessionActions } from '../store';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { PLANS } from '../common/util/plans';
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
  const t = useTranslation();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.session.user);
  const currentPlanId = user.attributes.plan || 'basic';

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

      const updatedUser = {
        ...user,
        attributes: {
          ...user.attributes,
          plan: selectedPlan.id,
        },
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
        <Typography variant="h4" gutterBottom align="center" sx={{ mb: 4, fontWeight: 700 }}>
          Choose Your GeoSurePath Plan
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
                      ${plan.price}
                    </Typography>
                    <Typography variant="subtitle2" color="textSecondary" sx={{ ml: 1 }}>
                      / month
                    </Typography>
                  </Box>
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
                    variant={plan.id === currentPlanId ? 'outlined' : (plan.popular ? 'contained' : 'outlined')}
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
      </Box>

      {/* Payment Dialog */}
      <Dialog open={!!selectedPlan} onClose={() => setSelectedPlan(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm Plan Upgrade</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            You are about to switch to the <strong>{selectedPlan?.name}</strong> plan.
          </Typography>
          <Typography variant="body2" color="textSecondary">
            This will update your features immediately. Your next billing cycle will reflect the new amount of ${selectedPlan?.price}/mo.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelectedPlan(null)} disabled={loading}>Cancel</Button>
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
          <Typography>Your plan has been updated successfully. Welcome to the elite GeoSurePath tier!</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuccess(false)} variant="contained">Great!</Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
};

export default SubscriptionPage;
