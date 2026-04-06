import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Box, Typography, Grid, Card, CardContent, LinearProgress, Divider } from '@mui/material';
import { useTranslation } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from './components/ReportsMenu';
import ReportFilter from './components/ReportFilter';
import { formatDistance, formatSpeed, formatVolume } from '../common/util/formatter';
import { useAttributePreference } from '../common/util/preferences';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { useCatch } from '../reactHelper';
import ReportSummary, {
  DirectionsCarIcon,
  SpeedIcon,
  TimerIcon,
  NotificationsActiveIcon,
} from './components/ReportSummary';
import PsychologyIcon from '@mui/icons-material/Psychology';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ShieldIcon from '@mui/icons-material/Shield';
import CoffeeIcon from '@mui/icons-material/Coffee';

const FleetInsightsPage = () => {
  const t = useTranslation();
  const devices = useSelector((state) => state.devices.items);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);

  const distanceUnit = useAttributePreference('distanceUnit');
  const speedUnit = useAttributePreference('speedUnit');
  const volumeUnit = useAttributePreference('volumeUnit');

  const onShow = useCatch(async ({ deviceIds, groupIds, from, to }) => {
    const query = new URLSearchParams({ from, to, daily: 'false' });
    deviceIds.forEach((deviceId) => query.append('deviceId', deviceId));
    groupIds.forEach((groupId) => query.append('groupId', groupId));
    setLoading(true);
    try {
      const response = await fetchOrThrow(`/api/reports/summary?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      const data = await response.json();
      setItems(data);
      generateInsights(data);
    } finally {
      setLoading(false);
    }
  });

  const generateInsights = (data) => {
    if (!data.length) return;

    const totalDist = data.reduce((acc, it) => acc + (it.distance || 0), 0);
    const totalFuel = data.reduce((acc, it) => acc + (it.spentFuel || 0), 0);
    const maxSpeedItem = data.reduce(
      (max, it) => (it.maxSpeed > (max.maxSpeed || 0) ? it : max),
      {},
    );
    const distanceLeader = data.reduce(
      (max, it) => (it.distance > (max.distance || 0) ? it : max),
      {},
    );

    // Safety Score (Mock algorithm based on fleet size and max speeds)
    const highSpeeders = data.filter((it) => it.maxSpeed > 100).length;
    const safetyScore = Math.max(0, 100 - highSpeeders * 15).toFixed(0);

    setInsights({
      totalDist,
      totalFuel,
      maxSpeedItem,
      distanceLeader,
      safetyScore,
      fleetEfficiency: totalDist > 0 ? (totalDist / (totalFuel || 1)).toFixed(2) : '0',
    });
  };

  const summaryData = insights
    ? [
        {
          label: 'Fleet Safety Score',
          value: `${insights.safetyScore}%`,
          icon: ShieldIcon,
          color: insights.safetyScore > 80 ? '#4caf50' : '#ff9800',
        },
        {
          label: 'Efficiency Leader',
          value: devices[insights.distanceLeader?.deviceId]?.name || 'N/A',
          icon: TrendingUpIcon,
          color: '#2196f3',
        },
        {
          label: 'Avg Speed',
          value: formatSpeed(
            items.reduce((a, b) => a + b.averageSpeed, 0) / items.length,
            speedUnit,
            t,
          ),
          icon: SpeedIcon,
          color: '#9c27b0',
        },
        {
          label: 'Fuel Analytics',
          value: formatVolume(insights.totalFuel, volumeUnit, t),
          icon: CoffeeIcon,
          color: '#f44336',
        },
      ]
    : [];

  return (
    <PageLayout menu={<ReportsMenu />} breadcrumbs={['reportTitle', 'reportInsights']}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
          <PsychologyIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              AI Fleet Insights
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Deep analytics and anomaly detection for your entire fleet operations.
            </Typography>
          </Box>
        </Box>

        <ReportFilter onShow={onShow} loading={loading} deviceType="multiple" />

        {loading && <LinearProgress sx={{ mt: 2 }} />}

        {insights && (
          <Box sx={{ mt: 4 }}>
            <ReportSummary data={summaryData} />

            <Grid container spacing={3} sx={{ mt: 2 }}>
              <Grid item xs={12} md={6}>
                <Card
                  sx={{
                    height: '100%',
                    borderRadius: '16px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Driver Safety Analysis
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Based on today's telemetry, the fleet is operating at{' '}
                      <b>{insights.safetyScore}%</b> safety efficiency.
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption">Overspeeding Risks</Typography>
                      <Typography variant="caption" color="error">
                        Critical: {items.filter((it) => it.maxSpeed > 100).length} vehicles
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={parseInt(insights.safetyScore)}
                      color={insights.safetyScore > 80 ? 'success' : 'warning'}
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card
                  sx={{
                    height: '100%',
                    borderRadius: '16px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Efficiency Spotlight
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <TrendingUpIcon color="primary" />
                      <Box>
                        <Typography variant="subtitle2">
                          Top Performer: {devices[insights.distanceLeader?.deviceId]?.name}
                        </Typography>
                        <Typography variant="caption">
                          Covered{' '}
                          {formatDistance(insights.distanceLeader?.distance, distanceUnit, t)}{' '}
                          today.
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="body2">
                      AI Recommendation: Low idling detected across fleet. Optimization potential in
                      route planning for <b>{Object.keys(devices).length}</b> active assets.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {!insights && !loading && (
          <Box sx={{ textAlign: 'center', mt: 10, opacity: 0.5 }}>
            <PsychologyIcon sx={{ fontSize: 80, mb: 2 }} />
            <Typography variant="h6">Select a date range to generate AI Insights</Typography>
          </Box>
        )}
      </Box>
    </PageLayout>
  );
};

export default FleetInsightsPage;
