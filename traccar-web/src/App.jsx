import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useMediaQuery, useTheme } from '@mui/material';
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
import { Alert, Snackbar } from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import SecurityIcon from '@mui/icons-material/Security';

const useStyles = makeStyles()(() => ({
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    position: 'relative'
  },
  menu: {
    zIndex: 4,
    '@media print': {
      display: 'none',
    },
  },
}));

const App = () => {
  const { classes } = useStyles();
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  const desktop = useMediaQuery(theme.breakpoints.up('md'));

  const newServer = useSelector((state) => state.session.server?.newServer);
  const termsUrl = useSelector((state) => state.session.server?.attributes?.termsUrl);
  const user = useSelector((state) => state.session.user);
  const [securityAlert, setSecurityAlert] = useState(null);

  // Elite Sentinel: Impossible Travel & Session Fingerprint Monitor
  useEffect(() => {
    if (user) {
      const storedFingerprint = localStorage.getItem(`gsp_session_${user.id}`);
      const currentFingerprint = navigator.userAgent + (window.screen.width * window.screen.height);
      
      if (storedFingerprint && storedFingerprint !== currentFingerprint) {
        setSecurityAlert({
          message: 'NEW LOGIN DETECTED: A concurrent session was identified on another device.',
          severity: 'warning'
        });
      }
      localStorage.setItem(`gsp_session_${user.id}`, currentFingerprint);
    }
  }, [user]);

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
      try {
        const response = await fetch('/api/session');
        if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
          const user = await response.json();
          dispatch(sessionActions.updateUser(user));
        } else {
          // Fallback: Check SaaS synchronization state
          try {
            const saasSync = await fetch('/api/auth/sync');
            if (saasSync.ok && saasSync.headers.get('content-type')?.includes('application/json')) {
              const saasData = await saasSync.json();
              if (saasData.token) {
                window.localStorage.setItem('saas_token', saasData.token);
                window.localStorage.setItem('saas_user', JSON.stringify(saasData.user));
                window.localStorage.setItem('saas_role', saasData.user.role);
                
                if (saasData.isHardlocked) {
                    navigate('/login', { replace: true, state: { hardlocked: true, reason: 'Subscription Expired' } });
                    return null;
                }
  
                window.location.reload();
                return null;
              }
            }
          } catch (syncErr) {
            console.error('[Sync] SaaS Authentication Synchronization Failed:', syncErr);
          }
          window.sessionStorage.setItem('postLogin', pathname + search);
          navigate('/login', { replace: true });
        }
      } catch (err) {
        navigate('/login', { replace: true });
      }
    } else {
      // Periodic hardlock check for active sessions
      const checkHardlock = async () => {
          const res = await fetch('/api/auth/sync').catch(() => ({ ok: false }));
          if (res.ok) {
              const data = await res.json();
              if (data.isHardlocked) {
                  dispatch(sessionActions.updateUser(null));
                  localStorage.removeItem('saas_token');
                  navigate('/login', { replace: true, state: { hardlocked: true } });
              }
          }
      };
      
      const interval = setInterval(checkHardlock, 60000); // Check every minute
      checkHardlock(); 
      return () => clearInterval(interval);
    }
    return null;
  }, [user, navigate, dispatch]);

  if (user == null) {
    return <Loader />;
  }
  if (termsUrl && !user.attributes.termsAccepted) {
    return <TermsDialog open onCancel={() => navigate('/login')} onAccept={() => acceptTerms()} />;
  }
  return (
    <>
      <SocketController />
      <CachingController />
      <UpdateController />
      <MotionController />
      <div className={classes.page}>
        {securityAlert && (
          <Alert 
            icon={<SecurityIcon />} 
            severity={securityAlert.severity} 
            sx={{ m: 2, borderRadius: '12px', border: '1px solid #f59e0b', fontWeight: 700 }}
            onClose={() => setSecurityAlert(null)}
          >
            {securityAlert.message}
          </Alert>
        )}
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
