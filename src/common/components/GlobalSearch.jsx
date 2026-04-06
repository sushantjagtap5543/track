import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  TextField,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  InputAdornment,
  Divider,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import SearchIcon from '@mui/icons-material/Search';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import SettingsIcon from '@mui/icons-material/Settings';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { devicesActions } from '../../store';
import { mapIconKey, mapIcons } from '../../map/core/preloadImages';

const useStyles = makeStyles()((theme) => ({
  dialog: {
    '& .MuiDialog-paper': {
      width: '100%',
      maxWidth: 600,
      background: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(40px)',
      borderRadius: 24,
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      overflow: 'hidden',
    },
  },
  searchField: {
    '& .MuiOutlinedInput-root': {
      fontSize: '1.25rem',
      color: '#fff',
      padding: theme.spacing(1, 2),
      '& fieldset': { border: 'none' },
    },
    '& .MuiInputBase-input::placeholder': {
      color: 'rgba(255, 255, 255, 0.4)',
      opacity: 1,
    },
  },
  list: {
    maxHeight: 400,
    overflow: 'auto',
    padding: theme.spacing(1),
  },
  listItem: {
    borderRadius: 12,
    margin: theme.spacing(0.5, 0),
    transition: 'all 0.2s ease',
    '&:hover': {
      background: 'rgba(59, 130, 246, 0.15)',
    },
  },
  sectionTitle: {
    padding: theme.spacing(1, 2),
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  shortcut: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 8px',
    borderRadius: 4,
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '0.75rem',
  },
}));

const GlobalSearch = ({ open, onClose }) => {
  const { classes } = useStyles();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const devices = useSelector((state) => Object.values(state.devices.items));

  const filteredDevices = devices
    .filter(
      (device) =>
        (device.name || '').toLowerCase().includes(query.toLowerCase()) ||
        (device.uniqueId || '').toLowerCase().includes(query.toLowerCase()),
    )
    .slice(0, 5);

  const handleSelectDevice = (deviceId) => {
    dispatch(devicesActions.selectId(deviceId));
    onClose();
  };

  const handleAction = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} className={classes.dialog}>
      <DialogContent sx={{ p: 0 }}>
        <TextField
          fullWidth
          autoFocus
          placeholder="Search devices, settings, reports..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={classes.searchField}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#3b82f6' }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Box className={classes.shortcut}>ESC</Box>
              </InputAdornment>
            ),
          }}
        />
        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.05)' }} />

        <Box className={classes.list}>
          {filteredDevices.length > 0 && (
            <>
              <Typography className={classes.sectionTitle}>Vehicles</Typography>
              {filteredDevices.map((device) => (
                <ListItemButton
                  key={device.id}
                  className={classes.listItem}
                  onClick={() => handleSelectDevice(device.id)}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <img
                      style={{ width: 20, height: 20, filter: 'brightness(0) invert(1)' }}
                      src={mapIcons[mapIconKey(device.category)]}
                      alt=""
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={device.name}
                    secondary={device.uniqueId}
                    primaryTypographyProps={{ sx: { color: '#fff', fontWeight: 600 } }}
                    secondaryTypographyProps={{
                      sx: { color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' },
                    }}
                  />
                </ListItemButton>
              ))}
            </>
          )}

          <Typography className={classes.sectionTitle}>Global Actions</Typography>
          <ListItemButton
            className={classes.listItem}
            onClick={() => handleAction('/reports/combined')}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <AssessmentIcon sx={{ color: '#fff', fontSize: '1.2rem' }} />
            </ListItemIcon>
            <ListItemText
              primary="Generate Fleet Report"
              primaryTypographyProps={{ sx: { color: '#fff', fontWeight: 600 } }}
            />
          </ListItemButton>
          <ListItemButton
            className={classes.listItem}
            onClick={() => handleAction('/settings/preferences')}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <SettingsIcon sx={{ color: '#fff', fontSize: '1.2rem' }} />
            </ListItemIcon>
            <ListItemText
              primary="Account Preferences"
              primaryTypographyProps={{ sx: { color: '#fff', fontWeight: 600 } }}
            />
          </ListItemButton>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSearch;
