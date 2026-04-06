import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
} from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';
import WarningIcon from '@mui/icons-material/Warning';
import HistoryIcon from '@mui/icons-material/History';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';

const loadRazorpay = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const HardlockPaymentView = ({ onLogout, onSuccess }) => {
  const user = useSelector((state) => state.session.user);
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [paying, setPaying] = useState(false);
  const [viewingDevices, setViewingDevices] = useState(false);

  const isExpired =
    user?.attributes?.nextBillingDate && new Date() >= new Date(user.attributes.nextBillingDate);
  const isAdminBlocked = user?.disabled;

  useEffect(() => {
    fetch('/api/billing/my-bill')
      .then((r) => r.json())
      .then((data) => {
        setBill(data);
        setSelectedPlan(data.activePlan !== 'NONE' ? data.activePlan : data.plans?.[0]?.id || '');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handlePay = async () => {
    setPaying(true);
    const plan = bill.plans.find((p) => p.id === selectedPlan);
    const totalPayable =
      bill.orderSummary?.grandTotal || bill.unpaidDebt + (plan?.price || 0) * (bill.fleetSize || 1);

    try {
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error('Razorpay SDK failed to load');

      const orderRes = await fetch('/api/billing/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: bill.userId, planId: selectedPlan, amount: totalPayable }),
      });

      if (!orderRes.ok) throw new Error('Failed to create payment order');
      const orderData = await orderRes.json();

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: 'INR',
        name: 'GeoSurePath Enterprise',
        description: `Reactivate Fleet: ${bill.subscription?.planId || 'Standard'}`,
        order_id: orderData.orderId,
        handler: async (response) => {
          const verifyRes = await fetch('/api/billing/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          if (verifyRes.ok) {
            const nextDate = calculateNextBillingDate(
              new Date(user.attributes.nextBillingDate || new Date()),
              selectedPlan,
            );
            const billingHistory = createBillingLog(bill, selectedPlan, 'RAZORPAY', totalPayable);

            await fetch(`/api/users/${user.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...user,
                attributes: {
                  ...user.attributes,
                  plan: selectedPlan,
                  nextBillingDate: nextDate.toISOString(),
                  billingHistory,
                },
                disabled: false,
              }),
            });

            onSuccess();
            window.location.reload();
          } else {
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: { email: bill.email },
        theme: { color: '#ef4444' },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      alert(err.message || 'Payment flow initiation failed');
    } finally {
      setPaying(false);
    }
  };

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
        <CircularProgress sx={{ color: '#fff' }} />
      </Box>
    );

  const activePlan = bill?.plans?.find((p) => p.id === selectedPlan);
  const totalPayable = bill?.unpaidDebt + (activePlan?.price || 0) * (bill?.fleetSize || 1);
  const summary = bill?.orderSummary;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 20 }}
    >
      <Box
        sx={{
          p: 5,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(40px) saturate(200%)',
          borderRadius: '40px',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          boxShadow: '0 40px 100px -30px rgba(0, 0, 0, 0.8), 0 0 40px rgba(239, 68, 68, 0.1)',
        }}
      >
        <Typography
          variant="h4"
          sx={{
            color: '#f87171',
            fontWeight: 900,
            mb: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            letterSpacing: '-1px',
          }}
        >
          <WarningIcon sx={{ fontSize: 40 }} />
          {isAdminBlocked
            ? 'Access Restricted'
            : isExpired
              ? 'Subscription Expired'
              : 'Payment Required'}
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 3 }}>
          {isAdminBlocked
            ? 'Your account has been restricted by the administrator. Please contact support for reconciliation.'
            : isExpired
              ? `Your GeoSurePath fleet tier expired on ${new Date(user.attributes.nextBillingDate).toLocaleDateString()}. Please renew to restore live tracking.`
              : 'Your Track Elite enterprise account requires immediate billing reconciliation. All vehicle tracking services are currently restricted.'}
        </Typography>

        <Box
          sx={{
            mb: 4,
            p: 3,
            bgcolor: 'rgba(255,255,255,0.03)',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <Typography
            variant="overline"
            sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 800, mb: 2, display: 'block' }}
          >
            RECONCILIATION SUMMARY
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
              Outstanding Arrears
            </Typography>
            <Typography variant="body2" sx={{ color: '#fff', fontWeight: 700 }}>
              ₹{summary?.debt?.total || bill?.unpaidDebt || 0}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
              {activePlan?.name || 'Standard'} Sub (x{bill?.fleetSize || 1} units)
            </Typography>
            <Typography variant="body2" sx={{ color: '#fff', fontWeight: 700 }}>
              ₹{summary?.subscription?.base || (activePlan?.price || 0) * (bill?.fleetSize || 1)}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
              Regulatory Compliance Fee (18% GST)
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>
              ₹
              {summary?.tax ||
                Math.round(
                  (summary?.subscription?.base ||
                    (activePlan?.price || 0) * (bill?.fleetSize || 1)) * 0.18,
                )}
            </Typography>
          </Box>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: '1.2rem' }}>
                Grand Total
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'rgba(255,255,255,0.4)', display: 'block' }}
              >
                Secure Platform Re-initiation
              </Typography>
            </Box>
            <Typography
              sx={{
                color: '#10b981',
                fontWeight: 900,
                fontSize: '1.8rem',
                textShadow: '0 0 20px rgba(16, 185, 129, 0.3)',
              }}
            >
              ₹
              {summary?.grandTotal ||
                totalPayable + Math.round((activePlan?.price || 0) * (bill?.fleetSize || 1) * 0.18)}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            fullWidth
            onClick={onLogout}
            sx={{
              py: 1,
              borderRadius: '16px',
              color: 'rgba(255,255,255,0.6)',
              fontWeight: 700,
              textTransform: 'none',
            }}
          >
            Exit to Login
          </Button>
          <Button
            fullWidth
            variant="contained"
            disabled={!selectedPlan || paying}
            onClick={handlePay}
            sx={{
              py: 1.5,
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              fontWeight: 900,
            }}
          >
            {paying ? 'Verifying...' : 'Pay & Unlock Now'}
          </Button>
        </Box>
      </Box>
    </motion.div>
  );
};

export default HardlockPaymentView;
