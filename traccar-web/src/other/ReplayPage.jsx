import { useState, useEffect, useRef, useCallback } from 'react';
import { IconButton, Paper, Slider, Toolbar, Typography, Box, Divider, Button } from '@mui/material';
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
  const [playSpeed, setPlaySpeed] = useState(1); // Default 1x

  const [stats, setStats] = useState({
    distance: 0,
    maxSpeed: 0,
    avgSpeed: 0,
    duration: 0,
  });

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

  useEffect(() => {
    if (playing && positions.length > 0) {
      timerRef.current = setInterval(() => {
        setIndex((index) => index + 1);
      }, 500 / playSpeed);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [playing, positions, playSpeed]);

  useEffect(() => {
    if (index >= positions.length - 1) {
      clearInterval(timerRef.current);
      setPlaying(false);
    }
  }, [index, positions]);

  const calculateStats = (data) => {
    if (data.length < 2) return;
    
    let totalDistance = 0;
    let maxS = 0;
    let sumSpeed = 0;
    
    data.forEach((p, i) => {
      if (p.attributes.totalDistance && p.attributes.totalDistance > totalDistance) {
        totalDistance = p.attributes.totalDistance;
      } else if (i > 0 && p.distance) {
          totalDistance += p.distance;
      }
      if (p.speed > maxS) maxS = p.speed;
      sumSpeed += p.speed;
    });

    // If we have totalDistance attribute at start and end
    const startDist = data[0].attributes.totalDistance || 0;
    const endDist = data[data.length - 1].attributes.totalDistance || 0;
    const distanceResult = (endDist > startDist) ? (endDist - startDist) : totalDistance;

    const startTime = new Date(data[0].fixTime).getTime();
    const endTime = new Date(data[data.length - 1].fixTime).getTime();
    const durationMs = endTime - startTime;

    setStats({
      distance: distanceResult,
      maxSpeed: maxS,
      avgSpeed: sumSpeed / data.length,
      duration: durationMs / 1000,
    });
  };

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
      if (positions.length) {
        calculateStats(positions);
      } else {
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
        {index < positions.length && (
          <MapPositions
            positions={[positions[index]]}
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
              <Box sx={{ mt: 1, mb: 2, p: 1.5, bgcolor: 'rgba(0,0,0,0.04)', borderRadius: 2 }}>
                <Typography variant="overline" sx={{ fontWeight: 900, opacity: 0.6, fontSize: '0.65rem' }}>Trip Statistics</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ display: 'block', opacity: 0.6 }}>Distance</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{(stats.distance / 1000).toFixed(2)} km</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ display: 'block', opacity: 0.6 }}>Max Speed</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{(stats.maxSpeed * 1.852).toFixed(1)} km/h</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ display: 'block', opacity: 0.6 }}>Avg Speed</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{(stats.avgSpeed * 1.852).toFixed(1)} km/h</Typography>
                  </Box>
                </Box>
                <Divider sx={{ my: 1, opacity: 0.1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-around' }}>
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ display: 'block', opacity: 0.6, fontSize: '0.6rem' }}>Ignition Cycles</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.75rem' }}>{positions.filter(p => p.attributes.ignition).length > 0 ? 'Verified' : 'None'}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ display: 'block', opacity: 0.6, fontSize: '0.6rem' }}>Data Points</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.75rem' }}>{positions.length}</Typography>
                    </Box>
                </Box>
              </Box>

              <Typography variant="subtitle1" align="center" sx={{ fontWeight: 600 }}>
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
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    {`${index + 1}/${positions.length}`}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <IconButton
                    size="small"
                    onClick={() => setIndex((index) => index - 1)}
                    disabled={playing || index <= 0}
                    >
                    <FastRewindIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                    onClick={() => setPlaying(!playing)}
                    disabled={index >= positions.length - 1}
                    sx={{ bgcolor: playing ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)' }}
                    >
                    {playing ? <PauseIcon color="error" /> : <PlayArrowIcon color="success" />}
                    </IconButton>
                    <IconButton
                    size="small"
                    onClick={() => setIndex((index) => index + 1)}
                    disabled={playing || index >= positions.length - 1}
                    >
                    <FastForwardIcon fontSize="small" />
                    </IconButton>
                </Box>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    {formatTime(positions[index].fixTime, 'seconds')}
                </Typography>
              </div>

              {/*  SPEED CONTROLS */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, gap: 1 }}>
                {[1, 2, 5, 10].map((s) => (
                    <Button
                        key={s}
                        size="small"
                        variant={playSpeed === s ? "contained" : "outlined"}
                        onClick={() => setPlaySpeed(s)}
                        sx={{ 
                            minWidth: '40px', 
                            fontSize: '0.65rem', 
                            height: '24px',
                            borderRadius: '12px'
                        }}
                    >
                        {s}x
                    </Button>
                ))}
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
