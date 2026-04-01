import React from 'react';
import { Box, Typography, Grid, Paper, CircularProgress, Chip, Divider } from '@mui/material';
import {
  TrendingUp as RevenueIcon,
  People as UsersIcon,
  GpsFixed as DevicesIcon,
  Warning as OverdueIcon,
  CheckCircle as PaidIcon,
  HourglassBottom as GraceIcon,
  MonetizationOn as MrrIcon,
  BarChart as ChartIcon,
} from '@mui/icons-material';

const StatCard = ({ title, value, icon, color = '#3b82f6', subtitle, badge }) => (
  <Paper elevation={0} sx={{
    p: 3,
    borderRadius: '20px',
    border: `1px solid ${color}22`,
    background: `linear-gradient(135deg, #fff 60%, ${color}08 100%)`,
    boxShadow: `0 4px 24px ${color}10`,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
    transition: 'transform 0.2s',
    '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 8px 32px ${color}20` },
  }}>
    <Box sx={{ position: 'absolute', top: -15, right: -15, opacity: 0.06, fontSize: 100, color }}>
      {icon}
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
      <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: `${color}15`, color, display: 'inline-flex' }}>
        {React.cloneElement(icon, { fontSize: 'small' })}
      </Box>
      {badge !== undefined && (
        <Chip label={` ${badge}`} size="small" sx={{ bgcolor: `${color}15`, color, fontWeight: 700, fontSize: '0.7rem' }} />
      )}
    </Box>
    <Typography variant="h3" fontWeight={900} sx={{ color, lineHeight: 1, mb: 0.5 }}>{value}</Typography>
    <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#1e293b' }}>{title}</Typography>
    {subtitle && <Typography variant="caption" sx={{ opacity: 0.45, mt: 0.5 }}>{subtitle}</Typography>}
  </Paper>
);

const AdminAnalytics = ({ stats, loading }) => {
  if (loading) return (
    <Box sx={{ p: 5, textAlign: 'center' }}>
      <CircularProgress size={40} sx={{ color: '#3b82f6' }} />
      <Typography variant="body2" sx={{ mt: 2, opacity: 0.5 }}>Loading platform insights</Typography>
    </Box>
  );

  const totalRevenue = stats?.totalRevenue || 0;
  const projected = stats?.projectedRevenue || stats?.mrr || 0;
  const totalClients = stats?.totalClients || stats?.totalUsers || 0;
  const totalDevices = stats?.totalVehicles || stats?.totalDevices || 0;
  const overdue = stats?.overdueUsers || 0;

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <ChartIcon color="primary" />
        <Typography variant="h5" fontWeight={900}>Platform Overview</Typography>
        <Chip label="Live" color="success" size="small" sx={{ fontWeight: 700, animation: 'pulse 2s infinite' }} />
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Revenue"
            value={`${Number(totalRevenue).toLocaleString('en-IN')}`}
            icon={<RevenueIcon />}
            color="#10b981"
            subtitle="All time collected"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Projected MRR"
            value={`${Number(projected).toLocaleString('en-IN')}`}
            icon={<MrrIcon />}
            color="#3b82f6"
            subtitle="This billing cycle"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Clients"
            value={totalClients}
            icon={<UsersIcon />}
            color="#6366f1"
            subtitle="Registered accounts"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Overdue Accounts"
            value={overdue}
            icon={<OverdueIcon />}
            color={overdue > 0 ? '#ef4444' : '#10b981'}
            subtitle={overdue > 0 ? 'Require attention' : 'All accounts clear'}
          />
        </Grid>
      </Grid>

      {/* Secondary Row */}
      <Grid container spacing={3} sx={{ mt: 0 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Fleet Units"
            value={totalDevices}
            icon={<DevicesIcon />}
            color="#0ea5e9"
            subtitle="Registered GPS devices"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Subscriptions"
            value={stats?.activeVehicles || totalClients - overdue}
            icon={<PaidIcon />}
            color="#22c55e"
            subtitle="Paid & current"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="In Grace Period"
            value={stats?.gracePeriodCount || 0}
            icon={<GraceIcon />}
            color="#f59e0b"
            subtitle="Pending payment"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: '20px', border: '1px solid #e2e8f0', height: '100%' }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>Plan Distribution</Typography>
            {stats?.planDistribution && Object.keys(stats.planDistribution).length > 0 ? (
              Object.entries(stats.planDistribution).map(([plan, count]) => (
                <Box key={plan} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" fontWeight={600}>{plan.toUpperCase()}</Typography>
                  <Chip label={count} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
                </Box>
              ))
            ) : (
              <Typography variant="caption" sx={{ opacity: 0.4 }}>No plan data available</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminAnalytics;
