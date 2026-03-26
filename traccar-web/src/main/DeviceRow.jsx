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
} from '@mui/material';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull';
import Battery60Icon from '@mui/icons-material/Battery60';
import BatteryCharging60Icon from '@mui/icons-material/BatteryCharging60';
import Battery20Icon from '@mui/icons-material/Battery20';
import BatteryCharging20Icon from '@mui/icons-material/BatteryCharging20';
import ErrorIcon from '@mui/icons-material/Error';
import SecurityIcon from '@mui/icons-material/Security';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { devicesActions, geofencesActions } from '../store';
import {
  formatAlarm,
  formatBoolean,
  formatPercentage,
  formatStatus,
  getStatusColor,
  formatSpeed,
  formatDistance,
} from '../common/util/formatter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { mapIconKey, mapIcons } from '../map/core/preloadImages';
import { useAdministrator } from '../common/util/permissions';
import EngineIcon from '../resources/images/data/engine.svg?react';
import { useAttributePreference } from '../common/util/preferences';
import GeofencesValue from '../common/components/GeofencesValue';
import DriverValue from '../common/components/DriverValue';
import MotionBar from './components/MotionBar';
import { snackBarDurationShortMs } from '../common/util/duration';

dayjs.extend(relativeTime);

const useStyles = makeStyles()((theme) => ({
  icon: {
    width: '25px',
    height: '25px',
    filter: 'brightness(0) invert(1)',
  },
  batteryText: {
    fontSize: '0.75rem',
    fontWeight: 'normal',
    lineHeight: '0.875rem',
  },
  success: {
    color: theme.palette.success.main,
  },
  warning: {
    color: theme.palette.warning.main,
  },
  error: {
    color: theme.palette.error.main,
  },
  neutral: {
    color: theme.palette.neutral.main,
  },
  selected: {
    backgroundColor: theme.palette.action.selected,
  },
  ignitionStatus: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
    padding: '2px 6px',
    borderRadius: '12px',
    fontSize: '0.65rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    lineHeight: 1,
    pointerEvents: 'none',
  },
  ignitionOn: {
    backgroundColor: 'rgba(46, 125, 50, 0.15)',
    color: theme.palette.success.main,
    border: `1px solid ${theme.palette.success.main}`,
  },
  ignitionOff: {
    backgroundColor: 'rgba(158, 158, 158, 0.12)',
    color: theme.palette.neutral.main,
    border: `1px solid ${theme.palette.neutral.main}`,
  },
  controlButton: {
    border: '1.5px solid',
    borderRadius: '50%',
    padding: '3px',
    transition: 'all 0.2s ease',
    '&:hover': {
      transform: 'scale(1.15)',
    },
  },
  controlStop: {
    borderColor: theme.palette.error.main,
    color: theme.palette.error.main,
    '&:hover': {
      backgroundColor: 'rgba(211, 47, 47, 0.1)',
    },
  },
  controlStart: {
    borderColor: theme.palette.success.main,
    color: theme.palette.success.main,
    '&:hover': {
      backgroundColor: 'rgba(46, 125, 50, 0.1)',
    },
  },
  '@keyframes pulse-green': {
    '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(76, 175, 80, 0.7)' },
    '70%': { transform: 'scale(1)', boxShadow: '0 0 0 6px rgba(76, 175, 80, 0)' },
    '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(76, 175, 80, 0)' },
  },
  pulse: {
    animation: '$pulse-green 2s infinite',
  },
}));

