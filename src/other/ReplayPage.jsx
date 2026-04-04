import { useState, useEffect, useRef, useCallback } from 'react';
import { IconButton, Paper, Slider, Toolbar, Typography } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import TuneIcon from '@mui/icons-material/Tune';
import DownloadIcon from '@mui/icons-material/Download';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import MapView from '../map/core/MapView';
import MapRoutePath from '../map/MapRoutePath';
import MapRoutePoints from '../map/MapRoutePoints';
import MapPositions from '../map/MapPositions';
import { formatTime } from '../common/util/formatter';
import ReportFilter, { updateReportParams } from '../reports/components/ReportFilter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useCatch } from '../reactHelper';
import MapCamera from '../map/MapCamera';
import MapGeofence from '../map/MapGeofence';
import StatusCard from '../common/components/StatusCard';
import MapScale from '../map/MapScale';
import BackIcon from '../common/components/BackIcon';
import fetchOrThrow from '../common/util/fetchOrThrow';
import MapOverlay from '../map/overlay/MapOverlay';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';

const useStyles = makeStyles()((theme) => ({
  root: {
    height: '100%',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    zIndex: 3,
    left: 0,
    top: 0,
    margin: theme.spacing(1.5),
    width: theme.dimensions.drawerWidthDesktop,
    [theme.breakpoints.down('md')]: {
      width: '100%',
      margin: 0,
    },
  },
  title: {
    flexGrow: 1,
  },
  slider: {
    width: '100%',
  },
  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formControlLabel: {
    height: '100%',
    width: '100%',
    paddingRight: theme.spacing(1),
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(2),
    [theme.breakpoints.down('md')]: {
      margin: theme.spacing(1),
    },
    [theme.breakpoints.up('md')]: {
      marginTop: theme.spacing(1),
    },
  },
}));

