import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import {
  IconButton,
  Tooltip,
  Avatar,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Typography,
  Snackbar,
  Box,
  Button,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import Battery20Icon from '@mui/icons-material/Battery20';
import ErrorIcon from '@mui/icons-material/Error';
import SecurityIcon from '@mui/icons-material/Security';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { devicesActions, geofencesActions } from '../store';
import { formatAlarm, formatPercentage, formatStatus } from '../common/util/formatter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { mapIconKey, mapIcons } from '../map/core/preloadImages';
import { useAttributePreference } from '../common/util/preferences';
import { snackBarDurationShortMs } from '../common/util/duration';

import { useSafeParking } from '../common/util/useSafeParking';

dayjs.extend(relativeTime);

const useStyles = makeStyles()((theme) => ({
  icon: {
    width: '25px',
    height: '25px',
    filter: 'brightness(0) invert(1)',
  },
  selected: {
    backgroundColor: 'rgba(59, 130, 246, 0.15) !important',
    borderLeft: '4px solid #3b82f6',
  },
  success: { color: '#22c55e' },
  warning: { color: '#f59e0b' },
  error: { color: '#ef4444' },
  neutral: { color: 'rgba(255, 255, 255, 0.4)' },
  activeSecurity: {
    color: '#06b6d4',
    filter: 'drop-shadow(0 0 6px rgba(6, 182, 212, 0.8))',
  },
  ignitionStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.25),
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 800,
    fontSize: '0.6rem',
  },
  ignitionOn: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    color: '#22c55e',
    border: `1px solid #22c55e`,
  },
  ignitionOff: {
    backgroundColor: 'rgba(211, 47, 47, 0.15)',
    color: '#ef4444',
    border: `1px solid #ef4444`,
  },
  immobilized: {
    borderLeft: `5px solid #ef4444 !important`,
    backgroundColor: 'rgba(211, 47, 47, 0.08) !important',
  },
}));

const DeviceRow = ({ devices, index, style }) => {
  const { classes } = useStyles();
  const theme = useTheme();
  const dispatch = useDispatch();
  const t = useTranslation();
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  const [toastMessage, setToastMessage] = useState('');
  const [pendingIgnition, setPendingIgnition] = useState(false);

  const item = devices[index];
  const position = useSelector((state) => state.session.positions[item.id]);
  const { isSafeParkingActive, toggleSafeParking } = useSafeParking(item, position);

  const handleSafeParking = (e) => {
    e.stopPropagation();
    toggleSafeParking();
  };

  const devicePrimary = useAttributePreference('devicePrimary', 'name');
  const primaryValue = item[devicePrimary] || item.name;

  const secondaryText = () => {
    let status;
    if (item.status === 'online' || !item.lastUpdate) {
      status = formatStatus(item.status, t);
    } else {
      status = dayjs(item.lastUpdate).fromNow();
    }
    return status;
  };

  const isImmobilized = position?.attributes?.ignition === false;

  return (
    <div style={style}>
      <ListItemButton
        key={item.id}
        divider
        onClick={() => dispatch(devicesActions.selectId(item.id))}
        selected={selectedDeviceId === item.id}
        className={`${selectedDeviceId === item.id ? classes.selected : ''} ${isImmobilized ? classes.immobilized : ''}`}
        sx={{ transition: 'all 0.2s' }}
      >
        <ListItemAvatar>
          <Avatar>
            <img className={classes.icon} src={mapIcons[mapIconKey(item.category)]} alt="" />
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ fontWeight: 700 }}>{primaryValue}</Typography>
              {position && (
                <Box sx={{ display: 'flex', gap: theme.spacing(0.5), alignItems: 'center' }}>
                  <Tooltip
                    title={`${t('eventAlarm')}: ${formatAlarm(position.attributes?.alarm || '', t)}`}
                  >
                    <IconButton
                      size="small"
                      sx={{ opacity: position.attributes?.alarm ? 1 : 0.3, p: 0 }}
                    >
                      <ErrorIcon
                        fontSize="small"
                        className={position.attributes?.alarm ? classes.error : classes.neutral}
                      />
                    </IconButton>
                  </Tooltip>
                  <Tooltip
                    title={`${t('positionBatteryLevel')}: ${formatPercentage(position.attributes?.batteryLevel || 100)}`}
                  >
                    <IconButton size="small" sx={{ p: 0 }}>
                      {(position.attributes?.batteryLevel || 100) > 70 ? (
                        <BatteryFullIcon fontSize="small" className={classes.success} />
                      ) : (
                        <Battery20Icon fontSize="small" className={classes.error} />
                      )}
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </Box>
          }
          secondary={
            <Box
              sx={{ display: 'flex', flexDirection: 'column', gap: theme.spacing(0.5), mt: 0.5 }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {secondaryText()}
                </Typography>
                {position && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: theme.spacing(1) }}>
                    <Tooltip title={isSafeParkingActive ? 'SafeZone Active' : 'Enable SafeZone'}>
                      <IconButton
                        size="small"
                        onClick={handleSafeParking}
                        sx={{
                          p: '3px',
                          border: '1px solid',
                          borderColor: isSafeParkingActive ? '#06b6d4' : 'rgba(255,255,255,0.1)',
                          background: isSafeParkingActive ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
                        }}
                      >
                        <SecurityIcon
                          sx={{ fontSize: 18 }}
                          className={isSafeParkingActive ? classes.activeSecurity : classes.neutral}
                        />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={!isImmobilized ? 'Engine Running' : 'Engine Stopped'}>
                      <span
                        className={`${classes.ignitionStatus} ${!isImmobilized ? classes.ignitionOn : classes.ignitionOff}`}
                      >
                        {!isImmobilized ? 'ON' : 'OFF'}
                      </span>
                    </Tooltip>
                    <Button
                      variant="contained"
                      size="small"
                      color={!isImmobilized ? 'error' : 'success'}
                      onClick={(e) => handleIgnitionToggle(e, item.id, !isImmobilized)}
                      sx={{
                        fontSize: '0.55rem',
                        height: '20px',
                        minWidth: '50px',
                        padding: '0 6px',
                        fontWeight: 800,
                        borderRadius: '12px',
                      }}
                      disabled={pendingIgnition}
                    >
                      {!isImmobilized ? 'STOP' : 'START'}
                    </Button>
                  </Box>
                )}
              </Box>
            </Box>
          }
        />
      </ListItemButton>
      <Snackbar
        open={!!toastMessage}
        onClose={() => setToastMessage('')}
        autoHideDuration={snackBarDurationShortMs}
        message={toastMessage}
      />
    </div>
  );
};

export default DeviceRow;