const DeviceRow = ({ devices, index, style }) => {
  const { classes } = useStyles();
  const dispatch = useDispatch();
  const t = useTranslation();

  const admin = useAdministrator();
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  const [toastMessage, setToastMessage] = useState('');
  const [pendingIgnition, setPendingIgnition] = useState(false);
  const [pendingParking, setPendingParking] = useState(false);

  const item = devices[index];
  const position = useSelector((state) => state.session.positions[item.id]);

  const handleIgnitionToggle = async (e, devId, isIgnitionOn) => {
    e.stopPropagation();
    try {
      setPendingIgnition(true);
      const command = {
        deviceId: devId,
        type: isIgnitionOn ? 'engineStop' : 'engineResume',
      };
      await fetch('/api/commands/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command),
      });
      setToastMessage(isIgnitionOn ? 'Engine Stop Command Sent' : 'Engine Resume Command Sent');
    } catch (error) {
      console.error('Failed to send ignition command:', error);
    } finally {
      setPendingIgnition(false);
    }
  };

  const geofences = useSelector((state) => state.geofences?.items || {});
  // Optimized: Look for geofence by name if not yet linked in positionIds for instant feedback
  const parkingGeofence = Object.values(geofences).find(
    (g) => g.attributes?.parking && (position?.geofenceIds?.includes(g.id) || g.name.includes(item.name)),
  );

  const handleSafeParking = async (e, devId, pos, name) => {
    e.stopPropagation();
    try {
      if (!pos) return;
      setPendingParking(true);
      if (parkingGeofence) {
        // Delete the safe parking geofence to disable
        const geofenceId = parkingGeofence.id;
        await fetch(`/api/geofences/${geofenceId}`, {
          method: 'DELETE',
        });
        // Remove from Redux store so the circle disappears from the map
        dispatch(geofencesActions.remove(geofenceId));
        setToastMessage('Safe Parking Disabled');
      } else {
        // Create 15-meter geofence for "small movement" trigger
        const area = `CIRCLE (${pos.latitude} ${pos.longitude}, 15)`;
        const res = await fetch('/api/geofences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Safe Parking: ${name}`,
            area,
            attributes: { parking: true },
          }),
        });
        if (res.ok) {
          const geofence = await res.json();
          await fetch('/api/permissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              deviceId: devId,
              geofenceId: geofence.id,
            }),
          });
          // Add to Redux store so the circle is drawn on the map
          dispatch(geofencesActions.update([geofence]));
          setToastMessage('Safe Parking Enabled (15m Radius)');
        }
      }
    } catch (error) {
      console.error('Failed to toggle safe parking:', error);
    } finally {
      setPendingParking(false);
    }
  };

  const devicePrimary = useAttributePreference('devicePrimary', 'name');
  const deviceSecondary = useAttributePreference('deviceSecondary', '');

  const resolveFieldValue = (field) => {
    if (field === 'geofenceIds') {
      const geofenceIds = position?.geofenceIds;
      return geofenceIds?.length ? <GeofencesValue geofenceIds={geofenceIds} /> : null;
    }
    if (field === 'driverUniqueId') {
      const driverUniqueId = position?.attributes?.driverUniqueId;
      return driverUniqueId ? <DriverValue driverUniqueId={driverUniqueId} /> : null;
    }
    if (field === 'motion') {
      return <MotionBar deviceId={item.id} />;
    }
    return item[field];
  };

  const primaryValue = resolveFieldValue(devicePrimary);
  const secondaryValue = resolveFieldValue(deviceSecondary);

  const secondaryText = () => {
    let status;
    if (item.status === 'online' || !item.lastUpdate) {
      status = formatStatus(item.status, t);
    } else {
      status = dayjs(item.lastUpdate).fromNow();
    }
    
    if (!position || !position.attributes) {
      return (
        <span className={classes[getStatusColor(item.status)]}>
          {status}
        </span>
      );
    }

    const speed = position.speed > 0 ? `${formatSpeed(position.speed, 'km/h', t)}` : '';
    const fuel = position.attributes.fuel ? ` • ⛽ ${position.attributes.fuel}L` : '';
    const distance = position.attributes.totalDistance ? ` • 🛣️ ${formatDistance(position.attributes.totalDistance, 'km', t)}` : '';
    
    return (
      <>
        {secondaryValue && (
          <>
            {secondaryValue}
            {' • '}
          </>
        )}
        <span className={classes[getStatusColor(item.status)]}>
          {status} {speed && ` • ⚡ ${speed}`}
          {fuel}
          {distance}
        </span>
      </>
    );
  };

  return (
    <div style={style}>
      <ListItemButton
        key={item.id}
        onClick={() => dispatch(devicesActions.selectId(item.id))}
        disabled={!admin && item.disabled}
        selected={selectedDeviceId === item.id}
        className={selectedDeviceId === item.id ? classes.selected : null}
      >
        <ListItemAvatar>
          <Avatar>
            <img className={classes.icon} src={mapIcons[mapIconKey(item.category)]} alt="" />
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={primaryValue}
          secondary={secondaryText()}
          slots={{
            primary: Typography,
            secondary: Typography,
          }}
          slotProps={{
            primary: { noWrap: true },
            secondary: { noWrap: true },
          }}
        />
        {position && (
          <>
            <Tooltip title={`${t('eventAlarm')}: ${formatAlarm(position.attributes?.alarm || '', t)}`}>
              <IconButton size="small" sx={{ opacity: position.attributes?.alarm ? 1 : 0.3 }}>
                <ErrorIcon fontSize="small" className={position.attributes?.alarm ? classes.error : classes.neutral} />
              </IconButton>
            </Tooltip>
            
            <Tooltip
              title={
                parkingGeofence
                  ? 'Disable Safe Parking'
                  : 'Enable Safe Parking (15m Anti-Theft Shield)'
              }
            >
              <IconButton
                size="small"
                disabled={pendingParking}
                onClick={(e) => handleSafeParking(e, item.id, position, item.name)}
                sx={{ opacity: pendingParking ? 0.5 : 1 }}
                className={parkingGeofence ? classes.pulse : null}
              >
                {parkingGeofence ? (
                  <SecurityIcon fontSize="small" className={classes.success} />
                ) : (
                  <SecurityIcon fontSize="small" className={classes.neutral} />
                )}
              </IconButton>
            </Tooltip>

            <>
              <Tooltip
                title={`${t('positionIgnition')}: ${formatBoolean(position.attributes?.ignition || false, t)}`}
              >
                <span
                  className={`${classes.ignitionStatus} ${position.attributes?.ignition ? classes.ignitionOn : classes.ignitionOff}`}
                >
                  <EngineIcon width={12} height={12} />
                  {position.attributes?.ignition ? 'ON' : 'OFF'}
                </span>
              </Tooltip>
              <Tooltip
                title={position.attributes?.ignition ? 'Send Engine Stop' : 'Send Engine Resume'}
              >
                <IconButton
                  size="small"
                  disabled={pendingIgnition}
                  className={`${classes.controlButton} ${position.attributes?.ignition ? classes.controlStop : classes.controlStart}`}
                  onClick={(e) => handleIgnitionToggle(e, item.id, position.attributes?.ignition || false)}
                  sx={{ opacity: pendingIgnition ? 0.5 : 1 }}
                >
                  <PowerSettingsNewIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </>

            <Tooltip
              title={`${t('positionBatteryLevel')}: ${formatPercentage(position.attributes?.batteryLevel || 100)}`}
            >
              <IconButton size="small">
                {((position.attributes?.batteryLevel || 100) > 70 &&
                  ((position.attributes?.charge ?? true) ? (
                    <BatteryChargingFullIcon fontSize="small" className={classes.success} />
                  ) : (
                    <BatteryFullIcon fontSize="small" className={classes.success} />
                  ))) ||
                  ((position.attributes?.batteryLevel || 100) > 30 &&
                    ((position.attributes?.charge ?? true) ? (
                      <BatteryCharging60Icon fontSize="small" className={classes.warning} />
                    ) : (
                      <Battery60Icon fontSize="small" className={classes.warning} />
                    ))) ||
                  ((position.attributes?.charge ?? true) ? (
                    <BatteryCharging20Icon fontSize="small" className={classes.error} />
                  ) : (
                    <Battery20Icon fontSize="small" className={classes.error} />
                  ))}
              </IconButton>
            </Tooltip>
          </>
        )}
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
