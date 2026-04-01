import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Rnd } from 'react-rnd';
import {
  Card,
  CardContent,
  Typography,
  CardActions,
  IconButton,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Menu,
  MenuItem,
  CardMedia,
  TableFooter,
  Link,
  Tooltip,
  Box,
  Divider,
  CircularProgress,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import CloseIcon from '@mui/icons-material/Close';
import RouteIcon from '@mui/icons-material/Route';
import SendIcon from '@mui/icons-material/Send';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PendingIcon from '@mui/icons-material/Pending';
import VpnLockIcon from '@mui/icons-material/VpnLock';
import BlockIcon from '@mui/icons-material/Block';
import NotificationImportantIcon from '@mui/icons-material/NotificationImportant';

import { useTranslation } from './LocalizationProvider';
import RemoveDialog from './RemoveDialog';
import PositionValue from './PositionValue';
import { useDeviceReadonly, useRestriction } from '../util/permissions';
import usePositionAttributes from '../attributes/usePositionAttributes';
import { devicesActions } from '../../store';
import { useCatch, useCatchCallback } from '../../reactHelper';
import { useAttributePreference } from '../util/preferences';
import fetchOrThrow from '../util/fetchOrThrow';
import { useSafeParking } from '../util/useSafeParking';

const useStyles = makeStyles()((theme, { desktopPadding }) => ({
  card: {
    pointerEvents: 'auto',
    width: theme.dimensions.popupMaxWidth,
  },
  media: {
    height: theme.dimensions.popupImageHeight,
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  mediaButton: {
    color: theme.palette.common.white,
    mixBlendMode: 'difference',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1, 1, 0, 2),
  },
  content: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    maxHeight: theme.dimensions.cardContentMaxHeight,
    overflow: 'auto',
  },
  icon: {
    width: '25px',
    height: '25px',
    filter: 'brightness(0) invert(1)',
  },
  table: {
    '& .MuiTableCell-sizeSmall': {
      paddingLeft: 0,
      paddingRight: 0,
    },
    '& .MuiTableCell-sizeSmall:first-of-type': {
      paddingRight: theme.spacing(1),
    },
  },
  cell: {
    borderBottom: 'none',
  },
  actions: {
    justifyContent: 'space-between',
  },
  root: {
    pointerEvents: 'none',
    position: 'fixed',
    zIndex: 5,
    left: '50%',
    [theme.breakpoints.up('md')]: {
      left: `calc(50% + ${desktopPadding} / 2)`,
      bottom: theme.spacing(3),
    },
    [theme.breakpoints.down('md')]: {
      left: '50%',
      bottom: `calc(${theme.spacing(3)} + ${theme.dimensions.bottomBarHeight}px)`,
    },
    transform: 'translateX(-50%)',
  },
  '@keyframes pulse': {
    '0%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.4)' },
    '70%': { boxShadow: '0 0 0 10px rgba(239, 68, 68, 0)' },
    '100%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)' },
  },
}));

const StatusRow = ({ name, content }) => {
  const { classes } = useStyles({ desktopPadding: 0 });

  return (
    <TableRow>
      <TableCell className={classes.cell}>
        <Typography variant="body2">{name}</Typography>
      </TableCell>
      <TableCell className={classes.cell}>
        <Typography variant="body2" color="textSecondary">
          {content}
        </Typography>
      </TableCell>
    </TableRow>
  );
};

