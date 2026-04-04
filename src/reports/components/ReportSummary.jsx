import React from 'react';
import { Box, Card, CardContent, Typography, Grid } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import SpeedIcon from '@mui/icons-material/Speed';
import TimerIcon from '@mui/icons-material/Timer';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';

const useStyles = makeStyles()((theme) => ({
  card: {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
  },
  icon: {
    fontSize: '2rem',
    marginBottom: theme.spacing(1),
    color: theme.palette.primary.main,
  },
  value: {
    fontWeight: 900,
    fontSize: '1.5rem',
    color: '#fff',
  },
  label: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontSize: '0.75rem',
  },
}));

const SummaryCard = ({ icon: Icon, label, value, color }) => {
  const { classes } = useStyles();
  return (
    <Card className={classes.card} elevation={0}>
      <CardContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <Icon className={classes.icon} sx={{ color }} />
          <Typography className={classes.value}>{value}</Typography>
          <Typography className={classes.label}>{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

const ReportSummary = ({ data }) => {
  return (
    <Box sx={{ p: 2, mb: 2 }}>
      <Grid container spacing={3}>
        {data.map((item, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <SummaryCard {...item} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ReportSummary;
export { DirectionsCarIcon, SpeedIcon, TimerIcon, NotificationsActiveIcon };