const ReplayPage = () => {
  const t = useTranslation();
  const { classes } = useStyles();
  const navigate = useNavigate();
  const timerRef = useRef();

  const [searchParams, setSearchParams] = useSearchParams();

  const defaultDeviceId = useSelector((state) => state.devices.selectedId);

  const [positions, setPositions] = useState([]);
  const [index, setIndex] = useState(0);
  const [selectedDeviceId, setSelectedDeviceId] = useState(defaultDeviceId);
  const [showCard, setShowCard] = useState(false);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  const loaded = Boolean(from && to && !loading && positions.length);

  const deviceName = useSelector((state) => {
    if (selectedDeviceId) {
      const device = state.devices.items[selectedDeviceId];
      if (device) {
        return device.name;
      }
    }
    return null;
  });

  useEffect(() => {
    if (!from && !to) {
      setPositions([]);
    }
  }, [from, to, setPositions]);

  const [interpolatedPosition, setInterpolatedPosition] = useState(null);

  useEffect(() => {
    let animationFrame;
    const startTime = Date.now();
    const duration = 500; // ms per step

    const animate = () => {
      if (playing && positions.length > 0 && index < positions.length - 1) {
        const now = Date.now();
        const elapsed = now % duration;
        const fraction = elapsed / duration;

        const p1 = positions[index];
        const p2 = positions[index + 1];

        if (p1 && p2) {
          setInterpolatedPosition({
            ...p1,
            latitude: p1.latitude + (p2.latitude - p1.latitude) * fraction,
            longitude: p1.longitude + (p2.longitude - p1.longitude) * fraction,
            course: p1.course + (p2.course - p1.course) * fraction,
            speed: p1.speed + (p2.speed - p1.speed) * fraction,
          });
        }
      } else if (positions.length > 0) {
        setInterpolatedPosition(positions[index]);
      }
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [playing, positions, index]);

  useEffect(() => {
    if (playing && positions.length > 0) {
      timerRef.current = setInterval(() => {
        setIndex((index) => index + 1);
      }, 500);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [playing, positions]);

  useEffect(() => {
    if (index >= positions.length - 1) {
      clearInterval(timerRef.current);
      setPlaying(false);
      setIndex(positions.length - 1);
    }
  }, [index, positions]);

  const onPointClick = useCallback(
    (_, index) => {
      setIndex(index);
    },
    [setIndex],
  );

  const onMarkerClick = useCallback(
    (positionId) => {
      setShowCard(!!positionId);
    },
    [setShowCard],
  );

  const onShow = useCatch(async ({ deviceIds, from, to }) => {
    const deviceId = deviceIds.find(() => true);
    setLoading(true);
    setSelectedDeviceId(deviceId);
    const query = new URLSearchParams({ deviceId, from, to });
    try {
      const response = await fetchOrThrow(`/api/positions?${query.toString()}`);
      setIndex(0);
      const positions = await response.json();
      setPositions(positions);
      if (!positions.length) {
        throw Error(t('sharedNoData'));
      }
    } finally {
      setLoading(false);
    }
  });

  const handleDownload = () => {
    const query = new URLSearchParams({ deviceId: selectedDeviceId, from, to });
    window.location.assign(`/api/positions/kml?${query.toString()}`);
  };

  return (
    <div className={classes.root}>
      <MapView>
        <MapOverlay />
        <MapGeofence />
        <MapRoutePath positions={positions} />
        <MapRoutePoints positions={positions} onClick={onPointClick} showSpeedControl />
        {interpolatedPosition && (
          <MapPositions
            positions={[interpolatedPosition]}
            onMarkerClick={onMarkerClick}
            titleField="fixTime"
          />
        )}
      </MapView>
      <MapScale />
      <MapCamera positions={positions} />
      <div className={classes.sidebar}>
        <Paper elevation={3} square>
          <Toolbar>
            <IconButton edge="start" sx={{ mr: 2 }} onClick={() => navigate(-1)}>
              <BackIcon />
            </IconButton>
            <Typography variant="h6" className={classes.title}>
              {t('reportReplay')}
            </Typography>
            {loaded && (
              <>
                <IconButton onClick={handleDownload}>
                  <DownloadIcon />
                </IconButton>
                <IconButton
                  edge="end"
                  onClick={() => updateReportParams(searchParams, setSearchParams, 'ignore', [])}
                >
                  <TuneIcon />
                </IconButton>
              </>
            )}
          </Toolbar>
        </Paper>
        <Paper className={classes.content} square>
          {loaded && (
            <>
              <Typography variant="subtitle1" align="center">
                {deviceName}
              </Typography>
              <Slider
                className={classes.slider}
                max={positions.length - 1}
                step={null}
                marks={positions.map((_, index) => ({ value: index }))}
                value={index}
                onChange={(_, index) => setIndex(index)}
              />
              <div className={classes.controls}>
                {`${index + 1}/${positions.length}`}
                <IconButton
                  onClick={() => setIndex((index) => index - 1)}
                  disabled={playing || index <= 0}
                >
                  <FastRewindIcon />
                </IconButton>
                <IconButton
                  onClick={() => setPlaying(!playing)}
                  disabled={index >= positions.length - 1}
                >
                  {playing ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>
                <IconButton
                  onClick={() => setIndex((index) => index + 1)}
                  disabled={playing || index >= positions.length - 1}
                >
                  <FastForwardIcon />
                </IconButton>
                {formatTime(positions[index].fixTime, 'seconds')}
              </div>
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 700, letterSpacing: '1px' }}>REFINED TELEMETRY STREAM</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: 'rgba(59, 130, 246, 0.1)', p: 1.5, borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.7 }}>Speed</Typography>
                    <Typography variant="h6">{Math.round((interpolatedPosition?.speed || 0) * 1.852)} <Typography component="span" variant="caption">km/h</Typography></Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ opacity: 0.7 }}>Ignition</Typography>
                    <Typography variant="h6" color={positions[index].attributes.ignition ? 'success.main' : 'textSecondary'}>
                      {positions[index].attributes.ignition ? 'ON' : 'OFF'}
                    </Typography>
                  </Box>
                </Box>
                {positions[index].attributes.ais140 && (
                  <Alert 
                    severity="success" 
                    icon={<VerifiedUserIcon sx={{ fontSize: '1.2rem' }} />} 
                    sx={{ 
                      borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      '& .MuiAlert-message': { width: '100%' }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>AIS140 Government Certified</Typography>
                      <Typography variant="caption" sx={{ px: 1, bgcolor: 'rgba(16, 185, 129, 0.2)', borderRadius: '4px' }}>SECURE</Typography>
                    </Box>
                    {positions[index].attributes.panic && (
                      <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5, fontWeight: 700 }}>
                        ⚠️ EMERGENCY BUTTON ACTIVE
                      </Typography>
                    )}
                  </Alert>
                )}
              </Box>
            </>
          )}
          <div style={{ display: loaded ? 'none' : 'block' }}>
            <ReportFilter onShow={onShow} deviceType="single" loading={loading} />
          </div>
        </Paper>
      </div>
      {showCard && index < positions.length && (
        <StatusCard
          deviceId={selectedDeviceId}
          position={positions[index]}
          onClose={() => setShowCard(false)}
          disableActions
        />
      )}
    </div>
  );
};

export default ReplayPage;