const StatusCard = ({ deviceId, position, onClose, disableActions, desktopPadding = 0 }) => {
  const { classes } = useStyles({ desktopPadding });
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const t = useTranslation();

  const readonly = useRestriction('readonly');
  const deviceReadonly = useDeviceReadonly();

  const shareDisabled = useSelector((state) => state.session.server.attributes.disableShare);
  const user = useSelector((state) => state.session.user);
  const device = useSelector((state) => state.devices.items[deviceId]);

  const deviceImage = device?.attributes?.deviceImage;

  const positionAttributes = usePositionAttributes(t);
  const positionItems = useAttributePreference(
    'positionItems',
    'fixTime,address,speed,totalDistance',
  );

  const navigationAppLink = useAttributePreference('navigationAppLink');
  const navigationAppTitle = useAttributePreference('navigationAppTitle');

  const [anchorEl, setAnchorEl] = useState(null);

  const [removing, setRemoving] = useState(false);
  const [sendingCommand, setSendingCommand] = useState(false);

  const handleRemove = useCatch(async (removed) => {
    if (removed) {
      const response = await fetchOrThrow('/api/devices');
      dispatch(devicesActions.refresh(await response.json()));
    }
    setRemoving(false);
  });

  const { isSafeParkingActive, toggleSafeParking } = useSafeParking(device, position);

  const handleSafeParking = useCatchCallback(async () => {
    toggleSafeParking();
  }, [toggleSafeParking]);

  const handleGeofence = () => {
    setAnchorEl(null);
    navigate(`/settings/geofence?deviceId=${deviceId}`);
  };

  return (
    <>
      <div className={classes.root}>
        {device && (
          <Rnd
            default={{ x: 0, y: 0, width: 'auto', height: 'auto' }}
            enableResizing={false}
            dragHandleClassName="draggable-header"
            style={{ position: 'relative' }}
          >
            <Card elevation={3} className={classes.card}>
              {deviceImage ? (
                <CardMedia
                  className={`${classes.media} draggable-header`}
                  image={`/api/media/${device.uniqueId}/${deviceImage}`}
                >
                  <IconButton size="small" onClick={onClose} onTouchStart={onClose}>
                    <CloseIcon fontSize="small" className={classes.mediaButton} />
                  </IconButton>
                </CardMedia>
              ) : (
                <div className={`${classes.header} draggable-header`}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="textSecondary" fontWeight={700}>
                      {device.name}
                    </Typography>
                    {device.attributes?.isAIS140 && (
                      <Tooltip title={`Government Verified (AIS 140)\nCert: ${device.attributes.certNumber || 'Pending'}\nExpiry: ${device.attributes.ais140Expiry ? new Date(device.attributes.ais140Expiry).toLocaleDateString() : 'Lifetime'}`}>
                         <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            bgcolor: 'success.main', 
                            color: 'white', 
                            px: 0.8, 
                            borderRadius: '4px', 
                            fontSize: '10px', 
                            fontWeight: 'bold',
                            boxShadow: '0 0 6px #10b981',
                            cursor: 'help'
                         }}>
                            AIS 140
                         </Box>
                      </Tooltip>
                    )}
                    {position && (
                      <Tooltip title={`Ignition: ${position.attributes.ignition ? 'ON' : 'OFF'}`}>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: position.attributes.ignition ? 'success.main' : 'error.main',
                            boxShadow: `0 0 8px ${position.attributes.ignition ? '#10b981' : '#ef4444'}`,
                          }}
                        />
                      </Tooltip>
                    )}
                  </Box>
                  <IconButton size="small" onClick={onClose} onTouchStart={onClose}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </div>
              )}
              {position && (
                <CardContent className={classes.content}>
                  {/*  QUICK INFO BAR */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 2, p: 1, bgcolor: 'rgba(0,0,0,0.03)', borderRadius: '12px' }}>
                     <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ opacity: 0.5, display: 'block' }}>Ignition</Typography>
                        <Typography variant="body2" fontWeight={900} color={position.attributes.ignition ? 'success.main' : 'error.main'}>
                            {position.attributes.ignition ? 'ENGINE ON' : 'ENGINE OFF'}
                        </Typography>
                     </Box>
                     <Divider orientation="vertical" flexItem />
                     <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ opacity: 0.5, display: 'block' }}>Speed</Typography>
                        <Typography variant="body2" fontWeight={900}>
                            <PositionValue position={position} property="speed" />
                        </Typography>
                     </Box>
                  </Box>

                  <Table size="small" classes={{ root: classes.table }}>
                    <TableBody>
                      {positionItems
                        .split(',')
                        .filter(
                          (key) =>
                            key !== 'ignition' && // Handled in quick bar
                            (position.hasOwnProperty(key) || position.attributes.hasOwnProperty(key)),
                        )
                        .map((key) => (
                          <StatusRow
                            key={key}
                            name={positionAttributes[key]?.name || key}
                            content={
                              <PositionValue
                                position={position}
                                property={position.hasOwnProperty(key) ? key : null}
                                attribute={position.hasOwnProperty(key) ? null : key}
                              />
                            }
                          />
                        ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={2} className={classes.cell}>
                          <Typography variant="body2">
                            <Link component={RouterLink} to={`/position/${position.id}`}>
                              {t('sharedShowDetails')}
                            </Link>
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </CardContent>
              )}
              <CardActions classes={{ root: classes.actions }} disableSpacing>
                <Tooltip title={t('sharedExtra')}>
                  <IconButton
                    color="secondary"
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    disabled={!position}
                  >
                    <PendingIcon />
                  </IconButton>
                </Tooltip>
                
                {/*  QUICK IGNITION CONTROL */}
                {position && (
                   <Tooltip title={position.attributes.blocked ? 'Unblock Engine' : 'Block Engine'}>
                      <IconButton
                        onClick={async () => {
                           if (window.confirm(`DANGER: Are you sure you want to ${position.attributes.blocked ? 'UNBLOCK' : 'STOP'} the engine of ${device.name}?`)) {
                              setSendingCommand(true);
                              try {
                                  const command = {
                                     deviceId: device.id,
                                     type: position.attributes.blocked ? 'engineResume' : 'engineStop',
                                     attributes: {}
                                  };
                                  await fetch('/api/commands/send', {
                                     method: 'POST',
                                     headers: { 'Content-Type': 'application/json' },
                                     body: JSON.stringify(command)
                                  });
                              } finally {
                                  setTimeout(() => setSendingCommand(false), 2000);
                              }
                           }
                        }}
                        disabled={disableActions || sendingCommand}
                        color={position.attributes.blocked ? 'success' : 'error'}
                        sx={{ 
                            border: '1px solid', 
                            borderColor: position.attributes.blocked ? 'success.main' : 'error.main',
                            bgcolor: position.attributes.blocked ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' 
                        }}
                      >
                         {sendingCommand ? <CircularProgress size={20} color="inherit" /> : (position.attributes.blocked ? <VpnLockIcon /> : <BlockIcon />)}
                      </IconButton>
                   </Tooltip>
                )}

                 {position && (
                    <Tooltip title={isSafeParkingActive ? 'Disable SafeZone' : 'Enable SafeZone'}>
                       <IconButton
                         onClick={handleSafeParking}
                         sx={{
                           border: '1px solid',
                           borderColor: isSafeParkingActive ? '#06b6d4' : 'rgba(0,0,0,0.1)',
                           background: isSafeParkingActive
                             ? 'rgba(6, 182, 212, 0.1)'
                             : 'rgba(0,0,0,0.03)',
                           color: isSafeParkingActive ? '#06b6d4' : 'primary.main',
                         }}
                       >
                         <VpnLockIcon />
                       </IconButton>
                    </Tooltip>
                 )}
                 {device.attributes?.isAIS140 && (
                    <Tooltip title="Trigger Emergency SOS (AIS 140)">
                       <IconButton
                         onClick={async () => {
                            if (window.confirm('EMERGENCY: Are you sure you want to trigger a manual SOS alert for this AIS 140 vehicle?')) {
                               await fetch('/api/commands/send', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                     deviceId: device.id,
                                     type: 'sosAlert',
                                     attributes: {}
                                  })
                               });
                               alert('SOS Alert Sent to Monitoring Station');
                            }
                         }}
                         sx={{ 
                             border: '1px solid #ef4444', 
                             bgcolor: 'rgba(239, 68, 68, 0.2)', 
                             color: '#ef4444',
                             animation: 'pulse 1.5s infinite' 
                         }}
                       >
                          <NotificationImportantIcon />
                       </IconButton>
                    </Tooltip>
                 )}
                <Tooltip title={t('reportReplay')}>
                  <IconButton
                    onClick={() => navigate(`/replay?deviceId=${deviceId}`)}
                    disabled={disableActions || !position}
                  >
                    <RouteIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('commandTitle')}>
                  <IconButton
                    onClick={() => navigate(`/settings/device/${deviceId}/command`)}
                    disabled={disableActions}
                  >
                    <SendIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('sharedEdit')}>
                  <IconButton
                    onClick={() => navigate(`/settings/device/${deviceId}`)}
                    disabled={disableActions || deviceReadonly}
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('sharedRemove')}>
                  <IconButton
                    color="error"
                    onClick={() => setRemoving(true)}
                    disabled={disableActions || deviceReadonly}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </CardActions>
            </Card>
          </Rnd>
        )}
      </div>
      {position && (
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          {!readonly && <MenuItem onClick={handleGeofence}>{t('sharedCreateGeofence')}</MenuItem>}
          <MenuItem
            component="a"
            target="_blank"
            href={`https://www.google.com/maps/search/?api=1&query=${position.latitude}%2C${position.longitude}`}
          >
            {t('linkGoogleMaps')}
          </MenuItem>
          <MenuItem
            component="a"
            target="_blank"
            href={`http://maps.apple.com/?ll=${position.latitude},${position.longitude}`}
          >
            {t('linkAppleMaps')}
          </MenuItem>
          <MenuItem
            component="a"
            target="_blank"
            href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${position.latitude}%2C${position.longitude}&heading=${position.course}`}
          >
            {t('linkStreetView')}
          </MenuItem>
          {navigationAppTitle && (
            <MenuItem
              component="a"
              target="_blank"
              href={navigationAppLink
                .replace('{latitude}', position.latitude)
                .replace('{longitude}', position.longitude)}
            >
              {navigationAppTitle}
            </MenuItem>
          )}
          {!shareDisabled && !user.temporary && (
            <MenuItem onClick={() => navigate(`/settings/device/${deviceId}/share`)}>
              <Typography color="secondary">{t('sharedShare')}</Typography>
            </MenuItem>
          )}
        </Menu>
      )}
      <RemoveDialog
        open={removing}
        endpoint="devices"
        itemId={deviceId}
        onResult={(removed) => handleRemove(removed)}
      />
    </>
  );
};

export default StatusCard;
