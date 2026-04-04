import { useState, useCallback, useEffect } from 'react';
import { Paper } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useDispatch, useSelector } from 'react-redux';
import DeviceList from './DeviceList';
import BottomMenu from '../common/components/BottomMenu';
import StatusCard from '../common/components/StatusCard';
import { devicesActions } from '../store';
import usePersistedState from '../common/util/usePersistedState';
import EventsDrawer from './EventsDrawer';
import useFilter from './useFilter';
import MainToolbar from './MainToolbar';
import MainMap from './MainMap';
import { useAttributePreference } from '../common/util/preferences';
import { Drawer, Box, CircularProgress, Alert, AlertTitle, Typography } from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';
import { useAI } from '../common/components/AIProvider';
import GlobalSearch from '../common/components/GlobalSearch';

const useStyles = makeStyles()((theme) => ({
  root: {
    height: '100%',
  },
  sidebar: {
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    [theme.breakpoints.up('md')]: {
      position: 'fixed',
      left: 0,
      top: 0,
      height: `calc(100% - ${theme.spacing(4)})`,
      width: theme.dimensions.drawerWidthDesktop,
      margin: theme.spacing(2),
      zIndex: 3,
      borderRadius: '28px',
      overflow: 'hidden',
      background: 'rgba(15, 23, 42, 0.4)',
      backdropFilter: 'blur(30px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 25px 60px -15px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.1)',
    },
    [theme.breakpoints.down('md')]: {
      height: '100%',
      width: '100%',
      background: 'rgba(15, 23, 42, 0.95)',
    },
  },
  header: {
    pointerEvents: 'auto',
    zIndex: 6,
    background: 'transparent !important',
    boxShadow: 'none !important',
  },
  footer: {
    pointerEvents: 'auto',
    zIndex: 5,
    background: 'transparent !important',
  },
  middle: {
    flex: 1,
    display: 'grid',
    minHeight: 0,
  },
  contentMap: {
    pointerEvents: 'auto',
    gridArea: '1 / 1',
  },
  contentList: {
    pointerEvents: 'auto',
    gridArea: '1 / 1',
    zIndex: 4,
    display: 'flex',
    minHeight: 0,
    background: 'transparent !important',
  },
}));

const MainPage = () => {
  const { insights, loading: aiLoading, error: aiError } = useAI();
  const { classes } = useStyles();
  const dispatch = useDispatch();
  const theme = useTheme();

  const desktop = useMediaQuery(theme.breakpoints.up('md'));

  const mapOnSelect = useAttributePreference('mapOnSelect', true);

  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  const positions = useSelector((state) => state.session.positions);
  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = usePersistedState('filter', {
    statuses: [],
    groups: [],
  });
  const [filterSort, setFilterSort] = usePersistedState('filterSort', '');
  const [filterMap, setFilterMap] = usePersistedState('filterMap', false);

  const [devicesOpen, setDevicesOpen] = useState(desktop);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const onEventsClick = useCallback(() => setEventsOpen(true), [setEventsOpen]);

  useEffect(() => {
    if (!desktop && mapOnSelect && selectedDeviceId) {
      setDevicesOpen(false);
    }
  }, [desktop, mapOnSelect, selectedDeviceId]);

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, []);

  const { filteredDevices, filteredPositions } = useFilter(
    keyword,
    filter,
    filterSort,
    filterMap,
    positions,
  );

  const selectedPosition = filteredPositions.find(
    (position) => selectedDeviceId && position.deviceId === selectedDeviceId,
  );

  return (
    <div className={classes.root}>
      {desktop && (
        <MainMap
          filteredPositions={filteredPositions}
          selectedPosition={selectedPosition}
          onEventsClick={onEventsClick}
        />
      )}
      <div className={classes.sidebar}>
        <Paper square elevation={3} className={classes.header}>
          <MainToolbar
            filteredDevices={filteredDevices}
            devicesOpen={devicesOpen}
            setDevicesOpen={setDevicesOpen}
            keyword={keyword}
            setKeyword={setKeyword}
            filter={filter}
            setFilter={setFilter}
            filterSort={filterSort}
            setFilterSort={setFilterSort}
            filterMap={filterMap}
            setFilterMap={setFilterMap}
            onAIButtonClick={() => setAiOpen(true)}
            onSearchClick={() => setSearchOpen(true)}
          />
        </Paper>
        <div className={classes.middle}>
          {!desktop && (
            <div className={classes.contentMap}>
              <MainMap
                filteredPositions={filteredPositions}
                selectedPosition={selectedPosition}
                onEventsClick={onEventsClick}
              />
            </div>
          )}
          <Paper
            square
            className={classes.contentList}
            style={devicesOpen ? {} : { visibility: 'hidden' }}
          >
            <DeviceList devices={filteredDevices} />
          </Paper>
        </div>
        {desktop && (
          <div className={classes.footer}>
            <BottomMenu />
          </div>
        )}
      </div>
      <EventsDrawer open={eventsOpen} onClose={() => setEventsOpen(false)} />
      <Drawer
        anchor="right"
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        PaperProps={{ sx: { width:  desktop ? 400 : '100%', p: 3, background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(10px)', borderLeft: '1px solid rgba(255,255,255,0.1)' } }}
      >
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 1 }}>
          <PsychologyIcon /> AI Fleet Insights
        </Typography>
        {aiLoading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 10, gap: 2 }}>
            <CircularProgress size={60} thickness={2} sx={{ color: '#3b82f6' }} />
            <Typography sx={{ color: 'rgba(255,255,255,0.7)' }}>Analyzing Fleet Behavior...</Typography>
          </Box>
        ) : aiError ? (
          <Box>
            <Alert severity="warning" sx={{ mb: 2, background: 'rgba(153, 27, 27, 0.2)', color: '#f87171', border: '1px solid rgba(248, 113, 113, 0.2)' }}>
              <AlertTitle sx={{ fontWeight: 700 }}>AI Failover Active</AlertTitle>
              {aiError}
            </Alert>
            <Box sx={{ color: 'rgba(255,255,255,0.9)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {insights}
            </Box>
          </Box>
        ) : (
          <Box sx={{ color: 'rgba(255,255,255,0.9)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
            {insights || 'No analysis data available. Click the AI icon to start analysis.'}
          </Box>
        )}
      </Drawer>
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      {selectedDeviceId && (
        <StatusCard
          deviceId={selectedDeviceId}
          position={selectedPosition}
          onClose={() => dispatch(devicesActions.selectId(null))}
          desktopPadding={theme.dimensions.drawerWidthDesktop}
        />
      )}
    </div>
  );
};

export default MainPage;
