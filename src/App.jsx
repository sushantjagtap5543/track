import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useMediaQuery, useTheme, Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CampaignIcon from '@mui/icons-material/Campaign';
import { makeStyles } from 'tss-react/mui';
import BottomMenu from './common/components/BottomMenu';
import SocketController from './SocketController';
import CachingController from './CachingController';
import { useCatch, useEffectAsync } from './reactHelper';
import { sessionActions } from './store';
import UpdateController from './UpdateController';
import MotionController from './main/MotionController';
import TermsDialog from './common/components/TermsDialog';
import Loader from './common/components/Loader';
import fetchOrThrow from './common/util/fetchOrThrow';

const useStyles = makeStyles()(() => ({
  page: {
    flexGrow: 1,
    overflow: 'auto',
  },
  menu: {
    zIndex: 4,
    '@media print': {
      display: 'none',
    },
  },
  announcement: {
    backgroundColor: '#8b5cf6',
    color: '#fff',
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    zIndex: 5,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
}));

import HardlockPaymentView from './login/HardlockPaymentView';

const App = () => {
  const { classes } = useStyles();
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  const desktop = useMediaQuery(theme.breakpoints.up('md'));

  const newServer = useSelector((state) => state.session.server.newServer);
  const termsUrl = useSelector((state) => state.session.server.attributes.termsUrl);
  const user = useSelector((state) => state.session.user);
  const announcement = useSelector((state) => state.session.server.attributes.systemAnnouncement || (state.session.user?.attributes?.systemAnnouncement));

  const [isHardlocked, setIsHardlocked] = useState(false);

  const acceptTerms = useCatch(async () => {
    const response = await fetchOrThrow(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...user, attributes: { ...user.attributes, termsAccepted: true } }),
    });
    dispatch(sessionActions.updateUser(await response.json()));
  });

  useEffectAsync(async () => {
    if (!user) {
      const response = await fetch('/api/session');
      if (response.ok) {
        const userData = await response.json();
        dispatch(sessionActions.updateUser(userData));

        // Periodic Billing Check (every hour) to enforce real-time restrictions
        const checkBilling = async () => {
          try {
            console.log('[Protocol] Running reactive billing integrity check...');
            const billingRes = await fetch('/api/billing/my-bill');
            if (billingRes.ok) {
              const billingData = await billingRes.json().catch(() => null);
              if (billingData && billingData.unpaidDebt > 0) {
                setIsHardlocked(true);
                return;
              }
            }

            // Sync latest user state for disabled/expiry check
            const syncRes = await fetch('/api/session');
            if (syncRes.ok) {
              const freshUser = await syncRes.json();
              if (freshUser.disabled) {
                setIsHardlocked(true);
              } else if (freshUser.attributes?.nextBillingDate) {
                const expiry = new Date(freshUser.attributes.nextBillingDate);
                if (new Date() >= expiry) {
                  setIsHardlocked(true);
                }
              }
            }
          } catch (e) {
            console.error('[Protocol] Reactive billing check failed:', e);
          }
        };

        // Run initial check
        checkBilling();

        // Schedule periodic checks
        const interval = setInterval(checkBilling, 3600000); // 1 hour
        return () => clearInterval(interval);
      } else {
        window.sessionStorage.setItem('postLogin', pathname + search);
        navigate(newServer ? '/register' : '/login', { replace: true });
      }
    }
    return null;
  }, []);

  if (user == null) {
    return <Loader />;
  }

  // Global Hardlock Enforcement
  if (isHardlocked) {
    return (
      <Box
        sx={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)',
          position: 'fixed',
          zIndex: 9999,
        }}
      >
        <Box sx={{ maxWidth: '500px', width: '90%' }}>
          <HardlockPaymentView
            onLogout={() => {
              setIsHardlocked(false);
              dispatch(sessionActions.updateUser(null));
              navigate('/login');
            }}
            onSuccess={() => {
              setIsHardlocked(false);
              window.location.reload();
            }}
          />
        </Box>
      </Box>
    );
  }


  if (termsUrl && !user.attributes.termsAccepted) {
    return <TermsDialog open onCancel={() => navigate('/login')} onAccept={() => acceptTerms()} />;
  }
  return (
    <>
      {announcement && showAnnouncement && (
        <Box className={classes.announcement}>
          <CampaignIcon fontSize="small" />
          <Typography variant="body2" sx={{ fontWeight: 700, flexGrow: 1 }}>
            {announcement}
          </Typography>
          <IconButton size="small" onClick={() => setShowAnnouncement(false)} sx={{ color: '#fff' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
      <SocketController />
      <CachingController />
      <UpdateController />
      <MotionController />
      <div className={classes.page}>
        <Outlet />
      </div>
      {!desktop && (
        <div className={classes.menu}>
          <BottomMenu />
        </div>
      )}
    </>
  );
};

export default App;
