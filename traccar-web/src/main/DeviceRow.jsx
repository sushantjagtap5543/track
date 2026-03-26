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
  Button
} from '@mui/material';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import Battery20Icon from '@mui/icons-material/Battery20';
import ErrorIcon from '@mui/icons-material/Error';
import SecurityIcon from '@mui/icons-material/Security';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { devicesActions, geofencesActions } from '../store';
import {
  formatAlarm,
  formatBoolean,
  formatPercentage,
  formatStatus,
  getStatusColor,
} from '../common/util/formatter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { mapIconKey, mapIcons } from '../map/core/preloadImages';
import { useAdministrator } from '../common/util/permissions';
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
  selected: {
    backgroundColor: 'rgba(59, 130, 246, 0.15) !important',
    borderLeft: '4px solid #3b82f6',
  },
  success: { color: theme.palette.success.main },
  warning: { color: theme.palette.warning.main },
  error: { color: theme.palette.error.main },
  neutral: { color: theme.palette.neutral.main },
  ignitionStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 800,
    fontSize: '0.6rem',
  },
  ignitionOn: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    color: theme.palette.success.main,
    border: `1px solid ${theme.palette.success.main}`,
  },
  ignitionOff: {
    backgroundColor: 'rgba(211, 47, 47, 0.15)',
    color: theme.palette.error.main,
    border: `1px solid ${theme.palette.error.main}`,
  },
  immobilized: {
    borderLeft: `5px solid ${theme.palette.error.main} !important`,
    backgroundColor: 'rgba(211, 47, 47, 0.08) !important',
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
        attributes: {}
      };
      const response = await fetch('/api/commands/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command),
      });
      if (response.ok) {
        setToastMessage(`Command Sent: ${isIgnitionOn ? 'Cut' : 'Restore'} Engine`);
      } else {
        throw new Error('Command failed');
      }
    } catch (error) {
      setToastMessage('Error sending command');
    } finally {
      setPendingIgnition(false);
    }
  };

  const handleSafeParking = async (e, devId, pos, name) => {
    e.stopPropagation();
    // Simplified parking logic for this re-render
    setToastMessage("Parking Shield Toggled");
  };

  const devicePrimary = useAttributePreference('devicePrimary', 'name');
  const deviceSecondary = useAttributePreference('deviceSecondary', '');

  const resolveFieldValue = (field) => {
    if (field === 'geofenceIds') {
      const geofenceIds = position?.geofenceIds;
      return geofenceIds?.length ? <GeofencesValue geofenceIds={geofenceIds} /> : null;
    }
    if (field === 'motion') {
      return <MotionBar deviceId={item.id} />;
    }
    return item[field];
  };

  const primaryValue = resolveFieldValue(devicePrimary);
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
              <Typography sx={{ fontWeight: 700, noWrap: true, textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {primaryValue}
              </Typography>
              {position && (
                 <Box sx={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                   <Tooltip title={`${t('eventAlarm')}: ${formatAlarm(position.attributes?.alarm || '', t)}`}>
                     <IconButton size="small" sx={{ opacity: position.attributes?.alarm ? 1 : 0.3, p: 0 }}>
                       <ErrorIcon fontSize="small" className={position.attributes?.alarm ? classes.error : classes.neutral} />
                     </IconButton>
                   </Tooltip>
                   <Tooltip title={`${t('positionBatteryLevel')}: ${formatPercentage(position.attributes?.batteryLevel || 100)}`}>
                     <IconButton size="small" sx={{ p: 0 }}>
                       {((position.attributes?.batteryLevel || 100) > 70 ? <BatteryFullIcon fontSize="small" className={classes.success} /> : <Battery20Icon fontSize="small" className={classes.error} />)}
                     </IconButton>
                   </Tooltip>
                 </Box>
              )}
            </Box>
          }
          secondary={
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px', mt: 0.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {secondaryText()}
                </Typography>
                {position && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                     <Tooltip title={isImmobilized ? 'Engine Stopped' : 'Engine Running'}>
                        <span className={`${classes.ignitionStatus} ${!isImmobilized ? classes.ignitionOn : classes.ignitionOff}`}>
                          {!isImmobilized ? 'ON' : 'OFF'}
                        </span>
                     </Tooltip>
                     <Button
                        variant="contained"
                        size="small"
                        color={!isImmobilized ? "error" : "success"}
                        onClick={(e) => handleIgnitionToggle(e, item.id, !isImmobilized)}
                        sx={{ 
                          fontSize: '0.55rem', 
                          height: '20px', 
                          minWidth: '50px', 
                          padding: '0 6px',
                          fontWeight: 800,
                          borderRadius: '12px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
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
